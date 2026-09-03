-- Migra profiles/projects/buckets/tasks pro schema em pt-BR do Talki.
-- Preserva os dados existentes (perfis reais + conteúdo de teste).

-- profiles ------------------------------------------------------------
alter table public.profiles rename column name to nome;
alter table public.profiles rename column created_at to criado_em;
alter table public.profiles add column cargo text;
alter table public.profiles add column role text not null default 'membro';
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'membro'));
alter table public.profiles add column aceitou_termo_em timestamptz;

update public.profiles set role = 'admin' where email = 'ikeguimaraes@gmail.com';

-- mantém o trigger de signup em sincronia com a coluna renomeada
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    return new;
end;
$$;

-- plans (renomeada de projects) -----------------------------------------
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects drop constraint if exists projects_owner_id_fkey;

alter table public.projects rename to plans;
alter table public.plans rename column name to nome;
alter table public.plans rename column description to descricao;
alter table public.plans rename column owner_id to criado_por;
alter table public.plans rename column created_at to criado_em;
alter table public.plans drop column status;
alter table public.plans drop column start_date;
alter table public.plans drop column end_date;
alter table public.plans add column cor text;

update public.plans
set criado_por = (select id from public.profiles where email = 'ikeguimaraes@gmail.com')
where criado_por is null;

with numbered as (
  select id, row_number() over (order by criado_em) as rn from public.plans
)
update public.plans p
set cor = (array['#A8632F','#6B8F71','#8A5A3D','#C9A15A','#4A4238','#7A8FA6'])[((n.rn - 1) % 6) + 1]
from numbered n
where p.id = n.id;

alter table public.plans alter column criado_por set not null;
alter table public.plans add constraint plans_criado_por_fkey foreign key (criado_por) references public.profiles(id);
alter table public.plans alter column cor set not null;
alter table public.plans alter column cor set default '#A8632F';

-- buckets ---------------------------------------------------------------
alter table public.buckets rename column project_id to plan_id;
alter table public.buckets rename column name to nome;
alter table public.buckets add column ordem integer;

with numbered as (
  select id, row_number() over (partition by plan_id order by created_at) - 1 as rn
  from public.buckets
)
update public.buckets b set ordem = n.rn from numbered n where b.id = n.id;

alter table public.buckets alter column ordem set not null;
alter table public.buckets alter column ordem set default 0;
alter table public.buckets drop column created_at;

-- tasks -------------------------------------------------------------------
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop constraint if exists tasks_priority_check;

alter table public.tasks rename column project_id to plan_id;
alter table public.tasks rename column title to titulo;
alter table public.tasks rename column description to descricao;
alter table public.tasks rename column start_date to inicio;
alter table public.tasks rename column due_date to prazo;
alter table public.tasks alter column bucket_id set not null;

alter table public.tasks alter column status drop default;
update public.tasks set status = case status
  when 'Não iniciado' then 'nao_iniciada'
  when 'Em andamento' then 'em_andamento'
  when 'Concluído' then 'concluida'
  else 'nao_iniciada'
end;
alter table public.tasks alter column status set default 'nao_iniciada';
alter table public.tasks add constraint tasks_status_check check (status in ('nao_iniciada','em_andamento','concluida'));

alter table public.tasks alter column priority drop default;
update public.tasks set priority = case priority
  when 'Baixa' then 'baixa'
  when 'Média' then 'media'
  when 'Alta' then 'importante'
  when 'Urgente' then 'urgente'
  else 'media'
end;
alter table public.tasks rename column priority to prioridade;
alter table public.tasks alter column prioridade set default 'media';
alter table public.tasks alter column prioridade set not null;
alter table public.tasks add constraint tasks_prioridade_check check (prioridade in ('urgente','importante','media','baixa'));

alter table public.tasks add column ordem integer;
with numbered as (
  select id, row_number() over (partition by bucket_id order by id) - 1 as rn
  from public.tasks
)
update public.tasks t set ordem = n.rn from numbered n where t.id = n.id;
alter table public.tasks alter column ordem set not null;
alter table public.tasks alter column ordem set default 0;

alter table public.tasks add column criado_por uuid references public.profiles(id);
update public.tasks set criado_por = (select id from public.profiles where email = 'ikeguimaraes@gmail.com') where criado_por is null;
alter table public.tasks alter column criado_por set not null;

alter table public.tasks add column criado_em timestamptz not null default now();
alter table public.tasks add column concluida_em timestamptz;
update public.tasks set concluida_em = criado_em where status = 'concluida';
