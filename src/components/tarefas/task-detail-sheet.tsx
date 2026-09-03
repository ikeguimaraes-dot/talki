import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, FolderInput, Trash2, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/supabase';
import type { usePlanBoard } from '@/hooks/use-plan-board';
import { useAutosaveField } from '@/hooks/use-autosave-field';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { SavedIndicator } from '@/components/tarefas/saved-indicator';
import { DateField } from '@/components/tarefas/date-field';
import { AssigneePicker } from '@/components/tarefas/assignee-picker';
import { LabelPicker } from '@/components/tarefas/label-picker';
import { ChecklistSection } from '@/components/tarefas/checklist-section';
import { CommentsSection } from '@/components/tarefas/comments-section';
import { MoveToPlanDialog } from '@/components/tarefas/move-to-plan-dialog';
import { PRIORIDADE_LABEL, PRIORIDADES, STATUS_LABEL, STATUS_TAREFA, type TaskCommentWithProfile } from '@/lib/types';
import { formatDateBR } from '@/lib/date';

interface TaskDetailSheetProps {
  taskId: string | null;
  onOpenChange: (open: boolean) => void;
  board: ReturnType<typeof usePlanBoard>;
}

export function TaskDetailSheet({ taskId, onOpenChange, board }: TaskDetailSheetProps) {
  const currentUser = useCurrentUser();
  const task = taskId ? board.findTask(taskId) : undefined;
  const open = !!taskId && !!task;

  const [comments, setComments] = useState<TaskCommentWithProfile[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    supabase
      .from('task_comments')
      .select('*, profiles(id, nome, email, avatar_url)')
      .eq('task_id', taskId)
      .order('criado_em')
      .then(({ data }) => setComments((data as unknown as TaskCommentWithProfile[]) ?? []));
  }, [taskId]);

  const titulo = useAutosaveField(task?.titulo ?? '', value => task && board.updateTaskFields(task.id, { titulo: value }));
  const descricao = useAutosaveField(task?.descricao ?? '', value => task && board.updateTaskFields(task.id, { descricao: value || null }));

  if (!task) return null;

  const criador = board.plan?.plan_members.find(m => m.profiles.id === task.criado_por)?.profiles;

  const handleDuplicate = async () => {
    const copy = await board.duplicateTask(task.id);
    if (copy) toast.success('Tarefa duplicada.');
  };

  const handleDelete = async () => {
    await board.deleteTask(task.id);
    setDeleteOpen(false);
    onOpenChange(false);
    toast.success('Tarefa excluída.');
  };

  const handleAddComment = async (texto: string) => {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: task.id, user_id: currentUser.id, texto })
      .select('*, profiles(id, nome, email, avatar_url)')
      .single();

    if (error || !data) {
      toast.error('Não foi possível comentar.');
      return;
    }
    setComments(prev => [...prev, data as unknown as TaskCommentWithProfile]);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={next => !next && onOpenChange(false)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          <SheetHeader className="gap-2 border-b border-border px-6 py-5 pr-12">
            <div className="flex items-start justify-between gap-2">
              <SheetTitle className="sr-only">Detalhe da tarefa</SheetTitle>
              <Input
                value={titulo.value}
                onChange={e => titulo.onChange(e.target.value)}
                className="h-10 border-none bg-transparent px-0 text-xl font-semibold tracking-[-0.035em] shadow-none focus-visible:ring-0"
                placeholder="Título da tarefa"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Mais ações"><MoreHorizontal /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate}><Copy /> Duplicar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMoveOpen(true)}><FolderInput /> Mover para outro plano</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 /> Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <SheetDescription className="sr-only">Editar detalhes, checklist e comentários da tarefa</SheetDescription>
            <SavedIndicator status={titulo.status === 'idle' ? descricao.status : titulo.status} />
          </SheetHeader>

          <div className="space-y-6 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Bucket</p>
                <Select value={task.bucket_id} onValueChange={v => board.moveTaskToBucket(task.id, v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {board.buckets.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Select
                  value={task.status}
                  onValueChange={v =>
                    board.updateTaskFields(task.id, {
                      status: v,
                      concluida_em: v === 'concluida' ? new Date().toISOString() : null,
                    })
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_TAREFA.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Prioridade</p>
                <Select value={task.prioridade} onValueChange={v => board.updateTaskFields(task.id, { prioridade: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map(p => (
                      <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DateField label="Início" value={task.inicio} onChange={v => board.updateTaskFields(task.id, { inicio: v })} />
              <DateField label="Prazo" value={task.prazo} onChange={v => board.updateTaskFields(task.id, { prazo: v })} />
            </div>

            <AssigneePicker
              members={board.plan?.plan_members.map(m => m.profiles) ?? []}
              selected={task.task_assignees.map(a => a.profiles)}
              onChange={userIds => board.setTaskAssignees(task.id, userIds)}
            />

            <LabelPicker
              planLabels={board.planLabels}
              selected={task.task_label_links.map(l => l.task_labels)}
              onChange={labelIds => board.setTaskLabels(task.id, labelIds)}
              onCreateLabel={board.createLabel}
            />

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Descrição</p>
              <Textarea
                value={descricao.value}
                onChange={e => descricao.onChange(e.target.value)}
                placeholder="Adicione mais detalhes..."
                rows={4}
              />
            </div>

            <ChecklistSection
              items={task.task_checklist}
              onAdd={texto => board.addChecklistItem(task.id, texto)}
              onToggle={(itemId, feito) => board.toggleChecklistItem(task.id, itemId, feito)}
              onDelete={itemId => board.deleteChecklistItem(task.id, itemId)}
              onReorder={items => board.reorderChecklistItems(task.id, items)}
            />

            <CommentsSection comments={comments} onAdd={handleAddComment} />

            <div className="border-t border-border pt-3 text-xs text-muted-foreground">
              Criado por {criador?.nome || criador?.email || 'alguém'} em {formatDateBR(task.criado_em.slice(0, 10))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <MoveToPlanDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        currentPlanId={task.plan_id}
        onMove={async targetPlanId => {
          const ok = await board.moveTaskToPlan(task.id, targetPlanId);
          if (ok) {
            toast.success('Tarefa movida.');
            onOpenChange(false);
          }
          return ok;
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
