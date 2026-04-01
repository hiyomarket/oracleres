/**
 * Expert Router - 個人資料管理
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { experts } from "../../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../../storage";
import { requireExpert, requireExpertOrAdmin } from "./_helpers";

export const expertProfileRouter = router({

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

  // ── 專家收藏 ──
  checkFavorite: publicProcedure
    .input(z.object({ expertId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) return { isFavorite: false };
      const db = (await getDb())!;
      const { expertFavorites } = await import("../../../drizzle/schema");
      const rows = await db.select().from(expertFavorites)
        .where(and(eq(expertFavorites.userId, ctx.user.id), eq(expertFavorites.expertId, input.expertId)))
        .limit(1);
      return { isFavorite: rows.length > 0 };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ expertId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const { expertFavorites } = await import("../../../drizzle/schema");
      const existing = await db.select().from(expertFavorites)
        .where(and(eq(expertFavorites.userId, ctx.user.id), eq(expertFavorites.expertId, input.expertId)))
        .limit(1);
      if (existing.length > 0) {
        await db.delete(expertFavorites).where(eq(expertFavorites.id, existing[0].id));
        return { isFavorite: false };
      } else {
        await db.insert(expertFavorites).values({ userId: ctx.user.id, expertId: input.expertId, createdAt: Date.now() });
        return { isFavorite: true };
      }
    }),

  getMyFavorites: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;
    const { expertFavorites, experts } = await import("../../../drizzle/schema");
    const rows = await db.select({
      id: expertFavorites.id,
      expertId: expertFavorites.expertId,
      createdAt: expertFavorites.createdAt,
      publicName: experts.publicName,
      title: experts.title,
      profileImage: experts.profileImage,
      ratingAvg: experts.ratingAvg,
      ratingCount: experts.ratingCount,
    })
    .from(expertFavorites)
    .leftJoin(experts, eq(expertFavorites.expertId, experts.id))
    .where(eq(expertFavorites.userId, ctx.user.id))
    .orderBy(desc(expertFavorites.createdAt));
    return rows;
  }),

});