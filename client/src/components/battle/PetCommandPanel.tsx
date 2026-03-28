/**
 * battle/PetCommandPanel.tsx — 寵物獨立指令面板（增強版）
 * 直接顯示寵物技能列表 + 目標選擇，不需要額外展開
 */
import React from "react";
import { BattleParticipantUI } from "./types";

export function PetCommandPanel({
  pet,
  enemies,
  petCommand,
  petSkillId,
  petTargetId,
  showPetSkillPanel,
  onSetPetCommand,
  onSetPetSkillId,
  onSetPetTargetId,
  onSetShowPetSkillPanel,
}: {
  pet: BattleParticipantUI;
  enemies: BattleParticipantUI[];
  petCommand: string | null;
  petSkillId: string | null;
  petTargetId: number | null;
  showPetSkillPanel: boolean;
  onSetPetCommand: (cmd: string | null) => void;
  onSetPetSkillId: (id: string | null) => void;
  onSetPetTargetId: (id: number | null) => void;
  onSetShowPetSkillPanel: (show: boolean) => void;
}) {
  const aliveEnemies = enemies.filter(e => !e.isDefeated);

  return (
    <div className="px-3 py-2 border-t"
      style={{ borderColor: "rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.04)" }}>
      {/* 標題列 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold text-purple-400 tracking-wider">🐾 {pet.name} 的指令</span>
        <span className="text-[8px] px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>
          HP {pet.currentHp}/{pet.maxHp} | MP {pet.currentMp}/{pet.maxMp}
        </span>
        {petCommand && (
          <span className="text-[8px] px-1.5 py-0.5 rounded-full ml-auto"
            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
            {petCommand === "attack" ? "⚔️ 普攻" : petCommand === "skill" ? `✨ ${pet.skills.find(s => s.id === petSkillId)?.name ?? "技能"}` : petCommand === "defend" ? "🛡️ 防御" : petCommand}
          </span>
        )}
        {!petCommand && (
          <span className="text-[8px] text-slate-600 ml-auto">（未選擇 → 自動 AI）</span>
        )}
      </div>

      {/* 技能展開面板 */}
      {showPetSkillPanel && pet.skills.length > 0 ? (
        <div className="mb-2 animate-fadeSlideIn">
          <div className="grid grid-cols-3 gap-1.5 max-h-[100px] overflow-y-auto">
            {pet.skills.map(sk => {
              const cd = (sk.currentCooldown ?? 0) > 0;
              const noMp = pet.currentMp < sk.mpCost;
              const disabled = cd || noMp;
              const selected = petSkillId === sk.id;
              return (
                <button key={sk.id}
                  disabled={disabled}
                  onClick={() => {
                    onSetPetSkillId(sk.id);
                    onSetPetCommand("skill");
                    onSetShowPetSkillPanel(false);
                  }}
                  className={`relative rounded-xl px-2 py-1.5 text-left transition-all duration-200 ${
                    selected ? "scale-[1.02]" : disabled ? "opacity-30" : "hover:scale-[1.02]"
                  }`}
                  style={{
                    background: selected
                      ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)"
                      : "linear-gradient(135deg, rgba(30,27,75,0.4) 0%, rgba(15,13,46,0.6) 100%)",
                    border: `1px solid ${selected ? "rgba(139,92,246,0.5)" : "rgba(99,102,241,0.15)"}`,
                  }}>
                  <p className="font-bold text-[9px] text-purple-200 truncate">{sk.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[7px] text-indigo-400">MP {sk.mpCost}</span>
                    {cd && <span className="text-[7px] text-red-400 font-bold">CD{sk.currentCooldown}</span>}
                    {noMp && !cd && <span className="text-[7px] text-red-400">MP不足</span>}
                  </div>
                  {selected && <div className="absolute top-0.5 right-1 text-[7px] text-purple-300">✓</div>}
                </button>
              );
            })}
          </div>
          <button onClick={() => onSetShowPetSkillPanel(false)}
            className="text-[8px] text-slate-500 mt-1.5 hover:text-white transition-colors">
            ✕ 返回
          </button>
        </div>
      ) : (
        /* 指令按鈕列 */
        <div className="flex gap-1.5 mb-2">
          <button onClick={() => { onSetPetCommand("attack"); onSetPetSkillId(null); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
            style={{
              background: petCommand === "attack" ? "rgba(239,68,68,0.2)" : "rgba(30,27,75,0.4)",
              border: `1px solid ${petCommand === "attack" ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.15)"}`,
              color: petCommand === "attack" ? "#fca5a5" : "#64748b",
            }}>
            ⚔️ 攻擊
          </button>
          {pet.skills.length > 0 && (
            <button onClick={() => onSetShowPetSkillPanel(true)}
              className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
              style={{
                background: petCommand === "skill" ? "rgba(139,92,246,0.2)" : "rgba(30,27,75,0.4)",
                border: `1px solid ${petCommand === "skill" ? "rgba(139,92,246,0.4)" : "rgba(99,102,241,0.15)"}`,
                color: petCommand === "skill" ? "#c4b5fd" : "#64748b",
              }}>
              ✨ 技能{petSkillId ? " ✓" : ""}
            </button>
          )}
          <button onClick={() => { onSetPetCommand("defend"); onSetPetSkillId(null); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all"
            style={{
              background: petCommand === "defend" ? "rgba(59,130,246,0.2)" : "rgba(30,27,75,0.4)",
              border: `1px solid ${petCommand === "defend" ? "rgba(59,130,246,0.4)" : "rgba(99,102,241,0.15)"}`,
              color: petCommand === "defend" ? "#93c5fd" : "#64748b",
            }}>
            🛡️ 防御
          </button>
          {petCommand && (
            <button onClick={() => { onSetPetCommand(null); onSetPetSkillId(null); }}
              className="px-2 py-1.5 rounded-lg text-[9px] text-slate-500 transition-all hover:text-white"
              style={{ background: "rgba(30,27,75,0.4)", border: "1px solid rgba(99,102,241,0.1)" }}>
              AI
            </button>
          )}
        </div>
      )}

      {/* 寵物目標選擇（多敵人時顯示） */}
      {aliveEnemies.length > 1 && (
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[8px] text-slate-500">目標:</span>
          {aliveEnemies.map(e => (
            <button key={e.id}
              onClick={() => onSetPetTargetId(petTargetId === e.id ? null : e.id)}
              className="text-[8px] px-1.5 py-0.5 rounded-full transition-all"
              style={{
                background: petTargetId === e.id ? "rgba(239,68,68,0.2)" : "rgba(30,27,75,0.4)",
                border: `1px solid ${petTargetId === e.id ? "rgba(239,68,68,0.4)" : "rgba(99,102,241,0.15)"}`,
                color: petTargetId === e.id ? "#fca5a5" : "#64748b",
              }}>
              {e.name}
            </button>
          ))}
          {petTargetId && (
            <span className="text-[7px] text-purple-400/60">
              🎯 {aliveEnemies.find(e => e.id === petTargetId)?.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
