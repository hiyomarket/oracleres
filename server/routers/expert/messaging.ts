/**
 * Expert Router - 訊息與聊天管理
 */
import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  experts, bookings, users, privateMessages, teamMessages,
} from "../../../drizzle/schema";
import { eq, and, asc, lte, ne, gte, sql, not } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../../storage";

export const expertMessagingRouter = router({

  /** 取得某訂單的聊天訊息 */
  getMessages: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({ userId: bookings.userId, expertId: bookings.expertId })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const [expertRecord] = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);
      const isParticipant =
        booking.userId === ctx.user.id ||
        (expertRecord && booking.expertId === expertRecord.id);
      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });
      // 自動標記對方發給我的訊息為已讀
      await db
        .update(privateMessages)
        .set({ isRead: 1, readAt: new Date() })
        .where(
          and(
            eq(privateMessages.bookingId, input.bookingId),
            not(eq(privateMessages.senderId, ctx.user.id)),
            eq(privateMessages.isRead, 0)
          )
        );
      return db
        .select({
          id: privateMessages.id,
          senderId: privateMessages.senderId,
          content: privateMessages.content,
          imageUrl: privateMessages.imageUrl,
          createdAt: privateMessages.createdAt,
          senderName: users.name,
          isRead: privateMessages.isRead,
          readAt: privateMessages.readAt,
        })
        .from(privateMessages)
        .leftJoin(users, eq(privateMessages.senderId, users.id))
        .where(eq(privateMessages.bookingId, input.bookingId))
        .orderBy(asc(privateMessages.createdAt));
    }),

  /** 發送訊息 */
  sendMessage: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        content: z.string().min(1).max(2000),
        imageUrl: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({ userId: bookings.userId, expertId: bookings.expertId, status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status === "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已取消的訂單無法發送訊息" });
      }
      const [expertRecord] = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);
      const isParticipant =
        booking.userId === ctx.user.id ||
        (expertRecord && booking.expertId === expertRecord.id);
      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });
      await db.insert(privateMessages).values({
        bookingId: input.bookingId,
        senderId: ctx.user.id,
        content: input.content,
        imageUrl: input.imageUrl,
      });
      return { success: true };
    }),

  /** 上傳聊天圖片 */
  uploadChatImage: protectedProcedure
    .input(z.object({
      bookingId: z.number().int(),
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({ userId: bookings.userId, expertId: bookings.expertId, status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "已取消的訂單無法發送圖片" });
      const [expertRecord] = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);
      const isParticipant = booking.userId === ctx.user.id || (expertRecord && booking.expertId === expertRecord.id);
      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });
      const buffer = Buffer.from(input.imageBase64, "base64");
      if (buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "圖片大小不得超過 5MB" });
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `chat-images/${input.bookingId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.insert(privateMessages).values({
        bookingId: input.bookingId,
        senderId: ctx.user.id,
        content: "🖼️ 圖片訊息",
        imageUrl: url,
      });
      return { url, success: true };
    }),

  /** 標記訂單訊息已讀 */
  markMessagesRead: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({ userId: bookings.userId, expertId: bookings.expertId })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(privateMessages)
        .set({ isRead: 1, readAt: new Date() })
        .where(
          and(
            eq(privateMessages.bookingId, input.bookingId),
            eq(privateMessages.isRead, 0),
            ne(privateMessages.senderId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  /** 取得訂單未讀訊息數量 */
  getUnreadMessageCount: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(privateMessages)
        .where(
          and(
            eq(privateMessages.bookingId, input.bookingId),
            eq(privateMessages.isRead, 0),
            ne(privateMessages.senderId, ctx.user.id)
          )
        );
      return { count: result?.count ?? 0 };
    }),

  // ── 天命管理團隊傳訊功能 ──

  /** 用戶：發送訊息給天命管理團隊 */
  sendTeamMessage: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .delete(teamMessages)
        .where(
          and(
            eq(teamMessages.userId, ctx.user.id),
            lte(teamMessages.expiresAt, new Date())
          )
        );
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await db.insert(teamMessages).values({
        userId: ctx.user.id,
        content: input.content,
        direction: "user_to_team",
        expiresAt,
      });
      return { success: true };
    }),

  /** 用戶：取得自己與團隊的對話記錄 */
  getTeamConversation: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    await db.delete(teamMessages).where(lte(teamMessages.expiresAt, new Date()));
    const msgs = await db
      .select()
      .from(teamMessages)
      .where(eq(teamMessages.userId, ctx.user.id))
      .orderBy(asc(teamMessages.createdAt));
    return msgs;
  }),

  /** 用戶：標記團隊回覆已讀 */
  markTeamMessagesRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = (await getDb())!;
    await db
      .update(teamMessages)
      .set({ isRead: 1, readAt: new Date() })
      .where(
        and(
          eq(teamMessages.userId, ctx.user.id),
          eq(teamMessages.direction, "team_to_user"),
          eq(teamMessages.isRead, 0)
        )
      );
    return { success: true };
  }),

  /** 用戶：取得未讀的團隊回覆數量 */
  getUnreadTeamReplyCount: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMessages)
      .where(
        and(
          eq(teamMessages.userId, ctx.user.id),
          eq(teamMessages.direction, "team_to_user"),
          eq(teamMessages.isRead, 0),
          gte(teamMessages.expiresAt, new Date())
        )
      );
    return { count: result?.count ?? 0 };
  }),
});
