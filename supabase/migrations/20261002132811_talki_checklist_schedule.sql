alter table public.tasks
  add column inicio_hora time,
  add column prazo_hora time;
alter table public.task_checklist
  add column inicio date,
  add column inicio_hora time,
  add column prazo date,
  add column prazo_hora time,
  add column concluida_em timestamptz;

-- Completion timestamps come from the database, including checklist automation.
create function public.stamp_checklist_completion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.concluida_em := case when new.feito then now() else null end;
  elsif new.feito is distinct from old.feito then
    new.concluida_em := case when new.feito then now() else null end;
  else
    new.concluida_em := old.concluida_em;
  end if;
  return new;
end;
$$;
create trigger stamp_checklist_completion before insert or update on public.task_checklist
for each row execute function public.stamp_checklist_completion();

create function public.stamp_task_completion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
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
create trigger stamp_task_completion before insert or update on public.tasks
for each row execute function public.stamp_task_completion();
