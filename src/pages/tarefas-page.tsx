import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, FolderKanban, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EmptyState } from '@/components/state/empty-state';
import { ErrorState } from '@/components/state/error-state';
import { CardGridSkeleton } from '@/components/state/page-skeleton';
import { Button } from '@/components/ui/button';
import { StatTile } from '@/components/tarefas/stat-tile';
import { PlanCard } from '@/components/tarefas/plan-card';
import { CreatePlanDialog } from '@/components/tarefas/create-plan-dialog';
import { isOverdue, isToday, isWithinNextDays } from '@/lib/date';
import type { PlanWithMembers } from '@/lib/types';

interface AssignedCounts {
  atrasadas: number;
  hoje: number;
  proximos7Dias: number;
}

export function TarefasPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanWithMembers[] | null>(null);
  const [counts, setCounts] = useState<AssignedCounts>({ atrasadas: 0, hoje: 0, proximos7Dias: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [plansRes, assignedRes] = await Promise.all([
        supabase
          .from('plans')
          .select('*, plan_members(profiles(id, nome, email, avatar_url)), tasks(id, status)')
          .order('criado_em', { ascending: false }),
        supabase
          .from('task_assignees')
          .select('tasks!inner(prazo, status)')
          .eq('user_id', user.id),
      ]);

      if (plansRes.error) throw plansRes.error;
      if (assignedRes.error) throw assignedRes.error;

      setPlans(plansRes.data as unknown as PlanWithMembers[]);

      const abertas = assignedRes.data
        .map(row => row.tasks)
        .filter((t): t is { prazo: string | null; status: string } => !!t && t.status !== 'concluida');

      setCounts({
        atrasadas: abertas.filter(t => isOverdue(t.prazo, t.status)).length,
        hoje: abertas.filter(t => isToday(t.prazo)).length,
        proximos7Dias: abertas.filter(t => isWithinNextDays(t.prazo, 7)).length,
      });
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() manages its own loading flag
    load();
  }, [load]);

  const headerActions = useMemo(
    () => (
      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus /> Novo plano
      </Button>
    ),
    []
  );

  usePageHeader({ title: 'Projetos' }, headerActions);

  return (
    <div className="space-y-8 pb-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2"><Sparkles className="size-3 text-primary" /> Seu espaço de trabalho</p>
          <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.055em]">Projetos em movimento.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Visão clara do que está acontecendo, do que precisa de atenção e do que já ganhou forma.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Pedem atenção" value={counts.atrasadas} tone="destructive" />
        <StatTile label="Para hoje" value={counts.hoje} />
        <StatTile label="Próximos 7 dias" value={counts.proximos7Dias} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.025em]">Seus projetos</h2>
            <p className="mt-1 text-xs text-muted-foreground">Escolha um projeto para entrar no fluxo.</p>
          </div>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">{plans?.length ?? 0} ativos <ArrowUpRight className="size-3" /></span>
        </div>

        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <ErrorState message="Não foi possível carregar seus planos." onRetry={load} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum plano ainda"
            description="Crie um plano pra começar a organizar as tarefas da sua equipe."
            action={<Button onClick={() => setDialogOpen(true)}><Plus /> Novo plano</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </section>

      <CreatePlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={user.id}
        onCreated={plan => navigate(`/tarefas/${plan.id}`)}
      />
    </div>
  );
}
