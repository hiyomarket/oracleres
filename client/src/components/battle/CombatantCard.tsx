/**
 * battle/CombatantCard.tsx — 戰鬥單位卡片
 */
import React from "react";
import { BattleParticipantUI, WX_THEME, STATUS_ICON } from "./types";

export function CombatantCard({ p, isEnemy, isAttacking, isHit }: {
  p: BattleParticipantUI; isEnemy?: boolean; isAttacking?: boolean; isHit?: boolean;
}) {
  const hpPercent = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
  const mpPercent = p.maxMp > 0 ? Math.max(0, Math.min(100, (p.currentMp / p.maxMp) * 100)) : 0;
  const hpColor = hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#f59e0b" : "#ef4444";
  const hpGlow = hpPercent > 50 ? "rgba(34,197,94,0.3)" : hpPercent > 25 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";
  const elem = p.dominantElement ? WX_THEME[p.dominantElement] : null;

  const avatarContent = p.avatarUrl ? (
    <img src={p.avatarUrl} alt={p.name}
      className="w-full h-full object-cover rounded-lg"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
  ) : (
    <span className="text-lg">
      {p.type === "character" ? "⚔️" : p.type === "pet" ? "🐾" : "👹"}
    </span>
  );

  return (
    <div className={`relative flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-300 ${
      p.isDefeated ? "opacity-30 grayscale" : ""
    }`}
      style={{
        background: isEnemy
          ? "linear-gradient(135deg, rgba(127,29,29,0.15) 0%, rgba(30,27,75,0.25) 100%)"
          : "linear-gradient(135deg, rgba(30,58,138,0.15) 0%, rgba(30,27,75,0.25) 100%)",
        border: `1px solid ${isEnemy ? "rgba(239,68,68,0.2)" : "rgba(96,165,250,0.2)"}`,
        minHeight: "72px",
        animation: isAttacking
          ? (isEnemy ? "attackLungeLeft 0.4s ease-out" : "attackLunge 0.4s ease-out")
          : isHit ? "hitFlash 0.3s ease-out" : p.isDefeated ? undefined : "breathe 4s ease-in-out infinite",
      }}>
      {/* 頭像 */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            background: elem ? elem.bg : "rgba(99,102,241,0.1)",
            border: `1px solid ${elem ? elem.color + "30" : "rgba(99,102,241,0.2)"}`,
            boxShadow: elem ? `0 0 8px ${elem.glow}` : undefined,
          }}>
          {avatarContent}
        </div>
        {elem && (
          <span className="absolute -top-1 -right-1 text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: elem.bg, border: `1px solid ${elem.color}40` }}>
            {elem.icon}
          </span>
        )}
        {p.type === "pet" && (
          <span className="absolute -bottom-1 -left-1 text-[7px] px-0.5 rounded"
            style={{ background: "rgba(139,92,246,0.4)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
            寵
          </span>
        )}
      </div>

      {/* 名稱 + HP/MP */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`text-[10px] font-bold truncate ${isEnemy ? "text-red-300" : "text-cyan-300"}`}>
            {p.name}
          </span>
          <span className="text-[8px] px-1 py-0.5 rounded-full font-bold shrink-0"
            style={{
              background: isEnemy ? "rgba(239,68,68,0.15)" : "rgba(96,165,250,0.15)",
              color: isEnemy ? "#fca5a5" : "#93c5fd",
            }}>
            Lv.{p.level}
          </span>
          {p.isDefending && (
            <span className="text-[8px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold shrink-0">🛡️</span>
          )}
        </div>

        {/* HP 條 */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[7px] text-slate-500 w-3 font-bold">HP</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden relative"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.3)" }}>
            <div className="h-full rounded-full transition-all duration-700 relative"
              style={{
                width: `${hpPercent}%`, background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
                boxShadow: `0 0 6px ${hpGlow}`,
              }}>
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute top-0 h-[40%] w-[60%] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    animation: "hpShimmer 3s ease-in-out infinite",
                  }} />
              </div>
            </div>
            {hpPercent <= 25 && !p.isDefeated && (
              <div className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: "rgba(239,68,68,0.15)" }} />
            )}
          </div>
          <span className="text-[7px] text-slate-400 w-14 text-right font-mono tabular-nums shrink-0">
            {p.currentHp}/{p.maxHp}
          </span>
        </div>

        {/* MP 條 */}
        {p.maxMp > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-slate-500 w-3 font-bold">MP</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.2)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mpPercent}%`,
                  background: "linear-gradient(90deg, #6366f1cc, #818cf8)",
                  boxShadow: "0 0 4px rgba(99,102,241,0.3)",
                }} />
            </div>
            <span className="text-[7px] text-slate-500 w-14 text-right font-mono tabular-nums shrink-0">
              {p.currentMp}/{p.maxMp}
            </span>
          </div>
        )}

        {/* 狀態效果 */}
        {p.statusEffects.length > 0 && (
          <div className="flex gap-0.5 mt-0.5 flex-wrap">
            {p.statusEffects.slice(0, 4).map((eff, i) => {
              const info = STATUS_ICON[eff.type];
              return (
                <span key={i} className="text-[7px] px-0.5 py-0.5 rounded text-center"
                  title={`${info?.name ?? eff.type} (${eff.duration}回合)`}
                  style={{
                    background: `${info?.color ?? "#94a3b8"}15`,
                    border: `1px solid ${info?.color ?? "#94a3b8"}30`,
                    color: info?.color ?? "#94a3b8",
                  }}>
                  {info?.emoji ?? "❓"}{eff.duration}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
