alter table public.profiles
  add column analytics_consent boolean,
  add column analytics_consent_at timestamptz;

alter table public.device_push_tokens
  add constraint device_push_tokens_expo_format
  check (token ~ '^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$');

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_id_hash text not null check (anonymous_id_hash ~ '^[a-f0-9]{64}$'),
  name text not null check (name in (
    'page_view', 'onboarding_complete', 'search', 'ticker_view',
    'watchlist_add', 'portfolio_transaction', 'alert_create',
    'document_open', 'data_refresh_failure', 'notification_tap',
    'auth_complete', 'subscription_started'
  )),
  surface text not null check (surface in ('web', 'ios', 'android')),
  path text check (path is null or char_length(path) between 1 and 160),
  properties jsonb not null default '{}'::jsonb
    check (jsonb_typeof(properties) = 'object' and pg_column_size(properties) <= 4096),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  check (occurred_at <= received_at + interval '5 minutes'),
  check (occurred_at >= received_at - interval '7 days')
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id text not null,
  channel text not null check (channel in ('push', 'email')),
  recipient_key text not null check (char_length(recipient_key) between 1 and 200),
  triggered_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'failed', 'suppressed')),
  provider_id text check (provider_id is null or char_length(provider_id) <= 512),
  attempts integer not null default 0 check (attempts between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  last_error text check (last_error is null or char_length(last_error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, alert_id)
    references public.price_alerts(user_id, id) on delete cascade,
  unique (user_id, alert_id, channel, recipient_key, triggered_at)
);

create table public.notification_provider_events (
  provider text not null check (provider in ('expo', 'resend')),
  event_id text not null check (char_length(event_id) between 1 and 512),
  event_type text not null check (char_length(event_type) between 1 and 120),
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table public.api_rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index product_events_received_idx on public.product_events(received_at desc);
create index product_events_user_received_idx on public.product_events(user_id, received_at desc)
  where user_id is not null;
create index notification_deliveries_pending_idx
  on public.notification_deliveries(next_attempt_at, created_at)
  where status in ('pending', 'failed') and attempts < 5;
create index notification_deliveries_provider_idx
  on public.notification_deliveries(provider_id)
  where provider_id is not null;
create index api_rate_limits_updated_idx on public.api_rate_limits(updated_at);

create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function private.set_updated_at();

create or replace function public.consume_api_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_bucket_key !~ '^[a-f0-9]{64}$'
    or p_limit < 1 or p_limit > 10000
    or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.api_rate_limits (
    bucket_key, window_started_at, request_count, updated_at
  ) values (
    p_bucket_key, v_now, 1, v_now
  )
  on conflict (bucket_key) do update set
    request_count = case
      when public.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public.api_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

alter table public.product_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_provider_events enable row level security;
alter table public.api_rate_limits enable row level security;

revoke all on table public.product_events from public, anon, authenticated;
revoke all on table public.notification_deliveries from public, anon, authenticated;
revoke all on table public.notification_provider_events from public, anon, authenticated;
revoke all on table public.api_rate_limits from public, anon, authenticated;

grant all on table public.product_events to service_role;
grant all on table public.notification_deliveries to service_role;
grant all on table public.notification_provider_events to service_role;
grant all on table public.api_rate_limits to service_role;

grant select, update on table public.profiles to authenticated;

comment on table public.product_events is
  'Consent-gated first-party product events. Raw device identifiers and IP addresses are never stored.';
comment on table public.notification_deliveries is
  'Server-owned outbox for idempotent push and email alert delivery.';
