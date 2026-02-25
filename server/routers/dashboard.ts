/**
 * dashboard.ts
 * 管理員儀表板後端 API：
 * - getKpis：總用戶數、活躍用戶、方案分佈、積分統計
 * - getHourlyActivity：24 小時活躍時段分析（依擲筊/選號記錄）
 * - listUsersFiltered：進階用戶篩選（生命靈數/方案/最後上線）+ 分頁
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import {
  users,
  userProfiles,
  oracleSessions,
  lotterySessions,
  scratchLogs,
  inviteCodes,
  pointsTransactions,
} from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte, isNotNull, or, like, count } from "drizzle-orm";

function isOwner(openId: string, role?: string | null): boolean {
  if (role === "admin") return true;
  return ENV.ownerOpenId !== "" && openId === ENV.ownerOpenId;
}

export const dashboardRouter = router({
  /**
   * 取得管理員儀表板 KPI 數據
   * - 總用戶數、已啟用用戶數、本週新增用戶數
   * - 方案分佈（basic/advanced/professional 各幾人）
   * - 積分統計（總發放積分、總消耗積分）
   * - 今日活躍用戶數（今日有擲筊或選號的用戶）
   */
  getKpis: protectedProcedure.query(async ({ ctx }) => {
    if (!isOwner(ctx.user.openId, ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "僅管理員可查看儀表板" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalUsersRows,
      activatedUsersRows,
      newUsersThisWeekRows,
      planDistRows,
      totalPointsGrantedRows,
      totalPointsSpentRows,
      todayActiveRows,
    ] = await Promise.all([
      // 總用戶數
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
      // 已啟用用戶數（使用過邀請碼的用戶）—— 欄位是 usedBy 不是 userId
      db.select({ count: sql<number>`COUNT(DISTINCT usedBy)` })
        .from(inviteCodes)
        .where(and(eq(inviteCodes.isUsed, 1), isNotNull(inviteCodes.usedBy))),
      // 本週新增用戶數
      db.select({ count: sql<number>`COUNT(*)` })
        .from(users)
        .where(gte(users.createdAt, weekAgo)),
      // 方案分佈
      db.select({
        planId: users.planId,
        count: sql<number>`COUNT(*)`,
      }).from(users).groupBy(users.planId),
      // 總發放積分
      db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(pointsTransactions)
        .where(gte(pointsTransactions.amount, 1)),
      // 總消耗積分
      db.select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
        .from(pointsTransactions)
        .where(lte(pointsTransactions.amount, -1)),
      // 今日活躍用戶數（今日有擲筊記錄）
      db.select({ count: sql<number>`COUNT(DISTINCT userId)` })
        .from(oracleSessions)
        .where(gte(oracleSessions.createdAt, todayStart)),
    ]);

    const totalUsers = Number(totalUsersRows[0]?.count ?? 0);
    // admin 本人也計入已啟用，加上 admin 數量
    const adminCount = await db.select({ count: sql<number>`COUNT(*)` }).from(users).where(eq(users.role, "admin"));
    const activatedByInvite = Number(activatedUsersRows[0]?.count ?? 0);
    const activatedUsers = Math.min(totalUsers, activatedByInvite + Number(adminCount[0]?.count ?? 0));
    const newUsersThisWeek = Number(newUsersThisWeekRows[0]?.count ?? 0);
    const todayActive = Number(todayActiveRows[0]?.count ?? 0);
    const totalPointsGranted = Number(totalPointsGrantedRows[0]?.total ?? 0);
    const totalPointsSpent = Number(totalPointsSpentRows[0]?.total ?? 0);

    // 方案分佈轉為物件
    const planDist: Record<string, number> = { basic: 0, advanced: 0, professional: 0 };
    for (const row of planDistRows) {
      if (row.planId) planDist[row.planId] = Number(row.count);
    }

    return {
      totalUsers,
      activatedUsers,
      newUsersThisWeek,
      todayActive,
      planDist,
      totalPointsGranted,
      totalPointsSpent,
    };
  }),

  /**
   * 取得 24 小時活躍時段分析
   * 依擲筊記錄的 createdAt 小時分組，回傳每個小時的活躍次數
   * 以台灣時間（UTC+8）計算
   */
  getHourlyActivity: protectedProcedure.query(async ({ ctx }) => {
    if (!isOwner(ctx.user.openId, ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "僅管理員可查看儀表板" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // 取最近 30 天的擲筊記錄，依台灣時間小時分組
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const oracleHours = await db
      .select({
        hour: sql<number>`HOUR(CONVERT_TZ(createdAt, '+00:00', '+08:00'))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(oracleSessions)
      .where(gte(oracleSessions.createdAt, thirtyDaysAgo))
      .groupBy(sql`HOUR(CONVERT_TZ(createdAt, '+00:00', '+08:00'))`);

    const lotteryHours = await db
      .select({
        hour: sql<number>`HOUR(CONVERT_TZ(createdAt, '+00:00', '+08:00'))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(lotterySessions)
      .where(gte(lotterySessions.createdAt, thirtyDaysAgo))
      .groupBy(sql`HOUR(CONVERT_TZ(createdAt, '+00:00', '+08:00'))`);

    // 合併兩個來源，建立 24 小時陣列
    const hourlyData: { hour: number; oracle: number; lottery: number; total: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const oracleRow = oracleHours.find(r => Number(r.hour) === h);
      const lotteryRow = lotteryHours.find(r => Number(r.hour) === h);
      const oracle = Number(oracleRow?.count ?? 0);
      const lottery = Number(lotteryRow?.count ?? 0);
      hourlyData.push({ hour: h, oracle, lottery, total: oracle + lottery });
    }

    return hourlyData;
  }),

  /**
   * 進階用戶篩選 + 分頁
   * 支援篩選：生命靈數、方案等級、最後上線時間、搜尋名稱
   * 支援分頁：page + pageSize
   */
  listUsersFiltered: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
      // 篩選條件
      lifePathNumber: z.number().int().min(0).max(22).optional(),
      planId: z.enum(["basic", "advanced", "professional"]).optional(),
      // 最後上線：'7d' | '30d' | '90d' | 'inactive90d'
      lastActiveFilter: z.enum(["7d", "30d", "90d", "inactive90d"]).optional(),
      // 搜尋名稱
      searchName: z.string().max(50).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "僅管理員可查看用戶列表" });
      }
      const db = await getDb();
      if (!db) return { users: [], total: 0, page: input.page, pageSize: input.pageSize };

      const now = new Date();
      const offset = (input.page - 1) * input.pageSize;

      // 建立基本查詢條件
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.planId) {
        conditions.push(eq(users.planId, input.planId));
      }
      if (input.lastActiveFilter) {
        if (input.lastActiveFilter === "7d") {
          conditions.push(gte(users.lastSignedIn, new Date(now.getTime() - 7 * 86400000)));
        } else if (input.lastActiveFilter === "30d") {
          conditions.push(gte(users.lastSignedIn, new Date(now.getTime() - 30 * 86400000)));
        } else if (input.lastActiveFilter === "90d") {
          conditions.push(gte(users.lastSignedIn, new Date(now.getTime() - 90 * 86400000)));
        } else if (input.lastActiveFilter === "inactive90d") {
          conditions.push(lte(users.lastSignedIn, new Date(now.getTime() - 90 * 86400000)));
        }
      }

      // 取得所有符合條件的用戶 ID（先 join userProfiles 篩選生命靈數）
      let userIds: number[] | null = null;
      if (input.lifePathNumber !== undefined || input.searchName) {
        // 需要 join userProfiles
        const profileQuery = db
          .select({ userId: userProfiles.userId })
          .from(userProfiles);
        const profileConditions = [];
        if (input.lifePathNumber !== undefined) {
          profileConditions.push(eq(userProfiles.lifePathNumber, input.lifePathNumber));
        }
        if (input.searchName) {
          profileConditions.push(like(userProfiles.displayName, `%${input.searchName}%`));
        }
        const profileRows = profileConditions.length > 0
          ? await profileQuery.where(and(...profileConditions as [ReturnType<typeof eq>]))
          : await profileQuery;
        userIds = profileRows.map(r => r.userId);
        if (userIds.length === 0) {
          return { users: [], total: 0, page: input.page, pageSize: input.pageSize };
        }
      }

      // 查詢用戶列表
      const baseWhere = conditions.length > 0 ? and(...conditions as [ReturnType<typeof eq>]) : undefined;

      // 取得總數
      let totalCount = 0;
      if (userIds !== null) {
        // 有 userIds 限制
        const countRows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(
            baseWhere
              ? and(baseWhere, sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
              : sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`
          );
        totalCount = Number(countRows[0]?.count ?? 0);
      } else {
        const countRows = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(baseWhere);
        totalCount = Number(countRows[0]?.count ?? 0);
      }

      // 取得分頁用戶
      let allUsers;
      if (userIds !== null) {
        allUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            planId: users.planId,
            planExpiresAt: users.planExpiresAt,
            pointsBalance: users.pointsBalance,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(
            baseWhere
              ? and(baseWhere, sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
              : sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`
          )
          .orderBy(desc(users.lastSignedIn))
          .limit(input.pageSize)
          .offset(offset);
      } else {
        allUsers = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            planId: users.planId,
            planExpiresAt: users.planExpiresAt,
            pointsBalance: users.pointsBalance,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(baseWhere)
          .orderBy(desc(users.lastSignedIn))
          .limit(input.pageSize)
          .offset(offset);
      }

      // 查詢這些用戶的命格資料
      const userIdList = allUsers.map(u => u.id);
      let profileMap = new Map<number, { displayName: string | null; lifePathNumber: number | null; dayMasterElement: string | null }>();
      if (userIdList.length > 0) {
        const profiles = await db
          .select({
            userId: userProfiles.userId,
            displayName: userProfiles.displayName,
            lifePathNumber: userProfiles.lifePathNumber,
            dayMasterElement: userProfiles.dayMasterElement,
          })
          .from(userProfiles)
          .where(sql`userId IN (${sql.join(userIdList.map(id => sql`${id}`), sql`, `)})`);
        profileMap = new Map(profiles.map(p => [p.userId, p]));
      }

      // 查詢已啟用用戶
      const activatedSet = new Set<number>();
      if (userIdList.length > 0) {
        const activatedRows = await db
          .select({ usedBy: inviteCodes.usedBy })
          .from(inviteCodes)
          .where(
            and(
              eq(inviteCodes.isUsed, 1),
              sql`usedBy IN (${sql.join(userIdList.map(id => sql`${id}`), sql`, `)})`
            )
          );
        activatedRows.forEach(r => { if (r.usedBy) activatedSet.add(r.usedBy); });
      }

      const result = allUsers.map(u => ({
        ...u,
        isOwner: u.role === "admin",
        isActivated: u.role === "admin" || activatedSet.has(u.id),
        profile: profileMap.get(u.id) ?? null,
      }));

      return {
        users: result,
        total: totalCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(totalCount / input.pageSize),
      };
    }),
});
