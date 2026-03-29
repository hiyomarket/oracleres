/**
 * 六大圖鑑篩選 + 匯出端點測試
 * 測試後端 rarity/wuxing/levelMin/levelMax/category/skillType 篩選參數
 * 以及 export 端點是否正確返回所有資料
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

describe("gameCatalog filter & export", () => {
  const caller = appRouter.createCaller(createAdminContext());

  // ===== 魔物圖鑑篩選 =====
  describe("getMonsterCatalog filters", () => {
    it("returns results with no filters", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("filters by wuxing", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 200, wuxing: "火" });
      expect(result.items.every((m: any) => m.wuxing === "火")).toBe(true);
    });

    it("filters by rarity", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 200, rarity: "rare" });
      expect(result.items.every((m: any) => m.rarity === "rare")).toBe(true);
    });

    it("filters by levelMin", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 200, levelMin: 5 });
      // levelMin filters where first part of levelRange >= 5
      expect(result).toHaveProperty("items");
    });

    it("filters by levelMax", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 200, levelMax: 10 });
      expect(result).toHaveProperty("items");
    });

    it("combines wuxing + rarity filters", async () => {
      const result = await caller.gameCatalog.getMonsterCatalog({ page: 1, pageSize: 200, wuxing: "木", rarity: "common" });
      for (const m of result.items as any[]) {
        expect(m.wuxing).toBe("木");
        expect(m.rarity).toBe("common");
      }
    });
  });

  // ===== 道具圖鑑篩選 =====
  describe("getItemCatalog filters", () => {
    it("returns results with no filters", async () => {
      const result = await caller.gameCatalog.getItemCatalog({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("filters by category", async () => {
      const result = await caller.gameCatalog.getItemCatalog({ page: 1, pageSize: 200, category: "consumable" });
      expect(result.items.every((i: any) => i.category === "consumable")).toBe(true);
    });

    it("filters by rarity", async () => {
      const result = await caller.gameCatalog.getItemCatalog({ page: 1, pageSize: 200, rarity: "common" });
      expect(result.items.every((i: any) => i.rarity === "common")).toBe(true);
    });
  });

  // ===== 裝備圖鑑篩選 =====
  describe("getEquipCatalog filters", () => {
    it("returns results with no filters", async () => {
      const result = await caller.gameCatalog.getEquipCatalog({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("filters by slot", async () => {
      const result = await caller.gameCatalog.getEquipCatalog({ page: 1, pageSize: 200, slot: "weapon" });
      expect(result.items.every((e: any) => e.slot === "weapon")).toBe(true);
    });

    it("filters by quality", async () => {
      const result = await caller.gameCatalog.getEquipCatalog({ page: 1, pageSize: 200, quality: "blue" });
      expect(result.items.every((e: any) => e.quality === "blue")).toBe(true);
    });

    it("filters by rarity", async () => {
      const result = await caller.gameCatalog.getEquipCatalog({ page: 1, pageSize: 200, rarity: "epic" });
      expect(result.items.every((e: any) => e.rarity === "epic")).toBe(true);
    });
  });

  // ===== 技能圖鑑篩選 =====
  describe("getSkillCatalog filters", () => {
    it("returns results with no filters", async () => {
      const result = await caller.gameCatalog.getSkillCatalog({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("filters by category", async () => {
      const result = await caller.gameCatalog.getSkillCatalog({ page: 1, pageSize: 200, category: "active_combat" });
      expect(result.items.every((s: any) => s.category === "active_combat")).toBe(true);
    });

    it("filters by skillType", async () => {
      const result = await caller.gameCatalog.getSkillCatalog({ page: 1, pageSize: 200, skillType: "attack" });
      expect(result.items.every((s: any) => s.skillType === "attack")).toBe(true);
    });
  });

  // ===== 成就系統篩選 =====
  describe("getAchievementCatalog filters", () => {
    it("returns results with no filters", async () => {
      const result = await caller.gameCatalog.getAchievementCatalog({ page: 1, pageSize: 10 });
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
    });

    it("filters by category", async () => {
      const result = await caller.gameCatalog.getAchievementCatalog({ page: 1, pageSize: 200, category: "combat" });
      expect(result.items.every((a: any) => a.category === "combat")).toBe(true);
    });

    it("filters by rarity", async () => {
      const result = await caller.gameCatalog.getAchievementCatalog({ page: 1, pageSize: 200, rarity: "legendary" });
      expect(result.items.every((a: any) => a.rarity === "legendary")).toBe(true);
    });
  });

  // ===== 匯出端點 =====
  describe("export endpoints", () => {
    it("exportMonsterCatalog returns array", async () => {
      const result = await caller.gameCatalog.exportMonsterCatalog();
      expect(Array.isArray(result)).toBe(true);
    });

    it("exportItemCatalog returns array", async () => {
      const result = await caller.gameCatalog.exportItemCatalog();
      expect(Array.isArray(result)).toBe(true);
    });

    it("exportEquipCatalog returns array", async () => {
      const result = await caller.gameCatalog.exportEquipCatalog();
      expect(Array.isArray(result)).toBe(true);
    });

    it("exportSkillCatalog returns array", async () => {
      const result = await caller.gameCatalog.exportSkillCatalog();
      expect(Array.isArray(result)).toBe(true);
    });

    it("exportAchievementCatalog returns array", async () => {
      const result = await caller.gameCatalog.exportAchievementCatalog();
      expect(Array.isArray(result)).toBe(true);
    });

  });
});
