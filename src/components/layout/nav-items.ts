import { Timer, BarChart3, AtSign, CalendarDays, CalendarRange, CheckCircle2, FolderKanban, Megaphone, Tag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Hoje', href: '/', icon: CalendarDays },
  { label: 'Projetos', href: '/tarefas', icon: FolderKanban },
  { label: 'Jornada', href: '/jornada', icon: Timer },
  { label: 'Gestão da jornada', href: '/gestao', icon: BarChart3 },
  { label: 'Comunicados', href: '/comunicados', icon: Megaphone },
];

export const PERSPECTIVAS_ITEMS: NavItem[] = [
  { label: 'Marcações', href: '/marcacoes', icon: AtSign },
  { label: 'Calendário', href: '/calendario', icon: CalendarRange },
  { label: 'Etiquetas', href: '/etiquetas', icon: Tag },
  { label: 'Concluídas', href: '/concluidas', icon: CheckCircle2 },
];
