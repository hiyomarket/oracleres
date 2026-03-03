/**
 * 未來運勢預覽頁面（/luck-cycle）
 * 獨立模塊頁面：五年運勢分析
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Zap } from "lucide-react";

const LEVEL_COLOR: Record<string, string> = {
  "大吉": "text-yellow-300 border-yellow-400/50 bg-yellow-900/20",
  "吉": "text-green-300 border-green-400/50 bg-green-900/20",
  "平": "text-gray-300 border-gray-500/50 bg-gray-800/20",
  "凶": "text-red-300 border-red-400/50 bg-red-900/20",
  "大凶": "text-red-400 border-red-500/50 bg-red-900/30",
};
const LEVEL_BADGE: Record<string, string> = {
  "大吉": "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40",
  "吉": "bg-green-500/20 text-green-300 border border-green-500/40",
  "平": "bg-gray-600/20 text-gray-400 border border-gray-600/40",
  "凶": "bg-red-500/20 text-red-300 border border-red-500/40",
  "大凶": "bg-red-700/20 text-red-400 border border-red-700/40",
};
const MONTH_NAMES = ["正月","二月","三月","四月","五月","六月","七月","八月","九月","十月","冬月","臘月"];

export default function LuckCyclePage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [expandedYear, setExpandedYear] = useState<number | null>(new Date().getFullYear());
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = trpc.profile.yearlyAnalysis.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  const hasAccess = isAdmin || hasFeature("profile");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="luck-cycle" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> 未來五年運勢
          </h1>
          <p className="text-white/40 text-sm mt-1">你的運勢正在轉動，看看未來幾年有什麼好事等著你</p>
        </motion.div>

        {/* 內容區 */}
        {!hasAccess ? (
          <FeatureLockedCard feature="profile" />
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">還沒有資料，請先到個人設定填寫生辰資料 ✨</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-3"
          >
            {/* 年份列表 */}
            {data.map((yr) => {
              const isCurrentYear = yr.year === currentYear;
              const isExpanded = expandedYear === yr.year;
              const levelCls = LEVEL_COLOR[yr.overallLevel] ?? LEVEL_COLOR["平"];
              const badgeCls = LEVEL_BADGE[yr.overallLevel] ?? LEVEL_BADGE["平"];
              return (
                <div key={yr.year} className={`border rounded-xl overflow-hidden transition-all ${
                  isCurrentYear ? "border-cyan-500/60 bg-cyan-900/10" : "border-gray-700/50 bg-gray-800/20"
                }`}>
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedYear(isExpanded ? null : yr.year)}
                  >
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className={`text-base font-bold ${isCurrentYear ? "text-cyan-300" : "text-gray-200"}`}>
                        {yr.year}
                      </div>
                      <div className="text-[10px] text-gray-500">{yr.pillar}</div>
                    </div>
                    <div className="flex-shrink-0 text-center w-12">
                      <div className={`text-2xl font-black ${
                        yr.overallScore >= 8 ? "text-yellow-300" :
                        yr.overallScore >= 6 ? "text-green-300" :
                        yr.overallScore >= 4 ? "text-gray-300" : "text-red-300"
                      }`}>
                        {yr.overallScore.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-gray-500">分</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-200 font-medium truncate">{yr.yearTheme}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate">{yr.opportunities}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badgeCls}`}>
                        {yr.overallLevel}
                      </span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                        : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-700/50 p-3 space-y-3">
                      {/* 四化 - 白話版 */}
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { key: "hua_lu", label: "💰 財運加持", color: "text-yellow-300", icon: "★" },
                          { key: "hua_quan", label: "💪 掌控力提升", color: "text-orange-300", icon: "▲" },
                          { key: "hua_ke", label: "🌟 貴人相助", color: "text-blue-300", icon: "◆" },
                          { key: "hua_ji", label: "⚠️ 需要留意", color: "text-red-400", icon: "✖" },
                        ] as const).map(({ key, label, color, icon }) => {
                          const t = yr.fourTransformations[key];
                          return (
                            <div key={key} className="bg-gray-900/40 rounded-lg p-2">
                              <div className={`text-xs font-bold ${color} mb-1`}>{label}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{t.meaning}</div>
                            </div>
                          );
                        })}
                      </div>
                      {/* 注意事項 */}
                      <div className="flex items-start gap-2 bg-red-900/10 border border-red-500/20 rounded-lg p-2">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-[11px] text-red-300">{yr.cautions}</div>
                      </div>

                      {/* 流月分析 */}
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span className="text-xs text-amber-300 font-bold">每個月的能量預覽</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {yr.months.map((m, idx) => {
                            const mBadge = LEVEL_BADGE[m.level] ?? LEVEL_BADGE["平"];
                            const isCurrentMonth = isCurrentYear && idx === new Date().getMonth();
                            return (
                              <div key={idx} className={`rounded-lg p-2 text-center transition-all ${
                                isCurrentMonth
                                  ? "bg-cyan-900/40 border border-cyan-500/40"
                                  : "bg-gray-900/50"
                              }`}>
                                <div className={`text-[10px] ${isCurrentMonth ? "text-cyan-400" : "text-gray-400"}`}>
                                  {MONTH_NAMES[idx]}
                                </div>
                                <div className="text-xs text-gray-200 font-mono">{m.pillar}</div>
                                <div className={`text-[10px] mt-0.5 px-1 py-0.5 rounded-full inline-block ${mBadge}`}>
                                  {m.level}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1 leading-tight">{m.focus}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* 底部說明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-4"
        >
          <h3 className="text-cyan-300 text-xs font-semibold mb-2">📅 怎麼看這份運勢？</h3>
          <p className="text-white/40 text-xs leading-relaxed">
            這份運勢是根據你的生辰八字，推算未來五年每年的整體走向，以及每個月的能量高低。
            分數越高代表這段時間越順，可以大膽出擊；分數偏低時建議保守一點，多留意細節。
          </p>
        </motion.div>
      </main>
    </div>
  );
}
