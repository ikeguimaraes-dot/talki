import { useEffect, useState } from 'react';
import { supabase } from '@/supabase';
import { useCurrentUser } from '@/hooks/use-current-user';

export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (active) setIsAdmin(data?.role === 'admin');
      });
    return () => { active = false; };
  }, [user.id]);

  return isAdmin;
}
