import { TaskCardContent } from '@/components/tarefas/task-card-content';
import type { TaskGroup } from '@/lib/board-filters';
import { COR_TAREFA_VAR, type TarefaCor } from '@/lib/types';

interface GroupedColumnsProps {
  groups: TaskGroup[];
  onToggleDone: (taskId: string, done: boolean) => void;
  onChangeColor: (taskId: string, cor: TarefaCor | null) => void;
  onOpenTask: (taskId: string) => void;
}

export function GroupedColumns({ groups, onToggleDone, onChangeColor, onOpenTask }: GroupedColumnsProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(group => (
        <div key={group.id} className="flex w-72 shrink-0 flex-col gap-2">
          <h3 className="px-1 text-sm font-medium text-foreground">
            {group.label} <span className="text-muted-foreground">({group.tasks.length})</span>
          </h3>
          <div className="flex flex-col gap-2">
            {group.tasks.map(task => {
              const corVar = task.cor && task.cor in COR_TAREFA_VAR ? COR_TAREFA_VAR[task.cor as TarefaCor] : null;
              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task.id)}
                  style={corVar ? { borderLeft: `3px solid ${corVar}` } : undefined}
                  className="group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow duration-150 hover:shadow-md"
                >
                  <TaskCardContent task={task} onToggleDone={onToggleDone} onChangeColor={onChangeColor} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
