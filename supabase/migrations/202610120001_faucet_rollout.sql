-- Despliegue del faucet: tareas nuevas, racha diaria y avisos de cuenta.

-- 1) Nuevas tareas internas verificables en el servidor.
alter table public.earn_task_completions
  drop constraint if exists earn_task_completions_task_key_check;

alter table public.earn_task_completions
  add constraint earn_task_completions_task_key_check
  check (task_key in ('complete_profile', 'enable_two_factor', 'first_daily_claim'));

-- complete_earn_task() se reemplaza más abajo para validar los nuevos requisitos.

-- 2) Racha diaria del faucet.
create table if not exists public.daily_faucet_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_claim_date date,
  updated_at timestamptz not null default now()
);

alter table public.daily_faucet_streaks enable row level security;
revoke all on public.daily_faucet_streaks from anon, authenticated;
grant select on public.daily_faucet_streaks to authenticated;

create policy "Users can read their own faucet streak"
  on public.daily_faucet_streaks for select
  using ((select auth.uid()) = user_id);

-- claim_daily_faucet() se reemplaza más abajo para registrar la racha.

-- 3) Avisos leídos por el usuario (centro de actividad persistente).
create table if not exists public.user_notices (
  user_id uuid not null references auth.users (id) on delete cascade,
  notice_key text not null check (notice_key in ('deposit_qr_pending', 'offerwall_providers_pending')),
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notice_key)
);

alter table public.user_notices enable row level security;
revoke all on public.user_notices from anon;
grant select, insert on public.user_notices to authenticated;

create policy "Users can read their own dismissed notices"
  on public.user_notices for select
  using ((select auth.uid()) = user_id);

create policy "Users can dismiss their own notices"
  on public.user_notices for insert
  with check ((select auth.uid()) = user_id);

-- 4) Reescritura de claim_daily_faucet(): misma validación + racha diaria.
create or replace function public.claim_daily_faucet()
returns table (
  claimed boolean,
  reward integer,
  balance integer,
  last_claim_at timestamptz,
  next_claim_at timestamptz,
  current_streak integer,
  bonus integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_balance integer;
  v_claim_id bigint;
  v_last_claim_at timestamptz;
  v_reward constant integer := 10;
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'utc')::date;
  v_yesterday date := ((v_now - interval '1 day') at time zone 'utc')::date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_last_claim_date date;
  v_bonus integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.daily_faucet_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select account.points
  into v_balance
  from public.daily_faucet_accounts as account
  where account.user_id = v_user_id
  for update;

  insert into public.daily_faucet_streaks (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select streak.current_streak, streak.longest_streak, streak.last_claim_date
  into v_current_streak, v_longest_streak, v_last_claim_date
  from public.daily_faucet_streaks as streak
  where streak.user_id = v_user_id
  for update;

  select claim.claimed_at
  into v_last_claim_at
  from public.daily_faucet_claims as claim
  where claim.user_id = v_user_id
  order by claim.claimed_at desc
  limit 1;

  if v_last_claim_at is not null and v_last_claim_at > v_now - interval '24 hours' then
    return query
      select false, 0, v_balance, v_last_claim_at, v_last_claim_at + interval '24 hours',
             v_current_streak, 0;
    return;
  end if;

  -- Bono de racha: +2 puntos por cada reclamación consecutiva (día UTC previo),
  -- con un máximo de +10 (racha de 5 días o más).
  if v_last_claim_date = v_yesterday then
    v_current_streak := v_current_streak + 1;
  else
    v_current_streak := 1;
  end if;
  v_bonus := least(v_current_streak * 2, 10);

  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;

  update public.daily_faucet_streaks as streak
  set current_streak = v_current_streak,
      longest_streak = v_longest_streak,
      last_claim_date = v_today,
      updated_at = v_now
  where streak.user_id = v_user_id;

  insert into public.daily_faucet_claims (user_id, reward, claimed_at)
  values (v_user_id, v_reward + v_bonus, v_now)
  returning id into v_claim_id;

  update public.daily_faucet_accounts as account
  set points = account.points + v_reward + v_bonus,
      updated_at = v_now
  where account.user_id = v_user_id
  returning account.points into v_balance;

  insert into public.reward_ledger (user_id, source_type, source_id, points, balance_after, created_at)
  values (v_user_id, 'daily_faucet', v_claim_id, v_reward + v_bonus, v_balance, v_now);

  return query
    select true, v_reward + v_bonus, v_balance, v_now, v_now + interval '24 hours',
           v_current_streak, v_bonus;
end;
$$;

revoke all on function public.claim_daily_faucet() from public, anon;
grant execute on function public.claim_daily_faucet() to authenticated;

-- 5) Reescritura de complete_earn_task(): recompensas por tarea y verificación de requisitos.
create or replace function public.complete_earn_task(task_key text)
returns table (
  awarded boolean,
  reward integer,
  balance integer,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account_balance integer;
  v_completion_id bigint;
  v_existing public.earn_task_completions%rowtype;
  v_email_confirmed boolean;
  v_display_name text;
  v_reward integer;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if task_key = 'complete_profile' then
    v_reward := 25;
  elsif task_key = 'enable_two_factor' then
    v_reward := 40;
  elsif task_key = 'first_daily_claim' then
    v_reward := 15;
  else
    raise exception 'Unknown earn task' using errcode = '22023';
  end if;

  -- Requisitos específicos validados en el servidor, nunca desde el navegador.
  if task_key = 'complete_profile' then
    select (user_record.email_confirmed_at is not null),
           nullif(btrim(user_record.raw_user_meta_data ->> 'display_name'), '')
    into v_email_confirmed, v_display_name
    from auth.users as user_record
    where user_record.id = v_user_id;

    if not coalesce(v_email_confirmed, false)
      or v_display_name is null
      or char_length(v_display_name) > 50 then
      raise exception 'Task requirements not met' using errcode = '22023';
    end if;
  end if;

  if task_key = 'enable_two_factor' then
    if not exists (
      select 1
      from auth.authenticators as authenticator
      where authenticator.user_id = v_user_id
        and authenticator.status = 'verified'
    ) then
      raise exception 'Task requirements not met' using errcode = '22023';
    end if;
  end if;

  if task_key = 'first_daily_claim' then
    if not exists (
      select 1
      from public.daily_faucet_claims as claim
      where claim.user_id = v_user_id
    ) then
      raise exception 'Task requirements not met' using errcode = '22023';
    end if;
  end if;

  insert into public.daily_faucet_accounts (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select account.points
  into v_account_balance
  from public.daily_faucet_accounts as account
  where account.user_id = v_user_id
  for update;

  select completion.*
  into v_existing
  from public.earn_task_completions as completion
  where completion.user_id = v_user_id
    and completion.task_key = $1;

  if found then
    return query
      select false, v_existing.reward, v_account_balance, v_existing.completed_at;
    return;
  end if;

  insert into public.earn_task_completions (user_id, task_key, reward, completed_at)
  values (v_user_id, task_key, v_reward, v_now)
  returning id into v_completion_id;

  update public.daily_faucet_accounts as account
  set points = account.points + v_reward,
      updated_at = v_now
  where account.user_id = v_user_id
  returning account.points into v_account_balance;

  insert into public.reward_ledger (user_id, source_type, source_id, points, balance_after, created_at)
  values (v_user_id, 'earn_task', v_completion_id, v_reward, v_account_balance, v_now);

  return query
    select true, v_reward, v_account_balance, v_now;
end;
$$;

revoke all on function public.complete_earn_task(text) from public, anon;
grant execute on function public.complete_earn_task(text) to authenticated;
