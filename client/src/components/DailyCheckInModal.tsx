/**
 * DailyCheckInModal.tsx
 * 每日登入領取積分彈窗
 * - 每次進入首頁時檢查今日是否已簽到
 * - 若未簽到，顯示彈窗讓用戶點擊領取
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Coins, X, Sparkles, CheckCircle2 } from "lucide-react";

export function DailyCheckInModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // 查詢今日簽到狀態
  const { data: signinStatus, isLoading } = trpc.points.getSigninStatus.useQuery(
    undefined,
    {
      enabled: !!user,
      staleTime: 0, // 每次都重新查詢
      retry: 1,
    }
  );

  // 每日簽到 mutation
  const claimMutation = trpc.points.claimDailyPoints.useMutation({
    onSuccess: (data) => {
      setClaimed(true);
      setNewBalance(data.newBalance);
      // 更新積分快取
      utils.points.getBalance.invalidate();
      utils.points.getSigninStatus.invalidate();
    },
    onError: (err) => {
      toast.error(`領取失敗：${err.message}`);
      setOpen(false);
    },
  });

  // 當狀態載入後，判斷是否需要顯示彈窗
  useEffect(() => {
    if (!isLoading && signinStatus && !signinStatus.hasSigned) {
      // 延遲 1 秒顯示，避免頁面剛載入就彈出
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, signinStatus]);

  const handleClose = () => {
    setOpen(false);
    setClaimed(false);
    setNewBalance(null);
  };

  if (!user || !open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={claimed ? handleClose : undefined}
      />

      {/* 彈窗內容 */}
      <div className="relative w-full max-w-sm bg-gradient-to-br from-[#0f1117] to-[#1a1200] border border-amber-500/30 rounded-3xl shadow-2xl shadow-amber-900/30 overflow-hidden">
        {/* 裝飾背景光效 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 關閉按鈕（已領取後才顯示） */}
        {claimed && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative px-6 py-8 text-center">
          {!claimed ? (
            <>
              {/* 未領取狀態 */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-500/40 flex items-center justify-center">
                    <Coins className="w-10 h-10 text-amber-400" />
                  </div>
                  <div className="absolute -top-1 -right-1">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">每日簽到獎勵</h2>
              <p className="text-sm text-slate-400 mb-2">今日尚未領取積分</p>

              <div className="inline-flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-xl px-4 py-2 mb-6">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-300">+10</span>
                <span className="text-sm text-amber-400/80">積分</span>
              </div>

              <p className="text-xs text-slate-500 mb-6">
                目前積分：<span className="text-amber-400 font-semibold">{signinStatus?.pointsBalance ?? 0}</span> 點
              </p>

              <button
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="w-full py-3.5 rounded-2xl font-bold text-black text-base transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: claimMutation.isPending
                    ? "#6b5c2a"
                    : "linear-gradient(135deg, #f59e0b, #ef4444)",
                }}
              >
                {claimMutation.isPending ? "領取中…" : "✨ 立即領取"}
              </button>

              <button
                onClick={handleClose}
                className="mt-3 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                稍後再說
              </button>
            </>
          ) : (
            <>
              {/* 已領取成功狀態 */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-600/20 border border-green-500/40 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-1">領取成功！</h2>
              <p className="text-sm text-slate-400 mb-4">今日積分已入帳</p>

              <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/30 rounded-xl px-4 py-2 mb-4">
                <Coins className="w-5 h-5 text-green-400" />
                <span className="text-2xl font-bold text-green-300">+10</span>
                <span className="text-sm text-green-400/80">積分</span>
              </div>

              <p className="text-sm text-slate-400 mb-6">
                目前積分：<span className="text-amber-400 font-bold text-lg">{newBalance ?? 0}</span> 點
              </p>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-2xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                繼續探索天命
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
