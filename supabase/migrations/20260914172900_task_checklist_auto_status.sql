-- Bloco A da "Régua de % de entrega": auto-conclusão/auto-reabertura
-- de tarefa a partir do checklist. Só se aplica a tarefas com pelo
-- menos 1 item de checklist; tarefa sem checklist nenhum continua
-- 100% manual (total = 0 nunca mexe no status).
--
-- Comportamento assumido e aceito: se uma tarefa for concluída
-- manualmente com checklist incompleto e depois alguém interagir de
-- novo com o checklist sem chegar a 100%, a tarefa reabre sozinha —
-- a regra "abaixo de 100% = reabre" não distingue conclusão manual
-- de automática.
create or replace function public.sync_task_status_from_checklist()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_task_id uuid;
  v_total int;
  v_done int;
  v_status text;
begin
  v_task_id := coalesce(new.task_id, old.task_id);

  select count(*), count(*) filter (where feito)
    into v_total, v_done
    from task_checklist
    where task_id = v_task_id;

  if v_total = 0 then
    return coalesce(new, old);
  end if;

  select status into v_status from tasks where id = v_task_id;

  if v_done = v_total and v_status is distinct from 'concluida' then
    update tasks set status = 'concluida', concluida_em = now() where id = v_task_id;
  elsif v_done < v_total and v_status = 'concluida' then
    update tasks set status = 'em_andamento', concluida_em = null where id = v_task_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_task_checklist_sync_status on public.task_checklist;
create trigger trg_task_checklist_sync_status
  after insert or update or delete on public.task_checklist
  for each row
  execute function public.sync_task_status_from_checklist();
