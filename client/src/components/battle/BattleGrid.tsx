/**
 * battle/BattleGrid.tsx — 6v6 戰鬥格子佈局
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
  const frontRow = participants.slice(0, 3);
  const backRow = participants.slice(3, 6);

  const renderSlot = (p: BattleParticipantUI | undefined, slotIdx: number) => {
    if (!p) {
      return (
        <div key={`empty-${slotIdx}`} className="flex-1 min-w-0 rounded-xl border border-dashed border-white/5 flex items-center justify-center"
          style={{ minHeight: "72px", background: "rgba(255,255,255,0.01)" }}>
          <span className="text-[10px] text-white/10">空</span>
        </div>
      );
    }
    const isSelected = isEnemy && selectedTargetId === p.id;
    return (
      <div key={p.id} className="flex-1 min-w-0 relative"
        style={{ cursor: isEnemy && onTargetSelect && !p.isDefeated ? "crosshair" : undefined }}
        onClick={() => {
          if (isEnemy && onTargetSelect && !p.isDefeated) onTargetSelect(p.id);
        }}>
        {isSelected && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="text-[10px] animate-bounce" style={{ filter: "drop-shadow(0 0 4px #ef4444)" }}>🔻</span>
          </div>
        )}
        <div style={{
          borderRadius: "12px",
          outline: isSelected ? "2px solid rgba(239,68,68,0.7)" : "none",
          outlineOffset: "2px",
          boxShadow: isSelected ? "0 0 12px rgba(239,68,68,0.4)" : undefined,
          transition: "all 0.15s",
        }}>
          <CombatantCard p={p} isEnemy={isEnemy}
            isAttacking={attackingId === p.id}
            isHit={hitId === p.id} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }, (_, i) => renderSlot(frontRow[i], i))}
      </div>
      {(participants.length > 3 || maxSlots > 3) && (
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }, (_, i) => renderSlot(backRow[i], i + 3))}
        </div>
      )}
    </div>
  );
}
