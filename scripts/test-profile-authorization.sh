#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="talki-profile-test-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# No exposed port, network or persistent data. Synthetic fixture only.
docker run --detach --name "$container" --network none \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_HOST_AUTH_METHOD=trust \
  postgres:16-alpine >/dev/null
ready=false
for attempt in {1..30}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then
    ready=true; break
  fi
  sleep 1
done
if [ "$ready" != true ]; then echo 'Postgres did not become ready' >&2; exit 1; fi
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/profile_authorization.fixture.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 --single-transaction < supabase/migrations/20260916201737_talki_protect_profile_authorization.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/profile_authorization.sql
