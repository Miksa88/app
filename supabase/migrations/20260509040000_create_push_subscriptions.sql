-- ============================================================================
-- push_subscriptions — Web Push API endpoint storage
-- ============================================================================
--
-- Klijent registrovan SW pošalje subscription objekat (endpoint + keys) na
-- backend. EF send-push šalje notifikaciju preko Web Push protocol-a.
--
-- One subscription per (user_id, endpoint) — user može biti loginovan na više
-- uređaja istovremeno. UNIQUE constraint na (user_id, endpoint).
-- ============================================================================

CREATE TABLE public.push_subscriptions (
  id              UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint        TEXT         NOT NULL,
  p256dh          TEXT         NOT NULL,
  auth            TEXT         NOT NULL,
  user_agent      TEXT         NULL,
  enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_pushed_at  TIMESTAMPTZ  NULL,
  CONSTRAINT push_subscriptions_user_endpoint_unique UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);
CREATE INDEX idx_push_subscriptions_enabled ON public.push_subscriptions (enabled) WHERE enabled = TRUE;

-- ── RLS ──
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- User vidi samo svoje subscription-e
CREATE POLICY "users_select_own_push_subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- User može da insertuje samo za sebe (registracija sa novog uređaja)
CREATE POLICY "users_insert_own_push_subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User može da update-uje (npr. enabled=false ako kažu "stop notifs")
CREATE POLICY "users_update_own_push_subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User može da obriše svoj subscription (signout, uninstall)
CREATE POLICY "users_delete_own_push_subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- updated_at auto-trigger
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.push_subscriptions IS 'Web Push API subscription endpoints per user device';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Browser push service URL (FCM/Mozilla/Apple)';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Public key for ECDH key agreement (base64url)';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Auth secret (base64url, 16 bytes)';
COMMENT ON COLUMN public.push_subscriptions.enabled IS 'User can disable without deleting (re-enable later)';
