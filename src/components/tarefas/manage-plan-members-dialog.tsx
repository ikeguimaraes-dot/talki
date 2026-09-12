import { useEffect, useState } from 'react';
import { Crown, Search, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/supabase';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getInitials } from '@/lib/utils';
import type { AssigneeProfile, BucketWithTasks, PlanWithMembers } from '@/lib/types';

interface ManagePlanMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanWithMembers;
  buckets: BucketWithTasks[];
  onAddMember: (profile: AssigneeProfile) => Promise<boolean>;
  onRemoveMember: (userId: string, unassignTasks: boolean) => Promise<boolean>;
}

interface PendingRemoval {
  profile: AssigneeProfile;
  assignedTaskCount: number;
}

export function ManagePlanMembersDialog({ open, onOpenChange, plan, buckets, onAddMember, onRemoveMember }: ManagePlanMembersDialogProps) {
  const [allProfiles, setAllProfiles] = useState<AssigneeProfile[] | null>(null);
  const [busca, setBusca] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open || allProfiles) return;
    supabase
      .from('profiles')
      .select('id, nome, email, avatar_url, cargo')
      .order('nome')
      .then(({ data }) => setAllProfiles(data ?? []));
  }, [open, allProfiles]);

  const members = plan.plan_members.map(m => m.profiles);
  const memberIds = new Set(members.map(m => m.id));
  const candidates = (allProfiles ?? [])
    .filter(p => !memberIds.has(p.id))
    .filter(p => (p.nome || p.email || '').toLowerCase().includes(busca.trim().toLowerCase()));

  const assignedTaskCount = (userId: string) =>
    buckets.flatMap(b => b.tasks).filter(t => t.task_assignees.some(a => a.profiles.id === userId)).length;

  const handleRemoveClick = (profile: AssigneeProfile) => {
    setPendingRemoval({ profile, assignedTaskCount: assignedTaskCount(profile.id) });
  };

  const confirmRemoval = async (unassignTasks: boolean) => {
    if (!pendingRemoval) return;
    setRemoving(true);
    await onRemoveMember(pendingRemoval.profile.id, unassignTasks);
    setRemoving(false);
    setPendingRemoval(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Membros do projeto</DialogTitle>
            <DialogDescription>Quem tem acesso a "{plan.nome}" e pode ser responsável pelas tarefas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            {members.map(member => {
              const isCreator = member.id === plan.criado_por;
              return (
                <div key={member.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/60">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {getInitials(member.nome || member.email || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.nome || member.email}</p>
                    {member.cargo && <p className="truncate text-xs text-muted-foreground">{member.cargo}</p>}
                  </div>
                  {isCreator ? (
                    <Badge variant="secondary" className="gap-1"><Crown className="size-3" /> Criador</Badge>
                  ) : (
                    <Button variant="ghost" size="icon-sm" aria-label={`Remover ${member.nome || member.email}`} onClick={() => handleRemoveClick(member)}>
                      <UserMinus className="size-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">Adicionar membro</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome..." className="h-9 pl-8" />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {candidates.map(profile => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onAddMember(profile)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-muted/60"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-muted text-xs font-semibold">
                      {getInitials(profile.nome || profile.email || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{profile.nome || profile.email}</p>
                    {profile.cargo && <p className="truncate text-xs text-muted-foreground">{profile.cargo}</p>}
                  </div>
                  <UserPlus className="size-4 text-muted-foreground" />
                </button>
              ))}
              {allProfiles && candidates.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">Ninguém encontrado.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingRemoval} onOpenChange={open => !open && setPendingRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {pendingRemoval?.profile.nome || pendingRemoval?.profile.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval && pendingRemoval.assignedTaskCount > 0
                ? `Essa pessoa é responsável por ${pendingRemoval.assignedTaskCount} tarefa${pendingRemoval.assignedTaskCount > 1 ? 's' : ''} neste projeto. O que fazer com essas atribuições?`
                : 'Essa pessoa perde acesso ao projeto.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            {pendingRemoval && pendingRemoval.assignedTaskCount > 0 ? (
              <>
                <AlertDialogAction disabled={removing} onClick={() => confirmRemoval(false)}>Remover e manter atribuições</AlertDialogAction>
                <AlertDialogAction disabled={removing} onClick={() => confirmRemoval(true)}>Remover e desatribuir tarefas</AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction disabled={removing} onClick={() => confirmRemoval(false)}>Remover</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
