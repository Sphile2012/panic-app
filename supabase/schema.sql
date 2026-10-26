-- Bootstrap the current schema on a new, empty Panic Ring database.
-- Existing databases must use the backup-first versioned migration runner.
begin;

create extension if not exists "pgcrypto";
create table if not exists public.devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  device_id    text not null,
  auto_lock    smallint not null default 5,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint devices_auto_lock_range check (auto_lock between 0 and 120)
);
alter table public.devices drop constraint if exists devices_auto_lock_range;
alter table public.devices add constraint devices_auto_lock_range
  check (auto_lock between 0 and 120) not valid;
alter table public.devices validate constraint devices_auto_lock_range;
create unique index if not exists devices_user_device_uidx
  on public.devices (user_id, device_id);

create table if not exists public.alert_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  device_id       text not null,
  fired_at        timestamptz not null default now(),
  contact_count   smallint not null check (contact_count between 0 and 5),
  location_shared boolean not null,
  contacts_opened smallint not null default 0,
  contacts_failed smallint not null default 0,
  constraint alert_counts_nonnegative check (
    contacts_opened >= 0 and contacts_failed >= 0
  ),
  constraint alert_counts_consistent check (
    contacts_opened + contacts_failed <= contact_count
  )
);
alter table public.alert_logs
  add column if not exists contacts_opened smallint not null default 0,
  add column if not exists contacts_failed smallint not null default 0;
alter table public.alert_logs
  drop constraint if exists alert_logs_contact_count_check,
  drop constraint if exists alert_counts_nonnegative,
  drop constraint if exists alert_counts_consistent;
alter table public.alert_logs
  add constraint alert_logs_contact_count_check
    check (contact_count between 0 and 5) not valid,
  add constraint alert_counts_nonnegative
    check (contacts_opened >= 0 and contacts_failed >= 0) not valid,
  add constraint alert_counts_consistent
    check (contacts_opened + contacts_failed <= contact_count) not valid;
alter table public.alert_logs validate constraint alert_logs_contact_count_check;
alter table public.alert_logs validate constraint alert_counts_nonnegative;
alter table public.alert_logs validate constraint alert_counts_consistent;

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null
    constraint trusted_contacts_display_name_check
      check (length(trim(display_name)) between 1 and 80),
  phone_number text not null
    constraint trusted_contacts_phone_check
      check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists trusted_contacts_user_phone_uidx
  on public.trusted_contacts (user_id, phone_number);
create index if not exists trusted_contacts_user_created_idx
  on public.trusted_contacts (user_id, created_at);
alter table public.trusted_contacts enable row level security;
revoke all on public.trusted_contacts from public, anon, authenticated;
grant select, insert, update, delete on public.trusted_contacts to authenticated;
drop policy if exists trusted_contacts_owner on public.trusted_contacts;
create policy trusted_contacts_owner on public.trusted_contacts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.emergency_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    constraint emergency_sessions_status_check
      check (status in ('active', 'cancelled', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint emergency_sessions_end_state_check check (
    (status = 'active' and ended_at is null)
    or (status <> 'active' and ended_at is not null)
  ),
  constraint emergency_sessions_id_user_unique unique (id, user_id)
);
create unique index if not exists emergency_sessions_one_active_per_user_uidx
  on public.emergency_sessions (user_id) where status = 'active';
create index if not exists emergency_sessions_user_started_idx
  on public.emergency_sessions (user_id, started_at desc);
alter table public.emergency_sessions enable row level security;
revoke all on public.emergency_sessions from public, anon, authenticated;
grant select, insert, update on public.emergency_sessions to authenticated;
drop policy if exists emergency_sessions_owner on public.emergency_sessions;
create policy emergency_sessions_owner on public.emergency_sessions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.emergency_location_updates (
  id bigint generated always as identity primary key,
  session_id uuid not null,
  user_id uuid not null,
  latitude double precision not null
    constraint emergency_location_latitude_check check (latitude between -90 and 90),
  longitude double precision not null
    constraint emergency_location_longitude_check check (longitude between -180 and 180),
  accuracy_meters real not null
    constraint emergency_location_accuracy_check
      check (accuracy_meters >= 0 and accuracy_meters < 'Infinity'::real),
  captured_at timestamptz not null default now(),
  constraint emergency_location_session_owner_fkey
    foreign key (session_id, user_id)
    references public.emergency_sessions (id, user_id) on delete cascade
);
create index if not exists emergency_locations_session_time_idx
  on public.emergency_location_updates (session_id, captured_at desc);
create index if not exists emergency_locations_user_time_idx
  on public.emergency_location_updates (user_id, captured_at desc);
alter table public.emergency_location_updates enable row level security;
revoke all on public.emergency_location_updates from public, anon, authenticated;
grant select, insert, delete on public.emergency_location_updates to authenticated;
drop policy if exists emergency_locations_owner_select on public.emergency_location_updates;
create policy emergency_locations_owner_select on public.emergency_location_updates
  for select using (auth.uid() = user_id);
drop policy if exists emergency_locations_active_insert on public.emergency_location_updates;
create policy emergency_locations_active_insert on public.emergency_location_updates
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.emergency_sessions s
      where s.id = session_id and s.user_id = auth.uid() and s.status = 'active'
    )
  );
drop policy if exists emergency_locations_owner_delete on public.emergency_location_updates;
create policy emergency_locations_owner_delete on public.emergency_location_updates
  for delete using (auth.uid() = user_id);

alter table public.devices enable row level security;
alter table public.alert_logs enable row level security;
drop policy if exists devices_owner on public.devices;
create policy devices_owner on public.devices
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists alertlogs_owner on public.alert_logs;
create policy alertlogs_owner on public.alert_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
revoke all on public.devices, public.alert_logs from anon;
grant select, insert, update, delete on public.devices, public.alert_logs to authenticated;

-- Live location sharing: access only through the token-based functions below.
create table if not exists public.live_tracks (
  token text primary key check (token ~ '^[0-9a-f]{32}$'),
  user_id uuid references auth.users(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy real check (
    accuracy is null or (accuracy >= 0 and accuracy < 'Infinity'::real)
  ),
  battery smallint check (battery is null or battery between 0 and 100),
  charging boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.live_tracks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.live_tracks drop constraint if exists live_tracks_token_check;
alter table public.live_tracks add constraint live_tracks_token_check
  check (token ~ '^[0-9a-f]{32}$') not valid;
alter table public.live_tracks validate constraint live_tracks_token_check;
alter table public.live_tracks enable row level security;
revoke all on public.live_tracks from anon, authenticated;

create or replace function public.start_track(
  p_lat double precision, p_lng double precision, p_accuracy real
) returns text
language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare
  tracking_token text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_lat is null or p_lat < -90 or p_lat > 90
     or p_lng is null or p_lng < -180 or p_lng > 180
     or (p_accuracy is not null and (
       p_accuracy < 0 or p_accuracy in ('NaN'::real, 'Infinity'::real, '-Infinity'::real)
     )) then
    raise exception using errcode = '22023', message = 'Invalid tracking data';
  end if;

  delete from public.live_tracks where updated_at < now() - interval '24 hours';
  tracking_token := replace(gen_random_uuid()::text, '-', '');
  insert into public.live_tracks (token, user_id, lat, lng, accuracy, updated_at)
  values (tracking_token, auth.uid(), p_lat, p_lng, p_accuracy, now());
  return tracking_token;
end;
$$;

drop function if exists public.push_track(text, double precision, double precision, real, smallint, boolean);
create or replace function public.push_track(
  p_token text, p_lat double precision, p_lng double precision,
  p_accuracy real, p_battery smallint, p_charging boolean
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, auth as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{32}$'
     or p_lat is null or p_lat < -90 or p_lat > 90
     or p_lng is null or p_lng < -180 or p_lng > 180
     or (p_accuracy is not null and (
       p_accuracy < 0 or p_accuracy in ('NaN'::real, 'Infinity'::real, '-Infinity'::real)
     ))
     or (p_battery is not null and (p_battery < 0 or p_battery > 100))
     or p_charging is null then
    raise exception using errcode = '22023', message = 'Invalid tracking data';
  end if;
  delete from public.live_tracks where updated_at < now() - interval '24 hours';
  insert into public.live_tracks (token, user_id, lat, lng, accuracy, battery, charging, updated_at)
  values (p_token, auth.uid(), p_lat, p_lng, p_accuracy, p_battery, p_charging, now())
  on conflict (token) do update set
    user_id = auth.uid(), lat = excluded.lat, lng = excluded.lng,
    accuracy = excluded.accuracy, battery = excluded.battery,
    charging = excluded.charging, updated_at = now()
  where public.live_tracks.user_id is null or public.live_tracks.user_id = auth.uid();
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.get_track(p_token text)
returns table (lat double precision, lng double precision, accuracy real,
               battery smallint, charging boolean, updated_at timestamptz)
language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return;
  end if;
  return query
    select t.lat, t.lng, t.accuracy, t.battery, t.charging, t.updated_at
    from public.live_tracks t
    where t.token = p_token and t.updated_at >= now() - interval '24 hours';
end;
$$;

revoke all on function public.push_track(text, double precision, double precision, real, smallint, boolean) from public, anon;
revoke all on function public.get_track(text) from public;
revoke all on function public.start_track(double precision, double precision, real) from public, anon, authenticated;
grant execute on function public.push_track(text, double precision, double precision, real, smallint, boolean) to authenticated;
grant execute on function public.get_track(text) to anon, authenticated;
grant execute on function public.start_track(double precision, double precision, real) to authenticated;

create or replace function public.stop_track(p_token text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception using errcode = '22023', message = 'Invalid tracking token';
  end if;
  delete from public.live_tracks where token = p_token and user_id = auth.uid();
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.stop_track(text) from public, anon, authenticated;
grant execute on function public.stop_track(text) to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
drop trigger if exists devices_updated_at on public.devices;
create trigger devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();
create index if not exists live_tracks_updated_at_idx on public.live_tracks (updated_at);
create index if not exists alertlogs_user_fired_idx on public.alert_logs (user_id, fired_at desc);
drop index if exists public.devices_user_id_idx;
drop index if exists public.alertlogs_user_id_idx;
drop index if exists public.alertlogs_fired_at_idx;
create or replace view public.alert_stats
with (security_invoker = true) as
select
  user_id,
  count(*)::bigint                            as total_alerts,
  coalesce(sum(contacts_opened), 0)::bigint   as total_opened,
  coalesce(sum(contacts_failed), 0)::bigint   as total_failed,
  coalesce(sum(case when location_shared then 1 else 0 end), 0)::bigint as alerts_with_location,
  max(fired_at)                               as last_alert_at
from public.alert_logs
group by user_id;
grant usage on schema public to authenticated;
grant usage on schema public to anon;
grant select on public.alert_stats to authenticated;

commit;
