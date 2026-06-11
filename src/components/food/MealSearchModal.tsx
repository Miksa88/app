// ============================================================================
// MealSearchModal — deljeni bottom sheet za pretragu/zamenu obroka (1.7)
// ============================================================================
//
// Korišćen u Food.tsx (replace flow) i MealPlan.tsx (swap flow) — identičan UX:
//   1. Opcioni "Ne volim ovo" red — trajno isključuje trenutnu hranu iz pool-a
//   2. "Slično ovome" — auto-suggest top 5 makro-sličnih (±10%) preko
//      findSimilarMeals; sakriven dok korisnica kuca u search
//   3. Search input + filtrirana lista (max 8 rezultata)
//
// Caller je odgovoran za exclusion filter pool-a (allergije/dislikes) —
// `foods` prop mora već biti propušten kroz filterFoodByExclusions tamo
// gde je to potrebno.
// ============================================================================

import { Search, ThumbsDown } from "lucide-react";
import { motion } from "framer-motion";
import { TAP_SCALE } from "@/lib/motion";
import { ICON_SIZE } from "@/lib/design-tokens";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { findSimilarMeals } from "@/utils/mealPlanGenerator";
import type { FoodItem } from "@/data/foodDatabase";

export interface MealSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Naslov sheet-a (npr. "Šta si jela?" / "Izaberi alternativu") */
  title: string;
  /** Trenutni obrok — target za macro-similar suggest; null = bez suggesta */
  currentMeal: { mealId: string; calories: number; protein: number; slot: string } | null;
  /** Pool hrane — VEĆ filtriran kroz exclusions na caller strani */
  foods: FoodItem[];
  /** Klik na hranu iz liste/suggesta */
  onSelect: (food: FoodItem) => void;
  /** Kontrolisani search state — caller resetuje pri zatvaranju */
  search: string;
  onSearchChange: (value: string) => void;
  /** Placeholder za search input */
  searchPlaceholder: string;
  /** Label za "Zameni" akciju na listi */
  confirmLabel: string;
  /** Prikaz imena hrane (sr/en lokalizacija na caller strani) */
  getFoodName?: (food: FoodItem) => string;
  /** Opcioni "Ne volim ovo" red — MealPlan swap flow */
  dislike?: {
    label: string;
    foodName: string;
    onDislike: () => void;
  } | null;
}

const MealSearchModal = ({
  open,
  onOpenChange,
  title,
  currentMeal,
  foods,
  onSelect,
  search,
  onSearchChange,
  searchPlaceholder,
  confirmLabel,
  getFoodName = f => f.name,
  dislike = null,
}: MealSearchModalProps) => {
  // Slično ovome — auto-suggest top 5 sa istim makroima ±10%
  const similarMeals = currentMeal
    ? findSimilarMeals(currentMeal, foods, { tolerance: 0.10, topN: 5 })
    : [];
  const showSimilar = similarMeals.length > 0 && search.trim().length === 0;

  const filteredFoods = foods.filter(f =>
    getFoodName(f).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      maxHeight="70vh"
    >
      <div className="pb-2">
        {/* "Ne volim ovo" — flagovi current food da se trajno isključi */}
        {dislike && (
          <motion.button
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={dislike.onDislike}
            className="w-full mb-4 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/20 text-left flex items-center gap-3 min-h-12"
          >
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <ThumbsDown size={ICON_SIZE.sm} className="text-destructive" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-callout font-semibold text-destructive">{dislike.label}</p>
              <p className="text-caption-1 text-muted-foreground truncate mt-0.5">{dislike.foodName}</p>
            </div>
          </motion.button>
        )}

        {/* Slično ovome — sakriveno čim krene kucanje u search */}
        {showSimilar && (
          <div className="mb-3">
            <p className="text-caption-1 font-semibold text-foreground/70 px-1 mb-2">
              Slično ovome
            </p>
            <div className="space-y-1">
              {similarMeals.map(food => (
                <button
                  key={food.id}
                  onClick={() => onSelect(food)}
                  className="w-full text-left px-4 py-3 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors min-h-12 flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div>
                    <p className="text-body text-foreground">{getFoodName(food)}</p>
                    <p className="text-caption-1 text-muted-foreground">{food.calories} kcal · {food.protein}g P</p>
                  </div>
                  <span className="text-primary text-caption-1 font-semibold">Zameni</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-muted/50 text-foreground placeholder:text-muted-foreground/50 rounded-2xl pl-11 pr-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          />
        </div>

        <div className="space-y-1">
          {filteredFoods.slice(0, 8).map(food => (
            <button
              key={food.id}
              onClick={() => onSelect(food)}
              className="w-full text-left px-4 py-3 rounded-2xl hover:bg-muted/40 transition-colors min-h-12 flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div>
                <p className="text-body text-foreground">{getFoodName(food)}</p>
                <p className="text-caption-1 text-muted-foreground">{food.calories} kcal · {food.protein}g P</p>
              </div>
              <span className="text-primary text-caption-1 font-semibold">{confirmLabel}</span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
};

export default MealSearchModal;
