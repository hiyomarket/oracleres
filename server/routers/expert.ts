/**
 * Project Nexus - 天命聯盟・專家平台 Router
 * 包含 Phase 1-4 的所有 API
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  experts,
  expertServices,
  expertAvailability,
  bookings,
  privateMessages,
  reviews,
  users,
  expertApplications,
  expertCalendarEvents,
  systemSettings,
} from "../../drizzle/schema";
import { eq, and, desc, asc, gte, lte, sql, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

// ─── 輔助函數 ─────────────────────────────────────────────────────────────────

/** 確保當前用戶是專家，回傳 expert 記錄 */
async function requireExpert(userId: number) {
  const db = (await getDb())!;
  const [expert] = await db.select().from(experts).where(eq(experts.userId, userId)).limit(1);
  if (!expert) {
    throw new TRPCError({ code: "FORBIDDEN", message: "您尚未成為認證專家" });
  }
  return expert;
}

/** 取得專家記錄，若無則回傳 null（不拋錯，用於 admin 初始化場景） */
async function findExpert(userId: number) {
  const db = (await getDb())!;
  const [expert] = await db.select().from(experts).where(eq(experts.userId, userId)).limit(1);
  return expert ?? null;
}

/** 確保當前用戶是專家或管理員 */
function requireExpertOrAdmin(role: string) {
  if (role !== "expert" && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "此功能僅限認證專家使用" });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const expertRouter = router({

  // ── Phase 1: 專家後台 ────────────────────────────────────────────────────────

  /** 取得當前登入專家的個人資料 */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    requireExpertOrAdmin(ctx.user.role);
    const db = (await getDb())!;
    const [expert] = await db
      .select()
      .from(experts)
      .where(eq(experts.userId, ctx.user.id))
      .limit(1);
    return expert ?? null;
  }),

  /** 更新當前專家的個人資料 */
  updateMyProfile: protectedProcedure
    .input(
      z.object({
        publicName: z.string().min(1).max(100),
        title: z.string().max(200).optional(),
        bio: z.string().optional(),
        bioHtml: z.string().optional(),
        slug: z.string().max(100).regex(/^[a-z0-9-]*$/, "專屬網址只能包含小寫英文、數字和連字號").optional(),
        profileImageUrl: z.string().max(500).optional(),
        coverImageUrl: z.string().max(500).optional(),
        tags: z.array(z.string()).optional(),
        specialties: z.array(z.string()).optional(),
        languages: z.string().optional(),
        consultationModes: z.array(z.string()).optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        paymentQrUrl: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const db = (await getDb())!;
      // 檢查 slug 是否被其他人佔用
      if (input.slug) {
        const slugConflict = await db
          .select({ id: experts.id, userId: experts.userId })
          .from(experts)
          .where(eq(experts.slug, input.slug))
          .limit(1);
        if (slugConflict.length > 0 && slugConflict[0].userId !== ctx.user.id) {
          throw new TRPCError({ code: "CONFLICT", message: "此專屬網址已被使用，請改用其他名稱" });
        }
      }
      const existing = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);
      const profileData = {
        publicName: input.publicName,
        title: input.title,
        bio: input.bio,
        bioHtml: input.bioHtml,
        slug: input.slug || null,
        profileImageUrl: input.profileImageUrl,
        coverImageUrl: input.coverImageUrl,
        tags: input.tags ?? [],
        specialties: input.specialties ?? [],
        languages: input.languages,
        consultationModes: input.consultationModes ?? [],
        priceMin: input.priceMin,
        priceMax: input.priceMax,
        paymentQrUrl: input.paymentQrUrl,
      };
      if (existing.length === 0) {
        await db.insert(experts).values({
          userId: ctx.user.id,
          ...profileData,
          status: ctx.user.role === "admin" ? "active" : "pending_review",
        });
      } else {
        await db
          .update(experts)
          .set(profileData)
          .where(eq(experts.userId, ctx.user.id));
      }
      return { success: true };
    }),

  /** 上傳專家照片（封面或頭像）到 S3 */
  uploadProfileImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      imageType: z.enum(["profile", "cover"]).default("profile"),
    }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const buffer = Buffer.from(input.imageBase64, "base64");
      const ext = input.mimeType.split("/")[1] || "jpg";
      const key = `expert-images/${expert.id}-${input.imageType}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const db = (await getDb())!;
      const updateField = input.imageType === "profile" ? { profileImageUrl: url } : { coverImageUrl: url };
      await db.update(experts).set(updateField).where(eq(experts.userId, ctx.user.id));
      return { url, success: true };
    }),

  /** 取得當前專家的所有服務項目 */
  listMyServices: protectedProcedure.query(async ({ ctx }) => {
    requireExpertOrAdmin(ctx.user.role);
    const expert = await findExpert(ctx.user.id);
    if (!expert) return []; // admin 尚未建立專家記錄
    const db = (await getDb())!;
    return db
      .select()
      .from(expertServices)
      .where(eq(expertServices.expertId, expert.id))
      .orderBy(asc(expertServices.sortOrder), asc(expertServices.createdAt));
  }),

  /** 新增服務項目 */
  createService: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        durationMinutes: z.number().int().min(15).max(480).default(60),
        price: z.number().int().min(0),
        type: z.enum(["online", "offline"]).default("online"),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [result] = await db.insert(expertServices).values({
        expertId: expert.id,
        title: input.title,
        description: input.description,
        durationMinutes: input.durationMinutes,
        price: input.price,
        type: input.type,
        isActive: input.isActive ? 1 : 0,
        sortOrder: input.sortOrder,
      });
      return { id: (result as any).insertId, success: true };
    }),

  /** 更新服務項目 */
  updateService: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        durationMinutes: z.number().int().min(15).max(480).optional(),
        price: z.number().int().min(0).optional(),
        type: z.enum(["online", "offline"]).optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = { ...fields };
      if (typeof fields.isActive === "boolean") {
        updateData.isActive = fields.isActive ? 1 : 0;
      }
      await db
        .update(expertServices)
        .set(updateData)
        .where(and(eq(expertServices.id, id), eq(expertServices.expertId, expert.id)));
      return { success: true };
    }),

  /** 刪除服務項目 */
  toggleServiceActive: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const expert = await db.select().from(experts).where(eq(experts.userId, ctx.user.id)).limit(1);
      if (!expert[0]) throw new TRPCError({ code: "NOT_FOUND", message: "尚未建立專家資料" });
      await db.update(expertServices)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(and(eq(expertServices.id, input.id), eq(expertServices.expertId, expert[0].id)));
      return { success: true };
    }),

  deleteService: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      await db
        .delete(expertServices)
        .where(and(eq(expertServices.id, input.id), eq(expertServices.expertId, expert.id)));
      return { success: true };
    }),

  // ── Phase 2: 智能行事曆 ──────────────────────────────────────────────────────

  /** 設定可預約時段（批量新增） */
  setAvailability: protectedProcedure
    .input(
      z.object({
        slots: z.array(
          z.object({
            startTime: z.date(),
            endTime: z.date(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      if (input.slots.length === 0) return { success: true, count: 0 };
      await db.insert(expertAvailability).values(
        input.slots.map((s) => ({
          expertId: expert.id,
          startTime: s.startTime,
          endTime: s.endTime,
          isBooked: 0,
        }))
      );
      return { success: true, count: input.slots.length };
    }),

  /** 刪除可預約時段 */
  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      await db
        .delete(expertAvailability)
        .where(
          and(
            eq(expertAvailability.id, input.id),
            eq(expertAvailability.expertId, expert.id),
            eq(expertAvailability.isBooked, 0)
          )
        );
      return { success: true };
    }),

  /** 取得指定月份的行事曆資料（可預約時段 + 訂單） */
  getCalendarData: protectedProcedure
    .input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
      })
    )
    .query(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return { availSlots: [], bookings: [] }; // admin 尚未建立專家記錄
      const db = (await getDb())!;

      const startOfMonth = new Date(input.year, input.month - 1, 1);
      const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59);

      const [availSlots, myBookings] = await Promise.all([
        db
          .select()
          .from(expertAvailability)
          .where(
            and(
              eq(expertAvailability.expertId, expert.id),
              gte(expertAvailability.startTime, startOfMonth),
              lte(expertAvailability.startTime, endOfMonth)
            )
          )
          .orderBy(asc(expertAvailability.startTime)),
        db
          .select({
            id: bookings.id,
            userId: bookings.userId,
            serviceId: bookings.serviceId,
            bookingTime: bookings.bookingTime,
            status: bookings.status,
            notes: bookings.notes,
            userName: users.name,
            serviceTitle: expertServices.title,
          })
          .from(bookings)
          .leftJoin(users, eq(bookings.userId, users.id))
          .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
          .where(
            and(
              eq(bookings.expertId, expert.id),
              gte(bookings.bookingTime, startOfMonth),
              lte(bookings.bookingTime, endOfMonth),
              ne(bookings.status, "cancelled")
            )
          )
          .orderBy(asc(bookings.bookingTime)),
      ]);

      return { availSlots, bookings: myBookings };
    }),

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
      if (!expert) return []; // admin 尚未建立專家記錄
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

  // ── Phase 3: 用戶前台 API ────────────────────────────────────────────────────

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
        .limit(200); // 取足夠多再在應用層篩選

      // 若有 tag 篩選，同時比對 tags 和 specialties 欄位
      let filtered = allExperts;
      if (input.tag) {
        filtered = allExperts.filter((e) => {
          const tags = (e.tags as string[] | null) ?? [];
          const specialties = (e.specialties as string[] | null) ?? [];
          const combined = [...tags, ...specialties];
          // 支援模糊比對：如果篩選項目是大類別，匹配小類別
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
        db
          .select()
          .from(expertServices)
          .where(and(eq(expertServices.expertId, input.expertId), eq(expertServices.isActive, 1)))
          .orderBy(asc(expertServices.sortOrder)),
        db
          .select()
          .from(expertAvailability)
          .where(
            and(
              eq(expertAvailability.expertId, input.expertId),
              eq(expertAvailability.isBooked, 0),
              gte(expertAvailability.startTime, now),
              lte(expertAvailability.startTime, oneMonthLater)
            )
          )
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

      // 確認時段存在且未被預約
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

      if (!slot) {
        throw new TRPCError({ code: "CONFLICT", message: "此時段已被預約或不存在" });
      }

      // 取得服務時長以計算結束時間
      const [service] = await db
        .select({ durationMinutes: expertServices.durationMinutes })
        .from(expertServices)
        .where(eq(expertServices.id, input.serviceId))
        .limit(1);

      const endTime = service
        ? new Date(slot.startTime.getTime() + service.durationMinutes * 60 * 1000)
        : null;

      // 建立訂單
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

      // 標記時段為已預約
      await db
        .update(expertAvailability)
        .set({ isBooked: 1, bookingId })
        .where(eq(expertAvailability.id, input.availabilityId));

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
      // 確認是訂單的用戶或對應的專家
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

      // 確認訂單屬於當前用戶
      const [booking] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id)))
        .limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "找不到此訂單" });

      // 上傳圖片到 S3
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

  // ── Phase 4: 私訊與評論 ──────────────────────────────────────────────────────

  /** 取得某訂單的聊天訊息 */
  getMessages: protectedProcedure
    .input(z.object({ bookingId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // 確認用戶有權限（是訂單的用戶或專家）
      const [booking] = await db
        .select({ userId: bookings.userId, expertId: bookings.expertId })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });

      // 取得當前用戶的 expert 記錄（如果有）
      const [expertRecord] = await db
        .select({ id: experts.id })
        .from(experts)
        .where(eq(experts.userId, ctx.user.id))
        .limit(1);

      const isParticipant =
        booking.userId === ctx.user.id ||
        (expertRecord && booking.expertId === expertRecord.id);

      if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });

      return db
        .select({
          id: privateMessages.id,
          senderId: privateMessages.senderId,
          content: privateMessages.content,
          imageUrl: privateMessages.imageUrl,
          createdAt: privateMessages.createdAt,
          senderName: users.name,
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

      if (!booking) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "只有已完成的訂單才能評論" });
      }

      // 插入評論（若已存在則更新）
      await db.insert(reviews).values({
        bookingId: input.bookingId,
        userId: ctx.user.id,
        expertId: booking.expertId,
        rating: input.rating,
        comment: input.comment,
      }).onDuplicateKeyUpdate({
        set: { rating: input.rating, comment: input.comment },
      });

      // 更新專家平均評分
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

  // ── 管理員控管 ───────────────────────────────────────────────────────────────

  /** 管理員：取得所有專家列表（含待審核） */
  adminListExperts: adminProcedure
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

      // 查詢用戶 openId（用於發送站內通知）
      const userRow = await db
        .select({ openId: users.openId })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      // 更新 users.role
      await db
        .update(users)
        .set({ role: "expert" })
        .where(eq(users.id, input.userId));

      // 建立 expert 記錄（若不存在）
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

      // 發送站內通知給用戶
      if (userRow.length > 0) {
        const { notifyUser } = await import("../lib/notifyUser");
        await notifyUser({
          userId: userRow[0].openId,
          type: "system",
          title: "🌟 恭喜您成為天命聯盟命理師",
          content: `您已獲得命理師資格，公開名稱為「${input.publicName}」。請前往專家後台完成個人品牌設定，讓用戶能夠找到您並預約服務。`,
          linkUrl: "/expert/dashboard",
        }).catch(() => { /* 通知失敗不影響主要流程 */ });
      }

      return { success: true };
    }),

  /** 管理員：撤銷專家角色 */
  adminRevokeExpertRole: adminProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db
        .update(users)
        .set({ role: "user" })
        .where(eq(users.id, input.userId));
      await db
        .update(experts)
        .set({ status: "inactive" })
        .where(eq(experts.userId, input.userId));
      return { success: true };
    }),

  /** 管理員：取得所有訂單（全平台） */
  adminListAllBookings: adminProcedure
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
      await db
        .update(bookings)
        .set({ status: input.status })
        .where(eq(bookings.id, input.bookingId));
      return { success: true };
    }),

  // ── 命理師申請流程 ────────────────────────────────────────────────────────────

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
      // 如果已是命理師則不需申請
      if (ctx.user.role === "expert" || ctx.user.role === "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "您已是命理師身份，無需申請" });
      }
      // 檢查是否已有待審核申請
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

  // ── 行事歷活動管理 ─────────────────────────────────────────────────────────

  /** 專家：建立行事歷活動 */
  createCalendarEvent: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      eventDate: z.date(),
      endDate: z.date().optional(),
      eventType: z.enum(["offline", "online", "announcement"]).default("offline"),
      location: z.string().max(300).optional(),
      maxAttendees: z.number().int().optional(),
      price: z.number().int().default(0),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [result] = await db.insert(expertCalendarEvents).values({
        expertId: expert.id,
        title: input.title,
        description: input.description,
        eventDate: input.eventDate,
        endDate: input.endDate,
        eventType: input.eventType,
        location: input.location,
        maxAttendees: input.maxAttendees,
        price: input.price,
        isPublic: input.isPublic ? 1 : 0,
      });
      return { id: (result as any).insertId, success: true };
    }),

  /** 專家：取得自己的行事歷活動 */
  listMyCalendarEvents: protectedProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return [];
      const db = (await getDb())!;
      const startOfMonth = new Date(input.year, input.month - 1, 1);
      const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59);
      return db.select().from(expertCalendarEvents)
        .where(and(
          eq(expertCalendarEvents.expertId, expert.id),
          gte(expertCalendarEvents.eventDate, startOfMonth),
          lte(expertCalendarEvents.eventDate, endOfMonth)
        ))
        .orderBy(asc(expertCalendarEvents.eventDate));
    }),

  /** 專家：刪除行事歷活動 */
  deleteCalendarEvent: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      await db.delete(expertCalendarEvents)
        .where(and(eq(expertCalendarEvents.id, input.id), eq(expertCalendarEvents.expertId, expert.id)));
      return { success: true };
    }),

  // ── 系統設定 ─────────────────────────────────────────────────────────────────

  /** 公開：取得系統設定（如天命聯盟名稱） */
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
  adminListApplications: adminProcedure
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
      // 取得申請資料
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

      // 如果核准，自動提升用戶為命理師
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
        // 發送站內通知
        if (userRow.length > 0) {
          const { notifyUser } = await import("../lib/notifyUser");
          await notifyUser({
            userId: userRow[0].openId,
            type: "system",
            title: "🌟 恭喜！您的命理師申請已通過",
            content: `您申請成為命理師的請求已獲核准，公開名稱為「${app.publicName}」。請前往專家後台完成個人品牌設定。`,
            linkUrl: "/expert/dashboard",
          }).catch(() => {});
        }
      } else {
        // 拒絕通知
        const userRow = await db
          .select({ openId: users.openId })
          .from(users)
          .where(eq(users.id, app.userId))
          .limit(1);
        if (userRow.length > 0) {
          const { notifyUser } = await import("../lib/notifyUser");
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

  /** 用戶：取消訂單（pending_payment 或 confirmed 狀態可取消） */
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
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, input.bookingId));
      await db.update(expertAvailability).set({ isBooked: 0, bookingId: null }).where(eq(expertAvailability.bookingId, input.bookingId));
      const cancelMsg = input.reason
        ? `❌ 老師已取消此預約。原因：${input.reason}`
        : "❌ 老師已取消此預約。如有疑問請透過訊息聯繫。";
      await db.insert(privateMessages).values({ bookingId: input.bookingId, senderId: ctx.user.id, content: cancelMsg });
      return { success: true };
    }),

  /** 師資：新增可用時段區間（用戶可在區間內自由選取時間） */
  setAvailabilityWindow: protectedProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startHour: z.number().int().min(0).max(23),
      startMinute: z.number().int().min(0).max(59).default(0),
      endHour: z.number().int().min(0).max(23),
      endMinute: z.number().int().min(0).max(59).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;
      const [y, m, d] = input.date.split("-").map(Number);
      const startTime = new Date(y, m - 1, d, input.startHour, input.startMinute, 0);
      const endTime = new Date(y, m - 1, d, input.endHour, input.endMinute, 0);
      if (endTime <= startTime) throw new TRPCError({ code: "BAD_REQUEST", message: "結束時間必須晚於開始時間" });
      await db.insert(expertAvailability).values({ expertId: expert.id, startTime, endTime, isBooked: 0 });
      return { success: true };
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
      return { bookingId, success: true };
    }),

  /** 公開：取得特定專家的行事歷活動（前台展示用） */
  listExpertCalendarEvents: publicProcedure
    .input(z.object({
      expertId: z.number().int(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const startOfMonth = new Date(input.year, input.month - 1, 1);
      const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59);
      return db.select().from(expertCalendarEvents)
        .where(and(
          eq(expertCalendarEvents.expertId, input.expertId),
          eq(expertCalendarEvents.isPublic, 1),
          gte(expertCalendarEvents.eventDate, startOfMonth),
          lte(expertCalendarEvents.eventDate, endOfMonth)
        ))
        .orderBy(asc(expertCalendarEvents.eventDate));
    }),
});
