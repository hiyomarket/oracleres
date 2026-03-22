import { useState, useEffect, useMemo } from "react";
import { getTarotCardUrl } from "@/lib/tarotCards";
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
  // 讀取用戶性別，用於塔羅牌圖片版本切換
  const { data: profileData } = trpc.account.getProfile.useQuery(undefined, { staleTime: 300000 });
  const userGender = (profileData?.gender as 'male' | 'female' | null) ?? null;

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
  // V11.1 今日特殊事件選擇
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  // V11.1 大運資訊查詢
  const { data: daYunData } = trpc.v11.getDaYun.useQuery(undefined, { staleTime: 60 * 60 * 1000 });

  // V11.1 決策支持報告查詢
  const { data: decisionData } = trpc.v11.getDailyDecision.useQuery(
    { date: selectedDate },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // V11.2 情境共振穿搭 V3.0（依 selectedEvent 動態查詢）
  const { data: outfitV3Data, isLoading: outfitV3Loading } = trpc.v11.getOutfitV3.useQuery(
    {
      tenGod: data?.tenGod?.main ?? '食神',
      dailyStrategy: (data?.strategy as { strategyName?: string })?.strategyName ?? '均衡守成',
      moonPhaseName: data?.moon?.phase ?? '上弦月',
      moonPhaseType: (data?.moon as { phaseType?: string })?.phaseType ?? 'first_quarter',
      userContext: selectedEvent ? { event: selectedEvent as 'important_meeting' | 'date' | 'interview' | 'creative_work' | 'negotiation' | 'rest' | 'creative_presentation' | 'rest_day' } : undefined,
    },
    {
      enabled: !!selectedEvent && !!data,
      staleTime: 0,
    }
  );
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

  // SEO: 動態設定頁面標題（需在資料載入後設定）
  useEffect(() => {
    if (!data) return;
    const dateLabel = isViewingToday ? '今日' : data.date.gregorian.replace(/\d{4}年/, '');
    document.title = `天命共振 — ${dateLabel}運勢·${data.tenGod.main}·${data.date.dayPillar}日柱·月相${data.moon.phase} | 八字命理系統`;
    return () => {
      document.title = '天命共振 — 八字命理、每日運勢、擲筊問卦、選號輔助系統 | 命理智慧平台';
    };
  }, [data, isViewingToday]);

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
        {/* SEO H2 標題：視覚隱藏但機器可讀 */}
        <h2 className="sr-only">今日天命分析—十神能量、塔羅流日、時辰運勢與命理格言</h2>
        <div className="space-y-6">
          {/* ═══ V11.3 順序調整完成：特殊事件→決策指南→塔羅→時辰→大運→格言→能量/月相 ═══ */}

          {/* ═══ V11.1 今日特殊事件 + 神喻穿搭 V3.0（第三位） ═══ */}
          <SectionCard title="今日特殊事件" icon="✨">
            <div className="mb-4">
              <p className="text-white/50 text-xs mb-3">選擇今日情境，穿搭引擎將針對你的事件進行共振調整</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'important_meeting', label: '重要會議', icon: '💼', color: 'border-slate-400/40 hover:border-slate-300/60' },
                  { key: 'interview',         label: '面試',     icon: '🎯', color: 'border-blue-400/40 hover:border-blue-300/60' },
                  { key: 'date',              label: '約會',     icon: '💫', color: 'border-pink-400/40 hover:border-pink-300/60' },
                  { key: 'negotiation',       label: '商業談判', icon: '🤝', color: 'border-amber-400/40 hover:border-amber-300/60' },
                  { key: 'creative_presentation', label: '創意發表', icon: '🎨', color: 'border-orange-400/40 hover:border-orange-300/60' },
                  { key: 'rest_day',          label: '靜養充電', icon: '🌿', color: 'border-emerald-400/40 hover:border-emerald-300/60' },
                ].map(evt => (
                  <button
                    key={evt.key}
                    onClick={() => setSelectedEvent(selectedEvent === evt.key ? null : evt.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      selectedEvent === evt.key
                        ? 'bg-amber-500/20 border-amber-400/70 text-amber-300 shadow-lg shadow-amber-500/10'
                        : `bg-white/5 ${evt.color} text-white/60 hover:text-white/80`
                    }`}
                  >
                    <span className="text-base">{evt.icon}</span>
                    <span>{evt.label}</span>
                    {selectedEvent === evt.key && <span className="ml-auto text-amber-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            {selectedEvent && data && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-amber-400 text-xs font-semibold uppercase tracking-widest">情境共振穿搭建議</div>
                  {outfitV3Loading && <div className="text-amber-400/60 text-[10px] animate-pulse">天命共振計算中…</div>}
                </div>
                {outfitV3Data ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {[{
                        label: '上衣', value: outfitV3Data.topColor ?? '—', element: outfitV3Data.topElement ?? ''
                      }, {
                        label: '下裝', value: outfitV3Data.bottomColor ?? '—', element: outfitV3Data.bottomElement ?? ''
                      }, {
                        label: '鞋子', value: outfitV3Data.shoesColor ?? '—', element: outfitV3Data.shoesElement ?? ''
                      }, {
                        label: '配件', value: outfitV3Data.accentColor ?? '—', element: ''
                      }].map((item, i) => (
                        <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                          <div className="text-white/40 text-[10px] mb-1">{item.label}</div>
                          <div className="text-white text-sm font-medium">{item.value}</div>
                          {item.element && <div className="text-amber-400/60 text-[10px] mt-0.5">{item.element}</div>}
                        </div>
                      ))}
                    </div>
                    {outfitV3Data.contextNote && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                        <p className="text-amber-200/80 text-xs leading-relaxed">{outfitV3Data.contextNote}</p>
                      </div>
                    )}
                    {outfitV3Data.reasoning && (
                      <div className="rounded-lg bg-white/3 border border-white/8 p-3">
                        <p className="text-white/60 text-xs leading-relaxed">{outfitV3Data.reasoning}</p>
                      </div>
                    )}
                    {selectedEvent === 'rest_day' && (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                        <p className="text-emerald-300 text-xs">🌿 靜養充電日已切換「均衡守成」模式——不強制補強，讓命格自然呼吸。今日穿著舒適中性色系，是對自己最好的照顧。</p>
                      </div>
                    )}
                  </>
                ) : !outfitV3Loading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {['上衣', '下裝', '鞋子', '配件'].map((label, i) => (
                      <div key={i} className="rounded-lg bg-white/5 border border-white/10 p-2.5">
                        <div className="text-white/40 text-[10px] mb-1">{label}</div>
                        <div className="text-white/30 text-sm">—</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </motion.div>
            )}
          </SectionCard>

          {/* ═══ 四：今日決策指南 ═══ */}
          {decisionData && (
            <SectionCard title="今日決策指南" icon="📊">
              <div className="space-y-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-white/80 text-sm">{decisionData.dailySummary}</p>
                  {decisionData.daYunContext && (
                    <p className="text-amber-400/60 text-xs mt-2">{decisionData.daYunContext}</p>
                  )}
                </div>
                {(() => {
                  const advices = decisionData.advices ?? [];
                  const LABELS: Record<string, string> = {
                    career: '事業', finance: '財務', relationship: '人際',
                    health: '健康', creativity: '創意', travel: '出行'
                  };
                  const N = advices.length;
                  const cx = 120, cy = 120, maxR = 90;
                  const points = advices.map((a, i) => {
                    const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const r = (a.score / 10) * maxR;
                    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
                  });
                  const gridPoints = (r: number) => advices.map((_, i) => {
                    const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
                  }).join(' ');
                  const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
                  return (
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                      <svg viewBox="0 0 240 240" className="w-48 h-48 shrink-0">
                        {[0.25, 0.5, 0.75, 1].map(ratio => (
                          <polygon key={ratio} points={gridPoints(maxR * ratio)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        ))}
                        {advices.map((_, i) => {
                          const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                          return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
                        })}
                        <polygon points={polyPoints} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="1.5" />
                        {points.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="3" fill={advices[i].score >= 8 ? '#f59e0b' : advices[i].score >= 6 ? '#10b981' : '#6b7280'} />
                        ))}
                        {advices.map((a, i) => {
                          const angle = (i * 2 * Math.PI / N) - Math.PI / 2;
                          const lx = cx + (maxR + 18) * Math.cos(angle);
                          const ly = cy + (maxR + 18) * Math.sin(angle);
                          return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill={a.category === decisionData.bestCategory ? '#fbbf24' : 'rgba(255,255,255,0.5)'}>{LABELS[a.category]}</text>;
                        })}
                      </svg>
                      <div className="flex-1 space-y-2 w-full">
                        {advices.sort((a, b) => b.score - a.score).map(a => (
                          <div key={a.category} className={`rounded-lg p-2.5 border ${
                            a.category === decisionData.bestCategory ? 'border-amber-500/40 bg-amber-500/8'
                            : a.category === decisionData.cautionCategory ? 'border-red-500/30 bg-red-500/5'
                            : 'border-white/8 bg-white/3'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${
                                a.category === decisionData.bestCategory ? 'text-amber-300'
                                : a.category === decisionData.cautionCategory ? 'text-red-400' : 'text-white/60'
                              }`}>
                                {LABELS[a.category]}
                                {a.category === decisionData.bestCategory && ' ★ 今日最佳'}
                                {a.category === decisionData.cautionCategory && ' ⚠ 需謹慎'}
                              </span>
                              <span className={`text-sm font-bold ${
                                a.score >= 8 ? 'text-amber-400' : a.score >= 6 ? 'text-emerald-400' : 'text-slate-400'
                              }`}>{a.score}/10</span>
                            </div>
                            {a.bestHour && <div className="text-[10px] text-amber-400/70 mb-1">⏰ 最佳時辰：{a.bestHour}</div>}
                            <p className="text-white/50 text-[11px] leading-relaxed">{a.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </SectionCard>
          )}

          {/* ═══ 五：今日塔羅牌指引 ═══ */}
          {(!isAdmin && !hasFeature("warroom_divination")) ? <FeatureLockedCard feature="warroom_divination" /> : (
            <SectionCard title="今日塔羅牌指引" icon="🃏">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="shrink-0 mx-auto md:mx-0">
                  <motion.div
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-32 h-48 rounded-xl border-2 border-amber-500/40 overflow-hidden shadow-xl shadow-amber-500/20 relative"
                  >
                    <img src={getTarotCardUrl(data.tarot.cardNumber, userGender)} alt={data.tarot.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                      <div className="text-amber-300 font-bold text-center text-xs">{data.tarot.name}</div>
                      <div className="text-amber-500/70 text-[10px] text-center">第 {data.tarot.cardNumber} 號</div>
                    </div>
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

          {/* ═══ 六：大運背景共振 ═══ */}
          {daYunData && (
            <SectionCard title="大運背景共振" icon="🌀">
              {(() => {
                const dy = daYunData.currentDaYun;
                const ELEMENT_COMPATIBLE: Record<string, string[]> = {
                  '木': ['木', '水', '火'], '火': ['火', '木', '土'],
                  '土': ['土', '火', '金'], '金': ['金', '土', '水'], '水': ['水', '金', '木'],
                };
                const todayWuxing = data.tenGod.wuxing;
                const daYunElement = dy.element;
                const compatible = ELEMENT_COMPATIBLE[daYunElement]?.includes(todayWuxing);
                const resonanceScore = compatible ? (
                  daYunElement === todayWuxing ? 95 : ELEMENT_COMPATIBLE[daYunElement]?.[1] === todayWuxing ? 80 : 70
                ) : (
                  todayWuxing === '水' && daYunElement === '火' ? 30 : todayWuxing === '火' && daYunElement === '水' ? 30 :
                  todayWuxing === '金' && daYunElement === '木' ? 30 : todayWuxing === '木' && daYunElement === '金' ? 30 : 45
                );
                const isResonant = resonanceScore >= 70;
                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-white/40 text-xs mb-1">當前大運（{dy.startAge}–{dy.endAge}歲）</div>
                        <div className="text-2xl font-black text-white">{dy.stem}{dy.branch}</div>
                        <div className="text-amber-400 text-sm font-semibold mt-1">{dy.role} · {dy.element}運</div>
                        <div className="text-white/50 text-xs mt-1">剩餘 {dy.yearsRemaining} 年</div>
                      </div>
                      <div className="relative w-20 h-20 shrink-0">
                        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                          <circle cx="40" cy="40" r="32" fill="none" stroke={isResonant ? '#f59e0b' : '#6b7280'} strokeWidth="8"
                            strokeDasharray={`${2 * Math.PI * 32}`}
                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - resonanceScore / 100)}`}
                            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-xl font-black ${isResonant ? 'text-amber-400' : 'text-slate-400'}`}>{resonanceScore}</span>
                          <span className="text-[9px] text-white/40">共振</span>
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-xl border p-3 ${isResonant ? 'border-amber-500/40 bg-amber-500/8' : 'border-slate-500/30 bg-slate-500/5'}`}>
                      <div className={`text-sm font-bold mb-1 ${isResonant ? 'text-amber-300' : 'text-slate-400'}`}>
                        {isResonant ? '⚡ 大運順風日' : '🌧 大運逆風日'}
                      </div>
                      <p className={`text-xs ${isResonant ? 'text-amber-200/70' : 'text-slate-400/70'}`}>
                        {isResonant
                          ? `今日${todayWuxing}能量與大運${daYunElement}運方向一致，行動力加倍，適合推進重要事項。`
                          : `今日${todayWuxing}能量與大運${daYunElement}運方向相剋，宜守不宜攻，謹慎評估後再行動。`}
                      </p>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed">{dy.theme}</p>
                  </div>
                );
              })()}
            </SectionCard>
          )}

          {/* ═══ 七：本日天命格言 ═══ */}
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

          {/* ═══ 八：今日能量指引 + 月相能量 ═══ */}
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

        </div>


        </main>
      )}
    </div>
  );
}
