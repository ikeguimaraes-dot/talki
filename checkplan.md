# Blueprint do Projeto: CheckPlan (Gestão & Delegação)

Este arquivo serve como o **Master Blueprint** do ecossistema CheckPlan. Ele detalha minuciosamente toda a arquitetura técnica, o modelo relacional de banco de dados, o design system unificado e o histórico de correções críticas aplicadas. 

**Instrução para futuras sessões de IA / Antigravity:** Leia este arquivo integralmente para compreender o estado atual do projeto antes de propor ou executar qualquer modificação no código.

---

## 1. Visão Geral do Sistema
O **CheckPlan** é uma plataforma corporativa e minimalista de gestão de projetos e delegação de tarefas, inspirada na dinâmica operacional e de produtividade do Microsoft Planner. O sistema equilibra uma estética institucional premium e sóbria com um fluxo de trabalho ágil baseado em quadros Kanban (Buckets), controle severo de cronogramas e atribuição multipessoal de responsabilidades.

### Stack Tecnológica
- **Frontend**: React (v18+) com TypeScript (TSX).
- **Ferramental de Construção**: Vite (gerenciamento de build, HMR e variáveis de ambiente).
- **Estilização**: CSS Nativo Customizado (`src/index.css`), baseado em variáveis globais estruturadas.
- **Banco de Dados & API**: Supabase (PostgREST para queries diretas via client JS).
- **Autenticação & Credenciais**: Gerenciadas estritamente via variáveis locais seguras `.env`.

---

## 2. Arquitetura do Banco de Dados (Supabase / PostgreSQL)

O banco de dados é hospedado no Supabase e segue de forma estrita as regras de nomenclatura em **letras minúsculas** convencionadas pelo PostgreSQL. Todas as tabelas operam com o Row Level Security (RLS) desativado para o ambiente atual de desenvolvimento, eliminando travas de autenticação temporárias.

### Diagrama de Tabelas e Constraints

#### `projects` (Empreendimentos Ativos)
Armazena os projetos ou frentes macro da marca.
- `id`: `UUID` (PRIMARY KEY, padrão `gen_random_uuid()`)
- `name`: `TEXT` (NOT NULL)
- `description`: `TEXT`
- `start_date`: `DATE` (Fallback automático para a data atual)
- `end_date`: `DATE` (Fallback automático para a data atual + 30 dias)
- `status`: `TEXT` (NOT NULL, DEFAULT 'Não iniciado', CHECK `status IN ('Não iniciado', 'Em andamento', 'Concluído')`)
- `created_at`: `TIMESTAMP WITH TIME ZONE` (DEFAULT `now()`)

#### `buckets` (Frentes / Temas / Colunas)
Representa as colunas verticais do quadro Kanban de um projeto específico.
- `id`: `UUID` (PRIMARY KEY, padrão `gen_random_uuid()`)
- `project_id`: `UUID` (FOREIGN KEY REFERENCES `projects(id)` ON DELETE CASCADE, NOT NULL)
- `name`: `TEXT` (NOT NULL)
- `created_at`: `TIMESTAMP WITH TIME ZONE` (DEFAULT `now()`)

#### `tasks` (Fichas de Trabalho / Cards)
Armazena as tarefas vinculadas a uma coluna e a um projeto.
- `id`: `UUID` (PRIMARY KEY, padrão `gen_random_uuid()`)
- `bucket_id`: `UUID` (FOREIGN KEY REFERENCES `buckets(id)` ON DELETE CASCADE, NOT NULL)
- `project_id`: `UUID` (FOREIGN KEY REFERENCES `projects(id)` ON DELETE CASCADE, NOT NULL)
- `title`: `TEXT` (NOT NULL)
- `description`: `TEXT` (Anotações internas do card)
- `start_date`: `DATE`
- `due_date`: `DATE` (Data de conclusão/vencimento)
- `status`: `TEXT` (NOT NULL, DEFAULT 'Não iniciado', CHECK `status IN ('Não iniciado', 'Em andamento', 'Concluído')`)
- `priority`: `TEXT` (DEFAULT 'Média', CHECK `priority IN ('Baixa', 'Média', 'Alta', 'Urgente')`)

#### `team_members` (Corpo Técnico / Funcionários)
Cadastro dos colaboradores disponíveis para alocação.
- `id`: `UUID` (PRIMARY KEY, padrão `gen_random_uuid()`)
- `name`: `TEXT` (NOT NULL)
- `email`: `TEXT` (UNIQUE, NOT NULL)
- `avatar_url`: `TEXT`

#### `task_assignees` (Tabela de Junção de Responsáveis)
Relação Muitos-para-Muitos (N:M) associando múltiplos funcionários a uma única tarefa.
- `task_id`: `UUID` (FOREIGN KEY REFERENCES `tasks(id)` ON DELETE CASCADE, PRIMARY KEY conjugada)
- `member_id`: `UUID` (FOREIGN KEY REFERENCES `team_members(id)` ON DELETE CASCADE, PRIMARY KEY conjugada)

#### `comments` (Linha do Tempo / Discussões)
Comentários cronológicos anexados a cada card.
- `id`: `UUID` (PRIMARY KEY, padrão `gen_random_uuid()`)
- `task_id`: `UUID` (FOREIGN KEY REFERENCES `tasks(id)` ON DELETE CASCADE, NOT NULL)
- `member_id`: `UUID` (FOREIGN KEY REFERENCES `team_members(id)` ON DELETE CASCADE, NOT NULL)
- `content`: `TEXT` (NOT NULL)
- `created_at`: `TIMESTAMP WITH TIME ZONE` (DEFAULT `now()`)

### Script SQL Consolidado de Migração (DDL)

```sql
-- Executado no SQL Editor do Supabase para correção de travas e constraints
ALTER TABLE "buckets" DISABLE ROW LEVEL SECURITY;

ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE "projects" ADD CONSTRAINT projects_status_check 
CHECK (status IN ('Não iniciado', 'Em andamento', 'Concluído'));

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE "tasks" ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('Não iniciado', 'Em andamento', 'Concluído'));

ALTER TABLE "tasks" ALTER COLUMN status SET DEFAULT 'Não iniciado';
ALTER TABLE "projects" ALTER COLUMN status SET DEFAULT 'Não iniciado';

```

---

## 3. Estrutura do Frontend (React + TypeScript)

O workspace segue a divisão modular padrão abaixo:

```
CheckPlan/
├── .env                    # Credenciais confidenciais exclusivas do ambiente local
├── index.html              # Entrada DOM montando src/main.tsx
├── package.json            # Scripts npm run dev e build do projeto
├── vite.config.ts          # Configuração do core do Vite
└── src/
    ├── main.tsx            # Inicialização e injeção do App no DOM
    ├── App.tsx             # Roteador centralizado e controle de telas
    ├── index.css           # Design system centralizado e folhas de estilo unificadas
    ├── supabase.ts         # Instanciação direta do cliente Supabase via .env
    ├── types.ts            # Interfaces TypeScript espelhando o banco de dados
    ├── components/
    │   ├── Header.tsx      # Topo institucional (Barra de Assinatura da Marca)
    │   └── TaskDetailsModal.tsx # Modal dinâmico de edição, delegação e comentários
    └── views/
        ├── DashboardView.tsx    # Painel Principal Claro com a grade de projetos
        └── ProjectDetailView.tsx # Tela interna de trabalho (Quadro Kanban Light)

```

### Configuração de Conexão (`src/supabase.ts`)

O cliente do Supabase conecta-se estritamente de maneira nativa, eliminando lógicas de fallback no `localStorage`:

```typescript
import { createClient } from '@supabase/supabase-base-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Variáveis de ambiente do Supabase não configuradas no arquivo .env.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

```

---

## 4. Design System Unificado (Light Theme com Accent Institucional)

O sistema foi unificado para mitigar choques visuais de transição. Ele adota a aparência clara de produtividade ágil do Planner nas visões centrais, enquanto preserva a sofisticação sacred/luxo da identidade de marca no cabeçalho fixo.

### Paleta de Cores Aplicada via CSS

* **Fundo Global do App**: `#FAFAFA` (Branco gelo, limpo e focado).
* **Cards de Projetos e Tarefas**: `#FFFFFF` (Branco puro, com bordas finas e sombras suaves `.premium-card`).
* **Barra de Assinatura (Header)**: `#03110D` (Verde Floresta Profundo, institucional).
* **Elementos de Destaque / Bordas de Foco**: `#A38560` (Ouro Envelhecido).
* **Alertas Críticos / Prazos Vencidos**: `#390517` ou `#D83B01` (Borgonha clássico).
* **Botão Novo Bucket**: `#6264A7` (Roxo Planner corporativo para indicação visual clara).

### Tipografia

* **Títulos e Subtítulos**: `Playfair Display`, serifada, pesada, que confere um aspecto elegante e atemporal.
* **Textos de Apoio e Rótulos**: `Inter`, sans-serif, moderna, otimizada para legibilidade técnica e listagem de metadados.

---

## 5. Fluxos de Negócio Cobertos e Regras do Código

### Criação Automática de Bucket Inicial

Sempre que um novo projeto é submetido com sucesso no formulário da `DashboardView.tsx`, o frontend dispara imediatamente um comando subsequente inserindo um registro padrão na tabela `buckets` com o nome `"A Fazer"`. Isso garante que todo projeto novo já nasça com uma coluna funcional para receber tarefas instantâneas.

### Criação Inline de Tarefas Rápidas

Dentro de cada coluna (Bucket) na `ProjectDetailView.tsx`, o botão `+ Adicionar tarefa` abre um mini input textual. Ao submeter apenas o título, o frontend injeta obrigatoriamente as seguintes chaves no payload para evitar quebras de constraints `NOT NULL` do banco de dados:

```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert([{
    title: quickTitle,
    bucket_id: bucketId,
    project_id: projectId,
    status: 'Não iniciado', // Evita o erro de valor null
    priority: 'Média'
  }]);

```

### Rotina de Atualização Multipessoal (Assignees)

Para atualizar os responsáveis por uma tarefa na `TaskDetailsModal.tsx` de modo seguro, o client contorna conflitos de chave primária limpando os registros passados antes de consolidar os novos. A persistência executa estritamente estes dois passos sequenciais ao clicar em "Salvar Alterações":

1. **Remoção das Linhas Anteriores**: `.delete().eq('task_id', taskId)` na tabela `task_assignees`.
2. **Injeção do Array Atualizado**: `.insert(arrayDeNovosObjetos)` contendo as novas associações selecionadas no modal.

---

## 6. Histórico de Aprendizados e Correções Críticas (Log Técnico)

Caso o sistema apresente instabilidades no futuro, certifique-se de que as soluções abaixo continuam aplicadas:

1. **A Resolução de Caixa (Case-Sensitivity)**:
* *O Bug*: Queries que utilizavam `.from('"Projects"')` ou `.from('Projects')` falhavam com erro `PGRST205` indicando tabela inexistente.
* *A Correção*: O PostgreSQL armazena schemas sem aspas em minúsculo. Todas as chamadas foram mapeadas de forma definitiva para strings limpas e minúsculas: `'projects'`, `'tasks'`, `'buckets'`, `'team_members'`, `'task_assignees'`, e `'comments'`.


2. **Ordenação por Colunas Inexistentes**:
* *O Bug*: A chamada de leitura das tarefas travava o app com o erro de coluna ausente ao tentar rodar `.order('created_at')`.
* *A Correção*: A tabela `tasks` não possui carimbo de data de criação. A ordenação foi alterada para rastrear a integridade com base no ID numérico sequencial ou UUID: `.order('id')`.


3. **Cache de HMR Otimizado do Vite**:
* *O Bug*: Modificações nas variáveis de ambiente do arquivo `.env` eram ignoradas pelo navegador.
* *A Correção*: O Vite congela o estado das variáveis no momento do boot do servidor. Sempre que alterar chaves ou estruturas de ambiente, o processo do terminal deve ser interrompido e reiniciado utilizando a flag de limpeza profunda: `npm run dev -- --force`.



---

Este documento está completo e encerra as diretrizes de desenvolvimento das Fases 1 e 2. O código encontra-se estável, tipado e operando em plena conformidade com o ecossistema do Supabase.
