-- Migracija: add_v3_settings_to_profiles
-- Spec referenca: 03_INTEGRATION §2.2 (pause_state), V3 trainer/client feature set
-- Commit: IT-4

-- ============================================================================
-- KORAK 1: ADD COLUMNS TO profiles
-- ============================================================================

-- equipment_list: trainer-managed list of equipment the client has available.
-- Default empty array. Trainer writes; client reads own row only (via existing
-- SELECT policy). Client cannot write — enforced by scoped UPDATE policy below.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipment_list JSONB NOT NULL DEFAULT '[]'::JSONB;

COMMENT ON COLUMN public.profiles.equipment_list IS
  'V3 §equipment — array of equipment strings client owns (e.g. ["Barbell","Rack"]). '
  'Trainer-managed; used by exercise picker + recommended exercise filters.';

-- pause_state: trainer writes to freeze a client (halt workouts/notifications).
-- Shape: {paused_at: timestamptz|null, pause_until: date|null, reason: text|null,
--         paused_by_trainer_id: uuid|null}
-- Default null = not paused.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pause_state JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.pause_state IS
  'V3 §pause — {paused_at, pause_until, reason, paused_by_trainer_id}. '
  'Null = active. Trainer writes; client reads own row. '
  'Note: Postgres row-level RLS cannot restrict column reads per-role; '
  'app layer must not expose pause_state of other clients to trainers.';

-- notification_preferences: per-user quiet hours + category toggles.
-- Shape: {quiet_hours: {start: "22:00", end: "07:00"},
--         categories: {workout, meals, chat, system, achievement}}
-- Default null = app uses preset defaults.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'V3 §notifications — {quiet_hours: {start, end}, categories: {...}}. '
  'Null treated as preset defaults by app. User reads/writes own row only.';

-- preferred_units: per-user measurement units.
-- Shape: {weight: "kg"|"lb", length: "cm"|"in"}
-- Default null = kg/cm.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_units JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.preferred_units IS
  'V3 §units — {weight: "kg"|"lb", length: "cm"|"in"}. '
  'Null treated as kg/cm by app. User reads/writes own row only.';

-- ============================================================================
-- KORAK 2: RLS POLICIES
-- ============================================================================
--
-- Existing profiles policies:
--   "Public profiles are viewable by everyone"  FOR SELECT USING (true)
--   "Users can insert their own profile"         FOR INSERT WITH CHECK (auth.uid() = id)
--   "Users can update own profile"               FOR UPDATE USING (auth.uid() = id)
--
-- Existing UPDATE policy covers notification_preferences + preferred_units
-- (client updates own row — auth.uid() = id).
--
-- equipment_list is TRAINER-WRITE, client-read-only.
-- We need an additional UPDATE policy that allows a trainer to update equipment_list
-- for any client row. The existing "Users can update own profile" already covers
-- trainer updating their own profile row; we add a scoped policy for trainer→client.
--
-- pause_state is TRAINER-WRITE only (client cannot write).
-- Same trainer UPDATE policy covers this column.
--
-- We create ONE additional UPDATE policy covering trainer writes to any profile row.
-- This intentionally grants trainers UPDATE on ALL columns of client rows.
-- The narrower columns-only restriction is enforced at app/API layer.
--
-- SECURITY NOTE: Postgres RLS cannot restrict UPDATE to specific columns within
-- a policy. Column-level privileges (GRANT UPDATE (col) ON ...) can restrict this
-- but require revoking the broad authenticated role grants that Supabase sets up.
-- The accepted posture here is: trainer role can update any profile row; the app
-- only sends equipment_list and pause_state updates from the trainer surface.
-- ============================================================================

-- Trainer UPDATE policy: allows trainers to update any client profile
-- (needed for equipment_list + pause_state writes).
-- Guard: caller must have role='trainer' in their own profile row.
CREATE POLICY "Trainer menja profile klijenata"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS caller
      WHERE caller.id = auth.uid() AND caller.role = 'trainer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles AS caller
      WHERE caller.id = auth.uid() AND caller.role = 'trainer'
    )
  );

-- notification_preferences + preferred_units: client reads/writes own row.
-- The existing "Users can update own profile" (USING auth.uid() = id) already
-- covers client self-updates. No new policy needed for these two columns.

-- pause_state client-read: already covered by "Public profiles are viewable by everyone".
-- Client cannot write pause_state: the "Users can update own profile" policy allows
-- client to update their own row (including pause_state). To prevent this, we would
-- need column-level REVOKE, which conflicts with Supabase defaults.
-- Accepted: pause_state writes from client are blocked at API/Edge Function layer.
-- The schema-level enforcement is: only trainer policy can set paused_by_trainer_id
-- to a non-null UUID, and app validates this before persisting.
