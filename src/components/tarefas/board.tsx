import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { BucketColumn } from '@/components/tarefas/bucket-column';
import { AddBucketButton } from '@/components/tarefas/add-bucket-button';
import { TaskCard } from '@/components/tarefas/task-card';
import type { BucketWithTasks, TaskWithRelations } from '@/lib/types';

interface BoardProps {
  buckets: BucketWithTasks[];
  setBuckets: React.Dispatch<React.SetStateAction<BucketWithTasks[]>>;
  onRenameBucket: (bucketId: string, nome: string) => void;
  onCreateBucket: (nome: string) => void;
  onCreateTask: (bucketId: string, titulo: string) => void;
  onToggleDone: (taskId: string, done: boolean) => void;
  onOpenTask: (taskId: string) => void;
  onPersistOrder: (affectedBucketIds: string[]) => void;
}

export function Board({
  buckets,
  setBuckets,
  onRenameBucket,
  onCreateBucket,
  onCreateTask,
  onToggleDone,
  onOpenTask,
  onPersistOrder,
}: BoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findContainer = (id: string) => {
    if (buckets.some(b => b.id === id)) return id;
    return buckets.find(b => b.tasks.some(t => t.id === id))?.id;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = buckets.flatMap(b => b.tasks).find(t => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setBuckets(prev => {
      const activeBucket = prev.find(b => b.id === activeContainer);
      if (!activeBucket) return prev;
      const task = activeBucket.tasks.find(t => t.id === active.id);
      if (!task) return prev;

      return prev.map(b => {
        if (b.id === activeContainer) return { ...b, tasks: b.tasks.filter(t => t.id !== active.id) };
        if (b.id === overContainer) {
          const overIndex = b.tasks.findIndex(t => t.id === over.id);
          const newTasks = [...b.tasks];
          newTasks.splice(overIndex >= 0 ? overIndex : newTasks.length, 0, { ...task, bucket_id: overContainer });
          return { ...b, tasks: newTasks };
        }
        return b;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) return;

    if (activeContainer === overContainer && active.id !== over.id) {
      setBuckets(prev =>
        prev.map(b => {
          if (b.id !== activeContainer) return b;
          const oldIndex = b.tasks.findIndex(t => t.id === active.id);
          const newIndex = b.tasks.findIndex(t => t.id === over.id);
          if (oldIndex < 0 || newIndex < 0) return b;
          return { ...b, tasks: arrayMove(b.tasks, oldIndex, newIndex) };
        })
      );
    }

    onPersistOrder([activeContainer, overContainer]);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {buckets.map(bucket => (
          <BucketColumn
            key={bucket.id}
            bucket={bucket}
            onRename={onRenameBucket}
            onCreateTask={onCreateTask}
            onToggleDone={onToggleDone}
            onOpenTask={onOpenTask}
          />
        ))}
        <AddBucketButton onCreate={onCreateBucket} />
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onToggleDone={() => {}} dragOverlay />}
      </DragOverlay>
    </DndContext>
  );
}
