-- Organização plana: para ~20 pessoas no mesmo escritório, a camada de
-- "membro do plano" só gera atrito sem entregar segurança real. Todo
-- perfil autenticado passa a ver todos os planos e pode ser responsável
-- por qualquer tarefa. plan_members deixa de governar acesso (a tabela
-- continua existindo, só não é mais referenciada nestas policies).
--
-- is_admin() e is_plan_member() não são alterados nem removidos: seguem
-- em uso por plan_invites e pelas policies do próprio plan_members, que
-- não fazem parte desta mudança.

-- plans ----------------------------------------------------------------
drop policy if exists "plans_select_members" on public.plans;
drop policy if exists "plans_update_members" on public.plans;
drop policy if exists "plans_delete_creator_or_admin" on public.plans;

create policy "plans_select_authenticated" on public.plans
  for select to authenticated using (true);

create policy "plans_update_authenticated" on public.plans
  for update to authenticated using (true) with check (true);

-- Apagar plano é destrutivo e não reversível: continua restrito a admin.
create policy "plans_delete_admin_only" on public.plans
  for delete to authenticated using (public.is_admin());

-- plans_insert_as_creator não depende de membership (é checagem de
-- identidade: criado_por = auth.uid()), então fica como está.

-- buckets ----------------------------------------------------------------
drop policy if exists "buckets_all_members" on public.buckets;

create policy "buckets_all_authenticated" on public.buckets
  for all to authenticated using (true) with check (true);

-- tasks --------------------------------------------------------------------
drop policy if exists "tasks_all_members" on public.tasks;

create policy "tasks_all_authenticated" on public.tasks
  for all to authenticated using (true) with check (true);

-- task_assignees: segue tasks. Sem isso, "responsável por qualquer
-- tarefa" não funciona (o insert continuaria preso a quem já era
-- membro do plano da tarefa).
drop policy if exists "task_assignees_all_members" on public.task_assignees;

create policy "task_assignees_all_authenticated" on public.task_assignees
  for all to authenticated using (true) with check (true);

-- task_checklist ------------------------------------------------------------
drop policy if exists "task_checklist_all_members" on public.task_checklist;

create policy "task_checklist_all_authenticated" on public.task_checklist
  for all to authenticated using (true) with check (true);

-- task_labels / task_label_links --------------------------------------------
drop policy if exists "task_labels_all_members" on public.task_labels;

create policy "task_labels_all_authenticated" on public.task_labels
  for all to authenticated using (true) with check (true);

-- task_label_links segue tasks pelo mesmo motivo que task_assignees:
-- rotular uma tarefa não deve mais depender de membership do plano.
drop policy if exists "task_label_links_all_members" on public.task_label_links;

create policy "task_label_links_all_authenticated" on public.task_label_links
  for all to authenticated using (true) with check (true);

-- task_comments ---------------------------------------------------------------
drop policy if exists "task_comments_select_members" on public.task_comments;
drop policy if exists "task_comments_insert_members" on public.task_comments;
drop policy if exists "task_comments_delete_own_or_admin" on public.task_comments;

create policy "task_comments_select_authenticated" on public.task_comments
  for select to authenticated using (true);

-- Insert mantém user_id = auth.uid(): não é uma checagem de membership
-- (essa foi removida), é anti-spoofing de identidade — sem ela, um
-- usuário poderia inserir comentário em nome de outro perfil.
create policy "task_comments_insert_own" on public.task_comments
  for insert to authenticated with check (user_id = auth.uid());

create policy "task_comments_update_authenticated" on public.task_comments
  for update to authenticated using (true) with check (true);

create policy "task_comments_delete_authenticated" on public.task_comments
  for delete to authenticated using (true);

-- profiles -------------------------------------------------------------------
-- Já estava correto antes desta migration: SELECT liberado pra
-- autenticados (profiles_select_authenticated) e UPDATE restrito ao
-- próprio registro ou admin (profiles_update_own_or_admin). Nada a
-- dropar ou recriar aqui.
