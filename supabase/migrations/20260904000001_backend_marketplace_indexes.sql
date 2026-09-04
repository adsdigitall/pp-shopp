-- Cover foreign-key lookups used by user-scoped queries and cascades.
create index if not exists auto_search_configs_user_id_idx
  on public.auto_search_configs (user_id);
create index if not exists publication_history_user_id_idx
  on public.publication_history (user_id);
create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);
