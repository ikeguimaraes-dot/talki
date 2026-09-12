-- Cor opcional da tarefa, exibida como barra lateral no card. Guarda um
-- token semântico (não hex) pra ficar consistente com as CSS variables do
-- tema em vez de cor fixa gravada no banco. RLS: sem policy nova — o campo
-- é coberto por tasks_update_members, igual qualquer outro campo da tarefa.
alter table public.tasks
  add column cor text null
  constraint tasks_cor_check check (cor is null or cor in ('violeta', 'azul', 'verde', 'ambar', 'vermelho', 'rosa', 'cinza'));
