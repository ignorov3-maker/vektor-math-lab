-- Карточка ученика у учителя: в «Последних ответах» — ещё и верный ответ задачи (поле right события attempt),
-- чтобы учитель видел задачу, ответ ученика и правильный ответ рядом. Правка на месте, повторный запуск безопасен.
do $$ declare src text; begin
  select pg_get_functiondef('vektor_teacher_student(text,text)'::regprocedure) into src;
  if position('''r'', x.data->>''right''' in src) = 0 then
    src := replace(src, '''mistake'', x.data->>''mistake'',', '''mistake'', x.data->>''mistake'', ''r'', x.data->>''right'',');
    if position('''r'', x.data->>''right''' in src) = 0 then raise exception 'vektor_teacher_student: не найдено место для правки'; end if;
    execute src;
  end if;
end $$;
