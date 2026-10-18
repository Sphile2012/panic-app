
create extension if not exists "pgcrypto";
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
alter table devices    enable row level security;
alter table alert_logs enable row level security;
create policy "devices_owner" on devices
  for all using (auth.uid() = user_id);

create policy "alertlogs_owner" on alert_logs
  for all using (auth.uid() = user_id);

-- Live location sharing: access only through the token-based functions below.
create table if not exists live_tracks (
  token text primary key check (length(token) between 16 and 64),
  lat double precision not null,
  lng double precision not null,
  accuracy real,
  battery smallint,
  charging boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table live_tracks enable row level security;

create or replace function push_track(
  p_token text, p_lat double precision, p_lng double precision,
  p_accuracy real, p_battery smallint, p_charging boolean
) returns void language sql security definer set search_path = public as $$
  insert into live_tracks (token, lat, lng, accuracy, battery, charging, updated_at)
  values (p_token, p_lat, p_lng, p_accuracy, p_battery, p_charging, now())
  on conflict (token) do update set
    lat = excluded.lat, lng = excluded.lng, accuracy = excluded.accuracy,
    battery = excluded.battery, charging = excluded.charging, updated_at = now();
$$;

create or replace function get_track(p_token text)
returns table (lat double precision, lng double precision, accuracy real,
               battery smallint, charging boolean, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select lat, lng, accuracy, battery, charging, updated_at
  from live_tracks where token = p_token;
$$;

grant execute on function push_track(text, double precision, double precision, real, smallint, boolean) to anon, authenticated;
grant execute on function get_track(text) to anon, authenticated;
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists devices_updated_at on devices;
create trigger devices_updated_at
  before update on devices
  for each row execute function set_updated_at();
create index if not exists devices_user_id_idx    on devices (user_id);
create index if not exists alertlogs_user_id_idx  on alert_logs (user_id);
create index if not exists alertlogs_fired_at_idx on alert_logs (fired_at desc);
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
