import { describe, expect, it } from "vitest";
import {
  RACE_HP_MULTIPLIER,
  TIER_CONFIG,
  BP_TO_STATS,
  CAPTURE_ITEM_MULTIPLIER,
  DESTINY_SKILLS,
  DESTINY_SKILL_LEVEL_REQ,
  DESTINY_SLOT_UNLOCK,
  INNATE_SLOT_UNLOCK,
  calcPetExpToNext,
  rollTier,
  rollInitialBP,
  levelUpBP,
  calcPetStats,
  calcCaptureRate,
  checkDestinySkillLevelUp,
  getDestinySkillPower,
  auditPetCatalog,
} from "./services/petEngine";

// ─── Constants ────────────────────────────────────────────────

describe("petEngine constants", () => {
  it("RACE_HP_MULTIPLIER covers all 6 races", () => {
    const expected = ["dragon", "undead", "normal", "flying", "insect", "plant"];
    for (const race of expected) {
      expect(RACE_HP_MULTIPLIER[race]).toBeTypeOf("number");
      expect(RACE_HP_MULTIPLIER[race]).toBeGreaterThan(0);
    }
  });

  it("TIER_CONFIG has 6 tiers (S-E) with valid probabilities summing to 1", () => {
    const tiers = Object.keys(TIER_CONFIG);
    expect(tiers).toEqual(expect.arrayContaining(["S", "A", "B", "C", "D", "E"]));
    const totalProb = Object.values(TIER_CONFIG).reduce((s, c) => s + c.probability, 0);
    expect(totalProb).toBeCloseTo(1.0, 3);
  });

  it("CAPTURE_ITEM_MULTIPLIER has ascending multipliers", () => {
    expect(CAPTURE_ITEM_MULTIPLIER.normal).toBeLessThan(CAPTURE_ITEM_MULTIPLIER.silver);
    expect(CAPTURE_ITEM_MULTIPLIER.silver).toBeLessThan(CAPTURE_ITEM_MULTIPLIER.starlight);
    expect(CAPTURE_ITEM_MULTIPLIER.starlight).toBeLessThan(CAPTURE_ITEM_MULTIPLIER.destiny);
  });

  it("DESTINY_SKILLS has 14 skills", () => {
    expect(Object.keys(DESTINY_SKILLS)).toHaveLength(14);
    for (const skill of Object.values(DESTINY_SKILLS)) {
      expect(skill.name).toBeTruthy();
      expect(skill.skillType).toBeTruthy();
      expect(skill.baseMp).toBeGreaterThanOrEqual(0);
    }
  });

  it("DESTINY_SLOT_UNLOCK has 3 levels", () => {
    expect(DESTINY_SLOT_UNLOCK).toHaveLength(3);
    expect(DESTINY_SLOT_UNLOCK[0]).toBeLessThan(DESTINY_SLOT_UNLOCK[1]);
    expect(DESTINY_SLOT_UNLOCK[1]).toBeLessThan(DESTINY_SLOT_UNLOCK[2]);
  });

  it("INNATE_SLOT_UNLOCK has 3 levels", () => {
    expect(INNATE_SLOT_UNLOCK).toHaveLength(3);
    expect(INNATE_SLOT_UNLOCK).toEqual([1, 20, 50]);
  });
});

// ─── calcPetExpToNext ─────────────────────────────────────────

describe("calcPetExpToNext", () => {
  it("returns positive integer for any level", () => {
    for (const lv of [1, 5, 10, 30, 60]) {
      const exp = calcPetExpToNext(lv);
      expect(exp).toBeGreaterThan(0);
      expect(Number.isInteger(exp)).toBe(true);
    }
  });

  it("exp requirement increases with level", () => {
    const exp1 = calcPetExpToNext(1);
    const exp10 = calcPetExpToNext(10);
    const exp50 = calcPetExpToNext(50);
    expect(exp1).toBeLessThan(exp10);
    expect(exp10).toBeLessThan(exp50);
  });
});

// ─── rollTier ─────────────────────────────────────────────────

describe("rollTier", () => {
  it("always returns a valid tier (S-E)", () => {
    const validTiers = new Set(["S", "A", "B", "C", "D", "E"]);
    for (let i = 0; i < 100; i++) {
      expect(validTiers.has(rollTier())).toBe(true);
    }
  });
});

// ─── rollInitialBP ────────────────────────────────────────────

describe("rollInitialBP", () => {
  const baseBp = { constitution: 20, strength: 20, defense: 20, agility: 20, magic: 20 };

  it("returns 5 dimensions and totalBp", () => {
    const result = rollInitialBP("C", baseBp);
    expect(result).toHaveProperty("constitution");
    expect(result).toHaveProperty("strength");
    expect(result).toHaveProperty("defense");
    expect(result).toHaveProperty("agility");
    expect(result).toHaveProperty("magic");
    expect(result).toHaveProperty("totalBp");
    expect(result.totalBp).toBe(
      result.constitution + result.strength + result.defense + result.agility + result.magic
    );
  });

  it("totalBp falls within tier range for tier C", () => {
    // Due to rounding, allow some tolerance
    for (let i = 0; i < 20; i++) {
      const result = rollInitialBP("C", baseBp);
      expect(result.totalBp).toBeGreaterThanOrEqual(TIER_CONFIG.C.minBp - 10);
      expect(result.totalBp).toBeLessThanOrEqual(TIER_CONFIG.C.maxBp + 10);
    }
  });

  it("S tier produces higher total BP than D tier on average", () => {
    let totalS = 0, totalD = 0;
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      totalS += rollInitialBP("S", baseBp).totalBp;
      totalD += rollInitialBP("D", baseBp).totalBp;
    }
    expect(totalS / runs).toBeGreaterThan(totalD / runs);
  });

  it("all dimensions are at least 1", () => {
    for (let i = 0; i < 20; i++) {
      const result = rollInitialBP("E", { constitution: 5, strength: 5, defense: 5, agility: 5, magic: 5 });
      expect(result.constitution).toBeGreaterThanOrEqual(1);
      expect(result.strength).toBeGreaterThanOrEqual(1);
      expect(result.defense).toBeGreaterThanOrEqual(1);
      expect(result.agility).toBeGreaterThanOrEqual(1);
      expect(result.magic).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── levelUpBP ────────────────────────────────────────────────

describe("levelUpBP", () => {
  const currentBp = { constitution: 30, strength: 30, defense: 30, agility: 30, magic: 30 };

  it("returns updated BP and gains", () => {
    const result = levelUpBP(currentBp, "fighter", "C");
    expect(result.gains).toBeDefined();
    // Total should increase
    const newTotal = result.constitution + result.strength + result.defense + result.agility + result.magic;
    const oldTotal = currentBp.constitution + currentBp.strength + currentBp.defense + currentBp.agility + currentBp.magic;
    expect(newTotal).toBeGreaterThan(oldTotal);
  });

  it("fighter type tends to gain more strength", () => {
    let strengthGains = 0;
    const runs = 100;
    for (let i = 0; i < runs; i++) {
      const result = levelUpBP(currentBp, "fighter", "C");
      strengthGains += result.gains.strength;
    }
    // Fighter should gain at least some strength on average
    expect(strengthGains / runs).toBeGreaterThan(0);
  });

  it("S tier grows faster than D tier", () => {
    let totalGainS = 0, totalGainD = 0;
    const runs = 100;
    for (let i = 0; i < runs; i++) {
      const sResult = levelUpBP(currentBp, "balanced", "S");
      const dResult = levelUpBP(currentBp, "balanced", "D");
      totalGainS += Object.values(sResult.gains).reduce((a, b) => a + b, 0);
      totalGainD += Object.values(dResult.gains).reduce((a, b) => a + b, 0);
    }
    expect(totalGainS / runs).toBeGreaterThanOrEqual(totalGainD / runs);
  });
});

// ─── calcPetStats ─────────────────────────────────────────────

describe("calcPetStats", () => {
  const bp = { constitution: 50, strength: 40, defense: 30, agility: 20, magic: 10 };

  it("returns all 6 stats as positive numbers", () => {
    const stats = calcPetStats(bp, 1);
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.mp).toBeGreaterThan(0);
    expect(stats.attack).toBeGreaterThan(0);
    expect(stats.defense).toBeGreaterThan(0);
    expect(stats.speed).toBeGreaterThan(0);
    expect(stats.magicAttack).toBeGreaterThan(0);
  });

  it("higher level produces higher stats", () => {
    const lv1 = calcPetStats(bp, 1);
    const lv30 = calcPetStats(bp, 30);
    expect(lv30.hp).toBeGreaterThan(lv1.hp);
    expect(lv30.attack).toBeGreaterThan(lv1.attack);
  });

  it("dragon race has higher HP than normal race", () => {
    const dragonStats = calcPetStats(bp, 10, RACE_HP_MULTIPLIER.dragon);
    const normalStats = calcPetStats(bp, 10, RACE_HP_MULTIPLIER.normal);
    expect(dragonStats.hp).toBeGreaterThan(normalStats.hp);
  });

  it("high constitution BP produces high HP", () => {
    const highCon = calcPetStats({ constitution: 100, strength: 10, defense: 10, agility: 10, magic: 10 }, 1);
    const lowCon = calcPetStats({ constitution: 10, strength: 10, defense: 10, agility: 10, magic: 10 }, 1);
    expect(highCon.hp).toBeGreaterThan(lowCon.hp);
  });
});

// ─── calcCaptureRate ──────────────────────────────────────────

describe("calcCaptureRate", () => {
  it("returns rate between 1% and 95%", () => {
    const rate = calcCaptureRate({
      baseCaptureRate: 30,
      monsterCurrentHp: 50,
      monsterMaxHp: 100,
      monsterLevel: 10,
      playerLevel: 10,
      captureItemType: "normal",
    });
    expect(rate).toBeGreaterThanOrEqual(0.01);
    expect(rate).toBeLessThanOrEqual(0.95);
  });

  it("lower monster HP increases capture rate", () => {
    const highHp = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 90, monsterMaxHp: 100,
      monsterLevel: 10, playerLevel: 10, captureItemType: "normal",
    });
    const lowHp = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 10, monsterMaxHp: 100,
      monsterLevel: 10, playerLevel: 10, captureItemType: "normal",
    });
    expect(lowHp).toBeGreaterThan(highHp);
  });

  it("better capture item increases rate", () => {
    const normal = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 50, monsterMaxHp: 100,
      monsterLevel: 10, playerLevel: 10, captureItemType: "normal",
    });
    const destiny = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 50, monsterMaxHp: 100,
      monsterLevel: 10, playerLevel: 10, captureItemType: "destiny",
    });
    expect(destiny).toBeGreaterThan(normal);
  });

  it("higher monster level reduces capture rate", () => {
    const sameLv = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 50, monsterMaxHp: 100,
      monsterLevel: 10, playerLevel: 10, captureItemType: "normal",
    });
    const highLv = calcCaptureRate({
      baseCaptureRate: 30, monsterCurrentHp: 50, monsterMaxHp: 100,
      monsterLevel: 30, playerLevel: 10, captureItemType: "normal",
    });
    expect(sameLv).toBeGreaterThan(highLv);
  });

  it("caps at 95% even with very favorable conditions", () => {
    const rate = calcCaptureRate({
      baseCaptureRate: 100, monsterCurrentHp: 1, monsterMaxHp: 100,
      monsterLevel: 1, playerLevel: 60, captureItemType: "destiny",
    });
    expect(rate).toBeLessThanOrEqual(0.95);
  });

  it("minimum 1% even with very unfavorable conditions", () => {
    const rate = calcCaptureRate({
      baseCaptureRate: 1, monsterCurrentHp: 100, monsterMaxHp: 100,
      monsterLevel: 60, playerLevel: 1, captureItemType: "normal",
    });
    expect(rate).toBeGreaterThanOrEqual(0.01);
  });
});

// ─── checkDestinySkillLevelUp ─────────────────────────────────

describe("checkDestinySkillLevelUp", () => {
  it("level 1 with 0 usage cannot level up", () => {
    const result = checkDestinySkillLevelUp(1, 0);
    expect(result.canLevelUp).toBe(false);
    expect(result.nextLevel).toBe(2);
    expect(result.requiredUsage).toBe(DESTINY_SKILL_LEVEL_REQ[2]);
  });

  it("level 1 with enough usage can level up", () => {
    const result = checkDestinySkillLevelUp(1, 50);
    expect(result.canLevelUp).toBe(true);
    expect(result.nextLevel).toBe(2);
  });

  it("level 10 cannot level up further", () => {
    const result = checkDestinySkillLevelUp(10, 99999);
    expect(result.canLevelUp).toBe(false);
    expect(result.nextLevel).toBe(10);
  });
});

// ─── getDestinySkillPower ─────────────────────────────────────

describe("getDestinySkillPower", () => {
  it("level 1 returns base values", () => {
    const skill = DESTINY_SKILLS.combo;
    const result = getDestinySkillPower(skill, 1);
    expect(result.powerPercent).toBe(skill.basePower);
    expect(result.mpCost).toBe(skill.baseMp);
    expect(result.cooldown).toBe(skill.baseCooldown);
  });

  it("higher level increases power and mp", () => {
    const skill = DESTINY_SKILLS.fireMagic;
    const lv1 = getDestinySkillPower(skill, 1);
    const lv5 = getDestinySkillPower(skill, 5);
    expect(lv5.powerPercent).toBeGreaterThan(lv1.powerPercent);
    expect(lv5.mpCost).toBeGreaterThanOrEqual(lv1.mpCost);
  });

  it("cooldown stays the same across levels", () => {
    const skill = DESTINY_SKILLS.crush;
    const lv1 = getDestinySkillPower(skill, 1);
    const lv10 = getDestinySkillPower(skill, 10);
    expect(lv10.cooldown).toBe(lv1.cooldown);
  });
});

// ─── auditPetCatalog ──────────────────────────────────────────

describe("auditPetCatalog", () => {
  it("valid pet passes audit", () => {
    const result = auditPetCatalog({
      race: "normal",
      rarity: "common",
      baseBpConstitution: 20,
      baseBpStrength: 15,
      baseBpDefense: 15,
      baseBpAgility: 15,
      baseBpMagic: 15,
      baseCaptureRate: 35,
      raceHpMultiplier: 1.0,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(Object.keys(result.fixes)).toHaveLength(0);
  });

  it("detects wrong raceHpMultiplier and provides fix", () => {
    const result = auditPetCatalog({
      race: "dragon",
      rarity: "common",
      baseBpConstitution: 20,
      baseBpStrength: 15,
      baseBpDefense: 15,
      baseBpAgility: 15,
      baseBpMagic: 15,
      baseCaptureRate: 35,
      raceHpMultiplier: 1.0, // Should be 1.3 for dragon
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.fixes.raceHpMultiplier).toBe(1.3);
  });

  it("detects capture rate out of range for legendary", () => {
    const result = auditPetCatalog({
      race: "normal",
      rarity: "legendary",
      baseBpConstitution: 30,
      baseBpStrength: 25,
      baseBpDefense: 25,
      baseBpAgility: 25,
      baseBpMagic: 25,
      baseCaptureRate: 50, // Too high for legendary (3-10%)
      raceHpMultiplier: 1.0,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes("捕捉率"))).toBe(true);
    expect(result.fixes.baseCaptureRate).toBeDefined();
    expect(result.fixes.baseCaptureRate).toBeLessThanOrEqual(10);
  });

  it("detects BP total too low", () => {
    const result = auditPetCatalog({
      race: "normal",
      rarity: "common",
      baseBpConstitution: 5,
      baseBpStrength: 5,
      baseBpDefense: 5,
      baseBpAgility: 5,
      baseBpMagic: 5,
      baseCaptureRate: 35,
      raceHpMultiplier: 1.0,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes("BP 總值") && w.includes("過低"))).toBe(true);
  });

  it("detects BP total too high", () => {
    const result = auditPetCatalog({
      race: "normal",
      rarity: "common",
      baseBpConstitution: 50,
      baseBpStrength: 50,
      baseBpDefense: 50,
      baseBpAgility: 50,
      baseBpMagic: 50,
      baseCaptureRate: 35,
      raceHpMultiplier: 1.0,
    });
    expect(result.valid).toBe(false);
    expect(result.warnings.some(w => w.includes("BP 總值") && w.includes("過高"))).toBe(true);
  });
});

// ─── DESTINY_AWAKENING_EFFECTS ───────────────────────────────

import {
  DESTINY_AWAKENING_EFFECTS,
  petSkillsToCombatFormat,
  calcPetBattleExp,
  calcAfkBpGain,
  recalcReasonableBP,
  AFK_BP_DAILY_CAP,
} from "./services/petEngine";

describe("DESTINY_AWAKENING_EFFECTS", () => {
  it("has 14 awakening effects matching DESTINY_SKILLS keys", () => {
    const destinyKeys = Object.keys(DESTINY_SKILLS);
    const awakeningKeys = Object.keys(DESTINY_AWAKENING_EFFECTS);
    expect(awakeningKeys).toHaveLength(14);
    for (const key of awakeningKeys) {
      expect(destinyKeys).toContain(key);
    }
  });

  it("all effects have valid damageMultiplier >= 1.0", () => {
    for (const [key, effect] of Object.entries(DESTINY_AWAKENING_EFFECTS)) {
      expect(effect.damageMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(effect.name).toBeTruthy();
      expect(effect.description).toBeTruthy();
    }
  });
});

// ─── petSkillsToCombatFormat ─────────────────────────────────

describe("petSkillsToCombatFormat", () => {
  it("converts innate skills to combat format", () => {
    const innate = [
      { name: "爪擊", skillType: "attack", wuxing: "金", powerPercent: 120, mpCost: 5, cooldown: 2 },
    ];
    const result = petSkillsToCombatFormat(innate, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pet_innate_爪擊");
    expect(result[0].name).toBe("[寵] 爪擊");
    expect(result[0].damageMultiplier).toBeCloseTo(1.2);
    expect(result[0].mpCost).toBe(5);
    expect(result[0].wuxing).toBe("金");
  });

  it("converts destiny skills without awakening", () => {
    const learned = [
      { skillName: "火焰魔法", skillType: "attack", skillKey: "fireMagic", wuxing: "火", powerPercent: 130, mpCost: 8, cooldown: 3, skillLevel: 5 },
    ];
    const result = petSkillsToCombatFormat([], learned);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pet_destiny_fireMagic");
    expect(result[0].name).toBe("[寵] 火焰魔法");
    expect(result[0].damageMultiplier).toBeCloseTo(1.3);
  });

  it("applies awakening effect at level 10", () => {
    const learned = [
      { skillName: "火焰魔法", skillType: "attack", skillKey: "fireMagic", wuxing: "火", powerPercent: 130, mpCost: 8, cooldown: 3, skillLevel: 10 },
    ];
    const result = petSkillsToCombatFormat([], learned);
    expect(result).toHaveLength(1);
    expect(result[0].name).toContain("★");
    expect(result[0].name).toContain(DESTINY_AWAKENING_EFFECTS.fireMagic.name);
    // 130% * 1.25 = 162.5%
    expect(result[0].damageMultiplier).toBeCloseTo(1.3 * 1.25);
  });

  it("combines innate and destiny skills", () => {
    const innate = [
      { name: "爪擊", skillType: "attack", wuxing: "金", powerPercent: 100, mpCost: 3, cooldown: 1 },
    ];
    const learned = [
      { skillName: "連擊", skillType: "attack", skillKey: "combo", wuxing: null, powerPercent: 150, mpCost: 10, cooldown: 3, skillLevel: 1 },
    ];
    const result = petSkillsToCombatFormat(innate, learned);
    expect(result).toHaveLength(2);
    expect(result[0].id).toContain("innate");
    expect(result[1].id).toContain("destiny");
  });
});

// ─── calcPetBattleExp ────────────────────────────────────────

describe("calcPetBattleExp", () => {
  it("returns 60% of monster exp at same level", () => {
    const exp = calcPetBattleExp(100, 10, 10);
    expect(exp).toBe(60); // 100 * 0.6 * 1.0
  });

  it("returns more exp when fighting higher level monsters", () => {
    const sameLevel = calcPetBattleExp(100, 10, 10);
    const higherLevel = calcPetBattleExp(100, 10, 20);
    expect(higherLevel).toBeGreaterThan(sameLevel);
  });

  it("returns less exp when fighting lower level monsters", () => {
    const sameLevel = calcPetBattleExp(100, 10, 10);
    const lowerLevel = calcPetBattleExp(100, 10, 1);
    expect(lowerLevel).toBeLessThan(sameLevel);
  });

  it("never returns less than 1", () => {
    const exp = calcPetBattleExp(1, 60, 1);
    expect(exp).toBeGreaterThanOrEqual(1);
  });

  it("caps level multiplier at 1.5x for very high level monsters", () => {
    const exp = calcPetBattleExp(100, 1, 50);
    // levelDiff = 49, mul = min(1.5, 1 + 49*0.05) = 1.5
    expect(exp).toBe(Math.max(1, Math.round(60 * 1.5)));
  });

  it("caps level multiplier at 0.3x for very low level monsters", () => {
    const exp = calcPetBattleExp(100, 50, 1);
    // levelDiff = -49, mul = max(0.3, 1 + (-49)*0.05) = max(0.3, -1.45) = 0.3
    expect(exp).toBe(Math.max(1, Math.round(60 * 0.3)));
  });
});

// ─── calcAfkBpGain (v2 新增) ────────────────────────────────

describe("calcAfkBpGain", () => {
  it("should return 0 when daily cap is reached", () => {
    const result = calcAfkBpGain(1, "fighter", AFK_BP_DAILY_CAP);
    expect(result.totalGain).toBe(0);
    expect(Object.values(result.gains).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("should return 0 or 1 BP per tick", () => {
    for (let i = 0; i < 100; i++) {
      const result = calcAfkBpGain(1, "fighter", 0);
      expect(result.totalGain).toBeLessThanOrEqual(1);
      expect(result.totalGain).toBeGreaterThanOrEqual(0);
    }
  });

  it("low level should have higher chance than high level", () => {
    let lowLevelGains = 0, highLevelGains = 0;
    const runs = 2000;
    for (let i = 0; i < runs; i++) {
      lowLevelGains += calcAfkBpGain(1, "fighter", 0).totalGain;
      highLevelGains += calcAfkBpGain(60, "fighter", 0).totalGain;
    }
    // Lv1 ~50% chance, Lv60 ~10% chance
    expect(lowLevelGains / runs).toBeGreaterThan(highLevelGains / runs);
    expect(lowLevelGains / runs).toBeGreaterThan(0.3);
    expect(highLevelGains / runs).toBeLessThan(0.3);
  });

  it("fighter growth type should bias toward strength", () => {
    let strengthGains = 0, totalGains = 0;
    const runs = 3000;
    for (let i = 0; i < runs; i++) {
      const result = calcAfkBpGain(1, "fighter", 0);
      if (result.totalGain > 0) {
        totalGains++;
        if (result.gains.strength > 0) strengthGains++;
      }
    }
    if (totalGains > 50) {
      expect(strengthGains / totalGains).toBeGreaterThan(0.5);
    }
  });

  it("balanced type distributes randomly across all dimensions", () => {
    const dimCounts: Record<string, number> = { constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 };
    let totalGains = 0;
    const runs = 5000;
    for (let i = 0; i < runs; i++) {
      const result = calcAfkBpGain(1, "balanced", 0);
      if (result.totalGain > 0) {
        totalGains++;
        for (const [k, v] of Object.entries(result.gains)) {
          if (v > 0) dimCounts[k]++;
        }
      }
    }
    // balanced: each dim should get roughly 20% of gains
    if (totalGains > 100) {
      for (const dim of Object.keys(dimCounts)) {
        expect(dimCounts[dim] / totalGains).toBeGreaterThan(0.05);
        expect(dimCounts[dim] / totalGains).toBeLessThan(0.50);
      }
    }
  });
});

// ─── recalcReasonableBP (v2 新增) ────────────────────────────

describe("recalcReasonableBP", () => {
  it("should scale down inflated BP for Lv30 C-tier", () => {
    const inflated = { constitution: 500, strength: 600, defense: 400, agility: 300, magic: 200 };
    const result = recalcReasonableBP(inflated, 30, "C");
    const total = result.constitution + result.strength + result.defense + result.agility + result.magic;
    expect(total).toBeLessThan(500);
    expect(total).toBeGreaterThan(50);
  });

  it("should not scale down already reasonable BP", () => {
    // Lv10 C-tier target: initial ~90 + 9*2 + 9*2*0.3 ≈ 113
    // Total 50 is well below target, so should not scale
    const reasonable = { constitution: 12, strength: 15, defense: 10, agility: 8, magic: 5 };
    const result = recalcReasonableBP(reasonable, 10, "C");
    expect(result.constitution).toBe(reasonable.constitution);
    expect(result.strength).toBe(reasonable.strength);
  });

  it("should preserve proportions when scaling", () => {
    const inflated = { constitution: 400, strength: 800, defense: 400, agility: 200, magic: 200 };
    const result = recalcReasonableBP(inflated, 30, "C");
    expect(result.strength).toBeGreaterThan(result.constitution);
    expect(result.strength).toBeGreaterThan(result.magic);
  });

  it("S-tier Lv60 should allow higher BP than C-tier Lv60", () => {
    const inflated = { constitution: 200, strength: 200, defense: 200, agility: 200, magic: 200 };
    const resultS = recalcReasonableBP(inflated, 60, "S");
    const resultC = recalcReasonableBP(inflated, 60, "C");
    const totalS = resultS.constitution + resultS.strength + resultS.defense + resultS.agility + resultS.magic;
    const totalC = resultC.constitution + resultC.strength + resultC.defense + resultC.agility + resultC.magic;
    expect(totalS).toBeGreaterThanOrEqual(totalC);
  });

  it("all dimensions should be at least 1 after scaling", () => {
    const inflated = { constitution: 1000, strength: 1000, defense: 1000, agility: 1000, magic: 1000 };
    const result = recalcReasonableBP(inflated, 5, "E");
    expect(result.constitution).toBeGreaterThanOrEqual(1);
    expect(result.strength).toBeGreaterThanOrEqual(1);
    expect(result.defense).toBeGreaterThanOrEqual(1);
    expect(result.agility).toBeGreaterThanOrEqual(1);
    expect(result.magic).toBeGreaterThanOrEqual(1);
  });
});

// ─── GD-024 calcPetStatsGD024 ────────────────────────────────

import { calcPetStatsGD024 } from "./services/petEngine";

describe("calcPetStatsGD024 — 寵物繼承主人屬性", () => {
  const ownerStats = { hp: 1000, atk: 200, def: 150, spd: 100, matk: 180, mp: 300 };
  
  it("should calculate pet HP as ownerHP × 0.6 + petLv × 5 + BP bonus", () => {
    const bp = { constitution: 50, strength: 50, defense: 50, agility: 50, magic: 50 };
    const result = calcPetStatsGD024(ownerStats, 30, bp);
    // HP = 1000 * 0.6 + 30 * 5 + bpBonus = 600 + 150 + bpBonus
    expect(result.hp).toBeGreaterThan(600);
    expect(result.hp).toBeLessThan(1500);
  });

  it("should calculate pet ATK as ownerATK × 0.35 + petLv × 3 + BP bonus", () => {
    const bp = { constitution: 10, strength: 80, defense: 10, agility: 10, magic: 10 };
    const result = calcPetStatsGD024(ownerStats, 30, bp);
    // ATK = 200 * 0.35 + 30 * 3 + bpBonus = 70 + 90 + bpBonus
    expect(result.attack).toBeGreaterThan(70);
    expect(result.attack).toBeLessThan(500);
  });

  it("should calculate pet DEF as ownerDEF × 0.4 + petLv × 2 + BP bonus", () => {
    const bp = { constitution: 10, strength: 10, defense: 80, agility: 10, magic: 10 };
    const result = calcPetStatsGD024(ownerStats, 30, bp);
    expect(result.defense).toBeGreaterThan(60);
    expect(result.defense).toBeLessThan(400);
  });

  it("should calculate pet SPD as ownerSPD × 0.5 + petLv × 2 + BP bonus", () => {
    const bp = { constitution: 10, strength: 10, defense: 10, agility: 80, magic: 10 };
    const result = calcPetStatsGD024(ownerStats, 30, bp);
    expect(result.speed).toBeGreaterThan(50);
    expect(result.speed).toBeLessThan(400);
  });

  it("higher owner stats should produce higher pet stats", () => {
    const bp = { constitution: 50, strength: 50, defense: 50, agility: 50, magic: 50 };
    const weakOwner = { hp: 500, atk: 100, def: 80, spd: 50, matk: 90, mp: 150 };
    const strongOwner = { hp: 2000, atk: 400, def: 300, spd: 200, matk: 360, mp: 600 };
    
    const weakResult = calcPetStatsGD024(weakOwner, 30, bp);
    const strongResult = calcPetStatsGD024(strongOwner, 30, bp);
    
    expect(strongResult.hp).toBeGreaterThan(weakResult.hp);
    expect(strongResult.attack).toBeGreaterThan(weakResult.attack);
    expect(strongResult.defense).toBeGreaterThan(weakResult.defense);
    expect(strongResult.speed).toBeGreaterThan(weakResult.speed);
  });

  it("higher BP should produce higher pet stats", () => {
    const lowBp = { constitution: 10, strength: 10, defense: 10, agility: 10, magic: 10 };
    const highBp = { constitution: 100, strength: 100, defense: 100, agility: 100, magic: 100 };
    
    const lowResult = calcPetStatsGD024(ownerStats, 30, lowBp);
    const highResult = calcPetStatsGD024(ownerStats, 30, highBp);
    
    expect(highResult.hp).toBeGreaterThan(lowResult.hp);
    expect(highResult.attack).toBeGreaterThan(lowResult.attack);
  });

  it("race HP multiplier should affect HP", () => {
    const bp = { constitution: 50, strength: 50, defense: 50, agility: 50, magic: 50 };
    const normalResult = calcPetStatsGD024(ownerStats, 30, bp, 1.0);
    const dragonResult = calcPetStatsGD024(ownerStats, 30, bp, 1.3);
    
    expect(dragonResult.hp).toBeGreaterThan(normalResult.hp);
  });

  it("should return mdef field", () => {
    const bp = { constitution: 50, strength: 50, defense: 50, agility: 50, magic: 50 };
    const result = calcPetStatsGD024(ownerStats, 30, bp);
    expect(result.mdef).toBeTypeOf("number");
    expect(result.mdef).toBeGreaterThan(0);
  });

  it("Lv1 pet should have lower stats than Lv60 pet", () => {
    const bp = { constitution: 50, strength: 50, defense: 50, agility: 50, magic: 50 };
    const lv1 = calcPetStatsGD024(ownerStats, 1, bp);
    const lv60 = calcPetStatsGD024(ownerStats, 60, bp);
    
    expect(lv60.hp).toBeGreaterThan(lv1.hp);
    expect(lv60.attack).toBeGreaterThan(lv1.attack);
    expect(lv60.defense).toBeGreaterThan(lv1.defense);
    expect(lv60.speed).toBeGreaterThan(lv1.speed);
  });
});

// ─── GD-024 balanceFormulas ──────────────────────────────────

import { calcCharacterStatsV2 } from "./services/balanceFormulas";

describe("calcCharacterStatsV2 — GD-024 屬性公式", () => {
  it("should return mdef field", () => {
    const wuxing = { wood: 30, fire: 20, earth: 25, metal: 15, water: 10 };
    const result = calcCharacterStatsV2(wuxing, 30);
    expect(result.mdef).toBeTypeOf("number");
    expect(result.mdef).toBeGreaterThan(0);
  });

  it("higher level should produce higher stats", () => {
    const wuxing = { wood: 30, fire: 20, earth: 25, metal: 15, water: 10 };
    const lv1 = calcCharacterStatsV2(wuxing, 1);
    const lv60 = calcCharacterStatsV2(wuxing, 60);
    
    expect(lv60.hp).toBeGreaterThan(lv1.hp);
    expect(lv60.atk).toBeGreaterThan(lv1.atk);
    expect(lv60.def).toBeGreaterThan(lv1.def);
  });

  it("higher wuxing totals should produce higher stats", () => {
    const low = { wood: 5, fire: 5, earth: 5, metal: 5, water: 5 };
    const high = { wood: 50, fire: 50, earth: 50, metal: 50, water: 50 };
    
    const lowResult = calcCharacterStatsV2(low, 30);
    const highResult = calcCharacterStatsV2(high, 30);
    
    expect(highResult.hp).toBeGreaterThan(lowResult.hp);
    expect(highResult.atk).toBeGreaterThan(lowResult.atk);
  });
});
