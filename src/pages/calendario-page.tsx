import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateBR, isOverdue, isToday, todayIso } from '@/lib/date';
import { DIAS_SEMANA, MESES, buildMonthGrid, toIso } from '@/lib/calendar-grid';

type DueTone = 'vermelho' | 'ambar' | 'verde';

interface CalendarTask {
  id: string;
  titulo: string;
  planId: string;
  planNome: string;
  prazo: string | null;
  status: string;
}

interface TaskRow {
  id: string;
  titulo: string;
  plan_id: string;
  prazo: string | null;
  status: string;
  plans: { nome: string } | null;
}

const TONE_ORDER: Record<DueTone, number> = { vermelho: 0, ambar: 1, verde: 2 };

const TONE_DOT_CLASS: Record<DueTone, string> = {
  vermelho: 'bg-destructive',
  ambar: 'bg-[#ffb45c]',
  verde: 'bg-[#3ddcaa]',
};

function taskDueTone(task: CalendarTask): DueTone {
  if (isOverdue(task.prazo, task.status)) return 'vermelho';
  if (isToday(task.prazo)) return 'ambar';
  return 'verde';
}

function DayCell({ day, isCurrentMonth, tasks, isSelected, onSelect }: {
  day: Date;
  isCurrentMonth: boolean;
  tasks: CalendarTask[];
  isSelected: boolean;
  onSelect: (iso: string) => void;
}) {
  const iso = toIso(day);
  const isTodayCell = iso === todayIso();
  const tones = Array.from(new Set(tasks.map(taskDueTone))).sort((a, b) => TONE_ORDER[a] - TONE_ORDER[b]);

  return (
    <button
      type="button"
      onClick={() => onSelect(iso)}
      className={cn(
        'flex min-h-20 flex-col gap-1.5 border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/50',
        !isCurrentMonth && 'bg-muted/30',
        isSelected && 'bg-accent hover:bg-accent'
      )}
    >
      <span className={cn('text-xs', isTodayCell ? 'flex size-5 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground' : 'text-muted-foreground')}>
        {day.getDate()}
      </span>
      {tasks.length > 0 && (
        <div className="mt-auto flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {tones.map(tone => <span key={tone} className={cn('size-1.5 rounded-full', TONE_DOT_CLASS[tone])} />)}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{tasks.length}</span>
        </div>
      )}
    </button>
  );
}

export function CalendarioPage() {
  const user = useCurrentUser();
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState<CalendarTask[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(() => todayIso());

  usePageHeader({ title: 'Calendário' });

  useEffect(() => {
    let active = true;

    supabase
      .from('tasks')
      .select('id, titulo, plan_id, prazo, status, plans(nome), task_assignees!inner(user_id)')
      .eq('task_assignees.user_id', user.id)
      .neq('status', 'concluida')
      .then(({ data }) => {
        if (!active) return;
        const mapped: CalendarTask[] = ((data as unknown as TaskRow[]) ?? []).map(row => ({
          id: row.id,
          titulo: row.titulo,
          planId: row.plan_id,
          planNome: row.plans?.nome ?? 'Projeto',
          prazo: row.prazo,
          status: row.status,
        }));
        setTasks(mapped);
      });

    return () => { active = false; };
  }, [user.id]);

  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks ?? []) {
      if (!task.prazo) continue;
      map.set(task.prazo, [...(map.get(task.prazo) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const semPrazo = useMemo(() => (tasks ?? []).filter(task => !task.prazo), [tasks]);
  const overdueCount = useMemo(() => (tasks ?? []).filter(task => isOverdue(task.prazo, task.status)).length, [tasks]);
  const dueTodayCount = useMemo(() => (tasks ?? []).filter(task => isToday(task.prazo)).length, [tasks]);

  const selectedTasks = selectedDay ? tasksByDay.get(selectedDay) ?? [] : [];

  const goToday = () => {
    setMonthAnchor(new Date());
    setSelectedDay(todayIso());
  };

  return (
    <div className="space-y-7 pb-6">
      <section>
        <p className="eyebrow mb-2 flex items-center gap-2"><CalendarRange className="size-3 text-primary" /> Perspectiva</p>
        <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.055em]">Calendário.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Prazos de todas as suas tarefas, em todos os projetos.</p>
      </section>

      {tasks !== null && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2">
            <span className={cn('size-2 rounded-full', overdueCount > 0 ? 'bg-destructive' : 'bg-muted-foreground/40')} />
            <span className="text-sm"><span className={cn('font-semibold', overdueCount > 0 && 'text-destructive')}>{overdueCount}</span> atrasada{overdueCount === 1 ? '' : 's'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2">
            <span className={cn('size-2 rounded-full', dueTodayCount > 0 ? 'bg-[#ffb45c]' : 'bg-muted-foreground/40')} />
            <span className="text-sm"><span className="font-semibold">{dueTodayCount}</span> para hoje</span>
          </div>
        </div>
      )}

      {tasks === null ? (
        <div className="h-[480px] animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="flex-1 space-y-4">
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border p-2">
                <h3 className="pl-2 text-sm font-medium text-foreground">
                  {MESES[monthAnchor.getMonth()]} de {monthAnchor.getFullYear()}
                </h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}>
                    <ChevronLeft />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={goToday}>Hoje</Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}>
                    <ChevronRight />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 border-t border-l border-border">
                {DIAS_SEMANA.map(d => (
                  <div key={d} className="border-b border-r border-border bg-muted/30 py-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
                    {d}
                  </div>
                ))}
                {days.map(day => (
                  <DayCell
                    key={day.toISOString()}
                    day={day}
                    isCurrentMonth={day.getMonth() === monthAnchor.getMonth()}
                    tasks={tasksByDay.get(toIso(day)) ?? []}
                    isSelected={toIso(day) === selectedDay}
                    onSelect={setSelectedDay}
                  />
                ))}
              </div>
            </div>

            {selectedDay && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {formatDateBR(selectedDay)}{selectedDay === todayIso() && ' · Hoje'}
                  </p>
                  <Button variant="ghost" size="icon-sm" aria-label="Fechar" onClick={() => setSelectedDay(null)}>
                    <X />
                  </Button>
                </div>
                <div className="mt-3 space-y-1.5">
                  {selectedTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa com prazo nesse dia.</p>
                  ) : selectedTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/tarefas/${task.planId}?tarefa=${task.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/70"
                    >
                      <span className={cn('size-1.5 shrink-0 rounded-full', TONE_DOT_CLASS[taskDueTone(task)])} />
                      <span className="min-w-0 flex-1 truncate">{task.titulo}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{task.planNome}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full shrink-0 space-y-2 xl:w-64">
            <h3 className="text-sm font-medium text-foreground">Sem prazo</h3>
            <div className="space-y-1.5">
              {semPrazo.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tarefa sem prazo.</p>
              ) : semPrazo.map(task => (
                <Link
                  key={task.id}
                  to={`/tarefas/${task.planId}?tarefa=${task.id}`}
                  className="block rounded-md border border-border bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted/70"
                >
                  <p className="truncate">{task.titulo}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{task.planNome}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
