#!/usr/bin/env bash
# ============================================================================
# new-tenant.sh — skelet nove tenant kopije (FAZA 3.5, PLAN_RADA_WHITELABEL.md)
#
# Upotreba:  ./scripts/new-tenant.sh <ime-trenera>
# Rezultat:  ../fit-<ime-trenera>/ — kopija koda, svež git, očišćeni env fajlovi.
# Posle:     prati docs/TENANT_SETUP.md (Supabase projekat, brending, deploy).
# ============================================================================
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Upotreba: $0 <ime-trenera>   (kebab-case, npr. ana-fit)" >&2
  exit 1
fi

TENANT="$1"
if ! [[ "$TENANT" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "GREŠKA: ime mora biti kebab-case (mala slova, brojevi, crtice)." >&2
  exit 1
fi

MASTER_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="$(dirname "$MASTER_DIR")/fit-${TENANT}"

if [ -e "$TARGET_DIR" ]; then
  echo "GREŠKA: $TARGET_DIR već postoji." >&2
  exit 1
fi

echo "==> Kopiram master repo u $TARGET_DIR (git clone — bez radnih fajlova van repo-a)"
git -C "$MASTER_DIR" rev-parse --is-inside-work-tree >/dev/null
git clone --no-hardlinks "$MASTER_DIR" "$TARGET_DIR"

cd "$TARGET_DIR"

echo "==> Master ostaje kao remote 'master-repo' (za buduće sinhronizacije)"
git remote rename origin master-repo

echo "==> Čistim tenant-specifične fajlove"
rm -rf graphify-out .claude upgrade files_extracted dist playwright-report test-results 2>/dev/null || true
rm -f .env .env.test 2>/dev/null || true
cp .env.example .env

echo "==> Instaliram zavisnosti"
npm install --no-audit --no-fund

cat <<EOF

============================================================
Tenant skelet spreman: $TARGET_DIR

Sledeći koraci (docs/TENANT_SETUP.md):
  1. Kreiraj Supabase projekat + 'supabase link' + 'db push' + 'functions deploy'
  2. Podesi src/tenant.config.ts  (ime, logo, boje, feature flagovi)
  3. Popuni .env  (project ref, publishable key)
  4. npm run verify && npm run dev
============================================================
EOF
