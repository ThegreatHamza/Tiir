#!/usr/bin/env bash
# Runs the SQL migrations and the RLS tests.
#
# Against a local Supabase stack (after `npx supabase start`):
#   npm run db:test
#
# Against a throwaway plain Postgres (no Docker needed). The Supabase shim
# is applied first and the database is dropped and recreated:
#   DATABASE_URL=postgres://postgres@localhost:5432/tiir_test npm run db:test -- --plain
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
PLAIN=0
[[ "${1:-}" == "--plain" ]] && PLAIN=1

export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

if [[ $PLAIN -eq 1 ]]; then
  DB_NAME="${DB_URL##*/}"
  ADMIN_URL="${DB_URL%/*}/postgres"
  echo "→ recreating database $DB_NAME"
  "${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists \"$DB_NAME\" with (force);" -c "create database \"$DB_NAME\";"
  "${PSQL[@]}" "$DB_URL" -f "$ROOT/supabase/tests/shim/supabase_shim.sql"
  for f in "$ROOT"/supabase/migrations/*.sql; do
    echo "→ migrating $(basename "$f")"
    "${PSQL[@]}" "$DB_URL" -f "$f"
  done
else
  echo "→ resetting local Supabase database"
  npx supabase db reset --local >/dev/null
fi

for t in "$ROOT"/supabase/tests/*_test.sql; do
  echo "→ running $(basename "$t")"
  "${PSQL[@]}" "$DB_URL" -f "$t"
done
