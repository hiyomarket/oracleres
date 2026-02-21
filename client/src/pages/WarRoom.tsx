import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";

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

export default function WarRoom() {
  const { data, isLoading, error } = trpc.warRoom.dailyReport.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"overview" | "tarot" | "outfit" | "wealth" | "hours">("overview");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
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
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
          <SharedNav currentPage="warRoom" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-red-400">無法載入今日作戰室，請稍後再試</p>
        </main>
      </div>
    );
  }

  const wuxingTheme = WUXING_COLORS[data.tenGod.wuxing] || WUXING_COLORS["木"];

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      {/* 背景動態光效 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 ${data.tenGod.wuxing === "火" ? "bg-red-500" : data.tenGod.wuxing === "土" ? "bg-amber-500" : data.tenGod.wuxing === "金" ? "bg-slate-400" : data.tenGod.wuxing === "水" ? "bg-blue-500" : "bg-emerald-500"}`} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <SharedNav currentPage="warRoom" />

      <main className="flex-1 container max-w-6xl mx-auto px-4 py-6 pb-24 relative z-10">

        {/* ═══ 模塊A：頂部核心數據看板 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* 標題列 */}
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                ⚔️ 今日作戰室
              </h1>
              <p className="text-white/40 text-xs mt-1 tracking-widest hidden sm:block">TODAY'S WAR ROOM · ORACLE RESONANCE</p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-amber-400 font-mono text-base md:text-lg">{timeStr}</div>
              <div className="text-white/40 text-xs">{data.date.gregorian}</div>
              <div className="text-white/40 text-xs">週{data.date.weekday}</div>
            </div>
          </div>

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

        {/* ═══ 分頁切換 ═══ */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {([
            { key: "overview", label: "🌳 英雄劇本" },
            { key: "tarot", label: "🃏 塔羅流日" },
            { key: "outfit", label: "👗 穿搭手串" },
            { key: "wealth", label: "💰 財運羅盤" },
            { key: "hours", label: "⏰ 時辰能量" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-amber-500/20 border border-amber-500/50 text-amber-300"
                  : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ 模塊B：英雄劇本 + 十神分析 ═══ */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* 英雄劇本 */}
              <SectionCard title="今日英雄劇本" icon="🌳" className="md:col-span-2">
                <div className={`rounded-xl border ${wuxingTheme.border} ${wuxingTheme.bg} p-4`}>
                  <div className={`text-xs font-semibold ${wuxingTheme.text} mb-3`}>
                    {data.date.dayPillar}日 · {data.tenGod.main}當令 · {data.tenGod.role}
                  </div>
                  <p className="text-white/90 leading-relaxed text-sm">{data.heroScript}</p>
                </div>
              </SectionCard>

              {/* 十神能量 */}
              <SectionCard title="十神能量分析" icon="☯️">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-sm">主十神</span>
                    <span className={`font-bold text-lg ${wuxingTheme.text}`}>{data.tenGod.main}</span>
                  </div>
                  <div className="text-white/80 text-sm">{data.tenGod.energy}</div>
                  <ScoreBar score={data.tenGod.score} />
                  <p className="text-white/60 text-xs">{data.tenGod.advice}</p>
                  {data.tenGod.branchGods.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-white/40 text-xs mb-2">地支藏干</div>
                      <div className="flex gap-2 flex-wrap">
                        {data.tenGod.branchGods.map((bg, i) => (
                          <span key={i} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
                            {bg.stem} → {bg.tenGod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

              {/* 月相影響 */}
              <SectionCard title="月相能量" icon={data.moon.emoji}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{data.moon.phase}</span>
                    <span className="text-white/50 text-sm">農曆第{data.moon.lunarDay}日</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-slate-400 to-white"
                      style={{ width: `${data.moon.illumination}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-xs">{data.moon.castInfluence}</p>
                  {data.moon.isFullMoon && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-amber-300 text-xs">
                      ✨ 滿月加持：今日聖杯機率 +10%
                    </div>
                  )}
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ═══ 塔羅流日 ═══ */}
          {activeTab === "tarot" && (
            <motion.div
              key="tarot"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <SectionCard title="今日塔羅流日牌" icon="🃏" className="md:col-span-2">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* 塔羅牌視覺 */}
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
                  {/* 塔羅解讀 */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="text-amber-400 font-bold text-xl">{data.tarot.name}</div>
                      <div className="text-white/50 text-sm mt-1">計算方式：{data.tarot.calculation}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {data.tarot.keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">{kw}</span>
                      ))}
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <div className="text-white/40 text-xs mb-2">今日能量</div>
                      <p className="text-white/80 text-sm">{data.tarot.energy}</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                      <div className="text-amber-400/70 text-xs mb-2">行動建議</div>
                      <p className="text-white/80 text-sm">{data.tarot.advice}</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ═══ 穿搭手串 ═══ */}
          {activeTab === "outfit" && (
            <motion.div
              key="outfit"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* 穿搭建議 */}
              <SectionCard title="今日穿搭建議" icon="👗">
                <div className="space-y-3">
                  <div className="text-white/50 text-xs mb-2">{data.outfit.summary}</div>
                  {/* 上衣 */}
                  <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400 text-xs font-semibold">上衣</span>
                      <span className="text-white font-medium text-sm">{data.outfit.top.color}</span>
                      <span className="text-red-500/60 text-xs ml-auto">{data.outfit.top.element}</span>
                    </div>
                    <p className="text-white/50 text-xs">{data.outfit.top.reason}</p>
                  </div>
                  {/* 下身 */}
                  <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 text-xs font-semibold">下身</span>
                      <span className="text-white font-medium text-sm">{data.outfit.bottom.color}</span>
                      <span className="text-amber-500/60 text-xs ml-auto">{data.outfit.bottom.element}</span>
                    </div>
                    <p className="text-white/50 text-xs">{data.outfit.bottom.reason}</p>
                  </div>
                  {/* 鞋子 */}
                  <div className="rounded-xl bg-slate-800/40 border border-slate-500/20 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-slate-300 text-xs font-semibold">鞋子</span>
                      <span className="text-white font-medium text-sm">{data.outfit.shoes.color}</span>
                      <span className="text-slate-400/60 text-xs ml-auto">{data.outfit.shoes.element}</span>
                    </div>
                    <p className="text-white/50 text-xs">{data.outfit.shoes.reason}</p>
                  </div>
                </div>
              </SectionCard>

              {/* 手串矩陣 */}
              <SectionCard title="今日手串矩陣" icon="📿">
                <div className="space-y-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                    <p className="text-white/70 text-sm">{data.bracelets.summary}</p>
                  </div>
                  <div>
                    <div className="text-emerald-400/70 text-xs font-semibold mb-2">✋ 左手（補能量）</div>
                    <div className="space-y-2">
                      {data.bracelets.leftHand.map((item: { bracelet: { name: string; primaryElement: string; secondaryElement?: string; role: string; power: string }; reason: string; priority: number }, i: number) => (
                        <div key={i} className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-emerald-300 font-medium text-sm">{item.bracelet.name}</span>
                            <span className="text-emerald-500/60 text-xs">{item.bracelet.primaryElement}{item.bracelet.secondaryElement ? `/${item.bracelet.secondaryElement}` : ''}</span>
                          </div>
                          <p className="text-white/50 text-xs">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-400/70 text-xs font-semibold mb-2">🤚 右手（防護）</div>
                    <div className="space-y-2">
                      {data.bracelets.rightHand.map((item: { bracelet: { name: string; primaryElement: string; secondaryElement?: string; role: string; power: string }; reason: string; priority: number }, i: number) => (
                        <div key={i} className="rounded-lg bg-blue-950/20 border border-blue-500/20 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-blue-300 font-medium text-sm">{item.bracelet.name}</span>
                            <span className="text-blue-500/60 text-xs">{item.bracelet.primaryElement}{item.bracelet.secondaryElement ? `/${item.bracelet.secondaryElement}` : ''}</span>
                          </div>
                          <p className="text-white/50 text-xs">{item.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ═══ 財運羅盤 ═══ */}
          {activeTab === "wealth" && (
            <motion.div
              key="wealth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* 偏財指數 */}
              <SectionCard title="今日偏財指數" icon="🎰">
                <div className="text-center mb-4">
                  <div className={`text-6xl font-bold ${SCORE_COLOR(data.wealthCompass.lotteryIndex)}`}>
                    {data.wealthCompass.lotteryIndex}
                  </div>
                  <div className="text-white/40 text-sm">/ 10</div>
                  <ScoreBar score={data.wealthCompass.lotteryIndex} />
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-white/70 text-sm">{data.wealthCompass.lotteryAdvice}</p>
                </div>
              </SectionCard>

              {/* 財富引擎 */}
              <SectionCard title="今日財富引擎" icon="⚙️">
                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                    <p className="text-white/80 text-sm">{data.wealthCompass.wealthEngine}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <div className="text-white/40 text-xs mb-2">立即行動</div>
                    <p className="text-amber-300 text-sm font-medium">{data.wealthCompass.bestAction}</p>
                  </div>
                </div>
              </SectionCard>

              {/* 曜禾集商業羅盤 */}
              <SectionCard title="曜禾集商業羅盤" icon="🧭" className="md:col-span-2">
                <div className="rounded-xl bg-gradient-to-br from-amber-950/30 to-slate-900/30 border border-amber-500/20 p-5">
                  <p className="text-white/80 text-sm leading-relaxed">{data.wealthCompass.businessCompass}</p>
                </div>
              </SectionCard>
            </motion.div>
          )}

          {/* ═══ 時辰能量 ═══ */}
          {activeTab === "hours" && (
            <motion.div
              key="hours"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {/* 最佳時辰 */}
              <SectionCard title="今日最佳時辰" icon="⭐">
                <div className="grid grid-cols-3 gap-3">
                  {data.hourEnergy.bestHours.map((h: { name: string; branch: string; stem: string; score: number; displayTime: string }, i: number) => (
                    <div key={i} className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
                      <div className="text-amber-300 font-bold">{h.name}</div>
                      <div className="text-white/50 text-xs">{h.displayTime}</div>
                      <div className="text-amber-400 text-sm font-semibold mt-1">{h.score}/10</div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* 全天時辰表 */}
              <SectionCard title="全天時辰能量時間軸" icon="🕐">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {data.hourEnergy.allHours.map((h: { name: string; branch: string; stem: string; score: number; level: string; label: string; isCurrent: boolean; displayTime: string }, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`rounded-lg p-3 border transition-all ${
                        h.isCurrent
                          ? "bg-amber-500/20 border-amber-500/60 shadow-lg shadow-amber-500/10"
                          : "bg-white/3 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium text-sm ${h.isCurrent ? "text-amber-300" : "text-white/70"}`}>
                          {h.name} {h.isCurrent && <span className="text-amber-400 text-xs ml-1">●當前</span>}
                        </span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          h.label === '大吉' ? 'bg-amber-500/20 text-amber-400' :
                          h.label === '吉' ? 'bg-emerald-500/20 text-emerald-400' :
                          h.label === '平' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
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
                            className={`h-full rounded-full ${
                              h.score >= 80 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                              h.score >= 60 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                              h.score >= 40 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                              'bg-gradient-to-r from-red-600 to-red-500'
                            }`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ 底部快捷按鈕 ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <a
            href="/"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center hover:bg-amber-500/20 transition-all"
          >
            <div className="text-2xl mb-1">🪬</div>
            <div className="text-amber-300 font-medium text-sm">前往擲筊</div>
            <div className="text-white/40 text-xs">以今日能量問卜</div>
          </a>
          <a
            href="/lottery"
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center hover:bg-emerald-500/20 transition-all"
          >
            <div className="text-2xl mb-1">🎰</div>
            <div className="text-emerald-300 font-medium text-sm">刮刮樂選號</div>
            <div className="text-white/40 text-xs">偏財指數 {data.wealthCompass.lotteryIndex}/10</div>
          </a>
        </motion.div>

      </main>
    </div>
  );
}
