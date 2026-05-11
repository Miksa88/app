import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Search } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FoodItem } from "@/data/foodDatabase";
import { useFoodItems } from "@/hooks/useFoodItems";

const FILTER_CHIPS = [
  { id: "all", labelKey: "mealPicker.all" },
  { id: "breakfast", labelKey: "mealPicker.breakfast" },
  { id: "lunch", labelKey: "mealPicker.lunch" },
  { id: "dinner", labelKey: "mealPicker.dinner" },
  { id: "snack", labelKey: "mealPicker.snack" },
  { id: "high-protein", labelKey: "mealPicker.highProtein" },
  { id: "low-gi", labelKey: "mealPicker.lowGi" },
];

const MealPicker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const slot = searchParams.get("slot") || "breakfast";
  const targetCalories = parseInt(searchParams.get("calories") || "400");
  const replaceIndex = searchParams.get("replace");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Map slot types to food database mealSlots
  const slotToFoodSlot: Record<string, string[]> = {
    breakfast: ["breakfast"],
    morning_snack: ["snack_am"],
    lunch: ["lunch"],
    afternoon_snack: ["snack_pm"],
    dinner: ["dinner"],
    evening_snack: ["snack_pm"],
    pre_workout: ["snack_am", "snack_pm"],
    post_workout: ["snack_am", "snack_pm"],
  };

  const { foods: foodPool } = useFoodItems();

  const filteredFoods = useMemo(() => {
    let foods = [...foodPool];

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      foods = foods.filter(
        (f) =>
          f.name.toLowerCase().includes(s) ||
          f.nameEn.toLowerCase().includes(s) ||
          f.nameSr.toLowerCase().includes(s)
      );
    }

    // Chip filter
    if (activeFilter !== "all") {
      if (activeFilter === "snack") {
        foods = foods.filter((f) =>
          f.mealSlots.some((s) => s.includes("snack"))
        );
      } else if (activeFilter === "high-protein") {
        foods = foods.filter((f) => f.tags.includes("high-protein"));
      } else if (activeFilter === "low-gi") {
        foods = foods.filter((f) => f.glycemicIndex === "low");
      } else {
        foods = foods.filter((f) => f.mealSlots.includes(activeFilter));
      }
    }

    // Sort by calorie closeness to target
    foods.sort((a, b) => {
      const aDiff = Math.abs(a.calories - targetCalories);
      const bDiff = Math.abs(b.calories - targetCalories);
      return aDiff - bDiff;
    });

    return foods;
  }, [foodPool, search, activeFilter, targetCalories]);

  const selectMeal = (food: FoodItem) => {
    // For now, navigate back. In a real app this would use state management.
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-6">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 sticky top-0 z-10 bg-background-secondary">
        <button
          onClick={() => navigate(-1)}
          className="text-primary min-w-11 min-h-11 flex items-center gap-1 mb-3"
        >
          <ArrowLeft size={20} />
          <span className="text-body">{t("common.back")}</span>
        </button>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={ICON_SIZE.md}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("nutrition.closestMatches")}
            className="pl-10 rounded-xl border border-border"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-caption-1 font-semibold min-h-11 transition-colors ${
                activeFilter === chip.id
                  ? "gradient-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t(chip.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-5 space-y-2">
        <p className="text-caption-1 text-muted-foreground mb-1">
          {t("nutrition.closestMatches")} · {filteredFoods.length} meals
        </p>
        {filteredFoods.map((food, i) => (
          <motion.button
            key={food.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={() => selectMeal(food)}
            className="w-full bg-card rounded-xl p-4 card-shadow text-left min-h-14"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-body font-semibold text-foreground">
                  {food.name}
                </p>
                <p className="text-caption-1 text-muted-foreground mt-0.5">
                  {food.calories} kcal ·{" "}
                  <span className="text-macro-protein">{food.protein}g P</span> ·{" "}
                  <span className="text-macro-carb">{food.carbs}g C</span> ·{" "}
                  <span className="text-macro-fat">{food.fat}g F</span>
                </p>
                <div className="flex gap-1 mt-1.5">
                  {food.glycemicIndex && (
                    <span
                      className={`text-caption-2 px-1.5 py-0.5 rounded-md font-medium ${
                        food.glycemicIndex === "low"
                          ? "bg-success/15 text-success"
                          : food.glycemicIndex === "medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      GI: {food.glycemicIndex}
                    </span>
                  )}
                  {food.tags.includes("high-protein") && (
                    <span className="text-caption-2 px-1.5 py-0.5 rounded-md font-medium bg-info/15 text-info">
                      High P
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MealPicker;
