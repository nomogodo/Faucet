create table if not exists public.earn_task_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_key text not null check (task_key in ('complete_profile')),
  reward integer not null check (reward > 0),
  completed_at timestamptz not null default now(),
  unique (user_id, task_key)
);

alter table public.earn_task_completions enable row level security;
revoke all on public.earn_task_completions from anon, authenticated;
grant select on public.earn_task_completions to authenticated;

create policy "Users can read their own task completions"
  on public.earn_task_completions for select
  using ((select auth.uid()) = user_id);

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
  v_reward constant integer := 25;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if task_key is distinct from 'complete_profile' then
    raise exception 'Unknown earn task' using errcode = '22023';
  end if;

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
