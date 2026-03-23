/**
 * DailyQuestCard.tsx
 * 每日穿搭任務卡片 — 懸浮顯示在靈相空間頂部
 * 即時監聽裝備狀態，動態更新任務進度
 * PROPOSAL-20260323-GAME-每日任務前端UI
 */

import { useMemo } from "react";

const WUXING_HEX: Record<string, string> = {
  wood: "#2E8B57",
  fire: "#DC143C",
  earth: "#CD853F",
  metal: "#C9A227",
  water: "#00CED1",
};

const WUXING_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

interface QuestData {
  targetWuxing: string;
  targetWuxingZh?: string;
  title: string;
  desc: string;
  minItems: number;
  reward: { stones: number; auraBonus: number };
  alreadyCompleted: boolean;
  earnedStones: number;
}

interface DailyQuestCardProps {
  quest: QuestData | null | undefined;
  /** 目前裝備中的五行列表（即時計算進度用） */
  equippedWuxingList: string[];
  /** 是否正在提交 */
  isSubmitting: boolean;
  /** 點擊提交按鈕 */
  onSubmit: () => void;
}

export default function DailyQuestCard({
  quest,
  equippedWuxingList,
  isSubmitting,
  onSubmit,
}: DailyQuestCardProps) {
  const progress = useMemo(() => {
    if (!quest) return 0;
    return equippedWuxingList.filter((w) => w === quest.targetWuxing).length;
  }, [quest, equippedWuxingList]);

  if (!quest) return null;

  const color = WUXING_HEX[quest.targetWuxing] ?? "#C9A227";
  const zh = WUXING_ZH[quest.targetWuxing] ?? quest.targetWuxingZh ?? "";
  const isReady = progress >= quest.minItems;
  const isCompleted = quest.alreadyCompleted;

  return (
    <div
      className="rounded-2xl border p-4 transition-all"
      style={{
        background: isCompleted
          ? "rgba(40,180,80,0.08)"
          : `${color}0e`,
        borderColor: isCompleted
          ? "rgba(40,180,80,0.35)"
          : `${color}35`,
        boxShadow: isReady && !isCompleted
          ? `0 0 16px ${color}30`
          : "none",
      }}
    >
      {/* 標題列 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div>
            <p
              className="text-xs font-bold tracking-wide"
              style={{ color: isCompleted ? "#4ade80" : color }}
            >
              {isCompleted ? "✓ 今日任務完成" : "今日穿搭任務"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{quest.title}</p>
          </div>
        </div>
        {/* 獎勵預覽 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-slate-500">獎勵</span>
          <span className="text-[11px] font-bold text-cyan-300">💎 {quest.reward.stones}</span>
          <span className="text-[11px] font-bold text-amber-300">+{quest.reward.auraBonus} Aura</span>
        </div>
      </div>

      {/* 任務描述 */}
      {!isCompleted && (
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">{quest.desc}</p>
      )}

      {/* 進度條 */}
      {!isCompleted && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500">
              穿戴【<span style={{ color }} className="font-bold">{zh}屬性</span>】服裝
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: isReady ? "#4ade80" : color }}
            >
              {progress} / {quest.minItems}
              {isReady && " ✓"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800/60 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (progress / quest.minItems) * 100)}%`,
                background: isReady
                  ? "linear-gradient(90deg, #4ade80, #22c55e)"
                  : `linear-gradient(90deg, ${color}80, ${color})`,
              }}
            />
          </div>
        </div>
      )}

      {/* 提交按鈕 */}
      {!isCompleted && (
        <button
          onClick={onSubmit}
          disabled={!isReady || isSubmitting}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isReady
              ? {
                  background: `linear-gradient(135deg, ${color}cc, ${color})`,
                  color: "#000",
                  boxShadow: `0 4px 12px ${color}40`,
                }
              : {
                  background: "rgba(255,255,255,0.05)",
                  color: "#64748b",
                  border: "1px solid rgba(255,255,255,0.08)",
                }
          }
        >
          {isSubmitting
            ? "提交中..."
            : isReady
            ? `✨ 提交今日穿搭（獲得 💎 ${quest.reward.stones} 靈石）`
            : `還需 ${quest.minItems - progress} 件${zh}屬性服裝`}
        </button>
      )}

      {/* 完成後顯示獲得的靈石 */}
      {isCompleted && quest.earnedStones > 0 && (
        <p className="text-xs text-center text-green-400 font-semibold">
          已獲得 💎 {quest.earnedStones} 靈石 · +{quest.reward.auraBonus} Aura Score
        </p>
      )}
    </div>
  );
}
