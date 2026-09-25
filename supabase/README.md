# Contact form backend (Supabase)

The "Get In Touch" form posts to a Supabase Edge Function (`functions/contact`),
which validates the input, rate-limits by IP and stores it in the
`public.contact_messages` table. The browser never receives any Supabase key.

## One-time setup

1. Create a free project at <https://supabase.com> and note its **project ref**
   (the `xxxx` in `https://xxxx.supabase.co`).
2. Install the CLI (`brew install supabase/tap/supabase`), then from the repo root:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push                                   # creates the table + RLS
   supabase secrets set \
     ALLOWED_ORIGINS="https://www.khtarikul.dev,https://khtarikul.dev" \
     IP_HASH_SALT="$(openssl rand -hex 32)"
   supabase functions deploy contact --no-verify-jwt
   ```

   `--no-verify-jwt` lets the public form call the function without a key.
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase
   automatically; never put them in this repo.

3. `CONTACT_ENDPOINT` in `assets/js/main.js` must point at
   `https://<project-ref>.supabase.co/functions/v1/contact` (currently
   configured for project `hqzbguidhxppltpyqmzz`).

To test locally, temporarily add `http://localhost:8000` to `ALLOWED_ORIGINS`.

## Viewing messages

Supabase dashboard → your project → **Table Editor** → `contact_messages`.
Newest first: sort by `created_at` descending. Only accounts on your Supabase
project can see this data.

## Security summary

- Row Level Security is enabled with **no policies**, and all table privileges
  are revoked from `anon`/`authenticated`: the public API can't read or write it.
- Only the Edge Function writes, using the service role key held in Supabase's
  server environment.
- The function accepts requests only from `ALLOWED_ORIGINS`, caps body size,
  trims and length-checks every field, validates the email, silently drops
  honeypot hits, and allows 3 submissions per IP per 10 minutes.
- IPs are stored only as a salted SHA-256 hash, used for rate limiting.
- The table also enforces length and email format checks in the database.
