import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/kanban';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function KanbanSelect({ value, onChange, disabled, label = 'Coluna no Kanban' }: {
  value: string | null;
  onChange: (value: KanbanStatus | null) => void | Promise<unknown>;
  disabled?: boolean;
  label?: string;
}) {
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  async function change(next: string) {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    try {
      await onChange(next === 'none' ? null : next as KanbanStatus);
    } catch {
      toast.error('Não foi possível salvar a coluna do Kanban. Tente novamente.');
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }
  return <div className="space-y-1" aria-busy={saving}><Select value={value ?? 'none'} onValueChange={next => void change(next)} disabled={disabled || saving}>
    <SelectTrigger className="w-full" aria-label={label}><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="none">Fora do Kanban</SelectItem>
      {KANBAN_COLUMNS.map(column => <SelectItem key={column.value} value={column.value}>{column.label}</SelectItem>)}
    </SelectContent>
  </Select>{saving && <p role="status" className="text-xs text-muted-foreground">Salvando…</p>}</div>;
}
