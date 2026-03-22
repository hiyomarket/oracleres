/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         天命共振系統 V11.0 — 決策支持引擎                        ║
 * ║         Decision Support Engine: 命理驅動的行動建議             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 功能：
 * 1. getDecisionAdvice()    — 依據當日五行能量生成決策建議
 * 2. getTimingAdvice()      — 最佳行動時機分析
 * 3. getRiskAssessment()    — 風險評估（基於五行相剋）
 */

import type { WeightedElementResult, ElementRatio } from './wuxingEngine';
import type { DaYunResult } from './daYunEngine';

// ─── 接口定義 ────────────────────────────────────────────────────
export type DecisionCategory =
  | 'career'        // 事業/工作
  | 'finance'       // 財務/投資
  | 'relationship'  // 人際/感情
  | 'health'        // 健康
  | 'creativity'    // 創意/學習
  | 'travel';       // 出行/移動

export interface DecisionAdvice {
  category: DecisionCategory;
  /** 建議行動 */
  action: string;
  /** 建議理由（命理邏輯） */
  reasoning: string;
  /** 吉凶評分（1-10，10最吉） */
  score: number;
  /** 最佳行動時辰 */
  bestHour?: string;
  /** 需要迴避的事項 */
  avoidance?: string;
}

export interface DailyDecisionReport {
  date: string;
  overallScore: number;
  /** 今日最適合的決策類型 */
  bestCategory: DecisionCategory;
  /** 今日需謹慎的決策類型 */
  cautionCategory: DecisionCategory;
  advices: DecisionAdvice[];
  /** 今日一句話總結 */
  dailySummary: string;
  /** 大運背景建議 */
  daYunContext: string;
}

// ─── 五行與決策類型的對應關係 ────────────────────────────────────
const ELEMENT_CATEGORY_MAP: Record<string, DecisionCategory[]> = {
  '火': ['career', 'creativity', 'relationship'],
  '土': ['finance', 'career'],
  '金': ['career', 'finance'],
  '木': ['creativity', 'health', 'travel'],
  '水': ['relationship', 'creativity', 'health'],
};

// 各決策類型的用神需求（甲木日主專屬）
const CATEGORY_ELEMENT_NEED: Record<DecisionCategory, string[]> = {
  career:       ['火', '土', '金'],  // 才華輸出+財星落地+官殺決斷
  finance:      ['土', '金'],         // 財星+官殺
  relationship: ['火', '木'],         // 食傷+比劫
  health:       ['火', '土'],         // 暖局+根基
  creativity:   ['火'],               // 食神/傷官
  travel:       ['木', '火'],         // 比劫+食傷
};

// 各決策類型的忌神（甲木日主，忌神：水、木過旺）
const CATEGORY_ELEMENT_AVOID: Record<DecisionCategory, string[]> = {
  career:       ['水'],
  finance:      ['水', '木'],
  relationship: ['水'],
  health:       ['水'],
  creativity:   ['水'],
  travel:       ['水'],
};

// ─── 核心函數 ────────────────────────────────────────────────────

/**
 * 生成每日決策支持報告
 * @param weightedResult 當日加權五行計算結果
 * @param daYunResult 大運計算結果
 * @param date 日期字串 YYYY-MM-DD
 */
export function generateDailyDecisionReport(
  weightedResult: WeightedElementResult,
  daYunResult: DaYunResult,
  date: string
): DailyDecisionReport {
  const { weighted } = weightedResult;

  // 計算各決策類型的吉凶評分
  const advices: DecisionAdvice[] = [];
  const categories: DecisionCategory[] = ['career', 'finance', 'relationship', 'health', 'creativity', 'travel'];

  for (const category of categories) {
    const advice = calculateCategoryAdvice(category, weighted, daYunResult);
    advices.push(advice);
  }

  // 排序找出最佳與最需謹慎的類型
  const sorted = [...advices].sort((a, b) => b.score - a.score);
  const bestCategory = sorted[0]?.category ?? 'creativity';
  const cautionCategory = sorted[sorted.length - 1]?.category ?? 'finance';

  // 計算整體評分
  const overallScore = Math.round(advices.reduce((s, a) => s + a.score, 0) / advices.length);

  // 生成大運背景說明
  const daYunContext = generateDaYunContext(daYunResult);

  // 生成每日一句話總結
  const dailySummary = generateDailySummary(bestCategory, cautionCategory, overallScore, daYunResult);

  return {
    date,
    overallScore,
    bestCategory,
    cautionCategory,
    advices,
    dailySummary,
    daYunContext,
  };
}

// ─── 輔助函數 ────────────────────────────────────────────────────

/** 安全地從 ElementRatio 中取得五行值 */
function getElementValue(ratio: ElementRatio, element: string): number {
  const map: Record<string, keyof ElementRatio> = {
    '木': '木', '火': '火', '土': '土', '金': '金', '水': '水',
  };
  const key = map[element];
  return key ? (ratio[key] ?? 0) : 0;
}

function calculateCategoryAdvice(
  category: DecisionCategory,
  weighted: ElementRatio,
  daYunResult: DaYunResult
): DecisionAdvice {
  const neededElements = CATEGORY_ELEMENT_NEED[category];
  const avoidElements = CATEGORY_ELEMENT_AVOID[category];

  // 計算基礎分數（0-10）
  let score = 5; // 基準分

  // 加分：今日五行中含有所需元素
  for (const el of neededElements) {
    const ratio = (getElementValue(weighted, el)) * 100;
    if (ratio >= 20) score += 1.5;
    else if (ratio >= 15) score += 1.0;
    else if (ratio >= 10) score += 0.5;
  }

  // 扣分：今日五行中含有忈神元素
  for (const el of avoidElements) {
    const ratio = (getElementValue(weighted, el)) * 100;
    if (ratio >= 35) score -= 2.0;
    else if (ratio >= 25) score -= 1.5;
    else if (ratio >= 20) score -= 1.0;
  }

  // 大運加成：若大運策略偏向此類別，加分
  const daYunBias = daYunResult.daYunInfluence.strategyBias;
  if (daYunBias === '食神生財' && (category === 'career' || category === 'creativity')) score += 0.5;
  if (daYunBias === '順勢生旺' && category === 'creativity') score += 0.5;
  if (daYunBias === '強勢補弱' && category === 'health') score += 0.5;

  // 限制在 1-10 範圍
  score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

  const { action, reasoning, bestHour, avoidance } = getCategoryDetails(category, score, weighted);

  return { category, action, reasoning, score, bestHour, avoidance };
}

function getCategoryDetails(
  category: DecisionCategory,
  score: number,
  weighted: ElementRatio
): { action: string; reasoning: string; bestHour?: string; avoidance?: string } {
  const fireRatio = (weighted['火'] ?? 0) * 100;
  const earthRatio = (weighted['土'] ?? 0) * 100;
  const metalRatio = (weighted['金'] ?? 0) * 100;
  const waterRatio = (weighted['水'] ?? 0) * 100;

  const details: Record<DecisionCategory, { action: string; reasoning: string; bestHour: string; avoidance: string }> = {
    career: {
      action: score >= 7 ? '積極推進重要工作任務，適合主動出擊' : score >= 5 ? '穩步推進日常工作，避免冒進' : '以守為主，處理例行事務',
      reasoning: `今日火能量 ${fireRatio.toFixed(0)}%（才華輸出），土能量 ${earthRatio.toFixed(0)}%（財星落地），${score >= 7 ? '事業運勢旺盛，是推進重要決策的好時機。' : score >= 5 ? '事業運勢平穩，適合穩健推進。' : '事業能量偏弱，建議保守應對。'}`,
      bestHour: '巳時（09-11時）或午時（11-13時）',
      avoidance: waterRatio > 35 ? '今日水能量偏高，思慮過多，避免在重要決策上猶豫不決' : '無特殊禁忌',
    },
    finance: {
      action: score >= 7 ? '適合進行財務規劃或投資決策' : score >= 5 ? '保守理財，避免大額投資' : '嚴禁衝動消費，守住現有資產',
      reasoning: `今日土能量 ${earthRatio.toFixed(0)}%（財星），金能量 ${metalRatio.toFixed(0)}%（官殺決斷），${score >= 7 ? '財運旺盛，適合財務決策。' : score >= 5 ? '財運平穩，保守理財為宜。' : '財運偏弱，以守為主。'}`,
      bestHour: '辰時（07-09時）或未時（13-15時）',
      avoidance: waterRatio > 30 ? '水能量偏高，財星受剋，避免衝動投資' : '避免在疲憊時做財務決定',
    },
    relationship: {
      action: score >= 7 ? '主動拓展人際，適合重要社交場合' : score >= 5 ? '維繫現有關係，避免衝突' : '低調行事，減少不必要的社交',
      reasoning: `今日火能量 ${fireRatio.toFixed(0)}%（表達力），${score >= 7 ? '人際磁場強，是建立新連結的好時機。' : score >= 5 ? '人際運勢平穩，維繫現有關係為主。' : '人際能量偏弱，避免重要社交場合。'}`,
      bestHour: '午時（11-13時）或酉時（17-19時）',
      avoidance: '避免在情緒波動時處理重要人際關係',
    },
    health: {
      action: score >= 7 ? '精力充沛，適合運動或戶外活動' : score >= 5 ? '適度活動，注意休息平衡' : '以休養為主，避免過度消耗',
      reasoning: `今日火能量 ${fireRatio.toFixed(0)}%（活力），${score >= 7 ? '身體能量旺盛，適合積極活動。' : score >= 5 ? '身體狀態平穩，注意勞逸平衡。' : '身體能量偏低，需要充分休息。'}`,
      bestHour: '卯時（05-07時）或辰時（07-09時）',
      avoidance: waterRatio > 35 ? '水能量過旺，注意腎臟與泌尿系統的保養' : '避免熬夜，保持規律作息',
    },
    creativity: {
      action: score >= 7 ? '靈感爆發期，立即記錄並執行創意想法' : score >= 5 ? '適合進行創意工作，但需要一些暖身' : '靈感偏弱，以執行既有計劃為主',
      reasoning: `今日火能量 ${fireRatio.toFixed(0)}%（食神/傷官才華），${score >= 7 ? '食神旺盛，是創意輸出的黃金時刻。' : score >= 5 ? '創意能量平穩，穩步推進創作。' : '創意能量偏弱，以執行為主。'}`,
      bestHour: '巳時（09-11時）或午時（11-13時）',
      avoidance: '避免在分心環境中進行需要深度思考的創意工作',
    },
    travel: {
      action: score >= 7 ? '適合出行，尤其是向東南方向' : score >= 5 ? '短途出行無礙，長途需謹慎' : '盡量減少不必要的出行',
      reasoning: `今日木能量旺盛，${score >= 7 ? '出行運勢佳，適合移動與探索。' : score >= 5 ? '出行運勢平穩，短途無礙。' : '出行能量偏弱，建議減少移動。'}`,
      bestHour: '寅時（03-05時）或卯時（05-07時）',
      avoidance: waterRatio > 35 ? '水能量偏高，出行需注意水路安全' : '避免在疲憊狀態下長途出行',
    },
  };

  return details[category];
}

function generateDaYunContext(daYunResult: DaYunResult): string {
  const { currentDaYun, daYunInfluence } = daYunResult;
  return `你目前走「${currentDaYun.stem}${currentDaYun.branch}大運」（${currentDaYun.role}，${currentDaYun.startAge}-${currentDaYun.endAge}歲），大運評估為「${daYunInfluence.auspiciousness}」。${currentDaYun.theme}。還有 ${currentDaYun.yearsRemaining} 年結束此大運。`;
}

function generateDailySummary(
  bestCategory: DecisionCategory,
  cautionCategory: DecisionCategory,
  overallScore: number,
  daYunResult: DaYunResult
): string {
  const categoryLabels: Record<DecisionCategory, string> = {
    career: '事業推進',
    finance: '財務決策',
    relationship: '人際社交',
    health: '健康活動',
    creativity: '創意輸出',
    travel: '出行移動',
  };

  const scoreDesc = overallScore >= 8 ? '今日整體運勢旺盛' :
                    overallScore >= 6 ? '今日整體運勢平穩' :
                    overallScore >= 4 ? '今日整體運勢偏弱' : '今日整體運勢低迷';

  return `${scoreDesc}（${overallScore}/10）。最適合「${categoryLabels[bestCategory]}」，需謹慎「${categoryLabels[cautionCategory]}」。大運背景：${daYunResult.daYunInfluence.auspiciousness}。`;
}
