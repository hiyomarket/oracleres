/**
 * 刮刮樂天命選號算法
 * 根據蘇祐震先生的命格（甲木日主，用神火土）
 * 結合當日天干地支、時辰能量、月相，生成個人化幸運號碼
 */

import { getDayPillar, HEAVENLY_STEMS, EARTHLY_BRANCHES } from "./lunarCalendar";
import { getMoonPhase } from "./moonPhase";
import { getCurrentHourEnergy } from "./hourlyEnergy";
import { LUCKY_NUMBER_WEIGHTS, LOTTERY_ELEMENT_BOOST } from "./userProfile";

// ============================================================
// 五行數字對應表（傳統命理學）
// ============================================================
// 木：1、3、8（生長、向上、擴展）
// 火：2、7（熱情、光明、行動）
// 土：0、5（穩固、根基、財富）
// 金：4、9（決斷、收斂、精準）
// 水：6、1（智慧、流動、潛能）
// 注意：1 同時屬木與水，取決於命格需求

export const WUXING_NUMBERS: Record<string, number[]> = {
  wood: [1, 3, 8],
  fire: [2, 7],
  earth: [0, 5],
  metal: [4, 9],
  water: [6],
};

// 蘇先生命格：甲木日主（詳見 userProfile.ts）
// 基礎號碼權重—— 統一從 userProfile.LUCKY_NUMBER_WEIGHTS 引用
const BASE_WEIGHTS = LUCKY_NUMBER_WEIGHTS;

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
  寅: "wood", 卯: "wood",
  辰: "earth", 巳: "fire",
  午: "fire", 未: "earth",
  申: "metal", 酉: "metal",
  戌: "earth", 亥: "water",
};

// 五行對彩券號碼的加成分數—— 統一從 userProfile.LOTTERY_ELEMENT_BOOST 引用
const ELEMENT_BOOST = LOTTERY_ELEMENT_BOOST;

export interface LotteryResult {
  numbers: number[];           // 主要推薦號碼（6個，0-9）
  bonusNumbers: number[];      // 備選號碼（3個）
  luckyDigits: number[];       // 最幸運數字（2個，最高權重）
  energyAnalysis: {
    todayElement: string;      // 今日主導五行
    hourElement: string;       // 當前時辰五行
    moonBoost: boolean;        // 是否滿月加成
    overallLuck: number;       // 整體運勢分數 1-10
    recommendation: string;    // 選號建議文字
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
}

/**
 * 根據天干地支計算當日五行加成
 */
function calculateDayBoost(date: Date): Record<number, number> {
  const dayPillar = getDayPillar(date);
  const stemChar = dayPillar.stem;
  const branchChar = dayPillar.branch;

  const stemElement = STEM_ELEMENT[stemChar] || "earth";
  const branchElement = BRANCH_ELEMENT[branchChar] || "earth";

  const boost: Record<number, number> = {};

  // 根據天干五行調整對應數字的權重
  for (let i = 0; i <= 9; i++) {
    boost[i] = 0;
  }

  // 天干加成
  const stemBoostValue = ELEMENT_BOOST[stemElement] || 0;
  WUXING_NUMBERS[stemElement]?.forEach(n => {
    boost[n] = (boost[n] || 0) + stemBoostValue;
  });

  // 地支加成（權重稍低）
  const branchBoostValue = Math.floor((ELEMENT_BOOST[branchElement] || 0) * 0.7);
  WUXING_NUMBERS[branchElement]?.forEach(n => {
    boost[n] = (boost[n] || 0) + branchBoostValue;
  });

  return boost;
}

/**
 * 根據當前時辰計算時辰加成
 */
function calculateHourBoost(date: Date): Record<number, number> {
  const dayPillar = getDayPillar(date);
  const hourEnergy = getCurrentHourEnergy(dayPillar.stem);
  const stemElement = hourEnergy.stemElement || "earth";
  const branchElement = hourEnergy.branchElement || "earth";

  const boost: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    boost[i] = 0;
  }

  // 時辰加成（權重為日柱的 0.5）
  const stemBoostValue = Math.floor((ELEMENT_BOOST[stemElement] || 0) * 0.5);
  WUXING_NUMBERS[stemElement]?.forEach(n => {
    boost[n] = (boost[n] || 0) + stemBoostValue;
  });

  const branchBoostValue = Math.floor((ELEMENT_BOOST[branchElement] || 0) * 0.4);
  WUXING_NUMBERS[branchElement]?.forEach(n => {
    boost[n] = (boost[n] || 0) + branchBoostValue;
  });

  return boost;
}

/**
 * 月相加成：滿月時火系數字（2、7）額外加成
 */
function calculateMoonBoost(date: Date): { boost: Record<number, number>; isFull: boolean } {
  const moonInfo = getMoonPhase(date);
  const boost: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    boost[i] = 0;
  }

  if (moonInfo.phase === "full_moon") {
    // 滿月：火能量最旺，用神數字大加成
    boost[2] = 3;
    boost[7] = 3;
    boost[0] = 1; // 土也受益
    boost[5] = 1;
    return { boost, isFull: true };
  } else if (moonInfo.phase === "waxing_gibbous") {
    // 漸盈凸月：接近滿月，小加成
    boost[2] = 1;
    boost[7] = 1;
    return { boost, isFull: false };
  }

  return { boost, isFull: false };
}

/**
 * 主要選號函數：生成天命共振幸運號碼
 */
export function generateLotteryNumbers(date: Date = new Date()): LotteryResult {
  // 計算各層加成
  const dayBoost = calculateDayBoost(date);
  const hourBoost = calculateHourBoost(date);
  const { boost: moonBoost, isFull: isMoonFull } = calculateMoonBoost(date);
  void moonBoost; // used below

  // 合併最終權重
  const finalWeights: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    finalWeights[i] = BASE_WEIGHTS[i] +
      (dayBoost[i] || 0) +
      (hourBoost[i] || 0) +
      (moonBoost[i] || 0);
    // 確保最低權重為 1
    if (finalWeights[i] < 1) finalWeights[i] = 1;
  }

  // 依權重排序所有數字
  const sortedNumbers = Object.entries(finalWeights)
    .map(([num, weight]) => ({ num: parseInt(num), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 最幸運數字（前2名）
  const luckyDigits = sortedNumbers.slice(0, 2).map(n => n.num);

  // 主要推薦號碼（前6名，確保五行平衡）
  // 優先選用神（火土金），再補充其他
  const mainNumbers = sortedNumbers.slice(0, 6).map(n => n.num);

  // 備選號碼（7-9名）
  const bonusNumbers = sortedNumbers.slice(6, 9).map(n => n.num);

  // 計算今日主導五行
  const dayPillar = getDayPillar(date);
  const stemElement = STEM_ELEMENT[dayPillar.stem] || "earth";
  const branchElement = BRANCH_ELEMENT[dayPillar.branch] || "earth";
  const todayElement = stemElement === branchElement ? stemElement :
    (ELEMENT_BOOST[stemElement] >= ELEMENT_BOOST[branchElement] ? stemElement : branchElement);

  // 當前時辰五行
  const hourEnergy = getCurrentHourEnergy(dayPillar.stem);
  const hourStemElement = hourEnergy.stemElement || "earth";

  // 整體運勢分數
  const luckScore = Math.min(10, Math.max(1,
    5 +
    (ELEMENT_BOOST[todayElement] || 0) +
    (ELEMENT_BOOST[hourStemElement] || 0) * 0.5 +
    (isMoonFull ? 1.5 : 0)
  ));

  // 五行分類
  const wuxingBreakdown = {
    fire: mainNumbers.filter(n => WUXING_NUMBERS.fire.includes(n)),
    earth: mainNumbers.filter(n => WUXING_NUMBERS.earth.includes(n)),
    metal: mainNumbers.filter(n => WUXING_NUMBERS.metal.includes(n)),
    wood: mainNumbers.filter(n => WUXING_NUMBERS.wood.includes(n)),
    water: mainNumbers.filter(n => WUXING_NUMBERS.water.includes(n)),
  };

  // 生成建議文字
  const recommendation = generateRecommendation(
    todayElement, hourStemElement, isMoonFull, luckScore, mainNumbers
  );

  const moonInfo = getMoonPhase(date);

  return {
    numbers: mainNumbers,
    bonusNumbers,
    luckyDigits,
    energyAnalysis: {
      todayElement,
      hourElement: hourStemElement,
      moonBoost: isMoonFull,
      overallLuck: Math.round(luckScore * 10) / 10,
      recommendation,
    },
    wuxingBreakdown,
    timestamp: date,
    dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
    hourPillar: `${hourEnergy.stem}${hourEnergy.branch}`,
    moonPhase: moonInfo.phaseName,
  };
}

/**
 * 生成個人化選號建議文字
 */
function generateRecommendation(
  dayElement: string,
  hourElement: string,
  isMoonFull: boolean,
  luckScore: number,
  numbers: number[]
): string {
  const elementNames: Record<string, string> = {
    fire: "火", earth: "土", metal: "金", wood: "木", water: "水"
  };

  const dayName = elementNames[dayElement] || "土";
  const hourName = elementNames[hourElement] || "火";

  let base = `今日${dayName}氣當令，時辰${hourName}能量流動。`;

  if (dayElement === "fire" || hourElement === "fire") {
    base += "用神之火正旺，此刻與您的天命最為共鳴，是購買刮刮樂的吉時。";
  } else if (dayElement === "earth") {
    base += "財星土氣穩固，財運根基扎實，適合以穩健心態嘗試。";
  } else if (dayElement === "metal") {
    base += "金氣助力決斷，直覺敏銳，選號時相信第一感。";
  } else if (dayElement === "wood") {
    base += "木氣旺盛，身強力足，但財星稍弱，建議小額嘗試。";
  } else {
    base += "水氣偏旺，為命格忌神，建議今日以娛樂心態為主，不宜重注。";
  }

  if (isMoonFull) {
    base += "今逢滿月，宇宙能量達到高峰，火系數字（2、7）尤為吉利。";
  }

  if (luckScore >= 8) {
    base += `整體運勢極佳（${luckScore}/10），推薦號碼 ${numbers.slice(0, 3).join("、")} 與您的天命高度共振。`;
  } else if (luckScore >= 6) {
    base += `運勢中上（${luckScore}/10），可適度嘗試。`;
  } else {
    base += `運勢平穩（${luckScore}/10），量力而為，以平常心待之。`;
  }

  return base;
}

/**
 * 生成多組號碼組合（適用於不同刮刮樂類型）
 */
export interface LotterySet {
  type: string;
  description: string;
  numbers: number[];
  confidence: "high" | "medium" | "low";
}

export function generateLotterySets(date: Date = new Date()): LotterySet[] {
  const base = generateLotteryNumbers(date);

  return [
    {
      type: "天命核心組",
      description: "最高天命共振，用神火土金主導",
      numbers: base.luckyDigits.concat(
        base.numbers.filter(n => !base.luckyDigits.includes(n)).slice(0, 4)
      ).slice(0, 6),
      confidence: "high",
    },
    {
      type: "五行平衡組",
      description: "五行均衡佈局，穩中求勝",
      numbers: [
        WUXING_NUMBERS.fire[0],   // 火
        WUXING_NUMBERS.earth[0],  // 土
        WUXING_NUMBERS.metal[0],  // 金
        WUXING_NUMBERS.wood[0],   // 木
        WUXING_NUMBERS.water[0],  // 水
        base.luckyDigits[0],      // 今日最幸運
      ].slice(0, 6),
      confidence: "medium",
    },
    {
      type: "時辰能量組",
      description: "此刻時辰能量最強的數字組合",
      numbers: base.bonusNumbers.concat(base.numbers.slice(0, 3)).slice(0, 6),
      confidence: "medium",
    },
  ];
}

// ============================================================
// 刮刮樂面額選號策略
// ============================================================

export type ScratchDenomination = 100 | 200 | 300 | 500 | 1000 | 2000;

export interface ScratchDenominationStrategy {
  denomination: ScratchDenomination;
  label: string;
  riskLevel: "保守" | "穩健" | "積極" | "天命";
  description: string;
  strategy: string;
  primaryNumbers: number[];
  backupNumbers: number[];
  confidence: "high" | "medium" | "low";
  buyCount: number;
  maxBudget: number;
}

/**
 * 根據面額生成對應的選號策略
 * 50元：保守型，用神火土為主
 * 100元：穩健型，火土金三用神平衡
 * 200元：積極型，強化偏財，引入時辰加成
 * 500元：天命型，全力共振，最高能量組合
 */
export function generateScratchStrategies(date: Date = new Date()): ScratchDenominationStrategy[] {
  const base = generateLotteryNumbers(date);
  const sets = generateLotterySets(date);

  const strategy100: ScratchDenominationStrategy = {
    denomination: 100,
    label: "100元券",
    riskLevel: "保守",
    description: "天命入門第一步，以火土用神為核心，穩中求財。適合日常天命微調。",
    strategy: "選擇與今日日干共振最強的2-3個數字，重複出現即為天命暗示",
    primaryNumbers: [2, 7, 0, 5].filter(n => base.numbers.includes(n)).concat([2, 7, 0]).slice(0, 3),
    backupNumbers: base.luckyDigits.slice(0, 2),
    confidence: "high",
    buyCount: 3,
    maxBudget: 300,
  };

  const strategy200: ScratchDenominationStrategy = {
    denomination: 200,
    label: "200元券",
    riskLevel: "穩健",
    description: "三用神平衡佈局，火土金各司其職，財路寬廣。適合常規天命佈局。",
    strategy: "以天命核心組為主，搭配五行平衡組備選，兩組交替購買",
    primaryNumbers: sets[0]?.numbers ?? base.numbers.slice(0, 4),
    backupNumbers: sets[1]?.numbers.slice(0, 3) ?? base.bonusNumbers,
    confidence: "high",
    buyCount: 2,
    maxBudget: 400,
  };

  const strategy300: ScratchDenominationStrategy = {
    denomination: 300,
    label: "300元券",
    riskLevel: "積極",
    description: "小天命局，引入時辰加成，適合天命共振分數≥6分的日子。",
    strategy: "在吉時或大吉時辰購買，以時辰能量組為主要參考",
    primaryNumbers: sets[1]?.numbers ?? base.numbers.slice(0, 4),
    backupNumbers: base.numbers.slice(0, 3),
    confidence: base.energyAnalysis.overallLuck >= 6 ? "high" : "medium",
    buyCount: 2,
    maxBudget: 600,
  };

  const strategy500: ScratchDenominationStrategy = {
    denomination: 500,
    label: "500元券",
    riskLevel: "積極",
    description: "偏財星全力加持，結合時辰能量，適合偏財指數≥7的吉日。建議在最佳時辰購買。",
    strategy: "以時辰能量組為主，在最佳時辰（申/酉/戌時）購買，效果最強",
    primaryNumbers: sets[2]?.numbers ?? base.numbers,
    backupNumbers: base.numbers.slice(0, 3),
    confidence: base.energyAnalysis.overallLuck >= 7 ? "high" : "medium",
    buyCount: 1,
    maxBudget: 500,
  };

  const strategy1000: ScratchDenominationStrategy = {
    denomination: 1000,
    label: "1000元券",
    riskLevel: "天命",
    description: "天命大局，整合三組天命號碼，適合偏財指數≥8的大吉日。需搭配最佳時辰。",
    strategy: "整合三組天命號碼，選取出現頻率最高的數字，為您的天命押注",
    primaryNumbers: (() => {
      const allNums = [...(sets[0]?.numbers ?? []), ...(sets[1]?.numbers ?? []), ...(sets[2]?.numbers ?? [])];
      const freq: Record<number, number> = {};
      allNums.forEach(n => { freq[n] = (freq[n] ?? 0) + 1; });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n]) => Number(n));
    })(),
    backupNumbers: base.luckyDigits,
    confidence: base.energyAnalysis.overallLuck >= 8 ? "high" : "low",
    buyCount: 1,
    maxBudget: 1000,
  };

  const strategy2000: ScratchDenominationStrategy = {
    denomination: 2000,
    label: "2000元券",
    riskLevel: "天命",
    description: "至尊天命，五行全力共振，僅在偏財指數≥9的絕佳天命日動用。三維共振全開才可出手。",
    strategy: "最高天命局，需同時滿足：大吉時辰 + 吉地彩券行 + 偏財指數≥9。三維共振全開才可出手。",
    primaryNumbers: (() => {
      const allNums = [...(sets[0]?.numbers ?? []), ...(sets[1]?.numbers ?? []), ...(sets[2]?.numbers ?? []), ...base.luckyDigits];
      const freq: Record<number, number> = {};
      allNums.forEach(n => { freq[n] = (freq[n] ?? 0) + 1; });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([n]) => Number(n));
    })(),
    backupNumbers: base.bonusNumbers,
    confidence: base.energyAnalysis.overallLuck >= 9 ? "high" : "low",
    buyCount: 1,
    maxBudget: 2000,
  };

  return [strategy100, strategy200, strategy300, strategy500, strategy1000, strategy2000];
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
  fire: 10,
  earth: 8,
  metal: 6,
  wood: 3,
  water: 2,
};

export function analyzeAddressWuxing(address: string): AddressAnalysis {
  const digits = address.match(/\d/g)?.map(Number) ?? [];

  const elementCounts: Record<string, number> = { fire: 0, earth: 0, metal: 0, wood: 0, water: 0 };
  const elementMap: Record<number, string> = {
    0: "earth", 1: "wood", 2: "fire", 3: "wood",
    4: "metal", 5: "earth", 6: "water", 7: "fire",
    8: "wood", 9: "metal",
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
    dominantElement === "fire" ? `此地址五行以「火」為主（${domLabel}），與您的甲木命格形成「木火通明」的最佳共振！在此購買刮刮樂，才華與財運雙開，強烈推薦。` :
    dominantElement === "earth" ? `此地址五行以「土」為主（${domLabel}），土承木根，財星穩固。在此購買刮刮樂，偏財有根基，適合穩健型選號。` :
    dominantElement === "metal" ? `此地址五行以「金」為主（${domLabel}），金能剋木但也代表規則與精準。在此購買需謹慎選號，建議以火土數字（2,7,0,5）為主。` :
    dominantElement === "wood" ? `此地址五行以「木」為主（${domLabel}），木旺更旺，能量過盛。建議搭配火色穿搭（紅/橙）來平衡，或選擇其他地址。` :
    `此地址五行以「水」為主（${domLabel}），水旺剋制甲木的才華發揮。建議避開此地，或在申/酉時（金水交替）前往，以金洩水。`;

  const luckyElements = ["fire", "earth", "metal"].flatMap(el =>
    Object.entries(elementMap).filter(([, v]) => v === el).map(([k]) => Number(k))
  );
  const luckyNumbers = Array.from(new Set(luckyElements)).filter(n => digits.includes(n)).slice(0, 3);
  if (luckyNumbers.length < 2) {
    luckyNumbers.push(...[2, 7, 0].filter(n => !luckyNumbers.includes(n)).slice(0, 2 - luckyNumbers.length));
  }

  return {
    address,
    extractedNumbers: digits,
    dominantElement,
    elementCounts,
    resonanceScore,
    resonanceLabel,
    advice,
    luckyNumbers,
  };
}
