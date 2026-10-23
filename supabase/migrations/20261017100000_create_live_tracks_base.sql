begin;

create table if not exists public.live_tracks (
  token text primary key
    constraint live_tracks_token_check check (token ~ '^[0-9a-f]{32}$'),
  user_id uuid references auth.users(id) on delete cascade,
  lat double precision not null
    constraint live_tracks_lat_check check (lat between -90 and 90),
  lng double precision not null
    constraint live_tracks_lng_check check (lng between -180 and 180),
  accuracy real
    constraint live_tracks_accuracy_check
      check (accuracy is null or (accuracy >= 0 and accuracy < 'Infinity'::real)),
  battery smallint
    constraint live_tracks_battery_check
      check (battery is null or battery between 0 and 100),
  charging boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists live_tracks_updated_at_idx
  on public.live_tracks (updated_at);

alter table public.live_tracks enable row level security;
revoke all on public.live_tracks from public, anon, authenticated;

commit;
