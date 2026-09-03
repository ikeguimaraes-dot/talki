import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORIDADE_COR, type Prioridade } from '@/lib/types';

const ICONS: Record<Prioridade, typeof Flame> = {
  urgente: Flame,
  importante: ArrowUp,
  media: Minus,
  baixa: ArrowDown,
};

export function PriorityIcon({ prioridade, className }: { prioridade: string; className?: string }) {
  const p = (prioridade in ICONS ? prioridade : 'media') as Prioridade;
  const Icon = ICONS[p];
  return <Icon className={cn('size-3.5', className)} style={{ color: PRIORIDADE_COR[p] }} />;
}
