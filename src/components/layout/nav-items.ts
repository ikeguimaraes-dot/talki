import { AtSign, CalendarDays, CheckCircle2, FolderKanban, Megaphone, Tag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Hoje', href: '/', icon: CalendarDays },
  { label: 'Projetos', href: '/tarefas', icon: FolderKanban },
  { label: 'Comunicados', href: '/comunicados', icon: Megaphone },
];

export const PERSPECTIVAS_ITEMS: NavItem[] = [
  { label: 'Marcações', href: '/marcacoes', icon: AtSign },
  { label: 'Etiquetas', href: '/etiquetas', icon: Tag },
  { label: 'Concluídas', href: '/concluidas', icon: CheckCircle2 },
];
