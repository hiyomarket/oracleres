/**
 * battle/CommandPanel.tsx — 指令面板（卡牌式）
 */
import React from "react";
import { BattleParticipantUI, COMMAND_CARDS } from "./types";
import { ItemPanel } from "./ItemPanel";

export function CommandPanel({
  character, showSkillPanel, showItemPanel, selectedCommand, selectedSkillId, selectedItemId,
  isSubmitting, turnTimer, timeLeft, battleId,
  onSelectCommand, onSelectSkill, onSelectItem, onCancelPanel, onSubmit,
}: {
  character?: BattleParticipantUI;
  showSkillPanel: boolean; showItemPanel: boolean;
  selectedCommand: string | null; selectedSkillId: string | null; selectedItemId: string | null;
  isSubmitting: boolean; turnTimer: number; timeLeft: number; battleId: string;
  onSelectCommand: (cmd: string) => void;
  onSelectSkill: (id: string) => void;
  onSelectItem: (id: string) => void;
  onCancelPanel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="px-3 py-2.5"
      style={{ background: "linear-gradient(180deg, rgba(15,13,46,0.6) 0%, rgba(12,10,29,0.9) 100%)" }}>

      {/* 技能選擇面板 */}
      {showSkillPanel && character && (
        <div className="mb-2 animate-fadeSlideIn">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-purple-300 font-bold tracking-wider">✨ 選擇技能</span>
            <button onClick={onCancelPanel}
              className="text-[10px] text-slate-500 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">
              ✕ 返回
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto">
            {character.skills.map(sk => {
              const onCooldown = (sk.currentCooldown ?? 0) > 0;
              const noMp = character.currentMp < sk.mpCost;
              const disabled = onCooldown || noMp;
              const selected = selectedSkillId === sk.id;
              return (
                <button key={sk.id}
                  onClick={() => !disabled && onSelectSkill(sk.id)}
                  disabled={disabled}
                  className={`relative rounded-xl px-2 py-2 text-left transition-all duration-200 overflow-hidden ${
                    selected ? "scale-[1.02]" : disabled ? "opacity-35" : "hover:scale-[1.02]"
                  }`}
                  style={{
                    background: selected
                      ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)"
                      : "linear-gradient(135deg, rgba(30,27,75,0.4) 0%, rgba(15,13,46,0.6) 100%)",
                    border: `1px solid ${selected ? "rgba(139,92,246,0.5)" : "rgba(99,102,241,0.15)"}`,
                  }}>
                  <p className="font-bold text-[10px] text-purple-200 truncate">{sk.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] text-indigo-400">MP {sk.mpCost}</span>
                    {onCooldown && <span className="text-[8px] text-red-400 font-bold">CD {sk.currentCooldown}</span>}
                    {noMp && !onCooldown && <span className="text-[8px] text-red-400">MP不足</span>}
                  </div>
                  {selected && <div className="absolute top-1 right-1.5 text-[8px] text-purple-300">✓</div>}
                </button>
              );
            })}
            {character.skills.length === 0 && (
              <p className="col-span-3 text-[10px] text-slate-600 text-center py-3">尚未裝備技能</p>
            )}
          </div>
        </div>
      )}

      {/* 道具選擇面板 */}
      {showItemPanel && character && (
        <div className="mb-2 animate-fadeSlideIn">
          <ItemPanel
            battleId={battleId}
            onSelect={onSelectItem}
            onCancel={onCancelPanel}
            selectedItemId={selectedItemId}
          />
        </div>
      )}

      {/* 指令卡牌列 */}
      {!showSkillPanel && !showItemPanel && (
        <div className="flex gap-1.5 mb-2">
          {COMMAND_CARDS.map(cmd => {
            const selected = selectedCommand === cmd.id;
            return (
              <button key={cmd.id}
                onClick={() => onSelectCommand(cmd.id)}
                disabled={isSubmitting || (character?.isDefeated ?? false)}
                className={`flex-1 relative flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 overflow-hidden ${
                  selected ? "scale-[1.05] z-10" : "hover:scale-[1.03]"
                }`}
                style={{
                  background: selected
                    ? `linear-gradient(180deg, ${cmd.glow}30 0%, ${cmd.glow}10 100%)`
                    : "linear-gradient(180deg, rgba(30,27,75,0.5) 0%, rgba(15,13,46,0.7) 100%)",
                  border: `1px solid ${selected ? cmd.glow + "60" : "rgba(99,102,241,0.15)"}`,
                  boxShadow: selected ? `0 0 16px ${cmd.glow}25, 0 4px 12px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
                  color: selected ? cmd.glow : "#64748b",
                }}>
                <span className="text-lg" style={{ filter: selected ? `drop-shadow(0 0 6px ${cmd.glow})` : undefined }}>
                  {cmd.icon}
                </span>
                <span className="tracking-wider">{cmd.label}</span>
                {selected && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${cmd.glow}, transparent)` }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 確認按鈕 */}
      <button onClick={onSubmit}
        disabled={!selectedCommand || isSubmitting}
        className="group relative w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100"
        style={{
          background: selectedCommand
            ? "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.2) 100%)"
            : "rgba(15,13,46,0.4)",
          border: `1px solid ${selectedCommand ? "rgba(139,92,246,0.4)" : "rgba(99,102,241,0.1)"}`,
          color: selectedCommand ? "#c7d2fe" : "#475569",
          boxShadow: selectedCommand ? "0 0 20px rgba(139,92,246,0.1)" : undefined,
        }}>
        <span className="relative z-10">
          {isSubmitting ? "⏳ 執行中…" : selectedCommand
            ? `⚔️ 確認 ${COMMAND_CARDS.find(c => c.id === selectedCommand)?.label ?? ""}${turnTimer > 0 && timeLeft > 0 ? ` (${timeLeft}s)` : ""}`
            : `選擇指令${turnTimer > 0 && timeLeft > 0 ? ` (${timeLeft}s)` : ""}`}
        </span>
        {selectedCommand && (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-indigo-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        )}
      </button>
    </div>
  );
}
