/**
 * auraEngine.ts - 天命共振 Aura Score 雙層計分引擎
 *
 * 公式：最終 Aura Score = 內在基礎運勢 (Innate Aura) + 外在穿搭加成 (Outfit Boost)
 *
 * - Innate Aura (30-90分)：用戶當日原始運勢底盤，由命理+時間+天氣自動計算
 * - Outfit Boost (0-20分)：用戶通過穿搭選擇可獲得的額外加分
 */

// ============================================================
// 五行生剋關係表
// ============================================================

/** 相生：A 生 B */
const GENERATES: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

/** 相剋：A 剋 B */
const CONTROLS: Record<string, string> = {
  木: "土",
  火: "金",
  土: "水",
  金: "木",
  水: "火",
};

// ============================================================
// 五行顏色對應（用於穿搭分析）
// ============================================================

export const ELEMENT_COLORS: Record<string, string[]> = {
  木: ["綠色", "深綠", "草綠", "橄欖綠", "墨綠", "青色", "翠綠"],
  火: ["紅色", "深紅", "酒紅", "橘色", "橙色", "粉紅", "紫色", "桃紅", "珊瑚色"],
  土: ["黃色", "土黃", "棕色", "咖啡色", "米色", "卡其", "駝色", "奶油色", "杏色"],
  金: ["白色", "米白", "象牙白", "金色", "銀色", "灰色", "淺灰", "香檳色"],
  水: ["黑色", "深藍", "藍色", "海軍藍", "靛藍", "炭灰", "深灰", "午夜藍"],
};

/** 從顏色字串推算五行 */
export function guessElementFromColor(color: string): string {
  for (const [element, colors] of Object.entries(ELEMENT_COLORS)) {
    if (colors.some(c => color.includes(c))) return element;
  }
  return "土"; // 預設
}

// ============================================================
// 類型定義
// ============================================================

export interface ElementRatio {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

export interface WeatherData {
  temperature?: number;
  condition?: string; // sunny, cloudy, rainy, snowy, etc.
  wuxingRatio?: ElementRatio;
}

export interface OutfitItem {
  category: "upper" | "lower" | "shoes" | "outer" | "accessory" | "bracelet";
  color: string;
  wuxing?: string; // 若已知五行，直接使用；否則從顏色推算
  name?: string;
}

export interface OutfitCombination {
  upper?: OutfitItem;
  lower?: OutfitItem;
  shoes?: OutfitItem;
  outer?: OutfitItem;
  accessory?: OutfitItem;
  bracelet?: OutfitItem;
}

export interface InnateAuraAnalysis {
  score: number; // 30-90
  weakestElements: string[]; // 今日最缺的五行（補運目標）
  strongestElements: string[]; // 今日最強的五行
  favorableElements: string[]; // 用戶喜用神
  dayElementBalance: ElementRatio; // 今日加權五行分佈
  description: string; // 文字說明
}

export interface AuraScoreResult {
  innateAura: number; // 30-90
  outfitBoost: number; // 0-20
  totalScore: number; // 30-110（通常上限 100）
  innateAnalysis: InnateAuraAnalysis;
  boostBreakdown: Array<{
    category: string;
    color: string;
    wuxing: string;
    points: number;
    reason: string;
  }>;
}

// ============================================================
// 核心計算函數
// ============================================================

/**
 * 計算「內在基礎運勢 (Innate Aura)」
 *
 * 權重：
 * - 本命數據 30%：日主強弱、喜用神
 * - 時間數據 50%：當日干支五行平衡度
 * - 環境數據 20%：天氣五行調候
 */
export function calculateInnateAura(
  natalElementRatio: Record<string, number>,
  favorableElements: string[],
  unfavorableElements: string[],
  dayElementRatio: ElementRatio,
  weatherData?: WeatherData,
): InnateAuraAnalysis {
  const elements = ["木", "火", "土", "金", "水"] as const;

  // 1. 本命分析（30%）：喜用神在今日的強度
  let natalScore = 0;
  for (const el of favorableElements) {
    const natalStrength = natalElementRatio[el] ?? 0;
    // 喜用神本命越弱，補運需求越大，今日若有補到則得分越高
    natalScore += (1 - natalStrength) * 20; // 最多 20 分
  }
  natalScore = Math.min(30, natalScore); // 本命貢獻上限 30

  // 2. 時間分析（50%）：今日干支五行與喜用神的匹配度
  let timeScore = 0;
  for (const el of elements) {
    const dayStrength = dayElementRatio[el];
    if (favorableElements.includes(el)) {
      timeScore += dayStrength * 50; // 喜用神當日越強越好
    } else if (unfavorableElements.includes(el)) {
      timeScore -= dayStrength * 30; // 忌神當日越強越差
    }
  }
  // 映射到 0-50 分
  timeScore = Math.max(0, Math.min(50, timeScore * 100 + 25));

  // 3. 環境分析（20%）：天氣五行調候
  let weatherScore = 10; // 預設中性分
  if (weatherData?.wuxingRatio) {
    for (const el of favorableElements) {
      weatherScore += (weatherData.wuxingRatio[el as keyof ElementRatio] ?? 0) * 15;
    }
    for (const el of unfavorableElements) {
      weatherScore -= (weatherData.wuxingRatio[el as keyof ElementRatio] ?? 0) * 10;
    }
    weatherScore = Math.max(0, Math.min(20, weatherScore));
  }

  // 綜合分數（30-90 區間）
  const rawScore = natalScore + timeScore + weatherScore;
  const score = Math.round(Math.max(30, Math.min(90, rawScore)));

  // 找出今日最弱和最強五行
  const sorted = [...elements].sort(
    (a, b) => (dayElementRatio[a] ?? 0) - (dayElementRatio[b] ?? 0)
  );
  const weakestElements = sorted.slice(0, 2).filter(el => favorableElements.includes(el) || (dayElementRatio[el] ?? 0) < 0.1);
  const strongestElements = sorted.slice(-2).reverse();

  // 文字說明
  const scoreLevel =
    score >= 80 ? "極佳" :
    score >= 70 ? "良好" :
    score >= 60 ? "平穩" :
    score >= 50 ? "偏弱" : "需補強";

  const description = `今日天命底盤 ${scoreLevel}（${score}分）。${
    favorableElements.length > 0
      ? `您的喜用神 ${favorableElements.slice(0, 2).join("、")} 今日${timeScore > 25 ? "能量充沛" : "略顯不足"}，`
      : ""
  }透過穿搭補運可提升至多 20 分。`;

  return {
    score,
    weakestElements: weakestElements.length > 0 ? weakestElements : [sorted[0]],
    strongestElements,
    favorableElements,
    dayElementBalance: dayElementRatio,
    description,
  };
}

/**
 * 計算「外在穿搭加成 (Outfit Boost)」
 *
 * 根據用戶選擇的穿搭組合，計算對今日短板五行的補益效果
 * 上限：BOOST_CAP = 20 分
 */
export function calculateOutfitBoost(
  innateAnalysis: InnateAuraAnalysis,
  outfitCombination: OutfitCombination,
): AuraScoreResult["boostBreakdown"] {
  const BOOST_CAP = 20;
  const breakdown: AuraScoreResult["boostBreakdown"] = [];

  const { weakestElements, favorableElements } = innateAnalysis;
  const seen = new Set<string>();
  const targetElements: string[] = [];
  for (const el of [...weakestElements, ...favorableElements]) {
    if (!seen.has(el)) { seen.add(el); targetElements.push(el); }
  }

  // 各部位的加分權重（上衣最顯眼，加分最多）
  const CATEGORY_WEIGHTS: Record<string, number> = {
    upper: 5,
    outer: 4,
    lower: 3,
    shoes: 2,
    accessory: 2,
    bracelet: 3,
  };

  for (const [cat, item] of Object.entries(outfitCombination)) {
    if (!item) continue;
    const wuxing = item.wuxing ?? guessElementFromColor(item.color);
    const weight = CATEGORY_WEIGHTS[cat] ?? 2;
    let points = 0;
    let reason = "";

    if (targetElements.includes(wuxing)) {
      // 直接補益喜用神：滿分
      points = weight;
      reason = `${wuxing}系${item.color}直接補益今日喜用神，能量加成 +${points}`;
    } else if (GENERATES[wuxing] && targetElements.includes(GENERATES[wuxing])) {
      // 相生喜用神：70% 加分
      points = Math.round(weight * 0.7);
      reason = `${wuxing}系${item.color}生扶${GENERATES[wuxing]}，間接補益 +${points}`;
    } else if (CONTROLS[wuxing] && innateAnalysis.strongestElements.includes(CONTROLS[wuxing])) {
      // 剋制今日過強的五行：50% 加分
      points = Math.round(weight * 0.5);
      reason = `${wuxing}系${item.color}制衡過強的${CONTROLS[wuxing]}，平衡加成 +${points}`;
    } else {
      // 中性或輕微不利
      points = 0;
      reason = `${wuxing}系${item.color}對今日能量影響中性`;
    }

    breakdown.push({
      category: cat,
      color: item.color,
      wuxing,
      points,
      reason,
    });
  }

  // 封頂處理
  let totalBoost = breakdown.reduce((sum, b) => sum + b.points, 0);
  if (totalBoost > BOOST_CAP) {
    // 按比例縮放
    const scale = BOOST_CAP / totalBoost;
    for (const b of breakdown) {
      b.points = Math.round(b.points * scale);
    }
    totalBoost = BOOST_CAP;
  }

  return breakdown;
}

/**
 * 計算完整的 Aura Score（內在 + 外在）
 */
export function calculateAuraScore(
  natalElementRatio: Record<string, number>,
  favorableElements: string[],
  unfavorableElements: string[],
  dayElementRatio: ElementRatio,
  outfitCombination: OutfitCombination = {},
  weatherData?: WeatherData,
): AuraScoreResult {
  const innateAnalysis = calculateInnateAura(
    natalElementRatio,
    favorableElements,
    unfavorableElements,
    dayElementRatio,
    weatherData,
  );

  const boostBreakdown = calculateOutfitBoost(innateAnalysis, outfitCombination);
  const outfitBoost = Math.min(20, boostBreakdown.reduce((sum, b) => sum + b.points, 0));
  const totalScore = Math.min(100, innateAnalysis.score + outfitBoost);

  return {
    innateAura: innateAnalysis.score,
    outfitBoost,
    totalScore,
    innateAnalysis,
    boostBreakdown,
  };
}

/**
 * 根據 Aura Score 生成等級標籤
 */
export function getAuraLevel(score: number): {
  label: string;
  color: string;
  description: string;
  emoji: string;
} {
  if (score >= 90) return { label: "天命爆發", color: "#FFD700", description: "今日天命全開，萬事俱備，大展身手的最佳時機！", emoji: "🌟" };
  if (score >= 80) return { label: "運勢極佳", color: "#FF8C00", description: "能量充沛，諸事順遂，把握機會大步前進。", emoji: "⭐" };
  if (score >= 70) return { label: "運勢良好", color: "#4CAF50", description: "整體運勢穩健，適合推進重要計畫。", emoji: "✨" };
  if (score >= 60) return { label: "運勢平穩", color: "#2196F3", description: "平穩之日，穿對顏色可提升能量共振。", emoji: "💫" };
  if (score >= 50) return { label: "需要補運", color: "#9C27B0", description: "今日能量偏弱，透過穿搭補運效果顯著。", emoji: "🔮" };
  return { label: "急需補強", color: "#F44336", description: "今日天命底盤較低，穿搭補運尤為重要！", emoji: "🛡️" };
}
