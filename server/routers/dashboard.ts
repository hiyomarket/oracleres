/**
 * dashboard.ts
 * 管理員儀表板後端 API：
 * - getKpis：總用戶數、活躍用戶、方案分佈、積分統計
 * - getHourlyActivity：24 小時活躍時段分析（依擲筊/選號記錄）
 * - listUsersFiltered：進階用戶篩選（生命靈數/方案/最後上線）+ 分頁
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
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
  divinationSessions,
  wbcBets,
  wealthJournal,
  featureRedemptions,
  currencyExchangeLogs,
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
      totalCoinsGrantedRows,
      avgCoinsRows,
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
      // 累積發放遊戲幣（透過兑換獲得的）
      db.select({ total: sql<number>`COALESCE(SUM(gameCoinsAmount), 0)` })
        .from(currencyExchangeLogs)
        .where(gte(currencyExchangeLogs.gameCoinsAmount, 1)),
      // 用戶平均遊戲幣
      db.select({ avg: sql<number>`COALESCE(AVG(gameCoins), 0)` }).from(users),
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
    const totalCoinsGranted = Number(totalCoinsGrantedRows[0]?.total ?? 0);
    const avgCoinsPerUser = Math.round(Number(avgCoinsRows[0]?.avg ?? 0));

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
      totalCoinsGranted,
      avgCoinsPerUser,
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
      pageSize: z.number().int().min(1).max(100).default(20),
      // 篩選條件
      lifePathNumber: z.number().int().min(0).max(22).optional(),
      planId: z.string().max(50).optional(),
      // 最後上線：'7d' | '30d' | '90d' | 'inactive90d'
      lastActiveFilter: z.enum(["7d", "30d", "90d", "inactive90d"]).optional(),
      // 搜尋名稱
      searchName: z.string().max(50).optional(),
      // 角色篩選
      roleFilter: z.enum(["all", "user", "expert", "admin"]).optional(),
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
      if (input.roleFilter && input.roleFilter !== "all") {
        conditions.push(eq(users.role, input.roleFilter as "user" | "expert" | "admin"));
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

  /**
   * 批量重算生命靈數（针對尚未計算靈數的用戶）
   */
  batchRecalcLifePathNumbers: protectedProcedure
    .input(z.object({
      onlyMissing: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isOwner(ctx.user.openId, ctx.user.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '僅管理員可執行此操作' });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const profiles = await db
        .select({
          id: userProfiles.id,
          birthDate: userProfiles.birthDate,
          lifePathNumber: userProfiles.lifePathNumber,
        })
        .from(userProfiles)
        .where(isNotNull(userProfiles.birthDate));
      function reduceToMaster(n: number): number {
        while (n > 22) {
          n = n.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
        }
        return n;
      }
      let updated = 0;
      let skipped = 0;
      for (const p of profiles) {
        if (!p.birthDate) { skipped++; continue; }
        if (input.onlyMissing && p.lifePathNumber !== null && p.lifePathNumber !== undefined) {
          skipped++;
          continue;
        }
        try {
          const [yStr, mStr, dStr] = p.birthDate.split('-');
          const _y = parseInt(yStr), _m = parseInt(mStr), _d = parseInt(dStr);
          if (isNaN(_y) || isNaN(_m) || isNaN(_d)) { skipped++; continue; }
          const _middleRaw = _m.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0)
            + _d.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
          const _middle = reduceToMaster(_middleRaw);
          const _yearRaw = _y.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
          const _yearNum = reduceToMaster(_yearRaw);
          const _primaryRaw = _middle + _yearNum;
          const lifePathNumber = reduceToMaster(_primaryRaw);
          await db.update(userProfiles)
            .set({ lifePathNumber })
            .where(eq(userProfiles.id, p.id));
          updated++;
        } catch {
          skipped++;
        }
      }
      return { updated, skipped, total: profiles.length };
    }),

  /** 取得各功能使用頻率統計（近 30 天 / 近 7 天） */
  getFeatureUsage: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [oT, o7, lT, l7, sT, s7, dT, d7, wbcT, wbc7, wjT, wj7, frT] = await Promise.all([
      db.select({ c: sql<number>`COUNT(*)` }).from(oracleSessions).where(gte(oracleSessions.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(oracleSessions).where(gte(oracleSessions.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(lotterySessions).where(gte(lotterySessions.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(lotterySessions).where(gte(lotterySessions.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(scratchLogs).where(gte(scratchLogs.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(scratchLogs).where(gte(scratchLogs.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(divinationSessions).where(gte(divinationSessions.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(divinationSessions).where(gte(divinationSessions.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(wbcBets).where(gte(wbcBets.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(wbcBets).where(gte(wbcBets.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(wealthJournal).where(gte(wealthJournal.createdAt, thirtyDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(wealthJournal).where(gte(wealthJournal.createdAt, sevenDaysAgo)),
      db.select({ c: sql<number>`COUNT(*)` }).from(featureRedemptions).where(gte(featureRedemptions.createdAt, thirtyDaysAgo)),
    ]);
    const rows = [
      { feature: '擲筊問卦', icon: '🎋', total30d: Number(oT[0]?.c ?? 0), total7d: Number(o7[0]?.c ?? 0) },
      { feature: '補運樂透', icon: '🎰', total30d: Number(lT[0]?.c ?? 0), total7d: Number(l7[0]?.c ?? 0) },
      { feature: '刮刮樂日誌', icon: '🎫', total30d: Number(sT[0]?.c ?? 0), total7d: Number(s7[0]?.c ?? 0) },
      { feature: '擲筊問卦（進階）', icon: '🔮', total30d: Number(dT[0]?.c ?? 0), total7d: Number(d7[0]?.c ?? 0) },
      { feature: '世界盃競猜', icon: '⚽', total30d: Number(wbcT[0]?.c ?? 0), total7d: Number(wbc7[0]?.c ?? 0) },
      { feature: '財富日記', icon: '💰', total30d: Number(wjT[0]?.c ?? 0), total7d: Number(wj7[0]?.c ?? 0) },
      { feature: '功能兌換', icon: '🛒', total30d: Number(frT[0]?.c ?? 0), total7d: 0 },
    ].sort((a, b) => b.total30d - a.total30d);
    return rows;
  }),

  /** 管理員調整用戶遊戲幣（贈送、扣除） */
  adminAdjustCoins: adminProcedure
    .input(z.object({
      userId: z.number(),
      mode: z.enum(['add', 'subtract']),
      amount: z.number().int().min(1).max(999999),
      reason: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [u] = await db.select({ gameCoins: users.gameCoins }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!u) throw new TRPCError({ code: 'NOT_FOUND', message: '用戶不存在' });
      const current = Number(u.gameCoins ?? 0);
      const newCoins = input.mode === 'add' ? current + input.amount : Math.max(0, current - input.amount);
      await db.update(users).set({ gameCoins: newCoins }).where(eq(users.id, input.userId));
      return { success: true, newCoins };
    }),

  /**
   * 管理員調整用戶積分（贈送、扣除、直接設定）
   */
  adminAdjustPoints: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        mode: z.enum(['add', 'subtract', 'set']),
        amount: z.number().int().min(0).max(999999),
        reason: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [u] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!u) throw new TRPCError({ code: 'NOT_FOUND', message: '用戶不存在' });
      const current = Number(u.pointsBalance ?? 0);
      let newBalance: number;
      let txAmount: number;
      let txType: string;
      if (input.mode === 'add') {
        newBalance = current + input.amount;
        txAmount = input.amount;
        txType = 'admin_grant';
      } else if (input.mode === 'subtract') {
        newBalance = Math.max(0, current - input.amount);
        txAmount = -(current - newBalance);
        txType = 'admin_deduct';
      } else {
        txAmount = input.amount - current;
        newBalance = input.amount;
        txType = 'admin_set';
      }
      await db.update(users).set({ pointsBalance: newBalance }).where(eq(users.id, input.userId));
      if (txAmount !== 0) {
        await db.insert(pointsTransactions).values({
          userId: input.userId,
          amount: txAmount,
          type: txType,
          description: input.reason ?? `管理員調整（${input.mode}）`,
        });
      }
      return { success: true, newBalance };
    }),
});
