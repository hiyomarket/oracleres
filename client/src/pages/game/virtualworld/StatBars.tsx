/**
 * StatBar / MiniAttrBar — 共用屬性條組件
 */

export function StatBar({ icon, label, value, max, color }: { icon: string; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5 text-center shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color, minWidth: "60px", textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

export function MiniAttrBar({ icon, label, value, color, max = 100 }: { icon: string; label: string; value: number; color: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs w-4 text-center shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 shrink-0" style={{ minWidth: "36px" }}>{label}</span>
      <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color, minWidth: "24px", textAlign: "right" }}>{value}</span>
    </div>
  );
}
