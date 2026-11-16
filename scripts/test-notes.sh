#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-notes-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -i "$container" psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < supabase/tests/agenda-kanban.fixture.sql
docker exec -i "$container" psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < supabase/migrations/20261007162812_talki_notes.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/notes.sql
