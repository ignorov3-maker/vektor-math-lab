-- «Вектор»: подписи учеников от учителя («Маша К.») хранятся на сервере, а не только в одном браузере.
-- Учитель подписал детей на телефоне — видит подписи и на компьютере. Подпись видит и сам ученик в профиле.
-- Выполнять после teacher.sql (нужна vk_teacher_student_id). Можно запускать повторно.

-- p_labels: {"ученик1": "Маша К.", "ученик2": ""} — пустая строка стирает подпись.
-- Учитель меняет подписи только своих учеников (админ — всех); чужие логины молча пропускаются.
create or replace function vektor_teacher_labels(p_token text, p_labels jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); r record; sid int; n int := 0; skipped int := 0;
begin
  if jsonb_typeof(p_labels) is distinct from 'object' then return jsonb_build_object('error', 'bad_input', 'message', 'Нужен список подписей'); end if;
  if (select count(*) from jsonb_object_keys(p_labels)) > 300 then return jsonb_build_object('error', 'too_many', 'message', 'Не больше 300 подписей за раз'); end if;
  for r in select key, value from jsonb_each(p_labels) loop
    sid := vk_teacher_student_id(uid, r.key);
    if sid is null or jsonb_typeof(r.value) <> 'string' then skipped := skipped + 1; continue; end if;
    update vk_students set label = nullif(left(regexp_replace(btrim(r.value #>> '{}'), '\s+', ' ', 'g'), 40), '') where id = sid;
    n := n + 1;
  end loop;
  return jsonb_build_object('saved', n, 'skipped', skipped);
end $$;

revoke execute on function vektor_teacher_labels(text, jsonb) from public, anon, authenticated;
grant execute on function vektor_teacher_labels(text, jsonb) to anon, authenticated;
