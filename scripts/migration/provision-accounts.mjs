import fs from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Read the explicitly supplied destination admin key from stdin, never persist it.
const key = fs.readFileSync(0, 'utf8').trim();
const db = createClient('https://iqgrvptrtphvbmvrqntm.supabase.co', key, { auth: { persistSession: false, autoRefreshToken: false } });
const source = JSON.parse(fs.readFileSync('.migration-local/pareto-scoped-export.json'));
const mapPath = '.migration-local/identity-map.json';
const map = JSON.parse(fs.readFileSync(mapPath));
let created = 0;
for (const entry of map) {
  if (entry.target_candidates.length !== 1) {
    if (entry.target_candidates.length) throw new Error('Ambiguous identity');
    const person = source.profiles.find(p => p.id === entry.source_profile_id);
    const { data, error } = await db.auth.admin.createUser({
      id: person.id, email: person.email, password: crypto.randomBytes(48).toString('base64url'),
      email_confirm: entry.status === 'provisioning_required',
      user_metadata: { name: [person.nome, person.sobrenome].filter(Boolean).join(' ') },
    });
    if (error) throw new Error(`Account provisioning failed (${error.status}): ${error.message}`);
    entry.target_candidates = [data.user.id];
    entry.access_action = entry.status === 'activation_required' ? 'verify_email_and_set_password' : 'reset_password';
    created++;
  }
  entry.approved = true;
  entry.authorization = 'User authorized complete migration on 2026-09-16';
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 2) + '\n', { mode: 0o600 });
}
console.log(JSON.stringify({ mapped: map.length, created }));
