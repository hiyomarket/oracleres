/**
 * DailySignin.tsx
 * 每日簽到組件
 * - 顯示今日是否已簽到
 * - 未簽到：顯示可點擊的「簽到領積分」按鈕
 * - 已簽到：顯示灰色已完成狀態 + 積分餘額
 * - 支援 compact 模式（用於嵌入其他頁面）
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DailySigninProps {
  /** compact 模式：精簡顯示，適合嵌入頁面頂部 */
  compact?: boolean;
}

export function DailySignin({ compact = false }: DailySigninProps) {
  const [showReward, setShowReward] = useState(false);
  const utils = trpc.useUtils();

  const { data: signinStatus, isLoading } = trpc.points.getSigninStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const claimPoints = trpc.points.claimDailyPoints.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowReward(true);
      utils.points.getSigninStatus.invalidate();
      setTimeout(() => setShowReward(false), 3000);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return compact ? null : (
      <div className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
    );
  }

  const hasSigned = signinStatus?.hasSigned ?? false;
  const balance = signinStatus?.pointsBalance ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* 積分餘額顯示 */}
        <span className="text-xs text-amber-400 flex items-center gap-1">
          ✦ {balance}
        </span>
        {/* 簽到按鈕 */}
        {hasSigned ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-slate-700/50 text-slate-500 border border-slate-600/30">
            已簽到
          </span>
        ) : (
          <button
            onClick={() => claimPoints.mutate()}
            disabled={claimPoints.isPending}
            className="text-[10px] px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {claimPoints.isPending ? "..." : "簽到 +10"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`rounded-2xl border p-4 transition-all duration-300 ${
          hasSigned
            ? "bg-slate-800/30 border-slate-700/30"
            : "bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/30 hover:border-amber-400/50"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* 圖示 */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                hasSigned
                  ? "bg-slate-700/50 grayscale opacity-60"
                  : "bg-amber-500/20 animate-pulse"
              }`}
            >
              {hasSigned ? "✅" : "🌟"}
            </div>
            <div>
              <p className={`text-sm font-semibold ${hasSigned ? "text-slate-400" : "text-amber-300"}`}>
                {hasSigned ? "今日已完成簽到" : "每日簽到領積分"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {hasSigned
                  ? `積分餘額：${balance} 分`
                  : "每日簽到可獲得 10 積分"}
              </p>
            </div>
          </div>

          {/* 按鈕 */}
          {hasSigned ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <span className="text-amber-400 text-sm font-bold">✦ {balance}</span>
            </div>
          ) : (
            <button
              onClick={() => claimPoints.mutate()}
              disabled={claimPoints.isPending}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              {claimPoints.isPending ? (
                <span className="animate-spin text-base">⟳</span>
              ) : (
                <>
                  <span>簽到</span>
                  <span className="text-xs opacity-80">+10</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 獎勵動畫 */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, y: -60 }}
            transition={{ duration: 0.6 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <div className="text-amber-400 font-bold text-lg drop-shadow-lg">
              ✦ +10
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
