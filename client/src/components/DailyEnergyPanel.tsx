import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const ENERGY_CONFIG = {
  excellent: {
    label: '天命大吉',
    color: 'text-amber-300',
    bgColor: 'bg-amber-900/30',
    borderColor: 'border-amber-600/50',
    icon: '🌟',
    barColor: 'bg-amber-400',
    barWidth: '95%',
  },
  good: {
    label: '能量平吉',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-900/30',
    borderColor: 'border-emerald-600/50',
    icon: '✨',
    barColor: 'bg-emerald-400',
    barWidth: '70%',
  },
  neutral: {
    label: '能量中性',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-600/50',
    icon: '⚪',
    barColor: 'bg-blue-400',
    barWidth: '50%',
  },
  challenging: {
    label: '能量受阻',
    color: 'text-slate-400',
    bgColor: 'bg-slate-800/40',
    borderColor: 'border-slate-600/50',
    icon: '⚠️',
    barColor: 'bg-slate-500',
    barWidth: '25%',
  },
  complex: {
    label: '能量複雜',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-600/50',
    icon: '🔮',
    barColor: 'bg-purple-400',
    barWidth: '45%',
  },
};

export function DailyEnergyPanel() {
  const { data, isLoading } = trpc.oracle.dailyEnergy.useQuery();

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
        <div className="h-3 bg-white/10 rounded w-full mb-1" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  const { dayPillar, dateString, isSpecialChouTime } = data;
  const config = ENERGY_CONFIG[dayPillar.energyLevel as keyof typeof ENERGY_CONFIG] || ENERGY_CONFIG.neutral;

  return (
    <div className={cn('glass-card rounded-2xl p-5 border', config.borderColor)}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={cn('text-sm font-semibold tracking-wider', config.color)}>
            今日能量
          </span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', config.bgColor, config.borderColor, config.color)}>
          {config.label}
        </span>
      </div>

      {/* 日期信息 */}
      <div className="text-center mb-3">
        <div className="text-xs text-muted-foreground mb-1">今日干支</div>
        <div className="flex items-center justify-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold oracle-text-gradient">
              {dayPillar.stem}{dayPillar.branch}
            </div>
            <div className="text-xs text-muted-foreground">
              {dayPillar.stemElement}/{dayPillar.branchElement}
            </div>
          </div>
        </div>
      </div>

      {/* 能量條 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>能量指數</span>
          <span className={config.color}>{config.label}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', config.barColor)}
            style={{ width: config.barWidth }}
          />
        </div>
      </div>

      {/* 能量描述 */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {dayPillar.energyDescription}
      </p>

      {/* 宜忌 */}
      {(dayPillar.auspicious.length > 0 || dayPillar.inauspicious.length > 0) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {dayPillar.auspicious.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-2">
              <div className="text-emerald-400 font-semibold mb-1">宜</div>
              <div className="text-emerald-300/80">
                {dayPillar.auspicious.slice(0, 3).join('・')}
              </div>
            </div>
          )}
          {dayPillar.inauspicious.length > 0 && (
            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-2">
              <div className="text-red-400 font-semibold mb-1">忌</div>
              <div className="text-red-300/80">
                {dayPillar.inauspicious.slice(0, 3).join('・')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 特殊丑時/丑月提示 */}
      {isSpecialChouTime && (
        <div className="mt-3 p-2 bg-amber-900/30 border border-amber-600/50 rounded-lg text-center">
          <span className="text-amber-300 text-xs">
            ⭐ 天命寶庫開啟，今日擲筊有特殊加成
          </span>
        </div>
      )}
    </div>
  );
}

export default DailyEnergyPanel;
