-- «Вектор»: демо-школа для акселератора (CL-10). Выполнять в Supabase → SQL Editor ПОСЛЕ всех файлов supabase/*.sql.
-- Создаёт класс «Демо» (25 учеников-ботов с вымышленными именами), ученика для ведущего и демо-учителя.
-- Повторный запуск всё сбрасывает в исходное состояние — удобно перед каждой репетицией.
--   select vk_demo_seed('пароль-для-демо');   -- один пароль у всех демо-аккаунтов
-- Логины: ведущий — «демо», боты — «демо1»…«демо25», учитель — «демо-учитель».

create or replace function vk_demo_seed(p_password text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare cid int; k int;
  names text[] := array['Аня С.','Дима Л.','Маша К.','Артём В.','Соня П.','Егор Н.','Лиза М.','Миша Т.','Вика Р.','Саша Б.',
    'Полина Г.','Кирилл Д.','Алиса Е.','Тимур Ж.','Варя З.','Лёва И.','Ксюша О.','Глеб У.','Ника Ф.','Платон Х.',
    'Ева Ц.','Марк Ч.','Даша Ш.','Ваня Щ.','Мила Ю.'];
begin
  if length(coalesce(p_password, '')) < 6 then return 'нужен пароль от 6 символов'; end if;
  insert into vk_classes (name, grp) values ('Демо', 'pilot') on conflict (name) do update set grp = 'pilot';
  select id into cid from vk_classes where name = 'Демо';
  -- чистый лист: события, задачи учителя и прогресс демо-класса
  delete from vk_events where student_id in (select id from vk_students where class_id = cid);
  delete from vk_pushes where teacher_id in (select id from vk_teachers where login = 'демо-учитель');
  for k in 0..25 loop
    insert into vk_students (login, pass_hash, class_id, label)
      values (case when k = 0 then 'демо' else 'демо' || k end, crypt(p_password, gen_salt('bf', 8)), cid, case when k = 0 then 'Ведущий' else names[k] end)
      on conflict (login) do update set pass_hash = excluded.pass_hash, class_id = cid, label = excluded.label,
        state = null, state_rev = 0, fails = 0, locked_until = null, last_seen = null;
  end loop;
  perform vk_teacher('демо-учитель', p_password, 'Демо-учитель', 'Демо');
  return 'ok: класс «Демо», 25 ботов, ведущий «демо», учитель «демо-учитель»';
end $$;
revoke execute on function vk_demo_seed(text) from public, anon, authenticated;
