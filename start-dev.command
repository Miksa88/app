#!/bin/bash

# ============================================================================
# fitbyivana — dev server launcher (macOS dvoklik)
# ============================================================================
# Dvoklik u Finder-u → otvara se Terminal, pokreće dev server, otvara browser.
# Cmd+C u Terminal-u gasi server.
# ============================================================================

# Idi u folder gde je ovaj fajl (radi iz bilo kog direktorijuma)
cd "$(dirname "$0")" || exit 1

clear

printf "\033[1;35m"
cat <<'BANNER'
  ┌────────────────────────────────────────────────┐
  │                                                │
  │         fitbyivana — DEV SERVER                │
  │                                                │
  │   Ctrl+C / Cmd+C  →  zaustavlja server         │
  │                                                │
  └────────────────────────────────────────────────┘
BANNER
printf "\033[0m\n"

# Provera Node.js
if ! command -v node >/dev/null 2>&1; then
  printf "\033[1;31m[GREŠKA] Node.js nije instaliran.\033[0m\n"
  printf "Instaliraj kroz nvm: https://github.com/nvm-sh/nvm\n"
  read -r -p "Pritisni Enter da zatvoris..."
  exit 1
fi

# Provera node_modules (auto-install prvi put)
if [ ! -d "node_modules" ]; then
  printf "\033[1;33m[INFO] Prvi put pokretanje — instaliram dependency-je...\033[0m\n\n"
  npm install || {
    printf "\033[1;31m[GREŠKA] npm install nije uspeo.\033[0m\n"
    read -r -p "Pritisni Enter da zatvoris..."
    exit 1
  }
  printf "\n\033[1;32m[OK] Dependency-ji instalirani.\033[0m\n\n"
fi

# Otvori browser sa malim kašnjenjem (Vite treba ~1.5s da se dogne)
(
  sleep 2
  # Pokušaj oba standardna Vite porta
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -q "200\|304"; then
    open "http://localhost:8080"
  else
    open "http://localhost:5173"
  fi
) &

printf "\033[1;36m[START] Pokrećem Vite dev server...\033[0m\n\n"

# Pokreni dev server (blokira dok ne Cmd+C)
npm run dev

printf "\n\033[1;35m[KRAJ] Server zaustavljen. Možeš zatvoriti prozor.\033[0m\n"
