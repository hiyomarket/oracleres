/**
 * ItemDetailModal.tsx — 道具詳細說明彈窗
 * 點擊背包或拍賣行的道具卡片時彈出，顯示五行屬性、效果數值、使用說明
 */

// ─── 道具詳細資料庫（靜態，對應 getInventory 的 ITEM_NAMES key）───
export interface ItemDetail {
  name: string;
  emoji: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  element: "wood" | "fire" | "earth" | "metal" | "water" | "none";
  itemType: "material" | "consumable" | "equipment" | "skill_book" | "special";
  description: string;
  effects: Array<{ label: string; value: string; color?: string }>;
  useTip?: string;
  source?: string;
}

const ELEMENT_INFO: Record<string, { label: string; color: string; emoji: string; bg: string }> = {
  wood:  { label: "木",  color: "#22c55e", emoji: "🌿", bg: "rgba(34,197,94,0.12)" },
  fire:  { label: "火",  color: "#ef4444", emoji: "🔥", bg: "rgba(239,68,68,0.12)" },
  earth: { label: "土",  color: "#eab308", emoji: "⛰️", bg: "rgba(234,179,8,0.12)" },
  metal: { label: "金",  color: "#94a3b8", emoji: "⚔️", bg: "rgba(148,163,184,0.12)" },
  water: { label: "水",  color: "#3b82f6", emoji: "💧", bg: "rgba(59,130,246,0.12)" },
  none:  { label: "無屬性", color: "#64748b", emoji: "✨", bg: "rgba(100,116,139,0.12)" },
};

const RARITY_INFO: Record<string, { label: string; color: string; glow: string }> = {
  common:    { label: "普通",  color: "#94a3b8", glow: "rgba(148,163,184,0.3)" },
  uncommon:  { label: "優良",  color: "#4ade80", glow: "rgba(74,222,128,0.3)" },
  rare:      { label: "稀有",  color: "#60a5fa", glow: "rgba(96,165,250,0.35)" },
  epic:      { label: "史詩",  color: "#c084fc", glow: "rgba(192,132,252,0.35)" },
  legendary: { label: "傳說",  color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
};

export const ITEM_DETAIL_DB: Record<string, ItemDetail> = {
  // ─── 草藥類 ───
  "herb-001": {
    name: "青草藥", emoji: "🌿", rarity: "common", element: "wood", itemType: "consumable",
    description: "生長於靈氣充沛的山林間，散發淡淡清香。是最基礎的回復藥材，初入修行者的必備物資。",
    effects: [{ label: "回復 HP", value: "+50", color: "#22c55e" }],
    useTip: "戰鬥中使用可立即回復少量生命值，適合在緊急時刻使用。",
    source: "木系節點採集 / 怪物掉落",
  },
  "herb-002": {
    name: "靈芝草", emoji: "🍄", rarity: "uncommon", element: "wood", itemType: "consumable",
    description: "千年靈芝，蘊含豐沛的木系靈氣。傳說在古木深處才能尋得，效力遠勝普通草藥。",
    effects: [
      { label: "回復 HP", value: "+150", color: "#22c55e" },
      { label: "回復 MP", value: "+30", color: "#60a5fa" },
    ],
    useTip: "同時回復生命與法力，性價比極高的中級消耗品。",
    source: "木系高級節點採集 / 精英怪物掉落",
  },
  "herb-fire-001": {
    name: "火焰草", emoji: "🌺", rarity: "uncommon", element: "fire", itemType: "consumable",
    description: "生長於火山地帶的稀有草藥，葉片呈現深紅色，觸摸時有微微溫熱感。",
    effects: [
      { label: "回復 HP", value: "+80", color: "#22c55e" },
      { label: "火屬性加成", value: "+5%（10秒）", color: "#ef4444" },
    ],
    useTip: "適合火系角色在戰鬥前使用，短暫提升火屬性傷害。",
    source: "火系節點採集",
  },
  "herb-water-001": {
    name: "水靈草", emoji: "💧", rarity: "uncommon", element: "water", itemType: "consumable",
    description: "生長於清澈溪流旁的水靈草，葉片晶瑩剔透，含有大量水系靈氣。",
    effects: [
      { label: "回復 MP", value: "+100", color: "#60a5fa" },
      { label: "回復 HP", value: "+40", color: "#22c55e" },
    ],
    useTip: "偏向法力回復，適合施法者在法力耗盡時使用。",
    source: "水系節點採集",
  },
  "herb-earth-001": {
    name: "土靈草", emoji: "🌱", rarity: "uncommon", element: "earth", itemType: "consumable",
    description: "紮根於肥沃土地的靈草，蘊含大地的穩固之力。",
    effects: [{ label: "回復 HP", value: "+120", color: "#22c55e" }, { label: "體力回復", value: "+20", color: "#eab308" }],
    useTip: "回復量較高，適合持久戰使用。",
    source: "土系節點採集",
  },
  "herb-metal-001": {
    name: "金靈草", emoji: "🌾", rarity: "uncommon", element: "metal", itemType: "consumable",
    description: "生長於礦脈附近的金系草藥，莖葉帶有金屬光澤。",
    effects: [{ label: "回復 HP", value: "+90", color: "#22c55e" }, { label: "防禦加成", value: "+3（10秒）", color: "#94a3b8" }],
    useTip: "短暫提升防禦，適合在受到強力攻擊前使用。",
    source: "金系節點採集",
  },
  "herb-wood-001": {
    name: "木靈草", emoji: "🌿", rarity: "common", element: "wood", itemType: "consumable",
    description: "最常見的木系草藥，隨處可見，但靈氣純粹。",
    effects: [{ label: "回復 HP", value: "+60", color: "#22c55e" }],
    useTip: "基礎回復藥材，適合批量攜帶。",
    source: "木系節點採集",
  },
  // ─── 食物類 ───
  "food-001": {
    name: "野豬肉", emoji: "🥩", rarity: "common", element: "earth", itemType: "consumable",
    description: "擊敗野豬後獲得的新鮮肉塊，富含蛋白質，能快速補充體力。",
    effects: [{ label: "回復 HP", value: "+80", color: "#22c55e" }, { label: "體力回復", value: "+15", color: "#eab308" }],
    useTip: "食物類道具，回復效果略低於藥草但容易獲得。",
    source: "野豬怪物掉落",
  },
  "food-002": {
    name: "靈果", emoji: "🍎", rarity: "uncommon", element: "wood", itemType: "consumable",
    description: "吸收天地靈氣的神奇果實，散發迷人香氣，食用後精神煥發。",
    effects: [{ label: "回復 HP", value: "+120", color: "#22c55e" }, { label: "回復 MP", value: "+50", color: "#60a5fa" }],
    useTip: "雙重回復效果，性價比優秀的中級食物。",
    source: "木系精英怪物掉落 / 採集",
  },
  "food-003": {
    name: "仙桃", emoji: "🍑", rarity: "rare", element: "wood", itemType: "consumable",
    description: "傳說中三千年一開花、三千年一結果的仙桃，蘊含無盡生機。",
    effects: [
      { label: "回復 HP", value: "+300", color: "#22c55e" },
      { label: "回復 MP", value: "+150", color: "#60a5fa" },
      { label: "全屬性加成", value: "+5%（30秒）", color: "#fbbf24" },
    ],
    useTip: "珍貴的高級食物，建議在BOSS戰前使用。",
    source: "稀有怪物掉落 / 特殊事件",
  },
  "food-earth-001": {
    name: "山藥", emoji: "🥔", rarity: "common", element: "earth", itemType: "consumable",
    description: "生長於土系節點的根莖類食物，口感綿密，補充體力效果佳。",
    effects: [{ label: "回復 HP", value: "+70", color: "#22c55e" }, { label: "體力回復", value: "+25", color: "#eab308" }],
    useTip: "體力回復效果優秀，適合長途跋涉後使用。",
    source: "土系節點採集",
  },
  // ─── 消耗品 ───
  "consumable-potion": {
    name: "小回血藥", emoji: "🧪", rarity: "common", element: "none", itemType: "consumable",
    description: "煉製師調配的基礎回血藥水，裝在小巧的玻璃瓶中，散發淡紅色光芒。",
    effects: [{ label: "立即回復 HP", value: "+100", color: "#22c55e" }],
    useTip: "戰鬥中最常用的消耗品，建議隨時備足。",
    source: "天命商城購買 / 怪物掉落",
  },
  "consumable-elixir": {
    name: "元氣丹", emoji: "💊", rarity: "uncommon", element: "none", itemType: "consumable",
    description: "由多種靈草煉製而成的丹藥，金黃色的藥丸散發溫暖光芒，服用後元氣大增。",
    effects: [
      { label: "回復 HP", value: "+200", color: "#22c55e" },
      { label: "回復 MP", value: "+100", color: "#60a5fa" },
      { label: "體力回復", value: "+30", color: "#eab308" },
    ],
    useTip: "全面回復的優質丹藥，適合在艱難戰鬥後使用。",
    source: "天命商城購買 / 精英怪物掉落",
  },
  // ─── 材料類（木系）───
  "mat-wood-001": {
    name: "堅木材", emoji: "🪵", rarity: "common", element: "wood", itemType: "material",
    description: "從古老樹木上砍下的堅硬木材，紋理細密，是鍛造木系裝備的基礎材料。",
    effects: [{ label: "鍛造材料", value: "木系裝備", color: "#22c55e" }],
    useTip: "鍛造材料，不可直接使用。可在鍛造屋製作裝備或出售給其他玩家。",
    source: "木系節點採集 / 怪物掉落",
  },
  "mat-wood-002": {
    name: "靈木精華", emoji: "🌳", rarity: "uncommon", element: "wood", itemType: "material",
    description: "從千年古木中提煉的精華液，蘊含豐沛的木系靈氣，閃爍著翠綠光芒。",
    effects: [{ label: "鍛造材料", value: "木系中級裝備", color: "#22c55e" }, { label: "靈氣純度", value: "★★★☆☆", color: "#4ade80" }],
    useTip: "中級鍛造材料，可製作稀有木系裝備。",
    source: "木系精英節點採集",
  },
  // ─── 材料類（火系）───
  "mat-fire-001": {
    name: "火焰石", emoji: "🔥", rarity: "common", element: "fire", itemType: "material",
    description: "火山地帶常見的礦石，內部蘊含火焰能量，觸摸時感受到灼熱。",
    effects: [{ label: "鍛造材料", value: "火系裝備", color: "#ef4444" }],
    useTip: "火系鍛造基礎材料，可製作火屬性武器或護甲。",
    source: "火系節點採集 / 火系怪物掉落",
  },
  "mat-fire-002": {
    name: "熔岩碎片", emoji: "🌋", rarity: "uncommon", element: "fire", itemType: "material",
    description: "從活火山中取得的熔岩碎片，溫度極高，需要特殊容器盛放。",
    effects: [{ label: "鍛造材料", value: "火系中級裝備", color: "#ef4444" }, { label: "溫度等級", value: "極高", color: "#f97316" }],
    useTip: "中級火系材料，鍛造時需要特殊爐具。",
    source: "火系精英節點 / 火焰怪物掉落",
  },
  // ─── 材料類（土系）───
  "mat-earth-001": {
    name: "土元素晶", emoji: "🪨", rarity: "common", element: "earth", itemType: "material",
    description: "土系靈氣凝聚而成的晶石，沉甸甸的，散發大地的穩固氣息。",
    effects: [{ label: "鍛造材料", value: "土系裝備", color: "#eab308" }],
    useTip: "土系基礎鍛造材料，適合製作防禦型裝備。",
    source: "土系節點採集",
  },
  "mat-earth-002": {
    name: "大地精華", emoji: "⛰️", rarity: "uncommon", element: "earth", itemType: "material",
    description: "從深層地脈中提取的土系精華，蘊含大地母神的力量。",
    effects: [{ label: "鍛造材料", value: "土系中級裝備", color: "#eab308" }, { label: "防禦加成潛力", value: "+8%", color: "#ca8a04" }],
    useTip: "中級土系材料，製作的裝備防禦屬性更高。",
    source: "土系精英節點",
  },
  // ─── 材料類（金系）───
  "mat-metal-001": {
    name: "鐵礦石", emoji: "⚙️", rarity: "common", element: "metal", itemType: "material",
    description: "最常見的金屬礦石，雖然普通，卻是所有金屬裝備的基礎原料。",
    effects: [{ label: "鍛造材料", value: "金系裝備", color: "#94a3b8" }],
    useTip: "金系最基礎的鍛造材料，需求量大，可大量囤積。",
    source: "金系節點採集",
  },
  "mat-metal-002": {
    name: "銀礦石", emoji: "🥈", rarity: "uncommon", element: "metal", itemType: "material",
    description: "純淨的銀礦石，具有天然的淨化效果，對邪氣有一定抑制作用。",
    effects: [{ label: "鍛造材料", value: "金系中級裝備", color: "#94a3b8" }, { label: "淨化效果", value: "輕微", color: "#cbd5e1" }],
    useTip: "中級金系材料，製作的裝備帶有淨化屬性。",
    source: "金系精英節點",
  },
  "mat-metal-003": {
    name: "金礦石", emoji: "🥇", rarity: "rare", element: "metal", itemType: "material",
    description: "稀有的純金礦石，閃耀著迷人的金色光芒，象徵財富與力量。",
    effects: [{ label: "鍛造材料", value: "金系高級裝備", color: "#fbbf24" }, { label: "市場價值", value: "極高", color: "#f59e0b" }],
    useTip: "稀有金系材料，可製作強力裝備或直接在拍賣行出售獲利。",
    source: "金系精英節點 / 稀有怪物掉落",
  },
  // ─── 材料類（水系）───
  "mat-water-001": {
    name: "水晶碎片", emoji: "💎", rarity: "common", element: "water", itemType: "material",
    description: "水系靈氣凝結而成的晶體碎片，清澈透明，折射出七彩光芒。",
    effects: [{ label: "鍛造材料", value: "水系裝備", color: "#3b82f6" }],
    useTip: "水系基礎鍛造材料，也可用於製作法力相關裝備。",
    source: "水系節點採集",
  },
  "mat-water-002": {
    name: "深海珍珠", emoji: "🔮", rarity: "rare", element: "water", itemType: "material",
    description: "來自深海的神秘珍珠，蘊含深邃的水系靈力，散發柔和的藍色光芒。",
    effects: [{ label: "鍛造材料", value: "水系高級裝備", color: "#3b82f6" }, { label: "法力加成潛力", value: "+12%", color: "#60a5fa" }],
    useTip: "稀有水系材料，製作的裝備大幅提升法力屬性。",
    source: "水系精英節點 / 深海怪物掉落",
  },
  // ─── 怪物掉落 ───
  "material-bone": {
    name: "怪物骨骼", emoji: "🦴", rarity: "common", element: "none", itemType: "material",
    description: "從怪物身上取得的骨骼，雖然普通，但可作為多種裝備的輔助材料。",
    effects: [{ label: "鍛造輔助材料", value: "通用", color: "#94a3b8" }],
    useTip: "通用鍛造輔助材料，幾乎所有裝備配方都會用到。",
    source: "各類怪物掉落",
  },
  "material-scale": {
    name: "怪物鱗片", emoji: "🐉", rarity: "uncommon", element: "none", itemType: "material",
    description: "從強力怪物身上剝取的鱗片，質地堅硬，具有天然的防禦屬性。",
    effects: [{ label: "鍛造材料", value: "防禦型裝備", color: "#94a3b8" }, { label: "硬度", value: "極高", color: "#64748b" }],
    useTip: "製作防禦裝備的優質材料，也有一定的市場價值。",
    source: "精英怪物掉落",
  },
  "material-crystal": {
    name: "元素水晶", emoji: "💠", rarity: "rare", element: "none", itemType: "material",
    description: "凝聚了多種元素靈氣的神秘水晶，閃爍著五彩光芒，是高級裝備的核心材料。",
    effects: [
      { label: "鍛造材料", value: "高級裝備核心", color: "#c084fc" },
      { label: "元素親和", value: "全屬性 +3%", color: "#a78bfa" },
    ],
    useTip: "稀有的全屬性材料，製作傳說裝備的必要材料之一。",
    source: "稀有精英怪物掉落",
  },
  "material-core": {
    name: "怪物核心", emoji: "⭐", rarity: "epic", element: "none", itemType: "material",
    description: "從強大怪物體內取出的能量核心，蘊含極其純粹的靈力，是最珍貴的鍛造材料之一。",
    effects: [
      { label: "鍛造材料", value: "史詩裝備", color: "#c084fc" },
      { label: "靈力純度", value: "★★★★★", color: "#a855f7" },
      { label: "市場價值", value: "非常高", color: "#fbbf24" },
    ],
    useTip: "史詩級鍛造核心材料，可製作頂級裝備或在拍賣行高價出售。",
    source: "BOSS級怪物掉落",
  },
  // ─── 技能書 ───
  "skill-wood-001": {
    name: "木靈術·初", emoji: "📗", rarity: "uncommon", element: "wood", itemType: "skill_book",
    description: "記載木系初級技能的古老典籍，封面呈現翠綠色，散發淡淡木香。",
    effects: [{ label: "學習技能", value: "木系初級技能", color: "#22c55e" }, { label: "需求等級", value: "Lv.1+", color: "#4ade80" }],
    useTip: "使用後永久學習木系初級技能。每種技能書只能學習一次。",
    source: "木系節點寶箱 / 精英怪物掉落",
  },
  "skill-wood-002": {
    name: "木靈術·進", emoji: "📗", rarity: "rare", element: "wood", itemType: "skill_book",
    description: "記載木系進階技能的珍貴典籍，需要一定修為才能理解其中奧義。",
    effects: [{ label: "學習技能", value: "木系進階技能", color: "#22c55e" }, { label: "需求等級", value: "Lv.10+", color: "#4ade80" }],
    useTip: "使用後永久學習木系進階技能，威力遠勝初級。",
    source: "木系精英節點 / 稀有怪物掉落",
  },
  "skill-fire-001": {
    name: "火靈術·初", emoji: "📕", rarity: "uncommon", element: "fire", itemType: "skill_book",
    description: "記載火系初級技能的古老典籍，封面呈現火紅色，觸摸時感到溫熱。",
    effects: [{ label: "學習技能", value: "火系初級技能", color: "#ef4444" }, { label: "需求等級", value: "Lv.1+", color: "#f87171" }],
    useTip: "使用後永久學習火系初級技能。",
    source: "火系節點寶箱 / 精英怪物掉落",
  },
  "skill-fire-002": {
    name: "火靈術·進", emoji: "📕", rarity: "rare", element: "fire", itemType: "skill_book",
    description: "記載火系進階技能的珍貴典籍，蘊含熾烈的火焰之力。",
    effects: [{ label: "學習技能", value: "火系進階技能", color: "#ef4444" }, { label: "需求等級", value: "Lv.10+", color: "#f87171" }],
    useTip: "使用後永久學習火系進階技能，傷害大幅提升。",
    source: "火系精英節點 / 稀有怪物掉落",
  },
  "skill-earth-001": {
    name: "土靈術·初", emoji: "📒", rarity: "uncommon", element: "earth", itemType: "skill_book",
    description: "記載土系初級技能的古老典籍，封面呈現土黃色，質感厚重。",
    effects: [{ label: "學習技能", value: "土系初級技能", color: "#eab308" }, { label: "需求等級", value: "Lv.1+", color: "#facc15" }],
    useTip: "使用後永久學習土系初級技能。",
    source: "土系節點寶箱 / 精英怪物掉落",
  },
  "skill-earth-002": {
    name: "土靈術·進", emoji: "📒", rarity: "rare", element: "earth", itemType: "skill_book",
    description: "記載土系進階技能的珍貴典籍，蘊含大地的磅礴之力。",
    effects: [{ label: "學習技能", value: "土系進階技能", color: "#eab308" }, { label: "需求等級", value: "Lv.10+", color: "#facc15" }],
    useTip: "使用後永久學習土系進階技能。",
    source: "土系精英節點 / 稀有怪物掉落",
  },
  "skill-metal-001": {
    name: "金靈術·初", emoji: "📙", rarity: "uncommon", element: "metal", itemType: "skill_book",
    description: "記載金系初級技能的古老典籍，封面呈現銀灰色，散發金屬光澤。",
    effects: [{ label: "學習技能", value: "金系初級技能", color: "#94a3b8" }, { label: "需求等級", value: "Lv.1+", color: "#cbd5e1" }],
    useTip: "使用後永久學習金系初級技能。",
    source: "金系節點寶箱 / 精英怪物掉落",
  },
  "skill-metal-002": {
    name: "金靈術·進", emoji: "📙", rarity: "rare", element: "metal", itemType: "skill_book",
    description: "記載金系進階技能的珍貴典籍，蘊含鋒利的金屬之力。",
    effects: [{ label: "學習技能", value: "金系進階技能", color: "#94a3b8" }, { label: "需求等級", value: "Lv.10+", color: "#cbd5e1" }],
    useTip: "使用後永久學習金系進階技能。",
    source: "金系精英節點 / 稀有怪物掉落",
  },
  "skill-water-001": {
    name: "水靈術·初", emoji: "📘", rarity: "uncommon", element: "water", itemType: "skill_book",
    description: "記載水系初級技能的古老典籍，封面呈現深藍色，散發清涼氣息。",
    effects: [{ label: "學習技能", value: "水系初級技能", color: "#3b82f6" }, { label: "需求等級", value: "Lv.1+", color: "#60a5fa" }],
    useTip: "使用後永久學習水系初級技能。",
    source: "水系節點寶箱 / 精英怪物掉落",
  },
  "skill-water-002": {
    name: "水靈術·進", emoji: "📘", rarity: "rare", element: "water", itemType: "skill_book",
    description: "記載水系進階技能的珍貴典籍，蘊含深邃的水系靈力。",
    effects: [{ label: "學習技能", value: "水系進階技能", color: "#3b82f6" }, { label: "需求等級", value: "Lv.10+", color: "#60a5fa" }],
    useTip: "使用後永久學習水系進階技能。",
    source: "水系精英節點 / 稀有怪物掉落",
  },
};

// ─── 彈窗組件 ───
interface ItemDetailModalProps {
  itemId: string | null;
  itemName?: string;
  emoji?: string;
  rarity?: string;
  onClose: () => void;
}

export default function ItemDetailModal({ itemId, itemName, emoji, rarity, onClose }: ItemDetailModalProps) {
  if (!itemId) return null;

  const detail = ITEM_DETAIL_DB[itemId];
  const rarityKey = (rarity ?? detail?.rarity ?? "common") as string;
  const ri = RARITY_INFO[rarityKey] ?? RARITY_INFO.common;
  const el = detail ? ELEMENT_INFO[detail.element] : ELEMENT_INFO.none;
  const displayName = detail?.name ?? itemName ?? itemId;
  const displayEmoji = detail?.emoji ?? emoji ?? "📦";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d1426 0%, #0a0f1e 100%)",
          border: `1px solid ${ri.color}40`,
          boxShadow: `0 0 30px ${ri.glow}, 0 20px 60px rgba(0,0,0,0.8)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 頂部光暈裝飾 */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, transparent, ${ri.color}, transparent)` }}
        />

        {/* 標題區 */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            {/* 道具圖示 */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
              style={{
                background: `${ri.color}15`,
                border: `1px solid ${ri.color}40`,
                boxShadow: `0 0 15px ${ri.glow}`,
              }}
            >
              {displayEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight" style={{ color: ri.color }}>
                {displayName}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {/* 稀有度 */}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={{ background: `${ri.color}20`, color: ri.color, border: `1px solid ${ri.color}40` }}
                >
                  {ri.label}
                </span>
                {/* 五行屬性 */}
                {detail && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                    style={{ background: el.bg, color: el.color, border: `1px solid ${el.color}40` }}
                  >
                    {el.emoji} {el.label}系
                  </span>
                )}
                {/* 道具類型 */}
                {detail && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}>
                    {detail.itemType === "material" ? "鍛造素材" :
                     detail.itemType === "consumable" ? "消耗道具" :
                     detail.itemType === "equipment" ? "裝備" :
                     detail.itemType === "skill_book" ? "技能書" : "特殊道具"}
                  </span>
                )}
              </div>
            </div>
            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 分隔線 */}
        <div className="mx-5 h-px" style={{ background: `${ri.color}20` }} />

        {/* 內容區 */}
        <div className="px-5 py-4 space-y-4">
          {/* 道具描述 */}
          {detail?.description ? (
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              {detail.description}
            </p>
          ) : (
            <p className="text-sm" style={{ color: "#475569" }}>暫無詳細說明</p>
          )}

          {/* 效果數值 */}
          {detail?.effects && detail.effects.length > 0 && (
            <div>
              <p className="text-[11px] font-bold mb-2" style={{ color: "#64748b", letterSpacing: "0.05em" }}>
                ── 道具效果 ──
              </p>
              <div className="space-y-1.5">
                {detail.effects.map((eff, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xs" style={{ color: "#94a3b8" }}>{eff.label}</span>
                    <span className="text-sm font-bold" style={{ color: eff.color ?? ri.color }}>{eff.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 使用說明 */}
          {detail?.useTip && (
            <div className="px-3 py-2.5 rounded-lg" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <p className="text-[10px] font-bold mb-1" style={{ color: "#fbbf24" }}>💡 使用說明</p>
              <p className="text-xs leading-relaxed" style={{ color: "#d4a017" }}>{detail.useTip}</p>
            </div>
          )}

          {/* 來源 */}
          {detail?.source && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "#475569" }}>📍 來源</span>
              <span className="text-[11px]" style={{ color: "#64748b" }}>{detail.source}</span>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{
              background: `${ri.color}15`,
              color: ri.color,
              border: `1px solid ${ri.color}35`,
            }}
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
