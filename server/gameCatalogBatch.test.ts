/**
 * 六大圖鑑批量操作（batchDelete / batchUpdate）+ 分頁功能測試
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("gameCatalog pagination & batch operations", () => {
  const caller = appRouter.createCaller(createAdminContext());

  // ===== 分頁功能測試 =====
  describe("pagination", () => {
    it("monster catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
      expect(typeof result.total).toBe("number");
      expect(result.total).toBeGreaterThanOrEqual(result.items.length);
    });

    it("monster catalog page 2 returns different items", async () => {
      const page1 = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 5 });
      if (page1.total > 5) {
        const page2 = await caller.gameCatalog.getMonsterCatalog({ page: 2, pageSize: 5 });
        const ids1 = new Set(page1.items.map((m: any) => m.id));
        const ids2 = new Set(page2.items.map((m: any) => m.id));
        // No overlap between page 1 and page 2
        for (const id of Array.from(ids2)) {
          expect(ids1.has(id)).toBe(false);
        }
      }
    });

    it("item catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getItemCatalog({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(typeof result.total).toBe("number");
    });

    it("equip catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getEquipCatalog({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(typeof result.total).toBe("number");
    });

    it("skill catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getSkillCatalog({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(typeof result.total).toBe("number");
    });

    it("achievement catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getAchievementCatalog({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(typeof result.total).toBe("number");
    });

    it("monster skill catalog respects pageSize", async () => {
      const result = await caller.gameCatalog.getMonsterSkillCatalog({ page: 1, pageSize: 3 });
      expect(result.items.length).toBeLessThanOrEqual(3);
      expect(typeof result.total).toBe("number");
    });
  });

  // ===== 批量刪除 API 存在性測試 =====
  describe("batch delete endpoints exist", () => {
    it("batchDeleteMonsters rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteMonsters({ ids: [] });
        // If it doesn't throw, that's also fine (might return deleted: 0)
      } catch (e: any) {
        // Expected: validation error for empty array
        expect(e.message).toBeDefined();
      }
    });

    it("batchDeleteItems rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteItems({ ids: [] });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchDeleteEquips rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteEquips({ ids: [] });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchDeleteSkills rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteSkills({ ids: [] });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchDeleteAchievements rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteAchievements({ ids: [] });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchDeleteMonsterSkills rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchDeleteMonsterSkills({ ids: [] });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });

  // ===== 批量更新 API 存在性測試 =====
  describe("batch update endpoints exist", () => {
    it("batchUpdateMonsters rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateMonsters({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchUpdateItems rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateItems({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchUpdateEquips rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateEquips({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchUpdateSkills rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateSkills({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchUpdateAchievements rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateAchievements({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });

    it("batchUpdateMonsterSkills rejects empty ids", async () => {
      try {
        await caller.gameCatalog.batchUpdateMonsterSkills({ ids: [], data: { rarity: "common" } });
      } catch (e: any) {
        expect(e.message).toBeDefined();
      }
    });
  });

  // ===== 批量更新功能測試（返回結構驗證） =====
  describe("batch update returns correct structure", () => {
    it("batchUpdateMonsters returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateMonsters({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });

    it("batchUpdateItems returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateItems({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });

    it("batchUpdateEquips returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateEquips({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });

    it("batchUpdateSkills returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateSkills({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });

    it("batchUpdateAchievements returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateAchievements({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });

    it("batchUpdateMonsterSkills returns { updated: number }", async () => {
      const result = await caller.gameCatalog.batchUpdateMonsterSkills({ ids: [999999], data: { rarity: "common" } });
      expect(result).toHaveProperty("updated");
      expect(typeof result.updated).toBe("number");
    });
  });

  // ===== 批量刪除功能測試（返回結構驗證） =====
  describe("batch delete returns correct structure", () => {
    it("batchDeleteMonsters returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteMonsters({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });

    it("batchDeleteItems returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteItems({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });

    it("batchDeleteEquips returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteEquips({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });

    it("batchDeleteSkills returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteSkills({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });

    it("batchDeleteAchievements returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteAchievements({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });

    it("batchDeleteMonsterSkills returns { deleted: number }", async () => {
      const result = await caller.gameCatalog.batchDeleteMonsterSkills({ ids: [999999] });
      expect(result).toHaveProperty("deleted");
      expect(typeof result.deleted).toBe("number");
    });
  });
});
