/**
 * BattleWindow.tsx — GD-020 玩家模式回合制戰鬥視窗
 *
 * 功能：
 * 1. 人寵雙行動單位 HP/MP 面板
 * 2. 先手順序視覺化
 * 3. 指令選擇面板（攻擊/技能/防禦/道具/逃跑）
 * 4. 回合日誌動畫
 * 5. 戰鬥結算
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── 類型定義 ───

interface BattleParticipantUI {
  id: number;
  type: "character" | "pet" | "monster";
  side: "ally" | "enemy";
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  maxMp: number;
  currentMp: number;
  attack: number;
  defense: number;
  speed: number;
  dominantElement?: string;
  isDefeated: boolean;
  isDefending: boolean;
  statusEffects: Array<{ type: string; duration: number; value: number }>;
  skills: Array<{
    id: string;
    name: string;
    mpCost: number;
    cooldown: number;
    currentCooldown: number;
  }>;
}

interface BattleLogUI {
  round: number;
  actorId: number;
  actorName?: string;
  logType: string;
  targetId?: number;
  targetName?: string;
  value: number;
  isCritical: boolean;
  skillName?: string;
  elementBoostDesc?: string;
  statusEffectDesc?: string;
  message: string;
}

interface BattleWindowProps {
  battleId: string;
  onClose: () => void;
  onBattleEnd?: (result: "win" | "lose" | "flee") => void;
}

// ─── 五行配色 ───
const WX_COLOR: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};
const STATUS_EMOJI: Record<string, string> = {
  poison: "🟢", burn: "🔥", freeze: "🧊", stun: "💫", petrify: "🪨", confuse: "🌀", forget: "💭", sleep: "😴",
};
const STATUS_NAME: Record<string, string> = {
  poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "眩暈", petrify: "石化", confuse: "混亂", forget: "遺忘", sleep: "昏睡",
};

// ─── 指令類型 ───
const COMMANDS = [
  { id: "attack" as const, icon: "⚔️", label: "攻擊", color: "#ef4444" },
  { id: "skill" as const, icon: "✨", label: "技能", color: "#8b5cf6" },
  { id: "defend" as const, icon: "🛡️", label: "防禦", color: "#3b82f6" },
  { id: "item" as const, icon: "🎒", label: "道具", color: "#22c55e" },
  { id: "flee" as const, icon: "🏃", label: "逃跑", color: "#f59e0b" },
];

export function BattleWindow({ battleId, onClose, onBattleEnd }: BattleWindowProps) {
  const [participants, setParticipants] = useState<BattleParticipantUI[]>([]);
  const [logs, setLogs] = useState<BattleLogUI[]>([]);
  const [round, setRound] = useState(0);
  const [battleState, setBattleState] = useState<string>("waiting");
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentGlow, setCurrentGlow] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [rewards, setRewards] = useState<{ expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // ─── 戰鬥動畫系統 ───
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: number; text: string; color: string; x: string; y: string;
    size: string; isCrit?: boolean; type: "damage" | "heal" | "skill" | "status" | "mp" | "miss";
  }>>([]);
  const floatIdRef = useRef(0);

  const addFloatingText = useCallback((opts: {
    text: string; color: string; x?: string; y?: string;
    size?: string; isCrit?: boolean; type: "damage" | "heal" | "skill" | "status" | "mp" | "miss";
  }) => {
    const id = ++floatIdRef.current;
    const xJitter = `${45 + Math.random() * 10}%`;
    setFloatingTexts(prev => [...prev, {
      id, text: opts.text, color: opts.color,
      x: opts.x ?? xJitter,
      y: opts.y ?? (opts.type === "damage" || opts.type === "miss" ? "25%" : opts.type === "heal" ? "65%" : "45%"),
      size: opts.size ?? (opts.isCrit ? "text-2xl" : "text-lg"),
      isCrit: opts.isCrit, type: opts.type,
    }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 1800);
  }, []);

  const allies = participants.filter(p => p.side === "ally");
  const enemies = participants.filter(p => p.side === "enemy");
  const character = allies.find(p => p.type === "character");
  const pet = allies.find(p => p.type === "pet");

  // 取得戰鬥狀態
  const battleQuery = trpc.gameBattle.getBattleState.useQuery(
    { battleId },
    { enabled: !!battleId, refetchOnWindowFocus: false }
  );

  // 提交指令
  const submitCmd = trpc.gameBattle.submitCommand.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setSelectedCommand(null);
      setSelectedSkillId(null);
      setSelectedItemId(null);
      setShowSkillPanel(false);
      setShowItemPanel(false);

      if (data.logs) {
        const newLogs = data.logs as BattleLogUI[];
        setLogs(prev => [...prev, ...newLogs]);
        // 動畫效果
        let delay = 0;
        for (const log of newLogs) {
          const d = delay;
          setTimeout(() => {
            const isAllyActor = allies.some(a => a.id === log.actorId);

            // 技能名稱飄字
            if (log.skillName && log.logType === "damage") {
              addFloatingText({
                text: `✨ ${log.skillName}`,
                color: "#c4b5fd",
                y: isAllyActor ? "35%" : "55%",
                size: "text-sm",
                type: "skill",
              });
            }

            // 傷害數字彈出
            if (log.logType === "damage" && log.value > 0) {
              addFloatingText({
                text: `-${log.value}`,
                color: log.isCritical ? "#fde047" : (isAllyActor ? "#f87171" : "#fb923c"),
                y: isAllyActor ? "22%" : "62%",
                isCrit: log.isCritical,
                type: "damage",
              });
              if (isAllyActor) {
                triggerGlow(log.isCritical ? "#fde047" : "#8b5cf6");
              } else {
                triggerShake();
              }
            }

            // MISS
            if (log.logType === "damage" && log.value === 0) {
              addFloatingText({
                text: "MISS",
                color: "#94a3b8",
                y: isAllyActor ? "22%" : "62%",
                size: "text-sm",
                type: "miss",
              });
            }

            // 治療數字
            if (log.logType === "heal" && log.value > 0) {
              addFloatingText({
                text: `+${log.value}`,
                color: "#4ade80",
                y: isAllyActor ? "62%" : "22%",
                type: "heal",
              });
            }

            // 狀態效果圖示
            if (log.statusEffectDesc) {
              const statusType = log.statusEffectDesc.toLowerCase();
              const emoji = STATUS_EMOJI[statusType] ?? "✨";
              const name = STATUS_NAME[statusType] ?? log.statusEffectDesc;
              addFloatingText({
                text: `${emoji} ${name}`,
                color: "#e879f9",
                y: "45%",
                size: "text-sm",
                type: "status",
              });
            }

            // DoT 傷害
            if (log.logType === "status_tick" && log.value > 0) {
              const emoji = STATUS_EMOJI[log.message?.includes("中毒") ? "poison" : log.message?.includes("灶燒") ? "burn" : "poison"] ?? "💠";
              addFloatingText({
                text: `${emoji} -${log.value}`,
                color: "#c084fc",
                y: isAllyActor ? "62%" : "22%",
                size: "text-sm",
                type: "status",
              });
            }
          }, d);
          delay += 300;
        }
      }

      if (data.participants) {
        setParticipants(data.participants as unknown as BattleParticipantUI[]);
      }

      setRound(data.round);

      if (data.state === "ended") {
        setBattleState("ended");
        setBattleResult(data.result ?? null);
        if ((data as any).rewards) setRewards((data as any).rewards);
        onBattleEnd?.(data.result as any);
      }

      setTimeout(() => {
        if (logScrollRef.current) {
          logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(`戰鬥指令失敗：${err.message}`);
    },
  });

  // 初始化戰鬥數據
  useEffect(() => {
    if (battleQuery.data) {
      const d = battleQuery.data;
      setParticipants(d.participants as BattleParticipantUI[]);
      setLogs(d.logs as BattleLogUI[]);
      setRound(d.battle.currentRound);
      setBattleState(d.battle.state);
      if (d.battle.result) setBattleResult(d.battle.result);
    }
  }, [battleQuery.data]);

  const triggerGlow = useCallback((color: string) => {
    setCurrentGlow(color);
    setTimeout(() => setCurrentGlow(null), 600);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  // 提交回合指令
  const handleSubmitTurn = () => {
    if (!selectedCommand || isSubmitting) return;
    setIsSubmitting(true);

    const commands: Array<{
      participantId: number;
      commandType: "attack" | "skill" | "defend" | "item" | "flee" | "surrender";
      targetId?: number;
      skillId?: string;
      itemId?: string;
    }> = [];

    // 角色指令
    if (character && !character.isDefeated) {
      const target = enemies.find(e => !e.isDefeated);
      commands.push({
        participantId: character.id,
        commandType: selectedCommand as any,
        targetId: target?.id,
        skillId: selectedCommand === "skill" ? selectedSkillId ?? undefined : undefined,
        itemId: selectedCommand === "item" ? selectedItemId ?? undefined : undefined,
      });
    }

    // 寵物自動 AI（不需要玩家手動操作）
    // 寵物的指令由後端 AI 決策樹自動處理

    submitCmd.mutate({ battleId, commands });
  };

  // 自動戰鬥（所有單位都用 AI）
  const handleAutoBattle = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    submitCmd.mutate({ battleId, commands: [] }); // 空指令 = 全部 AI
  };

  if (battleQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="text-white text-center">
          <div className="animate-spin text-4xl mb-2">⚔️</div>
          <p className="text-sm text-slate-400">載入戰鬥中…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* 光效 */}
      {currentGlow && (
        <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-[201]"
          style={{
            height: "120px",
            background: `radial-gradient(ellipse at bottom, ${currentGlow} 0%, transparent 70%)`,
            animation: "battleGlow 0.6s ease-out forwards",
          }} />
      )}

      {/* 飄字動畫層 */}
      <div className="fixed inset-0 pointer-events-none z-[202] overflow-hidden">
        {floatingTexts.map(ft => (
          <div key={ft.id}
            className={`absolute font-black ${ft.size} animate-floatUp`}
            style={{
              left: ft.x, top: ft.y,
              color: ft.color,
              textShadow: ft.isCrit
                ? "0 0 12px rgba(253,224,71,0.8), 0 0 24px rgba(253,224,71,0.4), 0 2px 4px rgba(0,0,0,0.8)"
                : `0 0 8px ${ft.color}66, 0 2px 4px rgba(0,0,0,0.8)`,
              transform: ft.isCrit ? "scale(1.3)" : undefined,
            }}>
            {ft.text}
          </div>
        ))}
      </div>

      <div className={`relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl ${isShaking ? "animate-battleShake" : ""}`}
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          border: "1px solid rgba(99,102,241,0.4)",
          maxHeight: "90vh",
        }}>

        {/* 頂部：回合數 + 模式 */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-indigo-900/50"
          style={{ background: "rgba(30,27,75,0.8)" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <span className="text-white font-bold text-sm">第 {round} 回合</span>
          </div>
          <div className="flex items-center gap-2">
            {battleState !== "ended" && (
              <button onClick={handleAutoBattle} disabled={isSubmitting}
                className="px-2 py-1 rounded text-[10px] font-bold transition-all hover:scale-105"
                style={{ background: "rgba(168,85,247,0.2)", color: "#c4b5fd", border: "1px solid rgba(168,85,247,0.3)" }}>
                🤖 自動
              </button>
            )}
            <button onClick={onClose}
              className="text-slate-400 hover:text-white text-lg leading-none transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* 敵方面板 */}
        <div className="px-3 py-2 border-b border-indigo-900/30">
          {enemies.map(e => (
            <ParticipantBar key={e.id} p={e} isEnemy />
          ))}
        </div>

        {/* 戰鬥日誌 */}
        <div ref={logScrollRef} className="overflow-y-auto px-3 py-2 space-y-1"
          style={{ maxHeight: "180px", minHeight: "100px" }}>
          {logs.length === 0 && (
            <p className="text-slate-500 text-xs text-center py-4">等待指令…</p>
          )}
          {logs.slice(-15).map((log, i) => (
            <LogEntry key={i} log={log} allies={allies} />
          ))}
        </div>

        {/* 我方面板 */}
        <div className="px-3 py-2 border-t border-indigo-900/30">
          {allies.map(a => (
            <ParticipantBar key={a.id} p={a} />
          ))}
        </div>

        {/* 指令面板 / 結算面板 */}
        {battleState === "ended" ? (
          <BattleResultPanel result={battleResult} round={round} onClose={onClose} rewards={rewards} />
        ) : (
          <div className="px-3 py-2 border-t border-indigo-900/50" style={{ background: "rgba(30,27,75,0.6)" }}>
            {/* 技能選擇面板 */}
            {showSkillPanel && character && (
              <div className="mb-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-purple-300 font-bold">選擇技能</span>
                  <button onClick={() => { setShowSkillPanel(false); setSelectedCommand(null); }}
                    className="text-[10px] text-slate-400 hover:text-white">✕ 取消</button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {character.skills.map(sk => {
                    const onCooldown = (sk.currentCooldown ?? 0) > 0;
                    const noMp = character.currentMp < sk.mpCost;
                    const disabled = onCooldown || noMp;
                    return (
                      <button key={sk.id}
                        onClick={() => {
                          if (!disabled) {
                            setSelectedSkillId(sk.id);
                            setSelectedCommand("skill");
                          }
                        }}
                        disabled={disabled}
                        className={`rounded-lg px-2 py-1.5 text-left text-[10px] transition-all ${
                          selectedSkillId === sk.id
                            ? "ring-1 ring-purple-400"
                            : disabled ? "opacity-40" : "hover:bg-purple-900/30"
                        }`}
                        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <p className="font-bold text-purple-200 truncate">{sk.name}</p>
                        <div className="flex gap-2 text-[9px] text-slate-400">
                          <span>MP {sk.mpCost}</span>
                          {onCooldown && <span className="text-red-400">CD {sk.currentCooldown}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {character.skills.length === 0 && (
                    <p className="col-span-2 text-[10px] text-slate-500 text-center py-2">尚未裝備技能</p>
                  )}
                </div>
              </div>
            )}

            {/* 道具選擇面板 */}
            {showItemPanel && character && (
              <ItemPanel
                battleId={battleId}
                onSelect={(itemId) => {
                  setSelectedItemId(itemId);
                  setSelectedCommand("item");
                }}
                onCancel={() => { setShowItemPanel(false); setSelectedCommand(null); }}
                selectedItemId={selectedItemId}
              />
            )}

            {/* 指令按鈕列 */}
            {!showSkillPanel && !showItemPanel && (
              <div className="flex gap-1.5 mb-2">
                {COMMANDS.map(cmd => (
                  <button key={cmd.id}
                    onClick={() => {
                      if (cmd.id === "skill") {
                        setShowSkillPanel(true);
                        setShowItemPanel(false);
                        setSelectedCommand("skill");
                      } else if (cmd.id === "item") {
                        setShowItemPanel(true);
                        setShowSkillPanel(false);
                        setSelectedCommand("item");
                      } else {
                        setSelectedCommand(cmd.id);
                        setShowSkillPanel(false);
                        setShowItemPanel(false);
                        setSelectedSkillId(null);
                        setSelectedItemId(null);
                      }
                    }}
                    disabled={isSubmitting || (character?.isDefeated ?? false)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 ${
                      selectedCommand === cmd.id ? "ring-1 ring-white/50" : ""
                    }`}
                    style={{
                      background: selectedCommand === cmd.id ? `${cmd.color}30` : "rgba(30,27,75,0.6)",
                      border: `1px solid ${selectedCommand === cmd.id ? cmd.color : "rgba(99,102,241,0.2)"}`,
                      color: selectedCommand === cmd.id ? cmd.color : "#94a3b8",
                    }}>
                    <span className="text-base">{cmd.icon}</span>
                    <span>{cmd.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 確認按鈕 */}
            <button
              onClick={handleSubmitTurn}
              disabled={!selectedCommand || isSubmitting}
              className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
              style={{
                background: selectedCommand ? "rgba(99,102,241,0.3)" : "rgba(30,27,75,0.4)",
                border: `1px solid ${selectedCommand ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.2)"}`,
                color: selectedCommand ? "#c7d2fe" : "#64748b",
              }}>
              {isSubmitting ? "⏳ 執行中…" : selectedCommand ? `確認 ${COMMANDS.find(c => c.id === selectedCommand)?.label ?? ""}` : "選擇指令"}
            </button>
          </div>
        )}
      </div>

      {/* 動畫 CSS */}
      <style>{`
        @keyframes battleGlow {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes battleShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(6px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .animate-battleShake {
          animation: battleShake 0.5s ease-out;
        }
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(0) scale(0.5); }
          15%  { opacity: 1; transform: translateY(-8px) scale(1.1); }
          30%  { transform: translateY(-16px) scale(1); }
          100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
        }
        .animate-floatUp {
          animation: floatUp 1.6s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes critPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ─── 參與者 HP/MP 條 ───
function ParticipantBar({ p, isEnemy }: { p: BattleParticipantUI; isEnemy?: boolean }) {
  const hpPercent = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
  const mpPercent = p.maxMp > 0 ? Math.max(0, Math.min(100, (p.currentMp / p.maxMp) * 100)) : 0;
  const hpColor = hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#f59e0b" : "#ef4444";
  const typeIcon = p.type === "character" ? "👤" : p.type === "pet" ? "🐾" : "👹";
  const elemEmoji = p.dominantElement ? (WX_EMOJI[p.dominantElement] ?? "") : "";

  return (
    <div className={`flex items-center gap-2 py-1 ${p.isDefeated ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-1 w-20 shrink-0">
        <span className="text-xs">{typeIcon}</span>
        <span className={`text-[10px] font-bold truncate ${isEnemy ? "text-red-400" : "text-cyan-400"}`}>
          {p.name}
        </span>
        {elemEmoji && <span className="text-[10px]">{elemEmoji}</span>}
      </div>
      <div className="flex-1 space-y-0.5">
        {/* HP */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-slate-500 w-5">HP</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${hpPercent}%`, background: hpColor }} />
          </div>
          <span className="text-[8px] text-slate-500 w-14 text-right">{p.currentHp}/{p.maxHp}</span>
        </div>
        {/* MP */}
        {p.maxMp > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-slate-500 w-5">MP</span>
            <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${mpPercent}%`, background: "#6366f1" }} />
            </div>
            <span className="text-[8px] text-slate-500 w-14 text-right">{p.currentMp}/{p.maxMp}</span>
          </div>
        )}
      </div>
      {/* 狀態效果 */}
      {p.statusEffects.length > 0 && (
        <div className="flex gap-0.5 shrink-0">
          {p.statusEffects.map((eff, i) => (
            <span key={i} className="text-[9px]" title={`${STATUS_NAME[eff.type] ?? eff.type} (${eff.duration}回合)`}>
              {STATUS_EMOJI[eff.type] ?? "❓"}
            </span>
          ))}
        </div>
      )}
      <span className="text-[8px] text-slate-600 shrink-0">Lv.{p.level}</span>
    </div>
  );
}

// ─── 戰鬥日誌條目 ───
function LogEntry({ log, allies }: { log: BattleLogUI; allies: BattleParticipantUI[] }) {
  const isAlly = allies.some(a => a.id === log.actorId);
  const color = log.logType === "damage"
    ? (isAlly ? (log.isCritical ? "text-yellow-300" : "text-cyan-300") : (log.isCritical ? "text-red-300" : "text-orange-400"))
    : log.logType === "heal" ? "text-green-400"
    : log.logType === "defend" ? "text-blue-400"
    : log.logType === "flee" ? "text-amber-400"
    : log.logType === "defeat" ? "text-red-500 font-bold"
    : log.logType === "status_tick" ? "text-purple-400"
    : "text-slate-400";

  return (
    <div className={`text-[10px] leading-relaxed ${color} animate-fadeIn`}>
      <span className="text-slate-600 mr-1">R{log.round}</span>
      {log.message}
      {log.elementBoostDesc && <span className="text-yellow-400/60 ml-1">({log.elementBoostDesc})</span>}
      {log.isCritical && <span className="text-yellow-300 ml-1">暴擊！</span>}
    </div>
  );
}

// ─── 道具選擇面板 ───
function ItemPanel({ battleId, onSelect, onCancel, selectedItemId }: {
  battleId: string;
  onSelect: (itemId: string) => void;
  onCancel: () => void;
  selectedItemId: string | null;
}) {
  const itemsQuery = trpc.gameBattle.getBattleItems.useQuery(
    { battleId },
    { staleTime: 30000 }
  );

  const RARITY_COLOR: Record<string, string> = {
    common: "#94a3b8", rare: "#60a5fa", epic: "#a78bfa", legendary: "#fbbf24",
  };
  const WX_ITEM_EMOJI: Record<string, string> = {
    wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
  };

  return (
    <div className="mb-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-green-300 font-bold">🎒 選擇道具</span>
        <button onClick={onCancel}
          className="text-[10px] text-slate-400 hover:text-white">✕ 取消</button>
      </div>
      {itemsQuery.isLoading && (
        <p className="text-[10px] text-slate-500 text-center py-2">載入中…</p>
      )}
      {itemsQuery.data && itemsQuery.data.length === 0 && (
        <p className="text-[10px] text-slate-500 text-center py-2">背包中沒有可用的消耗品</p>
      )}
      <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto">
        {(itemsQuery.data ?? []).map(item => {
          const rarityColor = RARITY_COLOR[item.rarity] ?? "#94a3b8";
          const wxEmoji = WX_ITEM_EMOJI[item.wuxing] ?? "";
          const effectDesc = item.useEffect?.description ?? item.effectDesc ?? "使用效果";
          return (
            <button key={item.itemId}
              onClick={() => onSelect(item.itemId)}
              className={`rounded-lg px-2 py-1.5 text-left text-[10px] transition-all ${
                selectedItemId === item.itemId
                  ? "ring-1 ring-green-400"
                  : "hover:bg-green-900/30"
              }`}
              style={{ background: "rgba(34,197,94,0.08)", border: `1px solid ${selectedItemId === item.itemId ? "rgba(34,197,94,0.5)" : "rgba(34,197,94,0.15)"}` }}>
              <div className="flex items-center gap-1">
                {wxEmoji && <span className="text-[9px]">{wxEmoji}</span>}
                <p className="font-bold truncate" style={{ color: rarityColor }}>{item.name}</p>
                <span className="text-[8px] text-slate-500 ml-auto">x{item.quantity}</span>
              </div>
              <p className="text-[8px] text-slate-400 truncate mt-0.5">{effectDesc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── 戰鬥結算面板 ───
function BattleResultPanel({ result, round, onClose, rewards }: {
  result: string | null; round: number; onClose: () => void;
  rewards?: { expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null;
}) {
  const won = result === "win";
  const fled = result === "flee";

  return (
    <div className={`px-4 py-3 border-t border-indigo-900/50 ${won ? "bg-green-900/20" : fled ? "bg-amber-900/20" : "bg-red-900/20"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-base font-bold ${won ? "text-green-400" : fled ? "text-amber-400" : "text-red-400"}`}>
          {won ? "🎉 戰鬥勝利！" : fled ? "🏃 成功逃跑" : "💀 戰鬥失敗"}
        </span>
        <span className="text-[10px] text-slate-500">共 {round} 回合</span>
      </div>

      {/* 獎勵詳情 */}
      {won && rewards && (rewards.expReward > 0 || rewards.goldReward > 0 || rewards.drops.length > 0) && (
        <div className="mb-3 p-2.5 rounded-lg bg-green-950/40 border border-green-800/30">
          <p className="text-[11px] font-bold text-green-300 mb-1.5">✨ 戰鬥獎勵</p>
          <div className="grid grid-cols-2 gap-1.5">
            {rewards.expReward > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⭐</span>
                <span className="text-xs text-slate-300">經驗</span>
                <span className="text-xs font-bold text-amber-300">+{rewards.expReward}</span>
              </div>
            )}
            {rewards.goldReward > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">💰</span>
                <span className="text-xs text-slate-300">金幣</span>
                <span className="text-xs font-bold text-yellow-300">+{rewards.goldReward}</span>
              </div>
            )}
            {rewards.petExpGained > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🐾</span>
                <span className="text-xs text-slate-300">寵物經驗</span>
                <span className="text-xs font-bold text-purple-300">+{rewards.petExpGained}</span>
              </div>
            )}
          </div>
          {rewards.drops.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-green-800/20">
              <p className="text-[10px] text-green-400 mb-1">🎁 掉落物品</p>
              <div className="flex flex-wrap gap-1">
                {rewards.drops.map((d, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-200 border border-green-700/30">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={onClose}
        className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: won ? "rgba(34,197,94,0.2)" : fled ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)",
          color: won ? "#86efac" : fled ? "#fcd34d" : "#fca5a5",
          border: `1px solid ${won ? "rgba(34,197,94,0.4)" : fled ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
        }}>
        {won ? "繼續冒險" : fled ? "安全撤退" : "撤退休息"}
      </button>
    </div>
  );
}
