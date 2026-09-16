-- Run after fixture + migration on an isolated Postgres. Errors fail the test.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare n int;
begin
  update public.profiles set nome='Edited',cargo='Analista',avatar_url=null,aceitou_termo_em=now()
    where id=auth.uid();
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Own presentation update failed'; end if;
  update public.profiles set nome='Forbidden' where id='00000000-0000-0000-0000-000000000002';
  get diagnostics n=row_count;
  if n<>0 then raise exception 'Other member update allowed'; end if;
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'Self promotion allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set email='changed@example.invalid' where id=auth.uid();
    raise exception 'Identity email mutation allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set id='00000000-0000-0000-0000-000000000002' where id=auth.uid();
    raise exception 'Identity reassignment allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set criado_em=now() where id=auth.uid();
    raise exception 'Audit date mutation allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.profiles where id=auth.uid();
    raise exception 'Self deletion allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.profiles(id,role) values(auth.uid(),'admin')
      on conflict(id) do update set role=excluded.role;
    raise exception 'Privileged upsert allowed';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.profiles)<>3 then raise exception 'Directory SELECT broken'; end if;
end; $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ declare n int; begin
  update public.profiles set nome='Admin edit' where id='00000000-0000-0000-0000-000000000002';
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Admin presentation update broken'; end if;
  begin
    update public.profiles set role='admin' where id='00000000-0000-0000-0000-000000000002';
    raise exception 'Browser admin may mutate global role';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  if (select count(*) from public.profiles)<>0 then raise exception 'Anonymous directory exposed'; end if;
  begin
    insert into public.profiles(id,role) values('00000000-0000-0000-0000-000000000004','admin');
    raise exception 'Anonymous insert allowed';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
set local role supabase_auth_admin;
insert into auth.users(id,email,raw_user_meta_data)
values('00000000-0000-0000-0000-000000000004','signup@example.invalid','{"name":"Signup","role":"admin"}');
reset role;
do $$ begin
  if not exists(select 1 from public.profiles where id='00000000-0000-0000-0000-000000000004' and role='membro')
    then raise exception 'Signup missing or metadata elevated role'; end if;
end; $$;
set local role service_role;
update public.profiles set role='admin' where id='00000000-0000-0000-0000-000000000002';
do $$ begin
  if not exists(select 1 from public.profiles where id='00000000-0000-0000-0000-000000000002' and role='admin')
    then raise exception 'Trusted administration broken'; end if;
end; $$;
reset role;
rollback;
select 'profile authorization: all assertions passed' as result;
