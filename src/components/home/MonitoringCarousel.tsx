import { useRef, useState, useEffect, useCallback } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { motion } from "framer-motion";
import CircularProgress from "@/components/CircularProgress";
import { Footprints, Flame, Heart, Moon, Activity, Timer, Dumbbell } from "lucide-react";
import { useHealth } from "@/contexts/HealthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion";
import { Card } from "@/components/ui/card";

interface MonitoringCarouselProps {
  mock: {
    caloriesLeft: number;
    caloriesGoal: number;
    protein: { current: number; goal: number };
    carbs: { current: number; goal: number };
    fat: { current: number; goal: number };
    fiber: { current: number; goal: number };
    sugar: { current: number; goal: number };
    sodium: { current: number; goal: number };
    healthScore: number;
    streak: number;
    level: number;
    levelName: string;
    levelProgress: number;
  };
}

const MonitoringCarousel = ({ mock }: MonitoringCarouselProps) => {
  const { healthConnected } = useHealth();
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = [
    "nutrition",
    ...(healthConnected ? ["health"] : []),
  ];

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIndex(Math.min(index, slides.length - 1));
  }, [slides.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.offsetWidth, behavior: "smooth" });
  };

  const caloriesEaten = mock.caloriesGoal - mock.caloriesLeft;
  const caloriesPct = Math.round((caloriesEaten / mock.caloriesGoal) * 100);

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory pb-3"
        style={{
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
        }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {/* Slide 1: Nutrition — Apple Health style */}
        <div className="w-full shrink-0 snap-start px-4">
          <Card className="overflow-hidden">
            {/* Calories section */}
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-large-title tracking-tight text-foreground leading-none">{mock.caloriesLeft}</p>
                  <p className="text-subhead text-muted-foreground mt-1">{t("home.kcalRemaining")}</p>
                  <p className="text-footnote text-muted-foreground">{t("home.ofDailyGoal").replace("{goal}", String(mock.caloriesGoal))}</p>
                </div>
                <CircularProgress
                  value={caloriesEaten}
                  max={mock.caloriesGoal}
                  size={80}
                  strokeWidth={7}
                  color="url(#gradient-pink)"
                >
                  <span className="text-headline text-foreground">{caloriesPct}%</span>
                </CircularProgress>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-border/60" />

            {/* Macros row */}
            <div className="grid grid-cols-3 divide-x divide-border/60">
              {[
                { label: t("home.protein"), current: mock.protein.current, goal: mock.protein.goal, color: "url(#gradient-red)" },
                { label: t("home.carbs"), current: mock.carbs.current, goal: mock.carbs.goal, color: "url(#gradient-yellow)" },
                { label: t("home.fat"), current: mock.fat.current, goal: mock.fat.goal, color: "url(#gradient-green)" },
              ].map((m) => (
                <div key={m.label} className="py-4 px-3 flex flex-col items-center">
                  <CircularProgress value={m.current} max={m.goal} size={56} strokeWidth={5} color={m.color} trackColor="hsl(var(--muted-foreground) / 0.10)">
                    <span className="text-footnote font-semibold text-foreground">{Math.round((m.current / m.goal) * 100)}%</span>
                  </CircularProgress>
                  <p className="text-footnote text-muted-foreground mt-2">{m.label}</p>
                  <p className="text-subhead font-semibold text-foreground">{m.goal - m.current}g {t("home.left")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Slide 2: Apple Health — Full Apple UI */}
        {healthConnected && (
          <div className="w-full shrink-0 snap-start px-4">
            <div className="flex flex-col gap-2">
              {/* Activity Rings Card */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <Activity size={16} className="text-destructive" />
                  </div>
                  <span className="text-headline text-foreground">Activity</span>
                </div>
                <div className="flex items-center gap-5">
                  {/* Nested rings */}
                  <div className="relative">
                    <CircularProgress value={481} max={600} size={100} strokeWidth={10} color="hsl(var(--health-move))">
                      <div className="relative" style={{ width: 72, height: 72 }}>
                        <CircularProgress value={35} max={60} size={72} strokeWidth={8} color="hsl(var(--health-exercise))">
                          <div className="relative" style={{ width: 46, height: 46 }}>
                            <CircularProgress value={8} max={12} size={46} strokeWidth={7} color="hsl(var(--health-stand))">
                              <Dumbbell size={ICON_SIZE.xs} className="text-foreground" aria-hidden="true" />
                            </CircularProgress>
                          </div>
                        </CircularProgress>
                      </div>
                    </CircularProgress>
                  </div>
                  {/* Ring legends */}
                  <div className="flex-1 space-y-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-footnote text-muted-foreground">Move</span>
                      </div>
                      <p className="text-title-3 font-bold text-foreground leading-tight">
                        481<span className="text-footnote font-medium text-muted-foreground/70">/600 cal</span>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-health-exercise" />
                        <span className="text-footnote text-muted-foreground">Exercise</span>
                      </div>
                      <p className="text-title-3 font-bold text-foreground leading-tight">
                        35<span className="text-footnote font-medium text-muted-foreground/70">/60 min</span>
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-health-stand" />
                        <span className="text-footnote text-muted-foreground">Stand</span>
                      </div>
                      <p className="text-title-3 font-bold text-foreground leading-tight">
                        8<span className="text-footnote font-medium text-muted-foreground/70">/12 hrs</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Bottom row: Steps, Heart Rate, Sleep */}
              <div className="grid grid-cols-3 gap-2">
                {/* Steps */}
                <Card className="p-3.5">
                  <div className="w-6 h-6 rounded-md bg-accent/60 flex items-center justify-center mb-2">
                    <Footprints size={ICON_SIZE.xs} className="text-primary" />
                  </div>
                  <p className="text-caption-2 text-muted-foreground">Steps</p>
                  <p className="text-title-2 tracking-tight text-foreground leading-tight">8,592</p>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "86%" }}
                      transition={{ duration: MOTION_DURATION.slow, delay: 0.3, ease: MOTION_EASE.iosDefault }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <p className="text-caption-2 text-muted-foreground mt-1">of 10,000</p>
                </Card>

                {/* Heart Rate */}
                <Card className="p-3.5">
                  <div className="w-6 h-6 rounded-md bg-destructive/10 flex items-center justify-center mb-2">
                    <Heart size={ICON_SIZE.xs} className="text-destructive" />
                  </div>
                  <p className="text-caption-2 text-muted-foreground">Heart Rate</p>
                  <p className="text-title-2 tracking-tight text-foreground leading-tight">
                    72<span className="text-footnote font-normal text-muted-foreground/70 ml-0.5">bpm</span>
                  </p>
                  <div className="flex items-end gap-0.5 mt-2 h-5">
                    {[40, 55, 45, 60, 50, 65, 55, 48, 52, 58, 45, 50].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: MOTION_DURATION.slow, delay: 0.3 + i * 0.05 }}
                        className="flex-1 rounded-sm bg-destructive/60"
                      />
                    ))}
                  </div>
                  <p className="text-caption-2 text-muted-foreground mt-1">resting</p>
                </Card>

                {/* Sleep */}
                <Card className="p-3.5">
                  <div className="w-6 h-6 rounded-md bg-health-sleep/15 flex items-center justify-center mb-2">
                    <Moon size={ICON_SIZE.xs} className="text-health-sleep" />
                  </div>
                  <p className="text-caption-2 text-muted-foreground">Sleep</p>
                  <p className="text-title-2 tracking-tight text-foreground leading-tight">
                    7.5<span className="text-footnote font-normal text-muted-foreground/70 ml-0.5">hrs</span>
                  </p>
                  <div className="flex items-center gap-0.5 mt-2 h-5">
                    {[
                      { w: "20%", color: "hsl(270, 60%, 70%)" },
                      { w: "35%", color: "hsl(270, 50%, 55%)" },
                      { w: "15%", color: "hsl(270, 60%, 70%)" },
                      { w: "30%", color: "hsl(270, 40%, 45%)" },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: MOTION_DURATION.slow, delay: 0.4 + i * 0.1 }}
                        className="h-3 rounded-sm origin-left"
                        style={{ width: s.w, backgroundColor: s.color }}
                      />
                    ))}
                  </div>
                  <p className="text-caption-2 text-muted-foreground mt-1">last night</p>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page indicators */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className="p-1 -m-1"
              aria-label={`Go to slide ${i + 1}`}
            >
              <motion.div
                animate={{
                  width: i === activeIndex ? 20 : 7,
                  backgroundColor: i === activeIndex
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground) / 0.25)",
                }}
                transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.iosDefault }}
                className="h-[7px] rounded-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitoringCarousel;
