import { useEffect, useState } from 'react';
import { jornadaDb, type Registro } from '@/lib/jornada';
import { hours } from '@/lib/jornada-metrics';

export function TaskTime({ taskId }: { taskId: string }) {
  const [result, setResult] = useState<{ seconds: number; count: number } | null>(null);
  useEffect(() => {
    let mounted = true;
    async function load() {
      let seconds = 0, count = 0;
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await jornadaDb.from('talki_registros').select('inicio,fim').eq('task_id', taskId).order('id').range(offset, offset + 499);
        if (error) { if (mounted) setResult(null); return; }
        for (const record of data as Pick<Registro, 'inicio' | 'fim'>[]) {
          if (record.fim) { seconds += (Date.parse(record.fim) - Date.parse(record.inicio)) / 1000; count++; }
        }
        if (data.length < 500) break;
      }
      if (mounted) setResult({ seconds, count });
    }
    void load();
    const refresh = () => void load();
    window.addEventListener('talki:jornada-change', refresh);
    return () => { mounted = false; window.removeEventListener('talki:jornada-change', refresh); };
  }, [taskId]);
  return result ? <p className="text-xs text-muted-foreground">Jornada: {hours(result.seconds)} em {result.count} apontamentos encerrados visíveis para sua conta.</p> : null;
}
