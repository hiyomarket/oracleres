/**
 * DraggableWidget — 桌機版可拖拉浮動區塊
 * - 僅在桌機版（lg 以上）啟用拖拉
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
  /** 是否停用拖拉（手機版傳 true） */
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

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    // 只允許左鍵拖拉
    if (e.button !== 0) return;
    // 如果點擊的是 button/input/select，不啟動拖拉
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;

    e.preventDefault();
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const newX = Math.max(0, Math.min(rect.width - 20, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(rect.height - 20, e.clientY - dragOffset.current.y));
      setPos({ x: newX, y: newY });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const newX = Math.max(0, Math.min(rect.width - 20, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(rect.height - 20, e.clientY - dragOffset.current.y));
      const finalPos = { x: newX, y: newY };
      setPos(finalPos);
      onPositionChange?.(id, finalPos);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [disabled, pos.x, pos.y, id, onPositionChange]);

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
        ...style,
      }}
      onMouseDown={onMouseDown}
    >
      {/* 拖拉把手提示（桌機版） */}
      {!disabled && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
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
