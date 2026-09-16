#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container="talki-import-rehearsal-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
 if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
for file in supabase/tests/profile_authorization.fixture.sql supabase/tests/jornada.fixture.sql supabase/migrations/*_talki_protect_profile_authorization.sql supabase/migrations/*_talki_jornada_core.sql; do
 docker exec -i "$container" psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < "$file" >/dev/null
done
node --input-type=module <<'JS' | docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 >/dev/null
import fs from 'node:fs';
const map=JSON.parse(fs.readFileSync('.migration-local/identity-map.json'));
console.log('create table public.buckets(id uuid default gen_random_uuid(),plan_id uuid references public.plans(id),nome text,ordem int);');
for(const e of map) console.log(`insert into auth.users(id,email) values('${e.target_candidates[0]}','${e.target_candidates[0]}@example.invalid');`);
JS
for attempt in 1 2; do
 docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < .migration-local/import.sql >/dev/null
done
docker exec "$container" psql -U postgres -c 'select count(*) as records,sum(extract(epoch from(fim-inicio))) as closed_seconds from public.talki_registros;'
echo 'Import and idempotent replay passed; temporary database removed on exit.'
