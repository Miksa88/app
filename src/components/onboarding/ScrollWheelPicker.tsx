import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";

interface ScrollWheelPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  itemHeight?: number;
  visibleItems?: number;
}

const ScrollWheelPicker = ({
  items,
  selectedIndex,
  onSelect,
  itemHeight = 40,
  visibleItems = 7,
}: ScrollWheelPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [isInitialized, setIsInitialized] = useState(false);

  const totalHeight = visibleItems * itemHeight;
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  // Scroll to selected index
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: scrollTop,
        behavior: smooth ? "smooth" : "instant",
      });
    },
    [itemHeight]
  );

  // Initialize scroll position
  useEffect(() => {
    if (containerRef.current && !isInitialized) {
      scrollToIndex(selectedIndex, false);
      setIsInitialized(true);
    }
  }, [selectedIndex, scrollToIndex, isInitialized]);

  // Handle scroll end - snap to nearest item
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    isScrollingRef.current = true;

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const nearestIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(nearestIndex, items.length - 1));

      if (clampedIndex !== selectedIndex) {
        onSelect(clampedIndex);
      }

      scrollToIndex(clampedIndex);
      isScrollingRef.current = false;
    }, 80);
  }, [itemHeight, items.length, onSelect, selectedIndex, scrollToIndex]);

  // Update scroll when selectedIndex changes externally
  useEffect(() => {
    if (!isScrollingRef.current && isInitialized) {
      scrollToIndex(selectedIndex);
    }
  }, [selectedIndex, scrollToIndex, isInitialized]);

  return (
    <div className="relative" style={{ height: totalHeight }}>
      {/* Selection highlight pill - behind text (z-0) */}
      <div
        className="absolute left-0 right-0 pointer-events-none rounded-xl bg-muted/50"
        style={{
          top: centerOffset,
          height: itemHeight,
          zIndex: 0,
        }}
      />

      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: centerOffset,
          zIndex: 20,
          background: "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 50%, transparent 100%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: centerOffset,
          zIndex: 20,
          background: "linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.6) 50%, transparent 100%)",
        }}
      />

      {/* Scrollable area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-none snap-y snap-mandatory relative"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          zIndex: 1,
        }}
      >
        {/* Top padding */}
        <div style={{ height: centerOffset }} />

        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={`${item}-${index}`}
              className="snap-center flex items-center justify-center cursor-pointer select-none"
              style={{ height: itemHeight }}
              onClick={() => {
                onSelect(index);
                scrollToIndex(index);
              }}
            >
              <span
                className={`transition-all duration-150 ${
                  isSelected
                    ? "text-title-3 font-bold text-foreground"
                    : "text-body font-normal text-muted-foreground/40"
                }`}
              >
                {item}
              </span>
            </div>
          );
        })}

        {/* Bottom padding */}
        <div style={{ height: centerOffset }} />
      </div>
    </div>
  );
};

export default ScrollWheelPicker;
