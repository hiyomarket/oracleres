/**
 * 飲食羅盤 - 附近命理推薦餐廳
 * 升級版：互動地圖標記（顏色依補運等級）、三維加權顯示、天氣五行加成
 */
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { MapView } from "@/components/Map";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Map, List } from "lucide-react";

// 五行 → Google Maps 搜尋關鍵字（台灣在地化）
const ELEMENT_KEYWORDS: Record<string, { keywords: string[]; label: string; emoji: string; color: string; mapColor: string }> = {
  土: {
    keywords: ["甜點", "米食", "台灣料理", "蛋糕甜食", "根莖類料理"],
    label: "補土（甜食/米食）",
    emoji: "🌍",
    color: "text-amber-400 border-amber-500/40 bg-amber-950/20",
    mapColor: "#f59e0b",
  },
  金: {
    keywords: ["豆腐", "日式料理", "清淡料理", "白肉", "豆漿"],
    label: "補金（白色食物）",
    emoji: "⚪",
    color: "text-slate-300 border-slate-400/40 bg-slate-800/30",
    mapColor: "#94a3b8",
  },
  火: {
    keywords: ["燒烤", "辛辣料理", "麻辣", "烤肉", "韓式料理"],
    label: "補火（辛辣/燒烤）",
    emoji: "🔥",
    color: "text-red-400 border-red-500/40 bg-red-950/20",
    mapColor: "#ef4444",
  },
  水: {
    keywords: ["海鮮", "湯品", "火鍋", "清湯", "壽司"],
    label: "補水（湯品/海鮮）",
    emoji: "🌊",
    color: "text-blue-400 border-blue-500/40 bg-blue-950/20",
    mapColor: "#3b82f6",
  },
  木: {
    keywords: ["蔬食", "素食", "沙拉", "健康餐", "輕食"],
    label: "補木（蔬食/健康）",
    emoji: "🌿",
    color: "text-emerald-400 border-emerald-500/40 bg-emerald-950/20",
    mapColor: "#10b981",
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
// 預設分數（未傳入命格時的備用值）
const DEFAULT_ELEMENT_MATCH_SCORE: Record<string, number> = {
  火: 100, 土: 80, 金: 60, 木: 20, 水: 10,
};

const GRADE_CONFIG: Record<string, { label: string; color: string; emoji: string; markerColor: string }> = {
  大吉: { label: "大吉", color: "text-amber-300 bg-amber-500/15 border-amber-500/40", emoji: "✦", markerColor: "#f59e0b" },
  吉:   { label: "吉",   color: "text-green-400 bg-green-500/10 border-green-500/30",  emoji: "◎", markerColor: "#10b981" },
  平:   { label: "平",   color: "text-white/40 bg-white/5 border-white/10",            emoji: "○", markerColor: "#94a3b8" },
  凶:   { label: "凶",   color: "text-orange-400 bg-orange-500/10 border-orange-500/30", emoji: "△", markerColor: "#f97316" },
  大凶: { label: "大凶", color: "text-red-400 bg-red-500/10 border-red-500/30",        emoji: "✕", markerColor: "#ef4444" },
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
  elementMatchScore: Record<string, number> = DEFAULT_ELEMENT_MATCH_SCORE,
  weatherEl?: string
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

  // 天氣五行加成：若天氣主導五行與補運五行相符，給予加成
  let weatherBonus = 0;
  if (weatherEl) {
    const weatherScore = elementMatchScore[weatherEl] ?? 50;
    // 天氣五行加成 = 天氣五行匹配分數的 20% 折算後加成（最多 +10 分）
    weatherBonus = Math.round((weatherScore - 50) * 0.1);
  }

  // 三維加權（方位40%+地名20%+類型40%）+ 天氣加成
  const baseScore = Math.round(bearingScore * 0.40 + nameScore * 0.20 + businessScore * 0.40);
  const totalScore = Math.max(5, Math.min(100, baseScore + weatherBonus));

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
  types: string[];
  textSuffix?: string;
}> = [
  { id: "all", label: "全部", emoji: "🍽️", types: ["restaurant"] },
  { id: "local_snack", label: "小吃", emoji: "🥢", types: ["restaurant"], textSuffix: "小吃" },
  { id: "brunch", label: "早午餐", emoji: "🥞", types: ["breakfast_restaurant"], textSuffix: "早午餐" },
  { id: "cafe", label: "咖啡廳", emoji: "☕", types: ["cafe"] },
  { id: "afternoon_tea", label: "下午茶", emoji: "🫖", types: ["cafe"], textSuffix: "下午茶" },
  { id: "hotpot", label: "火鍋", emoji: "🫕", types: ["restaurant"], textSuffix: "火鍋" },
  { id: "bbq", label: "燒烤", emoji: "🔥", types: ["restaurant"], textSuffix: "燒烤" },
  { id: "sushi", label: "日式料理", emoji: "🍱", types: ["japanese_restaurant"] },
  { id: "korean", label: "韓式料理", emoji: "🥘", types: ["korean_restaurant"] },
  { id: "chinese", label: "中式料理", emoji: "🥟", types: ["chinese_restaurant"] },
  { id: "western", label: "西式料理", emoji: "🍝", types: ["restaurant"], textSuffix: "西式餐廳" },
  { id: "noodle", label: "麵食", emoji: "🍜", types: ["noodle_restaurant"] },
  { id: "seafood", label: "海鮮", emoji: "🦞", types: ["seafood_restaurant"] },
  { id: "dessert", label: "甜點", emoji: "🍰", types: ["dessert_restaurant"] },
  { id: "vegetarian", label: "素食", emoji: "🥗", types: ["restaurant"], textSuffix: "素食餐廳" },
  { id: "fast_food", label: "速食", emoji: "🍔", types: ["restaurant"], textSuffix: "連鎖快餐" },
  { id: "bar", label: "酒吧", emoji: "🍺", types: ["bar"] },
  { id: "pet_friendly", label: "寵物友善", emoji: "🐾", types: ["restaurant"], textSuffix: "寵物友善餐廳" },
];


interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  userRatingsTotal: number;
  priceLevel?: number;
  distance?: number;
  bearing?: number;
  element: string;
  matchScore: number;
  keyword: string;
  placeId: string;
  isAuspicious: boolean;
  lat?: number;
  lng?: number;
  fengShui?: FengShuiResult;
  categoryId?: string;
}

interface Props {
  supplements: Array<{ element: string; priority: number; foods: string[] }>;
  todayDirections?: { xi: string; fu: string; cai: string };
  /** 用戶喜用神（中文），例如 ["火", "土", "金"] */
  favorableElements?: string[];
  /** 用戶忌神（中文），例如 ["水", "木"] */
  unfavorableElements?: string[];
  /** 天氣五行加成是否已啟用 */
  weatherEnabled?: boolean;
  /** 天氣主導五行（中文），例如 "火" */
  weatherElement?: string;
  /** 場景感知：餐別 */
  mealScene?: "breakfast" | "lunch" | "dinner" | "snack";
  /** 預算偏好 */
  budgetPreference?: "budget" | "mid" | "premium";
}

const MEAL_SCENE_TITLE: Record<string, string> = {
  breakfast: "早餐補運餐廳",
  lunch: "午餐補運餐廳",
  dinner: "晚餐補運餐廳",
  snack: "點心補運預先選",
};
// 預算 → priceLevel 白名單（Google Places priceLevel 1-4）
const BUDGET_PRICE_FILTER: Record<string, number[]> = {
  budget: [0, 1, 2],   // 小資預：$/$$ 層級
  mid: [0, 2, 3],      // 中資預：$$/$$$
  premium: [0, 3, 4],  // 高檔：$$$/$$$$ 層級
};

export function NearbyRestaurants({ supplements, todayDirections, favorableElements, unfavorableElements, weatherEnabled, weatherElement, mealScene, budgetPreference }: Props) {
  // 從後台動態讀取餐廳分類（包含時段控制，fallback 到硬編碼預設値）
  const { data: dbCategories } = trpc.adminConfig.getScheduledActiveCategories.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 分鐘快取
    refetchInterval: 60 * 1000, // 每分鐘重新檢查時段變化
    retry: false,
  });
  const categoryTags = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) return dbCategories;
    return CATEGORY_TAGS;
  }, [dbCategories]);

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
  const [mapVisible, setMapVisible] = useState(true); // 地圖/列表切換
  const mapReadyRef = useRef(false); // 防止 handleMapReady 被呼叫多次
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filterAuspicious, setFilterAuspicious] = useState(false);
  // 預算篩選：從 props 初始化
  const [filterPriceLevel, setFilterPriceLevel] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<"distance" | "fengshui">("distance");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [maxDistance, setMaxDistance] = useState(2000);
  const [minFengShuiScore, setMinFengShuiScore] = useState(0);
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const filterElementRef = useRef<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const filterCategoryRef = useRef<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);

  // 分類單選切換：點選後更新 ref 並立即重新搜尋
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    const newCat = categoryId === "all" ? null : categoryId;
    setFilterCategory(newCat);
    filterCategoryRef.current = newCat;
    setFilterSheetOpen(false);
    if (mapRef.current && userLocation) {
      setPhase("searching");
      setRestaurants([]);
      setErrorMsg("");
      setSearchTrigger((n) => n + 1);
    } else {
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
    }
  }, [userLocation]);

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

  // 在地圖上繪製餐廳標記
  const drawMarkers = useCallback((mapInstance: google.maps.Map, list: Restaurant[], userLoc?: { lat: number; lng: number }) => {
    const map = mapInstance;
    // 清除舊標記
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    infoWindowRef.current = new google.maps.InfoWindow();

    list.forEach((r) => {
      if (r.lat === undefined || r.lng === undefined) return;
      const fs = r.fengShui;
      const gradeConfig = fs ? GRADE_CONFIG[fs.grade] : null;
      const markerColor = gradeConfig?.markerColor ?? "#94a3b8";
      const isAuspicious = r.isAuspicious;

      // 建立自訂 SVG 標記
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.4)"/>
            </filter>
          </defs>
          <!-- 標記底部 -->
          <path d="M18 42 L4 16 Q4 2 18 2 Q32 2 32 16 Z" fill="${markerColor}" filter="url(#shadow)"/>
          <!-- 吉方光環 -->
          ${isAuspicious ? `<circle cx="18" cy="14" r="13" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.8"/>` : ''}
          <!-- 中心圓 -->
          <circle cx="18" cy="14" r="9" fill="rgba(0,0,0,0.3)"/>
          <!-- 分數文字 -->
          <text x="18" y="18" text-anchor="middle" font-size="8" font-weight="bold" fill="white" font-family="Arial">${fs?.totalScore ?? "?"}</text>
        </svg>
      `;
      const svgUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`;

      const marker = new google.maps.Marker({
        position: { lat: r.lat!, lng: r.lng! },
        map,
        icon: {
          url: svgUrl,
          scaledSize: new google.maps.Size(36, 44),
          anchor: new google.maps.Point(18, 44),
        },
        title: r.name,
        zIndex: fs ? fs.totalScore : 50,
      });

      marker.addListener("click", () => {
        setSelectedMarkerId(r.id);
        setExpandedId(r.id);
        // 顯示資訊視窗
        const infoContent = `
          <div style="background:#1a1a2e;color:white;padding:10px 12px;border-radius:10px;min-width:180px;font-family:sans-serif;">
            <div style="font-weight:bold;font-size:13px;margin-bottom:4px;">${r.name}</div>
            ${fs ? `<div style="font-size:11px;color:${markerColor};margin-bottom:2px;">補運指數：${fs.totalScore}/100 ${gradeConfig?.emoji ?? ''} ${gradeConfig?.label ?? ''}</div>` : ''}
            ${r.distance !== undefined ? `<div style="font-size:11px;color:#94a3b8;">📏 ${r.distance < 1000 ? r.distance + 'm' : (r.distance/1000).toFixed(1) + 'km'}</div>` : ''}
            ${r.rating > 0 ? `<div style="font-size:11px;color:#94a3b8;">⭐ ${r.rating.toFixed(1)}</div>` : ''}
            ${isAuspicious ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px;">✨ 今日吉方</div>` : ''}
          </div>
        `;
        infoWindowRef.current?.setContent(infoContent);
        infoWindowRef.current?.open(map, marker);
        // 地圖置中到標記
        map.panTo({ lat: r.lat!, lng: r.lng! });
        // 滾動到對應卡片
        const cardEl = document.getElementById(`restaurant-card-${r.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      markersRef.current.push(marker);
    });

    // 加入用戶位置標記
    const locToUse = userLoc ?? userLocation;
    if (locToUse) {
      const userSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#6366f1" opacity="0.3"/>
          <circle cx="12" cy="12" r="6" fill="#6366f1"/>
          <circle cx="12" cy="12" r="3" fill="white"/>
        </svg>
      `;
      const userMarker = new google.maps.Marker({
        position: locToUse,
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userSvg)}`,
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12),
        },
        title: "您的位置",
        zIndex: 999,
      });
      markersRef.current.push(userMarker);
    }
  }, [userLocation]); // userLocation 作為 fallback

  // 搜尋餐廳的核心邏輯（可被 handleMapReady 和 searchTrigger 共用）
  const doSearch = useCallback(
    async (map: google.maps.Map, loc: { lat: number; lng: number }) => {
      try {
        const results: Restaurant[] = [];
        const seen = new Set<string>();
          const activeCatId = filterCategoryRef.current;
        const activeCategoryTag = activeCatId
          ? categoryTags.find((c) => c.id === activeCatId) ?? null
          : null;
        const activeElementFilter = filterElementRef.current;
        // 若有五行篩選，使用該五行的關鍵字；否則用今日補運五行
        const searchSupplements = activeElementFilter
          ? [{ element: activeElementFilter, priority: 1 }]
          : supplements.slice(0, 2);
        for (const sup of searchSupplements) {
          const info = ELEMENT_KEYWORDS[sup.element];
          if (!info) continue;
          const keywordsToSearch = info.keywords.slice(0, 4);
          for (const keyword of keywordsToSearch) {
            if (results.length >= 20) break;
            const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
            // 優先使用分類文字後綴，否則直接用關鍵字搜尋（不加「餐廳」以提高覆蓋率）
            const searchText = activeCategoryTag?.textSuffix
              ? `${activeCategoryTag.textSuffix}`
              : keyword;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const request: any = {
              textQuery: searchText,
              fields: ["id", "displayName", "formattedAddress", "rating", "userRatingCount", "location", "priceLevel"],
              locationBias: {
                center: loc,
                radius: 2000,
              },
              maxResultCount: 10,
              language: "zh-TW",
            };
            // 只有確定支援的 includedType 才加入（避免結果為空）
            const RELIABLE_TYPES = ["cafe", "bar", "japanese_restaurant", "korean_restaurant", "chinese_restaurant"];
            if (activeCategoryTag && activeCategoryTag.id !== "all" &&
                RELIABLE_TYPES.includes(activeCategoryTag.types[0])) {
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
                  distance = calcDistance(loc, to);
                  bearing = calcBearing(loc, to);
                  if (todayDirections) {
                    isAuspicious =
                      isInDirection(bearing, todayDirections.cai) ||
                      isInDirection(bearing, todayDirections.xi);
                  }
                  fengShui = calcFengShui(
                    loc.lat, loc.lng,
                    lat2, lng2,
                    place.displayName ?? "",
                    place.formattedAddress ?? "",
                    keyword,
                    elementMatchScore,
                    weatherElement
                  );
                }
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
          if (a.isAuspicious !== b.isAuspicious) {
            const distA = a.distance ?? 9999;
            const distB = b.distance ?? 9999;
            if (Math.abs(distA - distB) < 500) {
              return a.isAuspicious ? -1 : 1;
            }
          }
          return (a.distance ?? 9999) - (b.distance ?? 9999);
        });

        const finalResults = results.slice(0, 20);
        setRestaurants(finalResults);
        setPhase("done");

        // 繪製地圖標記
        drawMarkers(map, finalResults, loc);

        // 調整地圖視野以包含所有標記
        if (finalResults.length > 0) {
          try {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(loc.lat, loc.lng));
            finalResults.forEach((r) => {
              if (r.lat !== undefined && r.lng !== undefined) {
                bounds.extend(new google.maps.LatLng(r.lat, r.lng));
              }
            });
            map.fitBounds(bounds, 40);
          } catch (boundsErr) {
            // fitBounds 失敗不影響搜尋結果顯示
            console.warn("fitBounds error:", boundsErr);
            map.setCenter(new google.maps.LatLng(loc.lat, loc.lng));
          }
        }
      } catch (err) {
        console.error(err);
        setPhase("error");
        setErrorMsg("搜尋餐廳時發生錯誤，請稍後再試。");
      }
    },
    [supplements, todayDirections, elementMatchScore, drawMarkers, weatherElement]
  );

  const handleMapReady = useCallback(
    async (map: google.maps.Map) => {
      // 防止重複初始化
      if (mapReadyRef.current) return;
      mapReadyRef.current = true;
      mapRef.current = map;
      if (!userLocation) return;
      await doSearch(map, userLocation);
    },
    [userLocation, doSearch]
  );

  // 監聽 searchTrigger：當分類改變且地圖已初始化時，直接重新執行搜尋
  useEffect(() => {
    if (searchTrigger === 0) return;
    if (mapRef.current && userLocation) {
      setPhase("searching");
      setRestaurants([]);
      doSearch(mapRef.current, userLocation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]);

  const topElements = supplements.slice(0, 2).map((s) => s.element);
  const displayedRestaurants = useMemo(() => {
    let list = [...restaurants];
    if (filterAuspicious) list = list.filter((r) => r.isAuspicious);
    if (maxDistance < 2000) list = list.filter((r) => (r.distance ?? 9999) <= maxDistance);
    if (minFengShuiScore > 0) list = list.filter((r) => (r.fengShui?.totalScore ?? 0) >= minFengShuiScore);
    if (filterElement) {
      // 五行屬性篩選：匹配方位、地名、類型三維中任一
      list = list.filter((r) => {
        if (!r.fengShui) return false;
        return r.fengShui.bearingElement === filterElement ||
               r.fengShui.nameElement === filterElement ||
               r.fengShui.businessElement === filterElement;
      });
    }
    // 預算篩選：依 priceLevel 白名單過濾
    if (filterPriceLevel !== null) {
      const bp = filterPriceLevel === 2 ? "budget" : filterPriceLevel === 3 ? "mid" : "premium";
      const allowed = BUDGET_PRICE_FILTER[bp];
      list = list.filter((r) => !r.priceLevel || allowed.includes(r.priceLevel));
    }
    if (sortMode === "fengshui") {
      list = list.sort((a, b) => (b.fengShui?.totalScore ?? 0) - (a.fengShui?.totalScore ?? 0));
    }
    return list;
  }, [restaurants, filterAuspicious, sortMode, maxDistance, minFengShuiScore, filterElement, filterPriceLevel]);

  const activeFilterCount = [
    filterAuspicious,
    maxDistance < 2000,
    minFengShuiScore > 0,
    !!filterElement,
    !!filterCategory,
    filterPriceLevel !== null,
  ].filter(Boolean).length;

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

  const buildMapsUrl = (r: Restaurant): string => {
    if (r.lat !== undefined && r.lng !== undefined) {
      const query = encodeURIComponent(r.name);
      return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${r.placeId}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}`;
  };

  // 點擊卡片時，地圖標記也要高亮
  const handleCardClick = (r: Restaurant) => {
    const isExpanding = expandedId !== r.id;
    setExpandedId(isExpanding ? r.id : null);
    if (isExpanding && r.lat !== undefined && r.lng !== undefined && mapRef.current) {
      mapRef.current.panTo({ lat: r.lat, lng: r.lng });
      setSelectedMarkerId(r.id);
      setMapVisible(true);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/3 overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">📍</span>
          <span className="text-sm font-semibold text-white/80">{mealScene ? MEAL_SCENE_TITLE[mealScene] : "附近命理推薦餐廳"}</span>
          {topElements.length > 0 && (
            <div className="flex gap-1">
              {topElements.map((el) => (
                <span key={el} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${ELEMENT_KEYWORDS[el]?.color ?? ''}`}>
                  {ELEMENT_KEYWORDS[el]?.emoji} 補{el}
                </span>
              ))}
            </div>
          )}
          {/* 天氣加成標籤 */}
          {weatherEnabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-950/20 text-emerald-400">
              ☁ 天氣加成
            </span>
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
            onClick={() => {
              setPhase("idle");
              setShowMap(false);
              setRestaurants([]);
              setFilterAuspicious(false);
              setSortMode("distance");
              setExpandedId(null);
              setSelectedMarkerId(null);
              markersRef.current.forEach((m) => m.setMap(null));
              markersRef.current = [];
            }}
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
            {/* 地圖/列表切換 */}
            <button
              onClick={() => setMapVisible(!mapVisible)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                mapVisible
                  ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                  : "bg-white/5 border-white/10 text-white/40"
              }`}
            >
              {mapVisible ? <List className="w-3 h-3" /> : <Map className="w-3 h-3" />}
              {mapVisible ? "列表" : "地圖"}
            </button>
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
                  {/* 分類標籤單選 */}
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2.5">🍽️ 餐廳分類（點選即搜尋）</p>
                    <div className="flex flex-wrap gap-1.5">
                      {categoryTags.map((cat) => {
                        const isActive = cat.id === "all" ? filterCategory === null : filterCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
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
                    {filterCategory && (
                      <p className="text-[10px] text-amber-400/60 mt-1.5">
                        ✦ 已選擇分類，點擊「全部」可清除
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
                        <button key={el ?? "all"} onClick={() => {
                          filterElementRef.current = el;
                          setFilterElement(el);
                          setFilterSheetOpen(false);
                          if (mapRef.current && userLocation) {
                            setPhase("searching");
                            setRestaurants([]);
                            setErrorMsg("");
                            setSearchTrigger((n) => n + 1);
                          }
                        }}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            filterElement === el ? "bg-white/20 border-white/40 text-white" : "bg-white/5 border-white/10 text-white/50"
                          }`}>
                          {el ? `${ELEMENT_KEYWORDS[el]?.emoji} ${el}系` : "全部"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 預算篩選 */}
                  <div>
                    <p className="text-sm font-medium text-white/80 mb-2">💰 預算範圍</p>
                    <div className="flex gap-2">
                      {([null, "budget", "mid", "premium"] as const).map((bp) => (
                        <button key={bp ?? "all"} onClick={() => setFilterPriceLevel(bp === null ? null : bp === "budget" ? 2 : bp === "mid" ? 3 : 4)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all flex-1 ${
                            (bp === null && filterPriceLevel === null) ||
                            (bp === "budget" && filterPriceLevel === 2) ||
                            (bp === "mid" && filterPriceLevel === 3) ||
                            (bp === "premium" && filterPriceLevel === 4)
                              ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                              : "bg-white/5 border-white/10 text-white/50"
                          }`}>
                          {bp === null ? "不限" : bp === "budget" ? "💲 小資預" : bp === "mid" ? "💳 中資預" : "💴 高檔"}
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
                      filterElementRef.current = null;
                      setFilterCategory(null);
                      filterCategoryRef.current = null;
                      if (mapRef.current && userLocation) {
                        setPhase("searching");
                        setRestaurants([]);
                        setSearchTrigger((n) => n + 1);
                      }
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

      {/* 地圖（搜尋中或完成後顯示） - 單一 MapView 防止重複載入 */}
      {showMap && userLocation && (
        <AnimatePresence>
          {(phase === "searching" || (phase === "done" && mapVisible)) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 480, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-b border-white/10"
            >
              <div style={{ height: 480 }}>
                <MapView
                  initialCenter={userLocation}
                  initialZoom={15}
                  onMapReady={handleMapReady}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* 搜尋中狀態 */}
      {phase === "searching" && (
        <div className="px-4 py-6 text-center">
          <div className="text-2xl mb-2 animate-spin inline-block">☯</div>
          <p className="text-sm text-amber-400/70">正在搜尋附近命理餐廳...</p>
          <p className="text-xs text-white/30 mt-1">分析方位五行、地名字根、料理類型...</p>
        </div>
      )}

      {/* 餐廳清單 */}
      {phase === "done" && displayedRestaurants.length > 0 && (
        <div className="p-3 space-y-3">
          {/* 天氣加成標籤（僅顯示是否啟用，不暴露公式） */}
          {weatherEnabled && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 text-[10px] text-white/40">
              <span>🧭 補運指數</span>
              <span className="ml-1 text-emerald-400/60">❆ 天氣加成已啟用</span>
            </div>
          )}
          <AnimatePresence>
          {displayedRestaurants.map((r, i) => {
            const info = ELEMENT_KEYWORDS[r.element];
            const mapsUrl = buildMapsUrl(r);
            const fs = r.fengShui;
            const gradeConfig = fs ? GRADE_CONFIG[fs.grade] : null;
            const isExpanded = expandedId === r.id;
            const isSelected = selectedMarkerId === r.id;
            const scoreColor = fs
              ? fs.totalScore >= 85 ? "#f59e0b" : fs.totalScore >= 70 ? "#10b981" : fs.totalScore >= 50 ? "#94a3b8" : "#f97316"
              : "#94a3b8";
            return (
              <motion.div
                key={r.id}
                id={`restaurant-card-${r.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border bg-white/[0.03] overflow-hidden transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-500/50 shadow-lg shadow-indigo-900/20"
                    : r.isAuspicious ? "border-amber-500/30" : "border-white/8"
                }`}
              >
                {/* 卡片頂部：名稱 + 分數 */}
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer"
                  onClick={() => handleCardClick(r)}
                >
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
                  {r.priceLevel && (
                    <span className="text-[10px] text-emerald-400/70 border border-emerald-500/20 px-2 py-1 rounded-lg bg-emerald-500/5">
                      {"$".repeat(r.priceLevel)}
                    </span>
                  )}
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
                          <div className="text-[9px] text-white/40 mb-0.5">方位</div>
                          <div className="text-xs font-bold text-white/70">{fs.bearingMountain}山</div>
                          <div className={`text-[9px] mt-0.5 ${ELEMENT_KEYWORDS[fs.bearingElement]?.color?.split(' ')[0] ?? 'text-white/40'}`}>
                            {fs.bearingElement}氣 {fs.bearingDeg}°
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                          <div className="text-[9px] text-white/40 mb-0.5">地名</div>
                          <div className="text-xs font-bold text-white/70">字根</div>
                          <div className={`text-[9px] mt-0.5 ${ELEMENT_KEYWORDS[fs.nameElement]?.color?.split(' ')[0] ?? 'text-white/40'}`}>
                            {fs.nameElement}屬
                          </div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-white/5 border border-white/8">
                          <div className="text-[9px] text-white/40 mb-0.5">類型</div>
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
