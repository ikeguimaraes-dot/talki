-- Rastreio de quem atribuiu e quando, pra alimentar /marcacoes (últimas
-- atribuições recebidas, 48h). Registros existentes ficam com
-- criado_em = now() no momento desta migration (não tem como saber a
-- data real retroativa) e atribuido_por = null (idem para quem atribuiu).
alter table public.task_assignees
  add column criado_em timestamptz not null default now(),
  add column atribuido_por uuid references public.profiles(id) default auth.uid();
