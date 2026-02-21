/**
 * 農曆天干地支轉換算法
 * 用於「天命共振」擲筊系統 - 蘇祐震先生專屬
 */

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行對應
export const STEM_ELEMENT: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

export const BRANCH_ELEMENT: Record<string, string> = {
  '子': '水', '丑': '土',
  '寅': '木', '卯': '木',
  '辰': '土', '巳': '火',
  '午': '火', '未': '土',
  '申': '金', '酉': '金',
  '戌': '土', '亥': '水',
};

// 蘇先生命格：喜火、土；忌水、木；金複雜
export type EnergyLevel = 'excellent' | 'good' | 'neutral' | 'challenging' | 'complex';

export interface DayPillar {
  stem: string;       // 天干
  branch: string;     // 地支
  stemElement: string;
  branchElement: string;
  energyLevel: EnergyLevel;
  energyDescription: string;
  auspicious: string[];
  inauspicious: string[];
}

export interface HourInfo {
  branch: string;
  isChougHour: boolean; // 丑時 (01:00-03:00)
}

/**
 * 根據西元年計算天干地支（年柱）
 * 甲子年 = 1984, 以此類推，60年一輪
 */
export function getYearPillar(year: number): { stem: string; branch: string } {
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return {
    stem: HEAVENLY_STEMS[((stemIndex % 10) + 10) % 10],
    branch: EARTHLY_BRANCHES[((branchIndex % 12) + 12) % 12],
  };
}

/**
 * 根據日期計算日柱天干地支
 * 使用儒略日數計算，基準日：2000年1月7日 = 甲子日
 */
export function getDayPillar(date: Date): DayPillar {
  // 計算儒略日
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // 基準日：2000-01-07 = 甲子日 (JD = 2451551)
  const jd = julianDay(y, m, d);
  const basejd = julianDay(2000, 1, 7); // 甲子日基準

  const diff = jd - basejd;
  const stemIndex = ((diff % 10) + 10) % 10;
  const branchIndex = ((diff % 12) + 12) % 12;

  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];
  const stemElement = STEM_ELEMENT[stem];
  const branchElement = BRANCH_ELEMENT[branch];

  const energyInfo = calculateEnergyLevel(stemElement, branchElement, branch);

  return {
    stem,
    branch,
    stemElement,
    branchElement,
    ...energyInfo,
  };
}

/**
 * 計算儒略日數
 */
function julianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 根據五行計算對蘇先生的能量等級
 * 喜：火、土 → excellent/good
 * 忌：水、木 → challenging
 * 金：複雜 → complex/neutral
 */
function calculateEnergyLevel(
  stemElement: string,
  branchElement: string,
  branch: string
): {
  energyLevel: EnergyLevel;
  energyDescription: string;
  auspicious: string[];
  inauspicious: string[];
} {
  const elements = [stemElement, branchElement];
  const fireCount = elements.filter(e => e === '火').length;
  const earthCount = elements.filter(e => e === '土').length;
  const waterCount = elements.filter(e => e === '水').length;
  const woodCount = elements.filter(e => e === '木').length;
  const metalCount = elements.filter(e => e === '金').length;

  const auspiciousScore = fireCount * 2 + earthCount * 1.5;
  const challengingScore = waterCount * 2 + woodCount * 1.5;
  const metalScore = metalCount;

  let energyLevel: EnergyLevel;
  let energyDescription: string;
  const auspicious: string[] = [];
  const inauspicious: string[] = [];

  if (auspiciousScore >= 3) {
    energyLevel = 'excellent';
    energyDescription = '今日火土能量旺盛，用神得力，天時大利，諸事皆宜進取。';
    auspicious.push('行動', '決策', '創業', '表達', '社交');
  } else if (auspiciousScore >= 1.5) {
    energyLevel = 'good';
    energyDescription = '今日能量平和偏吉，用神有力，適合穩步推進重要事項。';
    auspicious.push('規劃', '溝通', '執行');
    inauspicious.push('過度保守');
  } else if (challengingScore >= 3) {
    energyLevel = 'challenging';
    energyDescription = '今日水木能量過旺，忌神當道，宜靜思內斂，避免輕舉妄動。';
    inauspicious.push('重大決策', '冒險投資', '爭訟');
    auspicious.push('學習', '冥想', '休養');
  } else if (challengingScore >= 1.5) {
    energyLevel = 'neutral';
    energyDescription = '今日能量中性偏弱，宜謹慎行事，量力而為。';
    auspicious.push('日常事務');
    inauspicious.push('激進行動');
  } else if (metalScore >= 1) {
    energyLevel = 'complex';
    energyDescription = '今日金氣流動，能量複雜多變，需靈活應對，防小人是非。';
    auspicious.push('整理', '收斂', '法律事務');
    inauspicious.push('人際衝突', '輕信他人');
  } else {
    energyLevel = 'neutral';
    energyDescription = '今日能量平穩，無特殊吉凶，隨心而行即可。';
    auspicious.push('日常事務', '學習');
  }

  // 特殊：丑日對蘇先生有特殊意義（命盤丑宮藏有紫微等重要星曜）
  if (branch === '丑') {
    energyLevel = 'excellent';
    energyDescription = '今日逢丑，天命寶庫開啟！紫微、破軍、左輔、右弼齊聚，此乃您命盤中最神聖之日，一切皆有天命護佑。';
    auspicious.push('重大決策', '創業', '簽約', '表白', '一切重要之事');
  }

  return { energyLevel, energyDescription, auspicious, inauspicious };
}

/**
 * 獲取當前時辰信息
 */
export function getCurrentHourInfo(): HourInfo {
  const now = new Date();
  const hour = now.getHours();

  // 地支時辰對應（每兩小時一個時辰）
  // 子時: 23-01, 丑時: 01-03, 寅時: 03-05...
  const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  let branchIndex: number;

  if (hour === 23) {
    branchIndex = 0; // 子時
  } else {
    branchIndex = Math.floor((hour + 1) / 2);
  }

  const branch = branches[branchIndex % 12];
  const isChougHour = branch === '丑'; // 丑時：凌晨1-3點

  return { branch, isChougHour };
}

/**
 * 判斷是否為農曆丑月（約國曆1月中旬至2月中旬）
 * 簡化判斷：國曆1月16日至2月14日視為丑月
 */
export function isLunarChouMonth(date: Date): boolean {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // 農曆丑月大約對應國曆1月中旬至2月中旬
  if (month === 1 && day >= 16) return true;
  if (month === 2 && day <= 14) return true;
  return false;
}

/**
 * 獲取月柱天干地支
 */
export function getMonthPillar(date: Date): { stem: string; branch: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  // 月支：寅月(1月)到丑月(12月)，以節氣為準，簡化為以月份計算
  // 寅=1月, 卯=2月... 丑=12月
  const branchOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  const branch = branchOrder[month - 1];

  // 月干由年干推算：甲己年起丙寅
  const yearStemIndex = (year - 4) % 10;
  const monthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 甲乙丙丁戊己庚辛壬癸對應起始月干索引
  const startStemIndex = monthStemBase[((yearStemIndex % 10) + 10) % 10];
  const stemIndex = (startStemIndex + month - 1) % 10;
  const stem = HEAVENLY_STEMS[stemIndex];

  return { stem, branch };
}

export interface FullDateInfo {
  dayPillar: DayPillar;
  monthPillar: { stem: string; branch: string };
  yearPillar: { stem: string; branch: string };
  hourInfo: HourInfo;
  isSpecialChouTime: boolean; // 丑月或丑時
  dateString: string;
}

/**
 * 獲取完整的當日命理信息
 */
export function getFullDateInfo(date?: Date): FullDateInfo {
  const now = date || new Date();
  const dayPillar = getDayPillar(now);
  const monthPillar = getMonthPillar(now);
  const yearPillar = getYearPillar(now.getFullYear());
  const hourInfo = getCurrentHourInfo();
  const isSpecialChouTime = isLunarChouMonth(now) || hourInfo.isChougHour;

  const dateString = `${yearPillar.stem}${yearPillar.branch}年 ${monthPillar.stem}${monthPillar.branch}月 ${dayPillar.stem}${dayPillar.branch}日`;

  return {
    dayPillar,
    monthPillar,
    yearPillar,
    hourInfo,
    isSpecialChouTime,
    dateString,
  };
}
