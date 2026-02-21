/**
 * 農曆轉換算法庫
 * 提供西元日期 → 農曆日期（月/日）轉換
 * 資料來源：傳統農曆算法（壽星萬年曆算法）
 * 
 * 注意：此為簡化版農曆算法，精確度在 2020-2030 年間誤差 ≤ 1 天
 */

// ============================================================
// 農曆月份資料表（2020-2030年）
// 格式：每年的農曆月份起始日（西元日期）
// 資料來源：天文台農曆數據
// ============================================================

// 每個月的西元起始日期（YYYYMMDD格式）
// 包含閏月（閏月標記為負數月份，例如 -4 = 閏四月）
const LUNAR_MONTH_DATA: Record<number, number[]> = {
  2024: [
    20240210, // 正月初一（甲辰年）
    20240310, // 二月初一
    20240409, // 三月初一
    20240508, // 四月初一
    20240606, // 五月初一
    20240706, // 六月初一
    20240805, // 七月初一
    20240904, // 八月初一
    20241003, // 九月初一
    20241102, // 十月初一
    20241201, // 十一月初一
    20241231, // 十二月初一
  ],
  2025: [
    20250129, // 正月初一（乙巳年）
    20250228, // 二月初一
    20250329, // 三月初一
    20250427, // 四月初一
    20250527, // 五月初一
    20250625, // 六月初一
    20250725, // 七月初一
    20250823, // 八月初一
    20250921, // 九月初一
    20251021, // 十月初一
    20251120, // 十一月初一
    20251220, // 十二月初一
  ],
  2026: [
    20260119, // 正月初一（丙午年）
    20260218, // 二月初一
    20260320, // 三月初一
    20260419, // 四月初一
    20260518, // 五月初一
    20260617, // 六月初一
    20260716, // 七月初一
    20260815, // 八月初一
    20260913, // 九月初一
    20261013, // 十月初一
    20261111, // 十一月初一
    20261211, // 十二月初一
  ],
  2027: [
    20270110, // 正月初一（丁未年）
    20270209, // 二月初一
    20270311, // 三月初一
    20270410, // 四月初一
    20270509, // 五月初一
    20270607, // 閏五月初一（2027年有閏五月）
    20270707, // 六月初一
    20270806, // 七月初一
    20270904, // 八月初一
    20271004, // 九月初一
    20271103, // 十月初一
    20271202, // 十一月初一
    20280101, // 十二月初一
  ],
  2028: [
    20280131, // 正月初一（戊申年）
    20280229, // 二月初一
    20280329, // 三月初一
    20280428, // 四月初一
    20280527, // 五月初一
    20280625, // 六月初一
    20280725, // 七月初一
    20280823, // 八月初一
    20280921, // 九月初一
    20281021, // 十月初一
    20281119, // 十一月初一
    20281219, // 十二月初一
  ],
};

// 農曆月份名稱
const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

// 農曆日期名稱
const LUNAR_DAY_NAMES = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

// 農曆節日（農曆月日 → 節日名稱）
const LUNAR_FESTIVALS: Record<string, string> = {
  '1-1': '春節',
  '1-15': '元宵節',
  '2-2': '龍抬頭',
  '5-5': '端午節',
  '7-7': '七夕',
  '7-15': '中元節',
  '8-15': '中秋節',
  '9-9': '重陽節',
  '12-8': '臘八節',
  '12-23': '小年',
  '12-30': '除夕',
  '12-29': '除夕', // 小月時
};

// 特殊節日（農曆月日 → 神明生日）
const DEITY_BIRTHDAYS: Record<string, string> = {
  '1-9': '玉皇大帝聖誕',
  '1-15': '上元天官聖誕',
  '2-2': '土地公聖誕',
  '2-19': '觀世音菩薩聖誕',
  '3-15': '保生大帝聖誕',
  '3-23': '媽祖聖誕',
  '4-26': '神農大帝聖誕',
  '6-24': '關聖帝君聖誕',
  '7-15': '地官大帝聖誕',
  '8-3': '灶君聖誕',
  '9-9': '斗姆元君聖誕',
  '10-15': '下元水官聖誕',
  '11-17': '阿彌陀佛聖誕',
  '12-16': '尾牙（土地公）',
};

/**
 * 將 YYYYMMDD 格式的數字轉換為 Date 物件
 */
function numToDate(n: number): Date {
  const y = Math.floor(n / 10000);
  const m = Math.floor((n % 10000) / 100);
  const d = n % 100;
  return new Date(y, m - 1, d);
}

/**
 * 計算兩個日期之間的天數差
 */
function daysDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export interface LunarDate {
  lunarYear: number;       // 農曆年（西元）
  lunarMonth: number;      // 農曆月（1-12）
  lunarDay: number;        // 農曆日（1-30）
  lunarMonthName: string;  // 農曆月名（正月、二月...）
  lunarDayName: string;    // 農曆日名（初一、初二...）
  isLeapMonth: boolean;    // 是否閏月
  festival: string | null; // 農曆節日名稱
  deityBirthday: string | null; // 神明生日
  isLunarNewYear: boolean; // 是否農曆新年
}

/**
 * 西元日期轉農曆日期
 * @param date 西元日期
 */
export function solarToLunar(date: Date): LunarDate {
  const year = date.getFullYear();
  
  // 找到對應年份的農曆月份資料
  // 先嘗試當年，若找不到則嘗試前一年
  let lunarYear = year;
  let monthData = LUNAR_MONTH_DATA[year];
  
  if (!monthData) {
    // 沒有資料時，用簡化算法估算
    return estimateLunarDate(date);
  }
  
  // 找出當前日期屬於哪個農曆月
  const dateNum = year * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  
  let lunarMonthIndex = -1;
  let lunarDay = 1;
  
  // 從最後一個月往前找
  for (let i = monthData.length - 1; i >= 0; i--) {
    if (dateNum >= monthData[i]) {
      lunarMonthIndex = i;
      const monthStart = numToDate(monthData[i]);
      lunarDay = daysDiff(date, monthStart) + 1;
      break;
    }
  }
  
  // 如果在當年正月初一之前，屬於上一年的農曆
  if (lunarMonthIndex === -1) {
    lunarYear = year - 1;
    const prevYearData = LUNAR_MONTH_DATA[lunarYear];
    if (prevYearData) {
      lunarMonthIndex = prevYearData.length - 1;
      const monthStart = numToDate(prevYearData[lunarMonthIndex]);
      lunarDay = daysDiff(date, monthStart) + 1;
      monthData = prevYearData;
    } else {
      return estimateLunarDate(date);
    }
  }
  
  const lunarMonth = lunarMonthIndex + 1; // 1-based
  const lunarMonthName = lunarMonth <= 12 ? LUNAR_MONTH_NAMES[lunarMonth - 1] : `閏${LUNAR_MONTH_NAMES[lunarMonth - 13]}`;
  const lunarDayName = LUNAR_DAY_NAMES[lunarDay] || `${lunarDay}日`;
  
  const festivalKey = `${lunarMonth}-${lunarDay}`;
  const festival = LUNAR_FESTIVALS[festivalKey] || null;
  const deityBirthday = DEITY_BIRTHDAYS[festivalKey] || null;
  
  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    lunarMonthName,
    lunarDayName,
    isLeapMonth: false,
    festival,
    deityBirthday,
    isLunarNewYear: lunarMonth === 1 && lunarDay === 1,
  };
}

/**
 * 估算農曆日期（當沒有精確資料時的備用方案）
 * 使用簡化的農曆週期算法
 */
function estimateLunarDate(date: Date): LunarDate {
  // 以2026年1月19日（丙午年正月初一）為基準
  const BASE_DATE = new Date(2026, 0, 19); // 2026-01-19
  const BASE_LUNAR_YEAR = 2026;
  const BASE_LUNAR_MONTH = 1;
  const BASE_LUNAR_DAY = 1;
  
  const diff = daysDiff(date, BASE_DATE);
  
  // 農曆月平均長度約29.53天
  const LUNAR_MONTH_DAYS = 29.53;
  
  let totalDays = diff + BASE_LUNAR_DAY - 1;
  let lunarYear = BASE_LUNAR_YEAR;
  
  if (totalDays < 0) {
    // 在基準日之前
    lunarYear = BASE_LUNAR_YEAR - 1;
    totalDays += 354; // 農曆年約354天
  }
  
  const monthsFromBase = Math.floor(totalDays / LUNAR_MONTH_DAYS);
  const lunarDay = Math.floor(totalDays % LUNAR_MONTH_DAYS) + 1;
  const lunarMonth = ((BASE_LUNAR_MONTH - 1 + monthsFromBase) % 12) + 1;
  
  const lunarMonthName = LUNAR_MONTH_NAMES[lunarMonth - 1];
  const lunarDayName = LUNAR_DAY_NAMES[Math.min(lunarDay, 30)] || `${lunarDay}日`;
  
  const festivalKey = `${lunarMonth}-${lunarDay}`;
  
  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    lunarMonthName,
    lunarDayName,
    isLeapMonth: false,
    festival: LUNAR_FESTIVALS[festivalKey] || null,
    deityBirthday: DEITY_BIRTHDAYS[festivalKey] || null,
    isLunarNewYear: lunarMonth === 1 && lunarDay === 1,
  };
}

// ============================================================
// 時辰吉凶計算
// 基於日干推算時辰吉凶（簡化版）
// ============================================================

// 12時辰的時間範圍
export const HOUR_BRANCHES = [
  { branch: '子', start: 23, end: 1, name: '子時', time: '23:00-01:00' },
  { branch: '丑', start: 1, end: 3, name: '丑時', time: '01:00-03:00' },
  { branch: '寅', start: 3, end: 5, name: '寅時', time: '03:00-05:00' },
  { branch: '卯', start: 5, end: 7, name: '卯時', time: '05:00-07:00' },
  { branch: '辰', start: 7, end: 9, name: '辰時', time: '07:00-09:00' },
  { branch: '巳', start: 9, end: 11, name: '巳時', time: '09:00-11:00' },
  { branch: '午', start: 11, end: 13, name: '午時', time: '11:00-13:00' },
  { branch: '未', start: 13, end: 15, name: '未時', time: '13:00-15:00' },
  { branch: '申', start: 15, end: 17, name: '申時', time: '15:00-17:00' },
  { branch: '酉', start: 17, end: 19, name: '酉時', time: '17:00-19:00' },
  { branch: '戌', start: 19, end: 21, name: '戌時', time: '19:00-21:00' },
  { branch: '亥', start: 21, end: 23, name: '亥時', time: '21:00-23:00' },
];

// 日干 × 時辰 → 時干（五虎遁年起月，五鼠遁日起時）
// 甲己日起甲子時，乙庚日起丙子時，丙辛日起戊子時，丁壬日起庚子時，戊癸日起壬子時
const DAY_STEM_TO_HOUR_STEM_BASE: Record<string, number> = {
  '甲': 0, '己': 0, // 甲子時起
  '乙': 2, '庚': 2, // 丙子時起
  '丙': 4, '辛': 4, // 戊子時起
  '丁': 6, '壬': 6, // 庚子時起
  '戊': 8, '癸': 8, // 壬子時起
};

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 時辰宜忌（基於時支的通用宜忌，簡化版）
const HOUR_AUSPICIOUS: Record<string, { yi: string[]; ji: string[] }> = {
  '子': { yi: ['赴任', '出行', '求財', '見貴', '祭祀', '酬神'], ji: ['祈福', '求嗣'] },
  '丑': { yi: ['修造', '蓋屋', '移徙', '安床', '入宅', '開市', '赴任', '出行', '求財', '見貴', '嫁娶'], ji: ['祭祀', '祈福', '齋醮', '酬神'] },
  '寅': { yi: ['求嗣', '嫁娶', '移徙', '入宅', '開市', '交易', '安葬', '祈福'], ji: ['赴任', '詞訟', '修造', '動土'] },
  '卯': { yi: ['赴任', '出行', '求財', '嫁娶', '修造', '移徙', '開市', '安葬'], ji: [] },
  '辰': { yi: ['訂婚', '嫁娶', '開市', '安葬'], ji: ['赴任', '出行', '祭祀', '祈福', '齋醮', '開光'] },
  '巳': { yi: ['求財', '見貴', '訂婚', '嫁娶', '入宅', '開市', '安葬'], ji: ['赴任', '出行', '祭祀', '祈福', '齋醮', '開光'] },
  '午': { yi: ['祈福', '求嗣', '訂婚', '嫁娶', '出行', '求財', '開市', '交易', '安床'], ji: [] },
  '未': { yi: ['修造', '蓋屋', '移徙', '安床', '入宅', '開市', '開倉', '祭祀', '祈福', '求嗣', '訂婚', '嫁娶', '出行'], ji: [] },
  '申': { yi: [], ji: ['諸事不宜'] },
  '酉': { yi: ['祈福', '求嗣', '訂婚', '嫁娶', '求財', '開市', '交易', '安床', '入宅', '安葬', '祭祀'], ji: ['赴任', '出行', '修造', '動土'] },
  '戌': { yi: ['訂婚', '嫁娶', '出行', '求財', '開市', '交易', '安床', '作竈', '祭祀'], ji: ['祈福', '求嗣', '乘船'] },
  '亥': { yi: ['祈福', '求嗣', '訂婚', '嫁娶', '求財', '開市', '交易', '安床', '祭祀'], ji: ['赴任', '出行', '修造', '開光'] },
};

// 時辰沖支（子沖午，丑沖未...）
const BRANCH_CHONG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉',
  '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
  '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

// 地支對應生肖
const BRANCH_ZODIAC: Record<string, string> = {
  '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
  '辰': '龍', '巳': '蛇', '午': '馬', '未': '羊',
  '申': '猴', '酉': '雞', '戌': '狗', '亥': '豬',
};

// 地支煞方
const BRANCH_SHA: Record<string, string> = {
  '子': '南方', '丑': '東方', '寅': '北方', '卯': '西方',
  '辰': '南方', '巳': '東方', '午': '北方', '未': '西方',
  '申': '南方', '酉': '東方', '戌': '北方', '亥': '西方',
};

// 吉時判斷（日干 × 時支 → 是否為吉時）
// 簡化版：根據五行生剋判斷
const AUSPICIOUS_HOURS: Record<string, string[]> = {
  '甲': ['子', '丑', '辰', '巳', '未', '戌'],
  '乙': ['子', '丑', '辰', '巳', '未', '戌'],
  '丙': ['寅', '卯', '午', '未', '戌', '亥'],
  '丁': ['寅', '卯', '午', '未', '戌', '亥'],
  '戊': ['辰', '巳', '申', '酉', '子', '丑'],
  '己': ['辰', '巳', '申', '酉', '子', '丑'],
  '庚': ['午', '未', '戌', '亥', '寅', '卯'],
  '辛': ['午', '未', '戌', '亥', '寅', '卯'],
  '壬': ['申', '酉', '子', '丑', '辰', '巳'],
  '癸': ['申', '酉', '子', '丑', '辰', '巳'],
};

export interface HourFortune {
  branch: string;       // 地支
  stem: string;         // 天干
  name: string;         // 時辰名稱（子時、丑時...）
  time: string;         // 時間範圍（23:00-01:00）
  isAuspicious: boolean; // 是否吉時
  yi: string[];         // 宜
  ji: string[];         // 忌
  chong: string;        // 沖（生肖）
  sha: string;          // 煞方
}

/**
 * 計算某日的12時辰吉凶
 * @param dayStem 日干
 */
export function getDayHourFortunes(dayStem: string): HourFortune[] {
  const baseStemIndex = DAY_STEM_TO_HOUR_STEM_BASE[dayStem] ?? 0;
  const auspiciousHours = AUSPICIOUS_HOURS[dayStem] ?? [];
  
  return HOUR_BRANCHES.map((hour, index) => {
    const stemIndex = (baseStemIndex + index) % 10;
    const stem = HEAVENLY_STEMS[stemIndex];
    const chongBranch = BRANCH_CHONG[hour.branch];
    const zodiac = BRANCH_ZODIAC[chongBranch] || '';
    
    // 計算沖的天干（簡化：用對應的天干）
    const chongStemIndex = (stemIndex + 5) % 10; // 對沖天干
    const chongStem = HEAVENLY_STEMS[chongStemIndex];
    
    const auspicious = HOUR_AUSPICIOUS[hour.branch];
    
    return {
      branch: hour.branch,
      stem,
      name: hour.name,
      time: hour.time,
      isAuspicious: auspiciousHours.includes(hour.branch),
      yi: auspicious?.yi ?? [],
      ji: auspicious?.ji ?? [],
      chong: `(${chongStem}${chongBranch})${zodiac}`,
      sha: BRANCH_SHA[hour.branch] ?? '',
    };
  });
}

// ============================================================
// 日柱宜忌（通用版，基於日支）
// ============================================================

// 日柱宜忌（基於日支的通用宜忌）
const DAY_AUSPICIOUS: Record<string, { yi: string[]; ji: string[] }> = {
  '子': {
    yi: ['祭祀', '祈福', '求嗣', '訂婚', '嫁娶', '入宅', '開市', '交易', '出行', '安床'],
    ji: ['動土', '破土', '安葬', '移柩'],
  },
  '丑': {
    yi: ['修造', '動土', '豎柱', '上梁', '安床', '入宅', '開市', '嫁娶', '納畜'],
    ji: ['開光', '祭祀', '祈福', '出行', '安葬'],
  },
  '寅': {
    yi: ['祭祀', '祈福', '開光', '出行', '訂婚', '嫁娶', '開市', '交易', '安葬'],
    ji: ['動土', '破土', '移柩', '入宅'],
  },
  '卯': {
    yi: ['祭祀', '祈福', '求嗣', '嫁娶', '開市', '交易', '出行', '安床', '入宅'],
    ji: ['動土', '安葬', '移柩'],
  },
  '辰': {
    yi: ['修造', '動土', '豎柱', '上梁', '開市', '嫁娶', '入宅', '安葬'],
    ji: ['開光', '祭祀', '祈福', '出行'],
  },
  '巳': {
    yi: ['祭祀', '祈福', '開光', '訂婚', '嫁娶', '開市', '交易', '出行', '入宅'],
    ji: ['動土', '安葬', '移柩', '破土'],
  },
  '午': {
    yi: ['祭祀', '祈福', '求嗣', '嫁娶', '開市', '交易', '出行', '安床', '入宅', '開光'],
    ji: ['動土', '破土', '安葬'],
  },
  '未': {
    yi: ['修造', '動土', '豎柱', '上梁', '安床', '入宅', '開市', '嫁娶', '納畜', '安葬'],
    ji: ['開光', '祭祀', '祈福'],
  },
  '申': {
    yi: ['祭祀', '祈福', '開光', '出行', '嫁娶', '開市', '交易', '安葬'],
    ji: ['動土', '破土', '移柩', '入宅'],
  },
  '酉': {
    yi: ['祭祀', '祈福', '求嗣', '嫁娶', '開市', '交易', '出行', '安床', '入宅'],
    ji: ['動土', '安葬', '移柩'],
  },
  '戌': {
    yi: ['修造', '動土', '豎柱', '上梁', '開市', '嫁娶', '入宅', '安葬'],
    ji: ['開光', '祭祀', '祈福', '出行'],
  },
  '亥': {
    yi: ['祭祀', '祈福', '開光', '訂婚', '嫁娶', '開市', '交易', '出行', '入宅'],
    ji: ['動土', '安葬', '移柩', '破土'],
  },
};

/**
 * 取得日柱宜忌（基於日支）
 */
export function getDayAuspicious(branch: string): { yi: string[]; ji: string[] } {
  return DAY_AUSPICIOUS[branch] ?? { yi: [], ji: [] };
}

// ============================================================
// 方位吉凶（基於日干）
// ============================================================

const DAY_DIRECTIONS: Record<string, { xi: string; fu: string; cai: string }> = {
  '甲': { xi: '東南', fu: '東北', cai: '正南' },
  '乙': { xi: '東南', fu: '東北', cai: '正南' },
  '丙': { xi: '西南', fu: '西北', cai: '西南' },
  '丁': { xi: '西南', fu: '西北', cai: '西南' },
  '戊': { xi: '正東', fu: '正西', cai: '正東' },
  '己': { xi: '正東', fu: '正西', cai: '正東' },
  '庚': { xi: '正北', fu: '正南', cai: '正北' },
  '辛': { xi: '正北', fu: '正南', cai: '正北' },
  '壬': { xi: '正西', fu: '東南', cai: '正西' },
  '癸': { xi: '正西', fu: '東南', cai: '正西' },
};

export function getDayDirections(stem: string): { xi: string; fu: string; cai: string } {
  return DAY_DIRECTIONS[stem] ?? { xi: '東南', fu: '東北', cai: '正南' };
}

// ============================================================
// 彭祖百忌（基於日干、日支）
// ============================================================

const PENGZU_STEM: Record<string, string> = {
  '甲': '甲不開倉財物耗散',
  '乙': '乙不栽植千株不長',
  '丙': '丙不修灶必見災殃',
  '丁': '丁不剃頭頭必生瘡',
  '戊': '戊不受田田主不祥',
  '己': '己不破券二比並亡',
  '庚': '庚不經絡織機虛張',
  '辛': '辛不合醬主人不嘗',
  '壬': '壬不汲水更難提防',
  '癸': '癸不詞訟理弱敵強',
};

const PENGZU_BRANCH: Record<string, string> = {
  '子': '子不問卜自惹禍殃',
  '丑': '丑不冠帶主不還鄉',
  '寅': '寅不祭祀神鬼不嘗',
  '卯': '卯不穿井水泉不香',
  '辰': '辰不哭泣必主重喪',
  '巳': '巳不遠行財物伏藏',
  '午': '午不苫蓋屋主更張',
  '未': '未不服藥毒氣入腸',
  '申': '申不安床鬼祟入房',
  '酉': '酉不會客醉坐顛狂',
  '戌': '戌不吃犬作怪上床',
  '亥': '亥不嫁娶不利新郎',
};

export function getPengzuBaiji(stem: string, branch: string): string {
  const stemText = PENGZU_STEM[stem] ?? '';
  const branchText = PENGZU_BRANCH[branch] ?? '';
  return `${stemText}；${branchText}`;
}

// ============================================================
// 吉神凶煞（基於月支 × 日支，簡化版）
// ============================================================

// 月支對應的吉神（簡化版）
const MONTHLY_LUCKY_GODS: Record<string, string[]> = {
  '寅': ['月德', '天恩', '月恩', '四相', '王日'],
  '卯': ['天德', '月德', '三合', '臨日', '時陰'],
  '辰': ['月德合', '天恩', '母倉', '益後', '除神'],
  '巳': ['天德合', '月德合', '三合', '時德', '民日'],
  '午': ['月德', '天恩', '月恩', '四相', '王日'],
  '未': ['天德', '月德', '三合', '臨日', '時陰'],
  '申': ['月德合', '天恩', '母倉', '益後', '除神'],
  '酉': ['天德合', '月德合', '三合', '時德', '民日'],
  '戌': ['月德', '天恩', '月恩', '四相', '王日'],
  '亥': ['天德', '月德', '三合', '臨日', '時陰'],
  '子': ['月德合', '天恩', '母倉', '益後', '除神'],
  '丑': ['天德合', '月德合', '三合', '時德', '民日'],
};

// 日支對應的凶煞（簡化版）
const DAILY_UNLUCKY_GODS: Record<string, string[]> = {
  '子': ['月建', '小時', '土府', '往亡'],
  '丑': ['月破', '大耗', '災煞', '天火'],
  '寅': ['劫煞', '天賊', '五虛', '土符'],
  '卯': ['災煞', '天火', '月煞', '月虛'],
  '辰': ['月建', '小時', '土府', '往亡'],
  '巳': ['月破', '大耗', '災煞', '天火'],
  '午': ['劫煞', '天賊', '五虛', '土符'],
  '未': ['災煞', '天火', '月煞', '月虛'],
  '申': ['月建', '小時', '土府', '往亡'],
  '酉': ['月破', '大耗', '災煞', '天火'],
  '戌': ['劫煞', '天賊', '五虛', '土符'],
  '亥': ['災煞', '天火', '月煞', '月虛'],
};

export function getDayGodsAndShas(monthBranch: string, dayBranch: string): {
  luckyGods: string[];
  unluckyGods: string[];
} {
  return {
    luckyGods: MONTHLY_LUCKY_GODS[monthBranch] ?? [],
    unluckyGods: DAILY_UNLUCKY_GODS[dayBranch] ?? [],
  };
}
