/**
 * enhanceEngine.test.ts
 * 裝備強化引擎單元測試
 */
import { describe, it, expect } from "vitest";
import {
  performEnhance,
  isScrollApplicable,
  calcEnhancedStat,
  getEnhanceLevelInfo,
  ENHANCE_LEVELS,
  ENHANCE_RATES,
  SAFE_LEVEL,
  MAX_ENHANCE_LEVEL,
  DESTROY_CHANCE,
  ENHANCE_STAT_BONUS,
} from "./services/enhanceEngine";

describe("enhanceEngine constants", () => {
  it("should have 6 enhance levels (0-5)", () => {
    expect(ENHANCE_LEVELS).toHaveLength(6);
    expect(ENHANCE_LEVELS[0].level).toBe(0);
    expect(ENHANCE_LEVELS[5].level).toBe(5);
  });

  it("should have correct color labels", () => {
    expect(ENHANCE_LEVELS[0].color).toBe("white");
    expect(ENHANCE_LEVELS[1].color).toBe("green");
    expect(ENHANCE_LEVELS[2].color).toBe("blue");
    expect(ENHANCE_LEVELS[3].color).toBe("purple");
    expect(ENHANCE_LEVELS[4].color).toBe("orange");
    expect(ENHANCE_LEVELS[5].color).toBe("red");
  });

  it("should have safe level at 2", () => {
    expect(SAFE_LEVEL).toBe(2);
  });

  it("should have max level at 5", () => {
    expect(MAX_ENHANCE_LEVEL).toBe(5);
  });

  it("should have 1% destroy chance", () => {
    expect(DESTROY_CHANCE).toBe(0.01);
  });

  it("should have 100% success rate for levels below safe level", () => {
    expect(ENHANCE_RATES[0]).toBe(1.00);
    expect(ENHANCE_RATES[1]).toBe(1.00);
  });

  it("should have decreasing success rates above safe level", () => {
    expect(ENHANCE_RATES[2]).toBe(0.70);
    expect(ENHANCE_RATES[3]).toBe(0.50);
    expect(ENHANCE_RATES[4]).toBe(0.30);
  });
});

describe("performEnhance", () => {
  it("should always succeed for level 0 (below safe level)", () => {
    for (let i = 0; i < 100; i++) {
      const result = performEnhance(0);
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.newColor).toBe("green");
      expect(result.destroyed).toBe(false);
    }
  });

  it("should always succeed for level 1 (below safe level)", () => {
    for (let i = 0; i < 100; i++) {
      const result = performEnhance(1);
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.newColor).toBe("blue");
      expect(result.destroyed).toBe(false);
    }
  });

  it("should not allow enhancing past max level", () => {
    const result = performEnhance(5);
    expect(result.success).toBe(false);
    expect(result.newLevel).toBe(5);
    expect(result.destroyed).toBe(false);
    expect(result.message).toContain("最高強化等級");
  });

  it("should return valid results for level 2+ (above safe level)", () => {
    const result = performEnhance(2);
    // Either success (+3) or fail (downgrade to +1 or destroyed)
    if (result.success) {
      expect(result.newLevel).toBe(3);
      expect(result.newColor).toBe("purple");
      expect(result.destroyed).toBe(false);
    } else if (result.destroyed) {
      expect(result.newLevel).toBe(-1);
    } else {
      expect(result.newLevel).toBe(1);
      expect(result.newColor).toBe("green");
    }
  });

  it("should have correct success rate in result", () => {
    const result = performEnhance(3);
    expect(result.successRate).toBe(0.50);
  });

  it("should produce a mix of success/fail over many trials at level 2", () => {
    let successes = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = performEnhance(2);
      if (result.success) successes++;
    }
    // Expected ~70% success rate, allow wide margin
    expect(successes).toBeGreaterThan(trials * 0.5);
    expect(successes).toBeLessThan(trials * 0.9);
  });
});

describe("isScrollApplicable", () => {
  it("weapon_scroll should apply to weapon slot", () => {
    expect(isScrollApplicable("weapon_scroll", "weapon")).toBe(true);
  });

  it("weapon_scroll should NOT apply to armor slots", () => {
    expect(isScrollApplicable("weapon_scroll", "helmet")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "armor")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "shoes")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "accessory")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "offhand")).toBe(false);
  });

  it("armor_scroll should apply to armor/accessory slots", () => {
    expect(isScrollApplicable("armor_scroll", "helmet")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "armor")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "shoes")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "accessory")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "offhand")).toBe(true);
  });

  it("armor_scroll should NOT apply to weapon slot", () => {
    expect(isScrollApplicable("armor_scroll", "weapon")).toBe(false);
  });
});

describe("calcEnhancedStat", () => {
  it("should return base value at level 0", () => {
    expect(calcEnhancedStat(100, 0)).toBe(100);
  });

  it("should add 5% at level 1", () => {
    expect(calcEnhancedStat(100, 1)).toBe(105);
  });

  it("should add 10% at level 2", () => {
    expect(calcEnhancedStat(100, 2)).toBe(110);
  });

  it("should add 18% at level 3", () => {
    expect(calcEnhancedStat(100, 3)).toBe(118);
  });

  it("should add 28% at level 4", () => {
    expect(calcEnhancedStat(100, 4)).toBe(128);
  });

  it("should add 40% at level 5", () => {
    expect(calcEnhancedStat(100, 5)).toBe(140);
  });

  it("should floor non-integer results", () => {
    expect(calcEnhancedStat(33, 3)).toBe(Math.floor(33 * 1.18)); // 38
  });
});

describe("getEnhanceLevelInfo", () => {
  it("should return correct info for each level", () => {
    for (let i = 0; i <= 5; i++) {
      const info = getEnhanceLevelInfo(i);
      expect(info.level).toBe(i);
    }
  });

  it("should clamp negative levels to 0", () => {
    const info = getEnhanceLevelInfo(-1);
    expect(info.level).toBe(0);
  });

  it("should clamp levels above max to max", () => {
    const info = getEnhanceLevelInfo(10);
    expect(info.level).toBe(5);
  });
});
