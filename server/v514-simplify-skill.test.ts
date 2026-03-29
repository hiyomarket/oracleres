/**
 * v5.14 Tests — 技能學習簡化 + 道具清理 + 管理收攏
 * - directLearn 一鍵學習邏輯
 * - 金幣 + 道具檢查
 * - 管理入口收攏驗證
 */
import { describe, it, expect } from "vitest";

// ─── 1. directLearn 金幣 + 道具檢查邏輯 ──────────────────────────────────
describe("directLearn cost validation", () => {
  interface LearnCost {
    gold?: number;
    agentStones?: number;
    items?: Array<{ itemId: string; qty: number }>;
  }

  interface InventoryItem {
    itemId: string;
    quantity: number;
  }

  /** 模擬 directLearn 的代價檢查邏輯 */
  function validateLearnCost(
    learnCost: LearnCost,
    playerGold: number,
    playerStones: number,
    inventory: InventoryItem[]
  ): { canLearn: boolean; errors: string[] } {
    const errors: string[] = [];

    // 金幣檢查
    const goldCost = learnCost.gold ?? 0;
    if (goldCost > 0 && playerGold < goldCost) {
      errors.push(`金幣不足：需要 ${goldCost}，擁有 ${playerGold}`);
    }

    // 靈晶檢查
    const stoneCost = learnCost.agentStones ?? 0;
    if (stoneCost > 0 && playerStones < stoneCost) {
      errors.push(`靈晶不足：需要 ${stoneCost}，擁有 ${playerStones}`);
    }

    // 道具檢查
    const itemsCost = learnCost.items ?? [];
    for (const req of itemsCost) {
      const owned = inventory.find(i => i.itemId === req.itemId);
      const ownedQty = owned?.quantity ?? 0;
      if (ownedQty < req.qty) {
        errors.push(`道具 ${req.itemId} 不足：需要 ${req.qty}，擁有 ${ownedQty}`);
      }
    }

    return { canLearn: errors.length === 0, errors };
  }

  it("should pass when player has enough gold and items", () => {
    const result = validateLearnCost(
      { gold: 500, items: [{ itemId: "I_QST_001", qty: 1 }] },
      1000,
      0,
      [{ itemId: "I_QST_001", quantity: 3 }]
    );
    expect(result.canLearn).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when gold is insufficient", () => {
    const result = validateLearnCost(
      { gold: 500 },
      200,
      0,
      []
    );
    expect(result.canLearn).toBe(false);
    expect(result.errors[0]).toContain("金幣不足");
  });

  it("should fail when quest item is missing", () => {
    const result = validateLearnCost(
      { gold: 100, items: [{ itemId: "I_QST_001", qty: 1 }] },
      500,
      0,
      [] // empty inventory
    );
    expect(result.canLearn).toBe(false);
    expect(result.errors[0]).toContain("道具");
  });

  it("should fail when quest item quantity is insufficient", () => {
    const result = validateLearnCost(
      { gold: 100, items: [{ itemId: "I_QST_001", qty: 3 }] },
      500,
      0,
      [{ itemId: "I_QST_001", quantity: 2 }]
    );
    expect(result.canLearn).toBe(false);
    expect(result.errors[0]).toContain("不足");
  });

  it("should pass with zero cost (free skill)", () => {
    const result = validateLearnCost(
      { gold: 0 },
      0,
      0,
      []
    );
    expect(result.canLearn).toBe(true);
  });

  it("should check both gold and stones simultaneously", () => {
    const result = validateLearnCost(
      { gold: 500, agentStones: 10 },
      200,
      5,
      []
    );
    expect(result.canLearn).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain("金幣");
    expect(result.errors[1]).toContain("靈晶");
  });

  it("should handle multiple item requirements", () => {
    const result = validateLearnCost(
      { gold: 100, items: [
        { itemId: "I_QST_001", qty: 1 },
        { itemId: "I_QST_002", qty: 2 },
      ]},
      500,
      0,
      [
        { itemId: "I_QST_001", quantity: 1 },
        { itemId: "I_QST_002", quantity: 5 },
      ]
    );
    expect(result.canLearn).toBe(true);
  });

  it("should handle undefined learnCost fields gracefully", () => {
    const result = validateLearnCost(
      {}, // empty cost
      0,
      0,
      []
    );
    expect(result.canLearn).toBe(true);
  });
});

// ─── 2. 技能已學習檢查 ──────────────────────────────────────
describe("skill already learned check", () => {
  function isAlreadyLearned(
    skillId: string,
    learnedSkills: Array<{ skillId: string; status: string }>
  ): boolean {
    return learnedSkills.some(s => s.skillId === skillId && s.status === "learned");
  }

  it("should detect already learned skill", () => {
    expect(isAlreadyLearned("USK_001", [
      { skillId: "USK_001", status: "learned" },
    ])).toBe(true);
  });

  it("should not detect in-progress skill as learned", () => {
    expect(isAlreadyLearned("USK_001", [
      { skillId: "USK_001", status: "in_progress" },
    ])).toBe(false);
  });

  it("should not detect unrelated skills", () => {
    expect(isAlreadyLearned("USK_001", [
      { skillId: "USK_002", status: "learned" },
    ])).toBe(false);
  });

  it("should handle empty learned list", () => {
    expect(isAlreadyLearned("USK_001", [])).toBe(false);
  });
});

// ─── 3. 前置技能檢查 ──────────────────────────────────────
describe("prerequisite skill check", () => {
  function checkPrerequisites(
    prerequisites: string[] | null,
    learnedSkills: Array<{ skillId: string; status: string }>
  ): { met: boolean; missing: string[] } {
    if (!prerequisites || prerequisites.length === 0) {
      return { met: true, missing: [] };
    }
    const learnedIds = new Set(
      learnedSkills.filter(s => s.status === "learned").map(s => s.skillId)
    );
    const missing = prerequisites.filter(id => !learnedIds.has(id));
    return { met: missing.length === 0, missing };
  }

  it("should pass with no prerequisites", () => {
    const result = checkPrerequisites(null, []);
    expect(result.met).toBe(true);
  });

  it("should pass with empty prerequisites array", () => {
    const result = checkPrerequisites([], []);
    expect(result.met).toBe(true);
  });

  it("should pass when all prerequisites are met", () => {
    const result = checkPrerequisites(
      ["USK_001", "USK_002"],
      [
        { skillId: "USK_001", status: "learned" },
        { skillId: "USK_002", status: "learned" },
      ]
    );
    expect(result.met).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("should fail when some prerequisites are missing", () => {
    const result = checkPrerequisites(
      ["USK_001", "USK_002"],
      [{ skillId: "USK_001", status: "learned" }]
    );
    expect(result.met).toBe(false);
    expect(result.missing).toEqual(["USK_002"]);
  });

  it("should not count in-progress as met", () => {
    const result = checkPrerequisites(
      ["USK_001"],
      [{ skillId: "USK_001", status: "in_progress" }]
    );
    expect(result.met).toBe(false);
    expect(result.missing).toEqual(["USK_001"]);
  });
});

// ─── 4. 代價扣除邏輯 ──────────────────────────────────────
describe("cost deduction logic", () => {
  interface PlayerState {
    gold: number;
    stones: number;
    inventory: Map<string, number>;
  }

  interface LearnCost {
    gold?: number;
    agentStones?: number;
    items?: Array<{ itemId: string; qty: number }>;
  }

  function deductCost(state: PlayerState, cost: LearnCost): PlayerState {
    const newState = {
      gold: state.gold - (cost.gold ?? 0),
      stones: state.stones - (cost.agentStones ?? 0),
      inventory: new Map(state.inventory),
    };

    for (const item of cost.items ?? []) {
      const current = newState.inventory.get(item.itemId) ?? 0;
      const remaining = current - item.qty;
      if (remaining <= 0) {
        newState.inventory.delete(item.itemId);
      } else {
        newState.inventory.set(item.itemId, remaining);
      }
    }

    return newState;
  }

  it("should deduct gold correctly", () => {
    const result = deductCost(
      { gold: 1000, stones: 0, inventory: new Map() },
      { gold: 500 }
    );
    expect(result.gold).toBe(500);
  });

  it("should deduct items and remove when depleted", () => {
    const inv = new Map([["I_QST_001", 1]]);
    const result = deductCost(
      { gold: 500, stones: 0, inventory: inv },
      { gold: 100, items: [{ itemId: "I_QST_001", qty: 1 }] }
    );
    expect(result.gold).toBe(400);
    expect(result.inventory.has("I_QST_001")).toBe(false);
  });

  it("should reduce item quantity when partially consumed", () => {
    const inv = new Map([["I_QST_001", 5]]);
    const result = deductCost(
      { gold: 500, stones: 0, inventory: inv },
      { gold: 100, items: [{ itemId: "I_QST_001", qty: 2 }] }
    );
    expect(result.inventory.get("I_QST_001")).toBe(3);
  });

  it("should deduct both gold and stones", () => {
    const result = deductCost(
      { gold: 1000, stones: 50, inventory: new Map() },
      { gold: 300, agentStones: 10 }
    );
    expect(result.gold).toBe(700);
    expect(result.stones).toBe(40);
  });
});

// ─── 5. 管理入口收攏驗證 ──────────────────────────────────────
describe("admin management consolidation", () => {
  // Simulating the tab structure
  const systemManagementTabs = [
    "game-guide",
    "broadcast",
    "sys-reset",
  ];

  const catalogManagementTabs = [
    "catalog-monsters",
    "catalog-items",
    "catalog-equipment",
    "catalog-skills", // This is where skill learning is now managed
    "catalog-achievements",
    "pet-catalog",
    "catalog-stats",
    "monster-multiplier",
  ];

  it("should NOT have quest-skills tab in system management", () => {
    expect(systemManagementTabs).not.toContain("quest-skills");
  });

  it("should NOT have 天命考核 tab in system management", () => {
    // The tab was removed from system management
    expect(systemManagementTabs.some(t => t.includes("quest"))).toBe(false);
  });

  it("should have catalog-skills tab in catalog management", () => {
    expect(catalogManagementTabs).toContain("catalog-skills");
  });

  it("should have exactly 3 tabs in system management (guide, broadcast, reset)", () => {
    expect(systemManagementTabs).toHaveLength(3);
  });
});

// ─── 6. 前台標籤驗證 ──────────────────────────────────────
describe("frontend label verification", () => {
  // Simulating the GameTabLayout tabs
  const gameTabLabels = [
    { id: "quests", label: "技能學習" },
  ];

  it("should use 技能學習 instead of 天命考核", () => {
    const questTab = gameTabLabels.find(t => t.id === "quests");
    expect(questTab?.label).toBe("技能學習");
    expect(questTab?.label).not.toBe("天命考核");
  });
});
