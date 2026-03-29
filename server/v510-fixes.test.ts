/**
 * v5.10 Tests: 引擎調控 + 道具整理 + 強化系統
 */
import { describe, it, expect } from "vitest";
import {
  performEnhanceWithConfig,
  isScrollApplicable,
  isBlessedScroll,
  getSafeLevel,
  getEnhanceLevelInfo,
  getEnhancedBonusPreview,
  ENHANCE_LEVELS,
  ENHANCE_SUCCESS_RATES,
  DESTROY_RATES,
  ENHANCE_STAT_BONUS,
  MAX_ENHANCE_LEVEL,
  type ScrollType,
  type EnhanceConfig,
} from "./services/enhanceEngine";

// ─── 強化引擎測試 ─────────────────────────────────────

describe("Enhance Engine - Scroll Applicability", () => {
  it("weapon_scroll should apply to weapon and offhand", () => {
    expect(isScrollApplicable("weapon_scroll", "weapon")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "offhand")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "helmet")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "armor")).toBe(false);
    expect(isScrollApplicable("weapon_scroll", "accessory")).toBe(false);
  });

  it("armor_scroll should apply to non-weapon slots", () => {
    expect(isScrollApplicable("armor_scroll", "helmet")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "armor")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "shoes")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "accessory")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "weapon")).toBe(false);
  });

  it("blessed scrolls follow same slot rules", () => {
    expect(isScrollApplicable("blessed_weapon_scroll", "weapon")).toBe(true);
    expect(isScrollApplicable("blessed_weapon_scroll", "armor")).toBe(false);
    expect(isScrollApplicable("blessed_armor_scroll", "armor")).toBe(true);
    expect(isScrollApplicable("blessed_armor_scroll", "weapon")).toBe(false);
  });
});

describe("Enhance Engine - Blessed Scroll Detection", () => {
  it("should correctly identify blessed scrolls", () => {
    expect(isBlessedScroll("blessed_weapon_scroll")).toBe(true);
    expect(isBlessedScroll("blessed_armor_scroll")).toBe(true);
    expect(isBlessedScroll("weapon_scroll")).toBe(false);
    expect(isBlessedScroll("armor_scroll")).toBe(false);
  });
});

describe("Enhance Engine - Safe Level", () => {
  it("weapon safe level should be 6", () => {
    expect(getSafeLevel("weapon")).toBe(6);
    expect(getSafeLevel("offhand")).toBe(6);
  });

  it("armor safe level should be 4", () => {
    expect(getSafeLevel("helmet")).toBe(4);
    expect(getSafeLevel("armor")).toBe(4);
    expect(getSafeLevel("shoes")).toBe(4);
  });

  it("accessory safe level should be 2", () => {
    expect(getSafeLevel("accessory")).toBe(2);
  });
});

describe("Enhance Engine - Level Info", () => {
  it("should return correct color info for each level", () => {
    const lv0 = getEnhanceLevelInfo(0);
    expect(lv0.color).toBe("white");
    expect(lv0.label).toBeTruthy();

    const lv6 = getEnhanceLevelInfo(6);
    expect(lv6.color).toBe("gold");

    const lv20 = getEnhanceLevelInfo(20);
    expect(lv20.color).toBe("rainbow");
  });

  it("should have 21 enhance levels (0-20)", () => {
    expect(ENHANCE_LEVELS.length).toBe(21);
    expect(ENHANCE_LEVELS[0].level).toBe(0);
    expect(ENHANCE_LEVELS[20].level).toBe(20);
  });
});

describe("Enhance Engine - Bonus Preview", () => {
  it("should calculate enhanced stats correctly", () => {
    const catalog = {
      hpBonus: 100,
      attackBonus: 50,
      defenseBonus: 30,
      speedBonus: 10,
      resistBonus: { wood: 5, fire: 5, earth: 5, metal: 5, water: 5 },
    };

    const preview0 = getEnhancedBonusPreview(catalog, 0);
    expect(preview0.attackBonus).toBe(50); // +0 = no bonus
    expect(preview0.bonusPercent).toBe(0);

    const preview1 = getEnhancedBonusPreview(catalog, 1);
    expect(preview1.attackBonus).toBeGreaterThanOrEqual(50); // +1 should have some bonus
    expect(preview1.bonusPercent).toBeGreaterThan(0);

    const preview10 = getEnhancedBonusPreview(catalog, 10);
    expect(preview10.attackBonus).toBeGreaterThan(preview1.attackBonus);
    expect(preview10.bonusPercent).toBeGreaterThan(preview1.bonusPercent);
  });

  it("should scale resist bonus with enhance level", () => {
    const catalog = {
      hpBonus: 0,
      attackBonus: 0,
      defenseBonus: 0,
      speedBonus: 0,
      resistBonus: { wood: 10, fire: 10, earth: 10, metal: 10, water: 10 },
    };

    const preview5 = getEnhancedBonusPreview(catalog, 5);
    expect(preview5.resistBonus.wood).toBeGreaterThanOrEqual(10);
    expect(preview5.resistBonus.fire).toBeGreaterThanOrEqual(10);
  });
});

describe("Enhance Engine - Perform Enhance", () => {
  const defaultConfig: EnhanceConfig = {
    maxLevel: MAX_ENHANCE_LEVEL,
    successRates: ENHANCE_SUCCESS_RATES,
    destroyRates: DESTROY_RATES,
    statBonus: ENHANCE_STAT_BONUS,
  };

  it("should always succeed within safe level for weapon (+0 to +5)", () => {
    for (let level = 0; level < 6; level++) {
      const result = performEnhanceWithConfig(level, "weapon_scroll", "weapon", defaultConfig);
      expect(result.success).toBe(true);
      expect(result.destroyed).toBe(false);
      expect(result.newLevel).toBe(level + 1);
    }
  });

  it("should always succeed within safe level for armor (+0 to +3)", () => {
    for (let level = 0; level < 4; level++) {
      const result = performEnhanceWithConfig(level, "armor_scroll", "armor", defaultConfig);
      expect(result.success).toBe(true);
      expect(result.destroyed).toBe(false);
      expect(result.newLevel).toBe(level + 1);
    }
  });

  it("blessed scroll should give +1 to +3 on success", () => {
    // Test within safe level where success is guaranteed
    const result = performEnhanceWithConfig(0, "blessed_weapon_scroll", "weapon", defaultConfig);
    expect(result.success).toBe(true);
    expect(result.newLevel).toBeGreaterThanOrEqual(1);
    expect(result.newLevel).toBeLessThanOrEqual(3);
    expect(result.bonusLevels).toBeGreaterThanOrEqual(1);
    expect(result.bonusLevels).toBeLessThanOrEqual(3);
  });

  it("should not exceed max level", () => {
    // Even with blessed scroll, should cap at maxLevel
    const result = performEnhanceWithConfig(19, "blessed_weapon_scroll", "weapon", defaultConfig);
    if (result.success) {
      expect(result.newLevel).toBeLessThanOrEqual(20);
    }
  });
});

describe("Enhance Engine - Config Consistency", () => {
  it("success rates should have entries for levels beyond safe level", () => {
    // Rates only exist for levels beyond safe level (3+ for accessory, 5+ for armor, 7+ for weapon)
    for (let i = 3; i < 20; i++) {
      expect(ENHANCE_SUCCESS_RATES[i]).toBeDefined();
      expect(ENHANCE_SUCCESS_RATES[i]).toBeGreaterThanOrEqual(0);
      expect(ENHANCE_SUCCESS_RATES[i]).toBeLessThanOrEqual(1);
    }
    // Levels 0-2 should be undefined (within all safe levels)
    expect(ENHANCE_SUCCESS_RATES[0]).toBeUndefined();
    expect(ENHANCE_SUCCESS_RATES[1]).toBeUndefined();
    expect(ENHANCE_SUCCESS_RATES[2]).toBeUndefined();
  });

  it("destroy rates should have entries for levels beyond safe level", () => {
    // Destroy rates only exist for levels beyond safe level
    for (let i = 3; i < 20; i++) {
      expect(DESTROY_RATES[i]).toBeDefined();
      expect(DESTROY_RATES[i]).toBeGreaterThanOrEqual(0);
      expect(DESTROY_RATES[i]).toBeLessThanOrEqual(1);
    }
    // Levels 0-2 should be undefined (within all safe levels)
    expect(DESTROY_RATES[0]).toBeUndefined();
    expect(DESTROY_RATES[1]).toBeUndefined();
    expect(DESTROY_RATES[2]).toBeUndefined();
  });

  it("stat bonus should increase with level", () => {
    for (let i = 1; i <= 20; i++) {
      expect(ENHANCE_STAT_BONUS[i]).toBeGreaterThanOrEqual(ENHANCE_STAT_BONUS[i - 1]);
    }
  });

  it("MAX_ENHANCE_LEVEL should be 20", () => {
    expect(MAX_ENHANCE_LEVEL).toBe(20);
  });
});
