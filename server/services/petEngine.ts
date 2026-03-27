/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 寵物系統核心計算引擎 (GD-019)
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 常量定義 ─────────────────────────────────────────────────

/** 種族 HP 倍率 */
export const RACE_HP_MULTIPLIER: Record<string, number> = {
  dragon: 1.3,
  undead: 1.2,
  normal: 1.0,
  flying: 1.0,
  insect: 0.9,
  plant: 0.8,
};

/** 檔位定義（BP 總值範圍、機率、成長加成） */
export const TIER_CONFIG: Record<string, { minBp: number; maxBp: number; probability: number; growthBonus: number }> = {
  S: { minBp: 200, maxBp: 300, probability: 0.005, growthBonus: 0.30 },
  A: { minBp: 150, maxBp: 199, probability: 0.095, growthBonus: 0.20 },
  B: { minBp: 110, maxBp: 149, probability: 0.250, growthBonus: 0.10 },
  C: { minBp: 70,  maxBp: 109, probability: 0.450, growthBonus: 0.00 },
  D: { minBp: 30,  maxBp: 69,  probability: 0.170, growthBonus: -0.10 },
  E: { minBp: 0,   maxBp: 29,  probability: 0.030, growthBonus: -0.20 },
};

/** BP 五維 → 戰鬥數值轉換係數 */
export const BP_TO_STATS = {
  constitution: { hp: 8, mp: 1, atk: 0.1, def: 0.1, spd: 0.1 },
  strength:     { hp: 2, mp: 2, atk: 2.7, def: 0.3, spd: 0.2 },
  defense:      { hp: 2, mp: 2, atk: 0.3, def: 2.7, spd: 0.2 },
  agility:      { hp: 3, mp: 2, atk: 0.3, def: 0.3, spd: 2.0 },
  magic:        { hp: 1, mp: 10, atk: 0.2, def: 0.2, spd: 0.1 },
};

/** 成長型態 → 每級固定 BP 分配 */
export const GROWTH_TYPE_FIXED: Record<string, { constitution: number; strength: number; defense: number; agility: number; magic: number }> = {
  fighter:   { constitution: 0, strength: 1, defense: 0, agility: 0, magic: 0 },
  guardian:  { constitution: 0, strength: 0, defense: 1, agility: 0, magic: 0 },
  swift:     { constitution: 0, strength: 0, defense: 0, agility: 1, magic: 0 },
  mage:      { constitution: 0, strength: 0, defense: 0, agility: 0, magic: 1 },
  balanced:  { constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 }, // 隨機
};

/** 捕捉道具倍率 */
export const CAPTURE_ITEM_MULTIPLIER: Record<string, number> = {
  normal: 1.0,       // 獸魂甕
  silver: 1.15,      // 秘銀獸魂甕
  starlight: 1.30,   // 星輝獸魂甕
  destiny: 1.50,     // 天命獸魂甕
};

/** 天命技能 14 種定義 */
export const DESTINY_SKILLS: Record<string, { name: string; skillType: string; wuxing: string | null; basePower: number; baseMp: number; baseCooldown: number; description: string }> = {
  combo:        { name: "連擊",     skillType: "attack",  wuxing: null,    basePower: 60,  baseMp: 8,  baseCooldown: 2, description: "連續攻擊2次，每次造成60%傷害" },
  counter:      { name: "反擊",     skillType: "attack",  wuxing: "metal", basePower: 120, baseMp: 0,  baseCooldown: 0, description: "受到攻擊時有30%機率反擊" },
  crush:        { name: "崩擊",     skillType: "attack",  wuxing: "earth", basePower: 180, baseMp: 15, baseCooldown: 4, description: "無視30%防禦的重擊" },
  poison:       { name: "毒擊",     skillType: "attack",  wuxing: "wood",  basePower: 80,  baseMp: 10, baseCooldown: 3, description: "攻擊附帶中毒效果，3回合持續傷害" },
  fireMagic:    { name: "火焰魔法", skillType: "attack",  wuxing: "fire",  basePower: 150, baseMp: 12, baseCooldown: 3, description: "釋放火焰造成魔法傷害" },
  iceMagic:     { name: "冰凍魔法", skillType: "attack",  wuxing: "water", basePower: 130, baseMp: 14, baseCooldown: 3, description: "冰凍攻擊，有20%機率凍結1回合" },
  windMagic:    { name: "風刃魔法", skillType: "attack",  wuxing: "metal", basePower: 110, baseMp: 10, baseCooldown: 2, description: "風刃攻擊，必定先手" },
  meteorMagic:  { name: "隕石魔法", skillType: "attack",  wuxing: "fire",  basePower: 200, baseMp: 25, baseCooldown: 5, description: "召喚隕石造成大範圍傷害" },
  sleepMagic:   { name: "昏睡魔法", skillType: "control", wuxing: "water", basePower: 0,   baseMp: 15, baseCooldown: 4, description: "使目標昏睡2回合" },
  petrifyMagic: { name: "石化魔法", skillType: "control", wuxing: "earth", basePower: 0,   baseMp: 18, baseCooldown: 5, description: "使目標石化1回合" },
  confuseMagic: { name: "混亂魔法", skillType: "control", wuxing: null,    basePower: 0,   baseMp: 12, baseCooldown: 3, description: "使目標混亂，有50%機率攻擊自己" },
  poisonMagic:  { name: "中毒魔法", skillType: "debuff",  wuxing: "wood",  basePower: 0,   baseMp: 10, baseCooldown: 3, description: "使目標中毒，每回合損失5%HP" },
  forgetMagic:  { name: "遺忘魔法", skillType: "control", wuxing: null,    basePower: 0,   baseMp: 20, baseCooldown: 5, description: "使目標遺忘技能，3回合只能普攻" },
  healMagic:    { name: "補血魔法", skillType: "heal",    wuxing: "wood",  basePower: 120, baseMp: 15, baseCooldown: 3, description: "恢復自身120%魔攻的HP" },
};

/** 天命技能升級所需使用次數 */
export const DESTINY_SKILL_LEVEL_REQ: Record<number, number> = {
  1: 0, 2: 50, 3: 120, 4: 250, 5: 500,
  6: 800, 7: 1200, 8: 1800, 9: 2500, 10: 3000,
};

/** 天命技能格解鎖等級 */
export const DESTINY_SLOT_UNLOCK = [15, 35, 60];

/** 天生技能格解鎖等級 */
export const INNATE_SLOT_UNLOCK = [1, 20, 50];

/** Lv10 天命技能覺醒效果（14 種各自的最終覺醒加成） */
export const DESTINY_AWAKENING_EFFECTS: Record<string, {
  name: string;
  description: string;
  /** 傷害加成倍率（累乘） */
  damageMultiplier: number;
  /** 額外效果標誌 */
  extraEffect?: string;
  /** 額外效果數值 */
  extraValue?: number;
}> = {
  combo:        { name: "連擊·無影",     description: "連擊次數+1（共 3 次），每次傷害+10%",   damageMultiplier: 1.10, extraEffect: "extraHits", extraValue: 1 },
  counter:      { name: "反擊·天罰",     description: "反擊機率提升至 50%，反擊傷害+30%", damageMultiplier: 1.30, extraEffect: "counterChance", extraValue: 50 },
  crush:        { name: "崩擊·滅世",     description: "無視 50% 防禦，傷害+20%",          damageMultiplier: 1.20, extraEffect: "armorPen", extraValue: 50 },
  poison:       { name: "毒擊·腐骨",     description: "中毒持續 5 回合，每回合傷害+50%",  damageMultiplier: 1.00, extraEffect: "poisonDuration", extraValue: 5 },
  fireMagic:    { name: "火焰·煙滅",     description: "火焰傷害+25%，附帶 2 回合灼燒",     damageMultiplier: 1.25, extraEffect: "burn", extraValue: 2 },
  iceMagic:     { name: "冰凍·絕封",     description: "凍結機率提升至 40%，傷害+15%",     damageMultiplier: 1.15, extraEffect: "freezeChance", extraValue: 40 },
  windMagic:    { name: "風刃·絕影",     description: "必定先手+忽略 20% 防禦，傷害+20%", damageMultiplier: 1.20, extraEffect: "armorPen", extraValue: 20 },
  meteorMagic:  { name: "隕石·天崩",     description: "傷害+30%，有 30% 機率眩暈 1 回合",  damageMultiplier: 1.30, extraEffect: "stun", extraValue: 30 },
  sleepMagic:   { name: "昆睡·永眠",     description: "昆睡持續 3 回合，睡眠中受傷+20%",   damageMultiplier: 1.00, extraEffect: "sleepDuration", extraValue: 3 },
  petrifyMagic: { name: "石化·地獄",     description: "石化持續 2 回合，石化中防禦-30%",  damageMultiplier: 1.00, extraEffect: "petrifyDuration", extraValue: 2 },
  confuseMagic: { name: "混亂·心魔",     description: "混亂機率提升至 70%，混亂持續 3 回合", damageMultiplier: 1.00, extraEffect: "confuseChance", extraValue: 70 },
  poisonMagic:  { name: "中毒·天罰",     description: "每回合損失 8% HP，持續 4 回合",    damageMultiplier: 1.00, extraEffect: "poisonPercent", extraValue: 8 },
  forgetMagic:  { name: "遺忘·天譴",     description: "遺忘持續 5 回合，封印所有技能",    damageMultiplier: 1.00, extraEffect: "forgetDuration", extraValue: 5 },
  healMagic:    { name: "補血·天恩",     description: "恢復量+40%，同時恢復 MP 10%",       damageMultiplier: 1.40, extraEffect: "mpRestore", extraValue: 10 },
};

/** 寥物升級經驗值曲線 */
export function calcPetExpToNext(level: number): number {
  // 類似角色的經驗曲線，但稍微平緩
  return Math.floor(50 + level * 30 + Math.pow(level, 1.6) * 5);
}

/** 將寥物技能轉換為戰鬥引擎可用的格式 */
export function petSkillsToCombatFormat(
  innateSkills: Array<{ name: string; skillType: string; wuxing: string | null; powerPercent: number; mpCost: number; cooldown: number }>,
  learnedSkills: Array<{ skillName: string; skillType: string; skillKey: string; wuxing: string | null; powerPercent: number; mpCost: number; cooldown: number; skillLevel: number }>,
): Array<{ id: string; name: string; skillType: string; damageMultiplier: number; mpCost: number; wuxing?: string; cooldown?: number }> {
  const result: Array<{ id: string; name: string; skillType: string; damageMultiplier: number; mpCost: number; wuxing?: string; cooldown?: number }> = [];
  
  // 天生技能
  for (const sk of innateSkills) {
    result.push({
      id: `pet_innate_${sk.name}`,
      name: `[寵] ${sk.name}`,
      skillType: sk.skillType === "attack" ? "attack" : sk.skillType === "heal" ? "heal" : "buff",
      damageMultiplier: sk.powerPercent / 100,
      mpCost: sk.mpCost,
      wuxing: sk.wuxing ?? undefined,
      cooldown: sk.cooldown,
    });
  }
  
  // 天命技能（含覺醒效果）
  for (const sk of learnedSkills) {
    const awakening = sk.skillLevel >= 10 ? DESTINY_AWAKENING_EFFECTS[sk.skillKey] : null;
    const baseMul = sk.powerPercent / 100;
    const finalMul = awakening ? baseMul * awakening.damageMultiplier : baseMul;
    
    result.push({
      id: `pet_destiny_${sk.skillKey}`,
      name: awakening ? `[寵★] ${awakening.name}` : `[寵] ${sk.skillName}`,
      skillType: sk.skillType === "attack" ? "attack" : sk.skillType === "heal" ? "heal" : sk.skillType === "control" ? "attack" : "buff",
      damageMultiplier: finalMul,
      mpCost: sk.mpCost,
      wuxing: sk.wuxing ?? undefined,
      cooldown: sk.cooldown,
    });
  }
  
  return result;
}

/** 計算寥物戰鬥經驗獲得（基於怪物經驗的 60%） */
export function calcPetBattleExp(monsterExpReward: number, petLevel: number, monsterLevel: number): number {
  const baseExp = Math.floor(monsterExpReward * 0.6);
  // 等級差調整：打高等怪獲得更多，打低等怪獲得更少
  const levelDiff = monsterLevel - petLevel;
  const levelMul = Math.max(0.3, Math.min(1.5, 1 + levelDiff * 0.05));
  return Math.max(1, Math.round(baseExp * levelMul));
}

// ─── 核心計算函數 ─────────────────────────────────────────────

/** 根據機率表隨機決定檔位 */
export function rollTier(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    cumulative += config.probability;
    if (r <= cumulative) return tier;
  }
  return "C";
}

/** 根據檔位生成初始 BP 五維 */
export function rollInitialBP(tier: string, baseBp: { constitution: number; strength: number; defense: number; agility: number; magic: number }): {
  constitution: number; strength: number; defense: number; agility: number; magic: number; totalBp: number;
} {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.C;
  // 目標總 BP 在檔位範圍內隨機
  const targetTotal = config.minBp + Math.floor(Math.random() * (config.maxBp - config.minBp + 1));
  
  // 以基礎 BP 為權重分配
  const baseTotal = baseBp.constitution + baseBp.strength + baseBp.defense + baseBp.agility + baseBp.magic;
  const ratio = targetTotal / (baseTotal || 100);
  
  const result = {
    constitution: Math.max(1, Math.round(baseBp.constitution * ratio + (Math.random() - 0.5) * 5)),
    strength: Math.max(1, Math.round(baseBp.strength * ratio + (Math.random() - 0.5) * 5)),
    defense: Math.max(1, Math.round(baseBp.defense * ratio + (Math.random() - 0.5) * 5)),
    agility: Math.max(1, Math.round(baseBp.agility * ratio + (Math.random() - 0.5) * 5)),
    magic: Math.max(1, Math.round(baseBp.magic * ratio + (Math.random() - 0.5) * 5)),
    totalBp: 0,
  };
  result.totalBp = result.constitution + result.strength + result.defense + result.agility + result.magic;
  return result;
}

/** 升級時 BP 成長（每級 3 固定 + 1 隨機） */
export function levelUpBP(
  currentBp: { constitution: number; strength: number; defense: number; agility: number; magic: number },
  growthType: string,
  tier: string,
): { constitution: number; strength: number; defense: number; agility: number; magic: number; gains: Record<string, number> } {
  const growthBonus = 1 + (TIER_CONFIG[tier]?.growthBonus || 0);
  const fixed = GROWTH_TYPE_FIXED[growthType] || GROWTH_TYPE_FIXED.balanced;
  
  const gains: Record<string, number> = { constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 };
  
  // 3 固定 BP：1 給成長型態主屬，2 平均分配
  if (growthType === "balanced") {
    // 均衡型：3 點隨機分配
    const dims = ["constitution", "strength", "defense", "agility", "magic"];
    for (let i = 0; i < 3; i++) {
      const d = dims[Math.floor(Math.random() * dims.length)];
      gains[d] += Math.round(1 * growthBonus);
    }
  } else {
    // 特化型：主屬 +1，其他 2 點隨機
    const mainAttr = Object.entries(fixed).find(([, v]) => v === 1)?.[0];
    if (mainAttr) gains[mainAttr] += Math.round(1 * growthBonus);
    const dims = ["constitution", "strength", "defense", "agility", "magic"];
    for (let i = 0; i < 2; i++) {
      const d = dims[Math.floor(Math.random() * dims.length)];
      gains[d] += Math.round(1 * growthBonus);
    }
  }
  
  // 1 隨機 BP
  const dims = ["constitution", "strength", "defense", "agility", "magic"];
  const randomDim = dims[Math.floor(Math.random() * dims.length)];
  gains[randomDim] += Math.round(1 * growthBonus);
  
  return {
    constitution: currentBp.constitution + gains.constitution,
    strength: currentBp.strength + gains.strength,
    defense: currentBp.defense + gains.defense,
    agility: currentBp.agility + gains.agility,
    magic: currentBp.magic + gains.magic,
    gains,
  };
}

/** 從 BP 五維計算戰鬥數值 */
export function calcPetStats(
  bp: { constitution: number; strength: number; defense: number; agility: number; magic: number },
  level: number,
  raceHpMultiplier: number = 1.0,
): { hp: number; mp: number; attack: number; defense: number; speed: number; magicAttack: number } {
  const baseHp = bp.constitution * BP_TO_STATS.constitution.hp
    + bp.strength * BP_TO_STATS.strength.hp
    + bp.defense * BP_TO_STATS.defense.hp
    + bp.agility * BP_TO_STATS.agility.hp
    + bp.magic * BP_TO_STATS.magic.hp;
  
  const baseMp = bp.constitution * BP_TO_STATS.constitution.mp
    + bp.strength * BP_TO_STATS.strength.mp
    + bp.defense * BP_TO_STATS.defense.mp
    + bp.agility * BP_TO_STATS.agility.mp
    + bp.magic * BP_TO_STATS.magic.mp;
  
  const baseAtk = bp.constitution * BP_TO_STATS.constitution.atk
    + bp.strength * BP_TO_STATS.strength.atk
    + bp.defense * BP_TO_STATS.defense.atk
    + bp.agility * BP_TO_STATS.agility.atk
    + bp.magic * BP_TO_STATS.magic.atk;
  
  const baseDef = bp.constitution * BP_TO_STATS.constitution.def
    + bp.strength * BP_TO_STATS.strength.def
    + bp.defense * BP_TO_STATS.defense.def
    + bp.agility * BP_TO_STATS.agility.def
    + bp.magic * BP_TO_STATS.magic.def;
  
  const baseSpd = bp.constitution * BP_TO_STATS.constitution.spd
    + bp.strength * BP_TO_STATS.strength.spd
    + bp.defense * BP_TO_STATS.defense.spd
    + bp.agility * BP_TO_STATS.agility.spd
    + bp.magic * BP_TO_STATS.magic.spd;
  
  // 等級加成（每級 +2% 基礎值）
  const levelMul = 1 + (level - 1) * 0.02;
  
  return {
    hp: Math.round(baseHp * raceHpMultiplier * levelMul),
    mp: Math.round(baseMp * levelMul),
    attack: Math.round(baseAtk * levelMul),
    defense: Math.round(baseDef * levelMul),
    speed: Math.round(baseSpd * levelMul),
    magicAttack: Math.round((bp.magic * 2.5 + bp.strength * 0.3) * levelMul),
  };
}

/** 計算捕捉率 */
export function calcCaptureRate(params: {
  baseCaptureRate: number;
  monsterCurrentHp: number;
  monsterMaxHp: number;
  monsterLevel: number;
  playerLevel: number;
  captureItemType: string;
}): number {
  const { baseCaptureRate, monsterCurrentHp, monsterMaxHp, monsterLevel, playerLevel, captureItemType } = params;
  
  // HP 因子 = (1 - CurrentHP/MaxHP)^0.8 × 0.7 + 0.3
  const hpRatio = monsterCurrentHp / Math.max(monsterMaxHp, 1);
  const hpFactor = Math.pow(1 - hpRatio, 0.8) * 0.7 + 0.3;
  
  // 等級因子 = 1 / (1 + 0.02 × (MonsterLv - PlayerLv))
  const levelDiff = monsterLevel - playerLevel;
  const levelFactor = 1 / (1 + 0.02 * Math.max(levelDiff, 0));
  
  // 道具加成
  const itemMultiplier = CAPTURE_ITEM_MULTIPLIER[captureItemType] || 1.0;
  
  // 最終捕捉率
  const rate = (baseCaptureRate / 100) * hpFactor * levelFactor * itemMultiplier;
  return Math.min(Math.max(rate, 0.01), 0.95); // 最低 1%，最高 95%
}

/** 天命技能升級檢查 */
export function checkDestinySkillLevelUp(currentLevel: number, usageCount: number): { canLevelUp: boolean; nextLevel: number; requiredUsage: number } {
  if (currentLevel >= 10) return { canLevelUp: false, nextLevel: 10, requiredUsage: 0 };
  const nextLevel = currentLevel + 1;
  const required = DESTINY_SKILL_LEVEL_REQ[nextLevel] || 9999;
  return { canLevelUp: usageCount >= required, nextLevel, requiredUsage: required };
}

/** 天命技能威力隨等級成長 */
export function getDestinySkillPower(baseSkill: typeof DESTINY_SKILLS[string], skillLevel: number): {
  powerPercent: number; mpCost: number; cooldown: number;
} {
  // 每級 +8% 威力，MP +5%，冷卻不變
  const levelMul = 1 + (skillLevel - 1) * 0.08;
  return {
    powerPercent: Math.round(baseSkill.basePower * levelMul),
    mpCost: Math.round(baseSkill.baseMp * (1 + (skillLevel - 1) * 0.05)),
    cooldown: baseSkill.baseCooldown,
  };
}

/** 審核寵物圖鑑數值合理性 */
export function auditPetCatalog(pet: {
  race: string; rarity: string; baseBpConstitution: number; baseBpStrength: number;
  baseBpDefense: number; baseBpAgility: number; baseBpMagic: number;
  baseCaptureRate: number; raceHpMultiplier: number;
}): { valid: boolean; warnings: string[]; fixes: Record<string, number> } {
  const warnings: string[] = [];
  const fixes: Record<string, number> = {};
  
  const totalBp = pet.baseBpConstitution + pet.baseBpStrength + pet.baseBpDefense + pet.baseBpAgility + pet.baseBpMagic;
  
  // 基礎 BP 總值應在 60-150 之間
  if (totalBp < 60) { warnings.push(`基礎 BP 總值 ${totalBp} 過低（建議 60-150）`); }
  if (totalBp > 150) { warnings.push(`基礎 BP 總值 ${totalBp} 過高（建議 60-150）`); }
  
  // 種族 HP 倍率應匹配
  const expectedMul = RACE_HP_MULTIPLIER[pet.race] || 1.0;
  if (Math.abs(pet.raceHpMultiplier - expectedMul) > 0.01) {
    warnings.push(`種族 HP 倍率 ${pet.raceHpMultiplier} 與 ${pet.race} 預期 ${expectedMul} 不符`);
    fixes.raceHpMultiplier = expectedMul;
  }
  
  // 捕捉率按稀有度
  const captureRanges: Record<string, [number, number]> = {
    common: [25, 45], rare: [15, 30], epic: [8, 20], legendary: [3, 10],
  };
  const range = captureRanges[pet.rarity] || [10, 40];
  if (pet.baseCaptureRate < range[0] || pet.baseCaptureRate > range[1]) {
    warnings.push(`捕捉率 ${pet.baseCaptureRate}% 超出 ${pet.rarity} 建議範圍 ${range[0]}-${range[1]}%`);
    fixes.baseCaptureRate = Math.round((range[0] + range[1]) / 2);
  }
  
  return { valid: warnings.length === 0, warnings, fixes };
}
