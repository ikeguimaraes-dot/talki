import { Home, MessageSquare, ListChecks, Megaphone, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início', href: '/', icon: Home },
  { label: 'Tarefas', href: '/tarefas', icon: ListChecks },
  { label: 'Mensagens', href: '/mensagens', icon: MessageSquare },
  { label: 'Comunicados', href: '/comunicados', icon: Megaphone },
];
