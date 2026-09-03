import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isOverdue, todayIso } from '@/lib/date';
import type { BucketWithTasks, TaskWithRelations } from '@/lib/types';

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - firstOfMonth.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

function UnscheduledChip({ task, onOpen }: { task: TaskWithRelations; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      className="cursor-grab rounded-md border border-border bg-card px-2 py-1.5 text-xs shadow-sm active:cursor-grabbing"
    >
      {task.titulo}
    </div>
  );
}

function DayCell({ day, isCurrentMonth, tasks, onOpen }: { day: Date; isCurrentMonth: boolean; tasks: TaskWithRelations[]; onOpen: (id: string) => void }) {
  const iso = toIso(day);
  const { setNodeRef, isOver } = useDroppable({ id: iso });
  const isToday = iso === todayIso();
  const visible = tasks.slice(0, 3);
  const overflow = tasks.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5',
        !isCurrentMonth && 'bg-muted/30',
        isOver && 'bg-accent'
      )}
    >
      <span className={cn('text-xs', isToday ? 'flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground')}>
        {day.getDate()}
      </span>
      <div className="space-y-1">
        {visible.map(task => (
          <button
            key={task.id}
            onClick={() => onOpen(task.id)}
            className={cn(
              'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]',
              isOverdue(task.prazo, task.status) ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'
            )}
          >
            {task.titulo}
          </button>
        ))}
        {overflow > 0 && <p className="px-1.5 text-[11px] text-muted-foreground">+{overflow} mais</p>}
      </div>
    </div>
  );
}

export function AgendaView({ buckets, onOpenTask, onUpdateFields }: {
  buckets: BucketWithTasks[];
  onOpenTask: (taskId: string) => void;
  onUpdateFields: (taskId: string, patch: Record<string, unknown>) => void;
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasks = useMemo(() => buckets.flatMap(b => b.tasks), [buckets]);
  const semPrazo = useMemo(() => tasks.filter(t => !t.prazo), [tasks]);
  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const task of tasks) {
      if (!task.prazo) continue;
      map.set(task.prazo, [...(map.get(task.prazo) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    onUpdateFields(event.active.id as string, { prazo: event.over.id as string });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border p-2">
            <h3 className="pl-2 text-sm font-medium text-foreground">
              {MESES[monthAnchor.getMonth()]} de {monthAnchor.getFullYear()}
            </h3>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
                <ChevronLeft />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMonthAnchor(new Date())}>Hoje</Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-t border-l border-border">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="border-b border-r border-border bg-muted/30 py-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
                {d}
              </div>
            ))}
            {days.map(day => (
              <DayCell
                key={day.toISOString()}
                day={day}
                isCurrentMonth={day.getMonth() === monthAnchor.getMonth()}
                tasks={tasksByDay.get(toIso(day)) ?? []}
                onOpen={onOpenTask}
              />
            ))}
          </div>
        </div>

        <div className="w-56 shrink-0 space-y-2">
          <h3 className="text-sm font-medium text-foreground">Sem prazo</h3>
          <div className="space-y-1.5">
            {semPrazo.map(task => (
              <UnscheduledChip key={task.id} task={task} onOpen={onOpenTask} />
            ))}
            {semPrazo.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tarefa sem prazo.</p>}
          </div>
        </div>
      </div>
    </DndContext>
  );
}
