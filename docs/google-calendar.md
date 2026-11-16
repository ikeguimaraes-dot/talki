# Google Agenda no Talki

## Ativação pelo administrador

1. Abra [Google Cloud Console](https://console.cloud.google.com/), selecione/crie o projeto Talki e habilite **Google Calendar API** e **Google Tasks API**.
2. Em **Google Auth Platform**, configure Branding, Audience e Data Access. Cadastre o domínio `freneze.com.br`, os dados de suporte e as páginas reais de privacidade/termos. Em testes, adicione os e-mails autorizados como usuários de teste. Para uso público, siga a verificação OAuth exigida pelo Google para os escopos escolhidos.
3. Crie em **Clients** um cliente OAuth do tipo **Web application**. Cadastre exatamente este URI de redirecionamento:

   ```text
   https://talki.freneze.com.br/api/google-calendar?action=callback
   ```

4. Inclua em `.env.local` (sem compartilhar no chat ou commitar):

   ```dotenv
   GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=seu-client-secret
   ```

5. Execute `node scripts/configure-google-calendar.mjs`. Ele gera, se ausente, a chave AES-256-GCM `GOOGLE_CALENDAR_ENCRYPTION_KEY` e envia as três variáveis ao ambiente Production da Vercel sem imprimir valores. Preserve a chave de criptografia: trocá-la inutiliza as autorizações já armazenadas. Para manutenção em outra máquina, recupere a mesma chave pelo canal seguro de administração antes de executar o script.
6. Execute `vercel deploy --prod --yes`. As migrações `talki_google_calendar` e `talki_google_calendar_indexes` devem estar aplicadas. O projeto já utiliza `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL` e `CRON_SECRET` no servidor.
7. Em `https://talki.freneze.com.br/agenda`, clique **Conectar Google**, confira o escopo da sincronização e autorize a sua conta. Cada usuário faz sua própria conexão.

Escopos solicitados:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/tasks.readonly`

Não é necessário ativar login Google no Supabase. Essa autorização conecta o calendário ao usuário Talki já autenticado.

## Comportamento

- Várias contas Google por pessoa, com agendas principais, secundárias e compartilhadas selecionadas. Reconectar a mesma conta preserva os vínculos.
- Todos os compromissos pessoais do Talki são enviados. Compromissos vinculados a projetos e tarefas do Kanban não são exportados.
- Google → Talki importa uma janela móvel de 90 dias anteriores e 365 dias futuros. Eventos importados permanecem pessoais. Eventos já vinculados continuam sendo acompanhados, inclusive fora dessa janela.
- Tarefas nativas do Google (as tarefas verdes criadas no Google Agenda) são importadas de todas as listas para o projeto pessoal **Agenda** e entram em **Fila**. Mudanças de título, notas, data, conclusão e exclusão feitas no Google chegam ao Kanban. A coluna escolhida no Kanban é preservada enquanto a tarefa continuar pendente.
- Criações, alterações e exclusões fluem nos dois sentidos. Exclusões locais deixam uma marca persistente até a confirmação do Google. Exclusões no Google prevalecem sobre edições locais.
- Em conflitos de edição, prevalece a alteração mais recente. PATCHs enviam apenas campos alterados e preservam convidados, conferências e atributos específicos do Google.
- Séries recorrentes são expandidas em ocorrências; editar/excluir no Talki afeta apenas a ocorrência. Para mudar a série inteira, use o Google Agenda.
- Convites organizados por terceiros e tipos especiais de evento são somente leitura no Talki. Responda ou altere esses eventos pelo Google.
- Eventos sincronizados não podem ser movidos para projetos, evitando compartilhar dados pessoais acidentalmente.
- Cron roda a cada 5 minutos, com até 3 contas em paralelo e orçamento global de 220 segundos. As contas são atendidas pela tentativa mais antiga. Há também **Sincronizar agora**. Em filas grandes, o intervalo por conta pode aumentar.
- Desconectar interrompe o acesso e apaga o refresh token armazenado. Os eventos e vínculos permanecem para evitar duplicação na reconexão. Revogação do aplicativo também pode ser feita na página de permissões da conta Google.

## Implementação e limites

- A primeira versão usa snapshots completos paginados dentro da janela, para expandir recorrências e avançar o horizonte continuamente. Não usa webhooks nem depende de o aplicativo estar aberto. Um evento ausente no snapshot é consultado individualmente antes de qualquer exclusão local.
- Cada conta tem uma concessão exclusiva de execução de 330 segundos, superior ao limite de 300 segundos da função. Reservas de exportação são transacionais e usam IDs Google determinísticos. Compare-and-swap no PostgreSQL preserva edições realizadas durante chamadas de rede.
- Refresh tokens ficam cifrados no servidor. Tabelas de conexão, OAuth e vínculos não têm privilégios para anon/authenticated; RLS permanece habilitado. O callback usa estado de uso único, cookie HttpOnly/Secure/SameSite=Lax e PKCE. Nenhuma credencial vai para o bundle público.
- O aplicativo ainda requer teste ponta a ponta com credenciais OAuth reais. Testes automatizados usam um provedor simulado, e testes SQL usam PostgreSQL isolado.
- Ações sobre convidados, RSVP, restauração de itens da lixeira do Google e troca de conta Google não são oferecidas nesta versão.
- A Google Tasks API fornece apenas a data agendada; ela não permite ler o horário exibido pelo Google Agenda. Por isso, a tarefa entra no Kanban com a data e sem horário.

## Verificação

```sh
node --test scripts/google-calendar.test.mjs
npm run build
npx eslint src/components/agenda/google-calendar-connection.tsx src/pages/agenda-page.tsx src/components/agenda/event-dialog.tsx src/lib/agenda.ts
```

Teste SQL em banco **descartável**: carregue `supabase/tests/google-calendar.fixture.sql`, a migração original de agenda (`20260924183941_talki_agenda.sql`), as duas migrações Google e `supabase/tests/google-calendar.sql`, com `psql -v ON_ERROR_STOP=1`. Nunca carregue o fixture em produção.

Teste real após configurar OAuth: criar um evento de teste em cada lado; editar data/título dos dois lados; testar dia inteiro e uma ocorrência recorrente; excluir de cada lado; desconectar/reconectar e confirmar que não duplicou. Use contas/eventos de teste consentidos.

Referências oficiais: [OAuth para aplicações web](https://developers.google.com/identity/protocols/oauth2/web-server), [eventos paginados e recorrências](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [escopos do Calendar](https://developers.google.com/workspace/calendar/api/auth), [recurso Task](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks) e [listagem de tarefas](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list).

## Várias contas e agendas (novembro de 2026)

A migração `20261110143025_talki_multiple_google_calendars.sql` preserva as conexões,
eventos e tarefas existentes. Cada calendário tem seu próprio vínculo, lease e
histórico de sincronização. A lista de calendários trata todas as páginas da API.
Uma agenda compartilhada conectada por mais de uma conta aparece uma só vez.

Em **Agenda → Adicionar conta Google**, autorize cada conta. A principal começa
selecionada; marque as secundárias e compartilhadas desejadas. Calendários sem
permissão de edição são somente leitura. **Usar como padrão** escolhe o destino
de novos compromissos pessoais; também é possível escolher a agenda no formulário.
Alterações e exclusões de eventos vinculados voltam apenas à agenda de origem.
Desmarcar pausa a sincronização e oculta os eventos, preservando os dados.
**Desconectar conta** remove a credencial de todas as agendas daquela conta.

Conexões antigas continuam sincronizando sua agenda principal. Reconecte-as por
**Atualizar agendas / permissões** para carregar outras agendas e conceder o novo
escopo `https://www.googleapis.com/auth/calendar.events`, que substitui
`calendar.events.owned`. Atualize também os escopos na configuração OAuth do
Google Cloud e, se exigido, a verificação do aplicativo. Nenhuma autenticação
Google é feita em nome do usuário pelo servidor sem o consentimento OAuth dele.

Validação: `node --test scripts/google-calendar.test.mjs` e
`bash scripts/test-google-calendars.sh` (Docker), ou informe
`TALKI_TEST_DATABASE_URL` apontando para um banco temporário **vazio**, descartável.
A migração troca assinaturas RPC: prepare o deployment, aplique a migração e
promova o build validado em sequência para reduzir a janela de incompatibilidade.
