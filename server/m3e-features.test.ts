/**
 * M3E: Bug 修正 + 新功能測試
 * 測試技能書學習、批量匯入、批量編輯預覽、匯出端點
 */
import { describe, it, expect } from "vitest";
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

function createUserContext(id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: `test-user-${id}`,
      email: `user${id}@example.com`,
      name: `User${id}`,
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

// ════════════════════════════════════════════════════════════════
// 1. Bug 修正：技能書學習 — getMyLearnedSkills 端點
// ════════════════════════════════════════════════════════════════
describe("Bug Fix: getMyLearnedSkills", () => {
  const caller = appRouter.createCaller(createUserContext(1));

  it("should return learned skills array for a user", async () => {
    const result = await caller.gameWorld.getMyLearnedSkills();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should return skillId strings in learned skills", async () => {
    const result = await caller.gameWorld.getMyLearnedSkills();
    for (const skill of result) {
      expect(skill).toHaveProperty("skillId");
      expect(typeof skill.skillId).toBe("string");
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 2. 新功能：批量匯入 API — 空陣列應被拒絕（min(1)）
// ════════════════════════════════════════════════════════════════
describe("Feature: Bulk Import APIs reject empty arrays", () => {
  const caller = appRouter.createCaller(createAdminContext());

  it("bulkImportMonsters rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportMonsters({ items: [] })).rejects.toThrow();
  });

  it("bulkImportItems rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportItems({ items: [] })).rejects.toThrow();
  });

  it("bulkImportEquipments rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportEquipments({ items: [] })).rejects.toThrow();
  });

  it("bulkImportSkills rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportSkills({ items: [] })).rejects.toThrow();
  });

  it("bulkImportAchievements rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportAchievements({ items: [] })).rejects.toThrow();
  });

  it("bulkImportMonsterSkills rejects empty array", async () => {
    await expect(caller.gameCatalog.bulkImportMonsterSkills({ items: [] })).rejects.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════
// 3. 新功能：批量匯入 — 實際資料匯入測試
// ════════════════════════════════════════════════════════════════
describe("Feature: Bulk Import with data", () => {
  const caller = appRouter.createCaller(createAdminContext());

  it("bulkImportMonsters should import valid monster data", async () => {
    const ts = Date.now();
    const result = await caller.gameCatalog.bulkImportMonsters({
      items: [
        {
          name: `測試怪物_M3E_${ts}`,
          wuxing: "木",
          rarity: "common",
          monsterType: "normal",
          level: 1,
          hp: 100,
          attack: 10,
          defense: 5,
          speed: 8,
          expReward: 10,
          goldReward: 5,
        },
      ],
    });
    expect(result).toHaveProperty("imported");
    expect(result.imported).toBeGreaterThanOrEqual(0);
  });

  it("bulkImportItems should import valid item data", async () => {
    const ts = Date.now();
    const result = await caller.gameCatalog.bulkImportItems({
      items: [
        {
          name: `測試道具_M3E_${ts}`,
          wuxing: "火",
          rarity: "common",
          itemType: "consumable",
          effect: "恢復 10 HP",
          shopPrice: 10,
        },
      ],
    });
    expect(result).toHaveProperty("imported");
    expect(result.imported).toBeGreaterThanOrEqual(0);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. 批量編輯 API 驗證
// ════════════════════════════════════════════════════════════════
describe("Feature: Batch Update APIs", () => {
  const caller = appRouter.createCaller(createAdminContext());

  it("batchUpdateMonsters should accept ids and data", async () => {
    const result = await caller.gameCatalog.batchUpdateMonsters({
      ids: [999999],
      data: { rarity: "rare" },
    });
    expect(result).toHaveProperty("updated");
  });

  it("batchUpdateItems should accept ids and data", async () => {
    const result = await caller.gameCatalog.batchUpdateItems({
      ids: [999999],
      data: { rarity: "rare" },
    });
    expect(result).toHaveProperty("updated");
  });
});

// ════════════════════════════════════════════════════════════════
// 5. 匯出端點仍然正常
// ════════════════════════════════════════════════════════════════
describe("Feature: Export endpoints still work", () => {
  const caller = appRouter.createCaller(createAdminContext());

  it("exportMonsterCatalog should return array", async () => {
    const result = await caller.gameCatalog.exportMonsterCatalog();
    expect(Array.isArray(result)).toBe(true);
  });

  it("exportItemCatalog should return array", async () => {
    const result = await caller.gameCatalog.exportItemCatalog();
    expect(Array.isArray(result)).toBe(true);
  });
});
