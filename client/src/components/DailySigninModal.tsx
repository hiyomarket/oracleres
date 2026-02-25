/**
 * DailySigninModal.tsx
 * 每日簽到彈窗組件
 * - 登入後自動偵測當日是否已簽到
 * - 未簽到時自動彈出（延遲 1.5 秒，避免與頁面載入衝突）
 * - 點擊「簽到領積分」完成簽到並顯示動畫
 * - 完成後自動關閉，或點擊背景/X 關閉
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export function DailySigninModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const utils = trpc.useUtils();

  const { data: signinStatus } = trpc.points.getSigninStatus.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const claimPoints = trpc.points.claimDailyPoints.useMutation({
    onSuccess: (res) => {
      setClaimed(true);
      utils.points.getSigninStatus.invalidate();
      // 2 秒後自動關閉
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => setClaimed(false), 400);
      }, 2000);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // 登入後且當日未簽到，延遲 1.5 秒自動彈出
  useEffect(() => {
    if (!user) return;
    if (hasTriggered) return;
    if (signinStatus === undefined) return; // 等待查詢完成

    if (!signinStatus.hasSigned) {
      setHasTriggered(true);
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setHasTriggered(true); // 已簽到，標記為已觸發（不再彈出）
    }
  }, [user, signinStatus, hasTriggered]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setClaimed(false), 400);
  };

  const balance = signinStatus?.pointsBalance ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* 彈窗主體 */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center px-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 關閉按鈕 */}
              <button
                onClick={handleClose}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors text-sm"
              >
                ✕
              </button>

              {/* 卡片本體 */}
              <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-500/10">

                {/* 頂部裝飾光帶 */}
                <div className="h-1 bg-gradient-to-r from-amber-600 via-orange-400 to-amber-600" />

                <div className="p-7">
                  <AnimatePresence mode="wait">
                    {!claimed ? (
                      /* ── 未簽到狀態 ── */
                      <motion.div
                        key="unclaimed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center space-y-5"
                      >
                        {/* 圖示 */}
                        <motion.div
                          animate={{ rotate: [0, -8, 8, -8, 0] }}
                          transition={{ duration: 1.2, delay: 0.3, ease: "easeInOut" }}
                          className="text-6xl mx-auto w-fit"
                        >
                          🌟
                        </motion.div>

                        {/* 標題 */}
                        <div>
                          <h2 className="text-xl font-bold text-white mb-1">每日簽到</h2>
                          <p className="text-slate-400 text-sm">
                            今日尚未簽到，領取你的天命積分
                          </p>
                        </div>

                        {/* 積分獎勵展示 */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl py-4 px-6">
                          <div className="text-4xl font-bold text-amber-400">+10</div>
                          <div className="text-xs text-amber-300/70 mt-1">天命積分</div>
                          {balance > 0 && (
                            <div className="text-xs text-slate-500 mt-2">
                              目前餘額：<span className="text-amber-400">{balance}</span> 分
                            </div>
                          )}
                        </div>

                        {/* 簽到按鈕 */}
                        <button
                          onClick={() => claimPoints.mutate()}
                          disabled={claimPoints.isPending}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                        >
                          {claimPoints.isPending ? (
                            <span className="animate-spin text-xl">⟳</span>
                          ) : (
                            <>
                              <span>✦</span>
                              <span>簽到領積分</span>
                            </>
                          )}
                        </button>

                        {/* 略過 */}
                        <button
                          onClick={handleClose}
                          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                        >
                          稍後再說
                        </button>
                      </motion.div>
                    ) : (
                      /* ── 簽到成功狀態 ── */
                      <motion.div
                        key="claimed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="text-center space-y-4 py-2"
                      >
                        {/* 成功圖示 */}
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.3, 1] }}
                          transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                          className="text-7xl mx-auto w-fit"
                        >
                          ✅
                        </motion.div>

                        <div>
                          <h2 className="text-xl font-bold text-white mb-1">簽到成功！</h2>
                          <p className="text-slate-400 text-sm">天命積分已入帳</p>
                        </div>

                        {/* 積分動畫 */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl py-4"
                        >
                          <div className="text-4xl font-bold text-amber-400">+10</div>
                          <div className="text-xs text-amber-300/70 mt-1">天命積分</div>
                          <div className="text-xs text-slate-500 mt-2">
                            新餘額：<span className="text-amber-400 font-semibold">{balance + 10}</span> 分
                          </div>
                        </motion.div>

                        <p className="text-xs text-slate-600">即將關閉...</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
