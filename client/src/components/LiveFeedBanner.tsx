/**
 * LiveFeedBanner.tsx
 * 全服即時動態滾動橫幅
 *
 * - 接收 WebSocket live_feed 事件
 * - 最多顯示 8 則動態，新訊息從右側滑入
 * - 五行顏色對應：木=綠、火=紅橙、土=黃棕、金=白金、水=藍紫
 * - 點擊可跳轉到對應頁面
 * - 自動輪播（每 4 秒切換一則）
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

// ─── 五行顏色映射 ─────────────────────────────────────────────
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  wood:   { bg: "bg-emerald-900/80",   text: "text-emerald-300",  border: "border-emerald-500/50",  glow: "shadow-emerald-500/30" },
  fire:   { bg: "bg-orange-900/80",    text: "text-orange-300",   border: "border-orange-500/50",   glow: "shadow-orange-500/30" },
  earth:  { bg: "bg-yellow-900/80",    text: "text-yellow-300",   border: "border-yellow-500/50",   glow: "shadow-yellow-500/30" },
  metal:  { bg: "bg-slate-800/80",     text: "text-slate-200",    border: "border-slate-400/50",    glow: "shadow-slate-400/30" },
  water:  { bg: "bg-blue-900/80",      text: "text-blue-300",     border: "border-blue-500/50",     glow: "shadow-blue-500/30" },
  default:{ bg: "bg-purple-900/80",    text: "text-purple-300",   border: "border-purple-500/50",   glow: "shadow-purple-500/30" },
};

// ─── 動態類型圖示 ─────────────────────────────────────────────
const FEED_TYPE_ICONS: Record<string, string> = {
  level_up: "⬆️",
  achievement_unlock: "🏅",
  legendary_drop: "💎",
  pvp_win: "⚔️",
  weekly_champion: "👑",
  world_event: "🌍",
};

// ─── 動態類型標籤 ─────────────────────────────────────────────
const FEED_TYPE_LABELS: Record<string, string> = {
  level_up: "升級",
  achievement_unlock: "成就",
  legendary_drop: "傳說",
  pvp_win: "對戰",
  weekly_champion: "週冠",
  world_event: "世界",
};

export interface LiveFeedItem {
  id: string;
  feedType: string;
  agentName: string;
  agentElement: string;
  agentLevel?: number;
  detail: string;
  icon?: string;
  targetPath?: string;
  ts: number;
}

interface LiveFeedBannerProps {
  /** 外部傳入的 live_feed 訊息（來自 WebSocket hook） */
  newFeed?: LiveFeedItem | null;
  /** 是否顯示橫幅（預設 true） */
  visible?: boolean;
  className?: string;
}

const MAX_FEEDS = 8;
const ROTATE_INTERVAL = 4000; // 4 秒輪播

export function LiveFeedBanner({ newFeed, visible = true, className = "" }: LiveFeedBannerProps) {
  const [feeds, setFeeds] = useState<LiveFeedItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [, navigate] = useLocation();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 接收新動態
  useEffect(() => {
    if (!newFeed) return;
    setFeeds(prev => {
      const next = [newFeed, ...prev].slice(0, MAX_FEEDS);
      return next;
    });
    // 新訊息出現時跳到第一則
    setCurrentIdx(0);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
  }, [newFeed]);

  // 自動輪播
  const startRotation = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        if (feeds.length <= 1) return 0;
        return (prev + 1) % feeds.length;
      });
    }, ROTATE_INTERVAL);
  }, [feeds.length]);

  useEffect(() => {
    if (feeds.length > 1) {
      startRotation();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [feeds.length, startRotation]);

  if (!visible || feeds.length === 0) return null;

  const current = feeds[currentIdx] ?? feeds[0];
  const colors = ELEMENT_COLORS[current.agentElement] ?? ELEMENT_COLORS.default;
  const icon = current.icon ?? FEED_TYPE_ICONS[current.feedType] ?? "✨";
  const typeLabel = FEED_TYPE_LABELS[current.feedType] ?? "動態";

  const handleClick = () => {
    if (current.targetPath) {
      navigate(current.targetPath);
    }
  };

  return (
    <div
      className={`w-full ${className}`}
      role="marquee"
      aria-label="全服即時動態"
    >
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer
          transition-all duration-300 hover:opacity-90 active:scale-[0.99]
          ${colors.bg} ${colors.border} shadow-sm ${colors.glow}
          ${animating ? "animate-pulse" : ""}
        `}
        onClick={handleClick}
        title="點擊查看詳情"
      >
        {/* 類型標籤 */}
        <span className={`
          text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0
          bg-black/30 ${colors.text}
        `}>
          {typeLabel}
        </span>

        {/* 圖示 */}
        <span className="text-sm shrink-0">{icon}</span>

        {/* 主要文字 */}
        <span className={`text-xs font-medium truncate flex-1 ${colors.text}`}>
          <span className="font-bold">{current.agentName}</span>
          {current.agentLevel && (
            <span className="opacity-70 ml-1">Lv.{current.agentLevel}</span>
          )}
          <span className="mx-1 opacity-60">·</span>
          {current.detail}
        </span>

        {/* 計數器（多則時顯示） */}
        {feeds.length > 1 && (
          <span className="text-[10px] opacity-50 shrink-0 ml-1">
            {currentIdx + 1}/{feeds.length}
          </span>
        )}

        {/* 時間 */}
        <span className="text-[10px] opacity-40 shrink-0">
          {formatRelativeTime(current.ts)}
        </span>
      </div>

      {/* 多則動態點指示器 */}
      {feeds.length > 1 && (
        <div className="flex gap-1 justify-center mt-1">
          {feeds.slice(0, Math.min(feeds.length, 8)).map((_, i) => (
            <button
              key={i}
              className={`w-1 h-1 rounded-full transition-all ${
                i === currentIdx ? `${colors.text} opacity-100 w-2` : "bg-white/20"
              }`}
              onClick={() => setCurrentIdx(i)}
              aria-label={`第 ${i + 1} 則動態`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 格式化相對時間 ───────────────────────────────────────────
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "剛剛";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  return `${Math.floor(diff / 3600000)}時前`;
}

// ─── 全服動態容器（管理多個 Banner 的佇列） ──────────────────
interface LiveFeedContainerProps {
  /** WebSocket 最新訊息 */
  latestMessage: { type: string; payload: unknown } | null;
  className?: string;
}

export function LiveFeedContainer({ latestMessage, className = "" }: LiveFeedContainerProps) {
  const [latestFeed, setLatestFeed] = useState<LiveFeedItem | null>(null);

  useEffect(() => {
    if (!latestMessage || latestMessage.type !== "live_feed") return;
    const payload = latestMessage.payload as LiveFeedItem;
    if (!payload?.feedType || !payload?.agentName) return;
    setLatestFeed({
      ...payload,
      id: `${payload.ts}-${Math.random().toString(36).slice(2, 7)}`,
    });
  }, [latestMessage]);

  return (
    <LiveFeedBanner
      newFeed={latestFeed}
      visible={true}
      className={className}
    />
  );
}
