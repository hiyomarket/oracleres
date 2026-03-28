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
