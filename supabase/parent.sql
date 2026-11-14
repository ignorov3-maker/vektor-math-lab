-- CX-20. После accounts.sql, plans.sql и pulse.sql.
create or replace function vk_child_summary(p_adult int,p_student int,p_days int default 7) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare since timestamptz:=now()-make_interval(days=>least(greatest(p_days,1),365)); r jsonb;
begin
  if not vk_can_see(p_adult,p_student) then raise exception 'forbidden' using errcode='P0403'; end if;
  with ev as(select * from vk_events where student_id=p_student and ts_server>=since),
  attempts as(select *,case when data->>'sec' ~ '^[0-9]{1,7}$' then least((data->>'sec')::int,86400) else 0 end sec,
    lag(data) over(order by ts_server,event_id) prev from ev where type='attempt'),
  timed as(select *,greatest(0,sec-case when prev->>'question'=data->>'question' and prev->>'topic'=data->>'topic'
    and not coalesce((prev->>'ok')::boolean,false) and prev->>'sec' ~ '^[0-9]{1,7}$' and (prev->>'sec')::int<=sec then (prev->>'sec')::int else 0 end) elapsed from attempts),
  days as(select (ts_server at time zone 'Europe/Moscow')::date as day,count(*) attempts,count(*) filter(where (data->>'ok')::boolean) solved,sum(elapsed) seconds from timed group by 1),
  rules as(select data->>'bug' key,max(ts_server) filter(where type='bug_found') found_at,
    max(ts_server) filter(where type='bug_beaten') beaten_at,max(ts_server) filter(where type='trap' and data->>'stage'='3' and (data->>'ok')::boolean) checked_at
    from ev where type in('bug_found','bug_beaten','trap') and data->>'bug' is not null group by 1)
  select jsonb_build_object('student_id',p_student,'label',(select label from vk_students where id=p_student),'days',coalesce((select jsonb_agg(to_jsonb(days) order by day) from days),'[]'),
    'attempts',(select count(*) from attempts),'solved',(select count(*) from attempts where (data->>'ok')::boolean),
    'seconds',coalesce((select sum(elapsed) from timed),0),'topics',coalesce((select jsonb_agg(distinct data->>'topic') from ev where type='mastery'),'[]'),
    'worked_topics',coalesce((select jsonb_agg(distinct data->>'topic') from attempts),'[]'),
    'rules',coalesce((select jsonb_agg(to_jsonb(rules) order by found_at desc nulls last) from rules),'[]')) into r;
  return r;
end $$;
create or replace function vektor_parent_children(p_token text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'parent'); begin
  return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label) order by s.id) from vk_students s
    join vk_links l on l.student_id=s.id where l.adult_id=uid and vk_can_see(uid,s.id)),'[]');
end $$;
create or replace function vektor_parent_child(p_token text,p_student int) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ begin return vk_child_summary(vk_auth(p_token,'parent'),p_student,7);end $$;
create or replace function vektor_adult_unlink(p_token text,p_student int) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_adult_auth(p_token);begin
 if not vk_can_see(uid,p_student) then raise exception 'forbidden' using errcode='P0403';end if;
 delete from vk_links where adult_id=uid and student_id=p_student;return '{"ok":true}'::jsonb;
end $$;
create or replace function vektor_adult_reset_student(p_token text,p_student int) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_adult_auth(p_token);pass text:=vk_password();l text;begin
 if not vk_can_see(uid,p_student) then raise exception 'forbidden' using errcode='P0403';end if;
 update vk_students set pass_hash=crypt(pass,gen_salt('bf',8)),password_custom=false,fails=0,locked_until=null where id=p_student returning login into l;
 delete from vk_sessions where role='student' and user_id=p_student;
 return jsonb_build_object('ok',true,'login',l,'password',pass);
end $$;
revoke execute on function vk_child_summary(int,int,int),vektor_parent_children(text),vektor_parent_child(text,int),
 vektor_adult_unlink(text,int),vektor_adult_reset_student(text,int) from public,anon,authenticated;
grant execute on function vektor_parent_children(text),vektor_parent_child(text,int),vektor_adult_unlink(text,int),vektor_adult_reset_student(text,int) to anon,authenticated;
