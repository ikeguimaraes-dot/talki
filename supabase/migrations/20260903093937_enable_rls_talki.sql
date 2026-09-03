-- Habilita RLS nas tabelas do Talki. Escopo estrito: nenhuma outra tabela
-- deste projeto compartilhado (KPH OS) é tocada por esta migration.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_plan_member(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.plan_members where plan_id = p_plan_id and user_id = auth.uid()
  );
$$;

-- profiles ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- plans -----------------------------------------------------------------
alter table public.plans enable row level security;

create policy "plans_select_members" on public.plans
  for select to authenticated using (public.is_plan_member(id));

create policy "plans_insert_as_creator" on public.plans
  for insert to authenticated with check (criado_por = auth.uid());

create policy "plans_update_members" on public.plans
  for update to authenticated using (public.is_plan_member(id));

create policy "plans_delete_creator_or_admin" on public.plans
  for delete to authenticated using (criado_por = auth.uid() or public.is_admin());

-- plan_members ------------------------------------------------------------
alter table public.plan_members enable row level security;

create policy "plan_members_select" on public.plan_members
  for select to authenticated using (public.is_plan_member(plan_id));

create policy "plan_members_insert" on public.plan_members
  for insert to authenticated with check (public.is_plan_member(plan_id));

create policy "plan_members_delete" on public.plan_members
  for delete to authenticated using (public.is_plan_member(plan_id));

-- buckets -----------------------------------------------------------------
alter table public.buckets enable row level security;

create policy "buckets_all_members" on public.buckets
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

-- tasks ---------------------------------------------------------------------
alter table public.tasks enable row level security;

create policy "tasks_all_members" on public.tasks
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

-- task_assignees --------------------------------------------------------------
alter table public.task_assignees enable row level security;

create policy "task_assignees_all_members" on public.task_assignees
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- task_checklist ------------------------------------------------------------
alter table public.task_checklist enable row level security;

create policy "task_checklist_all_members" on public.task_checklist
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- task_labels / task_label_links --------------------------------------------
alter table public.task_labels enable row level security;

create policy "task_labels_all_members" on public.task_labels
  for all to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));

alter table public.task_label_links enable row level security;

create policy "task_label_links_all_members" on public.task_label_links
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

-- task_comments -------------------------------------------------------------
alter table public.task_comments enable row level security;

create policy "task_comments_select_members" on public.task_comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

create policy "task_comments_insert_members" on public.task_comments
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and public.is_plan_member(t.plan_id)));

create policy "task_comments_delete_own_or_admin" on public.task_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- plan_invites ----------------------------------------------------------------
-- Sem policy de SELECT público: o link de convite funciona por token
-- (segredo não-enumerável), então a leitura por token passa pelas funções
-- SECURITY DEFINER abaixo em vez de uma policy "using (true)" na tabela,
-- que permitiria a qualquer usuário autenticado listar todos os convites.
alter table public.plan_invites enable row level security;

create policy "plan_invites_select_members" on public.plan_invites
  for select to authenticated using (public.is_plan_member(plan_id));

create policy "plan_invites_insert_members" on public.plan_invites
  for insert to authenticated with check (public.is_plan_member(plan_id));

create policy "plan_invites_delete_members" on public.plan_invites
  for delete to authenticated using (public.is_plan_member(plan_id));

-- RPCs de convite: consulta e aceite por token, sem expor a tabela toda ------
create or replace function public.get_plan_invite(p_token text)
returns table (plan_id uuid, plan_nome text, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select pi.plan_id, p.nome, pi.expires_at
  from public.plan_invites pi
  join public.plans p on p.id = pi.plan_id
  where pi.token = p_token and pi.expires_at > now();
$$;

grant execute on function public.get_plan_invite(text) to authenticated, anon;

create or replace function public.accept_plan_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_id uuid;
begin
  select pi.plan_id into v_plan_id
  from public.plan_invites pi
  where pi.token = p_token and pi.expires_at > now();

  if v_plan_id is null then
    raise exception 'Convite inválido ou expirado.';
  end if;

  insert into public.plan_members (plan_id, user_id)
  values (v_plan_id, auth.uid())
  on conflict do nothing;

  return v_plan_id;
end;
$$;

grant execute on function public.accept_plan_invite(text) to authenticated;
