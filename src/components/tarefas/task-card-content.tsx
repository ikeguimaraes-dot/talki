import { Calendar, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateBR, isOverdue } from '@/lib/date';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarStack } from '@/components/tarefas/avatar-stack';
import { PriorityIcon } from '@/components/tarefas/priority-icon';
import type { TaskWithRelations } from '@/lib/types';

interface TaskCardContentProps {
  task: TaskWithRelations;
  onToggleDone: (taskId: string, done: boolean) => void;
}

export function TaskCardContent({ task, onToggleDone }: TaskCardContentProps) {
  const checklistTotal = task.task_checklist.length;
  const checklistDone = task.task_checklist.filter(c => c.feito).length;
  const overdue = isOverdue(task.prazo, task.status);
  const labels = task.task_label_links.map(l => l.task_labels);
  const assignees = task.task_assignees.map(a => a.profiles);
  const done = task.status === 'concluida';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <span onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} className="mt-0.5">
          <Checkbox checked={done} onCheckedChange={checked => onToggleDone(task.id, checked === true)} />
        </span>
        <p className={cn('flex-1 text-sm font-medium text-foreground', done && 'text-muted-foreground line-through')}>
          {task.titulo}
        </p>
      </div>

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-6">
          {labels.map(label => (
            <span
              key={label.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: label.cor }}
            >
              {label.nome}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pl-6">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <PriorityIcon prioridade={task.prioridade} />
          {task.prazo && (
            <span className={cn('flex items-center gap-1', overdue && 'font-medium text-destructive')}>
              <Calendar className="size-3.5" />
              {formatDateBR(task.prazo)}
            </span>
          )}
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3.5" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
        </div>
        <AvatarStack profiles={assignees} max={3} />
      </div>
    </div>
  );
}
