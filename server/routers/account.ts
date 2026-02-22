/**
 * account.ts
 * 帳號系統後端 API：
 * - 邀請碼管理（主帳號產生/撤銷）
 * - 使用邀請碼（受邀者啟用帳號）
 * - 個人命格資料 CRUD
 * - 使用者列表（主帳號查看）
 * - 存取權限驗證（強制登入 + 邀請碼）
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { inviteCodes, userProfiles, users } from "../../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

// ── 工具函數 ──────────────────────────────────────────────────────────────────

/** 產生 8 位英數邀請碼 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** 判斷當前使用者是否為主帳號（owner）
 * 優先用 role='admin'，備用 OWNER_OPEN_ID 比對
 */
function isOwner(openId: string, role?: string | null): boolean {
  if (role === "admin") return true;
  return ENV.ownerOpenId !== "" && openId === ENV.ownerOpenId;
}

/** 取得使用者的邀請碼啟用狀態（是否已通過邀請碼驗證） */
async function getUserInviteStatus(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const row = await db.select({ id: inviteCodes.id })
    .from(inviteCodes)
    .where(and(eq(inviteCodes.usedBy, userId), eq(inviteCodes.isUsed, 1)))
    .limit(1);
  return row.length > 0;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const accountRouter = router({
  /**
   * 取得當前使用者的帳號狀態
   * 包含：是否為主帳號、是否已啟用邀請碼、命格資料是否填寫
   */
  getStatus: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return { isLoggedIn: false, isOwner: false, isActivated: false, hasProfile: false };
    }
    const owner = isOwner(ctx.user.openId, ctx.user.role);
    const activated = owner || await getUserInviteStatus(ctx.user.id);
    const db = await getDb();
    let hasProfile = false;
    if (db) {
      const profile = await db.select({ id: userProfiles.id })
        .from(userProfiles)
        .where(eq(userProfiles.userId, ctx.user.id))
        .limit(1);
      hasProfile = profile.length > 0;
    }
    return {
      isLoggedIn: true,
      isOwner: owner,
      isActivated: activated,
      hasProfile,
      userId: ctx.user.id,
      userName: ctx.user.name,
    };
  }),

  /**
   * 使用邀請碼啟用帳號（受邀者呼叫）
   */
  useInviteCode: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(16).toUpperCase() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      // 已是主帳號，不需要邀請碼
      if (isOwner(ctx.user.openId, ctx.user.role)) return { success: true, message: "主帳號無需邀請碼" };
      // 已經啟用過
      const alreadyActivated = await getUserInviteStatus(ctx.user.id);
      if (alreadyActivated) return { success: true, message: "帳號已啟用" };
      // 查詢邀請碼
      const rows = await db.select().from(inviteCodes)
        .where(and(eq(inviteCodes.code, input.code), eq(inviteCodes.isUsed, 0)))
        .limit(1);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "邀請碼無效或已使用" });
      }
      const invite = rows[0];
      // 檢查是否過期
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "邀請碼已過期" });
      }
      // 標記為已使用
      await db.update(inviteCodes)
        .set({ isUsed: 1, usedBy: ctx.user.id, usedAt: new Date() })
        .where(eq(inviteCodes.id, invite.id));
      return { success: true, message: "帳號啟用成功！歡迎使用天命共振系統" };
    }),

  // ── 主帳號專屬：邀請碼管理 ──────────────────────────────────────────────────

  /**
   * 產生新邀請碼（主帳號專屬）
   */
  createInviteCode: protectedProcedure
    .input(z.object({
      label: z.string().max(100).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可產生邀請碼" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      // 確保邀請碼唯一
      let code = generateCode();
      for (let i = 0; i < 5; i++) {
        const existing = await db.select({ id: inviteCodes.id })
          .from(inviteCodes).where(eq(inviteCodes.code, code)).limit(1);
        if (existing.length === 0) break;
        code = generateCode();
      }
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86400000)
        : null;
      await db.insert(inviteCodes).values({
        code,
        createdBy: ctx.user.id,
        label: input.label,
        isUsed: 0,
        expiresAt: expiresAt ?? undefined,
      });
      return { code, label: input.label, expiresAt };
    }),

  /**
   * 取得所有邀請碼列表（主帳號專屬）
   */
  listInviteCodes: protectedProcedure.query(async ({ ctx }) => {
    if (!isOwner(ctx.user.openId, ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可查看邀請碼" });
    }
    const db = await getDb();
    if (!db) return [];
    return db.select().from(inviteCodes)
      .where(eq(inviteCodes.createdBy, ctx.user.id))
      .orderBy(desc(inviteCodes.createdAt));
  }),

  /**
   * 撤銷邀請碼（主帳號專屬，僅可撤銷未使用的）
   */
  revokeInviteCode: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可撤銷邀請碼" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(inviteCodes)
        .where(and(eq(inviteCodes.id, input.id), eq(inviteCodes.createdBy, ctx.user.id)))
        .limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      if (rows[0].isUsed) throw new TRPCError({ code: "BAD_REQUEST", message: "已使用的邀請碼無法撤銷" });
      await db.delete(inviteCodes).where(eq(inviteCodes.id, input.id));
      return { success: true };
    }),

  /**
   * 取得使用者列表（主帳號專屬）
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!isOwner(ctx.user.openId, ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可查看使用者列表" });
    }
    const db = await getDb();
    if (!db) return [];
    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    }).from(users).orderBy(desc(users.createdAt));
    // 查詢每位使用者的邀請碼啟用狀態
    const activatedUserIds = new Set<number>();
    const usedCodes = await db.select({ usedBy: inviteCodes.usedBy })
      .from(inviteCodes).where(eq(inviteCodes.isUsed, 1));
    usedCodes.forEach(r => { if (r.usedBy) activatedUserIds.add(r.usedBy); });
    return allUsers.map(u => ({
      ...u,
      isOwner: u.role === "admin",
      isActivated: isOwner(ctx.user.openId, ctx.user.role) || activatedUserIds.has(u.id),
    }));
  }),

  // ── 個人命格資料 ────────────────────────────────────────────────────────────

  /**
   * 取得個人命格資料
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, ctx.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  /**
   * 儲存/更新個人命格資料（upsert）
   */
  saveProfile: protectedProcedure
    .input(z.object({
      displayName: z.string().max(100).optional(),
      birthPlace: z.string().max(100).optional(),
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      birthHour: z.string().max(4).optional(),
      yearPillar: z.string().max(8).optional(),
      monthPillar: z.string().max(8).optional(),
      dayPillar: z.string().max(8).optional(),
      hourPillar: z.string().max(8).optional(),
      dayMasterElement: z.enum(["fire", "earth", "metal", "wood", "water"]).optional(),
      favorableElements: z.string().max(100).optional(),
      unfavorableElements: z.string().max(100).optional(),
      notes: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: userProfiles.id })
        .from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
      if (existing.length > 0) {
        await db.update(userProfiles).set({ ...input, updatedAt: new Date() })
          .where(eq(userProfiles.userId, ctx.user.id));
      } else {
        await db.insert(userProfiles).values({ ...input, userId: ctx.user.id });
      }
      return { success: true };
    }),

  /**
   * 主帳號查看指定使用者的命格資料
   */
  getProfileByUserId: protectedProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(userProfiles)
        .where(eq(userProfiles.userId, input.userId)).limit(1);
      return rows[0] ?? null;
    }),
});
