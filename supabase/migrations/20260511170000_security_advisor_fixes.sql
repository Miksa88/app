-- ============================================================================
-- Security advisor fixes (P2-INFRA-1)
-- ============================================================================
--
-- Adresira sledeća upozorenja iz `mcp__claude_ai_Supabase__get_advisors`:
--   1. anon_security_definer_function_executable (handle_new_user via /rpc)
--   2. authenticated_security_definer_function_executable (same)
--   3. extension_in_public (pg_net → extensions schema)
--
-- NIJE adresirano (zahteva dashboard konfiguraciju):
--   - auth_leaked_password_protection — uključi u Supabase Auth settings UI
--   - public_bucket_allows_listing (exercise-videos) — storage policy edit
--
-- Bezbedno za prod: handle_new_user je AFTER INSERT trigger na auth.users;
-- REVOKE-ovanje EXECUTE od anon/authenticated ne sprečava trigger fire — on
-- se izvršava sa pravima vlasnika funkcije (SECURITY DEFINER), kao i pre.
-- Sprečava samo direktni RPC poziv `/rest/v1/rpc/handle_new_user`.
-- ============================================================================

-- 1+2. Sprečiti direktni RPC poziv handle_new_user
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 3. Pomeri pg_net iz public u extensions schema (Supabase managed schema)
-- Napomena: ALTER EXTENSION ... SET SCHEMA zahteva da extensions schema postoji.
-- Supabase ga već kreira; ako iz nekog razloga ne postoji, kreiraj ga.
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
-- pg_net ostaje pristupačan svojim postojećim korisnicima — schema migration
-- ne menja runtime semantiku, samo lokaciju kataloga.
ALTER EXTENSION pg_net SET SCHEMA extensions;
