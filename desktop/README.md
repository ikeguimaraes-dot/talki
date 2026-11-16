# Talki Mini

Aplicativo online para macOS (Apple Silicon e Intel) e Windows x64. A janela carrega `https://talki.freneze.com.br/mini`, publicada pelo mesmo projeto web. O navegador não precisa permanecer aberto.

## Uso

- Entre com sua conta do Talki. A sessão fica no aplicativo, separada do navegador.
- A lista mostra somente tarefas atribuídas à conta conectada e ainda abertas.
- **Hoje e atrasadas** inclui prazos vencidos/hoje e tarefas cujo início já chegou. **Todas abertas** inclui futuras e sem datas.
- **Kanban** mostra somente suas tarefas abertas na coluna Trabalhando, independentemente do prazo.
- O botão de sol/lua no topo alterna entre dia e noite e guarda a preferência neste dispositivo.
- **Nova tarefa para mim** cria a tarefa no projeto/lista escolhidos, com início hoje, responsável atual e Kanban Fila. A criação e a atribuição são uma única transação. Uma tentativa repetida após falha de rede não duplica a tarefa.
- Concluir registra horário no servidor e move para Finalizado.
- O botão de fechar recolhe a janela; use o ícone na barra de menus/bandeja para recuperá-la. Para encerrar, escolha **Sair do aplicativo**.
- Atalho global: **Cmd+Alt+T** no Mac; **Ctrl+Alt+T** no Windows. Se outro aplicativo ocupar o atalho, use o ícone.
- **Sempre por cima** e **Iniciar com o computador** ficam no menu do aplicativo/ícone. Inicialização automática é opcional e começa desativada.
- No Windows, pressione Alt para revelar o menu.
- Detalhes de tarefas e recuperação de senha abrem no navegador padrão. Pode ser necessário entrar também no navegador.
- Sincroniza a cada 30 segundos quando visível e ao recuperar foco/conexão. Sem internet, não conclui nem cria tarefas; o formulário permanece para tentar novamente.

## Desenvolvimento e builds

```sh
npm ci --prefix desktop
npm test --prefix desktop
npm start --prefix desktop
npm run dist:mac --prefix desktop
npm run dist:win --prefix desktop
```

Execute builds de Mac e Windows sequencialmente, pois compartilham a pasta release. Dependências de empacotamento ficam isoladas do site; nenhum segredo de servidor é incluído. O renderer usa sandbox, sem Node/preload/IPC privilegiado; apenas a rota Mini pode permanecer no aplicativo. Links externos são limitados ao domínio oficial e abertos no navegador.

A geração de ícones usa o favicon existente: `node desktop/generate-icons.mjs`.

## Distribuição

Os arquivos de teste estão em `desktop/release`. Antes da distribuição geral, configurar **Developer ID Application + notarização Apple** e **assinatura Windows**. A máquina de desenvolvimento não tinha identidades de assinatura de publicação disponíveis. Os pacotes de teste podem gerar avisos/bloqueios de origem; não são builds autenticados de produção.

As alterações da interface entram pelo deploy web. Atualizações de Electron e recursos nativos exigem recompilar/reinstalar o aplicativo; esta versão não possui atualização automática do executável.

Para builds oficiais, remova `mac.identity: "-"` (assinatura ad-hoc de teste) e `win.signExecutable: false` antes de configurar os certificados/credenciais de assinatura no ambiente de build. Nunca coloque certificados, senhas ou tokens no repositório. A assinatura ad-hoc válida do Mac permite o teste local, mas não substitui Developer ID e notarização.
