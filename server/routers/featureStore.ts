/**
 * 功能兌換中心 Router
 * 處理積分兌換、付費訂單、衝突檢查、管理員審核等
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  featurePlans,
  featureRedemptions,
  purchaseOrders,
  userSubscriptions,
  planModules,
  modules,
  users,
  pointsTransactions,
} from "../../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyUser } from "../lib/notifyUser";

/** 取得用戶訂閱中的 customModules */
async function getUserCustomModules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));
  return (sub?.customModules as Array<{ module_id: string; expires_at: string | null }>) ?? [];
}

/** 取得用戶方案包含的模塊 ID 列表 */
async function getPlanModuleIds(planId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ moduleId: planModules.moduleId })
    .from(planModules)
    .where(eq(planModules.planId, planId));
  return rows.map((r: { moduleId: string }) => r.moduleId);
}

/** 延長或新增 customModule 到期時間（累加） */
async function extendModuleAccess(
  userId: number,
  moduleId: string,
  durationDays: number
): Promise<{ previousExpiresAt: Date | null; newExpiresAt: Date }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const customModules = await getUserCustomModules(userId);
  const existing = customModules.find((m) => m.module_id === moduleId);

  const base = existing?.expires_at ? new Date(existing.expires_at) : new Date();
  const now = new Date();
  const startFrom = base > now ? base : now;
  const newExpiresAt = new Date(startFrom.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const previousExpiresAt = existing?.expires_at ? new Date(existing.expires_at) : null;

  const updated = existing
    ? customModules.map((m) =>
        m.module_id === moduleId ? { ...m, expires_at: newExpiresAt.toISOString() } : m
      )
    : [...customModules, { module_id: moduleId, expires_at: newExpiresAt.toISOString() }];

  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (sub) {
    await db
      .update(userSubscriptions)
      .set({ customModules: updated })
      .where(eq(userSubscriptions.userId, userId));
  } else {
    await db.insert(userSubscriptions).values({ userId, customModules: updated });
  }

  return { previousExpiresAt, newExpiresAt };
}

export const featureStoreRouter = router({
  /** 取得所有啟用的功能方案（含模塊資訊） */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    type FeaturePlanRow = typeof featurePlans.$inferSelect;
    type ModuleRow = typeof modules.$inferSelect;

    const plans: FeaturePlanRow[] = await db
      .select()
      .from(featurePlans)
      .where(eq(featurePlans.isActive, 1))
      .orderBy(featurePlans.sortOrder);

    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
    const customModules = await getUserCustomModules(ctx.user.id);
    const planModuleIds = user?.planId ? await getPlanModuleIds(user.planId) : [];

    const moduleIds: string[] = Array.from(new Set(plans.map((p: FeaturePlanRow) => p.moduleId)));
    const moduleRows: ModuleRow[] = moduleIds.length
      ? await db.select().from(modules).where(inArray(modules.id, moduleIds))
      : [];
    const moduleMap: Record<string, ModuleRow> = Object.fromEntries(
      moduleRows.map((m: ModuleRow) => [m.id, m])
    );

    return plans.map((plan: FeaturePlanRow) => {
      const mod = moduleMap[plan.moduleId];
      const customEntry = customModules.find((m) => m.module_id === plan.moduleId);
      const includedInPlan = planModuleIds.includes(plan.moduleId);
      const expiresAt = customEntry?.expires_at ?? null;
      const isActive = includedInPlan || (expiresAt ? new Date(expiresAt) > new Date() : false);
      return {
        ...plan,
        module: mod ?? null,
        userStatus: {
          includedInPlan,
          expiresAt,
          isActive,
          currentPoints: user?.pointsBalance ?? 0,
        },
      };
    });
  }),

  /** 衝突檢查：回傳衝突類型與說明 */
  checkConflict: protectedProcedure
    .input(z.object({ moduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
      const customModules = await getUserCustomModules(ctx.user.id);
      const planModuleIds = user?.planId ? await getPlanModuleIds(user.planId) : [];

      const includedInPlan = planModuleIds.includes(input.moduleId);
      const customEntry = customModules.find((m) => m.module_id === input.moduleId);
      const hasActiveCustom = customEntry?.expires_at
        ? new Date(customEntry.expires_at) > new Date()
        : false;

      if (includedInPlan && hasActiveCustom) {
        return {
          hasConflict: true,
          type: "plan_and_custom" as const,
          message: "您目前的方案已包含此功能，且您也有單獨購買的有效期限。兌換後將累加到期時間。",
          expiresAt: customEntry?.expires_at ?? null,
        };
      } else if (includedInPlan) {
        return {
          hasConflict: true,
          type: "included_in_plan" as const,
          message: "您目前的方案已包含此功能。您仍可兌換以延長到期保障，但方案有效期間內無需額外購買。",
          expiresAt: null,
        };
      } else if (hasActiveCustom) {
        return {
          hasConflict: true,
          type: "already_active" as const,
          message: `此功能目前仍在有效期內（到期：${new Date(customEntry!.expires_at!).toLocaleDateString("zh-TW")}）。兌換後將累加到期時間。`,
          expiresAt: customEntry?.expires_at ?? null,
        };
      }

      return { hasConflict: false, type: "none" as const, message: "", expiresAt: null };
    }),

  /** 積分兌換功能 */
  redeem: protectedProcedure
    .input(
      z.object({
        featurePlanId: z.string(),
        durationDays: z.union([z.literal(3), z.literal(7), z.literal(15), z.literal(30)]),
        confirmedConflict: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [plan] = await db
        .select()
        .from(featurePlans)
        .where(and(eq(featurePlans.id, input.featurePlanId), eq(featurePlans.isActive, 1)));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此功能方案" });
      if (!plan.allowPointsRedemption)
        throw new TRPCError({ code: "FORBIDDEN", message: "此功能不支援積分兌換" });

      const pointsCost =
        input.durationDays === 3
          ? plan.points3Days
          : input.durationDays === 7
          ? plan.points7Days
          : input.durationDays === 15
          ? plan.points15Days
          : plan.points30Days;

      if (!pointsCost || pointsCost <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此時長未設定積分價格" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
      if (user.pointsBalance < pointsCost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `積分不足，需要 ${pointsCost} 點，目前餘額 ${user.pointsBalance} 點`,
        });
      }

      const { previousExpiresAt, newExpiresAt } = await extendModuleAccess(
        ctx.user.id,
        plan.moduleId,
        input.durationDays
      );

      await db
        .update(users)
        .set({ pointsBalance: user.pointsBalance - pointsCost })
        .where(eq(users.id, ctx.user.id));

      await db.insert(pointsTransactions).values({
        userId: ctx.user.id,
        amount: -pointsCost,
        type: "feature_redemption",
        description: `兌換【${plan.name}】${input.durationDays}天`,
      });

      await db.insert(featureRedemptions).values({
        userId: ctx.user.id,
        featurePlanId: plan.id,
        moduleId: plan.moduleId,
        durationDays: input.durationDays,
        pointsSpent: pointsCost,
        source: "points",
        previousExpiresAt: previousExpiresAt ?? undefined,
        newExpiresAt,
      });

      await notifyUser({
        userId: String(ctx.user.id),
        type: "reward",
        title: `✅ 功能兌換成功`,
        content: `【${plan.name}】已成功兌換 ${input.durationDays} 天，到期日：${newExpiresAt.toLocaleDateString("zh-TW")}`,
        linkUrl: "/feature-store",
      });

      return {
        success: true,
        moduleId: plan.moduleId,
        durationDays: input.durationDays,
        pointsSpent: pointsCost,
        newExpiresAt: newExpiresAt.toISOString(),
        remainingPoints: user.pointsBalance - pointsCost,
      };
    }),

  /** 建立付費訂單（填入商城訂單號） */
  createOrder: protectedProcedure
    .input(
      z.object({
        featurePlanId: z.string(),
        durationDays: z.union([z.literal(15), z.literal(30)]),
        externalOrderId: z.string().min(1, "請填入訂單號").max(200),
        userNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [plan] = await db
        .select()
        .from(featurePlans)
        .where(and(eq(featurePlans.id, input.featurePlanId), eq(featurePlans.isActive, 1)));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此功能方案" });
      if (!plan.allowPurchase)
        throw new TRPCError({ code: "FORBIDDEN", message: "此功能不支援付費購買" });

      await db.insert(purchaseOrders).values({
        userId: ctx.user.id,
        featurePlanId: plan.id,
        moduleId: plan.moduleId,
        durationDays: input.durationDays,
        externalOrderId: input.externalOrderId,
        userNote: input.userNote,
        status: "pending",
      });

      await notifyUser({
        userId: String(ctx.user.id),
        type: "system",
        title: `📋 訂單已提交，等待審核`,
        content: `【${plan.name}】${input.durationDays}天購買訂單已收到，訂單號：${input.externalOrderId}，我們將盡快審核。`,
        linkUrl: "/feature-store",
      });

      return { success: true };
    }),

  /** 取得用戶的兌換紀錄與訂單 */
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { redemptions: [], orders: [] };
    type RedemptionRow = typeof featureRedemptions.$inferSelect;
    type OrderRow = typeof purchaseOrders.$inferSelect;

    const redemptions: RedemptionRow[] = await db
      .select()
      .from(featureRedemptions)
      .where(eq(featureRedemptions.userId, ctx.user.id))
      .orderBy(desc(featureRedemptions.createdAt))
      .limit(50);

    const orders: OrderRow[] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.userId, ctx.user.id))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(50);

    const planIds: string[] = Array.from(
      new Set([
        ...redemptions.map((r: RedemptionRow) => r.featurePlanId),
        ...orders.map((o: OrderRow) => o.featurePlanId),
      ])
    );
    const planRows = planIds.length
      ? await db.select().from(featurePlans).where(inArray(featurePlans.id, planIds))
      : ([] as Array<{ id: string; name: string }>);
    const planMap: Record<string, string> = Object.fromEntries(
      planRows.map((p: { id: string; name: string }) => [p.id, p.name])
    );

    return {
      redemptions: redemptions.map((r: RedemptionRow) => ({
        ...r,
        planName: planMap[r.featurePlanId] ?? r.featurePlanId,
      })),
      orders: orders.map((o: OrderRow) => ({
        ...o,
        planName: planMap[o.featurePlanId] ?? o.featurePlanId,
      })),
    };
  }),

  // ==================== 管理員 API ====================

  /** 管理員：取得所有功能方案（含停用） */
  adminListPlans: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(featurePlans).orderBy(featurePlans.sortOrder);
  }),

  /** 管理員：新增或更新功能方案 */
  adminUpsertPlan: adminProcedure
    .input(
      z.object({
        id: z.string().min(1).max(50),
        moduleId: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        points3Days: z.number().int().min(0).nullable().optional(),
        points7Days: z.number().int().min(0).nullable().optional(),
        points15Days: z.number().int().min(0).nullable().optional(),
        points30Days: z.number().int().min(0).nullable().optional(),
        shopUrl: z.string().url().nullable().optional(),
        allowPointsRedemption: z.boolean().default(true),
        allowPurchase: z.boolean().default(true),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db
        .select()
        .from(featurePlans)
        .where(eq(featurePlans.id, input.id));

      const data = {
        moduleId: input.moduleId,
        name: input.name,
        description: input.description ?? null,
        points3Days: input.points3Days ?? null,
        points7Days: input.points7Days ?? null,
        points15Days: input.points15Days ?? null,
        points30Days: input.points30Days ?? null,
        shopUrl: input.shopUrl ?? null,
        allowPointsRedemption: input.allowPointsRedemption ? 1 : 0,
        allowPurchase: input.allowPurchase ? 1 : 0,
        isActive: input.isActive ? 1 : 0,
        sortOrder: input.sortOrder,
      };

      if (existing.length > 0) {
        await db.update(featurePlans).set(data).where(eq(featurePlans.id, input.id));
      } else {
        await db.insert(featurePlans).values({ id: input.id, ...data });
      }

      return { success: true };
    }),

  /** 管理員：刪除功能方案 */
  adminDeletePlan: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(featurePlans).where(eq(featurePlans.id, input.id));
      return { success: true };
    }),

  /** 管理員：取得待審核訂單列表 */
  adminListOrders: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows =
        input.status === "all"
          ? await db
              .select()
              .from(purchaseOrders)
              .orderBy(desc(purchaseOrders.createdAt))
              .limit(100)
          : await db
              .select()
              .from(purchaseOrders)
              .where(eq(purchaseOrders.status, input.status))
              .orderBy(desc(purchaseOrders.createdAt))
              .limit(100);

      type OrderRow = typeof purchaseOrders.$inferSelect;
      const userIds: number[] = Array.from(
        new Set(rows.map((r: OrderRow) => r.userId))
      );
      const userRows =
        userIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name })
              .from(users)
              .where(inArray(users.id, userIds))
          : ([] as Array<{ id: number; name: string | null }>);
      const userMap: Record<number, string | null> = Object.fromEntries(
        userRows.map((u: { id: number; name: string | null }) => [u.id, u.name])
      );

      const planIds: string[] = Array.from(
        new Set(rows.map((r: OrderRow) => r.featurePlanId))
      );
      const planRows =
        planIds.length > 0
          ? await db
              .select()
              .from(featurePlans)
              .where(inArray(featurePlans.id, planIds))
          : ([] as Array<{ id: string; name: string }>);
      const planMap: Record<string, string> = Object.fromEntries(
        planRows.map((p: { id: string; name: string }) => [p.id, p.name])
      );

      return rows.map((r: OrderRow) => ({
        ...r,
        userName: userMap[r.userId] ?? `用戶#${r.userId}`,
        planName: planMap[r.featurePlanId] ?? r.featurePlanId,
      }));
    }),

  /** 管理員：審核訂單（核發或拒絕） */
  adminReviewOrder: adminProcedure
    .input(
      z.object({
        orderId: z.number().int(),
        action: z.enum(["approve", "reject"]),
        rejectReason: z.string().max(300).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.orderId));

      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此訂單" });
      if (order.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此訂單已審核過" });
      }

      if (input.action === "approve") {
        const { newExpiresAt, previousExpiresAt } = await extendModuleAccess(
          order.userId,
          order.moduleId,
          order.durationDays
        );

        await db.insert(featureRedemptions).values({
          userId: order.userId,
          featurePlanId: order.featurePlanId,
          moduleId: order.moduleId,
          durationDays: order.durationDays,
          pointsSpent: 0,
          source: "purchase",
          previousExpiresAt: previousExpiresAt ?? undefined,
          newExpiresAt,
          note: `訂單號：${order.externalOrderId}`,
        });

        await db
          .update(purchaseOrders)
          .set({ status: "approved", reviewedAt: new Date(), reviewedBy: ctx.user.id })
          .where(eq(purchaseOrders.id, input.orderId));

        await notifyUser({
          userId: String(order.userId),
          type: "reward",
          title: `🎉 訂單審核通過`,
          content: `您的購買訂單（訂單號：${order.externalOrderId}）已審核通過，功能已延長 ${order.durationDays} 天，到期日：${newExpiresAt.toLocaleDateString("zh-TW")}`,
          linkUrl: "/feature-store",
        });

        return { success: true, newExpiresAt: newExpiresAt.toISOString() };
      } else {
        await db
          .update(purchaseOrders)
          .set({
            status: "rejected",
            rejectReason: input.rejectReason ?? "訂單資訊有誤，請重新提交",
            reviewedAt: new Date(),
            reviewedBy: ctx.user.id,
          })
          .where(eq(purchaseOrders.id, input.orderId));

        await notifyUser({
          userId: String(order.userId),
          type: "system",
          title: `❌ 訂單審核未通過`,
          content: `您的購買訂單（訂單號：${order.externalOrderId}）審核未通過。原因：${input.rejectReason ?? "訂單資訊有誤，請重新提交"}`,
          linkUrl: "/feature-store",
        });

        return { success: true };
      }
    }),

  /** 管理員：手動核發天數 */
  adminGrantDays: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        featurePlanId: z.string(),
        durationDays: z.number().int().min(1).max(365),
        note: z.string().max(300).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [plan] = await db
        .select()
        .from(featurePlans)
        .where(eq(featurePlans.id, input.featurePlanId));

      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此功能方案" });

      const { newExpiresAt, previousExpiresAt } = await extendModuleAccess(
        input.userId,
        plan.moduleId,
        input.durationDays
      );

      await db.insert(featureRedemptions).values({
        userId: input.userId,
        featurePlanId: plan.id,
        moduleId: plan.moduleId,
        durationDays: input.durationDays,
        pointsSpent: 0,
        source: "admin",
        previousExpiresAt: previousExpiresAt ?? undefined,
        newExpiresAt,
        note: input.note ?? `管理員手動核發`,
      });

      await notifyUser({
        userId: String(input.userId),
        type: "reward",
        title: `🎁 管理員已核發功能天數`,
        content: `【${plan.name}】已延長 ${input.durationDays} 天，到期日：${newExpiresAt.toLocaleDateString("zh-TW")}`,
        linkUrl: "/feature-store",
      });

      return { success: true, newExpiresAt: newExpiresAt.toISOString() };
    }),
});
