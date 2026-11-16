import { DateField } from './date-field';
import { formatDateTimeBR } from '@/lib/date';
import { useRef, useState, type KeyboardEvent } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { checklistToneClass, cn } from '@/lib/utils';
import { checklistPercentTone } from '@/lib/date';
import type { ChecklistItem } from '@/lib/types';

type Schedule = Pick<ChecklistItem, 'inicio' | 'inicio_hora' | 'prazo' | 'prazo_hora'>;

interface ChecklistSectionProps {
  items: ChecklistItem[];
  status: string;
  prazo: string | null;
  inicio: string | null;
  inicioHora: string | null;
  onSchedule: (itemId: string, patch: Partial<Schedule>) => void;
  onAdd: (texto: string, schedule: Schedule) => Promise<boolean>;
  onToggle: (itemId: string, feito: boolean) => void;
  onEdit: (itemId: string, texto: string) => void;
  onDelete: (itemId: string) => void;
  onReorder: (items: ChecklistItem[]) => void;
}

function ChecklistRow({ item, onToggle, onEdit, onDelete, onSchedule }: { item: ChecklistItem; onSchedule: (patch: Partial<Schedule>) => void; onToggle: (feito: boolean) => void; onEdit: (texto: string) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.texto);

  const submitEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.texto) onEdit(trimmed);
    else setDraft(item.texto);
    setEditing(false);
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitEdit();
    if (e.key === 'Escape') {
      setDraft(item.texto);
      setEditing(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="group space-y-2 rounded-md border border-border/60 p-2">
      <div className="flex items-center gap-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-3.5" />
      </button>
      <Checkbox checked={item.feito} onCheckedChange={checked => onToggle(checked === true)} />
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onFocus={e => e.target.select()}
          onBlur={submitEdit}
          onKeyDown={handleEditKeyDown}
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={cn('flex-1 cursor-default text-sm', item.feito && 'text-muted-foreground line-through')}
          title="Duplo clique para editar"
        >
          {item.texto}
        </span>
      )}
      <button onClick={onDelete} className="text-muted-foreground/40 opacity-0 hover:text-destructive group-hover:opacity-100">
        <X className="size-3.5" />
      </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DateField label="Início" value={item.inicio} time={item.inicio_hora} onChange={inicio => onSchedule({ inicio, ...(!inicio ? { inicio_hora: null } : {}) })} onTimeChange={inicio_hora => onSchedule({ inicio_hora })} />
        <DateField label="Fim previsto" value={item.prazo} time={item.prazo_hora} onChange={prazo => onSchedule({ prazo, ...(!prazo ? { prazo_hora: null } : {}) })} onTimeChange={prazo_hora => onSchedule({ prazo_hora })} />
      </div>
      {item.feito && <p className="text-xs text-muted-foreground">{item.concluida_em ? `Concluído em ${formatDateTimeBR(item.concluida_em)}` : 'Concluído · horário não registrado'}</p>}
    </div>
  );
}

export function ChecklistSection({ items, status, prazo, inicio, inicioHora, onSchedule, onAdd, onToggle, onEdit, onDelete, onReorder }: ChecklistSectionProps) {
  const [novoTexto, setNovoTexto] = useState('');
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const [draftSchedule, setDraftSchedule] = useState<Partial<Schedule>>({});
  const schedule: Schedule = { inicio, inicio_hora: inicioHora, prazo: null, prazo_hora: null, ...draftSchedule };
  const patchSchedule = (patch: Partial<Schedule>) => setDraftSchedule(previous => ({ ...previous, ...patch }));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const submit = async () => {
    const trimmed = novoTexto.trim();
    if (!trimmed || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      if (await onAdd(trimmed, schedule)) {
        setDraftSchedule({});
        setNovoTexto('');
      }
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
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
  const percentClass = items.length > 0 ? checklistToneClass(checklistPercentTone(status, prazo)) : '';

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Checklist {items.length > 0 && (
          <>
            ({done}/{items.length} · <span className={cn('text-sm font-semibold', percentClass)}>{Math.round((done / items.length) * 100)}%</span>)
          </>
        )}
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map(item => (
              <ChecklistRow
                key={item.id}
                item={item}
                onSchedule={patch => onSchedule(item.id, patch)}
                onToggle={feito => onToggle(item.id, feito)}
                onEdit={texto => onEdit(item.id, texto)}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="grid grid-cols-2 gap-2">
        <DateField label="Início do novo item" value={schedule.inicio} time={schedule.inicio_hora} onChange={inicio => patchSchedule({ inicio, ...(!inicio ? { inicio_hora: null } : {}) })} onTimeChange={inicio_hora => patchSchedule({ inicio_hora })} />
        <DateField label="Fim previsto do novo item" value={schedule.prazo} time={schedule.prazo_hora} onChange={prazo => patchSchedule({ prazo, ...(!prazo ? { prazo_hora: null } : {}) })} onTimeChange={prazo_hora => patchSchedule({ prazo_hora })} />
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          disabled={adding}
          value={novoTexto}
          onChange={e => setNovoTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar item"
          className="h-8 text-sm"
        />
        <Button size="icon-sm" variant="ghost" disabled={adding} onClick={() => void submit()} aria-label="Adicionar item">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
