\set ON_ERROR_STOP on
begin;

insert into public.profiles(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');
insert into public.talki_google_connections(owner_id)
values('11111111-1111-1111-1111-111111111111');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.talki_agenda_events(
  owner_id, titulo, descricao, tipo, inicio, fim
) values (
  '11111111-1111-1111-1111-111111111111',
  'Compromisso sem tarefa', '', 'reuniao',
  '2026-10-06T10:00:00Z', '2026-10-06T11:00:00Z'
);
do $$ begin
  if exists(select 1 from public.tasks) then raise exception 'Reunião enviada ao Kanban'; end if;
end $$;

insert into public.talki_agenda_events(
  owner_id, titulo, descricao, tipo, inicio, fim, local, link
) values (
  '11111111-1111-1111-1111-111111111111',
  'Tarefa inicial', 'Pauta', 'tarefa',
  '2026-10-06T12:30:00Z', '2026-10-06T13:30:00Z',
  'Sala 1', 'https://meet.google.com/teste'
);

do $$
begin
  if not exists(
    select 1 from public.tasks t
    join public.plans p on p.id = t.plan_id
    join public.task_assignees a on a.task_id = t.id
    where p.nome = 'Agenda' and p.criado_por = '11111111-1111-1111-1111-111111111111'
      and t.kanban_status = 'fila' and t.titulo = 'Tarefa inicial'
      and t.inicio = '2026-10-06' and t.inicio_hora = '09:30'
      and a.user_id = '11111111-1111-1111-1111-111111111111'
  ) then raise exception 'Tarefa pessoal inválida'; end if;
end;
$$;

update public.tasks set kanban_status = 'trabalhando'
where titulo = 'Tarefa inicial';
update public.talki_agenda_events
set titulo = 'Tarefa atualizada', inicio = '2026-10-07T14:00:00Z', fim = '2026-10-07T15:00:00Z'
where titulo = 'Tarefa inicial';

do $$
begin
  if not exists(
    select 1 from public.tasks t
    where t.titulo = 'Tarefa atualizada' and t.kanban_status = 'trabalhando'
      and t.inicio = '2026-10-07' and t.inicio_hora = '11:00'
  ) then raise exception 'Atualização não sincronizada ou coluna perdida'; end if;
end;
$$;

insert into public.plans(id, nome, criado_por)
values('44444444-4444-4444-4444-444444444444', 'Cliente', '11111111-1111-1111-1111-111111111111');
insert into public.plan_members(plan_id, user_id)
values('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111');
insert into public.buckets(id, plan_id, nome)
values('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'A fazer');
insert into public.talki_agenda_events(
  owner_id, plan_id, titulo, tipo, inicio, fim
) values (
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  'Tarefa do cliente', 'tarefa', '2026-10-08T12:00:00Z', '2026-10-08T13:00:00Z'
);

do $$
begin
  if not exists(
    select 1 from public.tasks t
    where t.titulo = 'Tarefa do cliente'
      and t.plan_id = '44444444-4444-4444-4444-444444444444'
      and t.bucket_id = '55555555-5555-5555-5555-555555555555'
      and t.kanban_status = 'fila'
  ) then raise exception 'Tarefa não criada no projeto selecionado'; end if;
end;
$$;

insert into public.talki_agenda_events(owner_id, titulo, tipo, inicio, fim)
values(
  '11111111-1111-1111-1111-111111111111', 'Mudar para compromisso', 'tarefa',
  '2026-10-09T12:00:00Z', '2026-10-09T13:00:00Z'
);
update public.talki_agenda_events set tipo = 'reuniao'
where titulo = 'Mudar para compromisso';
do $$ begin
  if exists(select 1 from public.tasks where titulo = 'Mudar para compromisso')
    then raise exception 'Mudança para compromisso manteve tarefa'; end if;
end $$;

delete from public.talki_agenda_events
where titulo = 'Tarefa atualizada';
do $$
begin
  if (select count(*) from public.tasks) <> 1 then raise exception 'Tarefa do evento excluído permaneceu'; end if;
  if has_table_privilege('authenticated', 'talki_private.agenda_task_links', 'SELECT')
    then raise exception 'Vínculos privados expostos'; end if;
end;
$$;

set local role service_role;
select public.talki_google_task_apply(
  '11111111-1111-1111-1111-111111111111', 'google-list', 'google-task',
  '{"title":"Tarefa nativa do Google","notes":"Nota do Google","status":"needsAction","due":"2026-10-10T00:00:00.000Z","updated":"2026-10-05T14:00:00Z","webViewLink":"https://tasks.google.com/task"}'::jsonb
);
set local role authenticated;
update public.tasks set kanban_status = 'trabalhando' where titulo = 'Tarefa nativa do Google';
set local role service_role;
select public.talki_google_task_apply(
  '11111111-1111-1111-1111-111111111111', 'google-list', 'google-task',
  '{"title":"Tarefa nativa atualizada","status":"needsAction","due":"2026-10-11T00:00:00.000Z","updated":"2026-10-05T15:00:00Z"}'::jsonb
);
set local role authenticated;
do $$ begin
  if not exists(
    select 1 from public.tasks where titulo = 'Tarefa nativa atualizada'
      and prazo = '2026-10-11' and kanban_status = 'trabalhando'
  ) then raise exception 'Google Task não foi criado/atualizado preservando a coluna'; end if;
end $$;

set local role service_role;
select public.talki_google_task_apply(
  '11111111-1111-1111-1111-111111111111', 'google-list', 'google-task',
  '{"title":"Tarefa nativa atualizada","status":"completed","completed":"2026-10-05T16:00:00Z","updated":"2026-10-05T16:00:00Z"}'::jsonb
);
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.tasks where titulo = 'Tarefa nativa atualizada' and kanban_status = 'finalizado' and status = 'concluida')
    then raise exception 'Conclusão do Google Task não chegou ao Kanban'; end if;
  if has_table_privilege('authenticated', 'public.talki_google_task_links', 'SELECT')
    then raise exception 'Vínculos do Google Tasks expostos'; end if;
end $$;

set local role service_role;
select public.talki_google_task_apply(
  '11111111-1111-1111-1111-111111111111', 'google-list', 'google-task',
  '{"deleted":true}'::jsonb
);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.tasks where titulo = 'Tarefa nativa atualizada')
    then raise exception 'Exclusão do Google Task não chegou ao Kanban'; end if;
end $$;

rollback;
