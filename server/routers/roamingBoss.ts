/**
 * 移動式 Boss 系統 Router
 * 玩家端：查詢活躍 Boss、挑戰 Boss
 * 管理端：Boss 圖鑑 CRUD、實例管理、配置調整、統計
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { roamingBossCatalog, roamingBossInstances, roamingBossKillLog } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  getActiveBossInstances,
  getBossesAtNode,
  getBossCatalogById,
  recordBossKill,
  spawnBossInstance,
  getBossConfig,
  updateBossConfig,
  resetBossConfig,
  getBossStats,
} from "../services/roamingBossEngine";

export const roamingBossRouter = router({
  // ═══════════════════════════════════════════════════════════════
  // 玩家端 API
  // ═══════════════════════════════════════════════════════════════

  /** 取得所有活躍 Boss 列表（含位置） */
  getActiveBosses: publicProcedure.query(async () => {
    return await getActiveBossInstances();
  }),

  /** 取得指定節點上的 Boss */
  getBossesAtNode: publicProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input }) => {
      return await getBossesAtNode(input.nodeId);
    }),

  /** 取得 Boss 詳細資料（含圖鑑） */
  getBossDetail: publicProcedure
    .input(z.object({ instanceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [inst] = await db.select().from(roamingBossInstances)
        .where(eq(roamingBossInstances.id, input.instanceId));
      if (!inst) throw new TRPCError({ code: "NOT_FOUND", message: "Boss 實例不存在" });

      const catalog = await getBossCatalogById(inst.catalogId);
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "Boss 圖鑑不存在" });

      return { instance: inst, catalog };
    }),

  /** 取得 Boss 擊殺排行榜 */
  getKillRanking: publicProcedure
    .input(z.object({ catalogId: z.number().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select({
        agentName: roamingBossKillLog.agentName,
        kills: sql<number>`COUNT(*)`,
        totalDamage: sql<number>`SUM(${roamingBossKillLog.damageDealt})`,
      }).from(roamingBossKillLog)
        .where(eq(roamingBossKillLog.result, "win"))
        .groupBy(roamingBossKillLog.agentName)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(input.limit);

      return await query;
    }),

  /** 取得我的 Boss 戰鬥記錄 */
  getMyBattleHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const logs = await db.select().from(roamingBossKillLog)
        .where(eq(roamingBossKillLog.agentId, ctx.user.id))
        .orderBy(desc(roamingBossKillLog.battleAt))
        .limit(input.limit);

      // 附加 Boss 名稱
      const catalogIds = Array.from(new Set(logs.map(l => l.catalogId)));
      if (catalogIds.length === 0) return [];

      const catalogs = await db.select({ id: roamingBossCatalog.id, name: roamingBossCatalog.name, tier: roamingBossCatalog.tier })
        .from(roamingBossCatalog);
      const catalogMap = new Map(catalogs.map(c => [c.id, c]));

      return logs.map(l => ({
        ...l,
        bossName: catalogMap.get(l.catalogId)?.name || "未知",
        bossTier: catalogMap.get(l.catalogId)?.tier || 1,
      }));
    }),

  // ═══════════════════════════════════════════════════════════════
  // 管理端 API
  // ═══════════════════════════════════════════════════════════════

  /** 取得 Boss 系統配置 */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getBossConfig();
  }),

  /** 更新 Boss 系統配置 */
  updateConfig: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      tier1MaxInstances: z.number().min(0).max(20).optional(),
      tier2MaxInstances: z.number().min(0).max(10).optional(),
      tier3MaxInstances: z.number().min(0).max(5).optional(),
      tier3TriggerKillCount: z.number().min(1).optional(),
      firstKillExpBonus: z.number().min(1).max(10).optional(),
      firstKillGoldBonus: z.number().min(1).max(10).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return updateBossConfig(input);
    }),

  /** 重置 Boss 系統配置 */
  resetConfig: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return resetBossConfig();
  }),

  /** 取得所有 Boss 圖鑑 */
  getCatalogList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(roamingBossCatalog).orderBy(roamingBossCatalog.tier, roamingBossCatalog.id);
  }),

  /** 新增/更新 Boss 圖鑑 */
  upsertCatalog: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      bossCode: z.string().min(1),
      name: z.string().min(1),
      title: z.string().optional(),
      tier: z.number().min(1).max(3),
      wuxing: z.string(),
      level: z.number().min(1),
      baseHp: z.number().min(1),
      baseAttack: z.number().min(1),
      baseDefense: z.number().min(0),
      baseSpeed: z.number().min(1),
      baseMagicAttack: z.number().min(0),
      baseMagicDefense: z.number().min(0),
      skills: z.any().optional(),
      dropTable: z.any().optional(),
      expMultiplier: z.number().min(0.1),
      goldMultiplier: z.number().min(0.1),
      moveIntervalSec: z.number().min(10),
      lifetimeMinutes: z.number().min(0),
      staminaCost: z.number().min(0),
      patrolRegion: z.any().optional(),
      spawnNodeId: z.string().optional(),
      imageUrl: z.string().optional(),
      description: z.string().optional(),
      enrageConfig: z.any().optional(),
      isActive: z.number().min(0).max(1).optional(),
      scheduleConfig: z.any().optional(),
      baseMP: z.number().min(0).optional(),
      goldDrop: z.number().min(0).optional(),
      minionIds: z.array(z.string()).optional(),
      resistWood: z.number().min(0).max(50).optional(),
      resistFire: z.number().min(0).max(50).optional(),
      resistEarth: z.number().min(0).max(50).optional(),
      resistMetal: z.number().min(0).max(50).optional(),
      resistWater: z.number().min(0).max(50).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      if (input.id) {
        // 更新
        await db.update(roamingBossCatalog).set({
          bossCode: input.bossCode,
          name: input.name,
          title: input.title || null,
          tier: input.tier,
          wuxing: input.wuxing,
          level: input.level,
          baseHp: input.baseHp,
          baseAttack: input.baseAttack,
          baseDefense: input.baseDefense,
          baseSpeed: input.baseSpeed,
          baseMagicAttack: input.baseMagicAttack,
          baseMagicDefense: input.baseMagicDefense,
          skills: input.skills || null,
          dropTable: input.dropTable || null,
          expMultiplier: input.expMultiplier,
          goldMultiplier: input.goldMultiplier,
          moveIntervalSec: input.moveIntervalSec,
          lifetimeMinutes: input.lifetimeMinutes,
          staminaCost: input.staminaCost,
          patrolRegion: input.patrolRegion || null,
          spawnNodeId: input.spawnNodeId || null,
          imageUrl: input.imageUrl || null,
          description: input.description || null,
          enrageConfig: input.enrageConfig || null,
          isActive: input.isActive ?? 1,
          scheduleConfig: input.scheduleConfig || null,
          baseMP: input.baseMP ?? 200,
          goldDrop: input.goldDrop ?? 0,
          minionIds: input.minionIds ?? null,
          resistWood: input.resistWood ?? 0,
          resistFire: input.resistFire ?? 0,
          resistEarth: input.resistEarth ?? 0,
          resistMetal: input.resistMetal ?? 0,
          resistWater: input.resistWater ?? 0,
          updatedAt: now,
        }).where(eq(roamingBossCatalog.id, input.id));
        return { id: input.id };
      } else {
        // 新增
        const [result] = await db.insert(roamingBossCatalog).values({
          bossCode: input.bossCode,
          name: input.name,
          title: input.title || null,
          tier: input.tier,
          wuxing: input.wuxing,
          level: input.level,
          baseHp: input.baseHp,
          baseAttack: input.baseAttack,
          baseDefense: input.baseDefense,
          baseSpeed: input.baseSpeed,
          baseMagicAttack: input.baseMagicAttack,
          baseMagicDefense: input.baseMagicDefense,
          skills: input.skills || null,
          dropTable: input.dropTable || null,
          expMultiplier: input.expMultiplier,
          goldMultiplier: input.goldMultiplier,
          moveIntervalSec: input.moveIntervalSec,
          lifetimeMinutes: input.lifetimeMinutes,
          staminaCost: input.staminaCost,
          patrolRegion: input.patrolRegion || null,
          spawnNodeId: input.spawnNodeId || null,
          imageUrl: input.imageUrl || null,
          description: input.description || null,
          enrageConfig: input.enrageConfig || null,
          isActive: input.isActive ?? 1,
          scheduleConfig: input.scheduleConfig || null,
          baseMP: input.baseMP ?? 200,
          goldDrop: input.goldDrop ?? 0,
          minionIds: input.minionIds ?? null,
          resistWood: input.resistWood ?? 0,
          resistFire: input.resistFire ?? 0,
          resistEarth: input.resistEarth ?? 0,
          resistMetal: input.resistMetal ?? 0,
          resistWater: input.resistWater ?? 0,
          createdAt: now,
          updatedAt: now,
        });
        return { id: Number(result.insertId) };
      }
    }),

  /** 刪除 Boss 圖鑑 */
  deleteCatalog: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 先清除所有活躍實例
      await db.update(roamingBossInstances).set({ status: "despawned" })
        .where(and(
          eq(roamingBossInstances.catalogId, input.id),
          eq(roamingBossInstances.status, "active")
        ));

      await db.delete(roamingBossCatalog).where(eq(roamingBossCatalog.id, input.id));
      return { success: true };
    }),

  /** 取得所有 Boss 實例（含已結束的） */
  getInstances: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const conditions = input.status
        ? eq(roamingBossInstances.status, input.status)
        : undefined;

      const instances = conditions
        ? await db.select().from(roamingBossInstances).where(conditions).orderBy(desc(roamingBossInstances.spawnedAt)).limit(input.limit)
        : await db.select().from(roamingBossInstances).orderBy(desc(roamingBossInstances.spawnedAt)).limit(input.limit);

      // 附加 Boss 名稱
      const catalogs = await db.select({ id: roamingBossCatalog.id, name: roamingBossCatalog.name, tier: roamingBossCatalog.tier })
        .from(roamingBossCatalog);
      const catalogMap = new Map(catalogs.map(c => [c.id, c]));

      return instances.map(inst => ({
        ...inst,
        bossName: catalogMap.get(inst.catalogId)?.name || "未知",
        bossTier: catalogMap.get(inst.catalogId)?.tier || 1,
      }));
    }),

  /** 手動生成 Boss 實例 */
  spawnBoss: protectedProcedure
    .input(z.object({
      catalogId: z.number(),
      nodeId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      // 後台手動召喚：forceSpawn=true 跳過 isActive 限制
      const instanceId = await spawnBossInstance(input.catalogId, input.nodeId, true);
      if (!instanceId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "生成失敗，請確認 Boss 圖鑑資料是否完整" });
      return { instanceId };
    }),

  /** 手動消除 Boss 實例 */
  despawnBoss: protectedProcedure
    .input(z.object({ instanceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(roamingBossInstances).set({ status: "despawned" })
        .where(eq(roamingBossInstances.id, input.instanceId));
      return { success: true };
    }),

  /** 取得 Boss 統計數據 */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return await getBossStats();
  }),

  /** 切換 Boss 啟用/停用狀態 */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.number().min(0).max(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(roamingBossCatalog)
        .set({ isActive: input.isActive, updatedAt: Date.now() })
        .where(eq(roamingBossCatalog.id, input.id));
      return { success: true };
    }),

  /** 取得擊殺日誌 */
  getKillLogs: protectedProcedure
    .input(z.object({ limit: z.number().default(50), catalogId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];

      const conditions = input.catalogId
        ? eq(roamingBossKillLog.catalogId, input.catalogId)
        : undefined;

      const logs = conditions
        ? await db.select().from(roamingBossKillLog).where(conditions).orderBy(desc(roamingBossKillLog.battleAt)).limit(input.limit)
        : await db.select().from(roamingBossKillLog).orderBy(desc(roamingBossKillLog.battleAt)).limit(input.limit);

      return logs;
    }),
});
