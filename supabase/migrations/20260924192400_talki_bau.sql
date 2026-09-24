-- Personal meeting library. Project linkage does not imply sharing.
create table public.talki_bau_entries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
 titulo text not null check(length(btrim(titulo)) between 1 and 240),
 data_reuniao date not null default current_date,
 participantes text not null default '' check(length(participantes)<=4000),
 notas text not null default '' check(length(notas)<=20000),
 transcricao text not null default '' check(length(transcricao)<=500000),
 plan_id uuid references public.plans(id) on delete set null,
 agenda_event_id uuid references public.talki_agenda_events(id) on delete set null,
 compartilhar_projeto boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 busca tsvector generated always as (to_tsvector('portuguese',titulo||' '||participantes||' '||notas||' '||transcricao)) stored
);
create table public.talki_bau_shares (
 entry_id uuid not null references public.talki_bau_entries(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 primary key(entry_id,user_id)
);
create table public.talki_bau_files (
 id uuid primary key default gen_random_uuid(),
 entry_id uuid not null references public.talki_bau_entries(id) on delete restrict,
 owner_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
 nome text not null check(length(nome) between 1 and 500),
 tipo text not null check(tipo in ('audio','transcricao')),
 mime text not null,
 tamanho bigint not null check(tamanho>0 and tamanho<=1073741824),
 path text not null unique,
 pronto boolean not null default false,
 texto text not null default '' check(length(texto)<=500000),
 created_at timestamptz not null default now(),
 busca tsvector generated always as (to_tsvector('portuguese',texto)) stored,
 check(path=owner_id::text||'/'||entry_id::text||'/'||id::text),
 check(tipo='audio' or tamanho<=20971520)
);
create index bau_entries_owner_date on public.talki_bau_entries(owner_id,data_reuniao desc);
create index bau_entries_plan on public.talki_bau_entries(plan_id) where plan_id is not null;
create index bau_entries_agenda on public.talki_bau_entries(agenda_event_id) where agenda_event_id is not null;
create index bau_entries_search on public.talki_bau_entries using gin(busca);
create index bau_files_entry on public.talki_bau_files(entry_id);
create index bau_files_owner on public.talki_bau_files(owner_id);
create index bau_files_search on public.talki_bau_files using gin(busca);
create index bau_shares_user on public.talki_bau_shares(user_id,entry_id);
alter table public.talki_bau_entries enable row level security;
alter table public.talki_bau_shares enable row level security;
alter table public.talki_bau_files enable row level security;

create function talki_private.bau_owns(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.talki_bau_entries where id=target and owner_id=auth.uid());
$$;
create function talki_private.bau_can_read(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.talki_bau_entries e where e.id=target and (
  e.owner_id=auth.uid() or (e.compartilhar_projeto and e.plan_id is not null and public.is_plan_member(e.plan_id))
  or exists(select 1 from public.talki_bau_shares s where s.entry_id=e.id and s.user_id=auth.uid())));
$$;
revoke all on function talki_private.bau_owns(uuid),talki_private.bau_can_read(uuid) from public,anon;
grant execute on function talki_private.bau_owns(uuid),talki_private.bau_can_read(uuid) to authenticated;

create policy bau_entries_read on public.talki_bau_entries for select to authenticated using(talki_private.bau_can_read(id));
create policy bau_entries_insert on public.talki_bau_entries for insert to authenticated with check(owner_id=(select auth.uid()) and not compartilhar_projeto);
create policy bau_entries_update on public.talki_bau_entries for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy bau_entries_delete on public.talki_bau_entries for delete to authenticated using(owner_id=(select auth.uid()));
create policy bau_shares_read on public.talki_bau_shares for select to authenticated using(user_id=(select auth.uid()) or talki_private.bau_owns(entry_id));
create policy bau_files_read on public.talki_bau_files for select to authenticated using(talki_private.bau_owns(entry_id) or (pronto and talki_private.bau_can_read(entry_id)));
create policy bau_files_insert on public.talki_bau_files for insert to authenticated with check(owner_id=(select auth.uid()) and talki_private.bau_owns(entry_id) and not pronto);
create policy bau_files_update on public.talki_bau_files for update to authenticated using(talki_private.bau_owns(entry_id)) with check(talki_private.bau_owns(entry_id));
create policy bau_files_delete on public.talki_bau_files for delete to authenticated using(talki_private.bau_owns(entry_id));
revoke all on public.talki_bau_entries,public.talki_bau_files,public.talki_bau_shares from public,anon,authenticated;
grant select,delete on public.talki_bau_entries,public.talki_bau_files to authenticated;
grant select on public.talki_bau_shares to authenticated;
grant insert(id,owner_id,titulo,data_reuniao,participantes,notas,transcricao,plan_id,agenda_event_id) on public.talki_bau_entries to authenticated;
grant update(titulo,data_reuniao,participantes,notas,transcricao,plan_id,agenda_event_id) on public.talki_bau_entries to authenticated;
grant insert(id,entry_id,owner_id,nome,tipo,mime,tamanho,path,texto) on public.talki_bau_files to authenticated;
grant update(texto) on public.talki_bau_files to authenticated;
grant all on public.talki_bau_entries,public.talki_bau_files,public.talki_bau_shares to service_role;

create function talki_private.bau_validate_links() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' or new.plan_id is distinct from old.plan_id then
  if new.plan_id is not null and not public.is_plan_member(new.plan_id) then raise exception 'Sem acesso ao projeto.' using errcode='42501';end if;
  if tg_op='UPDATE' then new.compartilhar_projeto:=false;end if;
 end if;
 if tg_op='INSERT' or new.agenda_event_id is distinct from old.agenda_event_id then
  if new.agenda_event_id is not null and not exists(select 1 from public.talki_agenda_events where id=new.agenda_event_id) then raise exception 'Compromisso indisponível.' using errcode='42501';end if;
 end if;
 new.updated_at:=now();return new;
end; $$;
create trigger bau_validate_links before insert or update on public.talki_bau_entries for each row execute function talki_private.bau_validate_links();
revoke all on function talki_private.bau_validate_links() from public,anon,authenticated;

create function talki_private.bau_set_sharing(target uuid,project_shared boolean,people uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare e public.talki_bau_entries;
begin
 select * into e from public.talki_bau_entries where id=target and owner_id=auth.uid() for update;
 if e.id is null then raise exception 'Registro não encontrado.' using errcode='42501';end if;
 if project_shared and (e.plan_id is null or not public.is_plan_member(e.plan_id)) then raise exception 'Selecione um projeto ao qual você tenha acesso.' using errcode='42501';end if;
 if cardinality(people)>100 then raise exception 'Selecione até 100 pessoas.';end if;
 update public.talki_bau_entries set compartilhar_projeto=coalesce(project_shared,false) where id=target;
 delete from public.talki_bau_shares where entry_id=target;
 insert into public.talki_bau_shares(entry_id,user_id) select target,id from unnest(people) id where id<>auth.uid() on conflict do nothing;
end; $$;
create function public.talki_bau_set_sharing(target uuid,project_shared boolean,people uuid[]) returns void language sql security invoker set search_path='' as $$select talki_private.bau_set_sharing(target,project_shared,people);$$;

-- A private bucket and metadata-bound paths prevent arbitrary cross-user uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('talki-bau','talki-bau',false,1073741824,
 array['audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm','audio/flac','audio/aac','video/mp4','text/plain','text/markdown','text/vtt','application/x-subrip','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
create policy bau_storage_read on storage.objects for select to authenticated using(bucket_id='talki-bau' and exists(select 1 from public.talki_bau_files f where f.path=name and (talki_private.bau_owns(f.entry_id) or (f.pronto and talki_private.bau_can_read(f.entry_id)))));
create policy bau_storage_insert on storage.objects for insert to authenticated with check(bucket_id='talki-bau' and exists(select 1 from public.talki_bau_files f where f.path=name and f.owner_id=(select auth.uid()) and not f.pronto and talki_private.bau_owns(f.entry_id)));
create policy bau_storage_delete on storage.objects for delete to authenticated using(bucket_id='talki-bau' and exists(select 1 from public.talki_bau_files f where f.path=name and talki_private.bau_owns(f.entry_id)));

create function talki_private.bau_finish_upload(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare f public.talki_bau_files;
begin
 select * into f from public.talki_bau_files where id=target and owner_id=auth.uid() for update;
 if f.id is null or not talki_private.bau_owns(f.entry_id) then raise exception 'Arquivo não encontrado.' using errcode='42501';end if;
 if not exists(select 1 from storage.objects where bucket_id='talki-bau' and name=f.path and (metadata->>'size')::bigint=f.tamanho) then raise exception 'O envio ainda não foi concluído. Retome o upload.';end if;
 update public.talki_bau_files set pronto=true where id=target;
end; $$;
create function public.talki_bau_finish_upload(target uuid) returns void language sql security invoker set search_path='' as $$select talki_private.bau_finish_upload(target);$$;
create function talki_private.bau_file_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from storage.objects where bucket_id='talki-bau' and name=old.path) then raise exception 'Remova o arquivo do armazenamento antes de excluir o registro.';end if;
 return old;
end; $$;
create trigger bau_file_delete_guard before delete on public.talki_bau_files for each row execute function talki_private.bau_file_delete_guard();
revoke all on function talki_private.bau_file_delete_guard() from public,anon,authenticated;
revoke all on function talki_private.bau_set_sharing(uuid,boolean,uuid[]),public.talki_bau_set_sharing(uuid,boolean,uuid[]),talki_private.bau_finish_upload(uuid),public.talki_bau_finish_upload(uuid) from public,anon;
grant execute on function talki_private.bau_set_sharing(uuid,boolean,uuid[]),public.talki_bau_set_sharing(uuid,boolean,uuid[]),talki_private.bau_finish_upload(uuid),public.talki_bau_finish_upload(uuid) to authenticated;

create function public.talki_bau_search(search_text text default '',project_filter uuid default null,from_day date default null,to_day date default null,scope text default 'all',page_offset int default 0)
returns table(id uuid,owner_id uuid,titulo text,data_reuniao date,participantes text,plan_id uuid,compartilhar_projeto boolean,created_at timestamptz,audios bigint,transcricoes bigint)
language sql stable security invoker set search_path='' as $$
 select e.id,e.owner_id,e.titulo,e.data_reuniao,e.participantes,e.plan_id,e.compartilhar_projeto,e.created_at,
 (select count(*) from public.talki_bau_files f where f.entry_id=e.id and f.pronto and f.tipo='audio'),
 (select count(*) from public.talki_bau_files f where f.entry_id=e.id and f.pronto and f.tipo='transcricao')+case when e.transcricao<>'' then 1 else 0 end
 from public.talki_bau_entries e
 where (project_filter is null or e.plan_id=project_filter) and (from_day is null or e.data_reuniao>=from_day) and (to_day is null or e.data_reuniao<=to_day)
 and (scope='all' or (scope='mine' and e.owner_id=auth.uid()) or (scope='shared' and e.owner_id<>auth.uid()))
 and (btrim(search_text)='' or e.titulo ilike '%'||search_text||'%' or e.busca @@ websearch_to_tsquery('portuguese',search_text)
 or exists(select 1 from public.talki_bau_files f where f.entry_id=e.id and f.pronto and f.busca @@ websearch_to_tsquery('portuguese',search_text)))
 order by e.data_reuniao desc,e.created_at desc,e.id limit 31 offset greatest(0,page_offset);
$$;
revoke all on function public.talki_bau_search(text,uuid,date,date,text,int) from public,anon;
grant execute on function public.talki_bau_search(text,uuid,date,date,text,int) to authenticated;
