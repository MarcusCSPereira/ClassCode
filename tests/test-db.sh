#!/usr/bin/env bash
set -euo pipefail
# PostgreSQL 16+ on PATH; temporary cluster with no TCP listener.
task_root="$(cd "$(dirname "$0")/.." && pwd)"
task_pg="$(mktemp -d /tmp/classcode-pg.XXXXXX)"
cleanup() { pg_ctl -D "$task_pg/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$task_pg"; }
trap cleanup EXIT
initdb -D "$task_pg/data" -A trust -U postgres --no-locale >/dev/null
pg_ctl -D "$task_pg/data" -l "$task_pg/log" -o "-F -c listen_addresses='' -k $task_pg" start >/dev/null
for sql in tests/db-bootstrap.sql supabase/migrations/202611020001_core.sql supabase/seed.sql tests/database.sql; do
  psql -X -h "$task_pg" -U postgres -d postgres -v ON_ERROR_STOP=1 -f "$task_root/$sql" >/dev/null
done
printf 'Database assertions passed (temporary PostgreSQL cluster).\n'
