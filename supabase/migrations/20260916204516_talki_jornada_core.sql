-- Jornada: additive namespace, isolated from other applications in this project.
set local lock_timeout = '5s';
create schema if not exists talki_private;
revoke all on schema talki_private from public, anon;
grant usage on schema talki_private to authenticated, service_role;

create table public.talki_areas (
 id uuid primary key default gen_random_uuid(), nome text not null check(length(btrim(nome)) between 1 and 120),
 ativo boolean not null default true, created_at timestamptz not null default now()
);
create table public.talki_categorias_atividade (
 id uuid primary key default gen_random_uuid(), nome text not null check(length(btrim(nome)) between 1 and 120),
 cor text not null default '#6B7280' check(cor ~ '^#[0-9A-Fa-f]{6}$')
);
create table public.talki_colaboradores (
 user_id uuid primary key references public.profiles(id) on delete restrict,
 sobrenome text, data_nascimento date, descricao_cargo text,
 area_id uuid references public.talki_areas(id) on delete restrict,
 horas_dia_contratadas numeric not null default 8 check(horas_dia_contratadas>0 and horas_dia_contratadas<=24),
 ativo boolean not null default true, papel text not null default 'participante' check(papel in ('participante','gestor')),
 moedas integer not null default 0 check(moedas>=0), created_at timestamptz not null default now()
);
create table public.talki_plan_settings (
 plan_id uuid primary key references public.plans(id) on delete restrict,
 area_id uuid references public.talki_areas(id) on delete restrict, ativo boolean not null default true
);
create table public.talki_registros (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.talki_colaboradores(user_id) on delete restrict,
 area_id uuid references public.talki_areas(id) on delete restrict,
 categoria_id uuid not null references public.talki_categorias_atividade(id) on delete restrict,
 plan_id uuid references public.plans(id) on delete set null,
 task_id uuid references public.tasks(id) on delete set null,
 projeto_nome text, tarefa_titulo text,
 descricao text not null check(length(btrim(descricao)) between 1 and 4000), participantes text,
 inicio timestamptz not null, fim timestamptz, entrega_concluida boolean,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(fim is null or fim>=inicio)
);
create unique index talki_registro_aberto on public.talki_registros(user_id) where fim is null;
create index talki_registros_user_inicio on public.talki_registros(user_id,inicio);
create index talki_registros_plan_inicio on public.talki_registros(plan_id,inicio);
create index talki_registros_task_inicio on public.talki_registros(task_id,inicio);
create table public.talki_pontuacao_diaria (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.talki_colaboradores(user_id) on delete restrict,
 data date not null, percentual integer not null, bateu_meta boolean not null, moedas_delta integer not null,
 regra text not null default 'pareto-v1', created_at timestamptz not null default now(), unique(user_id,data)
);
create table talki_private.jornada_audit (
 id bigint generated always as identity primary key, at timestamptz not null default now(),
 actor uuid, entity text not null, entity_id uuid, operation text not null, before_row jsonb, after_row jsonb
);
create table talki_private.migration_map (
 source_project text not null, entity text not null, source_id uuid not null, target_id uuid not null,
 imported_at timestamptz not null default now(), primary key(source_project,entity,source_id)
);
revoke all on all tables in schema talki_private from public, anon, authenticated;
grant all on all tables in schema talki_private to service_role;
grant usage, select on all sequences in schema talki_private to service_role;

create function talki_private.jornada_manager() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_admin() or exists(select 1 from public.talki_colaboradores where user_id=auth.uid() and ativo and papel='gestor'));
$$;
create function talki_private.jornada_active() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.talki_colaboradores where user_id=auth.uid() and ativo);
$$;

alter table public.talki_areas enable row level security;
alter table public.talki_categorias_atividade enable row level security;
alter table public.talki_colaboradores enable row level security;
alter table public.talki_plan_settings enable row level security;
alter table public.talki_registros enable row level security;
alter table public.talki_pontuacao_diaria enable row level security;
create policy read_areas on public.talki_areas for select to authenticated using(talki_private.jornada_active() or talki_private.jornada_manager());
create policy read_categorias on public.talki_categorias_atividade for select to authenticated using(talki_private.jornada_active() or talki_private.jornada_manager());
create policy read_colaboradores on public.talki_colaboradores for select to authenticated using(user_id=auth.uid() or talki_private.jornada_manager());
create policy read_settings on public.talki_plan_settings for select to authenticated using(public.is_plan_member(plan_id));
create policy read_registros on public.talki_registros for select to authenticated using((user_id=auth.uid() and talki_private.jornada_active()) or talki_private.jornada_manager());
create policy read_pontuacao on public.talki_pontuacao_diaria for select to authenticated using((user_id=auth.uid() and talki_private.jornada_active()) or talki_private.jornada_manager());
revoke all on public.talki_areas,public.talki_categorias_atividade,public.talki_colaboradores,public.talki_plan_settings,public.talki_registros,public.talki_pontuacao_diaria from public,anon,authenticated;
grant select on public.talki_areas,public.talki_categorias_atividade,public.talki_colaboradores,public.talki_plan_settings,public.talki_registros,public.talki_pontuacao_diaria to authenticated;
grant all on public.talki_areas,public.talki_categorias_atividade,public.talki_colaboradores,public.talki_plan_settings,public.talki_registros,public.talki_pontuacao_diaria to service_role;

create function talki_private.jornada_ensure() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='42501'; end if;
 insert into public.profiles(id,nome,email)
 select id,coalesce(raw_user_meta_data->>'name',split_part(email,'@',1)),email from auth.users where id=auth.uid()
 on conflict(id) do nothing;
 insert into public.talki_colaboradores(user_id,papel) values(auth.uid(),case when public.is_admin() then 'gestor' else 'participante' end) on conflict do nothing;
end; $$;
create function public.talki_jornada_ensure() returns void language sql security invoker set search_path='' as $$select talki_private.jornada_ensure();$$;
create function public.talki_jornada_manager() returns boolean language sql stable security invoker set search_path='' as $$select talki_private.jornada_manager();$$;

create function talki_private.jornada_save(p_action text,p_data jsonb) returns public.talki_registros language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); r public.talki_registros; old_r public.talki_registros; active_r public.talki_registros;
 t public.tasks; p public.plans; start_at timestamptz; stop_at timestamptz; category uuid;
begin
 if not talki_private.jornada_active() then raise exception 'Jornada indisponível para esta conta.' using errcode='42501'; end if;
 perform 1 from public.talki_colaboradores where user_id=u for update;
 if p_action in ('finish','end') then
  select * into r from public.talki_registros where user_id=u and fim is null for update;
  if r.id is not null then
   old_r:=r;
   update public.talki_registros set fim=greatest(now(),inicio),updated_at=now() where id=r.id returning * into r;
   insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row) values(u,'registro',r.id,'finish',to_jsonb(old_r),to_jsonb(r));
  end if;
  if p_action='end' then
   select id into category from public.talki_categorias_atividade order by (nome ilike '%pausa%') desc,nome limit 1;
   if category is null then raise exception 'Cadastre uma categoria.'; end if;
   if not exists(select 1 from public.talki_registros where user_id=u and descricao='Fim do expediente' and inicio=fim and (inicio at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date) then
    insert into public.talki_registros(user_id,categoria_id,descricao,inicio,fim) values(u,category,'Fim do expediente',now(),now()) returning * into r;
    insert into talki_private.jornada_audit(actor,entity,entity_id,operation,after_row) values(u,'registro',r.id,'end',to_jsonb(r));
   end if;
  end if;
  return r;
 end if;
 if p_action not in ('start','edit') then raise exception 'Ação inválida.'; end if;
 if p_action='edit' then
  select * into old_r from public.talki_registros where id=(p_data->>'id')::uuid and user_id=u for update;
  if old_r.id is null then raise exception 'Registro não encontrado.' using errcode='42501'; end if;
  if exists(select 1 from public.talki_pontuacao_diaria where user_id=u and data=(old_r.inicio at time zone 'America/Sao_Paulo')::date) then raise exception 'Este dia já foi avaliado. Solicite uma correção à gestão.'; end if;
 end if;
 start_at:=coalesce(nullif(p_data->>'inicio','')::timestamptz,now());
 stop_at:=nullif(p_data->>'fim','')::timestamptz;
 if start_at>now()+interval '1 minute' or stop_at>now()+interval '1 minute' or stop_at<start_at then raise exception 'Confira o início e o fim da atividade.'; end if;
 if exists(select 1 from public.talki_pontuacao_diaria where user_id=u and data=(start_at at time zone 'America/Sao_Paulo')::date) then raise exception 'Este dia já foi avaliado.'; end if;
 if length(btrim(coalesce(p_data->>'descricao','')))=0 then raise exception 'Informe a descrição.'; end if;
 if nullif(p_data->>'task_id','') is not null then
  select * into t from public.tasks where id=(p_data->>'task_id')::uuid;
  if t.id is null or not public.is_plan_member(t.plan_id) then raise exception 'Sem acesso à tarefa.' using errcode='42501'; end if;
  if nullif(p_data->>'plan_id','') is not null and t.plan_id<>(p_data->>'plan_id')::uuid then raise exception 'Tarefa e projeto incompatíveis.'; end if;
 end if;
 if coalesce(t.plan_id,nullif(p_data->>'plan_id','')::uuid) is not null then
  select * into p from public.plans where id=coalesce(t.plan_id,nullif(p_data->>'plan_id','')::uuid);
  if p.id is null or not public.is_plan_member(p.id) then raise exception 'Sem acesso ao projeto.' using errcode='42501'; end if;
  if exists(select 1 from public.talki_plan_settings where plan_id=p.id and not ativo) then raise exception 'Projeto arquivado.'; end if;
 end if;
 if p_action='start' then
  select * into active_r from public.talki_registros where user_id=u and fim is null for update;
  if active_r.id is not null then
   if start_at<active_r.inicio then raise exception 'A nova atividade começa antes da atividade aberta.'; end if;
   update public.talki_registros set fim=start_at,updated_at=now() where id=active_r.id returning * into r;
   insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row) values(u,'registro',r.id,'switch',to_jsonb(active_r),to_jsonb(r));
  end if;
 end if;
 if exists(select 1 from public.talki_registros x where x.user_id=u and x.id is distinct from old_r.id
   and x.inicio<coalesce(stop_at,'infinity'::timestamptz) and coalesce(x.fim,'infinity'::timestamptz)>start_at
   and (x.fim is null or x.fim>x.inicio)) then raise exception 'O horário se sobrepõe a outra atividade.'; end if;
 if p_action='start' then
  insert into public.talki_registros(user_id,categoria_id,area_id,plan_id,task_id,projeto_nome,tarefa_titulo,descricao,participantes,inicio,fim)
  values(u,(p_data->>'categoria_id')::uuid,nullif(p_data->>'area_id','')::uuid,p.id,t.id,p.nome,t.titulo,btrim(p_data->>'descricao'),nullif(p_data->>'participantes',''),start_at,stop_at) returning * into r;
 else
  update public.talki_registros set categoria_id=(p_data->>'categoria_id')::uuid,area_id=nullif(p_data->>'area_id','')::uuid,
   plan_id=p.id,task_id=t.id,projeto_nome=p.nome,tarefa_titulo=t.titulo,descricao=btrim(p_data->>'descricao'),participantes=nullif(p_data->>'participantes',''),inicio=start_at,fim=stop_at,updated_at=now()
  where id=old_r.id returning * into r;
 end if;
 insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row) values(u,'registro',r.id,p_action,case when old_r.id is not null then to_jsonb(old_r) end,to_jsonb(r));
 return r;
end; $$;
create function public.talki_jornada_save(p_action text,p_data jsonb default '{}') returns public.talki_registros language sql security invoker set search_path='' as $$select talki_private.jornada_save(p_action,p_data);$$;

create function talki_private.jornada_score() returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); contracted numeric; dayrow record; pct int; delta int; added uuid;
begin
 if not talki_private.jornada_active() then raise exception 'Sem acesso.' using errcode='42501'; end if;
 select horas_dia_contratadas into contracted from public.talki_colaboradores where user_id=u for update;
 for dayrow in
  select (r.inicio at time zone 'America/Sao_Paulo')::date dia,
    sum(extract(epoch from(coalesce(r.fim,r.inicio)-r.inicio))/3600) horas
  from public.talki_registros r where r.user_id=u
    and (r.inicio at time zone 'America/Sao_Paulo')::date<(now() at time zone 'America/Sao_Paulo')::date
    and not exists(select 1 from public.talki_registros a where a.user_id=u and a.fim is null and (a.inicio at time zone 'America/Sao_Paulo')::date=(r.inicio at time zone 'America/Sao_Paulo')::date)
    and not exists(select 1 from public.talki_pontuacao_diaria s where s.user_id=u and s.data=(r.inicio at time zone 'America/Sao_Paulo')::date)
  group by 1 order by 1
 loop
  pct:=least(100,round(100*dayrow.horas/contracted))::int;
  delta:=case when pct>=100 then 5 when pct>=90 then 3 when pct>=80 then 2 when pct>=70 then 1 when pct>=60 then -1 when pct>=50 then -2 else -5 end;
  added:=null;
  insert into public.talki_pontuacao_diaria(user_id,data,percentual,bateu_meta,moedas_delta,regra)
  values(u,dayrow.dia,pct,pct>=70,delta,'talki-v1') on conflict(user_id,data) do nothing returning id into added;
  if added is not null then
   update public.talki_colaboradores set moedas=greatest(0,moedas+delta) where user_id=u;
   insert into talki_private.jornada_audit(actor,entity,entity_id,operation,after_row) values(u,'pontuacao',added,'score',jsonb_build_object('delta',delta,'data',dayrow.dia));
  end if;
 end loop;
end; $$;
create function public.talki_jornada_score() returns void language sql security invoker set search_path='' as $$select talki_private.jornada_score();$$;

create function talki_private.jornada_profile(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if not talki_private.jornada_active() then raise exception 'Sem acesso.' using errcode='42501'; end if;
 if length(btrim(coalesce(p_data->>'nome','')))=0 then raise exception 'Informe seu nome.'; end if;
 update public.profiles set nome=btrim(p_data->>'nome'),cargo=nullif(p_data->>'cargo','') where id=u;
 update public.talki_colaboradores set sobrenome=nullif(p_data->>'sobrenome',''),data_nascimento=nullif(p_data->>'data_nascimento','')::date,descricao_cargo=nullif(p_data->>'descricao_cargo','') where user_id=u;
end; $$;
create function public.talki_jornada_profile(p_data jsonb) returns void language sql security invoker set search_path='' as $$select talki_private.jornada_profile(p_data);$$;

create function talki_private.jornada_admin(p_entity text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid:=nullif(p_data->>'id','')::uuid; before_data jsonb; after_data jsonb;
begin
 if not talki_private.jornada_manager() then raise exception 'Acesso restrito à gestão.' using errcode='42501'; end if;
 if p_entity='area' then
  if target is null then insert into public.talki_areas(nome) values(btrim(p_data->>'nome')) returning id into target;
  else select to_jsonb(a) into before_data from public.talki_areas a where id=target; update public.talki_areas set nome=btrim(p_data->>'nome'),ativo=coalesce((p_data->>'ativo')::boolean,true) where id=target; end if;
  select to_jsonb(a) into after_data from public.talki_areas a where id=target;
 elsif p_entity='categoria' then
  if target is null then insert into public.talki_categorias_atividade(nome,cor) values(btrim(p_data->>'nome'),p_data->>'cor') returning id into target;
  else select to_jsonb(a) into before_data from public.talki_categorias_atividade a where id=target; update public.talki_categorias_atividade set nome=btrim(p_data->>'nome'),cor=p_data->>'cor' where id=target; end if;
  select to_jsonb(a) into after_data from public.talki_categorias_atividade a where id=target;
 elsif p_entity='pessoa' then
  if target is null or not exists(select 1 from public.profiles where id=target) then raise exception 'Pessoa não encontrada.'; end if;
  select to_jsonb(c) into before_data from public.talki_colaboradores c where user_id=target;
  if target=auth.uid() and (p_data->>'ativo')::boolean=false then raise exception 'Você não pode desativar o próprio acesso.'; end if;
  insert into public.talki_colaboradores(user_id,area_id,horas_dia_contratadas,ativo,papel)
  values(target,nullif(p_data->>'area_id','')::uuid,(p_data->>'horas_dia_contratadas')::numeric,coalesce((p_data->>'ativo')::boolean,true),coalesce(p_data->>'papel','participante'))
  on conflict(user_id) do update set area_id=excluded.area_id,horas_dia_contratadas=excluded.horas_dia_contratadas,ativo=excluded.ativo,papel=excluded.papel;
  select to_jsonb(c) into after_data from public.talki_colaboradores c where user_id=target;
 elsif p_entity='projeto' then
  if not public.is_plan_owner(target) then raise exception 'Apenas o dono pode configurar este projeto.' using errcode='42501'; end if;
  select to_jsonb(s) into before_data from public.talki_plan_settings s where plan_id=target;
  insert into public.talki_plan_settings(plan_id,area_id,ativo) values(target,nullif(p_data->>'area_id','')::uuid,coalesce((p_data->>'ativo')::boolean,true))
  on conflict(plan_id) do update set area_id=excluded.area_id,ativo=excluded.ativo;
  select to_jsonb(s) into after_data from public.talki_plan_settings s where plan_id=target;
 else raise exception 'Cadastro inválido.'; end if;
 if after_data is null then raise exception 'Registro não encontrado.'; end if;
 insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row) values(auth.uid(),p_entity,target,'admin',before_data,after_data);
 return target;
end; $$;
create function public.talki_jornada_admin(p_entity text,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$select talki_private.jornada_admin(p_entity,p_data);$$;

revoke all on all functions in schema talki_private from public,anon;
grant execute on all functions in schema talki_private to authenticated;
revoke all on function public.talki_jornada_ensure(),public.talki_jornada_manager(),public.talki_jornada_save(text,jsonb),public.talki_jornada_score(),public.talki_jornada_profile(jsonb),public.talki_jornada_admin(text,jsonb) from public,anon;
grant execute on function public.talki_jornada_ensure(),public.talki_jornada_manager(),public.talki_jornada_save(text,jsonb),public.talki_jornada_score(),public.talki_jornada_profile(jsonb),public.talki_jornada_admin(text,jsonb) to authenticated;
