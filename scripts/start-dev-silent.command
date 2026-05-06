#!/bin/bash
# ============================================================================
# fitbyivana Silent Launcher — pokrene server u pozadini, otvara browser,
# zatvara Terminal prozor sam. Korisnik vidi Terminal ~2s pa se sakrije.
# ============================================================================

cd "$(dirname "$0")/.." || exit 1
PROJECT_DIR="$(pwd)"

# Ako server nije pokrenut, startuj ga
if ! lsof -ti:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  # Prvi run — provera node_modules
  if [ ! -d "node_modules" ]; then
    echo "Prvi run: npm install..."
    npm install >/dev/null 2>&1
  fi

  # Startuj u pozadini sa nohup, redirect log
  nohup npm run dev > /tmp/fitbyivana-dev.log 2>&1 &
  disown

  # Cekaj server ready (max 60s)
  for i in {1..60}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null | grep -qE "200|304"; then
      break
    fi
    sleep 1
  done
fi

# Otvori browser
open http://localhost:8080

# Zatvori Terminal prozor sam sebe (background osascript)
(
  sleep 1
  osascript -e 'tell application "Terminal" to close (first window whose name contains "start-dev-silent")' 2>/dev/null || true
) &

exit 0
