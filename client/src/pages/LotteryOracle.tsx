/**
 * LotteryOracle.tsx
 * 天命選號頁面 V2.15
 * 功能：可選日期制選號、天氣狀況納入分析、彩券能量指數、GPS 地圖搜尋彩券行
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { ProfileIncompleteBanner } from "@/components/ProfileIncompleteBanner";
import { ScratchJournal } from "@/components/ScratchJournal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { LotteryResultChecker } from "@/components/LotteryResultChecker";
import { NearbyStores } from "@/components/NearbyStores";
import { BigLottoChecker, PowerballChecker, ThreeStarChecker, FourStarChecker } from "@/components/LotteryCheckers";
import {
  Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp,
  TrendingUp, Flame, Calendar, MapPin, Thermometer,
  CloudRain, Sun, Cloud, Zap, Target, CheckCircle, AlertCircle, MinusCircle,
  Store, Trophy, Coins, Star, Users, Search, X,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { toast } from "sonner";

// ── 五行顏色 ──────────────────────────────────────────────────────────────────
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  fire:  { bg: "bg-orange-500/20", text: "text-orange-400",  border: "border-orange-500/40",  label: "火" },
  earth: { bg: "bg-yellow-600/20", text: "text-yellow-500",  border: "border-yellow-600/40",  label: "土" },
  metal: { bg: "bg-slate-400/20",  text: "text-slate-300",   border: "border-slate-400/40",   label: "金" },
  wood:  { bg: "bg-emerald-500/20",text: "text-emerald-400", border: "border-emerald-500/40", label: "木" },
  water: { bg: "bg-blue-500/20",   text: "text-blue-400",    border: "border-blue-500/40",    label: "水" },
};

const NUMBER_ELEMENT: Record<number, string> = {
  0: "earth", 1: "wood", 2: "fire", 3: "wood",
  4: "metal", 5: "earth", 6: "water", 7: "fire",
  8: "wood", 9: "metal",
};

// ── 工具函數 ──────────────────────────────────────────────────────────────────
function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── 子組件 ────────────────────────────────────────────────────────────────────
function NumberBall({ num, delay = 0, size = "md", isLucky = false }: {
  num: number; delay?: number; size?: "sm" | "md" | "lg"; isLucky?: boolean;
}) {
  const el = NUMBER_ELEMENT[num] ?? "earth";
  const c = ELEMENT_COLORS[el] ?? ELEMENT_COLORS.earth;
  const sizeClass = size === "lg" ? "w-14 h-14 text-2xl" : size === "md" ? "w-11 h-11 text-lg" : "w-8 h-8 text-sm";
  return (
    <motion.div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${c.bg} ${c.text} border ${c.border} ${isLucky ? "ring-2 ring-amber-400/50" : ""}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, type: "spring", stiffness: 300 }}
    >
      {num}
    </motion.div>
  );
}

function LuckMeter({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? "#f59e0b" : score >= 6 ? "#34d399" : score >= 4 ? "#94a3b8" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">天命共振指數</span>
        <span className="text-lg font-bold" style={{ color }}>{score.toFixed(1)}/10</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── 天氣卡片 ──────────────────────────────────────────────────────────────────
function WeatherCard({ weather, onUseWeather }: {
  weather: { condition: string; conditionIcon: string; weatherElement: string; temperature: number; tempMax: number; tempMin: number; precipitation: number };
  onUseWeather: () => void;
}) {
  const el = ELEMENT_COLORS[weather.weatherElement] ?? ELEMENT_COLORS.earth;
  return (
    <div className={`rounded-xl p-4 border ${el.border} ${el.bg} flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{weather.conditionIcon}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{weather.condition}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${el.bg} ${el.text} border ${el.border}`}>
              {el.label}行天氣
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {weather.temperature}°C（{weather.tempMin}°–{weather.tempMax}°）
            {weather.precipitation > 0 && ` · 降雨 ${weather.precipitation}mm`}
          </div>
        </div>
      </div>
      <button
        onClick={onUseWeather}
        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 transition-colors"
      >
        納入分析
      </button>
    </div>
  );
}

// ── 能量指數卡片 ──────────────────────────────────────────────────────────────
// ── 統一購彩綜合建議卡片 ─────────────────────────────────────────────────────
function PurchaseAdviceCard({ data, isLoading }: {
  data?: {
    compositeScore: number;
    level: string;
    levelLabel: string;
    levelColor: string;
    lotteryTypeAdvice: string;
    scoreBreakdown: Array<{ label: string; score: number; maxScore: number; desc: string; weight: string }>;
    tenGod: string;
    dayPillar: string;
    moonPhase: string;
    currentHour: string;
    weatherCondition: string;
    dateString: string;
  };
  isLoading?: boolean;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-32 mb-4" />
        <div className="h-16 bg-slate-700 rounded mb-3" />
        <div className="h-10 bg-slate-700 rounded" />
      </div>
    );
  }
  if (!data) return null;

  const scoreColor = data.compositeScore >= 8 ? "#f59e0b" : data.compositeScore >= 6.5 ? "#34d399" : data.compositeScore >= 5 ? "#fb923c" : "#ef4444";
  const levelConfig = {
    excellent: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "🎯" },
    good:      { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   icon: "✅" },
    observe:   { bg: "bg-orange-500/10",  border: "border-orange-500/30",  text: "text-orange-400",  icon: "⚖️" },
    avoid:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     icon: "🚫" },
  }[data.level] ?? { bg: "bg-slate-800/60", border: "border-slate-700/50", text: "text-slate-400", icon: "❓" };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎰</span>
          <span className="text-sm font-bold text-amber-300 tracking-wider">本日購彩綜合建議</span>
        </div>
        <span className="text-xs text-slate-500">{data.dateString}</span>
      </div>

      {/* 分數 + 等級 */}
      <div className="flex items-center gap-4">
        <div className="text-center shrink-0">
          <div className="text-5xl font-black" style={{ color: scoreColor }}>{data.compositeScore.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">/ 10</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${levelConfig.bg} ${levelConfig.border} mb-2`}>
            <span>{levelConfig.icon}</span>
            <span className={`text-sm font-bold ${levelConfig.text}`}>{data.levelLabel}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{data.lotteryTypeAdvice}</p>
        </div>
      </div>

      {/* 命理標籤 */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: `日柱 ${data.dayPillar}` },
          { label: `十神 ${data.tenGod}` },
          { label: data.moonPhase },
          { label: `${data.currentHour}時` },
          ...(data.weatherCondition ? [{ label: data.weatherCondition }] : []),
        ].map((tag, i) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300">
            {tag.label}
          </span>
        ))}
      </div>

      {/* 展開分數明細 */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
      >
        <span>六維指數明細（加權計算）</span>
        <span>{showBreakdown ? "▲" : "▼"}</span>
      </button>

      {showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-2 border-t border-slate-700/50 pt-3"
        >
          {data.scoreBreakdown.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-24 shrink-0">
                <div className="text-xs text-slate-400 truncate">{item.label}</div>
              </div>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.score / item.maxScore) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
              </div>
              <div className="w-20 text-right shrink-0">
                <span className="text-xs font-bold text-amber-300">{item.score.toFixed(1)}</span>
                <span className="text-xs text-slate-600"> / {item.maxScore}</span>
              </div>
            </div>
          ))}
          <div className="text-xs text-slate-600 pt-1">
            ＊綜合多維天命指標計算
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── 14 天走勢圖 ────────────────────────────────────────────────────────────
function IndexHistoryChart({ history, tomorrow, isLoading }: {
  history?: Array<{
    date: string;
    displayDate: string;
    score: number;
    level: string;
    hasPurchase: boolean;
    hasWin: boolean;
    winAmount: number;
  }>;
  tomorrow?: {
    date: string;
    dateLabel: string;
    compositeScore: number;
    levelLabel: string;
  };
  isLoading?: boolean;
}) {
  const [showChart, setShowChart] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-40 mb-4" />
        <div className="h-32 bg-slate-700 rounded" />
      </div>
    );
  }
  if (!history || history.length === 0) return null;

  const avg = history.reduce((s, d) => s + d.score, 0) / history.length;
  const purchaseDays = history.filter(d => d.hasPurchase);
  const winDays = history.filter(d => d.hasWin);

  // 將明日預測點加入圖表資料
  const chartData = tomorrow
    ? [
        ...history,
        {
          date: tomorrow.date,
          displayDate: `${tomorrow.dateLabel}(明)`,
          score: null as any,          // 實際指數線不延伸
          tomorrowScore: tomorrow.compositeScore, // 明日預測線
          level: tomorrow.levelLabel,
          hasPurchase: false,
          hasWin: false,
          winAmount: 0,
          isTomorrow: true,
        },
      ]
    : history;

  // Custom dot: 有購買記錄的日期顯示特殊標記
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isTomorrow) return null;
    if (!payload.hasPurchase) return null;
    if (payload.hasWin) {
      // 中獎：金色菱形 + 金星
      return (
        <g>
          <polygon
            points={`${cx},${cy - 8} ${cx + 6},${cy - 2} ${cx + 4},${cy + 6} ${cx - 4},${cy + 6} ${cx - 6},${cy - 2}`}
            fill="#f59e0b" stroke="#1e293b" strokeWidth={1.5}
          />
          <text x={cx} y={cy - 14} textAnchor="middle" fontSize={11} fill="#fbbf24">★</text>
        </g>
      );
    }
    // 已購彩（未中）：灰色圓
    return (
      <circle cx={cx} cy={cy} r={5} fill="#64748b" stroke="#1e293b" strokeWidth={2} />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const score = d.isTomorrow ? d.tomorrowScore : d.score;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
        <div className="font-bold text-white mb-1">
          {d.displayDate}{d.isTomorrow && <span className="ml-1 text-cyan-400">預測</span>}
        </div>
        <div className={d.isTomorrow ? "text-cyan-300" : "text-amber-300"}>
          指數：{score?.toFixed(1)} / 10
        </div>
        {d.hasPurchase && !d.isTomorrow && (
          <div className={d.hasWin ? "text-yellow-400" : "text-slate-400"}>
            {d.hasWin ? `★ 中獎` : "已購彩（未中）"}
          </div>
        )}
        {d.isTomorrow && (
          <div className="text-cyan-500 mt-1">明日預測（天氣預設中性）</div>
        )}
        <div className="text-slate-500 mt-1">{d.level}</div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
      <button
        onClick={() => setShowChart(!showChart)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-300">過去 14 天指數走勢</span>
          {tomorrow && (
            <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-full px-2 py-0.5">
              明日 {tomorrow.compositeScore.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" /> 已購彩 {purchaseDays.length} 天
            {winDays.length > 0 && <><span className="text-amber-400">★</span> 中獎 {winDays.length} 天</>}
          </div>
          <span className="text-slate-500 text-xs">{showChart ? "▲" : "▼"}</span>
        </div>
      </button>

      {showChart && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4"
        >
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={chartData} margin={{ top: 10, right: 40, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={2}
              />
              <YAxis
                domain={[1, 10]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                ticks={[2, 4, 6, 8, 10]}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={avg} stroke="#475569" strokeDasharray="4 4"
                label={{ value: `均 ${avg.toFixed(1)}`, position: "right", fontSize: 9, fill: "#475569" }}
              />
              <ReferenceLine y={7} stroke="#f59e0b" strokeDasharray="2 2" strokeOpacity={0.4} />
              {/* 實際指數線（過去 14 天） */}
              <Line
                type="monotone"
                dataKey="score"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 5, fill: "#f59e0b" }}
                connectNulls={false}
              />
              {/* 明日預測虛線 */}
              {tomorrow && (
                <Line
                  type="monotone"
                  dataKey="tomorrowScore"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 5, fill: "#22d3ee", stroke: "#1e293b", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#22d3ee" }}
                  connectNulls={true}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-400" />
              <span>購彩指數</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cyan-400" style={{ borderTop: '2px dashed #22d3ee', height: 0 }} />
              <span>明日預測</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span>已購彩</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-sm">★</span>
              <span>中獎</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">＊可回頭驗證：高指數日（≥7）是否真的比較容易中獎？</p>
        </motion.div>
      )}
    </div>
  );
}

function EnergyIndexCard({ data }: {
  data: {
    score: number;
    recommendation: string;
    recommendationLabel: string;
    recommendationDesc: string;
    dayPillar: string;
    moonPhase: string;
    moonEmoji: string;
    factors: Array<{ label: string; value: number; maxValue: number; desc: string }>;
    dateString: string;
  };
}) {
  const recConfig = {
    suitable: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: <CheckCircle className="w-5 h-5" /> },
    observe:  { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   icon: <MinusCircle className="w-5 h-5" /> },
    unsuitable: { color: "text-red-400",   bg: "bg-red-500/10",     border: "border-red-500/30",     icon: <AlertCircle className="w-5 h-5" /> },
  }[data.recommendation] ?? { color: "text-slate-400", bg: "bg-slate-800/60", border: "border-slate-700/50", icon: <MinusCircle className="w-5 h-5" /> };

  const scoreColor = data.score >= 8 ? "#f59e0b" : data.score >= 5 ? "#34d399" : "#ef4444";

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-300 tracking-wider">彩券能量指數</span>
        </div>
        <span className="text-xs text-slate-500">{data.dateString}</span>
      </div>

      {/* 分數大字 */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-5xl font-black" style={{ color: scoreColor }}>{data.score.toFixed(1)}</div>
          <div className="text-xs text-slate-500 mt-1">/ 10</div>
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${recConfig.bg} ${recConfig.border} mb-2`}>
            <span className={recConfig.color}>{recConfig.icon}</span>
            <span className={`text-sm font-bold ${recConfig.color}`}>{data.recommendationLabel}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{data.recommendationDesc}</p>
        </div>
      </div>

      {/* 命理標籤 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300">
          日柱 {data.dayPillar}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-300">
          {data.moonEmoji} {data.moonPhase}
        </span>
      </div>

      {/* 影響因素 */}
      <div className="space-y-2">
        {data.factors.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16 shrink-0">{f.label}</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(f.value / f.maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
              />
            </div>
            <span className="text-xs text-slate-400 w-16 text-right shrink-0">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 為誰選號可搜尋下拉選單 ─────────────────────────────────────────────────────
function ForWhomCombobox({
  usersWithProfile,
  selectedProfileUserId,
  onSelect,
}: {
  usersWithProfile: any[];
  selectedProfileUserId: number | undefined;
  onSelect: (id: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allOptions = [
    { id: undefined as number | undefined, label: "✦ 我自己", sub: "使用主帳號命格" },
    ...usersWithProfile.map((u: any) => ({
      id: u.id as number,
      label: u.profile?.displayName ?? u.name?.split(' ')[0] ?? `用戶${u.id}`,
      sub: u.profile?.dayMasterElement ? `${u.profile.dayMasterElement}命` : "",
    })),
  ];

  const filtered = allOptions.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.sub.toLowerCase().includes(search.toLowerCase())
  );

  const selected = allOptions.find(o => o.id === selectedProfileUserId) ?? allOptions[0];

  return (
    <div className="mt-4 relative">
      <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
        <Users className="w-3 h-3" />
        為誰選號
      </div>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm hover:border-amber-500/40 transition-colors"
      >
        <span className={selectedProfileUserId === undefined ? "text-amber-300" : "text-purple-300"}>
          {selected.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden"
          >
            {/* 搜尋框 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/50">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="搜尋成員..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* 選項列表 */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-500 text-center">找不到符合的成員</div>
              ) : (
                filtered.map(opt => (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => { onSelect(opt.id); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                      opt.id === selectedProfileUserId ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <div>
                      <div className={opt.id === undefined ? "text-amber-300" : "text-purple-300"}>{opt.label}</div>
                      {opt.sub && <div className="text-[10px] text-slate-500 mt-0.5">{opt.sub}</div>}
                    </div>
                    {opt.id === selectedProfileUserId && (
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedProfileUserId !== undefined && (
        <div className="mt-1.5 text-xs text-purple-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          已切換至 {selected.label} 的命格選號
        </div>
      )}
    </div>
  );
}

// ── 主組件 ────────────────────────────────────────────────────────────────────
type LotteryData = {
  numbers: number[];
  bonusNumbers: number[];
  luckyDigits: number[];
  dayPillar: string;
  hourPillar: string;
  moonPhase: string;
  energyAnalysis: {
    todayElement: string;
    hourElement: string;
    moonBoost: boolean;
    overallLuck: number;
    recommendation: string;
  };
  wuxingBreakdown: {
    fire: number[];
    earth: number[];
    metal: number[];
    wood: number[];
    water: number[];
  };
  sets: Array<{
    type: string;
    description: string;
    numbers: number[];
    confidence: "high" | "medium" | "low";
  }>;
};

// ── 折疊標籤類型 ──────────────────────────────────────────────────────────────
type LotteryTab = "scratch" | "biglotto" | "star";

export default function LotteryOracle() {
  const { hasFeature, isAdmin } = usePermissions();
  const [result, setResult] = useState<LotteryData | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<number | undefined>();
  const [activeSet, setActiveSet] = useState(0);
  const [showScratchAnalysis, setShowScratchAnalysis] = useState(false);
  // 折疊標籤狀態
  const [openTab, setOpenTab] = useState<LotteryTab | null>(null);
  // 選定彩券行
  const [selectedStore, setSelectedStore] = useState<{
    name: string; address: string; resonanceScore: number; resonanceStars: number; recommendation: string;
  } | null>(null);
  // 各玩法選號結果
  const [bigLottoResult, setBigLottoResult] = useState<any>(null);
  const [bigLottoRevealing, setBigLottoRevealing] = useState(false);
  const [powerballResult, setPowerballResult] = useState<any>(null);
  const [powerballRevealing, setPowerballRevealing] = useState(false);
  const [threeStarResult, setThreeStarResult] = useState<any>(null);
  const [threeStarRevealing, setThreeStarRevealing] = useState(false);
  const [fourStarResult, setFourStarResult] = useState<any>(null);
  const [fourStarRevealing, setFourStarRevealing] = useState(false);

  // 日期選擇
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const isToday = selectedDate === getTodayString();

  // 命格切換（主帳號專屬）
  const { user } = useAuth();
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | undefined>(undefined);
  const listUsersQuery = trpc.account.listUsers.useQuery(undefined, {
    enabled: user?.role === 'admin',
    staleTime: 60000,
  });
  const usersWithProfile = useMemo(() => {
    if (!listUsersQuery.data) return [];
    return listUsersQuery.data.filter((u: any) => u.profile?.dayMasterElement);
  }, [listUsersQuery.data]);
  // 天氣狀態
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [weatherIncluded, setWeatherIncluded] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 取得天氣（需要位置）
  const weatherQuery = trpc.lottery.getWeather.useQuery(
    { lat: userLocation?.lat ?? 25.04, lon: userLocation?.lon ?? 121.53, targetDate: selectedDate },
    { enabled: !!userLocation }
  );

  // 彩券能量指數（舊版，保留相容）
  const energyQuery = trpc.lottery.energyIndex.useQuery(
    { targetDate: selectedDate },
    { staleTime: 60000 }
  );
  // ✅ 統一購彩綜合建議（整合六維指數）
  const purchaseAdviceQuery = trpc.lottery.purchaseAdvice.useQuery(
    {
      targetDate: selectedDate,
      weatherElement: weatherIncluded && weatherQuery.data ? weatherQuery.data.weatherElement : undefined,
      weatherCondition: weatherIncluded && weatherQuery.data ? weatherQuery.data.condition : undefined,
    },
    { staleTime: 30000 }
  );

  // 14 天走勢圖
  const indexHistoryQuery = trpc.lottery.indexHistory.useQuery(
    undefined,
    { staleTime: 300000 }
  );
  // 今日最佳購買時機
  const { data: bestTimeData } = trpc.lottery.bestTime.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // 倒數計時器
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    if (!bestTimeData?.countdownSeconds) return;
    let remaining = bestTimeData.countdownSeconds;
    const tick = () => {
      if (remaining <= 0) { setCountdown(null); return; }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setCountdown(`${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      remaining--;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bestTimeData?.countdownSeconds]);

  // 取得 GPS 位置
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("您的瀏覽器不支援 GPS 定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationError(null);
        toast.success("已取得您的位置，正在獲取天氣資訊...");
      },
      () => {
        setLocationError("無法取得位置，請允許位置存取");
        // 預設台北
        setUserLocation({ lat: 25.04, lon: 121.53 });
      }
    );
  }, []);

  // 自動嘗試取得位置
  useEffect(() => {
    requestLocation();
  }, []);

  const generateMutation = trpc.lottery.generate.useMutation({
    onSuccess: (data: any) => {
      setResult(data as LotteryData);
      setIsRevealing(false);
      if (data?.sessionId) setSavedSessionId(data.sessionId);
    },
    onError: () => {
      toast.error("天命能量暫時紊亂，請稍後再試");
      setIsRevealing(false);
    },
  });

  // 大樂透選號
  const bigLottoMutation = trpc.lottery.bigLotto.useMutation({
    onSuccess: (data: any) => { setBigLottoResult(data); setBigLottoRevealing(false); },
    onError: () => { toast.error("天命能量暫時紊亂，請稍後再試"); setBigLottoRevealing(false); },
  });
  // 威力彩選號
  const powerballMutation = trpc.lottery.powerball.useMutation({
    onSuccess: (data: any) => { setPowerballResult(data); setPowerballRevealing(false); },
    onError: () => { toast.error("天命能量暫時紊亂，請稍後再試"); setPowerballRevealing(false); },
  });
  // 三星彩選號
  const threeStarMutation = trpc.lottery.threeStar.useMutation({
    onSuccess: (data: any) => { setThreeStarResult(data); setThreeStarRevealing(false); },
    onError: () => { toast.error("天命能量暫時紊亂，請稍後再試"); setThreeStarRevealing(false); },
  });
  // 四星彩選號
  const fourStarMutation = trpc.lottery.fourStar.useMutation({
    onSuccess: (data: any) => { setFourStarResult(data); setFourStarRevealing(false); },
    onError: () => { toast.error("天命能量暫時紊亂，請稍後再試"); setFourStarRevealing(false); },
  });

  const { data: history } = trpc.lottery.history.useQuery({ limit: 10 });

  const handleGenerate = useCallback(() => {
    setIsRevealing(true);
    setResult(null);
    setActiveSet(0);
    setTimeout(() => {
      const weatherInput = weatherIncluded && weatherQuery.data ? {
        condition: weatherQuery.data.condition,
        temperature: weatherQuery.data.temperature,
        humidity: weatherQuery.data.humidity ?? 65,
        weatherElement: weatherQuery.data.weatherElement,
      } : undefined;
      generateMutation.mutate({
        saveRecord: isToday,
        targetDate: selectedDate,
        weather: weatherInput,
        profileUserId: selectedProfileUserId,
      });
    }, 800);
  }, [generateMutation, selectedDate, weatherIncluded, weatherQuery.data, isToday]);

  // 各玩法選號函數
  const handleBigLotto = useCallback(() => {
    setBigLottoRevealing(true);
    setBigLottoResult(null);
    setTimeout(() => {
      const weatherInput = weatherIncluded && weatherQuery.data ? {
        weatherElement: weatherQuery.data.weatherElement,
        condition: weatherQuery.data.condition,
        temperature: weatherQuery.data.temperature,
        humidity: weatherQuery.data.humidity ?? 65,
      } : undefined;
      bigLottoMutation.mutate({
        targetDate: selectedDate,
        weather: weatherInput,
        profileUserId: selectedProfileUserId,
        storeResonanceScore: selectedStore?.resonanceScore,
        randomSeed: Date.now() % 100000,
      });
    }, 600);
  }, [bigLottoMutation, selectedDate, weatherIncluded, weatherQuery.data, selectedProfileUserId, selectedStore]);

  const handlePowerball = useCallback(() => {
    setPowerballRevealing(true);
    setPowerballResult(null);
    setTimeout(() => {
      const weatherInput = weatherIncluded && weatherQuery.data ? {
        weatherElement: weatherQuery.data.weatherElement,
        condition: weatherQuery.data.condition,
        temperature: weatherQuery.data.temperature,
        humidity: weatherQuery.data.humidity ?? 65,
      } : undefined;
      powerballMutation.mutate({
        targetDate: selectedDate,
        weather: weatherInput,
        profileUserId: selectedProfileUserId,
        storeResonanceScore: selectedStore?.resonanceScore,
        randomSeed: Date.now() % 100000,
      });
    }, 600);
  }, [powerballMutation, selectedDate, weatherIncluded, weatherQuery.data, selectedProfileUserId, selectedStore]);

  const handleThreeStar = useCallback(() => {
    setThreeStarRevealing(true);
    setThreeStarResult(null);
    setTimeout(() => {
      const weatherInput = weatherIncluded && weatherQuery.data ? {
        weatherElement: weatherQuery.data.weatherElement,
        condition: weatherQuery.data.condition,
        temperature: weatherQuery.data.temperature,
        humidity: weatherQuery.data.humidity ?? 65,
      } : undefined;
      threeStarMutation.mutate({
        targetDate: selectedDate,
        weather: weatherInput,
        profileUserId: selectedProfileUserId,
        storeResonanceScore: selectedStore?.resonanceScore,
        randomSeed: Date.now() % 100000,
      });
    }, 600);
  }, [threeStarMutation, selectedDate, weatherIncluded, weatherQuery.data, selectedProfileUserId, selectedStore]);

  const handleFourStar = useCallback(() => {
    setFourStarRevealing(true);
    setFourStarResult(null);
    setTimeout(() => {
      const weatherInput = weatherIncluded && weatherQuery.data ? {
        weatherElement: weatherQuery.data.weatherElement,
        condition: weatherQuery.data.condition,
        temperature: weatherQuery.data.temperature,
        humidity: weatherQuery.data.humidity ?? 65,
      } : undefined;
      fourStarMutation.mutate({
        targetDate: selectedDate,
        weather: weatherInput,
        profileUserId: selectedProfileUserId,
        storeResonanceScore: selectedStore?.resonanceScore,
        randomSeed: Date.now() % 100000,
      });
    }, 600);
  }, [fourStarMutation, selectedDate, weatherIncluded, weatherQuery.data, selectedProfileUserId, selectedStore]);

  const todayElement = result?.energyAnalysis.todayElement ?? "fire";
  const elementColors = ELEMENT_COLORS[todayElement] ?? ELEMENT_COLORS.fire;

  // 日期標籤
  const dateLabelMap: Record<string, string> = useMemo(() => {
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return { [today]: '今日', [yStr]: '昨日', [tStr]: '明日' };
  }, []);

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/30"
            style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <SharedNav currentPage="lottery" />
      <ProfileIncompleteBanner featureName="天命選號" />
      {!isAdmin && !hasFeature("lottery") && (
        <FeatureLockedCard feature="lottery" />
      )}
      {(isAdmin || hasFeature("lottery")) && (
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 oracle-page-content">

        {/* 標題區 */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-xs tracking-[0.3em] text-amber-500/70 mb-3 uppercase">
            Oracle Resonance · Lottery
          </div>
          <h1 className="text-4xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            天命選號
          </h1>
          <p className="text-slate-400 text-sm">
            以命格五行為引，以天干地支為鑰，開啟您的財運密碼
          </p>
        </motion.div>
        {/* ── 免責聲明警語 ───────────────────────────────────────────── */}
        <motion.div
          className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-amber-300 text-xs font-bold mb-1 tracking-wide">重要聲明 · 僅供參考</p>
              <p className="text-amber-200/70 text-xs leading-relaxed">
                本功能依據個人命格五行與天干地支推算，提供選號靈感參考。樂透彩券涉及一群人的集體大運，影響因素複雜，
                <strong className="text-amber-300">無法保證中獎</strong>，亦不構成任何投資或購買建議。
                請量力而為，理性購彩，切勿沉迷。
              </p>
            </div>
          </div>
        </motion.div>
        {/* ── 日期選擇器器 ────────────────────────────────────────────────── */}
        <motion.div
          className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-300 tracking-wider">選擇分析日期</span>
            {dateLabelMap[selectedDate] && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400">
                {dateLabelMap[selectedDate]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setResult(null);
                setWeatherIncluded(false);
              }}
              max={(() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              })()}
              min="2024-01-01"
              className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50 [color-scheme:dark]"
            />
            <button
              onClick={() => { setSelectedDate(getTodayString()); setResult(null); setWeatherIncluded(false); }}
              className="px-3 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-400 text-xs hover:border-amber-500/40 hover:text-amber-400 transition-colors whitespace-nowrap"
            >
              回今日
            </button>
          </div>

          {/* 命格切換（主帳號專屬）- 可搜尋下拉選單 */}
          {user?.role === 'admin' && usersWithProfile.length > 0 && (
            <ForWhomCombobox
              usersWithProfile={usersWithProfile}
              selectedProfileUserId={selectedProfileUserId}
              onSelect={setSelectedProfileUserId}
            />
          )}
          {/* 天氣資訊 */}
          <div className="mt-4">
            {!userLocation ? (
              <button
                onClick={requestLocation}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-600/50 text-slate-500 text-xs hover:border-amber-500/40 hover:text-amber-400 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                點擊取得當地天氣（納入五行分析）
              </button>
            ) : weatherQuery.isLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                正在獲取天氣資訊...
              </div>
            ) : weatherQuery.data ? (
              <div className="space-y-2">
                <WeatherCard
                  weather={weatherQuery.data}
                  onUseWeather={() => {
                    setWeatherIncluded(true);
                    toast.success(`天氣（${weatherQuery.data!.condition}）已納入選號分析`);
                  }}
                />
                {weatherIncluded && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    天氣因素已納入選號計算
                    <button onClick={() => setWeatherIncluded(false)} className="text-slate-500 hover:text-slate-300 ml-auto">移除</button>
                  </div>
                )}
              </div>
            ) : locationError ? (
              <div className="text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" />
                {locationError}
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── 本日購彩綜合建議（統一六維指數）──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <PurchaseAdviceCard
            data={purchaseAdviceQuery.data}
            isLoading={purchaseAdviceQuery.isLoading}
          />
        </motion.div>

        {/* 14 天走勢圖 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <IndexHistoryChart
            history={indexHistoryQuery.data?.history?.map(d => ({
              date: d.date,
              displayDate: d.dateLabel,
              score: d.compositeScore,
              level: d.levelLabel,
              hasPurchase: d.hasPurchase,
              hasWin: d.hasWin ?? false,
              winAmount: d.wonCount > 0 ? d.wonCount * 100 : 0,
            }))}
            tomorrow={indexHistoryQuery.data?.tomorrow}
            isLoading={indexHistoryQuery.isLoading}
          />
        </motion.div>

        {/* ── 推薦彩券行（決策鏈第三層）─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-300 tracking-wider">✦ 吉地加持 · 推薦彩券行</h3>
            <span className="text-[10px] text-slate-500">選定店家後，天命能量將融入選號</span>
          </div>
          {selectedStore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-3 p-3 rounded-xl border border-amber-500/40 bg-amber-900/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">✦</span>
                <div>
                  <div className="text-sm font-bold text-amber-300">{selectedStore.name}</div>
                  <div className="text-xs text-slate-400">{selectedStore.address}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-lg font-black text-amber-400">{selectedStore.resonanceScore}</div>
                  <div className="text-[9px] text-slate-500">共振分</div>
                </div>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs ml-2"
                >取消</button>
              </div>
            </motion.div>
          )}
          <NearbyStores
            onSelectStore={(store) => {
              setSelectedStore(store);
              toast.success(`✦ 已選定「${store?.name}」，天命能量已融合店家風水加持！`);
            }}
          />
        </motion.div>

        {/* ── 今日綜合購彩指數（三合一橫幅）──────────────────────────── */}
        {purchaseAdviceQuery.data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 rounded-2xl overflow-hidden border border-amber-500/30"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(239,68,68,0.05), rgba(245,158,11,0.08))" }}
          >
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-300 tracking-wider">今日綜合購彩指數</span>
                <span className="text-[10px] text-slate-500">天氣五行 × 財運時辰 × 店家風水 三合一</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* 天氣能量 */}
                <div className="text-center p-2 rounded-xl bg-blue-900/20 border border-blue-500/20">
                  <div className="text-lg mb-1">{weatherQuery.data?.conditionIcon ?? '🌤'}</div>
                  <div className="text-xs text-slate-400 mb-1">天氣五行</div>
                  <div className="text-sm font-bold text-blue-300">{weatherQuery.data?.weatherElement ?? '待取得'}</div>
                </div>
                {/* 財運時辰 */}
                <div className="text-center p-2 rounded-xl bg-amber-900/20 border border-amber-500/20">
                  <div className="text-lg mb-1">⏰</div>
                  <div className="text-xs text-slate-400 mb-1">財運能量</div>
                  <div className="text-sm font-bold text-amber-300">
                    {purchaseAdviceQuery.data?.compositeScore ? `${purchaseAdviceQuery.data.compositeScore.toFixed(1)}/10` : '—'}
                  </div>
                </div>
                {/* 店家風水 */}
                <div className="text-center p-2 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
                  <div className="text-lg mb-1">🏪</div>
                  <div className="text-xs text-slate-400 mb-1">店家加持</div>
                  <div className="text-sm font-bold text-emerald-300">
                    {selectedStore ? `${selectedStore.resonanceScore}分` : '未選定'}
                  </div>
                </div>
              </div>
              {/* 綜合建議 */}
              <div className="text-center py-2 px-3 rounded-xl bg-amber-900/20 border border-amber-500/20">
                <div className="text-xs text-amber-200 leading-relaxed">
                  {purchaseAdviceQuery.data?.lotteryTypeAdvice ?? '正在為您解讀今日天命能量...'}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 各玩法折疊標籤（決策鏈第四層）──────────────────────────── */}
        <div className="space-y-3 mb-6">

          {/* ── 折疊標籤一：刮刮樂 ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setOpenTab(openTab === 'scratch' ? null : 'scratch')}
              className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-base">🎟</div>
                <div className="text-left">
                  <div className="text-sm font-bold text-amber-300 tracking-wider">刮刮樂</div>
                  <div className="text-[10px] text-slate-500">面額選號 · 五行分析 · 購買日誌</div>
                </div>
                {selectedStore && <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400">✦ 店家加持</span>}
              </div>
              {openTab === 'scratch' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {openTab === 'scratch' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-4">
                    {/* 面額選號（原地址分析） */}
                    <ScratchAnalysisWithMap
                      selectedDate={selectedDate}
                      weatherElement={weatherIncluded && weatherQuery.data ? weatherQuery.data.weatherElement : undefined}
                      addressElement={undefined}
                    />
                    {/* 刮刮樂購買日誌 */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">開獎對照 · 刮刮樂日誌</span>
                      </div>
                      <ScratchJournal />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── 折疊標籤二：大樂透 + 威力彩 ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setOpenTab(openTab === 'biglotto' ? null : 'biglotto')}
              className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-base">🎱</div>
                <div className="text-left">
                  <div className="text-sm font-bold text-red-300 tracking-wider">大樂透 · 威力彩</div>
                  <div className="text-[10px] text-slate-500">天命選號 · 開獎對照 · 中獎記錄</div>
                </div>
                {selectedStore && <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">✦ 店家加持</span>}
              </div>
              {openTab === 'biglotto' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {openTab === 'biglotto' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-6">
                    {/* 大樂透選號 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-bold text-red-300">大樂透選號</span>
                          <span className="text-[10px] text-slate-500">1-49 選 6 + 特別號</span>
                        </div>
                        <motion.button
                          onClick={handleBigLotto}
                          disabled={bigLottoRevealing || bigLottoMutation.isPending}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #ef4444, #f59e0b)" }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {bigLottoRevealing ? '✨ 天命匯聚...' : bigLottoResult ? '🔄 重新選號' : '✦ 啟動選號'}
                        </motion.button>
                      </div>
                      {bigLottoRevealing && (
                        <div className="text-center py-6">
                          <motion.div className="text-3xl mb-2" animate={{ rotate: [0,10,-10,0] }} transition={{ repeat: Infinity, duration: 0.5 }}>✨</motion.div>
                          <p className="text-amber-400 text-sm">宇宙能量正在為您精準校準大樂透號碼...</p>
                          {selectedStore && <p className="text-xs text-amber-300/60 mt-1">✦ 融合「{selectedStore.name}」的吉地風水加持</p>}
                        </div>
                      )}
                      {bigLottoResult && !bigLottoRevealing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          {bigLottoResult.storeLabel && (
                            <div className="text-center text-xs text-amber-400 mb-1">{bigLottoResult.storeLabel}</div>
                          )}
                          <div className="text-[10px] text-slate-500 text-center mb-2">紅色=主號碼（6個）· 金色=特別號</div>
                          {(bigLottoResult.sets ?? []).map((set: any, si: number) => (
                            <div key={si} className="bg-slate-900/60 border border-red-500/20 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ set.confidence === 'high' ? 'bg-amber-500/20 text-amber-300' : set.confidence === 'medium' ? 'bg-red-500/15 text-red-300' : 'bg-slate-700/60 text-slate-400' }`}>{set.type}</span>
                                <span className="text-[10px] text-slate-500 truncate">{set.description}</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {(set.numbers ?? []).map((n: number, i: number) => (
                                  <div key={i} className="w-9 h-9 rounded-full bg-red-900/40 border-2 border-red-500/50 flex items-center justify-center text-xs font-bold text-red-300">{n}</div>
                                ))}
                                {set.specialNumber !== undefined && (
                                  <div className="w-9 h-9 rounded-full bg-amber-900/40 border-2 border-amber-500/50 flex items-center justify-center text-xs font-bold text-amber-300">{set.specialNumber}</div>
                                )}
                              </div>
                            </div>
                          ))}
                          {bigLottoResult.energyAnalysis?.recommendation && (
                            <div className="mt-2 p-3 rounded-xl bg-red-900/20 border border-red-500/15">
                              <p className="text-xs text-slate-300 leading-relaxed">{bigLottoResult.energyAnalysis.recommendation}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                      {!bigLottoResult && !bigLottoRevealing && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <div className="text-3xl mb-2">🎱</div>
                          <p>您的財運能量正蓄勢待發，點擊啟動，讓天命為您指引最強共振號碼</p>
                        </div>
                      )}
                    </div>

                    {/* 威力彩選號 */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-purple-400" />
                          <span className="text-sm font-bold text-purple-300">威力彩選號</span>
                          <span className="text-[10px] text-slate-500">1-38 選 6 + 第二區 1-8</span>
                        </div>
                        <motion.button
                          onClick={handlePowerball}
                          disabled={powerballRevealing || powerballMutation.isPending}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)" }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {powerballRevealing ? '✨ 天命匯聚...' : powerballResult ? '🔄 重新選號' : '✦ 啟動選號'}
                        </motion.button>
                      </div>
                      {powerballRevealing && (
                        <div className="text-center py-6">
                          <motion.div className="text-3xl mb-2" animate={{ rotate: [0,10,-10,0] }} transition={{ repeat: Infinity, duration: 0.5 }}>✨</motion.div>
                          <p className="text-purple-400 text-sm">天命能量正在為您精準校準威力彩號碼...</p>
                          {selectedStore && <p className="text-xs text-purple-300/60 mt-1">✦ 融合「{selectedStore.name}」的吉地風水加持</p>}
                        </div>
                      )}
                      {powerballResult && !powerballRevealing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          {powerballResult.storeLabel && (
                            <div className="text-center text-xs text-amber-400 mb-1">{powerballResult.storeLabel}</div>
                          )}
                          <div className="text-[10px] text-slate-500 text-center mb-2">紫色=第一區（6個）· 粉色=第二區</div>
                          {(powerballResult.sets ?? []).map((set: any, si: number) => (
                            <div key={si} className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ set.confidence === 'high' ? 'bg-amber-500/20 text-amber-300' : set.confidence === 'medium' ? 'bg-purple-500/15 text-purple-300' : 'bg-slate-700/60 text-slate-400' }`}>{set.type}</span>
                                <span className="text-[10px] text-slate-500 truncate">{set.description}</span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {(set.mainNumbers ?? set.numbers ?? []).map((n: number, i: number) => (
                                  <div key={i} className="w-9 h-9 rounded-full bg-purple-900/40 border-2 border-purple-500/50 flex items-center justify-center text-xs font-bold text-purple-300">{n}</div>
                                ))}
                                {set.powerNumber !== undefined && (
                                  <div className="w-9 h-9 rounded-full bg-pink-900/40 border-2 border-pink-500/50 flex items-center justify-center text-xs font-bold text-pink-300">{set.powerNumber}</div>
                                )}
                              </div>
                            </div>
                          ))}
                          {powerballResult.energyAnalysis?.recommendation && (
                            <div className="mt-2 p-3 rounded-xl bg-purple-900/20 border border-purple-500/15">
                              <p className="text-xs text-slate-300 leading-relaxed">{powerballResult.energyAnalysis.recommendation}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                      {!powerballResult && !powerballRevealing && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <div className="text-3xl mb-2">💜</div>
                          <p>威力彩的宇宙頻率已就緒，等待您的一聲令下，天命號碼即將顯現</p>
                        </div>
                      )}
                    </div>

                    {/* 大樂透+威力彩開獎對照 */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">開獎對照記錄</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <BigLottoChecker />
                        <PowerballChecker />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── 折疊標籤三：三星彩 + 四星彩 ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-card rounded-2xl border border-white/10 overflow-hidden"
          >
            <button
              onClick={() => setOpenTab(openTab === 'star' ? null : 'star')}
              className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-base">⭐</div>
                <div className="text-left">
                  <div className="text-sm font-bold text-emerald-300 tracking-wider">三星彩 · 四星彩</div>
                  <div className="text-[10px] text-slate-500">天命選號 · 開獎對照 · 中獎記錄</div>
                </div>
                {selectedStore && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">✦ 店家加持</span>}
              </div>
              {openTab === 'star' ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {openTab === 'star' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-6">
                    {/* 三星彩選號 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-300">三星彩選號</span>
                          <span className="text-[10px] text-slate-500">000-999 三位數</span>
                        </div>
                        <motion.button
                          onClick={handleThreeStar}
                          disabled={threeStarRevealing || threeStarMutation.isPending}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #10b981, #3b82f6)" }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {threeStarRevealing ? '✨ 天命匯聚...' : threeStarResult ? '🔄 重新選號' : '✦ 啟動選號'}
                        </motion.button>
                      </div>
                      {threeStarRevealing && (
                        <div className="text-center py-6">
                          <motion.div className="text-3xl mb-2" animate={{ rotate: [0,10,-10,0] }} transition={{ repeat: Infinity, duration: 0.5 }}>✨</motion.div>
                          <p className="text-emerald-400 text-sm">三星能量正在為您精準對齊最強共振數字...</p>
                        </div>
                      )}
                      {threeStarResult && !threeStarRevealing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          {threeStarResult.storeLabel && (
                            <div className="text-center text-xs text-amber-400 mb-1">{threeStarResult.storeLabel}</div>
                          )}
                          {(threeStarResult.sets ?? []).map((set: any, si: number) => (
                            <div key={si} className="bg-slate-900/60 border border-emerald-500/20 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ set.confidence === 'high' ? 'bg-amber-500/20 text-amber-300' : set.confidence === 'medium' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/60 text-slate-400' }`}>{set.type}</span>
                                <span className="text-[10px] text-slate-500 truncate">{set.description}</span>
                              </div>
                              <div className="flex gap-2 justify-center">
                                {(set.digits ?? []).map((d: number, i: number) => (
                                  <div key={i} className="w-11 h-11 rounded-xl bg-emerald-900/40 border-2 border-emerald-500/50 flex items-center justify-center text-lg font-black text-emerald-300">{d}</div>
                                ))}
                              </div>
                              <div className="text-center text-xs font-bold text-emerald-400 mt-1">{(set.digits ?? []).join('')}</div>
                            </div>
                          ))}
                          {threeStarResult.energyAnalysis?.recommendation && (
                            <div className="mt-2 p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/15">
                              <p className="text-xs text-slate-300 leading-relaxed">{threeStarResult.energyAnalysis.recommendation}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                      {!threeStarResult && !threeStarRevealing && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <div className="text-3xl mb-2">⭐</div>
                          <p>三星彩的天命頻率已校準完畢，您的幸運三位數正在等待被召喚</p>
                        </div>
                      )}
                    </div>

                    {/* 四星彩選號 */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-blue-300">四星彩選號</span>
                          <span className="text-[10px] text-slate-500">0000-9999 四位數</span>
                        </div>
                        <motion.button
                          onClick={handleFourStar}
                          disabled={fourStarRevealing || fourStarMutation.isPending}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold text-white disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {fourStarRevealing ? '✨ 天命匯聚...' : fourStarResult ? '🔄 重新選號' : '✦ 啟動選號'}
                        </motion.button>
                      </div>
                      {fourStarRevealing && (
                        <div className="text-center py-6">
                          <motion.div className="text-3xl mb-2" animate={{ rotate: [0,10,-10,0] }} transition={{ repeat: Infinity, duration: 0.5 }}>✨</motion.div>
                          <p className="text-blue-400 text-sm">四星能量正在為您精準鎖定最強共振號碼...</p>
                        </div>
                      )}
                      {fourStarResult && !fourStarRevealing && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                          {fourStarResult.storeLabel && (
                            <div className="text-center text-xs text-amber-400 mb-1">{fourStarResult.storeLabel}</div>
                          )}
                          {(fourStarResult.sets ?? []).map((set: any, si: number) => (
                            <div key={si} className="bg-slate-900/60 border border-blue-500/20 rounded-xl p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ set.confidence === 'high' ? 'bg-amber-500/20 text-amber-300' : set.confidence === 'medium' ? 'bg-blue-500/15 text-blue-300' : 'bg-slate-700/60 text-slate-400' }`}>{set.type}</span>
                                <span className="text-[10px] text-slate-500 truncate">{set.description}</span>
                              </div>
                              <div className="flex gap-2 justify-center">
                                {(set.digits ?? []).map((d: number, i: number) => (
                                  <div key={i} className="w-11 h-11 rounded-xl bg-blue-900/40 border-2 border-blue-500/50 flex items-center justify-center text-lg font-black text-blue-300">{d}</div>
                                ))}
                              </div>
                              <div className="text-center text-xs font-bold text-blue-400 mt-1">{(set.digits ?? []).join('')}</div>
                            </div>
                          ))}
                          {fourStarResult.energyAnalysis?.recommendation && (
                            <div className="mt-2 p-3 rounded-xl bg-blue-900/20 border border-blue-500/15">
                              <p className="text-xs text-slate-300 leading-relaxed">{fourStarResult.energyAnalysis.recommendation}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                      {!fourStarResult && !fourStarRevealing && (
                        <div className="text-center py-6 text-slate-500 text-sm">
                          <div className="text-3xl mb-2">🌟</div>
                          <p>四星彩的宇宙密碼已就位，一個四位數字將為您開啟財富之門</p>
                        </div>
                      )}
                    </div>

                    {/* 三星+四星彩開獎對照 */}
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">開獎對照記錄</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ThreeStarChecker />
                        <FourStarChecker />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>{/* end tabs */}

      </div>
      )}
    </div>
  );
}
// ── 彩券行風水分析析析（三維度：方位40% + 地名20% + 類型40%）────────────────────
import { MapView } from "@/components/Map";
const FS_MOUNTAINS = [
  { min:352.5,max:360,m:"壬",e:"水"},{min:0,max:7.5,m:"壬",e:"水"},{min:7.5,max:22.5,m:"子",e:"水"},{min:22.5,max:37.5,m:"癸",e:"水"},
  {min:37.5,max:52.5,m:"丑",e:"土"},{min:52.5,max:67.5,m:"艮",e:"土"},{min:67.5,max:82.5,m:"寅",e:"木"},{min:82.5,max:97.5,m:"甲",e:"木"},
  {min:97.5,max:112.5,m:"卯",e:"木"},{min:112.5,max:127.5,m:"乙",e:"木"},{min:127.5,max:142.5,m:"辰",e:"土"},{min:142.5,max:157.5,m:"巽",e:"木"},
  {min:157.5,max:172.5,m:"巳",e:"火"},{min:172.5,max:187.5,m:"丙",e:"火"},{min:187.5,max:202.5,m:"午",e:"火"},{min:202.5,max:217.5,m:"丁",e:"火"},
  {min:217.5,max:232.5,m:"未",e:"土"},{min:232.5,max:247.5,m:"坤",e:"土"},{min:247.5,max:262.5,m:"申",e:"金"},{min:262.5,max:277.5,m:"庚",e:"金"},
  {min:277.5,max:292.5,m:"酉",e:"金"},{min:292.5,max:307.5,m:"辛",e:"金"},{min:307.5,max:322.5,m:"戌",e:"土"},{min:322.5,max:337.5,m:"乾",e:"金"},
  {min:337.5,max:352.5,m:"亥",e:"水"},
];
const FS_NAME_MAP: Record<string,string> = {
  木:"木",林:"木",森:"木",竹:"木",草:"木",花:"木",葉:"木",青:"木",綠:"木",春:"木",東:"木",甲:"木",乙:"木",寅:"木",卯:"木",
  火:"火",炎:"火",燦:"火",熱:"火",光:"火",明:"火",南:"火",丙:"火",丁:"火",午:"火",巳:"火",紅:"火",橙:"火",暖:"火",
  土:"土",地:"土",山:"土",石:"土",城:"土",坡:"土",岡:"土",丘:"土",嶺:"土",中:"土",黃:"土",戊:"土",己:"土",辰:"土",未:"土",戌:"土",丑:"土",
  金:"金",銀:"金",鐵:"金",鋼:"金",銅:"金",白:"金",西:"金",庚:"金",辛:"金",申:"金",酉:"金",乾:"金",
  水:"水",海:"水",河:"水",湖:"水",溪:"水",泉:"水",北:"水",壬:"水",癸:"水",子:"水",亥:"水",黑:"水",藍:"水",冬:"水",
};
const FS_SCORE: Record<string,number> = {火:100,土:85,金:70,木:30,水:20};
const FS_GRADE_CFG: Record<string,{label:string;color:string;emoji:string}> = {
  大吉:{label:"大吉",color:"#f59e0b",emoji:"✦"},
  吉:{label:"吉",color:"#22c55e",emoji:"◎"},
  平:{label:"平",color:"#94a3b8",emoji:"○"},
  凶:{label:"凶",color:"#f97316",emoji:"△"},
  大凶:{label:"大凶",color:"#ef4444",emoji:"✕"},
};
function calcStoreFengShui(uLat:number,uLng:number,sLat:number,sLng:number,name:string,addr:string) {
  const dLng=(sLng-uLng)*Math.PI/180;
  const la1=uLat*Math.PI/180,la2=sLat*Math.PI/180;
  const y=Math.sin(dLng)*Math.cos(la2);
  const x=Math.cos(la1)*Math.sin(la2)-Math.sin(la1)*Math.cos(la2)*Math.cos(dLng);
  const deg=((Math.atan2(y,x)*180/Math.PI)+360)%360;
  const mtn=FS_MOUNTAINS.find(m=>deg>=m.min&&deg<m.max)??{m:"子",e:"水"};
  const cnt:Record<string,number>={木:0,火:0,土:0,金:0,水:0};
  for(const c of `${name} ${addr}`) if(FS_NAME_MAP[c]) cnt[FS_NAME_MAP[c]]++;
  const nameEl=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][1]>0?Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0]:"土";
  const total=Math.round((FS_SCORE[mtn.e]??50)*0.40+(FS_SCORE[nameEl]??50)*0.20+(FS_SCORE["土"])*0.40);
  let grade:"大吉"|"吉"|"平"|"凶"|"大凶";
  if(total>=85)grade="大吉";else if(total>=70)grade="吉";else if(total>=50)grade="平";else if(total>=35)grade="凶";else grade="大凶";
  return {total,grade,mountain:mtn.m,bearingEl:mtn.e,nameEl,deg:Math.round(deg)};
}
// ─────────────────────────────────────────────────────────────────────────────
function ScratchAnalysisWithMap({ selectedDate, weatherElement, addressElement }: { selectedDate: string; weatherElement?: string; addressElement?: string }) {
  const [address, setAddress] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedStore, setSelectedStore] = useState<{ name: string; address: string; fengShuiGrade?: string; fengShuiScore?: number } | null>(null);
  const [mapUserLoc, setMapUserLoc] = useState<{lat:number;lng:number}|null>(null);
  const [expandedDenom, setExpandedDenom] = useState<number | null>(100);
  const [selectedStoreFengShui, setSelectedStoreFengShui] = useState<{
    resonanceScore?: number;
    fengShuiGrade?: string;
    bearingElement?: string;
  } | null>(null);
  const { data: strategies } = trpc.lottery.scratchStrategies.useQuery(
    {
      targetDate: selectedDate,
      weatherElement,
      addressElement,
      useWeather: !!weatherElement,
      useAddress: !!addressElement,
      storeResonanceScore: selectedStoreFengShui?.resonanceScore,
      storeFengShuiGrade: selectedStoreFengShui?.fengShuiGrade,
      storeBearingElement: selectedStoreFengShui?.bearingElement,
      denomination: expandedDenom ?? 100,
    },
    { staleTime: 5000 }
  );

  const { data: addressData, isLoading: addressLoading } = trpc.lottery.addressAnalysis.useQuery(
    { address: inputAddress },
    { enabled: inputAddress.length > 0 }
  );

  const handleAnalyzeAddress = () => {
    if (!address.trim()) { toast.error("請輸入彩券行地址"); return; }
    setInputAddress(address.trim());
  };

  // 地圖初始化：搜尋附近台灣彩券行 + 風水分析
  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    markers.forEach(m => { m.map = null; });
    setMarkers([]);
    const doSearch = (userPos: {lat:number;lng:number}|null) => {
      const service = new google.maps.places.PlacesService(map);
      service.textSearch({ query: "台灣彩券" }, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results) return;
        const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
        results.slice(0, 20).forEach((place) => {
          if (!place.geometry?.location) return;
          let markerHtml: string;
          let fsData: ReturnType<typeof calcStoreFengShui> | null = null;
          if (userPos) {
            const sLat = place.geometry.location.lat();
            const sLng = place.geometry.location.lng();
            fsData = calcStoreFengShui(userPos.lat, userPos.lng, sLat, sLng, place.name ?? "", place.formatted_address ?? "");
            const gc = FS_GRADE_CFG[fsData.grade];
            markerHtml = `<div style="background:${gc.color};color:#000;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer">${gc.emoji} ${place.name} <span style="font-size:10px;opacity:0.85">${fsData.grade}${fsData.total}</span></div>`;
          } else {
            markerHtml = `<div style="background:#f59e0b;color:#000;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🎰 ${place.name}</div>`;
          }
          const markerEl = document.createElement("div");
          markerEl.innerHTML = markerHtml;
          const marker = new google.maps.marker.AdvancedMarkerElement({ map, position: place.geometry.location, content: markerEl, title: place.name });
          marker.addListener("click", () => {
            const addr = place.formatted_address ?? place.name ?? "";
            setSelectedStore({ name: place.name ?? "", address: addr, fengShuiGrade: fsData?.grade, fengShuiScore: fsData?.total });
            if (fsData) {
              setSelectedStoreFengShui({
                resonanceScore: fsData.total,
                fengShuiGrade: fsData.grade,
                bearingElement: fsData.bearingEl,
              });
            }
            setAddress(addr);
            setInputAddress(addr);
            setShowMap(false);
            const gradeLabel = fsData ? `（風水${fsData.grade} ${fsData.total}分）` : "";
            toast.success(`已選擇：${place.name}${gradeLabel}`);
          });
          newMarkers.push(marker);
        });
        setMarkers(newMarkers);
      });
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapUserLoc(userPos);
          map.setCenter(userPos);
          const el = document.createElement("div");
          el.innerHTML = `<div style="background:#6366f1;color:#fff;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:bold;box-shadow:0 2px 8px rgba(0,0,0,0.5)">📍 您在這裡</div>`;
          new google.maps.marker.AdvancedMarkerElement({ map, position: userPos, content: el });
          doSearch(userPos);
        },
        () => doSearch(null)
      );
    } else {
      doSearch(null);
    }
  }, [markers]);

  const ELEMENT_COLORS_LOCAL: Record<string, { bg: string; text: string; border: string; label: string; emoji: string }> = {
    fire:  { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", label: "火", emoji: "🔥" },
    earth: { bg: "bg-yellow-600/20", text: "text-yellow-500", border: "border-yellow-600/40", label: "土", emoji: "🌍" },
    metal: { bg: "bg-slate-400/20",  text: "text-slate-300",  border: "border-slate-400/40",  label: "金", emoji: "⚙️" },
    wood:  { bg: "bg-emerald-500/20",text: "text-emerald-400",border: "border-emerald-500/40",label: "木", emoji: "🌿" },
    water: { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/40",   label: "水", emoji: "💧" },
  };

  return (
    <div className="space-y-4">
      {/* 彩券行地址輸入（可從上方地圖點選帶入） */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-300">彩券行地址五行分析</span>
          <span className="text-[10px] text-slate-500">（可從上方地圖點選帶入）</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="輸入彩券行地址進行五行分析..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyzeAddress()}
            className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleAnalyzeAddress}
            disabled={addressLoading}
            className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {addressLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          </button>
        </div>
        {selectedStore && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate flex-1">已帶入：{selectedStore.name}</span>
            {selectedStore.fengShuiGrade && (
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  color: FS_GRADE_CFG[selectedStore.fengShuiGrade]?.color ?? '#94a3b8',
                  borderColor: (FS_GRADE_CFG[selectedStore.fengShuiGrade]?.color ?? '#94a3b8') + '60',
                  background: (FS_GRADE_CFG[selectedStore.fengShuiGrade]?.color ?? '#94a3b8') + '18',
                }}
              >
                {FS_GRADE_CFG[selectedStore.fengShuiGrade]?.emoji} {selectedStore.fengShuiGrade} {selectedStore.fengShuiScore}分
              </span>
            )}
          </div>
        )}
      </div>

      {/* 地址五行分析結果 */}
      {addressData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 border ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.border ?? 'border-slate-700/50'} ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.bg ?? 'bg-slate-800/60'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.emoji}</span>
              <span className={`text-sm font-bold ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.text}`}>
                {ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.label}行彩券行
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-amber-400">{addressData.resonanceScore}</span>
              <span className="text-xs text-slate-500">/10 共振</span>
            </div>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${(addressData.resonanceScore / 10) * 100}%` }}
            />
          </div>
          <p className="text-xs text-slate-300">{addressData.advice}</p>
          {addressData.luckyNumbers.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">地址幸運號：</span>
              <div className="flex gap-1">
                {addressData.luckyNumbers.map((n, i) => (
                  <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.bg} ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.text} border ${ELEMENT_COLORS_LOCAL[addressData.dominantElement]?.border}`}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 面額選號策略 */}
      {strategies && strategies.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-3">面額天命選號策略（依 {selectedDate} 日柱計算）</p>
          <div className="space-y-2">
            {strategies.map((strategy: any) => {
              const isExpanded = expandedDenom === strategy.denomination;
              return (
                <div key={strategy.denomination} className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDenom(isExpanded ? null : strategy.denomination)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{strategy.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        strategy.confidence === 'high' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        strategy.confidence === 'medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}>
                        {strategy.confidence === 'high' ? '高度共振' : strategy.confidence === 'medium' ? '中度共振' : '謹慎嘗試'}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <p className="text-xs text-slate-400">{strategy.description}</p>
                          {strategy.scoreReason && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mt-1">
                              <p className="text-xs text-amber-400">🎯 {strategy.scoreReason}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">主要號碼</p>
                            <div className="flex gap-2 flex-wrap">
                              {strategy.primaryNumbers.map((n: number, i: number) => {
                                const el = NUMBER_ELEMENT[n] ?? "earth";
                                const c = ELEMENT_COLORS[el];
                                return (
                                  <span key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base ${c.bg} ${c.text} border ${c.border}`}>{n}</span>
                                );
                              })}
                            </div>
                          </div>
                          {strategy.backupNumbers.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">備選號碼</p>
                              <div className="flex gap-2 flex-wrap">
                                {strategy.backupNumbers.map((n: number, i: number) => {
                                  const el = NUMBER_ELEMENT[n] ?? "earth";
                                  const c = ELEMENT_COLORS[el];
                                  return (
                                    <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${c.bg} ${c.text} border ${c.border} opacity-70`}>{n}</span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 italic">{strategy.strategy}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
