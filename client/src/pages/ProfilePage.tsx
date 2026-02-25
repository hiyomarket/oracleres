import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Zap, Settings, ExternalLink } from "lucide-react";
import { Link } from "wouter";

// ─── 主帳號靜態命格資料（蘇祐震 V9.0 歸正版）────────────────────────────────
const OWNER_STATIC_PROFILE = {
  displayName: "蘇祐震",
  occupation: "行銷 / 攝影 / 產品經理",
  birthDate: "1984-11-26",
  birthLunar: "甲子年 閏十月 初四日",
  birthTime: "上午 10:09（巳時）",
  birthPlace: "台灣 花蓮縣 玉里鎮",
  yearPillar: "甲子",
  monthPillar: "乙亥",
  dayPillar: "甲子",
  hourPillar: "己巳",
  dayMasterElement: "wood" as const,
  favorableElements: "fire,earth,metal",
  unfavorableElements: "water,wood",
  notes: "水大木漂，寒木盼火。命盤中水、木能量極旺（合計超過75%），金極弱，火、土不足。\n終身補運策略：🔥 火（食傷・洩木生財）→ 🌍 土（財星・落地變現）→ ⚪ 金（官殺・制身立規）",
  // 靜態五行比例（V9.0 歸正版）
  staticFiveElements: [
    { name: "木", value: 42, color: "#4ade80", icon: "🌳", desc: "過旺・忌神" },
    { name: "水", value: 35, color: "#60a5fa", icon: "💧", desc: "過旺・忌神" },
    { name: "火", value: 11, color: "#f97316", icon: "🔥", desc: "用神・補強優先" },
    { name: "土", value: 9,  color: "#d97706", icon: "🌍", desc: "用神・補強優先" },
    { name: "金", value: 4,  color: "#9ca3af", icon: "⚪", desc: "喜神・適量補充" },
  ],
  // 紫微斗數十二宮
  ziwei: [
    { palace: "命宮",  position: "午", stars: "巨門・地空",          note: "石中隱玉格" },
    { palace: "兄弟宮", position: "巳", stars: "廉貞祿・貪狼權・文昌・天馬", note: "" },
    { palace: "夫妻宮", position: "辰", stars: "太陰權・地劫",        note: "" },
    { palace: "子女宮", position: "卯", stars: "天府・擎羊・鈴星",    note: "" },
    { palace: "財帛宮", position: "寅", stars: "祿存・天同・天梁",    note: "" },
    { palace: "疾厄宮", position: "丑", stars: "紫微科・破軍權・左右・魁鉞・陀羅", note: "" },
    { palace: "遷移宮", position: "子", stars: "天機權祿",            note: "" },
    { palace: "僕役宮", position: "亥", stars: "廉貞祿・貪狼忌",     note: "" },
    { palace: "官祿宮", position: "戌", stars: "太陽雙忌",           note: "" },
    { palace: "田宅宮", position: "酉", stars: "武曲・七殺・文曲",   note: "" },
    { palace: "福德宮", position: "申", stars: "天同・天梁祿",       note: "" },
    { palace: "父母宮", position: "未", stars: "天相・天鉞・火星",   note: "" },
  ],
  // 生命靈數與塔羅原型
  tarot: {
    outer: { num: 8,  name: "力量",     element: "🔥" },
    middle: { num: 10, name: "命運之輪", element: "🔥" },
    primary: { num: 16, name: "高塔",     element: "🔥" },
    soul: { num: 6,  name: "戀人",     element: "🌬️" },
  },
};

// ─── 天干地支五行對應表 ──────────────────────────────────────────────────────
const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const BRANCH_ELEMENT: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const ELEMENT_COLORS: Record<string, string> = {
  木: "#4ade80", 火: "#f97316", 土: "#d97706", 金: "#9ca3af", 水: "#60a5fa",
};
const ELEMENT_ICONS: Record<string, string> = {
  木: "🌳", 火: "🔥", 土: "🌍", 金: "⚪", 水: "💧",
};
const ELEMENT_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const DAY_MASTER_LABEL: Record<string, string> = {
  wood: "甲乙木", fire: "丙丁火", earth: "戊己土", metal: "庚辛金", water: "壬癸水",
};

// ─── 解析四柱（格式：「甲子」→ { stem: "甲", branch: "子" }）────────────────
function parsePillar(pillar?: string | null): { stem: string; branch: string } | null {
  if (!pillar || pillar.length < 2) return null;
  const stem = pillar[0];
  const branch = pillar[1];
  if (!STEM_ELEMENT[stem] || !BRANCH_ELEMENT[branch]) return null;
  return { stem, branch };
}

// ─── 根據喜用神動態生成補運策略 ─────────────────────────────────────────────
const ELEMENT_ROLES: Record<string, { role: string; desc: string }> = {
  木: { role: "比劫・強根助身", desc: "增強自身能量，提升行動力與自信，適合擴展人脈與合作" },
  火: { role: "食傷・洩身生財", desc: "洩身生財的關鍵，補充創意與曝光度，點燃財星能量" },
  土: { role: "財星・落地變現", desc: "日主的財星，築壩擋水為身提供根基，落地變現實財富" },
  金: { role: "官殺・制身立規", desc: "制身立規的機制，提供決斷力與收斂性，建立規則與邊界" },
  水: { role: "印星・滋養助身", desc: "滋養日主的印星，補充智慧與學習力，增強貴人緣" },
};

function buildLuckyStrategy(favorableElements: string, unfavorableElements: string) {
  const fav = favorableElements.split(",").map(e => e.trim()).filter(Boolean);
  const unfav = unfavorableElements.split(",").map(e => e.trim()).filter(Boolean);
  const colors = ["#f97316", "#d97706", "#9ca3af", "#4ade80", "#60a5fa"];
  const strategy = fav.map((el, i) => {
    const zhEl = ELEMENT_ZH[el] ?? el;
    const roleInfo = ELEMENT_ROLES[zhEl] ?? { role: "喜用神", desc: "有助於命格平衡的五行能量" };
    return {
      rank: i + 1,
      element: zhEl,
      icon: ELEMENT_ICONS[zhEl] ?? "✨",
      role: roleInfo.role,
      desc: roleInfo.desc,
      color: colors[i % colors.length],
    };
  });
  return { strategy, unfav: unfav.map(e => ELEMENT_ZH[e] ?? e) };
}

// ─── 生命靈數計算函數 ─────────────────────────────────────────────────────────
const TAROT_CARDS: Record<number, { name: string; element: string }> = {
  1: { name: "魔術師", element: "🔥" },
  2: { name: "女祭司", element: "💧" },
  3: { name: "女皇", element: "🌍" },
  4: { name: "皇帝", element: "🌳" },
  5: { name: "教皇", element: "🌍" },
  6: { name: "戀人", element: "🌬️" },
  7: { name: "戰車", element: "💧" },
  8: { name: "力量", element: "🔥" },
  9: { name: "隱士", element: "🌍" },
  10: { name: "命運之輪", element: "🔥" },
  11: { name: "正義", element: "🌬️" },
  12: { name: "倒吊人", element: "💧" },
  13: { name: "死神", element: "🌊" },
  14: { name: "節制", element: "🔥" },
  15: { name: "惡魔", element: "🌍" },
  16: { name: "高塔", element: "🔥" },
  17: { name: "星星", element: "🌬️" },
  18: { name: "月亮", element: "💧" },
  19: { name: "太陽", element: "🔥" },
  20: { name: "審判", element: "🔥" },
  21: { name: "世界", element: "🌍" },
  22: { name: "愚者", element: "💨" },
};
function reduceToSingleDigitOrMaster(n: number): number {
  while (n > 22) {
    const s = n.toString().split('').reduce((a, d) => a + parseInt(d), 0);
    n = s;
  }
  return n;
}
function calcLifeNumbers(birthDate: string): { outer: { num: number; name: string; element: string }; middle: { num: number; name: string; element: string }; primary: { num: number; name: string; element: string }; soul: { num: number; name: string; element: string } } | null {
  const parts = birthDate.split('-');
  if (parts.length !== 3) return null;
  const [yStr, mStr, dStr] = parts;
  const y = parseInt(yStr), m = parseInt(mStr), d = parseInt(dStr);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;

  // 外層靈數（生日展現）= 出生日期各位數相加，超過22才繼續相加
  const outerRaw = d.toString().split('').reduce((a, c) => a + parseInt(c), 0);
  const outer = reduceToSingleDigitOrMaster(outerRaw);

  // 中層靈數（天賦使命）= 月份各位數 + 日期各位數相加，超過22才繼續相加
  const middleRaw = m.toString().split('').reduce((a, c) => a + parseInt(c), 0)
    + d.toString().split('').reduce((a, c) => a + parseInt(c), 0);
  const middle = reduceToSingleDigitOrMaster(middleRaw);

  // 年度靈數 = 年份各位數相加，超過22才繼續相加
  const yearRaw = y.toString().split('').reduce((a, c) => a + parseInt(c), 0);
  const yearNum = reduceToSingleDigitOrMaster(yearRaw);

  // 主要靈數（靈魂渴望）= 中層靈數 + 年度靈數，超過22才繼續相加
  const primaryRaw = middle + yearNum;
  const primary = reduceToSingleDigitOrMaster(primaryRaw);

  // 靈魂數（生命主題）= 年度靈數（與主要靈數共用年份計算）
  const soul = yearNum;

  const getCard = (n: number) => TAROT_CARDS[n] ?? { name: `第${n}號`, element: "✨" };
  return {
    outer: { num: outer, ...getCard(outer) },
    middle: { num: middle, ...getCard(middle) },
    primary: { num: primary, ...getCard(primary) },
    soul: { num: soul, ...getCard(soul) },
  };
}
// ─── 根據四柱估算五行比例 ────────────────────────────────────────────────────
function estimateFiveElements(
  yearPillar?: string | null,
  monthPillar?: string | null,
  dayPillar?: string | null,
  hourPillar?: string | null,
  favorableElements?: string | null,
  unfavorableElements?: string | null,
) {
  const pillars = [yearPillar, monthPillar, dayPillar, hourPillar].map(parsePillar).filter(Boolean);
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  if (pillars.length > 0) {
    for (const p of pillars) {
      if (!p) continue;
      const stemEl = STEM_ELEMENT[p.stem];
      const branchEl = BRANCH_ELEMENT[p.branch];
      if (stemEl) counts[stemEl] = (counts[stemEl] ?? 0) + 1;
      if (branchEl) counts[branchEl] = (counts[branchEl] ?? 0) + 0.5;
    }
  } else if (favorableElements || unfavorableElements) {
    // 若無四柱但有喜忌神，用喜忌神估算（忌神多、喜神少）
    const fav = (favorableElements ?? "").split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
    const unfav = (unfavorableElements ?? "").split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
    for (const el of unfav) if (counts[el] !== undefined) counts[el] += 2;
    for (const el of fav) if (counts[el] !== undefined) counts[el] += 0.5;
    // 確保有基礎值
    for (const el of Object.keys(counts)) if (counts[el] === 0) counts[el] = 0.5;
  } else {
    return null; // 無資料
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const fav = (favorableElements ?? "").split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
  const unfav = (unfavorableElements ?? "").split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
  return ["木", "火", "土", "金", "水"].map(el => {
    const pct = Math.round((counts[el] / total) * 100);
    const isFav = fav.includes(el);
    const isUnfav = unfav.includes(el);
    const desc = isUnfav ? `過旺・忌神` : isFav ? `用神・補強優先` : `中性`;
    return { name: el, value: pct, color: ELEMENT_COLORS[el], icon: ELEMENT_ICONS[el], desc };
  });
}

// ─── 流年等級顏色 ────────────────────────────────────────────────────────────
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
        <span className="text-sm font-bold text-cyan-300">五年流年流月分析</span>
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
                <div className="text-lg">{yr.tarot.element}</div>
                <div className="text-[10px] text-gray-400">{yr.tarot.name}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-200 font-medium truncate">{yr.yearTheme}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 truncate">{yr.opportunities}</div>
              </div>
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
            {isExpanded && (
              <div className="border-t border-gray-700/50 p-3 space-y-3">
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
                <div className="flex items-start gap-2 bg-red-900/10 border border-red-500/20 rounded-lg p-2">
                  <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-red-300">{yr.cautions}</div>
                </div>
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

// ─── 命格未填寫提示卡片 ──────────────────────────────────────────────────────
function IncompleteProfilePrompt({ message }: { message: string }) {
  return (
    <div className="bg-amber-900/10 border border-amber-500/30 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
      <div className="text-2xl">📝</div>
      <p className="text-sm text-amber-300">{message}</p>
      <Link href="/my-profile">
        <span className="inline-flex items-center gap-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg px-3 py-1.5 transition-colors cursor-pointer">
          <Settings className="w-3 h-3" />
          前往命格設定
          <ExternalLink className="w-3 h-3" />
        </span>
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { hasFeature, isAdmin } = usePermissions();
  const { user } = useAuth();
  const { data: accountStatus } = trpc.account.getStatus.useQuery(undefined, { staleTime: 60000 });
  const isOwner = !!(accountStatus?.isOwner);
  const { data: profile, isLoading: profileLoading } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });

  // 主帳號使用靜態資料，其他用戶使用 DB 動態資料
  const effectiveProfile = isOwner ? OWNER_STATIC_PROFILE : profile;
  const displayName = isOwner ? OWNER_STATIC_PROFILE.displayName : (profile?.displayName ?? user?.name ?? '您');

  // ─── 動態計算年齡（從 effectiveProfile.birthDate）──────────────────────────
  const ageInfo = useMemo(() => {
    const birthDateStr = effectiveProfile?.birthDate;
    if (!birthDateStr) return null;
    const [byStr, bmStr, bdStr] = birthDateStr.split("-");
    const by = parseInt(byStr), bm = parseInt(bmStr), bd = parseInt(bdStr);
    if (isNaN(by) || isNaN(bm) || isNaN(bd)) return null;
    const now = new Date();
    const twMs = now.getTime() + 8 * 60 * 60 * 1000;
    const tw = new Date(twMs);
    const ty = tw.getUTCFullYear(), tm = tw.getUTCMonth() + 1, td = tw.getUTCDate();
    let realAge = ty - by;
    if (tm < bm || (tm === bm && td < bd)) realAge -= 1;
    return { realAge, nominalAge: realAge + 1, birthYear: by };
  }, [effectiveProfile?.birthDate]);

  // ─── 動態生成四柱資料 ────────────────────────────────────────────────────
  const fourPillarsData = useMemo(() => {
    const pillars = [
      { label: "年柱", raw: effectiveProfile?.yearPillar },
      { label: "月柱", raw: effectiveProfile?.monthPillar },
      { label: "日柱", raw: effectiveProfile?.dayPillar },
      { label: "時柱", raw: effectiveProfile?.hourPillar },
    ];
    const hasPillars = pillars.some(p => p.raw);
    if (!hasPillars) return null;
    return pillars.map(({ label, raw }) => {
      const parsed = parsePillar(raw);
      if (!parsed) return { pillar: label, heavenlyStem: "?", earthlyBranch: "?", stemElement: "木", branchElement: "木", note: "未填寫" };
      const stemEl = STEM_ELEMENT[parsed.stem] ?? "木";
      const branchEl = BRANCH_ELEMENT[parsed.branch] ?? "木";
      const isDay = label === "日柱";
      return {
        pillar: label,
        heavenlyStem: parsed.stem,
        earthlyBranch: parsed.branch,
        stemElement: stemEl,
        branchElement: branchEl,
        note: isDay ? `${raw}・日主（${stemEl}）` : raw ?? "",
      };
    });
  }, [effectiveProfile?.yearPillar, effectiveProfile?.monthPillar, effectiveProfile?.dayPillar, effectiveProfile?.hourPillar]);

  // ─── 動態生成五行比例（主帳號使用靜態資料）──────────────────────────────────
  const fiveElementsData = useMemo(() => {
    if (isOwner) return OWNER_STATIC_PROFILE.staticFiveElements;
    return estimateFiveElements(
      profile?.yearPillar, profile?.monthPillar, profile?.dayPillar, profile?.hourPillar,
      profile?.favorableElements, profile?.unfavorableElements,
    );
  }, [isOwner, profile?.yearPillar, profile?.monthPillar, profile?.dayPillar, profile?.hourPillar, profile?.favorableElements, profile?.unfavorableElements]);

  // ─── 動態生成補運策略 ────────────────────────────────────────────────────
  const luckyStrategyData = useMemo(() => {
    const fav = effectiveProfile?.favorableElements;
    if (!fav) return null;
    return buildLuckyStrategy(fav, effectiveProfile?.unfavorableElements ?? "");
  }, [effectiveProfile?.favorableElements, effectiveProfile?.unfavorableElements]);

  // ─── 日主標籤 ────────────────────────────────────────────────────────────
  const dayMasterLabel = useMemo(() => {
    if (effectiveProfile?.dayMasterElement) return DAY_MASTER_LABEL[effectiveProfile.dayMasterElement] ?? effectiveProfile.dayMasterElement;
    if (effectiveProfile?.dayPillar) {
      const parsed = parsePillar(effectiveProfile.dayPillar);
      if (parsed) return `${parsed.stem}${STEM_ELEMENT[parsed.stem] ?? ""}`;
    }
    return null;
  }, [effectiveProfile?.dayMasterElement, effectiveProfile?.dayPillar]);

  // 主帳號永遠有完整資料，其他用戶才需要判斷
  const hasBasicProfile = isOwner || !!(profile?.displayName || profile?.birthDate);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16">
      <SharedNav currentPage="profile" />
      {!isAdmin && !hasFeature("profile") && <FeatureLockedCard feature="profile" />}
      {(isAdmin || hasFeature("profile")) && <>
      {/* ─── 頂部英雄區 ─── */}
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
                {dayMasterLabel ? (dayMasterLabel.includes("木") ? "🌳" : dayMasterLabel.includes("火") ? "🔥" : dayMasterLabel.includes("土") ? "🌍" : dayMasterLabel.includes("金") ? "⚪" : "💧") : "✨"}
              </div>
            </div>
            {/* 基本資料 */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl font-bold text-orange-400">{displayName}</h1>
                {dayMasterLabel && (
                  <span className="text-sm bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                    {dayMasterLabel}日主
                  </span>
                )}
              </div>
              {effectiveProfile?.occupation && <p className="text-gray-400 text-sm mb-3">{effectiveProfile.occupation}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📅</span>
                  <span>{effectiveProfile?.birthDate ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">🌙</span>
                  <span>{effectiveProfile?.birthLunar ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">⏰</span>
                  <span>{effectiveProfile?.birthTime ?? '未設定'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📍</span>
                  <span>{effectiveProfile?.birthPlace ?? '未設定'}</span>
                </div>
              </div>
            </div>
            {/* 核心格局標籤 */}
            <div className="flex-shrink-0 flex flex-col gap-2 text-center">
              {effectiveProfile?.favorableElements ? (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                  <div className="text-xs text-gray-400 mb-1">喜用神</div>
                  <div className="text-orange-300 font-bold">
                    {effectiveProfile.favorableElements.split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).join("・")}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-600/30 rounded-xl px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">喜用神</div>
                  <div className="text-gray-500 text-sm">未設定</div>
                </div>
              )}
              {effectiveProfile?.unfavorableElements && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2">
                  <div className="text-xs text-gray-400 mb-0.5">忌神</div>
                  <div className="text-red-300 font-bold text-sm">
                    {effectiveProfile.unfavorableElements.split(",").map(e => ELEMENT_ZH[e.trim()] ?? e.trim()).join("・")}
                  </div>
                </div>
              )}
              {ageInfo && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
                  <div className="text-xs text-gray-400 mb-0.5">實歲 / 虛歲</div>
                  <div className="text-amber-300 font-bold text-sm">{ageInfo.realAge} / {ageInfo.nominalAge} 歲</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* ─── 命格未填寫提示（主帳號不顯示）─── */}
        {!isOwner && !profileLoading && !hasBasicProfile && (
          <div className="bg-amber-900/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-3xl">🌟</div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-amber-300 font-bold mb-1">尚未建立命格檔案</div>
              <div className="text-sm text-gray-400">填寫您的生辰八字與喜用神，讓系統為您提供完整的個人化天命分析。</div>
            </div>
            <Link href="/my-profile">
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap">
                <Settings className="w-4 h-4" />
                立即設定命格
              </span>
            </Link>
          </div>
        )}

        {/* ─── 八字四柱 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>🏮</span> 八字四柱
          </h2>
          {fourPillarsData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {fourPillarsData.map((p) => (
                <div
                  key={p.pillar}
                  className={`bg-gray-900 border rounded-xl p-4 text-center ${p.pillar === "日柱" ? "border-orange-500/60 shadow-lg shadow-orange-500/10" : "border-gray-700/50"}`}
                >
                  <div className="text-xs text-gray-400 mb-2">{p.pillar}</div>
                  {p.pillar === "日柱" && (
                    <div className="text-xs text-orange-400 mb-1 font-medium">日主</div>
                  )}
                  <div className="mb-1">
                    <span className="text-4xl font-bold" style={{ color: ELEMENT_COLORS[p.stemElement] }}>
                      {p.heavenlyStem}
                    </span>
                    <div className="text-xs mt-0.5" style={{ color: ELEMENT_COLORS[p.stemElement] }}>
                      {p.stemElement}
                    </div>
                  </div>
                  <div className="border-t border-gray-700/50 pt-2 mt-2">
                    <span className="text-4xl font-bold" style={{ color: ELEMENT_COLORS[p.branchElement] }}>
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
          ) : (
            <IncompleteProfilePrompt message="尚未填寫八字四柱（年柱、月柱、日柱、時柱），請至命格設定頁填寫以顯示個人化四柱分析。" />
          )}
        </section>

        {/* ─── 五行比例 + 補運策略 ─── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 五行圓餅圖 */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>⚖️</span> 本命五行比例
              {!fourPillarsData && fiveElementsData && (
                <span className="text-xs text-gray-500 font-normal">（依喜忌神估算）</span>
              )}
            </h2>
            {fiveElementsData ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fiveElementsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {fiveElementsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={(value) => <span className="text-gray-300 text-xs">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-5 gap-1 mt-2">
                  {fiveElementsData.map((el) => (
                    <div key={el.name} className="text-center">
                      <div className="text-lg">{el.icon}</div>
                      <div className="text-xs font-bold" style={{ color: el.color }}>{el.value}%</div>
                      <div className="text-xs text-gray-500">{el.desc.split("・")[0]}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <IncompleteProfilePrompt message="請填寫八字四柱或喜忌神以顯示五行比例分析。" />
            )}
          </div>

          {/* 補運策略 */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
            <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>🎯</span> 終身補運策略
            </h2>
            {luckyStrategyData ? (
              <>
                <p className="text-xs text-gray-400 mb-4">
                  {dayMasterLabel ? `${dayMasterLabel}日主，` : ""}
                  喜用神為{luckyStrategyData.strategy.map(s => s.element).join("、")}，
                  {luckyStrategyData.unfav.length > 0 ? `忌神為${luckyStrategyData.unfav.join("、")}。` : ""}
                  此策略終身不變，每日穿搭、手串、飲食、行動皆依此優先級執行。
                </p>
                <div className="space-y-3">
                  {luckyStrategyData.strategy.map((s) => (
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
                {luckyStrategyData.unfav.length > 0 && (
                  <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <div className="text-xs text-red-400 font-bold mb-1">⚠️ 忌神（避免）</div>
                    <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
                      {luckyStrategyData.unfav.map(el => (
                        <span key={el}>{ELEMENT_ICONS[el] ?? "•"} {el}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <IncompleteProfilePrompt message="請填寫喜用神（favorableElements）以顯示個人化補運策略。" />
            )}
          </div>
        </section>

        {/* ─── 大限流年 ─── */}
        <section>
          <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
            <span>📊</span> 當前大限與流年
          </h2>
          <div className="bg-gray-900 border border-orange-500/30 rounded-xl p-5">
            {ageInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">實歲 / 虛歲</div>
                  <div className="text-2xl font-bold text-amber-400">{ageInfo.realAge}歲</div>
                  <div className="text-sm text-gray-300 mt-1">虛歲 {ageInfo.nominalAge}歲</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">出生年份</div>
                  <div className="text-2xl font-bold text-orange-400">{ageInfo.birthYear}</div>
                  <div className="text-sm text-gray-300 mt-1">
                    {effectiveProfile?.yearPillar ? `${effectiveProfile.yearPillar}年` : "年柱未填寫"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">農曆生日</div>
                  <div className="text-lg font-bold text-purple-400">{effectiveProfile?.birthLunar ?? "未設定"}</div>
                  <div className="text-sm text-gray-300 mt-1">{effectiveProfile?.birthDate ?? ""}</div>
                </div>
              </div>
            ) : (
              <div className="mb-4 text-center text-gray-500 text-sm py-2">填寫出生日期以顯示年齡資訊</div>
            )}
            {!isOwner && (
              <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 mb-4">
                <span className="font-bold">提示：</span>
                大限、紫微斗數、生命靈數等進階算命功能需要完整的生辰八字資料，請至命格設定頁填寫完整資料後，系統將自動計算個人化分析。
              </div>
            )}
            {/* ─── 五年流年流月分析 ─── */}
            <YearlyForecastSection />
          </div>
        </section>

        {/* ─── 紫微斗數十二宮（主帳號專屬）─── */}
        {isOwner && (
          <section>
            <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>⭐</span> 紫微斗數十二宮
            </h2>
            <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {OWNER_STATIC_PROFILE.ziwei.map((z) => (
                  <div key={z.palace} className="bg-gray-800/50 border border-gray-700/30 rounded-lg p-2.5 text-center">
                    <div className="text-xs text-gray-400 mb-1">{z.palace}</div>
                    <div className="text-sm font-bold text-amber-300">{z.position}</div>
                    <div className="text-xs text-gray-300 mt-1 leading-tight">{z.stars}</div>
                    {z.note && <div className="text-xs text-orange-400 mt-1 font-medium">{z.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 生命靈數與塔羅原型（有出生日期的用戶都顯示）─── */}
        {(() => {
          const birthDateStr = effectiveProfile?.birthDate;
          const lifeNums = birthDateStr ? calcLifeNumbers(birthDateStr) : null;
          if (!lifeNums) return null;
          const cards = [
            { label: "外層靈數（生日展現）", ...lifeNums.outer },
            { label: "中層靈數（天賦使命）", ...lifeNums.middle },
            { label: "主要靈數（靈魂渴望）", ...lifeNums.primary },
            { label: "靈魂數（生命主題）", ...lifeNums.soul },
          ];
          return (
            <section>
              <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                <span>🎴</span> 生命靈數與塔羅原型
              </h2>
              <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {cards.map((t) => (
                    <div key={t.label} className="bg-gray-800/50 border border-gray-700/30 rounded-xl p-4 text-center">
                      <div className="text-xs text-gray-400 mb-2">{t.label}</div>
                      <div className="text-3xl font-bold text-orange-400 mb-1">{t.num}</div>
                      <div className="text-sm font-bold text-gray-200">{t.element} {t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* ─── 備注欄位 ─── */}
        {(() => {
          const notesText = effectiveProfile?.notes;
          // 若無 notes，根據命格資料自動生成建議文字
          const autoNotes = (() => {
            if (notesText) return notesText;
            const ep = effectiveProfile as typeof OWNER_STATIC_PROFILE | (typeof profile & Record<string, unknown>) | null | undefined;
            if (!ep) return null;
            const fav = (ep.favorableElements ?? '').split(',').map((e: string) => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
            const unfav = (ep.unfavorableElements ?? '').split(',').map((e: string) => ELEMENT_ZH[e.trim()] ?? e.trim()).filter(Boolean);
            const dm = ep.dayMasterElement ? (ELEMENT_ZH[ep.dayMasterElement] ?? ep.dayMasterElement) : null;
            if (!fav.length && !unfav.length && !dm) return null;
            const lines: string[] = [];
            if (dm) lines.push(`日主五行：${dm}`);
            if (fav.length) {
              const favStr = fav.map((el: string) => {
                const roleInfo = ELEMENT_ROLES[el];
                return roleInfo ? `${el}（${roleInfo.role}）` : el;
              }).join('、');
              lines.push(`喜用神：${favStr}`);
            }
            if (unfav.length) lines.push(`忌神：${unfav.join('、')}`);
            if (fav.length) {
              const strategy = fav.map((el: string) => {
                const roleInfo = ELEMENT_ROLES[el];
                return roleInfo ? `${ELEMENT_ICONS[el] ?? ''}${el}（${roleInfo.desc}）` : el;
              }).join('\n');
              lines.push(`\n補運建議：\n${strategy}`);
            }
            return lines.join('\n');
          })();
          if (!autoNotes) return null;
          return (
            <section>
              <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                <span>📋</span> 命格備注
              </h2>
              <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-5">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{autoNotes}</p>
              </div>
            </section>
          );
        })()}

        {/* ─── 前往設定按鈕（主帳號不顯示，其他用戶顯示）─── */}
        {!isOwner && (
          <div className="flex justify-center pt-4">
            <Link href="/my-profile">
              <span className="inline-flex items-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 rounded-xl px-6 py-3 text-sm font-medium transition-colors cursor-pointer">
                <Settings className="w-4 h-4" />
                編輯命格資料
              </span>
            </Link>
          </div>
        )}

      </div>
    </>
    }
    </div>
  );
}
