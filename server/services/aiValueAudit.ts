/**
 * ═══════════════════════════════════════════════════════════════
 * AI 數值審核引擎 ── 所有 AI 生成工具的統一審核機制
 * ═══════════════════════════════════════════════════════════════
 *
 * 每個 AI 生成端點在寫入資料庫前，都必須經過此審核引擎
 * 審核項目：
 * 1. 價格合理性（技能書 > 裝備 > 消耗品 > 材料）
 * 2. 數值範圍合規性（HP/ATK/DEF/SPD/威力/MP/CD）
 * 3. 稀有度一致性（數值與稀有度匹配）
 * 4. 階級一致性（tier 與數值匹配）
 */

// ─── 價格基準表（金幣） ───
export const PRICE_STANDARD = {
  skillBook: { common: 200, rare: 800, epic: 5000, legendary: 25000 },
  equipment: { common: 100, rare: 500, epic: 3000, legendary: 15000 },
  consumable: { common: 20, rare: 100, epic: 500, legendary: 2000 },
  material:   { common: 10, rare: 50, epic: 300, legendary: 1500 },
} as const;

// ─── 靈石價格基準表 ───
export const SPIRIT_PRICE_STANDARD = {
  skillBook: { common: 0, rare: 30, epic: 150, legendary: 500 },
  equipment: { common: 0, rare: 20, epic: 100, legendary: 350 },
  consumable: { common: 0, rare: 5, epic: 30, legendary: 80 },
  material:   { common: 0, rare: 3, epic: 20, legendary: 50 },
} as const;

// ─── 怪物 HP 基準表（按等級） ───
export const MONSTER_HP_BASE: Record<number, number> = {
  1: 80, 3: 125, 5: 170, 7: 280, 10: 420, 12: 650, 15: 1020,
  18: 1400, 20: 1800, 25: 2750, 30: 3850, 35: 5200, 40: 6800, 45: 9000, 50: 11500,
};

// ─── 種族 HP 倍率 ───
export const RACE_HP_MULT: Record<string, number> = {
  "龍種系": 1.3, "亡魂系": 1.2, "不死系": 1.2, "天命系": 1.15,
  "妖化系": 1.1, "人型系": 1.0, "金屬系": 1.0, "靈獸系": 1.0,
  "水生系": 0.95, "蟲類系": 0.9, "植物系": 0.8,
};

// ─── 稀有度 HP 倍率 ───
export const RARITY_HP_MULT: Record<string, number> = {
  common: 1.0, rare: 1.3, elite: 1.6, epic: 2.0, legendary: 3.0,
};

// ─── 技能階級基準 ───
export const SKILL_TIER_STANDARD: Record<string, { power: [number, number]; mp: [number, number]; cd: [number, number]; price: [number, number] }> = {
  "初階": { power: [80, 120], mp: [5, 12], cd: [0, 1], price: [100, 300] },
  "中階": { power: [120, 180], mp: [12, 22], cd: [1, 2], price: [500, 1500] },
  "高階": { power: [180, 280], mp: [20, 35], cd: [2, 3], price: [2000, 5000] },
  "傳說": { power: [280, 400], mp: [30, 50], cd: [3, 5], price: [8000, 20000] },
  "天命": { power: [350, 500], mp: [40, 65], cd: [4, 6], price: [15000, 50000] },
};

// ─── 裝備階級基準 ───
export const EQUIP_TIER_STANDARD: Record<string, { hp: [number, number]; atk: [number, number]; def: [number, number]; spd: [number, number]; price: [number, number] }> = {
  "初階": { hp: [10, 30], atk: [3, 8], def: [2, 6], spd: [1, 3], price: [50, 200] },
  "中階": { hp: [30, 80], atk: [8, 20], def: [6, 15], spd: [2, 5], price: [300, 800] },
  "高階": { hp: [80, 200], atk: [20, 50], def: [15, 40], spd: [3, 8], price: [1500, 5000] },
  "傳說": { hp: [200, 500], atk: [50, 120], def: [40, 100], spd: [5, 12], price: [10000, 50000] },
};

// ─── 審核結果 ───
export interface AuditIssue {
  field: string;
  value: number;
  expected: string;
  severity: "warning" | "error";
  autoFix?: number;
}

export interface AuditResult {
  passed: boolean;
  issues: AuditIssue[];
  autoFixed: Record<string, number>;
}

// ─── 輔助函數 ───
function inRange(val: number, min: number, max: number, tolerance = 0.15): boolean {
  return val >= min * (1 - tolerance) && val <= max * (1 + tolerance);
}

function clamp(val: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, val)));
}

function getMonsterHpBase(levelRange: string): number {
  const parts = levelRange.split("-").map(Number);
  const midLevel = Math.round((parts[0] + (parts[1] || parts[0])) / 2);
  const levels = Object.keys(MONSTER_HP_BASE).map(Number).sort((a, b) => a - b);
  let closest = levels[0];
  for (const lv of levels) {
    if (Math.abs(lv - midLevel) < Math.abs(closest - midLevel)) closest = lv;
  }
  return MONSTER_HP_BASE[closest] || 80;
}

// ═══════════════════════════════════════════════════════════════
// 審核函數
// ═══════════════════════════════════════════════════════════════

/**
 * 審核怪物數值
 */
export function auditMonster(monster: {
  baseHp: number; baseAttack: number; baseDefense: number; baseSpeed: number;
  levelRange: string; race: string; rarity: string;
}): AuditResult {
  const issues: AuditIssue[] = [];
  const autoFixed: Record<string, number> = {};

  const hpBase = getMonsterHpBase(monster.levelRange);
  const raceMult = RACE_HP_MULT[monster.race] ?? 1.0;
  const rarityMult = RARITY_HP_MULT[monster.rarity] ?? 1.0;
  const expectedHp = Math.round(hpBase * raceMult * rarityMult);
  const hpMin = Math.round(expectedHp * 0.6);
  const hpMax = Math.round(expectedHp * 1.5);

  if (!inRange(monster.baseHp, hpMin, hpMax, 0)) {
    const fix = clamp(monster.baseHp, hpMin, hpMax);
    issues.push({ field: "baseHp", value: monster.baseHp, expected: `${hpMin}-${hpMax}（基準=${expectedHp}）`, severity: "error", autoFix: fix });
    autoFixed.baseHp = fix;
  }

  // ATK 應為 HP 的 10%~18%
  const atkMin = Math.round(expectedHp * 0.10);
  const atkMax = Math.round(expectedHp * 0.18);
  if (!inRange(monster.baseAttack, atkMin, atkMax, 0.2)) {
    const fix = clamp(monster.baseAttack, atkMin, atkMax);
    issues.push({ field: "baseAttack", value: monster.baseAttack, expected: `${atkMin}-${atkMax}`, severity: "error", autoFix: fix });
    autoFixed.baseAttack = fix;
  }

  // DEF 應為 HP 的 8%~20%
  const defMin = Math.round(expectedHp * 0.08);
  const defMax = Math.round(expectedHp * 0.20);
  if (!inRange(monster.baseDefense, defMin, defMax, 0.2)) {
    const fix = clamp(monster.baseDefense, defMin, defMax);
    issues.push({ field: "baseDefense", value: monster.baseDefense, expected: `${defMin}-${defMax}`, severity: "error", autoFix: fix });
    autoFixed.baseDefense = fix;
  }

  // SPD 範圍 8~42
  if (!inRange(monster.baseSpeed, 8, 42, 0.1)) {
    const fix = clamp(monster.baseSpeed, 8, 42);
    issues.push({ field: "baseSpeed", value: monster.baseSpeed, expected: "8-42", severity: "warning", autoFix: fix });
    autoFixed.baseSpeed = fix;
  }

  return { passed: issues.filter(i => i.severity === "error").length === 0, issues, autoFixed };
}

/**
 * 審核人物技能數值
 */
export function auditSkill(skill: {
  powerPercent: number; mpCost: number; cooldown: number; shopPrice?: number;
  tier: string; rarity: string; skillType: string;
}): AuditResult {
  const issues: AuditIssue[] = [];
  const autoFixed: Record<string, number> = {};

  const tierStd = SKILL_TIER_STANDARD[skill.tier];
  if (!tierStd) return { passed: true, issues: [], autoFixed: {} };

  // 技能類型修正
  let powerMult = 1.0;
  let mpMult = 1.0;
  if (skill.skillType === "heal") { powerMult = 0.7; mpMult = 1.2; }
  else if (skill.skillType === "buff") { powerMult = 0.5; mpMult = 0.8; }
  else if (skill.skillType === "debuff") { powerMult = 0.6; mpMult = 0.9; }
  else if (skill.skillType === "passive") { powerMult = 0; mpMult = 0; }

  if (powerMult > 0) {
    const pMin = Math.round(tierStd.power[0] * powerMult);
    const pMax = Math.round(tierStd.power[1] * powerMult);
    if (!inRange(skill.powerPercent, pMin, pMax, 0.15)) {
      const fix = clamp(skill.powerPercent, pMin, pMax);
      issues.push({ field: "powerPercent", value: skill.powerPercent, expected: `${pMin}-${pMax}%`, severity: "error", autoFix: fix });
      autoFixed.powerPercent = fix;
    }
  }

  if (mpMult > 0) {
    const mMin = Math.round(tierStd.mp[0] * mpMult);
    const mMax = Math.round(tierStd.mp[1] * mpMult);
    if (!inRange(skill.mpCost, mMin, mMax, 0.2)) {
      const fix = clamp(skill.mpCost, mMin, mMax);
      issues.push({ field: "mpCost", value: skill.mpCost, expected: `${mMin}-${mMax}`, severity: "warning", autoFix: fix });
      autoFixed.mpCost = fix;
    }
  }

  if (!inRange(skill.cooldown, tierStd.cd[0], tierStd.cd[1], 0.3)) {
    const fix = clamp(skill.cooldown, tierStd.cd[0], tierStd.cd[1]);
    issues.push({ field: "cooldown", value: skill.cooldown, expected: `${tierStd.cd[0]}-${tierStd.cd[1]}`, severity: "warning", autoFix: fix });
    autoFixed.cooldown = fix;
  }

  // 價格審核
  if (skill.shopPrice !== undefined && skill.shopPrice > 0) {
    if (!inRange(skill.shopPrice, tierStd.price[0], tierStd.price[1], 0.2)) {
      const fix = clamp(skill.shopPrice, tierStd.price[0], tierStd.price[1]);
      issues.push({ field: "shopPrice", value: skill.shopPrice, expected: `${tierStd.price[0]}-${tierStd.price[1]}`, severity: "error", autoFix: fix });
      autoFixed.shopPrice = fix;
    }
  }

  return { passed: issues.filter(i => i.severity === "error").length === 0, issues, autoFixed };
}

/**
 * 審核裝備數值
 */
export function auditEquipment(equip: {
  hpBonus: number; attackBonus: number; defenseBonus: number; speedBonus: number;
  tier: string; slot: string; rarity: string; shopPrice?: number;
}): AuditResult {
  const issues: AuditIssue[] = [];
  const autoFixed: Record<string, number> = {};

  const tierStd = EQUIP_TIER_STANDARD[equip.tier];
  if (!tierStd) return { passed: true, issues: [], autoFixed: {} };

  // 部位修正倍率
  const slotMult: Record<string, { atk: number; def: number; hp: number; spd: number }> = {
    weapon: { atk: 2.0, def: 0.5, hp: 0.5, spd: 0.8 },
    helmet: { atk: 0.5, def: 1.5, hp: 1.2, spd: 0.5 },
    armor: { atk: 0.3, def: 2.0, hp: 1.5, spd: 0.3 },
    shoes: { atk: 0.5, def: 0.5, hp: 0.5, spd: 2.5 },
    accessory: { atk: 1.0, def: 1.0, hp: 1.0, spd: 1.0 },
    offhand: { atk: 1.2, def: 1.2, hp: 1.0, spd: 0.5 },
  };

  const mult = slotMult[equip.slot] ?? { atk: 1, def: 1, hp: 1, spd: 1 };

  const atkMin = Math.round(tierStd.atk[0] * mult.atk);
  const atkMax = Math.round(tierStd.atk[1] * mult.atk);
  if (equip.attackBonus > 0 && !inRange(equip.attackBonus, atkMin, atkMax, 0.2)) {
    const fix = clamp(equip.attackBonus, atkMin, atkMax);
    issues.push({ field: "attackBonus", value: equip.attackBonus, expected: `${atkMin}-${atkMax}`, severity: "error", autoFix: fix });
    autoFixed.attackBonus = fix;
  }

  const defMin = Math.round(tierStd.def[0] * mult.def);
  const defMax = Math.round(tierStd.def[1] * mult.def);
  if (equip.defenseBonus > 0 && !inRange(equip.defenseBonus, defMin, defMax, 0.2)) {
    const fix = clamp(equip.defenseBonus, defMin, defMax);
    issues.push({ field: "defenseBonus", value: equip.defenseBonus, expected: `${defMin}-${defMax}`, severity: "error", autoFix: fix });
    autoFixed.defenseBonus = fix;
  }

  const hpMin = Math.round(tierStd.hp[0] * mult.hp);
  const hpMax = Math.round(tierStd.hp[1] * mult.hp);
  if (equip.hpBonus > 0 && !inRange(equip.hpBonus, hpMin, hpMax, 0.2)) {
    const fix = clamp(equip.hpBonus, hpMin, hpMax);
    issues.push({ field: "hpBonus", value: equip.hpBonus, expected: `${hpMin}-${hpMax}`, severity: "warning", autoFix: fix });
    autoFixed.hpBonus = fix;
  }

  const spdMin = Math.round(tierStd.spd[0] * mult.spd);
  const spdMax = Math.round(tierStd.spd[1] * mult.spd);
  if (equip.speedBonus > 0 && !inRange(equip.speedBonus, spdMin, spdMax, 0.2)) {
    const fix = clamp(equip.speedBonus, spdMin, spdMax);
    issues.push({ field: "speedBonus", value: equip.speedBonus, expected: `${spdMin}-${spdMax}`, severity: "warning", autoFix: fix });
    autoFixed.speedBonus = fix;
  }

  return { passed: issues.filter(i => i.severity === "error").length === 0, issues, autoFixed };
}

/**
 * 審核道具/商店價格
 */
export function auditItemPrice(item: {
  category: string; rarity: string; shopPrice: number;
}): AuditResult {
  const issues: AuditIssue[] = [];
  const autoFixed: Record<string, number> = {};

  let itemType: keyof typeof PRICE_STANDARD = "material";
  if (item.category === "consumable" || item.category === "potion") itemType = "consumable";
  else if (item.category === "skill_book" || item.category === "skillbook") itemType = "skillBook";
  else if (item.category === "equipment") itemType = "equipment";

  const std = PRICE_STANDARD[itemType] as Record<string, number>;
  const expected = std[item.rarity] ?? std.common ?? 10;
  const tolerance = 0.5; // 允許 50% 浮動

  if (item.shopPrice > 0 && !inRange(item.shopPrice, expected * 0.5, expected * 1.5, 0)) {
    const fix = expected;
    issues.push({
      field: "shopPrice",
      value: item.shopPrice,
      expected: `${Math.round(expected * 0.5)}-${Math.round(expected * 1.5)}（基準=${expected}）`,
      severity: item.shopPrice < expected * 0.3 ? "error" : "warning",
      autoFix: fix,
    });
    autoFixed.shopPrice = fix;
  }

  return { passed: issues.filter(i => i.severity === "error").length === 0, issues, autoFixed };
}

/**
 * 審核商店物品價格（虛界商店/靈相商店/隱藏商店）
 */
export function auditShopPrice(item: {
  itemType: "skillBook" | "equipment" | "consumable" | "material";
  rarity: string;
  price: number;
  currency: "coins" | "stones";
}): AuditResult {
  const issues: AuditIssue[] = [];
  const autoFixed: Record<string, number> = {};

  const std = item.currency === "coins" ? PRICE_STANDARD : SPIRIT_PRICE_STANDARD;
  const expected = (std[item.itemType] as Record<string, number>)[item.rarity] ?? 10;

  if (item.price > 0 && !inRange(item.price, expected * 0.5, expected * 1.5, 0)) {
    issues.push({
      field: "price",
      value: item.price,
      expected: `${Math.round(expected * 0.5)}-${Math.round(expected * 1.5)}（基準=${expected}）`,
      severity: item.price < expected * 0.3 ? "error" : "warning",
      autoFix: expected,
    });
    autoFixed.price = expected;
  }

  return { passed: issues.filter(i => i.severity === "error").length === 0, issues, autoFixed };
}

/**
 * 批量審核 + 自動修正
 * 返回修正後的數據和審核報告
 */
export function auditAndFix<T extends Record<string, any>>(
  item: T,
  auditFn: (item: T) => AuditResult,
): { fixed: T; audit: AuditResult } {
  const audit = auditFn(item);
  if (Object.keys(audit.autoFixed).length === 0) {
    return { fixed: item, audit };
  }
  const fixed = { ...item, ...audit.autoFixed };
  return { fixed, audit };
}
