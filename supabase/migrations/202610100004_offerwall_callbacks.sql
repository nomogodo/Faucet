alter table public.reward_ledger
  drop constraint if exists reward_ledger_source_type_check;

alter table public.reward_ledger
  add constraint reward_ledger_source_type_check
  check (source_type in ('daily_faucet', 'earn_task', 'offerwall'));

create table if not exists public.offerwall_completions (
  id bigint generated always as identity primary key,
  provider text not null check (provider ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  external_transaction_id text not null check (char_length(external_transaction_id) between 1 and 128),
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points between 1 and 100000),
  completed_at timestamptz not null default now(),
  unique (provider, external_transaction_id)
);

create index if not exists offerwall_completions_user_completed_at_idx
  on public.offerwall_completions (user_id, completed_at desc);

alter table public.offerwall_completions enable row level security;
revoke all on public.offerwall_completions from public, anon, authenticated;

create or replace function public.credit_offerwall_completion(
  p_provider text,
  p_external_transaction_id text,
  p_user_id uuid,
  p_points integer
)
returns table (
  credited boolean,
  balance integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_completion_id bigint;
  v_existing public.offerwall_completions%rowtype;
  v_balance integer;
  v_now timestamptz := now();
begin
  if p_provider is null or p_provider !~ '^[a-z0-9][a-z0-9_-]{0,39}$'
    or p_external_transaction_id is null
    or char_length(p_external_transaction_id) not between 1 and 128
    or p_user_id is null
    or p_points is null
    or p_points not between 1 and 100000 then
    raise exception 'Invalid offerwall completion' using errcode = '22023';
  end if;

  insert into public.daily_faucet_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select account.points
  into v_balance
  from public.daily_faucet_accounts as account
  where account.user_id = p_user_id
  for update;

  insert into public.offerwall_completions (
    provider,
    external_transaction_id,
    user_id,
    points,
    completed_at
  )
  values (
    p_provider,
    p_external_transaction_id,
    p_user_id,
    p_points,
    v_now
  )
  on conflict (provider, external_transaction_id) do nothing
  returning id into v_completion_id;

  if v_completion_id is null then
    select completion.*
    into v_existing
    from public.offerwall_completions as completion
    where completion.provider = p_provider
      and completion.external_transaction_id = p_external_transaction_id;

    if v_existing.user_id is distinct from p_user_id or v_existing.points is distinct from p_points then
      raise exception 'Offerwall transaction conflicts with its original completion' using errcode = '23505';
    end if;

    return query select false, v_balance;
    return;
  end if;

  if v_balance > 2147483647 - p_points then
    raise exception 'Points balance limit exceeded' using errcode = '22003';
  end if;

  update public.daily_faucet_accounts as account
  set points = account.points + p_points,
      updated_at = v_now
  where account.user_id = p_user_id
  returning account.points into v_balance;

  insert into public.reward_ledger (user_id, source_type, source_id, points, balance_after, created_at)
  values (p_user_id, 'offerwall', v_completion_id, p_points, v_balance, v_now);

  return query select true, v_balance;
end;
$$;

revoke all on function public.credit_offerwall_completion(text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.credit_offerwall_completion(text, text, uuid, integer) to service_role;
