-- =============================================================================
--  Panic Ring — PostgreSQL schema
--  Runs automatically on first Postgres container boot.
--  Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =============================================================================
--  DEVICES
--  One row per installed browser instance.
--  Stores only: a hashed PIN, a hashed decoy-PIN, and auto-lock preference.
--  No contacts, notes or safety-plan data ever reaches the database.
-- =============================================================================
create table if not exists public.devices (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  device_id    text        unique not null,
  pin_hash     text        not null,
  decoy_hash   text        not null,
  auto_lock    smallint    not null default 5,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- =============================================================================
--  ALERT LOGS
--  Anonymous audit row written each time an alert fires.
--  Contains ONLY counts — no location coords, no contact names, no message text.
-- =============================================================================
create table if not exists public.alert_logs (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  device_id       text        not null,
  fired_at        timestamptz not null default now(),
  contact_count   smallint    not null default 0,
  location_shared boolean     not null default false,
  contacts_opened smallint    not null default 0,
  contacts_failed smallint    not null default 0
);

-- =============================================================================
--  ROW LEVEL SECURITY
--  Every user sees only their own rows.
-- =============================================================================
alter table public.devices    enable row level security;
alter table public.alert_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'devices' and policyname = 'devices_owner'
  ) then
    create policy "devices_owner" on public.devices
      for all using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'alert_logs' and policyname = 'alertlogs_owner'
  ) then
    create policy "alertlogs_owner" on public.alert_logs
      for all using (auth.uid() = user_id);
  end if;
end; $$;

-- =============================================================================
--  TRIGGERS
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists devices_updated_at on public.devices;
create trigger devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

-- =============================================================================
--  ALERT STATS VIEW  (used by the dashboard)
--  security_invoker = true so RLS applies — each user sees only their own rows.
-- =============================================================================
drop view if exists public.alert_stats;
create view public.alert_stats
  with (security_invoker = true)
as
select
  user_id,
  count(*)::bigint                                                           as total_alerts,
  coalesce(sum(contacts_opened), 0)::bigint                                 as total_opened,
  coalesce(sum(contacts_failed), 0)::bigint                                 as total_failed,
  coalesce(sum(case when location_shared then 1 else 0 end), 0)::bigint    as alerts_with_location,
  max(fired_at)                                                              as last_alert_at
from public.alert_logs
group by user_id;

-- =============================================================================
--  GRANTS
--  anon  — can call auth endpoints; cannot read data (RLS blocks it)
--  authenticated — full CRUD on their own rows via RLS
-- =============================================================================
grant usage  on schema public              to anon, authenticated;
grant select on public.alert_stats         to authenticated;
grant all    on public.devices             to authenticated;
grant all    on public.alert_logs          to authenticated;

-- =============================================================================
--  INDEXES
-- =============================================================================
create index if not exists devices_user_id_idx    on public.devices    (user_id);
create index if not exists alertlogs_user_id_idx  on public.alert_logs (user_id);
create index if not exists alertlogs_fired_at_idx on public.alert_logs (fired_at desc);
create index if not exists alertlogs_device_idx   on public.alert_logs (device_id);
