/**
 * PotentialAllocPanel — 潛能點數分配面板
 * GD-028：玩家可將升級獲得的自由點數分配到 HP/MP/ATK/DEF/SPD/MATK
 */
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { AgentData } from "./constants";

// 每點潛能效果（與 statEngine.ts 同步）
const POTENTIAL_PER_POINT = {
  hp: 20, mp: 10, atk: 3, def: 3, spd: 2, matk: 3,
};

const STAT_DEFS = [
  { key: "hp"   as const, label: "HP上限",   icon: "❤️", color: "#ef4444", perPoint: POTENTIAL_PER_POINT.hp,   desc: `每點 +${POTENTIAL_PER_POINT.hp} HP` },
  { key: "mp"   as const, label: "MP上限",   icon: "💧", color: "#38bdf8", perPoint: POTENTIAL_PER_POINT.mp,   desc: `每點 +${POTENTIAL_PER_POINT.mp} MP` },
  { key: "atk"  as const, label: "物理攻擊", icon: "🔥", color: "#f59e0b", perPoint: POTENTIAL_PER_POINT.atk,  desc: `每點 +${POTENTIAL_PER_POINT.atk} ATK` },
  { key: "def"  as const, label: "物理防禦", icon: "🛡️", color: "#22c55e", perPoint: POTENTIAL_PER_POINT.def,  desc: `每點 +${POTENTIAL_PER_POINT.def} DEF` },
  { key: "spd"  as const, label: "命中力",   icon: "⚡", color: "#e2e8f0", perPoint: POTENTIAL_PER_POINT.spd,  desc: `每點 +${POTENTIAL_PER_POINT.spd} SPD` },
  { key: "matk" as const, label: "魔法攻擊", icon: "✨", color: "#a78bfa", perPoint: POTENTIAL_PER_POINT.matk, desc: `每點 +${POTENTIAL_PER_POINT.matk} MATK` },
] as const;

type AllocKey = typeof STAT_DEFS[number]["key"];

export function PotentialAllocPanel({
  agent,
  onAllocated,
}: {
  agent: AgentData | null | undefined;
  onAllocated?: () => void;
}) {
  const [alloc, setAlloc] = useState<Record<AllocKey, number>>({
    hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0,
  });
  const [showPanel, setShowPanel] = useState(false);

  const cpUtils = trpc.useUtils();
  const allocMutation = trpc.gameWorld.allocateStatPoints.useMutation({
    onSuccess: (data) => {
      toast.success(`成功分配 ${Object.values(alloc).reduce((a, b) => a + b, 0)} 點潛能！剩餘 ${data.remaining} 點`);
      setAlloc({ hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 });
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
      onAllocated?.();
    },
    onError: (e) => toast.error("分配失敗：" + e.message),
  });
  const resetMutation = trpc.gameWorld.resetStatPoints.useMutation({
    onSuccess: (data) => {
      toast.success(`潛能重置成功！消耗 ${data.goldSpent} 金幣`);
      setAlloc({ hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 });
      cpUtils.gameWorld.getOrCreateAgent.invalidate();
      cpUtils.gameWorld.getAgentStatus.invalidate();
      onAllocated?.();
    },
    onError: (e) => toast.error("重置失敗：" + e.message),
  });

  // 計算已分配和剩餘
  const totalFree = agent?.freeStatPoints ?? 0;
  const alreadyUsed = (agent?.potentialHp ?? 0) + (agent?.potentialMp ?? 0) + (agent?.potentialAtk ?? 0)
    + (agent?.potentialDef ?? 0) + (agent?.potentialSpd ?? 0) + (agent?.potentialMatk ?? 0);
  const remaining = totalFree - alreadyUsed;
  const pendingTotal = Object.values(alloc).reduce((a, b) => a + b, 0);
  const afterAlloc = remaining - pendingTotal;

  // 已分配的各屬性
  const allocated = useMemo(() => ({
    hp: agent?.potentialHp ?? 0,
    mp: agent?.potentialMp ?? 0,
    atk: agent?.potentialAtk ?? 0,
    def: agent?.potentialDef ?? 0,
    spd: agent?.potentialSpd ?? 0,
    matk: agent?.potentialMatk ?? 0,
  }), [agent]);

  if (remaining <= 0 && alreadyUsed <= 0) return null; // 沒有任何點數

  const handleAdd = (key: AllocKey) => {
    if (afterAlloc <= 0) return;
    setAlloc(prev => ({ ...prev, [key]: prev[key] + 1 }));
  };

  const handleSub = (key: AllocKey) => {
    if (alloc[key] <= 0) return;
    setAlloc(prev => ({ ...prev, [key]: prev[key] - 1 }));
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
          <span className="text-xs font-bold text-amber-400">⚡ 潛能分配</span>
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
          {STAT_DEFS.map(s => {
            const val = allocated[s.key];
            if (val <= 0) return null;
            return (
              <span key={s.key} className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                {s.icon} {s.label} +{val} ({val * s.perPoint})
              </span>
            );
          })}
        </div>
      )}

      {/* 展開的分配面板 */}
      {showPanel && (
        <div className="space-y-2 mt-2">
          {/* 分配控制 */}
          {STAT_DEFS.map(s => {
            const currentAlloc = allocated[s.key];
            const pendingAdd = alloc[s.key];
            const totalForStat = currentAlloc + pendingAdd;
            const bonusValue = totalForStat * s.perPoint;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-sm w-5 text-center">{s.icon}</span>
                <span className="text-[11px] text-slate-400 w-16">{s.label}</span>
                {/* 已分配 */}
                <span className="text-[10px] text-slate-600 w-6 text-right tabular-nums">{currentAlloc}</span>
                {/* +/- 按鈕 */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSub(s.key)}
                    disabled={pendingAdd <= 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: pendingAdd > 0 ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
                      color: pendingAdd > 0 ? "#ef4444" : "#475569",
                      border: `1px solid ${pendingAdd > 0 ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    -
                  </button>
                  <span className="text-xs font-bold w-5 text-center tabular-nums"
                    style={{ color: pendingAdd > 0 ? "#f59e0b" : "#475569" }}>
                    {pendingAdd > 0 ? `+${pendingAdd}` : "0"}
                  </span>
                  <button
                    onClick={() => handleAdd(s.key)}
                    disabled={afterAlloc <= 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: afterAlloc > 0 ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                      color: afterAlloc > 0 ? "#22c55e" : "#475569",
                      border: `1px solid ${afterAlloc > 0 ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    +
                  </button>
                </div>
                {/* 效果預覽 */}
                <span className="text-[10px] flex-1 text-right tabular-nums" style={{ color: s.color }}>
                  +{bonusValue}
                </span>
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
              {allocMutation.isPending ? "⏳ 分配中..." : `確認分配 (${pendingTotal} 點)`}
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
                {resetMutation.isPending ? "⏳" : "🔄 重置 (500金)"}
              </button>
            )}
          </div>

          {/* 說明 */}
          <div className="text-[10px] text-slate-600 space-y-0.5 px-1">
            <p>每次升級獲得 5 點潛能，可自由分配到各屬性</p>
            <p>重置需消耗 500 金幣，所有點數歸還</p>
          </div>
        </div>
      )}
    </div>
  );
}
