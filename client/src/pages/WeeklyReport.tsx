import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart
} from "recharts";
import { Calendar, TrendingUp, Flame, Droplets, Leaf, Mountain, Wind } from "lucide-react";
import { SharedNav } from "@/components/SharedNav";

const ELEMENT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  fire:  { icon: "🔥", color: "#f97316", label: "火" },
  earth: { icon: "🌍", color: "#ca8a04", label: "土" },
  metal: { icon: "⚪", color: "#94a3b8", label: "金" },
  wood:  { icon: "🌿", color: "#22c55e", label: "木" },
  water: { icon: "🌊", color: "#3b82f6", label: "水" },
};

const COLOR_MAP: Record<string, string> = {
  excellent: "#f97316",
  good:      "#22c55e",
  neutral:   "#3b82f6",
  low:       "#6366f1",
  rest:      "#475569",
};

const COLOR_BG: Record<string, string> = {
  excellent: "bg-orange-900/30 border-orange-500/40",
  good:      "bg-emerald-900/30 border-emerald-500/40",
  neutral:   "bg-blue-900/30 border-blue-500/40",
  low:       "bg-indigo-900/30 border-indigo-500/40",
  rest:      "bg-slate-800/30 border-slate-600/40",
};

const COLOR_TEXT: Record<string, string> = {
  excellent: "text-orange-400",
  good:      "text-emerald-400",
  neutral:   "text-blue-400",
  low:       "text-indigo-400",
  rest:      "text-slate-400",
};

interface DayData {
  date: string;
  dayOffset: number;
  weekday: string;
  isToday: boolean;
  dayPillar: string;
  stemElement: string;
  branchElement: string;
  energyScore: number;
  colorClass: string;
  bestAction: string;
  actionIcon: string;
  moonPhase: string;
  moonEmoji: string;
  isFullMoon: boolean;
  auspicious: string[];
  inauspicious: string[];
}

// 自定義 Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DayData;
  if (!d) return null;
  return (
    <div className="bg-[#0a1628] border border-white/20 rounded-xl p-3 text-xs shadow-2xl min-w-[160px]">
      <div className="font-bold text-white mb-1">{d.isToday ? "今日" : `週${d.weekday}`} · {d.dayPillar}日</div>
      <div className={`text-lg font-black mb-1 ${COLOR_TEXT[d.colorClass]}`}>{d.energyScore}</div>
      <div className="text-slate-400 mb-1">{d.actionIcon} {d.bestAction}</div>
      <div className="text-slate-500">{d.moonEmoji} {d.moonPhase}</div>
    </div>
  );
}

export default function WeeklyReport() {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const { data, isLoading } = trpc.weeklyReport.sevenDays.useQuery();

  const chartData = data?.days.map((d) => ({
    ...d,
    label: d.isToday ? "今日" : `週${d.weekday}`,
    fill: COLOR_MAP[d.colorClass] ?? "#3b82f6",
  })) ?? [];

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="weekly" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* 標題 */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-xs tracking-[0.3em] text-emerald-500/70 mb-3 uppercase">
            Oracle Resonance · Weekly
          </div>
          <h1 className="text-4xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, #22c55e, #3b82f6, #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            命理週報
          </h1>
          <p className="text-slate-400 text-sm">未來七日天命能量走勢，掌握最佳行動時機</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full mx-auto mb-4"
            />
            <p className="text-slate-500 text-sm">正在推算七日天命走勢...</p>
          </div>
        ) : data ? (
          <>
            {/* 週摘要 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 border border-emerald-600/20 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs text-emerald-400/70 mb-1 tracking-wider">本週天命摘要</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{data.weekSummary}</p>
                  <div className="flex gap-4 mt-3">
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-0.5">最佳行動日</div>
                      <div className="text-sm font-bold text-orange-400">
                        {data.bestDay.isToday ? "今日" : `週${data.bestDay.weekday}`} · {data.bestDay.dayPillar}
                      </div>
                    </div>
                    <div className="w-px bg-white/10" />
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-0.5">宜靜養蓄勢</div>
                      <div className="text-sm font-bold text-slate-400">
                        {data.worstDay.isToday ? "今日" : `週${data.worstDay.weekday}`} · {data.worstDay.dayPillar}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 折線圖 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-5 border border-white/10 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-300 tracking-wider">七日能量走勢圖</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={60} stroke="rgba(249,115,22,0.3)" strokeDasharray="4 4" label={{ value: "吉", fill: "#f97316", fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="energyScore"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#energyGradient)"
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const color = COLOR_MAP[payload.colorClass] ?? "#22c55e";
                      return (
                        <circle
                          key={`dot-${payload.date}`}
                          cx={cx} cy={cy} r={payload.isToday ? 6 : 4}
                          fill={color} stroke={payload.isToday ? "#fff" : color}
                          strokeWidth={payload.isToday ? 2 : 0}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedDay(payload)}
                        />
                      );
                    }}
                    activeDot={{ r: 7, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="text-center text-[10px] text-slate-600 mt-1">點擊圓點查看當日詳情</div>
            </motion.div>

            {/* 七日卡片列表 */}
            <div className="space-y-3 mb-6">
              {data.days.map((day, i) => (
                <motion.button
                  key={day.date}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => setSelectedDay(selectedDay?.date === day.date ? null : day)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    selectedDay?.date === day.date
                      ? COLOR_BG[day.colorClass]
                      : day.isToday
                        ? "bg-white/5 border-white/20"
                        : "bg-white/2 border-white/8 hover:bg-white/4"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* 日期 */}
                      <div className="text-center min-w-[40px]">
                        <div className={`text-xs font-bold ${day.isToday ? "text-amber-400" : "text-slate-400"}`}>
                          {day.isToday ? "今日" : `週${day.weekday}`}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5">{day.date.slice(5)}</div>
                      </div>
                      {/* 干支 */}
                      <div>
                        <div className="text-sm font-bold text-white">{day.dayPillar}日</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px]">{ELEMENT_ICONS[day.stemElement]?.icon}</span>
                          <span className="text-[10px] text-slate-500">{ELEMENT_ICONS[day.stemElement]?.label}日</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-[10px]">{day.moonEmoji}</span>
                          <span className="text-[10px] text-slate-500">{day.moonPhase}</span>
                        </div>
                      </div>
                    </div>
                    {/* 能量分數 */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-black ${COLOR_TEXT[day.colorClass]}`}>{day.energyScore}</div>
                        <div className="text-[10px] text-slate-500">能量值</div>
                      </div>
                      {/* 能量條 */}
                      <div className="w-1.5 h-12 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="w-full rounded-full transition-all duration-500"
                          style={{
                            height: `${day.energyScore}%`,
                            backgroundColor: COLOR_MAP[day.colorClass],
                            marginTop: `${100 - day.energyScore}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 展開詳情 */}
                  {selectedDay?.date === day.date && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-[10px] text-slate-500 mb-1">最佳行動</div>
                          <div className={`text-sm font-semibold ${COLOR_TEXT[day.colorClass]}`}>
                            {day.actionIcon} {day.bestAction}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <div className="text-[10px] text-slate-500 mb-1">月相能量</div>
                          <div className="text-sm font-semibold text-slate-300">
                            {day.moonEmoji} {day.moonPhase}
                            {day.isFullMoon && <span className="text-amber-400 ml-1">+10%</span>}
                          </div>
                        </div>
                      </div>
                      {day.auspicious.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {day.auspicious.map((a, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
                              宜 {a}
                            </span>
                          ))}
                          {day.inauspicious.map((b, j) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-500/20">
                              忌 {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* 五行圖例 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="glass-card rounded-2xl p-4 border border-white/8"
            >
              <div className="text-xs text-slate-500 mb-3 tracking-wider">天命能量等級說明</div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { key: "excellent", label: "天命旺", score: "75+" },
                  { key: "good",      label: "吉利",   score: "60+" },
                  { key: "neutral",   label: "平穩",   score: "45+" },
                  { key: "low",       label: "偏低",   score: "30+" },
                  { key: "rest",      label: "宜靜",   score: "<30" },
                ].map(({ key, label, score }) => (
                  <div key={key}>
                    <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: COLOR_MAP[key] }} />
                    <div className={`text-[10px] font-bold ${COLOR_TEXT[key]}`}>{label}</div>
                    <div className="text-[9px] text-slate-600">{score}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </div>
    </div>
  );
}
