/**
 * shared/itemNames.ts
 * 道具名稱、稀有度、Emoji 對應表（前後端共用）
 * 支援舊格式（herb-001）和新格式（I_W001）
 */
export interface ItemInfo {
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  emoji: string;
}

export const ITEM_NAMES: Record<string, ItemInfo> = {
  // ═══ 舊格式道具 ID ═══
  // 木系草藥
  "herb-001":          { name: "青草藥",     rarity: "common",    emoji: "🌿" },
  "herb-002":          { name: "靈芝草",     rarity: "uncommon",  emoji: "🍄" },
  "herb-fire-001":     { name: "火焰草",     rarity: "uncommon",  emoji: "🌺" },
  "herb-water-001":    { name: "水靈草",     rarity: "uncommon",  emoji: "💧" },
  "herb-earth-001":    { name: "土靈草",     rarity: "uncommon",  emoji: "🌱" },
  "herb-metal-001":    { name: "金靈草",     rarity: "uncommon",  emoji: "🌾" },
  "herb-wood-001":     { name: "木靈草",     rarity: "common",    emoji: "🌿" },
  // 木系材料
  "mat-wood-001":      { name: "堅木材",     rarity: "common",    emoji: "🪵" },
  "mat-wood-002":      { name: "靈木精華",   rarity: "uncommon",  emoji: "🌳" },
  "mat-wood-003":      { name: "古木精華",   rarity: "uncommon",  emoji: "🌲" },
  "mat-wood-004":      { name: "神木碎片",   rarity: "rare",      emoji: "🪵" },
  "mat-wood-005":      { name: "木靈結晶",   rarity: "rare",      emoji: "💚" },
  "mat-wood-006":      { name: "千年木髓",   rarity: "epic",      emoji: "🌳" },
  "mat-wood-007":      { name: "木元素核",   rarity: "epic",      emoji: "🌿" },
  "mat-wood-008":      { name: "靈木精粹",   rarity: "legendary", emoji: "✨" },
  "mat-wood-009":      { name: "木命神晶",   rarity: "legendary", emoji: "💎" },
  "mat-wood-010":      { name: "太古木靈",   rarity: "legendary", emoji: "🌟" },
  // 火系材料
  "mat-fire-001":      { name: "火焰石",     rarity: "common",    emoji: "🔥" },
  "mat-fire-002":      { name: "熔岩碎片",   rarity: "uncommon",  emoji: "🌋" },
  "mat-fire-003":      { name: "烈焰碎片",   rarity: "uncommon",  emoji: "🔥" },
  "mat-fire-004":      { name: "火靈結晶",   rarity: "rare",      emoji: "🔥" },
  "mat-fire-005":      { name: "鳳凰羽毛",   rarity: "rare",      emoji: "🪶" },
  "mat-fire-006":      { name: "熔岩精華",   rarity: "epic",      emoji: "🌋" },
  "mat-fire-007":      { name: "火元素核",   rarity: "epic",      emoji: "🔴" },
  "mat-fire-008":      { name: "炎靈精粹",   rarity: "legendary", emoji: "✨" },
  "mat-fire-009":      { name: "火命神晶",   rarity: "legendary", emoji: "💎" },
  "mat-fire-010":      { name: "太古火靈",   rarity: "legendary", emoji: "🌟" },
  // 土系材料
  "mat-earth-001":     { name: "土元素晶",   rarity: "common",    emoji: "🪨" },
  "mat-earth-002":     { name: "大地精華",   rarity: "uncommon",  emoji: "⛰️" },
  "mat-earth-003":     { name: "黃土精華",   rarity: "uncommon",  emoji: "🪨" },
  "mat-earth-004":     { name: "土靈結晶",   rarity: "rare",      emoji: "🟤" },
  "mat-earth-005":     { name: "山嶽碎片",   rarity: "rare",      emoji: "⛰️" },
  "mat-earth-006":     { name: "大地精粹",   rarity: "epic",      emoji: "🌍" },
  "mat-earth-007":     { name: "土元素核",   rarity: "epic",      emoji: "🟫" },
  "mat-earth-008":     { name: "岩靈精粹",   rarity: "legendary", emoji: "✨" },
  "mat-earth-009":     { name: "土命神晶",   rarity: "legendary", emoji: "💎" },
  "mat-earth-010":     { name: "太古土靈",   rarity: "legendary", emoji: "🌟" },
  "food-earth-001":    { name: "山藥",       rarity: "common",    emoji: "🥔" },
  // 金系材料
  "mat-metal-001":     { name: "鐵礦石",     rarity: "common",    emoji: "⚙️" },
  "mat-metal-002":     { name: "銀礦石",     rarity: "uncommon",  emoji: "🥈" },
  "mat-metal-003":     { name: "金礦石",     rarity: "rare",      emoji: "🥇" },
  "mat-metal-004":     { name: "精鋼碎片",   rarity: "uncommon",  emoji: "⚙️" },
  "mat-metal-005":     { name: "秘銀碎片",   rarity: "rare",      emoji: "🔩" },
  "mat-metal-006":     { name: "玄鐵精華",   rarity: "rare",      emoji: "⚔️" },
  "mat-metal-007":     { name: "金元素核",   rarity: "epic",      emoji: "🔱" },
  "mat-metal-008":     { name: "金靈精粹",   rarity: "epic",      emoji: "✨" },
  "mat-metal-009":     { name: "金命神晶",   rarity: "legendary", emoji: "💎" },
  "mat-metal-010":     { name: "太古金靈",   rarity: "legendary", emoji: "🌟" },
  "mat-metal-011":     { name: "混沌金核",   rarity: "legendary", emoji: "⭐" },
  // 水系材料
  "mat-water-001":     { name: "水晶碎片",   rarity: "common",    emoji: "💎" },
  "mat-water-002":     { name: "深海珍珠",   rarity: "rare",      emoji: "🔮" },
  "mat-water-003":     { name: "寒冰碎片",   rarity: "uncommon",  emoji: "🧊" },
  "mat-water-004":     { name: "水靈結晶",   rarity: "rare",      emoji: "💙" },
  "mat-water-005":     { name: "龍宮珍珠",   rarity: "rare",      emoji: "🔮" },
  "mat-water-006":     { name: "深海精華",   rarity: "epic",      emoji: "🌊" },
  "mat-water-007":     { name: "水元素核",   rarity: "epic",      emoji: "🔵" },
  "mat-water-008":     { name: "水靈精粹",   rarity: "legendary", emoji: "✨" },
  "mat-water-009":     { name: "水命神晶",   rarity: "legendary", emoji: "💎" },
  "mat-water-010":     { name: "太古水靈",   rarity: "legendary", emoji: "🌟" },
  // 怪物掉落材料
  "material-bone":     { name: "怪物骨骼",   rarity: "common",    emoji: "🦴" },
  "material-scale":    { name: "怪物鱗片",   rarity: "uncommon",  emoji: "🐉" },
  "material-crystal":  { name: "元素水晶",   rarity: "rare",      emoji: "💠" },
  "material-core":     { name: "怪物核心",   rarity: "epic",      emoji: "⭐" },
  // 消耗品
  "consumable-potion": { name: "小回血藥",   rarity: "common",    emoji: "🧪" },
  "consumable-elixir": { name: "元氣丹",     rarity: "uncommon",  emoji: "💊" },
  // 食物
  "food-001":          { name: "野豬肉",     rarity: "common",    emoji: "🥩" },
  "food-002":          { name: "靈果",       rarity: "uncommon",  emoji: "🍎" },
  "food-003":          { name: "仙桃",       rarity: "rare",      emoji: "🍑" },
  // 裝備（怪物掉落）
  "equip-wood-001":    { name: "木靈護符",   rarity: "common",    emoji: "🟢" },
  "equip-wood-002":    { name: "翠玉戒指",   rarity: "uncommon",  emoji: "💚" },
  "equip-wood-003":    { name: "木靈劍",     rarity: "rare",      emoji: "🗡️" },
  "equip-wood-004":    { name: "靈木鎧甲",   rarity: "epic",      emoji: "🛡️" },
  "equip-wood-005":    { name: "木命神器",   rarity: "legendary", emoji: "⚔️" },
  "equip-fire-001":    { name: "火靈護符",   rarity: "common",    emoji: "🔴" },
  "equip-fire-002":    { name: "紅玉戒指",   rarity: "uncommon",  emoji: "❤️" },
  "equip-fire-003":    { name: "火靈劍",     rarity: "rare",      emoji: "🗡️" },
  "equip-fire-004":    { name: "炎鐵鎧甲",   rarity: "epic",      emoji: "🛡️" },
  "equip-fire-005":    { name: "火命神器",   rarity: "legendary", emoji: "⚔️" },
  "equip-earth-001":   { name: "土靈護符",   rarity: "common",    emoji: "🟤" },
  "equip-earth-002":   { name: "黃玉戒指",   rarity: "uncommon",  emoji: "🟡" },
  "equip-earth-003":   { name: "土靈劍",     rarity: "rare",      emoji: "🗡️" },
  "equip-earth-004":   { name: "山嶽鎧甲",   rarity: "epic",      emoji: "🛡️" },
  "equip-earth-005":   { name: "土命神器",   rarity: "legendary", emoji: "⚔️" },
  "equip-metal-001":   { name: "金靈護符",   rarity: "common",    emoji: "⚙️" },
  "equip-metal-002":   { name: "白玉戒指",   rarity: "uncommon",  emoji: "🥈" },
  "equip-metal-003":   { name: "金靈劍",     rarity: "rare",      emoji: "🗡️" },
  "equip-metal-004":   { name: "玄鐵鎧甲",   rarity: "epic",      emoji: "🛡️" },
  "equip-metal-005":   { name: "金命神器",   rarity: "legendary", emoji: "⚔️" },
  "equip-water-001":   { name: "水靈護符",   rarity: "common",    emoji: "💙" },
  "equip-water-002":   { name: "藍玉戒指",   rarity: "uncommon",  emoji: "🔵" },
  "equip-water-003":   { name: "水靈劍",     rarity: "rare",      emoji: "🗡️" },
  "equip-water-004":   { name: "深海鎧甲",   rarity: "epic",      emoji: "🛡️" },
  "equip-water-005":   { name: "水命神器",   rarity: "legendary", emoji: "⚔️" },

  // ═══ 資料庫新格式道具 ID ═══
  // 木行 — 基礎材料
  "I_W001": { name: "靈草",       rarity: "common",    emoji: "🌿" },
  "I_W002": { name: "堅韌藤蔓",   rarity: "common",    emoji: "🌿" },
  "I_W003": { name: "苦澀樹皮",   rarity: "common",    emoji: "🪵" },
  "I_W004": { name: "迷幻蘑菇",   rarity: "common",    emoji: "🍄" },
  "I_W005": { name: "晨露",       rarity: "common",    emoji: "💧" },
  "I_W006": { name: "芳香花瓣",   rarity: "common",    emoji: "🌸" },
  "I_W007": { name: "帶刺荊棘",   rarity: "common",    emoji: "🌿" },
  "I_W008": { name: "黏稠樹液",   rarity: "common",    emoji: "🌿" },
  "I_W009": { name: "翠綠樹葉",   rarity: "common",    emoji: "🍃" },
  "I_W010": { name: "奇異種子",   rarity: "rare",      emoji: "🌱" },
  // 木行 — 怪物掉落材料
  "I_W011": { name: "木晶石",     rarity: "common",    emoji: "💫" },
  "I_W012": { name: "毒液腺",     rarity: "common",    emoji: "🪲" },
  "I_W013": { name: "綠色核心",   rarity: "common",    emoji: "🟢" },
  "I_W014": { name: "迷幻孢子",   rarity: "common",    emoji: "🍄" },
  "I_W015": { name: "古木心材",   rarity: "rare",      emoji: "🪵" },
  "I_W016": { name: "消化液",     rarity: "rare",      emoji: "🧪" },
  "I_W017": { name: "幻影鐮刀",   rarity: "rare",      emoji: "⚔️" },
  "I_W018": { name: "腐敗核心",   rarity: "rare",      emoji: "🟢" },
  "I_W019": { name: "森猿獠牙",   rarity: "rare",      emoji: "🦷" },
  "I_W020": { name: "鐵木熊皮",   rarity: "epic",      emoji: "🐻" },
  "I_W021": { name: "木靈王核心", rarity: "epic",      emoji: "🟢" },
  "I_W022": { name: "蛛后毒囊",   rarity: "epic",      emoji: "🕷️" },
  "I_W023": { name: "翡翠龍鱗",   rarity: "legendary", emoji: "🐉" },
  "I_W024": { name: "世界樹枝",   rarity: "legendary", emoji: "🌳" },
  "I_W025": { name: "花神之淚",   rarity: "legendary", emoji: "🌸" },
  // 木行 — 消耗品
  "I_W026": { name: "初級解毒草", rarity: "common",    emoji: "🌿" },
  "I_W027": { name: "活力樹汁",   rarity: "common",    emoji: "🌿" },
  "I_W028": { name: "森林精華",   rarity: "rare",      emoji: "🌿" },
  "I_W029": { name: "荊棘護甲藥劑", rarity: "rare",   emoji: "🛡️" },
  "I_W030": { name: "疾風草",     rarity: "rare",      emoji: "🍃" },
  "I_W031": { name: "劇毒塗劑",   rarity: "rare",      emoji: "🧪" },
  "I_W032": { name: "迷幻花粉",   rarity: "rare",      emoji: "🌸" },
  "I_W033": { name: "復甦之風",   rarity: "epic",      emoji: "🌬️" },
  "I_W034": { name: "萬能解毒劑", rarity: "epic",      emoji: "💚" },
  "I_W035": { name: "生命之水",   rarity: "legendary", emoji: "💧" },
  // 木行 — 任務/紀念
  "I_W036": { name: "迷路藥童的草藥", rarity: "common", emoji: "🌿" },
  "I_W037": { name: "破損的木雕", rarity: "rare",      emoji: "🪵" },
  "I_W038": { name: "森林守護者印記", rarity: "epic",  emoji: "📜" },
  "I_W039": { name: "奇異的蟲卵", rarity: "rare",      emoji: "🥚" },
  "I_W040": { name: "枯萎的樹枝", rarity: "common",    emoji: "🪵" },
  "I_W041": { name: "春分紀念徽章", rarity: "epic",    emoji: "🏅" },
  "I_W042": { name: "驚蟄雷木枝", rarity: "epic",      emoji: "⚡" },
  "I_W043": { name: "迷霧精華",   rarity: "epic",      emoji: "🌫️" },
  "I_W044": { name: "毒沼之心",   rarity: "legendary", emoji: "🟢" },
  "I_W045": { name: "幸運四葉草", rarity: "legendary", emoji: "🍀" },
  // 木行 — 寶物
  "I_W046": { name: "萬古神木之魂", rarity: "legendary", emoji: "🌳" },
  "I_W047": { name: "逢春露",     rarity: "legendary", emoji: "💧" },
  "I_W048": { name: "復甦種子",   rarity: "legendary", emoji: "🌱" },
  "I_W049": { name: "女妖之吻",   rarity: "legendary", emoji: "💋" },
  "I_W050": { name: "天命木靈珠", rarity: "legendary", emoji: "💫" },
  // 水行 — 基礎材料
  "I_W051": { name: "水滴",       rarity: "common",    emoji: "💧" },
  // 水行 — 怪物掉落材料
  "I_W061": { name: "水晶石",     rarity: "common",    emoji: "💎" },
  // 水行 — 消耗品
  "I_W076": { name: "小靈泉",     rarity: "common",    emoji: "💧" },
  "I_W077": { name: "大靈泉",     rarity: "rare",      emoji: "💧" },
  "I_W079": { name: "淨化之水",   rarity: "rare",      emoji: "💧" },
  "I_W084": { name: "人魚之歌",   rarity: "epic",      emoji: "🎵" },
  // 水行 — 任務/紀念
  "I_W091": { name: "冬至紀念徽章", rarity: "epic",    emoji: "🏅" },
  // 水行 — 寶物
  "I_W096": { name: "海嘯核心",   rarity: "legendary", emoji: "🌊" },
  "I_W100": { name: "天命水靈珠", rarity: "legendary", emoji: "💫" },
  // 火行 — 基礎材料
  "I_F001": { name: "餘燼",       rarity: "common",    emoji: "🔥" },
  // 火行 — 怪物掉落材料
  "I_F011": { name: "火晶石",     rarity: "common",    emoji: "🔥" },
  // 火行 — 消耗品
  "I_F026": { name: "初級燒傷藥", rarity: "common",    emoji: "🧪" },
  "I_F027": { name: "狂暴藥水",   rarity: "rare",      emoji: "🧪" },
  "I_F028": { name: "烈焰炸彈",   rarity: "rare",      emoji: "💥" },
  "I_F034": { name: "鳳凰之血",   rarity: "legendary", emoji: "🦅" },
  // 火行 — 任務/紀念
  "I_F041": { name: "夏至紀念徽章", rarity: "epic",    emoji: "🏅" },
  // 火行 — 寶物
  "I_F046": { name: "隕石核心",   rarity: "legendary", emoji: "☄️" },
  "I_F050": { name: "天命火靈珠", rarity: "legendary", emoji: "💫" },
  // 土行 — 基礎材料
  "I_E001": { name: "礦石",       rarity: "common",    emoji: "🪨" },
  // 土行 — 怪物掉落材料
  "I_E011": { name: "土晶石",     rarity: "common",    emoji: "🪨" },
  // 土行 — 消耗品
  "I_E026": { name: "鐵甲藥劑",   rarity: "rare",      emoji: "🛡️" },
  "I_E027": { name: "磐石護盾",   rarity: "rare",      emoji: "🛡️" },
  // 土行 — 任務/紀念
  "I_E041": { name: "秋分紀念徽章", rarity: "epic",    emoji: "🏅" },
  // 土行 — 寶物
  "I_E046": { name: "脈動之核",   rarity: "legendary", emoji: "⭐" },
  "I_E050": { name: "天命土靈珠", rarity: "legendary", emoji: "💫" },
  // 金行 — 基礎材料
  "I_M001": { name: "金屬零件",   rarity: "common",    emoji: "⚙️" },
  // 金行 — 怪物掉落材料
  "I_M011": { name: "金晶石",     rarity: "common",    emoji: "⚙️" },
  // 金行 — 消耗品
  "I_M026": { name: "磨刀石",     rarity: "common",    emoji: "⚔️" },
  "I_M027": { name: "疾風藥劑",   rarity: "rare",      emoji: "🧪" },
  "I_M032": { name: "煙霧彈",     rarity: "rare",      emoji: "💨" },
  // 金行 — 任務/紀念
  "I_M041": { name: "立秋紀念徽章", rarity: "epic",    emoji: "🏅" },
  // 金行 — 寶物
  "I_M046": { name: "衛星殘骸",   rarity: "legendary", emoji: "🛸" },
  "I_M050": { name: "天命金靈珠", rarity: "legendary", emoji: "💫" },

  // ═══ 技能書（資料庫格式，含實際技能名稱）═══
  "skill-wood-001":  { name: "翠羽鳳凰技能書", rarity: "rare",  emoji: "📗" },
  "skill-wood-002":  { name: "青龍技能書",     rarity: "epic",  emoji: "📗" },
  "skill-fire-001":  { name: "炎魔將軍技能書", rarity: "rare",  emoji: "📕" },
  "skill-fire-002":  { name: "朱雀技能書",     rarity: "epic",  emoji: "📕" },
  "skill-earth-001": { name: "山嶽巨靈技能書", rarity: "rare",  emoji: "📒" },
  "skill-earth-002": { name: "黃龍技能書",     rarity: "epic",  emoji: "📒" },
  "skill-metal-001": { name: "鎧甲巨龜技能書", rarity: "rare",  emoji: "📙" },
  "skill-metal-002": { name: "白虎技能書",     rarity: "epic",  emoji: "📙" },
  "skill-water-001": { name: "水靈祭司技能書", rarity: "rare",  emoji: "📘" },
  "skill-water-002": { name: "玄武技能書",     rarity: "epic",  emoji: "📘" },
};

/** 稀有度顏色對應 */
export const RARITY_COLORS: Record<string, string> = {
  common:    "text-slate-300",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-amber-400",
};

/** 稀有度背景色對應 */
export const RARITY_BG: Record<string, string> = {
  common:    "bg-slate-800/50",
  uncommon:  "bg-green-900/30",
  rare:      "bg-blue-900/30",
  epic:      "bg-purple-900/30",
  legendary: "bg-amber-900/30",
};

/** 取得道具資訊（fallback 為未知道具） */
export function getItemInfo(itemId: string): ItemInfo {
  return ITEM_NAMES[itemId] ?? { name: itemId, rarity: "common", emoji: "📦" };
}
