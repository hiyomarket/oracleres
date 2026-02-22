import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChevronDown, ChevronUp, Star, TrendingUp, AlertTriangle, Zap } from "lucide-react";

const FOUR_PILLARS = [
  {
    pillar: "年柱",
    heavenlyStem: "甲",
    earthlyBranch: "子",
    stemElement: "木",
    branchElement: "水",
    stemColor: "#4ade80",
    branchColor: "#60a5fa",
    note: "甲子年・偏印",
  },
  {
    pillar: "月柱",
    heavenlyStem: "乙",
    earthlyBranch: "亥",
    stemElement: "木",
    branchElement: "水",
    stemColor: "#4ade80",
    branchColor: "#60a5fa",
    note: "乙亥月・劫財",
  },
  {
    pillar: "日柱",
    heavenlyStem: "甲",
    earthlyBranch: "子",
    stemElement: "木",
    branchElement: "水",
    stemColor: "#4ade80",
    branchColor: "#60a5fa",
    note: "甲子日・日主（甲木）",
  },
  {
    pillar: "時柱",
    heavenlyStem: "己",
    earthlyBranch: "巳",
    stemElement: "土",
    branchElement: "火",
    stemColor: "#d97706",
    branchColor: "#f97316",
    note: "己巳時・正財",
  },
];

const FIVE_ELEMENTS_DATA = [
  { name: "木", value: 42, color: "#4ade80", icon: "🌳", desc: "過旺・忘神（比劫）" },
  { name: "水", value: 35, color: "#60a5fa", icon: "💧", desc: "過旺・忘神（印星）" },
  { name: "火", value: 11, color: "#f97316", icon: "🔥", desc: "用神首要（食傷）—補火第一優先" },
  { name: "土", value: 9, color: "#d97706", icon: "🌍", desc: "喜神（財星）—補土第二優先" },
  { name: "金", value: 4, color: "#d1d5db", icon: "⚪", desc: "喜神（官殺）—補金第三優先" },
];

const LUCKY_STRATEGY = [
  { rank: 1, element: "火", icon: "🔥", role: "食傷・洩木暖局", desc: "洩木生財的唯一關鍵，補充行動力與曝光度，點燃財星（土）", color: "#f97316" },
  { rank: 2, element: "土", icon: "🌍", role: "財星・築壩擋水", desc: "甲木日主的財星，築壩擋水為木提供根基，落地變現實財富", color: "#d97706" },
  { rank: 3, element: "金", icon: "⚪", role: "官殺・劈木生火", desc: "劈木生火的機制，提供決斷力與收斂性，防護邊界、建立規則", color: "#9ca3af" },
];

const ZIWEI_PALACES = [
  { palace: "命宮", position: "午", stars: "巨門・地空", note: "石中隱玉格", color: "#f97316" },
  { palace: "兄弟宮", position: "巳", stars: "廉貞(祿)・貪狼(權)・文昌・天馬", note: "才藝與機遇", color: "#a78bfa" },
  { palace: "夫妻宮", position: "辰", stars: "太陰(權)・地劫", note: "情感波動", color: "#f472b6" },
  { palace: "子女宮", position: "卯", stars: "天府・擎羊・鈴星", note: "嚴格管教", color: "#4ade80" },
  { palace: "財帛宮", position: "寅", stars: "祿存・天同・天梁", note: "穩健財運", color: "#fbbf24" },
  { palace: "疾厄宮", position: "丑", stars: "紫微(科)・破軍(權)・左右・魁鉞・陀羅", note: "身心壓力", color: "#60a5fa" },
  { palace: "遷移宮", position: "子", stars: "天機(權)・祿", note: "外出大吉", color: "#34d399" },
  { palace: "僕役宮", position: "亥", stars: "廉貞(祿)・貪狼(忌)", note: "人際複雜", color: "#f87171" },
  { palace: "官祿宮", position: "戌", stars: "太陽(雙忌)", note: "事業阻礙", color: "#fb923c" },
  { palace: "田宅宮", position: "酉", stars: "武曲・七殺・文曲", note: "剛強置產", color: "#a3e635" },
  { palace: "福德宮", position: "申", stars: "天同・天梁・祿", note: "晚年享福", color: "#67e8f9" },
  { palace: "父母宮", position: "未", stars: "天相・天鉞・火星", note: "長輩緣薄", color: "#c084fc" },
];

const TAROT_PROFILE = [
  {
    type: "外在個性",
    number: 8,
    card: "力量",
    element: "火",
    desc: "外在展現強大意志力與魅力，以柔克剛，用熱情感染周圍的人",
    icon: "🦁",
    color: "#f97316",
  },
  {
    type: "中間個性（樞紐）",
    number: 10,
    card: "命運之輪",
    element: "火",
    desc: "人生轉折點的掌舵者，善於把握機遇，命運在自己手中",
    icon: "☸️",
    color: "#fbbf24",
  },
  {
    type: "內在核心個性",
    number: 5,
    card: "教皇",
    element: "土",
    desc: "內在渴望傳授智慧與建立秩序，具備深厚的精神追求與使命感",
    icon: "🏛️",
    color: "#d97706",
  },
  {
    type: "靈魂輔助",
    number: 22,
    card: "愚者",
    element: "風",
    desc: "靈魂層次的冒險精神，無懼未知，以純粹的信念踏上每段旅程",
    icon: "🌟",
    color: "#a78bfa",
  },
];

const ELEMENT_COLORS: Record<string, string> = {
  木: "#4ade80",
  火: "#f97316",
  土: "#d97706",
  金: "#9ca3af",
  水: "#60a5fa",
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { desc: string } }> }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-gray-900 border border-orange-500/30 rounded-lg p-3 text-sm">
        <p className="text-orange-400 font-bold">{item.name} {item.value}%</p>
        <p className="text-gray-300">{item.payload.desc}</p>
      </div>
    );
  }
  return null;
};

// 農曆生日資訊（蘇祝震 1984/11/26 農曆閏十月初四）
// 2026 年農曆閏十月初四 對應阳曆：需查表
// 2026 年農曆十月初一 = 11/9，閏十月初一 = 12/9，初四 = 12/12
const LUNAR_BIRTHDAY_SOLAR: Record<number, { month: number; day: number }> = {
  2024: { month: 12, day: 5 },  // 2024 年農曆閏十月初四 = 12/5
  2025: { month: 11, day: 23 }, // 2025 年農曆十月初四 = 11/23
  2026: { month: 12, day: 12 }, // 2026 年農曆閏十月初四 = 12/12
  2027: { month: 12, day: 2 },  // 2027 年農曆十月初四 = 12/2
  2028: { month: 11, day: 20 }, // 2028 年農曆十月初四 = 11/20
};

// ─── 流年等級顏色 ────────────────────────────────────────────────
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

function YearlyForecastSection() {
  const { data, isLoading } = trpc.profile.yearlyAnalysis.useQuery();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="mt-4 animate-pulse space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-gray-800/50 rounded-lg" />
        ))}
      </div>
    );
  }
  if (!data || data.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-bold text-cyan-300">2026–2030 五年流年流月分析</span>
        <span className="text-xs text-gray-500">（紫微斗數式四化推算）</span>
      </div>
      {data.map((yr) => {
        const isCurrentYear = yr.year === currentYear;
        const isExpanded = expandedYear === yr.year;
        const levelCls = LEVEL_COLOR[yr.overallLevel] ?? LEVEL_COLOR["平"];
        const badgeCls = LEVEL_BADGE[yr.overallLevel] ?? LEVEL_BADGE["平"];
        return (
          <div key={yr.year} className={`border rounded-xl overflow-hidden transition-all ${
            isCurrentYear ? "border-cyan-500/60 bg-cyan-900/10" : "border-gray-700/50 bg-gray-800/20"
          }`}>
            {/* 年度標題列 */}
            <button
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors"
              onClick={() => setExpandedYear(isExpanded ? null : yr.year)}
            >
              {/* 年份與干支 */}
              <div className="flex-shrink-0 w-16 text-center">
                <div className={`text-base font-bold ${isCurrentYear ? "text-cyan-300" : "text-gray-200"}`}>
                  {yr.year}
                </div>
                <div className="text-[10px] text-gray-500">{yr.pillar}</div>
              </div>
              {/* 塔羅牌 */}
              <div className="flex-shrink-0 text-center w-12">
                <div className="text-lg">{yr.tarot.element}</div>
                <div className="text-[10px] text-gray-400">{yr.tarot.name}</div>
              </div>
              {/* 年度主題 */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-200 font-medium truncate">{yr.yearTheme}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 truncate">{yr.opportunities}</div>
              </div>
              {/* 等級與展開按鈕 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badgeCls}`}>
                  {yr.overallLevel}
                </span>
                <span className="text-xs text-gray-500">{yr.overallScore.toFixed(1)}</span>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>
            {/* 展開內容 */}
            {isExpanded && (
              <div className="border-t border-gray-700/50 p-3 space-y-3">
                {/* 四化 */}
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "hua_lu", label: "化禄", color: "text-yellow-300", icon: "★" },
                    { key: "hua_quan", label: "化權", color: "text-orange-300", icon: "▲" },
                    { key: "hua_ke", label: "化科", color: "text-blue-300", icon: "◆" },
                    { key: "hua_ji", label: "化忌", color: "text-red-400", icon: "✖" },
                  ] as const).map(({ key, label, color, icon }) => {
                    const t = yr.fourTransformations[key];
                    return (
                      <div key={key} className="bg-gray-900/40 rounded-lg p-2">
                        <div className={`text-xs font-bold ${color} mb-1`}>{icon} {label}</div>
                        <div className="text-xs text-gray-200">{t.star} 入{t.palace}</div>
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
                {/* 12 月流月分析 */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-amber-300 font-bold">逐月流月分析</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {yr.months.map((m, idx) => {
                      const mBadge = LEVEL_BADGE[m.level] ?? LEVEL_BADGE["平"];
                      return (
                        <div key={idx} className="bg-gray-900/50 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-gray-400">{MONTH_NAMES[idx]}</div>
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
    </div>
  );
}

export default function ProfilePage() {
  const { hasFeature, isAdmin } = usePermissions();
  const { user } = useAuth();
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const displayName = profile?.displayName ?? user?.name ?? '您';
  const [birthdayInfo, setBirthdayInfo] = useState<{
    daysUntil: number;
    thisYearDate: string;
    realAge: number;
    nominalAge: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    // 取台灣時間 UTC+8
    const now = new Date();
    const twMs = now.getTime() + 8 * 60 * 60 * 1000;
    const twNow = new Date(twMs);
    const todayYear = twNow.getUTCFullYear();
    const todayMonth = twNow.getUTCMonth() + 1;
    const todayDay = twNow.getUTCDate();
    const todayNum = todayYear * 10000 + todayMonth * 100 + todayDay;

    // 實歲：尚未過生日則 -1
    const birthYear = 1984;
    const birthMonth = 11;
    const birthDay = 26;
    let realAge = todayYear - birthYear;
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
      realAge -= 1;
    }
    // 虛歲：實歲 + 1
    const nominalAge = realAge + 1;

    // 農曆生日倒數：找本年農曆生日對應阳曆
    const thisYearBirthday = LUNAR_BIRTHDAY_SOLAR[todayYear];
    if (thisYearBirthday) {
      const bdNum = todayYear * 10000 + thisYearBirthday.month * 100 + thisYearBirthday.day;
      let daysUntil: number;
      let isPast = false;
      if (bdNum >= todayNum) {
        // 未到
        const bdDate = new Date(Date.UTC(todayYear, thisYearBirthday.month - 1, thisYearBirthday.day));
        const todayDate = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay));
        daysUntil = Math.round((bdDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // 已過，找明年
        isPast = true;
        const nextYearBirthday = LUNAR_BIRTHDAY_SOLAR[todayYear + 1];
        if (nextYearBirthday) {
          const bdDate = new Date(Date.UTC(todayYear + 1, nextYearBirthday.month - 1, nextYearBirthday.day));
          const todayDate = new Date(Date.UTC(todayYear, todayMonth - 1, todayDay));
          daysUntil = Math.round((bdDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        } else {
          daysUntil = 0;
        }
      }
      setBirthdayInfo({
        daysUntil,
        thisYearDate: `${todayYear}年${thisYearBirthday.month}月${thisYearBirthday.day}日`,
        realAge,
        nominalAge,
        isPast,
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16">
      <SharedNav currentPage="profile" />
      {!isAdmin && !hasFeature("profile") && <FeatureLockedCard feature="profile" />}
      {(isAdmin || hasFeature("profile")) && <>
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black border-b border-orange-500/20">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-8 text-8xl font-bold text-orange-400 select-none">命</div>
          <div className="absolute top-4 right-8 text-8xl font-bold text-orange-400 select-none">格</div>
        </div>
        <div className="relative container py-10 px-4 max-w-5xl mx-auto oracle-page-content">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* 頭像區 */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-4xl shadow-lg shadow-orange-500/30">
                🔥
              </div>
            </div>
            {/* 基本資料 */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl font-bold text-orange-400">{displayName}</h1>
                {profile?.dayMasterElement && (
                <span className="text-sm bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                  {profile.dayMasterElement}日主
                </span>
                )}
              </div>
              {profile?.occupation && <p className="text-gray-400 text-sm mb-3">{profile.occupation}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📅</span>
                  <span>{profile?.birthDate ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">🌙</span>
                  <span>{profile?.birthLunar ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">⏰</span>
                  <span>{profile?.birthTime ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📍</span>
                  <span>{profile?.birthPlace ?? '未設定'}</span>
                </div>
              </div>
            </div>
            {/* 核心格局標籤 */}
            <div className="flex-shrink-0 flex flex-col gap-2 text-center">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                <div className="text-xs text-gray-400 mb-1">核心格局</div>
                <div className="text-orange-300 font-bold">水大木漂・寒木盼火</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
                <div className="text-xs text-gray-400 mb-0.5">命宮主星</div>
                <div className="text-amber-300 font-bold text-sm">巨門・地空</div>
                <div className="text-xs text-gray-500">石中隱玉格</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ─── 八字四柱 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>🏮</span> 八字四柱
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FOUR_PILLARS.map((p) => (
              <div
                key={p.pillar}
                className={`bg-gray-900 border rounded-xl p-4 text-center ${p.pillar === "日柱" ? "border-orange-500/60 shadow-lg shadow-orange-500/10" : "border-gray-700/50"}`}
              >
                <div className="text-xs text-gray-400 mb-2">{p.pillar}</div>
                {p.pillar === "日柱" && (
                  <div className="text-xs text-orange-400 mb-1 font-medium">日主</div>
                )}
                {/* 天干 */}
                <div className="mb-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: ELEMENT_COLORS[p.stemElement] }}
                  >
                    {p.heavenlyStem}
                  </span>
                  <div className="text-xs mt-0.5" style={{ color: ELEMENT_COLORS[p.stemElement] }}>
                    {p.stemElement}
                  </div>
                </div>
                {/* 地支 */}
                <div className="border-t border-gray-700/50 pt-2 mt-2">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: ELEMENT_COLORS[p.branchElement] }}
                  >
                    {p.earthlyBranch}
                  </span>
                  <div className="text-xs mt-0.5" style={{ color: ELEMENT_COLORS[p.branchElement] }}>
                    {p.branchElement}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">{p.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 五行比例 + 補運策略 ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 五行圓餅圖 */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>⚖️</span> 本命五行比例
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={FIVE_ELEMENTS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {FIVE_ELEMENTS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-gray-300 text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2">
              {FIVE_ELEMENTS_DATA.map((el) => (
                <div key={el.name} className="text-center">
                  <div className="text-lg">{el.icon}</div>
                  <div className="text-xs font-bold" style={{ color: el.color }}>{el.value}%</div>
                  <div className="text-xs text-gray-500">{el.desc.split("・")[0]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 補運策略 */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>🎯</span> 終身補運策略
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              甲木日主，水木過旺（共占 77%），需以火洩木補強，土筑壩擋水，金制木清源。此策略終身不變，每日穿搭、手串、飲食、行動皆依此優先級執行。
            </p>
            <div className="space-y-3">
              {LUCKY_STRATEGY.map((s) => (
                <div
                  key={s.rank}
                  className="flex items-start gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700/30"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: s.color + "30", color: s.color, border: `1px solid ${s.color}50` }}
                  >
                    {s.rank}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-lg">{s.icon}</span>
                      <span className="font-bold" style={{ color: s.color }}>{s.element}</span>
                      <span className="text-xs text-gray-400">{s.role}</span>
                    </div>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 font-bold mb-1">⚠️ 忌神（避免）</div>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>💧 水（35%・過旺）</span>
                <span>🌿 木（42%・過旺）</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 生命靈數與塔羅原型 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>🃏</span> 生命靈數與塔羅原型
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {TAROT_PROFILE.map((t) => (
              <div
                key={t.type}
                className="bg-gray-900 border border-gray-700/50 rounded-xl p-4 hover:border-orange-500/40 transition-colors"
              >
                <div className="text-xs text-gray-400 mb-2">{t.type}</div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">{t.icon}</span>
                  <div>
                    <div
                      className="text-2xl font-bold"
                      style={{ color: t.color }}
                    >
                      {t.number}
                    </div>
                    <div className="text-sm font-medium text-gray-200">{t.card}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 leading-relaxed">{t.desc}</div>
                <div
                  className="mt-2 text-xs px-2 py-0.5 rounded-full inline-block"
                  style={{ backgroundColor: t.color + "20", color: t.color }}
                >
                  {t.element}元素
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-gray-900/50 border border-gray-700/30 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-2">流日計算公式</div>
            <div className="text-sm text-gray-300">
              <span className="text-orange-400 font-bold">中間個性(10)</span>
              <span className="text-gray-500"> + </span>
              <span className="text-amber-400">當月數字</span>
              <span className="text-gray-500"> + </span>
              <span className="text-yellow-400">當日數字</span>
              <span className="text-gray-500"> = 流日塔羅牌（超過22則再相加歸約）</span>
            </div>
          </div>
        </section>

        {/* ─── 紫微十二宮 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>✨</span> 紫微斗數十二宮
            <span className="text-xs text-gray-400 font-normal">甲子年生・命宮庚午</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ZIWEI_PALACES.map((palace) => (
              <div
                key={palace.palace}
                className={`bg-gray-900 rounded-xl p-3 border transition-colors ${palace.palace === "命宮" ? "border-orange-500/60 shadow-lg shadow-orange-500/10" : "border-gray-700/40 hover:border-gray-600/60"}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-bold"
                    style={{ color: palace.color }}
                  >
                    {palace.palace}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                    {palace.position}
                  </span>
                </div>
                <div className="text-xs text-gray-300 leading-relaxed mb-1">
                  {palace.stars}
                </div>
                <div className="text-xs text-gray-500">{palace.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 大限流年 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>📊</span> 當前大限
          </h2>
          <div className="bg-gray-900 border border-orange-500/30 rounded-xl p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">當前大限</div>
                <div className="text-2xl font-bold text-orange-400">45-54歲</div>
                <div className="text-sm text-gray-300 mt-1">官祿宮大限</div>
                <div className="text-xs text-gray-500">太陽（雙忌）・事業轉型期</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">實歲 / 虛歲</div>
                <div className="text-2xl font-bold text-amber-400">
                  {birthdayInfo ? `${birthdayInfo.realAge}歲` : '41歲'}
                </div>
                <div className="text-sm text-gray-300 mt-1">
                  虛歲 {birthdayInfo ? birthdayInfo.nominalAge : 42}歲
                </div>
                <div className="text-xs text-gray-500">流年 5、5、7、29、41、53、65</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">大限宮位</div>
                <div className="text-2xl font-bold text-red-400">戌</div>
                <div className="text-sm text-gray-300 mt-1">太陽雙忌</div>
                <div className="text-xs text-gray-500">事業需謹慎，宜轉型布局</div>
              </div>
            </div>
            <div className="mt-4 bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300">
              <span className="font-bold">大限提示：</span>
              官禄宮大限（45-54歲），太陽雙忘入官禄，事業面臨挑戰與轉型。宜以「火土」補強，強化個人品牌與創業能量，避免依賴傳統職場路徑。
            </div>
            {/* ─── 五年流年流月分析 ─── */}
            <YearlyForecastSection />
            {/* 農曆生日倒數橫幅 */}
            {birthdayInfo && (
              <div className="mt-3 bg-gradient-to-r from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎂</span>
                  <div>
                    <div className="text-xs text-purple-300 font-bold">農曆生日（閏十月初四）</div>
                    <div className="text-xs text-gray-400">
                      {birthdayInfo.isPast
                        ? `今年已過，明年農曆生日：${LUNAR_BIRTHDAY_SOLAR[(new Date().getFullYear() + 1)]?.month ?? '?'}月${LUNAR_BIRTHDAY_SOLAR[(new Date().getFullYear() + 1)]?.day ?? '?'}日`
                        : `今年農曆生日：${birthdayInfo.thisYearDate}`
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-300">
                      {birthdayInfo.daysUntil === 0 ? '生日快樂！' : `${birthdayInfo.daysUntil} 天`}
                    </div>
                    <div className="text-[10px] text-gray-500">距農曆生日</div>
                  </div>
                  <div className="w-px h-8 bg-purple-500/30" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-300">實歲 {birthdayInfo.realAge}歲</div>
                    <div className="text-[10px] text-gray-500">虛歲 {birthdayInfo.nominalAge}歲</div>
                  </div>
                  <div className="w-px h-8 bg-purple-500/30" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-300">屬鼠</div>
                    <div className="text-[10px] text-gray-500">甲子年生</div>
                  </div>
                </div>
              </div>
            )}
          </div>
         </section>
      </div>
    </>
    }
    </div>
  );
}
