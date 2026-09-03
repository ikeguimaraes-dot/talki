-- Mesmo problema do ovo-e-galinha do plan_members: a policy de SELECT em
-- plans usava só is_plan_member(id), o que bloqueia o RETURNING do próprio
-- INSERT do criador (ele ainda não está em plan_members nesse instante).
drop policy if exists "plans_select_members" on public.plans;

create policy "plans_select_members" on public.plans
  for select to authenticated
  using (public.is_plan_member(id) or criado_por = auth.uid());
