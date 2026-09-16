import { createClient } from 'npm:@supabase/supabase-js@2.106.2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req: Request) => {
 if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
 if (req.method !== 'POST') return response({ error: 'Método não permitido.' }, 405);
 const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
 if (!token) return response({ error: 'Entre na sua conta.' }, 401);
 const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
 const { data: { user }, error: authError } = await admin.auth.getUser(token);
 if (authError || !user) return response({ error: 'Sessão inválida.' }, 401);
 const [profile, module] = await Promise.all([
  admin.from('profiles').select('role').eq('id', user.id).single(),
  admin.from('talki_colaboradores').select('ativo,papel').eq('user_id', user.id).maybeSingle(),
 ]);
 if (profile.data?.role !== 'admin' && !(module.data?.ativo && module.data.papel === 'gestor')) return response({ error: 'Acesso restrito à gestão.' }, 403);
 try {
  const body = await req.json();
  if (body.action !== 'create') return response({ error: 'Ação inválida.' }, 400);
  const nome = String(body.nome ?? '').trim(), email = String(body.email ?? '').trim().toLowerCase(), senha = String(body.senha ?? '');
  const horas = Number(body.horas_dia_contratadas ?? 8), papel = body.papel === 'gestor' ? 'gestor' : 'participante';
  if (!nome || nome.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8 || !Number.isFinite(horas) || horas <= 0 || horas > 24) return response({ error: 'Confira nome, e-mail, senha e jornada.' }, 400);
  if (body.area_id) { const { data, error } = await admin.from('talki_areas').select('id').eq('id', body.area_id).single(); if (error || !data) return response({ error: 'Área inválida.' }, 400); }
  const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: false, user_metadata: { name: nome } });
  if (createError) return response({ error: createError.message }, 400);
  const id = created.user.id;
  const { error: profileError } = await admin.from('profiles').upsert({ id, nome, email }, { onConflict: 'id', ignoreDuplicates: true });
  const { error: moduleError } = profileError ? { error: profileError } : await admin.from('talki_colaboradores').insert({ user_id: id, area_id: body.area_id || null, horas_dia_contratadas: horas, papel });
  if (moduleError) {
   // Only compensate the freshly created account; never delete an existing identity.
   const { error: cleanupError } = await admin.from('profiles').delete().eq('id', id).eq('email', email);
   const { error: rollbackError } = cleanupError ? { error: cleanupError } : await admin.auth.admin.deleteUser(id);
   return response({ error: rollbackError ? 'Conta criada, mas ficha incompleta. Contate o suporte.' : 'Não foi possível criar a ficha.' }, 500);
  }
  return response({ id, confirmation_required: true }, 201);
 } catch { return response({ error: 'Requisição inválida.' }, 400); }
});
