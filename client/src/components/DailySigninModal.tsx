/**
 * DailySigninModal.tsx
 * 每日簽到彈窗組件（升級版 v2.0）
 * - 登入後自動偵測當日是否已簽到
 * - 未簽到時自動彈出（延遲 1.5 秒）
 * - 顯示連續天數進度條（青銅/白銀/黃金三等級）
 * - 分級積分獎勵：1-5天10點、6-19天15點、20天以上20點
 * - 里程碑達成時顯示特殊慶祝動畫
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

// ── 等級設定 ──────────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  bronze: {
    label: "青銅",
    icon: "🥉",
    gradientFrom: "#92400e",
    gradientTo: "#c2410c",
    bgClass: "bg-amber-900/20",
    borderClass: "border-amber-700/40",
    textClass: "text-amber-500",
    barClass: "bg-gradient-to-r from-amber-700 to-orange-500",
    description: "初心者的天命之路",
  },
  silver: {
    label: "白銀",
    icon: "🥈",
    gradientFrom: "#64748b",
    gradientTo: "#cbd5e1",
    bgClass: "bg-slate-700/20",
    borderClass: "border-slate-500/40",
    textClass: "text-slate-300",
    barClass: "bg-gradient-to-r from-slate-500 to-slate-300",
    description: "持之以恆的修煉者",
  },
  gold: {
    label: "黃金",
    icon: "🥇",
    gradientFrom: "#b45309",
    gradientTo: "#fbbf24",
    bgClass: "bg-yellow-900/20",
    borderClass: "border-yellow-500/40",
    textClass: "text-yellow-400",
    barClass: "bg-gradient-to-r from-yellow-500 to-amber-300",
    description: "天命共振的傳奇者",
  },
} as const;

type Tier = keyof typeof TIER_CONFIG;

function getTier(streak: number): Tier {
  if (streak >= 20) return "gold";
  if (streak >= 6) return "silver";
  return "bronze";
}

function getProgressInTier(streak: number): number {
  if (streak >= 20) return Math.min((streak - 20) / 10, 1);
  if (streak >= 6) return (streak - 6) / 14;
  return Math.max((streak - 1) / 5, 0.04);
}

// ── 里程碑節點 ────────────────────────────────────────────────────────────────
function MilestoneNode({
  day, label, icon, reached, isCurrent,
}: {
  day: number; label: string; icon: string; reached: boolean; isCurrent: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${
          reached
            ? "border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/30"
            : isCurrent
            ? "border-amber-400/60 bg-amber-500/10 ring-2 ring-amber-400/30"
            : "border-slate-700 bg-slate-800/60"
        }`}
      >
        {reached || isCurrent ? (
          <span>{icon}</span>
        ) : (
          <span className="text-slate-600 text-xs font-bold">{day}</span>
        )}
      </motion.div>
      <span className={`text-[10px] font-medium ${reached ? "text-amber-400" : "text-slate-600"}`}>
        {label}
      </span>
    </div>
  );
}

// ── 主組件 ────────────────────────────────────────────────────────────────────
export function DailySigninModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    pointsEarned: number;
    newStreak: number;
    isStreakMilestone: boolean;
    milestoneMessage: string;
    newBalance: number;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: signinStatus } = trpc.points.getSigninStatus.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const claimPoints = trpc.points.claimDailyPoints.useMutation({
    onSuccess: (res) => {
      setClaimResult({
        pointsEarned: res.pointsEarned,
        newStreak: res.newStreak,
        isStreakMilestone: res.isStreakMilestone,
        milestoneMessage: res.milestoneMessage,
        newBalance: res.newBalance,
      });
      setClaimed(true);
      utils.points.getSigninStatus.invalidate();
      utils.points.getBalance.invalidate();
      const delay = res.isStreakMilestone ? 3500 : 2500;
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => { setClaimed(false); setClaimResult(null); }, 400);
      }, delay);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (!user) return;
    if (hasTriggered) return;
    if (signinStatus === undefined) return;
    if (!signinStatus.hasSigned) {
      setHasTriggered(true);
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setHasTriggered(true);
    }
  }, [user, signinStatus, hasTriggered]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => { setClaimed(false); setClaimResult(null); }, 400);
  };

  const streak = signinStatus?.streak ?? 0;
  const todayPoints = signinStatus?.todayPoints ?? 10;
  const balance = signinStatus?.pointsBalance ?? 0;
  const nextMilestone = signinStatus?.nextMilestone;
  const tier = getTier(streak);
  const cfg = TIER_CONFIG[tier];
  const progress = getProgressInTier(streak);

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
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* 彈窗主體 */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none"
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

              {/* 卡片主體 */}
              <div className="rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden">

                {/* 頂部等級橫幅 */}
                <div
                  className="px-5 py-3"
                  style={{
                    background: `linear-gradient(135deg, ${cfg.gradientFrom}33, ${cfg.gradientTo}22)`,
                    borderBottom: `1px solid ${cfg.gradientTo}33`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white">{cfg.label}等級</div>
                        <div className="text-[10px] text-white/50">{cfg.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white leading-none">{streak}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">連續天數</div>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-4">
                  <AnimatePresence mode="wait">
                    {!claimed ? (
                      /* ── 未簽到狀態 ── */
                      <motion.div
                        key="unclaimed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        {/* 今日積分獎勵 */}
                        <div className={`rounded-xl border ${cfg.borderClass} ${cfg.bgClass} p-4 text-center`}>
                          <div className="text-xs text-slate-500 mb-1">今日簽到可獲得</div>
                          <motion.div
                            animate={{ scale: [1, 1.06, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className={`text-5xl font-black ${cfg.textClass}`}
                          >
                            +{todayPoints}
                          </motion.div>
                          <div className="text-xs text-slate-500 mt-1">天命積分</div>
                          {balance > 0 && (
                            <div className="text-xs text-slate-600 mt-2">
                              目前餘額：<span className="text-amber-500 font-medium">{balance}</span> 分
                            </div>
                          )}
                        </div>

                        {/* 連續天數進度條 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">連續簽到進度</span>
                            {nextMilestone && nextMilestone.daysToNext > 0 ? (
                              <span className="text-slate-500">
                                再 <span className={`font-bold ${cfg.textClass}`}>{nextMilestone.daysToNext}</span> 天 → +{nextMilestone.nextPoints}分/天
                              </span>
                            ) : (
                              <span className="text-yellow-400 font-bold text-[11px]">已達最高等級 ✦</span>
                            )}
                          </div>

                          {/* 進度條 */}
                          <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress * 100}%` }}
                              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                              className={`h-full rounded-full ${cfg.barClass}`}
                            />
                            {/* 光澤效果 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-full pointer-events-none" />
                          </div>

                          {/* 里程碑節點 */}
                          <div className="flex items-start justify-between pt-1 px-0.5">
                            <MilestoneNode day={1} label="第1天" icon="🌱" reached={streak >= 1} isCurrent={streak === 1} />
                            <MilestoneNode day={6} label="第6天" icon="🥈" reached={streak >= 6} isCurrent={streak === 6} />
                            <MilestoneNode day={20} label="第20天" icon="🥇" reached={streak >= 20} isCurrent={streak === 20} />
                            <MilestoneNode day={30} label="第30天" icon="👑" reached={streak >= 30} isCurrent={streak === 30} />
                          </div>
                        </div>

                        {/* 三等級說明卡片 */}
                        <div className="grid grid-cols-3 gap-2">
                          {(["bronze", "silver", "gold"] as Tier[]).map((t) => {
                            const tc = TIER_CONFIG[t];
                            const isActive = tier === t;
                            return (
                              <div
                                key={t}
                                className={`rounded-xl px-2 py-2.5 border text-center transition-all ${
                                  isActive
                                    ? `${tc.borderClass} ${tc.bgClass} ring-1 ${tc.borderClass}`
                                    : "border-slate-800 bg-slate-800/30 opacity-40"
                                }`}
                              >
                                <div className="text-lg leading-none mb-1">{tc.icon}</div>
                                <div className={`text-[10px] font-bold mb-0.5 ${isActive ? tc.textClass : "text-slate-600"}`}>
                                  {tc.label}
                                </div>
                                <div className={`text-[9px] leading-tight ${isActive ? "text-white/60" : "text-slate-700"}`}>
                                  {t === "bronze" ? "1-5天\n+10/天" : t === "silver" ? "6-19天\n+15/天" : "20天+\n+20/天"}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* 簽到按鈕 */}
                        <button
                          onClick={() => claimPoints.mutate()}
                          disabled={claimPoints.isPending}
                          className="w-full py-3.5 rounded-2xl font-bold text-base transition-all active:scale-95 disabled:opacity-60 shadow-lg flex items-center justify-center gap-2 text-black"
                          style={{
                            background: `linear-gradient(135deg, ${cfg.gradientFrom}, ${cfg.gradientTo})`,
                            boxShadow: `0 8px 24px ${cfg.gradientTo}40`,
                          }}
                        >
                          {claimPoints.isPending ? (
                            <span className="animate-spin text-xl">⟳</span>
                          ) : (
                            <>
                              <span className="text-lg">{cfg.icon}</span>
                              <span>簽到領取 +{todayPoints} 積分</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleClose}
                          className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
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
                        {claimResult?.isStreakMilestone ? (
                          /* 里程碑達成特殊動畫 */
                          <>
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: [0, 1.4, 1], rotate: [-180, 20, 0] }}
                              transition={{ duration: 0.7, times: [0, 0.6, 1] }}
                              className="text-7xl mx-auto w-fit"
                            >
                              {(claimResult.newStreak ?? 0) >= 20 ? "🥇" : "🥈"}
                            </motion.div>
                            <div>
                              <h2 className="text-xl font-black text-white mb-1">等級提升！</h2>
                              <p className="text-sm text-amber-400 font-medium px-2">
                                {claimResult.milestoneMessage}
                              </p>
                            </div>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className={`rounded-xl border ${
                                (claimResult.newStreak ?? 0) >= 20
                                  ? "border-yellow-500/40 bg-yellow-900/20"
                                  : "border-slate-500/40 bg-slate-700/20"
                              } py-4`}
                            >
                              <div className={`text-4xl font-black ${
                                (claimResult.newStreak ?? 0) >= 20 ? "text-yellow-400" : "text-slate-300"
                              }`}>
                                +{claimResult.pointsEarned}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">天命積分</div>
                              <div className="text-xs text-slate-500 mt-2">
                                新餘額：<span className="text-amber-400 font-semibold">{claimResult.newBalance}</span> 分
                              </div>
                            </motion.div>
                            <div className="text-xs text-slate-500">第 {claimResult.newStreak} 天連續簽到 ✦</div>
                          </>
                        ) : (
                          /* 一般簽到成功 */
                          <>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: [0, 1.3, 1] }}
                              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                              className="text-6xl mx-auto w-fit"
                            >
                              ✅
                            </motion.div>
                            <div>
                              <h2 className="text-xl font-bold text-white mb-1">簽到成功！</h2>
                              <p className="text-slate-400 text-sm">
                                第 <span className={`font-bold ${cfg.textClass}`}>{claimResult?.newStreak ?? streak + 1}</span> 天連續簽到
                              </p>
                            </div>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className={`rounded-xl border ${cfg.borderClass} ${cfg.bgClass} py-4`}
                            >
                              <div className={`text-4xl font-black ${cfg.textClass}`}>
                                +{claimResult?.pointsEarned ?? todayPoints}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">天命積分</div>
                              <div className="text-xs text-slate-500 mt-2">
                                新餘額：<span className="text-amber-400 font-semibold">{claimResult?.newBalance ?? balance}</span> 分
                              </div>
                            </motion.div>

                            {/* 下一里程碑鼓勵提示 */}
                            {claimResult && (claimResult.newStreak ?? 0) < 20 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-xs text-slate-500 bg-slate-800/50 rounded-xl px-4 py-2.5 leading-relaxed"
                              >
                                {(claimResult.newStreak ?? 0) < 6
                                  ? `🥈 再 ${6 - (claimResult.newStreak ?? 0)} 天連續簽到可升白銀，每日 +15 分`
                                  : `🥇 再 ${20 - (claimResult.newStreak ?? 0)} 天連續簽到可升黃金，每日 +20 分`
                                }
                              </motion.div>
                            )}
                            {claimResult && (claimResult.newStreak ?? 0) >= 20 && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-xs text-yellow-400/70 bg-yellow-900/20 rounded-xl px-4 py-2.5"
                              >
                                👑 已達黃金等級，繼續保持！
                              </motion.div>
                            )}
                          </>
                        )}
                        <p className="text-xs text-slate-700">即將關閉...</p>
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
