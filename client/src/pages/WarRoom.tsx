import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { ProfileIncompleteBanner } from "@/components/ProfileIncompleteBanner";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { Zap, Bell, CheckCircle, Trophy, ChevronRight, X, Swords } from "lucide-react";
import { toast } from "sonner";
import { NearbyRestaurants } from "@/components/NearbyRestaurants";
import { useLocation } from "wouter";

/** WBC 活動推廣橫幅：有待開賽賽事時顯示，且 WBC 開關為開啟 */
function WbcPromoBanner() {
  const [, navigate] = useLocation();
  const { data: wbcConfig } = trpc.marketing.getWbcEnabled.useQuery(undefined, { staleTime: 60000 });
  const { data: matches } = trpc.wbc.getMatches.useQuery({ status: "pending" }, { staleTime: 60000, enabled: wbcConfig?.enabled !== false });
  const pendingMatches = (matches ?? []).filter(m => m.status === "pending");
  if (!wbcConfig?.enabled) return null;
  if (pendingMatches.length === 0) return null;
  const next = pendingMatches[0];
  const matchDate = new Date(next.matchTime);
  const dateStr = matchDate.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div
      className="mx-4 mt-2 mb-0 cursor-pointer"
      onClick={() => navigate("/casino/wbc")}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-900/30 via-orange-900/20 to-amber-900/30 border border-amber-600/30 rounded-xl hover:border-amber-500/50 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-400">WBC 2026 天命競猜</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">進行中</span>
          </div>
          <p className="text-xs text-white/50 truncate">
            下場 {next.teamAFlag}{next.teamA} vs {next.teamBFlag}{next.teamB} · {dateStr}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-amber-500/60 shrink-0" />
      </div>
    </div>
  );
}

// 五行顏色映射
const WUXING_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  火: { bg: "bg-red-950/40", border: "border-red-500/50", text: "text-red-400", glow: "shadow-red-500/20" },
  土: { bg: "bg-amber-950/40", border: "border-amber-500/50", text: "text-amber-400", glow: "shadow-amber-500/20" },
  金: { bg: "bg-slate-800/40", border: "border-slate-400/50", text: "text-slate-300", glow: "shadow-slate-400/20" },
  水: { bg: "bg-blue-950/40", border: "border-blue-500/50", text: "text-blue-400", glow: "shadow-blue-500/20" },
  木: { bg: "bg-emerald-950/40", border: "border-emerald-500/50", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
};

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return "text-amber-400";
  if (score >= 6) return "text-emerald-400";
  if (score >= 4) return "text-blue-400";
  return "text-slate-400";
};

// 中文標籤 → 顏色
 const ENERGY_LABEL_COLOR: Record<string, string> = {
  大吉: "text-amber-400",
  吉: "text-emerald-400",
  平: "text-blue-400",
  凶: "text-red-400",
  大凶: "text-red-600",
};
// 英文 level → 顏色（備用）
const ENERGY_LEVEL_COLOR: Record<string, string> = {
  excellent: "text-amber-400",
  good: "text-emerald-400",
  neutral: "text-blue-400",
  challenging: "text-red-400",
  complex: "text-purple-400",
};

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = score >= 8 ? "from-amber-500 to-orange-400" : score >= 6 ? "from-emerald-500 to-teal-400" : score >= 4 ? "from-blue-500 to-cyan-400" : "from-slate-500 to-slate-400";
  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
      />
    </div>
  );
}

function SectionCard({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// 取得台灣時間的 YYYY-MM-DD 字串
function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split('T')[0];
}

// 取得台灣時間今天是星期幾（0=日）
function getTaiwanWeekday(offsetDays = 0): number {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).getUTCDay();
}

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

/** WBC 活動彈窗：每天首次進入首頁顯示一次 */
function WbcPromoModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const { data: matches } = trpc.wbc.getMatches.useQuery({ status: "pending" }, { staleTime: 60000 });
  const pendingMatches = (matches ?? []).filter(m => m.status === "pending");
  const next = pendingMatches[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-sm bg-gradient-to-b from-[#1a1000] to-[#0a0f1a] border border-amber-600/40 rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/30"
          onClick={e => e.stopPropagation()}
        >
          {/* 頂部裝飾光效 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-amber-500/10 blur-2xl rounded-full" />

          {/* 進入按鈕 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>

          {/* 內容 */}
          <div className="px-6 pt-8 pb-6">
            {/* 圖標區 */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
                  <Swords className="w-8 h-8 text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border border-red-400 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">NEW</span>
                </div>
              </div>
            </div>

            {/* 標題 */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-black text-white mb-1">WBC 2026 天命競猜</h2>
              <p className="text-amber-400/80 text-sm">世界棒球經典賽小預測，用天命磁場贏得天命幣！</p>
            </div>

            {/* 活動資訊 */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">✓</span>
                <span>A/B/C/D 四組 40 場賽事全開放競猜</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">✓</span>
                <span>中華台北對戰日本、韓國等熱門賽事</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">✓</span>
                <span>正確預測可累積天命幣獎勵</span>
              </div>
            </div>

            {/* 下一場賽事預覽 */}
            {next && (
              <div className="mb-5 p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-white/40 mb-1">下一場賽事</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{next.teamAFlag}{next.teamA} vs {next.teamBFlag}{next.teamB}</span>
                  <span className="text-xs text-amber-400">
                    {new Date(next.matchTime).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            )}

            {/* 行動按鈕 */}
            <button
              onClick={() => { onClose(); navigate("/casino/wbc"); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-sm transition-all shadow-lg shadow-amber-900/30"
            >
              前往競猜頁面 →
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              今日不再提醒
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function WarRoom() {
  const { hasFeature, isAdmin } = usePermissions();
  const { data: accountStatus } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const isOwner = accountStatus?.isOwner ?? false;

  // WBC 彈窗：每天首次進入顯示，且 WBC 開關為開啟
  const { data: wbcEnabledData } = trpc.marketing.getWbcEnabled.useQuery(undefined, { staleTime: 60000 });
  const [showWbcModal, setShowWbcModal] = useState(false);
  useEffect(() => {
    if (wbcEnabledData?.enabled === false) return; // WBC 已關閉
    if (wbcEnabledData === undefined) return; // 尚未載入
    const today = new Date().toISOString().split('T')[0];
    const key = `wbc_modal_shown_${today}`;
    if (!localStorage.getItem(key)) {
      // 延遲 1.5 秒再顯示，避免頁面剛載入就彈出
      const t = setTimeout(() => {
        setShowWbcModal(true);
        localStorage.setItem(key, '1');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [wbcEnabledData]);
  // 七日選擇器：0=今天，1=明天，...，-1=昨天
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);
  const todayDate = getTaiwanDateStr(0);
  const isViewingToday = selectedDate === todayDate;

  const { data, isLoading, error } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );
  // 統一購彩指數（與選號頁同一引擎）
  const purchaseAdviceQuery = trpc.lottery.purchaseAdvice.useQuery(
    { targetDate: selectedDate },
    { staleTime: 5 * 60 * 1000 }
  );
  // 統一偶財指數：優先用 purchaseAdvice 的 compositeScore，如果尚未載入則用 dailyReport 的 lotteryIndex
  const unifiedLotteryIndex = purchaseAdviceQuery.data
    ? purchaseAdviceQuery.data.compositeScore
    : data?.wealthCompass?.lotteryIndex ?? 5;
  const unifiedLotteryAdvice = purchaseAdviceQuery.data
    ? purchaseAdviceQuery.data.lotteryTypeAdvice
    : data?.wealthCompass?.lotteryAdvice ?? '';

  const [currentTime, setCurrentTime] = useState(new Date());
  // Tab 已移除，改為垂直排列

  // 本週最旺時辰通知
  const [notified, setNotified] = useState(false);
  const notifyBestHourMutation = trpc.warRoom.notifyBestHour.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        setNotified(true);
        toast.success('通知已發送到 Mail ！');
      } else {
        toast.error('發送失敗，請稍後再試');
      }
    },
    onError: () => toast.error('發送失敗，請稍後再試'),
  });

  // 手串佩戴記錄
  const utils = trpc.useUtils();
  const { data: wearLogs } = trpc.braceletWear.getByDate.useQuery(
    { wearDate: selectedDate },
    { staleTime: 30 * 1000 }
  );
  const toggleWear = trpc.braceletWear.toggle.useMutation({
    onSuccess: () => utils.braceletWear.getByDate.invalidate({ wearDate: selectedDate }),
  });

  // 建立已佩戴手串的 Set（key = braceletId + hand）
  const wornSet = useMemo(() => {
    const s = new Set<string>();
    if (wearLogs) {
      for (const log of wearLogs) s.add(`${log.braceletId}-${log.hand}`);
    }
    return s;
  }, [wearLogs]);

  const handleToggleWear = (braceletId: string, braceletName: string, hand: "left" | "right") => {
    const isWearing = !wornSet.has(`${braceletId}-${hand}`);
    toggleWear.mutate({
      wearDate: selectedDate,
      braceletId,
      braceletName,
      hand,
      dayStem: data?.date?.currentHourStem,
      tenGod: data?.tenGod?.main,
      isWearing,
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  if (isLoading) {
    return (
      <div className="min-h-screen oracle-page flex flex-col">
          <SharedNav currentPage="warRoom" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full"
            />
            <p className="text-amber-400/70 text-sm tracking-widest">正在推演今日天命...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen oracle-page flex flex-col">
          <SharedNav currentPage="warRoom" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-red-400">無法載入今日運勢，請稍後再試</p>
        </main>
      </div>
    );
  }

  const wuxingTheme = WUXING_COLORS[data.tenGod.wuxing] || WUXING_COLORS["木"];

  return (
    <div className="min-h-screen oracle-page flex flex-col">
      {/* WBC 活動彈窗 */}
      {showWbcModal && <WbcPromoModal onClose={() => setShowWbcModal(false)} />}
      {/* 背景動態光效 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 ${data.tenGod.wuxing === "火" ? "bg-red-500" : data.tenGod.wuxing === "土" ? "bg-amber-500" : data.tenGod.wuxing === "金" ? "bg-slate-400" : data.tenGod.wuxing === "水" ? "bg-blue-500" : "bg-emerald-500"}`} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="warRoom" />
      <ProfileIncompleteBanner featureName="每日運勢" />
      {/* WBC 活動推廣橫幅 */}
      <WbcPromoBanner />
      {!isAdmin && !hasFeature("warroom") && <FeatureLockedCard feature="warroom" />}
      {(isAdmin || hasFeature("warroom")) && (
        <main className="flex-1 container max-w-6xl mx-auto px-4 py-6 pb-24 relative z-10 oracle-page-content">
        {/* ═══ 模塊A：頂部核心數據看板 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* 標題列 - 桌機版英雄式佈局 */}
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-wide leading-tight">
                ⚔️ {isViewingToday ? "今日運勢" : `${data.date.gregorian.replace(/\d{4}年/, '')}運勢`}
              </h1>
              <p className="text-white/40 text-xs mt-2 tracking-[0.3em]">WAR ROOM · ORACLE RESONANCE</p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${wuxingTheme.border} ${wuxingTheme.bg} ${wuxingTheme.text}`}>
                  {data.tenGod.main} · {data.tenGod.role}
                </span>
                <span className="text-white/40 text-sm">{data.date.dayPillar}日柱</span>
                <span className="text-white/30 text-sm hidden md:inline">{data.date.yearPillar} · {data.date.monthPillar} · {data.date.dayPillar}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              {isViewingToday && (
                <div className="text-amber-400 font-mono text-2xl md:text-4xl font-bold tabular-nums">{timeStr}</div>
              )}
              <div className="text-white/50 text-sm mt-1">{data.date.gregorian}</div>
              <div className="text-white/40 text-xs">週{data.date.weekday} · 農曆{data.date.lunar}</div>
            </div>
          </div>

          {/* ═══ 本週七日選擇器 ═══ */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[-1, 0, 1, 2, 3, 4, 5].map(offset => {
              const dateStr = getTaiwanDateStr(offset);
              const dayParts = dateStr.split('-');
              const dayNum = parseInt(dayParts[2]);
              const weekday = getTaiwanWeekday(offset);
              const isToday = offset === 0;
              const isSelected = selectedOffset === offset;
              // 查詢本週購彩指數，標記最佳日
              const weeklyScore = data?.weeklyLotteryScores?.find((s: { date: string; isBest?: boolean }) => s.date === dateStr);
              const isBestDay = weeklyScore?.isBest === true;
              return (
                <button
                  key={offset}
                  onClick={() => setSelectedOffset(offset)}
                  className={`relative flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all duration-200 min-w-[52px] ${
                    isSelected
                      ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                      : isBestDay
                      ? 'border-yellow-400/60 bg-yellow-400/10 text-white'
                      : isToday
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70'
                  }`}
                  style={isBestDay && !isSelected ? { boxShadow: '0 0 10px 2px rgba(251,191,36,0.35)' } : undefined}
                >
                  {/* 最旺購彩日金色光暈 */}
                  {isBestDay && (
                    <span
                      className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-xs bg-yellow-400 text-black font-bold rounded-full px-1.5 leading-5"
                      style={{ fontSize: '9px', whiteSpace: 'nowrap' }}
                    >
                      最旺
                    </span>
                  )}
                  <span className="text-xs font-medium">週{WEEKDAY_NAMES[weekday]}</span>
                  <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-amber-300' : isBestDay ? 'text-yellow-300' : ''}`}>{dayNum}</span>
                  {isToday && (
                    <span className="text-xs text-amber-400/80 font-semibold">今日</span>
                  )}
                  {!isToday && offset < 0 && (
                    <span className="text-xs text-white/30">昨日</span>
                  )}
                  {!isToday && offset > 0 && (
                    <span className="text-xs text-white/30">預測</span>
                  )}
                  {/* 購彩分數小標記 */}
                  {weeklyScore && (
                    <span className={`text-xs font-medium mt-0.5 ${
                      weeklyScore.compositeScore >= 8 ? 'text-yellow-400' :
                      weeklyScore.compositeScore >= 6.5 ? 'text-amber-400' :
                      weeklyScore.compositeScore >= 5 ? 'text-white/40' : 'text-red-400/60'
                    }`}>
                      {weeklyScore.compositeScore.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 本週最旺時辰橫幅 */}
          {(() => {
            const bestEntry = data?.weeklyLotteryScores?.find((s: { isBest?: boolean }) => s.isBest);
            if (!bestEntry?.bestHour) return null;
            const { bestHour, compositeScore, dateLabel } = bestEntry;
            return (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-yellow-400/30 bg-yellow-400/8 px-4 py-2.5"
                style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.08) 0%, rgba(251,191,36,0.04) 100%)' }}
              >
                {/* 左側：雷電圖示 + 文字 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-yellow-300 text-xs font-bold tracking-wide">本週最旺購彩時機</span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-white font-semibold text-sm">{bestHour.weekdayName}</span>
                      <span className="text-yellow-200 font-bold text-sm">{bestHour.chineseName}</span>
                      <span className="text-white/50 text-xs">{bestHour.displayTime}</span>
                      <span className="text-yellow-400/80 text-xs">&#x2022; 日綜 {compositeScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                {/* 右側：通知按鈕（僅主帳號顯示） */}
                {isOwner && <button
                  onClick={() => {
                    if (notified || notifyBestHourMutation.isPending) return;
                    notifyBestHourMutation.mutate({
                      bestDayLabel: bestHour.weekdayName,
                      bestHourName: bestHour.chineseName,
                      displayTime: bestHour.displayTime,
                      compositeScore,
                      energyScore: bestHour.energyScore,
                      dateLabel,
                    });
                  }}
                  disabled={notified || notifyBestHourMutation.isPending}
                  className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    notified
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 cursor-default'
                      : notifyBestHourMutation.isPending
                      ? 'bg-yellow-400/10 border border-yellow-400/30 text-yellow-400/50 cursor-wait'
                      : 'bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/25 active:scale-95'
                  }`}
                >
                  {notified ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> 已發送</>
                  ) : notifyBestHourMutation.isPending ? (
                    <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-yellow-400/50 border-t-yellow-400 rounded-full" /> 發送中</>
                  ) : (
                    <><Bell className="w-3.5 h-3.5" /> 通知 Mail</>
                  )}
                </button>}
              </motion.div>
            );
          })()}

          {/* 核心數據橫排 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 mb-4">
            {/* 農曆 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">農曆</div>
              <div className="text-white font-medium text-sm">{data.date.lunar}</div>
              {data.date.nearestSolarTerm && (
                <div className="text-amber-400/70 text-xs mt-1">
                  距{data.date.nearestSolarTerm.name} {data.date.nearestSolarTerm.daysUntil}天
                </div>
              )}
            </div>
            {/* 四柱 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">今日四柱</div>
              <div className="text-white font-medium text-sm">
                <span className="text-white/50">{data.date.yearPillar}</span>
                <span className="text-white/50 mx-1">·</span>
                <span className="text-white/50">{data.date.monthPillar}</span>
                <span className="text-white/50 mx-1">·</span>
                <span className="text-amber-300 font-bold">{data.date.dayPillar}</span>
              </div>
              <div className="text-white/40 text-xs mt-1">日柱高亮</div>
            </div>
            {/* 當前時辰 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">當前時辰</div>
              <div className="text-white font-medium">{data.date.currentHourName}</div>
              <div className="text-white/50 text-xs">{data.date.currentHourStem}{data.hourEnergy.current.branch}時</div>
            </div>
            {/* 月相 */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
              <div className="text-white/40 text-xs mb-1">月相</div>
              <div className="text-white font-medium">{data.moon.emoji} {data.moon.phase}</div>
              <div className="text-white/50 text-xs">農曆第{data.moon.lunarDay}日 · {data.moon.illumination}%</div>
            </div>
          </div>

          {/* 一句話總結 + 能量評分 */}
          <div className={`rounded-2xl border ${wuxingTheme.border} ${wuxingTheme.bg} p-5 shadow-lg ${wuxingTheme.glow}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className={`text-xs font-semibold ${wuxingTheme.text} uppercase tracking-widest mb-2`}>
                  今日天命一句話
                </div>
                <p className="text-white text-lg font-medium leading-relaxed">{data.oneLiner}</p>
                <p className="text-white/50 text-sm mt-2">{data.coreConflict}</p>
              </div>
              <div className="text-center shrink-0">
                <div className={`text-4xl font-bold ${SCORE_COLOR(data.overallScore)}`}>{data.overallScore}</div>
                <div className="text-white/40 text-xs">/10</div>
                <div className={`text-xs font-semibold mt-1 ${wuxingTheme.text}`}>{data.tenGod.main}</div>
                <div className="text-white/40 text-xs">{data.tenGod.role}</div>
              </div>
            </div>
            <div className="mt-3">
              <ScoreBar score={data.overallScore} />
            </div>
          </div>
        </motion.div>

        {/* ═══ 垂直排列區塊：本日天命格言 + 十神分析 + 月相 + 塔羅流日 + 時辰能量 ═══ */}
        <div className="space-y-6">
          {/* ═══ 本日天命格言 ═══ */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className={`rounded-2xl border ${wuxingTheme.border} ${wuxingTheme.bg} p-6 shadow-lg`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌳</span>
                <h3 className="text-base font-bold text-white/90 tracking-widest">本日天命格言</h3>
                <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border ${wuxingTheme.border} ${wuxingTheme.bg} ${wuxingTheme.text}`}>
                  {data.date.dayPillar}日 · {data.tenGod.main}當令
                </span>
              </div>
              <p className="text-white text-base md:text-lg leading-relaxed font-medium">{data.heroScript}</p>
            </div>
          </motion.div>

          {/* ═══ 十神能量 + 月相 並排 ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="今日能量指引" icon="☯️">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">今日主要能量</span>
                  <span className={`font-bold text-lg ${wuxingTheme.text}`}>{data.tenGod.main}</span>
                </div>
                <div className="text-white/80 text-sm">{data.tenGod.energy}</div>
                <ScoreBar score={data.tenGod.score} />
                <p className="text-white/60 text-xs">{data.tenGod.advice}</p>
                {data.tenGod.branchGods.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="text-white/40 text-xs mb-2">隐藏的能量</div>
                    <div className="flex gap-2 flex-wrap">
                      {data.tenGod.branchGods.map((bg: { stem: string; tenGod: string }, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                          {bg.stem} → {bg.tenGod}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
            <SectionCard title="月相能量" icon={data.moon.emoji}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">{data.moon.phase}</span>
                  <span className="text-white/50 text-sm">農曆第{data.moon.lunarDay}日</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="h-full rounded-full bg-gradient-to-r from-slate-400 to-white" style={{ width: `${data.moon.illumination}%` }} />
                </div>
                <p className="text-white/60 text-xs">{data.moon.castInfluence}</p>
                {data.moon.isFullMoon && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-amber-300 text-xs">
                    ✨ 滿月加持：今日聖杯機率 +10%
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ═══ 塔羅流日 ═══ */}
          {(!isAdmin && !hasFeature("warroom_divination")) ? <FeatureLockedCard feature="warroom_divination" /> : (
            <SectionCard title="今日塔羅牌指引" icon="🃏">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="shrink-0 mx-auto md:mx-0">
                  <motion.div
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-32 h-48 rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/60 to-slate-900/60 flex flex-col items-center justify-center shadow-xl shadow-amber-500/10"
                  >
                    <div className="text-4xl mb-2">{data.tarot.element === "火" ? "🔥" : data.tarot.element === "水" ? "💧" : data.tarot.element === "土" ? "🌍" : data.tarot.element === "風" ? "🌪️" : "⭐"}</div>
                    <div className="text-amber-300 font-bold text-center text-sm px-2">{data.tarot.name}</div>
                    <div className="text-amber-500/60 text-xs mt-1">第 {data.tarot.cardNumber} 號</div>
                  </motion.div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-amber-400 font-bold text-xl">{data.tarot.name}</div>
                    {isOwner && <div className="text-white/50 text-sm mt-1">計算方式：{data.tarot.calculation}</div>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {data.tarot.keywords.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">{kw}</span>
                    ))}
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-white/40 text-xs mb-2">今日的氣場</div>
                    <p className="text-white/80 text-sm">{data.tarot.energy}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <div className="text-amber-400/70 text-xs mb-2">今日建議你</div>
                    <p className="text-white/80 text-sm">{data.tarot.advice}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ═══ 時辰能量 ═══ */}
          <SectionCard title="今日各時段運勢" icon="⏰">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.hourEnergy.allHours.map((h: { name: string; branch: string; stem: string; score: number; level: string; label: string; isCurrent: boolean; displayTime: string }, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-lg p-3 border transition-all ${h.isCurrent ? "bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10" : "bg-white/3 border-white/10"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium text-sm ${h.isCurrent ? "text-amber-300" : "text-white/70"}`}>
                      {h.name} {h.isCurrent && <span className="text-amber-400 text-xs ml-1">●當前</span>}
                    </span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${h.label === "大吉" ? "bg-amber-500/20 text-amber-400" : h.label === "吉" ? "bg-emerald-500/20 text-emerald-400" : h.label === "平" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`}>
                      {h.label}
                    </span>
                  </div>
                  <div className="text-white/40 text-[10px]">{h.displayTime}</div>
                  <div className="mt-1.5">
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${h.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.04 }}
                        className={`h-full rounded-full ${h.score >= 80 ? "bg-gradient-to-r from-amber-500 to-orange-400" : h.score >= 60 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : h.score >= 40 ? "bg-gradient-to-r from-blue-500 to-cyan-400" : "bg-gradient-to-r from-red-600 to-red-500"}`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </SectionCard>
        </div>


        </main>
      )}
    </div>
  );
}
