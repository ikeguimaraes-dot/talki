import { useState, type KeyboardEvent } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '@/lib/types';

interface ChecklistSectionProps {
  items: ChecklistItem[];
  onAdd: (texto: string) => void;
  onToggle: (itemId: string, feito: boolean) => void;
  onDelete: (itemId: string) => void;
  onReorder: (items: ChecklistItem[]) => void;
}

function ChecklistRow({ item, onToggle, onDelete }: { item: ChecklistItem; onToggle: (feito: boolean) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox checked={item.feito} onCheckedChange={checked => onToggle(checked === true)} />
      <span className={cn('flex-1 text-sm', item.feito && 'text-muted-foreground line-through')}>{item.texto}</span>
      <button onClick={onDelete} className="text-muted-foreground/40 opacity-0 hover:text-destructive group-hover:opacity-100">
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function ChecklistSection({ items, onAdd, onToggle, onDelete, onReorder }: ChecklistSectionProps) {
  const [novoTexto, setNovoTexto] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const submit = () => {
    const trimmed = novoTexto.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNovoTexto('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  const done = items.filter(i => i.feito).length;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Checklist {items.length > 0 && `(${done}/${items.length})`}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div>
            {items.map(item => (
              <ChecklistRow
                key={item.id}
                item={item}
                onToggle={feito => onToggle(item.id, feito)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-1.5">
        <Input
          value={novoTexto}
          onChange={e => setNovoTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar item"
          className="h-8 text-sm"
        />
        <Button size="icon-sm" variant="ghost" onClick={submit} aria-label="Adicionar item">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
