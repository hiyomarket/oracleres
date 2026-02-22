/**
 * 風水地塊五行分析引擎
 * 基於羅盤二十四山方位、地名字根五行、商業類型五行三維度
 * 計算目標地點的風水五行屬性，並與使用者今日需補五行做匹配
 */

export type FiveElement = "木" | "火" | "土" | "金" | "水";

// ============================================================
// 二十四山方位五行對應表（基於羅盤 Luo Pan）
// 每個方位佔 15 度，共 24 個方位
// ============================================================
interface MountainData {
  name: string;      // 山名（天干/地支/卦）
  element: FiveElement;
  yin: boolean;      // true=陰，false=陽
}

const TWENTY_FOUR_MOUNTAINS: Array<{ minDeg: number; maxDeg: number } & MountainData> = [
  // 北方（水）
  { minDeg: 337.5, maxDeg: 352.5, name: "壬", element: "水", yin: false },
  { minDeg: 352.5, maxDeg: 360,   name: "子", element: "水", yin: false },
  { minDeg: 0,     maxDeg: 7.5,   name: "子", element: "水", yin: false },
  { minDeg: 7.5,   maxDeg: 22.5,  name: "癸", element: "水", yin: true  },
  // 東北（土/木）
  { minDeg: 22.5,  maxDeg: 37.5,  name: "丑", element: "土", yin: true  },
  { minDeg: 37.5,  maxDeg: 52.5,  name: "艮", element: "土", yin: false },
  { minDeg: 52.5,  maxDeg: 67.5,  name: "寅", element: "木", yin: false },
  // 東方（木）
  { minDeg: 67.5,  maxDeg: 82.5,  name: "甲", element: "木", yin: false },
  { minDeg: 82.5,  maxDeg: 97.5,  name: "卯", element: "木", yin: true  },
  { minDeg: 97.5,  maxDeg: 112.5, name: "乙", element: "木", yin: true  },
  // 東南（土/木）
  { minDeg: 112.5, maxDeg: 127.5, name: "辰", element: "土", yin: false },
  { minDeg: 127.5, maxDeg: 142.5, name: "巽", element: "木", yin: true  },
  { minDeg: 142.5, maxDeg: 157.5, name: "巳", element: "火", yin: true  },
  // 南方（火）
  { minDeg: 157.5, maxDeg: 172.5, name: "丙", element: "火", yin: false },
  { minDeg: 172.5, maxDeg: 187.5, name: "午", element: "火", yin: false },
  { minDeg: 187.5, maxDeg: 202.5, name: "丁", element: "火", yin: true  },
  // 西南（土/金）
  { minDeg: 202.5, maxDeg: 217.5, name: "未", element: "土", yin: true  },
  { minDeg: 217.5, maxDeg: 232.5, name: "坤", element: "土", yin: true  },
  { minDeg: 232.5, maxDeg: 247.5, name: "申", element: "金", yin: false },
  // 西方（金）
  { minDeg: 247.5, maxDeg: 262.5, name: "庚", element: "金", yin: false },
  { minDeg: 262.5, maxDeg: 277.5, name: "酉", element: "金", yin: true  },
  { minDeg: 277.5, maxDeg: 292.5, name: "辛", element: "金", yin: true  },
  // 西北（土/金）
  { minDeg: 292.5, maxDeg: 307.5, name: "戌", element: "土", yin: false },
  { minDeg: 307.5, maxDeg: 322.5, name: "乾", element: "金", yin: false },
  { minDeg: 322.5, maxDeg: 337.5, name: "亥", element: "水", yin: true  },
];

/**
 * 根據方位角（0-360度）取得二十四山方位資訊
 */
export function getBearingElement(bearingDeg: number): MountainData & { bearing: number } {
  const normalizedDeg = ((bearingDeg % 360) + 360) % 360;
  for (const m of TWENTY_FOUR_MOUNTAINS) {
    const min = m.minDeg;
    const max = m.maxDeg;
    // 處理跨越 0 度的情況（壬/子）
    if (min > max) {
      if (normalizedDeg >= min || normalizedDeg < max) {
        return { ...m, bearing: normalizedDeg };
      }
    } else {
      if (normalizedDeg >= min && normalizedDeg < max) {
        return { ...m, bearing: normalizedDeg };
      }
    }
  }
  // 預設返回子（正北）
  return { name: "子", element: "水", yin: false, bearing: normalizedDeg };
}

/**
 * 計算兩個 GPS 座標之間的方位角（bearing）
 * 從 origin 到 target 的方向（0=正北，90=正東，180=正南，270=正西）
 */
export function calculateBearing(
  originLat: number,
  originLng: number,
  targetLat: number,
  targetLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLng = toRad(targetLng - originLng);
  const lat1 = toRad(originLat);
  const lat2 = toRad(targetLat);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return ((bearing % 360) + 360) % 360;
}

// ============================================================
// 地名字根五行分析
// ============================================================
const ELEMENT_CHARS: Record<FiveElement, string[]> = {
  水: ["海", "江", "河", "湖", "溪", "泉", "港", "灣", "洋", "淡", "清", "水", "流", "潭", "澤", "池", "浦", "渡", "津", "沙", "漁", "冰", "凍", "寒", "涼"],
  木: ["林", "木", "森", "竹", "草", "花", "園", "綠", "青", "茂", "樹", "柳", "梅", "桃", "杏", "松", "楓", "橋", "藤", "蘭", "菊", "荷", "苑", "圃"],
  火: ["火", "炎", "熱", "陽", "光", "明", "南", "炬", "燈", "紅", "赤", "日", "晴", "暖", "炙", "烈", "煌", "輝", "燦", "炫"],
  土: ["土", "地", "山", "岡", "坡", "丘", "嶺", "崗", "原", "田", "坪", "埔", "坑", "崙", "墩", "壩", "壤", "坊", "里", "鄉", "村", "城", "鎮", "區"],
  金: ["金", "銀", "鐵", "鋼", "礦", "石", "岩", "硬", "白", "西", "秋", "庚", "辛", "鑫", "鈺", "銘", "鋒", "鎧", "鑄"],
};

/**
 * 分析地址字串中的五行字根，返回各五行的出現次數
 */
export function analyzeAddressElement(address: string): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const [element, chars] of Object.entries(ELEMENT_CHARS) as Array<[FiveElement, string[]]>) {
    for (const char of chars) {
      const occurrences = (address.match(new RegExp(char, "g")) || []).length;
      counts[element] += occurrences;
    }
  }
  return counts;
}

/**
 * 從地址字根分析中取得主要五行（出現最多的）
 * 若無明顯字根，返回 null（中性）
 */
export function getDominantAddressElement(address: string): FiveElement | null {
  const counts = analyzeAddressElement(address);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a) as Array<[FiveElement, number]>;
  return sorted[0][1] > 0 ? sorted[0][0] : null;
}

// ============================================================
// 商業類型五行分析（基於 Google Maps 餐廳類型和名稱關鍵字）
// ============================================================
const FOOD_TYPE_KEYWORDS: Array<{ keywords: string[]; element: FiveElement; weight: number }> = [
  // 土屬性：甜食、米食、根莖類、黃色食物
  { keywords: ["甜點", "甜食", "糕點", "餅", "麵包", "蛋糕", "布丁", "奶茶", "珍珠", "米食", "飯糰", "壽司", "便當", "自助餐", "buffet", "dessert", "bakery", "cake", "bread", "rice", "bento"], element: "土", weight: 1.0 },
  // 火屬性：燒烤、辛辣、熱炒、火鍋
  { keywords: ["燒烤", "烤肉", "辛辣", "麻辣", "火鍋", "熱炒", "炸雞", "鹹酥雞", "串燒", "炭烤", "BBQ", "grill", "hot pot", "spicy", "fried"], element: "火", weight: 1.0 },
  // 水屬性：海鮮、生魚片、冷飲、冰品
  { keywords: ["海鮮", "生魚片", "刺身", "生蠔", "螃蟹", "龍蝦", "鮭魚", "鮪魚", "冰淇淋", "冰品", "冷飲", "果汁", "smoothie", "seafood", "sushi", "sashimi", "ice cream", "bubble tea"], element: "水", weight: 1.0 },
  // 木屬性：蔬食、有機、茶飲、咖啡、沙拉
  { keywords: ["蔬食", "素食", "有機", "沙拉", "輕食", "咖啡", "茶", "花草茶", "健康", "養生", "vegan", "vegetarian", "organic", "salad", "coffee", "tea", "healthy"], element: "木", weight: 1.0 },
  // 金屬性：白色食物、豆腐、日式、西式、雞肉
  { keywords: ["豆腐", "豆漿", "白色", "日式", "日本料理", "拉麵", "烏龍", "蕎麥", "西式", "義式", "法式", "雞肉", "白肉", "清湯", "Japanese", "ramen", "Italian", "French", "chicken", "tofu"], element: "金", weight: 1.0 },
];

/**
 * 分析餐廳名稱和類型，返回五行屬性
 */
export function analyzeRestaurantElement(name: string, types: string[]): FiveElement | null {
  const combined = `${name} ${types.join(" ")}`.toLowerCase();
  const scores: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };

  for (const { keywords, element, weight } of FOOD_TYPE_KEYWORDS) {
    for (const keyword of keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        scores[element] += weight;
      }
    }
  }

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a) as Array<[FiveElement, number]>;
  return sorted[0][1] > 0 ? sorted[0][0] : null;
}

// ============================================================
// 五行相生相剋關係
// ============================================================
// 相生：木生火、火生土、土生金、金生水、水生木
const GENERATES: Record<FiveElement, FiveElement> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};
// 相剋：木剋土、土剋水、水剋火、火剋金、金剋木
const OVERCOMES: Record<FiveElement, FiveElement> = {
  木: "土", 土: "水", 水: "火", 火: "金", 金: "木",
};

/**
 * 計算五行匹配分數（0-100）
 * 目標五行 vs 需求五行（使用者今日需補的五行）
 * 
 * 評分邏輯：
 * - 完全相同：100分（直接補充）
 * - 相生（目標生需求）：85分（間接補充）
 * - 相生（需求生目標）：70分（有助益）
 * - 中性（無關係）：50分
 * - 相剋（目標剋需求）：20分（消耗需求）
 * - 相剋（需求剋目標）：30分（抑制目標）
 */
export function calculateElementMatch(targetElement: FiveElement, neededElement: FiveElement): number {
  if (targetElement === neededElement) return 100;
  if (GENERATES[targetElement] === neededElement) return 85; // 目標生需求
  if (GENERATES[neededElement] === targetElement) return 70; // 需求生目標
  if (OVERCOMES[targetElement] === neededElement) return 20; // 目標剋需求
  if (OVERCOMES[neededElement] === targetElement) return 30; // 需求剋目標
  return 50; // 中性
}

// ============================================================
// 綜合風水評分
// ============================================================
export interface FengShuiScore {
  totalScore: number;           // 綜合風水分數 0-100
  bearingElement: FiveElement;  // 方位五行
  bearingMountain: string;      // 二十四山名稱
  bearingDeg: number;           // 方位角度
  addressElement: FiveElement | null; // 地名五行
  restaurantElement: FiveElement | null; // 商業類型五行
  dominantElement: FiveElement; // 綜合主導五行
  matchLevel: "極旺" | "旺" | "平" | "弱" | "忌";
  matchDescription: string;
  recommendation: string;
}

/**
 * 計算餐廳的綜合風水分數
 * @param userLat 使用者緯度
 * @param userLng 使用者經度
 * @param restaurantLat 餐廳緯度
 * @param restaurantLng 餐廳經度
 * @param restaurantName 餐廳名稱
 * @param restaurantTypes 餐廳類型陣列
 * @param restaurantAddress 餐廳地址
 * @param neededElements 今日需補五行陣列（可多個）
 */
export function calculateFengShuiScore(
  userLat: number,
  userLng: number,
  restaurantLat: number,
  restaurantLng: number,
  restaurantName: string,
  restaurantTypes: string[],
  restaurantAddress: string,
  neededElements: FiveElement[]
): FengShuiScore {
  // 1. 方位五行（權重 40%）
  const bearing = calculateBearing(userLat, userLng, restaurantLat, restaurantLng);
  const bearingData = getBearingElement(bearing);
  const bearingElement = bearingData.element;

  // 2. 地名五行（權重 20%）
  const addressElement = getDominantAddressElement(restaurantAddress + " " + restaurantName);

  // 3. 商業類型五行（權重 40%）
  const restaurantElement = analyzeRestaurantElement(restaurantName, restaurantTypes);

  // 4. 決定綜合主導五行（加權投票）
  const elementVotes: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  elementVotes[bearingElement] += 40;
  if (addressElement) elementVotes[addressElement] += 20;
  if (restaurantElement) elementVotes[restaurantElement] += 40;
  else elementVotes[bearingElement] += 20; // 無商業類型時，方位權重提升

  const dominantElement = (Object.entries(elementVotes).sort(([, a], [, b]) => b - a)[0][0]) as FiveElement;

  // 5. 計算匹配分數（取最高匹配的需補五行）
  let bestMatchScore = 0;
  let bestNeededElement = neededElements[0] || "土";
  for (const needed of neededElements) {
    const score = calculateElementMatch(dominantElement, needed);
    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestNeededElement = needed;
    }
  }

  // 6. 加入方位加成（若方位五行也匹配，額外加分）
  const bearingMatchScore = calculateElementMatch(bearingElement, bestNeededElement);
  const finalScore = Math.round(bestMatchScore * 0.7 + bearingMatchScore * 0.3);

  // 7. 決定匹配等級
  let matchLevel: FengShuiScore["matchLevel"];
  if (finalScore >= 85) matchLevel = "極旺";
  else if (finalScore >= 70) matchLevel = "旺";
  else if (finalScore >= 50) matchLevel = "平";
  else if (finalScore >= 30) matchLevel = "弱";
  else matchLevel = "忌";

  // 8. 生成描述文字
  const directionName = getDirectionName(bearing);
  const elementChinese: Record<FiveElement, string> = {
    木: "木", 火: "火", 土: "土", 金: "金", 水: "水"
  };

  const matchDescription = `${directionName}方（${bearingData.name}山・${elementChinese[bearingElement]}）` +
    (addressElement ? `・地名${elementChinese[addressElement]}氣` : "") +
    (restaurantElement ? `・${elementChinese[restaurantElement]}屬餐廳` : "");

  const recommendation = generateRecommendation(matchLevel, dominantElement, bestNeededElement, directionName);

  return {
    totalScore: finalScore,
    bearingElement,
    bearingMountain: bearingData.name,
    bearingDeg: Math.round(bearing),
    addressElement,
    restaurantElement,
    dominantElement,
    matchLevel,
    matchDescription,
    recommendation,
  };
}

function getDirectionName(bearing: number): string {
  const dirs = ["正北", "北偏東", "東北", "東偏北", "正東", "東偏南", "東南", "南偏東",
                "正南", "南偏西", "西南", "西偏南", "正西", "西偏北", "西北", "北偏西"];
  const index = Math.round(bearing / 22.5) % 16;
  return dirs[index];
}

function generateRecommendation(
  level: FengShuiScore["matchLevel"],
  dominant: FiveElement,
  needed: FiveElement,
  direction: string
): string {
  const elementDesc: Record<FiveElement, string> = {
    木: "木氣旺盛（生長、創新）",
    火: "火氣旺盛（熱情、能量）",
    土: "土氣旺盛（穩固、財富）",
    金: "金氣旺盛（決斷、收穫）",
    水: "水氣旺盛（流動、智慧）",
  };

  switch (level) {
    case "極旺":
      return `${direction}方${elementDesc[dominant]}，與今日補${needed}需求完美契合，強烈推薦前往`;
    case "旺":
      return `${direction}方${elementDesc[dominant]}，有助補充今日所需${needed}能量，適合前往`;
    case "平":
      return `${direction}方能量中性，對今日補${needed}無明顯加成，可依個人喜好選擇`;
    case "弱":
      return `${direction}方能量與今日需求相剋，建議優先考慮其他方位的餐廳`;
    case "忌":
      return `${direction}方能量與今日補${needed}需求相剋，不建議前往，可能消耗今日能量`;
  }
}

// ============================================================
// 今日財位方向轉換為五行
// ============================================================
/**
 * 將財位方向（如「東南」「正南」）轉換為對應的五行
 */
export function directionToElement(direction: string): FiveElement {
  const dirMap: Record<string, FiveElement> = {
    "正北": "水", "北": "水",
    "東北": "土", "艮": "土",
    "正東": "木", "東": "木",
    "東南": "木", "巽": "木",
    "正南": "火", "南": "火",
    "西南": "土", "坤": "土",
    "正西": "金", "西": "金",
    "西北": "金", "乾": "金",
  };
  for (const [key, element] of Object.entries(dirMap)) {
    if (direction.includes(key)) return element;
  }
  return "土"; // 預設
}
