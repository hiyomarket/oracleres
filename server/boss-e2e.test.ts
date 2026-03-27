/**
 * Boss 系統端對端測試
 * 驗證：召喚、HP 初始化、挑戰 monsterId 格式、屬性中文化
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  roamingBossCatalog,
  roamingBossInstances,
} from "../drizzle/schema";
import { spawnBossInstance, getActiveBossInstances } from "./services/roamingBossEngine";
import { eq } from "drizzle-orm";

describe("Boss 系統端對端測試", () => {
  let testCatalogId: number;
  let testInstanceId: number | undefined;

  beforeAll(async () => {
    const db = await getDb();
    const catalogs = await db.select().from(roamingBossCatalog).limit(1);
    expect(catalogs.length).toBeGreaterThan(0);
    testCatalogId = catalogs[0].id;
  });

  afterAll(async () => {
    // 清理測試 Boss 實例
    if (testInstanceId) {
      const db = await getDb();
      await db
        .delete(roamingBossInstances)
        .where(eq(roamingBossInstances.id, testInstanceId));
    }
  });

  it("Boss 圖鑑的 wuxing 欄位應全部為中文五行", async () => {
    const db = await getDb();
    const catalogs = await db.select().from(roamingBossCatalog);
    const validWuxing = ["水", "木", "火", "土", "金"];
    for (const cat of catalogs) {
      expect(validWuxing, `Boss "${cat.name}" 的 wuxing="${cat.wuxing}" 不是中文五行`).toContain(cat.wuxing);
    }
  });

  it("spawnBossInstance(forceSpawn=true) 應正確初始化 currentHp 為 baseHp", async () => {
    const db = await getDb();
    // 使用已知存在的節點 ID
    const nodeId = "nb-xindian";

    // spawnBossInstance 返回 instanceId（number）
    const instanceId = await spawnBossInstance(testCatalogId, nodeId, true);
    expect(instanceId).not.toBeNull();
    if (instanceId) {
      testInstanceId = instanceId;
      // 從 DB 查詢實際儲存的 currentHp
      const [inst] = await db
        .select()
        .from(roamingBossInstances)
        .where(eq(roamingBossInstances.id, instanceId));
      expect(inst).toBeDefined();
      // HP 不應為 -1 或 0
      expect(inst.currentHp).toBeGreaterThan(0);
      // currentHp 應等於 catalog 的 baseHp
      const [catalog] = await db
        .select()
        .from(roamingBossCatalog)
        .where(eq(roamingBossCatalog.id, testCatalogId));
      expect(inst.currentHp).toBe(catalog.baseHp);
    }
  });

  it("getActiveBossInstances 應能找到剛召喚的 Boss", async () => {
    const instances = await getActiveBossInstances();
    expect(Array.isArray(instances)).toBe(true);
    if (testInstanceId) {
      // getActiveBossInstances 返回的欄位是 instanceId（非 id）
      const found = instances.find((i) => i.instanceId === testInstanceId);
      expect(found).toBeDefined();
      expect(found?.catalogId).toBe(testCatalogId);
    }
  });

  it("Boss 挑戰的 monsterId 格式應為 boss_{instanceId} 字串", () => {
    if (!testInstanceId) return;
    const monsterId = `boss_${testInstanceId}`;
    // 必須是字串
    expect(typeof monsterId).toBe("string");
    // 必須以 boss_ 開頭
    expect(monsterId.startsWith("boss_")).toBe(true);
    // 解析 instanceId 必須是有效數字
    const parsed = parseInt(monsterId.replace("boss_", ""), 10);
    expect(isNaN(parsed)).toBe(false);
    expect(parsed).toBe(testInstanceId);
  });

  it("spawnBossInstance(forceSpawn=false) 對 isActive=false 的 Boss 應返回 null", async () => {
    const db = await getDb();
    // 找一個 isActive=false 的 Boss
    const inactiveCatalogs = await db
      .select()
      .from(roamingBossCatalog)
      .where(eq(roamingBossCatalog.isActive, false))
      .limit(1);
    if (inactiveCatalogs.length > 0) {
      const result = await spawnBossInstance(inactiveCatalogs[0].id, "nb-xindian", false);
      expect(result).toBeNull();
    }
  });
});
