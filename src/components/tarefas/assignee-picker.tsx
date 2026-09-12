import { Check, Settings2, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { AssigneeProfile } from '@/lib/types';

interface AssigneePickerProps {
  members: AssigneeProfile[];
  selected: AssigneeProfile[];
  onChange: (userIds: string[]) => void;
  canManage: boolean;
  onManageMembers: () => void;
}

export function AssigneePicker({ members, selected, onChange, canManage, onManageMembers }: AssigneePickerProps) {
  const selectedIds = new Set(selected.map(s => s.id));

  const toggle = (id: string) => {
    const next = selectedIds.has(id) ? selected.filter(s => s.id !== id).map(s => s.id) : [...selectedIds, id];
    onChange(Array.from(new Set(next)));
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Responsáveis</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.length === 0 && !canManage && (
          <span className="text-xs text-muted-foreground">Sem responsável.</span>
        )}
        {selected.map(profile => (
          <span key={profile.id} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2 pl-0.5 text-xs">
            <Avatar className="size-5">
              <AvatarFallback className="bg-primary text-[9px] font-semibold text-primary-foreground">
                {getInitials(profile.nome || profile.email || '?')}
              </AvatarFallback>
            </Avatar>
            {profile.nome || profile.email}
          </span>
        ))}

        {canManage && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Adicionar responsável">
                <UserPlus />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar pessoa..." />
                <CommandList>
                  <CommandEmpty>Ninguém encontrado.</CommandEmpty>
                  <CommandGroup>
                    {members.map(member => (
                      <CommandItem key={member.id} value={member.nome || member.email || member.id} onSelect={() => toggle(member.id)}>
                        <Avatar className="size-5">
                          <AvatarFallback className="bg-primary text-[9px] font-semibold text-primary-foreground">
                            {getInitials(member.nome || member.email || '?')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate">{member.nome || member.email}</span>
                          {member.cargo && <span className="truncate text-[10px] text-muted-foreground">{member.cargo}</span>}
                        </div>
                        {selectedIds.has(member.id) && <Check className="ml-auto size-3.5 shrink-0" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem value="gerenciar-membros" onSelect={onManageMembers} className="text-muted-foreground">
                      <Settings2 className="size-3.5" /> Gerenciar membros do projeto
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
