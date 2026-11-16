-- Every agenda event owns one Kanban task. Personal events use a private
-- per-user "Agenda" plan; events shared with a plan use that plan directly.
create table talki_private.agenda_plan_links (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  plan_id uuid not null unique references public.plans(id) on delete cascade,
  bucket_id uuid not null unique references public.buckets(id) on delete cascade
);

create table talki_private.agenda_task_links (
  event_id uuid primary key references public.talki_agenda_events(id) on delete cascade,
  task_id uuid not null unique references public.tasks(id) on delete cascade
);

revoke all on talki_private.agenda_plan_links, talki_private.agenda_task_links
  from public, anon, authenticated;
grant all on talki_private.agenda_plan_links, talki_private.agenda_task_links to service_role;

create function talki_private.sync_agenda_task(p_event public.talki_agenda_events)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plan uuid := p_event.plan_id;
  target_bucket uuid;
  linked_task uuid;
  task_description text;
  start_day date;
  end_day date;
  start_time time;
  end_time time;
begin
  -- Serializes creation of the personal plan when imports and browser writes
  -- arrive together for the same owner.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('talki-agenda-plan:' || p_event.owner_id::text, 0)
  );

  if target_plan is null then
    select plan_id, bucket_id into target_plan, target_bucket
    from talki_private.agenda_plan_links
    where owner_id = p_event.owner_id;

    if not found then
      insert into public.plans(nome, descricao, criado_por, cor)
      values('Agenda', 'Compromissos sincronizados automaticamente com o Kanban.', p_event.owner_id, '#4285F4')
      returning id into target_plan;

      insert into public.plan_members(plan_id, user_id)
      values(target_plan, p_event.owner_id)
      on conflict do nothing;

      insert into public.buckets(plan_id, nome, ordem)
      values(target_plan, 'Agenda', 0)
      returning id into target_bucket;

      insert into talki_private.agenda_plan_links(owner_id, plan_id, bucket_id)
      values(p_event.owner_id, target_plan, target_bucket);
    end if;
  else
    select id into target_bucket
    from public.buckets
    where plan_id = target_plan
    order by ordem, id
    limit 1;

    if target_bucket is null then
      insert into public.buckets(plan_id, nome, ordem)
      values(target_plan, 'Agenda', 0)
      returning id into target_bucket;
    end if;
  end if;

  task_description := nullif(pg_catalog.concat_ws(E'\n\n',
    nullif(pg_catalog.btrim(p_event.descricao), ''),
    case when p_event.local <> '' then 'Local: ' || p_event.local end,
    case when p_event.link <> '' then 'Link: ' || p_event.link end
  ), '');
  start_day := (p_event.inicio at time zone 'America/Sao_Paulo')::date;
  end_day := (case when p_event.dia_inteiro then p_event.fim - interval '1 microsecond' else p_event.fim end
    at time zone 'America/Sao_Paulo')::date;
  start_time := case when p_event.dia_inteiro then null else (p_event.inicio at time zone 'America/Sao_Paulo')::time end;
  end_time := case when p_event.dia_inteiro then null else (p_event.fim at time zone 'America/Sao_Paulo')::time end;

  select task_id into linked_task
  from talki_private.agenda_task_links
  where event_id = p_event.id;

  if linked_task is not null then
    update public.tasks set
      plan_id = target_plan,
      bucket_id = target_bucket,
      titulo = p_event.titulo,
      descricao = task_description,
      inicio = start_day,
      prazo = end_day,
      inicio_hora = start_time,
      prazo_hora = end_time
    where id = linked_task;

    if found then return linked_task; end if;
  end if;

  insert into public.tasks(
    plan_id, bucket_id, titulo, descricao, prioridade, status,
    kanban_status, inicio, prazo, inicio_hora, prazo_hora, ordem, criado_por
  ) values (
    target_plan, target_bucket, p_event.titulo, task_description, 'media', 'nao_iniciada',
    'fila', start_day, end_day, start_time, end_time,
    coalesce((select max(ordem) + 1 from public.tasks where bucket_id = target_bucket), 0),
    p_event.owner_id
  ) returning id into linked_task;

  insert into public.task_assignees(task_id, user_id, atribuido_por)
  values(linked_task, p_event.owner_id, p_event.owner_id)
  on conflict do nothing;

  insert into talki_private.agenda_task_links(event_id, task_id)
  values(p_event.id, linked_task)
  on conflict(event_id) do update set task_id = excluded.task_id;

  return linked_task;
end;
$$;

revoke all on function talki_private.sync_agenda_task(public.talki_agenda_events)
  from public, anon, authenticated;

create function talki_private.agenda_task_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform talki_private.sync_agenda_task(new);
  return new;
end;
$$;

create function talki_private.agenda_task_delete_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.tasks
  where id = (select task_id from talki_private.agenda_task_links where event_id = old.id);
  return old;
end;
$$;

revoke all on function talki_private.agenda_task_sync_trigger(),
  talki_private.agenda_task_delete_trigger() from public, anon, authenticated;

create trigger agenda_task_sync
after insert or update of plan_id, titulo, descricao, inicio, fim, dia_inteiro, local, link
on public.talki_agenda_events
for each row execute function talki_private.agenda_task_sync_trigger();

create trigger agenda_task_delete
before delete on public.talki_agenda_events
for each row execute function talki_private.agenda_task_delete_trigger();

-- Existing local and Google events receive their task once during rollout.
do $$
declare event_row public.talki_agenda_events;
begin
  for event_row in select * from public.talki_agenda_events order by owner_id, created_at, id loop
    perform talki_private.sync_agenda_task(event_row);
  end loop;
end;
$$;
