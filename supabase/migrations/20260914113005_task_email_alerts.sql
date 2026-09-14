-- Alertas por e-mail de atribuição e prazo de vencimento.
--
-- prazo é `date` (sem hora) — não existe instante exato de vencimento no
-- schema atual. Por decisão explícita do usuário, o prazo vence às 23:59
-- America/Sao_Paulo do dia marcado, e é a partir desse instante que as
-- janelas de 12h/1h são contadas. Não muda o schema de datas além disso.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- tasks: rastreio de alerta de prazo -----------------------------------
alter table public.tasks
  add column alerta_12h_enviado boolean not null default false,
  add column alerta_1h_enviado boolean not null default false;

-- Editar o prazo pra uma data futura reseta os dois alertas — o alerta
-- antigo não vale mais pro novo prazo. Editar pra uma data passada, ou
-- limpar o prazo, não reseta nada: a query de checagem já exige
-- prazo not null e o instante computado dentro da janela futura, então
-- nunca dispara de qualquer forma nesses casos.
create or replace function public.reset_task_alert_flags()
returns trigger
language plpgsql
as $$
begin
  if new.prazo is distinct from old.prazo
     and new.prazo is not null
     and (new.prazo::text || ' 23:59:00')::timestamp at time zone 'America/Sao_Paulo' > now()
  then
    new.alerta_12h_enviado := false;
    new.alerta_1h_enviado := false;
  end if;
  return new;
end;
$$;

create trigger tasks_reset_alert_flags
  before update on public.tasks
  for each row
  execute function public.reset_task_alert_flags();

-- vault: URL do projeto + segredo compartilhado -------------------------
-- Não há como esta migration obter a service_role key (nenhuma ferramenta
-- expõe esse valor, por bom motivo) nem setar Edge Function secrets
-- diretamente (isso é um recurso da plataforma Supabase, fora do alcance
-- de SQL). Por isso: gera um segredo próprio, só pra autenticar essas
-- duas chamadas específicas (menor privilégio que usar a service_role
-- key) — o mesmo valor precisa ser configurado como o secret
-- CRON_WEBHOOK_SECRET das Edge Functions (passo manual, documentado à
-- parte).
select vault.create_secret(
  'https://iqgrvptrtphvbmvrqntm.supabase.co',
  'talki_project_url',
  'URL do projeto Talki, usada por triggers/cron pra chamar edge functions'
);

select vault.create_secret(
  '3f3a3a35d162e00f7b64b9adf5005c6152a348317c9f5376eb1231a7991df19b',
  'talki_cron_webhook_secret',
  'Segredo compartilhado que autentica chamadas de trigger/cron às edge functions de e-mail do Talki — precisa ser igual ao secret CRON_WEBHOOK_SECRET configurado nas Edge Functions'
);

-- task_assignees: notifica responsável recém-atribuído -------------------
-- AFTER INSERT (não UPDATE/DELETE): só dispara pra linhas genuinamente
-- novas, então só notifica quem acabou de ser atribuído — assumindo que
-- quem insere não faz delete+reinsert de gente que já era responsável
-- (setTaskAssignees no app foi corrigido pra só inserir o que é novo).
create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'talki_project_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'talki_cron_webhook_secret';

  if v_url is null or v_secret is null then
    raise warning 'notify_task_assignment: talki_project_url/talki_cron_webhook_secret ausente no vault';
    return new;
  end if;

  perform net.http_post(
    url := v_url || '/functions/v1/send-assignment-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('task_id', new.task_id, 'user_id', new.user_id, 'assigned_by', auth.uid())
  );
  return new;
exception when others then
  -- pg_net já é assíncrono (não bloqueia o insert), isso aqui é só uma
  -- segunda camada: mesmo se o lookup do vault ou o enqueue falhar de
  -- forma síncrona, o insert principal em task_assignees não quebra.
  raise warning 'notify_task_assignment failed: %', sqlerrm;
  return new;
end;
$$;

create trigger task_assignees_notify_insert
  after insert on public.task_assignees
  for each row
  execute function public.notify_task_assignment();

-- cron: checagem de prazos a cada 15 minutos -----------------------------
select cron.schedule(
  'talki-check-deadline-alerts',
  '*/15 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'talki_project_url') || '/functions/v1/check-deadline-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'talki_cron_webhook_secret')
    ),
    body := jsonb_build_object('time', now())
  ) as request_id;
  $cron$
);
