// ============================================================================
// shoppingList — agregira sastojke iz potvrđenih obroka u kupovnu listu
// ============================================================================
//
// Logika:
//   - Iterira kroz sve confirmed slot-ove iz MealPlanWeek
//   - Parse-uje string ingredient-e ("80g oats", "1 banana") u struktuiranu formu
//   - Sumira količine po istoj namirnici
//   - Grupiše po kategoriji (produce, dairy, grains, protein, pantry, other)
//   - Označava šta je u pantry-ju (Set<ingredientName>) → "have at home"
//
// Output: ShoppingList sa stavkama spremnim za UI checklist
// ============================================================================

import type { MealPlanWeek, MealPlanSlot } from "./mealPlanGenerator";
import { FOOD_DATABASE } from "@/data/foodDatabase";

export type ShoppingCategory = "produce" | "dairy" | "grains" | "protein" | "pantry" | "other";

export interface ShoppingItem {
  /** Normalizovani naziv namirnice za grouping (npr. "oats", "milk", "banana") */
  key: string;
  /** Display ime — kraće od key-a ako je moguće */
  displayName: string;
  /** Količina (može biti collapsed iz različitih jedinica — vidi notes) */
  quantity: number;
  unit: string;
  /** Original strings za referencu */
  rawEntries: string[];
  category: ShoppingCategory;
  haveAtHome: boolean;
}

export interface ShoppingList {
  generatedAt: string;
  weekStartDate: string;
  totalItems: number;
  itemsByCategory: Record<ShoppingCategory, ShoppingItem[]>;
}

// ============================================================================
// Ingredient parser
// ============================================================================
//
// Format primera iz foodDatabase-a:
//   "80g oats"
//   "1 banana"
//   "1 scoop whey protein"
//   "200ml milk"
//   "1 tsp honey"
//   "cinnamon" (no qty/unit)
//
// Strategija:
//   - Regex 1: /^([\d.]+)\s*(g|kg|ml|l|tsp|tbsp|cup|scoop)?\s+(.+)$/i
//   - Ako nema match: ceo string je "displayName" sa qty=1, unit="—"
// ============================================================================

interface ParsedIngredient {
  quantity: number;
  unit: string;
  name: string;
}

const QTY_REGEX = /^([\d.]+)\s*(g|kg|ml|l|tsp|tbsp|cup|cups|scoop|scoops|piece|pieces)?\s+(.+)$/i;

function parseIngredient(raw: string): ParsedIngredient {
  const trimmed = raw.trim();
  const m = QTY_REGEX.exec(trimmed);
  if (!m) {
    return { quantity: 1, unit: "—", name: trimmed.toLowerCase() };
  }
  const qty = parseFloat(m[1]) || 1;
  const unit = (m[2] ?? "kom").toLowerCase();
  const name = m[3].toLowerCase().trim();
  return { quantity: qty, unit, name };
}

/** Normalizuj ingredient name za grouping (skini brojeve, cleanup whitespace) */
function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(0%|fat-free|low-fat|fresh|frozen|raw|cooked)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// Kategorizacija
// ============================================================================

const CATEGORY_KEYWORDS: Record<ShoppingCategory, string[]> = {
  produce: [
    "banana", "apple", "berry", "berries", "lemon", "lime", "orange",
    "spinach", "broccoli", "tomato", "cucumber", "lettuce", "carrot",
    "onion", "garlic", "pepper", "avocado", "potato", "sweet potato",
    "kale", "zucchini", "squash", "cauliflower", "celery", "mushroom",
    "fruit", "vegetable", "leafy", "leaves", "herb", "basil", "parsley", "mint", "cilantro",
  ],
  dairy: [
    "milk", "yogurt", "yoghurt", "cheese", "butter", "cream", "kefir",
    "cottage cheese", "mozzarella", "feta", "ricotta", "parmesan",
  ],
  grains: [
    "oats", "rice", "quinoa", "bread", "pasta", "noodle", "tortilla",
    "couscous", "barley", "wheat", "buckwheat", "millet", "granola",
    "cereal", "bagel", "pita", "bun", "wrap",
  ],
  protein: [
    "chicken", "beef", "turkey", "pork", "fish", "salmon", "tuna", "cod",
    "shrimp", "egg", "tofu", "tempeh", "lentil", "chickpea", "bean",
    "whey", "protein powder", "protein bar", "ham", "bacon", "sausage",
  ],
  pantry: [
    "honey", "maple", "syrup", "oil", "olive", "vinegar", "salt", "pepper",
    "cinnamon", "sugar", "flour", "baking", "yeast", "vanilla", "cocoa",
    "spice", "seasoning", "soy sauce", "mustard", "ketchup", "mayo", "tahini",
    "nut butter", "peanut butter", "almond butter", "jam", "preserves",
    "nuts", "seeds", "almond", "walnut", "cashew", "chia", "flax",
  ],
  other: [],
};

function categorize(name: string): ShoppingCategory {
  const lower = name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[ShoppingCategory, string[]]>) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "other";
}

// ============================================================================
// Build shopping list
// ============================================================================

export interface BuildShoppingListInput {
  plan: MealPlanWeek;
  /** Filter: koji slotovi se uključuju (default: confirmed only) */
  includeStatuses?: Array<MealPlanSlot["status"]>;
  /** Set normalizovanih ključeva koje korisnik već ima */
  pantryKeys?: Set<string>;
}

export function buildShoppingList(input: BuildShoppingListInput): ShoppingList {
  const { plan, includeStatuses = ["confirmed", "pending"], pantryKeys = new Set() } = input;

  type Aggregate = {
    quantityByUnit: Record<string, number>;
    rawEntries: string[];
    category: ShoppingCategory;
    displayName: string;
  };
  const aggregates: Record<string, Aggregate> = {};

  for (const slot of plan.slots) {
    if (!includeStatuses.includes(slot.status)) continue;
    const food = FOOD_DATABASE.find(f => f.id === slot.foodId);
    if (!food) continue;

    for (const raw of food.ingredients) {
      const parsed = parseIngredient(raw);
      const key = normalizeKey(parsed.name);
      if (!key) continue;

      if (!aggregates[key]) {
        aggregates[key] = {
          quantityByUnit: {},
          rawEntries: [],
          category: categorize(parsed.name),
          displayName: parsed.name,
        };
      }
      const agg = aggregates[key];
      agg.quantityByUnit[parsed.unit] = (agg.quantityByUnit[parsed.unit] ?? 0) + parsed.quantity;
      agg.rawEntries.push(raw);
    }
  }

  // Pretvori u ShoppingItem-e
  const items: ShoppingItem[] = Object.entries(aggregates).map(([key, agg]) => {
    // Glavna jedinica: ona sa najvecim brojem entries-a
    const units = Object.entries(agg.quantityByUnit);
    units.sort((a, b) => b[1] - a[1]);
    const [primaryUnit, primaryQty] = units[0] ?? ["kom", 1];

    return {
      key,
      displayName: agg.displayName,
      quantity: Math.round(primaryQty * 10) / 10,
      unit: primaryUnit,
      rawEntries: agg.rawEntries,
      category: agg.category,
      haveAtHome: pantryKeys.has(key),
    };
  });

  // Sort: unutar kategorije, najveca kolicina prva
  items.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.haveAtHome !== b.haveAtHome) return a.haveAtHome ? 1 : -1;
    return b.quantity - a.quantity;
  });

  // Grupisi po kategoriji
  const itemsByCategory: Record<ShoppingCategory, ShoppingItem[]> = {
    produce: [],
    dairy: [],
    grains: [],
    protein: [],
    pantry: [],
    other: [],
  };
  for (const item of items) itemsByCategory[item.category].push(item);

  return {
    generatedAt: new Date().toISOString(),
    weekStartDate: plan.weekStartDate,
    totalItems: items.length,
    itemsByCategory,
  };
}
