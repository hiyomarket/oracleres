/**
 * equipEnhance.ts
 * 裝備強化系統 tRPC Router
 *
 * 功能：
 * 1. enhanceEquip — 使用卷軸強化裝備
 * 2. getEnhanceInfo — 取得裝備強化資訊（當前等級、成功率、預覽）
 * 3. getEnhanceLogs — 取得強化歷史記錄
 * 4. getScrollInventory — 取得背包中的強化卷軸
 * 5. getEnhanceLevels — 取得所有強化等級資訊
 * 6. getEnhanceConfig — 後台讀取強化設定
 * 7. updateEnhanceConfig — 後台更新強化設定
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  agentInventory,
  gameAgents,
  gameEquipmentCatalog,
  gameItemCatalog,
  equipEnhanceLogs,
  gameConfig,
} from "../../drizzle/schema";
import {
  performEnhanceWithConfig,
  getEnhanceConfig,
  isScrollApplicable,
  ENHANCE_LEVELS,
  type ScrollType,
  type EnhanceConfig,
} from "../services/enhanceEngine";

export const equipEnhanceRouter = router({

  /** 取得裝備強化資訊（使用動態設定） */
  getEnhanceInfo: protectedProcedure
    .input(z.object({ inventoryId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const cfg = await getEnhanceConfig();

      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const [inv] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.id, input.inventoryId),
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemType, "equipment"),
        )).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該裝備" });

      const [catalog] = await db.select().from(gameEquipmentCatalog)
        .where(eq(gameEquipmentCatalog.equipId, inv.itemId)).limit(1);
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "找不到裝備圖鑑資料" });

      const itemData = (inv.itemData as any) ?? {};
      const currentLevel = itemData.enhanceLevel ?? 0;
      const clampedLevel = Math.min(currentLevel, 5);
      const levelInfo = ENHANCE_LEVELS[clampedLevel];
      const nextRate = cfg.rates[currentLevel] ?? 0;
      const canEnhance = currentLevel < cfg.maxLevel;

      return {
        inventoryId: inv.id,
        equipId: catalog.equipId,
        equipName: catalog.name,
        slot: catalog.slot,
        currentLevel,
        currentColor: levelInfo.color,
        currentColorLabel: levelInfo.label,
        currentColorHex: levelInfo.colorHex,
        nextLevel: canEnhance ? currentLevel + 1 : currentLevel,
        nextColor: canEnhance ? ENHANCE_LEVELS[Math.min(currentLevel + 1, 5)].color : levelInfo.color,
        nextColorLabel: canEnhance ? ENHANCE_LEVELS[Math.min(currentLevel + 1, 5)].label : levelInfo.label,
        nextColorHex: canEnhance ? ENHANCE_LEVELS[Math.min(currentLevel + 1, 5)].colorHex : levelInfo.colorHex,
        successRate: nextRate,
        isSafe: currentLevel < cfg.safeLevel,
        canEnhance,
        destroyChance: currentLevel >= cfg.safeLevel ? cfg.destroyChance : 0,
        statBonus: cfg.statBonus[currentLevel] ?? 0,
        nextStatBonus: canEnhance ? (cfg.statBonus[currentLevel + 1] ?? 0) : (cfg.statBonus[currentLevel] ?? 0),
        baseStats: {
          hp: catalog.hpBonus,
          attack: catalog.attackBonus,
          defense: catalog.defenseBonus,
          speed: catalog.speedBonus,
        },
      };
    }),

  /** 取得背包中的強化卷軸 */
  getScrollInventory: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const scrolls = await db.select({
        inventoryId: agentInventory.id,
        itemId: agentInventory.itemId,
        quantity: agentInventory.quantity,
        name: gameItemCatalog.name,
        rarity: gameItemCatalog.rarity,
        useEffect: gameItemCatalog.useEffect,
        imageUrl: gameItemCatalog.imageUrl,
      })
        .from(agentInventory)
        .innerJoin(gameItemCatalog, eq(agentInventory.itemId, gameItemCatalog.itemId))
        .where(
          and(
            eq(agentInventory.agentId, agent.id),
            sql`${agentInventory.quantity} > 0`,
            sql`JSON_EXTRACT(${gameItemCatalog.useEffect}, '$.type') = 'enhance_scroll'`,
          )
        );

      return scrolls.map(s => ({
        inventoryId: s.inventoryId,
        itemId: s.itemId,
        name: s.name,
        rarity: s.rarity,
        quantity: s.quantity,
        imageUrl: s.imageUrl,
        scrollType: ((s.useEffect as any)?.scrollType ?? "weapon_scroll") as ScrollType,
        description: (s.useEffect as any)?.description ?? "",
      }));
    }),

  /** 執行強化（使用動態設定） */
  enhanceEquip: protectedProcedure
    .input(z.object({
      inventoryId: z.number().int(),
      scrollItemId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const cfg = await getEnhanceConfig();

      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 1. 取得裝備
      const [inv] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.id, input.inventoryId),
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemType, "equipment"),
        )).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該裝備" });

      // 2. 取得裝備圖鑑
      const [catalog] = await db.select().from(gameEquipmentCatalog)
        .where(eq(gameEquipmentCatalog.equipId, inv.itemId)).limit(1);
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "找不到裝備圖鑑資料" });

      // 3. 取得卷軸
      const [scrollInv] = await db.select({
        id: agentInventory.id,
        quantity: agentInventory.quantity,
        itemId: agentInventory.itemId,
        useEffect: gameItemCatalog.useEffect,
      }).from(agentInventory)
        .innerJoin(gameItemCatalog, eq(agentInventory.itemId, gameItemCatalog.itemId))
        .where(and(
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemId, input.scrollItemId),
          sql`${agentInventory.quantity} > 0`,
          sql`JSON_EXTRACT(${gameItemCatalog.useEffect}, '$.type') = 'enhance_scroll'`,
        )).limit(1);
      if (!scrollInv) throw new TRPCError({ code: "NOT_FOUND", message: "找不到強化卷軸或數量不足" });

      // 4. 檢查卷軸適用性
      const scrollType = ((scrollInv.useEffect as any)?.scrollType ?? "weapon_scroll") as ScrollType;
      if (!isScrollApplicable(scrollType, catalog.slot)) {
        const scrollLabel = scrollType === "weapon_scroll" ? "武器強化卷軸" : "防具強化卷軸";
        const slotLabel = catalog.slot === "weapon" ? "武器" : "防具/飾品";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${scrollLabel}不能用於${slotLabel}類裝備「${catalog.name}」。`,
        });
      }

      // 5. 檢查當前等級
      const itemData = (inv.itemData as any) ?? {};
      const currentLevel = itemData.enhanceLevel ?? 0;
      if (currentLevel >= cfg.maxLevel) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `裝備已達最高強化等級（+${cfg.maxLevel}），無法繼續強化。` });
      }

      // 6. 扣除卷軸
      await db.update(agentInventory)
        .set({
          quantity: sql`${agentInventory.quantity} - 1`,
          updatedAt: Date.now(),
        })
        .where(eq(agentInventory.id, scrollInv.id));

      // 7. 執行強化（使用動態設定）
      const result = performEnhanceWithConfig(currentLevel, cfg);

      // 8. 更新裝備或刪除
      if (result.destroyed) {
        await db.delete(agentInventory).where(eq(agentInventory.id, inv.id));
      } else {
        const newItemData = {
          ...itemData,
          enhanceLevel: result.newLevel,
          enhanceColor: result.newColor,
        };
        await db.update(agentInventory)
          .set({
            itemData: newItemData,
            updatedAt: Date.now(),
          })
          .where(eq(agentInventory.id, inv.id));
      }

      // 9. 記錄日誌
      await db.insert(equipEnhanceLogs).values({
        agentId: agent.id,
        inventoryId: inv.id,
        equipId: catalog.equipId,
        equipName: catalog.name,
        scrollItemId: input.scrollItemId,
        fromLevel: currentLevel,
        toLevel: result.destroyed ? -999 : result.newLevel,
        result: result.destroyed ? "fail_destroy" : (result.success ? "success" : "fail_downgrade"),
        successRate: result.successRate,
        createdAt: Date.now(),
      });

      return {
        success: result.success,
        destroyed: result.destroyed,
        fromLevel: currentLevel,
        toLevel: result.destroyed ? -1 : result.newLevel,
        fromColor: ENHANCE_LEVELS[Math.min(currentLevel, 5)].label,
        toColor: result.destroyed ? "消失" : ENHANCE_LEVELS[Math.min(result.newLevel, 5)].label,
        fromColorHex: ENHANCE_LEVELS[Math.min(currentLevel, 5)].colorHex,
        toColorHex: result.destroyed ? "#ef4444" : ENHANCE_LEVELS[Math.min(result.newLevel, 5)].colorHex,
        message: result.message,
        successRate: result.successRate,
        equipName: catalog.name,
      };
    }),

  /** 取得強化歷史記錄 */
  getEnhanceLogs: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const logs = await db.select().from(equipEnhanceLogs)
        .where(eq(equipEnhanceLogs.agentId, agent.id))
        .orderBy(desc(equipEnhanceLogs.createdAt))
        .limit(input.limit);

      return logs;
    }),

  /** 取得所有強化等級資訊（使用動態設定） */
  getEnhanceLevels: protectedProcedure
    .query(async () => {
      const cfg = await getEnhanceConfig();
      return {
        levels: ENHANCE_LEVELS.map(l => ({
          ...l,
          successRate: cfg.rates[l.level] ?? 0,
          statBonus: cfg.statBonus[l.level] ?? 0,
        })),
        safeLevel: cfg.safeLevel,
        maxLevel: cfg.maxLevel,
        destroyChance: cfg.destroyChance,
      };
    }),

  /** 後台讀取強化系統設定 */
  getAdminEnhanceConfig: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const cfg = await getEnhanceConfig();
      return cfg;
    }),

  /** 後台更新強化系統設定 */
  updateAdminEnhanceConfig: protectedProcedure
    .input(z.object({
      safeLevel: z.number().int().min(0).max(5).optional(),
      destroyChance: z.number().min(0).max(1).optional(),
      maxLevel: z.number().int().min(1).max(10).optional(),
      rates: z.record(z.string(), z.number().min(0).max(1)).optional(),
      statBonus: z.record(z.string(), z.number().min(0).max(5)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      const updates: Array<{ key: string; value: string; desc: string }> = [];

      if (input.safeLevel !== undefined) {
        updates.push({ key: "enhance_safe_level", value: String(input.safeLevel), desc: "強化安定值" });
      }
      if (input.destroyChance !== undefined) {
        updates.push({ key: "enhance_destroy_chance", value: String(input.destroyChance), desc: "強化消失機率" });
      }
      if (input.maxLevel !== undefined) {
        updates.push({ key: "enhance_max_level", value: String(input.maxLevel), desc: "最大強化等級" });
      }
      if (input.rates !== undefined) {
        updates.push({ key: "enhance_rates", value: JSON.stringify(input.rates), desc: "各等級強化成功率" });
      }
      if (input.statBonus !== undefined) {
        updates.push({ key: "enhance_stat_bonus", value: JSON.stringify(input.statBonus), desc: "各等級數值加成" });
      }

      for (const u of updates) {
        // upsert: 先查是否存在
        const [existing] = await db.select().from(gameConfig)
          .where(eq(gameConfig.configKey, u.key)).limit(1);
        if (existing) {
          await db.update(gameConfig).set({
            configValue: u.value,
            description: u.desc,
            updatedAt: now,
          }).where(eq(gameConfig.configKey, u.key));
        } else {
          await db.insert(gameConfig).values({
            configKey: u.key,
            configValue: u.value,
            valueType: "string",
            label: u.desc,
            description: u.desc,
            category: "enhance",
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return { success: true, updated: updates.length };
    }),
});
