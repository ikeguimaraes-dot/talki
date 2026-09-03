import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Plan } from '@/lib/types';

const CORES = ['#A8632F', '#6B8F71', '#8A5A3D', '#C9A15A', '#4A4238', '#7A8FA6'];

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreated: (plan: Plan) => void;
}

export function CreatePlanDialog({ open, onOpenChange, currentUserId, onCreated }: CreatePlanDialogProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(CORES[0]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setNome('');
    setDescricao('');
    setCor(CORES[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      setLoading(true);
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .insert({ nome: nome.trim(), descricao: descricao.trim() || null, cor, criado_por: currentUserId })
        .select()
        .single();

      if (planError) throw planError;

      const { error: memberError } = await supabase
        .from('plan_members')
        .insert({ plan_id: plan.id, user_id: currentUserId });

      if (memberError) throw memberError;

      reset();
      onOpenChange(false);
      onCreated(plan);
    } catch (err) {
      console.error('Erro ao criar plano:', err);
      toast.error('Não foi possível criar o plano.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo plano</DialogTitle>
            <DialogDescription>Crie um plano para organizar tarefas e convidar sua equipe.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="plan-nome">Nome</Label>
              <Input id="plan-nome" required autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Lançamento de Marca" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-descricao">Descrição</Label>
              <Textarea id="plan-descricao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {CORES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={cn(
                      'size-7 rounded-full ring-offset-2 ring-offset-background transition-all',
                      cor === c && 'ring-2 ring-foreground'
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !nome.trim()}>
              {loading ? 'Criando...' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
