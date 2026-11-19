-- Execute in Supabase SQL Editor before deployment.
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  shirt_size text not null check (shirt_size in ('XS','S','M','L','XL','XXL','3XL')),
  player_number integer not null check (player_number between 0 and 99),
  instagram text not null check (char_length(instagram) between 1 and 30),
  location text not null check (char_length(trim(location)) between 2 and 120),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text not null check (char_length(email) <= 254),
  marketing_consent boolean not null default false,
  marketing_consented_at timestamptz,
  created_at timestamptz not null default now(),
  constraint marketing_consistency check (
    (marketing_consent and marketing_consented_at is not null) or
    (not marketing_consent and marketing_consented_at is null)
  )
);
-- These indexes enforce no duplicate by either contact method, even with concurrent requests.
create unique index if not exists registrations_unique_email on public.registrations (lower(trim(email)));
create unique index if not exists registrations_unique_phone on public.registrations (phone);
alter table public.registrations enable row level security;
revoke all on table public.registrations from public, anon, authenticated;
grant select, insert, update, delete on table public.registrations to service_role;
-- Do not create anonymous read or insert policies. API uses the backend-only secret key.
