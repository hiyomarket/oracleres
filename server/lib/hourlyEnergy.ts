/**
 * 12時辰能量計算系統
 * 蘇祐震先生專屬 - 精細到時辰的能量分析
 *
 * 核心命格：甲木日主，水木極旺（75%+），喜火、土，忌水、木，金複雜
 * 八字：甲子年 乙亥月 甲子日 己巳時
 */

import { HEAVENLY_STEMS, EARTHLY_BRANCHES, STEM_ELEMENT, BRANCH_ELEMENT, getTaiwanHour } from './lunarCalendar';
import type { EnergyLevel } from './lunarCalendar';
import { HOUR_ELEMENT_SCORES, SPECIAL_HOUR_BONUS } from './userProfile';

/** 可選的動態命格分數覆寫（供商業化多用戶使用） */
export interface DynamicHourProfile {
  /** 五行對時辰分數的加減（例：{ 火: 30, 土: 20, 金: 5, 水: -25, 木: -20 }） */
  hourElementScores?: Record<string, number>;
  /** 特殊時辰加成（例：{ 巳: 15, 丑: 10 }） */
  specialHourBonus?: Record<string, number>;
}

// ─── 時辰基礎資料 ───────────────────────────────────────────────────────────

export interface HourBranch {
  branch: string;         // 地支
  branchElement: string;  // 地支五行
  startHour: number;      // 開始時間（24小時制）
  endHour: number;        // 結束時間
  displayTime: string;    // 顯示時間範圍
  chineseName: string;    // 中文時辰名
}

// 12時辰地支對應（每兩小時一個時辰）
export const HOUR_BRANCHES: HourBranch[] = [
  { branch: '子', branchElement: '水', startHour: 23, endHour: 1,  displayTime: '23:00–01:00', chineseName: '子時' },
  { branch: '丑', branchElement: '土', startHour: 1,  endHour: 3,  displayTime: '01:00–03:00', chineseName: '丑時' },
  { branch: '寅', branchElement: '木', startHour: 3,  endHour: 5,  displayTime: '03:00–05:00', chineseName: '寅時' },
  { branch: '卯', branchElement: '木', startHour: 5,  endHour: 7,  displayTime: '05:00–07:00', chineseName: '卯時' },
  { branch: '辰', branchElement: '土', startHour: 7,  endHour: 9,  displayTime: '07:00–09:00', chineseName: '辰時' },
  { branch: '巳', branchElement: '火', startHour: 9,  endHour: 11, displayTime: '09:00–11:00', chineseName: '巳時' },
  { branch: '午', branchElement: '火', startHour: 11, endHour: 13, displayTime: '11:00–13:00', chineseName: '午時' },
  { branch: '未', branchElement: '土', startHour: 13, endHour: 15, displayTime: '13:00–15:00', chineseName: '未時' },
  { branch: '申', branchElement: '金', startHour: 15, endHour: 17, displayTime: '15:00–17:00', chineseName: '申時' },
  { branch: '酉', branchElement: '金', startHour: 17, endHour: 19, displayTime: '17:00–19:00', chineseName: '酉時' },
  { branch: '戌', branchElement: '土', startHour: 19, endHour: 21, displayTime: '19:00–21:00', chineseName: '戌時' },
  { branch: '亥', branchElement: '水', startHour: 21, endHour: 23, displayTime: '21:00–23:00', chineseName: '亥時' },
];

// ─── 時干推算 ────────────────────────────────────────────────────────────────

/**
 * 根據日干推算時干
 * 五虎遁年起月法的時辰版本：
 * 甲己日起甲子時，乙庚日起丙子時，丙辛日起戊子時，丁壬日起庚子時，戊癸日起壬子時
 */
const HOUR_STEM_BASE: Record<string, number> = {
  '甲': 0, '己': 0,  // 甲子時起
  '乙': 2, '庚': 2,  // 丙子時起
  '丙': 4, '辛': 4,  // 戊子時起
  '丁': 6, '壬': 6,  // 庚子時起
  '戊': 8, '癸': 8,  // 壬子時起
};

export function getHourStem(dayStem: string, hourBranchIndex: number): string {
  const base = HOUR_STEM_BASE[dayStem] ?? 0;
  const stemIndex = (base + hourBranchIndex) % 10;
  return HEAVENLY_STEMS[stemIndex];
}

// ─── 時辰能量分析 ────────────────────────────────────────────────────────────

export interface HourEnergyInfo {
  branch: string;
  branchElement: string;
  stem: string;
  stemElement: string;
  chineseName: string;
  displayTime: string;
  startHour: number;
  endHour: number;
  energyLevel: EnergyLevel;
  energyScore: number;       // 能量分數 0-100（越高越吉）
  energyLabel: string;       // 能量標籤
  energyDescription: string; // 對蘇先生命格的影響說明
  auspicious: string[];      // 宜做之事
  inauspicious: string[];    // 忌做之事
  actionSuggestion: string;  // 具體行動建議（一句話）
  isCurrentHour: boolean;    // 是否為當前時辰
  isSpecialChou: boolean;    // 是否為丑時（特殊彩蛋）
  isBirthHour: boolean;      // 是否為出生時辰（巳時）
}

/**
 * 根據時辰五行計算對蘇先生的能量影響
 * 蘇先生：甲木日主，喜火土，忌水木，金複雜
 */
function calculateHourEnergy(
  stemElement: string,
  branchElement: string,
  branch: string,
  stem: string,
  dynamicProfile?: DynamicHourProfile
): {
  energyLevel: EnergyLevel;
  energyScore: number;
  energyLabel: string;
  energyDescription: string;
  auspicious: string[];
  inauspicious: string[];
  actionSuggestion: string;
} {
  const elements = [stemElement, branchElement];
  const fireCount = elements.filter(e => e === '火').length;
  const earthCount = elements.filter(e => e === '土').length;
  const waterCount = elements.filter(e => e === '水').length;
  const woodCount = elements.filter(e => e === '木').length;
  const metalCount = elements.filter(e => e === '金').length;

  // 使用動態命格分數（若有）或退回靜態 userProfile 常數
  const hourScores = dynamicProfile?.hourElementScores ?? HOUR_ELEMENT_SCORES;
  const specialBonus = dynamicProfile?.specialHourBonus ?? SPECIAL_HOUR_BONUS;
  let score = 50; // 基礎分
  score += fireCount  * (hourScores['火'] ?? 0);
  score += earthCount * (hourScores['土'] ?? 0);
  score += metalCount * (hourScores['金'] ?? 0);
  score += waterCount * (hourScores['水'] ?? 0);
  score += woodCount  * (hourScores['木'] ?? 0);
  score = Math.max(5, Math.min(100, score));

  // 特殊時辰加成
  if (specialBonus[branch]) {
    score = Math.min(100, score + specialBonus[branch]);
  }

  let energyLevel: EnergyLevel;
  let energyLabel: string;
  let energyDescription: string;
  const auspicious: string[] = [];
  const inauspicious: string[] = [];
  let actionSuggestion: string;

  if (score >= 80) {
    energyLevel = 'excellent';
    energyLabel = '大吉';
    energyDescription = `${stem}${branch}時，火土能量充盈，用神得力，此時辰天時大利，行動力與決斷力皆達頂峰。`;
    auspicious.push('重大決策', '商業談判', '創意表達', '社交拓展', '簽約執行');
    inauspicious.push('過度保守', '猶豫不決');
    actionSuggestion = '黃金時段！立即執行最重要的事，能量全力支持您。';
  } else if (score >= 65) {
    energyLevel = 'good';
    energyLabel = '吉';
    energyDescription = `${stem}${branch}時，能量平和偏吉，用神有力，適合穩步推進重要事項。`;
    auspicious.push('工作執行', '溝通協調', '規劃整理', '學習進修');
    inauspicious.push('激進冒險');
    actionSuggestion = '能量良好，適合推進工作計畫，保持穩定節奏。';
  } else if (score >= 45) {
    energyLevel = 'neutral';
    energyLabel = '平';
    energyDescription = `${stem}${branch}時，能量平穩中性，無特殊吉凶，宜量力而為。`;
    auspicious.push('日常事務', '例行工作', '輕度社交');
    inauspicious.push('重大決策', '冒險投資');
    actionSuggestion = '能量平穩，處理日常事務為宜，避免重大決策。';
  } else if (score >= 25) {
    energyLevel = 'challenging';
    energyLabel = '凶';
    energyDescription = `${stem}${branch}時，忌神能量偏旺，水木過盛，宜靜思內斂，避免輕舉妄動。`;
    auspicious.push('靜心冥想', '閱讀學習', '休養生息', '整理思緒');
    inauspicious.push('重大決策', '投資冒險', '爭訟是非', '輕信他人');
    actionSuggestion = '能量偏弱，宜靜不宜動，適合沉澱思考或休息。';
  } else {
    energyLevel = 'challenging';
    energyLabel = '大凶';
    energyDescription = `${stem}${branch}時，忌神當道，水木極旺，此時辰能量對您最為不利，務必低調行事。`;
    auspicious.push('靜坐冥想', '睡眠休息');
    inauspicious.push('一切重要決策', '投資', '爭訟', '社交應酬', '簽約');
    actionSuggestion = '能量最弱時段，請充分休息，蓄勢待發，等待吉時。';
  }

  // 特殊時辰補充說明
  if (branch === '巳') {
    energyDescription += ' 此為您出生時辰（己巳），天生與您的命格產生共鳴，靈感與創意特別旺盛。';
    auspicious.push('創意發想', '靈感捕捉');
    actionSuggestion = '您的出生時辰！靈感最旺，適合創作、表達與重要決策。';
  }
  if (branch === '丑') {
    energyDescription += ' 丑時為您命盤中最神聖的宮位（疾厄宮有紫微、破軍坐鎮），此時擲筊有特殊加持。';
    auspicious.push('擲筊問卜', '靈性修行');
  }

  return { energyLevel, energyScore: score, energyLabel, energyDescription, auspicious, inauspicious, actionSuggestion };
}

// ─── 主要 API ────────────────────────────────────────────────────────────────

/**
 * 「動態命格版」：獲取指定時辰的能量信息（支援任意命格）
 */
export function getHourEnergyDynamic(
  dayStem: string,
  hourIndex: number,
  dynamicProfile?: DynamicHourProfile,
  currentHour?: number
): HourEnergyInfo {
  const hourBranch = HOUR_BRANCHES[hourIndex];
  const stem = getHourStem(dayStem, hourIndex);
  const stemElement = STEM_ELEMENT[stem] ?? '未知';

  const energyData = calculateHourEnergy(stemElement, hourBranch.branchElement, hourBranch.branch, stem, dynamicProfile);

  const now = currentHour ?? getTaiwanHour();
  let isCurrentHour = false;
  if (hourBranch.startHour === 23) {
    isCurrentHour = now === 23 || now === 0;
  } else {
    isCurrentHour = now >= hourBranch.startHour && now < hourBranch.endHour;
  }

  return {
    branch: hourBranch.branch,
    branchElement: hourBranch.branchElement,
    stem,
    stemElement,
    chineseName: hourBranch.chineseName,
    displayTime: hourBranch.displayTime,
    startHour: hourBranch.startHour,
    endHour: hourBranch.endHour,
    isCurrentHour,
    isSpecialChou: hourBranch.branch === '丑',
    isBirthHour: hourBranch.branch === '巳',
    ...energyData,
  };
}

/**
 * 「動態命格版」：獲取全天12時辰能量預覽（支援任意命格）
 */
export function getAllHourEnergiesDynamic(
  dayStem: string,
  dynamicProfile?: DynamicHourProfile,
  currentHour?: number
): HourEnergyInfo[] {
  return HOUR_BRANCHES.map((_, index) => getHourEnergyDynamic(dayStem, index, dynamicProfile, currentHour));
}

/**
 * 「動態命格版」：獲取當前時辰能量（支援任意命格）
 */
export function getCurrentHourEnergyDynamic(dayStem: string, dynamicProfile?: DynamicHourProfile): HourEnergyInfo {
  const hour = getTaiwanHour();
  let hourIndex: number;
  if (hour === 23 || hour === 0) {
    hourIndex = 0;
  } else {
    hourIndex = Math.floor((hour + 1) / 2);
  }
  hourIndex = Math.min(11, Math.max(0, hourIndex));
  return getHourEnergyDynamic(dayStem, hourIndex, dynamicProfile, hour);
}

/**
 * 獲取指定時辰的能量信息
 */
export function getHourEnergy(dayStem: string, hourIndex: number, currentHour?: number): HourEnergyInfo {
  const hourBranch = HOUR_BRANCHES[hourIndex];
  const stem = getHourStem(dayStem, hourIndex);
  const stemElement = STEM_ELEMENT[stem] ?? '未知';

  const energyData = calculateHourEnergy(stemElement, hourBranch.branchElement, hourBranch.branch, stem, undefined);

  // 判斷是否為當前時辰（使用台灣時間 UTC+8）
  const now = currentHour ?? getTaiwanHour();
  let isCurrentHour = false;
  if (hourBranch.startHour === 23) {
    isCurrentHour = now === 23 || now === 0;
  } else {
    isCurrentHour = now >= hourBranch.startHour && now < hourBranch.endHour;
  }

  return {
    branch: hourBranch.branch,
    branchElement: hourBranch.branchElement,
    stem,
    stemElement,
    chineseName: hourBranch.chineseName,
    displayTime: hourBranch.displayTime,
    startHour: hourBranch.startHour,
    endHour: hourBranch.endHour,
    isCurrentHour,
    isSpecialChou: hourBranch.branch === '丑',
    isBirthHour: hourBranch.branch === '巳',
    ...energyData,
  };
}

/**
 * 獲取全天12時辰能量預覽
 */
export function getAllHourEnergies(dayStem: string, currentHour?: number): HourEnergyInfo[] {
  return HOUR_BRANCHES.map((_, index) => getHourEnergy(dayStem, index, currentHour));
}

/**
 * 獲取當前時辰能量
 */
export function getCurrentHourEnergy(dayStem: string): HourEnergyInfo {
  // 使用台灣時間 UTC+8
  const hour = getTaiwanHour();

  let hourIndex: number;
  if (hour === 23 || hour === 0) {
    hourIndex = 0; // 子時
  } else {
    hourIndex = Math.floor((hour + 1) / 2);
  }
  hourIndex = Math.min(11, Math.max(0, hourIndex));

  return getHourEnergy(dayStem, hourIndex, hour);
}

/**
 * 找出今日最佳時辰（前三名）
 */
export function getBestHours(dayStem: string): HourEnergyInfo[] {
  const all = getAllHourEnergies(dayStem);
  return [...all].sort((a, b) => b.energyScore - a.energyScore).slice(0, 3);
}

/**
 * 找出今日最差時辰（需迴避的時段）
 */
export function getWorstHours(dayStem: string): HourEnergyInfo[] {
  const all = getAllHourEnergies(dayStem);
  return [...all].sort((a, b) => a.energyScore - b.energyScore).slice(0, 2);
}

/**
 * 根據問題類型推薦最佳擲筊時辰
 */
export function recommendCastHour(dayStem: string, queryType: string): HourEnergyInfo {
  const all = getAllHourEnergies(dayStem);

  // 根據問題類型過濾最適合的時辰
  let filtered = all;
  if (queryType === 'fire_earth') {
    // 事業/財富問題：優先選火土時辰
    filtered = all.filter(h => h.stemElement === '火' || h.branchElement === '火' ||
                                h.stemElement === '土' || h.branchElement === '土');
  } else if (queryType === 'water_wood') {
    // 學習/健康問題：選能量平穩的時辰
    filtered = all.filter(h => h.energyLevel === 'neutral' || h.energyLevel === 'good');
  } else if (queryType === 'metal') {
    // 人際/感情問題：選金時辰
    filtered = all.filter(h => h.stemElement === '金' || h.branchElement === '金');
  }

  if (filtered.length === 0) filtered = all;
  return filtered.sort((a, b) => b.energyScore - a.energyScore)[0];
}
