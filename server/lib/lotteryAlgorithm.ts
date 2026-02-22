/**
 * 天命共振選號引擎 V3.0
 * 五維動態加權系統：命格 × 流日十神 × 時辰 × 天氣 × 地點
 *
 * 核心理念：
 * 0-9 每個數字都有一個「動態分數」，由五個維度疊加計算。
 * 最終依分數排序，不同日期/時辰/天氣/地點的分數分布完全不同。
 */

import { getDayPillar } from "./lunarCalendar";
import { getCurrentHourEnergy } from "./hourlyEnergy";
import { getMoonPhase } from "./moonPhase";
import { getTenGod, TEN_GOD_MEANING } from "./tenGods";
import { calculateTarotDailyCard } from "./warRoomEngine";
import {
  LUCKY_NUMBER_WEIGHTS,
  LOTTERY_ELEMENT_BOOST,
  SPECIAL_HOUR_BONUS,
} from "./userProfile";

// ============================================================
// 五行數字對應表（傳統命理學）
// ============================================================
export const WUXING_NUMBERS: Record<string, number[]> = {
  wood:  [1, 3, 8],
  fire:  [2, 7],
  earth: [0, 5],
  metal: [4, 9],
  water: [6],
};

// 天干五行對應
const STEM_ELEMENT: Record<string, string> = {
  甲: "wood", 乙: "wood",
  丙: "fire", 丁: "fire",
  戊: "earth", 己: "earth",
  庚: "metal", 辛: "metal",
  壬: "water", 癸: "water",
};

// 地支五行對應
const BRANCH_ELEMENT: Record<string, string> = {
  子: "water", 丑: "earth",
  寅: "wood",  卯: "wood",
  辰: "earth", 巳: "fire",
  午: "fire",  未: "earth",
  申: "metal", 酉: "metal",
  戌: "earth", 亥: "water",
};

// ============================================================
// 維度一：命格基礎分（固定，來自 userProfile）
// ============================================================
const BASE_WEIGHTS = LUCKY_NUMBER_WEIGHTS;
const ELEMENT_BOOST = LOTTERY_ELEMENT_BOOST;

// ============================================================
// 維度二：流日十神策略矩陣
// ============================================================
const TEN_GOD_STRATEGY: Record<string, {
  boost: Record<string, number>;
  penalty: Record<string, number>;
  description: string;
  luckyNumbers: number[];
}> = {
  食神: {
    boost:   { fire: 5, earth: 3 },
    penalty: { water: 3, wood: 1 },
    description: "食神日：才華爆發，火土能量最旺，2/7/0/5 天命共振",
    luckyNumbers: [2, 7, 5, 0],
  },
  傷官: {
    boost:   { fire: 4, metal: 2 },
    penalty: { water: 2 },
    description: "傷官日：突破創新，火能量強，2/7 為核心，金助決斷",
    luckyNumbers: [2, 7, 4, 9],
  },
  偏財: {
    boost:   { earth: 5, fire: 3, metal: 2 },
    penalty: { wood: 2, water: 3 },
    description: "偏財日：機遇湧現，土氣最旺，0/5 為天命數字，火土金全開",
    luckyNumbers: [0, 5, 2, 7],
  },
  正財: {
    boost:   { earth: 4, metal: 2 },
    penalty: { wood: 1, water: 2 },
    description: "正財日：穩健積累，土金共振，0/5/4/9 為穩健之選",
    luckyNumbers: [0, 5, 4, 9],
  },
  七殺: {
    boost:   { metal: 4, fire: 2 },
    penalty: { wood: 3 },
    description: "七殺日：壓力化機遇，金能量強，4/9 為突破數字，火克制七殺",
    luckyNumbers: [4, 9, 2, 7],
  },
  正官: {
    boost:   { metal: 3, earth: 2 },
    penalty: { wood: 2, water: 1 },
    description: "正官日：規則加持，金土穩定，4/9/0/5 為正統之選",
    luckyNumbers: [4, 9, 0, 5],
  },
  偏印: {
    boost:   { metal: 1 },
    penalty: { fire: 2, earth: 1 },
    description: "偏印日：水能量深沉，直覺強但財運偏弱，宜小額嘗試",
    luckyNumbers: [4, 9, 0, 5],
  },
  正印: {
    boost:   {},
    penalty: { fire: 2, earth: 1 },
    description: "正印日：貴人運佳但財星受壓，以金數字（4/9）為主",
    luckyNumbers: [4, 9, 7, 2],
  },
  比肩: {
    boost:   { fire: 1 },
    penalty: { earth: 2 },
    description: "比肩日：自主性強，財星稍弱，以火數字（2/7）激活財運",
    luckyNumbers: [2, 7, 4, 9],
  },
  劫財: {
    boost:   { fire: 2 },
    penalty: { earth: 3, wood: 1 },
    description: "劫財日：財運受阻，以火（2/7）洩木、金（4/9）制木為主",
    luckyNumbers: [2, 7, 4, 9],
  },
};

// ============================================================
// 維度三：時辰加成矩陣（12 時辰 × 命格用神）
// ============================================================
const HOUR_BRANCH_BOOST: Record<string, Record<string, number>> = {
  子: { fire: -2, earth: -1, metal: 1, wood: 0, water: 0 },
  丑: { fire: 1, earth: 3, metal: 2, wood: -1, water: -1 },
  寅: { fire: 1, earth: -1, metal: 0, wood: 0, water: -1 },
  卯: { fire: 1, earth: -1, metal: 0, wood: 0, water: -1 },
  辰: { fire: 1, earth: 2, metal: 1, wood: -1, water: -1 },
  巳: { fire: 5, earth: 3, metal: 2, wood: -1, water: -3 },  // 出生時辰，最大加成
  午: { fire: 4, earth: 2, metal: 1, wood: -1, water: -2 },
  未: { fire: 2, earth: 3, metal: 1, wood: -1, water: -2 },
  申: { fire: 1, earth: 2, metal: 3, wood: -2, water: -1 },
  酉: { fire: 0, earth: 1, metal: 4, wood: -2, water: -1 },
  戌: { fire: 2, earth: 3, metal: 2, wood: -2, water: -2 },
  亥: { fire: -2, earth: -1, metal: 1, wood: 0, water: 0 },
};

// ============================================================
// 維度四：天氣五行對應
// ============================================================
export const WEATHER_ELEMENT_MAP: Record<string, string> = {
  sunny:         "fire",
  partly_cloudy: "earth",
  cloudy:        "metal",
  drizzle:       "water",
  rain:          "water",
  heavy_rain:    "water",
  thunderstorm:  "wood",
  snow:          "water",
  fog:           "metal",
  wind:          "wood",
};

const WEATHER_BOOST: Record<string, number> = {
  fire:   4,
  earth:  3,
  metal:  2,
  wood:  -1,
  water: -3,
};

// ============================================================
// 維度五：地點五行加成
// ============================================================
const ADDRESS_ELEMENT_BOOST: Record<string, number> = {
  fire:   4,
  earth:  3,
  metal:  2,
  wood:  -1,
  water: -2,
};

// ============================================================
// 塔羅流日五行對應
// ============================================================
const TAROT_ELEMENT_MAP: Record<string, { element: string; boost: number }> = {
  "愚者":     { element: "wood",  boost: 1 },
  "魔術師":   { element: "fire",  boost: 3 },
  "女祭司":   { element: "water", boost: -1 },
  "女皇":     { element: "earth", boost: 3 },
  "皇帝":     { element: "fire",  boost: 2 },
  "教皇":     { element: "earth", boost: 2 },
  "戀人":     { element: "wood",  boost: 1 },
  "戰車":     { element: "water", boost: -1 },
  "力量":     { element: "fire",  boost: 3 },
  "隱者":     { element: "earth", boost: 1 },
  "命運之輪": { element: "fire",  boost: 2 },
  "正義":     { element: "metal", boost: 1 },
  "吊人":     { element: "water", boost: -2 },
  "死神":     { element: "water", boost: -1 },
  "節制":     { element: "fire",  boost: 2 },
  "惡魔":     { element: "earth", boost: 1 },
  "塔":       { element: "fire",  boost: 1 },
  "星星":     { element: "wood",  boost: 1 },
  "月亮":     { element: "water", boost: -2 },
  "太陽":     { element: "fire",  boost: 4 },
  "審判":     { element: "fire",  boost: 2 },
  "世界":     { element: "earth", boost: 3 },
  "大愚者":   { element: "wood",  boost: 1 },
};

// ============================================================
// 型別定義
// ============================================================
export interface ScoreBreakdown {
  finalScores: Record<number, number>;
  baseScores: Record<number, number>;
  tenGodBonus: Record<number, number>;
  hourBonus: Record<number, number>;
  weatherBonus: Record<number, number>;
  addressBonus: Record<number, number>;
  moonBonus: Record<number, number>;
  tarotBonus: Record<number, number>;
  tenGodName: string;
  tenGodStrategy: string;
  hourBranch: string;
  weatherElement: string;
  addressElement: string;
  tarotCard: string;
}

export interface LotteryResult {
  numbers: number[];
  bonusNumbers: number[];
  luckyDigits: number[];
  energyAnalysis: {
    todayElement: string;
    hourElement: string;
    moonBoost: boolean;
    overallLuck: number;
    recommendation: string;
  };
  wuxingBreakdown: {
    fire: number[];
    earth: number[];
    metal: number[];
    wood: number[];
    water: number[];
  };
  timestamp: Date;
  dayPillar: string;
  hourPillar: string;
  moonPhase: string;
  scoreBreakdown?: ScoreBreakdown;
}

export interface DynamicLotteryInput {
  weatherCode?: number;
  weatherElement?: string;
  addressElement?: string;
  useWeather?: boolean;
  useAddress?: boolean;
  // 命格覆寫（子帳號命格切換）
  customBaseWeights?: Record<number, number>; // 0-9 數字基礎權重
  customElementBoost?: Record<string, number>; // 五行加成覆寫
}

/**
 * WMO 天氣代碼 → 天氣類型
 */
export function wmoToWeatherType(code: number): string {
  if (code === 0) return "sunny";
  if (code <= 2) return "partly_cloudy";
  if (code <= 3) return "cloudy";
  if (code <= 9) return "fog";
  if (code <= 29) return "rain";
  if (code <= 39) return "fog";
  if (code <= 49) return "fog";
  if (code <= 59) return "drizzle";
  if (code <= 69) return "rain";
  if (code <= 79) return "snow";
  if (code <= 84) return "rain";
  if (code <= 99) return "thunderstorm";
  return "partly_cloudy";
}

// ============================================================
// 核心選號引擎 V3.0
// ============================================================
export function generateLotteryNumbers(
  date: Date = new Date(),
  options: DynamicLotteryInput = {}
): LotteryResult {
  // ── 取得命理資訊 ──────────────────────────────────────────
  const dayPillar = getDayPillar(date);
  const stemEl = STEM_ELEMENT[dayPillar.stem] ?? "earth";
  const branchEl = BRANCH_ELEMENT[dayPillar.branch] ?? "earth";
  const tenGodName = getTenGod(dayPillar.stem);
  const tenGodStrategy = TEN_GOD_STRATEGY[tenGodName] ?? TEN_GOD_STRATEGY["比肩"];

  // 時辰
  const hourEnergy = getCurrentHourEnergy(dayPillar.stem);
  const hourBranch = hourEnergy.branch ?? "午";
  const hourStemEl = STEM_ELEMENT[hourEnergy.stem] ?? "fire";

  // 月相
  const moonInfo = getMoonPhase(date);
  const isMoonFull = moonInfo.phase === "full_moon";
  const isMoonNew = moonInfo.phase === "new_moon";

  // 塔羅流日
  const tarotResult = calculateTarotDailyCard(date.getMonth() + 1, date.getDate());
  const tarotCardName = tarotResult.card.name;
  const tarotInfo = TAROT_ELEMENT_MAP[tarotCardName] ?? { element: "earth", boost: 1 };

  // 天氣五行
  let weatherEl = "earth";
  if (options.useWeather) {
    if (options.weatherElement) {
      weatherEl = options.weatherElement;
    } else if (options.weatherCode !== undefined) {
      const wType = wmoToWeatherType(options.weatherCode);
      weatherEl = WEATHER_ELEMENT_MAP[wType] ?? "earth";
    }
  }

  // 地址五行
  const addressEl = (options.useAddress && options.addressElement) ? options.addressElement : null;

  // ── 初始化分數陣列 ─────────────────────────────────────────
  const baseScores: Record<number, number> = {};
  const tenGodBonus: Record<number, number> = {};
  const hourBonus: Record<number, number> = {};
  const weatherBonus: Record<number, number> = {};
  const addressBonus: Record<number, number> = {};
  const moonBonus: Record<number, number> = {};
  const tarotBonus: Record<number, number> = {};

  for (let i = 0; i <= 9; i++) {
    baseScores[i] = 0; tenGodBonus[i] = 0; hourBonus[i] = 0;
    weatherBonus[i] = 0; addressBonus[i] = 0; moonBonus[i] = 0; tarotBonus[i] = 0;
  }

  // ── 維度一：命格基礎分 ────────────────────────────────────
  const effectiveBaseWeights = options.customBaseWeights ?? BASE_WEIGHTS;
  const effectiveElementBoost = options.customElementBoost ?? ELEMENT_BOOST;
  for (let i = 0; i <= 9; i++) {
    baseScores[i] = effectiveBaseWeights[i] ?? 5;
  }

  // ── 維度二：流日十神策略 ──────────────────────────────────
  // 天干五行加成（主）
  const stemBoost = effectiveElementBoost[stemEl] ?? 0;
  WUXING_NUMBERS[stemEl]?.forEach(n => { tenGodBonus[n] += stemBoost * 1.5; });
  // 地支五行加成（次）
  const branchBoost = effectiveElementBoost[branchEl] ?? 0;
  WUXING_NUMBERS[branchEl]?.forEach(n => { tenGodBonus[n] += branchBoost * 0.8; });
  // 十神策略加成（核心差異化）
  Object.entries(tenGodStrategy.boost).forEach(([el, val]) => {
    WUXING_NUMBERS[el]?.forEach(n => { tenGodBonus[n] += val; });
  });
  // 十神策略降權
  Object.entries(tenGodStrategy.penalty).forEach(([el, val]) => {
    WUXING_NUMBERS[el]?.forEach(n => { tenGodBonus[n] -= val; });
  });
  // 十神特定幸運數字額外加成
  tenGodStrategy.luckyNumbers.forEach((n, idx) => {
    tenGodBonus[n] += (3 - idx);
  });

  // ── 維度三：時辰加成 ──────────────────────────────────────
  const hourBranchBoost = HOUR_BRANCH_BOOST[hourBranch] ?? {};
  Object.entries(hourBranchBoost).forEach(([el, val]) => {
    WUXING_NUMBERS[el]?.forEach(n => { hourBonus[n] += val; });
  });
  // 時辰天干加成
  const hourStemBoost = ELEMENT_BOOST[hourStemEl] ?? 0;
  WUXING_NUMBERS[hourStemEl]?.forEach(n => { hourBonus[n] += hourStemBoost * 0.5; });
  // 特殊時辰加成（出生巳時/丑時）
  const specialBonus = SPECIAL_HOUR_BONUS[hourBranch] ?? 0;
  if (specialBonus > 0) {
    [2, 7, 0, 5].forEach(n => { hourBonus[n] += Math.floor(specialBonus / 5); });
  }

  // ── 維度四：天氣加成 ──────────────────────────────────────
  if (options.useWeather) {
    const wBoost = WEATHER_BOOST[weatherEl] ?? 0;
    WUXING_NUMBERS[weatherEl]?.forEach(n => { weatherBonus[n] += wBoost; });
    if (weatherEl === "fire") { [2, 7].forEach(n => { weatherBonus[n] += 2; }); }
    if (weatherEl === "water") {
      [6].forEach(n => { weatherBonus[n] -= 3; });
      [2, 7].forEach(n => { weatherBonus[n] += 1; });
    }
  }

  // ── 維度五：地點加成 ──────────────────────────────────────
  if (addressEl) {
    const aBoost = ADDRESS_ELEMENT_BOOST[addressEl] ?? 0;
    WUXING_NUMBERS[addressEl]?.forEach(n => { addressBonus[n] += aBoost; });
    if (addressEl === "fire") { [2, 7].forEach(n => { addressBonus[n] += 2; }); }
    if (addressEl === "earth") { [0, 5].forEach(n => { addressBonus[n] += 2; }); }
  }

  // ── 月相加成 ──────────────────────────────────────────────
  if (isMoonFull) {
    [2, 7].forEach(n => { moonBonus[n] += 4; });
    [0, 5].forEach(n => { moonBonus[n] += 1; });
  } else if (moonInfo.phase === "waxing_gibbous") {
    [2, 7].forEach(n => { moonBonus[n] += 2; });
  } else if (isMoonNew) {
    [4, 9].forEach(n => { moonBonus[n] += 1; });
  } else if (moonInfo.phase === "waning_crescent") {
    for (let i = 0; i <= 9; i++) { moonBonus[i] -= 1; }
  }

  // ── 塔羅加成 ──────────────────────────────────────────────
  const tarotEl = tarotInfo.element;
  WUXING_NUMBERS[tarotEl]?.forEach(n => { tarotBonus[n] += tarotInfo.boost; });

  // ── 合併最終分數 ──────────────────────────────────────────
  const finalScores: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    finalScores[i] = Math.max(1,
      baseScores[i] + tenGodBonus[i] + hourBonus[i] +
      weatherBonus[i] + addressBonus[i] + moonBonus[i] + tarotBonus[i]
    );
  }

  // ── 依分數排序 ────────────────────────────────────────────
  const sortedNumbers = Object.entries(finalScores)
    .map(([num, score]) => ({ num: parseInt(num), score }))
    .sort((a, b) => b.score - a.score);

  const luckyDigits = sortedNumbers.slice(0, 2).map(n => n.num);
  const mainNumbers = sortedNumbers.slice(0, 6).map(n => n.num);
  const bonusNumbers = sortedNumbers.slice(6, 9).map(n => n.num);

  // ── 計算整體運勢分數 ──────────────────────────────────────
  const tenGodScore = TEN_GOD_MEANING[tenGodName]?.score ?? 5;
  const moonScore = isMoonFull ? 1.5 : isMoonNew ? -0.5 : 0;
  const weatherScore = options.useWeather ? (WEATHER_BOOST[weatherEl] ?? 0) * 0.3 : 0;
  const luckScore = Math.min(10, Math.max(1,
    tenGodScore * 0.5 +
    (effectiveElementBoost[stemEl] ?? 0) * 0.5 +
    (effectiveElementBoost[hourStemEl] ?? 0) * 0.3 +
    moonScore + weatherScore + 3
  ));

  const todayElement = (effectiveElementBoost[stemEl] ?? 0) >= (effectiveElementBoost[branchEl] ?? 0) ? stemEl : branchEl;

  const wuxingBreakdown = {
    fire:  mainNumbers.filter(n => WUXING_NUMBERS.fire.includes(n)),
    earth: mainNumbers.filter(n => WUXING_NUMBERS.earth.includes(n)),
    metal: mainNumbers.filter(n => WUXING_NUMBERS.metal.includes(n)),
    wood:  mainNumbers.filter(n => WUXING_NUMBERS.wood.includes(n)),
    water: mainNumbers.filter(n => WUXING_NUMBERS.water.includes(n)),
  };

  const recommendation = generateRecommendationV3(
    tenGodName, tenGodStrategy.description, hourBranch,
    weatherEl, options.useWeather ?? false, luckScore, mainNumbers, isMoonFull
  );

  return {
    numbers: mainNumbers,
    bonusNumbers,
    luckyDigits,
    energyAnalysis: {
      todayElement,
      hourElement: hourStemEl,
      moonBoost: isMoonFull,
      overallLuck: Math.round(luckScore * 10) / 10,
      recommendation,
    },
    wuxingBreakdown,
    timestamp: date,
    dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
    hourPillar: `${hourEnergy.stem}${hourEnergy.branch}`,
    moonPhase: moonInfo.phaseName,
    scoreBreakdown: {
      finalScores,
      baseScores,
      tenGodBonus,
      hourBonus,
      weatherBonus,
      addressBonus,
      moonBonus,
      tarotBonus,
      tenGodName,
      tenGodStrategy: tenGodStrategy.description,
      hourBranch,
      weatherElement: weatherEl,
      addressElement: addressEl ?? "none",
      tarotCard: tarotCardName,
    },
  };
}

function generateRecommendationV3(
  tenGodName: string,
  tenGodDesc: string,
  hourBranch: string,
  weatherEl: string,
  useWeather: boolean,
  luckScore: number,
  numbers: number[],
  isMoonFull: boolean
): string {
  const hourNames: Record<string, string> = {
    子: "子時(23-1點)", 丑: "丑時(1-3點)", 寅: "寅時(3-5點)", 卯: "卯時(5-7點)",
    辰: "辰時(7-9點)", 巳: "巳時(9-11點)", 午: "午時(11-13點)", 未: "未時(13-15點)",
    申: "申時(15-17點)", 酉: "酉時(17-19點)", 戌: "戌時(19-21點)", 亥: "亥時(21-23點)",
  };
  const elementNames: Record<string, string> = {
    fire: "火", earth: "土", metal: "金", wood: "木", water: "水"
  };

  let text = `【${tenGodName}日策略】${tenGodDesc}。`;
  text += `今處${hourNames[hourBranch] ?? hourBranch}，`;

  if (hourBranch === "巳") text += "此為您的出生時辰，天生命格共鳴最強！";
  else if (hourBranch === "丑") text += "丑時紫微破軍宮神秘加成，靈感與直覺特別敏銳。";
  else if (["午", "未"].includes(hourBranch)) text += "午未時火土能量旺盛，用神加持中。";
  else if (["申", "酉"].includes(hourBranch)) text += "申酉時金能量強，決斷力與直覺俱佳。";
  else if (["子", "亥"].includes(hourBranch)) text += "子亥時水氣偏旺（忌神），建議以娛樂心態為主。";

  if (useWeather) {
    const wName = elementNames[weatherEl] ?? "土";
    if (weatherEl === "fire") text += `晴天${wName}氣加持，用神共振！`;
    else if (weatherEl === "water") text += `雨天${wName}氣偏旺（忌神），火系數字（2/7）為今日最佳選擇。`;
    else if (weatherEl === "earth") text += `多雲${wName}氣穩定，財星加持。`;
  }

  if (isMoonFull) text += "今逢滿月，宇宙能量達頂峰，火系（2/7）天命共振！";

  text += `推薦號碼 ${numbers.slice(0, 3).join("、")} 為今日最高分，整體天命指數 ${Math.round(luckScore * 10) / 10}/10。`;
  return text;
}

// ============================================================
// 多組號碼生成（V3.0 完全動態化）
// ============================================================
export interface LotterySet {
  type: string;
  description: string;
  numbers: number[];
  confidence: "high" | "medium" | "low";
}

export function generateLotterySets(
  date: Date = new Date(),
  options: DynamicLotteryInput = {}
): LotterySet[] {
  const base = generateLotteryNumbers(date, options);
  const scores = base.scoreBreakdown?.finalScores ?? {};
  const tenGodName = base.scoreBreakdown?.tenGodName ?? "比肩";
  const hourBranch = base.scoreBreakdown?.hourBranch ?? "午";

  const coreSet = base.numbers;

  // 十神策略組
  const tenGodLucky = TEN_GOD_STRATEGY[tenGodName]?.luckyNumbers ?? [2, 7, 0, 5];
  const strategySet = Array.from(new Set([
    ...tenGodLucky,
    ...base.numbers.filter(n => !tenGodLucky.includes(n))
  ])).slice(0, 6);

  // 時辰能量組
  const hourPriorityElements: Record<string, string[]> = {
    巳: ["fire", "earth", "metal"], 午: ["fire", "earth", "metal"],
    未: ["earth", "fire", "metal"], 申: ["metal", "earth", "fire"],
    酉: ["metal", "earth", "fire"], 戌: ["earth", "fire", "metal"],
    辰: ["earth", "metal", "fire"], 寅: ["fire", "metal", "earth"],
    卯: ["fire", "metal", "earth"], 丑: ["earth", "metal", "fire"],
    子: ["metal", "earth", "fire"], 亥: ["metal", "earth", "fire"],
  };
  const hourPriority = hourPriorityElements[hourBranch] ?? ["fire", "earth", "metal"];
  const hourSet: number[] = [];
  hourPriority.forEach(el => {
    WUXING_NUMBERS[el]?.forEach(n => {
      if (!hourSet.includes(n) && hourSet.length < 6) hourSet.push(n);
    });
  });
  base.numbers.forEach(n => {
    if (!hourSet.includes(n) && hourSet.length < 6) hourSet.push(n);
  });

  const sortByScore = (nums: number[]) =>
    [...nums].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  return [
    {
      type: "天命核心組",
      description: `最高天命共振（${tenGodName}日策略），依五維加權分數排序`,
      numbers: sortByScore(coreSet),
      confidence: base.energyAnalysis.overallLuck >= 7 ? "high" : "medium",
    },
    {
      type: `${tenGodName}策略組`,
      description: TEN_GOD_STRATEGY[tenGodName]?.description ?? "依十神策略選號",
      numbers: sortByScore(strategySet),
      confidence: "medium",
    },
    {
      type: "時辰能量組",
      description: `${hourBranch}時五行優先序：${hourPriority.map(e => ({ fire:"火",earth:"土",metal:"金",wood:"木",water:"水" })[e]).join(">")}`,
      numbers: sortByScore(hourSet),
      confidence: "medium",
    },
  ];
}

// ============================================================
// 面額選號策略 V3.0（完全動態化）
// ============================================================
export interface ScratchDenominationStrategy {
  denomination: number;
  label: string;
  riskLevel: string;
  description: string;
  strategy: string;
  primaryNumbers: number[];
  backupNumbers: number[];
  confidence: "high" | "medium" | "low";
  buyCount: number;
  maxBudget: number;
  scoreReason?: string;
}

export function generateScratchStrategies(
  date: Date = new Date(),
  options: DynamicLotteryInput = {}
): ScratchDenominationStrategy[] {
  const base = generateLotteryNumbers(date, options);
  const sets = generateLotterySets(date, options);
  const scores = base.scoreBreakdown?.finalScores ?? {};
  const tenGodName = base.scoreBreakdown?.tenGodName ?? "比肩";
  const hourBranch = base.scoreBreakdown?.hourBranch ?? "午";
  const overallLuck = base.energyAnalysis.overallLuck;

  const allSorted = Object.entries(scores)
    .map(([n, s]) => ({ num: parseInt(n), score: s }))
    .sort((a, b) => b.score - a.score);

  const conservativeNums = allSorted.slice(0, 3).map(n => n.num);
  const steadyNums = allSorted.slice(0, 5).map(n => n.num);
  const aggressiveNums = sets[1]?.numbers ?? base.numbers;
  const destinyNums = (() => {
    const merged = [...(sets[0]?.numbers ?? []), ...(sets[2]?.numbers ?? [])];
    const freq: Record<number, number> = {};
    merged.forEach(n => { freq[n] = (freq[n] ?? 0) + 1; });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1] || (scores[parseInt(b[0])] ?? 0) - (scores[parseInt(a[0])] ?? 0))
      .slice(0, 5).map(([n]) => parseInt(n));
  })();
  const supremeNums = allSorted.slice(0, 6).map(n => n.num);

  const makeScoreReason = (nums: number[]) => {
    const top = nums.slice(0, 3).map(n => `${n}(${Math.round(scores[n] ?? 0)}分)`).join("、");
    return `今日最高分：${top}，${tenGodName}日×${hourBranch}時加權`;
  };

  return [
    {
      denomination: 100,
      label: "100元券",
      riskLevel: "保守",
      description: "命格最確定的3個數字，低風險嘗試。適合任何天命指數日。",
      strategy: `今日${tenGodName}日，命格最高分前3個數字：${conservativeNums.join("、")}`,
      primaryNumbers: conservativeNums,
      backupNumbers: base.luckyDigits,
      confidence: "high",
      buyCount: 1,
      maxBudget: 100,
      scoreReason: makeScoreReason(conservativeNums),
    },
    {
      denomination: 200,
      label: "200元券",
      riskLevel: "穩健",
      description: "命格高分前5個數字，穩健佈局。適合天命指數≥5的日子。",
      strategy: `${tenGodName}日五維加權前5名：${steadyNums.join("、")}`,
      primaryNumbers: steadyNums,
      backupNumbers: base.numbers.filter(n => !steadyNums.includes(n)).slice(0, 2),
      confidence: overallLuck >= 5 ? "high" : "medium",
      buyCount: 1,
      maxBudget: 200,
      scoreReason: makeScoreReason(steadyNums),
    },
    {
      denomination: 300,
      label: "300元券",
      riskLevel: "穩健",
      description: `${tenGodName}日策略組，依十神特定幸運數字為核心。`,
      strategy: TEN_GOD_STRATEGY[tenGodName]?.description ?? "依十神策略選號",
      primaryNumbers: aggressiveNums.slice(0, 5),
      backupNumbers: base.bonusNumbers,
      confidence: overallLuck >= 6 ? "high" : "medium",
      buyCount: 1,
      maxBudget: 300,
      scoreReason: `${tenGodName}日特定幸運數字：${(TEN_GOD_STRATEGY[tenGodName]?.luckyNumbers ?? []).join("、")}`,
    },
    {
      denomination: 500,
      label: "500元券",
      riskLevel: "積極",
      description: `${hourBranch}時辰能量組，時辰五行優先序加持。適合天命指數≥7的吉日。`,
      strategy: `${hourBranch}時辰能量：${sets[2]?.description ?? "時辰加持"}`,
      primaryNumbers: sets[2]?.numbers ?? base.numbers,
      backupNumbers: base.numbers.slice(0, 3),
      confidence: overallLuck >= 7 ? "high" : "medium",
      buyCount: 1,
      maxBudget: 500,
      scoreReason: makeScoreReason(sets[2]?.numbers ?? base.numbers),
    },
    {
      denomination: 1000,
      label: "1000元券",
      riskLevel: "天命",
      description: "天命大局，三組融合最高頻數字，適合天命指數≥8的大吉日。",
      strategy: `天命核心 × ${tenGodName}策略 × ${hourBranch}時辰三維融合`,
      primaryNumbers: destinyNums,
      backupNumbers: base.luckyDigits,
      confidence: overallLuck >= 8 ? "high" : "low",
      buyCount: 1,
      maxBudget: 1000,
      scoreReason: `三組融合最高頻：${destinyNums.slice(0, 3).join("、")}`,
    },
    {
      denomination: 2000,
      label: "2000元券",
      riskLevel: "天命",
      description: "至尊天命，五維全開最優6個數字，僅在天命指數≥9的絕佳日動用。",
      strategy: `五維加權最終排名前6：${supremeNums.join("、")}（需天命指數≥9）`,
      primaryNumbers: supremeNums,
      backupNumbers: base.bonusNumbers,
      confidence: overallLuck >= 9 ? "high" : "low",
      buyCount: 1,
      maxBudget: 2000,
      scoreReason: `五維全開最高分：${supremeNums.slice(0, 3).map(n => `${n}(${Math.round(scores[n] ?? 0)}分)`).join("、")}`,
    },
  ];
}

// ============================================================
// 地址五行分析
// ============================================================
export interface AddressAnalysis {
  address: string;
  extractedNumbers: number[];
  dominantElement: string;
  elementCounts: Record<string, number>;
  resonanceScore: number;
  resonanceLabel: string;
  advice: string;
  luckyNumbers: number[];
}

const ADDRESS_ELEMENT_RESONANCE: Record<string, number> = {
  fire: 10, earth: 8, metal: 6, wood: 3, water: 2,
};

export function analyzeAddressWuxing(address: string): AddressAnalysis {
  const digits = address.match(/\d/g)?.map(Number) ?? [];
  const elementCounts: Record<string, number> = { fire: 0, earth: 0, metal: 0, wood: 0, water: 0 };
  const elementMap: Record<number, string> = {
    0: "earth", 1: "wood", 2: "fire", 3: "wood",
    4: "metal", 5: "earth", 6: "water", 7: "fire",
    8: "wood",  9: "metal",
  };
  digits.forEach(d => {
    const el = elementMap[d] ?? "earth";
    elementCounts[el] = (elementCounts[el] ?? 0) + 1;
  });
  const dominantElement = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "earth";
  const totalDigits = digits.length || 1;
  let resonanceScore = 0;
  Object.entries(elementCounts).forEach(([el, count]) => {
    resonanceScore += (ADDRESS_ELEMENT_RESONANCE[el] ?? 5) * (count / totalDigits);
  });
  resonanceScore = Math.min(10, Math.max(1, Math.round(resonanceScore)));
  const resonanceLabel =
    resonanceScore >= 9 ? "天命共振" :
    resonanceScore >= 7 ? "吉地加持" :
    resonanceScore >= 5 ? "平穩之地" :
    resonanceScore >= 3 ? "能量偏弱" : "忌神之地";
  const elementLabels: Record<string, string> = {
    fire: "火", earth: "土", metal: "金", wood: "木", water: "水"
  };
  const domLabel = elementLabels[dominantElement] ?? "土";
  const advice =
    dominantElement === "fire"  ? `此地址五行以「火」為主（${domLabel}），與您的甲木命格形成「木火通明」的最佳共振！在此購買刮刮樂，才華與財運雙開，強烈推薦。` :
    dominantElement === "earth" ? `此地址五行以「土」為主（${domLabel}），土承木根，財星穩固。在此購買刮刮樂，偏財有根基，適合穩健型選號。` :
    dominantElement === "metal" ? `此地址五行以「金」為主（${domLabel}），金能剋木但也代表規則與精準。在此購買需謹慎選號，建議以火土數字（2,7,0,5）為主。` :
    dominantElement === "wood"  ? `此地址五行以「木」為主（${domLabel}），木旺更旺，能量過盛。建議搭配火色穿搭（紅/橙）來平衡，或選擇其他地址。` :
    `此地址五行以「水」為主（${domLabel}），水旺剋制甲木的才華發揮。建議避開此地，或在申/酉時（金水交替）前往，以金洩水。`;
  const luckyElements = ["fire", "earth", "metal"].flatMap(el =>
    Object.entries(elementMap).filter(([, v]) => v === el).map(([k]) => Number(k))
  );
  const luckyNumbers = Array.from(new Set(luckyElements)).filter(n => digits.includes(n)).slice(0, 3);
  if (luckyNumbers.length < 2) {
    luckyNumbers.push(...[2, 7, 0].filter(n => !luckyNumbers.includes(n)).slice(0, 2 - luckyNumbers.length));
  }
  return {
    address, extractedNumbers: digits, dominantElement,
    elementCounts, resonanceScore, resonanceLabel, advice, luckyNumbers,
  };
}
