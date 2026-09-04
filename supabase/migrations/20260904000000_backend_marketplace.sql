-- PP Shopp: persistence for marketplace integrations and analytics.
-- OAuth tokens are application-encrypted ciphertext; never store plaintext tokens.

create extension if not exists pgcrypto;

create table if not exists public.marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  access_token_ciphertext text not null,
  refresh_token_ciphertext text not null,
  token_expires_at timestamptz,
  account_id text,
  account_nickname text,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, marketplace)
);

create table if not exists public.marketplace_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  marketplace_product_id text not null,
  name text not null,
  image_url text,
  current_price numeric(12,2),
  original_price numeric(12,2),
  discount_percentage numeric(5,2),
  rating numeric(3,2),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  seller_id text,
  seller_name text,
  category_id text,
  category_name text,
  stock integer,
  shipping_cost numeric(12,2),
  free_shipping boolean not null default false,
  original_url text not null,
  affiliate_url text,
  affiliate_provider text not null default 'manual',
  affiliate_status text not null default 'manual_required',
  offer_score numeric(4,2) check (offer_score between 0 and 10),
  fetched_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, marketplace, marketplace_product_id)
);

create table if not exists public.affiliate_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  affiliate_tag text not null default '',
  affiliate_provider text not null default 'manual',
  provider_config jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, marketplace)
);

create table if not exists public.auto_search_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  min_offer_score numeric(4,2) not null default 7 check (min_offer_score between 0 and 10),
  cooldown_hours integer not null default 24 check (cooldown_hours >= 0),
  target_channels jsonb not null default '[]'::jsonb,
  schedule text not null default '*/30 * * * *',
  max_results_per_run integer not null default 5 check (max_results_per_run between 1 and 100),
  is_active boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publication_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  marketplace_product_id text not null,
  product_name text not null,
  price numeric(12,2),
  affiliate_url text,
  channel_id text not null,
  channel_name text,
  published_at timestamptz not null default now(),
  offer_score numeric(4,2),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace text not null check (marketplace in ('shopee', 'mercado_livre')),
  event_type text not null check (event_type in ('click', 'conversion')),
  marketplace_product_id text,
  product_name text,
  amount numeric(12,2),
  commission numeric(12,2),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists marketplace_products_lookup_idx
  on public.marketplace_products (user_id, marketplace, category_id, fetched_at desc);
create index if not exists publication_history_cooldown_idx
  on public.publication_history (user_id, marketplace, marketplace_product_id, published_at desc);
create index if not exists analytics_events_range_idx
  on public.analytics_events (user_id, marketplace, occurred_at desc);

-- Every public table is protected. The backend uses the service role and the
-- frontend must never receive that key.
alter table public.marketplace_connections enable row level security;
alter table public.marketplace_products enable row level security;
alter table public.affiliate_configs enable row level security;
alter table public.auto_search_configs enable row level security;
alter table public.publication_history enable row level security;
alter table public.analytics_events enable row level security;

revoke all on table public.marketplace_connections, public.marketplace_products,
  public.affiliate_configs, public.auto_search_configs,
  public.publication_history, public.analytics_events from anon;
grant select, insert, update, delete on table public.marketplace_connections,
  public.marketplace_products, public.affiliate_configs, public.auto_search_configs,
  public.publication_history, public.analytics_events to authenticated;

create policy "Users manage own marketplace connections" on public.marketplace_connections
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own products" on public.marketplace_products
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own affiliate configs" on public.affiliate_configs
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own auto searches" on public.auto_search_configs
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own publication history" on public.publication_history
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage own analytics" on public.analytics_events
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
