import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateBR } from '@/lib/date';

interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start font-normal">
            <CalendarIcon className="size-3.5" />
            {value ? formatDateBR(value) : 'Sem data'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? parseDateOnly(value) : undefined}
            onSelect={date => onChange(date ? toIsoDateOnly(date) : null)}
          />
          {value && (
            <div className="border-t border-border p-1.5">
              <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange(null)}>
                <X className="size-3.5" /> Limpar data
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
