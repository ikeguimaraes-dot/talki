#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-agenda-kanban-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for file in \
  supabase/tests/agenda-kanban.fixture.sql \
  supabase/migrations/20260924183941_talki_agenda.sql \
  supabase/migrations/20261001145147_talki_task_kanban.sql \
  supabase/migrations/20261005130545_agenda_tasks_kanban.sql \
  supabase/migrations/20261005133036_agenda_only_tasks_to_kanban.sql \
  supabase/migrations/20261005142127_google_tasks_to_kanban.sql; do
  docker exec -i "$container" psql -U postgres --single-transaction -v ON_ERROR_STOP=1 < "$file"
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/agenda-kanban.sql
