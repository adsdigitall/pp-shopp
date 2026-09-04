-- Expand the provider registry and commission lifecycle for unified analytics.
alter table public.marketplace_connections
  drop constraint if exists marketplace_connections_marketplace_check;
alter table public.marketplace_connections
  add constraint marketplace_connections_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.marketplace_products
  drop constraint if exists marketplace_products_marketplace_check;
alter table public.marketplace_products
  add constraint marketplace_products_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.affiliate_configs
  drop constraint if exists affiliate_configs_marketplace_check;
alter table public.affiliate_configs
  add constraint affiliate_configs_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.auto_search_configs
  drop constraint if exists auto_search_configs_marketplace_check;
alter table public.auto_search_configs
  add constraint auto_search_configs_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.publication_history
  drop constraint if exists publication_history_marketplace_check;
alter table public.publication_history
  add constraint publication_history_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.analytics_events
  drop constraint if exists analytics_events_marketplace_check;
alter table public.analytics_events
  add constraint analytics_events_marketplace_check
  check (marketplace in ('shopee', 'mercado_livre', 'tiktok_shop', 'chain'));

alter table public.analytics_events
  add column if not exists external_event_id text,
  add column if not exists commission_status text not null default 'unknown',
  add column if not exists source text not null default 'app';

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in ('click', 'conversion', 'commission'));

alter table public.analytics_events
  drop constraint if exists analytics_events_commission_status_check;
alter table public.analytics_events
  add constraint analytics_events_commission_status_check
  check (commission_status in ('unknown', 'pending', 'validated', 'rejected', 'cancelled'));

create unique index if not exists analytics_events_external_id_idx
  on public.analytics_events (user_id, marketplace, external_event_id)
  where external_event_id is not null;
