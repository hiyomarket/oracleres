/**
 * 天命共振算法核心
 * 蘇祐震先生專屬擲筊系統
 *
 * 此算法非簡單隨機數，而是基於蘇先生個人能量場的「神諭模擬器」
 * 每次擲筊都是其內在神性與宇宙能量的一次對話
 */

import { getFullDateInfo, type FullDateInfo } from './lunarCalendar';
import { getMoonPhase, type MoonPhaseInfo } from './moonPhase';
import { getCurrentHourEnergy, type HourEnergyInfo } from './hourlyEnergy';
import { FAVORABLE_ELEMENTS, UNFAVORABLE_ELEMENTS } from './userProfile';

export type OracleResult = 'sheng' | 'xiao' | 'yin' | 'li';
// 聖杯(sheng): 一正一反 → 神明同意
// 笑杯(xiao): 兩正面 → 神明笑而不答/再問
// 陰杯(yin): 兩反面 → 神明不同意
// 立筊(li): 特殊彩蛋 → 天命昭昭

export interface OracleWeights {
  sheng: number; // 聖杯基礎權重
  xiao: number;  // 笑杯基礎權重
  yin: number;   // 陰杯基礎權重
}

export interface QueryAnalysis {
  type: 'fire_earth' | 'water_wood' | 'metal' | 'neutral';
  keywords: string[];
  description: string;
}

export interface OracleCastResult {
  result: OracleResult;
  weights: OracleWeights;
  queryAnalysis: QueryAnalysis;
  dateInfo: FullDateInfo;
  moonPhase: MoonPhaseInfo;
  currentHourEnergy: HourEnergyInfo;
  isSpecialEgg: boolean;
  interpretation: string;
  energyResonance: string;
}

// 基礎機率（傳統擲筊：聖杯50%、笑杯25%、陰杯25%）
const BASE_WEIGHTS: OracleWeights = {
  sheng: 50,
  xiao: 25,
  yin: 25,
};

// 問題類型關鍵詞庫
const FIRE_EARTH_KEYWORDS = [
  '事業', '賺錢', '項目', '執行', '創業', '工作', '投資', '財富',
  '行動', '計劃', '目標', '成就', '升遷', '業績', '收入', '錢',
  '生意', '合約', '簽約', '決定', '出發', '開始', '啟動', '機會',
];

const WATER_WOOD_KEYWORDS = [
  '學習', '思考', '健康', '休息', '讀書', '研究', '靜養', '冥想',
  '成長', '智慧', '知識', '修行', '療癒', '放鬆', '旅行', '創作',
  '寫作', '藝術', '靈性', '內心', '自我', '反思', '沉澱',
];

const METAL_KEYWORDS = [
  '人際', '合作', '感情', '是非', '朋友', '家人', '伴侶', '戀愛',
  '婚姻', '爭執', '糾紛', '法律', '規則', '競爭', '對手', '小人',
  '關係', '溝通', '協議', '和解', '衝突',
];

/**
 * 分析問題類型
 */
export function analyzeQuery(query: string): QueryAnalysis {
  if (!query || query.trim().length === 0) {
    return {
      type: 'neutral',
      keywords: [],
      description: '未輸入問題，以中性能量計算',
    };
  }

  const foundFireEarth = FIRE_EARTH_KEYWORDS.filter(kw => query.includes(kw));
  const foundWaterWood = WATER_WOOD_KEYWORDS.filter(kw => query.includes(kw));
  const foundMetal = METAL_KEYWORDS.filter(kw => query.includes(kw));

  const fireScore = foundFireEarth.length * 2;
  const waterScore = foundWaterWood.length * 2;
  const metalScore = foundMetal.length * 2;

  if (fireScore >= waterScore && fireScore >= metalScore && fireScore > 0) {
    return {
      type: 'fire_earth',
      keywords: foundFireEarth,
      description: `問題涉及「${foundFireEarth.slice(0, 3).join('、')}」，火土能量共鳴，用神得力`,
    };
  } else if (waterScore >= fireScore && waterScore >= metalScore && waterScore > 0) {
    return {
      type: 'water_wood',
      keywords: foundWaterWood,
      description: `問題涉及「${foundWaterWood.slice(0, 3).join('、')}」，水木能量旺盛，忌神當道`,
    };
  } else if (metalScore > 0) {
    return {
      type: 'metal',
      keywords: foundMetal,
      description: `問題涉及「${foundMetal.slice(0, 3).join('、')}」，金氣流動，能量複雜`,
    };
  }

  return {
    type: 'neutral',
    keywords: [],
    description: '問題能量中性，以日柱能量為主導',
  };
}

/**
 * 根據日柱能量調整權重
 */
function applyDailyEnergyWeight(weights: OracleWeights, dateInfo: FullDateInfo): OracleWeights {
  const { stemElement, branchElement } = dateInfo.dayPillar;
  const adjusted = { ...weights };

  // 火日：聖杯大幅提升
  if (stemElement === '火') {
    adjusted.sheng += 20;
    adjusted.yin -= 10;
    adjusted.xiao -= 10;
  }
  // 土日：聖杯提升
  if (stemElement === '土' || branchElement === '土') {
    adjusted.sheng += 12;
    adjusted.yin -= 6;
    adjusted.xiao -= 6;
  }
  // 水日：陰杯提升
  if (stemElement === '水' || branchElement === '水') {
    adjusted.yin += 15;
    adjusted.sheng -= 10;
    adjusted.xiao -= 5;
  }
  // 木日：陰杯提升（水木同忌）
  if (stemElement === '木' || branchElement === '木') {
    adjusted.yin += 10;
    adjusted.sheng -= 7;
    adjusted.xiao -= 3;
  }
  // 金日：笑杯提升（能量複雜）
  if (stemElement === '金' || branchElement === '金') {
    adjusted.xiao += 15;
    adjusted.sheng -= 8;
    adjusted.yin -= 7;
  }

  // 丑日特殊加成（命盤最重要宮位）
  if (dateInfo.dayPillar.branch === '丑') {
    adjusted.sheng += 25;
    adjusted.yin -= 15;
    adjusted.xiao -= 10;
  }

  return normalizeWeights(adjusted);
}

/**
 * 根據月相調整權重（滿月加成）
 */
function applyMoonPhaseWeight(weights: OracleWeights, moonPhase: MoonPhaseInfo): OracleWeights {
  if (moonPhase.shengBonus <= 0) return weights;

  const adjusted = { ...weights };
  adjusted.sheng += moonPhase.shengBonus;
  // 從陰杯扣除（滿月時神明更願意回應）
  adjusted.yin -= Math.ceil(moonPhase.shengBonus * 0.7);
  adjusted.xiao -= Math.floor(moonPhase.shengBonus * 0.3);

  return normalizeWeights(adjusted);
}

/**
 * 根據當前時辰能量調整權重
 * 時辰能量分數 0-100，以50為基準進行調整
 */
function applyHourEnergyWeight(weights: OracleWeights, hourEnergy: HourEnergyInfo): OracleWeights {
  const adjusted = { ...weights };
  const deviation = hourEnergy.energyScore - 50; // -50 到 +50

  if (deviation > 0) {
    // 吉時：聖杯提升
    const bonus = Math.round(deviation * 0.25); // 最多 +12.5
    adjusted.sheng += bonus;
    adjusted.yin -= Math.ceil(bonus * 0.6);
    adjusted.xiao -= Math.floor(bonus * 0.4);
  } else if (deviation < 0) {
    // 凶時：陰杯提升
    const penalty = Math.round(Math.abs(deviation) * 0.2); // 最多 +10
    adjusted.yin += penalty;
    adjusted.sheng -= Math.ceil(penalty * 0.7);
    adjusted.xiao -= Math.floor(penalty * 0.3);
  }

  // 巳時（出生時辰）特殊加成
  if (hourEnergy.isBirthHour) {
    adjusted.sheng += 8;
    adjusted.yin -= 5;
    adjusted.xiao -= 3;
  }

  return normalizeWeights(adjusted);
}

/**
 * 根據問題類型調整權重
 */
function applyQueryTypeWeight(weights: OracleWeights, queryAnalysis: QueryAnalysis): OracleWeights {
  const adjusted = { ...weights };

  switch (queryAnalysis.type) {
    case 'fire_earth':
      // 事業/賺錢類：聖杯提升
      adjusted.sheng += 15;
      adjusted.yin -= 10;
      adjusted.xiao -= 5;
      break;
    case 'water_wood':
      // 學習/休息類：陰杯提升（神明提示需靜心）
      adjusted.yin += 15;
      adjusted.sheng -= 10;
      adjusted.xiao -= 5;
      break;
    case 'metal':
      // 人際/感情類：笑杯提升（神明微笑，需再思量）
      adjusted.xiao += 15;
      adjusted.sheng -= 8;
      adjusted.yin -= 7;
      break;
    case 'neutral':
    default:
      // 中性：不調整
      break;
  }

  return normalizeWeights(adjusted);
}

/**
 * 正規化權重（確保總和為100，且無負值）
 */
function normalizeWeights(weights: OracleWeights): OracleWeights {
  const normalized = {
    sheng: Math.max(5, weights.sheng),
    xiao: Math.max(5, weights.xiao),
    yin: Math.max(5, weights.yin),
  };

  const total = normalized.sheng + normalized.xiao + normalized.yin;
  return {
    sheng: Math.round((normalized.sheng / total) * 100),
    xiao: Math.round((normalized.xiao / total) * 100),
    yin: 100 - Math.round((normalized.sheng / total) * 100) - Math.round((normalized.xiao / total) * 100),
  };
}

/**
 * 根據最終權重生成擲筊結果
 */
function generateResult(weights: OracleWeights): OracleResult {
  const random = Math.random() * 100;
  if (random < weights.sheng) return 'sheng';
  if (random < weights.sheng + weights.xiao) return 'xiao';
  return 'yin';
}

/**
 * 判斷是否觸發立筊彩蛋
 * 條件：農曆丑月或丑時，且極小機率（1.5%）
 */
function checkSpecialEgg(dateInfo: FullDateInfo): boolean {
  if (!dateInfo.isSpecialChouTime) return false;
  return Math.random() < 0.015; // 1.5% 機率
}

/**
 * 生成結果解讀文字
 */
function generateInterpretation(
  result: OracleResult,
  queryAnalysis: QueryAnalysis,
  dateInfo: FullDateInfo
): string {
  const dayDesc = `${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日`;

  if (result === 'li') {
    return '天命昭昭，無須再問。此事神明自有定奪。';
  }

  const baseInterpretations: Record<OracleResult, string[]> = {
    sheng: [
      `神明已允，${dayDesc}天時相助，此事可行。`,
      `聖杯降臨，用神得力，前路光明，放膽前行。`,
      `天地共鳴，此問所求，神明允諾，吉兆已現。`,
      `火光照耀，${dayDesc}能量加持，此事順遂，宜即刻行動。`,
    ],
    xiao: [
      `神明微笑，此事尚需思量，或時機未至，可再問一次。`,
      `笑杯示現，${dayDesc}能量複雜，神明提示需更多準備。`,
      `天意難測，此問需再斟酌，靜待時機或調整方向。`,
      `神明以笑回應，此事非否非允，宜深思熟慮後再行。`,
    ],
    yin: [
      `神明婉拒，${dayDesc}時機未到，此事宜緩行或另謀他途。`,
      `陰杯示警，忌神當道，此事暫不宜進行，靜待時機。`,
      `天地能量不合，神明提示此路暫閉，宜轉換思路。`,
      `此問所求，神明以陰杯示意，宜退守靜觀，蓄勢待發。`,
    ],
    li: [
      '天命昭昭，無須再問。此事神明自有定奪。',
    ],
  };

  const options = baseInterpretations[result];
  const base = options[Math.floor(Math.random() * options.length)];

  // 根據問題類型添加補充
  let supplement = '';
  if (queryAnalysis.type === 'fire_earth' && result === 'sheng') {
    supplement = '事業財運有神明護佑，此時行動，天時地利人和。';
  } else if (queryAnalysis.type === 'water_wood' && result === 'yin') {
    supplement = '學習修行之事，神明提示需更多沉澱，勿急於求成。';
  } else if (queryAnalysis.type === 'metal' && result === 'xiao') {
    supplement = '人際感情之事，神明以笑示意，需多溝通，真誠以待。';
  }

  return supplement ? `${base}${supplement}` : base;
}

/**
 * 生成能量共鳴說明
 */
function generateEnergyResonance(dateInfo: FullDateInfo, queryAnalysis: QueryAnalysis): string {
  const { stem, branch, stemElement, branchElement } = dateInfo.dayPillar;
  const dayDesc = `${stem}${branch}日（${stemElement}/${branchElement}）`;

  let resonance = `今日${dayDesc}，${dateInfo.dayPillar.energyDescription}`;

  if (queryAnalysis.type !== 'neutral') {
    resonance += ` 您所問之事涉及「${queryAnalysis.keywords.slice(0, 2).join('、')}」，${queryAnalysis.description}。`;
  }

  return resonance;
}

/**
 * 主算法：執行天命共振擲筊
 * 四層加權：日柱能量 → 時辰能量 → 月相加成 → 問題類型
 */
export function castOracle(query: string, date?: Date): OracleCastResult {
  const dateInfo = getFullDateInfo(date);
  const queryAnalysis = analyzeQuery(query);
  const moonPhase = getMoonPhase(date);
  const currentHourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);

  // 檢查立筊彩蛋
  const isSpecialEgg = checkSpecialEgg(dateInfo);
  if (isSpecialEgg) {
    return {
      result: 'li',
      weights: BASE_WEIGHTS,
      queryAnalysis,
      dateInfo,
      moonPhase,
      currentHourEnergy,
      isSpecialEgg: true,
      interpretation: '天命昭昭，無須再問。此事神明自有定奪。',
      energyResonance: `今日逢${dateInfo.hourInfo.isChougHour ? '丑時' : '丑月'}，天命寶庫開啟，紫微星光照耀，此乃天命之示現。`,
    };
  }

  // 第一層：從基礎權重開始
  let weights = { ...BASE_WEIGHTS };

  // 第二層：應用日柱能量權重
  weights = applyDailyEnergyWeight(weights, dateInfo);

  // 第三層：應用當前時辰能量權重（精細化）
  weights = applyHourEnergyWeight(weights, currentHourEnergy);

  // 第四層：應用月相加成
  weights = applyMoonPhaseWeight(weights, moonPhase);

  // 第五層：應用問題類型權重
  weights = applyQueryTypeWeight(weights, queryAnalysis);

  // 生成最終結果
  const result = generateResult(weights);

  const interpretation = generateInterpretation(result, queryAnalysis, dateInfo);
  const energyResonance = generateEnergyResonance(dateInfo, queryAnalysis);

  return {
    result,
    weights,
    queryAnalysis,
    dateInfo,
    moonPhase,
    currentHourEnergy,
    isSpecialEgg: false,
    interpretation,
    energyResonance,
  };
}

/**
 * 結果顯示文字
 */
export const RESULT_DISPLAY: Record<OracleResult, {
  name: string;
  description: string;
  color: string;
  emoji: string;
}> = {
  sheng: {
    name: '聖杯',
    description: '神明允諾，此事可行',
    color: 'red',
    emoji: '🔴',
  },
  xiao: {
    name: '笑杯',
    description: '神明微笑，需再思量',
    color: 'wood',
    emoji: '🟤',
  },
  yin: {
    name: '陰杯',
    description: '神明婉拒，此事暫緩',
    color: 'black',
    emoji: '⚫',
  },
  li: {
    name: '立筊',
    description: '天命昭昭，神明自有定奪',
    color: 'gold',
    emoji: '✨',
  },
};
