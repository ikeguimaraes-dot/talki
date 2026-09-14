import { AtSign, CalendarDays, FolderKanban, Megaphone, type LucideIcon } from 'lucide-react';

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

// Etiquetas e Concluídas entram aqui nos blocos B e C — por enquanto só
// Marcações é uma rota de verdade.
export const PERSPECTIVAS_ITEMS: NavItem[] = [
  { label: 'Marcações', href: '/marcacoes', icon: AtSign },
];
