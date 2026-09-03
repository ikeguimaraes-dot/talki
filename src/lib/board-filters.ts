import { isOverdue, isToday, isWithinNextDays } from '@/lib/date';
import { PRIORIDADE_LABEL, PRIORIDADES, type AssigneeProfile, type BucketWithTasks, type Prioridade, type TaskWithRelations } from '@/lib/types';

export type GroupBy = 'bucket' | 'responsavel' | 'prioridade' | 'prazo';
export type PrazoFiltro = 'todas' | 'atrasadas' | 'hoje' | 'semana' | 'sem_prazo';

export interface BoardFilters {
  busca: string;
  prioridade: Prioridade | 'todas';
  labelId: string | 'todas';
  responsavelId: string | 'todas';
  prazo: PrazoFiltro;
}

export const FILTROS_VAZIOS: BoardFilters = {
  busca: '',
  prioridade: 'todas',
  labelId: 'todas',
  responsavelId: 'todas',
  prazo: 'todas',
};

export function hasActiveFilters(filters: BoardFilters): boolean {
  return (
    filters.busca.trim() !== '' ||
    filters.prioridade !== 'todas' ||
    filters.labelId !== 'todas' ||
    filters.responsavelId !== 'todas' ||
    filters.prazo !== 'todas'
  );
}

export function taskMatchesFilters(task: TaskWithRelations, filters: BoardFilters): boolean {
  if (filters.busca.trim() && !task.titulo.toLowerCase().includes(filters.busca.trim().toLowerCase())) return false;
  if (filters.prioridade !== 'todas' && task.prioridade !== filters.prioridade) return false;
  if (filters.labelId !== 'todas' && !task.task_label_links.some(l => l.task_labels.id === filters.labelId)) return false;
  if (filters.responsavelId !== 'todas' && !task.task_assignees.some(a => a.profiles.id === filters.responsavelId)) return false;

  if (filters.prazo === 'atrasadas' && !isOverdue(task.prazo, task.status)) return false;
  if (filters.prazo === 'hoje' && !isToday(task.prazo)) return false;
  if (filters.prazo === 'semana' && !isWithinNextDays(task.prazo, 7)) return false;
  if (filters.prazo === 'sem_prazo' && task.prazo) return false;

  return true;
}

export interface TaskGroup {
  id: string;
  label: string;
  tasks: TaskWithRelations[];
}

export function groupTasks(tasks: TaskWithRelations[], groupBy: GroupBy, members: AssigneeProfile[]): TaskGroup[] {
  if (groupBy === 'prioridade') {
    return PRIORIDADES.map(p => ({
      id: p,
      label: PRIORIDADE_LABEL[p],
      tasks: tasks.filter(t => t.prioridade === p),
    }));
  }

  if (groupBy === 'responsavel') {
    const semResponsavel: TaskGroup = { id: 'sem_responsavel', label: 'Sem responsável', tasks: [] };
    const porMembro: TaskGroup[] = members.map(m => ({ id: m.id, label: m.nome || m.email || 'Sem nome', tasks: [] }));

    for (const task of tasks) {
      if (task.task_assignees.length === 0) {
        semResponsavel.tasks.push(task);
        continue;
      }
      for (const assignee of task.task_assignees) {
        const group = porMembro.find(g => g.id === assignee.profiles.id);
        group?.tasks.push(task);
      }
    }

    return [...porMembro.filter(g => g.tasks.length > 0), semResponsavel].filter(g => g.tasks.length > 0);
  }

  if (groupBy === 'prazo') {
    const grupos: TaskGroup[] = [
      { id: 'atrasadas', label: 'Atrasadas', tasks: [] },
      { id: 'hoje', label: 'Hoje', tasks: [] },
      { id: 'semana', label: 'Próximos 7 dias', tasks: [] },
      { id: 'mais_tarde', label: 'Mais tarde', tasks: [] },
      { id: 'sem_prazo', label: 'Sem prazo', tasks: [] },
    ];

    for (const task of tasks) {
      if (isOverdue(task.prazo, task.status)) grupos[0].tasks.push(task);
      else if (isToday(task.prazo)) grupos[1].tasks.push(task);
      else if (isWithinNextDays(task.prazo, 7)) grupos[2].tasks.push(task);
      else if (task.prazo) grupos[3].tasks.push(task);
      else grupos[4].tasks.push(task);
    }

    return grupos.filter(g => g.tasks.length > 0);
  }

  return [];
}

export function groupTasksByBucket(buckets: BucketWithTasks[], filters: BoardFilters): TaskGroup[] {
  return buckets
    .map(bucket => ({
      id: bucket.id,
      label: bucket.nome,
      tasks: bucket.tasks.filter(t => taskMatchesFilters(t, filters)),
    }))
    .filter(group => group.tasks.length > 0);
}
