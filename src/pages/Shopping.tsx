// ============================================================================
// Shopping.tsx — kupovna lista derivirana iz potvrđenih obroka
// ============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUp, TAP_SCALE } from "@/lib/motion";
import { Check, Home, ShoppingBasket, Sparkles } from "lucide-react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMealPlan } from "@/hooks/useMealPlan";
import { buildShoppingList, type ShoppingCategory, type ShoppingItem } from "@/utils/nutrition/shoppingList";

const CATEGORY_LABEL_SR: Record<ShoppingCategory, string> = {
  produce: "Voće i povrće",
  dairy: "Mlečni proizvodi",
  grains: "Žitarice",
  protein: "Proteini",
  pantry: "Začini i ostalo",
  other: "Ostalo",
};

const CATEGORY_LABEL_EN: Record<ShoppingCategory, string> = {
  produce: "Produce",
  dairy: "Dairy",
  grains: "Grains",
  protein: "Protein",
  pantry: "Pantry",
  other: "Other",
};

const CATEGORY_EMOJI: Record<ShoppingCategory, string> = {
  produce: "🥬",
  dairy: "🥛",
  grains: "🌾",
  protein: "🍗",
  pantry: "🧂",
  other: "🛒",
};

const ShoppingPage = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { plan, pantryKeys, togglePantry, isLoading } = useMealPlan();
  const [showHave, setShowHave] = useState<boolean>(false);

  const list = useMemo(() => {
    if (!plan) return null;
    return buildShoppingList({
      plan,
      includeStatuses: ["confirmed", "pending"],
      pantryKeys,
    });
  }, [plan, pantryKeys]);

  const labels = language === "sr" ? CATEGORY_LABEL_SR : CATEGORY_LABEL_EN;

  const totalNeeded = list
    ? Object.values(list.itemsByCategory).flat().filter(i => !i.haveAtHome).length
    : 0;
  const totalHave = list
    ? Object.values(list.itemsByCategory).flat().filter(i => i.haveAtHome).length
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/meal-plan")} backLabel={t("mealPlan.title")} />
        <div className="flex flex-col items-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (!list || list.totalItems === 0) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageHeader onBack={() => navigate("/meal-plan")} backLabel={t("mealPlan.title")} />
        <motion.div {...fadeUp()} className="px-5 pt-12 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <ShoppingBasket size={ICON_SIZE.xl} className="text-muted-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-title-2 font-bold text-foreground mb-2">{t("shopping.emptyTitle")}</h1>
          <p className="text-body text-muted-foreground max-w-xs mb-6">{t("shopping.emptyBody")}</p>
          <Button onClick={() => navigate("/meal-plan")} variant="cta" size="xl">
            <Sparkles size={ICON_SIZE.sm} className="mr-2" />
            {t("shopping.goToMealPlan")}
          </Button>
        </motion.div>
      </div>
    );
  }

  const ItemRow = ({ item }: { item: ShoppingItem }) => (
    <motion.button
      whileTap={{ scale: TAP_SCALE.secondary }}
      onClick={() => togglePantry(item.key)}
      className="w-full flex items-center gap-3 px-4 py-3 min-h-14 text-left border-b border-border/50 last:border-0"
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        item.haveAtHome
          ? "bg-success border-2 border-success"
          : "bg-card border-2 border-muted-foreground/30"
      }`}>
        {item.haveAtHome && <Check size={ICON_SIZE.xs} className="text-success-foreground" strokeWidth={3} aria-hidden="true" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-body ${item.haveAtHome ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {item.displayName}
        </p>
        <p className="text-caption-1 text-muted-foreground tabular-nums">
          {item.quantity} {item.unit === "—" ? "" : item.unit}
        </p>
      </div>
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      <PageHeader onBack={() => navigate("/meal-plan")} backLabel={t("mealPlan.title")} />

      <div className="px-5 pt-2 pb-2">
        <h1 className="text-large-title text-foreground tracking-tight">{t("shopping.title")}</h1>
        <p className="text-subhead text-muted-foreground mt-1">{t("shopping.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="px-5 pt-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <ShoppingBasket size={20} className="text-primary mx-auto mb-1" aria-hidden="true" />
          <p className="text-title-2 font-bold text-foreground tabular-nums">{totalNeeded}</p>
          <p className="text-caption-1 text-muted-foreground">{t("shopping.needToBuy")}</p>
        </Card>
        <Card className="p-4 text-center">
          <Home size={20} className="text-success mx-auto mb-1" aria-hidden="true" />
          <p className="text-title-2 font-bold text-foreground tabular-nums">{totalHave}</p>
          <p className="text-caption-1 text-muted-foreground">{t("shopping.haveAtHome")}</p>
        </Card>
      </div>

      {/* Toggle show/hide */}
      <div className="px-5 pt-4">
        <button
          onClick={() => setShowHave(v => !v)}
          className="text-primary text-caption-1 font-semibold min-h-11 flex items-center gap-1"
        >
          {showHave ? t("shopping.hideHaveAtHome") : t("shopping.showHaveAtHome")}
        </button>
      </div>

      {/* Categories */}
      <div className="px-5 pt-2 space-y-3">
        {(Object.entries(list.itemsByCategory) as Array<[ShoppingCategory, ShoppingItem[]]>).map(([cat, items], idx) => {
          const visible = showHave ? items : items.filter(i => !i.haveAtHome);
          if (visible.length === 0) return null;
          return (
            <motion.div key={cat} {...fadeUp(0.05 + idx * 0.03)}>
              <Card className="overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                  <p className="text-caption-1 font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="mr-1.5" aria-hidden="true">{CATEGORY_EMOJI[cat]}</span>
                    {labels[cat]} <span className="opacity-60">({visible.length})</span>
                  </p>
                </div>
                <div>
                  {visible.map(item => (
                    <ItemRow key={item.key} item={item} />
                  ))}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ShoppingPage;
