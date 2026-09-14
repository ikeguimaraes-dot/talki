import { AtSign, CalendarDays, CheckCircle2, FolderKanban, Megaphone, type LucideIcon } from 'lucide-react';

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

// Etiquetas entra aqui no bloco C, entre Marcações e Concluídas (ordem
// final: Marcações, Etiquetas, Concluídas).
export const PERSPECTIVAS_ITEMS: NavItem[] = [
  { label: 'Marcações', href: '/marcacoes', icon: AtSign },
  { label: 'Concluídas', href: '/concluidas', icon: CheckCircle2 },
];
