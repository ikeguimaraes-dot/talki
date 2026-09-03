import { Megaphone } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { EmptyState } from '@/components/state/empty-state';

export function ComunicadosPage() {
  usePageHeader({ title: 'Comunicados' });

  return (
    <EmptyState
      icon={Megaphone}
      title="Nenhum comunicado publicado ainda"
      description="A publicação de comunicados chega em uma próxima fase do produto."
    />
  );
}
