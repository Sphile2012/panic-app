begin;

revoke all on public.user_pins, public.security_questions from public, anon, authenticated;

drop policy if exists user_pins_owner on public.user_pins;
drop policy if exists security_questions_owner on public.security_questions;

alter table public.user_pins enable row level security;
alter table public.security_questions enable row level security;

alter table public.user_pins
  add constraint user_pins_failed_attempts_limit
  check (failed_attempts between 0 and 20) not valid;
alter table public.security_questions
  add constraint security_questions_distinct_answers
  check (
    question1_id <> question2_id
    and length(trim(question1_answer_hash)) >= 60
    and length(trim(question2_answer_hash)) >= 60
  ) not valid;

alter table public.user_pins validate constraint user_pins_failed_attempts_limit;
alter table public.security_questions validate constraint security_questions_distinct_answers;

create or replace function public.store_account_pin_setup(
  p_user_id uuid,
  p_pin1_hash text,
  p_pin2_hash text,
  p_question1_id text,
  p_question1_answer_hash text,
  p_question2_id text,
  p_question2_answer_hash text
)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if p_user_id is null
     or p_pin1_hash is null or length(p_pin1_hash) < 60
     or p_pin2_hash is null or length(p_pin2_hash) < 60
     or p_question1_answer_hash is null or length(p_question1_answer_hash) < 60
     or p_question2_answer_hash is null or length(p_question2_answer_hash) < 60
     or p_question1_id is null or p_question2_id is null
     or p_question1_id = p_question2_id then
    raise exception using errcode = '22023', message = 'Invalid PIN setup data';
  end if;
  insert into public.user_pins (user_id, pin1_hash, pin2_hash, failed_attempts, locked_until)
  values (p_user_id, p_pin1_hash, p_pin2_hash, 0, null);
  insert into public.security_questions (
    user_id, question1_id, question1_answer_hash, question2_id, question2_answer_hash
  ) values (
    p_user_id, p_question1_id, p_question1_answer_hash,
    p_question2_id, p_question2_answer_hash
  );
end;
$$;

create or replace function public.record_pin_failure(p_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  attempts smallint;
  lock_expiry timestamptz;
begin
  update public.user_pins
  set failed_attempts = least(failed_attempts + 1, 20),
      locked_until = case
        when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
        else locked_until
      end,
      updated_at = now()
  where user_id = p_user_id
  returning failed_attempts, locked_until into attempts, lock_expiry;
  if attempts is null then
    raise exception using errcode = 'P0002', message = 'PIN profile not found';
  end if;
  return jsonb_build_object('failedAttempts', attempts, 'lockedUntil', lock_expiry);
end;
$$;

create or replace function public.clear_pin_failures(p_user_id uuid)
returns void
language sql security definer
set search_path = pg_catalog, public
as $$
  update public.user_pins
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = p_user_id;
$$;

revoke all on function public.store_account_pin_setup(uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.record_pin_failure(uuid) from public, anon, authenticated;
revoke all on function public.clear_pin_failures(uuid) from public, anon, authenticated;
grant execute on function public.store_account_pin_setup(uuid,text,text,text,text,text,text) to service_role;
grant execute on function public.record_pin_failure(uuid) to service_role;
grant execute on function public.clear_pin_failures(uuid) to service_role;

commit;
