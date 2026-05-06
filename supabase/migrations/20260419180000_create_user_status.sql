-- ============================================================================
-- user_status — Single Source of Truth za bio + training + nutrition state
-- Spec: 03_INTEGRATION_LAYER.md Sekcija 2 (Centralni UserStatus objekat)
-- ============================================================================
--
-- Filozofija: jedan red po klijentkinji koji čuva sve trenutno stanje.
-- Sva sync pravila (runSyncRules) čitaju i pišu ovaj red. JSONB čuva pun
-- UserStatus shape; tri GENERATED kolone su denormalizovan view za brze
-- indeksirane upite (trener dashboard ne želi da skenira JSON svaki put).
--
-- Persistencija MesocycleQueue-a: JSONB unutar status_json.training.queue
-- (potvrđena arhitektonska odluka — vidi plan file). NE postoji posebna
-- mesocycle_queues tabela.
-- ============================================================================

CREATE TABLE public.user_status (
  client_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status_json JSONB NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Denormalizovane kolone za indeksirane upite
  -- Generirane direktno iz status_json — uvek u sync-u, nikad drift
  is_in_deload BOOLEAN GENERATED ALWAYS AS (
    COALESCE((status_json->'training'->>'isInDeload')::boolean, false)
  ) STORED,

  is_at_risk BOOLEAN GENERATED ALWAYS AS (
    COALESCE((status_json->'redFlags'->>'isAtRisk')::boolean, false)
  ) STORED,

  cycle_phase TEXT GENERATED ALWAYS AS (
    status_json->'bio'->>'cyclePhase'
  ) STORED
);

COMMENT ON TABLE public.user_status IS
  'Single Source of Truth — bio + training + nutrition state per klijentkinja. ' ||
  'Sva mutacija ide kroz Sync Engine (src/utils/sync/syncEngine.ts). ' ||
  'Nikad pisati direktno mimo runSyncRules() — krši Pravilo 2 iz spec-a 03.';

COMMENT ON COLUMN public.user_status.status_json IS
  'Pun UserStatus interface (vidi src/types/userStatus.ts). Sadrži: bio, ' ||
  'training (uključujući queue: MesocycleQueue), nutrition, redFlags, clientOverrides.';

COMMENT ON COLUMN public.user_status.is_in_deload IS
  'Denormalizovano iz training.isInDeload. Koristi se za trener dashboard ' ||
  'counter "Aktivnih klijentkinja na Deload-u" (Sekcija 6.2 spec-a 03).';

COMMENT ON COLUMN public.user_status.is_at_risk IS
  'Denormalizovano iz redFlags.isAtRisk. Koristi se za RedFlagsSection na ' ||
  'trener dashboard-u (Sekcija 6.2 spec-a 03).';

COMMENT ON COLUMN public.user_status.cycle_phase IS
  'Denormalizovano iz bio.cyclePhase. Koristi se za trener counter ' ||
  '"Klijentkinje u Lutealnoj fazi" (info za očekivane symptom check-in-ove).';

-- ============================================================================
-- Indexi — partial za maksimalnu efikasnost (samo "interesantni" redovi)
-- ============================================================================

-- Trener prioritet: ko je u alarmu PRAVO SAD
CREATE INDEX idx_user_status_at_risk
  ON public.user_status (is_at_risk)
  WHERE is_at_risk = true;

-- Trener planiranje: ko je u Deload-u (ne forsiraj progresiju)
CREATE INDEX idx_user_status_deload
  ON public.user_status (is_in_deload)
  WHERE is_in_deload = true;

-- Trener očekivanja: ko je u Lutealnoj fazi (očekuj symptom check-in-ove)
-- Indeksiramo SVE non-null vrednosti, ne samo 'luteal' — koristimo i za
-- 'menstrual' counter ('weightDataReliable = false' batch view)
CREATE INDEX idx_user_status_cycle_phase
  ON public.user_status (cycle_phase)
  WHERE cycle_phase IS NOT NULL;

-- ============================================================================
-- Auto-update last_updated_at — defenzivna mera ako app zaboravi da postavi
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_status_set_timestamp
  BEFORE UPDATE ON public.user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_status_timestamp();

-- ============================================================================
-- Row Level Security
-- Spec 03 Sekcija 4: vlasništvo podataka je striktno; čitači su definisani.
-- - Klijentkinja: čita SVOJ status (read), nikad ne piše direktno
--   (sav write ide kroz server-side Sync Engine sa service_role)
-- - Trener: čita SVE statuse (multi-tenant scoping kroz trainer_client_assignments
--   dolazi u kasnijoj migraciji — za sad pratimo postojeći pattern iz
--   "Trainers can view all progress photos" policy)
-- ============================================================================

ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja vidi svoj status"
  ON public.user_status FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Trener vidi sve statuse"
  ON public.user_status FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

-- INSERT/UPDATE/DELETE: NEMA policy za authenticated korisnike namerno.
-- Sve mutacije idu kroz server-side kod sa service_role key-om koji
-- bypass-uje RLS. Razlog: Sync Engine je jedini legitimni writer; ako
-- bi klijentkinja mogla da napiše svoj status iz browser-a, mogla bi
-- da preskoči sync pravila.

-- ============================================================================
-- Realtime publication — Supabase Realtime za frontend reactivity
-- Spec 03 Sekcija 6: useUserStatus hook se subscribe-uje na postgres_changes
-- ============================================================================

-- Realtime publication već postoji u Supabase by default kao 'supabase_realtime'.
-- Dodajemo našu tabelu da bi push event-i radili.
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;

-- Replica identity FULL omogućuje da Realtime payload sadrži i 'old' record
-- (potrebno za diff detection u client-u — npr. da uoči TRANSITION u luteal fazu)
ALTER TABLE public.user_status REPLICA IDENTITY FULL;
