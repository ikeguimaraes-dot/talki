import { MessageSquare } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { EmptyState } from '@/components/state/empty-state';

export function MensagensPage() {
  usePageHeader({ title: 'Mensagens' });

  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <EmptyState
        icon={MessageSquare}
        title="Integração com o Mattermost chega em breve"
        description="O chat embedado, sem bordas duplas e com skeleton de carregamento, é finalizado no último bloco."
      />
    </div>
  );
}
