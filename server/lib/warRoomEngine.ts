/**
 * 今日作戰室核心引擎 V2.7
 * 整合塔羅流日、穿搭建議、手串推薦、財運羅盤
 * 命格常數統一從 userProfile.ts 引用
 *
 * V2.7 重大更新：
 * - 手串資料庫更新為蘇祐震真實手串 HS-A~HS-J（個人手串矩陣資料庫 V9.0）
 * - 穿搭建議引擎：依天干（10種）× 十神（10種）× 月相（4種）三維差異化
 * - 手串推薦引擎：依天干地支細節推薦，每日組合不同
 */
import { FAVORABLE_ELEMENTS, UNFAVORABLE_ELEMENTS, ELEMENT_COLORS as PROFILE_ELEMENT_COLORS } from "./userProfile";
import {
  OUTFIT_STRATEGY_BY_TENGOD,
  OUTFIT_STYLE_BY_STEM,
  STEM_PERSONALITY as STEM_PERSONALITY_MAP,
  MOON_PHASE_OUTFIT_MODIFIER as MOON_OUTFIT_MOD,
} from "./outfitStrategy";

// ─── 塔羅牌資料庫 ───────────────────────────────────────────────
export const TAROT_CARDS: Record<number, {
  name: string;
  element: string;
  keywords: string[];
  advice: string;
  energy: string;
}> = {
  0:  { name: "愚者（0）", element: "風", keywords: ["純真", "潛能", "起點"], advice: "尚未走過卡巴拉之樹，充滿未開發的潛能與純真的天真。今日適合學習與吸收新知識，保持開放的心態，一切都是新的開始。", energy: "純真潛能能量" },
  1:  { name: "魔術師", element: "風", keywords: ["意志力", "創造", "行動"], advice: "今日一切皆有可能，主動出擊，展現你的能力", energy: "高度主動能量" },
  2:  { name: "女祭司", element: "水", keywords: ["直覺", "神秘", "等待"], advice: "傾聽內心聲音，不急於行動，靜觀其變", energy: "深層洞察能量" },
  3:  { name: "女皇", element: "土", keywords: ["豐盛", "創造力", "感官"], advice: "享受生活之美，創意與財富皆有豐收", energy: "豐盛滋養能量" },
  4:  { name: "皇帝", element: "火", keywords: ["權威", "秩序", "穩定"], advice: "以領導者姿態行事，建立規則與結構", energy: "權威掌控能量" },
  5:  { name: "教皇", element: "土", keywords: ["傳統", "智慧", "指引"], advice: "尋求導師指引，遵循傳統智慧，精神修煉", energy: "靈性智慧能量" },
  6:  { name: "戀人", element: "風", keywords: ["選擇", "愛情", "和諧"], advice: "面對重要選擇，以心為指引，人際關係和諧", energy: "連結和諧能量" },
  7:  { name: "戰車", element: "水", keywords: ["勝利", "意志", "前進"], advice: "以堅定意志克服障礙，勝利在望", energy: "衝刺突破能量" },
  8:  { name: "力量", element: "火", keywords: ["勇氣", "耐心", "內在力量"], advice: "以柔克剛，展現內在力量，勇敢面對挑戰", energy: "內在力量能量" },
  9:  { name: "隱者", element: "土", keywords: ["沉思", "獨處", "智慧"], advice: "今日適合獨處沉澱，向內探索，尋找答案", energy: "深度沉澱能量" },
  10: { name: "命運之輪", element: "火", keywords: ["轉機", "命運", "循環"], advice: "命運轉折點，把握機遇，順應宇宙流動", energy: "命運轉機能量" },
  11: { name: "正義", element: "風", keywords: ["公正", "真相", "平衡"], advice: "以公正之心處事，真相將浮現，因果有報", energy: "公正平衡能量" },
  12: { name: "倒吊人", element: "水", keywords: ["犧牲", "等待", "新視角"], advice: "暫停腳步，從不同角度看問題，等待時機", energy: "轉化等待能量" },
  13: { name: "死神", element: "水", keywords: ["轉變", "結束", "新生"], advice: "舊事物的結束是新生的開始，勇敢放下", energy: "蛻變新生能量" },
  14: { name: "節制", element: "火", keywords: ["平衡", "耐心", "調和"], advice: "保持平衡，不走極端，耐心調和各方力量", energy: "調和平衡能量" },
  15: { name: "惡魔", element: "土", keywords: ["束縛", "物質", "誘惑"], advice: "警惕物質誘惑與執念，認清真正的自由", energy: "警示覺察能量" },
  16: { name: "塔", element: "火", keywords: ["突破", "崩塌", "啟示"], advice: "舊有結構崩塌，是為更好重建，接受改變", energy: "震盪突破能量" },
  17: { name: "星星", element: "風", keywords: ["希望", "靈感", "療癒"], advice: "充滿希望的一天，靈感湧現，療癒身心", energy: "希望靈感能量" },
  18: { name: "月亮", element: "水", keywords: ["幻象", "直覺", "潛意識"], advice: "警惕幻象與誤解，信任直覺，深入潛意識", energy: "神秘直覺能量" },
  19: { name: "太陽", element: "火", keywords: ["成功", "喜悅", "活力"], advice: "充滿活力的大吉之日，自信展現，成功在望", energy: "光明成功能量" },
  20: { name: "審判", element: "火", keywords: ["覺醒", "召喚", "重生"], advice: "聆聽內心的召喚，做出重要決定，迎接覺醒", energy: "覺醒召喚能量" },
  21: { name: "世界", element: "土", keywords: ["完成", "整合", "成就"], advice: "一個重要階段圓滿完成，整合所有收穫", energy: "圓滿整合能量" },
  22: { name: "愚者（22）", element: "風", keywords: ["大智若愚", "圆滿归零", "超越智慧"], advice: "已走完卡巴拉之樹的大愚者，以大智若愚的彙容走過一切。此刻的「不知」是最高層次的智慧，今日適合放下执念，以謙遜與开放的心態迎接宇宙的安排。", energy: "大智若愚圓滿能量" },
};

/**
 * 計算生命靈數中間個性（外在個性）
 * 規則：出生月份數字相加（≥10才相加）+ 出生日期數字相加（≥10才相加），若>22再歸約
 */
export function calculateMiddlePersonality(birthMonth: number, birthDay: number): number {
  const monthSum = birthMonth >= 10 ? Math.floor(birthMonth / 10) + (birthMonth % 10) : birthMonth;
  const daySum = birthDay >= 10 ? Math.floor(birthDay / 10) + (birthDay % 10) : birthDay;
  const raw = monthSum + daySum;
  return raw > 22 ? String(raw).split('').map(Number).reduce((a, b) => a + b, 0) : raw;
}

/**
 * 計算塔羅流日（動態版：根據用戶出生月日計算中間個性）
 * @param month 今日月份
 * @param day 今日日期
 * @param birthMonth 用戶出生月份（可選，未提供則使用預設值10）
 * @param birthDay 用戶出生日期（可選，未提供則使用預設值26）
 */
export function calculateTarotDailyCard(
  month: number,
  day: number,
  birthMonth?: number,
  birthDay?: number
): {
  cardNumber: number;
  card: typeof TAROT_CARDS[number];
  calculation: string;
  middlePersonality: number;
} {
  // 動態計算中間個性：有出生月日則動態計算，否則使用預設值10（蘇先生的中間個性）
  const middlePersonality = (birthMonth && birthDay)
    ? calculateMiddlePersonality(birthMonth, birthDay)
    : 10;
  // 計算流日塔羅牌：
  // 1. 月份 < 10 直接用原數；≥ 10 才將兩位數字相加
  // 2. 日期 < 23 直接用原數；≥ 23 才將兩位數字相加
  // 3. 月日小計若 > 22 則將其各位數字相加归約
  // 4. 中間個性 + 月日小計 = 總和，若 > 22 則將總和各位數字相加归約
  const monthSum = month >= 10 ? Math.floor(month / 10) + (month % 10) : month;
  const daySum = day >= 23 ? Math.floor(day / 10) + (day % 10) : day;
  const rawSubTotal = monthSum + daySum;
  const reducedSub = rawSubTotal > 22
    ? String(rawSubTotal).split('').map(Number).reduce((a, b) => a + b, 0)
    : rawSubTotal;
  const total = middlePersonality + reducedSub;
  let cardNumber = total;
  if (cardNumber > 22) {
    const digits = String(cardNumber).split('').map(Number);
    cardNumber = digits.reduce((a, b) => a + b, 0);
  }
  if (cardNumber === 0) cardNumber = 0;
  let calcSteps = `月(${monthSum}) + 日(${daySum}) = ${rawSubTotal}`;
  if (rawSubTotal > 22) calcSteps += ` → ${String(rawSubTotal).split('').join('+')}=${reducedSub}`;
  calcSteps += ` → ${middlePersonality}+${reducedSub}=${total}`;
  if (total > 22) calcSteps += ` → ${String(total).split('').join('+')}=${cardNumber}`;
  calcSteps += ` → ${cardNumber}號`;
  return {
    cardNumber,
    card: TAROT_CARDS[cardNumber] || TAROT_CARDS[22],
    calculation: `中間個性(${middlePersonality}) + ${calcSteps}`,
    middlePersonality,
  };
}

// ─── 五行顏色對應（細致版）───────────────────────────────────────
const ELEMENT_COLORS_DETAIL: Record<string, { colors: string[]; hex: string[] }> = {
  木: { colors: ["翠綠", "草綠", "青色", "橄欖綠"], hex: ["#2d6a4f", "#52b788", "#74c69d", "#40916c"] },
  火: { colors: ["朱紅", "橙色", "火焰橙", "珊瑚紅", "緋紅", "磚紅"], hex: ["#e63946", "#f4a261", "#e76f51", "#c1121f", "#d62828", "#bc4749"] },
  土: { colors: ["土黃", "駝色", "米白", "棕褐", "沙色", "卡其"], hex: ["#c9a84c", "#d4a373", "#e9c46a", "#a0785a", "#c8963e", "#b5835a"] },
  金: { colors: ["白色", "銀色", "米白", "淺金", "香檳金", "珍珠白"], hex: ["#ffffff", "#c0c0c0", "#f5f5f5", "#d4af37", "#f7e7ce", "#e8e8e8"] },
  水: { colors: ["深藍", "黑色", "深灰", "靛藍", "墨色", "炭灰"], hex: ["#023e8a", "#03045e", "#1b1b2f", "#264653", "#1d3557", "#2b2d42"] },
};

// ─── 天干五行對應 ─────────────────────────────────────────────────
const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// ─── 天干陰陽 ─────────────────────────────────────────────────────
const STEM_YIN_YANG: Record<string, "陽" | "陰"> = {
  甲: "陽", 乙: "陰", 丙: "陽", 丁: "陰", 戊: "陽",
  己: "陰", 庚: "陽", 辛: "陰", 壬: "陽", 癸: "陰",
};


/**
 * 根據天干、十神、月相生成差異化穿搭建議
 * V2.7：三維交叉，每日不同
 */
export function generateOutfitAdvice(
  dailyElement: string,
  dailyScore: number,
  dayStem?: string,
  tenGod?: string,
  moonPhase?: string,
): {
  top: { color: string; element: string; reason: string; style: string };
  bottom: { color: string; element: string; reason: string };
  shoes: { color: string; element: string; reason: string };
  summary: string;
  accentColor?: string;
  energyTag?: string;
  moonNote?: string;
  stemNote?: string;
} {
  // 取得十神策略（主要差異化維度）
  const strategy = OUTFIT_STRATEGY_BY_TENGOD[tenGod || ""] || OUTFIT_STRATEGY_BY_TENGOD["食神"];

  // 取得天干款式建議（次要差異化維度）
  const stemStyle = OUTFIT_STYLE_BY_STEM[dayStem || "甲"] || OUTFIT_STYLE_BY_STEM["甲"];

  // 月相修飾語（第三維度）
  const moonNote = moonPhase ? MOON_OUTFIT_MOD[moonPhase] : undefined;

  // 天干個性備注
  const stemPersonality = dayStem ? STEM_PERSONALITY_MAP[dayStem] : undefined;
  const stemNote = stemPersonality
    ? `今日${dayStem}日，天干之氣「${stemPersonality}」，款式建議：${stemStyle.topStyle}搭配${stemStyle.bottomStyle}，配件選擇${stemStyle.accessory}。`
    : undefined;

  return {
    top: {
      color: strategy.topColor,
      element: strategy.topElement,
      reason: strategy.topReason,
      style: stemStyle.topStyle,
    },
    bottom: {
      color: strategy.bottomColor,
      element: strategy.bottomElement,
      reason: strategy.bottomReason,
    },
    shoes: {
      color: strategy.shoesColor,
      element: strategy.shoesElement,
      reason: strategy.shoesReason,
    },
    summary: strategy.summary,
    accentColor: strategy.accentColor,
    energyTag: strategy.energyTag,
    moonNote,
    stemNote,
  };
}

// ─── 蘇祐震真實手串資料庫 V9.0（HS-A ~ HS-J）────────────────────
export const BRACELET_DB: Record<string, {
  id: string;
  name: string;
  primaryElement: string;
  secondaryElement?: string;
  role: string;
  power: string;
  rating: number; // 1-5 星
  ratingNote: string;
  warningDays?: string[]; // 哪些五行日需謹慎
  bestDays?: string[];    // 哪些五行日最適合
}> = {
  "HS-A": {
    id: "HS-A",
    name: "黃虎眼石（帶貔貅）",
    primaryElement: "土",
    secondaryElement: "金",
    role: "財富引擎・定海神針",
    power: "黃虎眼土屬性補財星，貔貅招財辟邪，金的銳利增強決策力。補財星、化食傷、增決策力。",
    rating: 5,
    ratingNote: "核心用神，財運與決策雙補",
    bestDays: ["土", "火", "金"],
    warningDays: [],
  },
  "HS-B": {
    id: "HS-B",
    name: "太赫茲石（Terahertz）",
    primaryElement: "金",
    role: "科技官殺・決斷防護",
    power: "金屬光澤高頻振動，補官殺提紀律，制比劫化競爭，生印星清思路。",
    rating: 4,
    ratingNote: "重要用神，官殺防護",
    bestDays: ["金", "土", "火"],
    warningDays: [],
  },
  "HS-C": {
    id: "HS-C",
    name: "天眼瑪瑙（帶黑曜石）",
    primaryElement: "土",
    secondaryElement: "水",
    role: "洞察濾網・穩固根基",
    power: "瑪瑙土屬性穩固根基，天眼紋避邪防小人，黑曜石水屬性平衡情緒。",
    rating: 4,
    ratingNote: "重要用神，土水平衡",
    bestDays: ["土", "火"],
    warningDays: ["水"],
  },
  "HS-D": {
    id: "HS-D",
    name: "酒紅石榴石",
    primaryElement: "火",
    role: "行動力引擎・熱情之源",
    power: "純粹火能量補食傷，點燃行動力與魅力，驅寒暖身調候用神，火生土催旺財星。",
    rating: 5,
    ratingNote: "核心用神，第一驅動力",
    bestDays: ["火", "木", "土"],
    warningDays: [],
  },
  "HS-E": {
    id: "HS-E",
    name: "金沙石（金點石）",
    primaryElement: "火",
    secondaryElement: "土",
    role: "行動變現・機遇之石",
    power: "含銅礦物閃耀金點屬火，沙石基底屬土，自帶火生土循環，既補行動力又催旺財星。",
    rating: 5,
    ratingNote: "核心用神，火土雙補完美組合",
    bestDays: ["火", "土", "木"],
    warningDays: [],
  },
  "HS-F": {
    id: "HS-F",
    name: "紫水晶（帶七彩脈輪）",
    primaryElement: "火",
    secondaryElement: "水",
    role: "智慧之火・貴人磁石",
    power: "紫水晶屬火補靈感，七彩脈輪多元能量，招貴人吸引助力，將水的思考轉化為火的洞見。",
    rating: 4,
    ratingNote: "重要用神，靈感與貴人",
    bestDays: ["火", "土", "金"],
    warningDays: [],
  },
  "HS-G": {
    id: "HS-G",
    name: "沉香木（帶一顆紅瑪瑙）",
    primaryElement: "木",
    secondaryElement: "火",
    role: "靜心安神・回歸本心",
    power: "沉香木屬木穩固甲木根基，溫潤香氣帶火特性，紅瑪瑙輔助火能量。木旺日需謹慎。",
    rating: 3,
    ratingNote: "特定場景使用，木旺日慎戴",
    bestDays: ["金", "土"],
    warningDays: ["木", "水"],
  },
  "HS-H": {
    id: "HS-H",
    name: "藍虎眼石（鷹眼石）",
    primaryElement: "水",
    secondaryElement: "木",
    role: "深層溝通・洞察表達",
    power: "藍虎眼屬水對應喉輪，強化溝通與表達，但會加強水木能量。水木旺日絕對避免佩戴。",
    rating: 2,
    ratingNote: "忌神，僅在極特殊情況下使用",
    bestDays: [],
    warningDays: ["水", "木", "火", "土", "金"],
  },
  "HS-I": {
    id: "HS-I",
    name: "白硨磲",
    primaryElement: "金",
    role: "純淨之金・安神定魄",
    power: "佛教七寶之一，白色金能量純淨，柔和決策力，安神定魄收斂過旺的木，讓心神集中。",
    rating: 4,
    ratingNote: "重要用神，純淨金能量",
    bestDays: ["金", "土", "火"],
    warningDays: [],
  },
  "HS-J": {
    id: "HS-J",
    name: "和田玉（青白玉，帶黑曜石）",
    primaryElement: "土",
    secondaryElement: "水",
    role: "滋養之土・養財護財",
    power: "和田玉土中精華溫潤滋養，黑曜石水元素帶來靈感，土水平衡讓你務實而不失洞察。",
    rating: 5,
    ratingNote: "核心用神，養財護財",
    bestDays: ["土", "火", "金"],
    warningDays: [],
  },
};

// ─── 手串推薦邏輯（依天干×十神×地支五行細緻化）──────────────────

/**
 * 依天干取得當日手串能量共振分數（0-10）
 * 用於在同一五行大類中進一步區分
 */
function getBraceletDayScore(bracelet: typeof BRACELET_DB[string], dayStem: string, tenGod: string): number {
  const stemEl = STEM_ELEMENT[dayStem] || "木";
  const stemYY = STEM_YIN_YANG[dayStem] || "陽";

  let score = 5; // 基礎分

  // 主五行與今日天干五行的關係
  const primaryEl = bracelet.primaryElement;
  if (bracelet.bestDays?.includes(stemEl)) score += 3;
  if (bracelet.warningDays?.includes(stemEl)) score -= 4;

  // 評級加成
  score += bracelet.rating - 3;

  // 十神加成
  const tenGodBonus: Record<string, Record<string, number>> = {
    食神: { "HS-D": 2, "HS-E": 2, "HS-F": 1 },
    傷官: { "HS-D": 2, "HS-E": 1, "HS-B": 1 },
    偏財: { "HS-A": 2, "HS-E": 2, "HS-J": 1 },
    正財: { "HS-A": 2, "HS-J": 2, "HS-C": 1 },
    七殺: { "HS-D": 2, "HS-B": 1, "HS-I": 1 },
    正官: { "HS-I": 2, "HS-B": 1, "HS-A": 1 },
    偏印: { "HS-F": 2, "HS-D": 1 },
    正印: { "HS-F": 2, "HS-J": 1 },
    比肩: { "HS-D": 1, "HS-E": 1, "HS-I": 1 },
    劫財: { "HS-A": 2, "HS-J": 2, "HS-I": 1 },
  };
  score += (tenGodBonus[tenGod]?.[bracelet.id] || 0);

  // 陰陽微調（陽干偏向主動性手串，陰干偏向滋養性手串）
  if (stemYY === "陽" && ["HS-D", "HS-E", "HS-B"].includes(bracelet.id)) score += 1;
  if (stemYY === "陰" && ["HS-F", "HS-J", "HS-C"].includes(bracelet.id)) score += 1;

  return Math.max(0, Math.min(10, score));
}

/**
 * 根據天干、十神、月相推薦手串
 * V2.7：三維交叉，每日組合不同
 */
export function recommendBracelets(
  dailyElement: string,
  dailyScore: number,
  dayStem?: string,
  tenGod?: string,
  moonPhase?: string,
): {
  leftHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number; dayScore: number }>;
  rightHand: Array<{ bracelet: typeof BRACELET_DB[string]; reason: string; priority: number; dayScore: number }>;
  summary: string;
  moonNote?: string;
} {
  const stem = dayStem || "甲";
  const god = tenGod || "食神";
  const stemEl = STEM_ELEMENT[stem] || "木";

  // 計算所有手串的今日共振分數
  const scoredBracelets = Object.values(BRACELET_DB).map(b => ({
    bracelet: b,
    dayScore: getBraceletDayScore(b, stem, god),
  })).sort((a, b) => b.dayScore - a.dayScore);

  // 十神主推手串映射（左手第一位由十神直接指定，確保每日不同）
  const TEN_GOD_PRIMARY: Record<string, string> = {
    食神: "HS-D",  // 食神日主推酒紅石榴石（火）
    傷官: "HS-E",  // 傷官日主推金沙石（火土）
    偏財: "HS-A",  // 偏財日主推黃虎眼石貔貅（土）
    正財: "HS-J",  // 正財日主推和田玉（土）
    七殺: "HS-D",  // 七殺日主推酒紅石榴石（火制金）
    正官: "HS-I",  // 正官日主推白碲磲（金）
    偏印: "HS-F",  // 偏印日主推紫水晶（火智慧）
    正印: "HS-F",  // 正印日主推紫水晶（火貴人）
    比肩: "HS-E",  // 比肩日主推金沙石（火土自強）
    劫財: "HS-A",  // 劫財日主推黃虎眼石（土守財）
  };

  // 十神輔助手串映射（左手第二位）
  const TEN_GOD_SECONDARY: Record<string, string> = {
    食神: "HS-E",  // 金沙石輔助
    傷官: "HS-D",  // 酒紅石榴石輔助
    偏財: "HS-E",  // 金沙石輔助
    正財: "HS-A",  // 黃虎眼石輔助
    七殺: "HS-B",  // 太赫茲石輔助
    正官: "HS-B",  // 太赫茲石輔助
    偏印: "HS-D",  // 酒紅石榴石輔助
    正印: "HS-J",  // 和田玉輔助
    比肩: "HS-I",  // 白碲磲輔助
    劫財: "HS-J",  // 和田玉輔助
  };

  // 天干微調：陰干日改用滋養型手串
  const stemYY = STEM_YIN_YANG[stem] || "陽";
  const primaryId = stemYY === "陽"
    ? (TEN_GOD_PRIMARY[god] || "HS-D")
    : (TEN_GOD_SECONDARY[god] || "HS-E"); // 陰干主次互換
  const secondaryId = stemYY === "陽"
    ? (TEN_GOD_SECONDARY[god] || "HS-E")
    : (TEN_GOD_PRIMARY[god] || "HS-D");

  const primaryBracelet = scoredBracelets.find(s => s.bracelet.id === primaryId) || scoredBracelets[0];
  const secondaryBracelet = scoredBracelets.find(s => s.bracelet.id === secondaryId && s.bracelet.id !== primaryId)
    || scoredBracelets.find(s => s.bracelet.id !== primaryId && ["火","土","金"].includes(s.bracelet.primaryElement));

  const leftTop2 = [primaryBracelet, secondaryBracelet].filter(Boolean) as typeof scoredBracelets;

  // 右手：防護忌神（選擇金屬性或土屬性的防護型手串）
  const rightCandidates = scoredBracelets.filter(s =>
    ["金", "土"].includes(s.bracelet.primaryElement) &&
    !["HS-H"].includes(s.bracelet.id) &&
    !leftTop2.some(l => l.bracelet.id === s.bracelet.id)
  );
  const rightTop2 = rightCandidates.slice(0, 2);

  // 生成推薦理由（依十神差異化）
  const reasonTemplates: Record<string, string[]> = {
    食神: [
      `${god}日才華全開，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量與今日食神之火完美共振，讓創意能量倍增`,
      `${leftTop2[1]?.bracelet.name}輔助左手，${leftTop2[1]?.bracelet.power.substring(0, 20)}...，雙重用神加持`,
    ],
    傷官: [
      `${god}日破繭而出，${leftTop2[0]?.bracelet.name}的突破能量與今日傷官氣場共鳴，助你打破框架`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，強化今日的突破力道`,
    ],
    偏財: [
      `${god}日財星入局，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量直接催旺偏財，把握機遇`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，雙重財運加持`,
    ],
    正財: [
      `${god}日穩健積累，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量穩固財星根基，水到渠成`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，長期財運守護`,
    ],
    七殺: [
      `${god}日壓力入局，${leftTop2[0]?.bracelet.name}以${leftTop2[0]?.bracelet.primaryElement}之力制七殺，化壓力為動力`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，雙重防護`,
    ],
    正官: [
      `${god}日官運加持，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量與正官共振，展現專業氣場`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，官場如魚得水`,
    ],
    偏印: [
      `${god}日智慧沉澱，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量點亮靈感之火，洞見湧現`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，深度思考加持`,
    ],
    正印: [
      `${god}日貴人相助，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量吸引貴人磁場，廣結善緣`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，貴人能量加倍`,
    ],
    比肩: [
      `${god}日自強不息，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量強化個人特色，以實力說話`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，個人品牌加持`,
    ],
    劫財: [
      `${god}日守住根基，${leftTop2[0]?.bracelet.name}的${leftTop2[0]?.bracelet.primaryElement}能量穩固財星，防止能量外洩`,
      `${leftTop2[1]?.bracelet.name}輔助，${leftTop2[1]?.bracelet.role}，雙重守財防護`,
    ],
  };

  const reasons = reasonTemplates[god] || reasonTemplates["食神"];

  const leftHand = leftTop2.map((s, i) => ({
    bracelet: s.bracelet,
    reason: reasons[i] || `${s.bracelet.name}（${s.bracelet.role}）與今日${god}能量共振，評級${s.bracelet.rating}★`,
    priority: i + 1,
    dayScore: s.dayScore,
  }));

  const rightHand = rightTop2.map((s, i) => ({
    bracelet: s.bracelet,
    reason: `右手防護：${s.bracelet.name}（${s.bracelet.role}），${s.bracelet.power.substring(0, 30)}...，今日共振指數 ${s.dayScore}/10`,
    priority: i + 1,
    dayScore: s.dayScore,
  }));

  // 月相特別建議
  const moonBraceletNote: Record<string, string> = {
    滿月: "滿月能量最強！今日可同時配戴左右手各一串，讓手串能量與月亮滿盈之力共鳴。",
    新月: "新月之日，建議只戴左手一串（補充用神），讓新月的新生能量自然流入。",
    上弦月: "上弦月能量上升，左手用神手串能量正在累積，是建立新習慣的好時機。",
    下弦月: "下弦月能量收斂，右手防護手串今日特別重要，守住已有的能量成果。",
    殘月: "殘月之日，以右手防護手串為主，靜待新月的到來。",
  };

  const moonNote = moonPhase ? moonBraceletNote[moonPhase] : undefined;

  // 生成總結
  const summaryMap: Record<string, string> = {
    火: `${stem}日火能量旺盛，左手${leftHand[0]?.bracelet.name}+${leftHand[1]?.bracelet.name}補火，右手${rightHand[0]?.bracelet.name}防護，四串全力共振。`,
    土: `${stem}日財星主導，左手${leftHand[0]?.bracelet.name}+${leftHand[1]?.bracelet.name}穩財，右手${rightHand[0]?.bracelet.name}鎖財。`,
    金: `${stem}日需制衡，左手${leftHand[0]?.bracelet.name}+${leftHand[1]?.bracelet.name}補火制金，右手${rightHand[0]?.bracelet.name}緩衝平衡。`,
    水: `${stem}日補火急！左手${leftHand[0]?.bracelet.name}+${leftHand[1]?.bracelet.name}雙火補充，右手${rightHand[0]?.bracelet.name}全力防護。`,
    木: `${stem}日引火洩木，左手${leftHand[0]?.bracelet.name}+${leftHand[1]?.bracelet.name}引木化火，右手${rightHand[0]?.bracelet.name}制木穩財。`,
  };

  return {
    leftHand,
    rightHand,
    summary: summaryMap[stemEl] || `今日${stem}日，左手補充用神（火土金），右手防護忌神，以天命共振手串矩陣守護全天能量。`,
    moonNote,
  };
}

// ─── 財運羅盤 ─────────────────────────────────────────────────────
export function generateWealthCompass(
  dailyElement: string,
  tenGod: string,
  tarotCard: typeof TAROT_CARDS[number],
  overallScore: number,
): {
  lotteryIndex: number;
  lotteryAdvice: string;
  wealthEngine: string;
  businessCompass: string;
  bestAction: string;
} {
  const lotteryMap: Record<string, number> = {
    偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
    七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
    偏印: 4, 正印: 5,
  };
  const baseLottery = lotteryMap[tenGod] || 5;
  const tarotBonus = ["命運之輪", "太陽", "世界", "女皇"].includes(tarotCard.name) ? 1 : 0;
  const lotteryIndex = Math.min(10, baseLottery + tarotBonus);

  const lotteryAdvice = lotteryIndex >= 8
    ? `🎰 今日偏財指數 ${lotteryIndex}/10，天命強力加持！建議在今日最佳時辰（見時辰能量表）購買刮刮樂，並前往天命共振指數最高的彩券行。`
    : lotteryIndex >= 6
    ? `🎰 今日偏財指數 ${lotteryIndex}/10，有一定的偏財能量。可嘗試小額購買，以平常心待之。`
    : `🎰 今日偏財指數 ${lotteryIndex}/10，偏財能量較弱。建議今日專注於正財積累，暫緩偏財嘗試。`;

  const wealthEngineMap: Record<string, string> = {
    食神: "才華引擎啟動：今日的財富來自於你的創意與表達。一個好的提案、一件精彩的作品，都可能帶來意想不到的財富流入。",
    傷官: "突破引擎啟動：今日的財富來自於打破常規。那些別人不敢做的事，你做了，財富就來了。",
    偏財: "機遇引擎啟動：今日偏財星入局，財富以意外的方式降臨。保持開放，把握每一個突發的機遇。",
    正財: "穩健引擎啟動：今日財富以穩定的方式積累。認真對待每一個細節，財富自然水到渠成。",
    七殺: "壓力轉化引擎：今日壓力即是動力。以食神之火制七殺之金，將挑戰轉化為財富的跳板。",
    正官: "規範引擎啟動：今日財富來自於正式管道。合約、薪資、官方認可——這些是今日財富的主要來源。",
    比肩: "競爭引擎啟動：今日財富需要在競爭中獲取。以實力說話，但注意合作優於對抗。",
    劫財: "守財引擎啟動：今日財富面臨耗散風險。守住已有，是今日最重要的財富策略。",
    偏印: "智慧引擎啟動：今日財富來自於知識與洞察。深度思考，往往能發現別人忽略的財富機遇。",
    正印: "貴人引擎啟動：今日財富來自於貴人相助。主動尋求合作，接受他人的幫助與資源。",
  };

  const businessCompassMap: Record<string, string> = {
    食神: "【曜禾集商業羅盤】今日適合：內容創作、品牌曝光、攝影作品發布、提案簡報。核心策略：展示才華，讓作品說話。",
    傷官: "【曜禾集商業羅盤】今日適合：創新提案、突破性企劃、挑戰現有市場。核心策略：以差異化取勝，不走尋常路。",
    偏財: "【曜禾集商業羅盤】今日適合：商業談判、投資決策、新客戶開發、合作洽談。核心策略：主動出擊，把握每個機遇。",
    正財: "【曜禾集商業羅盤】今日適合：財務規劃、長期合約、穩健投資、客戶維護。核心策略：深耕既有關係，穩健積累。",
    七殺: "【曜禾集商業羅盤】今日適合：面對競爭、應對挑戰、危機處理。核心策略：以柔克剛，化壓力為突破口。",
    正官: "【曜禾集商業羅盤】今日適合：正式簽約、政府/機構合作、建立規範。核心策略：遵循規則，以專業取信。",
    比肩: "【曜禾集商業羅盤】今日適合：獨立項目、個人品牌建設。核心策略：展現個人特色，以實力立足。",
    劫財: "【曜禾集商業羅盤】今日建議：暫緩大額投資，專注維護既有客戶。核心策略：守住根基，靜待更佳時機。",
    偏印: "【曜禾集商業羅盤】今日適合：研究分析、策略規劃、學習新技能。核心策略：以知識為武器，深度洞察市場。",
    正印: "【曜禾集商業羅盤】今日適合：尋求合作、建立聯盟、向前輩請益。核心策略：借力使力，整合外部資源。",
  };

  const bestActionMap: Record<string, string> = {
    食神: "立即行動：發布一篇精心創作的內容，或向重要客戶展示你的最新作品",
    傷官: "立即行動：提出一個大膽的創新提案，打破現有的思維框架",
    偏財: "立即行動：主動聯繫一位潛在合作夥伴，或評估一個投資機遇",
    正財: "立即行動：整理財務狀況，制定一個具體的財富積累計劃",
    七殺: "立即行動：直面今日最大的挑戰，以行動代替逃避",
    正官: "立即行動：處理一件正式的商業事務，或推進一個重要合約",
    比肩: "立即行動：專注於個人品牌建設，展現你獨特的專業價值",
    劫財: "立即行動：盤點現有資源，制定防守策略，保護核心資產",
    偏印: "立即行動：深度研究一個你感興趣的領域，將洞察轉化為行動計劃",
    正印: "立即行動：主動向一位你尊敬的人請益，或建立一個重要的合作關係",
  };

  return {
    lotteryIndex,
    lotteryAdvice,
    wealthEngine: wealthEngineMap[tenGod] || "今日財富能量中性，保持覺察，順勢而為。",
    businessCompass: businessCompassMap[tenGod] || "今日以穩健為主，專注於核心業務。",
    bestAction: bestActionMap[tenGod] || "今日保持覺察，在關鍵時刻果斷行動。",
  };
}

// ─── 節氣資料庫 ──────────────────────────────────────────────────
export const SOLAR_TERMS_2026 = [
  { date: "2026-01-05", name: "小寒" },
  { date: "2026-01-20", name: "大寒" },
  { date: "2026-02-03", name: "立春" },
  { date: "2026-02-18", name: "雨水" },
  { date: "2026-03-20", name: "春分" },
  { date: "2026-04-04", name: "清明" },
  { date: "2026-04-20", name: "穀雨" },
  { date: "2026-05-05", name: "立夏" },
  { date: "2026-05-21", name: "小滿" },
  { date: "2026-06-06", name: "芒種" },
  { date: "2026-06-21", name: "夏至" },
  { date: "2026-07-07", name: "小暑" },
  { date: "2026-07-23", name: "大暑" },
  { date: "2026-08-07", name: "立秋" },
  { date: "2026-08-23", name: "處暑" },
  { date: "2026-09-07", name: "白露" },
  { date: "2026-09-23", name: "秋分" },
  { date: "2026-10-08", name: "寒露" },
  { date: "2026-10-23", name: "霜降" },
  { date: "2026-11-07", name: "立冬" },
  { date: "2026-11-22", name: "小雪" },
  { date: "2026-12-07", name: "大雪" },
  { date: "2026-12-22", name: "冬至" },
];

/**
 * 取得最近的節氣
 */
export function getNearestSolarTerm(date: Date): { name: string; daysUntil: number } | null {
  for (const term of SOLAR_TERMS_2026) {
    const termDate = new Date(term.date);
    const diff = Math.ceil((termDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 15) {
      return { name: term.name, daysUntil: diff };
    }
  }
  return null;
}
