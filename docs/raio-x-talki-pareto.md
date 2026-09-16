# Raio X — Talki e Pareto

Data: 16/09/2026. Diagnóstico para incorporação do Pareto ao Talki; nenhuma migração executada.

**Atualização posterior:** a correção de permissões de perfis já foi aplicada e validada. O texto abaixo registra o diagnóstico anterior à correção; veja o [registro de execução](migracao-andamento.md) para o estado atual.

## 1. Base da análise e limites

Inventário dos arquivos próprios, rotas, componentes, hooks, modelos, configurações, dependências e migrations dos dois repositórios; leitura aprofundada dos fluxos de dados, autenticação, administração, jornada e métricas. Dependências instaladas, bundles gerados, imagens e histórico completo do Git não foram revisados linha a linha. Este documento é um diagnóstico de arquitetura e migração, não uma certificação exaustiva de segurança.

| Repositório | Checkout analisado | Commit, confirmado contra HEAD remoto |
|---|---|---|
| Talki | `/Users/henriqueguimaraes/talki` | `b8d1985348b349789421c92c2e4b827929bf8a38` |
| Pareto | `/Users/henriqueguimaraes/Desktop/pareto` | `b01876525eec885ceb73d1f11c0a6bcc654207ae` |

Talki: 86 arquivos TS/TSX em `src`, 8.433 linhas, 17 migrations locais. Pareto: 33 arquivos TS/TSX, 5.298 linhas, uma migration local. Inventário não inclui CSS, assets e configuração nesses números.

Foram feitas consultas de leitura ao Supabase conectado: catálogo, políticas, funções selecionadas, triggers, privilégios, histórico de migrations, funções Edge e contagens. Não foram exportadas senhas, tokens ou registros pessoais para os documentos. E-mails de perfis foram comparados por hash, retornando aqui apenas a quantidade de coincidências.

Não foram executados fluxos autenticados de ponta a ponta nem inspecionadas as variáveis do deployment Vercel. A configuração local não prova qual banco o deployment público usa.

## 2. Qual é o banco de cada sistema?

| Referência Supabase | Evidência | Implicação |
|---|---|---|
| `rpavxnjchfmeiacnumpk` | URL informada como Talki; catálogo público contém `usuarios` e `eventos` | Não corresponde ao modelo do planner analisado; não usar como destino sem esclarecimento |
| `iqgrvptrtphvbmvrqntm` | URL em `.env.local` do Talki e na migration dos alertas; contém as tabelas do planner | Destino confirmado pelo usuário em 16/09/2026; configuração do deployment ainda não inspecionada |
| `afxsrcezmetipzgosdvb` | URL informada do Pareto coincide com sua configuração local; tabelas compatíveis | Origem do módulo de jornada |

O destino confirmado tem **365 tabelas públicas**, compartilhadas com outros produtos. O próprio `src/lib/database.types.ts` alerta sobre o compartilhamento com KPH OS. A origem também contém RH, recrutamento e outros domínios. A migração deve usar uma lista explícita de objetos permitidos; restaurar todo o banco por cima do destino seria incorreto. Desativar o frontend Pareto não significa apagar ou pausar seu projeto Supabase.

## 3. Talki: produto e arquitetura

SPA React 19 + TypeScript, Vite 8, React Router 7, Tailwind 4, Radix/shadcn, dnd-kit, Recharts e Supabase JS. Deploy preparado para Vercel com rewrite para `index.html`.

| Área | Implementação atual |
|---|---|
| Hoje `/` | Visão de tarefas, prioridades, prazos, conclusões e indicadores |
| Projetos `/tarefas` | Lista e criação de projetos, membros e indicadores |
| Projeto `/tarefas/:planId` | Quadro arrastável, lista, agenda e gráficos; filtros e agrupamentos |
| Detalhe da tarefa | Responsáveis, datas, prioridade, cor, etiquetas, checklist, comentários e autosave |
| Marcações | Atribuições de tarefas e identificação de quem atribuiu; não é um sistema geral de menções em texto |
| Etiquetas | Consulta transversal por etiquetas e projetos acessíveis |
| Concluídas | Histórico pessoal de conclusões e reabertura |
| Convites `/convite/:token` | Consulta e aceite por RPC, com prazo de validade |
| Comunicados | Placeholder explícito; publicação ainda não implementada |
| Mensagens | Componente Mattermost existe, mas `/mensagens` redireciona para `/`; não é funcionalidade ativa na navegação |

`src/hooks/use-plan-board.ts` concentra carregamento e mutações do quadro. As páginas também fazem consultas diretamente ao Supabase. Estado predominantemente local com `useState`/`useEffect`; não foi encontrada assinatura Realtime nos fluxos de aplicação inventariados. Atualizações otimistas têm tratamento desigual de erro e reversão.

`AppShell` reúne navegação responsiva, tema claro/escuro, cabeçalho e paleta de comandos. É o ponto para adicionar navegação de Jornada e um cronômetro persistente entre páginas.

Autenticação por e-mail/senha; cadastro disponível na tela. `ProtectedLayout` protege navegação por sessão; autorização real depende de RLS. Papéis `admin`/`membro`; projetos têm criador e membros. Helpers do banco permitem acesso global ao admin e restringem demais usuários por projeto. Regras de criação de membros e projeto precisam ser avaliadas juntas; já houve correções de bootstrap nas migrations.

Modelo: `profiles → plans → buckets → tasks`; `plan_members`, `plan_invites`, `task_assignees`, `task_checklist`, `task_labels`, `task_label_links`, `task_comments` e `notifications` completam o domínio. Datas de início/prazo das tarefas são `date`; conclusão e auditoria são timestamps.

Checklist completo conclui tarefa; um checklist incompleto reabre uma tarefa concluída. Essa regra existe no banco e é espelhada no cliente. Encerrar um apontamento de tempo não deve acionar conclusão de tarefa implicitamente.

Duas Edge Functions do Talki estão ativas: `send-assignment-email` e `check-deadline-alerts`. Código e migration usam Resend, Vault, pg_net e pg_cron; prazos são interpretados às 23:59 no UTC−3, com janelas de 12h e 1h. Conteúdo implantado das funções não foi comparado integralmente com o código local.

## 4. Pareto: produto e arquitetura

Next.js **16.2.9** no manifesto, React 19, TypeScript, Tailwind 4, Recharts, date-fns e Supabase JS/SSR. O README ainda diz “Next.js 14+”. Server Components carregam dados; componentes cliente cuidam de formulários, cronômetro e relatórios. `src/proxy.ts` controla redirects e sessão por cookies.

| Área | Implementação atual |
|---|---|
| Jornada `/registro` | Iniciar, encerrar, trocar e editar atividades; categoria, projeto opcional, área, descrição e participantes em texto |
| Continuidade | Um registro aberto por usuário via índice único parcial; barra flutuante e título da aba com cronômetro |
| Atalhos | Atividades rápidas/pausas e marcador “Fim do expediente” de duração zero |
| Perfil `/perfil` | Nome, sobrenome, nascimento, cargo, descrição do cargo, saldo, histórico e dragão |
| Painel `/admin` | Horas, adesão, aderência, categorias, áreas, capacidade, pessoas, sinais e engajamento |
| Cadastros | Usuários, áreas, projetos e categorias |
| Relatórios | Categoria, pessoa, projeto, benchmark, capacidade e concentração 80/20; exportação CSV |
| Administração server-side | Criar conta, alterar ficha/senha e endpoint de exclusão usando chave privilegiada |

As APIs verificam sessão e papel antes de usar cliente admin. Essa camada precisa virar backend/Edge Function no Talki: código de `next/server`, cookies e chave privilegiada não pode ser transplantado para a SPA.

`profile-repair.ts` recupera usuário autenticado sem ficha com criação idempotente e papel padrão. Preservar o comportamento de recuperação, adaptando-o ao destino. A exclusão atual de Auth pode apagar dados em cascata; na aplicação unificada a ação normal deve ser desativação do acesso ao módulo.

`src/lib/painel.ts` concentra cálculos gerenciais; `gamificacao.ts`, `dragao.ts` e a função SQL de pontuação representam regras distintas. Não há Edge Functions listadas na origem.

## 5. Fotografia dos dados

Contagens do catálogo são uma fotografia e devem ser refeitas no corte. Projetos e tarefas do Talki e registros do Pareto também tiveram `count(*)` consultado.

| Domínio | Talki confirmado | Pareto |
|---|---:|---:|
| Perfis | 42 | 10: 1 admin, 9 colaboradores, todos ativos |
| Projetos | 20 | 1 |
| Tarefas | 50 | Não há entidade equivalente |
| Buckets | 25 | — |
| Vínculos de membros | 33 | — |
| Atribuições | 37 | — |
| Itens de checklist | 8 | — |
| Áreas | — no domínio Talki | 5 |
| Categorias de atividade | — | 6 |
| Registros de tempo | — | 22 |
| Pontuações diárias | — | 4 |

Nos 22 registros consultados havia zero abertos, zero durações negativas e **30.243,695 segundos fechados**. Inícios entre 19/06/2026 e 16/09/2026. Isso não comprova ausência de sobreposição ou outros problemas de qualidade.

**Seis dos dez e-mails de perfis Pareto coincidem com e-mails normalizados de perfis Talki.** São candidatos a conciliação; coincidência de e-mail em `profiles` não comprova identidade Auth verificada. Quatro não coincidem em `profiles`, mas ainda podem existir em `auth.users` sem ficha. Não criar contas antes dessa segunda verificação.

## 6. Achados que afetam a migração

### Bloqueadores de segurança e ambiente

1. **Destino esclarecido:** o usuário confirmou `iqgrvptrtphvbmvrqntm` em 16/09/2026. Conferir a configuração do deployment antes da importação permanece uma verificação operacional.
2. **Chaves privilegiadas compartilhadas na conversa:** rotacionar as chaves service role de Pareto e Talki e atualizar os consumidores legítimos. A primeira mensagem repetia a anon como service role do Talki; a correção posterior identificou o projeto correto e incluiu uma chave privilegiada. Não há chaves nestes documentos.
3. **Elevação de papel no Talki:** `profiles_own` permite operações na própria linha; `profiles_update_own_or_admin` permite atualização própria; `authenticated` possui INSERT/UPDATE na coluna `role`; nenhum trigger de proteção em `public.profiles` foi encontrado. O conjunto permite promover o próprio papel. Evidência de catálogo, sem tentativa de exploração. Corrigir INSERT e UPDATE, revisar DELETE próprio e campos protegidos; só adicionar `WITH CHECK (id=auth.uid())` não impede mudar `role`.
4. **Privacidade de perfil:** Talki permite SELECT dos perfis a autenticados. Não colocar nascimento, jornada contratada e saldo indiscriminadamente nessa tabela. Separar ficha privada de perfil público.
5. **Banco compartilhado:** criar uma nova conta no Auth pode disparar triggers de outros produtos. Auditar dependências de Auth e helpers antes de provisionar usuários ou modificar funções genéricas.

Foram encontradas ainda 26 tabelas sem RLS no projeto confirmado do Talki e `public.eventos` sem RLS no projeto informado inicialmente. São objetos fora do módulo planner; exposição efetiva depende também dos grants e da configuração da Data API. Tratar em revisão separada com os responsáveis desses produtos. Nenhuma política foi alterada nesta análise.

### Divergências funcionais e técnicas

| Achado | Consequência / tratamento |
|---|---|
| Migration Pareto não contém colunas de perfil recentes, pontuação, RPC e proteção de campos | Extrair baseline selecionado do catálogo real; histórico remoto de migrations Pareto retornou vazio |
| Migrations Talki começam alterando tabelas preexistentes; versões locais diferem das versões remotas de mesmos nomes | Não executar reset/push cego; preparar baseline reproduzível e conciliar histórico por conteúdo |
| `gamificacao.ts`: meta 80%, base 10 moedas e bônus de sequência | Difere da RPC real, que usa faixas −5 a +5, meta 70% e dias anteriores; a tela anuncia ganhos que não são o crédito real |
| RPC usa `ON CONFLICT DO NOTHING`, mas atualiza saldo mesmo sem inserir; loop sem ordenação explícita | Risco de crédito duplicado em concorrência e saldo dependente da ordem quando há piso zero; corrigir atomicidade e ordem sem recalcular histórico importado |
| Perfil Pareto protege role/ativo/área/e-mail/moedas, mas não horas contratadas | Jornada contratada influencia pontuação e capacidade; torná-la configuração administrativa |
| Painel usa área atual da pessoa e dias úteis reais; relatório usa área do registro e aproximação `dias*5/7` | Mesmo filtro pode produzir números diferentes; explicitar semânticas e centralizar cálculo |
| Painel carrega até 5.000 linhas e ignora parte dos erros; outras consultas não paginam | Resultados podem ser incompletos; filtrar/agregar no banco e paginar exportações |
| Jornada busca bloco aberto apenas nos registros iniciados hoje | Bloco aberto de ontem pode ficar invisível e impedir nova atividade pelo índice único |
| Trocar atividade faz UPDATE e INSERT separados | Falha intermediária pode deixar usuário sem atividade ativa; usar operação transacional |
| Tempo local no navegador e UTC−3 fixo coexistem | Fixar contrato de fuso e fronteiras; preservar instantes originais |
| `entrega_concluida` é campo legado nullable | Preservar; não inferir tarefas ou conclusão a partir dele |
| E-mail de prazo local usa embed `profiles(nome,email)` sem hint em `task_assignees` | Há duas FKs para profiles; consulta local é ambígua. Conferir e corrigir também a versão implantada |
| Operações de mover/duplicar tarefa têm múltiplas escritas e semânticas próprias | Evitar associar automaticamente histórico de tempo a cópias; manter atribuição histórica ao mover tarefa |
| “Esqueceu a senha?” no Talki não tem ação implementada | Implementar recuperação antes de usar convite/reset como caminho de migração |

O relatório 80/20 mede concentração de **horas registradas**, não produção nem qualidade de entrega. Sua nomenclatura no produto integrado deve refletir isso.

## 7. Verificação realizada

`npm run lint` e `npm run build` do Talki passaram. O build avisou sobre chunk acima de 500 kB: bundle JS principal de aproximadamente 1,28 MB antes de gzip. Usar carregamento por rota ao incorporar gráficos e jornada.

Pareto foi analisado por código e banco; build e navegação autenticada não foram executados. Não existem scripts de teste nos manifestos analisados. Build verde não valida RLS, RPC, relações PostgREST nem comportamento em produção.

## 8. Onde retomar a implementação

Talki: `src/App.tsx`, `src/components/layout/app-shell.tsx`, `src/components/layout/nav-items.ts`, `src/hooks/use-plan-board.ts`, `src/components/tarefas/task-detail-sheet.tsx`, `src/lib/database.types.ts`, `supabase/migrations/` e `supabase/functions/`.

Pareto: `src/app/registro/registro-cliente.tsx`, `src/app/perfil/perfil-cliente.tsx`, `src/lib/painel.ts`, `src/lib/gamificacao.ts`, `src/lib/dragao.ts`, `src/app/admin/relatorios/relatorios-cliente.tsx`, `src/app/api/admin/usuarios/`, `src/lib/profile-repair.ts` e catálogo real do banco.

Convenção existente do Talki: usar hints explícitos de FK nos embeds de perfis. Ver `CLAUDE.md`.

Próximo documento: [plano de migração](plano-migracao-pareto-talki.md).
