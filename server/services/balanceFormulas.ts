/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 大平衡公式與基準表 v2.0
 * ═══════════════════════════════════════════════════════════════
 *
 * 本模組定義所有遊戲數值的統一公式和基準表，
 * 供平衡腳本、AI 生成、AI 審核共同使用。
 *
 * 設計原則：
 * 1. HP 曲線：參考魔力寶貝，Lv1=80 → Lv50=11500，平滑遞增
 * 2. ATK/DEF：以 HP 為基底，按怪物定位乘以比例
 * 3. 人物技能：按階級差異化 powerPercent、mpCost、cooldown
 * 4. 價格體系：技能書 > 裝備 > 消耗品 > 材料，按稀有度分級
 * 5. 種族加乘：龍×1.3、不死×1.2、一般×1.0、昆蟲×0.9、植物×0.8
 */

// ═══════════════════════════════════════════════════════════════
// 一、怪物 HP 基準表（Lv1-51）
// ═══════════════════════════════════════════════════════════════

export const MONSTER_HP_TABLE: Record<number, number> = {
  1: 80, 2: 95, 3: 115, 4: 140, 5: 170,
  6: 205, 7: 245, 8: 295, 9: 350, 10: 420,
  11: 500, 12: 600, 13: 720, 14: 860, 15: 1020,
  16: 1200, 17: 1400, 18: 1500, 19: 1650, 20: 1800,
  21: 1980, 22: 2150, 23: 2350, 24: 2550, 25: 2750,
  26: 2950, 27: 3150, 28: 3350, 29: 3600, 30: 3850,
  31: 4100, 32: 4350, 33: 4600, 34: 5000, 35: 5300,
  36: 5600, 37: 5900, 38: 6200, 39: 6500, 40: 6800,
  41: 7200, 42: 7600, 43: 8000, 44: 8500, 45: 9000,
  46: 9500, 47: 10000, 48: 10500, 49: 11000, 50: 11500,
  51: 14000,
};

/**
 * 根據等級範圍字串（如 "3-6"）取得基準 HP
 * 取等級範圍的中間值對應的 HP
 */
export function getBaseHpForLevelRange(levelRange: string): number {
  const parts = levelRange.split("-").map(Number);
  const minLv = parts[0] || 1;
  const maxLv = parts[1] || minLv;
  const midLv = Math.round((minLv + maxLv) / 2);
  const clampedLv = Math.min(Math.max(midLv, 1), 51);
  return MONSTER_HP_TABLE[clampedLv] || 80;
}

// ═══════════════════════════════════════════════════════════════
// 二、種族加乘倍率
// ═══════════════════════════════════════════════════════════════

export const RACE_HP_MULTIPLIER: Record<string, number> = {
  "龍種系": 1.3,
  "亡魂系": 1.2,
  "不死系": 1.2,
  "天命系": 1.15,
  "妖化系": 1.1,
  "人型系": 1.0,
  "金屬系": 1.0,
  "靈獸系": 1.0,
  "水生系": 0.95,
  "蟲類系": 0.9,
  "植物系": 0.8,
  "": 1.0, // 未設定種族
};

// ═══════════════════════════════════════════════════════════════
// 三、怪物定位與 ATK/DEF 比例
// ═══════════════════════════════════════════════════════════════

export type MonsterArchetype = "physical" | "magic" | "tank" | "balanced" | "glass" | "boss";

export const ARCHETYPE_RATIOS: Record<MonsterArchetype, { atkRatio: number; defRatio: number; spdRange: [number, number] }> = {
  physical: { atkRatio: 0.16, defRatio: 0.12, spdRange: [10, 30] },
  magic:    { atkRatio: 0.12, defRatio: 0.10, spdRange: [12, 35] },
  tank:     { atkRatio: 0.10, defRatio: 0.20, spdRange: [8, 22] },
  balanced: { atkRatio: 0.14, defRatio: 0.14, spdRange: [10, 28] },
  glass:    { atkRatio: 0.18, defRatio: 0.08, spdRange: [15, 42] },
  boss:     { atkRatio: 0.12, defRatio: 0.13, spdRange: [20, 35] },
};

/**
 * 根據稀有度推斷怪物定位
 */
export function inferArchetype(rarity: string, race: string): MonsterArchetype {
  if (rarity === "legendary") return "boss";
  if (rarity === "epic") return "balanced";
  // 根據種族推斷
  if (race === "龍種系" || race === "金屬系") return "tank";
  if (race === "蟲類系" || race === "植物系") return "glass";
  if (race === "妖化系" || race === "亡魂系") return "magic";
  if (race === "靈獸系" || race === "水生系") return "balanced";
  return "physical";
}

// ═══════════════════════════════════════════════════════════════
// 四、稀有度加乘（怪物整體強度倍率）
// ═══════════════════════════════════════════════════════════════

export const RARITY_MULTIPLIER: Record<string, number> = {
  common: 1.0,
  rare: 1.3,
  elite: 1.6,
  epic: 2.0,
  legendary: 3.0,
};

// ═══════════════════════════════════════════════════════════════
// 五、SPD 非線性設計
// ═══════════════════════════════════════════════════════════════

export function getBaseSpdForLevel(level: number, archetype: MonsterArchetype): number {
  const [minSpd, maxSpd] = ARCHETYPE_RATIOS[archetype].spdRange;
  // 非線性插值：低等級差距小，高等級拉開
  const t = Math.min(level / 50, 1);
  const curved = Math.pow(t, 0.7); // 前期增長快，後期趨緩
  return Math.round(minSpd + (maxSpd - minSpd) * curved);
}

// ═══════════════════════════════════════════════════════════════
// 六、計算怪物完整數值
// ═══════════════════════════════════════════════════════════════

export interface MonsterStats {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  baseMagicAttack: number;
  baseAccuracy: number;
}

export function calculateMonsterStats(
  levelRange: string,
  rarity: string,
  race: string,
): MonsterStats {
  const baseHp = getBaseHpForLevelRange(levelRange);
  const raceMultiplier = RACE_HP_MULTIPLIER[race] || 1.0;
  const rarityMultiplier = RARITY_MULTIPLIER[rarity] || 1.0;
  const archetype = inferArchetype(rarity, race);
  const ratios = ARCHETYPE_RATIOS[archetype];

  const hp = Math.round(baseHp * raceMultiplier * rarityMultiplier);
  const atk = Math.round(hp * ratios.atkRatio);
  const def = Math.round(hp * ratios.defRatio);

  // 魔法攻擊：魔法型怪物 magicAtk = atk * 1.3，其他 = atk * 0.6
  const isMagic = archetype === "magic" || archetype === "glass";
  const magicAtk = Math.round(atk * (isMagic ? 1.3 : 0.6));

  const parts = levelRange.split("-").map(Number);
  const midLv = Math.round(((parts[0] || 1) + (parts[1] || parts[0] || 1)) / 2);
  const spd = getBaseSpdForLevel(midLv, archetype);

  // 命中率：基礎 80，高等級和高稀有度提升
  const accuracy = Math.min(95, 80 + Math.floor(midLv / 10) * 3 + (rarity === "legendary" ? 10 : rarity === "epic" ? 5 : 0));

  return { baseHp: hp, baseAttack: atk, baseDefense: def, baseSpeed: spd, baseMagicAttack: magicAtk, baseAccuracy: accuracy };
}

// ═══════════════════════════════════════════════════════════════
// 七、人物技能數值基準表
// ═══════════════════════════════════════════════════════════════

export interface SkillBalanceParams {
  powerPercent: number;
  mpCost: number;
  cooldown: number;
  learnLevel: number;
  shopPrice: number; // 金幣
}

/**
 * 人物技能按階級 × 類型的基準數值
 * tier: 初階/中階/高階/傳說/天命
 * skillType: attack/heal/buff/debuff/passive/special
 */
export const SKILL_TIER_BASE: Record<string, { powerRange: [number, number]; mpRange: [number, number]; cdRange: [number, number]; learnLvRange: [number, number]; priceRange: [number, number] }> = {
  "初階": {
    powerRange: [80, 120],
    mpRange: [5, 12],
    cdRange: [0, 1],
    learnLvRange: [1, 5],
    priceRange: [100, 300],
  },
  "中階": {
    powerRange: [120, 180],
    mpRange: [12, 22],
    cdRange: [1, 2],
    learnLvRange: [6, 15],
    priceRange: [500, 1500],
  },
  "高階": {
    powerRange: [180, 280],
    mpRange: [20, 35],
    cdRange: [2, 3],
    learnLvRange: [16, 30],
    priceRange: [2000, 5000],
  },
  "傳說": {
    powerRange: [280, 400],
    mpRange: [30, 50],
    cdRange: [3, 5],
    learnLvRange: [30, 45],
    priceRange: [8000, 20000],
  },
  "天命": {
    powerRange: [350, 500],
    mpRange: [40, 65],
    cdRange: [4, 6],
    learnLvRange: [35, 50],
    priceRange: [15000, 50000],
  },
};

/**
 * 技能類型修正倍率
 */
export const SKILL_TYPE_MODIFIER: Record<string, { powerMod: number; mpMod: number; cdMod: number }> = {
  attack:  { powerMod: 1.0, mpMod: 1.0, cdMod: 1.0 },
  heal:    { powerMod: 0.7, mpMod: 1.2, cdMod: 1.5 },
  buff:    { powerMod: 0.5, mpMod: 0.8, cdMod: 1.3 },
  debuff:  { powerMod: 0.6, mpMod: 0.9, cdMod: 1.2 },
  passive: { powerMod: 0.3, mpMod: 0.0, cdMod: 0.0 },
  special: { powerMod: 1.2, mpMod: 1.3, cdMod: 1.5 },
};

export function calculateSkillStats(tier: string, skillType: string): SkillBalanceParams {
  const base = SKILL_TIER_BASE[tier] || SKILL_TIER_BASE["初階"];
  const mod = SKILL_TYPE_MODIFIER[skillType] || SKILL_TYPE_MODIFIER["attack"];

  const midPower = Math.round((base.powerRange[0] + base.powerRange[1]) / 2 * mod.powerMod);
  const midMp = Math.round((base.mpRange[0] + base.mpRange[1]) / 2 * mod.mpMod);
  const midCd = Math.round((base.cdRange[0] + base.cdRange[1]) / 2 * mod.cdMod);
  const midLv = Math.round((base.learnLvRange[0] + base.learnLvRange[1]) / 2);
  const midPrice = Math.round((base.priceRange[0] + base.priceRange[1]) / 2);

  return {
    powerPercent: Math.max(midPower, 10),
    mpCost: Math.max(midMp, 0),
    cooldown: Math.max(midCd, 0),
    learnLevel: midLv,
    shopPrice: midPrice,
  };
}

// ═══════════════════════════════════════════════════════════════
// 八、怪物技能數值基準表
// ═══════════════════════════════════════════════════════════════

export const MONSTER_SKILL_RARITY_BASE: Record<string, { powerRange: [number, number]; mpRange: [number, number]; cdRange: [number, number] }> = {
  common:    { powerRange: [80, 120],  mpRange: [5, 10],  cdRange: [0, 1] },
  rare:      { powerRange: [110, 160], mpRange: [8, 18],  cdRange: [1, 3] },
  elite:     { powerRange: [140, 200], mpRange: [15, 25], cdRange: [2, 3] },
  epic:      { powerRange: [180, 260], mpRange: [20, 35], cdRange: [2, 4] },
  legendary: { powerRange: [240, 350], mpRange: [30, 50], cdRange: [3, 5] },
};

// ═══════════════════════════════════════════════════════════════
// 九、裝備數值基準表
// ═══════════════════════════════════════════════════════════════

export const EQUIP_TIER_BASE: Record<string, { hpRange: [number, number]; atkRange: [number, number]; defRange: [number, number]; spdRange: [number, number]; priceRange: [number, number]; levelReq: number }> = {
  "初階": {
    hpRange: [10, 30], atkRange: [3, 8], defRange: [2, 6], spdRange: [1, 3],
    priceRange: [50, 200], levelReq: 1,
  },
  "basic": {
    hpRange: [10, 30], atkRange: [3, 8], defRange: [2, 6], spdRange: [1, 3],
    priceRange: [50, 200], levelReq: 1,
  },
  "中階": {
    hpRange: [30, 80], atkRange: [8, 20], defRange: [6, 15], spdRange: [2, 5],
    priceRange: [300, 800], levelReq: 10,
  },
  "mid": {
    hpRange: [30, 80], atkRange: [8, 20], defRange: [6, 15], spdRange: [2, 5],
    priceRange: [300, 800], levelReq: 10,
  },
  "高階": {
    hpRange: [80, 200], atkRange: [20, 50], defRange: [15, 40], spdRange: [3, 8],
    priceRange: [1500, 5000], levelReq: 25,
  },
  "high": {
    hpRange: [80, 200], atkRange: [20, 50], defRange: [15, 40], spdRange: [3, 8],
    priceRange: [1500, 5000], levelReq: 25,
  },
  "傳說": {
    hpRange: [200, 500], atkRange: [50, 120], defRange: [40, 100], spdRange: [5, 12],
    priceRange: [10000, 50000], levelReq: 40,
  },
  "legendary": {
    hpRange: [200, 500], atkRange: [50, 120], defRange: [40, 100], spdRange: [5, 12],
    priceRange: [10000, 50000], levelReq: 40,
  },
};

/**
 * 裝備部位修正（武器偏 ATK，護甲偏 DEF/HP）
 */
export const EQUIP_SLOT_MODIFIER: Record<string, { hpMod: number; atkMod: number; defMod: number; spdMod: number }> = {
  weapon:    { hpMod: 0.2, atkMod: 2.0, defMod: 0.2, spdMod: 0.5 },
  helmet:    { hpMod: 1.0, atkMod: 0.3, defMod: 1.5, spdMod: 0.3 },
  armor:     { hpMod: 1.5, atkMod: 0.2, defMod: 2.0, spdMod: 0.2 },
  boots:     { hpMod: 0.3, atkMod: 0.3, defMod: 0.5, spdMod: 2.5 },
  accessory: { hpMod: 0.8, atkMod: 0.5, defMod: 0.5, spdMod: 1.0 },
  offhand:   { hpMod: 0.5, atkMod: 0.5, defMod: 1.5, spdMod: 0.3 },
  shoes:     { hpMod: 0.3, atkMod: 0.3, defMod: 0.5, spdMod: 2.5 },
};

export function calculateEquipStats(tier: string, slot: string) {
  const base = EQUIP_TIER_BASE[tier] || EQUIP_TIER_BASE["初階"];
  const slotMod = EQUIP_SLOT_MODIFIER[slot] || EQUIP_SLOT_MODIFIER["weapon"];

  const midHp = Math.round((base.hpRange[0] + base.hpRange[1]) / 2 * slotMod.hpMod);
  const midAtk = Math.round((base.atkRange[0] + base.atkRange[1]) / 2 * slotMod.atkMod);
  const midDef = Math.round((base.defRange[0] + base.defRange[1]) / 2 * slotMod.defMod);
  const midSpd = Math.round((base.spdRange[0] + base.spdRange[1]) / 2 * slotMod.spdMod);
  const midPrice = Math.round((base.priceRange[0] + base.priceRange[1]) / 2);

  return { hpBonus: midHp, attackBonus: midAtk, defenseBonus: midDef, speedBonus: midSpd, shopPrice: midPrice };
}

// ═══════════════════════════════════════════════════════════════
// 十、商店價格體系
// ═══════════════════════════════════════════════════════════════

/**
 * 價值排序：技能書 > 裝備 > 消耗品 > 材料
 * 稀有度排序：legendary > epic > rare > common
 */
export const PRICE_TABLE = {
  // ===== 技能書（金幣）=====
  skillBook: {
    common:    { coins: 200,   stones: 0 },
    rare:      { coins: 800,   stones: 30 },
    epic:      { coins: 5000,  stones: 150 },
    legendary: { coins: 25000, stones: 500 },
    天命:       { coins: 50000, stones: 1000 },
  },
  // ===== 裝備（金幣）=====
  equipment: {
    common:    { coins: 100,   stones: 0 },
    rare:      { coins: 500,   stones: 20 },
    epic:      { coins: 3000,  stones: 100 },
    legendary: { coins: 15000, stones: 350 },
  },
  // ===== 消耗品（金幣）=====
  consumable: {
    common:    { coins: 20,   stones: 0 },
    rare:      { coins: 100,  stones: 5 },
    epic:      { coins: 500,  stones: 30 },
    legendary: { coins: 2000, stones: 80 },
  },
  // ===== 材料（金幣）=====
  material: {
    common:    { coins: 10,   stones: 0 },
    rare:      { coins: 50,   stones: 3 },
    epic:      { coins: 300,  stones: 20 },
    legendary: { coins: 1500, stones: 50 },
  },
} as const;

/**
 * 隱藏商店加價倍率（密店商品更貴，因為稀有）
 */
export const HIDDEN_SHOP_MARKUP = 1.5;

/**
 * 靈相商店折扣倍率（靈石更珍貴，所以靈石價格較低但靈石本身更難獲得）
 */
export const SPIRIT_SHOP_DISCOUNT = 1.0; // 靈石價格按基準表

/**
 * 根據道具類型和稀有度取得建議價格
 */
export function getSuggestedPrice(
  itemType: "skillBook" | "equipment" | "consumable" | "material",
  rarity: string,
): { coins: number; stones: number } {
  const table = PRICE_TABLE[itemType];
  const prices = (table as any)[rarity] || (table as any)["common"];
  return { coins: prices.coins, stones: prices.stones };
}

// ═══════════════════════════════════════════════════════════════
// 十一、AI 審核函數
// ═══════════════════════════════════════════════════════════════

export interface BalanceViolation {
  field: string;
  current: number;
  expected: [number, number]; // [min, max]
  severity: "error" | "warning";
  message: string;
}

/**
 * 審核怪物數值是否在合理範圍
 */
export function auditMonsterStats(
  stats: { baseHp: number; baseAttack: number; baseDefense: number; baseSpeed: number },
  levelRange: string,
  rarity: string,
  race: string,
): BalanceViolation[] {
  const violations: BalanceViolation[] = [];
  const expected = calculateMonsterStats(levelRange, rarity, race);
  const tolerance = 0.35; // 允許 35% 偏差

  const check = (field: string, current: number, expectedVal: number) => {
    const min = Math.round(expectedVal * (1 - tolerance));
    const max = Math.round(expectedVal * (1 + tolerance));
    if (current < min || current > max) {
      violations.push({
        field,
        current,
        expected: [min, max],
        severity: current < min * 0.5 || current > max * 2 ? "error" : "warning",
        message: `${field} = ${current}，建議範圍 ${min}~${max}（基準值 ${expectedVal}）`,
      });
    }
  };

  check("baseHp", stats.baseHp, expected.baseHp);
  check("baseAttack", stats.baseAttack, expected.baseAttack);
  check("baseDefense", stats.baseDefense, expected.baseDefense);
  check("baseSpeed", stats.baseSpeed, expected.baseSpeed);

  return violations;
}

/**
 * 審核技能數值是否在合理範圍
 */
export function auditSkillStats(
  stats: { powerPercent: number; mpCost: number; cooldown: number },
  tier: string,
  skillType: string,
): BalanceViolation[] {
  const violations: BalanceViolation[] = [];
  const base = SKILL_TIER_BASE[tier] || SKILL_TIER_BASE["初階"];
  const mod = SKILL_TYPE_MODIFIER[skillType] || SKILL_TYPE_MODIFIER["attack"];

  const powerMin = Math.round(base.powerRange[0] * mod.powerMod * 0.7);
  const powerMax = Math.round(base.powerRange[1] * mod.powerMod * 1.3);
  if (stats.powerPercent < powerMin || stats.powerPercent > powerMax) {
    violations.push({
      field: "powerPercent",
      current: stats.powerPercent,
      expected: [powerMin, powerMax],
      severity: "warning",
      message: `威力 ${stats.powerPercent}%，建議範圍 ${powerMin}%~${powerMax}%`,
    });
  }

  const mpMin = Math.round(base.mpRange[0] * mod.mpMod * 0.7);
  const mpMax = Math.round(base.mpRange[1] * mod.mpMod * 1.3);
  if (mod.mpMod > 0 && (stats.mpCost < mpMin || stats.mpCost > mpMax)) {
    violations.push({
      field: "mpCost",
      current: stats.mpCost,
      expected: [mpMin, mpMax],
      severity: "warning",
      message: `MP消耗 ${stats.mpCost}，建議範圍 ${mpMin}~${mpMax}`,
    });
  }

  return violations;
}

/**
 * 審核價格是否在合理範圍
 */
export function auditPrice(
  price: number,
  itemType: "skillBook" | "equipment" | "consumable" | "material",
  rarity: string,
  currency: "coins" | "stones" = "coins",
): BalanceViolation[] {
  const violations: BalanceViolation[] = [];
  const suggested = getSuggestedPrice(itemType, rarity);
  const basePrice = currency === "coins" ? suggested.coins : suggested.stones;

  if (basePrice === 0) return violations; // 不在此貨幣販售

  const min = Math.round(basePrice * 0.5);
  const max = Math.round(basePrice * 2.0);

  if (price < min || price > max) {
    violations.push({
      field: "price",
      current: price,
      expected: [min, max],
      severity: price < min * 0.3 ? "error" : "warning",
      message: `${currency === "coins" ? "金幣" : "靈石"}價格 ${price}，建議範圍 ${min}~${max}（基準 ${basePrice}）`,
    });
  }

  return violations;
}

/**
 * 審核裝備數值是否在合理範圍
 */
export function auditEquipStats(
  stats: { hpBonus: number; attackBonus: number; defenseBonus: number; speedBonus: number },
  tier: string,
  slot: string,
): BalanceViolation[] {
  const violations: BalanceViolation[] = [];
  const expected = calculateEquipStats(tier, slot);
  const tolerance = 0.5; // 裝備允許 50% 偏差（因為詞條系統）

  const check = (field: string, current: number, expectedVal: number) => {
    if (expectedVal === 0) return; // 該部位不提供此屬性
    const min = Math.round(expectedVal * (1 - tolerance));
    const max = Math.round(expectedVal * (1 + tolerance));
    if (current > 0 && (current < min || current > max)) {
      violations.push({
        field,
        current,
        expected: [min, max],
        severity: "warning",
        message: `${field} = ${current}，建議範圍 ${min}~${max}`,
      });
    }
  };

  check("hpBonus", stats.hpBonus, expected.hpBonus);
  check("attackBonus", stats.attackBonus, expected.attackBonus);
  check("defenseBonus", stats.defenseBonus, expected.defenseBonus);
  check("speedBonus", stats.speedBonus, expected.speedBonus);

  return violations;
}


// ═══════════════════════════════════════════════════════════════
// 十二、五行屬性升級成長系統
// ═══════════════════════════════════════════════════════════════
//
// 設計原則（類似魔力寶貝）：
//   木 → 體力（HP 成長）
//   火 → 力量（ATK 成長）
//   土 → 強度（DEF 成長）
//   金 → 速度（SPD 成長）
//   水 → 魔法（MP/MATK 成長）
//
// 每次升級自動獲得五行屬性點數，分配規則：
//   主屬性（dominantElement）：+2.0
//   相生屬性：+1.5
//   其他三屬性：各 +0.5（共 +1.5）
//   合計每級 +5.0 五行屬性點
//
// 五行相生循環：木→火→土→金→水→木
// ═══════════════════════════════════════════════════════════════

export type WuXingElement = "wood" | "fire" | "earth" | "metal" | "water";

/** 五行相生關係：A 生 B */
export const WUXING_GENERATES: Record<WuXingElement, WuXingElement> = {
  wood: "fire",   // 木生火
  fire: "earth",  // 火生土
  earth: "metal", // 土生金
  metal: "water", // 金生水
  water: "wood",  // 水生木
};

/** 五行中文名 */
export const WUXING_ZH: Record<WuXingElement, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

/** 五行對應戰鬥屬性中文 */
export const WUXING_STAT_ZH: Record<WuXingElement, string> = {
  wood: "體力", fire: "力量", earth: "強度", metal: "速度", water: "魔法",
};

/**
 * 每級五行屬性分配點數
 * TOTAL_PER_LEVEL = 5.0
 */
const LEVEL_UP_TOTAL_POINTS = 5.0;
const DOMINANT_POINTS = 2.0;   // 主屬性
const GENERATE_POINTS = 1.5;   // 相生屬性
const OTHER_POINTS = 0.5;      // 其他三屬性各 0.5

export interface WuXingGrowth {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/**
 * 計算升級時的五行屬性增長量
 * @param dominantElement 角色主屬性
 * @param levels 升了幾級（通常為 1）
 * @returns 各五行屬性的增長量
 */
export function calcLevelUpWuxingGrowth(
  dominantElement: WuXingElement,
  levels: number = 1,
): WuXingGrowth {
  const growth: WuXingGrowth = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const generatedElement = WUXING_GENERATES[dominantElement];
  const allElements: WuXingElement[] = ["wood", "fire", "earth", "metal", "water"];

  for (const el of allElements) {
    if (el === dominantElement) {
      growth[el] = DOMINANT_POINTS * levels;
    } else if (el === generatedElement) {
      growth[el] = GENERATE_POINTS * levels;
    } else {
      growth[el] = OTHER_POINTS * levels;
    }
  }

  return growth;
}

/**
 * 計算從 Lv1 到指定等級的累計五行屬性成長
 * （用於校準現有玩家或模擬數值）
 * @param dominantElement 角色主屬性
 * @param targetLevel 目標等級
 * @param baseWuxing 初始五行屬性（Lv1 時的值，預設全 20）
 */
export function calcCumulativeWuxing(
  dominantElement: WuXingElement,
  targetLevel: number,
  baseWuxing: WuXingGrowth = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
): WuXingGrowth {
  const levelsGained = Math.max(0, targetLevel - 1);
  const growth = calcLevelUpWuxingGrowth(dominantElement, levelsGained);
  return {
    wood: baseWuxing.wood + growth.wood,
    fire: baseWuxing.fire + growth.fire,
    earth: baseWuxing.earth + growth.earth,
    metal: baseWuxing.metal + growth.metal,
    water: baseWuxing.water + growth.water,
  };
}

// ═══════════════════════════════════════════════════════════════
// 十三、新版 calcCharacterStats（五行主導版）
// ═══════════════════════════════════════════════════════════════
//
// 設計目標：
// 1. 五行屬性主導戰鬥數值（佔 70%+），等級只是輔助加成
// 2. Lv1 角色（五行全 20）的數值要能打贏 Lv1 common 怪物
// 3. Lv30 角色的數值要能挑戰 Lv30 epic 怪物
// 4. Lv50 角色的數值要能挑戰 Lv50 legendary 怪物
//
// 怪物 HP 對照（from MONSTER_HP_TABLE）：
//   Lv1 common: 80 HP, ~13 ATK, ~10 DEF
//   Lv10 common: 420 HP, ~67 ATK, ~50 DEF
//   Lv30 epic: 3850*2=7700 HP, ~1078 ATK, ~1078 DEF
//   Lv50 legendary: 11500*3=34500 HP, ~4140 ATK, ~4485 DEF
//
// 角色五行屬性預估（升級成長後）：
//   Lv1:  全 20（初始值）
//   Lv10: 主屬 38, 相生 33.5, 其他 24.5（合計 145）
//   Lv30: 主屬 78, 相生 63.5, 其他 34.5（合計 245）
//   Lv50: 主屬 118, 相生 93.5, 其他 44.5（合計 345）
//
// 新公式設計（五行屬性加成大幅提升）：
// ═══════════════════════════════════════════════════════════════

export interface CharacterCombatStats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
  healPower: number;
  hitRate: number;
}

/**
 * 新版角色戰鬥數值計算公式（五行主導版）
 *
 * 設計理念：
 * - 基礎值很低，五行屬性的加成係數很高
 * - 等級只提供少量線性加成（約佔 30%）
 * - 五行屬性提供主要加成（約佔 70%）
 * - 這樣角色的五行傾向會真正影響戰鬥風格
 *
 * @param wuxing 五行屬性值
 * @param level 角色等級
 */
export function calcCharacterStatsV2(
  wuxing: { wood: number; fire: number; earth: number; metal: number; water: number },
  level: number = 1,
): CharacterCombatStats {
  const { wood, fire, earth, metal, water } = wuxing;

  // ── HP = 基礎 + 等級加成 + 木屬性加成 ──
  // Lv1(木20): 50 + 5 + 20*4 = 135
  // Lv10(木38): 50 + 50 + 38*4 = 252
  // Lv30(木78): 50 + 150 + 78*4 = 512
  // Lv50(木118): 50 + 250 + 118*4 = 772
  // 但怪物 HP 在 Lv30 epic 是 7700，角色 HP 不需要那麼高
  // 因為角色有技能、裝備、回復，而怪物只有基礎數值
  const hp = Math.floor(50 + level * 5 + wood * 4.0 + (wood > 50 ? (wood - 50) * 2.0 : 0));

  // ── MP = 基礎 + 等級加成 + 水屬性加成 ──
  const mp = Math.floor(30 + level * 3 + water * 2.5 + (water > 50 ? (water - 50) * 1.0 : 0));

  // ── ATK = 基礎 + 等級加成 + 火屬性加成 ──
  // Lv1(火20): 5 + 2 + 20*2 = 47 → 對比怪物 Lv1 DEF ~10，合理
  // Lv10(火38): 5 + 20 + 38*2 = 101 → 對比怪物 Lv10 DEF ~50，合理
  const atk = Math.floor(5 + level * 2 + fire * 2.0 + (fire > 50 ? (fire - 50) * 1.0 : 0));

  // ── DEF = 基礎 + 等級加成 + 土屬性加成 ──
  const def = Math.floor(5 + level * 1.5 + earth * 2.0 + (earth > 50 ? (earth - 50) * 1.0 : 0));

  // ── SPD = 基礎 + 等級加成 + 金屬性加成 ──
  // SPD 的數值範圍較小（5~60），避免速度差距過大
  const spd = Math.floor(3 + level * 0.3 + metal * 0.8 + (metal > 50 ? (metal - 50) * 0.3 : 0));

  // ── MATK = 基礎 + 等級加成 + 水屬性加成 ──
  const matk = Math.floor(5 + level * 1.5 + water * 2.0 + (water > 50 ? (water - 50) * 1.0 : 0));

  // ── 治癒力 = 木屬性加成 ──
  const healPower = Math.floor(wood * 1.5 + level * 0.5);

  // ── 命中率 = 金屬性加成 ──
  const hitRate = Math.floor(metal * 1.2 + level * 0.3);

  return { hp, mp, atk, def, spd, matk, healPower, hitRate };
}

// ═══════════════════════════════════════════════════════════════
// 十四、角色數值模擬器（用於驗證平衡）
// ═══════════════════════════════════════════════════════════════

/**
 * 模擬角色從 Lv1 到指定等級的完整數值
 * 包含五行屬性成長和戰鬥數值推導
 */
export function simulateCharacterAtLevel(
  dominantElement: WuXingElement,
  targetLevel: number,
  baseWuxing?: WuXingGrowth,
): {
  level: number;
  wuxing: WuXingGrowth;
  stats: CharacterCombatStats;
  perLevelGrowth: WuXingGrowth;
} {
  const wuxing = calcCumulativeWuxing(dominantElement, targetLevel, baseWuxing);
  const stats = calcCharacterStatsV2(wuxing, targetLevel);
  const perLevelGrowth = calcLevelUpWuxingGrowth(dominantElement, 1);

  return { level: targetLevel, wuxing, stats, perLevelGrowth };
}

/**
 * 生成角色成長曲線表（Lv1 到 Lv60）
 * 用於前端顯示和平衡驗證
 */
export function generateGrowthCurve(
  dominantElement: WuXingElement,
  baseWuxing?: WuXingGrowth,
): Array<{ level: number; wuxing: WuXingGrowth; stats: CharacterCombatStats }> {
  const curve: Array<{ level: number; wuxing: WuXingGrowth; stats: CharacterCombatStats }> = [];
  for (let lv = 1; lv <= 60; lv++) {
    const wuxing = calcCumulativeWuxing(dominantElement, lv, baseWuxing);
    const stats = calcCharacterStatsV2(wuxing, lv);
    curve.push({ level: lv, wuxing, stats });
  }
  return curve;
}

/**
 * 對比角色 vs 怪物的戰力差距
 * 用於驗證各等級段的戰鬥體驗
 */
export function compareCharacterVsMonster(
  characterLevel: number,
  dominantElement: WuXingElement,
  monsterLevel: number,
  monsterRarity: string,
  monsterRace: string,
): {
  character: CharacterCombatStats;
  monster: MonsterStats;
  analysis: {
    hpRatio: number;      // 角色HP / 怪物HP
    dmgToMonster: number;  // 角色每回合對怪物的預估傷害
    dmgFromMonster: number; // 怪物每回合對角色的預估傷害
    turnsToKill: number;   // 角色需要幾回合殺死怪物
    turnsToSurvive: number; // 角色能撐幾回合
    winnable: boolean;     // 是否可戰勝
  };
} {
  const charSim = simulateCharacterAtLevel(dominantElement, characterLevel);
  const monsterStats = calculateMonsterStats(String(monsterLevel), monsterRarity, monsterRace);

  // 簡化傷害計算（不含技能倍率和五行相剋）
  const dmgToMonster = Math.max(1, charSim.stats.atk - Math.floor(monsterStats.baseDefense * 0.5));
  const dmgFromMonster = Math.max(1, monsterStats.baseAttack - Math.floor(charSim.stats.def * 0.5));

  const turnsToKill = Math.ceil(monsterStats.baseHp / dmgToMonster);
  const turnsToSurvive = Math.ceil(charSim.stats.hp / dmgFromMonster);

  return {
    character: charSim.stats,
    monster: monsterStats,
    analysis: {
      hpRatio: charSim.stats.hp / monsterStats.baseHp,
      dmgToMonster,
      dmgFromMonster,
      turnsToKill,
      turnsToSurvive,
      winnable: turnsToSurvive > turnsToKill,
    },
  };
}
