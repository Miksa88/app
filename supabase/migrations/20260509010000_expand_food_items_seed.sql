-- ============================================================================
-- Expand food_items seed: +35 new system meals for A/B/C rotation coverage
-- Spec: SREDNJE_NAPREDNE_V2 §3.4 (5 obroka šablon, 25-30g protein/obrok)
--       findSimilarMeals utility (mealPlanGenerator.ts) — top 5 macro alternatives
-- ============================================================================
--
-- Cilj: svaki slot mora imati ≥5 različitih jela sa sličnim makroima da bi
-- A/B/C rotacija + auto-swap UI imao značajnu varijaciju.
--
-- Kategorije (target distribution):
--   breakfast: +5 (postojeći 7 → 12)
--   morning_snack: +5 (postojeći 4 → 9)
--   lunch: +5 (postojeći 5 → 10)
--   afternoon_snack: +5 (postojeći 4 → 9)
--   dinner: +5 (postojeći 5 → 10)
--   pre_workout: +3 (postojeći 2 → 5)
--   post_workout: +3 (postojeći 3 → 6)
--   evening_snack: +4 (novo)
--
-- Sve namirnice su sa realnim makroima (validated). Serbian fitness diet
-- patterns: visok protein (25-30g/obrok), niska/srednja GI, kuvano povrće.
-- ============================================================================

INSERT INTO public.food_items (
  name_en, name_sr, calories, protein_g, carbs_g, fat_g, fiber_g,
  glycemic_index, ingredients, allergens, tags, meal_slots,
  is_system, created_by_trainer_id
) VALUES

-- === BREAKFAST (+5) ===

(
  'Cottage Cheese with Walnuts & Honey',
  'Skir sa orasima i medom',
  340, 30, 24, 14, 3,
  'low',
  ARRAY['200g cottage cheese (low-fat)','20g walnuts','1 tbsp honey','1 tsp cinnamon'],
  ARRAY['lactose','nuts'],
  ARRAY['high-protein','low-gi','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Buckwheat Porridge with Berries',
  'Heljdina kaša sa bobicama',
  380, 22, 56, 8, 8,
  'low',
  ARRAY['70g buckwheat groats','100g mixed berries','15g almonds','200ml milk','1 tsp honey'],
  ARRAY['lactose','nuts'],
  ARRAY['high-protein','low-gi','vegan-friendly','gluten-free'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Smoked Salmon Avocado Toast',
  'Tost sa lososom i avokadom',
  420, 28, 30, 22, 6,
  'medium',
  ARRAY['80g smoked salmon','50g whole-grain bread','1/2 avocado','1 tbsp lemon juice','dill'],
  ARRAY['fish','gluten'],
  ARRAY['high-protein','omega-3','anti-inflammatory'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Egg White Veggie Scramble',
  'Belanca sa povrćem',
  280, 26, 16, 12, 4,
  'low',
  ARRAY['6 egg whites','1 whole egg','60g spinach','40g tomato','30g feta cheese','1 tsp olive oil'],
  ARRAY['eggs','lactose'],
  ARRAY['high-protein','low-carb','low-gi','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),
(
  'Quinoa Breakfast Bowl',
  'Kvinoja zdela za doručak',
  390, 24, 48, 11, 7,
  'low',
  ARRAY['80g cooked quinoa','100g Greek yogurt','30g blueberries','15g chia seeds','1 tsp maple syrup'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','gluten-free','vegetarian'],
  ARRAY['breakfast'],
  TRUE, NULL
),

-- === MORNING SNACK (+5) ===

(
  'Apple with Almond Butter',
  'Jabuka sa puterom od badema',
  220, 8, 28, 11, 6,
  'low',
  ARRAY['1 medium apple','15g almond butter'],
  ARRAY['nuts'],
  ARRAY['low-gi','vegan','gluten-free'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Hardboiled Eggs with Cucumber',
  'Tvrdo kuvana jaja sa krastavcem',
  180, 16, 4, 12, 1,
  'low',
  ARRAY['2 hardboiled eggs','100g cucumber','salt & pepper'],
  ARRAY['eggs'],
  ARRAY['high-protein','low-carb','low-gi','vegetarian'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Cottage Cheese & Cherry Tomatoes',
  'Skir sa čeri paradajzom',
  200, 22, 10, 8, 2,
  'low',
  ARRAY['180g cottage cheese (low-fat)','100g cherry tomatoes','black pepper','basil'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-carb','low-gi','vegetarian'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),
(
  'Protein Smoothie (Berry)',
  'Protein smoothie (bobičasto voće)',
  250, 28, 22, 5, 4,
  'medium',
  ARRAY['1 scoop whey protein','100g mixed berries','200ml almond milk','1 tbsp chia seeds'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','vegetarian'],
  ARRAY['morning_snack','pre_workout'],
  TRUE, NULL
),
(
  'Tuna Salad Cup',
  'Šolja salate sa tunjevinom',
  210, 24, 8, 9, 2,
  'low',
  ARRAY['100g canned tuna in water','40g mixed greens','1 tbsp olive oil','lemon','herbs'],
  ARRAY['fish'],
  ARRAY['high-protein','omega-3','low-carb','low-gi'],
  ARRAY['morning_snack','afternoon_snack'],
  TRUE, NULL
),

-- === LUNCH (+5) ===

(
  'Grilled Chicken with Sweet Potato & Broccoli',
  'Pileće belo meso sa slatkim krompirom i brokolijem',
  520, 42, 50, 14, 8,
  'low',
  ARRAY['180g chicken breast','200g sweet potato','150g broccoli','1 tbsp olive oil','garlic','rosemary'],
  ARRAY[]::text[],
  ARRAY['high-protein','low-gi','gluten-free','anti-inflammatory'],
  ARRAY['lunch'],
  TRUE, NULL
),
(
  'Beef Stir-fry with Basmati Rice',
  'Govedina sa basmati pirinčem',
  580, 38, 62, 16, 5,
  'low',
  ARRAY['150g lean beef','100g basmati rice (cooked)','100g bell peppers','60g onions','1 tbsp soy sauce','1 tbsp olive oil','ginger'],
  ARRAY['soy'],
  ARRAY['high-protein','iron-rich','low-gi'],
  ARRAY['lunch'],
  TRUE, NULL
),
(
  'Lentil & Vegetable Stew',
  'Sočivo sa povrćem',
  450, 26, 60, 10, 16,
  'low',
  ARRAY['150g cooked lentils','60g carrots','60g celery','40g onion','tomato sauce','1 tbsp olive oil','herbs'],
  ARRAY[]::text[],
  ARRAY['high-protein','high-fiber','iron-rich','low-gi','vegan','gluten-free'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),
(
  'Turkey Burger with Quinoa Salad',
  'Ćureći burger sa kvinoja salatom',
  490, 38, 42, 14, 6,
  'low',
  ARRAY['150g ground turkey','100g cooked quinoa','60g cucumber','40g cherry tomatoes','1 tbsp olive oil','feta','herbs'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','gluten-free'],
  ARRAY['lunch'],
  TRUE, NULL
),
(
  'Chickpea Mediterranean Bowl',
  'Mediteranska zdela sa leblebijom',
  470, 22, 58, 14, 14,
  'low',
  ARRAY['150g cooked chickpeas','80g cucumber','60g tomato','40g red onion','30g feta','1 tbsp olive oil','lemon','mint'],
  ARRAY['lactose'],
  ARRAY['high-protein','high-fiber','low-gi','vegetarian','anti-inflammatory'],
  ARRAY['lunch','dinner'],
  TRUE, NULL
),

-- === AFTERNOON SNACK (+5) ===

(
  'Whey Protein Shake (Plain)',
  'Whey protein šejk',
  150, 25, 6, 3, 1,
  'medium',
  ARRAY['1 scoop whey protein','250ml water','ice cubes'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-carb','vegetarian'],
  ARRAY['afternoon_snack','post_workout'],
  TRUE, NULL
),
(
  'Roasted Chickpeas',
  'Pečena leblebija',
  170, 8, 22, 5, 6,
  'low',
  ARRAY['80g roasted chickpeas','paprika','salt'],
  ARRAY[]::text[],
  ARRAY['high-protein','high-fiber','low-gi','vegan','gluten-free'],
  ARRAY['afternoon_snack'],
  TRUE, NULL
),
(
  'Banana with Peanut Butter',
  'Banana sa kikirikijevim puterom',
  280, 8, 32, 14, 4,
  'medium',
  ARRAY['1 medium banana','15g peanut butter'],
  ARRAY['nuts'],
  ARRAY['vegan','gluten-free'],
  ARRAY['afternoon_snack','pre_workout'],
  TRUE, NULL
),
(
  'Dark Chocolate & Almonds',
  'Tamna čokolada sa bademima',
  240, 6, 18, 16, 4,
  'low',
  ARRAY['20g dark chocolate (85%)','15g almonds'],
  ARRAY['nuts'],
  ARRAY['vegetarian','antioxidants','low-gi'],
  ARRAY['afternoon_snack','evening_snack'],
  TRUE, NULL
),
(
  'Greek Yogurt with Pumpkin Seeds',
  'Grčki jogurt sa semenkama bundeve',
  220, 24, 14, 8, 2,
  'low',
  ARRAY['200g Greek yogurt 0%','15g pumpkin seeds','1 tsp honey'],
  ARRAY['lactose'],
  ARRAY['high-protein','low-gi','vegetarian','zinc-rich'],
  ARRAY['afternoon_snack'],
  TRUE, NULL
),

-- === DINNER (+5) ===

(
  'Baked Salmon with Asparagus',
  'Pečen losos sa špargama',
  460, 36, 18, 26, 6,
  'low',
  ARRAY['180g salmon fillet','150g asparagus','100g sweet potato','1 tbsp olive oil','lemon','dill'],
  ARRAY['fish'],
  ARRAY['high-protein','omega-3','low-gi','anti-inflammatory','gluten-free'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Chicken Stir-fry with Cauliflower Rice',
  'Pile sa karfiol pirinčem',
  380, 38, 18, 16, 6,
  'low',
  ARRAY['180g chicken breast','200g cauliflower rice','60g bell pepper','40g spring onion','1 tbsp olive oil','ginger','soy sauce'],
  ARRAY['soy'],
  ARRAY['high-protein','low-carb','low-gi','gluten-free'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'White Fish with Roasted Vegetables',
  'Bela riba sa pečenim povrćem',
  390, 32, 30, 14, 8,
  'low',
  ARRAY['180g cod or sea bass','120g zucchini','100g eggplant','80g tomato','1 tbsp olive oil','garlic','herbs'],
  ARRAY['fish'],
  ARRAY['high-protein','low-gi','anti-inflammatory','gluten-free'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Tofu Vegetable Curry',
  'Tofu kari sa povrćem',
  420, 26, 36, 18, 8,
  'low',
  ARRAY['150g tofu','100g spinach','80g bell pepper','60g onion','100ml coconut milk light','1 tbsp olive oil','curry spices'],
  ARRAY['soy'],
  ARRAY['high-protein','low-gi','vegan','gluten-free','anti-inflammatory'],
  ARRAY['dinner'],
  TRUE, NULL
),
(
  'Beef Meatballs with Tomato Sauce',
  'Mesne kuglice u sosu',
  450, 38, 28, 20, 5,
  'low',
  ARRAY['150g lean ground beef','60g whole-grain pasta (cooked)','tomato sauce','30g mozzarella','herbs'],
  ARRAY['gluten','lactose'],
  ARRAY['high-protein','iron-rich','low-gi'],
  ARRAY['dinner'],
  TRUE, NULL
),

-- === PRE-WORKOUT (+3) ===

(
  'Banana with Honey',
  'Banana sa medom',
  150, 2, 36, 1, 3,
  'high',
  ARRAY['1 medium banana','1 tbsp honey'],
  ARRAY[]::text[],
  ARRAY['fast-carbs','vegan','gluten-free'],
  ARRAY['pre_workout'],
  TRUE, NULL
),
(
  'Oat Protein Bar (homemade)',
  'Domaća proteinska pločica od ovsa',
  240, 18, 28, 8, 4,
  'medium',
  ARRAY['40g oats','1 scoop whey protein','15g almond butter','1 tbsp honey','dates'],
  ARRAY['lactose','nuts'],
  ARRAY['high-protein','vegetarian'],
  ARRAY['pre_workout','morning_snack'],
  TRUE, NULL
),
(
  'Rice Cake with Honey & Berries',
  'Galete sa medom i bobicama',
  140, 4, 30, 1, 2,
  'high',
  ARRAY['2 rice cakes','1 tsp honey','30g berries'],
  ARRAY[]::text[],
  ARRAY['fast-carbs','vegan','gluten-free'],
  ARRAY['pre_workout'],
  TRUE, NULL
),

-- === POST-WORKOUT (+3) ===

(
  'Chicken Wrap with White Rice',
  'Tortilja sa piletinom i belim pirinčem',
  490, 36, 58, 12, 4,
  'high',
  ARRAY['150g chicken breast','100g cooked white rice','1 whole-wheat tortilla','60g lettuce','40g tomato','low-fat sauce'],
  ARRAY['gluten'],
  ARRAY['high-protein','high-gi','glycogen-restoring'],
  ARRAY['post_workout'],
  TRUE, NULL
),
(
  'Tuna Pasta',
  'Pasta sa tunjevinom',
  470, 32, 60, 10, 4,
  'medium',
  ARRAY['80g whole-grain pasta','100g canned tuna in water','40g cherry tomato','1 tbsp olive oil','herbs'],
  ARRAY['fish','gluten'],
  ARRAY['high-protein','omega-3','glycogen-restoring'],
  ARRAY['post_workout'],
  TRUE, NULL
),
(
  'Whey & Banana Recovery Shake',
  'Whey i banana shake za oporavak',
  280, 28, 36, 4, 3,
  'high',
  ARRAY['1 scoop whey protein','1 medium banana','250ml low-fat milk','1 tsp honey'],
  ARRAY['lactose'],
  ARRAY['high-protein','high-gi','glycogen-restoring','vegetarian'],
  ARRAY['post_workout'],
  TRUE, NULL
),

-- === EVENING SNACK (+4) — pre-spavanja, casein-like, low-fat za San ===

(
  'Cottage Cheese with Cinnamon',
  'Skir sa cimetom',
  180, 25, 8, 5, 1,
  'low',
  ARRAY['200g cottage cheese (low-fat)','1 tsp cinnamon','1 tsp honey'],
  ARRAY['lactose'],
  ARRAY['high-protein','casein','low-gi','vegetarian','sleep-friendly'],
  ARRAY['evening_snack'],
  TRUE, NULL
),
(
  'Greek Yogurt with Oat Sprinkle',
  'Grčki jogurt sa pahuljicama',
  210, 22, 22, 5, 3,
  'low',
  ARRAY['180g Greek yogurt 0%','20g oats','1 tsp honey','cinnamon'],
  ARRAY['lactose','gluten'],
  ARRAY['high-protein','casein','tryptophan','low-gi','vegetarian','sleep-friendly'],
  ARRAY['evening_snack'],
  TRUE, NULL
),
(
  'Casein Pudding',
  'Casein puding',
  200, 28, 12, 4, 1,
  'low',
  ARRAY['1 scoop casein protein','200ml almond milk','1 tsp cocoa','stevia'],
  ARRAY['lactose'],
  ARRAY['high-protein','casein','low-gi','vegetarian','sleep-friendly'],
  ARRAY['evening_snack'],
  TRUE, NULL
),
(
  'Chamomile & Almonds',
  'Kamilica i bademi',
  160, 6, 8, 12, 3,
  'low',
  ARRAY['250ml chamomile tea','20g almonds','1 tsp honey'],
  ARRAY['nuts'],
  ARRAY['vegan','low-gi','sleep-friendly','gluten-free'],
  ARRAY['evening_snack'],
  TRUE, NULL
);

-- ============================================================================
-- KOMENTAR — production gap notice
-- ============================================================================
--
-- Sa ovim seed-om imamo ~65 food_items pokrivajući svih 8 slot-ova sa najmanje
-- 5 kandidata po slot-u (A/B/C rotacija + auto-swap UI).
--
-- Za pravu produkciju trener (Ivana) treba da seed-uje još:
--   - Regionalne specifikacije (sarma sa povrćem, čuspajz, riblja čorba ...)
--   - Cheat-meal alternative (pizza-like sa whole-wheat)
--   - Sezonska jela (zimska/letnja varijacija)
--   - Vegan-only blok (za buduća proširenja)
--
-- Trenutni 65 fajl je MVP-friendly za testiranje algoritma.
-- ============================================================================
