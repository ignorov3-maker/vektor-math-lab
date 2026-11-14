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
declare uid int; cfg jsonb; mine int; total int; spent numeric; student_spent numeric; rate numeric; student_cap numeric; day_cap numeric;
begin
  begin uid := vk_auth(p_token, 'student');
  exception when others then return jsonb_build_object('ok', false, 'reason', 'no_session'); end;
  -- Сериализуем проверку глобального бюджета и счётчиков.
  select value into cfg from vk_settings where key = 'ai' for update;
  if not coalesce((cfg->>'enabled')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'disabled'); end if;
  select coalesce(sum(n), 0), coalesce(sum(usd), 0) into total, spent from vk_ai_usage where day = current_date;
  if total >= coalesce((cfg->>'total_day')::int, 3000) then return jsonb_build_object('ok', false, 'reason', 'total_limit'); end if;
  if spent >= coalesce((cfg->>'usd_day')::numeric, 3) then return jsonb_build_object('ok', false, 'reason', 'budget'); end if;
  rate := (cfg->>'rub_per_usd')::numeric;
  student_cap := coalesce((cfg->>'rub_student_day')::numeric, (cfg->>'usd_day')::numeric * rate);
  if to_regprocedure('vk_limits(text,integer)') is not null then
    student_cap := coalesce((vk_limits('student', uid)->>'rub_student_day')::numeric, student_cap);
  end if;
  day_cap := coalesce((cfg->>'rub_day')::numeric, (cfg->>'usd_day')::numeric * rate);
  select coalesce(sum(usd), 0) into student_spent from vk_ai_usage where day = current_date and student_id = uid;
  if rate > 0 and student_spent * rate >= student_cap then return jsonb_build_object('ok', false, 'reason', 'student_budget'); end if;
  if rate > 0 and spent * rate >= day_cap then return jsonb_build_object('ok', false, 'reason', 'budget'); end if;
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
create table if not exists vk_ai_questions(id bigserial primary key,student_id int not null references vk_students(id) on delete cascade,
  topic text not null,tokens_in bigint not null,tokens_out bigint not null,usd numeric not null,rub_per_usd numeric,estimated boolean not null default false,created timestamptz not null default now());
create index if not exists vk_ai_questions_topic on vk_ai_questions(created,topic);
alter table vk_ai_questions enable row level security;
revoke all on vk_ai_questions from public,anon,authenticated;
drop function if exists vk_ai_spend(int,int,int,numeric);
create or replace function vk_ai_spend(p_student int, p_in int, p_out int, p_usd numeric,p_topic text default 'unknown',p_estimated boolean default false) returns void
language plpgsql security definer set search_path = public, extensions as $$ begin
  insert into vk_ai_usage (student_id, n, tokens_in, tokens_out, usd) values (p_student, 0, greatest(p_in, 0), greatest(p_out, 0), greatest(p_usd, 0))
  on conflict (student_id, day) do update set tokens_in = vk_ai_usage.tokens_in + excluded.tokens_in,
    tokens_out = vk_ai_usage.tokens_out + excluded.tokens_out, usd = vk_ai_usage.usd + excluded.usd;
  insert into vk_ai_questions(student_id,topic,tokens_in,tokens_out,usd,rub_per_usd,estimated)
    values(p_student,case when p_topic ~ '^[a-z0-9_-]{1,80}$' then p_topic else 'unknown' end,greatest(p_in,0),greatest(p_out,0),greatest(p_usd,0),
      (select (value->>'rub_per_usd')::numeric from vk_settings where key='ai'),p_estimated);
end $$;
create or replace function vk_ai_cost_by_topic(p_days int default 30) returns jsonb language sql security definer
set search_path=public,extensions as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') from(select topic,count(*) questions,avg(tokens_in) tokens_in,avg(tokens_out) tokens_out,
   avg(usd*rub_per_usd) rub_per_question,count(*) filter(where rub_per_usd is null) without_exchange_rate,count(*) filter(where estimated) estimated_questions
 from vk_ai_questions where created>=now()-make_interval(days=>least(greatest(p_days,1),365)) group by topic order by topic)x $$;

-- Расход ИИ по дням в долларах: select * from vk_ai_cost;
create or replace view vk_ai_cost with (security_invoker = true) as
  select day, sum(n) requests, count(*) students, sum(tokens_in) tokens_in, sum(tokens_out) tokens_out,
    round(sum(usd), 4) usd, round(sum(usd) / nullif(count(*), 0), 5) usd_per_student
  from vk_ai_usage group by day order by day desc;

revoke execute on function vk_ai_take(text), vk_ai_cache_get(text, text), vk_ai_cache_put(text, jsonb), vk_ai_spend(int, int, int, numeric,text,boolean),vk_ai_cost_by_topic(int) from public, anon, authenticated;
revoke all on vk_ai_cost from anon, authenticated;
do $$ begin grant execute on function vk_ai_take(text), vk_ai_cache_get(text, text), vk_ai_cache_put(text, jsonb), vk_ai_spend(int, int, int, numeric,text,boolean) to service_role;
exception when undefined_object then null; end $$;
