begin;
insert into public.tasks(id) values ('00000000-0000-0000-0000-000000000001');
insert into public.task_checklist(id,task_id,texto,inicio,inicio_hora,prazo,prazo_hora)
values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Teste','2026-10-02','09:30','2026-10-03','17:45');
update public.task_checklist set feito=true;
do $$ begin
 assert (select concluida_em=now() from public.task_checklist), 'Checklist completion must be server timestamp';
 assert (select status='concluida' and concluida_em=now() from public.tasks), 'Automatic task completion must be stamped';
 assert (select prazo_hora='17:45'::time and inicio_hora='09:30'::time from public.task_checklist), 'Planned times changed';
end $$;
update public.task_checklist set concluida_em='2000-01-01', texto='Editado';
do $$ begin
 assert (select concluida_em=now() from public.task_checklist), 'Editing must preserve completion time';
end $$;
update public.task_checklist set feito=false;
do $$ begin
 assert (select concluida_em is null from public.task_checklist), 'Reopen must clear completion';
 assert (select status='em_andamento' and concluida_em is null from public.tasks), 'Parent must reopen';
end $$;
update public.tasks set status='concluida',concluida_em='2000-01-01';
do $$ begin
 assert (select concluida_em=now() from public.tasks), 'Manual task completion must use server time';
end $$;
rollback;
