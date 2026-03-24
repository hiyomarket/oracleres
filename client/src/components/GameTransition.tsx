/**
 * GameTransition.tsx
 * 進入靈虛世界的過場動畫（乾淨俐落版）
 * 效果：全螢幕黑幕淡入 → 全黑停留 → 純白閃爍 → 黑幕淡出（同時導航）
 * 總時長約 1.6 秒
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type Phase = "idle" | "black-in" | "hold" | "white-flash" | "fade-out" | "done";

interface GameTransitionProps {
  active: boolean;
  targetPath?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function GameTransition({ active, targetPath, onComplete, onCancel }: GameTransitionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    if (phase !== "idle") return;

    // 時序：
    // 0ms      → 開始黑幕淡入
    // 350ms    → 全黑停留
    // 600ms    → 純白閃爍
    // 750ms    → 導航 + 黑幕淡出
    // 1500ms   → 完成（隱藏組件）
    setPhase("black-in");
    const t1 = setTimeout(() => setPhase("hold"), 350);
    const t2 = setTimeout(() => setPhase("white-flash"), 600);
    const t3 = setTimeout(() => {
      if (targetPath) navigate(targetPath);
      setPhase("fade-out");
    }, 750);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase === "idle" || phase === "done") return null;

  // 計算背景色和透明度
  const isWhite = phase === "white-flash";
  const isFading = phase === "fade-out";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: isFading ? "none" : "all",
        backgroundColor: isWhite ? "#ffffff" : "#000000",
        opacity: isFading ? 0 : 1,
        transition:
          phase === "black-in"
            ? "opacity 0.35s ease-in"
            : phase === "white-flash"
            ? "background-color 0.15s ease-out"
            : phase === "fade-out"
            ? "opacity 0.75s ease-out"
            : "none",
      }}
      onClick={onCancel}
    />
  );
}
