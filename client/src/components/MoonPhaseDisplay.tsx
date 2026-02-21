import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// 月相 SVG 圖示
function MoonSVG({ phase, size = 48 }: { phase: string; size?: number }) {
  const s = size;
  const r = s / 2;

  // 根據月相名稱渲染不同的月亮形狀
  const renderMoon = () => {
    switch (phase) {
      case 'new_moon':
        return (
          <circle cx={r} cy={r} r={r - 2} fill="oklch(0.15 0.05 240)" stroke="oklch(0.4 0.1 240)" strokeWidth="1.5" />
        );
      case 'waxing_crescent':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.15 0.05 240)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 1 ${r} ${s-2} A ${r * 0.5} ${r-2} 0 0 0 ${r} ${2}`}
              fill="oklch(0.85 0.15 55)"
            />
          </>
        );
      case 'first_quarter':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.15 0.05 240)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 1 ${r} ${s-2} L ${r} ${2}`}
              fill="oklch(0.85 0.15 55)"
            />
          </>
        );
      case 'waxing_gibbous':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.85 0.15 55)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 0 ${r} ${s-2} A ${r * 0.4} ${r-2} 0 0 1 ${r} ${2}`}
              fill="oklch(0.15 0.05 240)"
            />
          </>
        );
      case 'full_moon':
        return (
          <circle cx={r} cy={r} r={r - 2} fill="oklch(0.90 0.12 55)" stroke="oklch(0.75 0.18 55)" strokeWidth="1" />
        );
      case 'waning_gibbous':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.85 0.15 55)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 1 ${r} ${s-2} A ${r * 0.4} ${r-2} 0 0 0 ${r} ${2}`}
              fill="oklch(0.15 0.05 240)"
            />
          </>
        );
      case 'last_quarter':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.15 0.05 240)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 0 ${r} ${s-2} L ${r} ${2}`}
              fill="oklch(0.85 0.15 55)"
            />
          </>
        );
      case 'waning_crescent':
        return (
          <>
            <circle cx={r} cy={r} r={r - 2} fill="oklch(0.15 0.05 240)" />
            <path
              d={`M ${r} ${2} A ${r-2} ${r-2} 0 0 0 ${r} ${s-2} A ${r * 0.5} ${r-2} 0 0 1 ${r} ${2}`}
              fill="oklch(0.85 0.15 55)"
            />
          </>
        );
      default:
        return <circle cx={r} cy={r} r={r - 2} fill="oklch(0.5 0.1 240)" />;
    }
  };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className="drop-shadow-lg">
      {renderMoon()}
    </svg>
  );
}

export function MoonPhaseDisplay({ compact = false }: { compact?: boolean }) {
  const { data, isLoading } = trpc.oracle.moonPhase.useQuery();

  if (isLoading) {
    return (
      <div className={cn(
        'glass-card rounded-xl animate-pulse',
        compact ? 'p-3' : 'p-4'
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-full" />
          <div className="flex-1">
            <div className="h-3 bg-white/10 rounded w-1/2 mb-1" />
            <div className="h-2 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isFullMoon = data.phase === 'full_moon';
  const hasBonus = data.shengBonus > 0;

  if (compact) {
    return (
      <div className={cn(
        'glass-card rounded-xl p-3 flex items-center gap-3',
        isFullMoon ? 'border border-amber-600/50 bg-amber-900/20' : 'border border-border/30'
      )}>
        <motion.div
          animate={isFullMoon ? {
            filter: ['drop-shadow(0 0 4px oklch(0.85 0.15 55))', 'drop-shadow(0 0 10px oklch(0.85 0.15 55))', 'drop-shadow(0 0 4px oklch(0.85 0.15 55))'],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <MoonSVG phase={data.phase} size={36} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{data.phaseName}</span>
            {hasBonus && (
              <span className="text-[10px] text-amber-400 bg-amber-900/30 border border-amber-600/40 rounded px-1">
                +{data.shengBonus}% 聖杯
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">{data.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'glass-card rounded-2xl p-5',
      isFullMoon ? 'border border-amber-600/50' : 'border border-border/30'
    )}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🌙</span>
          <span className="text-sm font-semibold tracking-wider text-blue-300">
            月相能量
          </span>
        </div>
        {hasBonus && (
          <span className="text-xs text-amber-400 bg-amber-900/30 border border-amber-600/40 rounded-full px-2 py-0.5">
            聖杯機率 +{data.shengBonus}%
          </span>
        )}
      </div>

      {/* 月相圖示 + 信息 */}
      <div className="flex items-center gap-5 mb-4">
        <motion.div
          className="flex-shrink-0"
          animate={isFullMoon ? {
            filter: [
              'drop-shadow(0 0 6px oklch(0.85 0.15 55))',
              'drop-shadow(0 0 16px oklch(0.85 0.15 55))',
              'drop-shadow(0 0 6px oklch(0.85 0.15 55))',
            ],
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <MoonSVG phase={data.phase} size={56} />
        </motion.div>

        <div className="flex-1">
          <div className="text-lg font-bold text-foreground mb-1">{data.phaseName}</div>
          <div className="text-xs text-muted-foreground mb-2">
            農曆 {data.lunarDay} 日
          </div>
          {/* 月相進度條 */}
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-slate-400 via-amber-300 to-slate-400"
              initial={{ width: 0 }}
              animate={{ width: `${data.illumination}%` }}
              transition={{ duration: 1 }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>新月</span>
            <span>{data.illumination}% 盈虧</span>
            <span>滿月</span>
          </div>
        </div>
      </div>

      {/* 月相描述 */}
      <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3">
        {data.description}
      </p>

      {/* 擲筊影響 */}
      <div className={cn(
        'rounded-xl p-3 border',
        hasBonus
          ? 'bg-amber-900/20 border-amber-600/40'
          : 'bg-white/5 border-border/30'
      )}>
        <div className="text-xs font-semibold mb-1 text-foreground">對擲筊的影響</div>
        <p className="text-xs text-muted-foreground/80 leading-relaxed">
          {data.castInfluence}
        </p>
      </div>

      {/* 滿月特效 */}
      {isFullMoon && (
        <motion.div
          className="mt-3 p-3 bg-amber-900/30 border border-amber-500/50 rounded-xl text-center"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <p className="text-amber-300 text-xs font-semibold">
            🌕 滿月之夜，月光最盛，神明感應最為靈敏
          </p>
          <p className="text-amber-400/70 text-[10px] mt-1">
            聖杯機率提升 {data.shengBonus}%，此時擲筊最為準確
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default MoonPhaseDisplay;
