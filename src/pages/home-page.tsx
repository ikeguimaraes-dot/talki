import { Sparkles } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EmptyState } from '@/components/state/empty-state';

export function HomePage() {
  const user = useCurrentUser();
  const firstName = (user.user_metadata?.name || user.email || 'você').split(' ')[0];

  usePageHeader({ title: 'Início' });

  return (
    <div className="space-y-6">
      <p className="text-2xl font-semibold text-foreground">Olá, {firstName}</p>
      <EmptyState
        icon={Sparkles}
        title="Seu painel pessoal está a caminho"
        description="Em breve você verá aqui suas tarefas de hoje, atrasadas e os últimos comunicados."
      />
    </div>
  );
}
