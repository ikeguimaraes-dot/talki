import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PlanOption {
  id: string;
  nome: string;
}

interface MoveToPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlanId: string;
  onMove: (targetPlanId: string) => Promise<boolean>;
}

export function MoveToPlanDialog({ open, onOpenChange, currentPlanId, onMove }: MoveToPlanDialogProps) {
  const [plans, setPlans] = useState<PlanOption[] | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('plans')
      .select('id, nome')
      .neq('id', currentPlanId)
      .order('nome')
      .then(({ data }) => setPlans(data ?? []));
  }, [open, currentPlanId]);

  const handleMove = async () => {
    if (!selected) return;
    setMoving(true);
    const ok = await onMove(selected);
    setMoving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para outro plano</DialogTitle>
          <DialogDescription>
            A tarefa vai para o primeiro bucket do plano escolhido. Responsáveis e labels serão removidos.
          </DialogDescription>
        </DialogHeader>

        {plans && plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você não tem outros planos.</p>
        ) : (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Escolha um plano" /></SelectTrigger>
            <SelectContent>
              {plans?.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleMove} disabled={!selected || moving}>{moving ? 'Movendo...' : 'Mover'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
