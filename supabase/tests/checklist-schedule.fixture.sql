create table public.tasks(id uuid primary key, status text default 'nao_iniciada', concluida_em timestamptz);
create table public.task_checklist(id uuid primary key, task_id uuid references public.tasks(id), feito boolean default false, texto text);
