import { useState, type KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TaskCard } from '@/components/tarefas/task-card';
import type { BucketWithTasks } from '@/lib/types';

interface BucketColumnProps {
  bucket: BucketWithTasks;
  onRename: (bucketId: string, nome: string) => void;
  onCreateTask: (bucketId: string, titulo: string) => void;
  onToggleDone: (taskId: string, done: boolean) => void;
  onOpenTask: (taskId: string) => void;
}

export function BucketColumn({ bucket, onRename, onCreateTask, onToggleDone, onOpenTask }: BucketColumnProps) {
  const { setNodeRef } = useDroppable({ id: bucket.id });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(bucket.nome);
  const [adding, setAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const submitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== bucket.nome) onRename(bucket.id, trimmed);
    else setNameDraft(bucket.nome);
    setEditingName(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitRename();
    if (e.key === 'Escape') {
      setNameDraft(bucket.nome);
      setEditingName(false);
    }
  };

  const submitCreate = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) return;
    onCreateTask(bucket.id, trimmed);
    setTitleDraft('');
  };

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitCreate();
    if (e.key === 'Escape') {
      setTitleDraft('');
      setAdding(false);
    }
  };

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={submitRename}
            onKeyDown={handleNameKeyDown}
            className="h-7 text-sm font-medium"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingName(true)}
            className="cursor-default text-sm font-medium text-foreground"
            title="Duplo clique para renomear"
          >
            {bucket.nome} <span className="text-muted-foreground">({bucket.tasks.length})</span>
          </h3>
        )}
      </div>

      <SortableContext items={bucket.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-10 flex-col gap-2">
          {bucket.tasks.map(task => (
            <TaskCard key={task.id} task={task} onToggleDone={onToggleDone} onOpen={onOpenTask} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <Input
          autoFocus
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onKeyDown={handleAddKeyDown}
          onBlur={() => {
            if (!titleDraft.trim()) setAdding(false);
          }}
          placeholder="Título da tarefa"
          className="h-8 text-sm"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" /> Adicionar tarefa
        </button>
      )}
    </div>
  );
}
