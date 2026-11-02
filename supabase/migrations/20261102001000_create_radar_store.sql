-- Durable storage for the Radar de Ofertas application.
-- Application requests use the Supabase server-side secret key, which maps
-- to service_role and bypasses RLS. No browser client accesses this table.

create table if not exists public.radar_store (
  id text primary key,
  collection text not null,
  user_id uuid,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists radar_store_collection_idx
  on public.radar_store (collection);

create index if not exists radar_store_user_id_idx
  on public.radar_store (user_id)
  where user_id is not null;

alter table public.radar_store enable row level security;

revoke all on table public.radar_store from anon, authenticated;
grant usage on schema public to service_role;
grant all privileges on table public.radar_store to service_role;
