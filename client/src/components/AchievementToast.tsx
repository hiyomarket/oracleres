/**
 * AchievementToast.tsx
 * 成就解鎖通知彈窗（右下角持久 Toast）
 *
 * - 接收 WebSocket achievement_unlock 事件
 * - 右下角滑入動畫，顯示 6 秒後自動消失
 * - 最多同時顯示 3 個（佇列管理）
 * - 包含成就圖示、名稱、描述、獎勵
 * - 點擊可跳轉到成就頁面
 * - 點擊 X 可手動關閉
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

export interface AchievementUnlockData {
  id: string;
  name: string;
  icon: string;
  desc: string;
  rewardType?: string;
  rewardAmount?: number;
  ts: number;
}

interface ToastItem extends AchievementUnlockData {
  toastId: string;
  visible: boolean;
}

const TOAST_DURATION = 6000;   // 6 秒自動消失
const MAX_TOASTS = 3;           // 最多同時顯示 3 個

interface AchievementToastProps {
  /** WebSocket 最新訊息 */
  latestMessage: { type: string; payload: unknown } | null;
}

export function AchievementToastContainer({ latestMessage }: AchievementToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [, navigate] = useLocation();
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // 移除 Toast
  const removeToast = useCallback((toastId: string) => {
    // 先觸發淡出動畫
    setToasts(prev => prev.map(t => t.toastId === toastId ? { ...t, visible: false } : t));
    // 300ms 後移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 300);
    // 清除計時器
    const timer = timersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(toastId);
    }
  }, []);

  // 接收新成就解鎖
  useEffect(() => {
    if (!latestMessage || latestMessage.type !== "achievement_unlock") return;
    const payload = latestMessage.payload as AchievementUnlockData;
    if (!payload?.id || !payload?.name) return;

    const toastId = `toast-${payload.ts}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = {
      ...payload,
      toastId,
      visible: true,
    };

    setToasts(prev => {
      // 超過上限時移除最舊的
      const next = [...prev, newToast];
      if (next.length > MAX_TOASTS) {
        const removed = next.shift();
        if (removed) {
          const timer = timersRef.current.get(removed.toastId);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.toastId);
          }
        }
      }
      return next;
    });

    // 自動消失計時器
    const timer = setTimeout(() => removeToast(toastId), TOAST_DURATION);
    timersRef.current.set(toastId, timer);
  }, [latestMessage, removeToast]);

  // 清理計時器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="成就通知"
    >
      {toasts.map(toast => (
        <AchievementToastItem
          key={toast.toastId}
          toast={toast}
          onClose={() => removeToast(toast.toastId)}
          onNavigate={() => {
            navigate("/game/achievements");
            removeToast(toast.toastId);
          }}
        />
      ))}
    </div>
  );
}

// ─── 單一 Toast 卡片 ─────────────────────────────────────────
interface ToastItemProps {
  toast: ToastItem;
  onClose: () => void;
  onNavigate: () => void;
}

function AchievementToastItem({ toast, onClose, onNavigate }: ToastItemProps) {
  const hasReward = toast.rewardType && toast.rewardType !== "none" && (toast.rewardAmount ?? 0) > 0;

  return (
    <div
      className={`
        pointer-events-auto w-72 rounded-xl border overflow-hidden
        bg-gradient-to-br from-yellow-950/95 via-amber-950/95 to-orange-950/95
        border-yellow-500/40 shadow-2xl shadow-yellow-900/50
        transition-all duration-300
        ${toast.visible
          ? "translate-x-0 opacity-100 scale-100"
          : "translate-x-full opacity-0 scale-95"
        }
      `}
      role="alert"
    >
      {/* 頂部光條 */}
      <div className="h-0.5 bg-gradient-to-r from-yellow-400 via-amber-300 to-orange-400 animate-pulse" />

      <div className="p-3">
        {/* 標題列 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* 成就圖示 */}
            <div className="w-10 h-10 rounded-lg bg-yellow-900/60 border border-yellow-500/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
              {toast.icon}
            </div>
            <div>
              <div className="text-[10px] text-yellow-400/70 font-semibold tracking-wider uppercase">
                成就解鎖！
              </div>
              <div className="text-sm font-bold text-yellow-200 leading-tight">
                {toast.name}
              </div>
            </div>
          </div>

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="text-yellow-600/60 hover:text-yellow-400 transition-colors shrink-0 mt-0.5"
            aria-label="關閉通知"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 描述 */}
        <p className="text-xs text-yellow-300/70 mb-2 leading-relaxed">
          {toast.desc}
        </p>

        {/* 獎勵（如果有） */}
        {hasReward && (
          <div className="flex items-center gap-1.5 mb-2 bg-yellow-900/30 rounded-md px-2 py-1">
            <span className="text-xs">🎁</span>
            <span className="text-xs text-yellow-300/80">
              獲得獎勵：
              <span className="font-bold text-yellow-200 ml-1">
                {toast.rewardType === "gold" ? `${toast.rewardAmount} 金幣` :
                 toast.rewardType === "ap" ? `${toast.rewardAmount} AP` :
                 toast.rewardType === "exp" ? `${toast.rewardAmount} 經驗` :
                 `${toast.rewardAmount} ${toast.rewardType}`}
              </span>
            </span>
          </div>
        )}

        {/* 查看按鈕 */}
        <button
          onClick={onNavigate}
          className="w-full text-xs py-1.5 rounded-md bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 border border-yellow-500/30 transition-colors font-medium"
        >
          查看成就 →
        </button>
      </div>

      {/* 進度條（倒計時） */}
      <div className="h-0.5 bg-yellow-900/50">
        <div
          className="h-full bg-yellow-400/60 transition-none"
          style={{
            animation: `shrink-width ${TOAST_DURATION}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
