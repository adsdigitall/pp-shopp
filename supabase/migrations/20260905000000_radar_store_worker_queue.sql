create table if not exists public.radar_store (
  id text primary key,
  collection text not null,
  user_id text,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists radar_store_collection_idx on public.radar_store (collection);
create index if not exists radar_store_collection_user_idx on public.radar_store (collection, user_id);

alter table public.radar_store enable row level security;
revoke all on table public.radar_store from anon, authenticated;
grant select, insert, update, delete on table public.radar_store to service_role;
