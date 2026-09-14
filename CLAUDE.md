# Talki — Convenções do projeto

## Supabase: embeds implícitos sempre com hint de FK explícito

Todo embed implícito do Supabase/PostgREST (`tabela(coluna_relacionada)`)
que aponta pra uma tabela que pode receber múltiplas FKs — especialmente
`profiles`, que é referenciada por várias tabelas com múltiplas colunas
(`user_id`, `criado_por`, `atribuido_por`, etc.) — deve usar hint
explícito da FK, mesmo quando hoje só existe uma FK entre as duas
tabelas:

```ts
// Errado — funciona hoje, mas quebra silenciosamente se uma segunda
// FK pra profiles for adicionada na mesma tabela no futuro:
.select('task_assignees(profiles(id, nome))')

// Certo — imune a isso:
.select('task_assignees(profiles!task_assignees_user_id_fkey(id, nome))')
```

**Motivo**: adicionar uma segunda FK numa tabela que já tem embed
implícito de outra tabela torna o embed ambíguo pro PostgREST, que passa
a responder `300 Multiple Choices` em vez de `200` pra qualquer query
que use esse embed. Isso **não aparece em `tsc`, `eslint` nem
`vite build`** — só em runtime, contra o banco real. Foi exatamente o
que aconteceu quando `task_assignees` ganhou a coluna `atribuido_por`
(FK pra `profiles`) além da já existente `user_id`: todo embed
`task_assignees(profiles(...))` sem hint parou de funcionar em produção,
derrubando o carregamento de todos os projetos.

**Aplicação**: ao adicionar qualquer coluna nova de FK pra `profiles`
numa tabela existente (ex.: `revisado_por`, `aprovado_por`), atualizar
os embeds implícitos já existentes dessa tabela pra usar hint explícito
— não é preciso que eu peça isso de novo.
