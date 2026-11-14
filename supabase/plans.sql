-- CX-17. Никаких цен и платежей. Лимиты pilot задаёт владелец, пустое поле не переопределяет общую настройку.
create table if not exists vk_plans(code text primary key,name text not null,limits jsonb not null default '{}' check(jsonb_typeof(limits)='object'));
create table if not exists vk_subscriptions (
  id serial primary key,owner_kind text not null check(owner_kind in ('student','adult','class')),owner_id int not null,
  plan text not null references vk_plans(code), starts timestamptz not null default now(),ends timestamptz,
  source text not null check(source in ('pilot','manual','payment')),created timestamptz not null default now(),
  check(ends is null or ends>starts));
create index if not exists vk_subscriptions_owner on vk_subscriptions(owner_kind,owner_id,starts desc);
insert into vk_plans values('pilot','Пилот','{}') on conflict(code) do nothing;
alter table vk_plans enable row level security;
alter table vk_subscriptions enable row level security;
revoke all on vk_plans,vk_subscriptions from public,anon,authenticated;
create or replace function vk_limits(p_owner_kind text,p_owner_id int) returns jsonb language plpgsql stable security definer
set search_path=public,extensions as $$
declare lim jsonb;
begin
  if p_owner_kind not in ('student','adult','class') then raise exception 'invalid_owner'; end if;
  select p.limits into lim from vk_subscriptions s join vk_plans p on p.code=s.plan
    where s.owner_kind=p_owner_kind and s.owner_id=p_owner_id and s.starts<=now() and (s.ends is null or s.ends>now())
    order by s.starts desc,s.id desc limit 1;
  return coalesce(lim,(select limits from vk_plans where code='pilot'),'{}'::jsonb);
end $$;
revoke execute on function vk_limits(text,int) from public,anon,authenticated;
