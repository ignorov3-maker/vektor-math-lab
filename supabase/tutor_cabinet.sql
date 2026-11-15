-- CX-21. После parent.sql. Учительский кабинет и его RPC не меняются.
create table if not exists vk_tutor_groups(id serial primary key,tutor_id int not null references vk_adults(id),name text not null);
create table if not exists vk_tutor_group_members(group_id int references vk_tutor_groups(id) on delete cascade,student_id int references vk_students(id) on delete cascade,primary key(group_id,student_id));
create table if not exists vk_tutor_assignments(id serial primary key,tutor_id int not null references vk_adults(id),topic text not null,due timestamptz not null,created timestamptz not null default now());
create table if not exists vk_tutor_assignment_members(assignment_id int references vk_tutor_assignments(id) on delete cascade,student_id int references vk_students(id) on delete cascade,primary key(assignment_id,student_id));
create table if not exists vk_shared_reports(id serial primary key,tutor_id int not null references vk_adults(id),student_id int not null references vk_students(id),token_hash text not null unique,expires timestamptz not null,revoked boolean not null default false);
alter table vk_tutor_groups enable row level security;
alter table vk_tutor_group_members enable row level security;
alter table vk_tutor_assignments enable row level security;
alter table vk_tutor_assignment_members enable row level security;
alter table vk_shared_reports enable row level security;
revoke all on vk_tutor_groups,vk_tutor_group_members,vk_tutor_assignments,vk_tutor_assignment_members,vk_shared_reports from public,anon,authenticated;
insert into vk_settings values('assignment_topics','["concept","reduce","compare","add-same","add-diff","mixed","mult","div","part-of"]') on conflict(key) do nothing;
create or replace function vk_tutor_group_check() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare uid int;begin
 select tutor_id into uid from vk_tutor_groups where id=new.group_id for update;
 if not vk_can_see(uid,new.student_id) or not exists(select 1 from vk_adults where id=uid and role='tutor') then raise exception 'forbidden';end if;
 if (select count(*) from vk_tutor_group_members where group_id=new.group_id)>=6 then raise exception 'group_limit';end if;
 return new;
end $$;
drop trigger if exists vk_tutor_group_limit on vk_tutor_group_members;
create trigger vk_tutor_group_limit before insert on vk_tutor_group_members for each row execute function vk_tutor_group_check();
create or replace function vektor_tutor_students(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'tutor');begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label) order by s.id) from vk_students s where vk_can_see(uid,s.id)),'[]');end $$;
create or replace function vektor_tutor_child(p_token text,p_student int) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
begin return vk_child_summary(vk_auth(p_token,'tutor'),p_student,7);end $$;
create or replace function vektor_tutor_group(p_token text,p_name text,p_students jsonb,p_group int default null) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'tutor');gid int:=p_group;sid int;begin
 if jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students)>6 or length(btrim(p_name)) not between 1 and 80 then return jsonb_build_object('error','group','message','В группе не больше 6 учеников; укажите название');end if;
 if gid is null then insert into vk_tutor_groups(tutor_id,name) values(uid,btrim(p_name)) returning id into gid;
 else perform 1 from vk_tutor_groups where id=gid and tutor_id=uid for update;if not found then raise exception 'forbidden' using errcode='P0403';end if;update vk_tutor_groups set name=btrim(p_name) where id=gid;end if;
 delete from vk_tutor_group_members where group_id=gid;
 for sid in select distinct value::int from jsonb_array_elements_text(p_students) loop
   if not vk_can_see(uid,sid) then raise exception 'forbidden' using errcode='P0403';end if;
   insert into vk_tutor_group_members values(gid,sid);
 end loop;return jsonb_build_object('ok',true,'id',gid);
end $$;
create or replace function vektor_tutor_groups(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'tutor');begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'students',coalesce((select jsonb_agg(m.student_id) from vk_tutor_group_members m where m.group_id=g.id and vk_can_see(uid,m.student_id)),'[]'))) from vk_tutor_groups g where g.tutor_id=uid),'[]');end $$;
create or replace function vektor_tutor_assign(p_token text,p_topic text,p_due timestamptz,p_students jsonb default '[]',p_group int default null) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'tutor');pid int;sid int;ids int[];begin
 if p_due is null or p_due<=now() or not coalesce((select value ? p_topic from vk_settings where key='assignment_topics'),false) then return jsonb_build_object('error','assignment','message','Выберите готовую тему и будущий срок');end if;
 if p_group is not null then
   if not exists(select 1 from vk_tutor_groups where id=p_group and tutor_id=uid) then raise exception 'forbidden' using errcode='P0403';end if;
   select array_agg(student_id) into ids from vk_tutor_group_members where group_id=p_group;
 else select array_agg(distinct value::int) into ids from jsonb_array_elements_text(p_students);end if;
 if coalesce(cardinality(ids),0)=0 then return jsonb_build_object('error','assignment','message','Выберите учеников');end if;
 foreach sid in array ids loop if not vk_can_see(uid,sid) then raise exception 'forbidden' using errcode='P0403';end if;end loop;
 insert into vk_tutor_assignments(tutor_id,topic,due) values(uid,p_topic,p_due) returning id into pid;
 insert into vk_tutor_assignment_members select pid,unnest(ids);return jsonb_build_object('ok',true,'id',pid);
end $$;
create or replace function vektor_student_assignments(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'student');begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'topic',a.topic,'due',a.due) order by a.due) from vk_tutor_assignments a
 join vk_tutor_assignment_members m on m.assignment_id=a.id where m.student_id=uid and vk_can_see(a.tutor_id,uid)
 and not exists(select 1 from vk_events e where e.student_id=uid and e.type='mastery' and e.data->>'topic'=a.topic and e.ts_server>=a.created)),'[]');end $$;
create or replace function vektor_tutor_pulse(p_token text,p_group int,p_minutes int default 45) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'tutor');r jsonb;begin
 if not exists(select 1 from vk_tutor_groups where id=p_group and tutor_id=uid) then raise exception 'forbidden' using errcode='P0403';end if;
 with sids as(select student_id id from vk_tutor_group_members where group_id=p_group and vk_can_see(uid,student_id)),
 ev as(select * from vk_events where student_id in(select id from sids) and ts_server>=now()-make_interval(mins=>least(greatest(p_minutes,5),240))),
 found as(select data->>'bug' bug,count(distinct student_id) n from ev where type='bug_found' group by 1)
 select jsonb_build_object('bugs',coalesce((select jsonb_agg(to_jsonb(f) order by f.n desc) from found f),'[]'),
 'solved',(select count(*) from ev where type='attempt' and (data->>'ok')::boolean),
 'beaten',(select count(distinct(student_id,data->>'bug')) from ev where type='bug_beaten'),
 'students',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label,'cur',vk_cur(s.id))) from vk_students s where s.id in(select id from sids)),'[]')) into r;return r;
end $$;
create or replace function vektor_tutor_report(p_token text,p_student int) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'tutor');t text:=encode(gen_random_bytes(32),'hex');rid int;begin
 if not vk_can_see(uid,p_student) then raise exception 'forbidden' using errcode='P0403';end if;
 insert into vk_shared_reports(tutor_id,student_id,token_hash,expires) values(uid,p_student,encode(digest(t,'sha256'),'hex'),now()+interval '30 days') returning id into rid;
 return jsonb_build_object('id',rid,'token',t,'expires',now()+interval '30 days');end $$;
create or replace function vektor_tutor_revoke_report(p_token text,p_report int) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'tutor');sid int;begin
 select student_id into sid from vk_shared_reports where id=p_report and tutor_id=uid;
 if sid is null or not vk_can_see(uid,sid) then raise exception 'forbidden' using errcode='P0403';end if;
 update vk_shared_reports set revoked=true where id=p_report;return '{"ok":true}'::jsonb;end $$;
create or replace function vektor_tutor_reports(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare uid int:=vk_auth(p_token,'tutor');begin
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'student_id',student_id,'expires',expires,'revoked',revoked)) from vk_shared_reports where tutor_id=uid and vk_can_see(uid,student_id)),'[]');end $$;
create or replace function vektor_shared_report(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r vk_shared_reports;begin
 select * into r from vk_shared_reports where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') and not revoked and expires>now();
 if r.id is null or not vk_can_see(r.tutor_id,r.student_id) then raise exception 'forbidden' using errcode='P0403';end if;
 return (vk_child_summary(r.tutor_id,r.student_id,7)-'student_id'-'label');end $$;
revoke execute on function vk_tutor_group_check(),vektor_tutor_students(text),vektor_tutor_child(text,int),vektor_tutor_group(text,text,jsonb,int),
 vektor_tutor_groups(text),vektor_tutor_assign(text,text,timestamptz,jsonb,int),vektor_student_assignments(text),vektor_tutor_pulse(text,int,int),
 vektor_tutor_report(text,int),vektor_tutor_revoke_report(text,int),vektor_tutor_reports(text),vektor_shared_report(text) from public,anon,authenticated;
grant execute on function vektor_tutor_students(text),vektor_tutor_child(text,int),vektor_tutor_group(text,text,jsonb,int),vektor_tutor_groups(text),
 vektor_tutor_assign(text,text,timestamptz,jsonb,int),vektor_student_assignments(text),vektor_tutor_pulse(text,int,int),vektor_tutor_report(text,int),
 vektor_tutor_revoke_report(text,int),vektor_tutor_reports(text),vektor_shared_report(text) to anon,authenticated;
