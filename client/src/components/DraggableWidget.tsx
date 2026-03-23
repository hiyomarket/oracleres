/**
 * DraggableWidget — 可拖拉浮動區塊（桌機 + 手機均支援）
 * - 桌機：滑鼠拖拉（mousedown/mousemove/mouseup）
 * - 手機：觸控拖拉（touchstart/touchmove/touchend）
 * - 位置以 { x, y } 像素座標儲存（相對於地圖容器）
 * - 拖拉結束後透過 onPositionChange 回報新位置
 */
import React, { useRef, useEffect, useState, useCallback } from "react";

interface DraggableWidgetProps {
  id: string;
  defaultPos: { x: number; y: number };
  savedPos?: { x: number; y: number } | null;
  onPositionChange?: (id: string, pos: { x: number; y: number }) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** 是否停用拖拉 */
  disabled?: boolean;
  /** z-index */
  zIndex?: number;
}

export function DraggableWidget({
  id,
  defaultPos,
  savedPos,
  onPositionChange,
  children,
  className = "",
  style = {},
  disabled = false,
  zIndex = 400,
}: DraggableWidgetProps) {
  const [pos, setPos] = useState<{ x: number; y: number }>(savedPos ?? defaultPos);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 當 savedPos 從外部更新時同步
  useEffect(() => {
    if (savedPos) setPos(savedPos);
  }, [savedPos?.x, savedPos?.y]);

  // ── 計算邊界內的新位置 ──
  const clampPos = useCallback((clientX: number, clientY: number) => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return null;
    const rect = parent.getBoundingClientRect();
    const newX = Math.max(0, Math.min(rect.width - 40, clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(rect.height - 40, clientY - dragOffset.current.y));
    return { x: newX, y: newY };
  }, []);

  // ── 滑鼠事件 ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;

    e.preventDefault();
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const p = clampPos(e.clientX, e.clientY);
      if (p) setPos(p);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const p = clampPos(e.clientX, e.clientY);
      if (p) { setPos(p); onPositionChange?.(id, p); }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [disabled, pos.x, pos.y, id, onPositionChange, clampPos]);

  // ── 觸控事件（手機拖拉）──
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;

    const touch = e.touches[0];
    dragging.current = true;
    dragOffset.current = { x: touch.clientX - pos.x, y: touch.clientY - pos.y };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault(); // 防止頁面滾動
      const t = e.touches[0];
      const p = clampPos(t.clientX, t.clientY);
      if (p) setPos(p);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const t = e.changedTouches[0];
      const p = clampPos(t.clientX, t.clientY);
      if (p) { setPos(p); onPositionChange?.(id, p); }
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
  }, [disabled, pos.x, pos.y, id, onPositionChange, clampPos]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        zIndex,
        cursor: disabled ? "default" : "grab",
        userSelect: "none",
        touchAction: "none",
        ...style,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* 拖拉把手提示（非停用時顯示） */}
      {!disabled && (
        <div
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
          style={{ zIndex: zIndex + 1 }}
        >
          {[0,1,2].map(i => (
            <div key={i} className="w-1 h-1 rounded-full bg-white/30" />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
