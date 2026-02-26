import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HourInfo {
  branchIndex: number;
  branch: string;
  chineseName: string;
  displayTime: string;
  stem: string;
  score: number;
  level: string;
  label: string;
  isCurrent: boolean;
}

interface OutfitHourlyTimelineProps {
  hours: HourInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading?: boolean;
}

const LEVEL_COLORS: Record<string, { bar: string; text: string; glow: string }> = {
  excellent: { bar: 'bg-amber-400', text: 'text-amber-300', glow: 'shadow-amber-500/40' },
  good:      { bar: 'bg-yellow-500', text: 'text-yellow-300', glow: 'shadow-yellow-500/30' },
  neutral:   { bar: 'bg-slate-500', text: 'text-slate-400', glow: '' },
  bad:       { bar: 'bg-red-700', text: 'text-red-400', glow: '' },
  terrible:  { bar: 'bg-red-900', text: 'text-red-600', glow: '' },
};

function getLevel(score: number): string {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'bad';
  return 'terrible';
}

export function OutfitHourlyTimeline({
  hours,
  selectedIndex,
  onSelect,
  isLoading = false,
}: OutfitHourlyTimelineProps) {
  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-amber-400/70 font-medium tracking-wider uppercase">時辰能量時間軸</span>
          <div className="flex-1 h-px bg-amber-900/30" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-14 h-20 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...hours.map(h => h.score), 1);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-amber-400/70 font-medium tracking-wider uppercase">時辰能量時間軸</span>
        <div className="flex-1 h-px bg-amber-900/30" />
        <span className="text-xs text-white/30">點擊預覽穿搭</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {hours.map((hour) => {
          const isSelected = hour.branchIndex === selectedIndex;
          const level = getLevel(hour.score);
          const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.neutral;
          const barHeight = Math.max(8, Math.round((hour.score / maxScore) * 48));

          return (
            <motion.button
              key={hour.branchIndex}
              onClick={() => onSelect(hour.branchIndex)}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "relative flex-shrink-0 w-14 flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all duration-200 cursor-pointer",
                isSelected
                  ? "border-amber-400/60 bg-amber-900/25 shadow-lg shadow-amber-900/30"
                  : "border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/8"
              )}
            >
              {/* Current time indicator */}
              {hour.isCurrent && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] bg-amber-400 text-black px-1 rounded-full font-bold leading-4">
                  現在
                </span>
              )}

              {/* Branch name */}
              <span className={cn(
                "text-[10px] font-semibold",
                isSelected ? "text-amber-300" : "text-white/50"
              )}>
                {hour.chineseName}
              </span>

              {/* Energy bar */}
              <div className="w-6 h-12 flex items-end justify-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barHeight }}
                  transition={{ duration: 0.4, delay: hour.branchIndex * 0.03 }}
                  className={cn(
                    "w-full rounded-sm",
                    colors.bar,
                    isSelected ? `shadow-md ${colors.glow}` : "opacity-60"
                  )}
                />
              </div>

              {/* Score */}
              <span className={cn(
                "text-[10px] font-bold",
                isSelected ? colors.text : "text-white/30"
              )}>
                {hour.score}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  layoutId="timeline-selected"
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-1 px-1">
        {[
          { level: 'excellent', label: '旺' },
          { level: 'good', label: '吉' },
          { level: 'neutral', label: '平' },
          { level: 'bad', label: '凶' },
        ].map(({ level, label }) => (
          <div key={level} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-sm", LEVEL_COLORS[level].bar, "opacity-70")} />
            <span className="text-[10px] text-white/30">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
