import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).json({ message: 'Method not allowed' }); return; }
  if (Number(req.headers['content-length'] || 0) > 8192) { res.status(413).json({ message: 'Request too large' }); return; }
  const d = req.body;
  if (!d || typeof d !== 'object' || Array.isArray(d)) { res.status(400).json({ message: 'Invalid request' }); return; }
  if (['name','shirt_size','instagram','location','phone','email'].some(key => typeof d[key] !== 'string')) { res.status(400).json({ message: 'Missing fields' }); return; }
  const name = d.name.trim().replace(/\s+/g, ' ');
  const shirt_size = d.shirt_size;
  const player_number = d.player_number;
  const instagram = d.instagram.trim().replace(/^@/, '').toLowerCase();
  const location = d.location.trim();
  const parsedPhone = parsePhoneNumberFromString(d.phone.trim());
  const phone = parsedPhone?.number;
  const email = d.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 100 || !['XS','S','M','L','XL','XXL','3XL'].includes(shirt_size)
    || !Number.isInteger(player_number) || player_number < 0 || player_number > 99
    || !/^[a-z0-9._]{1,30}$/.test(instagram)
    || !['Heliopolis', 'Tagamoa', 'Maadi', 'Zayed', 'Alexandria', 'International (soon)'].includes(location)
    || !parsedPhone?.isValid() || !phone || email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ message: 'Invalid details. Phone must use international format (e.g. +491701234567).' }); return;
  }
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SECRET_KEY'];
  if (!url || !key) { res.status(503).json({ message: 'Registration is not configured' }); return; }
  const marketing_consent = d.marketing_consent === true;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.from('registrations').insert({
      name, shirt_size, player_number, instagram, location, phone, email, marketing_consent,
      marketing_consented_at: marketing_consent ? new Date().toISOString() : null
    });
    if (error?.code === '23505') { res.status(409).json({ message: 'Already registered' }); return; }
    if (error) { console.error('Registration failure', error.code); res.status(500).json({ message: 'Registration failed' }); return; }
    res.status(201).json({ message: 'Registered' });
  } catch { res.status(500).json({ message: 'Registration failed' }); }
}
