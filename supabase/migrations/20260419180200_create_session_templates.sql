-- ============================================================================
-- Migracija #3: Create session_templates + client_template_assignments
-- Spec referenca: 01_TRAINING_FLOW_MASTER.md Sekcija 3 (Template sistem)
--                 i Sekcija 4.3 (SessionTemplate data model)
-- ============================================================================
--
-- Template sistem ima 4 pozicije (beginner_3, beginner_4, intermediate_4,
-- intermediate_5). Po svakoj poziciji: TAČNO 1 active + do 3 inactive.
--
-- Invarijanta "1 active per position" je DB constraint, ne business rule —
-- partial unique index garantuje da kod nikad ne može da ostavi sistem u
-- nekonzistentnom stanju, čak i ako Sync Engine ima bug.
--
-- ============================================================================
-- KORAK 1: ENUM tipovi
-- ============================================================================

-- 4 pozicije pokrivaju sve legalne kombinacije experience × frequency
-- (Sekcija 3 spec-a 01 — Conditional branching)
CREATE TYPE public.template_position AS ENUM (
  'beginner_3',
  'beginner_4',
  'intermediate_4',
  'intermediate_5'
);

-- Active = trenutno koristi za nove klijentkinje. Inactive = arhiva.
CREATE TYPE public.template_status AS ENUM ('active', 'inactive');

-- Goal Overlay-i (Sekcija 3 — fiksni u sistemu, ne menjaju se)
CREATE TYPE public.goal_overlay AS ENUM ('GLUTE_FOCUS', 'TONE', 'FAT_LOSS');

-- ============================================================================
-- KORAK 2: session_templates tabela
-- ============================================================================

CREATE TABLE public.session_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                         -- prikazno ime u UI-u

  -- Pozicija — KLJUČ koji određuje kojim klijentkinjama se template dodeljuje
  position public.template_position NOT NULL,

  -- Status (active / inactive)
  status public.template_status NOT NULL DEFAULT 'inactive',

  -- Tipovi vlasništva
  is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
  trainer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                                              -- NULL za sistemske, trainer ID za custom

  -- Skeleton — pun SessionSkeleton kao JSONB
  -- (Sekcija 4.2 spec-a 01: dani, exercise slots, periodizacija)
  -- TS validacija u app-u; DB samo proverava da je JSONB validan
  skeleton JSONB NOT NULL,

  -- Kompatibilni overlay-i (Sekcija 3 — npr. custom template može da isključi TONE)
  compatible_overlays public.goal_overlay[] NOT NULL DEFAULT
    ARRAY['GLUTE_FOCUS', 'TONE', 'FAT_LOSS']::public.goal_overlay[],

  -- Lifecycle metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,      -- kad je poslednji put aktiviran
                                              -- (za new clients bind logiku)
  deactivated_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Konzistentnost: sistemski default-i nemaju trainer_id
  CONSTRAINT chk_system_no_trainer CHECK (
    (is_system_default = TRUE AND trainer_id IS NULL) OR
    (is_system_default = FALSE AND trainer_id IS NOT NULL)
  ),

  -- Konzistentnost: ako je status='active', mora postojati activated_at
  CONSTRAINT chk_active_has_timestamp CHECK (
    status != 'active' OR activated_at IS NOT NULL
  )
);

-- ============================================================================
-- KORAK 3: KRITIČNI partial unique index — "1 active per position"
-- ============================================================================
--
-- Ovo je INVARIJANTA spec-a. Bez ovog indexa, race condition u kod-u bi mogao
-- da napravi 2 active template-a za istu poziciju, i Sync Engine bi onda
-- nepredvidivo birao koji da koristi.

CREATE UNIQUE INDEX one_active_template_per_position
  ON public.session_templates (position)
  WHERE status = 'active';

-- ============================================================================
-- KORAK 4: Sekundarni indexi za česte upite
-- ============================================================================

-- Trener vidi svoje custom template-e
CREATE INDEX idx_session_templates_trainer
  ON public.session_templates (trainer_id)
  WHERE trainer_id IS NOT NULL;

-- Brzo nađi sve aktivne za trener UI dropdown
CREATE INDEX idx_session_templates_active_by_position
  ON public.session_templates (position)
  WHERE status = 'active';

-- Brzo nabroji koliko inactive ima po poziciji (limit 3 enforce-uje app-side)
CREATE INDEX idx_session_templates_inactive_count
  ON public.session_templates (position, status)
  WHERE status = 'inactive';

-- ============================================================================
-- KORAK 5: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_session_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_templates_set_timestamp
  BEFORE UPDATE ON public.session_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_templates_timestamp();

-- ============================================================================
-- KORAK 6: RLS politike
-- ============================================================================
-- Princip: svi authenticated korisnici mogu da čitaju aktivne sistemske
-- template-e (jer onboarding flow ih dohvata pre nego što klijentkinja zna
-- ko joj je trener). Trener može da menja samo svoje custom template-e.
-- Sistemski default-i se ne menjaju kroz app — samo kroz dev migraciju.

ALTER TABLE public.session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Svi vide sistemske template-e"
  ON public.session_templates FOR SELECT
  TO authenticated
  USING (is_system_default = TRUE);

CREATE POLICY "Trener vidi svoje custom template-e"
  ON public.session_templates FOR SELECT
  TO authenticated
  USING (
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

CREATE POLICY "Trener pravi custom template-e"
  ON public.session_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system_default = FALSE AND
    trainer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

CREATE POLICY "Trener menja svoje custom template-e"
  ON public.session_templates FOR UPDATE
  TO authenticated
  USING (
    is_system_default = FALSE AND
    trainer_id = auth.uid()
  );

CREATE POLICY "Trener briše svoje custom template-e"
  ON public.session_templates FOR DELETE
  TO authenticated
  USING (
    is_system_default = FALSE AND
    trainer_id = auth.uid()
  );

-- INSERT/UPDATE sistemskih default-a: NEMA policy → samo service_role može.
-- To je namerno — sistemski default-i se postavljaju samo kroz dev migraciju.

COMMENT ON TABLE public.session_templates IS
  'Skeleton template-i za trening. 4 pozicije × 1 active + do 3 inactive. ' ||
  'Sistemski default-i su seedovani u dev migraciji; trener pravi custom ' ||
  'template-e za svoje klijentkinje. Spec: 01_TRAINING Sekcija 3.';

COMMENT ON COLUMN public.session_templates.skeleton IS
  'Pun SessionSkeleton interface (vidi src/types/training.ts). Sadrži dane, ' ||
  'exercise slots, periodizaciju. Validacija je TS-side; DB samo čuva JSONB.';

COMMENT ON INDEX one_active_template_per_position IS
  'KRITIČNA invarijanta: tačno 1 active template po poziciji. Bez ovog ' ||
  'indexa, race condition bi mogao da napravi 2 active i Sync Engine bi ' ||
  'nepredvidivo birao. NIKAD NE BRISATI.';

-- ============================================================================
-- KORAK 7: client_template_assignments — snapshot binding
-- ============================================================================
--
-- Kad klijentkinja završi onboarding, uzima trenutno active template za svoju
-- poziciju i ZAKLJUČAVA ga (snapshot). Posle toga, čak i ako trener aktivira
-- novi template, ova klijentkinja ostaje na svom snapshot-u do kraja makro-
-- ciklusa. Razlog: konzistentnost progresije (ne prekidaj usred mezo-a).

CREATE TABLE public.client_template_assignments (
  client_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_template_id UUID NOT NULL REFERENCES public.session_templates(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Position za audit (ako je template kasnije obrisan, znamo koja je bila)
  position public.template_position NOT NULL,

  -- Kraj makrociklusa — kad ovo prodje, klijentkinja se REASSIGN-uje na trenutno
  -- active template (može biti drugi nego njen snapshot)
  macrocycle_ends_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_template
  ON public.client_template_assignments (assigned_template_id);

CREATE TRIGGER client_template_assignments_set_timestamp
  BEFORE UPDATE ON public.client_template_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_templates_timestamp();

ALTER TABLE public.client_template_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja vidi svoju dodelu"
  ON public.client_template_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Trener vidi sve dodele"
  ON public.client_template_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'trainer'
    )
  );

-- INSERT/UPDATE: samo service_role (assign-uje se u backend onboarding flow-u)

COMMENT ON TABLE public.client_template_assignments IS
  'Snapshot binding između klijentkinje i template-a. Spec 01 Sekcija 3 ' ||
  '(Transition pravilo): postojeće klijentkinje ostaju na template-u koji su ' ||
  'započele do kraja makrociklusa, čak i ako trener aktivira novi template.';
