import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Star, Zap, CalendarDays } from "lucide-react";
import { SharedNav } from "@/components/SharedNav";

// 節氣資料（簡化版，用於日曆標記）
const SOLAR_TERMS_2026: Record<string, string> = {
  "2026-01-06": "小寒",
  "2026-01-20": "大寒",
  "2026-02-04": "立春",
  "2026-02-19": "雨水",
  "2026-03-06": "驚蟄",
  "2026-03-20": "春分",
  "2026-04-05": "清明",
  "2026-04-20": "穀雨",
  "2026-05-06": "立夏",
  "2026-05-21": "小滿",
  "2026-06-06": "芒種",
  "2026-06-21": "夏至",
  "2026-07-07": "小暑",
  "2026-07-23": "大暑",
  "2026-08-07": "立秋",
  "2026-08-23": "處暑",
  "2026-09-08": "白露",
  "2026-09-23": "秋分",
  "2026-10-08": "寒露",
  "2026-10-23": "霜降",
  "2026-11-07": "立冬",
  "2026-11-22": "小雪",
  "2026-12-07": "大雪",
  "2026-12-22": "冬至",
};

// 月柱切換節氣（月柱起始）
const MONTH_PILLAR_TERMS: Record<string, string> = {
  "2026-01-06": "壬丑月",
  "2026-02-04": "庚寅月",
  "2026-03-06": "辛卯月",
  "2026-04-05": "壬辰月",
  "2026-05-06": "癸巳月",
  "2026-06-06": "甲午月",
  "2026-07-07": "乙未月",
  "2026-08-07": "丙申月",
  "2026-09-08": "丁酉月",
  "2026-10-08": "戊戌月",
  "2026-11-07": "己亥月",
  "2026-12-07": "庚子月",
};

const ENERGY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  excellent: { bg: "bg-amber-500/15",  border: "border-amber-500/40",  text: "text-amber-400",  dot: "bg-amber-400" },
  good:      { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400" },
  neutral:   { bg: "bg-slate-600/15",  border: "border-slate-600/40",  text: "text-slate-400",  dot: "bg-slate-500" },
  challenging:{ bg: "bg-red-500/10",   border: "border-red-500/30",    text: "text-red-400",    dot: "bg-red-400" },
  complex:   { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-400" },
};

const ENERGY_LABELS: Record<string, string> = {
  excellent: "大吉", good: "吉", neutral: "平", challenging: "凶", complex: "複雜",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// 取得指定月份的月柱
function getMonthPillarLabel(year: number, month: number): string {
  // 找出當月有效的月柱（從月初往前找最近的切換節氣）
  const keys = Object.keys(MONTH_PILLAR_TERMS).sort();
  let label = "";
  for (const key of keys) {
    const [y, m] = key.split("-").map(Number);
    if (y < year || (y === year && m <= month)) {
      label = MONTH_PILLAR_TERMS[key];
    }
  }
  return label;
}

export default function OracleCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const { data: calendarData, isLoading } = trpc.calendar.monthly.useQuery({
    year: viewYear,
    month: viewMonth,
  });

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  const selectedDayData = useMemo(() => {
    if (!selectedDay || !calendarData) return null;
    return calendarData.days.find(d => d.date === selectedDay) ?? null;
  }, [selectedDay, calendarData]);

  const navigateMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setViewMonth(newMonth);
    setViewYear(newYear);
    setSelectedDay(null);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setSelectedDay(today.getDate());
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  // 取得節氣標記
  const getSolarTerm = (day: number): string | null => {
    const key = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return SOLAR_TERMS_2026[key] || null;
  };

  // 取得月柱切換標記
  const getMonthPillarChange = (day: number): string | null => {
    const key = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return MONTH_PILLAR_TERMS[key] || null;
  };

  const currentMonthPillar = useMemo(() => getMonthPillarLabel(viewYear, viewMonth), [viewYear, viewMonth]);

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="calendar" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* 標題 */}
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs tracking-[0.3em] text-teal-500/70 mb-3 uppercase">Oracle Resonance · Calendar</div>
          <h1 className="text-4xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            天命日曆
          </h1>
          <p className="text-slate-400 text-sm">每日天干地支與能量等級，提前規劃您的天命時機</p>
        </motion.div>

        {/* 月份導航 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="text-center">
            <div className="text-xl font-semibold text-white">{viewYear} 年 {viewMonth} 月</div>
            {currentMonthPillar && (
              <div className="text-xs text-teal-400/80 mt-0.5 tracking-wider">{currentMonthPillar}</div>
            )}
          </div>
          <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 快速工具列 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>
            <span>節氣日</span>
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block ml-2"></span>
            <span>月柱切換</span>
          </div>
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-900/40 border border-teal-600/40 text-teal-400 text-xs hover:bg-teal-900/60 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            回到今日
          </button>
        </div>

        {/* 星期標題 */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs text-slate-600 py-2">{d}</div>
          ))}
        </div>

        {/* 日曆格 */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-slate-800/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* 空白格 */}
            {[...Array(firstDayOfWeek)].map((_, i) => (
              <div key={`empty-${i}`} className="h-16" />
            ))}
            {/* 日期格 */}
            {calendarData?.days.map((day) => {
              const colors = ENERGY_COLORS[day.energyLevel] ?? ENERGY_COLORS.neutral;
              const selected = selectedDay === day.date;
              const todayFlag = isToday(day.date);
              const solarTerm = getSolarTerm(day.date);
              const monthPillarChange = getMonthPillarChange(day.date);
              const hasSolarTerm = !!solarTerm;
              const hasMonthPillar = !!monthPillarChange;

              return (
                <motion.button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                  className={`
                    relative h-16 rounded-lg border text-left p-1.5 transition-all
                    ${selected ? `${colors.bg} ${colors.border} ring-1 ring-offset-0 ring-current` :
                      hasSolarTerm ? 'bg-teal-900/20 border-teal-700/40 hover:border-teal-600' :
                      hasMonthPillar ? 'bg-purple-900/20 border-purple-700/40 hover:border-purple-600' :
                      `bg-slate-900/40 border-slate-800/50 hover:border-slate-700`}
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* 日期數字 */}
                  <div className={`text-sm font-semibold leading-none mb-0.5 ${todayFlag ? "text-amber-400" : selected ? colors.text : hasSolarTerm ? "text-teal-300" : "text-slate-300"}`}>
                    {day.date}
                    {todayFlag && <span className="ml-0.5 text-[9px] text-amber-400">今</span>}
                  </div>
                  {/* 節氣或干支 */}
                  {hasSolarTerm ? (
                    <div className="text-[9px] text-teal-400 leading-none mb-0.5 font-medium">{solarTerm}</div>
                  ) : (
                    <div className="text-[9px] text-slate-500 leading-none mb-0.5">
                      {day.dayPillar.stem}{day.dayPillar.branch}
                    </div>
                  )}
                  {/* 能量點 + 月相 + 月柱切換 */}
                  <div className="flex items-center gap-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    {day.isFullMoon && <span className="text-[9px]">🌕</span>}
                    {day.isNewMoon && <span className="text-[9px]">🌑</span>}
                    {hasMonthPillar && <span className="text-[8px] text-purple-400 ml-0.5">柱</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* 能量圖例 */}
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {Object.entries(ENERGY_LABELS).map(([level, label]) => {
            const colors = ENERGY_COLORS[level];
            return (
              <div key={level} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                {label}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>🌕</span> 滿月
          </div>
          <div className="flex items-center gap-1.5 text-xs text-teal-500/70">
            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span> 節氣
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-500/70">
            <span className="text-[10px] text-purple-400">柱</span> 月柱切換
          </div>
        </div>

        {/* 選中日期詳情 */}
        <AnimatePresence>
          {selectedDayData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              {(() => {
                const colors = ENERGY_COLORS[selectedDayData.energyLevel] ?? ENERGY_COLORS.neutral;
                return (
                  <div className={`rounded-2xl border p-6 ${colors.bg} ${colors.border} backdrop-blur-sm`}>
                    {/* 日期標題 */}
                    {/* 節氣標記 */}
                    {getSolarTerm(selectedDayData.date) && (
                      <div className="mb-3 px-3 py-2 bg-teal-900/30 border border-teal-600/40 rounded-xl flex items-center gap-2">
                        <span className="text-teal-400 text-sm">🌿</span>
                        <span className="text-teal-300 text-sm font-semibold">{getSolarTerm(selectedDayData.date)}</span>
                        <span className="text-teal-500/70 text-xs">— 節氣切換日</span>
                        {getMonthPillarChange(selectedDayData.date) && (
                          <span className="ml-auto text-purple-300 text-xs">進入 {getMonthPillarChange(selectedDayData.date)}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          {viewYear}年{viewMonth}月{selectedDayData.date}日
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-lg font-semibold ${colors.text}`}>
                            {selectedDayData.dayPillar.stem}{selectedDayData.dayPillar.branch}日
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} border ${colors.border} ${colors.text}`}>
                            {ENERGY_LABELS[selectedDayData.energyLevel]}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl">{selectedDayData.moonEmoji}</div>
                        <div className="text-xs text-slate-500 mt-1">{selectedDayData.moonPhase}</div>
                      </div>
                    </div>

                    {/* 五行信息 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-900/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500 mb-1">天干五行</div>
                        <div className={`text-sm font-medium ${colors.text}`}>
                          {selectedDayData.dayPillar.stem} · {selectedDayData.dayPillar.stemElement}
                        </div>
                      </div>
                      <div className="bg-slate-900/40 rounded-xl p-3">
                        <div className="text-xs text-slate-500 mb-1">地支五行</div>
                        <div className={`text-sm font-medium ${colors.text}`}>
                          {selectedDayData.dayPillar.branch} · {selectedDayData.dayPillar.branchElement}
                        </div>
                      </div>
                    </div>

                    {/* 宜忌 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Star className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">宜</span>
                        </div>
                        <div className="space-y-1">
                          {selectedDayData.auspicious.map((item: string, i: number) => (
                            <div key={i} className="text-xs text-slate-300">{item}</div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">忌</span>
                        </div>
                        <div className="space-y-1">
                          {selectedDayData.inauspicious.map((item: string, i: number) => (
                            <div key={i} className="text-xs text-slate-300">{item}</div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 能量描述 */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {selectedDayData.dayPillar.energyDescription}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
