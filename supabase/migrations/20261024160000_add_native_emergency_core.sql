begin;

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

  delete from public.live_tracks
  where token = p_token and user_id = auth.uid();
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.stop_track(text) from public, anon, authenticated;
grant execute on function public.stop_track(text) to authenticated;

do $$
begin
  if not (
    select count(*) = 3 from pg_class
    where oid in (
      'public.trusted_contacts'::regclass,
      'public.emergency_sessions'::regclass,
      'public.emergency_location_updates'::regclass
    ) and relrowsecurity
  ) then
    raise exception 'Migration verification failed: emergency tables must have RLS enabled';
  end if;
  if has_table_privilege('anon', 'public.trusted_contacts', 'SELECT')
     or has_table_privilege('anon', 'public.emergency_sessions', 'SELECT')
     or has_table_privilege('anon', 'public.emergency_location_updates', 'SELECT')
     or has_table_privilege('anon', 'public.emergency_location_updates', 'INSERT') then
    raise exception 'Migration verification failed: anonymous emergency data access is enabled';
  end if;
  if not has_function_privilege('authenticated', 'public.stop_track(text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.stop_track(text)', 'EXECUTE') then
    raise exception 'Migration verification failed: tracking stop permissions are unsafe';
  end if;
end;
$$;

commit;
