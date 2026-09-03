import { useOutletContext } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

export function useCurrentUser(): User {
  return useOutletContext<User>();
}
