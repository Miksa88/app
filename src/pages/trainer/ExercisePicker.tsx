import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Search } from "lucide-react";
import { TAP_SCALE } from "@/lib/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useExercises, type ExerciseItem } from "@/hooks/useExercises";

const FILTER_CHIPS = ["All", "Noge", "Grudi", "Leđa", "Ramena", "Ruke", "Core", "Kardio"];

const ExercisePicker = ({
  onDone,
  onBack,
}: {
  onDone: (selected: ExerciseItem[]) => void;
  onBack: () => void;
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: exercises = [], isLoading } = useExercises();

  const filtered = exercises.filter((ex) => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || ex.category === activeFilter;
    return matchSearch && matchFilter;
  });

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleDone = () => {
    const picked = exercises.filter((e) => selected.has(e.id));
    onDone(picked);
  };

  return (
    <div className="min-h-screen bg-background-secondary pb-32">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between sticky top-0 z-10 bg-background-secondary">
        <button onClick={onBack} className="text-primary min-w-11 min-h-11 flex items-center gap-1">
          <ArrowLeft size={20} />
          <span className="text-body">{t("common.back")}</span>
        </button>
        <button onClick={handleDone} className="text-primary text-body font-semibold min-h-11 flex items-center">
          {t("training.done")}
        </button>
      </div>

      {/* Search */}
      <div className="px-5 mb-3">
        <div className="relative">
          <Search size={ICON_SIZE.md} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("training.searchExercises")}
            className="w-full bg-card text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30 card-shadow"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-5 mb-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-2 rounded-full text-footnote font-medium whitespace-nowrap transition-all ${
                activeFilter === chip
                  ? "gradient-primary text-primary-foreground"
                  : "bg-card text-muted-foreground card-shadow"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="px-5 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12" aria-live="polite">
            <Loader2 size={ICON_SIZE.md} className="animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        {!isLoading && filtered.map((ex, i) => {
          const isSelected = selected.has(ex.id);
          return (
            <motion.button
              key={ex.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.015 }}
              whileTap={{ scale: TAP_SCALE.secondary }}
              onClick={() => toggleSelect(ex.id)}
              className={`w-full bg-card rounded-xl p-3 card-shadow flex items-center gap-3 text-left transition-all ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold text-subhead shrink-0">
                {ex.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-medium text-foreground truncate">{ex.name}</p>
                <p className="text-caption-1 text-muted-foreground">{ex.equipment.join(", ")}</p>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0"
                >
                  <Check size={ICON_SIZE.xs} className="text-primary-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Bottom sticky */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-5 pb-8 max-w-lg mx-auto">
          <button
            onClick={handleDone}
            className="w-full gradient-primary text-primary-foreground py-4 rounded-xl text-body font-semibold shadow-fab"
          >
            {t("training.addExercises").replace("{count}", String(selected.size))}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExercisePicker;
