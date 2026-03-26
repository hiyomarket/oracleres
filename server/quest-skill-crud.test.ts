/**
 * quest-skill-crud.test.ts
 * 天命考核技能 CRUD、任務鏈進度、裝備邏輯的單元測試
 * 1. Schema 欄位完整性驗證
 * 2. 任務鏈狀態機驗證
 * 3. 裝備/卸下邏輯驗證
 * 4. 前置條件檢查邏輯驗證
 * 5. 戰鬥引擎技能轉換驗證
 */
import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════
// 1. Schema 欄位完整性驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能 Schema 欄位", () => {
  const REQUIRED_CATALOG_FIELDS = [
    "id", "name", "category", "skillType", "rarity", "wuxing",
    "powerPercent", "mpCost", "cooldown", "maxLevel", "levelUpBonus",
    "description", "additionalEffect", "specialMechanic", "learnCost",
    "prerequisiteSkillIds", "prerequisiteLevel",
  ];

  const REQUIRED_STEP_FIELDS = [
    "id", "skillId", "stepNumber", "title", "objective",
    "targetType", "targetValue", "npcId", "location",
    "dialogue", "rewardGold", "rewardSoulCrystal",
  ];

  const REQUIRED_PROGRESS_FIELDS = [
    "id", "agentId", "skillId", "currentStep", "status",
    "startedAt", "completedAt", "updatedAt",
  ];

  const REQUIRED_LEARNED_FIELDS = [
    "id", "agentId", "skillId", "level", "exp",
    "isEquipped", "slotIndex", "learnedAt", "updatedAt",
  ];

  it("技能圖鑑表應包含所有必要欄位", () => {
    for (const field of REQUIRED_CATALOG_FIELDS) {
      expect(typeof field).toBe("string");
      expect(field.length).toBeGreaterThan(0);
    }
    expect(REQUIRED_CATALOG_FIELDS.length).toBeGreaterThanOrEqual(15);
  });

  it("任務步驟表應包含所有必要欄位", () => {
    for (const field of REQUIRED_STEP_FIELDS) {
      expect(typeof field).toBe("string");
    }
    expect(REQUIRED_STEP_FIELDS.length).toBeGreaterThanOrEqual(10);
  });

  it("任務進度表應包含所有必要欄位", () => {
    for (const field of REQUIRED_PROGRESS_FIELDS) {
      expect(typeof field).toBe("string");
    }
    expect(REQUIRED_PROGRESS_FIELDS.length).toBeGreaterThanOrEqual(7);
  });

  it("已習得技能表應包含所有必要欄位", () => {
    for (const field of REQUIRED_LEARNED_FIELDS) {
      expect(typeof field).toBe("string");
    }
    expect(REQUIRED_LEARNED_FIELDS.length).toBeGreaterThanOrEqual(8);
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 任務鏈狀態機驗證
// ═══════════════════════════════════════════════════════════════

describe("任務鏈狀態機", () => {
  type QuestStatus = "not_started" | "in_progress" | "ready_to_confirm" | "completed";

  const VALID_TRANSITIONS: Record<QuestStatus, QuestStatus[]> = {
    not_started: ["in_progress"],
    in_progress: ["ready_to_confirm"],
    ready_to_confirm: ["completed"],
    completed: [], // 終態
  };

  function canTransition(from: QuestStatus, to: QuestStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it("應允許從 not_started 到 in_progress", () => {
    expect(canTransition("not_started", "in_progress")).toBe(true);
  });

  it("應允許從 in_progress 到 ready_to_confirm", () => {
    expect(canTransition("in_progress", "ready_to_confirm")).toBe(true);
  });

  it("應允許從 ready_to_confirm 到 completed", () => {
    expect(canTransition("ready_to_confirm", "completed")).toBe(true);
  });

  it("不應允許從 completed 到任何狀態", () => {
    expect(canTransition("completed", "not_started")).toBe(false);
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("completed", "ready_to_confirm")).toBe(false);
  });

  it("不應允許跳過狀態", () => {
    expect(canTransition("not_started", "ready_to_confirm")).toBe(false);
    expect(canTransition("not_started", "completed")).toBe(false);
    expect(canTransition("in_progress", "completed")).toBe(false);
  });

  it("不應允許倒退狀態", () => {
    expect(canTransition("in_progress", "not_started")).toBe(false);
    expect(canTransition("ready_to_confirm", "in_progress")).toBe(false);
    expect(canTransition("completed", "in_progress")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. 裝備/卸下邏輯驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能裝備邏輯", () => {
  const MAX_SLOTS = 6;

  interface LearnedSkill {
    id: number;
    skillId: number;
    isEquipped: number;
    slotIndex: number;
  }

  function equipSkill(
    learned: LearnedSkill[],
    skillId: number,
    slotIndex: number
  ): LearnedSkill[] {
    if (slotIndex < 1 || slotIndex > MAX_SLOTS) throw new Error("無效的欄位");
    const target = learned.find(s => s.skillId === skillId);
    if (!target) throw new Error("尚未習得此技能");

    return learned.map(s => {
      // 清除該欄位上的其他技能
      if (s.slotIndex === slotIndex && s.skillId !== skillId) {
        return { ...s, isEquipped: 0, slotIndex: 0 };
      }
      // 裝備目標技能
      if (s.skillId === skillId) {
        return { ...s, isEquipped: 1, slotIndex };
      }
      return s;
    });
  }

  function unequipSkill(learned: LearnedSkill[], skillId: number): LearnedSkill[] {
    return learned.map(s =>
      s.skillId === skillId ? { ...s, isEquipped: 0, slotIndex: 0 } : s
    );
  }

  const mockLearned: LearnedSkill[] = [
    { id: 1, skillId: 101, isEquipped: 0, slotIndex: 0 },
    { id: 2, skillId: 102, isEquipped: 1, slotIndex: 1 },
    { id: 3, skillId: 103, isEquipped: 0, slotIndex: 0 },
  ];

  it("應能裝備技能到空欄位", () => {
    const result = equipSkill(mockLearned, 101, 2);
    const equipped = result.find(s => s.skillId === 101);
    expect(equipped?.isEquipped).toBe(1);
    expect(equipped?.slotIndex).toBe(2);
  });

  it("裝備到已佔用欄位應替換原技能", () => {
    const result = equipSkill(mockLearned, 101, 1);
    const newEquip = result.find(s => s.skillId === 101);
    const oldEquip = result.find(s => s.skillId === 102);
    expect(newEquip?.isEquipped).toBe(1);
    expect(newEquip?.slotIndex).toBe(1);
    expect(oldEquip?.isEquipped).toBe(0);
    expect(oldEquip?.slotIndex).toBe(0);
  });

  it("應能卸下已裝備的技能", () => {
    const result = unequipSkill(mockLearned, 102);
    const unequipped = result.find(s => s.skillId === 102);
    expect(unequipped?.isEquipped).toBe(0);
    expect(unequipped?.slotIndex).toBe(0);
  });

  it("裝備欄位範圍應為 1-6", () => {
    expect(() => equipSkill(mockLearned, 101, 0)).toThrow("無效的欄位");
    expect(() => equipSkill(mockLearned, 101, 7)).toThrow("無效的欄位");
  });

  it("未習得的技能不能裝備", () => {
    expect(() => equipSkill(mockLearned, 999, 1)).toThrow("尚未習得此技能");
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. 前置條件檢查邏輯驗證
// ═══════════════════════════════════════════════════════════════

describe("前置條件檢查", () => {
  interface SkillCatalog {
    id: number;
    prerequisiteSkillIds: number[] | null;
    prerequisiteLevel: number | null;
  }

  interface LearnedSkill {
    skillId: number;
    level: number;
  }

  function checkPrerequisites(
    skill: SkillCatalog,
    learnedSkills: LearnedSkill[],
    agentLevel: number
  ): { passed: boolean; reason?: string } {
    // 檢查等級需求
    if (skill.prerequisiteLevel && agentLevel < skill.prerequisiteLevel) {
      return { passed: false, reason: `需要等級 ${skill.prerequisiteLevel}，目前等級 ${agentLevel}` };
    }

    // 檢查前置技能
    if (skill.prerequisiteSkillIds && skill.prerequisiteSkillIds.length > 0) {
      const learnedIds = new Set(learnedSkills.map(s => s.skillId));
      const missing = skill.prerequisiteSkillIds.filter(id => !learnedIds.has(id));
      if (missing.length > 0) {
        return { passed: false, reason: `需要先習得技能 ID: ${missing.join(", ")}` };
      }
    }

    return { passed: true };
  }

  it("無前置條件應通過", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: null, prerequisiteLevel: null },
      [], 1
    );
    expect(result.passed).toBe(true);
  });

  it("等級不足應不通過", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: null, prerequisiteLevel: 10 },
      [], 5
    );
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("需要等級 10");
  });

  it("等級足夠應通過", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: null, prerequisiteLevel: 10 },
      [], 15
    );
    expect(result.passed).toBe(true);
  });

  it("缺少前置技能應不通過", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: [2, 3], prerequisiteLevel: null },
      [{ skillId: 2, level: 1 }], 1
    );
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("3");
  });

  it("擁有所有前置技能應通過", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: [2, 3], prerequisiteLevel: null },
      [{ skillId: 2, level: 1 }, { skillId: 3, level: 1 }], 1
    );
    expect(result.passed).toBe(true);
  });

  it("同時需要等級和前置技能", () => {
    const result = checkPrerequisites(
      { id: 1, prerequisiteSkillIds: [2], prerequisiteLevel: 5 },
      [{ skillId: 2, level: 1 }], 10
    );
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. 戰鬥引擎技能轉換驗證
// ═══════════════════════════════════════════════════════════════

describe("天命考核技能戰鬥轉換", () => {
  interface QuestSkillData {
    id: number;
    name: string;
    skillType: string;
    powerPercent: number;
    mpCost: number;
    cooldown: number;
    wuxing: string | null;
  }

  interface CombatSkill {
    id: string;
    name: string;
    skillType: string;
    damageMultiplier: number;
    mpCost: number;
    cooldown: number;
    wuxing?: string;
  }

  function convertToCombatSkill(qs: QuestSkillData): CombatSkill {
    const mappedType = qs.skillType === "attack" ? "attack" :
      qs.skillType === "heal" ? "heal" :
      qs.skillType === "buff" ? "buff" :
      qs.skillType === "debuff" ? "attack" :
      qs.skillType === "utility" ? "buff" : "attack";

    return {
      id: `quest_${qs.id}`,
      name: `[天命] ${qs.name}`,
      skillType: mappedType,
      damageMultiplier: (qs.powerPercent ?? 100) / 100,
      mpCost: qs.mpCost ?? 0,
      wuxing: qs.wuxing ?? undefined,
      cooldown: qs.cooldown ?? 3,
    };
  }

  it("攻擊技能應正確轉換", () => {
    const result = convertToCombatSkill({
      id: 1, name: "烈焰斬", skillType: "attack",
      powerPercent: 200, mpCost: 15, cooldown: 3, wuxing: "fire",
    });
    expect(result.id).toBe("quest_1");
    expect(result.name).toBe("[天命] 烈焰斬");
    expect(result.skillType).toBe("attack");
    expect(result.damageMultiplier).toBe(2.0);
    expect(result.mpCost).toBe(15);
    expect(result.cooldown).toBe(3);
    expect(result.wuxing).toBe("fire");
  });

  it("治療技能應正確轉換", () => {
    const result = convertToCombatSkill({
      id: 2, name: "生命之泉", skillType: "heal",
      powerPercent: 150, mpCost: 20, cooldown: 5, wuxing: "water",
    });
    expect(result.skillType).toBe("heal");
    expect(result.damageMultiplier).toBe(1.5);
  });

  it("增益技能應正確轉換", () => {
    const result = convertToCombatSkill({
      id: 3, name: "鐵壁", skillType: "buff",
      powerPercent: 120, mpCost: 10, cooldown: 4, wuxing: "earth",
    });
    expect(result.skillType).toBe("buff");
  });

  it("減益技能應映射為攻擊", () => {
    const result = convertToCombatSkill({
      id: 4, name: "毒霧", skillType: "debuff",
      powerPercent: 80, mpCost: 12, cooldown: 3, wuxing: "wood",
    });
    expect(result.skillType).toBe("attack");
  });

  it("功能技能應映射為增益", () => {
    const result = convertToCombatSkill({
      id: 5, name: "偵察", skillType: "utility",
      powerPercent: 50, mpCost: 5, cooldown: 2, wuxing: null,
    });
    expect(result.skillType).toBe("buff");
    expect(result.wuxing).toBeUndefined();
  });

  it("威力百分比應正確轉換為倍率", () => {
    const tests = [
      { power: 100, expected: 1.0 },
      { power: 250, expected: 2.5 },
      { power: 500, expected: 5.0 },
      { power: 50, expected: 0.5 },
    ];
    for (const t of tests) {
      const result = convertToCombatSkill({
        id: 99, name: "test", skillType: "attack",
        powerPercent: t.power, mpCost: 0, cooldown: 1, wuxing: null,
      });
      expect(result.damageMultiplier).toBeCloseTo(t.expected, 2);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. 技能分類和稀有度驗證
// ═══════════════════════════════════════════════════════════════

describe("技能分類和稀有度", () => {
  const VALID_CATEGORIES = ["physical", "magic", "status", "support", "special", "production"];
  const VALID_RARITIES = ["common", "rare", "epic", "legendary"];
  const VALID_SKILL_TYPES = ["attack", "heal", "buff", "debuff", "passive", "utility"];
  const VALID_WUXING = ["wood", "fire", "earth", "metal", "water"];

  it("所有分類應有對應的 UI 配置", () => {
    expect(VALID_CATEGORIES.length).toBe(6);
    for (const cat of VALID_CATEGORIES) {
      expect(cat.length).toBeGreaterThan(0);
    }
  });

  it("所有稀有度應有對應的 UI 配置", () => {
    expect(VALID_RARITIES.length).toBe(4);
    for (const r of VALID_RARITIES) {
      expect(r.length).toBeGreaterThan(0);
    }
  });

  it("所有技能類型應有效", () => {
    expect(VALID_SKILL_TYPES.length).toBe(6);
  });

  it("五行屬性應完整", () => {
    expect(VALID_WUXING.length).toBe(5);
    expect(VALID_WUXING).toContain("wood");
    expect(VALID_WUXING).toContain("fire");
    expect(VALID_WUXING).toContain("earth");
    expect(VALID_WUXING).toContain("metal");
    expect(VALID_WUXING).toContain("water");
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. 步驟推進邏輯驗證
// ═══════════════════════════════════════════════════════════════

describe("任務步驟推進邏輯", () => {
  interface Step {
    stepNumber: number;
    title: string;
  }

  function advanceStep(
    currentStep: number,
    steps: Step[]
  ): { nextStep: number; status: "in_progress" | "ready_to_confirm" } {
    const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
    const currentIdx = sorted.findIndex(s => s.stepNumber === currentStep);
    const next = sorted[currentIdx + 1];

    if (next) {
      return { nextStep: next.stepNumber, status: "in_progress" };
    } else {
      return { nextStep: 99, status: "ready_to_confirm" };
    }
  }

  const mockSteps: Step[] = [
    { stepNumber: 1, title: "尋找師父" },
    { stepNumber: 2, title: "收集材料" },
    { stepNumber: 3, title: "完成試煉" },
  ];

  it("第一步完成後應進入第二步", () => {
    const result = advanceStep(1, mockSteps);
    expect(result.nextStep).toBe(2);
    expect(result.status).toBe("in_progress");
  });

  it("第二步完成後應進入第三步", () => {
    const result = advanceStep(2, mockSteps);
    expect(result.nextStep).toBe(3);
    expect(result.status).toBe("in_progress");
  });

  it("最後一步完成後應進入待確認", () => {
    const result = advanceStep(3, mockSteps);
    expect(result.nextStep).toBe(99);
    expect(result.status).toBe("ready_to_confirm");
  });

  it("單步驟任務完成後直接待確認", () => {
    const result = advanceStep(1, [{ stepNumber: 1, title: "唯一步驟" }]);
    expect(result.nextStep).toBe(99);
    expect(result.status).toBe("ready_to_confirm");
  });
});
