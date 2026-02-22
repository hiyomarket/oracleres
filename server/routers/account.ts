/**
 * account.ts
 * 帳號系統後端 API：
 * - 邀請碼管理（主帳號產生/撤銷，支援命格預填）
 * - 使用邀請碼（受邀者啟用帳號，自動帶入命格）
 * - 個人命格資料 CRUD
 * - 使用者列表（含命格資料）
 * - 使用者統計（擲筊/選號/購彩次數）
 * - 存取權限驗證（強制登入 + 邀請碼）
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { inviteCodes, userProfiles, users, oracleSessions, lotterySessions, scratchLogs } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

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
   * 若邀請碼有命格預填，自動建立 userProfiles 記錄
   */
  useInviteCode: protectedProcedure
    .input(z.object({ code: z.string().min(6).max(16).toUpperCase() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      if (isOwner(ctx.user.openId, ctx.user.role)) return { success: true, message: "主帳號無需邀請碼" };
      const alreadyActivated = await getUserInviteStatus(ctx.user.id);
      if (alreadyActivated) return { success: true, message: "帳號已啟用" };
      const rows = await db.select().from(inviteCodes)
        .where(and(eq(inviteCodes.code, input.code), eq(inviteCodes.isUsed, 0)))
        .limit(1);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "邀請碼無效或已使用" });
      }
      const invite = rows[0];
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "邀請碼已過期" });
      }
      await db.update(inviteCodes)
        .set({ isUsed: 1, usedBy: ctx.user.id, usedAt: new Date() })
        .where(eq(inviteCodes.id, invite.id));
      // 若邀請碼有命格預填，自動建立 userProfiles
      if (invite.presetDayMasterElement || invite.presetDisplayName) {
        const existing = await db.select({ id: userProfiles.id })
          .from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
        if (existing.length === 0) {
          await db.insert(userProfiles).values({
            userId: ctx.user.id,
            displayName: invite.presetDisplayName ?? undefined,
            birthDate: invite.presetBirthDate ?? undefined,
            birthTime: invite.presetBirthTime ?? undefined,
            dayMasterElement: invite.presetDayMasterElement ?? undefined,
            favorableElements: invite.presetFavorableElements ?? undefined,
            unfavorableElements: invite.presetUnfavorableElements ?? undefined,
          });
        }
      }
      return { success: true, message: "帳號啟用成功！歡迎使用天命共振系統" };
    }),

  // ── 主帳號專屬：邀請碼管理 ──────────────────────────────────────────────────

  /**
   * 產生新邀請碼（主帳號專屬，支援命格預填）
   */
  createInviteCode: protectedProcedure
    .input(z.object({
      label: z.string().max(100).optional(),
      expiresInDays: z.number().int().min(1).max(365).optional(),
      presetDisplayName: z.string().max(100).optional(),
      presetBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      presetBirthTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      presetDayMasterElement: z.enum(["fire", "earth", "metal", "wood", "water"]).optional(),
      presetFavorableElements: z.string().max(100).optional(),
      presetUnfavorableElements: z.string().max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可產生邀請碼" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
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
        presetDisplayName: input.presetDisplayName,
        presetBirthDate: input.presetBirthDate,
        presetBirthTime: input.presetBirthTime,
        presetDayMasterElement: input.presetDayMasterElement,
        presetFavorableElements: input.presetFavorableElements,
        presetUnfavorableElements: input.presetUnfavorableElements,
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
   * 取得使用者列表（主帳號專屬，含命格資料）
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
    const activatedUserIds = new Set<number>();
    const usedCodes = await db.select({ usedBy: inviteCodes.usedBy })
      .from(inviteCodes).where(eq(inviteCodes.isUsed, 1));
    usedCodes.forEach(r => { if (r.usedBy) activatedUserIds.add(r.usedBy); });
    // 查詢所有命格資料
    const allProfiles = await db.select().from(userProfiles);
    const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
    return allUsers.map(u => ({
      ...u,
      isOwner: u.role === "admin",
      isActivated: isOwner(ctx.user.openId, ctx.user.role) || activatedUserIds.has(u.id),
      profile: profileMap.get(u.id) ?? null,
    }));
  }),

  /**
   * 主帳號查詢指定使用者的使用統計
   */
  getUserStats: protectedProcedure
    .input(z.object({ userId: z.number().int() }))
    .query(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) return { oracleCount: 0, lotteryCount: 0, scratchCount: 0 };
      const [oracleRows, lotteryRows, scratchRows] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` }).from(oracleSessions).where(eq(oracleSessions.userId, input.userId)),
        db.select({ count: sql<number>`COUNT(*)` }).from(lotterySessions).where(eq(lotterySessions.userId, input.userId)),
        db.select({ count: sql<number>`COUNT(*)` }).from(scratchLogs).where(eq(scratchLogs.userId, input.userId)),
      ]);
      return {
        oracleCount: Number(oracleRows[0]?.count ?? 0),
        lotteryCount: Number(lotteryRows[0]?.count ?? 0),
        scratchCount: Number(scratchRows[0]?.count ?? 0),
      };
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
      occupation: z.string().max(200).optional(),
      birthLunar: z.string().max(100).optional(),
      notes: z.string().max(2000).optional(),
    }))
     .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select({ id: userProfiles.id, displayName: userProfiles.displayName })
        .from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
      const isFirstTime = existing.length === 0;
      if (existing.length > 0) {
        await db.update(userProfiles).set({ ...input, updatedAt: new Date() })
          .where(eq(userProfiles.userId, ctx.user.id));
      } else {
        await db.insert(userProfiles).values({ ...input, userId: ctx.user.id });
      }
      // 首次填寫命格資料時，通知管理員
      if (isFirstTime && (input.displayName || input.dayMasterElement)) {
        const userName = input.displayName ?? ctx.user.name ?? `用戶 #${ctx.user.id}`;
        const dayMasterLabel = input.dayMasterElement
          ? `（日主：${{ fire: '丙丁火', earth: '戊己土', metal: '庚辛金', wood: '甲乙木', water: '壬癸水' }[input.dayMasterElement] ?? input.dayMasterElement}）`
          : '';
        const favorableLabel = input.favorableElements
          ? `，喜用神：${input.favorableElements}` : '';
        try {
          await notifyOwner({
            title: `✨ 新用戶命格設定完成`,
            content: `${userName} 已完成命格檔案設定${dayMasterLabel}${favorableLabel}。天命共振系統已為其開啟個人化分析。`,
          });
        } catch (e) {
          console.warn('[Account] Failed to notify owner:', e);
        }
      }
      return { success: true, isFirstTime };
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
