/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 價值評估引擎 ValueEngine v1.0
 * ═══════════════════════════════════════════════════════════════
 *
 * 四維價值評估體系：
 *   稀有度（Rarity）> 價值性（Power）> 實用性（Utility）> 影響程度（Impact）
 *
 * 此引擎統一管理：
 * 1. 品質等級（S/A/B/C/D）── 根據實際數值強度，同稀有度內細分
 * 2. 價值分數（ValueScore）── 0~1000 的綜合評分
 * 3. 定價算法 ── 根據價值分數計算金幣/靈石售價
 * 4. 流通權限 ── 決定物品可以出現在哪些商店、是否可交易
 * 5. 掉落等級匹配 ── 決定哪些等級的怪物可以掉落此物品
 * 6. 稀有度校正 ── 根據實際數值修正錯誤的稀有度標記
 */

// ═══════════════════════════════════════════════════════════════
// 一、品質等級定義
// ═══════════════════════════════════════════════════════════════

/** 品質等級：S > A > B > C > D */
export type QualityGrade = "S" | "A" | "B" | "C" | "D";

/** 品質等級對應的價格倍率 */
export const QUALITY_PRICE_MULTIPLIER: Record<QualityGrade, number> = {
  S: 4.0,   // 頂級品質，價格 ×4
  A: 2.5,   // 優秀品質，價格 ×2.5
  B: 1.5,   // 良好品質，價格 ×1.5
  C: 1.0,   // 標準品質，基準價格
  D: 0.6,   // 低品質，價格 ×0.6
};

/** 品質等級的百分位閾值（在同稀有度+同類型中的排名） */
export const QUALITY_PERCENTILE: Record<QualityGrade, [number, number]> = {
  S: [90, 100],  // 前 10%
  A: [70, 90],   // 10%~30%
  B: [40, 70],   // 30%~60%
  C: [15, 40],   // 40%~85%
  D: [0, 15],    // 後 15%
};

// ═══════════════════════════════════════════════════════════════
// 二、稀有度定義與基礎價值
// ═══════════════════════════════════════════════════════════════

export const RARITY_ORDER = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = typeof RARITY_ORDER[number];

/** 稀有度基礎價值倍率（用於計算 ValueScore） */
export const RARITY_VALUE_MULTIPLIER: Record<string, number> = {
  common: 1.0,
  rare: 3.0,
  epic: 8.0,
  legendary: 20.0,
};

// ═══════════════════════════════════════════════════════════════
// 三、道具價值評估
// ═══════════════════════════════════════════════════════════════

/** 道具類型基礎價值 */
const ITEM_CATEGORY_BASE: Record<string, number> = {
  material_basic: 10,
  material_drop: 25,
  consumable: 40,
  quest: 15,
  treasure: 100,
  skillbook: 200,
  equipment_material: 50,
};

/** 道具使用效果的價值加成 */
function evaluateItemEffect(useEffect: { type: string; value: number; duration?: number } | null): number {
  if (!useEffect) return 0;
  let score = 0;
  const v = useEffect.value || 0;
  const d = useEffect.duration || 1;
  switch (useEffect.type) {
    case "heal_hp": score = v * 0.5 * d; break;
    case "heal_mp": score = v * 0.8 * d; break;
    case "buff_attack": score = v * 2.0 * d; break;
    case "buff_defense": score = v * 1.5 * d; break;
    case "buff_speed": score = v * 1.8 * d; break;
    case "buff_all": score = v * 3.0 * d; break;
    case "revive": score = v * 5.0; break;
    case "cure_status": score = 30; break;
    case "exp_boost": score = v * 1.0 * d; break;
    case "gold_boost": score = v * 0.8 * d; break;
    default: score = v * 1.0;
  }
  return Math.round(score);
}

export interface ItemValueResult {
  /** 價值分數 0~1000 */
  valueScore: number;
  /** 品質等級 S/A/B/C/D */
  qualityGrade: QualityGrade;
  /** 建議金幣售價 */
  suggestedCoinPrice: number;
  /** 建議靈石售價（0 表示不適合靈石商店） */
  suggestedStonePrice: number;
  /** 校正後的稀有度 */
  correctedRarity: string;
  /** 流通權限 */
  tradeRules: TradeRules;
  /** 建議掉落等級範圍 */
  dropLevelRange: [number, number];
  /** 四維分數明細 */
  breakdown: {
    rarityScore: number;
    powerScore: number;
    utilityScore: number;
    impactScore: number;
  };
}

export interface TradeRules {
  /** 是否可交易（玩家間） */
  tradeable: boolean;
  /** 是否可在一般商店上架 */
  normalShop: boolean;
  /** 是否可在靈石商店上架 */
  spiritShop: boolean;
  /** 是否可在密店上架 */
  secretShop: boolean;
  /** 是否可在拍賣行上架 */
  auctionHouse: boolean;
}

/**
 * 評估道具價值
 */
export function evaluateItem(item: {
  category: string;
  rarity: string;
  useEffect?: { type: string; value: number; duration?: number } | null;
  stackLimit?: number;
}): ItemValueResult {
  const categoryBase = ITEM_CATEGORY_BASE[item.category] || 15;
  const rarityMult = RARITY_VALUE_MULTIPLIER[item.rarity] || 1.0;

  // 1. 稀有度分數（0~400）
  const rarityScore = Math.round(rarityMult * 20);

  // 2. 價值性分數（0~300）── 根據效果強度
  const effectValue = evaluateItemEffect(item.useEffect || null);
  const powerScore = Math.min(300, Math.round(effectValue * 1.5));

  // 3. 實用性分數（0~200）── 根據類型和堆疊上限
  let utilityScore = 0;
  if (item.category === "consumable") utilityScore += 80;
  else if (item.category === "material_basic") utilityScore += 40;
  else if (item.category === "material_drop") utilityScore += 60;
  else if (item.category === "treasure") utilityScore += 120;
  else if (item.category === "skillbook") utilityScore += 150;
  else if (item.category === "equipment_material") utilityScore += 70;
  else utilityScore += 30;
  if ((item.stackLimit || 99) <= 5) utilityScore += 30; // 稀缺性加分

  // 4. 影響程度分數（0~100）
  let impactScore = 0;
  if (item.category === "skillbook") impactScore += 60;
  if (item.category === "treasure") impactScore += 40;
  if (effectValue > 100) impactScore += 40;

  const valueScore = Math.min(1000, rarityScore + powerScore + utilityScore + impactScore);

  // 品質等級
  const qualityGrade = scoreToQuality(valueScore, item.rarity, "item");

  // 定價
  const basePrice = categoryBase * rarityMult;
  const qualityMult = QUALITY_PRICE_MULTIPLIER[qualityGrade];
  const suggestedCoinPrice = Math.round(basePrice * qualityMult);
  const suggestedStonePrice = item.rarity === "common" ? 0 : Math.round(suggestedCoinPrice * 0.03);

  // 稀有度校正
  const correctedRarity = correctRarity(valueScore, item.rarity);

  // 流通權限
  const tradeRules = determineTradeRules(correctedRarity, qualityGrade, "item");

  // 掉落等級
  const dropLevelRange = determineDropLevel(correctedRarity, qualityGrade);

  return {
    valueScore, qualityGrade, suggestedCoinPrice, suggestedStonePrice,
    correctedRarity, tradeRules, dropLevelRange,
    breakdown: { rarityScore, powerScore, utilityScore, impactScore },
  };
}

// ═══════════════════════════════════════════════════════════════
// 四、裝備價值評估
// ═══════════════════════════════════════════════════════════════

/** 裝備階級基礎價值 */
const EQUIP_TIER_VALUE: Record<string, number> = {
  "初階": 100,
  "中階": 400,
  "高階": 1500,
  "傳說": 8000,
};

/** 裝備部位價值修正 */
const EQUIP_SLOT_VALUE: Record<string, number> = {
  weapon: 1.3,     // 武器最值錢
  armor: 1.2,      // 護甲次之
  helmet: 1.0,
  shoes: 0.9,
  accessory: 1.1,  // 飾品有特殊效果
  offhand: 1.0,
};

/**
 * 評估裝備價值
 */
export function evaluateEquipment(equip: {
  tier: string;
  rarity: string;
  slot: string;
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  levelRequired: number;
  specialEffect?: string | null;
  affix1?: { value: number } | null;
  affix2?: { value: number } | null;
  affix3?: { value: number } | null;
  affix4?: { value: number } | null;
  affix5?: { value: number } | null;
}): ItemValueResult {
  const tierBase = EQUIP_TIER_VALUE[equip.tier] || 100;
  const slotMult = EQUIP_SLOT_VALUE[equip.slot] || 1.0;
  const rarityMult = RARITY_VALUE_MULTIPLIER[equip.rarity] || 1.0;

  // 1. 稀有度分數（0~400）
  const rarityScore = Math.round(rarityMult * 20);

  // 2. 價值性分數（0~300）── 根據屬性加成總和
  const totalStats = equip.hpBonus + equip.attackBonus * 5 + equip.defenseBonus * 4 + equip.speedBonus * 6;
  // 詞條加分
  const affixCount = [equip.affix1, equip.affix2, equip.affix3, equip.affix4, equip.affix5].filter(Boolean).length;
  const affixBonus = affixCount * 25;
  const powerScore = Math.min(300, Math.round(totalStats * 0.8 + affixBonus));

  // 3. 實用性分數（0~200）── 根據部位和等級需求
  let utilityScore = Math.round(slotMult * 60);
  if (equip.levelRequired <= 5) utilityScore += 40;  // 低等級裝備泛用性高
  else if (equip.levelRequired <= 15) utilityScore += 30;
  else if (equip.levelRequired <= 30) utilityScore += 20;
  else utilityScore += 10;

  // 4. 影響程度分數（0~100）── 特殊效果
  let impactScore = 0;
  if (equip.specialEffect && equip.specialEffect.length > 10) impactScore += 50;
  if (affixCount >= 3) impactScore += 30;
  if (affixCount >= 5) impactScore += 20;

  const valueScore = Math.min(1000, rarityScore + powerScore + utilityScore + impactScore);

  // 品質等級
  const qualityGrade = scoreToQuality(valueScore, equip.rarity, "equipment");

  // 定價
  const basePrice = tierBase * slotMult * rarityMult;
  const qualityMult = QUALITY_PRICE_MULTIPLIER[qualityGrade];
  const suggestedCoinPrice = Math.round(basePrice * qualityMult);
  const suggestedStonePrice = equip.rarity === "common" ? 0 : Math.round(suggestedCoinPrice * 0.025);

  // 稀有度校正
  const correctedRarity = correctEquipRarity(equip);

  // 流通權限
  const tradeRules = determineTradeRules(correctedRarity, qualityGrade, "equipment");

  // 掉落等級
  const dropLevelRange = determineDropLevel(correctedRarity, qualityGrade);

  return {
    valueScore, qualityGrade, suggestedCoinPrice, suggestedStonePrice,
    correctedRarity, tradeRules, dropLevelRange,
    breakdown: { rarityScore, powerScore, utilityScore, impactScore },
  };
}

// ═══════════════════════════════════════════════════════════════
// 五、技能書價值評估
// ═══════════════════════════════════════════════════════════════

/** 技能階級基礎價值 */
const SKILL_TIER_VALUE: Record<string, number> = {
  "初階": 150,
  "中階": 600,
  "高階": 2500,
  "傳說": 12000,
  "天命": 35000,
};

/** 技能類型價值修正 */
const SKILL_TYPE_VALUE: Record<string, number> = {
  attack: 1.0,
  heal: 1.2,      // 治療技能更稀缺
  buff: 1.1,
  debuff: 1.0,
  passive: 1.3,   // 被動技能永久效果
  special: 1.5,   // 特殊技能最珍貴
};

/**
 * 從 description 解析真實威力百分比
 * 例如 "造成 180% 傷害" → 180
 */
export function parseRealPowerFromDesc(description: string | null): number | null {
  if (!description) return null;
  // 匹配 "造成 XXX% 傷害" 或 "XXX% 木屬性傷害" 等
  const patterns = [
    /造成\s*(\d+)%/,
    /(\d+)%\s*(?:木|火|土|金|水)?(?:屬性)?傷害/,
    /傷害\s*(\d+)%/,
    /恢復.*?(\d+)%/,
    /(\d+)%\s*(?:減傷|反彈|加成)/,
    /損失\s*(\d+)%/,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/**
 * 從 description 解析附加效果（暈眩、石化、中毒等）
 */
function parseSpecialEffects(description: string | null): string[] {
  if (!description) return [];
  const effects: string[] = [];
  const keywords = ["暈眩", "石化", "混亂", "中毒", "冰凍", "灼燒", "沉默", "擊退",
    "減速", "無法治癒", "無視防禦", "無視所有防禦", "全體", "吸血", "反彈",
    "MP 消耗減半", "免疫", "復活", "護盾"];
  for (const kw of keywords) {
    if (description.includes(kw)) effects.push(kw);
  }
  return effects;
}

/**
 * 評估技能書價值
 */
export function evaluateSkill(skill: {
  tier: string;
  rarity: string;
  skillType: string;
  powerPercent: number;
  mpCost: number;
  cooldown: number;
  learnLevel: number;
  description?: string | null;
}): ItemValueResult {
  const tierBase = SKILL_TIER_VALUE[skill.tier] || 150;
  const typeMult = SKILL_TYPE_VALUE[skill.skillType] || 1.0;
  const rarityMult = RARITY_VALUE_MULTIPLIER[skill.rarity] || 1.0;

  // 從 description 解析真實威力
  const realPower = parseRealPowerFromDesc(skill.description || null) || skill.powerPercent;
  const specialEffects = parseSpecialEffects(skill.description || null);

  // 1. 稀有度分數（0~400）
  const rarityScore = Math.round(rarityMult * 20);

  // 2. 價值性分數（0~300）── 根據威力、MP效率、冷卻
  let powerScore = 0;
  // 威力越高分數越高
  powerScore += Math.min(150, Math.round(realPower * 0.5));
  // MP 效率（威力/MP消耗）
  const mpEfficiency = skill.mpCost > 0 ? realPower / skill.mpCost : realPower * 2;
  powerScore += Math.min(80, Math.round(mpEfficiency * 3));
  // 低冷卻加分（0 冷卻 = 每回合都能用）
  if (skill.cooldown === 0) powerScore += 50;
  else if (skill.cooldown === 1) powerScore += 30;
  else if (skill.cooldown <= 3) powerScore += 15;
  // 特殊效果加分
  powerScore += Math.min(80, specialEffects.length * 25);
  powerScore = Math.min(300, powerScore);

  // 3. 實用性分數（0~200）
  let utilityScore = Math.round(typeMult * 50);
  if (skill.skillType === "heal") utilityScore += 40;
  if (skill.skillType === "passive") utilityScore += 50;
  if (specialEffects.includes("全體")) utilityScore += 30;
  if (specialEffects.includes("無視防禦") || specialEffects.includes("無視所有防禦")) utilityScore += 40;
  utilityScore = Math.min(200, utilityScore);

  // 4. 影響程度分數（0~100）
  let impactScore = 0;
  if (realPower >= 250) impactScore += 40;
  if (specialEffects.includes("石化") || specialEffects.includes("無視所有防禦")) impactScore += 30;
  if (skill.cooldown === 0 && realPower >= 150) impactScore += 20;
  if (skill.tier === "天命" || skill.tier === "傳說") impactScore += 30;
  impactScore = Math.min(100, impactScore);

  const valueScore = Math.min(1000, rarityScore + powerScore + utilityScore + impactScore);

  // 品質等級
  const qualityGrade = scoreToQuality(valueScore, skill.rarity, "skill");

  // 定價
  const basePrice = tierBase * typeMult;
  const qualityMult = QUALITY_PRICE_MULTIPLIER[qualityGrade];
  const suggestedCoinPrice = Math.round(basePrice * qualityMult);
  const suggestedStonePrice = Math.round(suggestedCoinPrice * 0.03);

  // 稀有度校正
  const correctedRarity = correctSkillRarity(skill.tier, realPower, specialEffects, skill.cooldown);

  // 流通權限
  const tradeRules = determineTradeRules(correctedRarity, qualityGrade, "skill");

  // 掉落等級
  const dropLevelRange = determineDropLevel(correctedRarity, qualityGrade);

  return {
    valueScore, qualityGrade, suggestedCoinPrice, suggestedStonePrice,
    correctedRarity, tradeRules, dropLevelRange,
    breakdown: { rarityScore, powerScore, utilityScore, impactScore },
  };
}

// ═══════════════════════════════════════════════════════════════
// 六、品質等級計算
// ═══════════════════════════════════════════════════════════════

/** 各稀有度+類型的 ValueScore 基準範圍 */
const VALUE_SCORE_RANGES: Record<string, Record<string, [number, number]>> = {
  item: {
    common: [20, 120],
    rare: [80, 250],
    epic: [200, 500],
    legendary: [400, 800],
  },
  equipment: {
    common: [30, 180],
    rare: [120, 350],
    epic: [280, 600],
    legendary: [500, 900],
  },
  skill: {
    common: [40, 200],
    rare: [150, 400],
    epic: [350, 700],
    legendary: [600, 1000],
  },
};

function scoreToQuality(valueScore: number, rarity: string, type: "item" | "equipment" | "skill"): QualityGrade {
  const ranges = VALUE_SCORE_RANGES[type]?.[rarity] || [20, 200];
  const [min, max] = ranges;
  const range = max - min;
  const normalized = range > 0 ? (valueScore - min) / range : 0.5;
  const pct = Math.max(0, Math.min(1, normalized)) * 100;

  if (pct >= 90) return "S";
  if (pct >= 70) return "A";
  if (pct >= 40) return "B";
  if (pct >= 15) return "C";
  return "D";
}

// ═══════════════════════════════════════════════════════════════
// 七、稀有度校正
// ═══════════════════════════════════════════════════════════════

function correctRarity(valueScore: number, currentRarity: string): string {
  // 根據 valueScore 判斷應該屬於哪個稀有度
  if (valueScore >= 500) return "legendary";
  if (valueScore >= 250) return "epic";
  if (valueScore >= 100) return "rare";
  return "common";
}

function correctEquipRarity(equip: {
  tier: string; rarity: string;
  hpBonus: number; attackBonus: number; defenseBonus: number; speedBonus: number;
}): string {
  // 根據階級和數值總和判斷
  const totalStats = equip.hpBonus + equip.attackBonus * 5 + equip.defenseBonus * 4 + equip.speedBonus * 6;
  const tierMap: Record<string, string> = {
    "初階": totalStats > 60 ? "rare" : "common",
    "中階": totalStats > 200 ? "epic" : "rare",
    "高階": totalStats > 500 ? "legendary" : "epic",
    "傳說": "legendary",
  };
  return tierMap[equip.tier] || equip.rarity;
}

function correctSkillRarity(tier: string, realPower: number, effects: string[], cooldown: number): string {
  // 天命級技能一律 legendary
  if (tier === "天命") return "legendary";
  // 傳說級技能至少 epic
  if (tier === "傳說") {
    if (realPower >= 300 || effects.length >= 3) return "legendary";
    return "epic";
  }
  // 高階技能
  if (tier === "高階") {
    if (realPower >= 250 && effects.length >= 2) return "epic";
    if (realPower >= 200) return "rare";
    return "rare";
  }
  // 中階技能
  if (tier === "中階") {
    if (realPower >= 180 && effects.length >= 2) return "rare";
    if (realPower >= 150) return "rare";
    return "common";
  }
  // 初階技能
  if (realPower >= 130 || effects.length >= 2) return "rare";
  return "common";
}

// ═══════════════════════════════════════════════════════════════
// 八、流通權限規則
// ═══════════════════════════════════════════════════════════════

function determineTradeRules(rarity: string, quality: QualityGrade, type: "item" | "equipment" | "skill"): TradeRules {
  // 傳說級技能書禁止進入任何商店（只能通過任務/掉落獲得）
  if (type === "skill" && rarity === "legendary") {
    return {
      tradeable: false,
      normalShop: false,
      spiritShop: false,
      secretShop: false,
      auctionHouse: false,
    };
  }

  // S 級物品限制流通
  if (quality === "S") {
    return {
      tradeable: rarity !== "legendary",
      normalShop: false,
      spiritShop: false,
      secretShop: rarity !== "legendary",
      auctionHouse: rarity !== "legendary",
    };
  }

  // A 級物品
  if (quality === "A") {
    return {
      tradeable: true,
      normalShop: false,
      spiritShop: rarity === "rare" || rarity === "epic",
      secretShop: rarity === "epic" || rarity === "legendary",
      auctionHouse: true,
    };
  }

  // B 級物品
  if (quality === "B") {
    return {
      tradeable: true,
      normalShop: rarity === "common" || rarity === "rare",
      spiritShop: rarity === "rare" || rarity === "epic",
      secretShop: rarity === "epic",
      auctionHouse: true,
    };
  }

  // C/D 級物品
  return {
    tradeable: true,
    normalShop: rarity === "common" || rarity === "rare",
    spiritShop: rarity === "rare",
    secretShop: false,
    auctionHouse: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// 九、怪物掉落等級匹配
// ═══════════════════════════════════════════════════════════════

/**
 * 根據物品的稀有度和品質等級，決定適合掉落的怪物等級範圍
 */
function determineDropLevel(rarity: string, quality: QualityGrade): [number, number] {
  const base: Record<string, [number, number]> = {
    common: [1, 15],
    rare: [8, 30],
    epic: [20, 45],
    legendary: [35, 50],
  };
  const [min, max] = base[rarity] || [1, 15];

  // 品質等級微調
  const qualityShift: Record<QualityGrade, number> = { S: 5, A: 3, B: 0, C: -2, D: -3 };
  const shift = qualityShift[quality];

  return [
    Math.max(1, min + shift),
    Math.min(50, max + shift),
  ];
}

// ═══════════════════════════════════════════════════════════════
// 十、批量評估工具
// ═══════════════════════════════════════════════════════════════

/**
 * 從 description 解析技能的真實數值並返回修正後的欄位
 */
export function parseSkillRealStats(skill: {
  powerPercent: number;
  mpCost: number;
  cooldown: number;
  tier: string;
  skillType: string;
  description?: string | null;
}): { powerPercent: number; mpCost: number; cooldown: number } {
  const desc = skill.description || "";

  // 解析真實威力
  let realPower = parseRealPowerFromDesc(desc);
  if (!realPower || realPower === 100) {
    // 如果解析不到，根據階級和類型推算
    const tierPower: Record<string, number> = {
      "初階": 100, "中階": 150, "高階": 220, "傳說": 320, "天命": 400,
    };
    realPower = tierPower[skill.tier] || 100;
  }

  // 解析 MP 消耗
  let mpCost = skill.mpCost;
  const mpMatch = desc.match(/(?:消耗|MP)\s*(\d+)/);
  if (mpMatch) mpCost = parseInt(mpMatch[1], 10);
  if (mpCost === 12 || mpCost === 0) {
    // 預設值 12 可能是未設定，根據階級推算
    const tierMp: Record<string, number> = {
      "初階": 8, "中階": 15, "高階": 25, "傳說": 40, "天命": 55,
    };
    mpCost = tierMp[skill.tier] || 12;
    // 被動技能 MP = 0
    if (skill.skillType === "passive") mpCost = 0;
  }

  // 解析冷卻回合
  let cooldown = skill.cooldown;
  const cdMatch = desc.match(/冷卻\s*(\d+)\s*回合/);
  if (cdMatch) cooldown = parseInt(cdMatch[1], 10);
  if (cooldown === 0 && skill.tier !== "初階" && skill.skillType !== "passive") {
    // 非初階非被動技能不應該 0 冷卻
    const tierCd: Record<string, number> = {
      "初階": 0, "中階": 1, "高階": 2, "傳說": 3, "天命": 4,
    };
    cooldown = tierCd[skill.tier] || 0;
  }

  return { powerPercent: realPower, mpCost, cooldown };
}

/**
 * 根據裝備階級和部位計算合理的屬性數值
 */
export function calculateEquipRealStats(equip: {
  tier: string;
  slot: string;
  hpBonus: number;
  attackBonus: number;
  defenseBonus: number;
  speedBonus: number;
}): { hpBonus: number; attackBonus: number; defenseBonus: number; speedBonus: number } {
  const totalStats = equip.hpBonus + equip.attackBonus + equip.defenseBonus + equip.speedBonus;

  // 如果已有合理數值，保留
  if (totalStats > 0) return equip;

  // 數值全為 0，根據階級和部位生成合理數值
  const tierStats: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
    "初階": { hp: 20, atk: 5, def: 4, spd: 2 },
    "中階": { hp: 55, atk: 14, def: 10, spd: 3 },
    "高階": { hp: 140, atk: 35, def: 28, spd: 5 },
    "傳說": { hp: 350, atk: 85, def: 70, spd: 8 },
  };
  const slotMod: Record<string, { hp: number; atk: number; def: number; spd: number }> = {
    weapon:    { hp: 0.2, atk: 2.0, def: 0.2, spd: 0.5 },
    helmet:    { hp: 1.0, atk: 0.3, def: 1.5, spd: 0.3 },
    armor:     { hp: 1.5, atk: 0.2, def: 2.0, spd: 0.2 },
    shoes:     { hp: 0.3, atk: 0.3, def: 0.5, spd: 2.5 },
    accessory: { hp: 0.8, atk: 0.5, def: 0.5, spd: 1.0 },
    offhand:   { hp: 0.5, atk: 0.5, def: 1.5, spd: 0.3 },
  };

  const base = tierStats[equip.tier] || tierStats["初階"];
  const mod = slotMod[equip.slot] || slotMod["weapon"];

  // 加入 ±15% 隨機浮動讓數值不完全一樣
  const jitter = () => 0.85 + Math.random() * 0.3;

  return {
    hpBonus: Math.round(base.hp * mod.hp * jitter()),
    attackBonus: Math.round(base.atk * mod.atk * jitter()),
    defenseBonus: Math.round(base.def * mod.def * jitter()),
    speedBonus: Math.round(base.spd * mod.spd * jitter()),
  };
}

// ═══════════════════════════════════════════════════════════════
// 十一、AI Prompt 輔助（給 AI 生成工具用的規則摘要）
// ═══════════════════════════════════════════════════════════════

/**
 * 生成價值引擎規則摘要，供 AI 生成工具的 system prompt 使用
 */
export function getValueEngineRulesForAI(): string {
  return `
【天命共振價值評估規則】

一、稀有度與階級對應：
- 初階技能 → common/rare（視威力而定）
- 中階技能 → common/rare
- 高階技能 → rare/epic
- 傳說技能 → epic/legendary
- 天命技能 → legendary（禁止進入任何商店）

二、品質等級（S/A/B/C/D）根據同稀有度內的數值強度排名：
- S 級（前 10%）：價格 ×4，限制流通
- A 級（10~30%）：價格 ×2.5，限靈石/密店
- B 級（30~60%）：價格 ×1.5，可進一般/靈石商店
- C 級（60~85%）：基準價格
- D 級（後 15%）：價格 ×0.6

三、流通權限：
- 一般商店：僅 C/D 級的 common/rare 物品
- 靈石商店：B/C 級的 rare/epic 物品
- 密店：A/B 級的 epic 物品，S 級的非傳說物品
- 拍賣行：所有可交易物品（傳說級技能書除外）
- 傳說級技能書：完全禁止交易和上架

四、定價公式：
- 道具：類型基礎價 × 稀有度倍率 × 品質倍率
- 裝備：階級基礎價 × 部位修正 × 稀有度倍率 × 品質倍率
- 技能書：階級基礎價 × 類型修正 × 品質倍率

五、怪物掉落等級匹配：
- common 物品 → Lv1~15 怪物
- rare 物品 → Lv8~30 怪物
- epic 物品 → Lv20~45 怪物
- legendary 物品 → Lv35~50 怪物
- 品質等級會微調掉落範圍（S 級 +5 等級，D 級 -3 等級）

六、技能數值基準：
- 初階：威力 80~120%，MP 5~12，冷卻 0~1
- 中階：威力 120~180%，MP 12~22，冷卻 1~2
- 高階：威力 180~280%，MP 20~35，冷卻 2~3
- 傳說：威力 280~400%，MP 30~50，冷卻 3~5
- 天命：威力 350~500%，MP 40~65，冷卻 4~6
`.trim();
}
