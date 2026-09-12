-- Reverte a organização plana: volta a ser controle de acesso por
-- projeto, com papéis claros (membro / criador do projeto / admin).
-- Dropa explicitamente todas as policies using(true) criadas na
-- migration anterior (20260911180546_flatten_org_permissions.sql) e
-- recria com as regras de acesso por projeto.
--
-- is_admin() e is_plan_member() não mudam (confirmados intactos antes
-- desta migration). plan_members não ganhou coluna de papel: o
-- criador do projeto é identificado por plans.criado_por, não por um
-- campo na tabela de membros — confirmado NOT NULL tanto em
-- plans.criado_por quanto em tasks.criado_por.

-- funções auxiliares -----------------------------------------------------
create or replace function public.is_plan_owner(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.plans where id = p_plan_id and criado_por = auth.uid()
  );
$$;

-- Criador da tarefa OU criador do projeto OU admin. Usada tanto pra
-- gerenciar task_assignees quanto pro delete de tasks (mesma regra).
create or replace function public.can_manage_task_assignees(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.tasks t
    join public.plans p on p.id = t.plan_id
    where t.id = p_task_id
      and (t.criado_por = auth.uid() or p.criado_por = auth.uid())
  );
$$;

-- plans ----------------------------------------------------------------
drop policy if exists "plans_select_authenticated" on public.plans;
drop policy if exists "plans_update_authenticated" on public.plans;
drop policy if exists "plans_delete_admin_only" on public.plans;

create policy "plans_select_members" on public.plans
  for select to authenticated using (public.is_plan_member(id));

create policy "plans_update_owner" on public.plans
  for update to authenticated using (public.is_plan_owner(id)) with check (public.is_plan_owner(id));

create policy "plans_delete_owner" on public.plans
  for delete to authenticated using (public.is_plan_owner(id));

-- plans_insert_as_creator (criado_por = auth.uid()) não é afetada:
-- criar continua liberado pra qualquer autenticado, e nunca dependeu
-- de membership.

-- plan_members ------------------------------------------------------------
-- plan_members_select (is_plan_member(plan_id)) já está correta e não
-- muda. Insert e delete passam a ser só o dono do projeto (ou admin).
drop policy if exists "plan_members_insert" on public.plan_members;
drop policy if exists "plan_members_delete" on public.plan_members;

create policy "plan_members_insert_owner" on public.plan_members
  for insert to authenticated with check (public.is_plan_owner(plan_id));

-- O criador do projeto não pode ser removido da lista de membros.
create policy "plan_members_delete_owner" on public.plan_members
  for delete to authenticated using (
    public.is_plan_owner(plan_id)
    and user_id <> (select criado_por from public.plans where id = plan_members.plan_id)
  );

-- buckets ----------------------------------------------------------------
drop policy if exists "buckets_all_authenticated" on public.buckets;

create policy "buckets_all_members" on public.buckets
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

-- tasks --------------------------------------------------------------------
drop policy if exists "tasks_all_authenticated" on public.tasks;

create policy "tasks_select_members" on public.tasks
  for select to authenticated using (public.is_plan_member(plan_id));

create policy "tasks_insert_members" on public.tasks
  for insert to authenticated
  with check (public.is_plan_member(plan_id) and (criado_por = auth.uid() or public.is_admin()));

create policy "tasks_update_members" on public.tasks
  for update to authenticated
  using (public.is_plan_member(plan_id)) with check (public.is_plan_member(plan_id));

-- Excluir: criador da tarefa, criador do projeto, ou admin.
create policy "tasks_delete_owner" on public.tasks
  for delete to authenticated using (public.can_manage_task_assignees(id));

-- task_assignees --------------------------------------------------------------
drop policy if exists "task_assignees_all_authenticated" on public.task_assignees;

create policy "task_assignees_select_members" on public.task_assignees
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

create policy "task_assignees_insert_managers" on public.task_assignees
  for insert to authenticated with check (public.can_manage_task_assignees(task_id));

create policy "task_assignees_update_managers" on public.task_assignees
  for update to authenticated
  using (public.can_manage_task_assignees(task_id)) with check (public.can_manage_task_assignees(task_id));

create policy "task_assignees_delete_managers" on public.task_assignees
  for delete to authenticated using (public.can_manage_task_assignees(task_id));

-- task_checklist ------------------------------------------------------------
drop policy if exists "task_checklist_all_authenticated" on public.task_checklist;

create policy "task_checklist_all_members" on public.task_checklist
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- task_labels / task_label_links --------------------------------------------
drop policy if exists "task_labels_all_authenticated" on public.task_labels;

create policy "task_labels_all_members" on public.task_labels
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

drop policy if exists "task_label_links_all_authenticated" on public.task_label_links;

create policy "task_label_links_all_members" on public.task_label_links
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- task_comments ---------------------------------------------------------------
drop policy if exists "task_comments_select_authenticated" on public.task_comments;
drop policy if exists "task_comments_insert_own" on public.task_comments;
drop policy if exists "task_comments_update_authenticated" on public.task_comments;
drop policy if exists "task_comments_delete_authenticated" on public.task_comments;

create policy "task_comments_select_members" on public.task_comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- user_id = auth.uid() continua (anti-spoofing de identidade, não é
-- checagem de membership), + volta a exigir membership no projeto.
create policy "task_comments_insert_members" on public.task_comments
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

create policy "task_comments_delete_own_or_admin" on public.task_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- profiles -------------------------------------------------------------------
-- Sem mudança: select aberto a autenticados, update só do próprio
-- registro ou admin. Necessário pro "Adicionar membro" buscar em todos
-- os perfis mesmo continuando sem SELECT restrito por projeto.
