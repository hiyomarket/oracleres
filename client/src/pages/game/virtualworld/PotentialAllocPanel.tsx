/**
 * PotentialAllocPanel — 潛能五行分配面板
 * v5.9 重構：分配五行元素（木/火/土/金/水），通過五行加成影響面板屬性
 * 避免低等級直接堆屬性碾壓高等怪物
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { AgentData } from "./constants";

type WuxingKey = "wood" | "fire" | "earth" | "metal" | "water";

/** 五行加成表（與 statEngine.ts POTENTIAL_WUXING_BONUS 同步） */
const WUXING_BONUS_DESC: Record<WuxingKey, { effects: string[] }> = {
  wood:  { effects: ["+2 HP", "+0.5 治癒力"] },
  fire:  { effects: ["+0.5 ATK", "+0.5 MATK", "+0.2% 暴傷"] },
  earth: { effects: ["+0.5 DEF", "+0.3 MDEF"] },
  metal: { effects: ["+0.3 SPD", "+0.1% 暴擊", "+0.3 命中"] },
  water: { effects: ["+1 MP", "+0.3 SPR"] },
};

const WUXING_DEFS: { key: WuxingKey; label: string; icon: string; color: string; bgColor: string }[] = [
  { key: "wood",  label: "木", icon: "🌿", color: "#22c55e", bgColor: "rgba(34,197,94,0.12)" },
  { key: "fire",  label: "火", icon: "🔥", color: "#ef4444", bgColor: "rgba(239,68,68,0.12)" },
  { key: "earth", label: "土", icon: "🪨", color: "#f59e0b", bgColor: "rgba(245,158,11,0.12)" },
  { key: "metal", label: "金", icon: "⚡", color: "#e2e8f0", bgColor: "rgba(226,232,240,0.12)" },
  { key: "water", label: "水", icon: "💧", color: "#38bdf8", bgColor: "rgba(56,189,248,0.12)" },
];

export function PotentialAllocPanel({
  agent,
  onAllocated,
}: {
  agent: AgentData | null | undefined;
  onAllocated?: () => void;
}) {
  const [alloc, setAlloc] = useState<Record<WuxingKey, number>>({
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
  });
  const [showPanel, setShowPanel] = useState(false);
  const [selectedInfo, setSelectedInfo] = useState<WuxingKey | null>(null);

  const cpUtils = trpc.useUtils();
  const allocMutation = trpc.gameWorld.allocateStatPoints.useMutation({
    onSuccess: (data) => {
      toast.success(`成功分配 ${Object.values(alloc).reduce((a, b) => a + b, 0)} 點潛能！剩餘 ${data.remaining} 點`);
      setAlloc({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
      onAllocated?.();
    },
    onError: (e) => toast.error("分配失敗：" + e.message),
  });
  const resetMutation = trpc.gameWorld.resetStatPoints.useMutation({
    onSuccess: (data) => {
      toast.success(`潛能重置成功！消耗 ${data.goldSpent} 金幣`);
      setAlloc({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 });
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
      onAllocated?.();
    },
    onError: (e) => toast.error("重置失敗：" + e.message),
  });

  // 計算已分配和剩餘
  const totalFree = agent?.freeStatPoints ?? 0;
  const alreadyUsed = (agent?.potentialWood ?? 0) + (agent?.potentialFire ?? 0) + (agent?.potentialEarth ?? 0)
    + (agent?.potentialMetal ?? 0) + (agent?.potentialWater ?? 0);
  const remaining = totalFree - alreadyUsed;
  const pendingTotal = Object.values(alloc).reduce((a, b) => a + b, 0);
  const afterAlloc = remaining - pendingTotal;

  // 已分配的各五行
  const allocated = useMemo(() => ({
    wood: agent?.potentialWood ?? 0,
    fire: agent?.potentialFire ?? 0,
    earth: agent?.potentialEarth ?? 0,
    metal: agent?.potentialMetal ?? 0,
    water: agent?.potentialWater ?? 0,
  }), [agent?.potentialWood, agent?.potentialFire, agent?.potentialEarth, agent?.potentialMetal, agent?.potentialWater]);

  if (remaining <= 0 && alreadyUsed <= 0) return null;

  const handleAdd = (key: WuxingKey, amount = 1) => {
    const canAdd = Math.min(amount, afterAlloc);
    if (canAdd <= 0) return;
    setAlloc(prev => ({ ...prev, [key]: prev[key] + canAdd }));
  };

  const handleSub = (key: WuxingKey, amount = 1) => {
    const canSub = Math.min(amount, alloc[key]);
    if (canSub <= 0) return;
    setAlloc(prev => ({ ...prev, [key]: prev[key] - canSub }));
  };

  const handleConfirm = () => {
    if (pendingTotal <= 0) {
      toast.error("請至少分配 1 點");
      return;
    }
    allocMutation.mutate(alloc);
  };

  const handleReset = () => {
    if (alreadyUsed <= 0) {
      toast.error("沒有已分配的點數可重置");
      return;
    }
    if (!confirm(`確定要重置所有潛能點數嗎？\n消耗 500 金幣，當前金幣：${agent?.gold ?? 0}`)) return;
    resetMutation.mutate();
  };

  return (
    <div className="rounded-xl border p-2.5"
      style={{ background: "rgba(245,158,11,0.04)", borderColor: "rgba(245,158,11,0.2)" }}>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400">☯ 五行潛能</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ background: remaining > 0 ? "rgba(245,158,11,0.2)" : "rgba(100,116,139,0.2)",
                     color: remaining > 0 ? "#f59e0b" : "#64748b",
                     border: `1px solid ${remaining > 0 ? "rgba(245,158,11,0.4)" : "rgba(100,116,139,0.3)"}` }}>
            可用 {remaining} 點
          </span>
        </div>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="text-[10px] px-2 py-1 rounded-lg transition-all"
          style={{ background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)" }}>
          {showPanel ? "收起" : remaining > 0 ? "展開分配" : "查看"}
        </button>
      </div>

      {/* 已分配摘要（收起時顯示） */}
      {!showPanel && alreadyUsed > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {WUXING_DEFS.map(w => {
            const val = allocated[w.key];
            if (val <= 0) return null;
            return (
              <span key={w.key} className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${w.color}15`, color: w.color, border: `1px solid ${w.color}30` }}>
                {w.icon} {w.label} +{val}
              </span>
            );
          })}
        </div>
      )}

      {/* 展開的分配面板 */}
      {showPanel && (
        <div className="space-y-2 mt-2">
          {/* 五行分配控制 */}
          {WUXING_DEFS.map(w => {
            const currentAlloc = allocated[w.key];
            const pendingAdd = alloc[w.key];
            const totalForEl = currentAlloc + pendingAdd;
            const isSelected = selectedInfo === w.key;

            return (
              <div key={w.key}>
                <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all cursor-pointer"
                  style={{ background: isSelected ? w.bgColor : "transparent" }}
                  onClick={() => setSelectedInfo(isSelected ? null : w.key)}>
                  {/* 五行圖標 */}
                  <span className="text-base w-6 text-center">{w.icon}</span>
                  <span className="text-xs font-bold w-6" style={{ color: w.color }}>{w.label}</span>
                  {/* 已分配 */}
                  <span className="text-[10px] text-slate-500 w-8 text-right tabular-nums">
                    {currentAlloc > 0 ? currentAlloc : "-"}
                  </span>
                  {/* +/- 按鈕 */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSub(w.key, 5); }}
                      disabled={pendingAdd < 5}
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all"
                      style={{
                        background: pendingAdd >= 5 ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.02)",
                        color: pendingAdd >= 5 ? "#ef4444" : "#334155",
                        border: `1px solid ${pendingAdd >= 5 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      -5
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSub(w.key); }}
                      disabled={pendingAdd <= 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: pendingAdd > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                        color: pendingAdd > 0 ? "#ef4444" : "#475569",
                        border: `1px solid ${pendingAdd > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      -
                    </button>
                    <span className="text-xs font-bold w-7 text-center tabular-nums"
                      style={{ color: pendingAdd > 0 ? "#f59e0b" : "#475569" }}>
                      {pendingAdd > 0 ? `+${pendingAdd}` : "0"}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAdd(w.key); }}
                      disabled={afterAlloc <= 0}
                      className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        background: afterAlloc > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                        color: afterAlloc > 0 ? "#22c55e" : "#475569",
                        border: `1px solid ${afterAlloc > 0 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                      }}>
                      +
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAdd(w.key, 5); }}
                      disabled={afterAlloc < 5}
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all"
                      style={{
                        background: afterAlloc >= 5 ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.02)",
                        color: afterAlloc >= 5 ? "#22c55e" : "#334155",
                        border: `1px solid ${afterAlloc >= 5 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)"}`,
                      }}>
                      +5
                    </button>
                  </div>
                  {/* 總計 */}
                  <span className="text-[10px] flex-1 text-right tabular-nums font-bold" style={{ color: w.color }}>
                    {totalForEl > 0 ? totalForEl : ""}
                  </span>
                </div>
                {/* 效果說明（點擊展開） */}
                {isSelected && (
                  <div className="ml-8 mt-0.5 mb-1 px-2 py-1 rounded-md text-[10px] space-y-0.5"
                    style={{ background: "rgba(0,0,0,0.2)" }}>
                    <div className="text-slate-400 font-bold">每點效果：</div>
                    {WUXING_BONUS_DESC[w.key].effects.map((eff, i) => (
                      <div key={i} className="text-slate-500">{eff}</div>
                    ))}
                    {totalForEl > 0 && (
                      <div className="text-slate-400 mt-1 pt-1 border-t border-white/5">
                        已投入 {totalForEl} 點 → 總加成：
                        {WUXING_BONUS_DESC[w.key].effects.map((eff, i) => {
                          const match = eff.match(/\+([0-9.]+)/);
                          if (!match) return null;
                          const perPoint = parseFloat(match[1]);
                          const total = (perPoint * totalForEl).toFixed(1);
                          const suffix = eff.includes("%") ? "%" : "";
                          const label = eff.replace(/\+[0-9.]+%?\s*/, "");
                          return <span key={i} className="ml-1" style={{ color: w.color }}>+{total}{suffix} {label}</span>;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 預覽摘要 */}
          {pendingTotal > 0 && (
            <div className="px-2 py-1.5 rounded-lg text-[10px]"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span className="text-amber-400 font-bold">本次分配 {pendingTotal} 點</span>
              <span className="text-slate-500 ml-2">分配後剩餘 {afterAlloc} 點</span>
            </div>
          )}

          {/* 按鈕列 */}
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={pendingTotal <= 0 || allocMutation.isPending}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: pendingTotal > 0 ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.03)",
                color: pendingTotal > 0 ? "#f59e0b" : "#475569",
                border: `1px solid ${pendingTotal > 0 ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}>
              {allocMutation.isPending ? "分配中..." : `確認分配 (${pendingTotal} 點)`}
            </button>
            {alreadyUsed > 0 && (
              <button
                onClick={handleReset}
                disabled={resetMutation.isPending}
                className="py-2 px-3 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}>
                {resetMutation.isPending ? "..." : "重置 (500金)"}
              </button>
            )}
          </div>

          {/* 說明 */}
          <div className="text-[10px] text-slate-600 space-y-0.5 px-1">
            <p>每次升級獲得 5 點潛能，分配到五行元素來增強屬性</p>
            <p>五行加成温和漸進，不同元素影響不同屬性面板</p>
            <p>重置需消耗 500 金幣，所有點數歸還</p>
          </div>
        </div>
      )}
    </div>
  );
}
