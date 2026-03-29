/**
 * battle/BattleGrid.tsx — 6v6 戰鬥格子佈局（前後排分組）
 */
import React from "react";
import { BattleParticipantUI } from "./types";
import { CombatantCard } from "./CombatantCard";

export function BattleGrid({ participants, isEnemy, attackingId, hitId, maxSlots = 6, selectedTargetId, onTargetSelect }: {
  participants: BattleParticipantUI[];
  isEnemy?: boolean;
  attackingId: number | null;
  hitId: number | null;
  maxSlots?: number;
  selectedTargetId?: number | null;
  onTargetSelect?: (id: number) => void;
}) {
  // 按 rowPosition 分組：前排（寵物/怪物）和後排（玩家角色）
  const frontRow = participants.filter(p => p.rowPosition === "front" || (!p.rowPosition && (p.type === "pet" || p.type === "monster")));
  const backRow = participants.filter(p => p.rowPosition === "back" || (!p.rowPosition && p.type === "character"));

  // 如果沒有任何 rowPosition 資料（舊戰鬥），fallback 到原本的 slice 邏輯
  const hasRowData = participants.some(p => p.rowPosition);
  const displayFront = hasRowData ? frontRow : participants.slice(0, 3);
  const displayBack = hasRowData ? backRow : participants.slice(3, 6);

  const renderSlot = (p: BattleParticipantUI | undefined, slotIdx: number, rowLabel?: string) => {
    if (!p) {
      return (
        <div key={`empty-${rowLabel}-${slotIdx}`} className="flex-1 min-w-0 rounded-xl border border-dashed border-white/5 flex items-center justify-center"
          style={{ minHeight: "72px", background: "rgba(255,255,255,0.01)" }}>
          <span className="text-[10px] text-white/10">空</span>
        </div>
      );
    }
    const canSelect = onTargetSelect && !p.isDefeated;
    const isSelected = selectedTargetId === p.id && canSelect;
    return (
      <div key={p.id} className="flex-1 min-w-0 relative"
        style={{ cursor: canSelect ? "crosshair" : undefined }}
        onClick={() => {
          if (canSelect) onTargetSelect(p.id);
        }}>
        {isSelected && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="text-[10px] animate-bounce" style={{ filter: isEnemy ? "drop-shadow(0 0 4px #ef4444)" : "drop-shadow(0 0 4px #22c55e)" }}>{isEnemy ? "🔻" : "💚"}</span>
          </div>
        )}
        <div style={{
          borderRadius: "12px",
          outline: isSelected ? `2px solid ${isEnemy ? "rgba(239,68,68,0.7)" : "rgba(34,197,94,0.7)"}` : "none",
          outlineOffset: "2px",
          boxShadow: isSelected ? (isEnemy ? "0 0 12px rgba(239,68,68,0.4)" : "0 0 12px rgba(34,197,94,0.4)") : undefined,
          transition: "all 0.15s",
        }}>
          <CombatantCard p={p} isEnemy={isEnemy}
            isAttacking={attackingId === p.id}
            isHit={hitId === p.id} />
        </div>
      </div>
    );
  };

  // 敵方：前排在上，後排在下
  // 我方：前排在上（靠近敵方），後排在下（靠近指令面板）
  const frontLabel = isEnemy ? "前排" : "前排（護衛）";
  const backLabel = isEnemy ? "後排" : "後排（指揮）";

  return (
    <div className="space-y-1">
      {/* 前排 */}
      <div>
        {hasRowData && displayFront.length > 0 && (
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[8px] font-bold tracking-wider" style={{
              color: isEnemy ? "rgba(239,68,68,0.4)" : "rgba(34,211,238,0.4)",
            }}>
              {isEnemy ? "▼" : "▲"} {frontLabel}
            </span>
            <div className="flex-1 h-[1px]" style={{
              background: isEnemy
                ? "linear-gradient(90deg, rgba(239,68,68,0.15), transparent)"
                : "linear-gradient(90deg, rgba(34,211,238,0.15), transparent)",
            }} />
          </div>
        )}
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }, (_, i) => renderSlot(displayFront[i], i, "front"))}
        </div>
      </div>

      {/* 後排 */}
      {(displayBack.length > 0 || maxSlots > 3) && (
        <div>
          {hasRowData && displayBack.length > 0 && (
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[8px] font-bold tracking-wider" style={{
                color: isEnemy ? "rgba(239,68,68,0.3)" : "rgba(34,211,238,0.3)",
              }}>
                {isEnemy ? "▼" : "▲"} {backLabel}
              </span>
              <div className="flex-1 h-[1px]" style={{
                background: isEnemy
                  ? "linear-gradient(90deg, rgba(239,68,68,0.1), transparent)"
                  : "linear-gradient(90deg, rgba(34,211,238,0.1), transparent)",
              }} />
            </div>
          )}
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => renderSlot(displayBack[i], i, "back"))}
          </div>
        </div>
      )}
    </div>
  );
}
