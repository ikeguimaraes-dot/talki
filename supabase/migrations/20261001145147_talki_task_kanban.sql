-- A posição no Kanban pertence à tarefa, independentemente do projeto/bucket.
-- NULL mantém a tarefa fora do quadro até que uma coluna seja escolhida.
alter table public.tasks add column kanban_status text
  constraint tasks_kanban_status_check
  check (kanban_status in ('fila', 'trabalhando', 'esperando', 'finalizado'));
comment on column public.tasks.kanban_status is 'Coluna opcional no Kanban global; não altera o projeto, bucket ou status da tarefa.';
