/**
 * equipEnhance.ts
 * 裝備強化系統 tRPC Router（天堂模式 +0 到 +20）
 *
 * 功能：
 * 1. enhanceEquip — 使用卷軸強化裝備（四種卷軸）
 * 2. getEnhanceInfo — 取得裝備強化資訊（含五行抗性預覽）
 * 3. getEnhanceLogs — 取得強化歷史記錄
 * 4. getScrollInventory — 取得背包中的強化卷軸
 * 5. getEnhanceLevels — 取得所有強化等級資訊
 * 6. getAdminEnhanceConfig — 後台讀取強化設定
 * 7. updateAdminEnhanceConfig — 後台更新強化設定
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
  isBlessedScroll,
  getSafeLevel,
  getEnhanceLevelInfo,
  getEnhancedBonusPreview,
  ENHANCE_LEVELS,
  ENHANCE_SUCCESS_RATES,
  DESTROY_RATES,
  ENHANCE_STAT_BONUS,
  MAX_ENHANCE_LEVEL,
  type ScrollType,
  type EnhanceConfig,
} from "../services/enhanceEngine";

export const equipEnhanceRouter = router({

  /** 取得裝備強化資訊（含五行抗性預覽） */
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
      const levelInfo = getEnhanceLevelInfo(currentLevel);
      const safeLevel = getSafeLevel(catalog.slot);
      const nextRate = cfg.successRates[currentLevel] ?? 0;
      const destroyRate = cfg.destroyRates[currentLevel] ?? 0;
      const canEnhance = currentLevel < cfg.maxLevel;

      // 強化後加成預覽（含五行抗性）
      const currentPreview = getEnhancedBonusPreview(catalog, currentLevel);
      const nextPreview = canEnhance ? getEnhancedBonusPreview(catalog, currentLevel + 1) : currentPreview;

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
        nextColor: canEnhance ? getEnhanceLevelInfo(currentLevel + 1).color : levelInfo.color,
        nextColorLabel: canEnhance ? getEnhanceLevelInfo(currentLevel + 1).label : levelInfo.label,
        nextColorHex: canEnhance ? getEnhanceLevelInfo(currentLevel + 1).colorHex : levelInfo.colorHex,
        successRate: nextRate,
        isSafe: currentLevel < safeLevel,
        safeLevel,
        canEnhance,
        destroyRate: currentLevel >= safeLevel ? destroyRate : 0,
        statBonus: cfg.statBonus[currentLevel] ?? 0,
        nextStatBonus: canEnhance ? (cfg.statBonus[currentLevel + 1] ?? 0) : (cfg.statBonus[currentLevel] ?? 0),
        currentPreview,
        nextPreview,
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
        isBlessed: isBlessedScroll(((s.useEffect as any)?.scrollType ?? "weapon_scroll") as ScrollType),
        description: (s.useEffect as any)?.description ?? "",
      }));
    }),

  /** 執行強化（天堂模式：爆裝或閃光失敗，黃卷爆裝率減半且成功 +1~+3） */
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
        const scrollLabelMap: Record<ScrollType, string> = {
          weapon_scroll: "武器強化卷軸（白武卷）",
          blessed_weapon_scroll: "祝福的武器強化卷軸（黃武卷）",
          armor_scroll: "防具飾品強化卷軸（白防卷）",
          blessed_armor_scroll: "祝福的防具飾品強化卷軸（黃防卷）",
        };
        const slotLabel = ["weapon", "offhand"].includes(catalog.slot) ? "武器" : "防具/飾品";
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${scrollLabelMap[scrollType] ?? scrollType}不能用於${slotLabel}類裝備「${catalog.name}」。`,
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

      // 7. 執行強化（天堂模式）
      const result = performEnhanceWithConfig(currentLevel, scrollType, catalog.slot, cfg);

      // 8. 更新裝備或刪除（爆裝）
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
      const logResult = result.destroyed ? "fail_destroy" : (result.success ? "success" : "fail_flash");
      await db.insert(equipEnhanceLogs).values({
        agentId: agent.id,
        inventoryId: inv.id,
        equipId: catalog.equipId,
        equipName: catalog.name,
        scrollItemId: input.scrollItemId,
        fromLevel: currentLevel,
        toLevel: result.destroyed ? -999 : result.newLevel,
        result: logResult,
        successRate: result.successRate,
        createdAt: Date.now(),
      });

      const fromInfo = getEnhanceLevelInfo(currentLevel);
      const toInfo = result.destroyed ? null : getEnhanceLevelInfo(result.newLevel);

      return {
        success: result.success,
        destroyed: result.destroyed,
        flashEffect: result.flashEffect,
        bonusLevels: result.bonusLevels,
        fromLevel: currentLevel,
        toLevel: result.destroyed ? -1 : result.newLevel,
        fromColor: fromInfo.label,
        toColor: result.destroyed ? "消失" : (toInfo?.label ?? fromInfo.label),
        fromColorHex: fromInfo.colorHex,
        toColorHex: result.destroyed ? "#ef4444" : (toInfo?.colorHex ?? fromInfo.colorHex),
        message: result.message,
        successRate: result.successRate,
        destroyRate: result.destroyRate,
        equipName: catalog.name,
        isBlessed: isBlessedScroll(scrollType),
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
          successRate: cfg.successRates[l.level] ?? 0,
          destroyRate: cfg.destroyRates[l.level] ?? 0,
          statBonus: cfg.statBonus[l.level] ?? 0,
        })),
        maxLevel: cfg.maxLevel,
      };
    }),

  /** 後台讀取強化系統設定 */
  getAdminEnhanceConfig: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const cfg = await getEnhanceConfig();
      return {
        ...cfg,
        defaultSuccessRates: ENHANCE_SUCCESS_RATES,
        defaultDestroyRates: DESTROY_RATES,
        defaultStatBonus: ENHANCE_STAT_BONUS,
        maxEnhanceLevel: MAX_ENHANCE_LEVEL,
      };
    }),

  /** 後台更新強化系統設定 */
  updateAdminEnhanceConfig: protectedProcedure
    .input(z.object({
      maxLevel: z.number().int().min(1).max(20).optional(),
      successRates: z.record(z.string(), z.number().min(0).max(1)).optional(),
      destroyRates: z.record(z.string(), z.number().min(0).max(1)).optional(),
      statBonus: z.record(z.string(), z.number().min(0).max(10)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      const updates: Array<{ key: string; value: string; desc: string }> = [];

      if (input.maxLevel !== undefined) {
        updates.push({ key: "enhance_max_level", value: String(input.maxLevel), desc: "最大強化等級" });
      }
      if (input.successRates !== undefined) {
        updates.push({ key: "enhance_success_rates", value: JSON.stringify(input.successRates), desc: "各等級強化成功率" });
      }
      if (input.destroyRates !== undefined) {
        updates.push({ key: "enhance_destroy_rates", value: JSON.stringify(input.destroyRates), desc: "各等級爆裝率" });
      }
      if (input.statBonus !== undefined) {
        updates.push({ key: "enhance_stat_bonus", value: JSON.stringify(input.statBonus), desc: "各等級數值加成" });
      }

      for (const u of updates) {
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

  /** 取得裝備完整強化路線預覽（+0 ~ +20 每級的屬性加成） */
  getFullEnhancePreview: protectedProcedure
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

      const currentLevel = ((inv.itemData as any) ?? {}).enhanceLevel ?? 0;
      const safeLevel = getSafeLevel(catalog.slot);

      const levels = [];
      for (let i = 0; i <= cfg.maxLevel; i++) {
        const preview = getEnhancedBonusPreview(catalog, i);
        const levelInfo = getEnhanceLevelInfo(i);
        levels.push({
          level: i,
          color: levelInfo.color,
          colorLabel: levelInfo.label,
          colorHex: levelInfo.colorHex,
          successRate: i === 0 ? 1 : (cfg.successRates[i - 1] ?? 0),
          destroyRate: (i - 1) >= safeLevel ? (cfg.destroyRates[i - 1] ?? 0) : 0,
          isSafe: i <= safeLevel,
          isCurrent: i === currentLevel,
          ...preview,
        });
      }

      return {
        equipName: catalog.name,
        slot: catalog.slot,
        currentLevel,
        safeLevel,
        levels,
      };
    }),
});
