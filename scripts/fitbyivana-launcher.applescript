-- ============================================================================
-- fitbyivana Launcher — .app bundle koji trigger-uje headless launch
-- ============================================================================
-- Strategija:
--   1. Proveri port 8080
--   2. Ako radi: odmah otvori browser (0 Terminal-a)
--   3. Ako ne: pokreni start-dev-silent.command (~2-3s Terminal, onda se zatvori sam)
-- ============================================================================

on run
    set projectPath to "/Users/mihajlotokovic/Desktop/ROOT/flex-femme-fit-main"
    set silentScript to projectPath & "/scripts/start-dev-silent.command"

    -- Port check
    set portRunning to false
    try
        do shell script "/usr/sbin/lsof -ti:8080 -sTCP:LISTEN >/dev/null 2>&1"
        set portRunning to true
    end try

    if portRunning then
        -- Server vec radi — samo otvori browser, bez Terminal-a
        do shell script "/usr/bin/open http://localhost:8080"
    else
        -- Pokreni silent launcher (Terminal ima TCC permission)
        do shell script "chmod +x " & quoted form of silentScript
        do shell script "/usr/bin/open " & quoted form of silentScript
    end if
end run
