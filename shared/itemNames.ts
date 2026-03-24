/**
 * shared/itemNames.ts
 * 道具名稱、稀有度、Emoji 對應表（前後端共用）
 */
export interface ItemInfo {
  name: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  emoji: string;
}

export const ITEM_NAMES: Record<string, ItemInfo> = {
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
  "mat-fire-004":      { name: "火靈結晶",   rarity: "rare",      emoji: "❤️‍🔥" },
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
  // 技能書
  "skill-wood-001":    { name: "木靈術·初",  rarity: "uncommon",  emoji: "📗" },
  "skill-wood-002":    { name: "木靈術·進",  rarity: "rare",      emoji: "📗" },
  "skill-fire-001":    { name: "火靈術·初",  rarity: "uncommon",  emoji: "📕" },
  "skill-fire-002":    { name: "火靈術·進",  rarity: "rare",      emoji: "📕" },
  "skill-earth-001":   { name: "土靈術·初",  rarity: "uncommon",  emoji: "📒" },
  "skill-earth-002":   { name: "土靈術·進",  rarity: "rare",      emoji: "📒" },
  "skill-metal-001":   { name: "金靈術·初",  rarity: "uncommon",  emoji: "📙" },
  "skill-metal-002":   { name: "金靈術·進",  rarity: "rare",      emoji: "📙" },
  "skill-water-001":   { name: "水靈術·初",  rarity: "uncommon",  emoji: "📘" },
  "skill-water-002":   { name: "水靈術·進",  rarity: "rare",      emoji: "📘" },
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
