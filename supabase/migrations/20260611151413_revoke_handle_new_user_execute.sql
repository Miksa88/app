-- ============================================================================
-- Security advisor: anon/authenticated_security_definer_function_executable
-- ============================================================================
-- handle_new_user je SECURITY DEFINER auth trigger (on_auth_user_created na
-- auth.users) — poziva ga isključivo sistem kroz trigger pri signup-u.
-- Ne sme biti dostupan kao PostgREST RPC (/rest/v1/rpc/handle_new_user).
--
-- Bezbedno za prod: REVOKE ne utiče na trigger fire — trigger se izvršava
-- sa pravima vlasnika funkcije (postgres), kao i do sada.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
