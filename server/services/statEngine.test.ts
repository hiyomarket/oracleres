/**
 * statEngine.ts 單元測試
 * GD-028 屬性公式引擎驗證
 */
import { describe, it, expect } from "vitest";
import {
  calcFullStats,
  calcCharacterStatsCompat,
  determineFateElement,
  getFateInfo,
  validatePotentialAllocation,
  calcPotentialBonus,
  DEFAULT_FATE_BONUSES,
  DEFAULT_POTENTIAL_PER_POINT,
  POTENTIAL_POINTS_PER_LEVEL,
  type WuXingValues,
  type PotentialAllocation,
  type WuXingElement,
} from "./statEngine";

// ─── 測試用五行分配 ───
const BALANCED_WUXING: WuXingValues = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
const FIRE_DOMINANT: WuXingValues = { wood: 10, fire: 40, earth: 15, metal: 15, water: 20 };
const WATER_DOMINANT: WuXingValues = { wood: 10, fire: 10, earth: 10, metal: 10, water: 60 };
const ZERO_POTENTIAL: PotentialAllocation = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 };

describe("statEngine - calcFullStats", () => {
  it("should return all stat fields", () => {
    const stats = calcFullStats(BALANCED_WUXING, 1);
    expect(stats).toHaveProperty("hp");
    expect(stats).toHaveProperty("mp");
    expect(stats).toHaveProperty("atk");
    expect(stats).toHaveProperty("def");
    expect(stats).toHaveProperty("spd");
    expect(stats).toHaveProperty("matk");
    expect(stats).toHaveProperty("mdef");
    expect(stats).toHaveProperty("spr");
    expect(stats).toHaveProperty("critRate");
    expect(stats).toHaveProperty("critDamage");
    expect(stats).toHaveProperty("healPower");
    expect(stats).toHaveProperty("hitRate");
  });

  it("should produce positive stats for level 1 balanced wuxing", () => {
    const stats = calcFullStats(BALANCED_WUXING, 1);
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.mp).toBeGreaterThan(0);
    expect(stats.atk).toBeGreaterThan(0);
    expect(stats.def).toBeGreaterThan(0);
    expect(stats.spd).toBeGreaterThan(0);
    expect(stats.matk).toBeGreaterThan(0);
    expect(stats.mdef).toBeGreaterThan(0);
    expect(stats.spr).toBeGreaterThan(0);
    expect(stats.critRate).toBeGreaterThan(0);
    expect(stats.critDamage).toBeGreaterThanOrEqual(150);
    expect(stats.healPower).toBeGreaterThan(0);
    expect(stats.hitRate).toBeGreaterThan(0);
  });

  it("should scale stats with level", () => {
    const lv1 = calcFullStats(BALANCED_WUXING, 1);
    const lv30 = calcFullStats(BALANCED_WUXING, 30);
    expect(lv30.hp).toBeGreaterThan(lv1.hp);
    expect(lv30.atk).toBeGreaterThan(lv1.atk);
    expect(lv30.def).toBeGreaterThan(lv1.def);
    expect(lv30.mp).toBeGreaterThan(lv1.mp);
  });

  it("fire dominant should have higher ATK than balanced", () => {
    const balanced = calcFullStats(BALANCED_WUXING, 10);
    const fireDom = calcFullStats(FIRE_DOMINANT, 10);
    expect(fireDom.atk).toBeGreaterThan(balanced.atk);
    expect(fireDom.matk).toBeGreaterThan(balanced.matk);
  });

  it("water dominant should have higher MP and SPR", () => {
    const balanced = calcFullStats(BALANCED_WUXING, 10);
    const waterDom = calcFullStats(WATER_DOMINANT, 10);
    expect(waterDom.mp).toBeGreaterThan(balanced.mp);
    expect(waterDom.spr).toBeGreaterThan(balanced.spr);
  });

  it("should not exceed stat caps", () => {
    // 極端五行值
    const extreme: WuXingValues = { wood: 1000, fire: 1000, earth: 1000, metal: 1000, water: 1000 };
    const stats = calcFullStats(extreme, 60);
    expect(stats.critRate).toBeLessThanOrEqual(100);
    expect(stats.critDamage).toBeLessThanOrEqual(500);
    expect(stats.hitRate).toBeLessThanOrEqual(100);
  });
});

describe("statEngine - 命格加成", () => {
  it("wood fate (青龍命) should boost HP and healPower", () => {
    const noFate = calcFullStats(BALANCED_WUXING, 10);
    const withFate = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "wood");
    expect(withFate.hp).toBeGreaterThan(noFate.hp);
    expect(withFate.healPower).toBeGreaterThan(noFate.healPower);
  });

  it("fire fate (朱雀命) should boost ATK and MATK", () => {
    const noFate = calcFullStats(BALANCED_WUXING, 10);
    const withFate = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "fire");
    expect(withFate.atk).toBeGreaterThan(noFate.atk);
    expect(withFate.matk).toBeGreaterThan(noFate.matk);
  });

  it("earth fate (麒麟命) should boost DEF and MDEF", () => {
    const noFate = calcFullStats(BALANCED_WUXING, 10);
    const withFate = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "earth");
    expect(withFate.def).toBeGreaterThan(noFate.def);
    expect(withFate.mdef).toBeGreaterThan(noFate.mdef);
  });

  it("metal fate (白虎命) should boost SPD and critRate", () => {
    const noFate = calcFullStats(BALANCED_WUXING, 10);
    const withFate = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "metal");
    expect(withFate.spd).toBeGreaterThan(noFate.spd);
    expect(withFate.critRate).toBeGreaterThan(noFate.critRate);
  });

  it("water fate (玄武命) should boost MP and SPR", () => {
    const noFate = calcFullStats(BALANCED_WUXING, 10);
    const withFate = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "water");
    expect(withFate.mp).toBeGreaterThan(noFate.mp);
    expect(withFate.spr).toBeGreaterThan(noFate.spr);
  });
});

describe("statEngine - 潛能點數", () => {
  it("potential HP allocation should increase HP", () => {
    const base = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL);
    const withPot = calcFullStats(BALANCED_WUXING, 10, { ...ZERO_POTENTIAL, hp: 10 });
    expect(withPot.hp).toBe(base.hp + 10 * DEFAULT_POTENTIAL_PER_POINT.hp);
  });

  it("potential ATK allocation should increase ATK", () => {
    const base = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL);
    const withPot = calcFullStats(BALANCED_WUXING, 10, { ...ZERO_POTENTIAL, atk: 5 });
    expect(withPot.atk).toBe(base.atk + 5 * DEFAULT_POTENTIAL_PER_POINT.atk);
  });

  it("potential + fate should stack", () => {
    const base = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL);
    const withBoth = calcFullStats(BALANCED_WUXING, 10, { ...ZERO_POTENTIAL, hp: 5 }, "wood");
    // 木命 HP +10%, 加上潛能 +5*20=100
    expect(withBoth.hp).toBeGreaterThan(base.hp + 5 * DEFAULT_POTENTIAL_PER_POINT.hp);
  });
});

describe("statEngine - validatePotentialAllocation", () => {
  it("should return null for valid allocation", () => {
    const result = validatePotentialAllocation({ hp: 3, mp: 2, atk: 0, def: 0, spd: 0, matk: 0 }, 10);
    expect(result).toBeNull();
  });

  it("should reject allocation exceeding max points", () => {
    const result = validatePotentialAllocation({ hp: 6, mp: 5, atk: 0, def: 0, spd: 0, matk: 0 }, 10);
    expect(result).not.toBeNull();
    expect(result).toContain("超過");
  });

  it("should reject negative values", () => {
    const result = validatePotentialAllocation({ hp: -1, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 }, 10);
    expect(result).not.toBeNull();
    expect(result).toContain("負數");
  });

  it("should reject non-integer values", () => {
    const result = validatePotentialAllocation({ hp: 1.5, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 }, 10);
    expect(result).not.toBeNull();
    expect(result).toContain("整數");
  });
});

describe("statEngine - calcPotentialBonus", () => {
  it("should correctly calculate bonus values", () => {
    const bonus = calcPotentialBonus({ hp: 5, mp: 3, atk: 2, def: 1, spd: 4, matk: 0 });
    expect(bonus.hp).toBe(5 * DEFAULT_POTENTIAL_PER_POINT.hp);
    expect(bonus.mp).toBe(3 * DEFAULT_POTENTIAL_PER_POINT.mp);
    expect(bonus.atk).toBe(2 * DEFAULT_POTENTIAL_PER_POINT.atk);
    expect(bonus.def).toBe(1 * DEFAULT_POTENTIAL_PER_POINT.def);
    expect(bonus.spd).toBe(4 * DEFAULT_POTENTIAL_PER_POINT.spd);
    expect(bonus.matk).toBe(0);
  });
});

describe("statEngine - determineFateElement", () => {
  it("should return the dominant element", () => {
    expect(determineFateElement(FIRE_DOMINANT)).toBe("fire");
    expect(determineFateElement(WATER_DOMINANT)).toBe("water");
  });

  it("should return one element for balanced wuxing", () => {
    const result = determineFateElement(BALANCED_WUXING);
    expect(["wood", "fire", "earth", "metal", "water"]).toContain(result);
  });
});

describe("statEngine - getFateInfo", () => {
  it("should return correct fate info for each element", () => {
    const elements: WuXingElement[] = ["wood", "fire", "earth", "metal", "water"];
    for (const el of elements) {
      const info = getFateInfo(el);
      expect(info).toBeDefined();
      expect(info.label).toBeTruthy();
      expect(info.emoji).toBeTruthy();
      expect(info.bonuses).toBeDefined();
    }
  });

  it("wood fate should be 青龍命", () => {
    expect(getFateInfo("wood").label).toBe("青龍命");
  });

  it("fire fate should be 朱雀命", () => {
    expect(getFateInfo("fire").label).toBe("朱雀命");
  });
});

describe("statEngine - calcCharacterStatsCompat", () => {
  it("should return compatible format with old API", () => {
    const stats = calcCharacterStatsCompat(BALANCED_WUXING, 10, "wood");
    expect(stats).toHaveProperty("hp");
    expect(stats).toHaveProperty("mp");
    expect(stats).toHaveProperty("atk");
    expect(stats).toHaveProperty("def");
    expect(stats).toHaveProperty("spd");
    expect(stats).toHaveProperty("matk");
    expect(stats).toHaveProperty("mdef");
    expect(stats).toHaveProperty("healPower");
    expect(stats).toHaveProperty("hitRate");
  });

  it("should produce same values as calcFullStats for shared fields", () => {
    const full = calcFullStats(BALANCED_WUXING, 10, ZERO_POTENTIAL, "fire");
    const compat = calcCharacterStatsCompat(BALANCED_WUXING, 10, "fire");
    expect(compat.hp).toBe(full.hp);
    expect(compat.atk).toBe(full.atk);
    expect(compat.matk).toBe(full.matk);
  });
});

describe("statEngine - POTENTIAL_POINTS_PER_LEVEL", () => {
  it("should be 5 points per level", () => {
    expect(POTENTIAL_POINTS_PER_LEVEL).toBe(5);
  });
});

describe("statEngine - DEFAULT_FATE_BONUSES", () => {
  it("should have entries for all 5 elements", () => {
    expect(Object.keys(DEFAULT_FATE_BONUSES)).toHaveLength(5);
    expect(DEFAULT_FATE_BONUSES.wood).toBeDefined();
    expect(DEFAULT_FATE_BONUSES.fire).toBeDefined();
    expect(DEFAULT_FATE_BONUSES.earth).toBeDefined();
    expect(DEFAULT_FATE_BONUSES.metal).toBeDefined();
    expect(DEFAULT_FATE_BONUSES.water).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// GD-028 Phase 2: 職業加成 + 戰鬥傷害公式測試
// ═══════════════════════════════════════════════════════════════

import {
  PROFESSION_DEFS,
  PROFESSION_CHANGE_COOLDOWN_MS,
  calcAgentFullStats,
  calcCombatDamage,
  calcWuxingCombatMultiplier,
  calcSpiritCoefficient,
  calcDodgeRate,
  calcBlockRate,
  determineFirstStrike,
  type Profession,
} from "./statEngine";

describe("statEngine - 職業系統 (PROFESSION_DEFS)", () => {
  it("should have 6 professions including none", () => {
    expect(Object.keys(PROFESSION_DEFS)).toHaveLength(6);
    expect(PROFESSION_DEFS.none).toBeDefined();
    expect(PROFESSION_DEFS.hunter).toBeDefined();
    expect(PROFESSION_DEFS.mage).toBeDefined();
    expect(PROFESSION_DEFS.tank).toBeDefined();
    expect(PROFESSION_DEFS.thief).toBeDefined();
    expect(PROFESSION_DEFS.wizard).toBeDefined();
  });

  it("none profession should have no bonuses", () => {
    const none = PROFESSION_DEFS.none;
    expect(Object.keys(none.bonuses)).toHaveLength(0);
    expect(none.bonuses.hp).toBeUndefined();
    expect(none.bonuses.atk).toBeUndefined();
  });

  it("tank should have highest HP and DEF bonuses", () => {
    const tank = PROFESSION_DEFS.tank;
    expect(tank.bonuses.hp).toBeGreaterThan(0);
    expect(tank.bonuses.def).toBeGreaterThan(0);
    // Tank should have higher HP bonus than hunter
    expect(tank.bonuses.hp).toBeGreaterThan(PROFESSION_DEFS.hunter.bonuses.hp ?? 0);
  });

  it("thief should have highest crit bonuses", () => {
    const thief = PROFESSION_DEFS.thief;
    expect(thief.bonuses.critRate).toBeGreaterThan(0);
    expect(thief.bonuses.critDamage).toBeGreaterThan(0);
    // Thief should have higher crit than mage
    expect(thief.bonuses.critRate!).toBeGreaterThan(PROFESSION_DEFS.mage.bonuses.critRate ?? 0);
  });

  it("mage should have highest MATK bonus", () => {
    const mage = PROFESSION_DEFS.mage;
    expect(mage.bonuses.matk).toBeGreaterThan(0);
    expect(mage.bonuses.matk!).toBeGreaterThan(PROFESSION_DEFS.hunter.bonuses.matk ?? 0);
  });

  it("cooldown should be 24 hours", () => {
    expect(PROFESSION_CHANGE_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe("statEngine - calcAgentFullStats with profession", () => {
  it("tank profession should boost HP compared to none", () => {
    const noProf = calcAgentFullStats(BALANCED_WUXING, 10, "wood", ZERO_POTENTIAL, "none");
    const tank = calcAgentFullStats(BALANCED_WUXING, 10, "wood", ZERO_POTENTIAL, "tank");
    expect(tank.hp).toBeGreaterThan(noProf.hp);
    expect(tank.def).toBeGreaterThan(noProf.def);
  });

  it("mage profession should boost MATK and MP", () => {
    const noProf = calcAgentFullStats(BALANCED_WUXING, 10, "fire", ZERO_POTENTIAL, "none");
    const mage = calcAgentFullStats(BALANCED_WUXING, 10, "fire", ZERO_POTENTIAL, "mage");
    expect(mage.matk).toBeGreaterThan(noProf.matk);
    expect(mage.mp).toBeGreaterThan(noProf.mp);
  });

  it("thief profession should boost critRate and critDamage", () => {
    const noProf = calcAgentFullStats(BALANCED_WUXING, 10, "metal", ZERO_POTENTIAL, "none");
    const thief = calcAgentFullStats(BALANCED_WUXING, 10, "metal", ZERO_POTENTIAL, "thief");
    expect(thief.critRate).toBeGreaterThan(noProf.critRate);
    expect(thief.critDamage).toBeGreaterThan(noProf.critDamage);
  });

  it("profession + fate + potential should all stack", () => {
    const base = calcAgentFullStats(BALANCED_WUXING, 10, "wood", ZERO_POTENTIAL, "none");
    const full = calcAgentFullStats(BALANCED_WUXING, 10, "wood", { hp: 5, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 }, "tank");
    // Tank HP bonus + Wood fate HP bonus + 5 potential HP points
    expect(full.hp).toBeGreaterThan(base.hp);
  });

  it("hunter should boost ATK and SPD", () => {
    const noProf = calcAgentFullStats(BALANCED_WUXING, 10, "fire", ZERO_POTENTIAL, "none");
    const hunter = calcAgentFullStats(BALANCED_WUXING, 10, "fire", ZERO_POTENTIAL, "hunter");
    expect(hunter.atk).toBeGreaterThan(noProf.atk);
    expect(hunter.spd).toBeGreaterThan(noProf.spd);
  });

  it("wizard should boost healPower and SPR", () => {
    const noProf = calcAgentFullStats(BALANCED_WUXING, 10, "water", ZERO_POTENTIAL, "none");
    const wizard = calcAgentFullStats(BALANCED_WUXING, 10, "water", ZERO_POTENTIAL, "wizard");
    expect(wizard.healPower).toBeGreaterThan(noProf.healPower);
    expect(wizard.spr).toBeGreaterThan(noProf.spr);
  });
});

describe("statEngine - 五行相剋倍率 (calcWuxingCombatMultiplier)", () => {
  it("wood overcomes earth → 1.5x", () => {
    expect(calcWuxingCombatMultiplier("wood", "earth")).toBe(1.5);
  });

  it("fire overcomes metal → 1.5x", () => {
    expect(calcWuxingCombatMultiplier("fire", "metal")).toBe(1.5);
  });

  it("earth overcomes water → 1.5x", () => {
    expect(calcWuxingCombatMultiplier("earth", "water")).toBe(1.5);
  });

  it("metal overcomes wood → 1.5x", () => {
    expect(calcWuxingCombatMultiplier("metal", "wood")).toBe(1.5);
  });

  it("water overcomes fire → 1.5x", () => {
    expect(calcWuxingCombatMultiplier("water", "fire")).toBe(1.5);
  });

  it("wood generates fire → 0.8x (disadvantage)", () => {
    expect(calcWuxingCombatMultiplier("wood", "fire")).toBe(0.8);
  });

  it("same element → 1.0x", () => {
    expect(calcWuxingCombatMultiplier("fire", "fire")).toBe(1.0);
  });

  it("neutral matchup → 1.0x", () => {
    expect(calcWuxingCombatMultiplier("wood", "water")).toBe(1.0);
  });
});

describe("statEngine - 精神比例係數 (calcSpiritCoefficient)", () => {
  it("high ratio (>119) → 1.1", () => {
    expect(calcSpiritCoefficient(120)).toBe(1.1);
    expect(calcSpiritCoefficient(200)).toBe(1.1);
  });

  it("ratio 113-119 → 1.0", () => {
    expect(calcSpiritCoefficient(113)).toBe(1.0);
    expect(calcSpiritCoefficient(119)).toBe(1.0);
  });

  it("ratio 105-112 → 0.9", () => {
    expect(calcSpiritCoefficient(105)).toBe(0.9);
    expect(calcSpiritCoefficient(112)).toBe(0.9);
  });

  it("very low ratio (<69) → 0.1", () => {
    expect(calcSpiritCoefficient(50)).toBe(0.1);
    expect(calcSpiritCoefficient(0)).toBe(0.1);
  });
});

describe("statEngine - calcCombatDamage", () => {
  const baseInput = {
    attackerAtk: 100,
    attackerMatk: 80,
    attackerCritRate: 0, // no crit for deterministic test
    attackerCritDamage: 150,
    attackerSpr: 20,
    attackerWuxing: BALANCED_WUXING,
    attackerElement: "fire" as const,
    defenderDef: 50,
    defenderMdef: 40,
    defenderSpr: 20,
    defenderElement: "metal" as const,
    defenderResistance: 0,
    skillMultiplier: 1.0,
    raceMultiplier: 1.0,
    isMagic: false,
  };

  it("should return positive damage", () => {
    const result = calcCombatDamage(baseInput);
    expect(result.damage).toBeGreaterThan(0);
  });

  it("fire vs metal should have 1.5x wuxing multiplier", () => {
    const result = calcCombatDamage(baseInput);
    expect(result.wuxingMultiplier).toBe(1.5);
  });

  it("magic attack should use MATK and MDEF", () => {
    const magicInput = { ...baseInput, isMagic: true };
    const physResult = calcCombatDamage(baseInput);
    const magicResult = calcCombatDamage(magicInput);
    // Different damage because MATK != ATK and MDEF != DEF
    expect(magicResult.damage).not.toBe(physResult.damage);
  });

  it("higher skill multiplier should increase damage", () => {
    const normalResult = calcCombatDamage(baseInput);
    const skillResult = calcCombatDamage({ ...baseInput, skillMultiplier: 2.0 });
    expect(skillResult.damage).toBeGreaterThan(normalResult.damage);
  });

  it("resistance should reduce damage", () => {
    const noResist = calcCombatDamage(baseInput);
    const withResist = calcCombatDamage({ ...baseInput, defenderResistance: 30 });
    expect(withResist.damage).toBeLessThan(noResist.damage);
  });

  it("100% crit rate should always crit", () => {
    const result = calcCombatDamage({ ...baseInput, attackerCritRate: 100 });
    expect(result.isCritical).toBe(true);
  });

  it("0% crit rate should never crit", () => {
    const result = calcCombatDamage({ ...baseInput, attackerCritRate: 0 });
    expect(result.isCritical).toBe(false);
  });

  it("damage should always be at least 1", () => {
    const result = calcCombatDamage({
      ...baseInput,
      attackerAtk: 1,
      defenderDef: 9999,
    });
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});

describe("statEngine - combat utility functions", () => {
  it("calcDodgeRate should be between 0 and 0.3", () => {
    expect(calcDodgeRate(10, 10)).toBeGreaterThan(0);
    expect(calcDodgeRate(10, 10)).toBeLessThanOrEqual(0.3);
    expect(calcDodgeRate(100, 10)).toBeLessThan(calcDodgeRate(10, 100));
  });

  it("calcBlockRate should be 0.15", () => {
    expect(calcBlockRate()).toBe(0.15);
  });

  it("determineFirstStrike should favor higher speed", () => {
    expect(determineFirstStrike(100, 50)).toBe(true);
    expect(determineFirstStrike(50, 100)).toBe(false);
    expect(determineFirstStrike(50, 50)).toBe(true); // equal speed → agent first
  });
});
