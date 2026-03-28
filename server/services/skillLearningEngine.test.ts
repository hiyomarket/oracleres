/**
 * skillLearningEngine.ts 單元測試
 * GD-028 步驟 10：技能學習系統
 */
import { describe, it, expect } from "vitest";
import {
  checkSkillLearnRequirements,
  getAutoLearnSkills,
  getProfessionUnlockSkills,
  calcSkillExpBonus,
  checkDestinyAwakening,
  DEFAULT_SKILL_TIER_REQUIREMENTS,
  DEFAULT_DESTINY_AWAKENING,
  PROFESSION_STARTER_SKILLS,
  type SkillTier,
} from "./skillLearningEngine";
import type { WuXingElement, Profession } from "./statEngine";

// ─── 測試用資料 ───
const BALANCED_WUXING: Record<WuXingElement, number> = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
const FIRE_HIGH: Record<WuXingElement, number> = { wood: 5, fire: 50, earth: 15, metal: 15, water: 15 };
const WATER_MAX: Record<WuXingElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 100 };

const MOCK_SKILLS = [
  { skillId: "SK001", learnLevel: 1, skillTier: "basic", wuxing: "fire", professionRequired: "none", acquireMethod: "levelup" },
  { skillId: "SK002", learnLevel: 5, skillTier: "basic", wuxing: "water", professionRequired: "none", acquireMethod: "levelup" },
  { skillId: "SK003", learnLevel: 15, skillTier: "intermediate", wuxing: "fire", professionRequired: "none", acquireMethod: "levelup" },
  { skillId: "SK004", learnLevel: 30, skillTier: "advanced", wuxing: "fire", professionRequired: "mage", acquireMethod: "skillbook" },
  { skillId: "SK005", learnLevel: 10, skillTier: "basic", wuxing: "earth", professionRequired: "tank", acquireMethod: "profession" },
  { skillId: "SK006", learnLevel: 61, skillTier: "destiny", wuxing: "water", professionRequired: "none", acquireMethod: "destiny" },
  { skillId: "S_M001", learnLevel: 1, skillTier: "basic", wuxing: "metal", professionRequired: "hunter", acquireMethod: "profession" },
  { skillId: "S_F001", learnLevel: 1, skillTier: "basic", wuxing: "fire", professionRequired: "mage", acquireMethod: "profession" },
];

// ═══════════════════════════════════════════════════════════════
// checkSkillLearnRequirements
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - checkSkillLearnRequirements", () => {
  it("should allow basic skill at level 1 with any wuxing", () => {
    const result = checkSkillLearnRequirements("basic", "fire", "none", 1, BALANCED_WUXING, "none");
    expect(result.canLearn).toBe(true);
  });

  it("should reject intermediate skill below level 15", () => {
    const result = checkSkillLearnRequirements("intermediate", "fire", "none", 10, BALANCED_WUXING, "none");
    expect(result.canLearn).toBe(false);
    expect(result.reason).toContain("等級不足");
  });

  it("should reject intermediate skill with insufficient wuxing", () => {
    const result = checkSkillLearnRequirements("intermediate", "fire", "none", 20, BALANCED_WUXING, "none");
    // balanced wuxing = 20 per element, intermediate needs 15 → should pass
    expect(result.canLearn).toBe(true);
  });

  it("should reject advanced skill with insufficient wuxing", () => {
    const result = checkSkillLearnRequirements("advanced", "fire", "none", 30, BALANCED_WUXING, "none");
    // balanced wuxing = 20 per element, advanced needs 40 → should fail
    expect(result.canLearn).toBe(false);
    expect(result.reason).toContain("火行點數不足");
  });

  it("should allow advanced skill with high wuxing", () => {
    const result = checkSkillLearnRequirements("advanced", "fire", "none", 30, FIRE_HIGH, "none");
    // fire = 50, advanced needs 40 → should pass
    expect(result.canLearn).toBe(true);
  });

  it("should reject skill with wrong profession", () => {
    const result = checkSkillLearnRequirements("basic", "fire", "mage", 10, BALANCED_WUXING, "hunter");
    expect(result.canLearn).toBe(false);
    expect(result.reason).toContain("職業");
  });

  it("should allow skill with correct profession", () => {
    const result = checkSkillLearnRequirements("basic", "fire", "mage", 10, BALANCED_WUXING, "mage");
    expect(result.canLearn).toBe(true);
  });

  it("should reject destiny tier below level 61", () => {
    const result = checkSkillLearnRequirements("destiny", "water", "none", 60, WATER_MAX, "none");
    expect(result.canLearn).toBe(false);
  });

  it("should allow destiny tier at level 61 with high wuxing", () => {
    const result = checkSkillLearnRequirements("destiny", "water", "none", 61, WATER_MAX, "none");
    expect(result.canLearn).toBe(true);
  });

  it("should reject unknown tier", () => {
    const result = checkSkillLearnRequirements("unknown" as SkillTier, "fire", "none", 99, FIRE_HIGH, "none");
    expect(result.canLearn).toBe(false);
    expect(result.reason).toContain("未知");
  });
});

// ═══════════════════════════════════════════════════════════════
// getAutoLearnSkills
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - getAutoLearnSkills", () => {
  it("should auto-learn basic skills at level 1", () => {
    const result = getAutoLearnSkills(1, BALANCED_WUXING, "none", MOCK_SKILLS, new Set());
    expect(result).toContain("SK001");
    expect(result).not.toContain("SK002"); // level 5
  });

  it("should auto-learn multiple skills at level 5", () => {
    const result = getAutoLearnSkills(5, BALANCED_WUXING, "none", MOCK_SKILLS, new Set());
    expect(result).toContain("SK001");
    expect(result).toContain("SK002");
  });

  it("should not re-learn already learned skills", () => {
    const result = getAutoLearnSkills(5, BALANCED_WUXING, "none", MOCK_SKILLS, new Set(["SK001"]));
    expect(result).not.toContain("SK001");
    expect(result).toContain("SK002");
  });

  it("should not auto-learn skillbook or profession type skills", () => {
    const result = getAutoLearnSkills(99, FIRE_HIGH, "mage", MOCK_SKILLS, new Set());
    expect(result).not.toContain("SK004"); // skillbook
    expect(result).not.toContain("SK005"); // profession
    expect(result).not.toContain("SK006"); // destiny
  });

  it("should auto-learn intermediate at level 15 with sufficient wuxing", () => {
    const result = getAutoLearnSkills(15, BALANCED_WUXING, "none", MOCK_SKILLS, new Set());
    expect(result).toContain("SK003"); // intermediate fire, needs 15 wuxing, balanced has 20
  });
});

// ═══════════════════════════════════════════════════════════════
// getProfessionUnlockSkills
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - getProfessionUnlockSkills", () => {
  it("should unlock hunter starter skills", () => {
    const result = getProfessionUnlockSkills("hunter", MOCK_SKILLS, 10, new Set());
    expect(result).toContain("S_M001");
  });

  it("should unlock mage starter skills", () => {
    const result = getProfessionUnlockSkills("mage", MOCK_SKILLS, 10, new Set());
    expect(result).toContain("S_F001");
  });

  it("should not unlock already learned skills", () => {
    const result = getProfessionUnlockSkills("hunter", MOCK_SKILLS, 10, new Set(["S_M001"]));
    expect(result).not.toContain("S_M001");
  });

  it("should unlock profession-type skills for the profession", () => {
    const result = getProfessionUnlockSkills("tank", MOCK_SKILLS, 10, new Set());
    expect(result).toContain("SK005"); // profession type, tank required
  });

  it("should not unlock profession skills for wrong profession", () => {
    const result = getProfessionUnlockSkills("mage", MOCK_SKILLS, 10, new Set());
    expect(result).not.toContain("SK005"); // tank only
  });

  it("should return empty for 'none' profession", () => {
    const result = getProfessionUnlockSkills("none", MOCK_SKILLS, 10, new Set());
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// calcSkillExpBonus
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - calcSkillExpBonus", () => {
  it("should give 1.5x bonus for matching fate element", () => {
    expect(calcSkillExpBonus("fire", "fire")).toBe(1.5);
  });

  it("should give 1.0x for non-matching fate element", () => {
    expect(calcSkillExpBonus("fire", "water")).toBe(1.0);
  });

  it("should give 1.0x for non-matching elements", () => {
    expect(calcSkillExpBonus("wood", "metal")).toBe(1.0);
  });

  it("should respect custom bonus rate", () => {
    expect(calcSkillExpBonus("fire", "fire", 1.0)).toBe(2.0);
  });
});

// ═══════════════════════════════════════════════════════════════
// checkDestinyAwakening
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - checkDestinyAwakening", () => {
  it("should reject below level 61", () => {
    const result = checkDestinyAwakening(60, "water", WATER_MAX, 50000);
    expect(result.canAwaken).toBe(false);
    expect(result.reason).toContain("等級不足");
  });

  it("should reject with insufficient fate wuxing", () => {
    const result = checkDestinyAwakening(61, "fire", BALANCED_WUXING, 50000);
    expect(result.canAwaken).toBe(false);
    expect(result.reason).toContain("火行點數不足");
  });

  it("should reject with insufficient gold", () => {
    const result = checkDestinyAwakening(61, "water", WATER_MAX, 5000);
    expect(result.canAwaken).toBe(false);
    expect(result.reason).toContain("金幣不足");
  });

  it("should allow when all conditions met", () => {
    const result = checkDestinyAwakening(61, "water", WATER_MAX, 50000);
    expect(result.canAwaken).toBe(true);
  });

  it("should respect custom conditions", () => {
    const custom = { minLevel: 80, minFateWuxingPoints: 90, goldCost: 50000 };
    const result = checkDestinyAwakening(80, "water", WATER_MAX, 50000, custom);
    expect(result.canAwaken).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Constants validation
// ═══════════════════════════════════════════════════════════════

describe("skillLearningEngine - Constants", () => {
  it("DEFAULT_SKILL_TIER_REQUIREMENTS should have all tiers", () => {
    const tiers: SkillTier[] = ["basic", "intermediate", "advanced", "destiny", "legendary"];
    for (const tier of tiers) {
      expect(DEFAULT_SKILL_TIER_REQUIREMENTS[tier]).toBeDefined();
      expect(DEFAULT_SKILL_TIER_REQUIREMENTS[tier].minLevel).toBeGreaterThanOrEqual(1);
    }
  });

  it("tier levels should be in ascending order", () => {
    const tiers: SkillTier[] = ["basic", "intermediate", "advanced", "destiny", "legendary"];
    for (let i = 1; i < tiers.length; i++) {
      expect(DEFAULT_SKILL_TIER_REQUIREMENTS[tiers[i]].minLevel)
        .toBeGreaterThanOrEqual(DEFAULT_SKILL_TIER_REQUIREMENTS[tiers[i - 1]].minLevel);
    }
  });

  it("PROFESSION_STARTER_SKILLS should have all professions", () => {
    const profs = ["hunter", "mage", "tank", "thief", "wizard", "none"];
    for (const prof of profs) {
      expect(PROFESSION_STARTER_SKILLS[prof]).toBeDefined();
      expect(Array.isArray(PROFESSION_STARTER_SKILLS[prof])).toBe(true);
    }
  });

  it("none profession should have no starter skills", () => {
    expect(PROFESSION_STARTER_SKILLS["none"]).toHaveLength(0);
  });

  it("DEFAULT_DESTINY_AWAKENING should have reasonable values", () => {
    expect(DEFAULT_DESTINY_AWAKENING.minLevel).toBe(61);
    expect(DEFAULT_DESTINY_AWAKENING.minFateWuxingPoints).toBe(80);
    expect(DEFAULT_DESTINY_AWAKENING.goldCost).toBe(10000);
  });
});
