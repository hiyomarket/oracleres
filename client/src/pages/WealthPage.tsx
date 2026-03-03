/**
 * WealthPage.tsx — 財運羅盤獨立頁面
 * 路由：/wealth
 * 資料來源：trpc.warRoom.dailyReport（wealthCompass + todayDirections + weeklyLotteryScores）
 */
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { SharedNav } from "@/components/SharedNav";
import { ProfileIncompleteBanner } from "@/components/ProfileIncompleteBanner";
import { cn } from "@/lib/utils";
import {
  TrendingUp, Compass, Zap, Target, ChevronRight,
  ArrowLeft, Coins, BarChart3, Clock, BookOpen, Flame, Droplets, Leaf, Mountain, CircleDot
} from "lucide-react";

// ─── 工具函式 ────────────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 8) return "text-amber-400";
  if (score >= 6.5) return "text-emerald-400";
  if (score >= 5) return "text-orange-400";
  return "text-red-400";
}
function getScoreBg(score: number): string {
  if (score >= 8) return "bg-amber-500/20 border-amber-500/40";
  if (score >= 6.5) return "bg-emerald-500/20 border-emerald-500/40";
  if (score >= 5) return "bg-orange-500/20 border-orange-500/40";
  return "bg-red-500/20 border-red-500/40";
}
function getScoreLabel(score: number): string {
  if (score >= 8) return "大吉・偏財強旺";
  if (score >= 6.5) return "吉・財運順暢";
  if (score >= 5) return "平・小額觀望";
  return "凶・暫緩偏財";
}
function getLevelEmoji(score: number): string {
  if (score >= 8) return "🌟";
  if (score >= 6.5) return "✨";
  if (score >= 5) return "⚡";
  return "🌑";
}

// ─── 偏財儀表盤 ─────────────────────────────────────────────────
function FortuneGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, (score / 10) * 100));
  const angle = -135 + (pct / 100) * 270; // -135° to +135°
  const colorClass = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* SVG 儀表 */}
      <div className="relative w-48 h-32">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          {/* 背景弧 */}
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* 進度弧 */}
          <path
            d="M 20 110 A 80 80 0 1 1 180 110"
            fill="none"
            stroke={score >= 8 ? "#f59e0b" : score >= 6.5 ? "#34d399" : score >= 5 ? "#fb923c" : "#ef4444"}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.2} 251.2`}
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
          {/* 指針 */}
          <g transform={`rotate(${angle}, 100, 110)`}>
            <line x1="100" y1="110" x2="100" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="110" r="5" fill="white" />
          </g>
          {/* 分數 */}
          <text x="100" y="95" textAnchor="middle" fontSize="28" fontWeight="bold"
            fill={score >= 8 ? "#f59e0b" : score >= 6.5 ? "#34d399" : score >= 5 ? "#fb923c" : "#ef4444"}>
            {score.toFixed(1)}
          </text>
          <text x="100" y="112" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.5)">/10</text>
        </svg>
      </div>
      <div className={cn("text-sm font-semibold", colorClass)}>
        {getLevelEmoji(score)} {getScoreLabel(score)}
      </div>
    </div>
  );
}

// ─── 七日走勢圖 ─────────────────────────────────────────────────
function WeeklyChart({ scores }: {
  scores: Array<{ date: string; dateLabel: string; compositeScore: number; levelLabel: string; isBest: boolean }>
}) {
  const maxScore = Math.max(...scores.map(s => s.compositeScore));
  const _now = new Date();
  const _utc8 = new Date(_now.getTime() + 8 * 60 * 60 * 1000);
  const today = _utc8.toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5 h-24">
        {scores.map((s) => {
          const isToday = s.date === today;
          const heightPct = (s.compositeScore / 10) * 100;
          const barColor = s.compositeScore >= 8
            ? "bg-amber-500"
            : s.compositeScore >= 6.5
            ? "bg-emerald-500"
            : s.compositeScore >= 5
            ? "bg-orange-500"
            : "bg-red-500/70";
          return (
            <div key={s.date} className="flex-1 flex flex-col items-center gap-1">
              {s.isBest && (
                <div className="text-[9px] text-amber-400 font-bold">最旺</div>
              )}
              {!s.isBest && <div className="text-[9px] text-transparent">.</div>}
              <div className="w-full flex items-end" style={{ height: "64px" }}>
                <div
                  className={cn("w-full rounded-t-sm transition-all duration-700", barColor, isToday && "ring-1 ring-white/50")}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* 日期標籤 */}
      <div className="flex gap-1.5">
        {scores.map((s) => {
          const isToday = s.date === today;
          return (
            <div key={s.date} className="flex-1 text-center">
              <div className={cn("text-[10px]", isToday ? "text-amber-400 font-bold" : "text-white/40")}>
                {s.dateLabel}
              </div>
              <div className={cn("text-[10px]", getScoreColor(s.compositeScore))}>
                {s.compositeScore.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 方位卡片 ────────────────────────────────────────────────────
function DirectionCard({ icon, label, direction, desc }: {
  icon: string; label: string; direction: string; desc: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-[11px] text-white/50 mb-0.5">{label}</div>
      <div className="text-base font-bold text-amber-400">{direction}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{desc}</div>
    </div>
  );
}

// ─── 本月財運走勢圖 ───────────────────────────────────────────
function MonthlyTrendSection() {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = twNow.getUTCFullYear();
  const month = twNow.getUTCMonth() + 1;
  const today = twNow.getUTCDate();

  const { data, isLoading } = trpc.wealth.getMonthlyTrend.useQuery({ year, month }, {
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">本月財運走勢</span>
        </div>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trend = data.trend;
  const maxScore = Math.max(...trend.map(d => d.score));
  const minScore = Math.min(...trend.map(d => d.score));
  const range = maxScore - minScore || 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">{year}年{month}月財運走勢</span>
        </div>
        <div className="text-xs text-white/40">平均 {data.summary.avgScore}/10</div>
      </div>

      {/* 横向滞動長條圖 */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-end gap-1" style={{ minWidth: `${trend.length * 18}px` }}>
          {trend.map((d) => {
            const height = Math.max(8, ((d.score - minScore) / range) * 60 + 8);
            const isToday = d.day === today;
            const barColor = d.score >= 8 ? 'bg-amber-400' : d.score >= 6.5 ? 'bg-emerald-400' : d.score >= 5 ? 'bg-orange-400' : 'bg-red-400';
            return (
              <div key={d.date} className="flex flex-col items-center gap-0.5" style={{ width: 16 }}>
                <div
                  className={cn('rounded-sm transition-all', barColor, isToday ? 'ring-1 ring-white/50' : 'opacity-70')}
                  style={{ height: `${height}px`, width: 10 }}
                  title={`${d.day}日 ${d.tenGod} ${d.score}/10${d.hasJournal ? ' • 有日記' : ''}`}
                />
                {d.hasJournal && <div className="w-1 h-1 rounded-full bg-purple-400" />}
                {isToday && <div className="text-[8px] text-amber-400 font-bold">今</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 摘要 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-white/40">最佳日</div>
          <div className="text-sm font-bold text-amber-400">{data.summary.bestDay?.day}日</div>
          <div className="text-xs text-white/50">{data.summary.bestDay?.score}/10</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-white/40">日記筆數</div>
          <div className="text-sm font-bold text-purple-400">{data.summary.journalCount}</div>
          <div className="text-xs text-white/50">筆記錄</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-xs text-white/40">本月累積中獎</div>
          <div className="text-sm font-bold text-emerald-400">${data.summary.totalWin.toLocaleString()}</div>
          <div className="text-xs text-white/50">元</div>
        </div>
      </div>
    </div>
  );
}

// ─── 財運日記 ─────────────────────────────────────────────────
function WealthJournalSection({ lotteryScore, tenGod }: { lotteryScore: number; tenGod: string }) {
  const [note, setNote] = useState('');
  const [didBuy, setDidBuy] = useState(false);
  const [amount, setAmount] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | 'pending'>('pending');
  const [winAmt, setWinAmt] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const utils = trpc.useUtils();

  const { data: journal } = trpc.wealth.getJournal.useQuery({ limit: 10 });
  const logEntry = trpc.wealth.logEntry.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      utils.wealth.getJournal.invalidate();
      utils.wealth.getMonthlyTrend.invalidate();
    },
  });

  const handleSave = () => {
    logEntry.mutate({
      lotteryScore,
      tenGod,
      note,
      didBuyLottery: didBuy,
      lotteryAmount: amount,
      lotteryResult: result,
      winAmount: winAmt,
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-purple-400">財運日記</span>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {showHistory ? '隱藏歷史' : '查看歷史'}
        </button>
      </div>

      {/* 日記輸入區 */}
      <div className="space-y-3">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="記錄今日財運心得、複盤感巴或行動筆記…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50"
          rows={3}
          maxLength={500}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={didBuy}
              onChange={e => setDidBuy(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5"
            />
            <span className="text-xs text-white/60">今日有購彩</span>
          </label>
          {didBuy && (
            <>
              <input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="金額"
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-purple-500/50"
              />
              <select
                value={result}
                onChange={e => setResult(e.target.value as 'win' | 'lose' | 'pending')}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
              >
                <option value="pending">待開獎</option>
                <option value="win">中獎</option>
                <option value="lose">未中</option>
              </select>
              {result === 'win' && (
                <input
                  type="number"
                  value={winAmt || ''}
                  onChange={e => setWinAmt(Number(e.target.value))}
                  placeholder="中獎金額"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-emerald-500/50"
                />
              )}
            </>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={logEntry.isPending}
          className={cn(
            'w-full py-2 rounded-xl text-sm font-medium transition-all',
            saved ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' :
            'bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
          )}
        >
          {logEntry.isPending ? '儲存中…' : saved ? '✓ 已儲存' : '儲存今日日記'}
        </button>
      </div>

      {/* 歷史日記 */}
      {showHistory && journal && journal.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {journal.map((entry) => (
            <div key={entry.id} className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/50">{entry.date}</span>
                <div className="flex items-center gap-2">
                  {entry.tenGod && <span className="text-xs text-amber-400/70">{entry.tenGod}日</span>}
                  <span className={cn('text-xs font-bold', getScoreColor(entry.lotteryScore ?? 5))}>{entry.lotteryScore}/10</span>
                </div>
              </div>
              {entry.note && <p className="text-xs text-white/60 leading-relaxed">{entry.note}</p>}
              {(entry.didBuyLottery ?? 0) === 1 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/40">購彩 ${entry.lotteryAmount}元</span>
                  {entry.lotteryResult === 'win' && <span className="text-xs text-emerald-400">中獎 ${entry.winAmount}元</span>}
                  {entry.lotteryResult === 'lose' && <span className="text-xs text-red-400/60">未中</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showHistory && journal && journal.length === 0 && (
        <div className="mt-4 text-center text-xs text-white/30 py-4">尚無日記記錄</div>
      )}
    </div>
  );
}

// ─── 主頁面 ─────────────────────────────────────────────────
export default function WealthPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data, isLoading } = trpc.warRoom.dailyReport.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const wealthCompass = data?.wealthCompass;
  const todayDirections = data?.todayDirections;
  const weeklyScores = data?.weeklyLotteryScores ?? [];
  const profileIsDefault = data?.profileIsDefault ?? true;
  const userProfile = data?.userProfile;
  const bestHours = data?.hourEnergy?.bestHours ?? [];

  // 偏財指數：優先用 purchaseAdvice 的 compositeScore
  const { data: purchaseData } = trpc.lottery.purchaseAdvice.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  const lotteryIndex = purchaseData?.compositeScore ?? wealthCompass?.lotteryIndex ?? 5;

  // 吉時倒數計時器
  const [countdown, setCountdown] = useState<string>('');
  const [nextBestHour, setNextBestHour] = useState<{ name: string; displayTime: string; score: number } | null>(null);
  useEffect(() => {
    if (!bestHours.length) return;
    const updateCountdown = () => {
      const now = new Date();
      const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const currentHour = twNow.getUTCHours();
      // 找下一個最佳時辰
      const sortedBest = [...bestHours].sort((a, b) => b.score - a.score).slice(0, 3);
      const parseHourStart = (displayTime: string) => {
        const match = displayTime.match(/(\d+):(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      const upcoming = sortedBest.find(h => parseHourStart(h.displayTime) > currentHour);
      const target = upcoming ?? sortedBest[0];
      setNextBestHour(target);
      if (target) {
        const targetHour = parseHourStart(target.displayTime);
        const targetDate = new Date(twNow);
        if (targetHour <= currentHour) targetDate.setUTCDate(targetDate.getUTCDate() + 1);
        targetDate.setUTCHours(targetHour, 0, 0, 0);
        const diff = targetDate.getTime() - now.getTime();
        if (diff > 0) {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setCountdown(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
        } else {
          setCountdown('現在就是吉時！');
        }
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [bestHours]);

  // 五行圖標
  const elementIcon = (el: string) => {
    const icons: Record<string, React.ReactNode> = {
      '木': <Leaf className="w-3.5 h-3.5" />,
      '火': <Flame className="w-3.5 h-3.5" />,
      '土': <Mountain className="w-3.5 h-3.5" />,
      '金': <CircleDot className="w-3.5 h-3.5" />,
      '水': <Droplets className="w-3.5 h-3.5" />,
    };
    return icons[el] ?? <CircleDot className="w-3.5 h-3.5" />;
  };
  const elementColor = (el: string) => {
    const colors: Record<string, string> = {
      '木': 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      '火': 'text-red-400 bg-red-500/15 border-red-500/30',
      '土': 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      '金': 'text-slate-300 bg-slate-500/15 border-slate-400/30',
      '水': 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    };
    return colors[el] ?? 'text-white/60 bg-white/5 border-white/10';
  };

  const directionDescs: Record<string, string> = useMemo(() => ({
    "正東": "木氣旺盛，生機勃發",
    "正西": "金氣聚財，收穫豐盛",
    "正南": "火氣旺盛，名利雙收",
    "正北": "水氣流動，財源廣進",
    "東南": "木火交輝，才華顯現",
    "東北": "土金相生，穩健積累",
    "西南": "土氣厚重，財富落地",
    "西北": "金水相生，貴人相助",
  }), []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-white/50">請先登入</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <SharedNav currentPage="wealth" />

      {/* 頁面標題 */}
      <div className="sticky top-0 z-20 bg-[#0a0f1a]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/60" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">💰</span>
          <h1 className="text-base font-bold text-amber-400">財運羅盤</h1>
        </div>
        <div className="ml-auto text-xs text-white/40">
          {(() => { const n = new Date(); const u = new Date(n.getTime() + 8*60*60*1000); return u.toISOString().slice(0,10); })()}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* 命格資料不完整提示 */}
        {profileIsDefault && !isLoading && (
          <ProfileIncompleteBanner featureName="財運羅盤個人化分析" />
        )}

        {/* 命格摘要卡 */}
        {!isLoading && userProfile && !profileIsDefault && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-sm">✨</span>
              <span className="text-sm font-semibold text-amber-400">您的命格摘要</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-white/5 border-white/15 text-white/80">
                <span>日主</span>
                <span className={cn('px-1.5 py-0.5 rounded border text-xs', elementColor(userProfile.dayMasterElement))}>
                  {elementIcon(userProfile.dayMasterElement)}
                  <span className="ml-1">{userProfile.dayMasterStem}（{userProfile.dayMasterElement}）</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/8 text-xs">
                <span className="text-emerald-400/70">喜用神</span>
                <div className="flex gap-1">
                  {userProfile.favorableElements.map((el: string) => (
                    <span key={el} className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs', elementColor(el))}>
                      {elementIcon(el)}{el}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/25 bg-red-500/8 text-xs">
                <span className="text-red-400/70">忌神</span>
                <div className="flex gap-1">
                  {userProfile.unfavorableElements.map((el: string) => (
                    <span key={el} className={cn('flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-xs', elementColor(el))}>
                      {elementIcon(el)}{el}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 吉時倒數計時器 */}
        {!isLoading && nextBestHour && (
          <div className="rounded-2xl border border-purple-500/25 bg-purple-500/8 p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-purple-300/70 mb-0.5">下一個財運吉時倒數</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-bold text-purple-300">{countdown}</span>
                <span className="text-xs text-white/50">至 {nextBestHour.name}（{nextBestHour.displayTime}）</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-white/40">能量</div>
              <div className={cn('text-sm font-bold', getScoreColor(nextBestHour.score))}>{nextBestHour.score}/10</div>
            </div>
          </div>
        )}

        {/* ── 偏財指數儀表板 ── */}
        <div className={cn(
          "rounded-2xl border p-5",
          isLoading ? "bg-white/5 border-white/10" : getScoreBg(lotteryIndex)
        )}>
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">今日偏財指數</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <FortuneGauge score={lotteryIndex} />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-white/70 leading-relaxed">
                  {wealthCompass?.lotteryAdvice ?? "載入中…"}
                </p>
                {purchaseData && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {purchaseData.scoreBreakdown?.slice(0, 3).map((b: { label: string; score: number; maxScore: number }) => (
                      <div key={b.label} className="bg-white/5 rounded-lg px-2.5 py-1.5 text-xs">
                        <span className="text-white/50">{b.label}</span>
                        <span className={cn("ml-1.5 font-bold", getScoreColor(b.score))}>
                          {b.score}/{b.maxScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── 七日財運走勢 ── */}
        {weeklyScores.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">本週七日財運走勢</span>
            </div>
            <WeeklyChart scores={weeklyScores} />
          </div>
        )}

        {/* ── 今日財神方位 ── */}
        {todayDirections && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">今日財神方位</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <DirectionCard
                icon="💰"
                label="財神方"
                direction={todayDirections.cai}
                desc={directionDescs[todayDirections.cai] ?? "財氣匯聚"}
              />
              <DirectionCard
                icon="🌸"
                label="喜神方"
                direction={todayDirections.xi}
                desc={directionDescs[todayDirections.xi] ?? "喜氣臨門"}
              />
              <DirectionCard
                icon="🍀"
                label="福德方"
                direction={todayDirections.fu}
                desc={directionDescs[todayDirections.fu] ?? "福氣加持"}
              />
            </div>
            <p className="text-xs text-white/40 mt-3 text-center">
              今日面向財神方（{todayDirections.cai}）辦公或洽談，有助於財運加持
            </p>
          </div>
        )}

        {/* ── 財富引擎 ── */}
        {wealthCompass?.wealthEngine && (
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">今日財富引擎</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {wealthCompass.wealthEngine}
            </p>
          </div>
        )}

        {/* ── 商業羅盤 ── */}
        {wealthCompass?.businessCompass && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-purple-400">商業羅盤</span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {wealthCompass.businessCompass}
            </p>
          </div>
        )}

        {/* ── 立即行動 ── */}
        {wealthCompass?.bestAction && (
          <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/10 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">立即行動</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {wealthCompass.bestAction}
            </p>
          </div>
        )}

        {/* ── 本月財運走勢 ── */}
        <MonthlyTrendSection />

        {/* ── 財運日記 ── */}
        <WealthJournalSection lotteryScore={lotteryIndex} tenGod={data?.todayTenGod ?? ''} />

        {/* ── 快捷連結 ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/lottery")}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
          >
            <span className="text-2xl">🎰</span>
            <div>
              <div className="text-sm font-semibold text-white">補運樂透</div>
              <div className="text-xs text-white/40">選號分析</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
          </button>
          <button
            onClick={() => navigate("/outfit")}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
          >
            <span className="text-2xl">📿</span>
            <div>
              <div className="text-sm font-semibold text-white">神諭穿搭</div>
              <div className="text-xs text-white/40">補運能量</div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />
          </button>
        </div>

        {/* 底部間距 */}
        <div className="h-6" />
      </div>
    </div>
  );
}
