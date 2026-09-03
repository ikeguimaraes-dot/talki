import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TaskCardContent } from '@/components/tarefas/task-card-content';
import type { TaskWithRelations } from '@/lib/types';

interface TaskCardProps {
  task: TaskWithRelations;
  onToggleDone: (taskId: string, done: boolean) => void;
  onOpen?: (taskId: string) => void;
  dragOverlay?: boolean;
}

export function TaskCard({ task, onToggleDone, onOpen, dragOverlay = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !dragOverlay ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(task.id)}
      className={cn(
        'premium-card group cursor-grab rounded-[15px] p-3.5 active:cursor-grabbing',
        dragOverlay && 'rotate-2 shadow-2xl'
      )}
    >
      <TaskCardContent task={task} onToggleDone={onToggleDone} />
    </div>
  );
}
