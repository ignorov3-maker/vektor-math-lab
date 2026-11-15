-- CX-23. Последним после аккаунтов и кабинетов.
insert into vk_settings values('sessions','{"student_days":30,"adult_days":14,"teacher_days":14}') on conflict(key) do nothing;
create table if not exists vk_audit(ts timestamptz not null default clock_timestamp(),actor_role text,actor_id int,action text not null,target text,ip_hash text);
create index if not exists vk_audit_ts on vk_audit(ts);
alter table vk_audit enable row level security;
revoke all on vk_audit from public,anon,authenticated;
create or replace function vk_audit_log(p_role text,p_id int,p_action text,p_target text default null) returns void language sql security definer
set search_path=public,extensions as $$
 insert into vk_audit(actor_role,actor_id,action,target,ip_hash) values(p_role,p_id,p_action,p_target,vk_ip_hash()) $$;
create or replace function vk_audit_session() returns trigger language plpgsql security definer set search_path=public,extensions as $$ begin
 perform vk_audit_log(new.role,new.user_id,'login',new.role||':'||new.user_id);return new;end $$;
drop trigger if exists vk_session_audit on vk_sessions;
create trigger vk_session_audit after insert on vk_sessions for each row execute function vk_audit_session();
alter table vk_login_attempts add column if not exists actor_role text not null default 'student';
drop function if exists vk_guard_log(text,text,boolean);
create or replace function vk_guard_log(p_login text,p_device text,p_ok boolean,p_role text default 'student') returns void language plpgsql security definer
set search_path=public,extensions as $$ declare uid int;begin
 insert into vk_login_attempts(ip_hash,device_hash,login,ok,actor_role) values(vk_ip_hash(),vk_device_hash(p_device),left(p_login,254),p_ok,p_role);
 if not p_ok then
   if p_role='student' then select id into uid from vk_students where login=p_login;
   elsif p_role='teacher' then select id into uid from vk_teachers where login=p_login;
   else select id into uid from vk_adults where email=p_login;end if;
   perform vk_audit_log(p_role,uid,'login_failed',case when uid is not null then p_role||':'||uid end);
 end if;
end $$;
create or replace function vk_audit_account() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare role text;actor text:=nullif(current_setting('vektor.actor_role',true),'');aid int:=nullif(current_setting('vektor.actor_id',true),'')::int;begin
 role:=case when tg_table_name='vk_students' then 'student' when tg_table_name='vk_teachers' then 'teacher' else to_jsonb(new)->>'role' end;
 if new.pass_hash is distinct from old.pass_hash then perform vk_audit_log(coalesce(actor,role),coalesce(aid,new.id),
   coalesce(nullif(current_setting('vektor.password_action',true),''),'password_change'),role||':'||new.id);end if;
 if tg_table_name='vk_students' and to_jsonb(new)->>'login' is distinct from to_jsonb(old)->>'login' then
   perform vk_audit_log(coalesce(actor,role),coalesce(aid,new.id),'login_change',role||':'||new.id);end if;
 return new;
end $$;
drop trigger if exists vk_student_audit on vk_students;
create trigger vk_student_audit after update on vk_students for each row execute function vk_audit_account();
drop trigger if exists vk_adult_audit on vk_adults;
create trigger vk_adult_audit after update on vk_adults for each row execute function vk_audit_account();
drop trigger if exists vk_teacher_audit on vk_teachers;
create trigger vk_teacher_audit after update on vk_teachers for each row execute function vk_audit_account();
create or replace function vk_audit_link() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare l vk_links;r text;begin
 if tg_op='DELETE' then l:=old;else l:=new;end if;select role into r from vk_adults where id=l.adult_id;
 perform vk_audit_log(r,l.adult_id,case when tg_op='DELETE' then 'unlink_child' else 'link_child' end,'student:'||l.student_id);return coalesce(new,old);
end $$;
drop trigger if exists vk_link_audit on vk_links;
create trigger vk_link_audit after insert or delete on vk_links for each row execute function vk_audit_link();
create or replace function vk_audit_limits() returns trigger language plpgsql security definer set search_path=public,extensions as $$begin
 if new.key='ai' and new.value is distinct from old.value then perform vk_audit_log('admin',null,'limits_change','ai');end if;return new;end $$;
drop trigger if exists vk_limits_audit on vk_settings;
create trigger vk_limits_audit after update on vk_settings for each row execute function vk_audit_limits();
create or replace function vektor_logout_all(p_token text) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r text;uid int;begin
 select role into r from vk_sessions where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
 if r is null then raise exception 'no_session' using errcode='P0401';end if;uid:=vk_auth(p_token,r);
 delete from vk_sessions where role=r and user_id=uid;perform vk_audit_log(r,uid,'logout_all',r||':'||uid);return '{"ok":true}'::jsonb;end $$;
create or replace function vk_cleanup() returns void language plpgsql security definer set search_path=public,extensions as $$begin
 delete from vk_login_attempts where ts<now()-interval '30 days';delete from vk_audit where ts<now()-interval '180 days';
 delete from vk_sessions where expires<now();delete from vk_mail_tokens where expires<now()-interval '30 days';
 delete from vk_link_codes where expires<now();delete from vk_shared_reports where expires<now();
end $$;
revoke execute on function vk_audit_log(text,int,text,text),vk_audit_session(),vk_guard_log(text,text,boolean,text),vk_audit_account(),vk_audit_link(),vk_audit_limits(),vektor_logout_all(text),vk_cleanup() from public,anon,authenticated;
grant execute on function vektor_logout_all(text) to anon,authenticated;

-- При финальном dump замораживаются также изменения аккаунтов и связей из старых вкладок.
create or replace function vk_maintenance_guard() returns trigger language plpgsql security definer set search_path=public,extensions as $$begin
 if current_setting('role',true) in('anon','authenticated') and coalesce((select value='true'::jsonb from vk_settings where key='maintenance'),false)
 then raise exception 'maintenance' using errcode='P0503';end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
revoke execute on function vk_maintenance_guard() from public,anon,authenticated;
do $$declare t text;begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'vk_%' loop
  execute format('drop trigger if exists vk_maintenance_before_write on public.%I',t);
  execute format('create trigger vk_maintenance_before_write before insert or update or delete on public.%I for each row execute function vk_maintenance_guard()',t);
 end loop;
end $$;
