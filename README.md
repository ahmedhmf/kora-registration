# KORA — Social Football Registration

A public Angular event registration form hosted on Vercel with a protected serverless API writing to Supabase PostgreSQL.

## Registration fields

- Full name
- Shirt size (XS, S, M, L, XL, XXL, 3XL)
- Player/shirt number (0–99)
- Instagram handle
- Where you would play social football (location)
- Phone number, with international prefix such as +49
- Email address
- Optional marketing consent checkbox

## Local development

Install dependencies with `npm install` and start the Angular development server with `npm start`. The Angular dev server does **not** run Vercel functions; for API integration testing, install the Vercel CLI and use `vercel dev` with environment variables configured.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor**, paste and run [supabase/schema.sql](supabase/schema.sql).
3. Confirm the `registrations` table has RLS enabled and that the `anon` and `authenticated` roles have no permissions.
4. Obtain the Supabase project URL and the backend-only secret key (or legacy service role key).
5. **Never** use this secret in Angular code or commit it to GitHub.

Two unique indexes reject registration if **either** normalized email **or** normalized phone already exists. The backend sends a 409 conflict for duplicates, including simultaneous submissions. International phone format is required so deduplication can work consistently. This only blocks reused email/phone values, not people supplying two entirely different identities.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Use the Angular framework preset. Build command: `npm run build`; output directory: `dist/kora-registration/browser`.
3. In Vercel environment settings, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server-side environment variables.
4. Deploy. The frontend posts to `/api/register`. Do not expose any endpoint that lists, edits or deletes visitor records publicly.
5. Test normal submission, duplicate email, duplicate phone and invalid phone/email.

## Before collecting real personal information

- Set up **rate limiting and anti-bot protection** for `/api/register` through Vercel security tooling or another durable rate limiter. The API currently does not enforce rate limits, so the public form is not yet production-hardened against spam.
- Replace the example privacy wording with a complete privacy notice identifying KORA's organizer/contact, data purposes, retention, withdrawal and deletion procedures.
- Configure lawful marketing consent and any applicable double-opt-in requirements before sending offers. Registration is allowed without marketing consent.
- Review which personal information is truly necessary and restrict access in the Supabase dashboard.
