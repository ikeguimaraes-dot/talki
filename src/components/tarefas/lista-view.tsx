import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { AvatarStack } from '@/components/tarefas/avatar-stack';
import { PriorityIcon } from '@/components/tarefas/priority-icon';
import { formatDateBR, isOverdue } from '@/lib/date';
import { cn } from '@/lib/utils';
import { PRIORIDADE_LABEL, PRIORIDADES, STATUS_LABEL, STATUS_TAREFA, type BucketWithTasks, type Prioridade, type StatusTarefa } from '@/lib/types';

type SortField = 'titulo' | 'bucket' | 'prazo' | 'prioridade' | 'progresso' | 'status';

interface ListaViewProps {
  buckets: BucketWithTasks[];
  onOpenTask: (taskId: string) => void;
  onUpdateFields: (taskId: string, patch: Record<string, unknown>) => void;
}

const PRIORIDADE_ORDEM: Record<Prioridade, number> = { urgente: 0, importante: 1, media: 2, baixa: 3 };
const STATUS_ORDEM: Record<StatusTarefa, number> = { nao_iniciada: 0, em_andamento: 1, concluida: 2 };

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ListaView({ buckets, onOpenTask, onUpdateFields }: ListaViewProps) {
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'prazo', dir: 'asc' });

  const rows = useMemo(() => {
    const flat = buckets.flatMap(b => b.tasks.map(t => ({ ...t, bucketNome: b.nome })));

    const compare = (a: typeof flat[number], b: typeof flat[number]) => {
      let result = 0;
      switch (sort.field) {
        case 'titulo':
          result = a.titulo.localeCompare(b.titulo);
          break;
        case 'bucket':
          result = a.bucketNome.localeCompare(b.bucketNome);
          break;
        case 'prazo':
          result = (a.prazo ?? '9999-99-99').localeCompare(b.prazo ?? '9999-99-99');
          break;
        case 'prioridade':
          result = PRIORIDADE_ORDEM[a.prioridade as Prioridade] - PRIORIDADE_ORDEM[b.prioridade as Prioridade];
          break;
        case 'status':
          result = STATUS_ORDEM[a.status as StatusTarefa] - STATUS_ORDEM[b.status as StatusTarefa];
          break;
        case 'progresso': {
          const pa = a.task_checklist.length ? a.task_checklist.filter(i => i.feito).length / a.task_checklist.length : -1;
          const pb = b.task_checklist.length ? b.task_checklist.filter(i => i.feito).length / b.task_checklist.length : -1;
          result = pa - pb;
          break;
        }
      }
      return sort.dir === 'asc' ? result : -result;
    };

    return [...flat].sort(compare);
  }, [buckets, sort]);

  const toggleSort = (field: SortField) => {
    setSort(prev => (prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sort.field !== field) return <ArrowUpDown className="size-3 text-muted-foreground/50" />;
    return sort.dir === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
  };

  const header = (field: SortField, label: string) => (
    <TableHead>
      <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground">
        {label} <SortIcon field={field} />
      </button>
    </TableHead>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {header('titulo', 'Título')}
            {header('bucket', 'Bucket')}
            <TableHead>Responsáveis</TableHead>
            {header('prazo', 'Prazo')}
            {header('prioridade', 'Prioridade')}
            {header('progresso', 'Progresso')}
            {header('status', 'Status')}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(task => {
            const checklistTotal = task.task_checklist.length;
            const checklistDone = task.task_checklist.filter(i => i.feito).length;
            const overdue = isOverdue(task.prazo, task.status);

            return (
              <TableRow key={task.id} className="cursor-pointer" onClick={() => onOpenTask(task.id)}>
                <TableCell className="max-w-64 truncate font-medium">{task.titulo}</TableCell>
                <TableCell className="text-muted-foreground">{task.bucketNome}</TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <AvatarStack profiles={task.task_assignees.map(a => a.profiles)} />
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn('flex items-center gap-1 text-sm hover:underline', overdue && 'font-medium text-destructive')}>
                        <CalendarIcon className="size-3.5" />
                        {task.prazo ? formatDateBR(task.prazo) : 'Sem prazo'}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task.prazo ? parseDateOnly(task.prazo) : undefined}
                        onSelect={date => onUpdateFields(task.id, { prazo: date ? toIsoDateOnly(date) : null })}
                      />
                    </PopoverContent>
                  </Popover>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Select value={task.prioridade} onValueChange={v => onUpdateFields(task.id, { prioridade: v })}>
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue>
                        <span className="flex items-center gap-1.5">
                          <PriorityIcon prioridade={task.prioridade} /> {PRIORIDADE_LABEL[task.prioridade as Prioridade]}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map(p => (
                        <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-32">
                  {checklistTotal > 0 ? (
                    <div className="flex items-center gap-2">
                      <Progress value={(checklistDone / checklistTotal) * 100} className="h-1.5 w-14" />
                      <span className="text-xs text-muted-foreground">{checklistDone}/{checklistTotal}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()}>
                  <Select
                    value={task.status}
                    onValueChange={v => onUpdateFields(task.id, { status: v, concluida_em: v === 'concluida' ? new Date().toISOString() : null })}
                  >
                    <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_TAREFA.map(s => (
                        <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
