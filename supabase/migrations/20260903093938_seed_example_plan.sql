-- Seed de exemplo pra testar o quadro: 1 plano, 3 buckets, 8 tarefas.
do $$
declare
  v_admin_id uuid;
  v_plan_id uuid;
  v_bucket_todo uuid;
  v_bucket_doing uuid;
  v_bucket_done uuid;
  v_label_id uuid;
  v_task_naming uuid;
  v_task_visual uuid;
begin
  select id into v_admin_id from public.profiles where email = 'ikeguimaraes@gmail.com';

  insert into public.plans (nome, descricao, cor, criado_por)
  values ('Exemplo: Lançamento de Marca', 'Plano de exemplo para testar o quadro de tarefas do Talki.', '#A8632F', v_admin_id)
  returning id into v_plan_id;

  insert into public.plan_members (plan_id, user_id) values (v_plan_id, v_admin_id);

  insert into public.buckets (plan_id, nome, ordem) values (v_plan_id, 'A fazer', 0) returning id into v_bucket_todo;
  insert into public.buckets (plan_id, nome, ordem) values (v_plan_id, 'Em andamento', 1) returning id into v_bucket_doing;
  insert into public.buckets (plan_id, nome, ordem) values (v_plan_id, 'Concluído', 2) returning id into v_bucket_done;

  insert into public.task_labels (plan_id, nome, cor) values (v_plan_id, 'Marca', '#A8632F') returning id into v_label_id;

  insert into public.tasks (plan_id, bucket_id, titulo, descricao, prioridade, status, prazo, ordem, criado_por)
  values (v_plan_id, v_bucket_todo, 'Definir naming da marca', 'Levantar 10 opções de nome e validar disponibilidade de domínio.', 'importante', 'nao_iniciada', current_date + 5, 0, v_admin_id)
  returning id into v_task_naming;

  insert into public.tasks (plan_id, bucket_id, titulo, descricao, prioridade, status, prazo, ordem, criado_por)
  values
    (v_plan_id, v_bucket_todo, 'Briefing com o time de design', null, 'media', 'nao_iniciada', current_date + 7, 1, v_admin_id),
    (v_plan_id, v_bucket_todo, 'Registrar marca no INPI', null, 'urgente', 'nao_iniciada', current_date - 2, 2, v_admin_id);

  insert into public.tasks (plan_id, bucket_id, titulo, descricao, prioridade, status, prazo, ordem, criado_por)
  values (v_plan_id, v_bucket_doing, 'Criar identidade visual', 'Paleta, tipografia e logo.', 'importante', 'em_andamento', current_date + 10, 0, v_admin_id)
  returning id into v_task_visual;

  insert into public.tasks (plan_id, bucket_id, titulo, descricao, prioridade, status, prazo, ordem, criado_por)
  values
    (v_plan_id, v_bucket_doing, 'Escrever brandbook', null, 'media', 'em_andamento', current_date + 14, 1, v_admin_id),
    (v_plan_id, v_bucket_doing, 'Validar naming com jurídico', null, 'baixa', 'em_andamento', null, 2, v_admin_id),
    (v_plan_id, v_bucket_done, 'Pesquisa de mercado', 'Concorrentes diretos e indiretos mapeados.', 'media', 'concluida', current_date - 10, 0, v_admin_id),
    (v_plan_id, v_bucket_done, 'Definir posicionamento', null, 'importante', 'concluida', current_date - 5, 1, v_admin_id);

  update public.tasks set concluida_em = criado_em where plan_id = v_plan_id and status = 'concluida';

  insert into public.task_assignees (task_id, user_id)
  select id, v_admin_id from public.tasks where plan_id = v_plan_id;

  insert into public.task_label_links (task_id, label_id) values
    (v_task_naming, v_label_id),
    (v_task_visual, v_label_id);

  insert into public.task_checklist (task_id, texto, feito, ordem) values
    (v_task_naming, 'Levantar 10 opções de nome', true, 0),
    (v_task_naming, 'Checar disponibilidade de domínio', false, 1),
    (v_task_naming, 'Validar com o time jurídico', false, 2);
end $$;
