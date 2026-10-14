-- Panic Ring — Supabase schema v2
-- Run this in the Supabase SQL editor after enabling Auth in your project.
-- Supabase Auth creates the auth.users table automatically — we just reference it.

create extension if not exists "pgcrypto";

-- ─── Devices ──────────────────────────────────────────────────────────────────
-- One row per installed app instance, owned by an authenticated user.
create table if not exists devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  device_id    text unique not null,
  pin_hash     text not null,
  decoy_hash   text not null,
  auto_lock    smallint not null default 5,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Alert logs ───────────────────────────────────────────────────────────────
-- Non-sensitive audit rows. No location coords, no contact details.
create table if not exists alert_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  device_id       text not null,
  fired_at        timestamptz not null default now(),
  contact_count   smallint not null,
  location_shared boolean not null,
  contacts_opened smallint not null default 0,
  contacts_failed smallint not null default 0
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table devices    enable row level security;
alter table alert_logs enable row level security;

-- Users can only see and modify their own rows
create policy "devices_owner" on devices
  for all using (auth.uid() = user_id);

create policy "alertlogs_owner" on alert_logs
  for all using (auth.uid() = user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists devices_updated_at on devices;
create trigger devices_updated_at
  before update on devices
  for each row execute function set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists devices_user_id_idx    on devices (user_id);
create index if not exists alertlogs_user_id_idx  on alert_logs (user_id);
create index if not exists alertlogs_fired_at_idx on alert_logs (fired_at desc);

-- ─── Alert stats view (used by the dashboard) ─────────────────────────────────
create or replace view alert_stats as
select
  user_id,
  count(*)                                    as total_alerts,
  sum(contacts_opened)                        as total_opened,
  sum(contacts_failed)                        as total_failed,
  sum(case when location_shared then 1 else 0 end) as alerts_with_location,
  max(fired_at)                               as last_alert_at
from alert_logs
group by user_id;
