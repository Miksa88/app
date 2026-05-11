// ============================================================================
// RecipeVideoSheet — YouTube search embed za "kako se pravi" video tutorial
// ============================================================================
//
// Otvara BottomSheet sa YouTube search iframe-om za zadati query (default
// `${mealName} recept`). Bez API ključa, bez backend-a — koristimo public
// YouTube embed search endpoint:
//   https://www.youtube.com/embed?listType=search&list=<urlencoded-query>
//
// Pravila (per QA approval):
//   - no autoplay (mobile data + zero-guilt princip)
//   - loading="lazy"
//   - URL-encode query
//   - Serbian-first query suffix "recept"
//   - referrerPolicy strict-origin-when-cross-origin
// ============================================================================

import { useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { Youtube } from "lucide-react";

interface RecipeVideoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealName: string;
}

export const RecipeVideoSheet = ({ open, onOpenChange, mealName }: RecipeVideoSheetProps) => {
  const { t } = useLanguage();

  const embedUrl = useMemo(() => {
    const query = `${mealName} recept`.trim();
    const encoded = encodeURIComponent(query);
    return `https://www.youtube.com/embed?listType=search&list=${encoded}`;
  }, [mealName]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("food.howToMake")}
      description={mealName}
      maxHeight="80vh"
    >
      <div className="pb-6">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted">
          {open && (
            <iframe
              src={embedUrl}
              title={`${t("food.howToMake")} — ${mealName}`}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute inset-0 w-full h-full border-0"
            />
          )}
        </div>
        <p className="text-caption-1 text-muted-foreground mt-3 flex items-center gap-1.5">
          <Youtube size={14} className="text-destructive" aria-hidden={true} />
          {t("food.howToMakeHint")}
        </p>
      </div>
    </BottomSheet>
  );
};

export default RecipeVideoSheet;
