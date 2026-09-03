import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: number;
  tone?: 'default' | 'destructive';
}

export function StatTile({ label, value, tone = 'default' }: StatTileProps) {
  return (
    <div className="premium-card group relative flex min-h-28 flex-1 overflow-hidden rounded-2xl p-5">
      <div className={cn('absolute -right-8 -top-8 size-24 rounded-full blur-3xl transition-opacity duration-500', tone === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10')} />
      <div className="relative flex w-full items-end justify-between">
        <div>
          <p className="eyebrow">{label}</p>
          <p className={cn('mt-2 text-3xl font-semibold tracking-[-0.055em]', tone === 'destructive' && value > 0 && 'text-destructive')}>
            {String(value).padStart(2, '0')}
          </p>
        </div>
        <span className={cn('mb-1 size-2 rounded-full', tone === 'destructive' && value > 0 ? 'neon-orb bg-destructive text-destructive' : 'bg-primary/70')} />
      </div>
    </div>
  );
}
