/**
 * NodeInfoPanel — 節點資訊面板（方格面板）
 */
import { BossMonsterRow } from "@/components/game/BossTooltip";
import { WX_HEX, WX_EMOJI, type NodeInfoData } from "./constants";

export function NodeInfoPanel({
  nodeData, isOpen, onToggle, ec, compact = false, onChallenge,
}: {
  nodeData: NodeInfoData | null | undefined;
  isOpen: boolean;
  onToggle: () => void;
  ec: string;
  compact?: boolean;
  onChallenge?: (monsterId: string, monsterName: string, isBoss?: boolean) => void;
}) {
  const node = nodeData?.node;
  const monsters = nodeData?.monsters ?? [];
  const resources = nodeData?.resources ?? [];
  const questHints = nodeData?.questHints ?? [];
  const adventurers = nodeData?.adventurers ?? [];
  const dangerColor = ["", "#22c55e", "#84cc16", "#f59e0b", "#ef4444", "#dc2626"];
  const dangerLabel = ["", "安全", "低危", "中危", "高危", "極危"];
  const dl = Math.min(5, Math.max(0, node?.dangerLevel ?? 1));

  return (
    <div className="flex flex-col">
      <button
        onClick={onToggle}
        className="flex items-center justify-between px-3 py-2.5 w-full transition-all hover:bg-white/5"
        style={{ background: isOpen ? `${ec}08` : "transparent" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">📍</span>
          <span className="text-sm font-bold text-slate-200">{node?.name ?? "—"}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ background: `${ec}18`, color: ec }}>{node?.county ?? "—"}</span>
          {dl > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${dangerColor[dl]}18`, color: dangerColor[dl] }}>
              {dangerLabel[dl]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {adventurers.length > 0 && (
            <span className="text-xs text-slate-500">{adventurers.length}人</span>
          )}
          <span className="text-slate-500 text-xs">{isOpen ? "▼" : "▲"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 overflow-y-auto" style={{ maxHeight: compact ? "30vh" : "35vh" }}>
          {node?.description && (
            <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 pl-2.5"
              style={{ borderColor: `${ec}40` }}>{node.description}</p>
          )}

          {monsters.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>⚔️</span> 此地怪物
                <span className="text-slate-600 font-normal ml-1">Lv.{node?.monsterLevel?.[0] ?? 1}–{node?.monsterLevel?.[1] ?? 10}</span>
              </p>
              <div className="space-y-1.5">
                {monsters.map(monster => (
                  <BossMonsterRow key={monster.id} monster={monster} onChallenge={onChallenge} />
                ))}
              </div>
            </div>
          )}

          {resources.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>🌿</span> 可收集資源
              </p>
              <div className="flex flex-wrap gap-1.5">
                {resources.map((r, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full border text-xs"
                    style={{ background: `${ec}08`, borderColor: `${ec}25`, color: ec }}>
                    <span>{r.icon}</span>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-600">·{r.rarity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questHints.length > 0 && (
            <div className="space-y-1">
              {questHints.map((hint, i) => (
                <div key={i} className="text-xs px-2.5 py-1.5 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {hint}
                </div>
              ))}
            </div>
          )}

          {adventurers.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <span>👥</span> 在場冒險者（{adventurers.length}）
              </p>
              <div className="space-y-1.5">
                {adventurers.map((adventurer, i) => {
                  const ac = WX_HEX[adventurer.element] ?? "#888";
                  const hpPct = adventurer.maxHp > 0 ? Math.min(100, (adventurer.hp / adventurer.maxHp) * 100) : 0;
                  const isCombat = adventurer.status === "combat";
                  const isResting = adventurer.status === "resting";
                  const isMoving = adventurer.status === "moving";
                  const statusLabel = isCombat ? "⚔️ 戰鬥中" : isMoving ? "🚶 移動中" : isResting ? "💤 休息中" : "✨ 探索中";
                  const statusColor = isCombat ? "#ef4444" : isMoving ? "#38bdf8" : isResting ? "#94a3b8" : "#22c55e";
                  const statusBg = isCombat ? "rgba(239,68,68,0.15)" : isMoving ? "rgba(56,189,248,0.1)" : isResting ? "rgba(148,163,184,0.1)" : "rgba(34,197,94,0.1)";
                  const hpColor = hpPct > 60 ? "#22c55e" : hpPct > 30 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all"
                      style={{ background: `${ac}08`, borderColor: isCombat ? `${statusColor}40` : `${ac}20`,
                        boxShadow: isCombat ? `0 0 8px ${statusColor}20` : "none" }}>
                      <div className="relative shrink-0">
                        <span className="text-sm">{WX_EMOJI[adventurer.element] ?? "👤"}</span>
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                          style={{ background: statusColor,
                            animation: isCombat ? "nodeAdventurerPulse 0.8s ease-in-out infinite" : "none",
                            boxShadow: isCombat ? `0 0 4px ${statusColor}` : "none" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-sm font-bold text-slate-200 truncate max-w-[80px]">{adventurer.name}</span>
                          <span className="text-xs text-slate-500">Lv.{adventurer.level}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: statusBg, color: statusColor, fontSize: "10px" }}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${hpPct}%`, background: hpColor,
                                boxShadow: hpPct < 30 ? `0 0 4px ${hpColor}` : "none" }} />
                          </div>
                          <span className="text-xs text-slate-600 shrink-0" style={{ fontSize: "10px" }}>{adventurer.hp}/{adventurer.maxHp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {monsters.length === 0 && resources.length === 0 && adventurers.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-2">此地一片寧靜…</p>
          )}
        </div>
      )}
    </div>
  );
}
