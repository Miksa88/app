// ============================================================================
// useFoodItems — React Query hook za food_items tabelu
// Spec: 02_NUTRITION_FLOW_MASTER.md §11 (FoodItem), IT-3 migracija, IT-13 scope
// ============================================================================
//
// Ovaj hook zamenjuje statički `FOOD_DATABASE` import u Food.tsx (i bilo gde
// gde je korišćen hardkodovano). Učitava redove iz Supabase `food_items`
// tabele (RLS: SELECT za sve authenticated), pa ih mapira u legacy
// `FoodItem` oblik (src/data/foodDatabase.ts) kako bi postojeći kod
// (generateMealPlan, antiIngredientFilter) radio bez refactor-a.
//
// Legacy FoodItem (data/foodDatabase.ts) vs DB row (food_items tabela):
//   - id: string ↔ id (UUID string)
//   - name ↔ name_en (engleski; `name_sr` je nameSr)
//   - calories/protein/carbs/fat/fiber ↔ calories/protein_g/carbs_g/fat_g/fiber_g
//   - mealSlots/ingredients/allergens/tags: string[] ↔ string[]
//   - glycemicIndex: 'low' | 'medium' | 'high' ↔ TEXT ('low'|'medium'|'high')
//
// Polja koja ne postoje u DB-u i za koja popunjavamo bezbedne default-e:
//   - description, nameEn/nameSr (nameEn = name_en, nameSr = name_sr), sugar,
//     sodium (podrazumevana nula — Food.tsx ih ne prikazuje direktno),
//     portionSize, preparation (prazno), prepTime, imageUrl (null)
//
// Query key: `['foodItems']` — globalan (svi korisnici vide isti sistemski pool).
// Trener custom items (is_system=false) će u kasnijim fazama dobiti filter
// `per-clientId` — za sada prikazujemo sve koje RLS dozvoljava (tj. is_system
// ili trener-created kojima klijentkinja ima pristup po RLS policy-ju).
// ============================================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FoodItem } from '@/data/foodDatabase';

// ============================================================================
// DB row type — podseća strukturu iz src/integrations/supabase/types.ts
// ============================================================================

interface FoodItemRow {
  id: string;
  name_en: string;
  name_sr: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  glycemic_index: string;
  ingredients: string[];
  allergens: string[];
  tags: string[];
  meal_slots: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Adapter: DB row → legacy FoodItem shape
// ============================================================================

function toLegacyFoodItem(row: FoodItemRow): FoodItem {
  const gi = (row.glycemic_index ?? 'medium').toLowerCase();
  const normalizedGi: FoodItem['glycemicIndex'] =
    gi === 'low' ? 'low' : gi === 'high' ? 'high' : 'medium';

  return {
    id: row.id,
    name: row.name_en,
    nameEn: row.name_en,
    nameSr: row.name_sr,
    description: '',
    calories: row.calories,
    protein: row.protein_g,
    carbs: row.carbs_g,
    fat: row.fat_g,
    fiber: row.fiber_g ?? 0,
    sugar: 0,
    sodium: 0,
    portionSize: '1 serving',
    mealSlots: row.meal_slots ?? [],
    ingredients: row.ingredients ?? [],
    preparation: [],
    allergens: row.allergens ?? [],
    tags: row.tags ?? [],
    glycemicIndex: normalizedGi,
    prepTime: '',
    imageUrl: null,
  };
}

// ============================================================================
// Loader — SELECT * FROM food_items
// ============================================================================

async function loadFoodItems(): Promise<FoodItem[]> {
  const { data, error } = await supabase
    .from('food_items')
    .select(
      'id, name_en, name_sr, calories, protein_g, carbs_g, fat_g, fiber_g, ' +
      'glycemic_index, ingredients, allergens, tags, meal_slots, is_system, ' +
      'created_at, updated_at',
    );

  if (error) {
    throw new Error(`useFoodItems: ${error.message}`);
  }

  return (data ?? []).map((row) => toLegacyFoodItem(row as FoodItemRow));
}

// ============================================================================
// Hook
// ============================================================================

export interface UseFoodItemsResult {
  foods: FoodItem[];
  isLoading: boolean;
  error: Error | null;
}

export function useFoodItems(): UseFoodItemsResult {
  const query = useQuery<FoodItem[], Error>({
    queryKey: ['foodItems'],
    queryFn: loadFoodItems,
    // Food pool se ne menja često — keširaj 5 min (stale) pre refetch-a
    staleTime: 5 * 60 * 1000,
  });

  return {
    foods: query.data ?? [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
