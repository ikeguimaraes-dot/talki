import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { FolderPlus, ListChecks } from 'lucide-react';
import { supabase } from '@/supabase';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { CreatePlanDialog } from '@/components/tarefas/create-plan-dialog';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

interface PlanOption {
  id: string;
  nome: string;
}

export function CommandPalette({ open, onOpenChange, user }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    supabase.from('plans').select('id, nome').order('nome').then(({ data }) => setPlans(data ?? []));
  }, [open]);

  const goTo = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange} title="Busca" description="Navegue pelo Talki">
        <CommandInput placeholder="Buscar ou navegar..." />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Navegação">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
              <CommandItem key={href} value={label} onSelect={() => goTo(href)}>
                <Icon />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Ações">
            <CommandItem
              value="Criar plano"
              onSelect={() => {
                onOpenChange(false);
                setCreatePlanOpen(true);
              }}
            >
              <FolderPlus /> Criar plano
            </CommandItem>
          </CommandGroup>

          {plans.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Abrir plano">
                {plans.map(plan => (
                  <CommandItem key={plan.id} value={plan.nome} onSelect={() => goTo(`/tarefas/${plan.id}`)}>
                    <ListChecks /> {plan.nome}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>

      <CreatePlanDialog
        open={createPlanOpen}
        onOpenChange={setCreatePlanOpen}
        currentUserId={user.id}
        onCreated={plan => navigate(`/tarefas/${plan.id}`)}
      />
    </>
  );
}
