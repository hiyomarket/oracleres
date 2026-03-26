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

export type CombatRoundData = {
  round: number;
  agentAtk: number;
  monsterAtk: number;
  agentHpAfter: number;
  monsterHpAfter: number;
  agentFirst: boolean;
  agentSkillName?: string;
  monsterSkillName?: string;
  agentDodged?: boolean;
  monsterDodged?: boolean;
  agentBlocked?: boolean;
  monsterBlocked?: boolean;
  agentHealAmount?: number;
  agentSkillType?: string;
  isCritical?: boolean;
  monsterIsCritical?: boolean;
  description?: string;
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

      {/* HP 狀態 */}
      <div className="flex gap-3 text-[9px] text-slate-500 border-t border-indigo-900/30 pt-0.5">
        <span className="text-cyan-500">{agentName.slice(0, 4)} HP: {round.agentHpAfter}</span>
        <span className="text-red-500">{monsterName.slice(0, 4)} HP: {round.monsterHpAfter}</span>
      </div>
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
