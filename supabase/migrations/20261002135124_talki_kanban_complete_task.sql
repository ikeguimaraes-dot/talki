create or replace function public.stamp_task_completion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- Only entering Finalizado completes the task; other moves keep its status.
  if new.kanban_status = 'finalizado' then
    if tg_op = 'INSERT' then
      new.status := 'concluida';
    elsif new.kanban_status is distinct from old.kanban_status then
      new.status := 'concluida';
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.concluida_em := case when new.status = 'concluida' then now() else null end;
  elsif new.status is distinct from old.status then
    new.concluida_em := case when new.status = 'concluida' then now() else null end;
  else
    new.concluida_em := old.concluida_em;
  end if;
  return new;
end;
$$;
