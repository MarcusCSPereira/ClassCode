#!/usr/bin/env bash
set -euo pipefail
# PostgreSQL 16+ on PATH; temporary cluster removed at exit.
# Linux/macOS: Unix socket, no TCP listener. Windows (Git Bash): 127.0.0.1 only, port 54329;
# add the PostgreSQL bin folder to PATH, e.g. export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH".
task_root="$(cd "$(dirname "$0")/.." && pwd)"
task_pg="$(mktemp -d "${TMPDIR:-/tmp}/classcode-pg.XXXXXX")"
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    data="$(cygpath -w "$task_pg/data")"
    server_opts="-F -c listen_addresses=127.0.0.1 -p 54329"
    connect=(-h 127.0.0.1 -p 54329)
    ;;
  *)
    data="$task_pg/data"
    server_opts="-F -c listen_addresses='' -k $task_pg"
    connect=(-h "$task_pg")
    ;;
esac
cleanup() { pg_ctl -D "$data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$task_pg"; }
trap cleanup EXIT
initdb -D "$data" -A trust -U postgres --no-locale -E UTF8 >/dev/null
pg_ctl -D "$data" -l "$task_pg/log" -o "$server_opts" -w start >/dev/null
for sql in tests/db-bootstrap.sql supabase/migrations/*.sql supabase/seed.sql tests/database.sql; do
  # Unquoted glob on purpose: every migration runs in lexical order.
  PGCLIENTENCODING=UTF8 psql -X "${connect[@]}" -U postgres -d postgres -v ON_ERROR_STOP=1 -q \
    -f "$task_root/$sql" >/dev/null
done
printf 'Database assertions passed (temporary PostgreSQL cluster).\n'
