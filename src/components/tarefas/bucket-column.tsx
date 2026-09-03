import { useState, type KeyboardEvent } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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

  const tone = bucket.nome.toLowerCase().includes('conclu') ? '#3ddcaa' : bucket.nome.toLowerCase().includes('andamento') ? '#55a7ff' : '#8c7dff';

  return (
    <div className="glass-soft flex w-[294px] shrink-0 flex-col gap-2 rounded-[20px] p-2.5">
      <div className="flex items-center justify-between px-1.5 py-1.5">
        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onFocus={e => e.target.select()}
            onBlur={submitRename}
            onKeyDown={handleNameKeyDown}
            className="h-8 rounded-lg bg-muted/60 text-sm font-medium"
          />
        ) : (
          <h3
            onDoubleClick={() => setEditingName(true)}
            className="flex cursor-default items-center gap-2 text-[13px] font-semibold text-foreground"
            title="Duplo clique para renomear"
          >
            <span className="neon-orb size-1.5 rounded-full" style={{ backgroundColor: tone, color: tone }} />
            {bucket.nome} <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{bucket.tasks.length}</span>
          </h3>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground" aria-label={`Opções de ${bucket.nome}`}><MoreHorizontal className="size-4" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setEditingName(true)}>Renomear etapa</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SortableContext items={bucket.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2">
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
          className="h-10 rounded-xl border-primary/25 bg-background/50 text-sm"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-muted-foreground transition-all duration-300 hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" /> Adicionar tarefa
        </button>
      )}
    </div>
  );
}
