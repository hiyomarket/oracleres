/**
 * adminConfig.ts
 * 後台管理邏輯計算權限 Router
 *
 * 三大功能：
 * 1. auraEngine 計算規則（各部位權重、加成比例、分數上下限）
 * 2. 自訂手串/配飾資料庫
 * 3. 餐廳分類管理（含搜尋關鍵字、Google Places 類型）
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  auraEngineConfig,
  restaurantCategories,
  customBracelets,
  auraRuleHistory,
} from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";

// ============================================================
// 預設 Aura Engine 計算規則（首次使用時自動初始化）
// ============================================================
export const DEFAULT_AURA_RULES = [
  // --- 各部位計分權重 ---
  { category: "category_weights", configKey: "upper",     configValue: "5", label: "上衣權重",   description: "上衣對 Aura Score 的加分權重（最顯眼，加分最多）", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  { category: "category_weights", configKey: "outer",     configValue: "4", label: "外套權重",   description: "外套/大衣對 Aura Score 的加分權重", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  { category: "category_weights", configKey: "lower",     configValue: "3", label: "下身權重",   description: "褲子/裙子對 Aura Score 的加分權重", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  { category: "category_weights", configKey: "shoes",     configValue: "2", label: "鞋子權重",   description: "鞋子對 Aura Score 的加分權重", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  { category: "category_weights", configKey: "accessory", configValue: "2", label: "配件權重",   description: "配件（帽子/包包等）對 Aura Score 的加分權重", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  { category: "category_weights", configKey: "bracelet",  configValue: "3", label: "手串權重",   description: "手串對 Aura Score 的加分權重", valueType: "number", minValue: "0", maxValue: "10", step: "0.5" },
  // --- 加成比例 ---
  { category: "boost_ratios", configKey: "direct_match",    configValue: "1.0",  label: "直接補益比例",   description: "穿搭顏色直接對應喜用神時的加分比例（1.0 = 100%）", valueType: "number", minValue: "0.1", maxValue: "2.0", step: "0.1" },
  { category: "boost_ratios", configKey: "generates_match", configValue: "0.7",  label: "相生補益比例",   description: "穿搭顏色相生喜用神時的加分比例（0.7 = 70%）", valueType: "number", minValue: "0.1", maxValue: "1.5", step: "0.1" },
  { category: "boost_ratios", configKey: "controls_match",  configValue: "0.5",  label: "制衡加成比例",   description: "穿搭顏色剋制今日過強五行時的加分比例（0.5 = 50%）", valueType: "number", minValue: "0.0", maxValue: "1.5", step: "0.1" },
  // --- 分數上下限 ---
  { category: "score_limits", configKey: "boost_cap",       configValue: "20",   label: "穿搭加成上限",   description: "外在穿搭加成（Outfit Boost）的最高分數", valueType: "number", minValue: "5", maxValue: "40", step: "1" },
  { category: "score_limits", configKey: "innate_min",      configValue: "30",   label: "天命底盤最低分", description: "內在天命底盤（Innate Aura）的最低分數", valueType: "number", minValue: "0", maxValue: "50", step: "1" },
  { category: "score_limits", configKey: "innate_max",      configValue: "90",   label: "天命底盤最高分", description: "內在天命底盤（Innate Aura）的最高分數", valueType: "number", minValue: "50", maxValue: "100", step: "1" },
  // --- 內在天命各維度權重 ---
  { category: "innate_weights", configKey: "natal_weight",   configValue: "30",  label: "本命五行權重",   description: "本命五行對天命底盤的貢獻比例（%）", valueType: "number", minValue: "0", maxValue: "100", step: "5" },
  { category: "innate_weights", configKey: "time_weight",    configValue: "50",  label: "時間五行權重",   description: "今日干支五行對天命底盤的貢獻比例（%）", valueType: "number", minValue: "0", maxValue: "100", step: "5" },
  { category: "innate_weights", configKey: "weather_weight", configValue: "20",  label: "天氣五行權重",   description: "天氣五行調候對天命底盤的貢獻比例（%）", valueType: "number", minValue: "0", maxValue: "100", step: "5" },
];

// 預設餐廳分類（從 NearbyRestaurants.tsx 同步）
export const DEFAULT_RESTAURANT_CATEGORIES = [
  { categoryId: "all",          label: "全部",     emoji: "🍽️", types: '["restaurant"]',              textSuffix: null, sortOrder: 0,  isDefault: 1 },
  { categoryId: "local_snack",  label: "小吃",     emoji: "🥢", types: '["restaurant"]',              textSuffix: "小吃", sortOrder: 1,  isDefault: 1 },
  { categoryId: "brunch",       label: "早午餐",   emoji: "🥞", types: '["breakfast_restaurant"]',    textSuffix: "早午餐", sortOrder: 2,  isDefault: 1 },
  { categoryId: "cafe",         label: "咖啡廳",   emoji: "☕", types: '["cafe"]',                    textSuffix: null, sortOrder: 3,  isDefault: 1 },
  { categoryId: "afternoon_tea",label: "下午茶",   emoji: "🫖", types: '["cafe"]',                    textSuffix: "下午茶", sortOrder: 4,  isDefault: 1 },
  { categoryId: "hotpot",       label: "火鍋",     emoji: "🫕", types: '["restaurant"]',              textSuffix: "火鍋", sortOrder: 5,  isDefault: 1 },
  { categoryId: "bbq",          label: "燒烤",     emoji: "🔥", types: '["restaurant"]',              textSuffix: "燒烤", sortOrder: 6,  isDefault: 1 },
  { categoryId: "sushi",        label: "日式料理", emoji: "🍱", types: '["japanese_restaurant"]',     textSuffix: null, sortOrder: 7,  isDefault: 1 },
  { categoryId: "korean",       label: "韓式料理", emoji: "🥘", types: '["korean_restaurant"]',       textSuffix: null, sortOrder: 8,  isDefault: 1 },
  { categoryId: "chinese",      label: "中式料理", emoji: "🥟", types: '["chinese_restaurant"]',      textSuffix: null, sortOrder: 9,  isDefault: 1 },
  { categoryId: "western",      label: "西式料理", emoji: "🍝", types: '["restaurant"]',              textSuffix: "西式餐廳", sortOrder: 10, isDefault: 1 },
  { categoryId: "noodle",       label: "麵食",     emoji: "🍜", types: '["noodle_restaurant"]',       textSuffix: null, sortOrder: 11, isDefault: 1 },
  { categoryId: "seafood",      label: "海鮮",     emoji: "🦞", types: '["seafood_restaurant"]',      textSuffix: null, sortOrder: 12, isDefault: 1 },
  { categoryId: "dessert",      label: "甜點",     emoji: "🍰", types: '["dessert_restaurant"]',      textSuffix: null, sortOrder: 13, isDefault: 1 },
  { categoryId: "vegetarian",   label: "素食",     emoji: "🥗", types: '["restaurant"]',              textSuffix: "素食餐廳", sortOrder: 14, isDefault: 1 },
  { categoryId: "fast_food",    label: "速食",     emoji: "🍔", types: '["restaurant"]',              textSuffix: "連鎖快餐", sortOrder: 15, isDefault: 1 },
  { categoryId: "bar",          label: "酒吧",     emoji: "🍺", types: '["bar"]',                     textSuffix: null, sortOrder: 16, isDefault: 1 },
  { categoryId: "pet_friendly", label: "寵物友善", emoji: "🐾", types: '["restaurant"]',              textSuffix: "寵物友善餐廳", sortOrder: 17, isDefault: 1 },
];

// 管理員驗證 middleware
function requireAdmin(ctx: { user?: { role?: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
}

// ============================================================
// Helper：確保 aura_engine_config 已初始化
// ============================================================
async function ensureAuraRulesInitialized() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(auraEngineConfig).limit(1);
  if (existing.length > 0) return;
  // 首次初始化
  for (const rule of DEFAULT_AURA_RULES) {
    await db.insert(auraEngineConfig).values(rule).onDuplicateKeyUpdate({ set: { configKey: rule.configKey, configValue: rule.configValue } });
  }
}

// Helper：確保 restaurant_categories 已初始化
async function ensureRestaurantCategoriesInitialized() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(restaurantCategories).limit(1);
  if (existing.length > 0) return;
  for (const cat of DEFAULT_RESTAURANT_CATEGORIES) {
    await db.insert(restaurantCategories).values({
          categoryId: cat.categoryId,
          label: cat.label,
          emoji: cat.emoji,
          types: cat.types,
          textSuffix: cat.textSuffix ?? undefined,
          sortOrder: cat.sortOrder,
          enabled: 1,
          isDefault: cat.isDefault,
        }).onDuplicateKeyUpdate({ set: { label: cat.label, sortOrder: cat.sortOrder } });
  }
}

export const adminConfigRouter = router({

  // ============================================================
  // Aura Engine 計算規則
  // ============================================================

  /** 取得所有計算規則（按分類分組） */
  getAuraRules: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    await ensureAuraRulesInitialized();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rules = await db.select().from(auraEngineConfig).orderBy(asc(auraEngineConfig.category), asc(auraEngineConfig.id));
    // 按 category 分組
    const grouped: Record<string, typeof rules> = {};
    for (const rule of rules) {
      if (!grouped[rule.category]) grouped[rule.category] = [];
      grouped[rule.category].push(rule);
    }
    return grouped;
  }),

  /** 更新單一規則值 */
  updateAuraRule: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      configValue: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(auraEngineConfig)
        .set({ configValue: input.configValue })
        .where(eq(auraEngineConfig.id, input.id));
      return { success: true };
    }),

  /** 重置所有規則為預設值 */
  resetAuraRules: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    for (const rule of DEFAULT_AURA_RULES) {
      await db.update(auraEngineConfig)
        .set({ configValue: rule.configValue })
        .where(eq(auraEngineConfig.configKey, rule.configKey));
    }
    return { success: true, message: "已重置為預設值" };
  }),

  // ============================================================
  // 餐廳分類管理
  // ============================================================

  /** 取得所有餐廳分類（含停用的） */
  getRestaurantCategories: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    await ensureRestaurantCategoriesInitialized();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(restaurantCategories).orderBy(asc(restaurantCategories.sortOrder));
  }),

  /** 取得啟用中的餐廳分類（前台使用） */
  getActiveRestaurantCategories: protectedProcedure.query(async ({ ctx }) => {
    await ensureRestaurantCategoriesInitialized();
    const db = await getDb();
    if (!db) return [];
    const all = await db.select().from(restaurantCategories).orderBy(asc(restaurantCategories.sortOrder));
    return all.filter(c => c.enabled === 1).map(c => ({
      id: c.categoryId,
      label: c.label,
      emoji: c.emoji,
      types: JSON.parse(c.types) as string[],
      textSuffix: c.textSuffix ?? undefined,
    }));
  }),

  /** 新增或更新餐廳分類 */
  upsertRestaurantCategory: protectedProcedure
    .input(z.object({
      id: z.number().int().positive().optional(), // 有 id 則更新，無則新增
      categoryId: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "只允許小寫英文、數字、底線"),
      label: z.string().min(1).max(50),
      emoji: z.string().min(1).max(10),
      types: z.array(z.string()).min(1),
      textSuffix: z.string().max(50).optional(),
      sortOrder: z.number().int().min(0).max(999).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const typesJson = JSON.stringify(input.types);
      if (input.id) {
        // 更新
        await db.update(restaurantCategories).set({
          categoryId: input.categoryId,
          label: input.label,
          emoji: input.emoji,
          types: typesJson,
          textSuffix: input.textSuffix ?? null,
          sortOrder: input.sortOrder ?? 99,
          enabled: input.enabled === false ? 0 : 1,
        }).where(eq(restaurantCategories.id, input.id));
      } else {
        // 新增
        await db.insert(restaurantCategories).values({
          categoryId: input.categoryId,
          label: input.label,
          emoji: input.emoji,
          types: typesJson,
          textSuffix: input.textSuffix ?? undefined,
          sortOrder: input.sortOrder ?? 99,
          enabled: 1,
          isDefault: 0,
        });
      }
      return { success: true };
    }),

  /** 刪除餐廳分類（系統預設不可刪） */
  deleteRestaurantCategory: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [cat] = await db.select().from(restaurantCategories).where(eq(restaurantCategories.id, input.id)).limit(1);
      if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "分類不存在" });
      if (cat.isDefault === 1) throw new TRPCError({ code: "FORBIDDEN", message: "系統預設分類不可刪除" });
      await db.delete(restaurantCategories).where(eq(restaurantCategories.id, input.id));
      return { success: true };
    }),

  /** 切換分類啟用狀態 */
  toggleRestaurantCategory: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(restaurantCategories)
        .set({ enabled: input.enabled ? 1 : 0 })
        .where(eq(restaurantCategories.id, input.id));
      return { success: true };
    }),

  /** 批量更新排序 */
  reorderRestaurantCategories: protectedProcedure
    .input(z.array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int().min(0) })))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const item of input) {
        await db.update(restaurantCategories)
          .set({ sortOrder: item.sortOrder })
          .where(eq(restaurantCategories.id, item.id));
      }
      return { success: true };
    }),

  // ============================================================
  // 自訂手串/配飾管理
  // ============================================================

  /** 取得所有手串（含停用的） */
  getCustomBracelets: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(customBracelets).orderBy(asc(customBracelets.sortOrder), asc(customBracelets.id));
  }),

  /** 取得啟用中的手串（前台使用，合併內建 + 自訂） */
  getActiveBracelets: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const all = await db.select().from(customBracelets).orderBy(asc(customBracelets.sortOrder));
    return all
      .filter(b => b.enabled === 1)
      .map(b => ({
        code: b.code,
        name: b.name,
        element: b.element,
        color: b.color,
        function: b.functionDesc,
        tacticalRoles: (() => {
          try { return JSON.parse(b.tacticalRoles) as Record<string, string>; }
          catch { return {}; }
        })(),
      }));
  }),

  /** 新增或更新手串 */
  upsertCustomBracelet: protectedProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      code: z.string().min(1).max(30),
      name: z.string().min(1).max(100),
      element: z.enum(["木", "火", "土", "金", "水"]),
      color: z.string().min(1).max(100),
      functionDesc: z.string().min(1).max(200),
      tacticalRoles: z.record(z.string(), z.string()).optional(),
      sortOrder: z.number().int().min(0).max(999).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tacticalRolesJson = JSON.stringify(input.tacticalRoles ?? {});
      if (input.id) {
        const [existing] = await db.select().from(customBracelets).where(eq(customBracelets.id, input.id)).limit(1);
        if (existing?.isBuiltin === 1) {
          // 內建手串：只允許更新功能說明、戰術角色、啟用狀態
          await db.update(customBracelets).set({
            functionDesc: input.functionDesc,
            tacticalRoles: tacticalRolesJson,
            enabled: input.enabled === false ? 0 : 1,
          }).where(eq(customBracelets.id, input.id));
        } else {
          await db.update(customBracelets).set({
            code: input.code,
            name: input.name,
            element: input.element,
            color: input.color,
            functionDesc: input.functionDesc,
            tacticalRoles: tacticalRolesJson,
            sortOrder: input.sortOrder ?? 99,
            enabled: input.enabled === false ? 0 : 1,
          }).where(eq(customBracelets.id, input.id));
        }
      } else {
        await db.insert(customBracelets).values({
          code: input.code,
          name: input.name,
          element: input.element,
          color: input.color,
          functionDesc: input.functionDesc,
          tacticalRoles: tacticalRolesJson,
          sortOrder: input.sortOrder ?? 99,
          enabled: 1,
          isBuiltin: 0,
        });
      }
      return { success: true };
    }),

  /** 刪除手串（內建不可刪） */
  deleteCustomBracelet: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [b] = await db.select().from(customBracelets).where(eq(customBracelets.id, input.id)).limit(1);
      if (!b) throw new TRPCError({ code: "NOT_FOUND", message: "手串不存在" });
      if (b.isBuiltin === 1) throw new TRPCError({ code: "FORBIDDEN", message: "系統內建手串不可刪除" });
      await db.delete(customBracelets).where(eq(customBracelets.id, input.id));
      return { success: true };
    }),

  /** 切換手串啟用狀態 */
  toggleCustomBracelet: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(customBracelets)
        .set({ enabled: input.enabled ? 1 : 0 })
        .where(eq(customBracelets.id, input.id));
      return { success: true };
    }),

  /** 同步內建手串到 DB（首次或重置時使用） */
  syncBuiltinBracelets: protectedProcedure.mutation(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // 動態 import 內建手串資料
    const { BRACELET_DB } = await import("../lib/wuxingEngine");
    let synced = 0;
    for (let i = 0; i < BRACELET_DB.length; i++) {
      const b = BRACELET_DB[i];
      const existing = await db.select().from(customBracelets).where(eq(customBracelets.code, b.code)).limit(1);
      if (existing.length === 0) {
        await db.insert(customBracelets).values({
          code: b.code,
          name: b.name,
          element: b.element,
          color: b.color,
          functionDesc: b.function,
          tacticalRoles: JSON.stringify(b.tacticalRoles),
          sortOrder: i,
          enabled: 1,
          isBuiltin: 1,
        });
        synced++;
      }
    }
    return { success: true, synced, message: `已同步 ${synced} 個內建手串` };
  }),

  /** 更新手串建議搭配清單 */
  updateBraceletPairing: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      pairingItems: z.array(z.string()).max(10),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(customBracelets)
        .set({ pairingItems: JSON.stringify(input.pairingItems) })
        .where(eq(customBracelets.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // Aura Engine 規則歷史快照
  // ============================================================

  /** 建立当前規則快照 */
  snapshotAuraRules: protectedProcedure
    .input(z.object({ label: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 取得目前所有規則
      const rules = await db.select().from(auraEngineConfig).orderBy(asc(auraEngineConfig.id));
      await db.insert(auraRuleHistory).values({
        snapshotLabel: input.label,
        snapshotData: JSON.stringify(rules),
        createdBy: ctx.user?.openId ?? "admin",
      });
      return { success: true, message: `快照「${input.label}」建立成功` };
    }),

  /** 取得歷史快照列表（最新 20 筆） */
  getAuraRuleHistory: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const history = await db.select({
      id: auraRuleHistory.id,
      snapshotLabel: auraRuleHistory.snapshotLabel,
      createdBy: auraRuleHistory.createdBy,
      createdAt: auraRuleHistory.createdAt,
    }).from(auraRuleHistory)
      .orderBy(desc(auraRuleHistory.createdAt))
      .limit(20);
    return history;
  }),

  /** 還原指定快照的規則值 */
  restoreAuraRuleSnapshot: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [snapshot] = await db.select().from(auraRuleHistory).where(eq(auraRuleHistory.id, input.id)).limit(1);
      if (!snapshot) throw new TRPCError({ code: "NOT_FOUND", message: "快照不存在" });
      const rules = JSON.parse(snapshot.snapshotData) as Array<{ id: number; configValue: string }>;
      for (const rule of rules) {
        await db.update(auraEngineConfig)
          .set({ configValue: rule.configValue })
          .where(eq(auraEngineConfig.id, rule.id));
      }
      return { success: true, message: `已還原到「${snapshot.snapshotLabel}」` };
    }),

  /** 刪除快照 */
  deleteAuraRuleSnapshot: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(auraRuleHistory).where(eq(auraRuleHistory.id, input.id));
      return { success: true };
    }),

  // ============================================================
  // 餐廳分類時段設定
  // ============================================================

  /** 更新分類時段設定 */
  updateCategorySchedule: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      scheduleEnabled: z.boolean(),
      scheduleStartHour: z.number().int().min(0).max(23),
      scheduleEndHour: z.number().int().min(0).max(23),
    }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(restaurantCategories).set({
        scheduleEnabled: input.scheduleEnabled ? 1 : 0,
        scheduleStartHour: input.scheduleStartHour,
        scheduleEndHour: input.scheduleEndHour,
      }).where(eq(restaurantCategories.id, input.id));
      return { success: true };
    }),

  /** 取得當前時段有效的餐廳分類（前台使用） */
  getScheduledActiveCategories: protectedProcedure.query(async ({ ctx }) => {
    await ensureRestaurantCategoriesInitialized();
    const db = await getDb();
    if (!db) return [];
    const all = await db.select().from(restaurantCategories).orderBy(asc(restaurantCategories.sortOrder));
    const currentHour = new Date().getHours();
    return all
      .filter(c => {
        if (c.enabled !== 1) return false;
        if (c.scheduleEnabled !== 1) return true; // 未開啟時段控制，常時顯示
        // 跨日時段（例：22-04）
        if (c.scheduleStartHour > c.scheduleEndHour) {
          return currentHour >= c.scheduleStartHour || currentHour <= c.scheduleEndHour;
        }
        return currentHour >= c.scheduleStartHour && currentHour <= c.scheduleEndHour;
      })
      .map(c => ({
        id: c.categoryId,
        label: c.label,
        emoji: c.emoji,
        types: JSON.parse(c.types) as string[],
        textSuffix: c.textSuffix ?? undefined,
      }));
  }),
});
