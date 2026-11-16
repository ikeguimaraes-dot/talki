import { supabase } from '@/supabase';
export interface GoogleCalendar {
 id:string; calendar_id:string; account_id:string; label:string; color:string;
 access_role:string; is_default:boolean; enabled:boolean; connected:boolean;
 last_sync_at:string|null; last_error:string|null; lease_until:string|null;
 requiresPermission:boolean;
}
export interface GoogleStatus {configured:boolean; syncing:boolean; connections:GoogleCalendar[]}
export async function googleCalendarRequest(action:string,body?:Record<string,unknown>){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Entre novamente no Talki.');
 const response=await fetch(`/api/google-calendar?action=${action}`,{method:action==='status'?'GET':'POST',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'Não foi possível conectar ao Google.');
 return data;
}
