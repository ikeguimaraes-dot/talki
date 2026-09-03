import { useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AddBucketButton({ onCreate }: { onCreate: (nome: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [nome, setNome] = useState('');

  const submit = () => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNome('');
    setAdding(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') {
      setNome('');
      setAdding(false);
    }
  };

  if (adding) {
    return (
      <div className="glass-soft w-[294px] shrink-0 rounded-[20px] p-3">
        <Input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!nome.trim()) setAdding(false);
          }}
          placeholder="Nome do bucket"
          className="h-10 rounded-xl bg-background/50"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex h-12 w-[294px] shrink-0 items-center justify-center gap-2 rounded-[16px] border border-dashed border-border bg-muted/20 px-3 text-xs font-medium text-muted-foreground transition-all duration-300 hover:border-primary/35 hover:bg-accent/60 hover:text-foreground"
    >
      <Plus className="size-3.5" /> Novo bucket
    </button>
  );
}
