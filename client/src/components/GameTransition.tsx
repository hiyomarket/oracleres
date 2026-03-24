/**
 * GameTransition.tsx
 * 進入靈虛世界的沉浸式過場動畫
 * 效果：黑幕 → 金/紫符文光暈綻放 → 白光閃爍 → 畫面淡入
 */
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

type Phase = "idle" | "fadeIn" | "runes" | "flash" | "done";

interface GameTransitionProps {
  /** 是否啟動過場 */
  active: boolean;
  /** 過場完成後的目標路徑 */
  targetPath?: string;
  /** 過場完成後的 callback（若不傳 targetPath） */
  onComplete?: () => void;
  /** 取消過場 */
  onCancel?: () => void;
}

const RUNE_SYMBOLS = ["☯", "☽", "✦", "⊕", "⊗", "⊙", "⋆", "✧", "◈", "⟡", "⌬", "⎊"];

export default function GameTransition({ active, targetPath, onComplete, onCancel }: GameTransitionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [, navigate] = useLocation();

  const runTransition = useCallback(() => {
    setPhase("fadeIn");
    // Phase 1: 黑幕淡入 (0-400ms)
    setTimeout(() => setPhase("runes"), 400);
    // Phase 2: 符文光暈綻放 (400-1600ms)
    setTimeout(() => setPhase("flash"), 1600);
    // Phase 3: 白光閃爍 (1600-2000ms)
    setTimeout(() => {
      setPhase("done");
      if (targetPath) navigate(targetPath);
      else onComplete?.();
    }, 2100);
  }, [targetPath, navigate, onComplete]);

  useEffect(() => {
    if (active && phase === "idle") {
      runTransition();
    }
    if (!active) {
      setPhase("idle");
    }
  }, [active, phase, runTransition]);

  if (phase === "idle") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        pointerEvents: phase === "done" ? "none" : "all",
        // 背景：黑幕淡入 → 白光閃爍
        background:
          phase === "flash"
            ? "radial-gradient(ellipse at 50% 50%, #fff 0%, #e8d5ff 30%, #0d0520 70%)"
            : "radial-gradient(ellipse at 50% 50%, #1a0a2e 0%, #050d14 60%, #000 100%)",
        opacity: phase === "done" ? 0 : 1,
        transition:
          phase === "fadeIn"
            ? "opacity 0.4s ease-in"
            : phase === "done"
            ? "opacity 0.35s ease-out"
            : "background 0.5s ease",
      }}
      onClick={onCancel}
    >
      {/* 符文粒子層 */}
      {phase === "runes" || phase === "flash" ? (
        <>
          {/* 中央光暈 */}
          <div
            style={{
              position: "absolute",
              width: "320px",
              height: "320px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.6) 0%, rgba(245,158,11,0.3) 40%, transparent 70%)",
              animation: "glow-pulse 0.8s ease-in-out infinite alternate",
              filter: "blur(8px)",
            }}
          />
          {/* 外圈光環 */}
          <div
            style={{
              position: "absolute",
              width: "480px",
              height: "480px",
              borderRadius: "50%",
              border: "1.5px solid rgba(168,85,247,0.4)",
              animation: "ring-expand 1.2s ease-out forwards",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "380px",
              height: "380px",
              borderRadius: "50%",
              border: "1px solid rgba(245,158,11,0.35)",
              animation: "ring-expand 1.0s 0.15s ease-out forwards",
            }}
          />

          {/* 旋轉符文環 */}
          {RUNE_SYMBOLS.map((sym, i) => {
            const angle = (i / RUNE_SYMBOLS.length) * 360;
            const radius = 140;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: "translate(-50%, -50%)",
                  fontSize: i % 3 === 0 ? "22px" : "14px",
                  color:
                    i % 3 === 0
                      ? "rgba(245,158,11,0.9)"
                      : i % 3 === 1
                      ? "rgba(168,85,247,0.8)"
                      : "rgba(255,255,255,0.5)",
                  animation: `rune-appear 0.3s ${i * 0.08}s ease-out both, rune-orbit 3s ${i * 0.08}s linear infinite`,
                  textShadow:
                    i % 3 === 0
                      ? "0 0 12px rgba(245,158,11,0.9)"
                      : "0 0 10px rgba(168,85,247,0.8)",
                  fontFamily: "'Noto Serif TC', serif",
                }}
              >
                {sym}
              </div>
            );
          })}

          {/* 中央主符文 */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              fontSize: "72px",
              color: "rgba(245,158,11,1)",
              textShadow:
                "0 0 30px rgba(245,158,11,0.9), 0 0 60px rgba(168,85,247,0.6), 0 0 100px rgba(245,158,11,0.4)",
              animation: "center-rune 1.2s ease-out both",
              fontFamily: "'Noto Serif TC', serif",
              userSelect: "none",
            }}
          >
            ☯
          </div>

          {/* 標題文字 */}
          <div
            style={{
              position: "absolute",
              bottom: "calc(50% - 120px)",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              animation: "text-rise 0.8s 0.4s ease-out both",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                letterSpacing: "0.4em",
                color: "rgba(245,158,11,0.85)",
                fontFamily: "'Noto Serif TC', serif",
                textShadow: "0 0 12px rgba(245,158,11,0.6)",
                marginBottom: "6px",
                whiteSpace: "nowrap",
              }}
            >
              靈 虛 入 口
            </p>
            <p
              style={{
                fontSize: "10px",
                letterSpacing: "0.25em",
                color: "rgba(168,85,247,0.7)",
                fontFamily: "'Noto Serif TC', serif",
              }}
            >
              天命共振 · 虛相世界
            </p>
          </div>
        </>
      ) : null}

      {/* 白光閃爍層 */}
      {phase === "flash" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "white",
            animation: "flash-burst 0.5s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      )}

      {/* CSS 動畫定義 */}
      <style>{`
        @keyframes glow-pulse {
          from { transform: scale(0.9); opacity: 0.7; }
          to   { transform: scale(1.1); opacity: 1; }
        }
        @keyframes ring-expand {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes rune-appear {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes rune-orbit {
          from { filter: brightness(1); }
          50%  { filter: brightness(1.6); }
          to   { filter: brightness(1); }
        }
        @keyframes center-rune {
          0%   { opacity: 0; transform: scale(0.2) rotate(-180deg); }
          60%  { opacity: 1; transform: scale(1.15) rotate(10deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes text-rise {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes flash-burst {
          0%   { opacity: 0; }
          20%  { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
