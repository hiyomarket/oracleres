import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// 能量分數轉顏色
function scoreToColor(score: number): string {
  if (score >= 80) return 'text-amber-300';
  if (score >= 65) return 'text-emerald-300';
  if (score >= 45) return 'text-blue-300';
  if (score >= 25) return 'text-slate-400';
  return 'text-red-400';
}

function scoreToBarColor(score: number): string {
  if (score >= 80) return 'bg-amber-400';
  if (score >= 65) return 'bg-emerald-400';
  if (score >= 45) return 'bg-blue-400';
  if (score >= 25) return 'bg-slate-500';
  return 'bg-red-500';
}

function scoreToBorderColor(score: number): string {
  if (score >= 80) return 'border-amber-600/60';
  if (score >= 65) return 'border-emerald-600/60';
  if (score >= 45) return 'border-blue-600/40';
  if (score >= 25) return 'border-slate-600/40';
  return 'border-red-700/40';
}

function scoreToBgColor(score: number): string {
  if (score >= 80) return 'bg-amber-900/30';
  if (score >= 65) return 'bg-emerald-900/20';
  if (score >= 45) return 'bg-blue-900/20';
  if (score >= 25) return 'bg-slate-800/30';
  return 'bg-red-900/20';
}

interface HourCardProps {
  hour: any;
  isExpanded: boolean;
  onClick: () => void;
}

function HourCard({ hour, isExpanded, onClick }: HourCardProps) {
  const color = scoreToColor(hour.energyScore);
  const barColor = scoreToBarColor(hour.energyScore);
  const borderColor = scoreToBorderColor(hour.energyScore);
  const bgColor = scoreToBgColor(hour.energyScore);

  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        'rounded-xl border cursor-pointer transition-all duration-300 overflow-hidden',
        borderColor,
        hour.isCurrentHour ? 'ring-1 ring-amber-400/60 shadow-lg shadow-amber-900/20' : '',
        isExpanded ? bgColor : 'bg-white/5 hover:bg-white/8'
      )}
    >
      {/* 緊湊視圖 */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* 時辰標籤 */}
          <div className="flex-shrink-0 text-center w-14">
            <div className={cn('text-sm font-bold tracking-wider', color)}>
              {hour.stem}{hour.branch}
            </div>
            <div className="text-[10px] text-muted-foreground">{hour.chineseName}</div>
          </div>

          {/* 能量條 */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{hour.displayTime}</span>
              <span className={cn('text-[10px] font-semibold', color)}>{hour.energyLabel}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', barColor)}
                initial={{ width: 0 }}
                animate={{ width: `${hour.energyScore}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>
          </div>

          {/* 特殊標記 */}
          <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
            {hour.isCurrentHour && (
              <span className="text-[10px] text-amber-400 font-bold">▶ 現在</span>
            )}
            {hour.isBirthHour && (
              <span className="text-[10px] text-purple-400" title="出生時辰">✦</span>
            )}
            {hour.isSpecialChou && (
              <span className="text-[10px] text-amber-300" title="丑時特殊加持">⭐</span>
            )}
          </div>
        </div>
      </div>

      {/* 展開詳情 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-white/10 pt-3">
              {/* 五行信息 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">五行：</span>
                <span className={cn('text-xs font-medium', color)}>
                  {hour.stemElement}（天干）/ {hour.branchElement}（地支）
                </span>
              </div>

              {/* 能量描述 */}
              <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3">
                {hour.energyDescription}
              </p>

              {/* 行動建議 */}
              <div className={cn('rounded-lg p-2 mb-2', bgColor, 'border', borderColor)}>
                <p className={cn('text-xs font-medium', color)}>
                  💡 {hour.actionSuggestion}
                </p>
              </div>

              {/* 宜忌 */}
              <div className="grid grid-cols-2 gap-2">
                {hour.auspicious.length > 0 && (
                  <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-2">
                    <div className="text-emerald-400 text-[10px] font-semibold mb-1">宜</div>
                    <div className="text-emerald-300/80 text-[10px] leading-relaxed">
                      {hour.auspicious.slice(0, 4).join('・')}
                    </div>
                  </div>
                )}
                {hour.inauspicious.length > 0 && (
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-2">
                    <div className="text-red-400 text-[10px] font-semibold mb-1">忌</div>
                    <div className="text-red-300/80 text-[10px] leading-relaxed">
                      {hour.inauspicious.slice(0, 4).join('・')}
                    </div>
                  </div>
                )}
              </div>

              {/* 特殊時辰說明 */}
              {hour.isBirthHour && (
                <div className="mt-2 p-2 bg-purple-900/20 border border-purple-600/40 rounded-lg">
                  <p className="text-purple-300 text-[10px]">
                    ✦ 出生時辰（己巳），天生共鳴，靈感與創意特別旺盛
                  </p>
                </div>
              )}
              {hour.isSpecialChou && (
                <div className="mt-2 p-2 bg-amber-900/20 border border-amber-600/40 rounded-lg">
                  <p className="text-amber-300 text-[10px]">
                    ⭐ 丑時（疾厄宮：紫微、破軍坐鎮），此時擲筊有天命加持
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function HourlyEnergyTimeline() {
  const [expandedHour, setExpandedHour] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = trpc.oracle.hourlyEnergy.useQuery();

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/2 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl mb-2" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { allHours, currentHour, bestHours } = data;

  // 預設只顯示當前時辰前後各2個（共5個），展開後顯示全部
  const currentIndex = allHours.findIndex((h: any) => h.isCurrentHour);
  const visibleHours = showAll
    ? allHours
    : allHours.slice(
        Math.max(0, currentIndex - 1),
        Math.min(12, currentIndex + 4)
      );

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">⏰</span>
          <span className="text-sm font-semibold tracking-wider text-amber-300">
            時辰能量
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 當前時辰快速顯示 */}
          <span className="text-xs text-muted-foreground">
            現在：{currentHour.stem}{currentHour.branch}時
            <span className={cn('ml-1 font-semibold', scoreToColor(currentHour.energyScore))}>
              {currentHour.energyLabel}
            </span>
          </span>
        </div>
      </div>

      {/* 今日最佳時辰 */}
      <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded-xl">
        <div className="text-xs text-amber-400 font-semibold mb-2">✨ 今日最佳時辰</div>
        <div className="flex gap-2 flex-wrap">
          {bestHours.map((h: any) => (
            <div
              key={h.branch}
              className="flex items-center gap-1.5 bg-amber-900/30 border border-amber-600/40 rounded-lg px-2 py-1"
            >
              <span className="text-amber-300 text-xs font-bold">{h.stem}{h.branch}</span>
              <span className="text-muted-foreground text-[10px]">{h.displayTime}</span>
              <span className="text-amber-400 text-[10px]">{h.energyLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 時辰列表 */}
      <div className="space-y-2">
        {visibleHours.map((hour: any) => (
          <HourCard
            key={hour.branch}
            hour={hour}
            isExpanded={expandedHour === hour.branch}
            onClick={() => setExpandedHour(expandedHour === hour.branch ? null : hour.branch)}
          />
        ))}
      </div>

      {/* 展開/收起全部 */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full mt-3 text-xs text-muted-foreground hover:text-amber-400 transition-colors py-2 border border-border/30 rounded-xl hover:border-amber-600/30"
      >
        {showAll ? '▲ 收起' : `▼ 查看全天 12 時辰（共 ${allHours.length} 個）`}
      </button>

      {/* 說明 */}
      <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
        點擊時辰可展開詳細宜忌建議 ・ ✦ 出生時辰 ・ ⭐ 丑時特殊加持
      </p>
    </div>
  );
}

export default HourlyEnergyTimeline;
