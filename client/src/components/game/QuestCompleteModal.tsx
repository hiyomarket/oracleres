/**
 * QuestCompleteModal.tsx
 * 任務完成後的結算彈窗與動畫
 * 全螢幕五行光芒特效 + 獎勵展示
 * PROPOSAL-20260323-GAME-每日任務前端UI
 */

import { useEffect, useState } from "react";

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

const WUXING_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🏔️", metal: "⚡", water: "💧",
};

interface QuestCompleteModalProps {
  wuxing: string;
  earnedStones: number;
  auraBonus: number;
  score: number;
  blessingLevel: string;
  onClose: () => void;
}

export default function QuestCompleteModal({
  wuxing,
  earnedStones,
  auraBonus,
  score,
  blessingLevel,
  onClose,
}: QuestCompleteModalProps) {
  const [phase, setPhase] = useState<"burst" | "reveal" | "done">("burst");
  const color = WUXING_HEX[wuxing] ?? "#C9A227";
  const zh = WUXING_ZH[wuxing] ?? "";
  const emoji = WUXING_EMOJI[wuxing] ?? "✨";

  const BLESSING_LABELS: Record<string, string> = {
    destiny: "天命加持 ✨",
    good: "吉祥如意 🌟",
    normal: "平穩順遂 ☯️",
    none: "修行中 🌱",
  };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 600);
    const t2 = setTimeout(() => setPhase("done"), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      {/* 光芒爆發背景 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${color}22 0%, transparent 70%)`,
          opacity: phase === "burst" ? 1 : 0.4,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* 放射光線 */}
      {phase !== "burst" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${color}15 10deg, transparent 20deg, ${color}10 30deg, transparent 40deg, ${color}15 50deg, transparent 60deg, ${color}10 70deg, transparent 80deg, ${color}15 90deg, transparent 100deg, ${color}10 110deg, transparent 120deg, ${color}15 130deg, transparent 140deg, ${color}10 150deg, transparent 160deg, ${color}15 170deg, transparent 180deg, ${color}10 190deg, transparent 200deg, ${color}15 210deg, transparent 220deg, ${color}10 230deg, transparent 240deg, ${color}15 250deg, transparent 260deg, ${color}10 270deg, transparent 280deg, ${color}15 290deg, transparent 300deg, ${color}10 310deg, transparent 320deg, ${color}15 330deg, transparent 340deg, ${color}10 350deg, transparent 360deg)`,
            opacity: phase === "done" ? 0.6 : 0,
            transition: "opacity 0.6s ease",
          }}
        />
      )}

      {/* 主卡片 */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-3xl border p-8 text-center"
        style={{
          background: `linear-gradient(145deg, ${color}12, rgba(5,13,20,0.95))`,
          borderColor: `${color}50`,
          boxShadow: `0 0 40px ${color}40, 0 0 80px ${color}20`,
          transform: phase === "burst" ? "scale(0.8)" : "scale(1)",
          opacity: phase === "burst" ? 0 : 1,
          transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 五行圖示 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
          style={{
            background: `${color}20`,
            border: `2px solid ${color}60`,
            boxShadow: `0 0 24px ${color}50`,
          }}
        >
          {emoji}
        </div>

        {/* 標題 */}
        <h2
          className="text-xl font-bold mb-1 tracking-wide"
          style={{ color }}
        >
          任務完成！
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {zh}之力已融入你的靈相
        </p>

        {/* 獎勵展示 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className="rounded-xl p-3 border"
            style={{ background: "rgba(0,206,209,0.08)", borderColor: "rgba(0,206,209,0.25)" }}
          >
            <p className="text-2xl font-bold text-cyan-300">💎 {earnedStones}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">靈石獲得</p>
          </div>
          <div
            className="rounded-xl p-3 border"
            style={{ background: "rgba(201,162,39,0.08)", borderColor: "rgba(201,162,39,0.25)" }}
          >
            <p className="text-2xl font-bold text-amber-300">+{auraBonus}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Aura Score</p>
          </div>
        </div>

        {/* 氣場評級 */}
        <div
          className="rounded-xl p-3 mb-6 border"
          style={{ background: `${color}10`, borderColor: `${color}30` }}
        >
          <p className="text-xs text-slate-400">今日氣場評分</p>
          <p className="text-3xl font-bold mt-1" style={{ color }}>{score}</p>
          <p className="text-xs mt-1" style={{ color }}>
            {BLESSING_LABELS[blessingLevel] ?? "修行中"}
          </p>
        </div>

        {/* 關閉按鈕 */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${color}cc, ${color})`,
            color: "#000",
            boxShadow: `0 4px 16px ${color}40`,
          }}
        >
          繼續修行
        </button>
      </div>
    </div>
  );
}
