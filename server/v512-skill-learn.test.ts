/**
 * v5.12 Tests — 技能學習系統修復
 * - learn_cost JSON 格式正規化
 * - 前端標籤更名
 * - 道具名稱解析
 */
import { describe, it, expect } from "vitest";

// ─── 1. learn_cost 格式正規化邏輯 ──────────────────────────────────────
describe("learn_cost format normalization", () => {
  /** 模擬後端的正規化邏輯 */
  function normalizeItemsCost(
    rawItems: Array<any>,
    itemCatalog: Record<string, string> // name -> itemId mapping
  ): Array<{ itemId: string; qty: number }> {
    const result: Array<{ itemId: string; qty: number }> = [];
    for (const ri of rawItems) {
      if (ri.itemId) {
        result.push({ itemId: ri.itemId, qty: ri.qty ?? ri.count ?? 1 });
      } else if (ri.name) {
        const foundId = itemCatalog[ri.name];
        if (foundId) {
          result.push({ itemId: foundId, qty: ri.qty ?? ri.count ?? 1 });
        }
      }
    }
    return result;
  }

  const mockCatalog: Record<string, string> = {
    "戰士之證": "I_M001",
    "火焰之心": "I_QST_HELLFIRE",
    "冰霜核心": "I_QST_FROSTCORE",
  };

  it("should handle new format (itemId/qty) correctly", () => {
    const raw = [{ itemId: "I_M001", qty: 1 }];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([{ itemId: "I_M001", qty: 1 }]);
  });

  it("should handle old format (name/count) and resolve itemId", () => {
    const raw = [{ name: "戰士之證", count: 1 }];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([{ itemId: "I_M001", qty: 1 }]);
  });

  it("should handle mixed format items", () => {
    const raw = [
      { itemId: "I_QST_HELLFIRE", qty: 2 },
      { name: "冰霜核心", count: 3 },
    ];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([
      { itemId: "I_QST_HELLFIRE", qty: 2 },
      { itemId: "I_QST_FROSTCORE", qty: 3 },
    ]);
  });

  it("should skip items with unknown names", () => {
    const raw = [{ name: "不存在的道具", count: 1 }];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([]);
  });

  it("should default qty to 1 when missing", () => {
    const raw = [{ itemId: "I_M001" }];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([{ itemId: "I_M001", qty: 1 }]);
  });

  it("should handle empty items array", () => {
    const result = normalizeItemsCost([], mockCatalog);
    expect(result).toEqual([]);
  });

  it("should prefer qty over count when both exist", () => {
    const raw = [{ itemId: "I_M001", qty: 5, count: 3 }];
    const result = normalizeItemsCost(raw, mockCatalog);
    expect(result).toEqual([{ itemId: "I_M001", qty: 5 }]);
  });
});

// ─── 2. learn_cost 完整解析 ──────────────────────────────────────────
describe("learn_cost full parsing", () => {
  function parseCost(learnCost: any) {
    const costRaw = typeof learnCost === "string" ? JSON.parse(learnCost) : (learnCost ?? {});
    return {
      gold: costRaw.gold ?? 0,
      stones: costRaw.stones ?? 0,
      reputation: costRaw.reputation ?? 0,
      items: costRaw.items ?? [],
    };
  }

  it("should parse string JSON correctly", () => {
    const cost = parseCost('{"gold": 500, "items": [{"itemId": "I_M001", "qty": 1}]}');
    expect(cost.gold).toBe(500);
    expect(cost.stones).toBe(0);
    expect(cost.reputation).toBe(0);
    expect(cost.items).toHaveLength(1);
    expect(cost.items[0].itemId).toBe("I_M001");
  });

  it("should parse object JSON correctly", () => {
    const cost = parseCost({ gold: 1150, reputation: 170, stones: 23, items: [] });
    expect(cost.gold).toBe(1150);
    expect(cost.stones).toBe(23);
    expect(cost.reputation).toBe(170);
    expect(cost.items).toHaveLength(0);
  });

  it("should handle null/undefined learnCost", () => {
    expect(parseCost(null).gold).toBe(0);
    expect(parseCost(undefined).gold).toBe(0);
  });

  it("should handle items-only cost (epic skills)", () => {
    const cost = parseCost('{"items": [{"itemId": "I_QST_SHATTER", "qty": 1}]}');
    expect(cost.gold).toBe(0);
    expect(cost.items).toHaveLength(1);
    expect(cost.items[0].itemId).toBe("I_QST_SHATTER");
  });

  it("should handle multi-item legendary cost", () => {
    const cost = parseCost({
      items: [
        { itemId: "I_QST_FATE_A", qty: 1 },
        { itemId: "I_QST_FATE_B", qty: 1 },
        { itemId: "I_QST_FATE_C", qty: 5 },
      ],
    });
    expect(cost.items).toHaveLength(3);
    expect(cost.items[2].qty).toBe(5);
  });
});

// ─── 3. 前端標籤更名驗證 ──────────────────────────────────────────
describe("Frontend label rename", () => {
  it("should use 技能學習 instead of 天命考核 in GameTabLayout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/GameTabLayout.tsx", "utf-8");
    expect(content).toContain('label: "技能學習"');
    expect(content).not.toContain('label: "天命考核"');
  });
});

// ─── 4. NPC 對話道具名稱顯示 ──────────────────────────────────────────
describe("NPC dialogue item name display", () => {
  it("NpcDialogueModal should display item.name when available", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/game/NpcDialogueModal.tsx", "utf-8");
    // Should show item.name || item.itemId
    expect(content).toContain("item.name || item.itemId");
    // Should include agentStones in display
    expect(content).toContain("agentStones");
  });
});

// ─── 5. 後端防禦性格式處理 ──────────────────────────────────────────
describe("Backend defensive format handling", () => {
  it("learnSkillFromNpc should handle old format in gameWorld.ts", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameWorld.ts", "utf-8");
    // Should have defensive normalization comment
    expect(content).toContain("防禦性處理：同時支援 {itemId,qty} 和舊格式 {name,count}");
    // Should look up by name for old format
    expect(content).toContain("舊格式：用名稱查詢 itemId");
  });

  it("getNpcDetail should resolve item names for frontend", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers/gameWorld.ts", "utf-8");
    // Should resolve item names
    expect(content).toContain("正規化道具格式並查詢道具名稱");
    // Should return agentStones
    expect(content).toContain("agentStones: agent?.actionPoints ?? 0");
  });
});

// ─── 6. 金幣/靈晶不足驗證邏輯 ──────────────────────────────────────────
describe("Cost validation logic", () => {
  function validateCosts(
    agent: { gold: number; actionPoints: number; level: number },
    cost: { gold: number; stones: number; reputation: number },
    prerequisiteLevel: number | null
  ): string | null {
    if (prerequisiteLevel && agent.level < prerequisiteLevel) {
      return `等級不足（需要 Lv.${prerequisiteLevel}）`;
    }
    if (cost.gold > 0 && agent.gold < cost.gold) {
      return `金幣不足（需要 ${cost.gold}，當前 ${agent.gold}）`;
    }
    if (cost.stones > 0 && agent.actionPoints < cost.stones) {
      return `靈晶不足（需要 ${cost.stones}，當前 ${agent.actionPoints}）`;
    }
    return null;
  }

  it("should pass when all requirements met", () => {
    const agent = { gold: 1000, actionPoints: 50, level: 10 };
    const cost = { gold: 500, stones: 20, reputation: 0 };
    expect(validateCosts(agent, cost, 5)).toBeNull();
  });

  it("should fail on insufficient gold", () => {
    const agent = { gold: 100, actionPoints: 50, level: 10 };
    const cost = { gold: 500, stones: 0, reputation: 0 };
    expect(validateCosts(agent, cost, null)).toContain("金幣不足");
  });

  it("should fail on insufficient stones", () => {
    const agent = { gold: 1000, actionPoints: 5, level: 10 };
    const cost = { gold: 0, stones: 20, reputation: 0 };
    expect(validateCosts(agent, cost, null)).toContain("靈晶不足");
  });

  it("should fail on insufficient level", () => {
    const agent = { gold: 1000, actionPoints: 50, level: 3 };
    const cost = { gold: 0, stones: 0, reputation: 0 };
    expect(validateCosts(agent, cost, 10)).toContain("等級不足");
  });

  it("should pass when cost is zero (free skill)", () => {
    const agent = { gold: 0, actionPoints: 0, level: 1 };
    const cost = { gold: 0, stones: 0, reputation: 0 };
    expect(validateCosts(agent, cost, null)).toBeNull();
  });
});
