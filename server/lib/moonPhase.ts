/**
 * 月相計算算法
 * 用於「天命共振」擲筊系統 - 月相視覺元素與滿月加成
 */

export type MoonPhaseType =
  | 'new_moon'       // 新月（朔）
  | 'waxing_crescent' // 眉月
  | 'first_quarter'  // 上弦月
  | 'waxing_gibbous' // 盈凸月
  | 'full_moon'      // 滿月（望）
  | 'waning_gibbous' // 虧凸月
  | 'last_quarter'   // 下弦月
  | 'waning_crescent'; // 殘月

export interface MoonPhaseInfo {
  phase: MoonPhaseType;
  illumination: number;   // 月亮照明比例 0-100
  age: number;            // 月齡（天數，0-29.5）
  lunarDay: number;       // 農曆日期（1-30）
  phaseName: string;      // 中文名稱
  phaseEmoji: string;     // 月相 emoji
  description: string;    // 月相描述
  castInfluence: string;  // 對擲筊的具體影響
  shengBonus: number;     // 聖杯機率加成（百分比）
  isFullMoon: boolean;    // 是否為滿月
  isNewMoon: boolean;     // 是否為新月
}

/**
 * 計算月相
 * 使用天文算法計算給定日期的月相
 * 基準：2000年1月6日 18:14 UTC 為新月
 */
export function getMoonPhase(date?: Date): MoonPhaseInfo {
  const now = date || new Date();

  // 新月基準時間（儒略日）
  // 2000年1月6日 18:14 UTC = JD 2451550.26
  const KNOWN_NEW_MOON_JD = 2451550.26;
  const SYNODIC_MONTH = 29.53058867; // 朔望月週期（天）

  // 計算儒略日
  const jd = dateToJulianDay(now);

  // 計算距基準新月的天數
  const daysSinceNewMoon = jd - KNOWN_NEW_MOON_JD;

  // 計算月齡（0-29.53）
  let age = daysSinceNewMoon % SYNODIC_MONTH;
  if (age < 0) age += SYNODIC_MONTH;

  // 計算照明比例（0-1）
  const illuminationRaw = (1 - Math.cos((age / SYNODIC_MONTH) * 2 * Math.PI)) / 2;
  const illumination = Math.round(illuminationRaw * 100);

  // 判斷月相類型
  const phase = getPhaseType(age, SYNODIC_MONTH);
  const phaseInfo = PHASE_CONFIG[phase];

  const lunarDay = Math.round(age) + 1;
  const castInfluence = generateCastInfluence(phase, phaseInfo.shengBonus);

  return {
    phase,
    illumination,
    age,
    lunarDay: Math.min(30, Math.max(1, lunarDay)),
    phaseName: phaseInfo.name,
    phaseEmoji: phaseInfo.emoji,
    description: phaseInfo.description,
    castInfluence,
    shengBonus: phaseInfo.shengBonus,
    isFullMoon: phase === 'full_moon',
    isNewMoon: phase === 'new_moon',
  };
}

/**
 * 生成擲筊影響說明
 */
function generateCastInfluence(phase: MoonPhaseType, bonus: number): string {
  if (phase === 'full_moon') {
    return `滿月之夜，月光最盛，神明感應最為靈敏。聖杯機率提升 ${bonus}%，是一年中擲筊最準確的時刻。`;
  }
  if (phase === 'new_moon') {
    return '新月之時，月光最弱，宜静心設定新目標。擲筊結果偏中性，適合內心尋問。';
  }
  if (phase === 'waxing_crescent' || phase === 'waxing_gibbous') {
    return `月光漸盈，能量上升中，聖杯機率微増 ${bonus}%。適合尋問行動與決斷相關的問題。`;
  }
  if (phase === 'first_quarter') {
    return `上弦月，能量平衡向上，聖杯機率微増 ${bonus}%。適合尋問需要決斷的事項。`;
  }
  if (phase === 'last_quarter') {
    return '下弦月，能量漸弱，宜放下舊事、整理思緒。擲筊結果偏中性，適合內省察覺。';
  }
  if (phase === 'waning_gibbous' || phase === 'waning_crescent') {
    return '月光漸減，宜放下與整理。擲筊結果偏中性，適合密密尋問內心疑惑。';
  }
  return '能量平衡，擲筊結果中性。';
}

/**
 * 日期轉儒略日
 */
function dateToJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
}

/**
 * 根據月齡判斷月相類型
 */
function getPhaseType(age: number, synodic: number): MoonPhaseType {
  const ratio = age / synodic;

  if (ratio < 0.025 || ratio >= 0.975) return 'new_moon';
  if (ratio < 0.225) return 'waxing_crescent';
  if (ratio < 0.275) return 'first_quarter';
  if (ratio < 0.475) return 'waxing_gibbous';
  if (ratio < 0.525) return 'full_moon';
  if (ratio < 0.725) return 'waning_gibbous';
  if (ratio < 0.775) return 'last_quarter';
  return 'waning_crescent';
}

/**
 * 月相配置
 */
const PHASE_CONFIG: Record<MoonPhaseType, {
  name: string;
  emoji: string;
  description: string;
  shengBonus: number; // 聖杯機率加成
}> = {
  new_moon: {
    name: '新月（朔）',
    emoji: '🌑',
    description: '新月之時，萬象更新，宜設定新目標，聖杯能量平穩。',
    shengBonus: 0,
  },
  waxing_crescent: {
    name: '眉月',
    emoji: '🌒',
    description: '月光漸盈，能量上升，宜積極行動，聖杯機率微增。',
    shengBonus: 3,
  },
  first_quarter: {
    name: '上弦月',
    emoji: '🌓',
    description: '上弦月照，決策之時，宜果斷行事，聖杯機率提升。',
    shengBonus: 5,
  },
  waxing_gibbous: {
    name: '盈凸月',
    emoji: '🌔',
    description: '月光漸滿，能量充盈，諸事皆宜，聖杯機率大增。',
    shengBonus: 8,
  },
  full_moon: {
    name: '滿月（望）',
    emoji: '🌕',
    description: '滿月之夜，天地能量達頂峰，神明感應最靈，聖杯機率大幅提升！',
    shengBonus: 10,
  },
  waning_gibbous: {
    name: '虧凸月',
    emoji: '🌖',
    description: '月光漸退，宜收穫整理，聖杯機率稍降。',
    shengBonus: 5,
  },
  last_quarter: {
    name: '下弦月',
    emoji: '🌗',
    description: '下弦月照，宜反思沉澱，能量趨於平靜。',
    shengBonus: 2,
  },
  waning_crescent: {
    name: '殘月',
    emoji: '🌘',
    description: '殘月之時，宜靜心休養，蓄勢待發，等待新月重生。',
    shengBonus: 0,
  },
};

/**
 * 獲取月相的 CSS 顏色（用於視覺效果）
 */
export function getMoonPhaseColor(phase: MoonPhaseType): string {
  if (phase === 'full_moon') return 'oklch(0.95 0.05 80)';
  if (phase === 'new_moon') return 'oklch(0.20 0.02 220)';
  if (phase === 'waxing_gibbous' || phase === 'waning_gibbous') return 'oklch(0.88 0.08 75)';
  return 'oklch(0.80 0.06 78)';
}
