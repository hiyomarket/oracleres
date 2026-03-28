/**
 * battle/VictoryPanel.tsx — 戰鬥結算面板
 */
import React, { useState, useEffect } from "react";

export function VictoryPanel({ result, round, onClose, rewards }: {
  result: string | null; round: number; onClose: () => void;
  rewards?: { expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null;
}) {
  const won = result === "win";
  const fled = result === "flee";
  const [visibleDrops, setVisibleDrops] = useState<number[]>([]);

  useEffect(() => {
    if (!won || !rewards?.drops.length) return;
    rewards.drops.forEach((_, i) => {
      setTimeout(() => {
        setVisibleDrops(prev => [...prev, i]);
      }, 300 + i * 200);
    });
  }, [won, rewards?.drops.length]);

  return (
    <div className="relative overflow-hidden max-h-[50vh] overflow-y-auto"
      style={{
        background: won
          ? "linear-gradient(180deg, rgba(21,128,61,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : fled ? "linear-gradient(180deg, rgba(146,64,14,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : "linear-gradient(180deg, rgba(127,29,29,0.15) 0%, rgba(12,10,29,0.9) 100%)",
      }}>
      {won && (
        <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top, rgba(251,191,36,0.15) 0%, transparent 70%)",
            animation: "victoryGlow 1s ease-out",
          }} />
      )}

      <div className="relative px-4 py-4">
        <div className="text-center mb-3">
          <p className={`text-2xl font-black mb-1 ${won ? "text-amber-300" : fled ? "text-amber-400" : "text-red-400"}`}
            style={{
              textShadow: won ? "0 0 20px rgba(251,191,36,0.5)" : fled ? "0 0 20px rgba(245,158,11,0.3)" : "0 0 20px rgba(239,68,68,0.3)",
              animation: "victoryGlow 0.8s ease-out",
            }}>
            {won ? "🏆 勝利" : fled ? "🏃 撤退" : "💀 敗北"}
          </p>
          <p className="text-[10px] text-slate-500">共 {round} 回合</p>
        </div>

        {won && rewards && (rewards.expReward > 0 || rewards.goldReward > 0 || rewards.drops.length > 0) && (
          <div className="rounded-xl p-3 mb-3"
            style={{
              background: "linear-gradient(135deg, rgba(21,128,61,0.1) 0%, rgba(30,27,75,0.3) 100%)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}>
            <p className="text-[11px] font-bold text-emerald-300 mb-2 tracking-wider">✨ 戰鬥獎勵</p>
            <div className="grid grid-cols-3 gap-2">
              {rewards.expReward > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(251,191,36,0.08)" }}>
                  <span className="text-base">⭐</span>
                  <div>
                    <p className="text-[9px] text-slate-400">經驗值</p>
                    <p className="text-xs font-bold text-amber-300">+{rewards.expReward}</p>
                  </div>
                </div>
              )}
              {rewards.goldReward > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(234,179,8,0.08)" }}>
                  <span className="text-base">💰</span>
                  <div>
                    <p className="text-[9px] text-slate-400">金幣</p>
                    <p className="text-xs font-bold text-yellow-300">+{rewards.goldReward}</p>
                  </div>
                </div>
              )}
              {rewards.petExpGained > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.08)" }}>
                  <span className="text-base">🐾</span>
                  <div>
                    <p className="text-[9px] text-slate-400">寵物經驗</p>
                    <p className="text-xs font-bold text-purple-300">+{rewards.petExpGained}</p>
                  </div>
                </div>
              )}
            </div>
            {rewards.drops.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-800/20">
                <p className="text-[9px] text-emerald-400 mb-2">🎁 掉落物品</p>
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
                      ✨ {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button onClick={onClose}
          className="group relative w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
          style={{
            background: won
              ? "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(21,128,61,0.15) 100%)"
              : fled ? "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(146,64,14,0.15) 100%)"
              : "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(127,29,29,0.15) 100%)",
            border: `1px solid ${won ? "rgba(34,197,94,0.3)" : fled ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: won ? "#86efac" : fled ? "#fcd34d" : "#fca5a5",
          }}>
          <span className="relative z-10">{won ? "繼續冒險" : fled ? "安全撤退" : "撤退休息"}</span>
        </button>
      </div>
    </div>
  );
}
