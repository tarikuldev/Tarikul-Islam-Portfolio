-- Contact form submissions. Written only by the `contact` Edge Function
-- (service role); readable only through the Supabase dashboard.
create table public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 100),
  email      text not null check (
               char_length(email) <= 254
               and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
             ),
  subject    text not null check (char_length(subject) between 1 and 200),
  message    text not null check (char_length(message) between 1 and 5000),
  ip_hash    text, -- salted SHA-256 of sender IP, used only for rate limiting
  created_at timestamptz not null default now()
);

-- RLS on with no policies: the public `anon` and `authenticated` roles can
-- neither read nor write. The service role (server-side only) bypasses RLS.
alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from anon, authenticated;

create index contact_messages_ip_hash_created_at_idx
  on public.contact_messages (ip_hash, created_at desc);
