/**
 * 商業中心 Router（鳳凰計畫）
 * 提供管理員對 modules / plans / plan_modules / campaigns 的 CRUD 操作
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  modules,
  plans,
  planModules,
  campaigns,
  userSubscriptions,
} from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

export const businessHubRouter = router({
  // ─── Modules ────────────────────────────────────────────────────────────

  /** 取得所有功能模塊 */
  listModules: adminProcedure.query(async () => {
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
      await db.insert(modules).values({
        ...input,
        isActive: 1,
      });
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
        await db
          .update(modules)
          .set({ sortOrder: item.sortOrder })
          .where(eq(modules.id, item.id));
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
  listPlans: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allPlans = await db.select().from(plans).orderBy(asc(plans.level));
    const allPlanModules = await db.select().from(planModules);
    const allModules = await db.select().from(modules).where(eq(modules.isActive, 1));

    return allPlans.map((plan) => {
      const moduleIds = allPlanModules
        .filter((pm) => pm.planId === plan.id)
        .map((pm) => pm.moduleId);
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
        moduleIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { moduleIds, ...planData } = input;
      await db.insert(plans).values({ ...planData, isActive: 1 });

      // 建立方案-模塊關聯
      for (const moduleId of moduleIds) {
        await db
          .insert(planModules)
          .values({ planId: input.id, moduleId })
          .catch(() => {}); // ignore duplicate
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

      // 重新設定模塊關聯
      if (moduleIds !== undefined) {
        await db.delete(planModules).where(eq(planModules.planId, id));
        for (const moduleId of moduleIds) {
          await db
            .insert(planModules)
            .values({ planId: id, moduleId })
            .catch(() => {});
        }
      }
      return { success: true };
    }),

  // ─── Campaigns ──────────────────────────────────────────────────────────

  /** 取得所有行銷活動 */
  listCampaigns: adminProcedure.query(async () => {
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
        ruleType: z.enum(["discount", "giveaway"]),
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
        ruleType: z.enum(["discount", "giveaway"]).optional(),
        ruleTarget: z
          .object({ target_type: z.string(), target_id: z.string().optional() })
          .optional(),
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
      const [sub] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, input.userId));
      return sub ?? null;
    }),

  /** 設定用戶訂閱方案 */
  setUserPlan: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        planId: z.string().nullable(),
        planExpiresAt: z.string().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const expiresAt = input.planExpiresAt ? new Date(input.planExpiresAt) : null;

      const [existing] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, input.userId));

      if (existing) {
        await db
          .update(userSubscriptions)
          .set({ planId: input.planId, planExpiresAt: expiresAt })
          .where(eq(userSubscriptions.userId, input.userId));
      } else {
        await db.insert(userSubscriptions).values({
          userId: input.userId,
          planId: input.planId,
          planExpiresAt: expiresAt,
        });
      }
      return { success: true };
    }),
});
