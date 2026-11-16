#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-google-test-$$"
if [[ -n "${TALKI_TEST_DATABASE_URL:-}" ]]; then
 run_sql() { psql "$TALKI_TEST_DATABASE_URL" -X -v ON_ERROR_STOP=1 "$@"; }
else
 trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
 docker run --detach --name "$container" --network none --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
 for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
 done
 run_sql() { docker exec -i "$container" psql -U postgres -X -v ON_ERROR_STOP=1 "$@"; }
fi
for file in \
 supabase/tests/google-calendars-multi.fixture.sql \
 supabase/migrations/20260924183941_talki_agenda.sql \
 supabase/migrations/20261003153545_talki_google_calendar.sql \
 supabase/migrations/20261003155220_talki_google_calendar_indexes.sql \
 supabase/migrations/20261001145147_talki_task_kanban.sql \
 supabase/migrations/20261005130545_agenda_tasks_kanban.sql \
 supabase/migrations/20261005133036_agenda_only_tasks_to_kanban.sql \
 supabase/migrations/20261005142127_google_tasks_to_kanban.sql; do
 run_sql --single-transaction < "$file"
done
# Seed existing records so preservation is exercised by the migration test.
run_sql < supabase/tests/google-calendars-multi.seed.sql
run_sql --single-transaction < supabase/migrations/20261110143025_talki_multiple_google_calendars.sql
run_sql --single-transaction < supabase/migrations/20261110144235_talki_google_reconnect_expired.sql
run_sql < supabase/tests/google-calendars-multi.sql
