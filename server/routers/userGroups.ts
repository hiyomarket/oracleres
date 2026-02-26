/**
 * userGroups.ts
 * 客群分組管理後端 API
 * - 建立/更新/刪除分組
 * - 新增/移除分組成員
 * - 批量調整分組成員的方案/積分/到期日
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import {
  userGroups,
  userGroupMembers,
  users,
  userProfiles,
  userSubscriptions,
  subscriptionLogs,
  pointsTransactions,
} from "../../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

function isOwner(openId: string, role?: string | null): boolean {
  if (role === "admin") return true;
  return ENV.ownerOpenId !== "" && openId === ENV.ownerOpenId;
}

function requireAdmin(openId: string, role?: string | null) {
  if (!isOwner(openId, role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "僅管理員可執行此操作" });
  }
}

export const userGroupsRouter = router({
  /**
   * 取得所有分組（含成員數量）
   */
  listGroups: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.openId, ctx.user.role);
    const db = await getDb();
    if (!db) return [];
    const groups = await db.select().from(userGroups).orderBy(desc(userGroups.createdAt));
    // 取得每個分組的成員數量
    const memberCounts = await db
      .select({
        groupId: userGroupMembers.groupId,
        count: sql<number>`COUNT(*)`,
      })
      .from(userGroupMembers)
      .groupBy(userGroupMembers.groupId);
    const countMap = new Map(memberCounts.map(r => [r.groupId, Number(r.count)]));
    return groups.map(g => ({ ...g, memberCount: countMap.get(g.id) ?? 0 }));
  }),

  /**
   * 取得分組詳情（含成員列表）
   */
  getGroup: protectedProcedure
    .input(z.object({ groupId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) return null;
      const [group] = await db.select().from(userGroups).where(eq(userGroups.id, input.groupId)).limit(1);
      if (!group) return null;
      // 取得成員列表
      const members = await db
        .select({
          memberId: userGroupMembers.id,
          userId: userGroupMembers.userId,
          note: userGroupMembers.note,
          joinedAt: userGroupMembers.createdAt,
          name: users.name,
          email: users.email,
          planId: users.planId,
          planExpiresAt: users.planExpiresAt,
          pointsBalance: users.pointsBalance,
          role: users.role,
          lastSignedIn: users.lastSignedIn,
        })
        .from(userGroupMembers)
        .innerJoin(users, eq(users.id, userGroupMembers.userId))
        .where(eq(userGroupMembers.groupId, input.groupId))
        .orderBy(desc(userGroupMembers.createdAt));
      // 取得成員的命格資料（生命靈數）
      const userIds = members.map(m => m.userId);
      let profileMap = new Map<number, { lifePathNumber: number | null }>();
      if (userIds.length > 0) {
        const profiles = await db
          .select({ userId: userProfiles.userId, lifePathNumber: userProfiles.lifePathNumber })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, userIds));
        profileMap = new Map(profiles.map(p => [p.userId, { lifePathNumber: p.lifePathNumber }]));
      }
      return {
        ...group,
        members: members.map(m => ({
          ...m,
          lifePathNumber: profileMap.get(m.userId)?.lifePathNumber ?? null,
        })),
      };
    }),

  /**
   * 建立新分組
   */
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      color: z.string().max(30).optional(),
      icon: z.string().max(10).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(userGroups).values({
        name: input.name,
        description: input.description,
        color: input.color ?? "amber",
        icon: input.icon ?? "👥",
        createdBy: ctx.user.id,
      });
      return { id: Number((result as any)[0]?.insertId), name: input.name };
    }),

  /**
   * 更新分組資訊
   */
  updateGroup: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().max(30).optional(),
      icon: z.string().max(10).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { groupId, ...updateData } = input;
      await db.update(userGroups).set(updateData).where(eq(userGroups.id, groupId));
      return { success: true };
    }),

  /**
   * 刪除分組（同時刪除所有成員關聯）
   */
  deleteGroup: protectedProcedure
    .input(z.object({ groupId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(userGroupMembers).where(eq(userGroupMembers.groupId, input.groupId));
      await db.delete(userGroups).where(eq(userGroups.id, input.groupId));
      return { success: true };
    }),

  /**
   * 新增成員到分組
   */
  addMember: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      userId: z.number().int(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      try {
        await db.insert(userGroupMembers).values({
          groupId: input.groupId,
          userId: input.userId,
          note: input.note,
          addedBy: ctx.user.id,
        });
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === 'ER_DUP_ENTRY') {
          throw new TRPCError({ code: "CONFLICT", message: "此用戶已在分組中" });
        }
        throw e;
      }
      return { success: true };
    }),

  /**
   * 批量新增成員到分組
   */
  addMembers: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      userIds: z.array(z.number().int()).min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let added = 0;
      for (const userId of input.userIds) {
        try {
          await db.insert(userGroupMembers).values({
            groupId: input.groupId,
            userId,
            addedBy: ctx.user.id,
          });
          added++;
        } catch (e: unknown) {
          const err = e as { code?: string };
          if (err.code !== 'ER_DUP_ENTRY') throw e;
        }
      }
      return { added };
    }),

  /**
   * 從分組移除成員
   */
  removeMember: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      userId: z.number().int(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(userGroupMembers).where(
        and(
          eq(userGroupMembers.groupId, input.groupId),
          eq(userGroupMembers.userId, input.userId)
        )
      );
      return { success: true };
    }),

  /**
   * 批量調整分組成員的方案
   */
  batchUpdatePlan: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      planId: z.string().max(50),
      planExpiresAt: z.string().nullable().optional(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 取得分組所有成員
      const members = await db
        .select({ userId: userGroupMembers.userId })
        .from(userGroupMembers)
        .where(eq(userGroupMembers.groupId, input.groupId));
      if (members.length === 0) return { count: 0 };
      const userIds = members.map(m => m.userId);
      const expiresAt = input.planExpiresAt ? new Date(input.planExpiresAt) : null;
      // 批量更新方案
      await db.update(users)
        .set({ planId: input.planId, planExpiresAt: expiresAt })
        .where(inArray(users.id, userIds));
      // 記錄訂閱日誌
      for (const userId of userIds) {
        await db.insert(subscriptionLogs).values({
          operatorId: ctx.user.id,
          targetUserId: userId,
          action: "assign_plan",
          details: {
            planId: input.planId,
            planExpiresAt: input.planExpiresAt,
            note: input.note ?? `分組批量指派（分組 #${input.groupId}）`,
          },
        });
      }
      return { count: userIds.length };
    }),

  /**
   * 批量調整分組成員的積分
   */
  batchAdjustPoints: protectedProcedure
    .input(z.object({
      groupId: z.number().int(),
      amount: z.number().int().min(-100000).max(100000),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      requireAdmin(ctx.user.openId, ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const members = await db
        .select({ userId: userGroupMembers.userId })
        .from(userGroupMembers)
        .where(eq(userGroupMembers.groupId, input.groupId));
      if (members.length === 0) return { count: 0 };
      const userIds = members.map(m => m.userId);
      // 批量更新積分
      for (const userId of userIds) {
        await db.update(users)
          .set({ pointsBalance: sql`GREATEST(0, pointsBalance + ${input.amount})` })
          .where(eq(users.id, userId));
        await db.insert(pointsTransactions).values({
          userId,
          amount: input.amount,
          type: input.amount >= 0 ? 'admin_grant' : 'admin_deduct',
          description: input.reason ?? `分組批量積分調整（分組 #${input.groupId}）`,
        });
      }
      return { count: userIds.length };
    }),
});
