-- «Вектор»: ИИ-режимы (CL-8) — учёт токенов и долларов, дневной бюджет, кэш классификаций.
-- Выполнять после schema.sql (и остальных). Можно запускать повторно.
-- Вызывает только серверная функция tutor (service_role); браузеру всё закрыто.

alter table vk_ai_usage add column if not exists tokens_in bigint not null default 0;
alter table vk_ai_usage add column if not exists tokens_out bigint not null default 0;
alter table vk_ai_usage add column if not exists usd numeric(12, 6) not null default 0;
update vk_settings set value = value || '{"usd_day": 3}' where key = 'ai' and not value ? 'usd_day';

-- Одинаковая ошибка в одинаковой задаче классифицируется один раз для всех детей
create table if not exists vk_ai_cache (key text primary key, value jsonb not null, created timestamptz not null default now());
alter table vk_ai_cache enable row level security;
revoke all on vk_ai_cache from anon, authenticated;

-- Списать одно обращение: сессия, выключатель, лимит ученика, общий лимит и бюджет в долларах на день
create or replace function vk_ai_take(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int; cfg jsonb; mine int; total int; spent numeric;
begin
  begin uid := vk_auth(p_token, 'student');
  exception when others then return jsonb_build_object('ok', false, 'reason', 'no_session'); end;
  select value into cfg from vk_settings where key = 'ai';
  if not coalesce((cfg->>'enabled')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'disabled'); end if;
  select coalesce(sum(n), 0), coalesce(sum(usd), 0) into total, spent from vk_ai_usage where day = current_date;
  if total >= coalesce((cfg->>'total_day')::int, 3000) then return jsonb_build_object('ok', false, 'reason', 'total_limit'); end if;
  if spent >= coalesce((cfg->>'usd_day')::numeric, 3) then return jsonb_build_object('ok', false, 'reason', 'budget'); end if;
  insert into vk_ai_usage (student_id) values (uid) on conflict (student_id, day) do nothing;
  update vk_ai_usage set n = n + 1 where student_id = uid and day = current_date
    and n < coalesce((cfg->>'per_student_day')::int, 30) returning n into mine;
  if mine is null then return jsonb_build_object('ok', false, 'reason', 'student_limit'); end if;
  return jsonb_build_object('ok', true, 'student_id', uid, 'n', mine);
end $$;

-- Кэш: проверяет сессию, но лимит не тратит
create or replace function vk_ai_cache_get(p_token text, p_key text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int; v jsonb;
begin
  begin uid := vk_auth(p_token, 'student');
  exception when others then return jsonb_build_object('ok', false, 'reason', 'no_session'); end;
  select value into v from vk_ai_cache where key = p_key and created > now() - interval '60 days';
  return jsonb_build_object('ok', true, 'student_id', uid, 'value', v);
end $$;
create or replace function vk_ai_cache_put(p_key text, p_value jsonb) returns void
language sql security definer set search_path = public as $$
  insert into vk_ai_cache (key, value) values (p_key, p_value) on conflict (key) do update set value = excluded.value, created = now() $$;

-- Учёт фактических токенов и стоимости
create or replace function vk_ai_spend(p_student int, p_in int, p_out int, p_usd numeric) returns void
language sql security definer set search_path = public as $$
  insert into vk_ai_usage (student_id, n, tokens_in, tokens_out, usd) values (p_student, 0, greatest(p_in, 0), greatest(p_out, 0), greatest(p_usd, 0))
  on conflict (student_id, day) do update set tokens_in = vk_ai_usage.tokens_in + excluded.tokens_in,
    tokens_out = vk_ai_usage.tokens_out + excluded.tokens_out, usd = vk_ai_usage.usd + excluded.usd $$;

-- Расход ИИ по дням в долларах: select * from vk_ai_cost;
create or replace view vk_ai_cost with (security_invoker = true) as
  select day, sum(n) requests, count(*) students, sum(tokens_in) tokens_in, sum(tokens_out) tokens_out,
    round(sum(usd), 4) usd, round(sum(usd) / nullif(count(*), 0), 5) usd_per_student
  from vk_ai_usage group by day order by day desc;

revoke execute on function vk_ai_take(text), vk_ai_cache_get(text, text), vk_ai_cache_put(text, jsonb), vk_ai_spend(int, int, int, numeric) from public, anon, authenticated;
revoke all on vk_ai_cost from anon, authenticated;
do $$ begin grant execute on function vk_ai_take(text), vk_ai_cache_get(text, text), vk_ai_cache_put(text, jsonb), vk_ai_spend(int, int, int, numeric) to service_role;
exception when undefined_object then null; end $$;
