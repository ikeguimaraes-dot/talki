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
      <div className="w-72 shrink-0">
        <Input
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!nome.trim()) setAdding(false);
          }}
          placeholder="Nome do bucket"
          className="h-9"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex h-9 w-72 shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:text-foreground"
    >
      <Plus className="size-3.5" /> Novo bucket
    </button>
  );
}
