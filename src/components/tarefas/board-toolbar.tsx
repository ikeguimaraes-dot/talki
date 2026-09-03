import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRIORIDADE_LABEL, PRIORIDADES, type AssigneeProfile, type TaskLabel } from '@/lib/types';
import { FILTROS_VAZIOS, type BoardFilters, type GroupBy, type PrazoFiltro } from '@/lib/board-filters';

interface BoardToolbarProps {
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  members: AssigneeProfile[];
  labels: TaskLabel[];
}

export function BoardToolbar({ groupBy, onGroupByChange, filters, onFiltersChange, members, labels }: BoardToolbarProps) {
  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-56">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="board-search"
          value={filters.busca}
          onChange={e => set('busca', e.target.value)}
          placeholder="Buscar tarefas..."
          className="h-8 pl-8"
        />
      </div>

      <Select value={filters.prazo} onValueChange={v => set('prazo', v as PrazoFiltro)}>
        <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Prazo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todos os prazos</SelectItem>
          <SelectItem value="atrasadas">Atrasadas</SelectItem>
          <SelectItem value="hoje">Hoje</SelectItem>
          <SelectItem value="semana">Próximos 7 dias</SelectItem>
          <SelectItem value="sem_prazo">Sem prazo</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.prioridade} onValueChange={v => set('prioridade', v as BoardFilters['prioridade'])}>
        <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Toda prioridade</SelectItem>
          {PRIORIDADES.map(p => (
            <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {labels.length > 0 && (
        <Select value={filters.labelId} onValueChange={v => set('labelId', v)}>
          <SelectTrigger size="sm" className="w-36"><SelectValue placeholder="Label" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda label</SelectItem>
            {labels.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.responsavelId} onValueChange={v => set('responsavelId', v)}>
        <SelectTrigger size="sm" className="w-44"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todo responsável</SelectItem>
          {members.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.nome || m.email}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {JSON.stringify(filters) !== JSON.stringify(FILTROS_VAZIOS) && (
        <button
          onClick={() => onFiltersChange(FILTROS_VAZIOS)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Limpar filtros
        </button>
      )}

      <div className="ml-auto">
        <Select value={groupBy} onValueChange={v => onGroupByChange(v as GroupBy)}>
          <SelectTrigger size="sm" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bucket">Agrupar por Bucket</SelectItem>
            <SelectItem value="responsavel">Agrupar por Responsável</SelectItem>
            <SelectItem value="prioridade">Agrupar por Prioridade</SelectItem>
            <SelectItem value="prazo">Agrupar por Prazo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
