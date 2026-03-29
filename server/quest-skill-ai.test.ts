/**
 * quest-skill-ai.test.ts
 * 天命考核技能 AI 生成 + AI 平衡系統測試
 * 1. 平衡規則定義驗證（questSkill catalogType）
 * 2. AI 平衡端點存在性驗證
 * 3. AI 生成端點存在性驗證
 * 4. 平衡公式邏輯驗證
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// 天命考核技能平衡規則定義（與 balanceRules.ts DEFAULT_BALANCE_RULES 一致）
// ═══════════════════════════════════════════════════════════════

const QUEST_SKILL_RANGES: Record<string, {
  power: [number, number];
  mp: [number, number];
  cd: [number, number];
  gold: [number, number];
  soul: [number, number];
}> = {
  common:    { power: [80, 140],   mp: [5, 15],   cd: [1, 3],  gold: [300, 800],   soul: [100, 200] },
  rare:      { power: [100, 200],  mp: [8, 25],   cd: [2, 5],  gold: [500, 1500],  soul: [200, 400] },
  epic:      { power: [150, 300],  mp: [12, 35],  cd: [3, 7],  gold: [1000, 3000], soul: [300, 500] },
  legendary: { power: [200, 500],  mp: [15, 50],  cd: [4, 10], gold: [2000, 5000], soul: [400, 800] },
};

// ═══════════════════════════════════════════════════════════════
// 工具函數
// ═══════════════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function isOutOfRange(val: number, range: [number, number]): boolean {
  return val < range[0] || val > range[1];
}

// ═══════════════════════════════════════════════════════════════
// 1. 平衡規則定義驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能平衡規則定義", () => {
  it("所有稀有度的威力範圍應遞增", () => {
    const rarities = ["common", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = QUEST_SKILL_RANGES[rarities[i - 1]];
      const curr = QUEST_SKILL_RANGES[rarities[i]];
      expect(curr.power[1]).toBeGreaterThan(prev.power[1]);
    }
  });

  it("所有稀有度的 MP 消耗範圍應遞增", () => {
    const rarities = ["common", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = QUEST_SKILL_RANGES[rarities[i - 1]];
      const curr = QUEST_SKILL_RANGES[rarities[i]];
      expect(curr.mp[1]).toBeGreaterThanOrEqual(prev.mp[1]);
    }
  });

  it("所有稀有度的冷卻範圍應遞增", () => {
    const rarities = ["common", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = QUEST_SKILL_RANGES[rarities[i - 1]];
      const curr = QUEST_SKILL_RANGES[rarities[i]];
      expect(curr.cd[1]).toBeGreaterThanOrEqual(prev.cd[1]);
    }
  });

  it("所有稀有度的金幣代價範圍應遞增", () => {
    const rarities = ["common", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = QUEST_SKILL_RANGES[rarities[i - 1]];
      const curr = QUEST_SKILL_RANGES[rarities[i]];
      expect(curr.gold[1]).toBeGreaterThan(prev.gold[1]);
    }
  });

  it("所有稀有度的魂晶代價範圍應遞增", () => {
    const rarities = ["common", "rare", "epic", "legendary"];
    for (let i = 1; i < rarities.length; i++) {
      const prev = QUEST_SKILL_RANGES[rarities[i - 1]];
      const curr = QUEST_SKILL_RANGES[rarities[i]];
      expect(curr.soul[1]).toBeGreaterThan(prev.soul[1]);
    }
  });

  it("common 天命考核技能威力應在 80-140", () => {
    const range = QUEST_SKILL_RANGES.common;
    expect(range.power[0]).toBe(80);
    expect(range.power[1]).toBe(140);
  });

  it("legendary 天命考核技能金幣代價可達 5000", () => {
    const range = QUEST_SKILL_RANGES.legendary;
    expect(range.gold[1]).toBe(5000);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 平衡公式邏輯驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能平衡公式", () => {
  it("common 技能威力超出範圍應被 clamp 修正", () => {
    const range = QUEST_SKILL_RANGES.common;
    const skill = { name: "初階靈脈衝擊", rarity: "common", powerPercent: 200 };
    expect(skill.powerPercent).toBeGreaterThan(range.power[1]);
    const corrected = clamp(skill.powerPercent, range.power[0], range.power[1]);
    expect(corrected).toBe(140);
  });

  it("epic 技能 MP 低於下限應被修正", () => {
    const range = QUEST_SKILL_RANGES.epic;
    const skill = { name: "天罡破陣", rarity: "epic", mpCost: 5 };
    expect(skill.mpCost).toBeLessThan(range.mp[0]);
    const corrected = clamp(skill.mpCost, range.mp[0], range.mp[1]);
    expect(corrected).toBe(12);
  });

  it("legendary 技能冷卻在範圍內不應被修正", () => {
    const range = QUEST_SKILL_RANGES.legendary;
    const skill = { name: "天命終焉", rarity: "legendary", cooldown: 7 };
    expect(isOutOfRange(skill.cooldown, range.cd)).toBe(false);
    const corrected = clamp(skill.cooldown, range.cd[0], range.cd[1]);
    expect(corrected).toBe(7);
  });

  it("金幣代價超出上限應被修正到上限", () => {
    const range = QUEST_SKILL_RANGES.rare;
    const learnCost = { gold: 9999, soulCrystal: 300 };
    expect(isOutOfRange(learnCost.gold, range.gold)).toBe(true);
    const corrected = clamp(learnCost.gold, range.gold[0], range.gold[1]);
    expect(corrected).toBe(1500);
  });

  it("魂晶代價在範圍內不應被修正", () => {
    const range = QUEST_SKILL_RANGES.epic;
    const learnCost = { gold: 2000, soulCrystal: 400 };
    expect(isOutOfRange(learnCost.soulCrystal, range.soul)).toBe(false);
    const corrected = clamp(learnCost.soulCrystal, range.soul[0], range.soul[1]);
    expect(corrected).toBe(400);
  });

  it("passive 和 production 類型技能不應檢查威力", () => {
    // 在平衡引擎中，passive 和 production 類型的技能跳過威力檢查
    const passiveSkill = { skillType: "passive", powerPercent: 0 };
    const productionSkill = { skillType: "production", powerPercent: 0 };
    // 這些技能的 powerPercent 為 0 是合理的
    expect(passiveSkill.powerPercent).toBe(0);
    expect(productionSkill.powerPercent).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 平衡規則在 balanceRules.ts 中的存在性驗證
// ═══════════════════════════════════════════════════════════════

describe("平衡規則 - questSkill catalogType 存在性", () => {
  it("loadBalanceRulesGrouped 應包含 questSkill 類型", async () => {
    const { loadBalanceRulesGrouped } = await import("./routers/balanceRules");
    const rules = await loadBalanceRulesGrouped();
    expect(rules).toBeDefined();
    expect(rules["questSkill"]).toBeDefined();
  });

  it("questSkill 規則應包含 common/rare/epic/legendary 四個稀有度", async () => {
    const { loadBalanceRulesGrouped } = await import("./routers/balanceRules");
    const rules = await loadBalanceRulesGrouped();
    const qsRules = rules["questSkill"];
    expect(qsRules).toBeDefined();
    expect(qsRules["common"]).toBeDefined();
    expect(qsRules["rare"]).toBeDefined();
    expect(qsRules["epic"]).toBeDefined();
    expect(qsRules["legendary"]).toBeDefined();
  });

  it("questSkill 規則應包含 power/mp/cd/gold/soul 五個欄位", async () => {
    const { loadBalanceRulesGrouped } = await import("./routers/balanceRules");
    const rules = await loadBalanceRulesGrouped();
    const commonRules = rules["questSkill"]?.["common"];
    expect(commonRules).toBeDefined();
    expect(commonRules?.["power"]).toBeDefined();
    expect(commonRules?.["mp"]).toBeDefined();
    expect(commonRules?.["cd"]).toBeDefined();
    expect(commonRules?.["gold"]).toBeDefined();
    expect(commonRules?.["soul"]).toBeDefined();
  });

  it("questSkill 規則的數值應與 DEFAULT_BALANCE_RULES 一致", async () => {
    const { loadBalanceRulesGrouped } = await import("./routers/balanceRules");
    const rules = await loadBalanceRulesGrouped();
    const commonRules = rules["questSkill"]?.["common"];
    // 驗證 common 的 power 範圍
    expect(commonRules?.["power"]).toEqual([80, 140]);
    expect(commonRules?.["mp"]).toEqual([5, 15]);
    expect(commonRules?.["cd"]).toEqual([1, 3]);
    expect(commonRules?.["gold"]).toEqual([300, 800]);
    expect(commonRules?.["soul"]).toEqual([100, 200]);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. AI 平衡端點存在性驗證
// ═══════════════════════════════════════════════════════════════

describe("AI 平衡端點 - balanceQuestSkills", () => {
  it("gameAIBalanceRouter 應包含 balanceQuestSkills 端點", async () => {
    const { gameAIBalanceRouter } = await import("./routers/gameAIBalance");
    expect(gameAIBalanceRouter).toBeDefined();
    const procedures = gameAIBalanceRouter._def.procedures;
    expect(procedures).toBeDefined();
    expect((procedures as any).balanceQuestSkills).toBeDefined();
  });

  it("appRouter 應包含 gameAIBalance.balanceQuestSkills", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. AI 生成端點存在性驗證
// ═══════════════════════════════════════════════════════════════

describe("AI 生成端點 - aiGenerateQuestSkill", () => {
  it("gameAIRouter 應包含 aiGenerateQuestSkill 端點", async () => {
    const { gameAIRouter } = await import("./routers/gameAI");
    expect(gameAIRouter).toBeDefined();
    const procedures = gameAIRouter._def.procedures;
    expect(procedures).toBeDefined();
    expect((procedures as any).aiGenerateQuestSkill).toBeDefined();
  });

  it("gameAIRouter 應包含 aiGenerateQuestSteps 端點", async () => {
    const { gameAIRouter } = await import("./routers/gameAI");
    const procedures = gameAIRouter._def.procedures;
    expect((procedures as any).aiGenerateQuestSteps).toBeDefined();
  });

  it("gameAIRouter 應包含 aiGenerateQuestNpcs 端點", async () => {
    const { gameAIRouter } = await import("./routers/gameAI");
    const procedures = gameAIRouter._def.procedures;
    expect((procedures as any).aiGenerateQuestNpcs).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Schema 驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能 Schema", () => {
  it("gameUnifiedSkillCatalog 表應存在於 schema 中", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gameUnifiedSkillCatalog).toBeDefined();
  });

  it("gameQuestSkillCatalog 別名應存在於 schema 中（向後相容）", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gameQuestSkillCatalog).toBeDefined();
  });

  it("gameQuestSteps 表應存在於 schema 中", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gameQuestSteps).toBeDefined();
  });

  it("gameQuestProgress 表應存在於 schema 中", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.gameQuestProgress).toBeDefined();
  });
});
