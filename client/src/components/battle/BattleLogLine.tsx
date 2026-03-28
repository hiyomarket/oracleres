/**
 * battle/BattleLogLine.tsx — 戰鬥日誌行
 */
import React from "react";
import { BattleLogUI, BattleParticipantUI } from "./types";

export function BattleLogLine({ log, allies, isLatest }: { log: BattleLogUI; allies: BattleParticipantUI[]; isLatest: boolean }) {
  const isAlly = allies.some(a => a.id === log.actorId);
  const typeStyle: Record<string, string> = {
    damage: isAlly ? (log.isCritical ? "text-yellow-300" : "text-cyan-300") : (log.isCritical ? "text-red-300" : "text-orange-400"),
    heal: "text-emerald-400",
    defend: "text-blue-400",
    flee: "text-amber-400",
    defeat: "text-red-500 font-bold",
    status_tick: "text-purple-400",
  };
  const color = typeStyle[log.logType] ?? "text-slate-500";

  return (
    <div className={`text-[10px] leading-relaxed ${color} ${isLatest ? "animate-fadeSlideIn" : ""}`}
      style={{ opacity: isLatest ? 1 : 0.7 }}>
      <span className="text-indigo-800 mr-1 font-mono">R{log.round}</span>
      <span>{log.message}</span>
      {log.elementBoostDesc && <span className="text-yellow-500/50 ml-1 text-[9px]">({log.elementBoostDesc})</span>}
      {log.isCritical && <span className="text-yellow-300 ml-1 font-bold">💥暴擊！</span>}
    </div>
  );
}
