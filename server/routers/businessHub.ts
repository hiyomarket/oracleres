/**
 * 商業中心 Router（鳳凰計畫）
 * 提供管理員對 modules / plans / plan_modules / campaigns 的 CRUD 操作
 * 以及 assignSubscription、redemptionCodes、redeemCode 等完整商業邏輯
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, viewerProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { randomBytes } from "crypto";
import {
  modules,
  plans,
  planModules,
  campaigns,
  userSubscriptions,
  subscriptionLogs,
  redemptionCodes,
  users,
  pointsTransactions,
} from "../../drizzle/schema";
import { eq, asc, desc, and, ne } from "drizzle-orm";
import { hasAccess } from "../PermissionService";

// Admin guard middleware (write operations only)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// Viewer procedure alias (admin + viewer can read)
const adminViewerProcedure = viewerProcedure;

export const businessHubRouter = router({
  // ─── Modules ────────────────────────────────────────────────────────────

  /**
   * 前台導航 API：返回當前用戶可見的模塊列表（依 sort_order 排序）
   * 每個模塊包含 hasAccess 判斷用戶是否有權限
   */
  getVisibleNav: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allModules = await db
      .select()
      .from(modules)
      .where(eq(modules.isActive, 1))
      .orderBy(asc(modules.sortOrder));
    // 對每個模塊檢查權限：取第一個 containedFeature 作為代表
    const result = await Promise.all(
      allModules.map(async (m) => {
        const features = m.containedFeatures as string[];
        // admin 永遠有權限
        if (ctx.user.role === "admin") {
          return { ...m, hasAccess: true };
        }
        if (features.length === 0) {
          return { ...m, hasAccess: true };
        }
        // 檢查第一個 feature（代表模塊主要入口權限）
        const access = await hasAccess(ctx.user.id, features[0]);
        return { ...m, hasAccess: access.hasAccess };
      })
    );
    return result;
  }),

  /** 取得所有功能模塊 */
  listModules: adminViewerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(modules).orderBy(asc(modules.sortOrder));
  }),

  /** 新增功能模塊 */
  createModule: adminProcedure
    .input(
      z.object({
        id: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        icon: z.string().max(10).optional(),
        category: z.enum(["core", "addon"]),
        sortOrder: z.number().int().default(0),
        containedFeatures: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(modules).values({ ...input, isActive: 1 });
      return { success: true };
    }),

  /** 更新功能模塊 */
  updateModule: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        icon: z.string().max(10).optional(),
        category: z.enum(["core", "addon"]).optional(),
        sortOrder: z.number().int().optional(),
        containedFeatures: z.array(z.string()).optional(),
        isActive: z.number().int().min(0).max(1).optional(),
        navPath: z.string().max(100).optional(),
        isCentral: z.number().int().min(0).max(1).optional(),
        parentId: z.string().max(50).nullable().optional(),
        displayLocation: z.enum(["main", "profile", "both"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(modules).set(data).where(eq(modules.id, id));
      return { success: true };
    }),

  /** 批量更新模塊排序 */
  reorderModules: adminProcedure
    .input(z.array(z.object({ id: z.string(), sortOrder: z.number().int() })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const item of input) {
        await db.update(modules).set({ sortOrder: item.sortOrder }).where(eq(modules.id, item.id));
      }
      return { success: true };
    }),

  /** 刪除功能模塊（軟刪除：isActive=0） */
  deleteModule: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(modules).set({ isActive: 0 }).where(eq(modules.id, input.id));
      return { success: true };
    }),

  // ─── Plans ──────────────────────────────────────────────────────────────

  /** 取得所有方案（含各方案包含的模塊） */
  listPlans: adminViewerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const allPlans = await db.select().from(plans).orderBy(asc(plans.level));
    const allPlanModules = await db.select().from(planModules);
    const allModules = await db.select().from(modules).where(eq(modules.isActive, 1));
    return allPlans.map((plan) => {
      const moduleIds = allPlanModules.filter((pm) => pm.planId === plan.id).map((pm) => pm.moduleId);
      const includedModules = allModules.filter((m) => moduleIds.includes(m.id));
      return { ...plan, modules: includedModules };
    });
  }),

  /** 新增方案 */
  createPlan: adminProcedure
    .input(
      z.object({
        id: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/),
        level: z.number().int().min(1),
        description: z.string().optional(),
        bonusPoints: z.number().int().min(0).default(0),
        firstSubscriptionBonusCoins: z.number().int().min(0).default(0),
        monthlyRenewalBonusCoins: z.number().int().min(0).default(0),
        moduleIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { moduleIds, ...planData } = input;
      await db.insert(plans).values({ ...planData, isActive: 1 });
      for (const moduleId of moduleIds) {
        await db.insert(planModules).values({ planId: input.id, moduleId }).catch(() => {});
      }
      return { success: true };
    }),

  /** 更新方案（含模塊重新關聯） */
  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        level: z.number().int().min(1).optional(),
        description: z.string().optional(),
        isActive: z.number().int().min(0).max(1).optional(),
        bonusPoints: z.number().int().min(0).optional(),
        firstSubscriptionBonusCoins: z.number().int().min(0).optional(),
        monthlyRenewalBonusCoins: z.number().int().min(0).optional(),
        moduleIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, moduleIds, ...planData } = input;
      if (Object.keys(planData).length > 0) {
        await db.update(plans).set(planData).where(eq(plans.id, id));
      }
      if (moduleIds !== undefined) {
        await db.delete(planModules).where(eq(planModules.planId, id));
        for (const moduleId of moduleIds) {
          await db.insert(planModules).values({ planId: id, moduleId }).catch(() => {});
        }
      }
      return { success: true };
    }),

  // ─── Campaigns ──────────────────────────────────────────────────────────

  /** 取得所有行銷活動 */
  listCampaigns: adminViewerProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }),

  /** 新增行銷活動 */
  createCampaign: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        startDate: z.string(),
        endDate: z.string(),
        ruleType: z.enum(["discount", "giveaway", "plan_assign"]),
        ruleTarget: z.object({
          target_type: z.string(),
          target_id: z.string().optional(),
        }),
        ruleValue: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { startDate: sd, endDate: ed, ...rest } = input;
      await db.insert(campaigns).values({
        ...rest,
        startDate: new Date(sd),
        endDate: new Date(ed),
        isActive: 1,
      });
      return { success: true };
    }),

  /** 更新行銷活動 */
  updateCampaign: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(200).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        isActive: z.number().int().min(0).max(1).optional(),
        ruleType: z.enum(["discount", "giveaway", "plan_assign"]).optional(),
        ruleTarget: z.object({ target_type: z.string(), target_id: z.string().optional() }).optional(),
        ruleValue: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, startDate, endDate, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (startDate) updateData.startDate = new Date(startDate);
      if (endDate) updateData.endDate = new Date(endDate);
      await db.update(campaigns).set(updateData).where(eq(campaigns.id, id));
      return { success: true };
    }),

  /** 刪除行銷活動（軟刪除） */
  deleteCampaign: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(campaigns).set({ isActive: 0 }).where(eq(campaigns.id, input.id));
      return { success: true };
    }),

  // ─── User Subscriptions ─────────────────────────────────────────────────

  /** 取得用戶訂閱資訊 */
  getUserSubscription: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, input.userId));
      return sub ?? null;
    }),

  /**
   * 完整指派訂閱（鳳凰計畫核心 API）
   * 支援：指派主方案 + 追加自訂模塊 + 寫入審計日誌 + 同步 users 表
   */
  assignSubscription: adminProcedure
    .input(z.object({
      userId: z.number().int(),
      planId: z.string().nullable(),
      planExpiresAt: z.string().nullable(),
      customModules: z.array(z.object({
        module_id: z.string(),
        expires_at: z.string().nullable(),
      })).optional().default([]),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const expiresAt = input.planExpiresAt ? new Date(input.planExpiresAt) : null;
      const [existing] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, input.userId));
      if (existing) {
        await db.update(userSubscriptions)
          .set({ planId: input.planId, planExpiresAt: expiresAt, customModules: input.customModules })
          .where(eq(userSubscriptions.userId, input.userId));
      } else {
        await db.insert(userSubscriptions).values({
          userId: input.userId,
          planId: input.planId,
          planExpiresAt: expiresAt,
          customModules: input.customModules,
        });
      }
      // 同步 users 表（讓前端 ctx.user 能立即反映）
      await db.update(users)
        .set({ planId: input.planId ?? "basic", planExpiresAt: expiresAt })
        .where(eq(users.id, input.userId));
      // 寫入審計日誌
      await db.insert(subscriptionLogs).values({
        operatorId: ctx.user.id,
        targetUserId: input.userId,
        action: "assign",
        details: {
          planId: input.planId,
          expiresAt: input.planExpiresAt,
          customModules: input.customModules,
          note: input.note,
        },
      });
      // 如果方案有設定 bonusPoints，自動贈送積分
      if (input.planId) {
        const [planData] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
        if (planData && planData.bonusPoints > 0) {
          // 讀取當前積分後更新
          const [currentUser] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, input.userId));
          const newBalance = (currentUser?.pointsBalance ?? 0) + planData.bonusPoints;
          await db.update(users).set({ pointsBalance: newBalance }).where(eq(users.id, input.userId));
          await db.insert(pointsTransactions).values({
            userId: input.userId,
            type: "admin_grant",
            amount: planData.bonusPoints,
            description: `訂閱方案「${planData.name}」贈送積分`,
          });
        }
      }
      return { success: true };
    }),

  /** 查看訂閱審計日誌 */
  listSubscriptionLogs: adminViewerProcedure
    .input(z.object({
      targetUserId: z.number().int().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db.select().from(subscriptionLogs);
      const rows = input.targetUserId
        ? await query.where(eq(subscriptionLogs.targetUserId, input.targetUserId)).orderBy(desc(subscriptionLogs.createdAt)).limit(input.limit)
        : await query.orderBy(desc(subscriptionLogs.createdAt)).limit(input.limit);
      return rows;
    }),

  // ─── Redemption Codes ───────────────────────────────────────────────────

  /** 為指定行銷活動產生一批兌換碼 */
  generateRedemptionCodes: adminProcedure
    .input(z.object({
      campaignId: z.number().int(),
      prefix: z.string().max(20).default(""),
      count: z.number().int().min(1).max(100).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const codes: string[] = [];
      for (let i = 0; i < input.count; i++) {
        const suffix = randomBytes(3).toString("hex").toUpperCase();
        const code = input.prefix ? `${input.prefix.toUpperCase()}-${suffix}` : suffix;
        codes.push(code);
      }
      await db.insert(redemptionCodes).values(codes.map(code => ({ campaignId: input.campaignId, code })));
      return { success: true, codes };
    }),

  /** 列出某行銷活動的所有兌換碼 */
  listRedemptionCodes: adminViewerProcedure
    .input(z.object({ campaignId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(redemptionCodes)
        .where(eq(redemptionCodes.campaignId, input.campaignId))
        .orderBy(desc(redemptionCodes.createdAt));
    }),

  /** 作廢兌換碼 */
  voidRedemptionCode: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(redemptionCodes).set({ isVoided: 1 }).where(eq(redemptionCodes.id, input.id));
      return { success: true };
    }),

  // ─── User: Redeem Code (前台) ────────────────────────────────────────────

  /**
   * 用戶兌換碼（protectedProcedure，非 admin）
   * 兌換成功後根據行銷活動規則給予對應權益：
   * - giveaway：追加 customModules
   * - discount：存入 users.availableDiscounts
   */
  redeemCode: protectedProcedure
    .input(z.object({ code: z.string().trim() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date();
      const upperCode = input.code.toUpperCase();
      // 1. 查找兌換碼
      const [rc] = await db.select().from(redemptionCodes)
        .where(eq(redemptionCodes.code, upperCode))
        .limit(1);
      if (!rc) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此兌換碼" });
      if (rc.isVoided) throw new TRPCError({ code: "BAD_REQUEST", message: "此兌換碼已作廢" });
      if (rc.isUsed) throw new TRPCError({ code: "BAD_REQUEST", message: "此兌換碼已被使用" });
      // 2. 查找對應行銷活動
      const [campaign] = await db.select().from(campaigns)
        .where(eq(campaigns.id, rc.campaignId))
        .limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "找不到對應活動" });
      if (!campaign.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "此活動已結束" });
      if (campaign.endDate && campaign.endDate < now)
        throw new TRPCError({ code: "BAD_REQUEST", message: "此活動已過期" });
      // 3. 標記兌換碼已使用
      await db.update(redemptionCodes)
        .set({ isUsed: 1, usedBy: ctx.user.id, usedAt: now })
        .where(eq(redemptionCodes.id, rc.id));
      // 4. 根據規則給予權益
      const ruleType = campaign.ruleType;
      const ruleValue = campaign.ruleValue as Record<string, unknown>;
      let reward = "";
      if (ruleType === "giveaway") {
        const moduleId = ruleValue.giveaway_module_id as string;
        const expiresAt = (ruleValue.expires_at as string | null) ?? null;
        const [sub] = await db.select().from(userSubscriptions)
          .where(eq(userSubscriptions.userId, ctx.user.id));
        const existingCustom = (sub?.customModules as Array<{ module_id: string; expires_at: string | null }> ?? []);
        const already = existingCustom.find(m => m.module_id === moduleId);
        if (!already) {
          const newCustom = [...existingCustom, { module_id: moduleId, expires_at: expiresAt }];
          if (sub) {
            await db.update(userSubscriptions)
              .set({ customModules: newCustom })
              .where(eq(userSubscriptions.userId, ctx.user.id));
          } else {
            await db.insert(userSubscriptions).values({ userId: ctx.user.id, customModules: newCustom });
          }
        }
        reward = `已解鎖模塊：${moduleId}`;
      } else if (ruleType === "discount") {
        const discountPct = ruleValue.discount_percentage as number;
        const expiresAt = (ruleValue.expires_at as string | null) ?? null;
        const [u] = await db.select().from(users).where(eq(users.id, ctx.user.id));
        const existing = (u?.availableDiscounts ?? []) as Array<{ campaign_id: number; discount_percentage?: number; expires_at: string | null }>;
        const newDiscounts = [...existing, { campaign_id: campaign.id, discount_percentage: discountPct, expires_at: expiresAt }];
        await db.update(users).set({ availableDiscounts: newDiscounts }).where(eq(users.id, ctx.user.id));
        reward = `已獲得 ${Math.round((1 - discountPct) * 100)}% 折扣券`;
      }
      return { success: true, reward, campaignName: campaign.name };
    }),

  /** 批量指派訂閱方案（多選用戶同時指派） */
  batchAssignSubscription: adminProcedure
    .input(z.object({
      userIds: z.array(z.number().int()).min(1).max(100),
      planId: z.string().nullable(),
      planExpiresAt: z.string().nullable(),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const expiresAt = input.planExpiresAt ? new Date(input.planExpiresAt) : null;
      let successCount = 0;
      for (const userId of input.userIds) {
        const [existing] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
        if (existing) {
          await db.update(userSubscriptions)
            .set({ planId: input.planId, planExpiresAt: expiresAt })
            .where(eq(userSubscriptions.userId, userId));
        } else {
          await db.insert(userSubscriptions).values({
            userId,
            planId: input.planId,
            planExpiresAt: expiresAt,
            customModules: [],
          });
        }
        await db.update(users)
          .set({ planId: input.planId ?? "basic", planExpiresAt: expiresAt })
          .where(eq(users.id, userId));
        await db.insert(subscriptionLogs).values({
          operatorId: ctx.user.id,
          targetUserId: userId,
          action: "batch_assign",
          details: { planId: input.planId, expiresAt: input.planExpiresAt, note: input.note },
        });
        successCount++;
      }
      return { success: true, count: successCount };
    }),

  /**
   * 設定指定行銷活動為默認迎新活動
   * 同時清除其他活動的 isDefaultOnboarding，確保唯一性
   */
  setDefaultOnboarding: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 先清除所有其他活動的 isDefaultOnboarding
      await db.update(campaigns)
        .set({ isDefaultOnboarding: 0 })
        .where(ne(campaigns.id, input.id));
      // 設定目標活動為默認迎新
      await db.update(campaigns)
        .set({ isDefaultOnboarding: 1 })
        .where(eq(campaigns.id, input.id));
      return { success: true };
    }),

  /**
   * 取消默認迎新活動設定
   */
  clearDefaultOnboarding: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(campaigns)
        .set({ isDefaultOnboarding: 0 })
        .where(eq(campaigns.id, input.id));
      return { success: true };
    }),
});
