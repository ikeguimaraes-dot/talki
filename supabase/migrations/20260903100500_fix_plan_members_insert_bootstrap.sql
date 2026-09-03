-- A policy original de plan_members_insert exigia is_plan_member(plan_id),
-- o que impede o criador do plano de se adicionar como primeiro membro
-- (ele ainda não é membro no momento do insert). Permite também o caso
-- "sou o criador do plano me adicionando".
drop policy if exists "plan_members_insert" on public.plan_members;

create policy "plan_members_insert" on public.plan_members
  for insert to authenticated
  with check (
    public.is_plan_member(plan_id)
    or (
      user_id = auth.uid()
      and exists (select 1 from public.plans p where p.id = plan_id and p.criado_por = auth.uid())
    )
  );
