// ============================================================================
// MealPlan.tsx — 7-dnevni pregled obroka sa confirm/swap flow-om
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { Check, ChevronDown, ChevronRight, RefreshCw, ShoppingBasket, Sparkles, ThumbsDown } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMealPlan } from "@/hooks/useMealPlan";
import { computeDayRollups, findSwapAlternatives, type MealPlanSlot } from "@/utils/nutrition/mealPlanGenerator";
import { FOOD_DATABASE } from "@/data/foodDatabase";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { addFoodDislike } from "@/services/dislikeService";
import { toast } from "sonner";

const DAY_LABELS_SR = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];
const DAY_LABELS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SLOT_LABELS_SR: Record<string, string> = {
  breakfast: "Doručak",
  snack_am: "Užina",
  lunch: "Ručak",
  snack_pm: "Užina",
  dinner: "Večera",
};
const SLOT_LABELS_EN: Record<string, string> = {
  breakfast: "Breakfast",
  snack_am: "AM Snack",
  lunch: "Lunch",
  snack_pm: "PM Snack",
  dinner: "Dinner",
};

const MealPlanPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { clientId } = useAuth();
  const { plan, isLoading, regenerate, updateSlot, confirmAll } = useMealPlan();
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [swapSlotIdx, setSwapSlotIdx] = useState<number | null>(null);

  const dayLabels = language === "sr" ? DAY_LABELS_SR : DAY_LABELS_EN;
  const slotLabels = language === "sr" ? SLOT_LABELS_SR : SLOT_LABELS_EN;

  const rollups = useMemo(() => (plan ? computeDayRollups(plan) : []), [plan]);

  const totalSlots = plan?.slots.length ?? 0;
  const confirmedCount = plan?.slots.filter(s => s.status === "confirmed").length ?? 0;
  const pendingCount = totalSlots - confirmedCount;
  const allConfirmed = totalSlots > 0 && confirmedCount === totalSlots;

  const swapSlot = swapSlotIdx !== null ? plan?.slots[swapSlotIdx] : null;
  const swapAlternatives = useMemo(() => {
    if (!plan || swapSlotIdx === null) return [];
    // Need profile data for filters — keep simple, no filter (engine already filtered initially)
    return findSwapAlternatives(plan, swapSlotIdx, [], [], 4);
  }, [plan, swapSlotIdx]);

  const handlePickAlternative = (foodId: string) => {
    if (swapSlotIdx === null) return;
    const food = FOOD_DATABASE.find(f => f.id === foodId);
    if (!food) return;
    updateSlot(swapSlotIdx, {
      foodId: food.id,
      status: "confirmed",
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setSwapSlotIdx(null);
  };

  const handleDontShowAgain = async (foodId: string) => {
    if (!clientId) return;
    const food = FOOD_DATABASE.find(f => f.id === foodId);
    if (!food) return;
    try {
      await addFoodDislike(clientId, food.nameEn);
      toast.success(t("mealPlan.dislikeAdded"));
      setSwapSlotIdx(null);
      // Auto-regenerate da novi plan ne sadrži ovu hranu
      await regenerate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/home")} backLabel={t("nav.home")} />
        <div className="flex flex-col items-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-caption-1 text-muted-foreground mt-3">{t("mealPlan.generating")}</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/home")} backLabel={t("nav.home")} />
        <motion.div {...fadeUp()} className="px-5 pt-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Sparkles size={ICON_SIZE.xl} className="text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-title-2 font-bold text-foreground mb-2">{t("mealPlan.noPlanTitle")}</h1>
          <p className="text-body text-muted-foreground max-w-xs mb-6">{t("mealPlan.noPlanBody")}</p>
          <Button onClick={() => void regenerate()} variant="cta" size="xl">
            {t("mealPlan.generate")}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader onBack={() => navigate("/home")} backLabel={t("nav.home")} />

      <div className="px-5 pt-2 pb-2">
        <h1 className="text-large-title text-foreground tracking-tight">{t("mealPlan.title")}</h1>
        <p className="text-subhead text-muted-foreground mt-1">{t("mealPlan.subtitle")}</p>
      </div>

      <div className="px-5 space-y-3 pt-4">
        {/* Status hero */}
        <motion.div {...fadeUp(0.05)}>
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-caption-1 text-muted-foreground uppercase tracking-wider">{t("mealPlan.weeklyTarget")}</p>
                <p className="text-title-2 font-bold text-foreground tabular-nums">
                  {plan.dailyTarget.calories} kcal/{t("mealPlan.day")}
                </p>
              </div>
              <button
                onClick={() => void regenerate()}
                aria-label={t("mealPlan.regenerate")}
                className="text-primary p-2 rounded-full bg-primary/10 hover:bg-primary/15 min-w-11 min-h-11 flex items-center justify-center"
              >
                <RefreshCw size={ICON_SIZE.md} aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between text-caption-1">
              <span className="text-muted-foreground">
                {confirmedCount}/{totalSlots} {t("mealPlan.confirmed")}
              </span>
              <span className="text-foreground font-semibold">
                {plan.mealCount} {t("mealPlan.mealsPerDay")}
              </span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full gradient-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${totalSlots ? (confirmedCount / totalSlots) * 100 : 0}%` }}
                transition={IOS_SPRING.medium}
              />
            </div>
          </Card>
        </motion.div>

        {/* Confirm-all + Shopping list CTAs */}
        <motion.div {...fadeUp(0.08)} className="flex gap-2">
          {!allConfirmed && (
            <Button
              onClick={confirmAll}
              variant="outline"
              size="lg"
              className="flex-1"
            >
              <Check size={ICON_SIZE.sm} className="mr-2" />
              {t("mealPlan.confirmAll")}
            </Button>
          )}
          <Button
            onClick={() => navigate("/shopping")}
            variant="cta"
            size="lg"
            className="flex-1"
            disabled={pendingCount === totalSlots}
          >
            <ShoppingBasket size={ICON_SIZE.sm} className="mr-2" />
            {t("mealPlan.shoppingList")}
          </Button>
        </motion.div>

        {/* Days */}
        {rollups.map((day, idx) => {
          const isOpen = openDay === idx;
          const dayPct = plan.dailyTarget.calories > 0
            ? Math.round((day.calories / plan.dailyTarget.calories) * 100)
            : 0;
          return (
            <motion.div
              key={idx}
              {...fadeUp(0.1 + idx * 0.03)}
            >
              <Card className="overflow-hidden">
                <button
                  onClick={() => setOpenDay(isOpen ? null : idx)}
                  className="w-full px-4 py-4 flex items-center justify-between min-h-14"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-callout font-bold text-primary tabular-nums">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">{dayLabels[idx]}</p>
                      <p className="text-caption-1 text-muted-foreground tabular-nums">
                        {day.calories} kcal · {day.protein}P · {day.carbs}C · {day.fat}F
                      </p>
                    </div>
                    <span className={`text-caption-2 font-semibold px-2 py-0.5 rounded-full ${
                      Math.abs(dayPct - 100) < 8
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}>
                      {dayPct}%
                    </span>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="ml-2">
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border">
                        {day.slots.map(slot => {
                          const food = FOOD_DATABASE.find(f => f.id === slot.foodId);
                          if (!food) return null;
                          const slotIdx = plan.slots.findIndex(
                            s => s.dayIndex === slot.dayIndex && s.slotIndex === slot.slotIndex,
                          );
                          const isConfirmed = slot.status === "confirmed";
                          return (
                            <div key={`${slot.dayIndex}-${slot.slotIndex}`} className="px-4 py-3 border-b border-border/50 last:border-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-caption-1 text-muted-foreground uppercase tracking-wider font-semibold">
                                  {slotLabels[slot.slotType]}
                                </span>
                                <span className="text-caption-1 text-muted-foreground tabular-nums">
                                  {slot.calories} kcal
                                </span>
                              </div>
                              <p className="text-body text-foreground">
                                {language === "sr" ? food.nameSr : food.nameEn}
                              </p>
                              <p className="text-caption-1 text-muted-foreground mt-0.5">{food.portionSize} · {food.prepTime}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <motion.button
                                  whileTap={{ scale: TAP_SCALE.secondary }}
                                  onClick={() => updateSlot(slotIdx, { status: isConfirmed ? "pending" : "confirmed" })}
                                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-caption-1 font-semibold min-h-11 ${
                                    isConfirmed
                                      ? "gradient-primary text-primary-foreground"
                                      : "bg-card border border-border text-foreground"
                                  }`}
                                >
                                  {isConfirmed && <Check size={ICON_SIZE.xs} aria-hidden="true" />}
                                  {isConfirmed ? t("mealPlan.confirmed") : t("mealPlan.confirm")}
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: TAP_SCALE.secondary }}
                                  onClick={() => setSwapSlotIdx(slotIdx)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-xl py-2 px-4 bg-card border border-border text-foreground text-caption-1 font-semibold min-h-11"
                                >
                                  <RefreshCw size={ICON_SIZE.xs} aria-hidden="true" />
                                  {t("mealPlan.swap")}
                                </motion.button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Swap bottom sheet */}
      <AnimatePresence>
        {swapSlot && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSwapSlotIdx(null)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={IOS_SPRING.medium}
              role="dialog"
              aria-modal="true"
              aria-label={t("mealPlan.swap")}
              className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-card rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />
              <h3 className="text-title-3 font-bold text-foreground mb-1">{t("mealPlan.pickAlternative")}</h3>
              <p className="text-caption-1 text-muted-foreground mb-4">{slotLabels[swapSlot.slotType]}</p>

              {/* "Ne volim ovo" — flagovi current food da se trajno isključi */}
              {(() => {
                const currentFood = FOOD_DATABASE.find(f => f.id === swapSlot.foodId);
                if (!currentFood) return null;
                return (
                  <motion.button
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => void handleDontShowAgain(currentFood.id)}
                    className="w-full mb-4 px-4 py-3 rounded-2xl bg-destructive/5 border border-destructive/20 text-left flex items-center gap-3 min-h-12"
                  >
                    <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <ThumbsDown size={ICON_SIZE.sm} className="text-destructive" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-callout font-semibold text-destructive">
                        {t("mealPlan.dontShowAgain")}
                      </p>
                      <p className="text-caption-1 text-muted-foreground truncate mt-0.5">
                        {language === "sr" ? currentFood.nameSr : currentFood.nameEn}
                      </p>
                    </div>
                  </motion.button>
                );
              })()}

              <div className="space-y-2">
                {swapAlternatives.map(food => (
                  <motion.button
                    key={food.id}
                    whileTap={{ scale: TAP_SCALE.secondary }}
                    onClick={() => handlePickAlternative(food.id)}
                    className="w-full bg-background-secondary border border-border rounded-2xl p-4 text-left flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-foreground">
                        {language === "sr" ? food.nameSr : food.nameEn}
                      </p>
                      <p className="text-caption-1 text-muted-foreground tabular-nums mt-0.5">
                        {food.calories} kcal · {food.protein}P · {food.carbs}C · {food.fat}F · {food.prepTime}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/50" aria-hidden="true" />
                  </motion.button>
                ))}
                {swapAlternatives.length === 0 && (
                  <p className="text-body text-muted-foreground text-center py-6">{t("mealPlan.noAlternatives")}</p>
                )}
              </div>

              <button
                onClick={() => setSwapSlotIdx(null)}
                className="w-full py-3 text-muted-foreground text-body mt-4 min-h-11"
              >
                {t("mealPlan.cancel")}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MealPlanPage;
