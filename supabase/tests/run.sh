#!/usr/bin/env bash
# Spielt alle Migrationen in eine frische Datenbank ein und führt die SQL-Tests aus.
# Nutzung: DATABASE_URL=postgres://... supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")"
: "${DATABASE_URL:?DATABASE_URL fehlt}"
export PGOPTIONS='--client-min-messages=warning'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c 'drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists tests cascade; create schema public;'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f 00_supabase_stub.sql
for f in ../migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f "$f"
done
for f in test_*.sql; do
  echo "▶ $f"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f "$f"
done
echo "✅ Alle SQL-Tests bestanden"
