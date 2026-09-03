export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isOverdue(prazo: string | null, status: string): boolean {
  if (!prazo || status === 'concluida') return false;
  return prazo < todayIso();
}

export function isToday(dateIso: string | null): boolean {
  return dateIso === todayIso();
}

export function isWithinNextDays(dateIso: string | null, days: number): boolean {
  if (!dateIso) return false;
  const today = todayIso();
  if (dateIso < today) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() + days);
  return dateIso <= limit.toISOString().slice(0, 10);
}

export function formatDateBR(dateIso: string | null): string {
  if (!dateIso) return '';
  const [year, month, day] = dateIso.split('-');
  return `${day}/${month}/${year}`;
}
