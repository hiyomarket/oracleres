/**
 * battle/VictoryPanel.tsx — 戰鬥結算面板（勝利/敗北/撤退）+ 傷害統計
 */
import React, { useState, useEffect, useMemo } from "react";
import { BattleParticipantUI, BattleLogUI } from "./types";

interface DamageStats {
  id: number;
  name: string;
  type: "character" | "pet" | "monster";
  side: "ally" | "enemy";
  avatarUrl?: string | null;
  totalDamage: number;
  totalHealing: number;
  totalDamageTaken: number;
  critCount: number;
  hitCount: number;
  maxSingleHit: number;
  killCount: number;
}

function computeStats(
  participants: BattleParticipantUI[],
  logs: BattleLogUI[]
): DamageStats[] {
  const map = new Map<number, DamageStats>();
  for (const p of participants) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      type: p.type,
      side: p.side,
      avatarUrl: p.avatarUrl,
      totalDamage: 0,
      totalHealing: 0,
      totalDamageTaken: 0,
      critCount: 0,
      hitCount: 0,
      maxSingleHit: 0,
      killCount: 0,
    });
  }
  for (const log of logs) {
    const actor = map.get(log.actorId);
    if (log.logType === "damage" && log.value > 0) {
      if (actor) {
        actor.totalDamage += log.value;
        actor.hitCount++;
        if (log.isCritical) actor.critCount++;
        if (log.value > actor.maxSingleHit) actor.maxSingleHit = log.value;
      }
      if (log.targetId) {
        const target = map.get(log.targetId);
        if (target) target.totalDamageTaken += log.value;
      }
    }
    if (log.logType === "heal" && log.value > 0) {
      if (actor) actor.totalHealing += log.value;
    }
    if (log.logType === "defeat") {
      if (actor) actor.killCount++;
    }
  }
  return Array.from(map.values());
}

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.2)" }}>
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})`, boxShadow: `0 0 6px ${color}40` }} />
    </div>
  );
}

function StatsTab({ participants, logs }: { participants: BattleParticipantUI[]; logs: BattleLogUI[] }) {
  const stats = useMemo(() => computeStats(participants, logs), [participants, logs]);
  const allyStats = stats.filter(s => s.side === "ally").sort((a, b) => b.totalDamage - a.totalDamage);
  const enemyStats = stats.filter(s => s.side === "enemy").sort((a, b) => b.totalDamage - a.totalDamage);
  const maxDmg = Math.max(...stats.map(s => s.totalDamage), 1);
  const maxHeal = Math.max(...stats.map(s => s.totalHealing), 1);

  const renderRow = (s: DamageStats) => {
    const critRate = s.hitCount > 0 ? Math.round((s.critCount / s.hitCount) * 100) : 0;
    const isAlly = s.side === "ally";
    return (
      <div key={s.id} className="rounded-lg p-2 mb-1.5"
        style={{
          background: isAlly
            ? "linear-gradient(135deg, rgba(30,58,138,0.12) 0%, rgba(30,27,75,0.2) 100%)"
            : "linear-gradient(135deg, rgba(127,29,29,0.12) 0%, rgba(30,27,75,0.2) 100%)",
          border: `1px solid ${isAlly ? "rgba(96,165,250,0.15)" : "rgba(239,68,68,0.15)"}`,
        }}>
        {/* Header: avatar + name */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center overflow-hidden shrink-0"
            style={{
              background: isAlly ? "rgba(96,165,250,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${isAlly ? "rgba(96,165,250,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>
            {s.avatarUrl ? (
              <img src={s.avatarUrl} alt="" className="w-full h-full object-cover rounded-md" />
            ) : (
              <span className="text-[10px]">{s.type === "character" ? "⚔️" : s.type === "pet" ? "🐾" : "👹"}</span>
            )}
          </div>
          <span className={`text-[10px] font-bold truncate ${isAlly ? "text-cyan-300" : "text-red-300"}`}>{s.name}</span>
        </div>

        {/* Damage bar */}
        <div className="mb-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px] text-slate-500">傷害輸出</span>
            <span className="text-[9px] font-bold text-amber-300 font-mono">{s.totalDamage.toLocaleString()}</span>
          </div>
          <StatBar value={s.totalDamage} max={maxDmg} color="#f59e0b" />
        </div>

        {/* Healing bar (only if > 0) */}
        {s.totalHealing > 0 && (
          <div className="mb-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] text-slate-500">治療量</span>
              <span className="text-[9px] font-bold text-emerald-300 font-mono">{s.totalHealing.toLocaleString()}</span>
            </div>
            <StatBar value={s.totalHealing} max={maxHeal} color="#22c55e" />
          </div>
        )}

        {/* Mini stats row */}
        <div className="flex gap-2 mt-1 flex-wrap">
          <span className="text-[8px] text-slate-500">承傷 <span className="text-red-400 font-bold">{s.totalDamageTaken.toLocaleString()}</span></span>
          <span className="text-[8px] text-slate-500">暴擊率 <span className="text-amber-400 font-bold">{critRate}%</span></span>
          <span className="text-[8px] text-slate-500">最高 <span className="text-purple-300 font-bold">{s.maxSingleHit.toLocaleString()}</span></span>
          {s.killCount > 0 && (
            <span className="text-[8px] text-slate-500">擊殺 <span className="text-rose-300 font-bold">{s.killCount}</span></span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-h-[35vh] overflow-y-auto px-1 space-y-2">
      {allyStats.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-cyan-400 mb-1 tracking-wider">我方</p>
          {allyStats.map(renderRow)}
        </div>
      )}
      {enemyStats.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-red-400 mb-1 tracking-wider">敵方</p>
          {enemyStats.map(renderRow)}
        </div>
      )}
    </div>
  );
}

export function VictoryPanel({ result, round, onClose, rewards, participants, logs }: {
  result: string | null; round: number; onClose: () => void;
  rewards?: { expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null;
  participants?: BattleParticipantUI[];
  logs?: BattleLogUI[];
}) {
  const won = result === "win";
  const fled = result === "flee";
  const lost = !won && !fled;
  const [visibleDrops, setVisibleDrops] = useState<number[]>([]);
  const [showContent, setShowContent] = useState(false);
  const [activeTab, setActiveTab] = useState<"result" | "stats">("result");
  const hasStats = participants && participants.length > 0 && logs && logs.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!won || !rewards?.drops.length) return;
    rewards.drops.forEach((_, i) => {
      setTimeout(() => {
        setVisibleDrops(prev => [...prev, i]);
      }, 300 + i * 200);
    });
  }, [won, rewards?.drops.length]);

  return (
    <div className="relative overflow-hidden max-h-[55vh] overflow-y-auto"
      style={{
        background: won
          ? "linear-gradient(180deg, rgba(21,128,61,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : fled ? "linear-gradient(180deg, rgba(146,64,14,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : "linear-gradient(180deg, rgba(127,29,29,0.2) 0%, rgba(12,10,29,0.95) 100%)",
      }}>
      {/* Top glow effect */}
      <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: won
            ? "radial-gradient(ellipse at top, rgba(251,191,36,0.15) 0%, transparent 70%)"
            : lost
            ? "radial-gradient(ellipse at top, rgba(239,68,68,0.2) 0%, transparent 70%)"
            : "radial-gradient(ellipse at top, rgba(245,158,11,0.1) 0%, transparent 70%)",
          animation: "victoryGlow 1s ease-out",
        }} />

      <div className="relative px-4 py-4">
        {/* Title */}
        <div className="text-center mb-2"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(-10px)",
            transition: "all 0.5s ease-out",
          }}>
          <p className={`text-2xl font-black mb-1 ${won ? "text-amber-300" : fled ? "text-amber-400" : "text-red-400"}`}
            style={{
              textShadow: won ? "0 0 20px rgba(251,191,36,0.5)" : fled ? "0 0 20px rgba(245,158,11,0.3)" : "0 0 20px rgba(239,68,68,0.5)",
              animation: "victoryGlow 0.8s ease-out",
            }}>
            {won ? "--- 勝利 ---" : fled ? "--- 撤退 ---" : "--- 敗北 ---"}
          </p>
          <p className="text-[10px] text-slate-500">
            共 {round} 回合 | {won ? "消滅所有敵人" : fled ? "安全撤退" : "我方全滅"}
          </p>
        </div>

        {/* Tab switcher */}
        {hasStats && (
          <div className="flex gap-1 mb-2 justify-center"
            style={{
              opacity: showContent ? 1 : 0,
              transition: "opacity 0.5s ease-out 0.15s",
            }}>
            <button onClick={() => setActiveTab("result")}
              className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${
                activeTab === "result"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              style={{
                background: activeTab === "result"
                  ? (won ? "rgba(34,197,94,0.2)" : fled ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)")
                  : "rgba(30,27,75,0.3)",
                border: `1px solid ${activeTab === "result"
                  ? (won ? "rgba(34,197,94,0.4)" : fled ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)")
                  : "rgba(51,65,85,0.3)"}`,
              }}>
              戰鬥結算
            </button>
            <button onClick={() => setActiveTab("stats")}
              className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${
                activeTab === "stats"
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
              style={{
                background: activeTab === "stats" ? "rgba(139,92,246,0.2)" : "rgba(30,27,75,0.3)",
                border: `1px solid ${activeTab === "stats" ? "rgba(139,92,246,0.4)" : "rgba(51,65,85,0.3)"}`,
              }}>
              傷害統計
            </button>
          </div>
        )}

        {/* Result tab */}
        {activeTab === "result" && (
          <>
            {/* Lose panel */}
            {lost && (
              <div className="rounded-xl p-3 mb-3"
                style={{
                  background: "linear-gradient(135deg, rgba(127,29,29,0.15) 0%, rgba(30,27,75,0.3) 100%)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.6s ease-out 0.2s",
                }}>
                <p className="text-[11px] font-bold text-red-300 mb-2 tracking-wider">戰鬥結算</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "rgba(239,68,68,0.08)" }}>
                    <span className="text-[10px] text-slate-400">存活回合數</span>
                    <span className="text-xs font-bold text-red-300">{round}</span>
                  </div>
                  {rewards && rewards.expReward > 0 && (
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "rgba(251,191,36,0.06)" }}>
                      <span className="text-[10px] text-slate-400">安慰經驗</span>
                      <span className="text-xs font-bold text-amber-400">+{Math.floor(rewards.expReward * 0.3)}</span>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 mt-2 text-center italic">
                  提升裝備強化等級，再次挑戰吧！
                </p>
              </div>
            )}

            {/* Win rewards */}
            {won && rewards && (rewards.expReward > 0 || rewards.goldReward > 0 || rewards.drops.length > 0) && (
              <div className="rounded-xl p-3 mb-3"
                style={{
                  background: "linear-gradient(135deg, rgba(21,128,61,0.1) 0%, rgba(30,27,75,0.3) 100%)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.6s ease-out 0.2s",
                }}>
                <p className="text-[11px] font-bold text-emerald-300 mb-2 tracking-wider">戰鬥獎勵</p>
                <div className="grid grid-cols-3 gap-2">
                  {rewards.expReward > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(251,191,36,0.08)" }}>
                      <span className="text-base">*</span>
                      <div>
                        <p className="text-[9px] text-slate-400">經驗值</p>
                        <p className="text-xs font-bold text-amber-300">+{rewards.expReward}</p>
                      </div>
                    </div>
                  )}
                  {rewards.goldReward > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(234,179,8,0.08)" }}>
                      <span className="text-base">$</span>
                      <div>
                        <p className="text-[9px] text-slate-400">金幣</p>
                        <p className="text-xs font-bold text-yellow-300">+{rewards.goldReward}</p>
                      </div>
                    </div>
                  )}
                  {rewards.petExpGained > 0 && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.08)" }}>
                      <span className="text-base">~</span>
                      <div>
                        <p className="text-[9px] text-slate-400">寵物經驗</p>
                        <p className="text-xs font-bold text-purple-300">+{rewards.petExpGained}</p>
                      </div>
                    </div>
                  )}
                </div>
                {rewards.drops.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-800/20">
                    <p className="text-[9px] text-emerald-400 mb-2">掉落物品</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rewards.drops.map((d, i) => (
                        <span key={i}
                          className="text-[9px] px-2 py-1 rounded-full transition-all"
                          style={{
                            background: visibleDrops.includes(i) ? "rgba(34,197,94,0.15)" : "transparent",
                            border: `1px solid ${visibleDrops.includes(i) ? "rgba(34,197,94,0.4)" : "transparent"}`,
                            color: visibleDrops.includes(i) ? "#86efac" : "transparent",
                            transform: visibleDrops.includes(i) ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.5)",
                            opacity: visibleDrops.includes(i) ? 1 : 0,
                            transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            boxShadow: visibleDrops.includes(i) ? "0 0 8px rgba(34,197,94,0.2)" : "none",
                          }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flee panel */}
            {fled && (
              <div className="rounded-xl p-3 mb-3"
                style={{
                  background: "linear-gradient(135deg, rgba(146,64,14,0.1) 0%, rgba(30,27,75,0.3) 100%)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  opacity: showContent ? 1 : 0,
                  transform: showContent ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.6s ease-out 0.2s",
                }}>
                <p className="text-[11px] font-bold text-amber-300 mb-1 tracking-wider">安全撤退</p>
                <p className="text-[9px] text-slate-400">經過 {round} 回合後成功撤退，無懲罰。</p>
              </div>
            )}
          </>
        )}

        {/* Stats tab */}
        {activeTab === "stats" && hasStats && (
          <div style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease-out 0.2s",
          }}>
            <StatsTab participants={participants!} logs={logs!} />
          </div>
        )}

        {/* Close button */}
        <button onClick={onClose}
          className="group relative w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden mt-2"
          style={{
            background: won
              ? "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(21,128,61,0.15) 100%)"
              : fled ? "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(146,64,14,0.15) 100%)"
              : "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(127,29,29,0.15) 100%)",
            border: `1px solid ${won ? "rgba(34,197,94,0.3)" : fled ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: won ? "#86efac" : fled ? "#fcd34d" : "#fca5a5",
            opacity: showContent ? 1 : 0,
            transition: "all 0.5s ease-out 0.4s",
          }}>
          <span className="relative z-10">
            {won ? "繼續冒險" : fled ? "安全撤退" : "撤退休息"}
          </span>
        </button>
      </div>
    </div>
  );
}
