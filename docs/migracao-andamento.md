# Migração Pareto → Talki: execução

## Estado atual — 16/09/2026

**Talki integrado e publicado:** https://talki.freneze.com.br/jornada (alternativa: https://talki-eight.vercel.app/jornada).

**Corte do Pareto pendente.** A revisão automática rejeitou colocar as seis tabelas da origem em somente leitura antes da cópia final. Nenhum trigger de congelamento foi aplicado e nenhum redirecionamento Pareto foi publicado. Foi solicitada confirmação específica ao usuário depois da importação e validação. Enquanto isso, a origem permanece ativa: não tratar esta execução como corte concluído nem presumir sincronização contínua.

### Entregue e aplicado

- Migration `20260916201737_talki_protect_profile_authorization`: proteção dos campos de autorização dos perfis.
- Migration `20260916204516_talki_jornada_core`: seis tabelas `talki_*`, RLS/grants, funções de cronômetro, perfil, gestão e pontuação; auditoria e mapa em `talki_private`.
- Jornada, perfil/dragão, gestão, sete dimensões de relatório com filtros e CSV, manutenção de pessoas/áreas/categorias/metadados de projetos.
- Cronômetro global; iniciar a partir da tarefa e consultar horas autorizadas na tarefa. Mesma sessão e mesmo Supabase do Talki.
- Recuperação/ativação de conta. URLs exatas `/recuperar-senha` dos dois domínios adicionadas à lista de retornos Auth; demais URLs preservadas. SMTP customizado já habilitado com remetente Talki, sem alteração de credenciais.
- Edge Function `talki-manage-user`, versão 2, JWT verificado e autorização consultada no banco. Cria somente contas novas e ficha do módulo; não promove papel global. Corrigida a compensação em caso de erro de ficha para remover o perfil recém-criado antes da conta Auth.
- Frontend promovido: `dpl_GJb5CGabYYzfuuHkQjL6f3UFZq9N`, URL de deployment `https://talki-fclddg71i-henriques-projects-0f1cdf7f.vercel.app`.

### Dados importados

Snapshot da origem: **2026-09-16 21:00:35 UTC** (18:00:35 em São Paulo). SHA-256 e contagens estão no manifesto privado `.migration-local/import-manifest.json`.

| Entidade | Quantidade |
|---|---:|
| Pessoas | 10 |
| Áreas | 5 |
| Categorias | 6 |
| Projeto | 1 |
| Registros | 22 |
| Pontuações históricas | 4 |
| Segundos fechados | 30.243,695 |

Seis identidades foram associadas por e-mail verificado aos perfis Talki existentes. Quatro contas foram provisionadas: duas exigem redefinição de senha; duas mantêm e-mail não confirmado e exigem confirmação/ativação. Senhas antigas não foram copiadas. Os 42 perfis anteriores foram preservados; há 46 perfis após a migração e a remoção da conta de teste.

O projeto Ricardo foi criado como plano novo com o ID original, propriedade da conta Talki conciliada do admin Pareto e as dez pessoas do Pareto como membros, preservando a visibilidade que tinham na origem. Recebeu um bucket inicial. Nenhum plano existente foi associado por semelhança de nome.

Fichas privadas, papel do módulo e saldo estão reunidos em `talki_colaboradores` (simplificação das três tabelas inicialmente propostas). Papéis globais Talki existentes foram preservados. Campos globais de perfis existentes também foram preservados; não houve sobrescrita automática de nome/cargo.

A importação usa transação, validação exata de cada linha e mapa de proveniência. Repetição idêntica é segura; divergências abortam em vez de sobrescrever trabalho novo. IDs/campos históricos, marcadores de duração zero, saldos e as quatro avaliações foram conservados. Não houve reavaliação automática do histórico nem envio de e-mails.

### Validação concluída

- Build TypeScript/Vite e lint passaram; permanece o aviso do bundle principal grande.
- Oito testes de conciliação e métricas passaram.
- SQL isolado em Postgres 16: isolamento entre usuários, campos protegidos, ação administrativa negada, associação de tarefa privada negada, troca de atividade transacional, unicidade de cronômetro e pontuação sem crédito duplicado.
- Ensaio de restauração do snapshot permitido em Postgres temporário sem rede; importação executada duas vezes, sem duplicatas, com soma de segundos idêntica. O ensaio cobre o módulo, não o banco compartilhado inteiro.
- Validação real pelo navegador com conta sintética: login, início de atividade, cronômetro durante navegação, encerramento, perfil/dragão, bloqueio da gestão para participante e painel/relatórios com papel de gestor temporário.
- Função administrativa chamada com ação inválida: HTTP 400 esperado, provando autenticação/autorização sem criar contas adicionais.
- URL de recuperação validada por geração de link de teste sem envio de e-mail. SMTP configurado confirmado por leitura; entrega efetiva de e-mail não foi testada.
- Advisors de segurança: nenhum achado associado ao namespace Talki/Jornada no resultado consultado; avisos de outros sistemas permanecem fora do escopo.
- Conta sintética, perfil e apontamentos removidos; sessões revogadas. Conferência remota final retornou zero contas de teste, dez colaboradores e 22 registros.
- Bundle público confirmado com `/jornada` e referência ao Supabase correto.

### Limites explícitos desta versão

- Edição pelo participante de dias já pontuados é bloqueada; correções desses períodos requerem operação de suporte auditada. Não existe ainda uma tela de ajuste/reprocessamento retroativo de pontuação.
- Pontuação continua a regra legada por dia de início e é acionada em “Atualizar dias encerrados”. Relatórios dividem intervalos pela interseção com o período, usam dias úteis reais e incluem histórico de inativos. Capacidade usa carga e lotação atuais; mudanças ficam na auditoria, sem reconstruir vigência histórica ausente.
- Não foi realizada regressão manual exaustiva de todos os recursos antigos do Planner nem observação operacional de vários dias. Nenhum prazo de estabilidade foi presumido.
- O corte, o redirecionamento e a validação de retorno após novas gravações ainda dependem da etapa operacional abaixo. Não apagar a origem nem restaurar o banco compartilhado inteiro.

### Corte preparado, ainda não executado

1. Obter confirmação específica do bloqueio de novas gravações na origem.
2. Aplicar **somente no projeto `afxsrcezmetipzgosdvb`** o arquivo em `supabase/source-migrations/*_pareto_freeze_for_talki.sql`. Ele não pertence à fila de migrations Talki.
3. Exportar novamente o mesmo escopo e comparar todas as linhas/IDs com o snapshot importado. Se houver diferenças, reconciliar com a auditoria Talki; nunca sobrescrever divergências nem apagar registros recentes silenciosamente.
4. Conferir contagens/segundos por pessoa, saldos e mapas. Não redirecionar com divergências abertas.
5. Publicar `scripts/migration/pareto-redirect` no projeto Vercel Pareto `prj_DxokpKRR6FbMLuHVNsx0OqfX5fIL` e verificar redirects 307. Não alterar o projeto Vercel Talki para esta ação.
6. Guardar fonte em leitura durante observação. Não desativar o Supabase compartilhado do Pareto.

### Retorno

Frontend Talki anterior: `https://talki-689x2vvdg-henriques-projects-0f1cdf7f.vercel.app` (`dpl_DAQPa9EXW5oWm1nkxSkLL5gbAPCQ`). Pareto anterior: `https://pareto-f081sxyhk-henriques-projects-0f1cdf7f.vercel.app` (`dpl_ETwvFC54VWcHVsxJT9iW6xfjEKAW`).

Reverter apenas o deployment não reverte dados. Depois de novas gravações no Talki, bloquear a escrita do módulo, exportar registros e auditoria posteriores ao snapshot, reconciliar a tradução inversa e só então reabrir o Pareto. O script `scripts/migration/rollback-source-freeze.sql` remove apenas os triggers de congelamento; não deve ser usado para reabrir uma origem desatualizada. Mantenha o destino corrigido adiante se a conciliação inversa não estiver validada.

### Arquivos privados e acesso

`.migration-local/` é ignorado por Git e Vercel, diretório `0700`, exportações/mapas `0600`. Contém snapshot, SQL de importação, mapa autorizado e manifesto; nenhum segredo foi adicionado ao código ou aos documentos. As chaves compartilhadas pelo usuário não foram rotacionadas. A leitura de hashes de senha foi rejeitada pela revisão automática e substituída pelo provisionamento com ativação/reset.

Para entrar: abrir o Talki com a conta existente; novos usuários vindos do Pareto usam “Esqueceu a senha?” e, se necessário, “Reenviar confirmação da conta”. O fluxo de criação administrativa retorna necessidade de confirmação. Nenhum e-mail foi enviado por esta execução.

---

# Histórico da primeira etapa

## 16/09/2026 — permissões e conciliação inicial

Destino confirmado: `iqgrvptrtphvbmvrqntm`. Origem: `afxsrcezmetipzgosdvb`.

### Aplicado no banco Talki

Migration `20260916201737_talki_protect_profile_authorization` aplicada com sucesso pelo conector Supabase. O arquivo local foi alinhado à versão registrada no servidor depois da criação inicial pelo CLI.

- Removida a policy ampla `profiles_own`.
- Revogados privilégios de escrita de tabela e coluna de `PUBLIC`, `anon` e `authenticated`.
- Permitida atualização pelo navegador somente de `nome`, `avatar_url`, `cargo` e `aceitou_termo_em`, respeitando RLS de titular/admin.
- `role`, ID, e-mail e data de criação não são editáveis pelo navegador, nem por um admin logado. Mudanças administrativas de identidade/papel exigem backend confiável.
- INSERT/DELETE direto de perfil bloqueado para navegador. Cadastro pelo trigger Auth e escrita privilegiada por `service_role` preservados.
- Os 42 perfis foram preservados. Nenhuma conta foi criada, excluída, associada ou teve seu papel alterado nesta execução.

Verificação pós-aplicação: `authenticated` sem INSERT/UPDATE de `role`, sem DELETE de perfil, com UPDATE de `nome`; `service_role` mantém UPDATE de `role`; trigger `on_auth_user_created` continua ativo.

Escopo do DDL: exclusivamente privilégios/políticas de `public.profiles` e comentário de `role`. Não foram modificadas tabelas dos demais produtos.

### Preparado localmente

- [Catálogo Pareto](../supabase/baselines/pareto-2026-09-16.json): colunas, constraints, índices, policies, grants, triggers e quatro funções relevantes das seis tabelas do módulo. É uma fotografia de metadados, **não** um backup de dados ou baseline executável completo.
- [Conciliador de identidades](../scripts/migration/reconcile-identities.mjs): ferramenta de leitura; identifica conflitos, contas não verificadas e perfis ausentes; não promove papéis globais nem aprova associações.
- Mapa real em `.migration-local/identity-map.json`, ignorado pelo Git, com permissões de arquivo `0600` e diretório `0700`. Apenas IDs, estados e papel proposto do módulo; sem chaves, senhas ou e-mails em claro. Entradas privadas usadas para conciliação contêm hashes de e-mails e também ficam restritas.

Resultado da conciliação de Auth + perfis:

| Estado | Pessoas | Próxima ação |
|---|---:|---|
| Candidato com e-mail Auth confirmado nos dois sistemas | 6 | Revisar associação proposta e preservar identidade/papel Talki |
| Sem conta correspondente, e-mail confirmado na origem | 2 | Provisionamento seguro no destino, quando o fluxo de ativação estiver pronto |
| Sem conta correspondente, e-mail não confirmado na origem | 2 | Ativação/verificação; não marcar como confirmado automaticamente |

Não foram encontrados matches de Auth sem perfil no destino para esses usuários. Os mapas continuam com `approved: false`: o resultado identifica candidatos e não executa a migração.

### Validação

Postgres 16 temporário, sem rede, sem portas publicadas, dados sintéticos em armazenamento efêmero. Testadas atualização própria, isolamento entre membros, edição administrativa, bloqueio de promoção/INSERT/UPSERT/DELETE e campos protegidos, leitura de diretório, anonimato, cadastro com metadata maliciosa e escrita confiável. Todos passaram; containers removidos.

O fixture reproduz o subconjunto de perfis observado, não todos os 365 objetos do banco compartilhado. A validação remota foi por catálogo e privilégios; não foram simuladas mutações de perfis reais nem navegação autenticada na aplicação.

Cinco testes automatizados do conciliador passaram. Lint e build Talki passaram; permanece o aviso de bundle grande já observado. Advisors de segurança consultados após o DDL: nenhum aviso retornado associado a `profiles`/Talki nesse filtro; persistem avisos de outros produtos no banco, fora desta alteração. Isso não certifica a segurança do projeto inteiro.

Para repetir os testes:

```sh
bash scripts/test-profile-authorization.sh
node --test scripts/migration/reconcile-identities.test.mjs
npm run lint
npm run build
```

O runner SQL requer Docker e usa somente fixture sintético. Não executar os arquivos de fixture/teste no SQL Editor de produção. O script remove seu próprio container ao terminar.

### Próximas etapas

1. Construir baseline executável selecionado e ambiente de homologação do módulo; conciliar histórico local/remoto antigo sem executar push/reset indiscriminado.
2. Implementar tabelas privadas de ficha, acesso ao módulo e registros, com RLS e transações para cronômetro/pontuação.
3. Preparar fluxo de recuperação/ativação de conta e confirmar mapa de projetos/donos/membros antes de provisionar/importar.
4. Adaptar Jornada, relatórios e gamificação, seguindo o plano; ensaiar importação, corte e retorno.

A configuração Vercel de produção, rotação de credenciais compartilhadas, backup restaurável e migração dos registros ainda não foram executados. Nenhum e-mail foi enviado. Não foi realizado deploy do frontend.

Referência utilizada para a correção: [privilégios por coluna no Supabase](https://supabase.com/docs/guides/database/postgres/column-level-security). Revogar somente o privilégio da coluna não resolve quando ainda há concessão de UPDATE da tabela inteira.
