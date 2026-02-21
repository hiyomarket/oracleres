/**
 * 彩券行天命共振評分算法
 * 根據蘇祐震先生的命格（甲木/水木旺/用神火土）
 * 結合流日天干地支、流時、方位五行、門牌號碼、店名字義
 * 計算每家彩券行的「天命共振指數」
 */

export type WuXing = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

// ── 蘇先生命格常數 ──────────────────────────────────────────
// 用神：火（最喜）、土（喜）
// 忌神：水（忌）、木（過旺忌）、金（次忌）
const DESTINY_WEIGHTS: Record<WuXing, number> = {
  fire:  1.5,   // 用神，最大加成
  earth: 1.3,   // 喜神，次要加成
  metal: 0.9,   // 中性偏忌
  wood:  0.7,   // 過旺，略忌
  water: 0.6,   // 忌神，減分
};

// ── 方位 → 五行對應 ─────────────────────────────────────────
// 東木、南火、西金、北水、中土
function getBearingElement(bearing: number): WuXing {
  // bearing: 0=北, 90=東, 180=南, 270=西
  if (bearing >= 337.5 || bearing < 22.5) return 'water';   // 北
  if (bearing >= 22.5  && bearing < 67.5)  return 'wood';   // 東北（木）
  if (bearing >= 67.5  && bearing < 112.5) return 'wood';   // 東
  if (bearing >= 112.5 && bearing < 157.5) return 'fire';   // 東南（火）
  if (bearing >= 157.5 && bearing < 202.5) return 'fire';   // 南
  if (bearing >= 202.5 && bearing < 247.5) return 'earth';  // 西南（土）
  if (bearing >= 247.5 && bearing < 292.5) return 'metal';  // 西
  return 'water';                                             // 西北（水）
}

function getBearingLabel(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return '正北';
  if (bearing >= 22.5  && bearing < 67.5)  return '東北';
  if (bearing >= 67.5  && bearing < 112.5) return '正東';
  if (bearing >= 112.5 && bearing < 157.5) return '東南';
  if (bearing >= 157.5 && bearing < 202.5) return '正南';
  if (bearing >= 202.5 && bearing < 247.5) return '西南';
  if (bearing >= 247.5 && bearing < 292.5) return '正西';
  return '西北';
}

// ── 計算方位角 ───────────────────────────────────────────────
function calcBearing(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(toLng - fromLng);
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// ── 門牌號碼五行 ─────────────────────────────────────────────
// 數字五行：1/2=木火、3/4=木金、5/6=土水、7/8=火木、9/0=金土
const NUMBER_ELEMENT: Record<string, WuXing> = {
  '1': 'wood', '2': 'fire', '3': 'wood', '4': 'metal',
  '5': 'earth', '6': 'water', '7': 'fire', '8': 'wood',
  '9': 'metal', '0': 'earth',
};

function analyzeAddressNumber(address: string): {
  element: WuXing;
  digits: string;
  explanation: string;
} {
  // 提取門牌號碼中的數字
  const match = address.match(/(\d+)/);
  if (!match) return { element: 'earth', digits: '0', explanation: '無法識別門牌號碼，以土氣計算' };

  const digits = match[1];
  // 取最後一位數字作為主五行
  const lastDigit = digits[digits.length - 1];
  const element = NUMBER_ELEMENT[lastDigit] ?? 'earth';

  const elementNames: Record<WuXing, string> = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  };

  return {
    element,
    digits,
    explanation: `門牌 ${digits} 號，尾數 ${lastDigit} 屬${elementNames[element]}`,
  };
}

// ── 店名字義五行 ─────────────────────────────────────────────
const FIRE_KEYWORDS = ['紅', '炎', '火', '陽', '光', '明', '暉', '燦', '熱', '旺', '盛', '興', '發', '福', '吉', '祥', '喜', '樂', '彩', '金'];
const EARTH_KEYWORDS = ['土', '地', '穩', '厚', '實', '誠', '信', '中', '廣', '大', '豐', '滿', '圓', '全', '安', '平', '順', '和'];
const WOOD_KEYWORDS = ['木', '林', '森', '青', '綠', '春', '生', '長', '茂', '新', '草', '花', '葉', '竹'];
const METAL_KEYWORDS = ['金', '銀', '鐵', '鋼', '白', '清', '銳', '利', '強', '剛', '勝', '冠'];
const WATER_KEYWORDS = ['水', '海', '河', '湖', '流', '泉', '藍', '深', '潤', '澤', '清', '涼'];

function analyzeStoreName(name: string): {
  element: WuXing;
  matchedKeyword: string;
  explanation: string;
} {
  const elementNames: Record<WuXing, string> = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  };

  for (const kw of FIRE_KEYWORDS) {
    if (name.includes(kw)) return { element: 'fire', matchedKeyword: kw, explanation: `店名含「${kw}」字，屬火氣` };
  }
  for (const kw of EARTH_KEYWORDS) {
    if (name.includes(kw)) return { element: 'earth', matchedKeyword: kw, explanation: `店名含「${kw}」字，屬土氣` };
  }
  for (const kw of WOOD_KEYWORDS) {
    if (name.includes(kw)) return { element: 'wood', matchedKeyword: kw, explanation: `店名含「${kw}」字，屬木氣` };
  }
  for (const kw of METAL_KEYWORDS) {
    if (name.includes(kw)) return { element: 'metal', matchedKeyword: kw, explanation: `店名含「${kw}」字，屬金氣` };
  }
  for (const kw of WATER_KEYWORDS) {
    if (name.includes(kw)) return { element: 'water', matchedKeyword: kw, explanation: `店名含「${kw}」字，屬水氣` };
  }

  // 預設：彩券行通常帶「彩」字，屬火
  return { element: 'fire', matchedKeyword: '彩', explanation: '彩券行屬火氣（彩字含火義）' };
}

// ── 流日流時加成 ─────────────────────────────────────────────
function getDailyHourBonus(
  dayElement: WuXing,
  hourElement: WuXing,
): { bonus: number; explanation: string } {
  const dayWeight = DESTINY_WEIGHTS[dayElement];
  const hourWeight = DESTINY_WEIGHTS[hourElement];
  const bonus = (dayWeight + hourWeight) / 2;

  const elementNames: Record<WuXing, string> = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  };

  let explanation = `流日${elementNames[dayElement]}氣`;
  if (dayElement === 'fire' || dayElement === 'earth') {
    explanation += '（用神得力）';
  } else if (dayElement === 'water' || dayElement === 'wood') {
    explanation += '（忌神當令）';
  }
  explanation += `，流時${elementNames[hourElement]}氣`;
  if (hourElement === 'fire' || hourElement === 'earth') {
    explanation += '（時辰吉利）';
  }

  return { bonus, explanation };
}

// ── 主評分函數 ───────────────────────────────────────────────
export interface StoreInput {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number; // 公尺
  rating?: number;
  isOpen?: boolean;
}

export interface ScoredStore extends StoreInput {
  resonanceScore: number;       // 0-100 天命共振指數
  resonanceStars: number;       // 1-5 顆火焰星
  bearingElement: WuXing;
  bearingLabel: string;
  bearingDegree: number;
  addressAnalysis: { element: WuXing; digits: string; explanation: string };
  nameAnalysis: { element: WuXing; matchedKeyword: string; explanation: string };
  dailyBonus: { bonus: number; explanation: string };
  recommendation: string;       // 推薦理由一句話
  reasons: string[];            // 詳細理由列表
  rank: number;
}

export function scoreNearbyStores(
  stores: StoreInput[],
  userLat: number,
  userLng: number,
  dayElement: WuXing,
  hourElement: WuXing,
): ScoredStore[] {
  const elementNames: Record<WuXing, string> = {
    wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
  };

  const scored = stores.map((store) => {
    const bearing = calcBearing(userLat, userLng, store.lat, store.lng);
    const bearingElement = getBearingElement(bearing);
    const bearingLabel = getBearingLabel(bearing);

    const addressAnalysis = analyzeAddressNumber(store.address);
    const nameAnalysis = analyzeStoreName(store.name);
    const dailyBonus = getDailyHourBonus(dayElement, hourElement);

    // 各項分數（滿分各25分）
    const bearingScore   = DESTINY_WEIGHTS[bearingElement]   * 18;
    const addressScore   = DESTINY_WEIGHTS[addressAnalysis.element] * 18;
    const nameScore      = DESTINY_WEIGHTS[nameAnalysis.element]    * 18;
    const dailyScore     = dailyBonus.bonus * 16;

    // 距離加成（越近越好，最多+6分）
    const distanceBonus = Math.max(0, 6 - (store.distance / 200));

    // 評分加成（Google 評分）
    const ratingBonus = store.rating ? (store.rating - 3) * 1.5 : 0;

    // 是否營業加成
    const openBonus = store.isOpen === true ? 3 : store.isOpen === false ? -10 : 0;

    const rawScore = bearingScore + addressScore + nameScore + dailyScore + distanceBonus + ratingBonus + openBonus;
    const resonanceScore = Math.min(100, Math.max(0, Math.round(rawScore)));
    const resonanceStars = Math.min(5, Math.max(1, Math.round(resonanceScore / 20)));

    // 建立推薦理由
    const reasons: string[] = [];
    reasons.push(`方位${bearingLabel}（${elementNames[bearingElement]}）：${DESTINY_WEIGHTS[bearingElement] >= 1.3 ? '✦ 吉方' : DESTINY_WEIGHTS[bearingElement] <= 0.7 ? '△ 略忌' : '○ 中性'}`);
    reasons.push(addressAnalysis.explanation + `：${DESTINY_WEIGHTS[addressAnalysis.element] >= 1.3 ? '✦ 吉數' : '○ 普通'}`);
    reasons.push(nameAnalysis.explanation + `：${DESTINY_WEIGHTS[nameAnalysis.element] >= 1.3 ? '✦ 吉名' : '○ 普通'}`);
    reasons.push(dailyBonus.explanation);

    // 一句推薦語
    let recommendation = '';
    if (resonanceScore >= 80) {
      recommendation = `天命高度共振！${bearingLabel}方位屬${elementNames[bearingElement]}，此刻流日流時皆利，強烈推薦。`;
    } else if (resonanceScore >= 60) {
      recommendation = `天命良好共振。${bearingLabel}方位，流日能量配合，值得前往。`;
    } else if (resonanceScore >= 40) {
      recommendation = `天命中等共振。可前往，但非最佳選擇。`;
    } else {
      recommendation = `天命共振偏弱，建議選擇其他方位的彩券行。`;
    }

    return {
      ...store,
      resonanceScore,
      resonanceStars,
      bearingElement,
      bearingLabel,
      bearingDegree: Math.round(bearing),
      addressAnalysis,
      nameAnalysis,
      dailyBonus,
      recommendation,
      reasons,
      rank: 0,
    } as ScoredStore;
  });

  // 排序並加上排名
  scored.sort((a, b) => b.resonanceScore - a.resonanceScore);
  scored.forEach((s, i) => { s.rank = i + 1; });

  return scored;
}
