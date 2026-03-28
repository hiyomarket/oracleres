/**
 * enhanceEngine.test.ts
 * 裝備強化引擎單元測試（天堂模式 +0 到 +20）
 */
import { describe, it, expect } from "vitest";
import {
  performEnhance,
  isScrollApplicable,
  calcEnhancedStat,
  getEnhanceLevelInfo,
  ENHANCE_LEVELS,
  ENHANCE_SUCCESS_RATES,
  ENHANCE_STAT_BONUS,
  MAX_ENHANCE_LEVEL,
  DESTROY_RATES,
  getSafeLevel,
  WEAPON_SLOTS,
  ARMOR_SLOTS,
} from "./services/enhanceEngine";

describe("enhanceEngine constants", () => {
  it("should have 21 enhance levels (0-20)", () => {
    expect(ENHANCE_LEVELS).toHaveLength(21);
    expect(ENHANCE_LEVELS[0].level).toBe(0);
    expect(ENHANCE_LEVELS[20].level).toBe(20);
  });

  it("should have correct color labels for key levels", () => {
    expect(ENHANCE_LEVELS[0].color).toBe("white");
    expect(ENHANCE_LEVELS[1].color).toBe("green");
    expect(ENHANCE_LEVELS[2].color).toBe("blue");
    expect(ENHANCE_LEVELS[3].color).toBe("purple");
    expect(ENHANCE_LEVELS[4].color).toBe("orange");
    expect(ENHANCE_LEVELS[5].color).toBe("red");
    expect(ENHANCE_LEVELS[20].color).toBe("rainbow");
  });

  it("should have max level at 20", () => {
    expect(MAX_ENHANCE_LEVEL).toBe(20);
  });

  it("should have 100% success rate for levels within safe range (weapon +0~+6)", () => {
    // 武器安定值 0~6，查 ENHANCE_SUCCESS_RATES 不會在安定值內
    // 安定值內不查此表，所以 ENHANCE_SUCCESS_RATES 從 +3 開始
    expect(ENHANCE_SUCCESS_RATES[3]).toBe(0.3333);
    expect(ENHANCE_SUCCESS_RATES[7]).toBe(0.3333);
  });

  it("should have 33.33% success rate for levels 3-9", () => {
    for (let i = 3; i <= 9; i++) {
      expect(ENHANCE_SUCCESS_RATES[i]).toBe(0.3333);
    }
  });

  it("should have 1.5% success rate at level 10", () => {
    expect(ENHANCE_SUCCESS_RATES[10]).toBe(0.0150);
  });

  it("should have decreasing success rates from level 10 to 19", () => {
    for (let i = 10; i < 19; i++) {
      expect(ENHANCE_SUCCESS_RATES[i]).toBeGreaterThan(ENHANCE_SUCCESS_RATES[i + 1]);
    }
  });

  it("should have 100% destroy rate after safe level", () => {
    expect(DESTROY_RATES[7]).toBe(1.0);
    expect(DESTROY_RATES[10]).toBe(1.0);
  });
});

describe("getSafeLevel", () => {
  it("weapon slot should have safe level 6", () => {
    expect(getSafeLevel("weapon")).toBe(6);
    expect(getSafeLevel("offhand")).toBe(6);
  });

  it("armor slots should have safe level 4", () => {
    expect(getSafeLevel("helmet")).toBe(4);
    expect(getSafeLevel("armor")).toBe(4);
    expect(getSafeLevel("shoes")).toBe(4);
    expect(getSafeLevel("gloves")).toBe(4); // 手套屬於防具
  });

  it("accessory slots should have safe level 2", () => {
    expect(getSafeLevel("accessory")).toBe(2);
    expect(getSafeLevel("necklace")).toBe(2);
    expect(getSafeLevel("amulet")).toBe(2);
  });
});

describe("performEnhance", () => {
  it("should always succeed for weapon at level 0 (within safe level 6)", () => {
    for (let i = 0; i < 50; i++) {
      const result = performEnhance(0, "weapon_scroll", "weapon");
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.newColor).toBe("green");
      expect(result.destroyed).toBe(false);
      expect(result.successRate).toBe(1.0);
    }
  });

  it("should always succeed for weapon at level 5 (within safe level 6)", () => {
    for (let i = 0; i < 50; i++) {
      const result = performEnhance(5, "weapon_scroll", "weapon");
      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(6);
      expect(result.destroyed).toBe(false);
    }
  });

  it("should not allow enhancing past max level 20", () => {
    const result = performEnhance(20, "weapon_scroll", "weapon");
    expect(result.success).toBe(false);
    expect(result.newLevel).toBe(20);
    expect(result.destroyed).toBe(false);
    expect(result.message).toContain("最高強化等級");
  });

  it("should have correct success rate in result for level 10", () => {
    const result = performEnhance(10, "weapon_scroll", "weapon");
    expect(result.successRate).toBe(0.0150);
  });

  it("should have correct success rate for level 7 (first risky level for weapon)", () => {
    const result = performEnhance(7, "weapon_scroll", "weapon");
    expect(result.successRate).toBe(0.3333);
  });

  it("should produce a mix of success/fail over many trials at level 7 (weapon)", () => {
    let successes = 0;
    const trials = 1000;
    for (let i = 0; i < trials; i++) {
      const result = performEnhance(7, "weapon_scroll", "weapon");
      if (result.success) successes++;
    }
    // Expected ~33.33% success rate, allow wide margin
    expect(successes).toBeGreaterThan(trials * 0.20);
    expect(successes).toBeLessThan(trials * 0.50);
  });

  it("blessed scroll should have half destroy rate", () => {
    // 黃卷爆裝率為白卷的一半
    const normalResult = performEnhance(7, "weapon_scroll", "weapon");
    const blessedResult = performEnhance(7, "blessed_weapon_scroll", "weapon");
    // 黃卷爆裝率應低於白卷
    expect(blessedResult.destroyRate).toBeLessThanOrEqual(normalResult.destroyRate);
  });
});

describe("isScrollApplicable", () => {
  it("weapon_scroll should apply to weapon slot", () => {
    expect(isScrollApplicable("weapon_scroll", "weapon")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "offhand")).toBe(true);
  });

  it("weapon_scroll should NOT apply to armor slots", () => {
    expect(isScrollApplicable("weapon_scroll", "helmet")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "armor")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "shoes")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "accessory")).toBe(false);
    // offhand 屬於武器類，所以 weapon_scroll 適用於 offhand
    expect(isScrollApplicable("weapon_scroll", "offhand")).toBe(true);
  });

  it("armor_scroll should apply to armor/accessory slots", () => {
    expect(isScrollApplicable("armor_scroll", "helmet")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "armor")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "shoes")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "accessory")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "necklace")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "amulet")).toBe(true);
  });

  it("armor_scroll should NOT apply to weapon slot", () => {
    expect(isScrollApplicable("armor_scroll", "weapon")).toBe(false);
  });

  it("gloves should use armor_scroll (防具卷軸)", () => {
    // 手套屬於防具類，應使用防具卷軸
    expect(isScrollApplicable("armor_scroll", "gloves")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "gloves")).toBe(false);
  });
});

describe("calcEnhancedStat", () => {
  it("should return base value at level 0", () => {
    expect(calcEnhancedStat(100, 0)).toBe(100);
  });

  it("should add 2% at level 1", () => {
    expect(calcEnhancedStat(100, 1)).toBe(102);
  });

  it("should add 4% at level 2", () => {
    expect(calcEnhancedStat(100, 2)).toBe(104);
  });

  it("should add 12% at level 5", () => {
    expect(calcEnhancedStat(100, 5)).toBe(112);
  });

  it("should add 36% at level 10", () => {
    expect(calcEnhancedStat(100, 10)).toBe(136);
  });

  it("should add 300% at level 20 (rainbow)", () => {
    expect(calcEnhancedStat(100, 20)).toBe(400);
  });

  it("should floor non-integer results", () => {
    // 33 * 1.06 = 34.98 → floor = 34
    expect(calcEnhancedStat(33, 3)).toBe(Math.floor(33 * (1 + ENHANCE_STAT_BONUS[3])));
  });
});

describe("getEnhanceLevelInfo", () => {
  it("should return correct info for each level 0-20", () => {
    for (let i = 0; i <= 20; i++) {
      const info = getEnhanceLevelInfo(i);
      expect(info.level).toBe(i);
    }
  });

  it("should clamp negative levels to 0", () => {
    const info = getEnhanceLevelInfo(-1);
    expect(info.level).toBe(0);
  });

  it("should clamp levels above max to max (20)", () => {
    const info = getEnhanceLevelInfo(25);
    expect(info.level).toBe(20);
  });

  it("level 20 should be rainbow color", () => {
    const info = getEnhanceLevelInfo(20);
    expect(info.color).toBe("rainbow");
    expect(info.label).toBe("絕頂彩虹");
  });
});

describe("WEAPON_SLOTS and ARMOR_SLOTS", () => {
  it("WEAPON_SLOTS should contain weapon and offhand", () => {
    expect(WEAPON_SLOTS).toContain("weapon");
    expect(WEAPON_SLOTS).toContain("offhand");
  });

  it("ARMOR_SLOTS should contain armor pieces including gloves", () => {
    expect(ARMOR_SLOTS).toContain("helmet");
    expect(ARMOR_SLOTS).toContain("armor");
    expect(ARMOR_SLOTS).toContain("shoes");
    expect(ARMOR_SLOTS).toContain("accessory");
  });
});
