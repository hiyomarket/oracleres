/**
 * FloatingBanner - 全站懸浮廣告/公告元件
 * - 從後台 siteBanner.getActive 取得資料
 * - 可一鍵收納成小圓球（右下角）
 * - 支援多則輪播（自動切換）
 * - 點擊連結可跳轉
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { X, ChevronRight, ChevronLeft, Bell } from "lucide-react";

type BannerType = "info" | "warning" | "success" | "promo";

const TYPE_STYLES: Record<BannerType, { bg: string; border: string; text: string; dot: string }> = {
  info: {
    bg: "bg-card/95",
    border: "border-amber-500/30",
    text: "text-amber-100",
    dot: "bg-amber-400",
  },
  warning: {
    bg: "bg-card/95",
    border: "border-orange-500/40",
    text: "text-orange-100",
    dot: "bg-orange-400",
  },
  success: {
    bg: "bg-card/95",
    border: "border-emerald-500/40",
    text: "text-emerald-100",
    dot: "bg-emerald-400",
  },
  promo: {
    bg: "bg-card/95",
    border: "border-purple-500/40",
    text: "text-purple-100",
    dot: "bg-purple-400",
  },
};

interface Banner {
  id: number;
  title: string;
  content: string;
  linkUrl: string | null;
  linkText: string | null;
  icon: string | null;
  type: BannerType;
}

export function FloatingBanner() {
  const { data: banners = [] } = trpc.siteBanner.getActive.useQuery(undefined, {
    refetchInterval: 60_000, // 每分鐘重新取得
    staleTime: 30_000,
  });

  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 自動輪播（每 8 秒切換）
  useEffect(() => {
    if (banners.length <= 1 || collapsed) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % banners.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [banners.length, collapsed]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % banners.length);
  }, [banners.length]);

  if (!banners.length || dismissed) return null;

  const banner = banners[currentIndex] as Banner;
  const style = TYPE_STYLES[banner.type] ?? TYPE_STYLES.info;

  // 收納成小圓球狀態
  if (collapsed) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => setCollapsed(false)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full ${style.bg} border ${style.border} shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
        title="展開公告"
      >
        <span className="text-xl">{banner.icon || "🔔"}</span>
        {/* 未讀紅點 */}
        <span className={`absolute top-0.5 right-0.5 w-3 h-3 rounded-full ${style.dot} border-2 border-[#0f0f1a] animate-pulse`} />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-2xl`}
      >
        <div className={`${style.bg} border ${style.border} rounded-2xl shadow-2xl backdrop-blur-md px-4 py-3 flex items-center gap-3`}>
          {/* 圖示 */}
          <div className="flex-shrink-0 text-xl">{banner.icon || "🔔"}</div>

          {/* 內容 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${style.text} truncate`}>{banner.title}</span>
              {banners.length > 1 && (
                <span className="text-[10px] text-white/30 flex-shrink-0">
                  {currentIndex + 1}/{banners.length}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed line-clamp-2">{banner.content}</p>
          </div>

          {/* 連結按鈕 */}
          {banner.linkUrl && (
            <a
              href={banner.linkUrl}
              target={banner.linkUrl.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium ${style.text} opacity-80 hover:opacity-100 transition-opacity whitespace-nowrap`}
            >
              {banner.linkText || "查看"}
              <ChevronRight className="w-3 h-3" />
            </a>
          )}

          {/* 多則切換按鈕 */}
          {banners.length > 1 && (
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-3 h-3 text-white/60" />
              </button>
              <button
                onClick={handleNext}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-3 h-3 text-white/60" />
              </button>
            </div>
          )}

          {/* 收納按鈕 */}
          <button
            onClick={() => setCollapsed(true)}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="收納"
          >
            <Bell className="w-3.5 h-3.5 text-white/50" />
          </button>

          {/* 關閉按鈕 */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title="關閉"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        {/* 多則指示點 */}
        {banners.length > 1 && (
          <div className="flex justify-center gap-1 mt-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentIndex ? `${style.dot} w-4` : "bg-white/20"}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
