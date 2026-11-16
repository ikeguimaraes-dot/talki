#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-project-task-test-$$"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
for file in \
  supabase/tests/agenda-kanban.fixture.sql \
  supabase/migrations/20261001145147_talki_task_kanban.sql \
  supabase/tests/project-task-defaults.fixture.sql \
  supabase/migrations/20261116145713_project_task_defaults.sql \
  supabase/tests/project-task-defaults.sql; do
  docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < "$file"
done
