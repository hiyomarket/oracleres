/**
 * CombatWindow.tsx
 * 戰鬥彈出視窗：顯示詳細的回合制戰鬥過程
 *
 * V40 新功能：
 * 1. 戰鬥結算卡片（EXP/金幣/掉落道具）
 * 2. 光效動畫（物攻金色/魔法紫色/技能五行色，被攻擊紅色晃動）
 * 3. 開關設定（localStorage 持久化）
 * 4. 動畫時間 ×2（每回合 1200ms）
 * 5. 戰鬥中鎖定（必須完成才能關閉）
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getItemInfo, RARITY_COLORS, RARITY_BG } from "../../../shared/itemNames";
import { trpc } from "../lib/trpc";

export type CombatRoundData = {
  round: number;
  agentAtk: number;
  monsterAtk: number;
  agentHpAfter: number;
  monsterHpAfter: number;
  agentFirst: boolean;
  agentSkillName?: string;
  monsterSkillName?: string;
  monsterSkillType?: string;
  agentDodged?: boolean;
  monsterDodged?: boolean;
  agentBlocked?: boolean;
  monsterBlocked?: boolean;
  agentHealAmount?: number;
  monsterHealAmount?: number;
  agentSkillType?: string;
  isCritical?: boolean;
  monsterIsCritical?: boolean;
  description?: string;
  // M3L: 附加效果資訊
  statusEffectsApplied?: Array<{ type: string; target: "agent" | "monster"; duration: number }>;
  dotDamageToAgent?: number;
  dotDamageToMonster?: number;
  agentStunned?: boolean;
  monsterStunned?: boolean;
};

export type CombatWindowData = {
  agentName: string;
  monsterName: string;
  monsterRace?: string;
  won: boolean;
  expGained: number;
  goldGained: number;
  hpLost: number;
  wuxingBoostDesc?: string;
  raceBoostDesc?: string;
  rounds: CombatRoundData[];
  agentMaxHp: number;
  monsterMaxHp: number;
  /** 戰鬥唯一識別碼（時間戳），用於防止 data 物件引用變化導致無限 setInterval */
  combatKey?: number;
  /** 戰鬥掉落道具列表 */
  lootItems?: string[];
  // M3L: 怪物技能和附加效果摘要
  monsterSkillsUsed?: string[];
  statusEffectsSummary?: string[];
  // GD-019: 寵物戰鬥資訊
  petInfo?: {
    petId: number;
    petName: string;
    petLevel: number;
    petExpGained: number;
    petLeveledUp: boolean;
    petNewLevel?: number;
    skillsUsed: string[];
    destinySkillUsageBumped: string[];
  };
  monsterLevel?: number;
  captureChance?: {
    monsterHpPercent: number;
    captureRate: number;
    petCatalogId?: number;
    petCatalogName?: string;
    monsterCurrentHp?: number;
    monsterMaxHp?: number;
    monsterLevel?: number;
  };
};

interface CombatWindowProps {
  data: CombatWindowData | null;
  onClose: () => void;
  /** 戰鬥視窗是否啟用（由設定控制） */
  enabled?: boolean;
}

// ─── 五行技能顏色對應 ───
const WUXING_GLOW: Record<string, string> = {
  wood:   "rgba(34,197,94,0.7)",
  fire:   "rgba(239,68,68,0.7)",
  earth:  "rgba(234,179,8,0.7)",
  metal:  "rgba(209,213,219,0.7)",
  water:  "rgba(59,130,246,0.7)",
};

/** 根據技能類型取得光效顏色 */
function getAttackGlow(skillType?: string): string {
  if (!skillType) return "rgba(251,191,36,0.7)"; // 物攻：金色
  if (skillType === "magic") return "rgba(168,85,247,0.7)"; // 魔法：紫色
  if (skillType === "heal") return "rgba(34,197,94,0.7)"; // 治癒：綠色
  if (WUXING_GLOW[skillType]) return WUXING_GLOW[skillType]; // 五行技能
  return "rgba(251,191,36,0.7)"; // 預設：金色
}

export function CombatWindow({ data, onClose, enabled = true }: CombatWindowProps) {
  const [visibleRounds, setVisibleRounds] = useState<CombatRoundData[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentGlow, setCurrentGlow] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCombatKeyRef = useRef<number | string | null>(null);

  // 每回合間隔：1200ms（原 600ms × 2）
  const ROUND_INTERVAL_MS = 1200;

  const triggerGlow = useCallback((color: string) => {
    setCurrentGlow(color);
    setTimeout(() => setCurrentGlow(null), 600);
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  }, []);

  useEffect(() => {
    if (!data) {
      setVisibleRounds([]);
      setShowResult(false);
      setIsAnimating(false);
      lastCombatKeyRef.current = null;
      return;
    }

    const currentKey = data.combatKey ?? `${data.agentName}-${data.monsterName}-${data.rounds.length}-${data.expGained}`;
    if (lastCombatKeyRef.current === currentKey) return;
    lastCombatKeyRef.current = currentKey;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setVisibleRounds([]);
    setShowResult(false);
    setIsAnimating(true);

    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx < data.rounds.length) {
        const round = data.rounds[idx];
        setVisibleRounds(prev => [...prev, round]);

        // 光效：玩家攻擊
        if (round.agentAtk > 0 && !round.monsterDodged) {
          triggerGlow(getAttackGlow(round.agentSkillType));
        }
        // 晃動：玩家被攻擊
        if (round.monsterAtk > 0 && !round.agentDodged && !round.agentBlocked) {
          setTimeout(() => triggerShake(), 300);
        }

        idx++;
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setIsAnimating(false);
        setTimeout(() => setShowResult(true), 300);
      }
    }, ROUND_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [data, triggerGlow, triggerShake]);

  if (!data) return null;
  if (!enabled) return null;

  const agentHpPercent = data.rounds.length > 0
    ? Math.max(0, Math.min(100, (data.rounds[data.rounds.length - 1].agentHpAfter / data.agentMaxHp) * 100))
    : 100;
  const monsterHpPercent = data.rounds.length > 0
    ? Math.max(0, Math.min(100, (data.rounds[data.rounds.length - 1].monsterHpAfter / data.monsterMaxHp) * 100))
    : 100;

  const displayAgentName = data.agentName || "旅人";

  // 戰鬥中可以強制退出（跳過動畫）
  const handleClose = () => {
    if (isAnimating) {
      // 強制結束動畫
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsAnimating(false);
      setVisibleRounds(data?.rounds ?? []);
      setShowResult(true);
      return;
    }
    onClose();
  };

  // 強制退出戰鬥（直接關閉視窗，切回盾牌模式）
  const handleForceExit = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnimating(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* 底部光效 */}
      {currentGlow && (
        <div
          className="fixed bottom-0 left-0 right-0 pointer-events-none z-[201]"
          style={{
            height: "120px",
            background: `radial-gradient(ellipse at bottom, ${currentGlow} 0%, transparent 70%)`,
            animation: "combatGlow 0.6s ease-out forwards",
          }}
        />
      )}

      <div
        className={`relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl transition-transform ${isShaking ? "animate-combatShake" : ""}`}
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          border: isShaking ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(99,102,241,0.4)",
          boxShadow: isShaking ? "0 0 20px rgba(239,68,68,0.4)" : undefined,
        }}
      >
        {/* 被攻擊紅色閃光 */}
        {isShaking && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ background: "rgba(239,68,68,0.15)", animation: "combatRedFlash 0.5s ease-out forwards" }}
          />
        )}

        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-900/50"
          style={{ background: "rgba(30,27,75,0.8)" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <div>
              <p className="text-white font-bold text-sm">{displayAgentName} vs {data.monsterName}</p>
              {data.monsterRace && (
                <p className="text-purple-300 text-[10px]">{data.monsterRace}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAnimating && (
              <button
                onClick={handleForceExit}
                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                style={{ background: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
                title="立即退出戰鬥畫面"
              >
                🛡️ 退出戰鬥
              </button>
            )}
            <button
              onClick={handleClose}
              className={`text-lg leading-none transition-colors ${isAnimating ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-white"}`}
              title={isAnimating ? "跳過動畫查看結果" : "關閉"}
            >
              {isAnimating ? "⏩" : "✕"}
            </button>
          </div>
        </div>

        {/* HP 條 */}
        <div className="px-4 py-2 space-y-1.5 border-b border-indigo-900/30">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-[10px] w-14 shrink-0 truncate">{displayAgentName}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${agentHpPercent}%`, background: agentHpPercent > 50 ? "#22c55e" : agentHpPercent > 25 ? "#f59e0b" : "#ef4444" }} />
            </div>
            <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(agentHpPercent)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-[10px] w-14 shrink-0 truncate">{data.monsterName}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${monsterHpPercent}%`, background: "#ef4444" }} />
            </div>
            <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(monsterHpPercent)}%</span>
          </div>
        </div>

        {/* 回合記錄 */}
        <div ref={scrollRef} className="overflow-y-auto max-h-56 px-3 py-2 space-y-1.5">
          {visibleRounds.map((r, i) => (
            <RoundCard key={i} round={r} agentName={displayAgentName} monsterName={data.monsterName} index={i} />
          ))}
          {isAnimating && (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
              <span className="animate-pulse">⚔️</span>
              <span>戰鬥進行中…</span>
            </div>
          )}
        </div>

        {/* 戰鬥結算卡片 */}
        {showResult && (
          <div className={`px-4 py-3 border-t border-indigo-900/50 ${data.won ? "bg-green-900/20" : "bg-red-900/20"}`}>
            {/* 勝負標題 */}
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-bold ${data.won ? "text-green-400" : "text-red-400"}`}>
                {data.won ? "🎉 戰鬥勝利！" : "💀 戰鬥失敗"}
              </span>
            </div>

            {/* 結算數值 */}
            {data.won && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>
                  <p className="text-[10px] text-amber-400/70 mb-0.5">經驗值</p>
                  <p className="text-amber-300 font-bold text-sm">+{data.expGained} EXP</p>
                </div>
                <div className="rounded-lg px-3 py-2 text-center"
                  style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
                  <p className="text-[10px] text-yellow-400/70 mb-0.5">金幣</p>
                  <p className="text-yellow-300 font-bold text-sm">+{data.goldGained} 金</p>
                </div>
              </div>
            )}

            {/* 掉落道具 */}
            {data.won && data.lootItems && data.lootItems.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-slate-400 mb-1">📦 掉落道具</p>
                <div className="flex flex-wrap gap-1">
                  {data.lootItems.map((itemId, i) => {
                    const info = getItemInfo(itemId);
                    return (
                      <div key={i}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] ${RARITY_BG[info.rarity]} ${RARITY_COLORS[info.rarity]}`}
                        style={{ border: `1px solid currentColor`, opacity: 0.9 }}>
                        <span>{info.emoji}</span>
                        <span>{info.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 五行/種族加成說明 */}
            {(data.wuxingBoostDesc || data.raceBoostDesc) && (
              <div className="space-y-0.5 mb-2">
                {data.wuxingBoostDesc && <p className="text-yellow-400/80 text-[10px]">★ {data.wuxingBoostDesc}</p>}
                {data.raceBoostDesc && <p className="text-purple-400/80 text-[10px]">◆ {data.raceBoostDesc}</p>}
              </div>
            )}

            {/* GD-019: 寵物戰鬥資訊 */}
            {data.petInfo && (
              <div className="mb-2 rounded-lg p-2" style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p className="text-[10px] text-purple-300 font-bold mb-1">🐾 寵物戰報 — {data.petInfo.petName}</p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="text-purple-200">Lv.{data.petInfo.petLevel}</span>
                  {data.petInfo.petExpGained > 0 && (
                    <span className="text-amber-300">+{data.petInfo.petExpGained} EXP</span>
                  )}
                  {data.petInfo.petLeveledUp && data.petInfo.petNewLevel && (
                    <span className="text-yellow-300 font-bold animate-pulse">↑ 升級 Lv.{data.petInfo.petNewLevel}!</span>
                  )}
                </div>
                {data.petInfo.skillsUsed.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {data.petInfo.skillsUsed.map((sk, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                )}
                {data.petInfo.destinySkillUsageBumped.length > 0 && (
                  <p className="text-[9px] text-purple-400/60 mt-1">
                    天命技能練度 +1：{data.petInfo.destinySkillUsageBumped.join("、")}
                  </p>
                )}
              </div>
            )}

            {/* GD-019: 重傷捕捉機會 + 捕捉按鈕 */}
            {data.captureChance && data.captureChance.captureRate > 0 && (
              <CapturePanel
                captureChance={data.captureChance}
                monsterMaxHp={data.monsterMaxHp}
                monsterLevel={data.monsterLevel ?? 1}
              />
            )}

            {/* M3M: 戰鬥回放摘要 */}
            {(() => {
              // 統計技能使用次數
              const agentSkills: Record<string, number> = {};
              const monsterSkills: Record<string, number> = {};
              const statusEffects: Record<string, number> = {};
              let totalDotToAgent = 0;
              let totalDotToMonster = 0;
              let agentStunCount = 0;
              let monsterStunCount = 0;
              let totalAgentHeal = 0;
              let totalMonsterHeal = 0;

              for (const r of data.rounds) {
                if (r.agentSkillName) agentSkills[r.agentSkillName] = (agentSkills[r.agentSkillName] || 0) + 1;
                if (r.monsterSkillName) monsterSkills[r.monsterSkillName] = (monsterSkills[r.monsterSkillName] || 0) + 1;
                if (r.statusEffectsApplied) {
                  for (const e of r.statusEffectsApplied) {
                    const label = `${e.type}→${e.target === "agent" ? "你" : data.monsterName}`;
                    statusEffects[label] = (statusEffects[label] || 0) + 1;
                  }
                }
                if (r.dotDamageToAgent) totalDotToAgent += r.dotDamageToAgent;
                if (r.dotDamageToMonster) totalDotToMonster += r.dotDamageToMonster;
                if (r.agentStunned) agentStunCount++;
                if (r.monsterStunned) monsterStunCount++;
                if (r.agentHealAmount) totalAgentHeal += r.agentHealAmount;
                if (r.monsterHealAmount) totalMonsterHeal += r.monsterHealAmount;
              }

              const hasSkillData = Object.keys(agentSkills).length > 0 || Object.keys(monsterSkills).length > 0;
              const hasStatusData = Object.keys(statusEffects).length > 0 || totalDotToAgent > 0 || totalDotToMonster > 0;

              if (!hasSkillData && !hasStatusData) return null;

              const STATUS_LABELS: Record<string, string> = {
                poison: "🟢 中毒", burn: "🔥 灼燒", freeze: "🧊 冰凍", stun: "💫 眩暈", slow: "🐌 減速",
              };

              return (
                <div className="mb-2 rounded-lg p-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <p className="text-[10px] text-indigo-300 font-bold mb-1.5">📊 戰鬥摘要</p>

                  {/* 技能使用統計 */}
                  {hasSkillData && (
                    <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                      <div>
                        <p className="text-[9px] text-cyan-400/70 mb-0.5">你的技能</p>
                        {Object.entries(agentSkills).map(([name, count]) => (
                          <p key={name} className="text-[10px] text-cyan-300/80">• {name} ×{count}</p>
                        ))}
                        {Object.keys(agentSkills).length === 0 && <p className="text-[10px] text-slate-500">無</p>}
                      </div>
                      <div>
                        <p className="text-[9px] text-red-400/70 mb-0.5">{data.monsterName}的技能</p>
                        {Object.entries(monsterSkills).map(([name, count]) => (
                          <p key={name} className="text-[10px] text-red-300/80">• {name} ×{count}</p>
                        ))}
                        {Object.keys(monsterSkills).length === 0 && <p className="text-[10px] text-slate-500">無</p>}
                      </div>
                    </div>
                  )}

                  {/* 附加效果統計 */}
                  {hasStatusData && (
                    <div className="border-t border-indigo-900/30 pt-1">
                      <p className="text-[9px] text-purple-400/70 mb-0.5">附加效果觸發</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(statusEffects).map(([label, count]) => {
                          const [type] = label.split("→");
                          return (
                            <span key={label} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}>
                              {STATUS_LABELS[type] || type}→{label.split("→")[1]} ×{count}
                            </span>
                          );
                        })}
                      </div>
                      {(totalDotToAgent > 0 || totalDotToMonster > 0 || agentStunCount > 0 || monsterStunCount > 0 || totalAgentHeal > 0 || totalMonsterHeal > 0) && (
                        <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-400">
                          {totalDotToAgent > 0 && <span>持續傷害(你)：{totalDotToAgent}</span>}
                          {totalDotToMonster > 0 && <span>持續傷害(怪)：{totalDotToMonster}</span>}
                          {agentStunCount > 0 && <span>你被控制：{agentStunCount}回合</span>}
                          {monsterStunCount > 0 && <span>怪被控制：{monsterStunCount}回合</span>}
                          {totalAgentHeal > 0 && <span>你治癒：{totalAgentHeal}</span>}
                          {totalMonsterHeal > 0 && <span>怪治癒：{totalMonsterHeal}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <button
              onClick={handleClose}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: data.won ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                color: data.won ? "#86efac" : "#fca5a5",
                border: `1px solid ${data.won ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              }}>
              {data.won ? "繼續冒險" : "撤退休息"}
            </button>
          </div>
        )}
      </div>

      {/* 全域動畫 CSS */}
      <style>{`
        @keyframes combatGlow {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes combatRedFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes combatShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(6px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .animate-combatShake {
          animation: combatShake 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

function RoundCard({ round, agentName, monsterName, index }: { round: CombatRoundData; agentName: string; monsterName: string; index: number }) {
  const isHeal = round.agentSkillType === "heal";
  const isCrit = round.isCritical;
  const monsterCrit = round.monsterIsCritical;

  // 技能顏色
  const skillGlowColor = getAttackGlow(round.agentSkillType);

  return (
    <div className="rounded-lg p-2 text-[11px] space-y-1 animate-fadeIn"
      style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(99,102,241,0.2)" }}>
      <div className="flex items-center gap-1.5">
        <span className="text-indigo-400/70 text-[10px]">第 {index + 1} 回合</span>
        {isHeal && <span className="text-green-400 bg-green-900/30 px-1 rounded text-[9px]">治癒</span>}
        {isCrit && <span className="text-yellow-300 bg-yellow-900/30 px-1 rounded text-[9px]">暴擊！</span>}
        {monsterCrit && <span className="text-red-400 bg-red-900/30 px-1 rounded text-[9px]">被暴擊</span>}
      </div>

      {round.description ? (
        <p className="text-slate-300 leading-relaxed">{round.description}</p>
      ) : (
        <div className="space-y-0.5">
          {/* 玩家行動 */}
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 shrink-0 w-10 truncate">{agentName.slice(0, 4)}</span>
            {isHeal ? (
              <span className="text-green-400">{round.agentSkillName ?? "治癒"} 回復 +{round.agentHealAmount} HP</span>
            ) : round.monsterDodged ? (
              <span className="text-slate-500">{round.agentSkillName ?? "普攻"}（{monsterName}閃避）</span>
            ) : round.monsterBlocked ? (
              <span className="text-blue-400">{round.agentSkillName ?? "普攻"} 造成 {round.agentAtk} 傷害（被格擋）</span>
            ) : (
              <span className={isCrit ? "font-bold" : ""} style={{ color: isCrit ? "#fde047" : skillGlowColor }}>
                {round.agentSkillName ?? "普攻"} 造成 {round.agentAtk} 傷害{isCrit ? "！" : ""}
              </span>
            )}
          </div>
          {/* 怪物行動 */}
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 shrink-0 w-10 truncate">{monsterName.slice(0, 4)}</span>
            {round.agentDodged ? (
              <span className="text-green-400">閃避了 {round.monsterSkillName ?? "攻擊"}</span>
            ) : round.agentBlocked ? (
              <span className="text-blue-400">格擋了 {round.monsterSkillName ?? "攻擊"}（傷害減半）</span>
            ) : (
              <span className={monsterCrit ? "text-red-300 font-bold" : "text-orange-400"}>
                {round.monsterSkillName ?? "攻擊"} 造成 {round.monsterAtk} 傷害{monsterCrit ? "！" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      {/* M3L: 怪物治癒顯示 */}
      {round.monsterSkillType === "heal" && round.monsterHealAmount ? (
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 shrink-0 w-10 truncate">{monsterName.slice(0, 4)}</span>
          <span className="text-green-400">{round.monsterSkillName ?? "治癒"} 回復 +{round.monsterHealAmount} HP</span>
        </div>
      ) : null}

      {/* M3L: 附加效果顯示 */}
      {round.statusEffectsApplied && round.statusEffectsApplied.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {round.statusEffectsApplied.map((eff, i) => {
            const colors: Record<string, string> = {
              poison: "bg-green-900/40 text-green-300",
              burn: "bg-orange-900/40 text-orange-300",
              freeze: "bg-cyan-900/40 text-cyan-300",
              stun: "bg-yellow-900/40 text-yellow-300",
              slow: "bg-purple-900/40 text-purple-300",
            };
            const names: Record<string, string> = { poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "眩暈", slow: "減速" };
            return (
              <span key={i} className={`px-1 rounded text-[9px] ${colors[eff.type] ?? "bg-slate-800 text-slate-400"}`}>
                {eff.target === "agent" ? agentName.slice(0, 2) : monsterName.slice(0, 2)} {names[eff.type] ?? eff.type} ({eff.duration}回合)
              </span>
            );
          })}
        </div>
      )}

      {/* M3L: DoT 傷害顯示 */}
      {(round.dotDamageToAgent || round.dotDamageToMonster) ? (
        <div className="text-[9px] text-slate-400 italic">
          {round.dotDamageToAgent ? <span className="text-orange-400">狀態異常傷害: -{round.dotDamageToAgent} HP</span> : null}
          {round.dotDamageToAgent && round.dotDamageToMonster ? " | " : ""}
          {round.dotDamageToMonster ? <span className="text-green-400">{monsterName.slice(0, 4)} 狀態傷害: -{round.dotDamageToMonster} HP</span> : null}
        </div>
      ) : null}

      {/* M3L: 眩暈顯示 */}
      {round.agentStunned && <span className="text-yellow-400 text-[9px]">⚡ 旅人眩暈中，無法行動！</span>}
      {round.monsterStunned && <span className="text-cyan-400 text-[9px]">❄️ {monsterName.slice(0, 4)} 眩暈中，無法行動！</span>}

      {/* HP 狀態 */}
      <div className="flex gap-3 text-[9px] text-slate-500 border-t border-indigo-900/30 pt-0.5">
        <span className="text-cyan-500">{agentName.slice(0, 4)} HP: {round.agentHpAfter}</span>
        <span className="text-red-500">{monsterName.slice(0, 4)} HP: {round.monsterHpAfter}</span>
      </div>
    </div>
  );
}

// ─── 捕捉面板 ───
function CapturePanel({ captureChance, monsterMaxHp, monsterLevel }: {
  captureChance: NonNullable<CombatWindowData["captureChance"]>;
  monsterMaxHp: number;
  monsterLevel: number;
}) {
  const [phase, setPhase] = useState<"idle" | "selecting" | "capturing" | "result">("idle");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [captureResult, setCaptureResult] = useState<any>(null);

  const captureItemsQuery = trpc.gamePet.getCaptureItems.useQuery(undefined, {
    enabled: phase === "selecting",
    staleTime: 10000,
  });

  const captureMutation = trpc.gamePet.capturePet.useMutation({
    onSuccess: (result) => {
      setCaptureResult(result);
      setPhase("result");
    },
    onError: (err) => {
      setCaptureResult({ success: false, message: err.message });
      setPhase("result");
    },
  });

  const handleCapture = () => {
    if (!selectedItemId || !captureChance.petCatalogId) return;
    setPhase("capturing");
    captureMutation.mutate({
      petCatalogId: captureChance.petCatalogId,
      monsterCurrentHp: captureChance.monsterCurrentHp ?? Math.floor(monsterMaxHp * captureChance.monsterHpPercent / 100),
      monsterMaxHp: captureChance.monsterMaxHp ?? monsterMaxHp,
      monsterLevel: captureChance.monsterLevel ?? monsterLevel,
      captureItemId: selectedItemId,
    });
  };

  const RARITY_GLOW: Record<string, string> = {
    common: "rgba(148,163,184,0.3)",
    rare: "rgba(96,165,250,0.3)",
    epic: "rgba(167,139,250,0.3)",
    legendary: "rgba(251,191,36,0.3)",
  };
  const RARITY_BORDER: Record<string, string> = {
    common: "rgba(148,163,184,0.5)",
    rare: "rgba(96,165,250,0.5)",
    epic: "rgba(167,139,250,0.5)",
    legendary: "rgba(251,191,36,0.5)",
  };
  const RARITY_TEXT: Record<string, string> = {
    common: "#94a3b8",
    rare: "#60a5fa",
    epic: "#a78bfa",
    legendary: "#fbbf24",
  };

  return (
    <div className="mb-2 rounded-lg overflow-hidden" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)" }}>
      {/* 捕捉機會提示 */}
      <div className="p-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base animate-bounce">✨</span>
          <p className="text-[11px] text-yellow-300 font-bold">重傷捕捉機會！</p>
        </div>
        <div className="text-[10px] text-yellow-200/80">
          <p>發現野生 <span className="font-bold text-yellow-300">{captureChance.petCatalogName || "神秘生物"}</span></p>
          <p>怪物 HP 剩餘 {captureChance.monsterHpPercent}% · 基礎捕捉率 {captureChance.captureRate}%</p>
        </div>
      </div>

      {/* 開始捕捉按鈕 */}
      {phase === "idle" && (
        <div className="px-2 pb-2">
          <button
            onClick={() => setPhase("selecting")}
            className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(234,179,8,0.25), rgba(251,191,36,0.15))",
              border: "1px solid rgba(234,179,8,0.5)",
              color: "#fde047",
              boxShadow: "0 0 20px rgba(234,179,8,0.15)",
            }}>
            🎯 嘗試捕捉
          </button>
        </div>
      )}

      {/* 捕捉球選擇 */}
      {phase === "selecting" && (
        <div className="px-2 pb-2 space-y-2">
          <p className="text-[10px] text-yellow-300/70 font-bold">選擇捕捉球：</p>
          {captureItemsQuery.isLoading && (
            <p className="text-[10px] text-slate-500 text-center py-2">載入中…</p>
          )}
          {captureItemsQuery.data && captureItemsQuery.data.length === 0 && (
            <div className="text-center py-2">
              <p className="text-[10px] text-red-400">背包中沒有捕捉球道具！</p>
              <p className="text-[9px] text-slate-500 mt-1">可在商店購買獸魂甕系列道具</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {(captureItemsQuery.data ?? []).map(item => (
              <button key={item.itemId}
                onClick={() => setSelectedItemId(item.itemId)}
                className={`rounded-lg px-2 py-1.5 text-left text-[10px] transition-all ${selectedItemId === item.itemId ? "ring-1 scale-[1.02]" : "hover:scale-[1.01]"}`}
                style={{
                  background: selectedItemId === item.itemId ? RARITY_GLOW[item.rarity] : "rgba(30,27,75,0.5)",
                  border: `1px solid ${selectedItemId === item.itemId ? RARITY_BORDER[item.rarity] : "rgba(99,102,241,0.15)"}`,
                  outlineColor: RARITY_BORDER[item.rarity],
                }}>
                <div className="flex items-center gap-1">
                  <span className="font-bold truncate" style={{ color: RARITY_TEXT[item.rarity] ?? "#94a3b8" }}>{item.name}</span>
                  <span className="text-[8px] text-slate-500 ml-auto shrink-0">x{item.quantity}</span>
                </div>
                <p className="text-[8px] text-slate-400 mt-0.5">倍率 ×{item.multiplier} · 捕捉率 ~{Math.round(captureChance.captureRate * item.multiplier)}%</p>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => { setPhase("idle"); setSelectedItemId(null); }}
              className="flex-1 py-1.5 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
              style={{ background: "rgba(30,27,75,0.4)", border: "1px solid rgba(99,102,241,0.2)" }}>
              取消
            </button>
            <button onClick={handleCapture}
              disabled={!selectedItemId}
              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
              style={{
                background: selectedItemId ? "linear-gradient(135deg, rgba(234,179,8,0.3), rgba(251,191,36,0.2))" : "rgba(30,27,75,0.4)",
                border: `1px solid ${selectedItemId ? "rgba(234,179,8,0.5)" : "rgba(99,102,241,0.2)"}`,
                color: selectedItemId ? "#fde047" : "#64748b",
              }}>
              確認捕捉
            </button>
          </div>
        </div>
      )}

      {/* 捕捉動畫 */}
      {phase === "capturing" && (
        <div className="px-2 pb-3 text-center">
          <div className="relative w-16 h-16 mx-auto mb-2">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(234,179,8,0.2)" }} />
            <div className="absolute inset-1 rounded-full animate-spin" style={{ background: "conic-gradient(from 0deg, rgba(234,179,8,0.6), transparent, rgba(234,179,8,0.6))", animationDuration: "1s" }} />
            <div className="absolute inset-3 rounded-full flex items-center justify-center" style={{ background: "rgba(30,27,75,0.8)" }}>
              <span className="text-2xl animate-bounce">🎯</span>
            </div>
          </div>
          <p className="text-[11px] text-yellow-300 font-bold animate-pulse">捕捉中…</p>
        </div>
      )}

      {/* 捕捉結果 */}
      {phase === "result" && captureResult && (
        <div className="px-2 pb-2">
          {captureResult.success ? (
            <div className="text-center space-y-1.5 py-2">
              <div className="text-3xl animate-bounce">🎉</div>
              <p className="text-[12px] text-green-300 font-bold">捕捉成功！</p>
              <p className="text-[10px] text-green-200/80">{captureResult.message}</p>
              {captureResult.tier && (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold" style={{
                  background: captureResult.tier === "S" ? "rgba(251,191,36,0.2)" : captureResult.tier === "A" ? "rgba(167,139,250,0.2)" : "rgba(96,165,250,0.2)",
                  color: captureResult.tier === "S" ? "#fde047" : captureResult.tier === "A" ? "#c4b5fd" : "#93c5fd",
                  border: `1px solid ${captureResult.tier === "S" ? "rgba(251,191,36,0.4)" : captureResult.tier === "A" ? "rgba(167,139,250,0.4)" : "rgba(96,165,250,0.4)"}`,
                }}>
                  檔位：{captureResult.tier}
                </span>
              )}
            </div>
          ) : (
            <div className="text-center space-y-1 py-2">
              <div className="text-2xl">💨</div>
              <p className="text-[11px] text-red-400 font-bold">捕捉失敗</p>
              <p className="text-[10px] text-red-300/70">{captureResult.message}</p>
            </div>
          )}
          <button onClick={() => { setPhase("idle"); setCaptureResult(null); setSelectedItemId(null); }}
            className="w-full mt-1 py-1.5 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors"
            style={{ background: "rgba(30,27,75,0.4)", border: "1px solid rgba(99,102,241,0.2)" }}>
            {captureResult.success ? "太好了！" : "再試一次"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 戰鬥視窗設定 Hook ───
export function useCombatWindowSettings() {
  const STORAGE_KEY = "combatWindowEnabled";
  const [enabled, setEnabledState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const setEnabled = (val: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(val));
    setEnabledState(val);
  };

  return { enabled, setEnabled };
}
