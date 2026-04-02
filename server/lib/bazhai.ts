/**
 * 八宅命卦引擎 (bazhai.ts)
 * ===========================
 * 根據出生年份和性別計算命卦（東四命/西四命），
 * 再推算八方位吉凶星（生氣/天醫/延年/伏位/絕命/五鬼/六煞/禍害）。
 *
 * 所有權重分數可透過 yangzhaiConfig 後台調整。
 */

// ═══ 類型定義 ═══

export type Gender = '男' | '女';

/** 九宮命卦 */
export type MingGua =
  | '坎' | '坤' | '震' | '巽'
  | '乾' | '兌' | '艮' | '離'
  | '中宮男坤' | '中宮女艮';

/** 八方位 */
export type Direction =
  | '北' | '東北' | '東' | '東南'
  | '南' | '西南' | '西' | '西北';

/** 八宅星名 */
export type BazhaiStar =
  | '生氣' | '天醫' | '延年' | '伏位'
  | '絕命' | '五鬼' | '六煞' | '禍害';

/** 東四命/西四命分類 */
export type MingGroup = '東四命' | '西四命';

/** 方位吉凶結果 */
export interface DirectionResult {
  direction: Direction;
  star: BazhaiStar;
  isAuspicious: boolean;
  baseScore: number;        // 基礎分數（0-100）
  element: string;          // 該方位五行屬性
  description: string;      // 說明
  officeAdvice: string;     // 辦公室/租屋族建議
  antiVillainTip: string;   // 避小人建議
}

/** 命卦計算結果 */
export interface MingGuaResult {
  mingGua: MingGua;
  displayName: string;      // 顯示用名稱（去掉中宮前綴）
  group: MingGroup;
  element: string;          // 命卦五行
  favorableDirections: Direction[];
  unfavorableDirections: Direction[];
}

/** 完整八宅分析結果 */
export interface BazhaiAnalysis {
  mingGua: MingGuaResult;
  directions: DirectionResult[];
  bestSeatFacing: Direction;       // 最佳座位朝向
  bestDeskPosition: Direction;     // 最佳辦公桌方位
  villainDirection: Direction;     // 今日小人方位
  summary: string;
}

// ═══ 常數表 ═══

/** 方位 → 五行 */
export const DIRECTION_ELEMENT: Record<Direction, string> = {
  '北': '水', '東北': '土', '東': '木', '東南': '木',
  '南': '火', '西南': '土', '西': '金', '西北': '金',
};

/** 命卦 → 五行 */
const GUA_ELEMENT: Record<string, string> = {
  '坎': '水', '坤': '土', '震': '木', '巽': '木',
  '乾': '金', '兌': '金', '艮': '土', '離': '火',
};

/** 命卦 → 所屬組別 */
const GUA_GROUP: Record<string, MingGroup> = {
  '坎': '東四命', '離': '東四命', '震': '東四命', '巽': '東四命',
  '乾': '西四命', '坤': '西四命', '艮': '西四命', '兌': '西四命',
};

/** 八宅星 → 預設基礎分數（可被後台 yangzhaiConfig 覆蓋） */
export const DEFAULT_STAR_SCORES: Record<BazhaiStar, number> = {
  '生氣': 95,   // 大吉 - 貴人、升遷、活力
  '天醫': 88,   // 大吉 - 健康、穩定、貴人
  '延年': 82,   // 中吉 - 人際、姻緣、合作
  '伏位': 70,   // 小吉 - 穩定、平安
  '禍害': 40,   // 小凶 - 口舌是非
  '六煞': 30,   // 中凶 - 桃花劫、小人
  '五鬼': 20,   // 大凶 - 破財、意外
  '絕命': 10,   // 大凶 - 重大損失
};

/** 八宅星 → 是否吉位 */
const STAR_AUSPICIOUS: Record<BazhaiStar, boolean> = {
  '生氣': true, '天醫': true, '延年': true, '伏位': true,
  '禍害': false, '六煞': false, '五鬼': false, '絕命': false,
};

/**
 * 八宅命卦 → 八方位對應星名
 * 每個命卦對應的八個方位各有一顆星
 */
const BAZHAI_MAP: Record<string, Record<Direction, BazhaiStar>> = {
  '坎': {
    '北': '伏位', '南': '延年', '東': '天醫', '東南': '生氣',
    '西': '禍害', '東北': '五鬼', '西北': '六煞', '西南': '絕命',
  },
  '離': {
    '南': '伏位', '北': '延年', '東南': '天醫', '東': '生氣',
    '西北': '禍害', '西南': '五鬼', '東北': '六煞', '西': '絕命',
  },
  '震': {
    '東': '伏位', '東南': '延年', '北': '天醫', '南': '生氣',
    '西南': '禍害', '西北': '五鬼', '西': '六煞', '東北': '絕命',
  },
  '巽': {
    '東南': '伏位', '東': '延年', '南': '天醫', '北': '生氣',
    '東北': '禍害', '西': '五鬼', '西南': '六煞', '西北': '絕命',
  },
  '乾': {
    '西北': '伏位', '西南': '延年', '東北': '天醫', '西': '生氣',
    '東南': '禍害', '東': '五鬼', '南': '六煞', '北': '絕命',
  },
  '坤': {
    '西南': '伏位', '西北': '延年', '西': '天醫', '東北': '生氣',
    '東': '禍害', '南': '五鬼', '東南': '六煞', '北': '絕命',
  },
  '艮': {
    '東北': '伏位', '西': '延年', '西北': '天醫', '西南': '生氣',
    '南': '禍害', '東南': '五鬼', '北': '六煞', '東': '絕命',
  },
  '兌': {
    '西': '伏位', '東北': '延年', '西南': '天醫', '西北': '生氣',
    '北': '禍害', '東': '五鬼', '東南': '六煞', '南': '絕命',
  },
};

/** 八宅星 → 辦公室/租屋族說明 */
const STAR_DESCRIPTIONS: Record<BazhaiStar, { desc: string; office: string; antiVillain: string }> = {
  '生氣': {
    desc: '最強吉位，主貴人運、升遷、活力充沛',
    office: '最適合放辦公桌主位，面向此方工作效率最高。可放一盆綠色植物增強木氣',
    antiVillain: '面朝生氣位工作，貴人自然靠近，小人不敢造次',
  },
  '天醫': {
    desc: '健康穩定位，主身心安定、貴人相助',
    office: '適合放水杯或小魚缸，穩定工作情緒。若常加班，桌燈放此方可減壓',
    antiVillain: '天醫位放一杯清水，化解口舌是非的暗箭',
  },
  '延年': {
    desc: '人際和諧位，主合作順利、人緣佳',
    office: '放名片座或電話在此方，有助於客戶關係和同事合作',
    antiVillain: '延年位擺放圓形物品（如圓形筆筒），化解人際衝突',
  },
  '伏位': {
    desc: '穩定安寧位，主平安、不好不壞',
    office: '適合放個人物品或文件架，維持工作穩定不出錯',
    antiVillain: '伏位不招惹是非，保持整潔即可',
  },
  '禍害': {
    desc: '口舌是非位，容易招惹小人閒話',
    office: '避免在此方放尖銳物品。可放一小盆圓葉植物化解',
    antiVillain: '⚠️ 小人方位！放銅製小物或黃色物品鎮壓口舌煞',
  },
  '六煞': {
    desc: '桃花劫位，主感情糾紛、人際混亂',
    office: '不要在此方放鏡子或水杯。保持乾淨整齊即可',
    antiVillain: '六煞位放一個小葫蘆或紅色小物，收煞化解爛桃花',
  },
  '五鬼': {
    desc: '破財意外位，主突發狀況、破財',
    office: '此方位不要放錢包或重要文件。可放紅色小物件化解（紅色筆、紅色便條紙）',
    antiVillain: '五鬼位是暗箭傷人方，放一盞小桌燈長明可化解',
  },
  '絕命': {
    desc: '最凶方位，主重大損失、健康問題',
    office: '絕對不要背對此方坐！可放重物（書本、石頭擺件）鎮壓',
    antiVillain: '絕命位放銅器或金屬擺件，以金氣鎮壓凶煞',
  },
};

// ═══ 核心計算函數 ═══

/**
 * 計算命卦（後天八卦）
 * 男命：(100 - 出生年後兩位) / 9 取餘數 → 對應卦
 * 女命：(出生年後兩位 - 4) / 9 取餘數 → 對應卦
 * 2000年後公式略有不同
 */
export function calculateMingGua(birthYear: number, gender: Gender): MingGua {
  let lastTwo: number;

  if (birthYear < 2000) {
    lastTwo = birthYear % 100;
    // 個位數相加直到一位數
    let sum = digitSum(lastTwo);

    if (gender === '男') {
      const remainder = (11 - sum) % 9;
      return guaFromNumber(remainder === 0 ? 9 : remainder, gender);
    } else {
      const remainder = (sum + 4) % 9;
      return guaFromNumber(remainder === 0 ? 9 : remainder, gender);
    }
  } else {
    lastTwo = birthYear % 100;
    let sum = digitSum(lastTwo);

    if (gender === '男') {
      const remainder = (9 - sum) % 9;
      return guaFromNumber(remainder === 0 ? 9 : remainder, gender);
    } else {
      const remainder = (sum + 6) % 9;
      return guaFromNumber(remainder === 0 ? 9 : remainder, gender);
    }
  }
}

/** 數字歸約到一位數 */
function digitSum(n: number): number {
  let s = n;
  while (s >= 10) {
    s = String(s).split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return s;
}

/** 數字 → 卦名 */
function guaFromNumber(n: number, gender: Gender): MingGua {
  const map: Record<number, MingGua> = {
    1: '坎', 2: '坤', 3: '震', 4: '巽',
    6: '乾', 7: '兌', 8: '艮', 9: '離',
  };
  if (n === 5) {
    return gender === '男' ? '坤' : '艮'; // 中宮歸坤(男)/艮(女)
  }
  return map[n] || '坎';
}

/**
 * 取得完整命卦資訊
 */
export function getMingGuaResult(birthYear: number, gender: Gender): MingGuaResult {
  const gua = calculateMingGua(birthYear, gender);
  const displayGua = gua === '中宮男坤' ? '坤' : gua === '中宮女艮' ? '艮' : gua;
  const group = GUA_GROUP[displayGua] || '東四命';
  const element = GUA_ELEMENT[displayGua] || '土';

  const dirMap = BAZHAI_MAP[displayGua];
  const favorable: Direction[] = [];
  const unfavorable: Direction[] = [];

  if (dirMap) {
    for (const [dir, star] of Object.entries(dirMap)) {
      if (STAR_AUSPICIOUS[star]) {
        favorable.push(dir as Direction);
      } else {
        unfavorable.push(dir as Direction);
      }
    }
  }

  return {
    mingGua: gua,
    displayName: displayGua,
    group,
    element,
    favorableDirections: favorable,
    unfavorableDirections: unfavorable,
  };
}

/**
 * 取得八方位完整吉凶分析
 * @param starScores 可選的自訂權重分數（從後台 yangzhaiConfig 讀取）
 */
export function getDirectionAnalysis(
  birthYear: number,
  gender: Gender,
  starScores?: Partial<Record<BazhaiStar, number>>,
): DirectionResult[] {
  const guaResult = getMingGuaResult(birthYear, gender);
  const dirMap = BAZHAI_MAP[guaResult.displayName];
  if (!dirMap) return [];

  const scores = { ...DEFAULT_STAR_SCORES, ...starScores };
  const allDirections: Direction[] = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];

  return allDirections.map((dir) => {
    const star = dirMap[dir];
    const info = STAR_DESCRIPTIONS[star];
    return {
      direction: dir,
      star,
      isAuspicious: STAR_AUSPICIOUS[star],
      baseScore: scores[star],
      element: DIRECTION_ELEMENT[dir],
      description: info.desc,
      officeAdvice: info.office,
      antiVillainTip: info.antiVillain,
    };
  });
}

/**
 * 完整八宅分析（含最佳座位建議）
 */
export function getFullBazhaiAnalysis(
  birthYear: number,
  gender: Gender,
  starScores?: Partial<Record<BazhaiStar, number>>,
): BazhaiAnalysis {
  const mingGua = getMingGuaResult(birthYear, gender);
  const directions = getDirectionAnalysis(birthYear, gender, starScores);

  // 最佳座位朝向 = 生氣位
  const bestFacing = directions.find(d => d.star === '生氣');
  // 最佳辦公桌位置 = 天醫位（穩定）
  const bestDesk = directions.find(d => d.star === '天醫');
  // 小人方位 = 禍害位
  const villainDir = directions.find(d => d.star === '禍害');

  const summary = `你是${mingGua.group}（${mingGua.displayName}卦，${mingGua.element}命），` +
    `最佳座位朝向為${bestFacing?.direction || '東'}方（生氣位），` +
    `辦公桌宜放在${bestDesk?.direction || '北'}方（天醫位）。` +
    `注意${villainDir?.direction || '西'}方為禍害位，容易招惹口舌是非。`;

  return {
    mingGua,
    directions,
    bestSeatFacing: bestFacing?.direction || '東',
    bestDeskPosition: bestDesk?.direction || '北',
    villainDirection: villainDir?.direction || '西',
    summary,
  };
}
