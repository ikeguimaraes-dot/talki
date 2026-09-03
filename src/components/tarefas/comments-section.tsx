import { useState, type KeyboardEvent } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';
import { formatDateBR } from '@/lib/date';
import type { TaskCommentWithProfile } from '@/lib/types';

interface CommentsSectionProps {
  comments: TaskCommentWithProfile[];
  onAdd: (texto: string) => void;
}

export function CommentsSection({ comments, onAdd }: CommentsSectionProps) {
  const [texto, setTexto] = useState('');

  const submit = () => {
    const trimmed = texto.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setTexto('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Comentários</p>

      <div className="space-y-3">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-2">
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                {getInitials(comment.profiles.nome || comment.profiles.email || '?')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-foreground">{comment.profiles.nome || comment.profiles.email}</span>
                <span className="text-[10px] text-muted-foreground">{formatDateBR(comment.criado_em.slice(0, 10))}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{comment.texto}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva um comentário..."
          rows={2}
          className="text-sm"
        />
        <Button size="sm" variant="secondary" onClick={submit} disabled={!texto.trim()}>Comentar</Button>
      </div>
    </div>
  );
}
