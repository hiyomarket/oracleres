/**
 * M3F Bug 修正測試
 * 驗證：休息恢復 MP、技能書學習、道具名稱中文化、拍賣行讀取道具、策略切換
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-m3f",
      email: "test@example.com",
      name: "TestUser",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("M3F Bug Fixes", () => {
  const caller = appRouter.createCaller(createUserContext());

  // Bug 1: 休息恢復 MP — getAgentStatus 應有 hp/mp/stamina 欄位
  describe("Rest recovery logic", () => {
    it("getAgentStatus should return agent with hp, mp, stamina fields", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const status = await caller.gameWorld.getAgentStatus();
      expect(status).toBeDefined();
      expect(status).toHaveProperty("agent");
      const agent = (status as any).agent;
      if (agent) {
        expect(agent).toHaveProperty("hp");
        expect(agent).toHaveProperty("mp");
        expect(agent).toHaveProperty("maxHp");
        expect(agent).toHaveProperty("maxMp");
        expect(agent).toHaveProperty("stamina");
      }
    });
  });

  // Bug 2: 技能書學習 — getMyLearnedSkills API
  describe("Skill learning system", () => {
    it("getMyLearnedSkills should return an array", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const skills = await caller.gameWorld.getMyLearnedSkills();
      expect(Array.isArray(skills)).toBe(true);
    });

    it("getSkillCatalogForPlayer should return skill catalog", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const catalog = await caller.gameWorld.getSkillCatalogForPlayer();
      expect(Array.isArray(catalog)).toBe(true);
    });
  });

  // Bug 5: 道具名稱中文化 — getInventory 使用 shared/itemNames
  describe("Inventory item names", () => {
    it("getInventory should return a direct array", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const inv = await caller.gameWorld.getInventory();
      expect(Array.isArray(inv)).toBe(true);
    });

    it("inventory items should have itemName field if items exist", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const inv = await caller.gameWorld.getInventory() as any[];
      if (inv.length > 0) {
        expect(inv[0]).toHaveProperty("itemName");
        expect(typeof inv[0].itemName).toBe("string");
        expect(inv[0].itemName.length).toBeGreaterThan(0);
      }
    });
  });

  // Bug 6: 拍賣行 — getInventory 返回格式驗證
  describe("Auction house inventory access", () => {
    it("getInventory return should NOT have items property at top level", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const inv = await caller.gameWorld.getInventory();
      expect(Array.isArray(inv)).toBe(true);
      expect((inv as any).items).toBeUndefined();
    });
  });

  // Bug 3 & 4: Strategy switch and movement
  describe("Strategy switch", () => {
    it("setStrategy should accept valid strategy", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const result = await caller.gameWorld.setStrategy({ strategy: "combat" });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success", true);
    });

    it("setStrategy should accept all five strategies", async () => {
      await caller.gameWorld.getOrCreateAgent();
      const strategies = ["combat", "explore", "gather", "infuse", "rest"] as const;
      for (const s of strategies) {
        const result = await caller.gameWorld.setStrategy({ strategy: s });
        expect(result.success).toBe(true);
      }
    });
  });
});
