/**
 * 流日方位吉凶動態引擎 (dailyDirectionEngine.ts)
 * ================================================
 * 在八宅基礎分上，疊加流日六沖方位、三煞方位的動態扣分，
 * 產出每日八方位的最終吉凶分數和辦公桌佈置建議。
 *
 * 所有加權係數可透過 yangzhaiConfig 後台調整。
 */

import {
  type Direction,
  type DirectionResult,
  type BazhaiStar,
  type Gender,
  getDirectionAnalysis,
  getFullBazhaiAnalysis,
  DIRECTION_ELEMENT,
} from './bazhai.js';

// ═══ 類型定義 ═══

/** 地支 */
export type EarthlyBranch = '子' | '丑' | '寅' | '卯' | '辰' | '巳' |
  '午' | '未' | '申' | '酉' | '戌' | '亥';

/** 流日方位修正結果 */
export interface DailyDirectionResult {
  direction: Direction;
  star: string;
  isAuspicious: boolean;
  baseScore: number;
  dailyModifier: number;     // 流日加減分
  finalScore: number;        // 最終分數
  element: string;
  description: string;
  officeAdvice: string;
  antiVillainTip: string;
  dailyWarnings: string[];   // 流日警告（六沖/三煞）
  isClashed: boolean;        // 是否被六沖
  isThreeKilling: boolean;   // 是否在三煞方
}

/** 每日方位完整報告 */
export interface DailyDirectionReport {
  date: string;
  dayBranch: EarthlyBranch;
  dayBranchElement: string;
  clashDirection: Direction | null;
  threeKillingDirections: Direction[];
  directions: DailyDirectionResult[];
  bestDirection: DailyDirectionResult;
  worstDirection: DailyDirectionResult;
  villainDirection: Direction;
  seatAdvice: string;
  dailySummary: string;
}

/** 可調參數（從後台 yangzhaiConfig 讀取） */
export interface DailyDirectionConfig {
  sixClashPenalty: number;       // 六沖扣分（預設 -25）
  threeKillingPenalty: number;   // 三煞扣分（預設 -15）
  favorableElementBonus: number; // 喜用神方位加分（預設 +10）
  unfavorableElementPenalty: number; // 忌神方位扣分（預設 -8）
  starScores?: Partial<Record<BazhaiStar, number>>;
}

// ═══ 常數表 ═══

/** 預設加權係數 */
export const DEFAULT_DAILY_CONFIG: DailyDirectionConfig = {
  sixClashPenalty: -25,
  threeKillingPenalty: -15,
  favorableElementBonus: 10,
  unfavorableElementPenalty: -8,
};

/** 地支 → 五行 */
const BRANCH_ELEMENT: Record<EarthlyBranch, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/**
 * 六沖對照表：地支 → 沖的地支
 * 子午沖、丑未沖、寅申沖、卯酉沖、辰戌沖、巳亥沖
 */
const SIX_CLASH: Record<EarthlyBranch, EarthlyBranch> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

/**
 * 地支 → 對應方位
 * 用於判斷六沖影響哪個方位
 */
const BRANCH_DIRECTION: Record<EarthlyBranch, Direction> = {
  '子': '北', '丑': '東北', '寅': '東北', '卯': '東',
  '辰': '東南', '巳': '東南', '午': '南', '未': '西南',
  '申': '西南', '酉': '西', '戌': '西北', '亥': '西北',
};

/**
 * 三煞方位（年支決定）
 * 申子辰年 → 三煞在南（巳午未）
 * 寅午戌年 → 三煞在北（亥子丑）
 * 亥卯未年 → 三煞在西（申酉戌）
 * 巳酉丑年 → 三煞在東（寅卯辰）
 *
 * 流日也可用日支判斷當日三煞方
 */
const THREE_KILLING_MAP: Record<string, Direction[]> = {
  '申': ['南', '西南', '東南'],
  '子': ['南', '西南', '東南'],
  '辰': ['南', '西南', '東南'],
  '寅': ['北', '東北', '西北'],
  '午': ['北', '東北', '西北'],
  '戌': ['北', '東北', '西北'],
  '亥': ['西', '西南', '西北'],
  '卯': ['西', '西南', '西北'],
  '未': ['西', '西南', '西北'],
  '巳': ['東', '東北', '東南'],
  '酉': ['東', '東北', '東南'],
  '丑': ['東', '東北', '東南'],
};

// ═══ 核心計算函數 ═══

/**
 * 取得六沖方位
 * @param dayBranch 流日地支
 * @returns 被沖的方位
 */
export function getClashDirection(dayBranch: EarthlyBranch): Direction | null {
  const clashBranch = SIX_CLASH[dayBranch];
  if (!clashBranch) return null;
  return BRANCH_DIRECTION[clashBranch] || null;
}

/**
 * 取得三煞方位
 * @param dayBranch 流日地支（或年支）
 * @returns 三煞方位陣列
 */
export function getThreeKillingDirections(dayBranch: EarthlyBranch): Direction[] {
  return THREE_KILLING_MAP[dayBranch] || [];
}

/**
 * 計算每日八方位動態吉凶
 */
export function calculateDailyDirections(
  birthYear: number,
  gender: Gender,
  dayBranch: EarthlyBranch,
  favorableElements: string[],
  unfavorableElements: string[],
  config?: Partial<DailyDirectionConfig>,
): DailyDirectionResult[] {
  const cfg = { ...DEFAULT_DAILY_CONFIG, ...config };
  const baseDirections = getDirectionAnalysis(birthYear, gender, cfg.starScores);
  const clashDir = getClashDirection(dayBranch);
  const threeKillingDirs = getThreeKillingDirections(dayBranch);

  return baseDirections.map((d) => {
    let modifier = 0;
    const warnings: string[] = [];
    let isClashed = false;
    let isThreeKilling = false;

    // 六沖扣分
    if (clashDir && d.direction === clashDir) {
      modifier += cfg.sixClashPenalty;
      warnings.push(`⚡ 今日${dayBranch}日，${d.direction}方被六沖，不宜久坐此方`);
      isClashed = true;
    }

    // 三煞扣分
    if (threeKillingDirs.includes(d.direction)) {
      modifier += cfg.threeKillingPenalty;
      warnings.push(`🔥 ${d.direction}方今日為三煞方，避免在此方動土或大幅調整`);
      isThreeKilling = true;
    }

    // 喜用神方位加分
    const dirElement = DIRECTION_ELEMENT[d.direction];
    if (favorableElements.includes(dirElement)) {
      modifier += cfg.favorableElementBonus;
    }

    // 忌神方位扣分
    if (unfavorableElements.includes(dirElement)) {
      modifier += cfg.unfavorableElementPenalty;
    }

    const finalScore = Math.max(0, Math.min(100, d.baseScore + modifier));

    return {
      direction: d.direction,
      star: d.star,
      isAuspicious: d.isAuspicious,
      baseScore: d.baseScore,
      dailyModifier: modifier,
      finalScore,
      element: d.element,
      description: d.description,
      officeAdvice: d.officeAdvice,
      antiVillainTip: d.antiVillainTip,
      dailyWarnings: warnings,
      isClashed,
      isThreeKilling,
    };
  });
}

/**
 * 產出完整每日方位報告
 */
export function getDailyDirectionReport(
  birthYear: number,
  gender: Gender,
  dayBranch: EarthlyBranch,
  favorableElements: string[],
  unfavorableElements: string[],
  dateStr: string,
  config?: Partial<DailyDirectionConfig>,
): DailyDirectionReport {
  const directions = calculateDailyDirections(
    birthYear, gender, dayBranch, favorableElements, unfavorableElements, config,
  );

  const sorted = [...directions].sort((a, b) => b.finalScore - a.finalScore);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  // 小人方位 = 禍害位（如果被六沖則更嚴重）
  const villainDir = directions.find(d => d.star === '禍害');
  const clashDir = getClashDirection(dayBranch);
  const threeKillingDirs = getThreeKillingDirections(dayBranch);

  // 座位建議
  let seatAdvice = `今日最佳座位朝向：${best.direction}方（${best.star}，${best.finalScore}分）`;
  if (best.dailyWarnings.length > 0) {
    seatAdvice += `。但注意：${best.dailyWarnings[0]}`;
  }
  seatAdvice += `。避免面朝${worst.direction}方（${worst.star}，${worst.finalScore}分）`;

  // 每日摘要
  const clashInfo = clashDir ? `今日${dayBranch}日，${clashDir}方被六沖。` : '';
  const threeKillInfo = threeKillingDirs.length > 0
    ? `三煞方在${threeKillingDirs.join('、')}。`
    : '';

  const dailySummary = `${clashInfo}${threeKillInfo}` +
    `最旺方位：${best.direction}（${best.finalScore}分），` +
    `最凶方位：${worst.direction}（${worst.finalScore}分）。` +
    `建議面朝${best.direction}方工作，桌上可放${getRemedyHint(best.element)}增強能量。`;

  return {
    date: dateStr,
    dayBranch,
    dayBranchElement: BRANCH_ELEMENT[dayBranch] || '土',
    clashDirection: clashDir,
    threeKillingDirections: threeKillingDirs,
    directions,
    bestDirection: best,
    worstDirection: worst,
    villainDirection: villainDir?.direction || '西',
    seatAdvice,
    dailySummary,
  };
}

/** 根據方位五行給出簡單化解提示 */
function getRemedyHint(element: string): string {
  switch (element) {
    case '木': return '綠色植物或木質小物';
    case '火': return '紅色物品或小桌燈';
    case '土': return '黃色/米色物品或陶瓷擺件';
    case '金': return '白色/銀色金屬小物';
    case '水': return '一杯清水或藍色物品';
    default: return '整潔的桌面';
  }
}
