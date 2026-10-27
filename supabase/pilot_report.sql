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
  found as (select student_id, data->>'bug' bug, min(ts_server) t from ev where type = 'bug_found' group by 1, 2),
  beaten as (select student_id, data->>'bug' bug, min(ts_server) t from ev where type = 'bug_beaten' group by 1, 2),
  control as (select student_id, data->>'bug' bug, bool_and((data->>'ok')::boolean) ok from ev
              where type = 'trap' and (data->>'stage')::int = 3 group by 1, 2),
  pushes as (
    select p.id, p.bug, p.created, (select min(e.ts_server) from ev e where e.type = 'bug_found' and e.data->>'bug' = p.bug
      and e.ts_server between p.created - interval '45 minutes' and p.created) first_seen
    from vk_pushes p where p.created >= since),
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
    'top_bugs', (select coalesce(jsonb_agg(x order by x->>'n' desc), '[]') from (
                  select jsonb_build_object('bug', bug, 'n', count(*)) x from found group by bug order by count(*) desc limit 10) z),
    'steps_share', (select round((select count(*) from ev where type = 'draft')::numeric
                     / nullif((select count(*) from ev where type = 'attempt' and not coalesce((data->>'ok')::boolean, false)), 0), 3)),
    'teacher_reaction_median_min', (select round((percentile_cont(0.5) within group (order by extract(epoch from created - first_seen) / 60))::numeric, 1)
                                    from pushes where first_seen is not null),
    'pushes', (select count(*) from pushes),
    'active_days_per_week', (select round(avg(d * 7.0 / greatest(1, ceil(extract(epoch from now() - first) / 86400 / 7) * 7))::numeric, 2) from days),
    'returned_after_7_days_share', (select round(count(*) filter (where last >= first + interval '7 days')::numeric / nullif(count(*) filter (where first <= now() - interval '7 days'), 0), 3) from days),
    'drobik_rounds', (select count(*) from ev where type = 'drobik_round'),
    'mood', (select coalesce(jsonb_object_agg(m, n), '{}') from (select data->>'mood' m, count(*) n from ev where type = 'feedback' group by 1) z)
  ) into r;
  return r;
end $$;
revoke execute on function vk_pilot_report(text, int) from public, anon, authenticated;
