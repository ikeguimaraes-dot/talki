import { TaskCardContent } from '@/components/tarefas/task-card-content';
import type { TaskGroup } from '@/lib/board-filters';

interface GroupedColumnsProps {
  groups: TaskGroup[];
  onToggleDone: (taskId: string, done: boolean) => void;
  onOpenTask: (taskId: string) => void;
}

export function GroupedColumns({ groups, onToggleDone, onOpenTask }: GroupedColumnsProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(group => (
        <div key={group.id} className="flex w-72 shrink-0 flex-col gap-2">
          <h3 className="px-1 text-sm font-medium text-foreground">
            {group.label} <span className="text-muted-foreground">({group.tasks.length})</span>
          </h3>
          <div className="flex flex-col gap-2">
            {group.tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow duration-150 hover:shadow-md"
              >
                <TaskCardContent task={task} onToggleDone={onToggleDone} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
