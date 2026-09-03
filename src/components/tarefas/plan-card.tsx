import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AvatarStack } from '@/components/tarefas/avatar-stack';
import type { PlanWithMembers } from '@/lib/types';

export function PlanCard({ plan }: { plan: PlanWithMembers }) {
  const total = plan.tasks.length;
  const concluidas = plan.tasks.filter(t => t.status === 'concluida').length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <Link
      to={`/tarefas/${plan.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: plan.cor }} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{plan.nome}</h3>
          {plan.descricao && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{plan.descricao}</p>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{concluidas}/{total} concluídas</span>
          <AvatarStack profiles={plan.plan_members.map(m => m.profiles)} />
        </div>
        <Progress value={progresso} className="h-1.5" />
      </div>
    </Link>
  );
}
