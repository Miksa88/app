-- ============================================================================
-- fitbyivana Stop — zaustavlja dev server u pozadini
-- ============================================================================

on run
    set isRunning to do shell script "lsof -ti:8080 -sTCP:LISTEN >/dev/null 2>&1 && echo yes || echo no"

    if isRunning is "yes" then
        try
            do shell script "lsof -ti:8080 -sTCP:LISTEN | xargs kill -9 2>/dev/null || true"
            display notification "fitbyivana server zaustavljen" with title "fitbyivana"
        on error errMsg
            display notification "Greska pri gasenju: " & errMsg with title "fitbyivana"
        end try
    else
        display notification "fitbyivana server nije pokrenut" with title "fitbyivana"
    end if
end run
