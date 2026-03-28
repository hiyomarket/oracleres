/**
 * battle/ActionPreview.tsx — 本回合行動預覽
 */
import React from "react";
import { BattleParticipantUI } from "./types";

export function ActionPreview({
  character, pet, enemies,
  selectedCommand, selectedSkillId, selectedItemId, selectedTargetId,
  petCommand, petSkillId, petTargetId,
}: {
  character?: BattleParticipantUI;
  pet?: BattleParticipantUI;
  enemies: BattleParticipantUI[];
  selectedCommand: string | null;
  selectedSkillId: string | null;
  selectedItemId: string | null;
  selectedTargetId: number | null;
  petCommand: string | null;
  petSkillId: string | null;
  petTargetId: number | null;
}) {
  if (!selectedCommand && !petCommand) return null;

  return (
    <div className="px-3 py-1.5 border-t"
      style={{ borderColor: "rgba(99,102,241,0.15)", background: "rgba(15,13,46,0.4)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[9px] font-bold text-indigo-400 tracking-wider">📋 本回合行動預覽</span>
        {selectedCommand && character && !character.isDefeated && (
          <span className="text-[8px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
            👤 {character.name}：
            {selectedCommand === "attack" ? "普通攻擊" :
             selectedCommand === "skill" && selectedSkillId ? `技能 ${character.skills.find(s => s.id === selectedSkillId)?.name ?? selectedSkillId}` :
             selectedCommand === "skill" ? "技能（未選）" :
             selectedCommand === "defend" ? "防禦" :
             selectedCommand === "item" && selectedItemId ? `道具 ${selectedItemId}` :
             selectedCommand === "item" ? "道具（未選）" :
             selectedCommand === "flee" ? "逃跑" : selectedCommand}
            {selectedTargetId ? ` → ${enemies.find(e => e.id === selectedTargetId)?.name ?? "指定目標"}` : " → 自動目標"}
          </span>
        )}
        {petCommand && pet && !pet.isDefeated && (
          <span className="text-[8px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
            🐾 {pet.name}：
            {petCommand === "attack" ? "普通攻擊" :
             petCommand === "skill" && petSkillId ? `技能 ${pet.skills.find(s => s.id === petSkillId)?.name ?? petSkillId}` :
             petCommand === "skill" ? "技能（未選）" :
             petCommand === "defend" ? "防禦" : petCommand}
            {petTargetId ? ` → ${enemies.find(e => e.id === petTargetId)?.name ?? "指定目標"}` : " → 自動目標"}
          </span>
        )}
      </div>
    </div>
  );
}
