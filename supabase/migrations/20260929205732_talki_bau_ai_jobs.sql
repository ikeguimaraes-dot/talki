-- Durable, private transcription jobs. One job per original recording.
create table public.talki_bau_ai_jobs (
 file_id uuid primary key references public.talki_bau_files(id) on delete cascade,
 entry_id uuid not null references public.talki_bau_entries(id) on delete cascade,
 owner_id uuid not null references public.profiles(id),
 status text not null default 'queued' check(status in ('queued','transcribing','summarizing','completed','error')),
 cursor_seconds double precision not null default 0 check(cursor_seconds>=0),
 audio_complete boolean not null default false,
 transcript text not null default '' check(length(transcript)<=500000),
 summary jsonb,
 error text,
 attempts integer not null default 0,
 lease_token uuid,
 lease_until timestamptz,
 next_attempt_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.talki_bau_ai_jobs enable row level security;
create policy bau_ai_read on public.talki_bau_ai_jobs for select to authenticated
 using(talki_private.bau_can_read(entry_id));
revoke all on public.talki_bau_ai_jobs from public,anon,authenticated;
grant select(file_id,entry_id,owner_id,status,cursor_seconds,audio_complete,transcript,summary,error,created_at,updated_at) on public.talki_bau_ai_jobs to authenticated;
grant all on public.talki_bau_ai_jobs to service_role;
create index bau_ai_pending on public.talki_bau_ai_jobs(next_attempt_at,created_at) where status not in ('completed','error');

create function talki_private.bau_enqueue_audio(target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f public.talki_bau_files;
begin
 select * into f from public.talki_bau_files where id=target for update;
 if f.id is null or f.owner_id is distinct from auth.uid() or not talki_private.bau_owns(f.entry_id) then
  raise exception 'Áudio indisponível.' using errcode='42501';
 end if;
 if f.tipo<>'audio' or not f.pronto then raise exception 'Conclua o envio de um áudio primeiro.';end if;
 insert into public.talki_bau_ai_jobs(file_id,entry_id,owner_id) values(f.id,f.entry_id,f.owner_id)
 on conflict(file_id) do update set status=case when talki_bau_ai_jobs.audio_complete then 'summarizing' else 'queued' end,
  error=null,attempts=0,lease_token=null,lease_until=null,next_attempt_at=now(),updated_at=now()
 where talki_bau_ai_jobs.status='error';
end;$$;
create function public.talki_bau_enqueue_audio(target uuid) returns void
language sql security invoker set search_path='' as $$ select talki_private.bau_enqueue_audio(target); $$;
revoke all on function talki_private.bau_enqueue_audio(uuid),public.talki_bau_enqueue_audio(uuid) from public,anon;
grant execute on function talki_private.bau_enqueue_audio(uuid),public.talki_bau_enqueue_audio(uuid) to authenticated;

create function talki_private.bau_auto_enqueue_audio() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.pronto and not old.pronto and new.tipo='audio' then
  insert into public.talki_bau_ai_jobs(file_id,entry_id,owner_id) values(new.id,new.entry_id,new.owner_id) on conflict do nothing;
 end if;
 return new;
end;$$;
revoke all on function talki_private.bau_auto_enqueue_audio() from public,anon,authenticated;
create trigger bau_auto_enqueue_audio after update of pronto on public.talki_bau_files
 for each row execute function talki_private.bau_auto_enqueue_audio();

-- Only trusted workers can claim work. A lease prevents duplicate concurrent work;
-- a crashed invocation becomes retryable after expiry, with bounded attempts.
create function public.talki_bau_claim_audio(target uuid default null)
returns setof public.talki_bau_ai_jobs language plpgsql security invoker set search_path='' as $$
begin
 update public.talki_bau_ai_jobs set status='error',error='O processamento foi interrompido. Tente novamente.',lease_token=null,lease_until=null,updated_at=now()
 where status not in ('completed','error') and attempts>=3 and (lease_until is null or lease_until<now());
 return query
 with candidate as (
  select file_id from public.talki_bau_ai_jobs
  where status not in ('completed','error') and next_attempt_at<=now()
   and (lease_until is null or lease_until<now()) and (target is null or file_id=target)
  order by next_attempt_at,created_at for update skip locked limit 1
 ) update public.talki_bau_ai_jobs j set
  status=case when audio_complete then 'summarizing' else 'transcribing' end,
  attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now()
 from candidate c where j.file_id=c.file_id returning j.*;
end;$$;
revoke all on function public.talki_bau_claim_audio(uuid) from public,anon,authenticated;
grant execute on function public.talki_bau_claim_audio(uuid) to service_role;

-- Reuse the existing search index, without overwriting pasted transcripts.
create function talki_private.bau_index_audio_transcript() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.transcript is distinct from old.transcript then
  update public.talki_bau_files set texto=new.transcript where id=new.file_id;
 end if;
 return new;
end;$$;
revoke all on function talki_private.bau_index_audio_transcript() from public,anon,authenticated;
create trigger bau_index_audio_transcript after update of transcript on public.talki_bau_ai_jobs
 for each row execute function talki_private.bau_index_audio_transcript();
