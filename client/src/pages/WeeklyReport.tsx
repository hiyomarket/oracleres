import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Target, Clock, Award } from "lucide-react";
import { SharedNav } from "@/components/SharedNav";

// ─── 時辰順序與中文名稱 ───────────────────────────────────────────
const HOUR_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const HOUR_LABELS: Record<string, string> = {
  子: "子\n23-1", 丑: "丑\n1-3", 寅: "寅\n3-5", 卯: "卯\n5-7",
  辰: "辰\n7-9", 巳: "巳\n9-11", 午: "午\n11-13", 未: "未\n13-15",
  申: "申\n15-17", 酉: "酉\n17-19", 戌: "戌\n19-21", 亥: "亥\n21-23",
};

// 熱力圖顏色：命中率 0%→深紅，50%→橙，100%→金
function heatColor(rate: number): string {
  if (rate === 0) return "rgba(239,68,68,0.15)";
  if (rate < 25) return "rgba(239,68,68,0.35)";
  if (rate < 50) return "rgba(249,115,22,0.45)";
  if (rate < 75) return "rgba(234,179,8,0.55)";
  return "rgba(234,179,8,0.85)";
}

// ─── 自定義 Tooltip ───────────────────────────────────────────────
function RoiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#0a1628] border border-white/20 rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <div className="font-bold text-white mb-1">{label}</div>
      <div className={`font-black text-base mb-1 ${d.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        ROI {d.roi >= 0 ? "+" : ""}{d.roi}%
      </div>
      <div className="text-slate-400">投入 ${d.invested} / 回收 ${d.won}</div>
    </div>
  );
}

function HourTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-[#0a1628] border border-white/20 rounded-xl p-3 text-xs shadow-2xl min-w-[140px]">
      <div className="font-bold text-white mb-1">{d.hourLabel} 時</div>
      <div className="text-amber-400 font-black text-base mb-1">{d.winRate}%</div>
      <div className="text-slate-400">共 {d.total} 筆 · 中獎 {d.won} 筆</div>
    </div>
  );
}

// ─── 主元件 ───────────────────────────────────────────────────────
export default function WeeklyReport() {
  const [roiRange, setRoiRange] = useState<"7" | "14" | "30">("30");

  // 刮刮樂統計（時辰命中率）
  const { data: scratchStats, isLoading: statsLoading } = trpc.lottery.getScratchStats.useQuery();
  // 刮刮樂日誌（ROI 走勢）
  const { data: scratchLogs, isLoading: logsLoading } = trpc.lottery.getScratchLogs.useQuery();

  // ── ROI 走勢圖資料 ────────────────────────────────────────────
  const roiChartData = useMemo(() => {
    if (!scratchLogs?.length) return [];

    const days = parseInt(roiRange);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = scratchLogs
      .filter(l => l.purchasedAt > cutoff)
      .sort((a, b) => a.purchasedAt - b.purchasedAt);

    // 按日期分組
    const byDate: Record<string, { invested: number; won: number }> = {};
    for (const log of filtered) {
      const date = new Date(log.purchasedAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
      if (!byDate[date]) byDate[date] = { invested: 0, won: 0 };
      byDate[date].invested += log.denomination;
      byDate[date].won += log.wonAmount ?? 0;
    }

    // 轉為累積 ROI
    let cumInvested = 0;
    let cumWon = 0;
    return Object.entries(byDate).map(([date, { invested, won }]) => {
      cumInvested += invested;
      cumWon += won;
      const roi = cumInvested > 0 ? Math.round(((cumWon - cumInvested) / cumInvested) * 100) : 0;
      return { date, invested, won, roi, cumInvested, cumWon };
    });
  }, [scratchLogs, roiRange]);

  // ── 時辰命中率熱力圖資料 ──────────────────────────────────────
  const hourHeatData = useMemo(() => {
    if (!scratchStats?.byHour) return HOUR_BRANCHES.map(h => ({ hour: h, hourLabel: h, total: 0, won: 0, winRate: 0 }));
    const map: Record<string, { total: number; won: number }> = {};
    for (const row of scratchStats.byHour) {
      map[row.hour] = { total: row.total, won: row.won };
    }
    return HOUR_BRANCHES.map(h => {
      const d = map[h] ?? { total: 0, won: 0 };
      const winRate = d.total > 0 ? Math.round((d.won / d.total) * 100) : 0;
      return { hour: h, hourLabel: h, total: d.total, won: d.won, winRate };
    });
  }, [scratchStats]);

  // ── 總覽統計 ─────────────────────────────────────────────────
  const overview = useMemo(() => {
    if (!scratchStats) return null;
    const { totalInvested, totalWon, winRate, byDenomination } = scratchStats;
    const roi = totalInvested > 0 ? Math.round(((totalWon - totalInvested) / totalInvested) * 100) : 0;
    const totalCount = byDenomination.reduce((s, r) => s + r.total, 0);
    const wonCount = byDenomination.reduce((s, r) => s + r.won, 0);
    const bestHour = hourHeatData.reduce((best, h) => h.total > 0 && h.winRate > best.winRate ? h : best, { hour: "-", winRate: 0, total: 0, won: 0, hourLabel: "-" });
    return { totalInvested, totalWon, roi, winRate, totalCount, wonCount, bestHour };
  }, [scratchStats, hourHeatData]);

  const isLoading = statsLoading || logsLoading;

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-orange-500/4 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="weekly" />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* 標題 */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs tracking-[0.3em] text-amber-500/70 mb-3 uppercase">
            Oracle Resonance · Analytics
          </div>
          <h1 className="text-4xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            天命驗證中心
          </h1>
          <p className="text-slate-400 text-sm">刮刮樂 ROI 走勢 · 時辰命中率熱力圖 · 長期天命數據分析</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full mx-auto mb-4"
            />
            <p className="text-slate-500 text-sm">正在載入天命驗證數據...</p>
          </div>
        ) : (
          <>
            {/* ── 總覽統計卡片 ── */}
            {overview ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
              >
                {[
                  {
                    icon: <DollarSign className="w-4 h-4" />,
                    label: "總投入",
                    value: `$${overview.totalInvested.toLocaleString()}`,
                    color: "text-slate-300",
                    bg: "border-slate-700/50",
                  },
                  {
                    icon: <Award className="w-4 h-4" />,
                    label: "總回收",
                    value: `$${overview.totalWon.toLocaleString()}`,
                    color: overview.totalWon >= overview.totalInvested ? "text-emerald-400" : "text-red-400",
                    bg: overview.totalWon >= overview.totalInvested ? "border-emerald-700/40" : "border-red-700/40",
                  },
                  {
                    icon: overview.roi >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
                    label: "累積 ROI",
                    value: `${overview.roi >= 0 ? "+" : ""}${overview.roi}%`,
                    color: overview.roi >= 0 ? "text-emerald-400" : "text-red-400",
                    bg: overview.roi >= 0 ? "border-emerald-700/40" : "border-red-700/40",
                  },
                  {
                    icon: <Clock className="w-4 h-4" />,
                    label: "最旺時辰",
                    value: overview.bestHour.total > 0 ? `${overview.bestHour.hour}時 ${overview.bestHour.winRate}%` : "資料不足",
                    color: "text-amber-400",
                    bg: "border-amber-700/40",
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-gray-900/60 border ${card.bg} rounded-xl p-4`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-500 mb-2">
                      {card.icon}
                      <span className="text-xs">{card.label}</span>
                    </div>
                    <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
                    {card.label === "累積 ROI" && (
                      <div className="text-xs text-slate-600 mt-0.5">共 {overview.totalCount} 筆</div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-6 text-center mb-6">
                <p className="text-slate-500 text-sm">尚無刮刮樂購買記錄</p>
                <p className="text-slate-600 text-xs mt-1">前往「選號」頁面記錄購買日誌，即可在此查看統計</p>
              </div>
            )}

            {/* ── ROI 走勢圖 ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-5 mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-300 tracking-wider">刮刮樂 ROI 累積走勢</h3>
                </div>
                <div className="flex gap-1">
                  {(["7", "14", "30"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRoiRange(r)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                        roiRange === r
                          ? "bg-amber-900/50 border border-amber-600/50 text-amber-300"
                          : "text-slate-500 hover:text-slate-300 border border-transparent"
                      }`}
                    >
                      {r}天
                    </button>
                  ))}
                </div>
              </div>

              {roiChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={roiChartData} margin={{ top: 5, right: 10, bottom: 5, left: -15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip content={<RoiTooltip />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
                    <Line
                      type="monotone"
                      dataKey="roi"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            key={`dot-${payload.date}`}
                            cx={cx} cy={cy} r={4}
                            fill={payload.roi >= 0 ? "#10b981" : "#ef4444"}
                            stroke="none"
                          />
                        );
                      }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">
                  此時間範圍內無購買記錄
                </div>
              )}
              <div className="text-center text-[10px] text-slate-600 mt-1">
                綠點 = 正 ROI · 紅點 = 負 ROI · 橫線 = 損益平衡
              </div>
            </motion.div>

            {/* ── 時辰命中率熱力圖 ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-5 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-orange-300 tracking-wider">各時辰命中率熱力圖</h3>
              </div>

              {/* 熱力格 */}
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2 mb-4">
                {hourHeatData.map((h) => (
                  <div
                    key={h.hour}
                    className="rounded-xl p-2 text-center transition-all hover:scale-105 cursor-default"
                    style={{ backgroundColor: heatColor(h.winRate), border: `1px solid ${heatColor(h.winRate)}` }}
                    title={`${h.hour}時：${h.total}筆，中獎${h.won}筆，命中率${h.winRate}%`}
                  >
                    <div className="text-base font-bold text-white/90">{h.hour}</div>
                    <div className="text-xs font-black text-white mt-0.5">
                      {h.total > 0 ? `${h.winRate}%` : "-"}
                    </div>
                    <div className="text-[9px] text-white/50 mt-0.5">
                      {h.total > 0 ? `${h.total}筆` : "無資料"}
                    </div>
                  </div>
                ))}
              </div>

              {/* 長條圖 */}
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={hourHeatData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<HourTooltip />} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {hourHeatData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.total === 0 ? "rgba(100,116,139,0.2)" : heatColor(entry.winRate)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(0) }} />
                  <span>0%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(30) }} />
                  <span>30%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(60) }} />
                  <span>60%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(100) }} />
                  <span>100%</span>
                </div>
              </div>
            </motion.div>

            {/* ── 面額分析 ── */}
            {scratchStats?.byDenomination && scratchStats.byDenomination.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-900/60 border border-gray-700/40 rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300 tracking-wider">各面額投報分析</h3>
                </div>
                <div className="space-y-3">
                  {scratchStats.byDenomination.map((d) => {
                    const roi = d.totalInvested > 0 ? Math.round(((d.totalWon - d.totalInvested) / d.totalInvested) * 100) : 0;
                    const winRate = d.total > 0 ? Math.round((d.won / d.total) * 100) : 0;
                    return (
                      <div key={d.denomination} className="flex items-center gap-3">
                        <div className="w-16 text-right">
                          <span className="text-xs font-bold text-slate-300">${d.denomination}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500">{d.total}筆 · 中獎{d.won}筆 · 命中率{winRate}%</span>
                            <span className={`text-xs font-bold ${roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              ROI {roi >= 0 ? "+" : ""}{roi}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(winRate, 100)}%`,
                                backgroundColor: winRate >= 50 ? "#10b981" : winRate >= 25 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
