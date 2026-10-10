create table if not exists public.daily_faucet_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_faucet_claims (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reward integer not null check (reward > 0),
  claimed_at timestamptz not null default now()
);

create table if not exists public.reward_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (source_type in ('daily_faucet', 'earn_task')),
  source_id bigint not null,
  points integer not null check (points > 0),
  balance_after integer not null check (balance_after >= points),
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists daily_faucet_claims_user_claimed_at_idx
  on public.daily_faucet_claims (user_id, claimed_at desc);

alter table public.daily_faucet_accounts enable row level security;
alter table public.daily_faucet_claims enable row level security;
alter table public.reward_ledger enable row level security;

revoke all on public.daily_faucet_accounts, public.daily_faucet_claims, public.reward_ledger from anon, authenticated;
grant select on public.daily_faucet_accounts, public.daily_faucet_claims, public.reward_ledger to authenticated;

create policy "Users can read their own faucet points"
  on public.daily_faucet_accounts for select
  using ((select auth.uid()) = user_id);

create policy "Users can read their own faucet claims"
  on public.daily_faucet_claims for select
  using ((select auth.uid()) = user_id);

create policy "Users can read their own reward ledger"
  on public.reward_ledger for select
  using ((select auth.uid()) = user_id);

create or replace function public.claim_daily_faucet()
returns table (
  claimed boolean,
  reward integer,
  balance integer,
  last_claim_at timestamptz,
  next_claim_at timestamptz
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

  select claim.claimed_at
  into v_last_claim_at
  from public.daily_faucet_claims as claim
  where claim.user_id = v_user_id
  order by claim.claimed_at desc
  limit 1;

  if v_last_claim_at is not null and v_last_claim_at > v_now - interval '24 hours' then
    return query
      select false, 0, v_balance, v_last_claim_at, v_last_claim_at + interval '24 hours';
    return;
  end if;

  insert into public.daily_faucet_claims (user_id, reward, claimed_at)
  values (v_user_id, v_reward, v_now)
  returning id into v_claim_id;

  update public.daily_faucet_accounts as account
  set points = account.points + v_reward,
      updated_at = v_now
  where account.user_id = v_user_id
  returning account.points into v_balance;

  insert into public.reward_ledger (user_id, source_type, source_id, points, balance_after, created_at)
  values (v_user_id, 'daily_faucet', v_claim_id, v_reward, v_balance, v_now);

  return query
    select true, v_reward, v_balance, v_now, v_now + interval '24 hours';
end;
$$;

revoke all on function public.claim_daily_faucet() from public, anon;
grant execute on function public.claim_daily_faucet() to authenticated;
