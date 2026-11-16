# Entregas do Maestri no Talki

A rota autenticada `/entregas` lê o catálogo e as ocorrências existentes do Maestri no Supabase compartilhado. Não importa cópias para `tasks`: a regra de auto-conclusão do checklist das tarefas comuns não se aplica a entregas que exigem evidência e aceite do gestor.

- Catálogo por área e frequência: somente para os administradores autorizados pela RLS do Maestri.
- Minhas entregas: ocorrências atribuídas ao usuário.
- Controladoria / validação: ocorrências em que o usuário é gestor, com aceite/devolução e motivo.
- Checklist, evidência, versão e histórico usam os mesmos registros e RPCs do Maestri.
- Definição de responsáveis, contexto e recorrência abre o cadastro existente no Maestri. Não são inventados responsáveis nem ativadas agendas automaticamente.
- A atualização ocorre ao entrar, após uma ação ou ao clicar em Atualizar. O horário da última leitura fica visível. Conflitos de versão são rejeitados pelo banco.

Não há nova migração, credencial de serviço no cliente, ampliação de acesso ou alteração das tarefas comuns do Talki. A identidade autenticada do Talki deve ser a mesma associada ao responsável/gestor no Maestri. Os 121 modelos não constituem 121 tarefas já atribuídas. A conferência pelo gestor não implica auditoria automática de dados financeiros.

## Implantação e testes

Base: commit de produção `696a5915bb464bc69c639290e648436d1cdd5e7e`, branch `codex/project-task-fixes`. A branch main estava atrás da versão publicada; preservar as alterações de produção de projetos, Kanban e ferramentas do workspace.

Validar com `node --test scripts/entregas.test.mjs`, `npm run build` e ESLint dos arquivos alterados. Os RPCs e políticas são os publicados pelo Maestri na PR 67 de kph-os-inteligencia, incluindo autorização, checklist completo, evidência, aceite e versão otimista.

Fontes: [Maestri PR 67](https://github.com/ikeguimaraes-dot/kph-os-inteligencia/pull/67), [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
