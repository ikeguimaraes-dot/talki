import { Link } from 'react-router-dom';
import { ArrowUpRight, Layers3 } from 'lucide-react';
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
      className="premium-card group relative flex min-h-52 flex-col overflow-hidden rounded-[20px] p-5"
    >
      <div className="absolute -right-14 -top-16 size-40 rounded-full opacity-15 blur-3xl transition-opacity duration-500 group-hover:opacity-25" style={{ backgroundColor: plan.cor }} />
      <div className="relative flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] border border-white/10 bg-muted/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Layers3 className="size-4" style={{ color: plan.cor }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.025em] text-foreground">{plan.nome}</h3>
          {plan.descricao && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{plan.descricao}</p>
          )}
        </div>
        <ArrowUpRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-muted-foreground" />
      </div>

      <div className="relative mt-auto space-y-3 pt-8">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span><strong className="font-semibold text-foreground">{progresso}%</strong> concluído</span>
          <AvatarStack profiles={plan.plan_members.map(m => m.profiles)} />
        </div>
        <Progress value={progresso} className="h-1.5 bg-muted [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-primary [&_[data-slot=progress-indicator]]:to-[#4ba5ff]" />
        <p className="text-[10px] text-muted-foreground">{concluidas} de {total} tarefas finalizadas</p>
      </div>
    </Link>
  );
}
