#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-agenda-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
 if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
for file in supabase/tests/profile_authorization.fixture.sql supabase/tests/jornada.fixture.sql supabase/migrations/*_talki_protect_profile_authorization.sql supabase/migrations/*_talki_jornada_core.sql supabase/migrations/*_talki_agenda.sql; do
 docker exec -i "$container" psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < "$file"
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/agenda.sql
