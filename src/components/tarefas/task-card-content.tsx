import { Calendar, CheckCircle2, ListChecks, MoreHorizontal, Palette } from 'lucide-react';
import { checklistToneClass, cn, stripMarkdown } from '@/lib/utils';
import { checklistPercentTone, formatDateRangeBR, formatShortDateBR, isOverdue, isToday } from '@/lib/date';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarStack } from '@/components/tarefas/avatar-stack';
import { PriorityIcon } from '@/components/tarefas/priority-icon';
import { CORES_TAREFA, COR_TAREFA_LABEL, COR_TAREFA_VAR, type TarefaCor, type TaskWithRelations } from '@/lib/types';

interface TaskCardContentProps {
  task: TaskWithRelations;
  onToggleDone: (taskId: string, done: boolean) => void;
  onChangeColor: (taskId: string, cor: TarefaCor | null) => void;
}

export function TaskCardContent({ task, onToggleDone, onChangeColor }: TaskCardContentProps) {
  const checklistTotal = task.task_checklist.length;
  const checklistDone = task.task_checklist.filter(c => c.feito).length;
  const overdue = isOverdue(task.prazo, task.status);
  const dueToday = isToday(task.prazo);
  const labels = task.task_label_links.map(l => l.task_labels);
  const assignees = task.task_assignees.map(a => a.profiles);
  const done = task.status === 'concluida';
  const descricaoPreview = task.descricao ? stripMarkdown(task.descricao) : '';
  const dateRange = formatDateRangeBR(task.inicio, task.prazo);
  const concluidaEmLabel = done && task.concluida_em ? formatShortDateBR(task.concluida_em.slice(0, 10)) : null;
  const checklistPercentClass = checklistTotal > 0 ? checklistToneClass(checklistPercentTone(task.status, task.prazo)) : '';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <span onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} className="mt-0.5">
          <Checkbox checked={done} onCheckedChange={checked => onToggleDone(task.id, checked === true)} className="size-[17px] rounded-full border-muted-foreground/45 data-[state=checked]:border-[#3ddcaa] data-[state=checked]:bg-[#3ddcaa]" />
        </span>
        <p className={cn('flex-1 text-[13px] font-medium leading-5 text-foreground transition-all duration-300', done && 'text-muted-foreground line-through')}>
          {task.titulo}
        </p>
        <span onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-6 opacity-0 transition-opacity group-hover:opacity-100" aria-label="Mais ações da tarefa">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><Palette className="size-3.5" /> Cor</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onChangeColor(task.id, null)}>
                    <span className="size-3 rounded-full border border-border" /> Sem cor
                  </DropdownMenuItem>
                  {CORES_TAREFA.map(cor => (
                    <DropdownMenuItem key={cor} onClick={() => onChangeColor(task.id, cor)}>
                      <span className="size-3 rounded-full" style={{ backgroundColor: COR_TAREFA_VAR[cor] }} /> {COR_TAREFA_LABEL[cor]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      {descricaoPreview && (
        <p className="line-clamp-2 pl-7 text-[11px] leading-4 text-muted-foreground">{descricaoPreview}</p>
      )}

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

      {concluidaEmLabel ? (
        <div className="flex items-center gap-1 pl-7 text-[10px] font-medium text-[#3ddcaa]">
          <CheckCircle2 className="size-3.5" />
          Concluída em {concluidaEmLabel}
        </div>
      ) : dateRange && (
        <div className={cn('flex items-center gap-1 pl-7 text-[10px] text-muted-foreground', overdue && !done && 'font-medium text-destructive')} style={dueToday && !overdue ? { color: 'var(--chart-4)' } : undefined}>
          <Calendar className="size-3.5" />
          {dateRange}
        </div>
      )}

      <div className="flex items-center justify-between pl-7">
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
          <PriorityIcon prioridade={task.prioridade} />
          {checklistTotal > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks className="size-3.5" />
              {checklistDone}/{checklistTotal} · <span className={cn('text-xs font-semibold', checklistPercentClass)}>{Math.round((checklistDone / checklistTotal) * 100)}%</span>
            </span>
          )}
        </div>
        <AvatarStack profiles={assignees} max={3} />
      </div>
    </div>
  );
}
