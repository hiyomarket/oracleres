/**
 * VirtualWorld 共用常數、型別與工具函數
 */

// ─── 經驗升級公式 V3（和後端 statEngine.calcExpToNextV2 相同） ───
// expToNext(lv) = floor(A × lv^(B + C × ln(lv)))
export function calcExpToNextFn(level: number, A = 2, B = 1.6, C = 0.25): number {
  if (level >= 99) return 999999;
  if (level <= 0) return Math.floor(A);
  return Math.floor(A * Math.pow(level, B + C * Math.log(level)));
}

// ─── 五行配色 ─────────────────────────────────────────────
export const WX_HEX: Record<string, string> = {
  wood: "#22c55e", fire: "#ef4444", earth: "#f59e0b", metal: "#e2e8f0", water: "#38bdf8",
};
export const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
export const WX_EMOJI: Record<string, string> = {
  wood: "🌿", fire: "🔥", earth: "🪨", metal: "⚡", water: "💧",
};
export const WX_GLOW: Record<string, string> = {
  wood: "0 0 20px rgba(34,197,94,0.6)", fire: "0 0 20px rgba(239,68,68,0.6)",
  earth: "0 0 20px rgba(245,158,11,0.6)", metal: "0 0 20px rgba(226,232,240,0.5)",
  water: "0 0 20px rgba(56,189,248,0.6)",
};
export const EV_COLOR: Record<string, string> = {
  combat: "#ef4444", move: "#60a5fa", gather: "#34d399",
  rest: "#a78bfa", rogue: "#f59e0b", system: "#e2e8f0",
};
export const EV_ICON: Record<string, string> = {
  combat: "⚔️", move: "🚶", gather: "🌿", rest: "😴", rogue: "🎲", system: "✨",
};
export const STRATEGIES = [
  { id: "explore" as const, icon: "🗺️", label: "探索" },
  { id: "combat"  as const, icon: "⚔️", label: "戰鬥" },
  { id: "gather"  as const, icon: "🌿", label: "採集" },
  { id: "rest"    as const, icon: "😴", label: "休息" },
  { id: "infuse"  as const, icon: "✨", label: "注靈" },
];
export const QUALITY_COLOR: Record<string, string> = {
  legendary: "#f59e0b", epic: "#a78bfa", rare: "#60a5fa",
  uncommon: "#34d399", common: "#94a3b8",
};
export const QUALITY_ZH: Record<string, string> = {
  legendary: "傳說", epic: "史詩", rare: "稀有", uncommon: "精良", common: "普通",
};

// GD-001 初始技能定義
export const SKILL_DEFS: Record<string, { name: string; element: string; type: "active" | "passive"; desc: string; icon: string }> = {
  "wood-basic-atk":  { name: "木行拳", element: "wood",  type: "active",  desc: "木屬基礎攻擊", icon: "🌿" },
  "wood-heal":       { name: "春風愈傈", element: "wood",  type: "active",  desc: "治癒 20% 最大 HP", icon: "🌼" },
  "wood-regen":      { name: "根脆之力", element: "wood",  type: "passive", desc: "戰鬥後自動回血 5%", icon: "🌱" },
  "fire-basic-atk":  { name: "烈焰拳", element: "fire",  type: "active",  desc: "火屬基礎攻擊", icon: "🔥" },
  "fire-burst":      { name: "爆烎衝波", element: "fire",  type: "active",  desc: "範圍火屬傷害", icon: "💥" },
  "fire-boost":      { name: "火行催化", element: "fire",  type: "passive", desc: "攻擊力 +10%", icon: "⭐" },
  "earth-basic-atk": { name: "山嶽拳", element: "earth", type: "active",  desc: "土屬基礎攻擊", icon: "🪨" },
  "earth-shield":    { name: "大地護盾", element: "earth", type: "active",  desc: "傷害免疫 30%", icon: "🛡️" },
  "earth-tough":     { name: "山嶽之體", element: "earth", type: "passive", desc: "防穡力 +15%", icon: "💪" },
  "metal-basic-atk": { name: "利金拳", element: "metal", type: "active",  desc: "金屬基礎攻擊", icon: "⚡" },
  "metal-pierce":    { name: "穿雲一擊", element: "metal", type: "active",  desc: "造成 150% 傷害", icon: "🗡️" },
  "metal-crit":      { name: "銀月洞察", element: "metal", type: "passive", desc: "15% 暴擊率", icon: "🎯" },
  "water-basic-atk": { name: "水流拳", element: "water", type: "active",  desc: "水屬基礎攻擊", icon: "💧" },
  "water-flow":      { name: "流水貊潤", element: "water", type: "active",  desc: "回復 15% MP", icon: "🌊" },
  "water-sense":     { name: "流水感知", element: "water", type: "passive", desc: "尋寶力 +10", icon: "🔮" },
};
export const WX_SKILL_ICON: Record<string, string> = { "木": "🌿", "火": "🔥", "土": "🪨", "金": "⚡", "水": "💧", "wood": "🌿", "fire": "🔥", "earth": "🪨", "metal": "⚡", "water": "💧" };
export const WX_ZH_TO_EN: Record<string, string> = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" };

// GD-002 三維五行屬性定義
export const COMBAT_ATTRS = [
  { key: "attack",      icon: "🔥", label: "攻擊力",  wx: "fire",   desc: "物理傷害基礎值" },
  { key: "defense",     icon: "🪨", label: "防禦力",  wx: "earth",  desc: "減少受到的傷害" },
  { key: "speed",       icon: "⚡", label: "命中力",  wx: "metal",  desc: "攻擊命中率與穿透" },
  { key: "healPower",   icon: "🌿", label: "治癒力",  wx: "wood",   desc: "戰鬥中自我回血量" },
  { key: "magicAttack", icon: "💧", label: "魔法攻擊", wx: "water",  desc: "元素傷害與狀態觸發" },
];
export const LIFE_ATTRS = [
  { key: "gatherPower",     icon: "🌿", label: "採集力",  wx: "wood",  desc: "植物/草藥掉落率加成" },
  { key: "forgePower",      icon: "🔥", label: "鍛冶力",  wx: "fire",  desc: "製造裝備成功率與品質" },
  { key: "carryWeight",     icon: "🪨", label: "承重力",  wx: "earth", desc: "背包格子數與可攜帶總重" },
  { key: "refinePower",     icon: "⚡", label: "精煉力",  wx: "metal", desc: "提升素材品質等級機率" },
  { key: "treasureHunting", icon: "💧", label: "尋寶力",  wx: "water", desc: "感知隱藏商店/任務/NPC" },
];

// GD-006 裝備部位
export const EQUIP_SLOTS = [
  { slot: "weapon",   icon: "⚔️", label: "主武器",  desc: "攻擊力+" },
  { slot: "offhand",  icon: "🗡️", label: "副手",    desc: "防禦力+" },
  { slot: "head",     icon: "⛑️", label: "頭盔",    desc: "HP+" },
  { slot: "body",     icon: "🛡️", label: "護甲",    desc: "防禦力+" },
  { slot: "hands",    icon: "🧤", label: "手套",    desc: "命中力+" },
  { slot: "feet",     icon: "👟", label: "鞋子",    desc: "速度+" },
  { slot: "ringA",    icon: "💍", label: "戒指",    desc: "五行屬性+" },
  { slot: "ringB",    icon: "💍", label: "戒指",    desc: "五行屬性+" },
  { slot: "necklace", icon: "📿", label: "項鍊",    desc: "MP+" },
  { slot: "amulet",   icon: "🔮", label: "護符",    desc: "特殊效果" },
];

export type PanelId = "combat" | "life" | "items" | "equip" | "skill" | "natal";

// GD-028 境界/職業/命格標籤
export const REALM_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  "初界": { label: "初界", color: "#94a3b8", icon: "🌱" },
  "中界": { label: "中界", color: "#60a5fa", icon: "⚡" },
  "高界": { label: "高界", color: "#f59e0b", icon: "👑" },
};
export const PROFESSION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  none:    { label: "無職業", color: "#64748b", icon: "🔰" },
  hunter:  { label: "獵人",   color: "#22c55e", icon: "🏹" },
  mage:    { label: "法師",   color: "#38bdf8", icon: "🔮" },
  tank:    { label: "鬥士",   color: "#f59e0b", icon: "🛡️" },
  thief:   { label: "盜賊",   color: "#a78bfa", icon: "🗡️" },
  wizard:  { label: "巫師",   color: "#e879f9", icon: "✨" },
};
export const FATE_LABELS: Record<string, { label: string; color: string; icon: string; fateName: string; desc: string }> = {
  wood:  { label: "木命", color: "#22c55e", icon: "🌿", fateName: "青龍命", desc: "HP+10%, 治癒力+5%" },
  fire:  { label: "火命", color: "#ef4444", icon: "🔥", fateName: "朱雀命", desc: "ATK+10%, MATK+10%" },
  earth: { label: "土命", color: "#f59e0b", icon: "🪨", fateName: "麒麟命", desc: "DEF+10%, MDEF+10%" },
  metal: { label: "金命", color: "#e2e8f0", icon: "⚡", fateName: "白虎命", desc: "SPD+10%, 暴擊率+5%" },
  water: { label: "水命", color: "#38bdf8", icon: "💧", fateName: "玄武命", desc: "MP+10%, 精神+5%" },
};

// ─── NodeInfoData 型別 ─────────────────────────────────────────
export type NodeInfoData = {
  node?: { name?: string; county?: string; dangerLevel?: number; description?: string; monsterLevel?: [number, number] };
  monsters?: Array<{ id: string; name: string; element: string; level: number; hp: number; isBoss?: boolean; description?: string; attack?: number; defense?: number; speed?: number; rarity?: string; skills?: string[]; race?: string; expReward?: number; dropItems?: Array<{ itemId: string; chance: number }> }>;
  resources?: Array<{ name: string; icon: string; rarity: string }>;
  questHints?: string[];
  adventurers?: Array<{ name: string; element: string; level: number; hp: number; maxHp: number; status: string }>;
};

// ─── AgentData 型別 ─────────────────────────────────────────
export type AgentData = {
  id?: number; agentName?: string; level?: number; hp?: number; maxHp?: number; mp?: number; maxMp?: number;
  stamina?: number; maxStamina?: number; gold?: number; strategy?: string; status?: string;
  dominantElement?: string; currentNodeId?: string; actionPoints?: number; maxActionPoints?: number;
  exp?: number; expToNext?: number; experience?: number; attack?: number; defense?: number; speed?: number;
  healPower?: number; magicAttack?: number; hitRate?: number;
  // GD-028 新增屬性
  mdef?: number; spr?: number; critRate?: number; critDamage?: number;
  realm?: string; profession?: string; professionTier?: number; fateElement?: string;
  // 生活系
  gatherPower?: number; forgePower?: number; carryWeight?: number; refinePower?: number; treasureHunting?: number;
  wuxingWood?: number; wuxingFire?: number; wuxingEarth?: number; wuxingMetal?: number; wuxingWater?: number;
  resistWood?: number; resistFire?: number; resistEarth?: number; resistMetal?: number; resistWater?: number;
  skillSlot1?: string | null; skillSlot2?: string | null; skillSlot3?: string | null; skillSlot4?: string | null;
  passiveSlot1?: string | null; passiveSlot2?: string | null;
  skills?: Array<{ name: string; element: string; level: number; description?: string; type?: string }>;
  lastDivineHealDate?: string | null;
  lastDivineEyeDate?: string | null;
  lastDivineStaminaDate?: string | null;
  movementMode?: string | null;
  avatarUrl?: string | null;
  freeStatPoints?: number;
  // 潛能點數分配
  potentialHp?: number; potentialMp?: number; potentialAtk?: number;
  potentialDef?: number; potentialSpd?: number; potentialMatk?: number;
};
