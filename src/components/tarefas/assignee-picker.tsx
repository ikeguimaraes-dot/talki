import { Check, UserPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { AssigneeProfile } from '@/lib/types';

interface AssigneePickerProps {
  members: AssigneeProfile[];
  selected: AssigneeProfile[];
  onChange: (userIds: string[]) => void;
}

export function AssigneePicker({ members, selected, onChange }: AssigneePickerProps) {
  const selectedIds = new Set(selected.map(s => s.id));

  const toggle = (id: string) => {
    const next = selectedIds.has(id) ? selected.filter(s => s.id !== id).map(s => s.id) : [...selectedIds, id];
    onChange(Array.from(new Set(next)));
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Responsáveis</p>
      <div className="flex flex-wrap items-center gap-1.5">
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
                      {member.nome || member.email}
                      {selectedIds.has(member.id) && <Check className="ml-auto size-3.5" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
