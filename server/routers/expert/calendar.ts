/**
 * Expert Router - 行事曆與時段管理
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import {
  experts, expertServices, expertAvailability, bookings, users, expertCalendarEvents,
} from "../../../drizzle/schema";
import { eq, and, asc, gte, lte, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireExpert, findExpert, requireExpertOrAdmin } from "./_helpers";

export const expertCalendarRouter = router({

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
      if (!expert) return { availSlots: [], bookings: [] };
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

  /** 批量建立每週重複時段（未來 N 週） */
  setWeeklyRecurringSlots: protectedProcedure
    .input(z.object({
      /** 0=Sun, 1=Mon, ..., 6=Sat */
      dayOfWeek: z.number().int().min(0).max(6),
      startHour: z.number().int().min(0).max(23),
      startMinute: z.number().int().min(0).max(59).default(0),
      endHour: z.number().int().min(0).max(23),
      endMinute: z.number().int().min(0).max(59).default(0),
      /** 重複幾週（1-8） */
      weeks: z.number().int().min(1).max(8).default(4),
    }))
    .mutation(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await requireExpert(ctx.user.id);
      const db = (await getDb())!;

      const now = new Date();
      const slots: { expertId: number; startTime: Date; endTime: Date; isBooked: number }[] = [];

      for (let w = 0; w < input.weeks; w++) {
        // 找到下一個目標星期幾
        const target = new Date(now);
        target.setDate(target.getDate() + ((7 + input.dayOfWeek - target.getDay()) % 7) + w * 7);
        // 如果是本週且已過去，跳到下週
        if (w === 0 && target <= now) {
          target.setDate(target.getDate() + 7);
        }
        const startTime = new Date(target.getFullYear(), target.getMonth(), target.getDate(), input.startHour, input.startMinute, 0);
        const endTime = new Date(target.getFullYear(), target.getMonth(), target.getDate(), input.endHour, input.endMinute, 0);
        if (endTime <= startTime) continue;
        slots.push({ expertId: expert.id, startTime, endTime, isBooked: 0 });
      }

      if (slots.length > 0) {
        await db.insert(expertAvailability).values(slots);
      }
      return { success: true, count: slots.length };
    }),

  /** 匯出 iCal 格式的行事曆資料 */
  exportICalData: protectedProcedure
    .input(z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }))
    .query(async ({ ctx, input }) => {
      requireExpertOrAdmin(ctx.user.role);
      const expert = await findExpert(ctx.user.id);
      if (!expert) return { ical: "" };
      const db = (await getDb())!;
      const startOfMonth = new Date(input.year, input.month - 1, 1);
      const endOfMonth = new Date(input.year, input.month, 0, 23, 59, 59);

      const [slots, myBookings, events] = await Promise.all([
        db.select().from(expertAvailability)
          .where(and(
            eq(expertAvailability.expertId, expert.id),
            gte(expertAvailability.startTime, startOfMonth),
            lte(expertAvailability.startTime, endOfMonth)
          )),
        db.select({
          id: bookings.id,
          bookingTime: bookings.bookingTime,
          status: bookings.status,
          serviceTitle: expertServices.title,
          userName: users.name,
        })
          .from(bookings)
          .leftJoin(users, eq(bookings.userId, users.id))
          .leftJoin(expertServices, eq(bookings.serviceId, expertServices.id))
          .where(and(
            eq(bookings.expertId, expert.id),
            gte(bookings.bookingTime, startOfMonth),
            lte(bookings.bookingTime, endOfMonth),
            ne(bookings.status, "cancelled")
          )),
        db.select().from(expertCalendarEvents)
          .where(and(
            eq(expertCalendarEvents.expertId, expert.id),
            gte(expertCalendarEvents.eventDate, startOfMonth),
            lte(expertCalendarEvents.eventDate, endOfMonth)
          )),
      ]);

      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      let lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//OracleResonance//ExpertCalendar//TW",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
      ];

      for (const s of slots) {
        lines.push(
          "BEGIN:VEVENT",
          `UID:slot-${s.id}@oracle-resonance`,
          `DTSTART:${fmt(new Date(s.startTime))}`,
          `DTEND:${fmt(new Date(s.endTime))}`,
          `SUMMARY:${s.isBooked ? "✅ 已預約時段" : "⭕ 可預約時段"}`,
          "END:VEVENT"
        );
      }

      for (const b of myBookings) {
        const bTime = new Date(b.bookingTime);
        const endTime = new Date(bTime.getTime() + 60 * 60 * 1000);
        lines.push(
          "BEGIN:VEVENT",
          `UID:booking-${b.id}@oracle-resonance`,
          `DTSTART:${fmt(bTime)}`,
          `DTEND:${fmt(endTime)}`,
          `SUMMARY:📌 ${b.serviceTitle || "預約"} - ${b.userName || "用戶"}`,
          "END:VEVENT"
        );
      }

      for (const e of events) {
        const eDate = new Date(e.eventDate);
        const eEnd = e.endDate ? new Date(e.endDate) : new Date(eDate.getTime() + 2 * 60 * 60 * 1000);
        lines.push(
          "BEGIN:VEVENT",
          `UID:event-${e.id}@oracle-resonance`,
          `DTSTART:${fmt(eDate)}`,
          `DTEND:${fmt(eEnd)}`,
          `SUMMARY:📅 ${e.title}`,
          e.location ? `LOCATION:${e.location}` : "",
          e.description ? `DESCRIPTION:${e.description}` : "",
          "END:VEVENT"
        );
      }

      lines.push("END:VCALENDAR");
      return { ical: lines.filter(Boolean).join("\r\n") };
    }),

  /** 公開：取得特定專家的行事曆活動（前台展示用） */
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
