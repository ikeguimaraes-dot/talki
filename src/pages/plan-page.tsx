import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart3, CalendarDays, KanbanSquare, List, ListChecks, MoreHorizontal, Sparkles, Trash2, Users } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { usePlanBoard } from '@/hooks/use-plan-board';
import { EmptyState } from '@/components/state/empty-state';
import { ErrorState } from '@/components/state/error-state';
import { ListSkeleton } from '@/components/state/page-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Board } from '@/components/tarefas/board';
import { BoardToolbar } from '@/components/tarefas/board-toolbar';
import { GroupedColumns } from '@/components/tarefas/grouped-columns';
import { ListaView } from '@/components/tarefas/lista-view';
import { GraficosView } from '@/components/tarefas/graficos-view';
import { AgendaView } from '@/components/tarefas/agenda-view';
import { TaskDetailSheet } from '@/components/tarefas/task-detail-sheet';
import { ManagePlanMembersDialog } from '@/components/tarefas/manage-plan-members-dialog';
import { FILTROS_VAZIOS, groupTasks, groupTasksByBucket, hasActiveFilters, taskMatchesFilters, type BoardFilters, type GroupBy } from '@/lib/board-filters';
import type { TaskLabel } from '@/lib/types';

type ViewTab = 'quadro' | 'lista' | 'graficos' | 'agenda';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
}

export function PlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [searchParams, setSearchParams] = useSearchParams();
  const board = usePlanBoard(planId!);
  const { plan, buckets, setBuckets, loading, error, reload, createBucket, renameBucket, createTask, toggleTaskDone, persistTasksOrder, updateTaskFields, addPlanMember, removePlanMember, deletePlan } = board;

  const [tab, setTab] = useState<ViewTab>('quadro');
  const [groupBy, setGroupBy] = useState<GroupBy>('bucket');
  const [filters, setFilters] = useState<BoardFilters>(FILTROS_VAZIOS);
  const [membersOpen, setMembersOpen] = useState(false);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);

  const openTaskId = searchParams.get('tarefa');
  const openTask = (taskId: string) => setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('tarefa', taskId); return next; });
  const closeTask = () => setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('tarefa'); return next; });

  usePageHeader({
    title: plan?.nome ?? 'Plano',
    breadcrumb: [{ label: 'Tarefas', href: '/tarefas' }],
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('board-search')?.focus();
      }

      if (e.key.toLowerCase() === 'n' && tab === 'quadro' && buckets.length > 0) {
        e.preventDefault();
        createTask(buckets[0].id, 'Nova tarefa', user.id).then(created => {
          if (created) openTask(created.id);
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, buckets, user.id]);

  const members = useMemo(() => plan?.plan_members.map(m => m.profiles) ?? [], [plan]);

  const labels = useMemo(() => {
    const all = buckets.flatMap(b => b.tasks.flatMap(t => t.task_label_links.map(l => l.task_labels)));
    const seen = new Map<string, TaskLabel>();
    for (const label of all) seen.set(label.id, label);
    return Array.from(seen.values());
  }, [buckets]);

  const filtersActive = hasActiveFilters(filters);
  const showInteractiveBoard = groupBy === 'bucket' && !filtersActive;

  const staticGroups = useMemo(() => {
    if (showInteractiveBoard) return [];
    if (groupBy === 'bucket') return groupTasksByBucket(buckets, filters);
    const flatTasks = buckets.flatMap(b => b.tasks).filter(t => taskMatchesFilters(t, filters));
    return groupTasks(flatTasks, groupBy, members);
  }, [showInteractiveBoard, groupBy, buckets, filters, members]);

  if (loading) {
    return (
      <div className="space-y-4">
        <ListSkeleton rows={6} />
      </div>
    );
  }

  if (error || !plan) {
    return <ErrorState message="Não foi possível carregar este plano." onRetry={reload} />;
  }

  const canManagePlan = isAdmin || plan.criado_por === user.id;

  const handleDeletePlan = async () => {
    setDeletingPlan(true);
    const ok = await deletePlan();
    setDeletingPlan(false);
    if (ok) {
      toast.success('Projeto excluído.');
      navigate('/tarefas', { replace: true });
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <section className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2"><Sparkles className="size-3 text-primary" /> Workspace ativo</p>
          <h2 className="gradient-text text-[clamp(1.8rem,3.2vw,2.8rem)] font-semibold leading-[1.08] tracking-[-0.05em]">{plan.nome}</h2>
          {plan.descricao && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{plan.descricao}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="neon-orb size-1.5 rounded-full bg-[#3ddcaa] text-[#3ddcaa]" /> Sincronizado agora
          </span>
          {canManagePlan && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
                <Users /> Membros
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Mais ações do projeto"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={() => setDeletePlanOpen(true)}><Trash2 /> Excluir projeto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </section>

      <Tabs value={tab} onValueChange={v => setTab(v as ViewTab)}>
        <TabsList className="h-10 rounded-xl border border-border bg-muted/55 p-1">
          <TabsTrigger value="quadro" className="h-8 gap-2 rounded-lg px-3 text-xs data-active:bg-card"><KanbanSquare className="size-3.5" /> Quadro</TabsTrigger>
          <TabsTrigger value="lista" className="h-8 gap-2 rounded-lg px-3 text-xs data-active:bg-card"><List className="size-3.5" /> Lista</TabsTrigger>
          <TabsTrigger value="graficos" className="h-8 gap-2 rounded-lg px-3 text-xs data-active:bg-card"><BarChart3 className="size-3.5" /> Gráficos</TabsTrigger>
          <TabsTrigger value="agenda" className="h-8 gap-2 rounded-lg px-3 text-xs data-active:bg-card"><CalendarDays className="size-3.5" /> Agenda</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'quadro' && (
        <>
          <BoardToolbar
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            filters={filters}
            onFiltersChange={setFilters}
            members={members}
            labels={labels}
          />

          {showInteractiveBoard ? (
            <Board
              buckets={buckets}
              setBuckets={setBuckets}
              onRenameBucket={renameBucket}
              onCreateBucket={createBucket}
              onCreateTask={(bucketId, titulo) => createTask(bucketId, titulo, user.id)}
              onToggleDone={toggleTaskDone}
              onChangeColor={(taskId, cor) => updateTaskFields(taskId, { cor })}
              onOpenTask={openTask}
              onPersistOrder={persistTasksOrder}
            />
          ) : staticGroups.length === 0 ? (
            <EmptyState icon={ListChecks} title="Nenhuma tarefa encontrada" description="Ajuste os filtros ou o agrupamento." />
          ) : (
            <GroupedColumns groups={staticGroups} onToggleDone={toggleTaskDone} onChangeColor={(taskId, cor) => updateTaskFields(taskId, { cor })} onOpenTask={openTask} />
          )}
        </>
      )}

      {tab === 'lista' && (
        <ListaView buckets={buckets} onOpenTask={openTask} onUpdateFields={(taskId, patch) => updateTaskFields(taskId, patch)} />
      )}

      {tab === 'graficos' && <GraficosView buckets={buckets} />}

      {tab === 'agenda' && (
        <AgendaView
          buckets={buckets}
          onOpenTask={openTask}
          onUpdateFields={(taskId, patch) => {
            updateTaskFields(taskId, patch).then(ok => {
              if (ok) toast.success('Prazo atualizado.');
            });
          }}
        />
      )}

      <TaskDetailSheet
        taskId={openTaskId}
        onOpenChange={open => !open && closeTask()}
        board={board}
        isAdmin={isAdmin}
        onManageMembers={() => setMembersOpen(true)}
      />

      <ManagePlanMembersDialog
        open={membersOpen}
        onOpenChange={setMembersOpen}
        plan={plan}
        buckets={buckets}
        onAddMember={addPlanMember}
        onRemoveMember={removePlanMember}
      />

      <AlertDialog open={deletePlanOpen} onOpenChange={setDeletePlanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{plan.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Todas as tarefas, buckets e comentários deste projeto serão perdidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPlan}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deletingPlan} onClick={handleDeletePlan}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
