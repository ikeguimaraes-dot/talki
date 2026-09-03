import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { AssigneeProfile } from '@/lib/types';

interface AvatarStackProps {
  profiles: AssigneeProfile[];
  max?: number;
  size?: 'sm' | 'md';
}

export function AvatarStack({ profiles, max = 4, size = 'sm' }: AvatarStackProps) {
  if (profiles.length === 0) return null;

  const visible = profiles.slice(0, max);
  const overflow = profiles.length - visible.length;
  const sizeClass = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-xs';

  return (
    <div className="flex items-center -space-x-2">
      {visible.map(profile => (
        <Avatar key={profile.id} className={`${sizeClass} border-2 border-card`} title={profile.nome ?? profile.email ?? ''}>
          <AvatarFallback className={`${sizeClass} bg-primary font-semibold text-primary-foreground`}>
            {getInitials(profile.nome || profile.email || '?')}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <div className={`flex ${sizeClass} items-center justify-center rounded-full border-2 border-card bg-muted font-semibold text-muted-foreground`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
