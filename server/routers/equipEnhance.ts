/**
 * equipEnhance.ts
 * 裝備強化系統 tRPC Router
 *
 * 功能：
 * 1. enhanceEquip — 使用卷軸強化裝備
 * 2. getEnhanceInfo — 取得裝備強化資訊（當前等級、成功率、預覽）
 * 3. getEnhanceLogs — 取得強化歷史記錄
 * 4. getScrollInventory — 取得背包中的強化卷軸
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
} from "../../drizzle/schema";
import {
  performEnhance,
  isScrollApplicable,
  ENHANCE_LEVELS,
  ENHANCE_RATES,
  MAX_ENHANCE_LEVEL,
  SAFE_LEVEL,
  DESTROY_CHANCE,
  ENHANCE_STAT_BONUS,
  type ScrollType,
} from "../services/enhanceEngine";

export const equipEnhanceRouter = router({

  /** 取得裝備強化資訊 */
  getEnhanceInfo: protectedProcedure
    .input(z.object({ inventoryId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 取得背包裝備
      const [inv] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.id, input.inventoryId),
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemType, "equipment"),
        )).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該裝備" });

      // 取得裝備圖鑑資料
      const [catalog] = await db.select().from(gameEquipmentCatalog)
        .where(eq(gameEquipmentCatalog.equipId, inv.itemId)).limit(1);
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "找不到裝備圖鑑資料" });

      const itemData = (inv.itemData as any) ?? {};
      const currentLevel = itemData.enhanceLevel ?? 0;
      const levelInfo = ENHANCE_LEVELS[Math.min(currentLevel, MAX_ENHANCE_LEVEL)];
      const nextRate = ENHANCE_RATES[currentLevel] ?? 0;
      const canEnhance = currentLevel < MAX_ENHANCE_LEVEL;

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
        nextColor: canEnhance ? ENHANCE_LEVELS[currentLevel + 1].color : levelInfo.color,
        nextColorLabel: canEnhance ? ENHANCE_LEVELS[currentLevel + 1].label : levelInfo.label,
        nextColorHex: canEnhance ? ENHANCE_LEVELS[currentLevel + 1].colorHex : levelInfo.colorHex,
        successRate: nextRate,
        isSafe: currentLevel < SAFE_LEVEL,
        canEnhance,
        destroyChance: currentLevel >= SAFE_LEVEL ? DESTROY_CHANCE : 0,
        statBonus: ENHANCE_STAT_BONUS[currentLevel] ?? 0,
        nextStatBonus: canEnhance ? (ENHANCE_STAT_BONUS[currentLevel + 1] ?? 0) : (ENHANCE_STAT_BONUS[currentLevel] ?? 0),
        // 基礎數值
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

      // 查詢背包中 useEffect.type === "enhance_scroll" 的道具
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

  /** 執行強化 */
  enhanceEquip: protectedProcedure
    .input(z.object({
      inventoryId: z.number().int(),
      scrollItemId: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

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
      if (currentLevel >= MAX_ENHANCE_LEVEL) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "裝備已達最高強化等級（+5 紅），無法繼續強化。" });
      }

      // 6. 扣除卷軸
      await db.update(agentInventory)
        .set({
          quantity: sql`${agentInventory.quantity} - 1`,
          updatedAt: Date.now(),
        })
        .where(eq(agentInventory.id, scrollInv.id));

      // 7. 執行強化
      const result = performEnhance(currentLevel);

      // 8. 更新裝備或刪除
      if (result.destroyed) {
        // 裝備消失 — 刪除背包記錄
        await db.delete(agentInventory).where(eq(agentInventory.id, inv.id));
      } else {
        // 更新強化等級
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
        fromColor: ENHANCE_LEVELS[currentLevel].label,
        toColor: result.destroyed ? "消失" : ENHANCE_LEVELS[result.newLevel].label,
        fromColorHex: ENHANCE_LEVELS[currentLevel].colorHex,
        toColorHex: result.destroyed ? "#ef4444" : ENHANCE_LEVELS[result.newLevel].colorHex,
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

  /** 取得所有強化等級資訊（前端顯示用） */
  getEnhanceLevels: protectedProcedure
    .query(() => {
      return {
        levels: ENHANCE_LEVELS.map(l => ({
          ...l,
          successRate: ENHANCE_RATES[l.level] ?? 0,
          statBonus: ENHANCE_STAT_BONUS[l.level] ?? 0,
        })),
        safeLevel: SAFE_LEVEL,
        maxLevel: MAX_ENHANCE_LEVEL,
        destroyChance: DESTROY_CHANCE,
      };
    }),
});
