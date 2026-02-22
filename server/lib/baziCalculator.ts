/**
 * baziCalculator.ts
 * 八字推算引擎：根據出生年月日時辰，推算四柱八字、五行比例、日主、喜忌神
 * 適用於非主帳號的一般用戶
 */

import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  getYearPillar,
  getMonthPillar,
  getDayPillar,
} from "./lunarCalendar";

// 地支藏干（主氣）
const BRANCH_HIDDEN_STEM: Record<string, string[]> = {
  '子': ['壬', '癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['甲', '乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丙', '丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['庚', '辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// 時辰地支對應（以出生時辰字串 "子"/"丑"/... 或小時數推算）
const HOUR_BRANCH_MAP: Record<string, string> = {
  '子': '子', '丑': '丑', '寅': '寅', '卯': '卯',
  '辰': '辰', '巳': '巳', '午': '午', '未': '未',
  '申': '申', '酉': '酉', '戌': '戌', '亥': '亥',
};

// 時辰天干由日干推算（五鼠遁）
const DAY_STEM_TO_HOUR_BASE: Record<string, number> = {
  '甲': 0, '己': 0,  // 甲己日 → 子時起甲
  '乙': 2, '庚': 2,  // 乙庚日 → 子時起丙
  '丙': 4, '辛': 4,  // 丙辛日 → 子時起戊
  '丁': 6, '壬': 6,  // 丁壬日 → 子時起庚
  '戊': 8, '癸': 8,  // 戊癸日 → 子時起壬
};

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/**
 * 根據日干和時支推算時柱天干
 */
function getHourStem(dayStem: string, hourBranch: string): string {
  const base = DAY_STEM_TO_HOUR_BASE[dayStem] ?? 0;
  const branchIndex = BRANCH_ORDER.indexOf(hourBranch);
  const stemIndex = (base + branchIndex) % 10;
  return HEAVENLY_STEMS[stemIndex];
}

/**
 * 將出生時間字串（HH:MM）轉換為時辰地支
 */
export function birthTimeToHourBranch(birthTime: string): string {
  const [hourStr] = birthTime.split(':');
  const hour = parseInt(hourStr, 10);
  if (hour === 23 || hour === 0) return '子';
  if (hour === 1 || hour === 2) return '丑';
  if (hour === 3 || hour === 4) return '寅';
  if (hour === 5 || hour === 6) return '卯';
  if (hour === 7 || hour === 8) return '辰';
  if (hour === 9 || hour === 10) return '巳';
  if (hour === 11 || hour === 12) return '午';
  if (hour === 13 || hour === 14) return '未';
  if (hour === 15 || hour === 16) return '申';
  if (hour === 17 || hour === 18) return '酉';
  if (hour === 19 || hour === 20) return '戌';
  if (hour === 21 || hour === 22) return '亥';
  return '子';
}

export interface BaziResult {
  // 四柱
  yearPillar: string;   // e.g. "甲子"
  monthPillar: string;  // e.g. "乙亥"
  dayPillar: string;    // e.g. "甲子"
  hourPillar: string;   // e.g. "己巳"
  // 日主
  dayMasterStem: string;    // e.g. "甲"
  dayMasterElement: string; // e.g. "wood"
  // 五行比例（0-100 整數）
  elementRatio: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  // 喜忌神（英文 element key）
  favorableElements: string;   // e.g. "fire,earth"
  unfavorableElements: string; // e.g. "water,wood"
  // 命格描述
  destinyDescription: string;
}

const ELEMENT_EN: Record<string, string> = {
  '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
};

const ELEMENT_ZH: Record<string, string> = {
  'wood': '木', 'fire': '火', 'earth': '土', 'metal': '金', 'water': '水',
};

/**
 * 計算八字五行比例
 * 計算方式：天干（主氣）× 1.5 + 地支藏干主氣 × 1.0 + 地支藏干副氣 × 0.5
 */
function calculateElementRatio(pillars: Array<{ stem: string; branch: string }>): Record<string, number> {
  const counts: Record<string, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

  for (const { stem, branch } of pillars) {
    // 天干主氣（權重 1.5）
    const stemEl = ELEMENT_EN[STEM_ELEMENT[stem]];
    if (stemEl) counts[stemEl] += 1.5;

    // 地支藏干（主氣 × 1.0，副氣 × 0.5）
    const hidden = BRANCH_HIDDEN_STEM[branch] ?? [];
    hidden.forEach((hs, idx) => {
      const el = ELEMENT_EN[STEM_ELEMENT[hs]];
      if (el) counts[el] += idx === 0 ? 1.0 : 0.5;
    });
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };

  return {
    wood: Math.round((counts.wood / total) * 100),
    fire: Math.round((counts.fire / total) * 100),
    earth: Math.round((counts.earth / total) * 100),
    metal: Math.round((counts.metal / total) * 100),
    water: Math.round((counts.water / total) * 100),
  };
}

/**
 * 根據日主和五行比例推算喜忌神
 * 簡化版：身強用洩（食傷財），身弱用生扶（印比）
 */
function inferFavorableElements(
  dayMasterElement: string,
  ratio: Record<string, number>
): { favorable: string[]; unfavorable: string[] } {
  // 五行相生：木→火→土→金→水→木
  const GENERATES: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };
  // 五行相剋：木→土→水→火→金→木
  const CONTROLS: Record<string, string> = {
    wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
  };

  const dm = dayMasterElement; // 日主五行
  const dmRatio = ratio[dm] ?? 0;
  const totalStrength = dmRatio + (ratio[CONTROLS[CONTROLS[dm]] ?? ''] ?? 0); // 日主 + 印星

  // 判斷身強/身弱（日主+印星 > 50% 為身強）
  const isStrong = totalStrength > 45;

  let favorable: string[] = [];
  let unfavorable: string[] = [];

  if (isStrong) {
    // 身強：喜食傷（洩）、財（剋）；忌印（生）、比劫（同）
    const foodGod = GENERATES[dm]; // 食傷（日主所生）
    const wealth = CONTROLS[dm];   // 財星（日主所剋）
    favorable = [foodGod, wealth];
    unfavorable = [dm, CONTROLS[CONTROLS[dm] ?? ''] ?? '']; // 比劫、印星
  } else {
    // 身弱：喜印（生）、比劫（同）；忌食傷（洩）、財（剋）、官殺（剋我）
    const print = CONTROLS[CONTROLS[dm] ?? ''] ?? ''; // 印星（生日主）
    favorable = [dm, print]; // 比劫、印星
    const foodGod = GENERATES[dm];
    const wealth = CONTROLS[dm];
    const officer = CONTROLS[CONTROLS[CONTROLS[dm] ?? ''] ?? ''] ?? ''; // 官殺（剋日主）
    unfavorable = [foodGod, wealth];
    if (officer && !favorable.includes(officer)) unfavorable.push(officer);
  }

  // 過旺的五行也列為忌神
  const allElements = ['wood', 'fire', 'earth', 'metal', 'water'];
  allElements.forEach(el => {
    if ((ratio[el] ?? 0) > 40 && !unfavorable.includes(el)) {
      unfavorable.push(el);
    }
  });

  // 去重並過濾空字串
  const favSet = new Set(favorable.filter(Boolean));
  favorable = Array.from(favSet);
  const unfavSet = new Set(unfavorable.filter(Boolean).filter(el => !favorable.includes(el)));
  unfavorable = Array.from(unfavSet);

  return { favorable, unfavorable };
}

/**
 * 主函式：根據出生日期和時辰推算完整八字命格
 */
export function calculateBazi(
  birthDate: string,   // "YYYY-MM-DD"
  birthTime: string,   // "HH:MM"
): BaziResult {
  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // 建立出生日期的 Date 物件（UTC 避免時區問題）
  const birthDateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // 計算年柱、月柱、日柱
  const yp = getYearPillar(year);
  const mp = getMonthPillar(birthDateObj);
  const dp = getDayPillar(birthDateObj);

  // 計算時柱
  const hourBranch = birthTimeToHourBranch(birthTime);
  const hourStem = getHourStem(dp.stem, hourBranch);

  const yearPillarStr = `${yp.stem}${yp.branch}`;
  const monthPillarStr = `${mp.stem}${mp.branch}`;
  const dayPillarStr = `${dp.stem}${dp.branch}`;
  const hourPillarStr = `${hourStem}${hourBranch}`;

  // 日主
  const dayMasterStem = dp.stem;
  const dayMasterElementZh = STEM_ELEMENT[dayMasterStem] ?? '木';
  const dayMasterElement = ELEMENT_EN[dayMasterElementZh] ?? 'wood';

  // 計算五行比例
  const pillars = [
    { stem: yp.stem, branch: yp.branch },
    { stem: mp.stem, branch: mp.branch },
    { stem: dp.stem, branch: dp.branch },
    { stem: hourStem, branch: hourBranch },
  ];
  const rawRatio = calculateElementRatio(pillars);
  const elementRatio: { wood: number; fire: number; earth: number; metal: number; water: number } = {
    wood: rawRatio.wood ?? 0,
    fire: rawRatio.fire ?? 0,
    earth: rawRatio.earth ?? 0,
    metal: rawRatio.metal ?? 0,
    water: rawRatio.water ?? 0,
  };

  // 推算喜忌神
  const { favorable, unfavorable } = inferFavorableElements(dayMasterElement, rawRatio);

  // 生成命格描述
  const dmZh = ELEMENT_ZH[dayMasterElement] ?? '木';
  const favorableZh = favorable.map(el => ELEMENT_ZH[el] ?? el).join('、');
  const unfavorableZh = unfavorable.map(el => ELEMENT_ZH[el] ?? el).join('、');
  const destinyDescription = `日主${dayMasterStem}（${dmZh}），喜${favorableZh}，忌${unfavorableZh}。`;

  return {
    yearPillar: yearPillarStr,
    monthPillar: monthPillarStr,
    dayPillar: dayPillarStr,
    hourPillar: hourPillarStr,
    dayMasterStem,
    dayMasterElement,
    elementRatio,
    favorableElements: favorable.join(','),
    unfavorableElements: unfavorable.join(','),
    destinyDescription,
  };
}
