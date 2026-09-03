import { useState } from 'react';
import { Check, Plus, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TaskLabel } from '@/lib/types';

const CORES = ['#A8632F', '#6B8F71', '#8A5A3D', '#C9A15A', '#4A4238', '#7A8FA6'];

interface LabelPickerProps {
  planLabels: TaskLabel[];
  selected: TaskLabel[];
  onChange: (labelIds: string[]) => void;
  onCreateLabel: (nome: string, cor: string) => Promise<TaskLabel | null>;
}

export function LabelPicker({ planLabels, selected, onChange, onCreateLabel }: LabelPickerProps) {
  const [novoNome, setNovoNome] = useState('');
  const selectedIds = new Set(selected.map(l => l.id));

  const toggle = (id: string) => {
    const next = selectedIds.has(id) ? selected.filter(l => l.id !== id).map(l => l.id) : [...selectedIds, id];
    onChange(Array.from(new Set(next)));
  };

  const handleCreate = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    const cor = CORES[planLabels.length % CORES.length];
    const created = await onCreateLabel(nome, cor);
    if (created) {
      onChange([...Array.from(selectedIds), created.id]);
      setNovoNome('');
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Labels</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map(label => (
          <span key={label.id} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: label.cor }}>
            {label.nome}
          </span>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="Gerenciar labels">
              <Tag />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {planLabels.map(label => (
                    <CommandItem key={label.id} value={label.nome} onSelect={() => toggle(label.id)}>
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: label.cor }} />
                      {label.nome}
                      {selectedIds.has(label.id) && <Check className="ml-auto size-3.5" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
                <div className="flex items-center gap-1 p-1.5">
                  <Input
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="Nova label"
                    className="h-7 text-xs"
                  />
                  <Button size="icon-xs" variant="ghost" onClick={handleCreate} aria-label="Criar label">
                    <Plus />
                  </Button>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
