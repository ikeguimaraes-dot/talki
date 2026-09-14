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
import { isOverdue, isToday } from '@/lib/date';
import type { PlanWithMembers } from '@/lib/types';

interface TaskCounts {
  emAberto: number;
  paraHoje: number;
  atrasadas: number;
  concluidas: number;
}

export function TarefasPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanWithMembers[] | null>(null);
  const [counts, setCounts] = useState<TaskCounts>({ emAberto: 0, paraHoje: 0, atrasadas: 0, concluidas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: plansError } = await supabase
        .from('plans')
        .select('*, plan_members(profiles(id, nome, email, avatar_url)), tasks(id, status, prazo)')
        .order('criado_em', { ascending: false });

      if (plansError) throw plansError;

      const typedPlans = data as unknown as PlanWithMembers[];
      setPlans(typedPlans);

      const allTasks = typedPlans.flatMap(plan => plan.tasks);
      const abertas = allTasks.filter(t => t.status !== 'concluida');

      setCounts({
        emAberto: abertas.length,
        paraHoje: abertas.filter(t => isToday(t.prazo)).length,
        atrasadas: abertas.filter(t => isOverdue(t.prazo, t.status)).length,
        concluidas: allTasks.filter(t => t.status === 'concluida').length,
      });
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() manages its own loading flag
    load();
  }, [load]);

  const headerActions = useMemo(
    () => (
      <Button size="sm" onClick={() => setDialogOpen(true)}>
        <Plus /> Novo projeto
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

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Em aberto" value={counts.emAberto} />
        <StatTile label="Para hoje" value={counts.paraHoje} />
        <StatTile label="Atrasadas" value={counts.atrasadas} tone="destructive" />
        <StatTile label="Concluídas" value={counts.concluidas} />
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
          <ErrorState message="Não foi possível carregar seus projetos." onRetry={load} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum projeto ainda"
            description="Crie um projeto pra começar a organizar as tarefas da sua equipe."
            action={<Button onClick={() => setDialogOpen(true)}><Plus /> Novo projeto</Button>}
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
