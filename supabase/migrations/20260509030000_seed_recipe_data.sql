-- ============================================================================
-- Seed recipe data: prep_time + steps for top main meals
-- ============================================================================
--
-- Pokriveno: 25 ključnih jela (svi lunch + dinner + 5 breakfast).
-- Snacks i shake-ovi ostaju bez koraka (instant prep — prep_time = 1-3 min).
--
-- video_url placeholder polje ostaje NULL — trener (Ivana) može da snimi i
-- popuni preko dashboard-a kasnije. UI elegantno gracefuly degrade kad nema
-- video-a (prikaže samo recept).
-- ============================================================================

-- ── BREAKFAST (top 5) ──

UPDATE public.food_items SET prep_time_min = 8, recipe_steps = '[
  { "n": 1, "text_en": "Combine oats and milk in a small pot, bring to gentle boil.", "text_sr": "Pomešaj ovas i mleko u manjem loncu, pusti da prokuva." },
  { "n": 2, "text_en": "Lower heat, stir 4 minutes until creamy.", "text_sr": "Smanji vatru, mešaj 4 minuta dok ne postane kremasto." },
  { "n": 3, "text_en": "Pour into bowl, stir in whey protein.", "text_sr": "Preli u činiju, dodaj i izmešaj whey protein." },
  { "n": 4, "text_en": "Top with sliced banana, drizzle honey, sprinkle cinnamon.", "text_sr": "Dodaj iseckanu bananu, prelij medom, pospi cimetom." }
]'::jsonb
WHERE name_en = 'Oatmeal with Banana & Whey Protein';

UPDATE public.food_items SET prep_time_min = 5, recipe_steps = '[
  { "n": 1, "text_en": "Spoon Greek yogurt into a bowl.", "text_sr": "Stavi grčki jogurt u činiju." },
  { "n": 2, "text_en": "Top with mixed berries and granola.", "text_sr": "Dodaj bobičasto voće i granolu." },
  { "n": 3, "text_en": "Drizzle with honey and serve.", "text_sr": "Prelij medom i serviraj." }
]'::jsonb
WHERE name_en = 'Greek Yogurt with Berries & Granola';

UPDATE public.food_items SET prep_time_min = 12, recipe_steps = '[
  { "n": 1, "text_en": "Whisk eggs in a bowl with salt and pepper.", "text_sr": "Umuti jaja sa solju i biberom." },
  { "n": 2, "text_en": "Heat olive oil in non-stick pan over medium heat.", "text_sr": "Zagrej maslinovo ulje u tiganju na srednjoj vatri." },
  { "n": 3, "text_en": "Sauté mushrooms and bell pepper 3 minutes.", "text_sr": "Propržiti pečurke i papriku 3 minuta." },
  { "n": 4, "text_en": "Add spinach, wilt 30 seconds.", "text_sr": "Dodaj spanać, kratko propržiti 30 sekundi." },
  { "n": 5, "text_en": "Pour eggs over veggies, cook until set 4 minutes.", "text_sr": "Prelij jajima preko povrća, peci dok se ne stegne 4 minuta." }
]'::jsonb
WHERE name_en = 'Veggie Omelet';

UPDATE public.food_items SET prep_time_min = 5, servings = 1, recipe_steps = '[
  { "n": 1, "text_en": "In a jar, combine oats, chia seeds, almond milk, honey.", "text_sr": "U teglu stavi ovas, chia semenke, bademovo mleko, med." },
  { "n": 2, "text_en": "Stir well, cover, refrigerate overnight (8h).", "text_sr": "Dobro promešaj, poklopi, ostavi u frižideru preko noći (8h)." },
  { "n": 3, "text_en": "Morning: top with raspberries and almonds.", "text_sr": "Ujutru: dodaj maline i bademe." }
]'::jsonb
WHERE name_en = 'Overnight Oats with Chia Seeds';

UPDATE public.food_items SET prep_time_min = 15, recipe_steps = '[
  { "n": 1, "text_en": "Blend oats, protein powder, egg, milk, baking powder.", "text_sr": "Izmiksaj ovas, proteinski prah, jaje, mleko, prašak za pecivo." },
  { "n": 2, "text_en": "Heat non-stick pan over medium heat.", "text_sr": "Zagrej tiganj na srednjoj vatri." },
  { "n": 3, "text_en": "Pour 1/4 cup batter, cook 2 min per side until golden.", "text_sr": "Sipaj 1/4 šolje smese, peci 2 min sa svake strane do zlatne boje." },
  { "n": 4, "text_en": "Stack and top with berries.", "text_sr": "Naslažite i dodaj bobicu." }
]'::jsonb
WHERE name_en = 'Oat Protein Pancakes';

-- ── LUNCH (5) ──

UPDATE public.food_items SET prep_time_min = 30, recipe_steps = '[
  { "n": 1, "text_en": "Preheat oven to 200°C. Cube sweet potato, toss in olive oil + salt.", "text_sr": "Zagrej rernu na 200°C. Iseci slatki krompir na kocke, pomešaj sa maslinovim uljem i solju." },
  { "n": 2, "text_en": "Roast sweet potato 20 min on parchment.", "text_sr": "Peci slatki krompir 20 min na pek-papiru." },
  { "n": 3, "text_en": "Season chicken breast with garlic, rosemary, salt.", "text_sr": "Začini pileće belo meso belim lukom, ruzmarinom, solju." },
  { "n": 4, "text_en": "Grill chicken 6 min per side until 75°C internal.", "text_sr": "Pržiti pile na grilu 6 min sa svake strane dok ne dostigne 75°C unutra." },
  { "n": 5, "text_en": "Steam broccoli 5 min until bright green.", "text_sr": "Skuvaj brokoli na pari 5 min dok ne postane svetlozelen." },
  { "n": 6, "text_en": "Plate chicken sliced, serve with sweet potato + broccoli.", "text_sr": "Iseci pile na trake, serviraj sa slatkim krompirom i brokolijem." }
]'::jsonb
WHERE name_en = 'Grilled Chicken with Sweet Potato & Broccoli';

UPDATE public.food_items SET prep_time_min = 25, recipe_steps = '[
  { "n": 1, "text_en": "Cook basmati rice per package (15 min).", "text_sr": "Kuvaj basmati pirinač po uputstvu (15 min)." },
  { "n": 2, "text_en": "Slice beef thinly across the grain.", "text_sr": "Iseci govedinu tanko, popreko na vlakna." },
  { "n": 3, "text_en": "Heat olive oil in wok or large pan, add ginger.", "text_sr": "Zagrej maslinovo ulje u woku ili većem tiganju, dodaj đumbir." },
  { "n": 4, "text_en": "Stir-fry beef 3 min until just cooked, set aside.", "text_sr": "Pržiti govedinu 3 min dok se tek skuva, ostaviti sa strane." },
  { "n": 5, "text_en": "Stir-fry peppers + onions 3 min.", "text_sr": "Pržiti papriku i luk 3 min." },
  { "n": 6, "text_en": "Return beef, add soy sauce, toss 1 min.", "text_sr": "Vrati govedinu, dodaj soja sos, izmiksaj 1 min." },
  { "n": 7, "text_en": "Serve over rice.", "text_sr": "Serviraj preko pirinča." }
]'::jsonb
WHERE name_en = 'Beef Stir-fry with Basmati Rice';

UPDATE public.food_items SET prep_time_min = 35, servings = 2, recipe_steps = '[
  { "n": 1, "text_en": "Sauté onion, carrot, celery in olive oil 5 min.", "text_sr": "Propržiti luk, šargarepu, celer na maslinovom ulju 5 min." },
  { "n": 2, "text_en": "Add tomato sauce, herbs, simmer 2 min.", "text_sr": "Dodaj sos od paradajza, začinsko bilje, kuvaj 2 min." },
  { "n": 3, "text_en": "Add cooked lentils + 200ml water, simmer 20 min.", "text_sr": "Dodaj kuvano sočivo + 200ml vode, krčkati 20 min." },
  { "n": 4, "text_en": "Season with salt and pepper, serve hot.", "text_sr": "Začini solju i biberom, serviraj toplo." }
]'::jsonb
WHERE name_en = 'Lentil & Vegetable Stew';

UPDATE public.food_items SET prep_time_min = 20, recipe_steps = '[
  { "n": 1, "text_en": "Mix ground turkey with herbs, salt, pepper. Form patty.", "text_sr": "Izmesi mleveni ćuretinu sa začinima, solju, biberom. Formiraj pljeskavicu." },
  { "n": 2, "text_en": "Cook patty in pan 5 min per side.", "text_sr": "Peci pljeskavicu u tiganju 5 min sa svake strane." },
  { "n": 3, "text_en": "Combine cooked quinoa + cucumber + tomato + feta + olive oil + lemon.", "text_sr": "Pomešaj kuvanu kvinoju + krastavac + paradajz + feta + maslinovo ulje + limun." },
  { "n": 4, "text_en": "Serve burger over salad.", "text_sr": "Serviraj burger preko salate." }
]'::jsonb
WHERE name_en = 'Turkey Burger with Quinoa Salad';

UPDATE public.food_items SET prep_time_min = 15, recipe_steps = '[
  { "n": 1, "text_en": "Drain and rinse chickpeas if canned.", "text_sr": "Procedi i isperi leblebije ako su iz konzerve." },
  { "n": 2, "text_en": "Chop cucumber, tomato, red onion.", "text_sr": "Iseckaj krastavac, paradajz, crveni luk." },
  { "n": 3, "text_en": "Combine all in bowl, crumble feta on top.", "text_sr": "Pomešaj sve u činiji, izmrvi fetu odozgo." },
  { "n": 4, "text_en": "Drizzle olive oil + lemon, toss with mint.", "text_sr": "Prelij maslinovim uljem + limunom, pomešaj sa nanom." }
]'::jsonb
WHERE name_en = 'Chickpea Mediterranean Bowl';

-- ── DINNER (5) ──

UPDATE public.food_items SET prep_time_min = 25, recipe_steps = '[
  { "n": 1, "text_en": "Preheat oven to 200°C. Place salmon on parchment, season with salt + dill + lemon slices.", "text_sr": "Zagrej rernu na 200°C. Stavi lososa na pek-papir, začini solju, koprom i kriškama limuna." },
  { "n": 2, "text_en": "Cube sweet potato, toss in olive oil, place on same pan.", "text_sr": "Iseci slatki krompir na kocke, pomešaj sa maslinovim uljem, stavi na isti pleh." },
  { "n": 3, "text_en": "Trim asparagus, drizzle olive oil + salt.", "text_sr": "Skratiti šparge, prelij maslinovim uljem + solju." },
  { "n": 4, "text_en": "Bake salmon + sweet potato 18 min, add asparagus last 8 min.", "text_sr": "Peci lososa + slatki krompir 18 min, dodaj šparge poslednjih 8 min." }
]'::jsonb
WHERE name_en = 'Baked Salmon with Asparagus';

UPDATE public.food_items SET prep_time_min = 20, recipe_steps = '[
  { "n": 1, "text_en": "Pulse cauliflower in food processor until rice-like (or use pre-riced).", "text_sr": "Iseckaj karfiol u procesoru dok ne dobije teksturu pirinča (ili kupi gotov)." },
  { "n": 2, "text_en": "Cube chicken, season with salt + pepper.", "text_sr": "Iseci pile na kocke, začini solju i biberom." },
  { "n": 3, "text_en": "Heat olive oil in wok, add ginger, stir-fry chicken 5 min.", "text_sr": "Zagrej maslinovo ulje u woku, dodaj đumbir, pržiti pile 5 min." },
  { "n": 4, "text_en": "Add bell pepper, spring onion, stir-fry 3 min.", "text_sr": "Dodaj papriku, mladi luk, pržiti 3 min." },
  { "n": 5, "text_en": "Add cauliflower rice + soy sauce, toss 4 min.", "text_sr": "Dodaj karfiol pirinač + soja sos, pomešaj 4 min." }
]'::jsonb
WHERE name_en = 'Chicken Stir-fry with Cauliflower Rice';

UPDATE public.food_items SET prep_time_min = 30, recipe_steps = '[
  { "n": 1, "text_en": "Preheat oven to 200°C. Cube zucchini, eggplant, halve tomato.", "text_sr": "Zagrej rernu na 200°C. Iseci tikvice, plavi paradajz na kocke, paradajz na pola." },
  { "n": 2, "text_en": "Toss vegetables in olive oil, garlic, herbs, salt.", "text_sr": "Pomešaj povrće sa maslinovim uljem, belim lukom, začinima, solju." },
  { "n": 3, "text_en": "Roast vegetables 20 min on parchment.", "text_sr": "Peci povrće 20 min na pek-papiru." },
  { "n": 4, "text_en": "Season fish with salt, lemon, herbs.", "text_sr": "Začini ribu solju, limunom, začinima." },
  { "n": 5, "text_en": "Add fish to pan, bake 12 min until flaky.", "text_sr": "Dodaj ribu u pleh, peci 12 min dok se ne raspada na komade." }
]'::jsonb
WHERE name_en = 'White Fish with Roasted Vegetables';

UPDATE public.food_items SET prep_time_min = 20, recipe_steps = '[
  { "n": 1, "text_en": "Press tofu 10 min to remove water, cube.", "text_sr": "Procedi tofu 10 min da izvuče vodu, iseci na kocke." },
  { "n": 2, "text_en": "Heat olive oil in pan, sauté tofu 5 min until golden.", "text_sr": "Zagrej maslinovo ulje, pržiti tofu 5 min do zlatne boje." },
  { "n": 3, "text_en": "Add onion + bell pepper, sauté 3 min.", "text_sr": "Dodaj luk i papriku, pržiti 3 min." },
  { "n": 4, "text_en": "Stir in curry spices, then coconut milk.", "text_sr": "Dodaj curry začine, pa kokosovo mleko." },
  { "n": 5, "text_en": "Add spinach, simmer until wilted 2 min.", "text_sr": "Dodaj spanać, krčkati dok ne uvene 2 min." }
]'::jsonb
WHERE name_en = 'Tofu Vegetable Curry';

UPDATE public.food_items SET prep_time_min = 30, recipe_steps = '[
  { "n": 1, "text_en": "Mix beef with herbs, salt, pepper. Form 6-8 meatballs.", "text_sr": "Izmesi govedinu sa začinima, solju, biberom. Formiraj 6-8 ćufti." },
  { "n": 2, "text_en": "Brown meatballs in pan 6 min, turning.", "text_sr": "Propržiti ćufte u tiganju 6 min, povremeno okrećući." },
  { "n": 3, "text_en": "Add tomato sauce, simmer 12 min.", "text_sr": "Dodaj sos od paradajza, krčkati 12 min." },
  { "n": 4, "text_en": "Cook pasta per package, drain.", "text_sr": "Skuvaj pastu po uputstvu, procedi." },
  { "n": 5, "text_en": "Top pasta with meatballs + sauce + grated mozzarella.", "text_sr": "Posluži pastu sa ćuftama + sosom + rendanom mocarelom." }
]'::jsonb
WHERE name_en = 'Beef Meatballs with Tomato Sauce';

-- ── PRE / POST WORKOUT (3) ──

UPDATE public.food_items SET prep_time_min = 2, recipe_steps = '[
  { "n": 1, "text_en": "Slice banana into bowl.", "text_sr": "Iseci bananu u činiju." },
  { "n": 2, "text_en": "Drizzle honey on top.", "text_sr": "Prelij medom." }
]'::jsonb
WHERE name_en = 'Banana with Honey';

UPDATE public.food_items SET prep_time_min = 10, recipe_steps = '[
  { "n": 1, "text_en": "Cook chicken breast — grill or pan-sear, slice.", "text_sr": "Skuvaj pile — na grilu ili u tiganju, iseci." },
  { "n": 2, "text_en": "Cook white rice (or use pre-cooked).", "text_sr": "Skuvaj beli pirinač (ili koristi gotov)." },
  { "n": 3, "text_en": "Warm tortilla 30 sec in pan.", "text_sr": "Zagrej tortilju 30 sek u tiganju." },
  { "n": 4, "text_en": "Layer rice, chicken, lettuce, tomato, sauce. Roll tight.", "text_sr": "Slaži pirinač, pile, salatu, paradajz, sos. Uvij čvrsto." }
]'::jsonb
WHERE name_en = 'Chicken Wrap with White Rice';

UPDATE public.food_items SET prep_time_min = 15, recipe_steps = '[
  { "n": 1, "text_en": "Cook pasta per package, drain.", "text_sr": "Skuvaj pastu po uputstvu, procedi." },
  { "n": 2, "text_en": "Drain tuna, mash with fork.", "text_sr": "Procedi tunjevinu, izgnječi viljuškom." },
  { "n": 3, "text_en": "Toss pasta + tuna + halved cherry tomatoes + olive oil + herbs.", "text_sr": "Pomešaj pastu + tunjevinu + iseckani čeri paradajz + maslinovo ulje + začine." }
]'::jsonb
WHERE name_en = 'Tuna Pasta';

-- ── EVENING SNACK (1 sa receptom) ──

UPDATE public.food_items SET prep_time_min = 3, recipe_steps = '[
  { "n": 1, "text_en": "Spoon cottage cheese into a small bowl.", "text_sr": "Stavi skir u manju činiju." },
  { "n": 2, "text_en": "Drizzle honey, sprinkle cinnamon.", "text_sr": "Prelij medom, pospi cimetom." }
]'::jsonb
WHERE name_en = 'Cottage Cheese with Cinnamon';

-- ── INSTANT FOODS (snacks, shakes) — samo prep_time, no steps ──

UPDATE public.food_items SET prep_time_min = 1
WHERE name_en IN (
  'Whey Protein Shake (Plain)',
  'Apple with Almond Butter',
  'Hardboiled Eggs with Cucumber',
  'Cottage Cheese & Cherry Tomatoes',
  'Tuna Salad Cup',
  'Roasted Chickpeas',
  'Banana with Peanut Butter',
  'Dark Chocolate & Almonds',
  'Greek Yogurt with Pumpkin Seeds',
  'Greek Yogurt with Oat Sprinkle',
  'Casein Pudding',
  'Chamomile & Almonds',
  'Rice Cake with Honey & Berries'
);

UPDATE public.food_items SET prep_time_min = 5
WHERE name_en IN (
  'Cottage Cheese with Walnuts & Honey',
  'Buckwheat Porridge with Berries',
  'Smoked Salmon Avocado Toast',
  'Egg White Veggie Scramble',
  'Quinoa Breakfast Bowl',
  'Protein Smoothie (Berry)',
  'Oat Protein Bar (homemade)',
  'Whey & Banana Recovery Shake'
);

-- ============================================================================
-- KOMENTAR — video upload future work
-- ============================================================================
--
-- video_url polje je dodato (NULL default). Ivana može da snimi i upload-uje
-- video za svaki recept kroz Trener dashboard:
--   - Upload na Supabase Storage bucket "recipe-videos"
--   - Set food_items.video_url = "<storage-url>"
--   - UI Recipe modal automatski prikazuje player ako video_url IS NOT NULL
--
-- Alternativno: koristiti YouTube embed URL (npr. https://www.youtube.com/embed/xyz)
-- ============================================================================
