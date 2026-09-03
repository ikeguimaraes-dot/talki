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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <span onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} className="mt-0.5">
          <Checkbox checked={done} onCheckedChange={checked => onToggleDone(task.id, checked === true)} className="size-[17px] rounded-full border-muted-foreground/45 data-[state=checked]:border-[#3ddcaa] data-[state=checked]:bg-[#3ddcaa]" />
        </span>
        <p className={cn('flex-1 text-[13px] font-medium leading-5 text-foreground transition-all duration-300', done && 'text-muted-foreground line-through')}>
          {task.titulo}
        </p>
      </div>

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-7">
          {labels.map(label => (
            <span
              key={label.id}
              className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: `${label.cor}18`, borderColor: `${label.cor}35`, color: label.cor }}
            >
              {label.nome}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pl-7">
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
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
