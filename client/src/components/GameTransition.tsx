/**
 * GameTransition.tsx
 * 進入靈虛世界的過場動畫（個人化版）
 * 根據玩家命盤主元素調整全畫面過場色調：
 *   木→翠綠  火→深紅  土→琥珀  金→銀白  水→深藍
 * 效果：全螢幕色幕淡入 → 元素粒子特效 → 白色閃爍 → 色幕淡出（同時導航）
 * 總時長約 2.0 秒
 */
import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";

type Phase = "idle" | "color-in" | "particles" | "white-flash" | "fade-out" | "done";

/** 五行元素色彩配置 */
const ELEMENT_THEMES: Record<string, {
  primary: string;       // 主色調
  secondary: string;     // 輔助色
  glow: string;          // 光暈色
  particleColors: string[]; // 粒子顏色
  symbol: string;        // 元素符號
}> = {
  wood: {
    primary: "#0a2e1a",
    secondary: "#166534",
    glow: "rgba(34, 197, 94, 0.4)",
    particleColors: ["#22c55e", "#4ade80", "#86efac", "#16a34a", "#15803d"],
    symbol: "木",
  },
  fire: {
    primary: "#2a0a0a",
    secondary: "#991b1b",
    glow: "rgba(239, 68, 68, 0.4)",
    particleColors: ["#ef4444", "#f97316", "#fbbf24", "#dc2626", "#b91c1c"],
    symbol: "火",
  },
  earth: {
    primary: "#1a1408",
    secondary: "#92400e",
    glow: "rgba(234, 179, 8, 0.4)",
    particleColors: ["#eab308", "#f59e0b", "#d97706", "#ca8a04", "#a16207"],
    symbol: "土",
  },
  metal: {
    primary: "#0f1218",
    secondary: "#475569",
    glow: "rgba(148, 163, 184, 0.4)",
    particleColors: ["#94a3b8", "#cbd5e1", "#e2e8f0", "#64748b", "#f1f5f9"],
    symbol: "金",
  },
  water: {
    primary: "#0a1628",
    secondary: "#1e40af",
    glow: "rgba(59, 130, 246, 0.4)",
    particleColors: ["#3b82f6", "#60a5fa", "#93c5fd", "#2563eb", "#1d4ed8"],
    symbol: "水",
  },
};

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  dx: number;
  dy: number;
}

interface GameTransitionProps {
  active: boolean;
  targetPath?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  /** 玩家命盤主元素（wood/fire/earth/metal/water），預設 metal */
  dominantElement?: string;
}

export default function GameTransition({ active, targetPath, onComplete, onCancel, dominantElement = "metal" }: GameTransitionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [, navigate] = useLocation();

  const theme = ELEMENT_THEMES[dominantElement] ?? ELEMENT_THEMES.metal;

  // 生成粒子（只在 active 時計算一次）
  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    const count = 40;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 6,
      color: theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)],
      delay: Math.random() * 0.4,
      duration: 0.6 + Math.random() * 0.8,
      dx: (Math.random() - 0.5) * 30,
      dy: (Math.random() - 0.5) * 30,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    if (phase !== "idle") return;

    // 時序：
    // 0ms      → 色幕淡入
    // 400ms    → 粒子特效 + 元素符號
    // 900ms    → 白色閃爍
    // 1100ms   → 導航 + 色幕淡出
    // 2000ms   → 完成
    setPhase("color-in");
    const t1 = setTimeout(() => setPhase("particles"), 400);
    const t2 = setTimeout(() => setPhase("white-flash"), 900);
    const t3 = setTimeout(() => {
      if (targetPath) navigate(targetPath);
      setPhase("fade-out");
    }, 1100);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase === "idle" || phase === "done") return null;

  const isWhite = phase === "white-flash";
  const isFading = phase === "fade-out";
  const showParticles = phase === "particles" || phase === "white-flash";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: isFading ? "none" : "all",
        background: isWhite
          ? "#ffffff"
          : `radial-gradient(ellipse at center, ${theme.secondary}, ${theme.primary})`,
        opacity: isFading ? 0 : 1,
        transition:
          phase === "color-in"
            ? "opacity 0.4s ease-in"
            : phase === "white-flash"
            ? "background 0.2s ease-out"
            : phase === "fade-out"
            ? "opacity 0.9s ease-out"
            : "none",
        overflow: "hidden",
      }}
      onClick={onCancel}
    >
      {/* 元素光暈 */}
      {!isWhite && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "60vmax",
            height: "60vmax",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${theme.glow}, transparent 70%)`,
            animation: "pulseGlow 1.5s ease-in-out infinite",
            opacity: showParticles ? 1 : 0.3,
            transition: "opacity 0.4s",
          }}
        />
      )}

      {/* 元素符號 */}
      {showParticles && !isWhite && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "clamp(80px, 15vw, 200px)",
            fontWeight: 900,
            fontFamily: "'Noto Serif TC', serif",
            color: theme.particleColors[0],
            textShadow: `0 0 40px ${theme.glow}, 0 0 80px ${theme.glow}`,
            opacity: 0.6,
            animation: "symbolPulse 0.8s ease-out",
            pointerEvents: "none",
          }}
        >
          {theme.symbol}
        </div>
      )}

      {/* 粒子效果 */}
      {showParticles && !isWhite && particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `particleFloat ${p.duration}s ease-out ${p.delay}s both`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* CSS 動畫 */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.7; }
        }
        @keyframes symbolPulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          60% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        }
        @keyframes particleFloat {
          0% { transform: scale(0) translate(0, 0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: scale(1.5) translate(var(--dx, 20px), var(--dy, -20px)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
