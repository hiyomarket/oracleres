/**
 * CombatWindow.tsx
 * 戰鬥彈出視窗：顯示詳細的回合制戰鬥過程
 * 在戰鬥事件觸發時彈出，顯示每回合的技能使用、閃避、格擋、暴擊等資訊
 */
import { useEffect, useRef, useState } from "react";

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
};

interface CombatWindowProps {
  data: CombatWindowData | null;
  onClose: () => void;
}

export function CombatWindow({ data, onClose }: CombatWindowProps) {
  const [visibleRounds, setVisibleRounds] = useState<CombatRoundData[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!data) {
      setVisibleRounds([]);
      setShowResult(false);
      setIsAnimating(false);
      return;
    }
    // 重置狀態
    setVisibleRounds([]);
    setShowResult(false);
    setIsAnimating(true);

    // 逐回合顯示（每 600ms 顯示一回合）
    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx < data.rounds.length) {
        setVisibleRounds(prev => [...prev, data.rounds[idx]]);
        idx++;
        // 自動滾動到底部
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      } else {
        // 所有回合顯示完畢，顯示結果
        if (timerRef.current) clearInterval(timerRef.current);
        setIsAnimating(false);
        setTimeout(() => setShowResult(true), 300);
      }
    }, 600);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data]);

  if (!data) return null;

  const agentHpPercent = data.rounds.length > 0
    ? Math.max(0, Math.min(100, (data.rounds[data.rounds.length - 1].agentHpAfter / data.agentMaxHp) * 100))
    : 100;
  const monsterHpPercent = data.rounds.length > 0
    ? Math.max(0, Math.min(100, (data.rounds[data.rounds.length - 1].monsterHpAfter / data.monsterMaxHp) * 100))
    : 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.4)" }}>

        {/* 標題列 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-900/50"
          style={{ background: "rgba(30,27,75,0.8)" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚔️</span>
            <div>
              <p className="text-white font-bold text-sm">{data.agentName} vs {data.monsterName}</p>
              {data.monsterRace && (
                <p className="text-purple-300 text-[10px]">{data.monsterRace}</p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>

        {/* HP 條 */}
        <div className="px-4 py-2 space-y-1.5 border-b border-indigo-900/30">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-[10px] w-14 shrink-0">{data.agentName}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${agentHpPercent}%`, background: agentHpPercent > 50 ? "#22c55e" : agentHpPercent > 25 ? "#f59e0b" : "#ef4444" }} />
            </div>
            <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(agentHpPercent)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-[10px] w-14 shrink-0">{data.monsterName}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${monsterHpPercent}%`, background: "#ef4444" }} />
            </div>
            <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(monsterHpPercent)}%</span>
          </div>
        </div>

        {/* 回合記錄 */}
        <div ref={scrollRef} className="overflow-y-auto max-h-64 px-3 py-2 space-y-1.5">
          {visibleRounds.map((r, i) => (
            <RoundCard key={i} round={r} monsterName={data.monsterName} index={i} />
          ))}
          {isAnimating && (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
              <span className="animate-pulse">⚔️</span>
              <span>戰鬥進行中…</span>
            </div>
          )}
        </div>

        {/* 結果 */}
        {showResult && (
          <div className={`px-4 py-3 border-t border-indigo-900/50 ${data.won ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg font-bold ${data.won ? 'text-green-400' : 'text-red-400'}`}>
                {data.won ? '🎉 戰鬥勝利！' : '💀 戰鬥失敗'}
              </span>
              {data.won && (
                <div className="flex gap-3 text-xs">
                  <span className="text-amber-300">+{data.expGained} EXP</span>
                  <span className="text-yellow-400">+{data.goldGained} 金</span>
                </div>
              )}
            </div>
            {(data.wuxingBoostDesc || data.raceBoostDesc) && (
              <div className="space-y-0.5 mb-2">
                {data.wuxingBoostDesc && <p className="text-yellow-400/80 text-[10px]">★ {data.wuxingBoostDesc}</p>}
                {data.raceBoostDesc && <p className="text-purple-400/80 text-[10px]">◆ {data.raceBoostDesc}</p>}
              </div>
            )}
            <button onClick={onClose}
              className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: data.won ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", color: data.won ? "#86efac" : "#fca5a5", border: `1px solid ${data.won ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}` }}>
              {data.won ? '繼續冒險' : '撤退休息'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundCard({ round, monsterName, index }: { round: CombatRoundData; monsterName: string; index: number }) {
  const isHeal = round.agentSkillType === "heal";
  const isCrit = round.isCritical;
  const monsterCrit = round.monsterIsCritical;

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
            <span className="text-cyan-400 shrink-0 w-8">旅人</span>
            {isHeal ? (
              <span className="text-green-400">{round.agentSkillName ?? "治癒"} 回復 +{round.agentHealAmount} HP</span>
            ) : round.monsterDodged ? (
              <span className="text-slate-500">{round.agentSkillName ?? "普攻"}（{monsterName}閃避）</span>
            ) : round.monsterBlocked ? (
              <span className="text-blue-400">{round.agentSkillName ?? "普攻"} 造成 {round.agentAtk} 傷害（被格擋）</span>
            ) : (
              <span className={isCrit ? "text-yellow-300 font-bold" : "text-cyan-300"}>
                {round.agentSkillName ?? "普攻"} 造成 {round.agentAtk} 傷害{isCrit ? "！" : ""}
              </span>
            )}
          </div>
          {/* 怪物行動 */}
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 shrink-0 w-8">{monsterName.slice(0, 4)}</span>
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
        <span className="text-cyan-500">旅人 HP: {round.agentHpAfter}</span>
        <span className="text-red-500">{monsterName.slice(0, 4)} HP: {round.monsterHpAfter}</span>
      </div>
    </div>
  );
}
