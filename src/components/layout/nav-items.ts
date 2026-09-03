import { CalendarDays, FolderKanban, MessageSquare, Megaphone, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Hoje', href: '/', icon: CalendarDays },
  { label: 'Projetos', href: '/tarefas', icon: FolderKanban },
  { label: 'Mensagens', href: '/mensagens', icon: MessageSquare },
  { label: 'Comunicados', href: '/comunicados', icon: Megaphone },
];
