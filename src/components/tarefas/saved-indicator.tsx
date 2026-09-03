import { Check, Loader2 } from 'lucide-react';
import type { AutosaveStatus } from '@/hooks/use-autosave-field';

export function SavedIndicator({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {status === 'saving' ? (
        <>
          <Loader2 className="size-3 animate-spin" /> Salvando...
        </>
      ) : (
        <>
          <Check className="size-3" /> Salvo
        </>
      )}
    </span>
  );
}
