import { ClipboardCheck, Columns3, Archive, Timer, BarChart3, AtSign, CalendarDays, CalendarRange, CheckCircle2, FolderKanban, Megaphone, NotebookPen, Tag, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Hoje', href: '/', icon: CalendarDays },
  { label: 'Entregas', href: '/entregas', icon: ClipboardCheck },
  { label: 'Projetos', href: '/tarefas', icon: FolderKanban },
  { label: 'Kanban', href: '/kanban', icon: Columns3 },
  { label: 'Agenda', href: '/agenda', icon: CalendarRange },
  { label: 'Bloco de notas', href: '/notas', icon: NotebookPen },
  { label: 'Baú', href: '/bau', icon: Archive },
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
