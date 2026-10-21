-- Add secure PIN authentication tables and functions
-- This migration adds server-side PIN storage and verification

begin;

-- Table to store user PIN hashes (bcrypt for short PINs)
create table if not exists public.user_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  pin1_hash text not null check (length(pin1_hash) >= 40),
  pin2_hash text not null check (length(pin2_hash) >= 40),
  failed_attempts smallint not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table to store security questions for PIN recovery
create table if not exists public.security_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  question1_id text not null check (length(question1_id) >= 3),
  question1_answer_hash text not null check (length(question1_answer_hash) >= 40),
  question2_id text not null check (length(question2_id) >= 3),
  question2_answer_hash text not null check (length(question2_answer_hash) >= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_questions check (question1_id <> question2_id)
);

-- Enable RLS
alter table public.user_pins enable row level security;
alter table public.security_questions enable row level security;

-- RLS policies: users can only access their own records
drop policy if exists user_pins_owner on public.user_pins;
create policy user_pins_owner on public.user_pins
  for select using (auth.uid() = user_id);

drop policy if exists security_questions_owner on public.security_questions;
create policy security_questions_owner on public.security_questions
  for select using (auth.uid() = user_id);

-- Revoke direct access
revoke all on public.user_pins, public.security_questions from anon, authenticated;
grant select on public.user_pins, public.security_questions to authenticated;

-- Update triggers
drop trigger if exists user_pins_updated_at on public.user_pins;
create trigger user_pins_updated_at
  before update on public.user_pins
  for each row execute function public.set_updated_at();

drop trigger if exists security_questions_updated_at on public.security_questions;
create trigger security_questions_updated_at
  before update on public.security_questions
  for each row execute function public.set_updated_at();

-- Indexes for performance
create index if not exists user_pins_user_id_idx on public.user_pins (user_id);
create index if not exists security_questions_user_id_idx on public.security_questions (user_id);

commit;
