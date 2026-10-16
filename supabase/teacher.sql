-- «Вектор»: кабинет учителя — карточка ученика, новый пароль, бумажки для класса (ТЗ по юзабилити: К-07, К-12).
-- Выполнять после schema.sql, test.sql и admin.sql. Можно запускать повторно.

-- Учитель видит только своих учеников (админ — всех)
create or replace function vk_teacher_student_id(p_uid int, p_login text) returns int
language sql stable security definer set search_path = public as $$
  select s.id from vk_students s, vk_teachers t
  where t.id = p_uid and s.login = vk_norm(p_login) and (t.is_admin or s.class_id = any(t.class_ids)) $$;

-- Карточка ученика: темы, частые ошибки, последние ответы, подсказки, вопросы к ИИ, сигналы
create or replace function vektor_teacher_student(p_token text, p_login text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); sid int := vk_teacher_student_id(uid, p_login); s vk_students; d0 timestamptz := vk_today_start();
begin
  if sid is null then return jsonb_build_object('error', 'forbidden', 'message', 'Нет такого ученика в ваших классах'); end if;
  select * into s from vk_students where id = sid;
  return jsonb_build_object(
    'login', s.login, 'class', (select name from vk_classes where id = s.class_id), 'last_seen', extract(epoch from s.last_seen)::bigint,
    'topics', (select coalesce(jsonb_object_agg(m.key, jsonb_build_object('p', coalesce((m.value->>'practice')::int, 0),
        'm', coalesce((m.value->>'mastered')::boolean, false), 'f', coalesce((m.value->>'failedChecks')::int, 0),
        'errors', coalesce(m.value->'errors', '{}'))), '{}') from jsonb_each(coalesce(s.state->'meta', '{}')) m),
    'cur', vk_cur(sid),
    'last', (select coalesce(jsonb_agg(jsonb_build_object('topic', x.data->>'topic', 'q', x.data->>'question', 'a', x.data->>'answer',
        'ok', coalesce((x.data->>'ok')::boolean, false), 'mistake', x.data->>'mistake', 'at', extract(epoch from x.ts_server)::bigint) order by x.ts_server desc), '[]')
      from (select * from vk_events where student_id = sid and type = 'attempt' order by ts_server desc limit 10) x),
    'today', (select count(*) from vk_events where student_id = sid and type = 'attempt' and ts_server >= d0 and (data->>'ok')::boolean),
    'hints_today', (select coalesce(sum(mh), 0) from (select max(coalesce((data->>'hints')::int, 0)) mh from vk_events
      where student_id = sid and type = 'attempt' and ts_server >= d0 group by data->>'question') z),
    'ai_today', coalesce((select n from vk_ai_usage where student_id = sid and day = current_date), 0),
    'flags', (select coalesce(jsonb_agg(jsonb_build_object('t', data->>'text', 'at', extract(epoch from ts_server)::bigint) order by ts_server desc), '[]')
      from vk_events where student_id = sid and type = 'ai_flag'),
    'tests', (select coalesce(jsonb_object_agg(phase, score || '/' || total), '{}') from vk_test_done where student_id = sid));
end $$;

-- Новый пароль ученику, который потерял бумажку. Прогресс сохраняется, старый вход закрывается.
create or replace function vektor_teacher_reset(p_token text, p_login text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); sid int := vk_teacher_student_id(uid, p_login); lg text;
begin
  if sid is null then return jsonb_build_object('error', 'forbidden', 'message', 'Нет такого ученика в ваших классах'); end if;
  select login into lg from vk_students where id = sid;
  return jsonb_build_object('login', lg, 'password', vk_reset(lg));
end $$;

-- Новые бумажки для всего класса: всем ученикам класса — новые пароли (старые бумажки перестают работать)
create or replace function vektor_teacher_slips(p_token text, p_class text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); tr vk_teachers; cid int; out jsonb := '[]'; r record;
begin
  select * into tr from vk_teachers where id = uid;
  select id into cid from vk_classes where name = p_class;
  if cid is null or not (tr.is_admin or cid = any(tr.class_ids)) then return jsonb_build_object('error', 'forbidden', 'message', 'Нет доступа к классу'); end if;
  for r in select login from vk_students where class_id = cid order by id loop
    out := out || jsonb_build_object('login', r.login, 'password', vk_reset(r.login));
  end loop;
  return jsonb_build_object('class', p_class, 'slips', out);
end $$;

revoke execute on function vk_teacher_student_id(int, text), vk_cur(int), vk_today_start() from public, anon, authenticated;
grant execute on function vektor_teacher_student(text, text), vektor_teacher_reset(text, text), vektor_teacher_slips(text, text) to anon, authenticated;
