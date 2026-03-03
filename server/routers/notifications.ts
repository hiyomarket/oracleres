/**
 * notifications.ts
 * 用戶個人通知 Router
 * - getMyNotifications：取得我的通知列表（分頁）
 * - getUnreadCount：取得未讀通知數量
 * - markAsRead：標記單則通知為已讀
 * - markAllRead：全部標記為已讀
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { userNotifications } from "../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = router({
  /**
   * 取得我的通知列表
   */
  getMyNotifications: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
      unreadOnly: z.boolean().optional().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      const conditions = [eq(userNotifications.userId, ctx.user.openId)];
      if (input.unreadOnly) {
        conditions.push(eq(userNotifications.isRead, 0));
      }

      const rows = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows.map(r => ({
        ...r,
        isRead: r.isRead === 1,
      }));
    }),

  /**
   * 取得未讀通知數量
   */
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };

      const [result] = await db
        .select({ count: count() })
        .from(userNotifications)
        .where(and(
          eq(userNotifications.userId, ctx.user.openId),
          eq(userNotifications.isRead, 0)
        ));

      return { count: result?.count ?? 0 };
    }),

  /**
   * 標記單則通知為已讀
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      await db
        .update(userNotifications)
        .set({ isRead: 1 })
        .where(and(
          eq(userNotifications.id, input.id),
          eq(userNotifications.userId, ctx.user.openId)
        ));

      return { success: true };
    }),

  /**
   * 全部標記為已讀
   */
  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      await db
        .update(userNotifications)
        .set({ isRead: 1 })
        .where(and(
          eq(userNotifications.userId, ctx.user.openId),
          eq(userNotifications.isRead, 0)
        ));

      return { success: true };
    }),
});
