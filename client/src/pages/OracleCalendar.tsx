import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, CalendarDays, Sun, Moon, MapPin, Clock } from "lucide-react";
import { SharedNav } from "@/components/SharedNav";

// 節氣資料（2025-2027年）
const SOLAR_TERMS: Record<string, string> = {
  "2025-01-05": "小寒", "2025-01-20": "大寒",
  "2025-02-03": "立春", "2025-02-18": "雨水",
  "2025-03-05": "驚蟄", "2025-03-20": "春分",
  "2025-04-04": "清明", "2025-04-20": "穀雨",
  "2025-05-05": "立夏", "2025-05-21": "小滿",
  "2025-06-05": "芒種", "2025-06-21": "夏至",
  "2025-07-07": "小暑", "2025-07-22": "大暑",
  "2025-08-07": "立秋", "2025-08-23": "處暑",
  "2025-09-07": "白露", "2025-09-23": "秋分",
  "2025-10-08": "寒露", "2025-10-23": "霜降",
  "2025-11-07": "立冬", "2025-11-22": "小雪",
  "2025-12-07": "大雪", "2025-12-22": "冬至",
  "2026-01-06": "小寒", "2026-01-20": "大寒",
  "2026-02-04": "立春", "2026-02-19": "雨水",
  "2026-03-06": "驚蟄", "2026-03-20": "春分",
  "2026-04-05": "清明", "2026-04-20": "穀雨",
  "2026-05-06": "立夏", "2026-05-21": "小滿",
  "2026-06-06": "芒種", "2026-06-21": "夏至",
  "2026-07-07": "小暑", "2026-07-23": "大暑",
  "2026-08-07": "立秋", "2026-08-23": "處暑",
  "2026-09-08": "白露", "2026-09-23": "秋分",
  "2026-10-08": "寒露", "2026-10-23": "霜降",
  "2026-11-07": "立冬", "2026-11-22": "小雪",
  "2026-12-07": "大雪", "2026-12-22": "冬至",
  "2027-01-05": "小寒", "2027-01-20": "大寒",
  "2027-02-03": "立春", "2027-02-18": "雨水",
  "2027-03-06": "驚蟄", "2027-03-21": "春分",
};

// 月柱切換節氣
const MONTH_PILLAR_TERMS: Record<string, string> = {
  "2025-01-05": "丙子月", "2025-02-03": "丁丑月", "2025-03-05": "戊寅月",
  "2025-04-04": "己卯月", "2025-05-05": "庚辰月", "2025-06-05": "辛巳月",
  "2025-07-07": "壬午月", "2025-08-07": "癸未月", "2025-09-07": "甲申月",
  "2025-10-08": "乙酉月", "2025-11-07": "丙戌月", "2025-12-07": "丁亥月",
  "2026-01-06": "壬丑月", "2026-02-04": "庚寅月", "2026-03-06": "辛卯月",
  "2026-04-05": "壬辰月", "2026-05-06": "癸巳月", "2026-06-06": "甲午月",
  "2026-07-07": "乙未月", "2026-08-07": "丙申月", "2026-09-08": "丁酉月",
  "2026-10-08": "戊戌月", "2026-11-07": "己亥月", "2026-12-07": "庚子月",
  "2027-01-05": "辛丑月", "2027-02-03": "壬寅月", "2027-03-06": "癸卯月",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const WEEKDAY_FULL = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

const ENERGY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; badge: string }> = {
  excellent: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-400", badge: "bg-amber-500/20 text-amber-300" },
  good:      { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  neutral:   { bg: "bg-slate-600/15", border: "border-slate-600/40", text: "text-slate-400", dot: "bg-slate-500", badge: "bg-slate-700/50 text-slate-400" },
  challenging: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-400", badge: "bg-red-500/20 text-red-300" },
  complex:   { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-400", badge: "bg-purple-500/20 text-purple-300" },
};

const ENERGY_LABELS: Record<string, string> = {
  excellent: "大吉", good: "吉", neutral: "平", challenging: "凶", complex: "複雜",
};

function getMonthPillarLabel(year: number, month: number): string {
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

// 計算當前節氣範圍
function getCurrentSolarTermRange(year: number, month: number, day: number): { name: string; start: string; end: string } | null {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const allTerms = Object.entries(SOLAR_TERMS).sort((a, b) => a[0].localeCompare(b[0]));
  
  let currentTerm: string | null = null;
  let currentStart: string | null = null;
  let nextStart: string | null = null;
  
  for (let i = 0; i < allTerms.length; i++) {
    if (allTerms[i][0] <= dateStr) {
      currentTerm = allTerms[i][1];
      currentStart = allTerms[i][0];
      nextStart = allTerms[i + 1]?.[0] ?? null;
    }
  }
  
  if (!currentTerm || !currentStart) return null;
  
  // 格式化日期為 M/D
  const formatDate = (d: string) => {
    const parts = d.split('-');
    return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  };
  
  return {
    name: currentTerm,
    start: formatDate(currentStart),
    end: nextStart ? formatDate(nextStart) : "下一節氣",
  };
}

interface DayData {
  date: number;
  year: number;
  month: number;
  dayPillar: { stem: string; branch: string; stemElement: string; branchElement: string; energyLevel: string; energyDescription: string; auspicious: string[]; inauspicious: string[] };
  monthPillar: { stem: string; branch: string };
  moonPhase: string;
  moonEmoji: string;
  isFullMoon: boolean;
  isNewMoon: boolean;
  energyLevel: string;
  lunarDate?: { lunarMonth: number; lunarDay: number; lunarMonthName: string; lunarDayName: string; festival: string | null; deityBirthday: string | null; isLunarNewYear: boolean };
  lunarDayName?: string;
  lunarMonthName?: string;
  festival?: string | null;
  deityBirthday?: string | null;
  auspicious: string[];
  inauspicious: string[];
  directions?: { xi: string; fu: string; cai: string };
  pengzu?: string;
  luckyGods?: string[];
  unluckyGods?: string[];
  chong?: string;
  sha?: string;
  hourFortunes?: Array<{ branch: string; stem: string; name: string; time: string; isAuspicious: boolean; yi: string[]; ji: string[]; chong: string; sha: string }>;
}

export default function OracleCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [activeTab, setActiveTab] = useState<'info' | 'hours'>('info');

  const { data: calendarData, isLoading } = trpc.calendar.monthly.useQuery({
    year: viewYear,
    month: viewMonth,
  });

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth - 1, 1).getDay();
  }, [viewYear, viewMonth]);

  const selectedDayData = useMemo(() => {
    if (!selectedDay || !calendarData) return null;
    return calendarData.days.find((d: DayData) => d.date === selectedDay) ?? null;
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

  const getSolarTerm = (day: number): string | null => {
    const key = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return SOLAR_TERMS[key] || null;
  };

  const getMonthPillarChange = (day: number): string | null => {
    const key = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return MONTH_PILLAR_TERMS[key] || null;
  };

  const currentMonthPillar = useMemo(() => getMonthPillarLabel(viewYear, viewMonth), [viewYear, viewMonth]);

  // 取得選中日期的星期
  const selectedWeekday = useMemo(() => {
    if (!selectedDay) return null;
    return new Date(viewYear, viewMonth - 1, selectedDay).getDay();
  }, [selectedDay, viewYear, viewMonth]);

  // 取得選中日期的節氣範圍
  const selectedSolarTermRange = useMemo(() => {
    if (!selectedDay) return null;
    return getCurrentSolarTermRange(viewYear, viewMonth, selectedDay);
  }, [selectedDay, viewYear, viewMonth]);

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="calendar" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* 標題 */}
        <motion.div className="text-center mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-xs tracking-[0.3em] text-teal-500/70 mb-2 uppercase">Oracle Resonance · Calendar</div>
          <h1 className="text-3xl font-bold mb-1"
            style={{ background: "linear-gradient(135deg, #14b8a6, #3b82f6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            天命日曆
          </h1>
          <p className="text-slate-400 text-xs">農曆萬年曆 · 宜忌查詢 · 時辰吉凶</p>
        </motion.div>

        {/* 主體：左月曆 + 右詳情（雙欄佈局） */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* ── 左側：月曆 ── */}
          <div className="lg:w-[420px] flex-shrink-0">
            {/* 月份導航 */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => navigateMonth(-1)} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
              <div className="text-center">
                <div className="text-lg font-semibold text-white">{viewYear} 年 {viewMonth} 月</div>
                {currentMonthPillar && (
                  <div className="text-xs text-teal-400/80 mt-0.5 tracking-wider">{currentMonthPillar}</div>
                )}
              </div>
              <button onClick={() => navigateMonth(1)} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 回到今日 */}
            <div className="flex justify-end mb-2">
              <button
                onClick={goToToday}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-900/40 border border-teal-600/40 text-teal-400 text-xs hover:bg-teal-900/60 transition-colors"
              >
                <CalendarDays className="w-3 h-3" />
                回到今日
              </button>
            </div>

            {/* 星期標題 */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`text-center text-xs py-1.5 font-medium ${i === 0 ? 'text-red-400/70' : i === 6 ? 'text-blue-400/70' : 'text-slate-500'}`}>{d}</div>
              ))}
            </div>

            {/* 日曆格 */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-0.5">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-slate-800/30 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {/* 空白格 */}
                {[...Array(firstDayOfWeek)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-14" />
                ))}
                {/* 日期格 */}
                {calendarData?.days.map((day: DayData) => {
                  const colors = ENERGY_COLORS[day.energyLevel] ?? ENERGY_COLORS.neutral;
                  const selected = selectedDay === day.date;
                  const todayFlag = isToday(day.date);
                  const solarTerm = getSolarTerm(day.date);
                  const monthPillarChange = getMonthPillarChange(day.date);
                  const hasSolarTerm = !!solarTerm;
                  const hasMonthPillar = !!monthPillarChange;
                  const weekday = new Date(viewYear, viewMonth - 1, day.date).getDay();
                  const isSunday = weekday === 0;
                  const isSaturday = weekday === 6;

                  // 農曆顯示：節氣 > 節日 > 農曆日期
                  const lunarDisplay = solarTerm || day.festival || day.lunarDayName || '';

                  return (
                    <motion.button
                      key={day.date}
                      onClick={() => setSelectedDay(day.date === selectedDay ? null : day.date)}
                      className={`
                        relative h-14 rounded-lg border text-left p-1 transition-all
                        ${selected
                          ? `${colors.bg} ${colors.border} ring-1 ring-current`
                          : hasSolarTerm
                          ? 'bg-teal-900/20 border-teal-700/40 hover:border-teal-600'
                          : hasMonthPillar
                          ? 'bg-purple-900/15 border-purple-700/30 hover:border-purple-600'
                          : 'bg-slate-900/40 border-slate-800/50 hover:border-slate-700'}
                        ${todayFlag ? 'ring-1 ring-amber-400/60' : ''}
                      `}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {/* 日期數字 */}
                      <div className={`text-sm font-bold leading-none ${
                        todayFlag ? "text-amber-400" :
                        isSunday ? "text-red-400" :
                        isSaturday ? "text-blue-400" :
                        selected ? colors.text :
                        hasSolarTerm ? "text-teal-300" :
                        "text-slate-200"
                      }`}>
                        {day.date}
                      </div>
                      {/* 農曆/節氣/節日 */}
                      <div className={`text-[9px] leading-none mt-0.5 ${
                        hasSolarTerm ? 'text-teal-400 font-semibold' :
                        day.festival ? 'text-amber-400 font-medium' :
                        'text-slate-500'
                      }`}>
                        {lunarDisplay}
                      </div>
                      {/* 能量點 + 月相 + 月柱切換 */}
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                        {day.isFullMoon && <span className="text-[8px]">🌕</span>}
                        {day.isNewMoon && <span className="text-[8px]">🌑</span>}
                        {hasMonthPillar && <span className="text-[7px] text-purple-400">柱</span>}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* 圖例 */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block"></span>節氣</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>農曆節日</span>
              <span className="flex items-center gap-1"><span className="text-[8px] text-purple-400">柱</span>月柱切換</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>大吉</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>吉</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>凶</span>
            </div>
          </div>

          {/* ── 右側：日期詳情 ── */}
          <div className="flex-1 min-h-[400px]">
            <AnimatePresence mode="wait">
              {selectedDayData ? (
                <motion.div
                  key={selectedDay}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {(() => {
                    const colors = ENERGY_COLORS[selectedDayData.energyLevel] ?? ENERGY_COLORS.neutral;
                    const solarTerm = getSolarTerm(selectedDayData.date);
                    const monthPillarChange = getMonthPillarChange(selectedDayData.date);
                    const weekday = selectedWeekday ?? 0;

                    return (
                      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
                        {/* 頂部：日期概覽 */}
                        <div className="p-4 border-b border-slate-700/50 bg-slate-800/40">
                          {/* 國曆 */}
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs text-slate-500 mb-0.5">國曆</div>
                              <div className="text-xl font-bold text-white">
                                {viewYear} 年 {viewMonth} 月 {selectedDayData.date} 日
                              </div>
                              <div className="text-sm text-slate-400 mt-0.5">
                                {WEEKDAY_FULL[weekday]}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl">{selectedDayData.moonEmoji}</div>
                              <div className="text-xs text-slate-500 mt-1">{selectedDayData.moonPhase}</div>
                            </div>
                          </div>

                          {/* 農曆 */}
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <div>
                              <span className="text-xs text-slate-500">農曆</span>
                              <span className="ml-2 text-sm text-amber-300 font-medium">
                                {selectedDayData.lunarMonthName || selectedDayData.lunarDate?.lunarMonthName || ''}{selectedDayData.lunarDayName || selectedDayData.lunarDate?.lunarDayName || ''}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400">
                              {selectedDayData.dayPillar.stem}{selectedDayData.dayPillar.branch}日
                            </div>
                            <div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                                {ENERGY_LABELS[selectedDayData.energyLevel]}
                              </span>
                            </div>
                          </div>

                          {/* 節氣 */}
                          {selectedSolarTermRange && (
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <span className="text-xs text-slate-500">節氣</span>
                              <span className="text-teal-300 font-semibold">{selectedSolarTermRange.name}</span>
                              <span className="text-slate-500 text-xs">{selectedSolarTermRange.start} - {selectedSolarTermRange.end}</span>
                            </div>
                          )}

                          {/* 神明生日 */}
                          {(selectedDayData.deityBirthday || selectedDayData.lunarDate?.deityBirthday) && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-slate-500">神明生日</span>
                              <span className="text-amber-400 text-sm font-medium">
                                {selectedDayData.deityBirthday || selectedDayData.lunarDate?.deityBirthday}
                              </span>
                            </div>
                          )}

                          {/* 節氣切換提示 */}
                          {solarTerm && (
                            <div className="mt-2 px-3 py-1.5 bg-teal-900/30 border border-teal-600/30 rounded-lg flex items-center gap-2">
                              <span className="text-teal-400 text-xs">🌿 {solarTerm}</span>
                              {monthPillarChange && (
                                <span className="text-purple-300 text-xs ml-auto">→ 進入 {monthPillarChange}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Tab 切換 */}
                        <div className="flex border-b border-slate-700/50">
                          <button
                            onClick={() => setActiveTab('info')}
                            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'info' ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            日課資訊
                          </button>
                          <button
                            onClick={() => setActiveTab('hours')}
                            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === 'hours' ? 'text-teal-400 border-b-2 border-teal-400 bg-teal-900/10' : 'text-slate-500 hover:text-slate-300'}`}
                          >
                            時辰吉凶
                          </button>
                        </div>

                        {/* 日課資訊 Tab */}
                        {activeTab === 'info' && (
                          <div className="p-4 space-y-4">
                            {/* 宜忌 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Sun className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-xs text-emerald-400 font-semibold">宜</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(selectedDayData.auspicious || []).map((item: string, i: number) => (
                                    <span key={i} className="text-[10px] text-slate-300 bg-emerald-900/30 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Moon className="w-3.5 h-3.5 text-red-400" />
                                  <span className="text-xs text-red-400 font-semibold">忌</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(selectedDayData.inauspicious || []).map((item: string, i: number) => (
                                    <span key={i} className="text-[10px] text-slate-300 bg-red-900/30 px-1.5 py-0.5 rounded">{item}</span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* 沖煞、方位 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-800/40 rounded-xl p-3">
                                <div className="text-xs text-slate-500 mb-1.5">沖 / 煞</div>
                                <div className="text-sm text-slate-300">{selectedDayData.chong || '—'}</div>
                                <div className="text-xs text-slate-500 mt-1">煞 {selectedDayData.sha || '—'}</div>
                              </div>
                              <div className="bg-slate-800/40 rounded-xl p-3">
                                <div className="text-xs text-slate-500 mb-1.5">方位</div>
                                {selectedDayData.directions ? (
                                  <div className="space-y-0.5 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-pink-400" />
                                      <span className="text-slate-400">喜神</span>
                                      <span className="text-slate-200">{selectedDayData.directions.xi}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-yellow-400" />
                                      <span className="text-slate-400">福神</span>
                                      <span className="text-slate-200">{selectedDayData.directions.fu}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-emerald-400" />
                                      <span className="text-slate-400">財神</span>
                                      <span className="text-slate-200">{selectedDayData.directions.cai}</span>
                                    </div>
                                  </div>
                                ) : <div className="text-slate-500 text-xs">—</div>}
                              </div>
                            </div>

                            {/* 吉神凶煞 */}
                            {(selectedDayData.luckyGods?.length || selectedDayData.unluckyGods?.length) ? (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-800/40 rounded-xl p-3">
                                  <div className="text-xs text-amber-500/80 mb-1.5">吉神</div>
                                  <div className="text-xs text-slate-300 leading-relaxed">
                                    {selectedDayData.luckyGods?.join('、') || '—'}
                                  </div>
                                </div>
                                <div className="bg-slate-800/40 rounded-xl p-3">
                                  <div className="text-xs text-red-500/80 mb-1.5">凶煞</div>
                                  <div className="text-xs text-slate-300 leading-relaxed">
                                    {selectedDayData.unluckyGods?.join('、') || '—'}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {/* 彭祖百忌 */}
                            {selectedDayData.pengzu && (
                              <div className="bg-slate-800/40 rounded-xl p-3">
                                <div className="text-xs text-slate-500 mb-1.5">彭祖百忌</div>
                                <div className="text-xs text-slate-400 leading-relaxed">{selectedDayData.pengzu}</div>
                              </div>
                            )}

                            {/* 天命能量描述 */}
                            <div className="bg-slate-800/40 rounded-xl p-3">
                              <div className="text-xs text-slate-500 mb-1.5">天命能量</div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {selectedDayData.dayPillar.energyDescription}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* 時辰吉凶 Tab */}
                        {activeTab === 'hours' && (
                          <div className="p-4">
                            <div className="flex items-center gap-1.5 mb-3">
                              <Clock className="w-3.5 h-3.5 text-teal-400" />
                              <span className="text-xs text-teal-400">當日時辰吉凶</span>
                            </div>
                            {selectedDayData.hourFortunes ? (
                              <div className="grid grid-cols-2 gap-2">
                                {selectedDayData.hourFortunes.map((hour: { branch: string; stem: string; name: string; time: string; isAuspicious: boolean; yi: string[]; ji: string[]; chong: string; sha: string }, i: number) => (
                                  <div
                                    key={i}
                                    className={`rounded-xl p-3 border ${
                                      hour.isAuspicious
                                        ? 'bg-emerald-900/20 border-emerald-700/40'
                                        : 'bg-slate-800/40 border-slate-700/40'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-1.5">
                                        {hour.isAuspicious && (
                                          <span className="text-[9px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">吉時</span>
                                        )}
                                        <span className={`text-sm font-bold ${hour.isAuspicious ? 'text-emerald-300' : 'text-slate-300'}`}>
                                          {hour.branch}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-slate-500">{hour.time}</span>
                                    </div>
                                    {hour.yi.length > 0 && (
                                      <div className="mb-1">
                                        <span className="text-[9px] text-emerald-500">宜 </span>
                                        <span className="text-[9px] text-slate-400">{hour.yi.slice(0, 3).join('、')}</span>
                                      </div>
                                    )}
                                    {hour.ji.length > 0 && (
                                      <div className="mb-1">
                                        <span className="text-[9px] text-red-500">忌 </span>
                                        <span className="text-[9px] text-slate-400">{hour.ji.slice(0, 2).join('、')}</span>
                                      </div>
                                    )}
                                    <div className="text-[9px] text-slate-600">沖 {hour.chong} · 煞 {hour.sha}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-slate-500 text-sm py-8">時辰資料載入中...</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center py-16 px-8"
                >
                  <div className="text-5xl mb-4">📅</div>
                  <div className="text-slate-400 text-sm mb-2">點選左側日期</div>
                  <div className="text-slate-600 text-xs">查看農曆宜忌、時辰吉凶等完整資訊</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
