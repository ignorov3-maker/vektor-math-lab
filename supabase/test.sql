-- «Вектор»: тест до и после (Ф-27–Ф-29). Ответы хранятся только здесь, браузер их не получает.
-- Две параллельные формы A и B по 18 заданий: 1–14 — по образцам ВПР 5–6 кл. (9 тем дробей), 15–18 — перенос.
-- Формы требуют вычитки методистом до пилота.

create table if not exists vk_test_items (
  form char(1) not null, n int not null, prompt text not null,
  kind text not null default 'input',          -- input | sign
  rule text not null default 'value',          -- value: любая равная запись; simplest: несократимая; mixed: смешанное число; sign: < = >
  answer text not null, primary key (form, n));
create table if not exists vk_tests (
  class_id int not null references vk_classes(id) on delete cascade, phase text not null check (phase in ('pre','post')),
  form char(1) not null, opened_at timestamptz, closes_at timestamptz, primary key (class_id, phase));
create table if not exists vk_test_answers (
  student_id int not null references vk_students(id) on delete cascade, phase text not null, n int not null,
  answer text, ok boolean, sec int, at timestamptz not null default now(), primary key (student_id, phase, n));
create table if not exists vk_test_done (
  student_id int not null references vk_students(id) on delete cascade, phase text not null, form char(1) not null,
  score int not null, total int not null, finished_at timestamptz not null default now(), primary key (student_id, phase));
alter table vk_test_items enable row level security; alter table vk_tests enable row level security;
alter table vk_test_answers enable row level security; alter table vk_test_done enable row level security;
revoke all on vk_test_items, vk_tests, vk_test_answers, vk_test_done from anon, authenticated;
alter table vk_classes add column if not exists grp_note text;

-- Разбор ответа: «3/4», «2 1/3», «5» → значение; null — не прочитано
create or replace function vk_frac_val(s text) returns numeric language plpgsql immutable as $$
declare t text := regexp_replace(btrim(replace(coalesce(s, ''), '−', '-')), '\s+', ' ', 'g'); m text[];
begin
  if t ~ '^-?\d+$' then return t::numeric; end if;
  m := regexp_match(t, '^(-?\d+)\s*/\s*(\d+)$');
  if m is not null then return case when m[2]::numeric = 0 then null else round(m[1]::numeric / m[2]::numeric, 9) end; end if;
  m := regexp_match(t, '^(\d+) (\d+)\s*/\s*(\d+)$');
  if m is not null then return case when m[3]::numeric = 0 then null else round(m[1]::numeric + m[2]::numeric / m[3]::numeric, 9) end; end if;
  return null;
end $$;

create or replace function vk_test_ok(p_input text, p_rule text, p_answer text) returns boolean language plpgsql immutable as $$
declare t text := regexp_replace(btrim(coalesce(p_input, '')), '\s+', ' ', 'g'); v numeric := vk_frac_val(t); m text[];
begin
  if p_rule = 'sign' then return t = p_answer; end if;
  if v is null or v <> vk_frac_val(p_answer) then return false; end if;
  if p_rule = 'simplest' then
    m := regexp_match(t, '(\d+)\s*/\s*(\d+)$');
    return m is null or gcd(m[1]::int, m[2]::int) = 1;
  end if;
  if p_rule = 'mixed' then
    m := regexp_match(t, '^(\d+) (\d+)\s*/\s*(\d+)$');
    return m is not null and m[2]::int < m[3]::int;
  end if;
  return true;
end $$;

insert into vk_test_items (form, n, prompt, kind, rule, answer) values
('A', 1, 'Пиццу разрезали на 8 равных кусков и съели 3 куска. Какую часть пиццы съели?', 'input', 'value', '3/8'),
('A', 2, 'Сократи дробь 12/18.', 'input', 'simplest', '2/3'),
('A', 3, 'Сравни дроби: 3/7 и 5/7.', 'sign', 'sign', '<'),
('A', 4, 'Сравни дроби: 2/3 и 3/5.', 'sign', 'sign', '>'),
('A', 5, 'Вычисли: 2/9 + 5/9.', 'input', 'value', '7/9'),
('A', 6, 'Вычисли: 7/10 − 3/10.', 'input', 'value', '2/5'),
('A', 7, 'Вычисли: 1/2 + 1/3.', 'input', 'value', '5/6'),
('A', 8, 'Вычисли: 5/6 − 1/4.', 'input', 'value', '7/12'),
('A', 9, 'Запиши дробь 17/5 в виде смешанного числа.', 'input', 'mixed', '3 2/5'),
('A', 10, 'Вычисли: 2 1/3 + 1 1/2.', 'input', 'value', '3 5/6'),
('A', 11, 'Вычисли: 2/3 · 9/10.', 'input', 'value', '3/5'),
('A', 12, 'Вычисли: 5/6 : 10/9.', 'input', 'value', '3/4'),
('A', 13, 'Найди 3/4 от числа 48.', 'input', 'value', '36'),
('A', 14, 'Найди число, если 2/7 этого числа равны 10.', 'input', 'value', '35'),
('A', 15, 'В классе 24 ученика, 3/8 из них — мальчики. Сколько в классе девочек?', 'input', 'value', '15'),
('A', 16, 'Маша прочитала 1/3 книги в понедельник и 1/4 книги во вторник. Какую часть книги ей осталось прочитать?', 'input', 'value', '5/12'),
('A', 17, 'Сравни: 5/8 часа и 35 минут.', 'sign', 'sign', '>'),
('A', 18, 'Какую часть метра составляют 35 сантиметров?', 'input', 'value', '7/20'),
('B', 1, 'Торт разрезали на 6 равных кусков и взяли 5 кусков. Какую часть торта взяли?', 'input', 'value', '5/6'),
('B', 2, 'Сократи дробь 15/25.', 'input', 'simplest', '3/5'),
('B', 3, 'Сравни дроби: 4/9 и 2/9.', 'sign', 'sign', '>'),
('B', 4, 'Сравни дроби: 3/4 и 4/5.', 'sign', 'sign', '<'),
('B', 5, 'Вычисли: 3/11 + 5/11.', 'input', 'value', '8/11'),
('B', 6, 'Вычисли: 9/14 − 2/14.', 'input', 'value', '1/2'),
('B', 7, 'Вычисли: 1/4 + 2/3.', 'input', 'value', '11/12'),
('B', 8, 'Вычисли: 3/4 − 1/6.', 'input', 'value', '7/12'),
('B', 9, 'Запиши дробь 23/4 в виде смешанного числа.', 'input', 'mixed', '5 3/4'),
('B', 10, 'Вычисли: 3 1/4 + 1 2/3.', 'input', 'value', '4 11/12'),
('B', 11, 'Вычисли: 3/4 · 8/9.', 'input', 'value', '2/3'),
('B', 12, 'Вычисли: 4/5 : 8/15.', 'input', 'value', '3/2'),
('B', 13, 'Найди 2/5 от числа 35.', 'input', 'value', '14'),
('B', 14, 'Найди число, если 3/8 этого числа равны 12.', 'input', 'value', '32'),
('B', 15, 'В библиотеке 30 книг, 2/5 из них — сказки. Сколько книг не сказки?', 'input', 'value', '18'),
('B', 16, 'Петя потратил 1/2 денег на книгу и 1/5 денег на ручку. Какая часть денег у него осталась?', 'input', 'value', '3/10'),
('B', 17, 'Сравни: 2/3 часа и 45 минут.', 'sign', 'sign', '<'),
('B', 18, 'Какую часть часа составляют 25 минут?', 'input', 'value', '5/12')
on conflict (form, n) do update set prompt = excluded.prompt, kind = excluded.kind, rule = excluded.rule, answer = excluded.answer;

-- Открытый для ученика тест: класс открыт учителем, время не вышло, ученик ещё не закончил
create or replace function vk_open_test(p_uid int) returns vk_tests
language sql stable security definer set search_path = public as $$
  select t.* from vk_tests t join vk_students s on s.class_id = t.class_id
  where s.id = p_uid and t.opened_at is not null and t.closes_at > now()
    and not exists (select 1 from vk_test_done d where d.student_id = p_uid and d.phase = t.phase)
  order by t.opened_at desc limit 1 $$;

-- Ученик: есть ли тест сейчас (задания без ответов) и в какой группе класс
create or replace function vektor_test_get(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); t vk_tests; grp text;
begin
  select c.grp into grp from vk_students s left join vk_classes c on c.id = s.class_id where s.id = uid;
  t := vk_open_test(uid);
  if t.class_id is null then return jsonb_build_object('test', null, 'group', coalesce(grp, 'pilot')); end if;
  return jsonb_build_object('group', coalesce(grp, 'pilot'), 'test', jsonb_build_object(
    'phase', t.phase, 'seconds_left', greatest(0, extract(epoch from t.closes_at - now())::int),
    'items', (select jsonb_agg(jsonb_build_object('n', i.n, 'prompt', i.prompt, 'kind', i.kind) order by i.n) from vk_test_items i where i.form = t.form),
    'answers', coalesce((select jsonb_object_agg(a.n, a.answer) from vk_test_answers a where a.student_id = uid and a.phase = t.phase), '{}')));
end $$;

-- Ученик: сохранить ответ (верность не сообщаем — Ф-28)
create or replace function vektor_test_answer(p_token text, p_n int, p_answer text, p_sec int default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); t vk_tests := vk_open_test(uid); it vk_test_items;
begin
  if t.class_id is null then return jsonb_build_object('error', 'closed', 'message', 'Время теста вышло'); end if;
  select * into it from vk_test_items where form = t.form and n = p_n;
  if it.n is null then return jsonb_build_object('error', 'bad_item', 'message', 'Нет такого задания'); end if;
  insert into vk_test_answers (student_id, phase, n, answer, ok, sec)
    values (uid, t.phase, p_n, left(p_answer, 40), vk_test_ok(p_answer, it.rule, it.answer), p_sec)
    on conflict (student_id, phase, n) do update set answer = excluded.answer, ok = excluded.ok, sec = excluded.sec, at = now();
  return jsonb_build_object('ok', true);
end $$;

create or replace function vektor_test_finish(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); t vk_tests := vk_open_test(uid); sc int; tot int;
begin
  if t.class_id is null then return jsonb_build_object('ok', true); end if;
  select count(*) into tot from vk_test_items where form = t.form;
  select count(*) into sc from vk_test_answers where student_id = uid and phase = t.phase and ok;
  insert into vk_test_done (student_id, phase, form, score, total) values (uid, t.phase, t.form, sc, tot) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- Учитель: открыть или закрыть тест для своего класса. Форма по жребию: до — A у нечётных id класса, после — другая (Ф-27)
create or replace function vektor_teacher_test(p_token text, p_class text, p_phase text, p_open boolean, p_minutes int default 40)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); tr vk_teachers; cid int; f char(1);
begin
  select * into tr from vk_teachers where id = uid;
  select id into cid from vk_classes where name = p_class;
  if cid is null or not (tr.is_admin or cid = any(tr.class_ids)) then return jsonb_build_object('error', 'forbidden', 'message', 'Нет доступа к классу'); end if;
  if p_phase not in ('pre', 'post') then return jsonb_build_object('error', 'bad_phase', 'message', 'pre или post'); end if;
  f := case when (cid % 2 = 1) = (p_phase = 'pre') then 'A' else 'B' end;
  insert into vk_tests (class_id, phase, form) values (cid, p_phase, f) on conflict (class_id, phase) do nothing;
  if p_open then
    update vk_tests set opened_at = now(), closes_at = now() + make_interval(mins => least(greatest(p_minutes, 5), 90)) where class_id = cid and phase = p_phase;
  else
    update vk_tests set closes_at = now() where class_id = cid and phase = p_phase;
  end if;
  return jsonb_build_object('ok', true, 'form', f);
end $$;

-- Учитель: классы, состояние тестов и баллы учеников
create or replace function vektor_teacher_tests(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); tr vk_teachers;
begin
  select * into tr from vk_teachers where id = uid;
  return jsonb_build_object(
    'classes', coalesce((select jsonb_agg(jsonb_build_object('name', c.name, 'group', c.grp,
        'tests', coalesce((select jsonb_object_agg(t.phase, jsonb_build_object('form', t.form,
          'open', t.opened_at is not null and t.closes_at > now(), 'opened_at', t.opened_at, 'closes_at', t.closes_at,
          'done', (select count(*) from vk_test_done d join vk_students s on s.id = d.student_id where s.class_id = c.id and d.phase = t.phase),
          'writing', (select coalesce(jsonb_agg(s.login order by s.id), '[]') from vk_students s where s.class_id = c.id
            and exists (select 1 from vk_test_answers a where a.student_id = s.id and a.phase = t.phase)
            and not exists (select 1 from vk_test_done d where d.student_id = s.id and d.phase = t.phase))))
          from vk_tests t where t.class_id = c.id), '{}'),
        'total', (select count(*) from vk_students s where s.class_id = c.id))
        order by c.name) from vk_classes c where tr.is_admin or c.id = any(tr.class_ids)), '[]'),
    'scores', coalesce((select jsonb_object_agg(s.login, (select jsonb_object_agg(d.phase, d.score || '/' || d.total) from vk_test_done d where d.student_id = s.id))
        from vk_students s where (tr.is_admin or s.class_id = any(tr.class_ids)) and exists (select 1 from vk_test_done d where d.student_id = s.id)), '{}'));
end $$;

grant execute on function vektor_test_get(text), vektor_test_answer(text, int, text, int), vektor_test_finish(text),
  vektor_teacher_test(text, text, text, boolean, int), vektor_teacher_tests(text) to anon, authenticated;
revoke execute on function vk_open_test(int), vk_frac_val(text), vk_test_ok(text, text, text) from public, anon, authenticated;
