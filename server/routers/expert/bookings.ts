/**
 * Expert Router - 訂單管理
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  experts, expertServices, expertAvailability, bookings, users, reviews, privateMessages, expertCalendarEvents, expertNotifications,
} from "../../../drizzle/schema";
import { eq, and, desc, asc, gte, lte, sql, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../../storage";
import { requireExpert, findExpert, requireExpertOrAdmin } from "./_helpers";

export const expertBookingsRouter = router({

  /** 取得當前專家的所有訂單（含用戶資訊） */
  listMyBookings: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending_payment", "confirmed", "completed", "cancelled", "all"]).default("all"),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return [];
      const db = (await getDb())!;
      const conditions = [eq(bookings.expertId, expert.id)];
      if (input.status !== "all") {
        conditions.push(eq(bookings.status, input.status));
      }
      return db
        .select({
          id: bookings.id,
          userId: bookings.userId,
          serviceId: bookings.serviceId,
          bookingTime: bookings.bookingTime,
          status: bookings.status,
          paymentProofUrl: bookings.paymentProofUrl,
          notes: bookings.notes,
          createdAt: bookings.createdAt,
          userName: users.name,
          serviceTitle: expertServices.title,
          servicePrice: expertServices.price,
          serviceDuration: expertServices.durationMinutes,
        })
        .from(bookings)
        .leftJoin(users, eq(bookings.userId, users.id))
        .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
        .where(and(...conditions))
        .orderBy(desc(bookings.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** 取得專家待處理訂單數量（紅點徽章用） */
  getPendingBookingsCount: protectedProcedure
    .query(async ({ ctx }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return { count: 0 };
      const db = (await getDb())!;
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(and(eq(bookings.expertId, expert.id), eq(bookings.status, "pending_payment")));
      return { count: Number(row?.count ?? 0) };
    }),

  /** 專家確認付款（pending_payment → confirmed） */
  confirmPayment: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      await db
        .update(bookings)
        .set({ status: "confirmed" })
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.expertId, expert.id),
            eq(bookings.status, "pending_payment")
          )
        );
      return { success: true };
    }),

  /** 專家標記訂單為已完成 */
  completeBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      await db
        .update(bookings)
        .set({ status: "completed" })
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.expertId, expert.id),
            eq(bookings.status, "confirmed")
          )
        );
      return { success: true };
    }),

  /** 師資：確認訂單（將 pending_payment 改為 confirmed） */
  expertConfirmBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int(), message: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [booking] = await db
        .select({ id: bookings.id, status: bookings.status, expertId: bookings.expertId, userId: bookings.userId })
        .from(bookings)
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.expertId, expert.id)))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "訂單不存在" });
      if (booking.status !== "pending_payment") throw new TRPCError({ code: "BAD_REQUEST", message: "只能確認待付款狀態的訂單" });
      await db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, input.bookingId));
      const confirmMsg = input.message
        ? `✅ 老師已確認預約！${input.message}`
        : "✅ 老師已確認您的預約，請依約定完成付款。";
      await db.insert(privateMessages).values({ bookingId: input.bookingId, senderId: ctx.user.id, content: confirmMsg });
      try {
        const { notifyUser } = await import("../../lib/notifyUser");
        await notifyUser({
          userId: String(booking.userId),
          type: "booking_update",
          title: "預約已確認 ✅",
          content: input.message
            ? `您的預約已獲老師確認！${input.message}請前往「我的預約」完成付款。`
            : `您的預約已獲老師確認，請前往「我的預約」依約定完成付款。`,
          linkUrl: `/my-bookings`,
          relatedId: String(input.bookingId),
        });
      } catch (_) { /* 通知失敗不影響主流程 */ }
      return { success: true };
    }),

  /** 師資：取消訂單 */
  expertCancelBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int(), reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [booking] = await db
        .select({ id: bookings.id, status: bookings.status, expertId: bookings.expertId })
        .from(bookings)
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.expertId, expert.id)))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "訂單不存在" });
      if (booking.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "已完成的訂單無法取消" });
      if (booking.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "訂單已取消" });
      const [bookingForCancel] = await db
        .select({ userId: bookings.userId })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, input.bookingId));
      await db.update(expertAvailability).set({ isBooked: 0, bookingId: null }).where(eq(expertAvailability.bookingId, input.bookingId));
      const cancelMsg = input.reason
        ? `❌ 老師已取消此預約。原因：${input.reason}`
        : "❌ 老師已取消此預約。如有疑問請透過訊息聯繫。";
      await db.insert(privateMessages).values({ bookingId: input.bookingId, senderId: ctx.user.id, content: cancelMsg });
      if (bookingForCancel) {
        try {
          const { notifyUser } = await import("../../lib/notifyUser");
          await notifyUser({
            userId: String(bookingForCancel.userId),
            type: "booking_update",
            title: "預約已取消 ❌",
            content: input.reason
              ? `您的預約已被老師取消。原因：${input.reason}`
              : `您的預約已被老師取消。如有疑問請透過訊息聯繫。`,
            linkUrl: `/my-bookings`,
            relatedId: String(input.bookingId),
          });
        } catch (_) { /* 通知失敗不影響主流程 */ }
      }
      return { success: true };
    }),

  // ── 用戶端訂單 API ──

  /** 公開：取得所有 active 專家列表 */
  listExperts: publicProcedure
    .input(
      z.object({
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const allExperts = await db
        .select({
          id: experts.id,
          userId: experts.userId,
          publicName: experts.publicName,
          title: experts.title,
          profileImageUrl: experts.profileImageUrl,
          coverImageUrl: experts.coverImageUrl,
          consultationModes: experts.consultationModes,
          tags: experts.tags,
          specialties: experts.specialties,
          slug: experts.slug,
          priceMin: experts.priceMin,
          priceMax: experts.priceMax,
          ratingAvg: experts.ratingAvg,
          ratingCount: experts.ratingCount,
        })
        .from(experts)
        .where(eq(experts.status, "active"))
        .orderBy(desc(experts.ratingAvg))
        .limit(200);
      let filtered = allExperts;
      if (input.tag) {
        filtered = allExperts.filter((e) => {
          const tags = (e.tags as string[] | null) ?? [];
          const specialties = (e.specialties as string[] | null) ?? [];
          const combined = [...tags, ...specialties];
          return combined.some((t) =>
            t.includes(input.tag!) || input.tag!.includes(t)
          );
        });
      }
      return filtered.slice(input.offset, input.offset + input.limit);
    }),

  /** 公開：取得單一專家詳細資料 + 服務 + 未來可預約時段 */
  getExpertDetails: publicProcedure
    .input(z.object({ expertId: z.number().int() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [expert] = await db
        .select()
        .from(experts)
        .where(and(eq(experts.id, input.expertId), eq(experts.status, "active")))
        .limit(1);
      if (!expert) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此專家" });
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const [services, availSlots] = await Promise.all([
        db.select().from(expertServices)
          .where(and(eq(expertServices.expertId, input.expertId), eq(expertServices.isActive, 1)))
          .orderBy(asc(expertServices.sortOrder)),
        db.select().from(expertAvailability)
          .where(and(
            eq(expertAvailability.expertId, input.expertId),
            eq(expertAvailability.isBooked, 0),
            gte(expertAvailability.startTime, now),
            lte(expertAvailability.startTime, oneMonthLater)
          ))
          .orderBy(asc(expertAvailability.startTime)),
      ]);
      return { expert, services, availSlots };
    }),

  /** 公開：用 slug 查詢專家 */
  getExpertBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [expert] = await db
        .select()
        .from(experts)
        .where(and(eq(experts.slug, input.slug), eq(experts.status, "active")))
        .limit(1);
      if (!expert) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此專家" });
      const now = new Date();
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const [services, availSlots, calEvents] = await Promise.all([
        db.select().from(expertServices)
          .where(and(eq(expertServices.expertId, expert.id), eq(expertServices.isActive, 1)))
          .orderBy(asc(expertServices.sortOrder)),
        db.select().from(expertAvailability)
          .where(and(
            eq(expertAvailability.expertId, expert.id),
            eq(expertAvailability.isBooked, 0),
            gte(expertAvailability.startTime, now),
            lte(expertAvailability.startTime, oneMonthLater)
          ))
          .orderBy(asc(expertAvailability.startTime)),
        db.select().from(expertCalendarEvents)
          .where(and(
            eq(expertCalendarEvents.expertId, expert.id),
            eq(expertCalendarEvents.isPublic, 1),
            gte(expertCalendarEvents.eventDate, now)
          ))
          .orderBy(asc(expertCalendarEvents.eventDate))
          .limit(20),
      ]);
      return { expert, services, availSlots, calEvents };
    }),

  /** 用戶建立預約訂單 */
  createBooking: protectedProcedure
    .input(
      z.object({
        expertId: z.number().int(),
        serviceId: z.number().int(),
        availabilityId: z.number().int(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [slot] = await db
        .select()
        .from(expertAvailability)
        .where(
          and(
            eq(expertAvailability.id, input.availabilityId),
            eq(expertAvailability.expertId, input.expertId),
            eq(expertAvailability.isBooked, 0)
          )
        )
        .limit(1);
      if (!slot) throw new TRPCError({ code: "CONFLICT", message: "此時段已被預約或不存在" });
      const [service] = await db
        .select({ durationMinutes: expertServices.durationMinutes })
        .from(expertServices)
        .where(eq(expertServices.id, input.serviceId))
        .limit(1);
      const endTime = service
        ? new Date(slot.startTime.getTime() + service.durationMinutes * 60 * 1000)
        : null;
      const [result] = await db.insert(bookings).values({
        userId: ctx.user.id,
        expertId: input.expertId,
        serviceId: input.serviceId,
        bookingTime: slot.startTime,
        endTime,
        status: "pending_payment",
        notes: input.notes,
      });
      const bookingId = (result as any).insertId;
      await db
        .update(expertAvailability)
        .set({ isBooked: 1, bookingId })
        .where(eq(expertAvailability.id, input.availabilityId));

      // Notify expert of new booking
      try {
        await db.insert(expertNotifications).values({
          expertId: input.expertId,
          type: "new_booking",
          title: "新預約請求",
          content: `用戶預約了您的服務${input.notes ? "，備註：" + input.notes.slice(0, 30) : ""}`,
          relatedId: bookingId,
        });
      } catch (_) {}
      return { bookingId, success: true };
    }),

  /** 用戶：在老師可用區間內建立預約（自選時間段） */
  createBookingInWindow: protectedProcedure
    .input(z.object({
      expertId: z.number().int(),
      serviceId: z.number().int(),
      availabilityId: z.number().int(),
      requestedStartTime: z.date(),
      requestedEndTime: z.date(),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [slot] = await db
        .select()
        .from(expertAvailability)
        .where(and(
          eq(expertAvailability.id, input.availabilityId),
          eq(expertAvailability.expertId, input.expertId),
          eq(expertAvailability.isBooked, 0)
        ))
        .limit(1);
      if (!slot) throw new TRPCError({ code: "CONFLICT", message: "此時段已被預約或不存在" });
      if (input.requestedStartTime < slot.startTime || input.requestedEndTime > slot.endTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請求的時間超出老師的可用區間" });
      }
      if (input.requestedEndTime <= input.requestedStartTime) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "結束時間必須晚於開始時間" });
      }
      const [result] = await db.insert(bookings).values({
        userId: ctx.user.id,
        expertId: input.expertId,
        serviceId: input.serviceId,
        bookingTime: input.requestedStartTime,
        endTime: input.requestedEndTime,
        status: "pending_payment",
        notes: input.notes,
      });
      const bookingId = (result as any).insertId;
      await db.update(expertAvailability).set({ isBooked: 1, bookingId }).where(eq(expertAvailability.id, input.availabilityId));
      const startStr = input.requestedStartTime.toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      const endStr = input.requestedEndTime.toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit' });
      await db.insert(privateMessages).values({
        bookingId,
        senderId: ctx.user.id,
        content: `📅 新預約請求！希望預約時間：${startStr} ~ ${endStr}。${input.notes ? `備註：${input.notes}` : ''}請老師確認後回覆。`,
      });

      // Notify expert of new booking
      try {
        await db.insert(expertNotifications).values({
          expertId: input.expertId,
          type: "new_booking",
          title: "新預約請求",
          content: `用戶預約了您的服務${input.notes ? "，備註：" + input.notes.slice(0, 30) : ""}`,
          relatedId: bookingId,
        });
      } catch (_) {}
      return { bookingId, success: true };
    }),

  /** 用戶：取得單一訂單詳情 */
  getBookingDetail: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({
          id: bookings.id,
          expertId: bookings.expertId,
          serviceId: bookings.serviceId,
          bookingTime: bookings.bookingTime,
          endTime: bookings.endTime,
          status: bookings.status,
          paymentProofUrl: bookings.paymentProofUrl,
          paymentNote: bookings.paymentNote,
          notes: bookings.notes,
          createdAt: bookings.createdAt,
          expertName: experts.publicName,
          expertProfileImage: experts.profileImageUrl,
          expertSlug: experts.slug,
          expertPaymentQr: experts.paymentQrUrl,
          serviceTitle: expertServices.title,
          servicePrice: expertServices.price,
          serviceDuration: expertServices.durationMinutes,
        })
        .from(bookings)
        .leftJoin(experts, eq(bookings.expertId, experts.id))
        .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
        .where(eq(bookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此訂單" });
      const [expertRecord] = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);
      const isOwner = booking.id && (
        (await db.select({ userId: bookings.userId }).from(bookings).where(eq(bookings.id, input.bookingId)).limit(1))[0]?.userId === ctx.user.id ||
        (expertRecord && booking.expertId === expertRecord.id)
      );
      if (!isOwner) throw new TRPCError({ code: "FORBIDDEN" });
      return booking;
    }),

  /** 用戶上傳付款憑證 */
  uploadPaymentProof: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id)))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此訂單" });
      const buffer = Buffer.from(input.imageBase64, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `payment-proofs/${input.bookingId}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db
        .update(bookings)
        .set({ paymentProofUrl: url })
        .where(eq(bookings.id, input.bookingId));
      return { url, success: true };
    }),

  /** 用戶取得自己的所有訂單 */
  myBookings: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending_payment", "confirmed", "completed", "cancelled", "all"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const conditions = [eq(bookings.userId, ctx.user.id)];
      if (input.status !== "all") {
        conditions.push(eq(bookings.status, input.status));
      }
      return db
        .select({
          id: bookings.id,
          expertId: bookings.expertId,
          serviceId: bookings.serviceId,
          bookingTime: bookings.bookingTime,
          status: bookings.status,
          paymentProofUrl: bookings.paymentProofUrl,
          notes: bookings.notes,
          createdAt: bookings.createdAt,
          expertName: experts.publicName,
          expertProfileImage: experts.profileImageUrl,
          serviceTitle: expertServices.title,
          servicePrice: expertServices.price,
          serviceDuration: expertServices.durationMinutes,
        })
        .from(bookings)
        .leftJoin(experts, eq(bookings.expertId, experts.id))
        .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
        .where(and(...conditions))
        .orderBy(desc(bookings.createdAt));
    }),

  /** 用戶：取消訂單 */
  cancelBooking: protectedProcedure
    .input(z.object({ bookingId: z.number().int(), reason: z.string().max(300).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select({ id: bookings.id, userId: bookings.userId, status: bookings.status })
        .from(bookings)
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id)))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "訂單不存在" });
      if (booking.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "已完成的訂單無法取消" });
      if (booking.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "訂單已取消" });
      const updateData: Record<string, unknown> = { status: "cancelled" };
      if (input.reason) updateData.notes = `[用戶取消] ${input.reason}`;
      await db.update(bookings).set(updateData).where(eq(bookings.id, input.bookingId));
      await db.update(expertAvailability).set({ isBooked: 0, bookingId: null }).where(eq(expertAvailability.bookingId, input.bookingId));
      return { success: true };
    }),

  /** 用戶提交評論（訂單完成後） */
  submitReview: protectedProcedure
    .input(
      z.object({
        bookingId: z.number().int(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const [booking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.userId, ctx.user.id),
            eq(bookings.status, "completed")
          )
        )
        .limit(1);
      if (!booking) throw new TRPCError({ code: "BAD_REQUEST", message: "只有已完成的訂單才能評論" });
      await db.insert(reviews).values({
        bookingId: input.bookingId,
        userId: ctx.user.id,
        expertId: booking.expertId,
        rating: input.rating,
        comment: input.comment,
      }).onDuplicateKeyUpdate({
        set: { rating: input.rating, comment: input.comment },
      });
      const allReviews = await db
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(eq(reviews.expertId, booking.expertId));
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await db
        .update(experts)
        .set({
          ratingAvg: avg.toFixed(2),
          ratingCount: allReviews.length,
        })
        .where(eq(experts.id, booking.expertId));
      // Notify expert of new review
      try {
        await db.insert(expertNotifications).values({
          expertId: booking.expertId,
          type: "new_review",
          title: "新評價",
          content: `用戶給了您 ${input.rating} 星評價${input.comment ? "：" + input.comment.slice(0, 50) : ""}`,
          relatedId: input.bookingId,
        });
      } catch (_) {}
      return { success: true };
    }),

  /** 公開：取得某專家的所有評論 */
  getExpertReviews: publicProcedure
    .input(
      z.object({
        expertId: z.number().int(),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          expertReply: reviews.expertReply,
          expertReplyAt: reviews.expertReplyAt,
          createdAt: reviews.createdAt,
          userName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.expertId, input.expertId))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  // ── 專家收入統計 ──

  /** 專家：取得收入統計概覽 */
  getRevenueStats: protectedProcedure.query(async ({ ctx }) => {
    requireExpertOrAdmin(ctx.user.role);
    const expert = await findExpert(ctx.user.id);
    if (!expert) return { totalRevenue: 0, completedCount: 0, thisMonthRevenue: 0, thisMonthCount: 0, avgOrderValue: 0 };
    const db = (await getDb())!;

    // 總収入（已完成訂單）
    const [totalRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expertServices.price}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
      .where(and(eq(bookings.expertId, expert.id), eq(bookings.status, "completed")));

    // 本月収入
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthRow] = await db
      .select({
        total: sql<number>`COALESCE(SUM(${expertServices.price}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
      .where(and(
        eq(bookings.expertId, expert.id),
        eq(bookings.status, "completed"),
        gte(bookings.createdAt, monthStart)
      ));

    // 最近 6 個月每月収入
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const monthlyData = await db
      .select({
        month: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`,
        total: sql<number>`COALESCE(SUM(${expertServices.price}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(bookings)
      .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
      .where(and(
        eq(bookings.expertId, expert.id),
        eq(bookings.status, "completed"),
        gte(bookings.createdAt, sixMonthsAgo)
      ))
      .groupBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`);

    const totalRevenue = Number(totalRow?.total ?? 0);
    const completedCount = Number(totalRow?.count ?? 0);

    return {
      totalRevenue,
      completedCount,
      thisMonthRevenue: Number(monthRow?.total ?? 0),
      thisMonthCount: Number(monthRow?.count ?? 0),
      avgOrderValue: completedCount > 0 ? Math.round(totalRevenue / completedCount) : 0,
      monthlyData: monthlyData.map((m) => ({
        month: m.month,
        revenue: Number(m.total),
        count: Number(m.count),
      })),
    };
  }),

  // ── 專家評價管理 ──

  /** 專家：取得自己的所有評價 */
  getMyReviews: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return [];
      const db = (await getDb())!;
      return db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          expertReply: reviews.expertReply,
          expertReplyAt: reviews.expertReplyAt,
          createdAt: reviews.createdAt,
          userName: users.name,
          serviceTitle: expertServices.title,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
        .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
        .where(eq(reviews.expertId, expert.id))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** 專家：回覆評價 */
  replyToReview: protectedProcedure
    .input(z.object({
      reviewId: z.number().int(),
      reply: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [review] = await db
        .select({ id: reviews.id, expertId: reviews.expertId })
        .from(reviews)
        .where(eq(reviews.id, input.reviewId))
        .limit(1);
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "評價不存在" });
      if (review.expertId !== expert.id) throw new TRPCError({ code: "FORBIDDEN", message: "只能回覆自己的評價" });
      await db
        .update(reviews)
        .set({ expertReply: input.reply, expertReplyAt: new Date() })
        .where(eq(reviews.id, input.reviewId));
      return { success: true };
    }),
});
