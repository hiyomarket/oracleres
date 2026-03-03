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
import { inviteCodes, userProfiles, users, oracleSessions, lotterySessions, scratchLogs, userSubscriptions } from "../../drizzle/schema";
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
    // 開放式系統：所有已登入用戶均視為已啟用，不需邀請碼
    const activated = true;
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
   * 推算八字命格（不儲存，僅回傳推算結果供前端預覽）
   * hourIndex: 0-11 對應十二時辰（子丑寅卯辰巳午未申酉戌亥）
   */
  previewBazi: protectedProcedure
    .input(z.object({
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '請輸入 YYYY-MM-DD 格式'),
      hourIndex: z.number().int().min(0).max(11).optional(),
    }))
    .query(async ({ input }) => {
      const { calculateBazi } = await import('../lib/baziCalculator');
      const HOUR_INDEX_TO_TIME = [
        '00:30', '02:30', '04:30', '06:30', '08:30', '10:30',
        '12:30', '14:30', '16:30', '18:30', '20:30', '22:30'
      ];
      const birthTime = input.hourIndex !== undefined
        ? HOUR_INDEX_TO_TIME[input.hourIndex]
        : '12:00';
      return calculateBazi(input.birthDate, birthTime);
    }),

  /**
   * 推算八字並儲存到用戶命格資料
   * hourIndex: 0-11 對應十二時辰（子丑寅卯辰巳午未申酉戌亥）
   */
  calculateAndSaveBazi: protectedProcedure
    .input(z.object({
      birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '請輸入 YYYY-MM-DD 格式'),
      hourIndex: z.number().int().min(0).max(11).optional(),
      displayName: z.string().max(50).optional(),
      birthPlace: z.string().max(100).optional(),
      birthLunar: z.string().max(100).optional(), // 前端已有農曆字串可直接傳入，否則後端自動推算
    }))
    .mutation(async ({ input, ctx }) => {
      const { calculateBazi } = await import('../lib/baziCalculator');
      const HOUR_INDEX_TO_TIME = [
        '00:30', '02:30', '04:30', '06:30', '08:30', '10:30',
        '12:30', '14:30', '16:30', '18:30', '20:30', '22:30'
      ];
      const birthTime = input.hourIndex !== undefined
        ? HOUR_INDEX_TO_TIME[input.hourIndex]
        : '12:00';
      const result = calculateBazi(input.birthDate, birthTime);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '資料庫連線失敗' });
      const existing = await db.select({ id: userProfiles.id })
        .from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
      // 計算主要靈數（靈魂渴望）——蘇祐震塔羅系統正確邏輯
      // 外層靈數：日期本身 ≤22 直接用，>22 才拆位數相加
      // 中層靈數：外層靈數 + 月份處理結果（月份≥10才拆位數）
      // 靈魂數：年份各位數相加，22保留
      // 主要靈數：中層靈數 + 靈魂數
      function reduceToMaster(n: number): number {
        while (n > 22) {
          n = n.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
        }
        return n;
      }
      const [yStr, mStr, dStr] = input.birthDate.split('-');
      const _y = parseInt(yStr), _m = parseInt(mStr), _d = parseInt(dStr);
      // 外層靈數：日期本身 ≤22 直接用，>22 才拆位數相加
      const _outer = reduceToMaster(_d);
      // 月份處理：月份 ≥10 才各位數相加
      const _monthProcessed = _m >= 10 ? Math.floor(_m / 10) + (_m % 10) : _m;
      // 中層靈數：外層靈數 + 月份處理結果
      const _middleRaw = _outer + _monthProcessed;
      const _middle = reduceToMaster(_middleRaw);
      // 靈魂數：年份各位數相加，22保留
      const _yearRaw = _y.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
      const _yearNum = reduceToMaster(_yearRaw);
      // 主要靈數：中層靈數 + 靈魂數
      const _primaryRaw = _middle + _yearNum;
      const primaryLifeNumber = reduceToMaster(_primaryRaw);
      const baziData = {
        yearPillar: result.yearPillar,
        monthPillar: result.monthPillar,
        dayPillar: result.dayPillar,
        hourPillar: result.hourPillar,
        dayMasterElement: result.dayMasterElement as 'fire' | 'earth' | 'metal' | 'wood' | 'water',
        favorableElements: result.favorableElements,
        unfavorableElements: result.unfavorableElements,
        natalWood: result.elementRatio.wood,
        natalFire: result.elementRatio.fire,
        natalEarth: result.elementRatio.earth,
        natalMetal: result.elementRatio.metal,
        natalWater: result.elementRatio.water,
        lifePathNumber: primaryLifeNumber,
      };
      // 將時辰索引轉為存儲用的 birthDate/birthTime
      const birthDateStr = input.birthDate;
      const birthTimeStr = birthTime; // 已由 hourIndex 轉換
      // 自動推算農曆生日字串（如前端已傳入則直接使用）
      let birthLunarStr = input.birthLunar ?? null;
      if (!birthLunarStr) {
        try {
          const { solarToLunarByYMD } = await import('../lib/lunarConverter');
          const { getYearPillar } = await import('../lib/lunarCalendar');
          const [ly, lm, ld] = input.birthDate.split('-').map(Number);
          const lunar = solarToLunarByYMD(ly, lm, ld);
          const yearPillarLunar = getYearPillar(lunar.lunarYear);
          const yearName = `${yearPillarLunar.stem}${yearPillarLunar.branch}`;
          const leapPrefix = lunar.isLeapMonth ? '閏' : '';
          birthLunarStr = `農曆：${yearName}年${leapPrefix}${lunar.lunarMonthName}${lunar.lunarDayName}`;
        } catch {
          // 農曆推算失敗不阻斷儲存
        }
      }
      if (existing.length > 0) {
        await db.update(userProfiles).set({
          ...baziData,
          birthDate: birthDateStr,
          birthTime: birthTimeStr,
          ...(input.displayName ? { displayName: input.displayName } : {}),
          ...(input.birthPlace ? { birthPlace: input.birthPlace } : {}),
          ...(birthLunarStr ? { birthLunar: birthLunarStr } : {}),
          updatedAt: new Date(),
        }).where(eq(userProfiles.userId, ctx.user.id));
      } else {
        await db.insert(userProfiles).values({
          userId: ctx.user.id,
          ...baziData,
          birthDate: birthDateStr,
          birthTime: birthTimeStr,
          displayName: input.displayName,
          birthPlace: input.birthPlace,
          ...(birthLunarStr ? { birthLunar: birthLunarStr } : {}),
          createdAt: new Date(),
        });
      }
      // 首次建立檔案時：自動分配基礎方案 + 通知主帳號
      if (existing.length === 0) {
        // 自動建立 userSubscriptions 記錄，分配基礎方案
        try {
          const [existingSub] = await db.select({ id: userSubscriptions.id })
            .from(userSubscriptions)
            .where(eq(userSubscriptions.userId, ctx.user.id))
            .limit(1);
          if (!existingSub) {
            await db.insert(userSubscriptions).values({
              userId: ctx.user.id,
              planId: 'basic',
              planExpiresAt: null,
              customModules: [],
            });
            // 同步 users 表的 planId
            await db.update(users)
              .set({ planId: 'basic' })
              .where(eq(users.id, ctx.user.id));
          }
        } catch (e) {
          console.warn('[Account] Failed to assign basic plan:', e);
        }
        const userName = input.displayName ?? ctx.user.name ?? `用戶 #${ctx.user.id}`;
        try {
          await notifyOwner({
            title: `✨ 新用戶命格設定完成`,
            content: `${userName} 已完成命格檔案設定（日主：${baziData.dayMasterElement}，喜用神：${baziData.favorableElements}）。天命共振系統已為其開啟個人化分析。`,
          });
        } catch (e) {
          console.warn('[Account] Failed to notify owner:', e);
        }
      }
      return { success: true, bazi: result };
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

  /**
   * 主帳號刪除指定用戶帳號（包含所有關聯資料）
   * 將刪除：users、userProfiles、oracleSessions、lotterySessions、
   *           lotteryResults、scratchLogs、braceletWearLogs、favoriteStores
   */
  deleteUser: protectedProcedure
    .input(z.object({ userId: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "僅主帳號可刪除用戶" });
      }
      // 不允許刪除自己
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "不能刪除自己的帳號" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { braceletWearLogs, favoriteStores, lotteryResults, userPermissions, inviteCodes: inviteCodesTable } = await import("../../drizzle/schema");

      // 依序刪除關聯資料
      await Promise.all([
        db.delete(userProfiles).where(eq(userProfiles.userId, input.userId)),
        db.delete(oracleSessions).where(eq(oracleSessions.userId, input.userId)),
        db.delete(lotterySessions).where(eq(lotterySessions.userId, input.userId)),
        db.delete(lotteryResults).where(eq(lotteryResults.userId, input.userId)),
        db.delete(scratchLogs).where(eq(scratchLogs.userId, input.userId)),
        db.delete(braceletWearLogs).where(eq(braceletWearLogs.userId, input.userId)),
        db.delete(favoriteStores).where(eq(favoriteStores.userId, input.userId)),
        db.delete(userPermissions).where(eq(userPermissions.userId, input.userId)),
        // 將對應的邀請碼標記為未使用（保留邀請碼記錄）
        db.update(inviteCodesTable)
          .set({ usedBy: null, isUsed: 0, usedAt: null })
          .where(eq(inviteCodesTable.usedBy, input.userId)),
      ]);
      // 最後刪除用戶本身
      await db.delete(users).where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * 用戶自行刪除自己的帳號（保障用戶權益）
   * 將刪除登入者自己的所有資料，並清除 session
   */
  deleteSelf: protectedProcedure
    .mutation(async ({ ctx }) => {
      // 主帳號不允許自刪（避免意外刪除系統管理帳號）
      if (isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "主帳號不能自行刪除" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { braceletWearLogs, favoriteStores, lotteryResults, userPermissions, inviteCodes: inviteCodesTable } = await import("../../drizzle/schema");

      const userId = ctx.user.id;
      await Promise.all([
        db.delete(userProfiles).where(eq(userProfiles.userId, userId)),
        db.delete(oracleSessions).where(eq(oracleSessions.userId, userId)),
        db.delete(lotterySessions).where(eq(lotterySessions.userId, userId)),
        db.delete(lotteryResults).where(eq(lotteryResults.userId, userId)),
        db.delete(scratchLogs).where(eq(scratchLogs.userId, userId)),
        db.delete(braceletWearLogs).where(eq(braceletWearLogs.userId, userId)),
        db.delete(favoriteStores).where(eq(favoriteStores.userId, userId)),
        db.delete(userPermissions).where(eq(userPermissions.userId, userId)),
        db.update(inviteCodesTable)
          .set({ usedBy: null, isUsed: 0, usedAt: null })
          .where(eq(inviteCodesTable.usedBy, userId)),
      ]);
      await db.delete(users).where(eq(users.id, userId));

      return { success: true };
    }),
});
