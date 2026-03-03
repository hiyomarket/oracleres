import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { siteBanners } from "../../drizzle/schema";
import { eq, and, or, isNull, gte, lte, asc } from "drizzle-orm";

export const siteBannerRouter = router({
  /** 取得目前應顯示的橫幅（前台使用） */
  getActive: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    return db
      .select()
      .from(siteBanners)
      .where(
        and(
          eq(siteBanners.isActive, 1),
          or(isNull(siteBanners.startsAt), lte(siteBanners.startsAt, now)),
          or(isNull(siteBanners.endsAt), gte(siteBanners.endsAt, now))
        )
      )
      .orderBy(asc(siteBanners.sortOrder), asc(siteBanners.createdAt));
  }),

  /** 取得所有橫幅（後台管理） */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];
    return db.select().from(siteBanners).orderBy(asc(siteBanners.sortOrder), asc(siteBanners.createdAt));
  }),

  /** 新增橫幅 */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(300),
        linkUrl: z.string().optional(),
        linkText: z.string().max(50).optional(),
        icon: z.string().max(50).optional(),
        type: z.enum(["info", "warning", "success", "promo"]).default("info"),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(siteBanners).values({
        title: input.title,
        content: input.content,
        linkUrl: input.linkUrl || null,
        linkText: input.linkText || null,
        icon: input.icon || "🔔",
        type: input.type,
        isActive: input.isActive ? 1 : 0,
        sortOrder: input.sortOrder,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      });
      return { success: true };
    }),

  /** 更新橫幅 */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(100),
        content: z.string().min(1).max(300),
        linkUrl: z.string().optional(),
        linkText: z.string().max(50).optional(),
        icon: z.string().max(50).optional(),
        type: z.enum(["info", "warning", "success", "promo"]).default("info"),
        isActive: z.boolean(),
        sortOrder: z.number().int().default(0),
        startsAt: z.string().optional(),
        endsAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(siteBanners)
        .set({
          title: input.title,
          content: input.content,
          linkUrl: input.linkUrl || null,
          linkText: input.linkText || null,
          icon: input.icon || "🔔",
          type: input.type,
          isActive: input.isActive ? 1 : 0,
          sortOrder: input.sortOrder,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        })
        .where(eq(siteBanners.id, input.id));
      return { success: true };
    }),

  /** 切換啟用/停用 */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(siteBanners)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(siteBanners.id, input.id));
      return { success: true };
    }),

  /** 刪除橫幅 */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(siteBanners).where(eq(siteBanners.id, input.id));
      return { success: true };
    }),
});
