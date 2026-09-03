-- is_admin()/is_plan_member() existem só pra uso interno das policies de RLS.
-- Por padrão o Postgres expõe toda function do schema public como RPC
-- pública (PostgREST) — o advisor de segurança do Supabase aponta isso.
-- get_plan_invite/accept_plan_invite precisam continuar chamáveis via RPC
-- (é o mecanismo do link de convite); estas duas não.
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_plan_member(uuid) from public;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_plan_member(uuid) to authenticated;
