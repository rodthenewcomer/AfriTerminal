create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create or replace function private.keep_newest_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.updated_at > new.updated_at then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.keep_newest_write() from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  experience_level text check (experience_level in ('debutant', 'intermediaire', 'avance')),
  locale text not null default 'fr' check (locale in ('fr', 'en')),
  email_notifications boolean not null default false,
  push_notifications boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.watchlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  name text not null check (char_length(name) between 1 and 80),
  is_active boolean not null default false,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.watchlist_items (
  user_id uuid not null,
  watchlist_id text not null,
  ticker text not null check (ticker ~ '^[A-Z0-9]{2,8}$'),
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, watchlist_id, ticker),
  foreign key (user_id, watchlist_id)
    references public.watchlists(user_id, id) on delete cascade
);

create table public.portfolio_transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  ticker text not null check (ticker ~ '^[A-Z0-9]{2,8}$'),
  side text not null check (side in ('achat', 'vente')),
  trade_date date not null check (trade_date >= date '1998-09-16' and trade_date <= current_date),
  quantity bigint not null check (quantity > 0),
  price numeric(18, 4) not null check (price > 0),
  fees numeric(18, 4) not null default 0 check (fees >= 0),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.price_alerts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  ticker text not null check (ticker ~ '^[A-Z0-9]{2,8}$'),
  direction text not null check (direction in ('above', 'below')),
  target numeric(18, 4) not null check (target > 0),
  enabled boolean not null default true,
  triggered_at timestamptz,
  channels text[] not null default array['in_app']::text[]
    check (channels <@ array['in_app', 'push', 'email']::text[]),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.saved_filters (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 100),
  name text not null check (char_length(name) between 1 and 100),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create table public.user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (key in ('chart', 'chart_levels', 'chart_layouts', 'settings')),
  value jsonb not null check (jsonb_typeof(value) in ('object', 'array')),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.device_push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 200),
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique check (char_length(token) between 8 and 512),
  disabled boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table public.subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe', 'apple', 'google')),
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null default 'inactive'
    check (status in ('inactive', 'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create unique index subscriptions_provider_customer_idx
  on public.subscriptions(provider, provider_customer_id)
  where provider_customer_id is not null;

create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 80),
  enabled boolean not null default false,
  numeric_limit integer check (numeric_limit is null or numeric_limit >= 0),
  source text not null default 'free' check (source in ('free', 'stripe', 'apple', 'google', 'admin')),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table public.billing_webhook_events (
  provider text not null check (provider in ('stripe', 'apple', 'google')),
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create index watchlists_user_updated_idx on public.watchlists(user_id, updated_at desc);
create index watchlist_items_user_updated_idx on public.watchlist_items(user_id, updated_at desc);
create index portfolio_transactions_user_updated_idx on public.portfolio_transactions(user_id, updated_at desc);
create index price_alerts_user_updated_idx on public.price_alerts(user_id, updated_at desc);
create index price_alerts_enabled_idx on public.price_alerts(user_id, updated_at desc) where enabled and deleted_at is null;
create index saved_filters_user_updated_idx on public.saved_filters(user_id, updated_at desc);
create index user_preferences_user_updated_idx on public.user_preferences(user_id, updated_at desc);
create index device_push_tokens_user_enabled_idx on public.device_push_tokens(user_id, updated_at desc) where not disabled;
create index entitlements_user_enabled_idx on public.entitlements(user_id, key) where enabled;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger device_push_tokens_set_updated_at before update on public.device_push_tokens
  for each row execute function private.set_updated_at();
create trigger watchlists_keep_newest before update on public.watchlists
  for each row execute function private.keep_newest_write();
create trigger watchlist_items_keep_newest before update on public.watchlist_items
  for each row execute function private.keep_newest_write();
create trigger portfolio_transactions_keep_newest before update on public.portfolio_transactions
  for each row execute function private.keep_newest_write();
create trigger price_alerts_keep_newest before update on public.price_alerts
  for each row execute function private.keep_newest_write();
create trigger saved_filters_keep_newest before update on public.saved_filters
  for each row execute function private.keep_newest_write();
create trigger user_preferences_keep_newest before update on public.user_preferences
  for each row execute function private.keep_newest_write();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 80), '')
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id, provider) do nothing;

  insert into public.entitlements (user_id, key, enabled, numeric_limit, source)
  values
    (new.id, 'cloud_sync', true, null, 'free'),
    (new.id, 'watchlists', true, 5, 'free'),
    (new.id, 'price_alerts', true, 3, 'free'),
    (new.id, 'saved_filters', true, 3, 'free'),
    (new.id, 'portfolio', true, null, 'free'),
    (new.id, 'advanced_alerts', false, 0, 'free'),
    (new.id, 'research_exports', false, 0, 'free')
  on conflict (user_id, key) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolio_transactions enable row level security;
alter table public.price_alerts enable row level security;
alter table public.saved_filters enable row level security;
alter table public.user_preferences enable row level security;
alter table public.device_push_tokens enable row level security;
alter table public.subscriptions enable row level security;
alter table public.entitlements enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy watchlists_select_own on public.watchlists for select to authenticated
  using ((select auth.uid()) = user_id);
create policy watchlists_insert_own on public.watchlists for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy watchlists_update_own on public.watchlists for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watchlists_delete_own on public.watchlists for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy watchlist_items_select_own on public.watchlist_items for select to authenticated
  using ((select auth.uid()) = user_id);
create policy watchlist_items_insert_own on public.watchlist_items for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy watchlist_items_update_own on public.watchlist_items for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watchlist_items_delete_own on public.watchlist_items for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy portfolio_transactions_select_own on public.portfolio_transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy portfolio_transactions_insert_own on public.portfolio_transactions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy portfolio_transactions_update_own on public.portfolio_transactions for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy portfolio_transactions_delete_own on public.portfolio_transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy price_alerts_select_own on public.price_alerts for select to authenticated
  using ((select auth.uid()) = user_id);
create policy price_alerts_insert_own on public.price_alerts for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy price_alerts_update_own on public.price_alerts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy price_alerts_delete_own on public.price_alerts for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy saved_filters_select_own on public.saved_filters for select to authenticated
  using ((select auth.uid()) = user_id);
create policy saved_filters_insert_own on public.saved_filters for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy saved_filters_update_own on public.saved_filters for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy saved_filters_delete_own on public.saved_filters for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy user_preferences_select_own on public.user_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy user_preferences_insert_own on public.user_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy user_preferences_update_own on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_preferences_delete_own on public.user_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy device_push_tokens_select_own on public.device_push_tokens for select to authenticated
  using ((select auth.uid()) = user_id);
create policy device_push_tokens_insert_own on public.device_push_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy device_push_tokens_update_own on public.device_push_tokens for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy device_push_tokens_delete_own on public.device_push_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy subscriptions_select_own on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy entitlements_select_own on public.entitlements for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon;
revoke all on public.billing_webhook_events from authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.watchlists to authenticated;
grant select, insert, update, delete on public.watchlist_items to authenticated;
grant select, insert, update, delete on public.portfolio_transactions to authenticated;
grant select, insert, update, delete on public.price_alerts to authenticated;
grant select, insert, update, delete on public.saved_filters to authenticated;
grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.device_push_tokens to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.entitlements to authenticated;
