import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
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

  usePageHeader({ title: 'Tarefas' }, headerActions);

  return (
    <div className="space-y-8">
      <section className="flex gap-4">
        <StatTile label="Atrasadas" value={counts.atrasadas} tone="destructive" />
        <StatTile label="Hoje" value={counts.hoje} />
        <StatTile label="Próximos 7 dias" value={counts.proximos7Dias} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Meus planos</h2>

        {loading ? (
          <CardGridSkeleton />
        ) : error ? (
          <ErrorState message="Não foi possível carregar seus planos." onRetry={load} />
        ) : !plans || plans.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nenhum plano ainda"
            description="Crie um plano pra começar a organizar as tarefas da sua equipe."
            action={<Button onClick={() => setDialogOpen(true)}><Plus /> Novo plano</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
