import { useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapView } from "@/components/Map";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";

// 五行 → Google Maps 搜尋關鍵字（台灣在地化）
const ELEMENT_KEYWORDS: Record<string, { keywords: string[]; label: string; emoji: string; color: string }> = {
  土: {
    keywords: ["甜點", "米食", "台灣料理", "蛋糕甜食", "根莖類料理"],
    label: "補土（甜食/米食）",
    emoji: "🌍",
    color: "text-amber-400 border-amber-500/40 bg-amber-950/20",
  },
  金: {
    keywords: ["豆腐", "日式料理", "清淡料理", "白肉", "豆漿"],
    label: "補金（白色食物）",
    emoji: "⚪",
    color: "text-slate-300 border-slate-400/40 bg-slate-800/30",
  },
  火: {
    keywords: ["燒烤", "辛辣料理", "麻辣", "烤肉", "韓式料理"],
    label: "補火（辛辣/燒烤）",
    emoji: "🔥",
    color: "text-red-400 border-red-500/40 bg-red-950/20",
  },
  水: {
    keywords: ["海鮮", "湯品", "火鍋", "清湯", "壽司"],
    label: "補水（湯品/海鮮）",
    emoji: "🌊",
    color: "text-blue-400 border-blue-500/40 bg-blue-950/20",
  },
  木: {
    keywords: ["蔬食", "素食", "沙拉", "健康餐", "輕食"],
    label: "補木（蔬食/健康）",
    emoji: "🌿",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
  },
};

// 方向 → 方位角範圍（用於判斷餐廳是否在吉方）
const DIRECTION_BEARING: Record<string, { min: number; max: number; label: string }> = {
  "正東": { min: 67.5, max: 112.5, label: "正東" },
  "東南": { min: 112.5, max: 157.5, label: "東南" },
  "正南": { min: 157.5, max: 202.5, label: "正南" },
  "西南": { min: 202.5, max: 247.5, label: "西南" },
  "正西": { min: 247.5, max: 292.5, label: "正西" },
  "西北": { min: 292.5, max: 337.5, label: "西北" },
  "正北": { min: 337.5, max: 360, label: "正北（上）" },
  "東北": { min: 22.5, max: 67.5, label: "東北" },
};

// 計算兩點之間的方位角（0-360度，0=正北）
function calcBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// 判斷方位角是否在指定方向範圍內
function isInDirection(bearing: number, directionName: string): boolean {
  const dir = DIRECTION_BEARING[directionName];
  if (!dir) return false;
  // 正北特殊處理（跨越360/0度）
  if (directionName === "正北") {
    return bearing >= 337.5 || bearing < 22.5;
  }
  return bearing >= dir.min && bearing < dir.max;
}

// 計算命理匹配分數（1-5星）
function calcMatchScore(priority: number): number {
  if (priority === 1) return 5;
  if (priority === 2) return 4;
  return 3;
}

// Haversine 距離計算（公尺）
function calcDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── 風水分析（前端版，不依賴後端 API）────────────────────────────

const BEARING_ELEMENT_MAP = [
  { min: 337.5, max: 360,   element: "水", mountain: "壬" },
  { min: 0,     max: 7.5,   element: "水", mountain: "子" },
  { min: 7.5,   max: 22.5,  element: "水", mountain: "癸" },
  { min: 22.5,  max: 37.5,  element: "土", mountain: "丑" },
  { min: 37.5,  max: 52.5,  element: "土", mountain: "艮" },
  { min: 52.5,  max: 67.5,  element: "木", mountain: "寅" },
  { min: 67.5,  max: 82.5,  element: "木", mountain: "甲" },
  { min: 82.5,  max: 97.5,  element: "木", mountain: "卯" },
  { min: 97.5,  max: 112.5, element: "木", mountain: "乙" },
  { min: 112.5, max: 127.5, element: "土", mountain: "辰" },
  { min: 127.5, max: 142.5, element: "木", mountain: "巽" },
  { min: 142.5, max: 157.5, element: "火", mountain: "巳" },
  { min: 157.5, max: 172.5, element: "火", mountain: "丙" },
  { min: 172.5, max: 187.5, element: "火", mountain: "午" },
  { min: 187.5, max: 202.5, element: "火", mountain: "丁" },
  { min: 202.5, max: 217.5, element: "土", mountain: "未" },
  { min: 217.5, max: 232.5, element: "土", mountain: "坤" },
  { min: 232.5, max: 247.5, element: "金", mountain: "申" },
  { min: 247.5, max: 262.5, element: "金", mountain: "庚" },
  { min: 262.5, max: 277.5, element: "金", mountain: "酉" },
  { min: 277.5, max: 292.5, element: "金", mountain: "辛" },
  { min: 292.5, max: 307.5, element: "土", mountain: "戌" },
  { min: 307.5, max: 322.5, element: "金", mountain: "乾" },
  { min: 322.5, max: 337.5, element: "水", mountain: "亥" },
];

function getBearingElementLocal(bearing: number): { element: string; mountain: string } {
  const b = ((bearing % 360) + 360) % 360;
  if (b >= 337.5 || b < 7.5) return { element: "水", mountain: "子" };
  const entry = BEARING_ELEMENT_MAP.find((m) => b >= m.min && b < m.max);
  return entry ? { element: entry.element, mountain: entry.mountain } : { element: "土", mountain: "中" };
}

const NAME_ELEMENT_CHARS: Record<string, string> = {
  木: "木", 林: "木", 森: "木", 樹: "木", 桃: "木", 梅: "木", 柳: "木",
  松: "木", 竹: "木", 草: "木", 花: "木", 葉: "木", 茶: "木", 菜: "木",
  蔬: "木", 綠: "木", 青: "木", 春: "木", 東: "木", 甲: "木", 乙: "木",
  芳: "木", 苑: "木", 荷: "木", 蓮: "木", 蘭: "木", 橘: "木", 楓: "木",
  火: "火", 炎: "火", 焰: "火", 燈: "火", 燒: "火", 烤: "火", 炸: "火",
  日: "火", 陽: "火", 光: "火", 明: "火", 熱: "火", 南: "火", 丙: "火",
  丁: "火", 巳: "火", 午: "火", 紅: "火", 赤: "火", 朱: "火", 彩: "火",
  星: "火", 晶: "火", 暖: "火", 煌: "火", 輝: "火",
  土: "土", 地: "土", 山: "土", 岡: "土", 岩: "土", 石: "土", 坡: "土",
  城: "土", 鄉: "土", 里: "土", 村: "土", 田: "土", 農: "土", 穀: "土",
  黃: "土", 戊: "土", 己: "土", 辰: "土", 戌: "土", 丑: "土",
  未: "土", 坤: "土", 艮: "土", 中: "土", 央: "土", 原: "土",
  金: "金", 銀: "金", 鐵: "金", 鋼: "金", 銅: "金", 鑫: "金", 鎮: "金",
  刀: "金", 劍: "金", 鋒: "金", 利: "金", 鑽: "金", 珠: "金", 玉: "金",
  白: "金", 西: "金", 庚: "金", 辛: "金", 申: "金", 酉: "金", 乾: "金",
  水: "水", 海: "水", 河: "水", 江: "水", 湖: "水", 泉: "水", 溪: "水",
  流: "水", 波: "水", 洋: "水", 潮: "水", 漁: "水", 魚: "水", 蝦: "水",
  蟹: "水", 貝: "水", 冰: "水", 雪: "水", 北: "水", 壬: "水", 癸: "水",
  亥: "水", 子: "水", 黑: "水", 藍: "水", 深: "水", 清: "水", 涼: "水",
};

function analyzeNameElementLocal(name: string): string {
  const counts: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const char of name) {
    if (NAME_ELEMENT_CHARS[char]) counts[NAME_ELEMENT_CHARS[char]]++;
  }
  let max = 0, dominant = "土";
  for (const [el, cnt] of Object.entries(counts)) {
    if (cnt > max) { max = cnt; dominant = el; }
  }
  return dominant;
}

const BUSINESS_KEYWORDS_FS: Array<{ keywords: string[]; element: string }> = [
  { element: "火", keywords: ["燒烤", "烤肉", "麻辣", "辣", "韓式", "炭烤", "鐵板", "熱炒", "炸", "煎", "鍋貼", "薑母鴨", "羊肉爐", "麻辣鍋", "咖哩", "印度", "泰式", "串燒"] },
  { element: "土", keywords: ["甜點", "蛋糕", "甜食", "糕點", "麵包", "烘焙", "珍珠奶茶", "台灣", "台式", "米食", "飯糰", "便當", "自助餐", "滷肉飯", "牛肉麵", "小吃", "夜市", "傳統", "古早味"] },
  { element: "金", keywords: ["日式", "壽司", "生魚片", "豆腐", "清淡", "白肉", "雞肉", "沙拉", "輕食", "健康", "有機", "素食", "蔬食", "豆漿", "清蒸", "白切", "涼拌", "拉麵", "烏龍"] },
  { element: "水", keywords: ["海鮮", "魚", "蝦", "蟹", "貝", "生蠔", "龍蝦", "湯", "火鍋", "涮涮鍋", "清湯", "骨頭湯", "雞湯", "魚湯", "粥", "湯麵", "冷麵", "冰品", "冷飲"] },
  { element: "木", keywords: ["蔬食", "素食", "沙拉", "健康", "輕食", "有機", "生機", "蔬果", "蔬菜", "綠色", "植物", "全素", "純素", "養生", "纖維", "低卡"] },
];

function analyzeBusinessElementLocal(name: string, keyword: string): string {
  const combined = `${name} ${keyword}`;
  const scores: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const { keywords, element } of BUSINESS_KEYWORDS_FS) {
    for (const kw of keywords) {
      if (combined.includes(kw)) scores[element]++;
    }
  }
  let max = 0, dominant = "土";
  for (const [el, cnt] of Object.entries(scores)) {
    if (cnt > max) { max = cnt; dominant = el; }
  }
  return dominant;
}

// 五行匹配分數 — 依用戶喜用神動態計算（不再硬編碼）
// 第1喜神=100, 第2喜神=80, 第3喜神=60, 中性=40, 第1忌神=20, 第2忌神=10
function buildElementMatchScore(
  favorableElements: string[],
  unfavorableElements: string[]
): Record<string, number> {
  const ALL_ELEMENTS = ["木", "火", "土", "金", "水"];
  const FAVORABLE_SCORES = [100, 80, 60];
  const UNFAVORABLE_SCORES = [20, 10];
  const scores: Record<string, number> = {};
  for (const el of ALL_ELEMENTS) {
    const favIdx = favorableElements.indexOf(el);
    const unfavIdx = unfavorableElements.indexOf(el);
    if (favIdx >= 0) {
      scores[el] = FAVORABLE_SCORES[favIdx] ?? 50;
    } else if (unfavIdx >= 0) {
      scores[el] = UNFAVORABLE_SCORES[unfavIdx] ?? 10;
    } else {
      scores[el] = 40; // 中性
    }
  }
  return scores;
}
// 預設分數（未傳入命格時的備用值，以蘇先生命格為基準）
const DEFAULT_ELEMENT_MATCH_SCORE: Record<string, number> = {
  火: 100, 土: 80, 金: 60, 木: 20, 水: 10,
};

const GRADE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  大吉: { label: "大吉", color: "text-amber-300 bg-amber-500/15 border-amber-500/40", emoji: "✦" },
  吉:   { label: "吉",   color: "text-green-400 bg-green-500/10 border-green-500/30",  emoji: "◎" },
  平:   { label: "平",   color: "text-white/40 bg-white/5 border-white/10",            emoji: "○" },
  凶:   { label: "凶",   color: "text-orange-400 bg-orange-500/10 border-orange-500/30", emoji: "△" },
  大凶: { label: "大凶", color: "text-red-400 bg-red-500/10 border-red-500/30",        emoji: "✕" },
};

interface FengShuiResult {
  totalScore: number;
  grade: "大吉" | "吉" | "平" | "凶" | "大凶";
  bearingElement: string;
  bearingMountain: string;
  bearingDeg: number;
  nameElement: string;
  businessElement: string;
  dominantElement: string;
}

function calcFengShui(
  userLat: number, userLng: number,
  restLat: number, restLng: number,
  name: string, address: string, keyword: string,
  elementMatchScore: Record<string, number> = DEFAULT_ELEMENT_MATCH_SCORE
): FengShuiResult {
  const dLng = (restLng - userLng) * Math.PI / 180;
  const lat1 = userLat * Math.PI / 180;
  const lat2 = restLat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearingDeg = ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  const { element: bearingEl, mountain } = getBearingElementLocal(bearingDeg);
  const nameEl = analyzeNameElementLocal(`${name} ${address}`);
  const businessEl = analyzeBusinessElementLocal(name, keyword);
  const bearingScore = elementMatchScore[bearingEl] ?? 50;
  const nameScore = elementMatchScore[nameEl] ?? 50;
  const businessScore = elementMatchScore[businessEl] ?? 50;
  const totalScore = Math.round(bearingScore * 0.40 + nameScore * 0.20 + businessScore * 0.40);

  const contributions = [
    { el: bearingEl, val: bearingScore * 0.40 },
    { el: nameEl,    val: nameScore * 0.20 },
    { el: businessEl, val: businessScore * 0.40 },
  ].sort((a, b) => b.val - a.val);
  const dominantElement = contributions[0].el;

  let grade: FengShuiResult["grade"];
  if (totalScore >= 85) grade = "大吉";
  else if (totalScore >= 70) grade = "吉";
  else if (totalScore >= 50) grade = "平";
  else if (totalScore >= 35) grade = "凶";
  else grade = "大凶";

  return {
    totalScore, grade,
    bearingElement: bearingEl, bearingMountain: mountain, bearingDeg: Math.round(bearingDeg),
    nameElement: nameEl, businessElement: businessEl, dominantElement,
  };
}

// 分類標籤定義 (Google Places API includedTypes 對應)
const CATEGORY_TAGS: Array<{
  id: string;
  label: string;
  emoji: string;
  types: string[]; // Google Places API includedTypes
  textSuffix?: string; // 附加到 textQuery 的後綴
}> = [
  { id: "all", label: "全部", emoji: "🍽️", types: ["restaurant"] },
  { id: "local_snack", label: "小吃", emoji: "🥢", types: ["restaurant"], textSuffix: "小吃" },
  { id: "brunch", label: "早午餐", emoji: "🥞", types: ["breakfast_restaurant"], textSuffix: "早午餐" },
  { id: "dinner", label: "晚餐", emoji: "🌙", types: ["restaurant"], textSuffix: "晚餐" },
  { id: "afternoon_tea", label: "下午茶", emoji: "🫖", types: ["cafe"], textSuffix: "下午茶" },
  { id: "cafe", label: "咖啡廳", emoji: "☕", types: ["cafe", "coffee_shop"] },
  { id: "bar", label: "酒吧", emoji: "🍺", types: ["bar", "pub"] },
  { id: "pet_friendly", label: "寵物友善", emoji: "🐾", types: ["restaurant"], textSuffix: "寵物友善" },
  { id: "hotpot", label: "火鍋", emoji: "🫕", types: ["restaurant"], textSuffix: "火鍋" },
  { id: "bbq", label: "燒烤", emoji: "🔥", types: ["restaurant"], textSuffix: "燒烤" },
  { id: "sushi", label: "日式料理", emoji: "🍱", types: ["japanese_restaurant"] },
  { id: "korean", label: "韓式料理", emoji: "🥘", types: ["korean_restaurant"] },
  { id: "vegetarian", label: "蔬食/素食", emoji: "🥗", types: ["vegan_restaurant", "vegetarian_restaurant"] },
  { id: "dessert", label: "甜點", emoji: "🍰", types: ["dessert_restaurant", "dessert_shop"] },
  { id: "fast_food", label: "速食", emoji: "🍔", types: ["fast_food_restaurant"] },
  { id: "noodle", label: "麵食", emoji: "🍜", types: ["noodle_restaurant"] },
  { id: "seafood", label: "海鮮", emoji: "🦞", types: ["seafood_restaurant"] },
  { id: "chinese", label: "中式料理", emoji: "🥟", types: ["chinese_restaurant"] },
  { id: "western", label: "西式料理", emoji: "🍝", types: ["american_restaurant", "italian_restaurant", "french_restaurant"] },
];

// 價格標籤定義
const PRICE_TAGS: Array<{ id: number; label: string; desc: string }> = [
  { id: 1, label: "$", desc: "平價" },
  { id: 2, label: "$$", desc: "中價" },
  { id: 3, label: "$$$", desc: "高價" },
  { id: 4, label: "$$$$", desc: "奢華" },
];

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number; // 1-4 對應 $-$$$$
  distance?: number;
  bearing?: number;
  element: string;
  matchScore: number;
  keyword: string;
  placeId: string;
  isAuspicious: boolean; // 是否在吉方
  lat?: number;
  lng?: number;
  fengShui?: FengShuiResult;
  categoryId?: string; // 搜尋時使用的分類
}

interface Props {
  supplements: Array<{ element: string; priority: number; foods: string[] }>;
  todayDirections?: { xi: string; fu: string; cai: string }; // 今日吉方
  /** 用戶喜用神（中文），例如 ["火", "土", "金"] */
  favorableElements?: string[];
  /** 用戶忌神（中文），例如 ["水", "木"] */
  unfavorableElements?: string[];
}
export function NearbyRestaurants({ supplements, todayDirections, favorableElements, unfavorableElements }: Props) {
  // 依用戶命格動態計算五行匹配分數
  const elementMatchScore = useMemo(
    () => favorableElements && unfavorableElements
      ? buildElementMatchScore(favorableElements, unfavorableElements)
      : DEFAULT_ELEMENT_MATCH_SCORE,
    [favorableElements, unfavorableElements]
  );
  const [phase, setPhase] = useState<"idle" | "locating" | "searching" | "done" | "error">("idle");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterAuspicious, setFilterAuspicious] = useState(false);
  const [sortMode, setSortMode] = useState<"distance" | "fengshui">("distance");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState(2000);
  const [minFengShuiScore, setMinFengShuiScore] = useState(0);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  // 分類多選（空陣列 = 全部）
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  // 價格多選（空陣列 = 全部）
  const [filterPriceLevels, setFilterPriceLevels] = useState<number[]>([]);
  // 分享狀態
  const [sharingId, setSharingId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleSearch = useCallback(() => {
    setPhase("locating");
    setRestaurants([]);
    setErrorMsg("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setPhase("searching");
        setShowMap(true);
      },
      (err) => {
        setPhase("error");
        setErrorMsg(`無法取得定位：${err.message}。請確認已允許位置存取。`);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleMapReady = useCallback(
    async (map: google.maps.Map) => {
      mapRef.current = map;
      if (!userLocation) return;

      try {
        const results: Restaurant[] = [];
        const seen = new Set<string>();
        // 取得當前選中的分類設定（支援多選）
        const activeCategoryTags = filterCategories.length > 0
          ? CATEGORY_TAGS.filter((c) => filterCategories.includes(c.id))
          : [];
        // 單選時使用第一個分類（用於 textSuffix 和 includedType）
        const activeCategoryTag = activeCategoryTags.length === 1 ? activeCategoryTags[0] : null;

        // 依優先級搜尋前兩個需補五行，每個五行搜尋多個關鍵字以確保至少8筆
        const topSupplements = supplements.slice(0, 2);

        for (const sup of topSupplements) {
          const info = ELEMENT_KEYWORDS[sup.element];
          if (!info) continue;

          // 搜尋前3個關鍵字，確保結果足夠
          const keywordsToSearch = info.keywords.slice(0, 3);

          for (const keyword of keywordsToSearch) {
            if (results.length >= 12) break; // 最多搜尋12筆

            const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
            // 建立搜尋文字：若有分類後綴則加上
            const searchText = activeCategoryTag?.textSuffix
              ? `${keyword} ${activeCategoryTag.textSuffix}`
              : `${keyword} 餐廳`;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const request: any = {
              textQuery: searchText,
              fields: ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "location", "priceLevel"],
              locationBias: {
                center: userLocation,
                radius: 2000,
              },
              maxResultCount: 8,
              language: "zh-TW",
            };
            // 加入分類 types 篩選（若有選擇特定分類）
            if (activeCategoryTag && activeCategoryTag.id !== "all" && activeCategoryTag.types.length > 0) {
              request.includedType = activeCategoryTag.types[0];
            }

            try {
              const { places } = await Place.searchByText(request);

              for (const place of places) {
                if (!place.id || seen.has(place.id)) continue;
                seen.add(place.id);

                const lat2 = place.location?.lat();
                const lng2 = place.location?.lng();
                let distance: number | undefined;
                let bearing: number | undefined;
                let isAuspicious = false;

                let fengShui: FengShuiResult | undefined;
                if (lat2 !== undefined && lng2 !== undefined) {
                  const to = { lat: lat2, lng: lng2 };
                  distance = calcDistance(userLocation, to);
                  bearing = calcBearing(userLocation, to);
                  // 判斷是否在今日財神方（吉方）
                  if (todayDirections) {
                    isAuspicious =
                      isInDirection(bearing, todayDirections.cai) ||
                      isInDirection(bearing, todayDirections.xi);
                  }
                  // 計算風水地塊三維度分析（使用用戶命格動態分數）
                  fengShui = calcFengShui(
                    userLocation.lat, userLocation.lng,
                    lat2, lng2,
                    place.displayName ?? "",
                    place.formattedAddress ?? "",
                    keyword,
                    elementMatchScore
                  );
                }
                // 取得 priceLevel（Google Places API 回傳 1-4）
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rawPriceLevel = (place as any).priceLevel;
                const priceLevel = typeof rawPriceLevel === "number" ? rawPriceLevel : undefined;
                results.push({
                  id: place.id,
                  name: place.displayName ?? "未知餐廳",
                  address: place.formattedAddress ?? "",
                  rating: place.rating ?? 0,
                  userRatingsTotal: place.userRatingCount ?? 0,
                  priceLevel,
                  distance,
                  bearing,
                  element: sup.element,
                  matchScore: calcMatchScore(sup.priority),
                  keyword,
                  placeId: place.id,
                  isAuspicious,
                  lat: lat2,
                  lng: lng2,
                  fengShui,
                  categoryId: activeCategoryTag?.id,
                });
              }
            } catch {
              // 單個關鍵字搜尋失敗，繼續下一個
            }
          }
        }

        // 依距離從近到遠排序（主要排序），吉方優先（次要排序）
        results.sort((a, b) => {
          // 吉方優先（同距離段內）
          if (a.isAuspicious !== b.isAuspicious) {
            const distA = a.distance ?? 9999;
            const distB = b.distance ?? 9999;
            // 只有在距離差距不超過500m時，才讓吉方優先
            if (Math.abs(distA - distB) < 500) {
              return a.isAuspicious ? -1 : 1;
            }
          }
          // 主要按距離排序
          return (a.distance ?? 9999) - (b.distance ?? 9999);
        });

        setRestaurants(results.slice(0, 12)); // 最多顯示12筆（至少8筆）
        setPhase("done");
      } catch (err) {
        console.error(err);
        setPhase("error");
        setErrorMsg("搜尋餐廳時發生錯誤，請稍後再試。");
      }
    },
    [userLocation, supplements, todayDirections, elementMatchScore, filterCategories]
  );

  const topElements = supplements.slice(0, 2).map((s) => s.element);
  const displayedRestaurants = useMemo(() => {
    let list = [...restaurants];
    if (filterAuspicious) list = list.filter((r) => r.isAuspicious);
    if (maxDistance < 2000) list = list.filter((r) => (r.distance ?? 9999) <= maxDistance);
    if (minFengShuiScore > 0) list = list.filter((r) => (r.fengShui?.totalScore ?? 0) >= minFengShuiScore);
    if (filterElement) list = list.filter((r) => r.element === filterElement);
    // 價格篩選（多選）
    if (filterPriceLevels.length > 0) {
      list = list.filter((r) => r.priceLevel !== undefined && filterPriceLevels.includes(r.priceLevel));
    }
    if (sortMode === "fengshui") {
      list = list.sort((a, b) => (b.fengShui?.totalScore ?? 0) - (a.fengShui?.totalScore ?? 0));
    }
    return list;
  }, [restaurants, filterAuspicious, sortMode, maxDistance, minFengShuiScore, filterElement, filterPriceLevels]);
  const activeFilterCount = [
    filterAuspicious,
    maxDistance < 2000,
    minFengShuiScore > 0,
    !!filterElement,
    filterCategories.length > 0,
    filterPriceLevels.length > 0,
  ].filter(Boolean).length;
  // 切換分類選擇（多選模式：點「全部」清空，點其他分類加入/移除）
  const toggleCategory = (id: string) => {
    if (id === "all") { setFilterCategories([]); return; }
    setFilterCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };
  // 切換價格選擇（多選）
  const togglePrice = (id: number) => {
    setFilterPriceLevels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };
  // 分享餐廳
  const handleShare = async (r: Restaurant) => {
    setSharingId(r.id);
    const fs = r.fengShui;
    const grade = fs ? GRADE_CONFIG[fs.grade] : null;
    const priceStr = r.priceLevel ? "$".repeat(r.priceLevel) : "";
    const text = [
      `🏮 天命共振・今日補運餐廳推薦`,
      ``,
      `📍 ${r.name}`,
      priceStr ? `💰 價位：${priceStr}` : "",
      r.distance !== undefined ? `📏 距離：${r.distance < 1000 ? r.distance + "m" : (r.distance/1000).toFixed(1) + "km"}` : "",
      r.rating > 0 ? `⭐ 評分：${r.rating.toFixed(1)}` : "",
      fs ? `🧭 補運指數：${fs.totalScore}/100 ${grade ? grade.emoji + grade.label : ""}` : "",
      r.isAuspicious ? `✨ 位於今日吉方` : "",
      ``,
      `#天命共振 #補運餐廳 #今日運勢`,
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "今日補運餐廳", text });
      } else {
        await navigator.clipboard.writeText(text);
        alert("已複製到剪貼板！");
      }
    } catch { /* 用戶取消 */ }
    setSharingId(null);
  };

  // 建立正確的 Google Maps 搜尋 URL
  const buildMapsUrl = (r: Restaurant): string => {
    if (r.lat !== undefined && r.lng !== undefined) {
      // 使用座標 + 名稱搜尋（最可靠）
      const query = encodeURIComponent(r.name);
      return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${r.placeId}`;
    }
    // 備用：用名稱搜尋
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}`;
  };

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/3 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">📍</span>
          <span className="text-sm font-semibold text-white/80">附近命理推薦餐廳</span>
          {topElements.length > 0 && (
            <div className="flex gap-1">
              {topElements.map((el) => (
                <span key={el} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ELEMENT_KEYWORDS[el]?.color ?? ''}`}>
                  {ELEMENT_KEYWORDS[el]?.emoji} 補{el}
                </span>
              ))}
            </div>
          )}
        </div>
        {phase === "idle" && (
          <button
            onClick={handleSearch}
            className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg transition-all flex-shrink-0"
          >
            🔍 尋找附近餐廳
          </button>
        )}
        {(phase === "locating" || phase === "searching") && (
          <span className="text-xs text-white/40 animate-pulse flex-shrink-0">
            {phase === "locating" ? "📡 取得定位中..." : "🔍 搜尋餐廳中..."}
          </span>
        )}
        {phase === "done" && (
          <button
            onClick={() => { setPhase("idle"); setShowMap(false); setRestaurants([]); setFilterAuspicious(false); setSortMode("distance"); setExpandedId(null); }}
            className="text-xs text-white/30 hover:text-white/50 transition-colors flex-shrink-0"
          >
            重新搜尋
          </button>
        )}
      </div>

      {/* 進階篩選列（有結果時顯示） */}
      {phase === "done" && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/[0.02] flex-wrap">
          {todayDirections && (
            <>
              <span className="text-[10px] text-amber-300">💰 財神：{todayDirections.cai}</span>
              <span className="text-[10px] text-rose-300">🌸 喜神：{todayDirections.xi}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSortMode(sortMode === "distance" ? "fengshui" : "distance")}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                sortMode === "fengshui"
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              {sortMode === "fengshui" ? "🧭 風水優先" : "📏 距離優先"}
            </button>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <button className={`relative flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                  activeFilterCount > 0
                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}>
                  <SlidersHorizontal className="w-3 h-3" />
                  篩選
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-[8px] flex items-center justify-center text-white">{activeFilterCount}</span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-[#0f0f1a] border-t border-white/10 text-white rounded-t-2xl pb-8">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-white text-base">進階篩選</SheetTitle>
                </SheetHeader>
                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                  {/* 分類標籤多選 */}
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2.5">🍽️ 餐廳分類（可多選）</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_TAGS.map((cat) => {
                        const isActive = cat.id === "all" ? filterCategories.length === 0 : filterCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleCategory(cat.id)}
                            className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                              isActive
                                ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                                : "bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70"
                            }`}
                          >
                            {cat.emoji} {cat.label}
                          </button>
                        );
                      })}
                    </div>
                    {filterCategories.length > 0 && (
                      <p className="text-[10px] text-amber-400/60 mt-1.5">
                        ❖ 已選 {filterCategories.length} 種分類，重新搜尋後生效（可多選）
                      </p>
                    )}
                  </div>
                  {/* 價格標籤多選 */}
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2.5">💰 價格區間（可多選）</p>
                    <div className="flex gap-2">
                      {PRICE_TAGS.map((pt) => {
                        const isActive = filterPriceLevels.includes(pt.id);
                        return (
                          <button
                            key={pt.id}
                            onClick={() => togglePrice(pt.id)}
                            className={`flex-1 py-2 rounded-xl border text-center transition-all ${
                              isActive
                                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                                : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                            }`}
                          >
                            <div className="text-sm font-bold">{pt.label}</div>
                            <div className="text-[9px] text-white/40 mt-0.5">{pt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                    {filterPriceLevels.length > 0 && (
                      <p className="text-[10px] text-white/40 mt-1.5">
                        ⚠️ 部分餐廳無價格資料，可能不會出現在篩選結果中
                      </p>
                    )}
                  </div>
                  {/* 距離滑桿 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">最大距離</span>
                      <span className="text-sm font-bold text-white">{maxDistance < 2000 ? `${maxDistance}m` : "不限"}</span>
                    </div>
                    <Slider min={200} max={2000} step={100} value={[maxDistance]} onValueChange={([v]) => setMaxDistance(v)} className="w-full" />
                    <div className="flex justify-between text-[10px] text-white/30 mt-1"><span>200m</span><span>2km</span></div>
                  </div>
                  {/* 補運分數滑桿 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">最低補運分數</span>
                      <span className="text-sm font-bold text-white">{minFengShuiScore > 0 ? `≥${minFengShuiScore}分` : "不限"}</span>
                    </div>
                    <Slider min={0} max={90} step={10} value={[minFengShuiScore]} onValueChange={([v]) => setMinFengShuiScore(v)} className="w-full" />
                    <div className="flex justify-between text-[10px] text-white/30 mt-1"><span>不限</span><span>大吉(≥85)</span></div>
                  </div>
                  {/* 五行分類 */}
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2">☯️ 五行屬性</p>
                    <div className="flex flex-wrap gap-2">
                      {[null, "火", "土", "金", "木", "水"].map((el) => (
                        <button key={el ?? "all"} onClick={() => setFilterElement(el)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            filterElement === el ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-white/50"
                          }`}>
                          {el ? `${ELEMENT_KEYWORDS[el]?.emoji} ${el}系` : "全部"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 吉方開關 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/70">僅顯示吉方餐廳</span>
                    <button onClick={() => setFilterAuspicious(!filterAuspicious)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${filterAuspicious ? "bg-amber-500" : "bg-white/20"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${filterAuspicious ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={() => {
                      setFilterAuspicious(false);
                      setMaxDistance(2000);
                      setMinFengShuiScore(0);
                      setFilterElement(null);
                      setFilterCategories([]);
                      setFilterPriceLevels([]);
                    }}
                      className="w-full py-2 text-sm text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors">
                      重設所有篩選
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      {/* 錯誤訊息 */}
      {phase === "error" && (
        <div className="px-4 py-3 text-xs text-red-400">{errorMsg}</div>
      )}

      {/* 地圖（隱藏但需要初始化 Places API） */}
      {showMap && userLocation && (
        <div className="h-0 overflow-hidden">
          <MapView
            initialCenter={userLocation}
            initialZoom={15}
            onMapReady={handleMapReady}
          />
        </div>
      )}

      {/* 餐廳清單 - 大型視覺卡片 */}
      {phase === "done" && displayedRestaurants.length > 0 && (
        <div className="p-3 space-y-3">
          <AnimatePresence>
          {displayedRestaurants.map((r, i) => {
            const info = ELEMENT_KEYWORDS[r.element];
            const mapsUrl = buildMapsUrl(r);
            const fs = r.fengShui;
            const gradeConfig = fs ? GRADE_CONFIG[fs.grade] : null;
            const isExpanded = expandedId === r.id;
            const scoreColor = fs
              ? fs.totalScore >= 85 ? "#f59e0b" : fs.totalScore >= 70 ? "#10b981" : fs.totalScore >= 50 ? "#94a3b8" : "#f97316"
              : "#94a3b8";
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border bg-white/[0.03] overflow-hidden ${
                  r.isAuspicious ? "border-amber-500/30" : "border-white/8"
                }`}
              >
                {/* 卡片頂部：名稱 + 分數 */}
                <div className="flex items-start gap-3 p-4">
                  {/* 補運指數圓形分數 */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                      <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                      <circle cx="24" cy="24" r="19" fill="none" stroke={scoreColor} strokeWidth="4"
                        strokeDasharray={`${(fs?.totalScore ?? 0) * 1.194} 119.4`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{fs?.totalScore ?? "-"}</span>
                    </div>
                  </div>
                  {/* 名稱與標籤 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white/90 truncate max-w-[160px]">{r.name}</span>
                      {r.isAuspicious && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-400 border-amber-500/30">吉方</Badge>
                      )}
                      {gradeConfig && (
                        <Badge className={`text-[9px] px-1.5 py-0 border ${gradeConfig.color}`}>
                          {gradeConfig.emoji} {gradeConfig.label}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {info && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${info.color}`}>
                          {info.emoji} {info.label}
                        </span>
                      )}
                      {r.rating > 0 && <span className="text-[10px] text-white/40">⭐ {r.rating.toFixed(1)}</span>}
                      {r.distance !== undefined && (
                        <span className="text-[10px] text-white/30">📏 {r.distance < 1000 ? `${r.distance}m` : `${(r.distance / 1000).toFixed(1)}km`}</span>
                      )}
                    </div>
                    {r.address && <p className="text-[10px] text-white/25 mt-0.5 truncate">{r.address}</p>}
                  </div>
                </div>
                {/* 補運指數進度條 */}
                {fs && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/40">補運指數</span>
                      <span className="text-[10px] font-bold" style={{ color: scoreColor }}>{fs.totalScore}/100</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${fs.totalScore}%`, background: scoreColor }} />
                    </div>
                  </div>
                )}
                {/* 操作列 */}
                <div className="flex items-center gap-2 px-4 pb-3">
                  {fs && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="text-[10px] text-white/40 hover:text-white/60 transition-colors border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg"
                    >
                      {isExpanded ? "收起分析 ↑" : "🧭 三維分析 ↓"}
                    </button>
                  )}
                  {/* 價格標籤 */}
                  {r.priceLevel && (
                    <span className="text-[10px] text-emerald-400/70 border border-emerald-500/20 px-2 py-1 rounded-lg bg-emerald-500/5">
                      {"$".repeat(r.priceLevel)}
                    </span>
                  )}
                  {/* 分享按鈕 */}
                  <button
                    onClick={() => handleShare(r)}
                    disabled={sharingId === r.id}
                    className="text-[10px] text-white/30 hover:text-white/50 transition-colors border border-white/8 hover:border-white/15 px-2.5 py-1 rounded-lg"
                    title="分享此餐廳"
                  >
                    {sharingId === r.id ? "⏳" : "↗ 分享"}
                  </button>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-[10px] text-blue-400/70 hover:text-blue-300 transition-colors border border-blue-500/20 hover:border-blue-400/40 px-3 py-1 rounded-lg bg-blue-500/5 hover:bg-blue-500/10">
                    在地圖開啟 →
                  </a>
                </div>
                {/* 風水三維度詳情展開 */}
                <AnimatePresence>
                {isExpanded && fs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-4 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <p className="text-[10px] font-semibold text-white/50">🧭 風水地塊三維度分析</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                          <div className="text-[9px] text-white/40 mb-0.5">方位（40%）</div>
                          <div className="text-xs font-bold text-white/70">{fs.bearingMountain}山</div>
                          <div className={`text-[9px] mt-0.5 ${ELEMENT_KEYWORDS[fs.bearingElement]?.color?.split(' ')[0] ?? 'text-white/40'}`}>
                            {fs.bearingElement}氣 {fs.bearingDeg}°
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                          <div className="text-[9px] text-white/40 mb-0.5">地名（20%）</div>
                          <div className="text-xs font-bold text-white/70">字根</div>
                          <div className={`text-[9px] mt-0.5 ${ELEMENT_KEYWORDS[fs.nameElement]?.color?.split(' ')[0] ?? 'text-white/40'}`}>
                            {fs.nameElement}屬
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                          <div className="text-[9px] text-white/40 mb-0.5">類型（40%）</div>
                          <div className="text-xs font-bold text-white/70">料理</div>
                          <div className={`text-[9px] mt-0.5 ${ELEMENT_KEYWORDS[fs.businessElement]?.color?.split(' ')[0] ?? 'text-white/40'}`}>
                            {fs.businessElement}屬
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/8">
                        <span className="text-[10px] text-white/40">
                          主導五行：<span className={`font-semibold ml-1 ${ELEMENT_KEYWORDS[fs.dominantElement]?.color?.split(' ')[0] ?? 'text-white/60'}`}>{fs.dominantElement}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${gradeConfig?.color ?? ''}`}>
                          {gradeConfig?.emoji} {fs.grade} {fs.totalScore}/100
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}

      {phase === "done" && displayedRestaurants.length === 0 && (
        <div className="px-4 py-4 text-xs text-white/40 text-center">
          {activeFilterCount > 0
            ? "目前篩選條件下無結果，請調整篩選設定。"
            : "附近 2km 內未找到符合命理的餐廳，請嘗試重新搜尋。"}
        </div>
      )}

      {/* 說明文字 */}
      {phase === "idle" && (
        <div className="px-4 py-3 text-[10px] text-white/25 leading-relaxed">
          依今日五行缺乏能量，推薦附近命理相符的餐廳。清單依距離由近到遠排序，可開啟「吉方優先」篩選今日財神方的餐廳。點擊「尋找附近餐廳」後需允許位置存取。
        </div>
      )}
    </div>
  );
}
