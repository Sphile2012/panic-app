-- Apply with `npm run db:migrate` so a full database backup is taken first.
-- The runner executes this migration and records its checksum in one transaction.

do $$
begin
  if exists (
    select 1 from public.devices
    group by user_id, device_id
    having count(*) > 1
  ) then
    raise exception 'Migration stopped: duplicate device records exist for a user';
  end if;
  if exists (
    select 1 from public.devices
    where auto_lock < 0 or auto_lock > 120
  ) then
    raise exception 'Migration stopped: device auto-lock values need review';
  end if;
  if exists (
    select 1 from public.alert_logs
    where contact_count < 0 or contact_count > 5
       or contacts_opened < 0 or contacts_failed < 0
       or contacts_opened + contacts_failed > contact_count
  ) then
    raise exception 'Migration stopped: alert counts need review';
  end if;
  if exists (
    select 1 from public.live_tracks
    where token !~ '^[0-9a-f]{32}$'
       or lat < -90 or lat > 90
       or lng < -180 or lng > 180
       or accuracy < 0
       or accuracy in ('NaN'::real, 'Infinity'::real, '-Infinity'::real)
       or battery < 0 or battery > 100
  ) then
    raise exception 'Migration stopped: live tracking records need review';
  end if;
end;
$$;

alter table public.devices
  drop constraint if exists devices_device_id_key,
  drop column if exists pin_hash,
  drop column if exists decoy_hash;
alter table public.live_tracks
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
begin
  if exists (
    select 1 from public.live_tracks t
    where t.user_id is not null
      and not exists (select 1 from auth.users u where u.id = t.user_id)
  ) then
    raise exception 'Migration stopped: orphaned live tracking owners need review';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.live_tracks'::regclass
      and conname = 'live_tracks_user_id_fkey'
  ) then
    alter table public.live_tracks
      add constraint live_tracks_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;
end;
$$;
alter table public.live_tracks validate constraint live_tracks_user_id_fkey;

alter table public.devices drop constraint if exists devices_auto_lock_range;
alter table public.devices add constraint devices_auto_lock_range
  check (auto_lock between 0 and 120) not valid;
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
alter table public.live_tracks drop constraint if exists live_tracks_token_check;
alter table public.live_tracks
  drop constraint if exists live_tracks_lat_check,
  drop constraint if exists live_tracks_lng_check,
  drop constraint if exists live_tracks_accuracy_check,
  drop constraint if exists live_tracks_battery_check;
alter table public.live_tracks
  add constraint live_tracks_token_check
    check (token ~ '^[0-9a-f]{32}$') not valid,
  add constraint live_tracks_lat_check
    check (lat between -90 and 90) not valid,
  add constraint live_tracks_lng_check
    check (lng between -180 and 180) not valid,
  add constraint live_tracks_accuracy_check
    check (accuracy is null or (accuracy >= 0 and accuracy < 'Infinity'::real)) not valid,
  add constraint live_tracks_battery_check
    check (battery is null or battery between 0 and 100) not valid;

alter table public.devices validate constraint devices_auto_lock_range;
alter table public.alert_logs validate constraint alert_logs_contact_count_check;
alter table public.alert_logs validate constraint alert_counts_nonnegative;
alter table public.alert_logs validate constraint alert_counts_consistent;
alter table public.live_tracks validate constraint live_tracks_token_check;
alter table public.live_tracks validate constraint live_tracks_lat_check;
alter table public.live_tracks validate constraint live_tracks_lng_check;
alter table public.live_tracks validate constraint live_tracks_accuracy_check;
alter table public.live_tracks validate constraint live_tracks_battery_check;

create unique index if not exists devices_user_device_uidx
  on public.devices (user_id, device_id);
create index if not exists alertlogs_user_fired_idx
  on public.alert_logs (user_id, fired_at desc);
create index if not exists live_tracks_updated_at_idx
  on public.live_tracks (updated_at);
drop index if exists public.devices_user_id_idx;
drop index if exists public.alertlogs_user_id_idx;
drop index if exists public.alertlogs_fired_at_idx;

alter table public.devices enable row level security;
alter table public.alert_logs enable row level security;
alter table public.live_tracks enable row level security;

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
revoke all on public.live_tracks from anon, authenticated;

drop function if exists public.push_track(text, double precision, double precision, real, smallint, boolean);
create function public.push_track(
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
grant execute on function public.push_track(text, double precision, double precision, real, smallint, boolean) to authenticated;
grant execute on function public.get_track(text) to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;
drop trigger if exists devices_updated_at on public.devices;
create trigger devices_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

create or replace view public.alert_stats
with (security_invoker = true) as
select
  user_id,
  count(*)::bigint as total_alerts,
  coalesce(sum(contacts_opened), 0)::bigint as total_opened,
  coalesce(sum(contacts_failed), 0)::bigint as total_failed,
  coalesce(sum(case when location_shared then 1 else 0 end), 0)::bigint as alerts_with_location,
  max(fired_at) as last_alert_at
from public.alert_logs
group by user_id;

grant usage on schema public to authenticated, anon;
grant select on public.alert_stats to authenticated;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.devices'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.alert_logs'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.live_tracks'::regclass) then
    raise exception 'Migration verification failed: row-level security is not enabled';
  end if;
  if not has_function_privilege('authenticated',
         'public.push_track(text,double precision,double precision,real,smallint,boolean)', 'EXECUTE')
     or has_function_privilege('anon',
         'public.push_track(text,double precision,double precision,real,smallint,boolean)', 'EXECUTE')
     or not has_function_privilege('anon', 'public.get_track(text)', 'EXECUTE')
     or has_table_privilege('anon', 'public.live_tracks', 'SELECT') then
    raise exception 'Migration verification failed: live-location access grants are unsafe';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'devices_user_device_uidx'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'alertlogs_user_fired_idx'
  ) then
    raise exception 'Migration verification failed: required indexes are missing';
  end if;
end;
$$;
