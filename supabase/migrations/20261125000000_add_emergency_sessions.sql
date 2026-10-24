-- Emergency Sessions Table
-- Stores active and completed emergency sessions with all related data

begin;

-- Create emergency_sessions table
create table if not exists public.emergency_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    status text not null check (status in ('active', 'completed', 'cancelled')),
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    
    -- GPS Status
    gps_status text check (gps_status in ('acquiring', 'active', 'failed', 'denied', 'unavailable')),
    latitude double precision,
    longitude double precision,
    accuracy double precision,
    location_text text,
    
    -- Camera Status
    camera_status text check (camera_status in ('ready', 'capturing', 'completed', 'failed', 'denied', 'unavailable')),
    photo_count int default 0,
    
    -- Tracking Status
    tracking_status text check (tracking_status in ('inactive', 'active', 'paused', 'failed')),
    tracking_token text,
    
    -- Notification Status
    notification_status text check (notification_status in ('pending', 'sent', 'failed')),
    
    -- Metadata
    errors jsonb default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create emergency_photos table for storing photo metadata
create table if not exists public.emergency_photos (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.emergency_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null,
    file_size bigint,
    captured_at timestamptz not null default now(),
    upload_status text not null check (upload_status in ('pending', 'uploaded', 'failed')),
    created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.emergency_sessions enable row level security;
alter table public.emergency_photos enable row level security;

-- RLS Policies for emergency_sessions
create policy "Users can view their own emergency sessions"
    on public.emergency_sessions for select
    using (auth.uid() = user_id);

create policy "Users can insert their own emergency sessions"
    on public.emergency_sessions for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own emergency sessions"
    on public.emergency_sessions for update
    using (auth.uid() = user_id);

-- RLS Policies for emergency_photos
create policy "Users can view their own emergency photos"
    on public.emergency_photos for select
    using (auth.uid() = user_id);

create policy "Users can insert their own emergency photos"
    on public.emergency_photos for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own emergency photos"
    on public.emergency_photos for delete
    using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_emergency_sessions_user_id on public.emergency_sessions(user_id);
create index if not exists idx_emergency_sessions_status on public.emergency_sessions(status);
create index if not exists idx_emergency_sessions_started_at on public.emergency_sessions(started_at desc);
create index if not exists idx_emergency_photos_session_id on public.emergency_photos(session_id);
create index if not exists idx_emergency_photos_user_id on public.emergency_photos(user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_emergency_sessions_updated_at
    before update on public.emergency_sessions
    for each row
    execute function update_updated_at_column();

commit;
