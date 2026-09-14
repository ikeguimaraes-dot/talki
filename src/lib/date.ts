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

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function parseIsoDate(dateIso: string): { day: number; month: number; year: number } {
  const [year, month, day] = dateIso.split('-').map(Number);
  return { day, month: month - 1, year };
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffHours < 48) return 'ontem';
  const diffDays = Math.floor(diffHours / 24);
  return `há ${diffDays} dias`;
}

export function formatDateRangeBR(inicio: string | null, prazo: string | null): string {
  if (!inicio && !prazo) return '';
  if (!inicio && prazo) {
    const p = parseIsoDate(prazo);
    return `até ${p.day} ${MESES_ABREV[p.month]}`;
  }
  if (inicio && !prazo) {
    const i = parseIsoDate(inicio);
    return `desde ${i.day} ${MESES_ABREV[i.month]}`;
  }

  const i = parseIsoDate(inicio as string);
  const p = parseIsoDate(prazo as string);

  if (i.year !== p.year) {
    return `${i.day} ${MESES_ABREV[i.month]} ${i.year} – ${p.day} ${MESES_ABREV[p.month]} ${p.year}`;
  }
  if (i.month !== p.month) {
    return `${i.day} ${MESES_ABREV[i.month]} – ${p.day} ${MESES_ABREV[p.month]}`;
  }
  return `${i.day} – ${p.day} ${MESES_ABREV[p.month]}`;
}
