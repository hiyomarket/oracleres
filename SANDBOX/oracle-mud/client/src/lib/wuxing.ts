export type WuXing = "wood" | "fire" | "earth" | "metal" | "water";

export const WUXING_NAMES: Record<WuXing, string> = {
  wood: "木",
  fire: "火",
  earth: "土",
  metal: "金",
  water: "水",
};

export const WUXING_COLORS: Record<WuXing, string> = {
  wood: "#4ade80",   // 翠綠
  fire: "#fb923c",   // 橙紅
  earth: "#facc15",  // 土黃
  metal: "#e2e8f0",  // 銀白
  water: "#60a5fa",  // 深藍
};

export const WUXING_EMOJIS: Record<WuXing, string> = {
  wood: "🌿",
  fire: "🔥",
  earth: "⛰️",
  metal: "⚔️",
  water: "💧",
};

export const WUXING_CSS_CLASS: Record<WuXing, string> = {
  wood: "text-emerald-400",
  fire: "text-orange-400",
  earth: "text-yellow-400",
  metal: "text-slate-300",
  water: "text-blue-400",
};

export const WUXING_BG_CLASS: Record<WuXing, string> = {
  wood: "bg-emerald-400/15 border-emerald-400/30",
  fire: "bg-orange-400/15 border-orange-400/30",
  earth: "bg-yellow-400/15 border-yellow-400/30",
  metal: "bg-slate-300/15 border-slate-300/30",
  water: "bg-blue-400/15 border-blue-400/30",
};

export const STATUS_NAMES: Record<string, string> = {
  idle: "待機",
  moving: "移動中",
  fighting: "戰鬥中",
  gathering: "採集中",
  resting: "休息中",
  dead: "陣亡",
};

export const STATUS_COLORS: Record<string, string> = {
  idle: "text-emerald-400",
  moving: "text-blue-400",
  fighting: "text-orange-400",
  gathering: "text-yellow-400",
  resting: "text-slate-400",
  dead: "text-red-500",
};

export const STRATEGY_NAMES: Record<string, string> = {
  explore: "探索",
  farm: "刷怪",
  merchant: "採集",
  rest: "休息",
};

export const STRATEGY_DESC: Record<string, string> = {
  explore: "四處探索，遭遇怪物時戰鬥，偶爾移動至新地點",
  farm: "專注在當前地點刷怪，最大化戰鬥與經驗收益",
  merchant: "主要採集素材，避免高風險戰鬥",
  rest: "原地休息，快速恢復 HP 與 MP",
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
  move: "text-blue-400",
  combat: "text-orange-400",
  loot: "text-yellow-400",
  gather: "text-emerald-400",
  trade: "text-purple-400",
  rest: "text-slate-400",
  levelup: "text-yellow-300",
  divine: "text-purple-300",
  weather: "text-cyan-400",
  encounter: "text-red-400",
  death: "text-red-600",
  system: "text-slate-500",
};

export const EVENT_TYPE_NAMES: Record<string, string> = {
  move: "移動",
  combat: "戰鬥",
  loot: "掉落",
  gather: "採集",
  trade: "交易",
  rest: "休息",
  levelup: "升級",
  divine: "神蹟",
  weather: "天氣",
  encounter: "遭遇",
  death: "陣亡",
  system: "系統",
};

export const TERRAIN_ICONS: Record<string, string> = {
  "都市廣場": "🏛",
  "都市商業區": "🏙",
  "都市森林": "🌳",
  "高樓商業區": "🏢",
  "古廟街區": "⛩",
  "夜市街區": "🏮",
  "溫泉地熱區": "♨️",
  "溫泉地熱": "♨️",
  "山地茶園": "🍵",
  "廢棄科技園區": "🏭",
  "山脈入口": "⛰",
  "火山高地": "🌋",
  "都市平原": "🏘",
  "農業平原": "🌾",
  "農業大平原": "🌾",
  "河岸濕地": "🌊",
  "海岸古鎮": "⚓",
  "丘陵寺廟": "🛕",
  "峽谷水潭": "💧",
  "峽谷溪流": "💧",
  "原始森林": "🌲",
  "山城礦區": "⛏",
  "黃金礦坑": "🪙",
  "港口城市": "🚢",
  "岩礁海岸": "🪨",
  "廣闊平原": "🌿",
  "河谷古鎮": "🏞",
  "山地部落": "🏕",
  "科技城市": "💻",
  "海岸風場": "💨",
  "丘陵地帶": "🏔",
  "高山森林": "🌲",
  "海岸平原": "🏖",
  "丘陵城市": "🏡",
  "山城木雕區": "🪵",
  "都市公園": "🌳",
  "工業港口": "⚓",
  "丘陵茶園": "🍵",
  "高山峻嶺": "🗻",
  "山丘城市": "⛰",
  "盆地城市": "🏘",
  "山中盆地": "🏞",
  "高山湖泊": "🏔",
  "高山雪地": "❄️",
  "工業海岸": "🏭",
  "平原城市": "🏙",
  "鹽田海岸": "🌊",
  "高山神木林": "🌲",
  "最高峰": "🗻",
  "古堡海岸": "🏰",
  "古都城市": "🏯",
  "山地農業區": "🌾",
  "都市中心": "🏙",
  "南方城市": "☀️",
  "熱帶海岸": "🌴",
  "大理石峽谷": "🪨",
  "東部城市": "🏙",
  "縱谷平原": "🌾",
  "太平洋海岸": "🌊",
  "火山島嶼": "🌋",
  "玄武岩島嶼": "🏝",
};
