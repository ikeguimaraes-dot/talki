export const KANBAN_COLUMNS = [
  { value: 'fila', label: 'Fila', color: '#94a3b8' },
  { value: 'trabalhando', label: 'Trabalhando', color: '#a78bfa' },
  { value: 'esperando', label: 'Esperando', color: '#fbbf24' },
  { value: 'finalizado', label: 'Finalizado', color: '#34d399' },
] as const;
export type KanbanStatus = typeof KANBAN_COLUMNS[number]['value'];
