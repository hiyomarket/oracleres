/**
 * Expert Router - 服務項目管理
 */
import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { experts, expertServices } from "../../../drizzle/schema";
import { eq, and, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { requireExpert, findExpert, requireExpertOrAdmin } from "./_helpers";

export const expertServicesRouter = router({

  /** 取得當前專家的所有服務項目 */
  listMyServices: protectedProcedure.query(async ({ ctx }) => {
    requireExpertOrAdmin(ctx.user.role);
    const expert = await findExpert(ctx.user.id);
    if (!expert) return [];
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

  /** 切換服務啟用狀態 */
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

  /** 刪除服務項目 */
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
});
