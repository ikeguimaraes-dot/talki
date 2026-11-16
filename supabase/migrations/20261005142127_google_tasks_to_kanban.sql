-- Native Google Tasks are a separate API from Google Calendar events. Keep
-- their provider identifiers private and materialize each one as a Kanban task.
alter table public.talki_google_connections add column granted_scopes text[];

create table public.talki_google_task_links (
  owner_id uuid not null references public.talki_google_connections(owner_id) on delete cascade,
  tasklist_id text not null,
  remote_id text not null,
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  remote_status text not null check(remote_status in ('needsAction', 'completed')),
  remote_updated timestamptz,
  primary key(owner_id, tasklist_id, remote_id)
);

alter table public.talki_google_task_links enable row level security;
revoke all on public.talki_google_task_links from public, anon, authenticated;
grant all on public.talki_google_task_links to service_role;

create function public.talki_google_task_apply(
  p_owner uuid,
  p_tasklist text,
  p_remote text,
  p_task jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  linked public.talki_google_task_links;
  target_plan uuid;
  target_bucket uuid;
  target_task uuid;
  target_status text;
  target_day date;
  task_description text;
begin
  select * into linked
  from public.talki_google_task_links
  where owner_id = p_owner and tasklist_id = p_tasklist and remote_id = p_remote
  for update;

  if coalesce((p_task->>'deleted')::boolean, false) then
    if linked.task_id is not null then
      delete from public.tasks where id = linked.task_id;
    end if;
    return null;
  end if;

  target_status := case when p_task->>'status' = 'completed' then 'completed' else 'needsAction' end;
  if linked.task_id is not null
     and linked.remote_updated is not distinct from nullif(p_task->>'updated', '')::timestamptz
     and linked.remote_status = target_status then
    return linked.task_id;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('talki-agenda-plan:' || p_owner::text, 0)
  );
  select plan_id, bucket_id into target_plan, target_bucket
  from talki_private.agenda_plan_links
  where owner_id = p_owner;

  if not found then
    insert into public.plans(nome, descricao, criado_por, cor)
    values('Agenda', 'Tarefas da agenda sincronizadas automaticamente com o Kanban.', p_owner, '#4285F4')
    returning id into target_plan;
    insert into public.plan_members(plan_id, user_id) values(target_plan, p_owner) on conflict do nothing;
    insert into public.buckets(plan_id, nome, ordem) values(target_plan, 'Agenda', 0) returning id into target_bucket;
    insert into talki_private.agenda_plan_links(owner_id, plan_id, bucket_id)
    values(p_owner, target_plan, target_bucket);
  end if;

  -- Google Tasks documents this as a date-only field even though it is encoded
  -- as RFC 3339. Reading the leading date avoids a timezone day shift.
  target_day := case when nullif(p_task->>'due', '') is null then null
    else left(p_task->>'due', 10)::date end;
  task_description := nullif(pg_catalog.concat_ws(E'\n\n',
    nullif(pg_catalog.btrim(p_task->>'notes'), ''),
    case when nullif(p_task->>'webViewLink', '') is not null
      then 'Google Tasks: ' || (p_task->>'webViewLink') end
  ), '');

  if linked.task_id is not null then
    update public.tasks set
      titulo = left(coalesce(nullif(pg_catalog.btrim(p_task->>'title'), ''), 'Sem título'), 240),
      descricao = task_description,
      inicio = target_day,
      prazo = target_day,
      inicio_hora = null,
      prazo_hora = null,
      status = case
        when target_status = 'completed' then 'concluida'
        when linked.remote_status = 'completed' then 'nao_iniciada'
        else status end,
      kanban_status = case
        when target_status = 'completed' then 'finalizado'
        when linked.remote_status = 'completed' then 'fila'
        else kanban_status end
    where id = linked.task_id
    returning id into target_task;
  end if;

  if target_task is null then
    insert into public.tasks(
      plan_id, bucket_id, titulo, descricao, prioridade, status,
      kanban_status, inicio, prazo, ordem, criado_por
    ) values (
      target_plan, target_bucket,
      left(coalesce(nullif(pg_catalog.btrim(p_task->>'title'), ''), 'Sem título'), 240),
      task_description, 'media',
      case when target_status = 'completed' then 'concluida' else 'nao_iniciada' end,
      case when target_status = 'completed' then 'finalizado' else 'fila' end,
      target_day, target_day,
      coalesce((select max(ordem) + 1 from public.tasks where bucket_id = target_bucket), 0),
      p_owner
    ) returning id into target_task;
    insert into public.task_assignees(task_id, user_id, atribuido_por)
    values(target_task, p_owner, p_owner) on conflict do nothing;
  end if;

  insert into public.talki_google_task_links(
    owner_id, tasklist_id, remote_id, task_id, remote_status, remote_updated
  ) values (
    p_owner, p_tasklist, p_remote, target_task, target_status,
    nullif(p_task->>'updated', '')::timestamptz
  )
  on conflict(owner_id, tasklist_id, remote_id) do update set
    task_id = excluded.task_id,
    remote_status = excluded.remote_status,
    remote_updated = excluded.remote_updated;

  return target_task;
end;
$$;

revoke all on function public.talki_google_task_apply(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.talki_google_task_apply(uuid, text, text, jsonb)
  to service_role;
