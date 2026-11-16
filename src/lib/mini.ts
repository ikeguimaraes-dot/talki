export function miniToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function isMiniToday(task: { inicio: string | null; prazo: string | null }, today: string): boolean {
  return !!((task.prazo && task.prazo <= today) || (task.inicio && task.inicio <= today && (!task.prazo || task.prazo >= today)));
}
