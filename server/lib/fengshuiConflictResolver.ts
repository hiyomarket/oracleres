/**
 * 風水衝突解決機制 (fengshuiConflictResolver.ts)
 * ================================================
 * 當八宅吉位的五行屬性與八字喜忌產生衝突時，
 * 提供「通關」佈置方案，確保建議安全且專業。
 *
 * 核心原則：「方位從八宅，佈置從五行」
 * - 方位選擇以八宅吉凶為主（不因五行衝突而放棄吉位）
 * - 佈置物品以八字喜忌為主（在吉位上用喜用五行的物品）
 * - 衝突時用「通關五行」化解（如木火通關、水木通關）
 */

import { type Direction, DIRECTION_ELEMENT } from './bazhai.js';

// ═══ 類型定義 ═══

export type WuXing = '木' | '火' | '土' | '金' | '水';

/** 衝突類型 */
export type ConflictType =
  | 'none'           // 無衝突
  | 'direction_克_user'  // 方位五行剋用戶喜用神
  | 'user_克_direction'  // 用戶忌神剋方位五行
  | 'mutual_clash';      // 雙向衝突

/** 通關方案 */
export interface BridgeRemedy {
  bridgeElement: WuXing;         // 通關五行
  bridgeReason: string;          // 為何用此五行通關
  remedyItems: RemedyItem[];     // 具體化解物品
  placement: string;             // 擺放位置建議
  priority: number;              // 優先級（1最高）
}

/** 化解物品 */
export interface RemedyItem {
  name: string;
  element: WuXing;
  priceRange: string;     // 價格區間
  description: string;
  isAffordable: boolean;  // 是否窮人友善
  category: string;       // 分類：植物/燈具/水器/金屬/陶瓷/顏色/其他
}

/** 衝突分析結果 */
export interface ConflictAnalysis {
  direction: Direction;
  directionElement: WuXing;
  conflictType: ConflictType;
  severity: 'none' | 'low' | 'medium' | 'high';
  explanation: string;
  remedies: BridgeRemedy[];
  finalAdvice: string;
}

/** 完整衝突解決報告 */
export interface ConflictReport {
  hasConflicts: boolean;
  totalConflicts: number;
  analyses: ConflictAnalysis[];
  globalAdvice: string;
}

// ═══ 五行生剋關係 ═══

/** 五行相生：A 生 B */
const SHENG_MAP: Record<WuXing, WuXing> = {
  '木': '火', '火': '土', '土': '金', '金': '水', '水': '木',
};

/** 五行相剋：A 剋 B */
const KE_MAP: Record<WuXing, WuXing> = {
  '木': '土', '火': '金', '土': '水', '金': '木', '水': '火',
};

/** 五行被剋：A 被 B 剋 */
const BEING_KE_MAP: Record<WuXing, WuXing> = {
  '木': '金', '火': '水', '土': '木', '金': '火', '水': '土',
};

// ═══ 窮人友善化解物品庫（預設，可被後台 remedyItems 覆蓋） ═══

const DEFAULT_REMEDY_ITEMS: Record<WuXing, RemedyItem[]> = {
  '木': [
    { name: '小盆栽（綠蘿/多肉）', element: '木', priceRange: '50-150元', description: '桌上小型綠色植物，淨化空氣又補木氣', isAffordable: true, category: '植物' },
    { name: '竹製筆筒', element: '木', priceRange: '80-200元', description: '天然竹材筆筒，實用又補木', isAffordable: true, category: '其他' },
    { name: '綠色滑鼠墊', element: '木', priceRange: '30-80元', description: '綠色系滑鼠墊，每天接觸補木氣', isAffordable: true, category: '顏色' },
  ],
  '火': [
    { name: 'LED 小桌燈', element: '火', priceRange: '150-400元', description: '暖色光桌燈，補火氣又護眼', isAffordable: true, category: '燈具' },
    { name: '紅色便條紙/筆', element: '火', priceRange: '20-50元', description: '紅色文具，最便宜的補火方式', isAffordable: true, category: '顏色' },
    { name: '紅色手機殼', element: '火', priceRange: '100-300元', description: '每天攜帶的補火利器', isAffordable: true, category: '顏色' },
  ],
  '土': [
    { name: '陶瓷杯/茶杯', element: '土', priceRange: '100-300元', description: '陶瓷材質水杯，喝水補土兩不誤', isAffordable: true, category: '陶瓷' },
    { name: '黃色/米色桌墊', element: '土', priceRange: '50-150元', description: '大地色系桌墊，穩定氣場', isAffordable: true, category: '顏色' },
    { name: '小石頭擺件', element: '土', priceRange: '30-100元', description: '天然石頭（河邊撿的也行），鎮壓不穩定氣場', isAffordable: true, category: '其他' },
  ],
  '金': [
    { name: '不鏽鋼水壺', element: '金', priceRange: '200-500元', description: '金屬材質保溫壺，實用又補金', isAffordable: true, category: '金屬' },
    { name: '銅製迴紋針盒', element: '金', priceRange: '50-150元', description: '小型銅製文具收納，低調補金', isAffordable: true, category: '金屬' },
    { name: '白色/銀色相框', element: '金', priceRange: '80-200元', description: '放家人照片的金屬相框，補金又有歸屬感', isAffordable: true, category: '金屬' },
  ],
  '水': [
    { name: '一杯清水', element: '水', priceRange: '0元', description: '最簡單的補水方式，每天換新水', isAffordable: true, category: '水器' },
    { name: '藍色文件夾', element: '水', priceRange: '20-50元', description: '藍色/黑色文件收納，補水又整齊', isAffordable: true, category: '顏色' },
    { name: '小型USB加濕器', element: '水', priceRange: '150-400元', description: '桌上加濕器，補水氣又舒適', isAffordable: true, category: '水器' },
  ],
};

// ═══ 核心函數 ═══

/**
 * 找出通關五行
 * 當 A 剋 B 時，找 C 使得 A 生 C 且 C 生 B（通關）
 */
export function findBridgeElement(attacker: WuXing, victim: WuXing): WuXing | null {
  // A 剋 B，找 C：A → C → B（A 生 C，C 生 B）
  // 實際上通關是：被剋者的母（生它的五行）
  // 例如：金剋木，用水通關（金生水，水生木）
  const allElements: WuXing[] = ['木', '火', '土', '金', '水'];
  for (const c of allElements) {
    if (SHENG_MAP[attacker] === c && SHENG_MAP[c] === victim) {
      return c;
    }
  }
  return null;
}

/**
 * 分析單一方位的五行衝突
 */
export function analyzeDirectionConflict(
  direction: Direction,
  favorableElements: WuXing[],
  unfavorableElements: WuXing[],
  customRemedyItems?: Record<WuXing, RemedyItem[]>,
): ConflictAnalysis {
  const dirElement = DIRECTION_ELEMENT[direction] as WuXing;
  const remedyDb = customRemedyItems || DEFAULT_REMEDY_ITEMS;

  // 判斷衝突類型
  let conflictType: ConflictType = 'none';
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  let explanation = '';
  const remedies: BridgeRemedy[] = [];

  const isFavorable = favorableElements.includes(dirElement);
  const isUnfavorable = unfavorableElements.includes(dirElement);

  if (isFavorable) {
    // 方位五行是喜用神 → 完美，無衝突
    explanation = `${direction}方五行屬${dirElement}，正好是你的喜用神，非常適合`;
  } else if (isUnfavorable) {
    // 方位五行是忌神 → 需要通關化解
    conflictType = 'direction_克_user';
    severity = 'medium';
    explanation = `${direction}方五行屬${dirElement}，是你的忌神。需要用通關五行化解`;

    // 找通關五行
    for (const fav of favorableElements) {
      const bridge = findBridgeElement(dirElement, fav);
      if (bridge) {
        remedies.push({
          bridgeElement: bridge,
          bridgeReason: `用${bridge}通關：${dirElement}生${bridge}，${bridge}生${fav}，化解${dirElement}對你的不利影響`,
          remedyItems: remedyDb[bridge] || [],
          placement: `在${direction}方擺放${bridge}屬性物品`,
          priority: 1,
        });
      }
    }

    // 如果找不到完美通關，直接用喜用神物品壓制
    if (remedies.length === 0) {
      for (const fav of favorableElements) {
        remedies.push({
          bridgeElement: fav,
          bridgeReason: `直接用喜用神${fav}的物品增強正能量，壓制${dirElement}的不利影響`,
          remedyItems: remedyDb[fav] || [],
          placement: `在${direction}方多放${fav}屬性物品`,
          priority: 2,
        });
      }
    }
  } else {
    // 方位五行既非喜用也非忌神 → 中性，輕微調整即可
    explanation = `${direction}方五行屬${dirElement}，對你影響中性。可適度用喜用神物品增強`;
    severity = 'low';

    // 建議放喜用神物品
    if (favorableElements.length > 0) {
      const fav = favorableElements[0];
      remedies.push({
        bridgeElement: fav,
        bridgeReason: `在中性方位放置喜用神${fav}的物品，將中性轉為有利`,
        remedyItems: remedyDb[fav] || [],
        placement: `在${direction}方放${fav}屬性物品即可`,
        priority: 3,
      });
    }
  }

  // 最終建議
  let finalAdvice: string;
  if (conflictType === 'none' && severity === 'none') {
    finalAdvice = `${direction}方是你的友善方位，放心使用`;
  } else if (severity === 'low') {
    finalAdvice = `${direction}方影響中性，放些${favorableElements[0] || '木'}屬性小物即可提升`;
  } else {
    const topRemedy = remedies[0];
    if (topRemedy) {
      const affordableItem = topRemedy.remedyItems.find(i => i.isAffordable);
      finalAdvice = `${direction}方需要化解：${topRemedy.bridgeReason}。` +
        `建議放${affordableItem?.name || topRemedy.bridgeElement + '屬性物品'}`;
    } else {
      finalAdvice = `${direction}方需注意，保持整潔即可`;
    }
  }

  return {
    direction,
    directionElement: dirElement,
    conflictType,
    severity,
    explanation,
    remedies,
    finalAdvice,
  };
}

/**
 * 分析所有八方位的衝突並產出完整報告
 */
export function getConflictReport(
  favorableElements: WuXing[],
  unfavorableElements: WuXing[],
  customRemedyItems?: Record<WuXing, RemedyItem[]>,
): ConflictReport {
  const allDirections: Direction[] = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];

  const analyses = allDirections.map(dir =>
    analyzeDirectionConflict(dir, favorableElements, unfavorableElements, customRemedyItems)
  );

  const conflicts = analyses.filter(a => a.conflictType !== 'none');

  let globalAdvice: string;
  if (conflicts.length === 0) {
    globalAdvice = '你的八字喜忌與八宅方位沒有明顯衝突，可以放心依照八宅吉凶選擇座位方向';
  } else if (conflicts.length <= 2) {
    globalAdvice = `有${conflicts.length}個方位存在五行衝突，已提供通關化解方案。重點注意：` +
      conflicts.map(c => `${c.direction}方（${c.directionElement}）`).join('、');
  } else {
    globalAdvice = `有${conflicts.length}個方位存在五行衝突，建議優先處理嚴重度高的方位。` +
      `最重要的是確保你的座位朝向和背後方位沒有衝突`;
  }

  return {
    hasConflicts: conflicts.length > 0,
    totalConflicts: conflicts.length,
    analyses,
    globalAdvice,
  };
}

/**
 * 取得指定五行的預設化解物品
 */
export function getDefaultRemedyItems(element: WuXing): RemedyItem[] {
  return DEFAULT_REMEDY_ITEMS[element] || [];
}

/**
 * 取得所有預設化解物品（供後台初始化用）
 */
export function getAllDefaultRemedyItems(): Record<WuXing, RemedyItem[]> {
  return { ...DEFAULT_REMEDY_ITEMS };
}
