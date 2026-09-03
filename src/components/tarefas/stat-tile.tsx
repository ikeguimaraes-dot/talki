import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: number;
  tone?: 'default' | 'destructive';
}

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-card p-4">
      <p className={cn('text-2xl font-semibold', tone === 'destructive' && value > 0 && 'text-destructive')}>
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
