/**
 * Expert Router - 管理員控管
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure, adminProcedure, viewerProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  experts, expertServices, bookings, users, expertApplications, systemSettings, teamMessages,
} from "../../../drizzle/schema";
import { eq, and, desc, asc, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";



export const expertAdminRouter = router({

  /** 管理員：取得所有專家列表（含待審核） */
  adminListExperts: viewerProcedure
    .input(
      z.object({
        status: z.enum(["active", "inactive", "pending_review", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(experts.status, input.status));
      }
      return db
        .select({
          id: experts.id,
          userId: experts.userId,
          publicName: experts.publicName,
          title: experts.title,
          status: experts.status,
          ratingAvg: experts.ratingAvg,
          ratingCount: experts.ratingCount,
          createdAt: experts.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(experts)
        .leftJoin(users, eq(experts.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(experts.createdAt));
    }),

  /** 管理員：審核專家（更改狀態） */
  adminUpdateExpertStatus: adminProcedure
    .input(
      z.object({
        expertId: z.number().int(),
        status: z.enum(["active", "inactive", "pending_review"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db
        .update(experts)
        .set({ status: input.status })
        .where(eq(experts.id, input.expertId));
      return { success: true };
    }),

  /** 管理員：將用戶設為專家角色（同時建立 expert 記錄） */
  adminGrantExpertRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        publicName: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const userRow = await db
        .select({ openId: users.openId })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      await db
        .update(users)
        .set({ role: "expert" })
        .where(eq(users.id, input.userId));
      const existing = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, input.userId))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(experts).values({
          userId: input.userId,
          publicName: input.publicName,
          status: "active",
        });
      }
      if (userRow.length > 0) {
        const { notifyUser } = await import("../../lib/notifyUser");
        await notifyUser({
          userId: userRow[0].openId,
          type: "system",
          title: "🌟 恭喜您成為天命聯盟命理師",
          content: `您已獲得命理師資格，公開名稱為「${input.publicName}」。請前往專家後台完成個人品牌設定，讓用戶能夠找到您並預約服務。`,
          linkUrl: "/expert/dashboard",
        }).catch(() => {});
      }
      return { success: true };
    }),

  /** 管理員：撤銷專家角色 */
  adminRevokeExpertRole: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(users).set({ role: "user" }).where(eq(users.id, input.userId));
      await db.update(experts).set({ status: "inactive" }).where(eq(experts.userId, input.userId));
      return { success: true };
    }),

  /** 管理員：更新專家公開名稱與基本資料 */
  adminUpdateExpertProfile: adminProcedure
    .input(
      z.object({
        expertId: z.number().int(),
        publicName: z.string().min(1).max(100),
        title: z.string().max(200).optional(),
        tags: z.array(z.string()).optional(),
        specialties: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const updateData: Record<string, unknown> = { publicName: input.publicName };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.specialties !== undefined) updateData.specialties = input.specialties;
      await db.update(experts).set(updateData).where(eq(experts.id, input.expertId));
      return { success: true };
    }),

  /** 管理員：取得所有訂單（全平台） */
  adminListAllBookings: viewerProcedure
    .input(
      z.object({
        status: z.enum(["pending_payment", "confirmed", "completed", "cancelled", "all"]).default("all"),
        limit: z.number().int().min(1).max(100).default(30),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(bookings.status, input.status));
      }
      return db
        .select({
          id: bookings.id,
          status: bookings.status,
          bookingTime: bookings.bookingTime,
          paymentProofUrl: bookings.paymentProofUrl,
          createdAt: bookings.createdAt,
          userName: users.name,
          expertName: experts.publicName,
          serviceTitle: expertServices.title,
          servicePrice: expertServices.price,
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .leftJoin(experts, eq(bookings.expertId, experts.id))
        .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(bookings.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** 管理員：更新訂單狀態 */
  adminUpdateBookingStatus: adminProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        status: z.enum(["confirmed", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.bookingId));
      return { success: true };
    }),

  // ── 命理師申請流程 ──

  /** 用戶：申請成為命理師 */
  applyForExpert: protectedProcedure
    .input(
      z.object({
        publicName: z.string().min(1).max(100),
        motivation: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      if (ctx.user.role === "expert" || ctx.user.role === "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "您已是命理師身份，無需申請" });
      }
      const pending = await db
        .select({ id: expertApplications.id })
        .from(expertApplications)
        .where(and(eq(expertApplications.userId, ctx.user.id), eq(expertApplications.status, "pending")))
        .limit(1);
      if (pending.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "您已有待審核的申請，請耐心等候管理員審核" });
      }
      await db.insert(expertApplications).values({
        userId: ctx.user.id,
        publicName: input.publicName,
        motivation: input.motivation,
        status: "pending",
      });
      return { success: true };
    }),

  /** 用戶：查詢自己的申請狀態 */
  getMyApplication: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const [app] = await db
      .select()
      .from(expertApplications)
      .where(eq(expertApplications.userId, ctx.user.id))
      .orderBy(desc(expertApplications.createdAt))
      .limit(1);
    return app ?? null;
  }),

  /** 管理員：取得所有申請列表 */
  adminListApplications: viewerProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [];
      if (input.status !== "all") {
        conditions.push(eq(expertApplications.status, input.status));
      }
      return db
        .select({
          id: expertApplications.id,
          userId: expertApplications.userId,
          publicName: expertApplications.publicName,
          motivation: expertApplications.motivation,
          status: expertApplications.status,
          adminNote: expertApplications.adminNote,
          createdAt: expertApplications.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(expertApplications)
        .leftJoin(users, eq(expertApplications.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(expertApplications.createdAt));
    }),

  /** 管理員：審核申請（核准/拒絕） */
  adminReviewApplication: adminProcedure
    .input(
      z.object({
        applicationId: z.number().int(),
        action: z.enum(["approve", "reject"]),
        adminNote: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [app] = await db
        .select()
        .from(expertApplications)
        .where(eq(expertApplications.id, input.applicationId))
        .limit(1);
      if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "申請不存在" });
      const newStatus = input.action === "approve" ? "approved" : "rejected";
      await db
        .update(expertApplications)
        .set({ status: newStatus, adminNote: input.adminNote })
        .where(eq(expertApplications.id, input.applicationId));
      if (input.action === "approve") {
        const userRow = await db
          .select({ openId: users.openId })
          .from(users)
          .where(eq(users.id, app.userId))
          .limit(1);
        await db.update(users).set({ role: "expert" }).where(eq(users.id, app.userId));
        const existing = await db
          .select({ id: experts.id })
          .from(experts)
          .where(eq(experts.userId, app.userId))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(experts).values({
            userId: app.userId,
            publicName: app.publicName,
            status: "active",
          });
        }
        if (userRow.length > 0) {
          const { notifyUser } = await import("../../lib/notifyUser");
          await notifyUser({
            userId: userRow[0].openId,
            type: "system",
            title: "🌟 恭喜！您的命理師申請已通過",
            content: `您申請成為命理師的請求已獲核准，公開名稱為「${app.publicName}」。請前往專家後台完成個人品牌設定。`,
            linkUrl: "/expert/dashboard",
          }).catch(() => {});
        }
      } else {
        const userRow = await db
          .select({ openId: users.openId })
          .from(users)
          .where(eq(users.id, app.userId))
          .limit(1);
        if (userRow.length > 0) {
          const { notifyUser } = await import("../../lib/notifyUser");
          await notifyUser({
            userId: userRow[0].openId,
            type: "system",
            title: "命理師申請結果通知",
            content: `您申請成為命理師的請求未獲核准。${input.adminNote ? `管理員備註：${input.adminNote}` : ""}如有疑問請聯繫管理員。`,
            linkUrl: "/",
          }).catch(() => {});
        }
      }
      return { success: true, status: newStatus };
    }),

  // ── 系統設定 ──

  /** 公開：取得系統設定 */
  getSystemSetting: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, input.key))
        .limit(1);
      return setting ?? null;
    }),

  /** 管理員：更新系統設定 */
  adminUpdateSystemSetting: adminProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.insert(systemSettings)
        .values({ settingKey: input.key, settingValue: input.value })
        .onDuplicateKeyUpdate({ set: { settingValue: input.value } });
      return { success: true };
    }),

  /** 公開：取得天命聯盟名稱 */
  getAllianceName: publicProcedure.query(async () => {
    const db = (await getDb())!;
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "alliance_name"))
      .limit(1);
    return { name: setting?.settingValue ?? "天命聯盟" };
  }),

  /** 管理員：更新天命聯盟名稱 */
  adminUpdateAllianceName: adminProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db
        .insert(systemSettings)
        .values({ settingKey: "alliance_name", settingValue: input.name, description: "天命聯盟模塊名稱" })
        .onDuplicateKeyUpdate({ set: { settingValue: input.name } });
      return { success: true };
    }),

  // ── 管理員：天命管理團隊訊息管理 ──

  /** 管理員：取得所有用戶的團隊訊息 */
  adminListTeamMessages: viewerProcedure.query(async () => {
    const db = (await getDb())!;
    await db.delete(teamMessages).where(lte(teamMessages.expiresAt, new Date()));
    const msgs = await db
      .select({
        id: teamMessages.id,
        userId: teamMessages.userId,
        content: teamMessages.content,
        direction: teamMessages.direction,
        isRead: teamMessages.isRead,
        readAt: teamMessages.readAt,
        expiresAt: teamMessages.expiresAt,
        createdAt: teamMessages.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(teamMessages)
      .leftJoin(users, eq(teamMessages.userId, users.id))
      .orderBy(asc(teamMessages.userId), asc(teamMessages.createdAt));
    const grouped: Record<number, {
      userId: number;
      userName: string;
      userEmail: string;
      unreadCount: number;
      lastMessageAt: Date;
      messages: typeof msgs;
    }> = {};
    for (const msg of msgs) {
      if (!grouped[msg.userId]) {
        grouped[msg.userId] = {
          userId: msg.userId,
          userName: msg.userName ?? "未知用戶",
          userEmail: msg.userEmail ?? "",
          unreadCount: 0,
          lastMessageAt: msg.createdAt,
          messages: [],
        };
      }
      grouped[msg.userId].messages.push(msg);
      if (msg.direction === "user_to_team" && !msg.isRead) {
        grouped[msg.userId].unreadCount++;
      }
      if (msg.createdAt > grouped[msg.userId].lastMessageAt) {
        grouped[msg.userId].lastMessageAt = msg.createdAt;
      }
    }
    return Object.values(grouped).sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
  }),

  /** 管理員：回覆用戶訊息 */
  adminReplyTeamMessage: adminProcedure
    .input(z.object({
      userId: z.number().int(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      await db.insert(teamMessages).values({
        userId: input.userId,
        content: input.content,
        direction: "team_to_user",
        expiresAt,
      });
      await db
        .update(teamMessages)
        .set({ isRead: 1, readAt: new Date() })
        .where(
          and(
            eq(teamMessages.userId, input.userId),
            eq(teamMessages.direction, "user_to_team"),
            eq(teamMessages.isRead, 0)
          )
        );
      return { success: true };
    }),

  /** 管理員：對用戶訊息標記已讀 */
  adminMarkTeamMessageRead: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db
        .update(teamMessages)
        .set({ isRead: 1, readAt: new Date() })
        .where(
          and(
            eq(teamMessages.userId, input.userId),
            eq(teamMessages.direction, "user_to_team"),
            eq(teamMessages.isRead, 0)
          )
        );
      return { success: true };
    }),
});
