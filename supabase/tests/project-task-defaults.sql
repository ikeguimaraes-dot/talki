\set ON_ERROR_STOP on
begin;
insert into public.profiles(id) values
 ('10000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000002'),
 ('10000000-0000-0000-0000-000000000003');
insert into public.plans(id,nome,criado_por) values
 ('20000000-0000-0000-0000-000000000001','Teste','10000000-0000-0000-0000-000000000001');
insert into public.plan_members(plan_id,user_id) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
insert into public.buckets(id,plan_id,nome) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Lista');
insert into public.talki_plan_settings(plan_id,area_id) values
 ('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
declare v_task_id uuid; v_legacy_id uuid; n integer;
begin
  v_task_id := public.talki_create_project_task('30000000-0000-0000-0000-000000000001','  Nova tarefa  ');
  if not exists(select 1 from public.tasks t join public.task_assignees a on a.task_id=t.id
    where t.id=v_task_id and t.titulo='Nova tarefa' and t.criado_por=auth.uid()
    and a.user_id=auth.uid() and a.atribuido_por=auth.uid() and t.kanban_status is null) then
    raise exception 'Creation must assign the logged-in creator';
  end if;
  perform public.talki_set_task_kanban(v_task_id,'trabalhando');
  if not exists(select 1 from public.tasks t join public.task_assignees a on a.task_id=t.id
    where a.user_id=auth.uid() and t.kanban_status='trabalhando' and t.id=v_task_id) then
    raise exception 'New task must appear in the personal Kanban query';
  end if;
  -- Add a colleague without losing the default assignee.
  insert into public.task_assignees(task_id,user_id,atribuido_por)
    values(v_task_id,'10000000-0000-0000-0000-000000000001',auth.uid());
  select count(*) into n from public.task_assignees a where a.task_id=v_task_id;
  if n <> 2 then raise exception 'Adding a colleague lost an assignee'; end if;
  delete from public.task_assignees a where a.task_id=v_task_id and a.user_id=auth.uid();
  perform public.talki_set_task_kanban(v_task_id,'esperando');
  if exists(select 1 from public.task_assignees a where a.task_id=v_task_id and a.user_id=auth.uid()) then
    raise exception 'Kanban must preserve deliberate delegation';
  end if;
  insert into public.tasks(plan_id,bucket_id,titulo,criado_por)
    values('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Antiga',auth.uid())
    returning id into v_legacy_id;
  -- Invalid columns must roll back the automatic assignment too.
  begin
    perform public.talki_set_task_kanban(v_legacy_id,'invalid');
    raise exception 'Invalid column accepted';
  exception when check_violation then null; end;
  if exists(select 1 from public.task_assignees where task_assignees.task_id=v_legacy_id) then
    raise exception 'Failed Kanban update left a partial assignment';
  end if;
  perform public.talki_set_task_kanban(v_legacy_id,'fila');
  if not exists(select 1 from public.task_assignees where task_assignees.task_id=v_legacy_id and user_id=auth.uid()) then
    raise exception 'Legacy task not assigned when entering Kanban';
  end if;
  perform public.talki_set_task_kanban(v_legacy_id,null);
  if not exists(select 1 from public.task_assignees where task_assignees.task_id=v_legacy_id and user_id=auth.uid()) then
    raise exception 'Removing from Kanban must retain assignment';
  end if;
  begin
    perform public.talki_set_project_active('20000000-0000-0000-0000-000000000001',false);
    raise exception 'Non-owner changed project state';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.talki_set_project_active('20000000-0000-0000-0000-000000000001',false);
do $$ begin
  if not exists(select 1 from public.talki_plan_settings where not ativo and area_id='40000000-0000-0000-0000-000000000001') then
    raise exception 'Inactivation must preserve project area';
  end if;
end $$;
-- A colleague who is not a project member still sees the correct inactive tab.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin
  if not exists(select 1 from public.talki_plan_settings where not ativo) then
    raise exception 'Project state hidden from colleague';
  end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.talki_set_project_active('20000000-0000-0000-0000-000000000001',true);
do $$ begin
  if exists(select 1 from public.talki_plan_settings where not ativo) then raise exception 'Reactivation failed'; end if;
end $$;
rollback;
