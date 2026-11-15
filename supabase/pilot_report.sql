-- «Вектор»: метрики пилота (CL-10, раздел 10.3 ТЗ). Только для SQL Editor, браузеру недоступно.
--   select jsonb_pretty(vk_pilot_report());          -- все пилотные классы
--   select jsonb_pretty(vk_pilot_report('5А', 30));   -- один класс, последние 30 дней
-- Всё считается из vk_events; ИИ не нужен.

create or replace function vk_pilot_report(p_class text default null, p_days int default 60) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 60), 1)); r jsonb;
begin
  with st as (
    select s.id from vk_students s join vk_classes c on c.id = s.class_id
    where c.grp = 'pilot' and (p_class is null or c.name = p_class)),
  ev as (select * from vk_events where student_id in (select id from st) and ts_server >= since),
  found as (select student_id, data->>'bug' bug, min(ts_server) t from ev where type = 'bug_found' and data->>'bug' ~ '^[a-z-]{2,40}:[a-z-]{2,60}$' group by 1, 2),
  beaten as (select student_id, data->>'bug' bug, min(ts_server) t from ev where type = 'bug_beaten' and data->>'bug' ~ '^[a-z-]{2,40}:[a-z-]{2,60}$' group by 1, 2),
  control as (select student_id, data->>'bug' bug, bool_and((data->>'ok')::boolean) ok from ev
              where type = 'trap' and (data->>'stage')::int = 3 group by 1, 2),
  pushes as (
    select p.id, p.bug, p.created, (select min(e.ts_server) from ev e where e.type = 'bug_found' and e.data->>'bug' = p.bug
      and e.ts_server between p.created - interval '45 minutes' and p.created) first_seen
    from vk_pushes p where p.created >= since and p.logins && array(select s.login from vk_students s where s.id in(select id from st))),
  days as (select student_id, count(distinct (ts_server at time zone 'Europe/Moscow')::date) d,
             min(ts_server) first, max(ts_server) last from ev group by 1)
  select jsonb_build_object(
    'students', (select count(*) from st),
    'active_students', (select count(*) from days),
    -- главная метрика: жучки, побеждённые и не вернувшиеся на контрольной ловушке через 7 дней
    'bugs_found', (select count(*) from found),
    'bugs_beaten', (select count(*) from beaten),
    'beaten_share', (select round(count(b.*)::numeric / nullif(count(f.*), 0), 3) from found f left join beaten b using (student_id, bug)),
    'control_taken', (select count(*) from control),
    'control_not_returned_share', (select round(count(*) filter (where ok)::numeric / nullif(count(*), 0), 3) from control),
    'median_days_to_beaten', (select round((percentile_cont(0.5) within group (order by extract(epoch from b.t - f.t) / 86400))::numeric, 1)
                              from found f join beaten b using (student_id, bug)),
    'top_bugs', (select coalesce(jsonb_agg(x order by (x->>'n')::int desc,x->>'bug'), '[]') from (
                  select jsonb_build_object('bug', bug, 'n', count(*)) x from found group by bug order by count(*) desc limit 10) z),
    'steps_share', (select round((select count(*) from ev where type = 'draft')::numeric
                     / nullif((select count(*) from ev where type = 'attempt' and not coalesce((data->>'ok')::boolean, false)), 0), 3)),
    'teacher_reaction_median_min', (select round((percentile_cont(0.5) within group (order by extract(epoch from created - first_seen) / 60))::numeric, 1)
                                    from pushes where first_seen is not null),
    'pushes', (select count(*) from pushes),
    'active_days_per_week', (select round(avg(d * 7.0 / greatest(1, ceil(extract(epoch from now() - first) / 86400 / 7) * 7))::numeric, 2) from days),
    'returned_after_7_days_share', (select round(count(*) filter (where last >= first + interval '7 days')::numeric / nullif(count(*) filter (where first <= now() - interval '7 days'), 0), 3) from days),
    'drobik_rounds', (select count(*) from ev where type = 'drobik_round'),
    'mood', (select coalesce(jsonb_object_agg(m, n), '{}') from (select data->>'mood' m, count(*) n from ev where type = 'feedback' and data->>'mood' ~ '^[1-5]$' group by 1) z)
  ) into r;
  return r;
end $$;
revoke execute on function vk_pilot_report(text, int) from public, anon, authenticated;

-- CX-26. Только учитель с флагом is_admin, данные только в агрегатах.
create or replace function vektor_admin_classes(p_token text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'teacher');begin
 if not exists(select 1 from vk_teachers where id=uid and is_admin) then raise exception 'forbidden' using errcode='P0403';end if;
 return coalesce((select jsonb_agg(name order by name) from vk_classes where grp='pilot'),'[]');end $$;
create or replace function vektor_admin_report(p_token text,p_class text default null,p_days int default 30) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'teacher');days int:=least(greatest(coalesce(p_days,30),1),365);ids int[];base jsonb;rate numeric;rub numeric;costs jsonb;since timestamptz;
begin
 if not exists(select 1 from vk_teachers where id=uid and is_admin) then raise exception 'forbidden' using errcode='P0403';end if;
 p_class:=nullif(p_class,'');since:=now()-make_interval(days=>days);
 select coalesce(array_agg(s.id),'{}') into ids from vk_students s join vk_classes c on c.id=s.class_id where c.grp='pilot' and (p_class is null or c.name=p_class);
 base:=vk_pilot_report(p_class,days);
 select (value->>'rub_per_usd')::numeric into rate from vk_settings where key='ai';
 select coalesce(sum(usd),0)*rate into rub from vk_ai_usage where student_id=any(ids) and day>=current_date-(days-1);
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into costs from(select topic,count(*) questions,avg(tokens_in) tokens_in,avg(tokens_out) tokens_out,
   avg(usd*rub_per_usd) rub_per_question,count(*) filter(where rub_per_usd is null) without_exchange_rate,count(*) filter(where estimated) estimated_questions
   from vk_ai_questions where student_id=any(ids) and created>=since group by topic order by topic)x;
 return base||jsonb_build_object('days',days,'class',p_class,
  'logged_in_students',(select count(distinct actor_id) from vk_audit where actor_role='student' and action='login' and ts>=since and actor_id=any(ids)),
  'parents_registered',(select count(*) from vk_adults a where a.role='parent' and a.created>=since and (p_class is null or exists(select 1 from vk_links l where l.adult_id=a.id and l.student_id=any(ids)))),
  'parents_registered_scope',case when p_class is null then 'all' else 'linked_to_class' end,
  'parents_linked',(select count(distinct l.adult_id) from vk_links l join vk_adults a on a.id=l.adult_id where a.role='parent' and l.student_id=any(ids) and l.created>=since),
  'students_password_changed',(select count(distinct a.target) from vk_audit a where a.action='password_change' and a.actor_role='student' and a.ts>=since and a.target=any(array(select 'student:'||x from unnest(ids)x))),
  'ai_rub_total',rub,'ai_rub_per_active_student',rub/nullif((base->>'active_students')::numeric,0),'rub_per_usd',rate,
  'ai_cost_basis','daily_usage_at_current_exchange_rate','ai_cost_by_topic',costs);
end $$;
revoke execute on function vektor_admin_classes(text),vektor_admin_report(text,text,int) from public,anon,authenticated;
grant execute on function vektor_admin_classes(text),vektor_admin_report(text,text,int) to anon,authenticated;
