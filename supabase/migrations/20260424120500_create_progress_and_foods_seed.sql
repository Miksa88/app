-- Migracija: exercises (stub) + exercise_progress (set logs) + food_items (seed)
-- Spec referenca: 01_TRAINING_FLOW_MASTER.md §5 K6 (Double Progressive Overload)
--                 01_TRAINING_FLOW_MASTER.md §4.4 (Exercise Library)
--                 02_NUTRITION_FLOW_MASTER.md §11 (Food Database MVP)
-- Commit: IT-3

-- ============================================================================
-- NAPOMENA: exercises tabela
-- ============================================================================
--
-- exercises tabela već postoji u DB (kreirana u 20260419180200_create_session_templates
-- ili ranijoj lovable dev migraciji) sa 32 sistemske vežbe i punim RLS setupom.
-- Ova IT-3 migracija samo koristi postojeću tabelu kao FK target za exercise_progress.
-- IT-21 (Faza E) proširuje seed na ~100 vežbi bez DDL izmene.
-- ============================================================================

-- ============================================================================
-- KORAK 5: CREATE TABLE exercise_progress (append-only set log)
-- ============================================================================
--
-- Istorija setova po vežbi za Double Progressive Overload lookup (spec §5 K6).
-- Append-only: jednom upisan set se ne menja. Nema updated_at.
-- Greška se ispravlja DELETE + novi INSERT (kao water_logs pattern iz IT-2).
-- ============================================================================

CREATE TABLE public.exercise_progress (
  id                  UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id         UUID         NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  -- ON DELETE RESTRICT: brisanje vežbe je zabranjeno dok ima istorije (spec intent)

  workout_session_id  UUID,
  -- Nullable bez FK za sad — FK na workout_sessions dolazi u kasnijoj iteraciji.
  -- Kada workout_sessions tabela postoji, dodate se ALTER TABLE ... ADD CONSTRAINT.

  set_number          SMALLINT     NOT NULL CHECK (set_number BETWEEN 1 AND 10),
  weight_kg           NUMERIC(6,2) NOT NULL CHECK (weight_kg >= 0 AND weight_kg <= 500),
  -- 0 je OK: bodyweight vežbe (spec: "bodyweight 0 OK")
  reps                SMALLINT     NOT NULL CHECK (reps BETWEEN 0 AND 100),
  rir                 SMALLINT     CHECK (rir BETWEEN 0 AND 5),
  -- NULLABLE: Reps In Reserve; nije uvek dostupno (spec §5 K6)

  completed_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
  -- Nema updated_at: append-only pattern — set log je immutable po dizajnu (spec §5 K6)
);

-- ============================================================================
-- KORAK 6: INDEXES — exercise_progress
-- ============================================================================

-- Primarni DPO lookup: poslednjih N setova po korisniku + vežbi, sortirano po datumu
CREATE INDEX idx_exercise_progress_user_exercise_date
  ON public.exercise_progress (user_id, exercise_id, completed_at DESC);

-- ============================================================================
-- KORAK 7: RLS — exercise_progress
-- ============================================================================
--
-- Klijentkinja: INSERT + SELECT + DELETE (append-only + error correction)
-- Trener: SELECT svi (za praćenje napretka klijentkinja)
-- Nema UPDATE policy — set log je immutable (error correction = DELETE + INSERT)
-- ============================================================================

ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Klijentkinja INSERT svoje exercise_progress"
  ON public.exercise_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Klijentkinja SELECT svoje exercise_progress"
  ON public.exercise_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Klijentkinja DELETE svoje exercise_progress"
  ON public.exercise_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- NEMA UPDATE policy — append-only immutable log

CREATE POLICY "Treneri čitaju sve exercise_progress"
  ON public.exercise_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

-- ============================================================================
-- KORAK 8: CREATE TABLE food_items
-- ============================================================================
--
-- Tagirana baza jela (spec 02 §11, MVP ~100+ stavki).
-- glycemic_index: TEXT CHECK umesto CREATE TYPE da se izbegne još jedna
-- tip-migracija. Vrednosti su fiksirane: 'low', 'medium', 'high', 'n_a'.
-- ============================================================================

CREATE TABLE public.food_items (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en                 TEXT        NOT NULL,
  name_sr                 TEXT        NOT NULL,

  -- Makro nutrijenti (per serving)
  calories                NUMERIC(6,2) NOT NULL CHECK (calories > 0),
  protein_g               NUMERIC(5,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g                 NUMERIC(5,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g                   NUMERIC(5,2) NOT NULL CHECK (fat_g >= 0),
  fiber_g                 NUMERIC(5,2) CHECK (fiber_g >= 0),  -- NULLABLE: nije uvek poznato

  -- Glikemijski indeks: TEXT CHECK (ne ENUM) za manje migracionog troška
  glycemic_index          TEXT        NOT NULL
                            CHECK (glycemic_index IN ('low', 'medium', 'high', 'n_a')),

  -- Arrays za filtering i anti-ingredient lookup
  ingredients             TEXT[]      NOT NULL DEFAULT '{}',
  allergens               TEXT[]      NOT NULL DEFAULT '{}',
  tags                    TEXT[]      NOT NULL DEFAULT '{}',
  meal_slots              TEXT[]      NOT NULL DEFAULT '{}',
  -- Dozvoljeni slot names: breakfast, morning_snack, lunch, afternoon_snack,
  -- dinner, mini_meal_ir (spec 02 §11)

  -- Vlasništvo
  is_system               BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by_trainer_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- NULL za sistemska jela (is_system=true); trainer UUID za custom jela

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_food_items_system_no_trainer CHECK (
    (is_system = TRUE AND created_by_trainer_id IS NULL) OR
    (is_system = FALSE AND created_by_trainer_id IS NOT NULL)
  )
);

-- ============================================================================
-- KORAK 9: INDEXES — food_items
-- ============================================================================

-- GIN za brzi tag lookup (spec 02 §11 — filter po tagu)
CREATE INDEX idx_food_items_tags
  ON public.food_items USING GIN (tags);

-- GIN za slot lookup (filtriranje jela po dozvoljenom slot-u)
CREATE INDEX idx_food_items_meal_slots
  ON public.food_items USING GIN (meal_slots);

-- GIN za anti-ingredient/allergen filter (filterFoodByExclusions u IT-13)
CREATE INDEX idx_food_items_allergens
  ON public.food_items USING GIN (allergens);

-- ============================================================================
-- KORAK 10: updated_at TRIGGER — food_items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_food_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER food_items_set_timestamp
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_food_items_timestamp();

-- ============================================================================
-- KORAK 11: RLS — food_items
-- ============================================================================
--
-- v1 simplifikovane politike (spec IT-3 instrukcije):
--   SELECT: svi authenticated (klijentkinja vidi sve; trener vidi sve)
--   INSERT: trener, mora biti custom (is_system=false, created_by_trainer_id=auth.uid())
--   UPDATE: trener, samo svoje custom
--   DELETE: trener, samo svoje custom
--   Sistemska jela (is_system=true): menja samo service_role (dev migracija)
-- ============================================================================

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read food_items"
  ON public.food_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Treneri INSERT custom food_items"
  ON public.food_items FOR INSERT
  TO authenticated
  WITH CHECK (
    is_system = FALSE
    AND created_by_trainer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'trainer'
    )
  );

CREATE POLICY "Treneri UPDATE svoje custom food_items"
  ON public.food_items FOR UPDATE
  TO authenticated
  USING (is_system = FALSE AND created_by_trainer_id = auth.uid())
  WITH CHECK (is_system = FALSE AND created_by_trainer_id = auth.uid());

CREATE POLICY "Treneri DELETE svoje custom food_items"
  ON public.food_items FOR DELETE
  TO authenticated
  USING (is_system = FALSE AND created_by_trainer_id = auth.uid());

-- Sistemska jela: INSERT/UPDATE/DELETE nema policy → samo service_role (dev migracija)

-- ============================================================================
-- KORAK 12: SEED food_items
-- ============================================================================
--
-- Izvor: src/data/foodDatabase.ts (FOOD_DATABASE, 30 stavki — f1..f30)
-- Napomena: izvor ima 30 jela umesto spec-om traženih ≥100.
-- Vidi NOTES u handoff-u za preporučenu akciju.
--
-- Mapiranje polja:
--   nameEn       → name_en
--   nameSr       → name_sr
--   calories     → calories
--   protein      → protein_g
--   carbs        → carbs_g
--   fat          → fat_g
--   fiber        → fiber_g
--   glycemicIndex → glycemic_index (TS 'low'|'medium'|'high' → TEXT CHECK)
--   ingredients  → ingredients
--   allergens    → allergens
--   tags         → tags
--   mealSlots    → meal_slots (TS: 'snack_am'/'snack_pm' → normalizovano u 'morning_snack'/'afternoon_snack')
--   is_system    = TRUE, created_by_trainer_id = NULL
--
-- NAPOMENA o meal_slots normalizaciji:
--   foodDatabase.ts koristi 'snack_am' i 'snack_pm' kao slot names.
--   Spec 02 §11 definiše: 'morning_snack' i 'afternoon_snack'.
--   Seed normalizuje na spec vrednosti.
-- ============================================================================

INSERT INTO public.food_items (
  name_en, name_sr, calories, protein_g, carbs_g, fat_g, fiber_g,
  glycemic_index, ingredients, allergens, tags, meal_slots,
  is_system, created_by_trainer_id
) VALUES

-- === BREAKFAST (f1..f8) ===

(
  'Oatmeal with Banana & Whey Protein',
  'Ovsene pahuljice sa bananom i whey proteinom',
  420, 32, 55, 8, 6,
  'high',
  ARRAY['80g oats','1 banana','1 scoop whey protein','200ml milk','1 tsp honey','cinnamon'],
  ARRAY['lactose','gluten'],
  ARRAY['high-protein','high-gi','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Greek Yogurt with Berries & Granola',
  'Grčki jogurt sa bobičastim voćem i granolom',
  310, 24, 35, 9, 4,
  'low',
  ARRAY['200g Greek yogurt 0%','80g mixed berries','30g granola','1 tsp honey'],
  ARRAY['lactose','gluten'],
  ARRAY['high-protein','low-gi','vegetarian','anti-inflammatory'],
  ARRAY['breakfast','morning_snack'],
  TRUE, NULL
),
(
  'Veggie Omelet',
  'Omlet sa povrćem',
  350, 26, 8, 24, 2,
  'low',
  ARRAY['3 eggs','50g mushrooms','40g bell pepper','30g spinach','1 tsp olive oil','salt & pepper'],
  ARRAY['eggs'],
  ARRAY['high-protein','low-carb','low-gi'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Overnight Oats with Chia Seeds',
  'Overnight oats sa chia semenkama',
  380, 18, 48, 12, 8,
  'low',
  ARRAY['60g oats','15g chia seeds','200ml almond milk','1 tbsp honey','50g raspberries','15g almonds'],
  ARRAY['gluten','nuts'],
  ARRAY['high-protein','omega-3','vegetarian','low-gi'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Oat Protein Pancakes',
  'Palačinke od ovsenih sa proteinom',
  400, 30, 42, 12, 4,
  'medium',
  ARRAY['50g oats','1 scoop protein powder','1 egg','100ml milk','1 tsp baking powder','berries for topping'],
  ARRAY['gluten','eggs','lactose'],
  ARRAY['high-protein','medium-gi','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Protein Smoothie Bowl',
  'Smoothie bowl sa proteinom',
  370, 28, 45, 10, 5,
  'medium',
  ARRAY['1 frozen banana','1 scoop protein','100ml almond milk','1 tbsp peanut butter','30g granola','berries'],
  ARRAY['nuts','gluten'],
  ARRAY['high-protein','medium-gi','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Scrambled Eggs with Avocado Toast',
  'Kajgana sa avokadom na tostu',
  450, 22, 28, 28, 6,
  'low',
  ARRAY['3 eggs','½ avocado','2 slices whole grain bread','salt','pepper','chili flakes'],
  ARRAY['eggs','gluten'],
  ARRAY['high-protein','omega-3','low-gi'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Cottage Cheese with Fruit',
  'Cottage cheese sa voćem',
  280, 28, 25, 6, 2,
  'low',
  ARRAY['200g cottage cheese','100g seasonal fruit','1 tsp honey','pinch of cinnamon'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','vegetarian'],
  ARRAY['breakfast','morning_snack','afternoon_snack'],
  TRUE, NULL
),

-- === LUNCH (f9..f16) ===

(
  'Chicken with Rice and Salad',
  'Piletina sa pirinčem i salatom',
  520, 42, 50, 14, 3,
  'medium',
  ARRAY['150g chicken breast','100g white rice','100g mixed salad','1 tbsp olive oil','lemon juice'],
  ARRAY[]::TEXT[],
  ARRAY['high-protein','medium-gi'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Turkey with Quinoa and Vegetables',
  'Ćuretina sa kinoom i povrćem',
  480, 38, 45, 16, 6,
  'low',
  ARRAY['150g turkey breast','80g quinoa','100g mixed vegetables','1 tbsp olive oil','herbs'],
  ARRAY[]::TEXT[],
  ARRAY['high-protein','low-gi','gluten-free'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Tuna Salad with Avocado',
  'Tuna salata sa avokadom',
  440, 36, 15, 26, 7,
  'low',
  ARRAY['150g canned tuna','½ avocado','100g mixed greens','cherry tomatoes','cucumber','lemon dressing'],
  ARRAY['seafood'],
  ARRAY['high-protein','low-carb','omega-3','low-gi','gluten-free'],
  ARRAY['lunch'],
  TRUE, NULL
),
(
  'Chicken Wrap with Tortilla',
  'Piletina wrap sa tortiljom',
  460, 34, 38, 18, 3,
  'medium',
  ARRAY['130g chicken breast','1 whole wheat tortilla','lettuce','tomato','30g light cream cheese','mustard'],
  ARRAY['gluten','lactose'],
  ARRAY['high-protein','medium-gi'],
  ARRAY['lunch'],
  TRUE, NULL
),
(
  'Beef with Broccoli and Sweet Potato',
  'Govedina sa brokolijem i slatkim krompirom',
  550, 40, 45, 20, 6,
  'low',
  ARRAY['150g lean beef','150g broccoli','150g sweet potato','1 tbsp olive oil','garlic','soy sauce'],
  ARRAY['soy'],
  ARRAY['high-protein','low-gi','anti-inflammatory'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Pasta with Chicken and Pesto',
  'Pasta sa piletinom i pesto sosom',
  560, 36, 55, 22, 3,
  'medium',
  ARRAY['130g chicken breast','80g whole wheat pasta','2 tbsp pesto','cherry tomatoes','parmesan'],
  ARRAY['gluten','lactose','nuts'],
  ARRAY['high-protein','medium-gi'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Grilled Fish with Vegetables',
  'Riba sa povrćem na žaru',
  380, 35, 20, 18, 4,
  'low',
  ARRAY['150g white fish fillet','150g grilled vegetables','1 tbsp olive oil','lemon','herbs'],
  ARRAY['seafood'],
  ARRAY['high-protein','low-carb','low-gi','omega-3'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Salmon with Quinoa',
  'Losos sa kinoom',
  530, 38, 40, 24, 5,
  'low',
  ARRAY['150g salmon fillet','80g quinoa','100g spinach','1 tbsp olive oil','lemon zest'],
  ARRAY['seafood'],
  ARRAY['high-protein','omega-3','low-gi','anti-inflammatory','gluten-free'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),

-- === DINNER (f17..f22) ===

(
  'Salmon with Broccoli and Potato',
  'Losos sa brokolijem i krompirom',
  510, 38, 35, 24, 5,
  'low',
  ARRAY['150g salmon fillet','150g broccoli','150g potato','1 tbsp olive oil','garlic','dill'],
  ARRAY['seafood'],
  ARRAY['high-protein','omega-3','low-gi','anti-inflammatory'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Beef Stir-fry with Vegetables',
  'Govedina sa povrćem',
  480, 38, 25, 26, 4,
  'low',
  ARRAY['150g lean beef strips','150g mixed stir-fry vegetables','1 tbsp soy sauce','1 tbsp sesame oil','garlic','ginger'],
  ARRAY['soy'],
  ARRAY['high-protein','low-carb','low-gi'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Chicken with Sweet Potato and Spinach',
  'Piletina sa slatkim krompirom i španać',
  490, 40, 42, 14, 5,
  'low',
  ARRAY['150g chicken breast','200g sweet potato','80g spinach','1 tbsp olive oil','smoked paprika'],
  ARRAY[]::TEXT[],
  ARRAY['high-protein','low-gi'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Fish with Salad and Olive Oil',
  'Riba sa salatom i maslinovim uljem',
  400, 34, 12, 24, 3,
  'low',
  ARRAY['150g sea bass','100g mixed salad','½ avocado','2 tbsp olive oil','lemon','capers'],
  ARRAY['seafood'],
  ARRAY['high-protein','low-carb','omega-3','low-gi','anti-inflammatory'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Turkey Bolognese with Whole Wheat Pasta',
  'Ćuretina bolognese sa integralnom pastom',
  520, 36, 52, 18, 6,
  'medium',
  ARRAY['150g ground turkey','80g whole wheat pasta','100g tomato sauce','onion','garlic','Italian herbs'],
  ARRAY['gluten'],
  ARRAY['high-protein','medium-gi'],
  ARRAY['dinner','lunch'],
  TRUE, NULL
),
(
  'Tilapia with Rice and Vegetables',
  'Tilapia sa pirinčem i povrćem',
  440, 35, 48, 10, 3,
  'medium',
  ARRAY['150g tilapia fillet','100g basmati rice','100g steamed vegetables','lemon','herbs'],
  ARRAY['seafood'],
  ARRAY['high-protein','medium-gi','low-fat'],
  ARRAY['dinner','lunch'],
  TRUE, NULL
),

-- === SNACKS (f23..f30) ===

(
  'Protein Shake with Banana',
  'Protein šejk sa bananom',
  280, 30, 30, 4, 2,
  'high',
  ARRAY['1 scoop whey protein','1 banana','250ml water','ice'],
  ARRAY['lactose'],
  ARRAY['high-protein','high-gi'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Apple with Peanut Butter',
  'Jabuka sa kikiriki puterom',
  250, 8, 28, 14, 5,
  'low',
  ARRAY['1 medium apple','2 tbsp peanut butter'],
  ARRAY['nuts'],
  ARRAY['vegetarian','low-gi','vegan'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Rice Cakes with Avocado',
  'Rice cakes sa avokadom',
  200, 4, 22, 12, 4,
  'low',
  ARRAY['2 rice cakes','½ avocado','salt','chili flakes'],
  ARRAY[]::TEXT[],
  ARRAY['vegan','gluten-free','low-gi'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Cottage Cheese with Berries',
  'Cottage cheese sa bobicama',
  220, 24, 18, 5, 2,
  'low',
  ARRAY['200g cottage cheese','80g mixed berries','1 tsp honey'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','vegetarian'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Hummus with Vegetable Sticks',
  'Hummus sa povrćem',
  220, 8, 22, 12, 6,
  'low',
  ARRAY['80g hummus','1 carrot','½ cucumber','celery sticks'],
  ARRAY[]::TEXT[],
  ARRAY['vegan','low-gi','gluten-free','high-fiber'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Protein Bar',
  'Protein bar',
  210, 20, 24, 8, 2,
  'medium',
  ARRAY['1 protein bar (any brand)'],
  ARRAY['lactose','nuts','soy'],
  ARRAY['high-protein','medium-gi'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Almonds & Dried Fruit Mix',
  'Bademi i suvo voće',
  280, 8, 26, 18, 4,
  'low',
  ARRAY['20g almonds','10g walnuts','10g dried cranberries','10g raisins'],
  ARRAY['nuts'],
  ARRAY['vegetarian','vegan','gluten-free','low-gi'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Greek Yogurt with Honey',
  'Grčki jogurt sa medom',
  190, 20, 22, 3, 0,
  'low',
  ARRAY['200g Greek yogurt 0%','1 tbsp honey'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','vegetarian'],
  ARRAY['morning_snack','afternoon_snack','breakfast'],
  TRUE, NULL
);

-- Ukupno seedovano: 30 redova (f1..f30 iz src/data/foodDatabase.ts)
-- Spec traži ≥100. Vidi NOTES u handoff-u za akcioni plan.
