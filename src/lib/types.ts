import type { Database } from '@/lib/database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type Bucket = Database['public']['Tables']['buckets']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskLabel = Database['public']['Tables']['task_labels']['Row'];
export type ChecklistItem = Database['public']['Tables']['task_checklist']['Row'];
export type TaskComment = Database['public']['Tables']['task_comments']['Row'];

export type Prioridade = 'urgente' | 'importante' | 'media' | 'baixa';
export type StatusTarefa = 'nao_iniciada' | 'em_andamento' | 'concluida';

export const PRIORIDADES: Prioridade[] = ['urgente', 'importante', 'media', 'baixa'];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  urgente: 'Urgente',
  importante: 'Importante',
  media: 'Média',
  baixa: 'Baixa',
};

// Vermelho de alerta (destructive) pra urgente + rampa ordinal de um hue só
// (cobre, claro→escuro) pra importante/média/baixa — validada com
// scripts/validate_palette.js da skill dataviz (--ordinal, todos os checks OK).
export const PRIORIDADE_COR: Record<Prioridade, string> = {
  urgente: '#C1432A',
  importante: '#7A4A1F',
  media: '#B8763F',
  baixa: '#D0AD75',
};

export const STATUS_TAREFA: StatusTarefa[] = ['nao_iniciada', 'em_andamento', 'concluida'];

export const STATUS_LABEL: Record<StatusTarefa, string> = {
  nao_iniciada: 'Não iniciada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

export type TarefaCor = 'violeta' | 'azul' | 'verde' | 'ambar' | 'vermelho' | 'rosa' | 'cinza';

export const CORES_TAREFA: TarefaCor[] = ['violeta', 'azul', 'verde', 'ambar', 'vermelho', 'rosa', 'cinza'];

// Nenhuma cor nova no CSS: reaproveita as variables --chart-*/--destructive/
// --muted-foreground que já existem no tema, pra "cor da tarefa" nunca sair
// de sincronia com o design system (skill dataviz).
export const COR_TAREFA_VAR: Record<TarefaCor, string> = {
  violeta: 'var(--chart-1)',
  azul: 'var(--chart-3)',
  verde: 'var(--chart-2)',
  ambar: 'var(--chart-4)',
  vermelho: 'var(--destructive)',
  rosa: 'var(--chart-5)',
  cinza: 'var(--muted-foreground)',
};

export const COR_TAREFA_LABEL: Record<TarefaCor, string> = {
  violeta: 'Violeta',
  azul: 'Azul',
  verde: 'Verde',
  ambar: 'Âmbar',
  vermelho: 'Vermelho',
  rosa: 'Rosa',
  cinza: 'Cinza',
};

export interface AssigneeProfile {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  cargo: string | null;
}

export interface TaskWithRelations extends Task {
  task_assignees: { profiles: AssigneeProfile }[];
  task_checklist: ChecklistItem[];
  task_label_links: { task_labels: TaskLabel }[];
}

export interface BucketWithTasks extends Bucket {
  tasks: TaskWithRelations[];
}

export interface PlanWithMembers extends Plan {
  plan_members: { profiles: AssigneeProfile }[];
  tasks: { id: string; status: string; prazo: string | null }[];
}

export interface TaskCommentWithProfile extends TaskComment {
  profiles: AssigneeProfile;
}
