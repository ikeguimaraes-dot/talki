# Transcrição automática do Baú

Cada áudio pronto tem um trabalho persistido em `talki_bau_ai_jobs`. Novos uploads entram na fila por trigger; arquivos antigos podem ser iniciados no botão Gerar transcrição e resumo. O proprietário pode iniciar/retomar e os leitores autorizados da reunião podem consultar o resultado.

O endpoint `POST /api/bau-transcribe` valida a sessão Supabase, enfileira o arquivo do proprietário e inicia uma etapa em segundo plano. O agendador da Vercel chama `GET /api/bau-transcribe` a cada minuto, autenticado por `CRON_SECRET`, e processa etapas disponíveis dentro do limite de duração de cada execução. Fechar a página não interrompe a fila.

FFmpeg lê o áudio por URL assinada do Storage, converte em trechos de dois minutos de MP3 mono e mantém dois segundos de sobreposição. O arquivo original de até 2 GB não é carregado inteiro na memória. O modelo `gpt-4o-mini-transcribe` transcreve cada trecho. O cursor e o texto são salvos após cada etapa. Uma concessão de cinco minutos com token exclusivo impede dois processadores de salvar a mesma etapa; falhas têm até três tentativas, e a retomada manual preserva o progresso.

Após a transcrição, `gpt-5-mini` gera um objeto estruturado em português com título, Informações da Reunião, Notas da Reunião por tema, Próximos Passos e Sugestões da IA. O texto manual da reunião não é sobrescrito. Resultados são separados por gravação. Nomes de falantes não são identificados automaticamente. É possível consultar e baixar os textos; a transcrição também alimenta a busca existente do Baú.

## Configuração de produção

Segredos exclusivos do servidor: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. Nunca usar prefixo `VITE_` nestes segredos. O servidor também utiliza as variáveis públicas existentes `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

Após autorização para configurar os segredos no projeto Talki da Vercel, `node scripts/configure-bau-ai.mjs` transfere a chave da configuração local e a credencial do projeto Supabase vinculado, via stdin, sem imprimir os valores. A chave do agendador é gerada e mantida no `.env.local`, ignorado pelo Git. Publicar a aplicação para ativar o endpoint e seu agendador.

A migração `talki_bau_ai_jobs` cria tabela, regras, triggers e funções. Não reprocessa automaticamente gravações antigas. Excluir um arquivo remove seu trabalho e resultados em cascata.

## Verificação

- `npm run build`
- `npx eslint src/components/bau src/lib/bau-ai.ts src/pages/bau-page.tsx src/pages/bau-detail-page.tsx`
- `node --test scripts/bau-ai.test.mjs scripts/bau.test.mjs`
- `bash scripts/test-bau.sh` (Docker)

A chave da OpenAI foi validada e um teste real com fala sintética confirmou transcrição e resumo estruturado. Segredos configurados e integração publicada em produção após autorização explícita. O endpoint rejeita chamadas anônimas (401), aceita o agendador autenticado (200), e os dois áudios existentes iniciaram processamento real com checkpoints persistidos. Deployment: `dpl_jNk6CxBWqEgeCWuWiy4ZCNkhJEjn`.

Validação real concluída: os dois áudios existentes (aproximadamente 1h47 e 2h03) terminaram com status `completed`, transcrições de 78.443 e 87.996 caracteres e resumos estruturados. Os cursores finais conferem com a duração dos arquivos (diferença inferior a 0,1 segundo). Nenhum erro persistido. A sessão do navegador estava encerrada; a validação do resultado em produção foi feita pelo endpoint e pelo banco, sem simular login do usuário.
