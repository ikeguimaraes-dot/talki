-- Novas tabelas do módulo de tarefas + migração do label inline antigo.

create table public.task_checklist (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem integer not null default 0
);

create table public.task_labels (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  nome text not null,
  cor text not null default '#A8632F'
);

create table public.task_label_links (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.task_labels(id) on delete cascade,
  primary key (task_id, label_id)
);

-- migra o label inline (tasks.label_text/label_color) pro modelo novo
insert into public.task_labels (plan_id, nome, cor)
select distinct plan_id, label_text, coalesce(label_color, '#A8632F')
from public.tasks
where label_text is not null;

insert into public.task_label_links (task_id, label_id)
select t.id, tl.id
from public.tasks t
join public.task_labels tl
  on tl.plan_id = t.plan_id and tl.nome = t.label_text
where t.label_text is not null;

alter table public.tasks drop column label_text;
alter table public.tasks drop column label_color;

-- task_comments (renomeada de comments) ----------------------------------
alter table public.comments drop constraint if exists comments_member_id_fkey;
delete from public.comments where member_id not in (select id from public.profiles);
alter table public.comments rename column member_id to user_id;
alter table public.comments rename column content to texto;
alter table public.comments rename column created_at to criado_em;
alter table public.comments rename to task_comments;
alter table public.task_comments
  add constraint task_comments_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
