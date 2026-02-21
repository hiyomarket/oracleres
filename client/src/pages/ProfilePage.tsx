import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { SharedNav } from "@/components/SharedNav";

// ─── 蘇祐震命格常數 ──────────────────────────────────────────────

const PROFILE = {
  name: "蘇祐震",
  gender: "男",
  birthDate: "1984年11月26日（陽曆）",
  birthLunar: "甲子年 閏十月 初四日（農曆）",
  birthTime: "上午 10:09（巳時）",
  birthPlace: "台灣 花蓮縣 玉里鎮",
  occupation: "行銷 / 攝影 / 產品經理",
};

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
    heavenlyStem: "癸",
    earthlyBranch: "亥",
    stemElement: "水",
    branchElement: "水",
    stemColor: "#60a5fa",
    branchColor: "#60a5fa",
    note: "癸亥月・傷官",
  },
  {
    pillar: "日柱",
    heavenlyStem: "庚",
    earthlyBranch: "午",
    stemElement: "金",
    branchElement: "火",
    stemColor: "#e5e7eb",
    branchColor: "#f97316",
    note: "庚午日・日主",
  },
  {
    pillar: "時柱",
    heavenlyStem: "庚",
    earthlyBranch: "巳",
    stemElement: "金",
    branchElement: "火",
    stemColor: "#e5e7eb",
    branchColor: "#f97316",
    note: "庚巳時・比肩",
  },
];

const FIVE_ELEMENTS_DATA = [
  { name: "水", value: 48, color: "#60a5fa", icon: "💧", desc: "過旺・忌神" },
  { name: "木", value: 32, color: "#4ade80", icon: "🌿", desc: "過旺・忌神" },
  { name: "土", value: 10, color: "#d97706", icon: "🌍", desc: "用神・補強" },
  { name: "火", value: 7, color: "#f97316", icon: "🔥", desc: "用神・首要" },
  { name: "金", value: 3, color: "#d1d5db", icon: "⚪", desc: "日主・身弱" },
];

const LUCKY_STRATEGY = [
  { rank: 1, element: "火", icon: "🔥", role: "官殺・制衡忌神", desc: "補充行動力與熱情，制衡過旺水木，點燃財星", color: "#f97316" },
  { rank: 2, element: "土", icon: "🌍", role: "印星・生扶日主", desc: "穩固根基，吸收水木能量，滋養庚金日主", color: "#d97706" },
  { rank: 3, element: "金", icon: "⚪", role: "比劫・強化日主", desc: "補充日主庚金能量，增強決策力與執行力", color: "#9ca3af" },
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

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16">
      <SharedNav currentPage="profile" />
      {/* 頂部英雄區 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black border-b border-orange-500/20">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-8 text-8xl font-bold text-orange-400 select-none">命</div>
          <div className="absolute top-4 right-8 text-8xl font-bold text-orange-400 select-none">格</div>
        </div>
        <div className="relative container py-10 px-4 max-w-5xl mx-auto">
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
                <h1 className="text-3xl font-bold text-orange-400">{PROFILE.name}</h1>
                <span className="text-sm bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                  庚金日主・身弱
                </span>
              </div>
              <p className="text-gray-400 text-sm mb-3">{PROFILE.occupation}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📅</span>
                  <span>{PROFILE.birthDate}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">🌙</span>
                  <span>{PROFILE.birthLunar}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">⏰</span>
                  <span>{PROFILE.birthTime}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-orange-400">📍</span>
                  <span>{PROFILE.birthPlace}</span>
                </div>
              </div>
            </div>
            {/* 核心格局標籤 */}
            <div className="flex-shrink-0 flex flex-col gap-2 text-center">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                <div className="text-xs text-gray-400 mb-1">核心格局</div>
                <div className="text-orange-300 font-bold">身弱・食傷財旺</div>
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
              庚金日主身弱，水木過旺，需以火土金補強。此策略終身不變，每日穿搭、手串、行動皆依此優先級執行。
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
                <span>💧 水（48%・過旺）</span>
                <span>🌿 木（32%・過旺）</span>
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
                <div className="text-xs text-gray-400 mb-1">當前年齡</div>
                <div className="text-2xl font-bold text-amber-400">41歲</div>
                <div className="text-sm text-gray-300 mt-1">流年對應</div>
                <div className="text-xs text-gray-500">流年 5、17、29、41、53、65</div>
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
              官祿宮大限（45-54歲），太陽雙忌入官祿，事業面臨挑戰與轉型。宜以「火土」補強，強化個人品牌與創業能量，避免依賴傳統職場路徑。
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
