#!/usr/bin/env bash
# Regenerates src/types/database.ts from a database that has the migrations
# applied. Default: local Supabase. Or: DATABASE_URL=… bash scripts/gen-types.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -n "${DATABASE_URL:-}" ]]; then
  npx supabase gen types typescript --db-url "$DATABASE_URL" --schema public > "$ROOT/src/types/database.ts" 2>/dev/null
else
  npx supabase gen types typescript --local --schema public > "$ROOT/src/types/database.ts"
fi
npx prettier --ignore-path /dev/null --write "$ROOT/src/types/database.ts" >/dev/null
echo "✓ types regenerated"
