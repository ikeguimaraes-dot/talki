-- One transaction: the new task and its assignment either both exist or neither.
-- SECURITY INVOKER preserves existing project/task RLS.
create function public.talki_mini_create_task(
  p_id uuid, p_bucket_id uuid, p_titulo text,
  p_inicio date default null, p_prazo date default null, p_prazo_hora time default null
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_user uuid := auth.uid(); v_plan uuid;
begin
  if v_user is null then raise exception 'Faça login novamente.' using errcode='42501'; end if;
  if char_length(btrim(p_titulo)) not between 1 and 300 then raise exception 'Informe um título de até 300 caracteres.'; end if;
  if p_inicio is not null and p_prazo is not null and p_prazo < p_inicio then raise exception 'O prazo deve ser igual ou posterior ao início.'; end if;
  if exists(select 1 from public.tasks where id=p_id and criado_por=v_user) then return p_id; end if;
  select plan_id into v_plan from public.buckets where id=p_bucket_id;
  if v_plan is null then raise exception 'Projeto ou lista indisponível.' using errcode='42501'; end if;
  insert into public.tasks(id,plan_id,bucket_id,titulo,criado_por,inicio,prazo,prazo_hora,kanban_status,ordem)
  values(p_id,v_plan,p_bucket_id,btrim(p_titulo),v_user,p_inicio,p_prazo,p_prazo_hora,'fila',
    coalesce((select max(ordem)+1 from public.tasks where bucket_id=p_bucket_id),0));
  insert into public.task_assignees(task_id,user_id,atribuido_por) values(p_id,v_user,v_user);
  return p_id;
end;
$$;
revoke all on function public.talki_mini_create_task(uuid,uuid,text,date,date,time) from public,anon;
grant execute on function public.talki_mini_create_task(uuid,uuid,text,date,date,time) to authenticated;
