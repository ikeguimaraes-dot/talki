-- A project task and its initial assignee must be saved together.
-- INVOKER keeps the existing task/bucket/assignee access policies.
create function public.talki_create_project_task(p_bucket_id uuid, p_titulo text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_plan uuid;
  v_task uuid;
begin
  if v_user is null then raise exception 'Faça login novamente.' using errcode = '42501'; end if;
  if p_titulo is null or char_length(btrim(p_titulo)) not between 1 and 300 then
    raise exception 'Informe um título de até 300 caracteres.';
  end if;
  select plan_id into v_plan from public.buckets where id = p_bucket_id;
  if v_plan is null then raise exception 'Projeto ou lista indisponível.' using errcode = '42501'; end if;
  insert into public.tasks(plan_id, bucket_id, titulo, criado_por, ordem)
  values(v_plan, p_bucket_id, btrim(p_titulo), v_user,
    coalesce((select max(ordem) + 1 from public.tasks where bucket_id = p_bucket_id), 0))
  returning id into v_task;
  insert into public.task_assignees(task_id, user_id, atribuido_por)
  values(v_task, v_user, v_user);
  return v_task;
end;
$$;
revoke all on function public.talki_create_project_task(uuid, text) from public, anon;
grant execute on function public.talki_create_project_task(uuid, text) to authenticated;

-- All signed-in colleagues can already see projects. Expose their state too,
-- including projects where they are not explicitly listed as members.
alter policy read_settings on public.talki_plan_settings using (true);

-- State uses the existing Jornada settings, preserving area_id and its rules.
create function public.talki_set_project_active(p_plan_id uuid, p_ativo boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_plan_owner(p_plan_id) then
    raise exception 'Apenas o dono ou um administrador pode configurar este projeto.' using errcode = '42501';
  end if;
  if p_ativo is null then raise exception 'Informe o estado do projeto.'; end if;
  insert into public.talki_plan_settings(plan_id, ativo) values(p_plan_id, p_ativo)
  on conflict(plan_id) do update set ativo = excluded.ativo;
end;
$$;
revoke all on function public.talki_set_project_active(uuid, boolean) from public, anon;
grant execute on function public.talki_set_project_active(uuid, boolean) to authenticated;

-- Legacy tasks without assignees enter the current user's board when sent
-- to Kanban. Existing assignments (including deliberate delegation) stay intact.
create function public.talki_set_task_kanban(p_task_id uuid, p_column text)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Faça login novamente.' using errcode = '42501'; end if;
  perform 1 from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Tarefa indisponível.' using errcode = '42501'; end if;
  if p_column is not null and not exists(select 1 from public.task_assignees where task_id = p_task_id) then
    insert into public.task_assignees(task_id, user_id, atribuido_por) values(p_task_id, v_user, v_user);
  end if;
  update public.tasks set kanban_status = p_column where id = p_task_id;
end;
$$;
revoke all on function public.talki_set_task_kanban(uuid, text) from public, anon;
grant execute on function public.talki_set_task_kanban(uuid, text) to authenticated;
