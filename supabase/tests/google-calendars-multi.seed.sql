insert into profiles values('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
insert into talki_google_connections(owner_id,calendar_id,label,refresh_token,granted_scopes)
values('11111111-1111-1111-1111-111111111111','first@example.test','Original','encrypted',array['https://www.googleapis.com/auth/tasks.readonly']);
select talki_google_apply('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','legacy-event',null,
 '{"titulo":"Preservar convite","descricao":"","inicio":"2026-11-10T12:00:00Z","fim":"2026-11-10T13:00:00Z","dia_inteiro":false,"local":"","link":""}',true);
select talki_google_task_apply('11111111-1111-1111-1111-111111111111','legacy-list','legacy-task',
 '{"title":"Preservar tarefa","status":"needsAction","due":"2026-11-10T00:00:00Z","updated":"2026-11-10T00:00:00Z"}');
