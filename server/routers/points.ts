/**
 * points.ts
 * 積分系統後端 API：
 * - getSigninStatus：查詢今日是否已簽到 + 連續天數 + 下一等級資訊
 * - claimDailyPoints：每日簽到領取積分（依連續天數分級：1-5利9點、6-19天15點、20天以20點）
 * - getBalance：查詢當前積分餘額與最近交易記錄
 *
 * 連續天數規則：
 *   - 每日簽到後 streak +1
 *   - 若昨日未簽到（中斷），streak 重置為 1
 *   - streak 永遠不歸零（只在中斷時重置為 1）
 */
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, pointsTransactions } from "../../drizzle/schema";
import { eq, desc, gte, sql, and } from "drizzle-orm";

/** 計算台灣時間今日 00:00:00 的 UTC Date */
export function getTaiwanTodayStart(): Date {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const twToday = new Date(
    Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), twNow.getUTCDate())
  );
  return new Date(twToday.getTime() - 8 * 60 * 60 * 1000);
}

/** 取得台灣今日日期字串 YYYY-MM-DD */
export function getTaiwanTodayStr(): string {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = twNow.getUTCFullYear();
  const m = String(twNow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(twNow.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 取得台灣昨日日期字串 YYYY-MM-DD */
export function getTaiwanYesterdayStr(): string {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000 - 86400000);
  const y = twNow.getUTCFullYear();
  const m = String(twNow.getUTCMonth() + 1).padStart(2, "0");
  const d = String(twNow.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 依連續天數計算當日應得積分
 * 1-5 天   → 10 點
 * 6-19 天  → 15 點
 * 20 天以上 → 20 點
 */
export function calcSigninPoints(streak: number): number {
  if (streak >= 20) return 20;
  if (streak >= 6) return 15;
  return 10;
}

/**
 * 取得下一個里程碑資訊（幾天後升級、升級後積分）
 */
export function getNextMilestone(streak: number): {
  daysToNext: number;
  nextPoints: number;
  currentPoints: number;
  tier: "bronze" | "silver" | "gold";
} {
  const currentPoints = calcSigninPoints(streak);
  if (streak < 6) {
    return { daysToNext: 6 - streak, nextPoints: 15, currentPoints, tier: "bronze" };
  }
  if (streak < 20) {
    return { daysToNext: 20 - streak, nextPoints: 20, currentPoints, tier: "silver" };
  }
  return { daysToNext: 0, nextPoints: 20, currentPoints, tier: "gold" };
}

export const pointsRouter = router({
  /**
   * 查詢今日是否已簽到 + 連續天數 + 分級資訊
   */
  getSigninStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return {
      hasSigned: false,
      pointsBalance: 0,
      streak: 0,
      todayPoints: 10,
      nextMilestone: getNextMilestone(0),
    };

    const todayStart = getTaiwanTodayStart();
    const [signinRow, userRow] = await Promise.all([
      db
        .select({ id: pointsTransactions.id })
        .from(pointsTransactions)
        .where(
          and(
            eq(pointsTransactions.userId, ctx.user.id),
            eq(pointsTransactions.type, "daily_signin"),
            gte(pointsTransactions.createdAt, todayStart)
          )
        )
        .limit(1),
      db
        .select({
          pointsBalance: users.pointsBalance,
          signinStreak: users.signinStreak,
          lastDailyCheckIn: users.lastDailyCheckIn,
        })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1),
    ]);

    const hasSigned = signinRow.length > 0;
    const streak = Number(userRow[0]?.signinStreak ?? 0);
    const lastCheckIn = userRow[0]?.lastDailyCheckIn ?? null;
    const yesterday = getTaiwanYesterdayStr();

    // 若今日已簽到，顯示當前 streak；否則預測簽到後的 streak
    const predictedStreak = hasSigned
      ? streak
      : lastCheckIn === yesterday
        ? streak + 1
        : 1;
    const todayPoints = calcSigninPoints(predictedStreak);

    return {
      hasSigned,
      pointsBalance: Number(userRow[0]?.pointsBalance ?? 0),
      streak: hasSigned ? streak : predictedStreak,
      todayPoints,
      nextMilestone: getNextMilestone(hasSigned ? streak : predictedStreak),
    };
  }),

  /**
   * 每日簽到領取積分（依連續天數分級）
   */
  claimDailyPoints: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    const todayStart = getTaiwanTodayStart();
    const todayStr = getTaiwanTodayStr();
    const yesterdayStr = getTaiwanYesterdayStr();

    // 檢查今日是否已簽到
    const existing = await db
      .select({ id: pointsTransactions.id })
      .from(pointsTransactions)
      .where(
        and(
          eq(pointsTransactions.userId, ctx.user.id),
          eq(pointsTransactions.type, "daily_signin"),
          gte(pointsTransactions.createdAt, todayStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "今日已完成簽到，明日再來領取積分",
      });
    }

    // 取得當前 streak 與最後簽到日
    const userRow = await db
      .select({
        signinStreak: users.signinStreak,
        lastDailyCheckIn: users.lastDailyCheckIn,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const prevStreak = Number(userRow[0]?.signinStreak ?? 0);
    const lastCheckIn = userRow[0]?.lastDailyCheckIn ?? null;

    // 計算新 streak：昨日有簽到則 +1，否則重置為 1
    const newStreak = lastCheckIn === yesterdayStr ? prevStreak + 1 : 1;
    const pointsEarned = calcSigninPoints(newStreak);

    // 插入積分交易記錄
    const tierLabel = newStreak >= 20 ? "黃金" : newStreak >= 6 ? "白銀" : "青銅";
    await db.insert(pointsTransactions).values({
      userId: ctx.user.id,
      amount: pointsEarned,
      type: "daily_signin",
      description: `每日簽到獎勵（${tierLabel}等級，第 ${newStreak} 天）`,
    });

    // 更新用戶積分餘額、streak、lastDailyCheckIn
    await db
      .update(users)
      .set({
        pointsBalance: sql`pointsBalance + ${pointsEarned}`,
        signinStreak: newStreak,
        lastDailyCheckIn: todayStr,
      })
      .where(eq(users.id, ctx.user.id));

    // 查詢更新後的餘額
    const updatedUser = await db
      .select({ pointsBalance: users.pointsBalance })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const isStreakMilestone = newStreak === 6 || newStreak === 20;
    let milestoneMessage = "";
    if (newStreak === 6) milestoneMessage = "🥈 連續簽到 6 天！升級為白銀等級，每日獎勵提升至 15 積分！";
    if (newStreak === 20) milestoneMessage = "🥇 連續簽到 20 天！升級為黃金等級，每日獎勵提升至 20 積分！";

    return {
      success: true,
      pointsEarned,
      newBalance: Number(updatedUser[0]?.pointsBalance ?? pointsEarned),
      newStreak,
      isStreakMilestone,
      milestoneMessage,
      message: `簽到成功！獲得 ${pointsEarned} 積分（第 ${newStreak} 天）`,
      nextMilestone: getNextMilestone(newStreak),
    };
  }),

  /**
   * 查詢本月簽到日曆（哪幾天有簽到）
   */
  getMonthlyCalendar: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { signedDays: [], streak: 0, totalThisMonth: 0, year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    // 取本月第一天和下月第一天（台灣時間 UTC+8）
    const now = new Date();
    const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const year = twNow.getUTCFullYear();
    const month = twNow.getUTCMonth(); // 0-indexed
    const monthStart = new Date(Date.UTC(year, month, 1) - 8 * 60 * 60 * 1000);
    const monthEnd = new Date(Date.UTC(year, month + 1, 1) - 8 * 60 * 60 * 1000);
    // 查詢本月所有 daily_signin 記錄
    const txRows = await db
      .select({ createdAt: pointsTransactions.createdAt })
      .from(pointsTransactions)
      .where(
        and(
          eq(pointsTransactions.userId, ctx.user.id),
          eq(pointsTransactions.type, 'daily_signin'),
          gte(pointsTransactions.createdAt, monthStart)
        )
      )
      .orderBy(pointsTransactions.createdAt);
    // 過濾本月內的記錄，轉換為台灣日期字串
    const signedDays = txRows
      .filter(row => row.createdAt < monthEnd)
      .map(row => {
        const twDate = new Date(row.createdAt.getTime() + 8 * 60 * 60 * 1000);
        return `${twDate.getUTCFullYear()}-${String(twDate.getUTCMonth() + 1).padStart(2, '0')}-${String(twDate.getUTCDate()).padStart(2, '0')}`;
      });
    const uniqueSignedDays = Array.from(new Set(signedDays));
    // 取用戶當前 streak
    const [userRow] = await db
      .select({ signinStreak: users.signinStreak })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return {
      signedDays: uniqueSignedDays,
      streak: Number(userRow?.signinStreak ?? 0),
      totalThisMonth: uniqueSignedDays.length,
      year,
      month: month + 1, // 1-indexed
    };
  }),

  /**
   * 查詢積分餘額與最近 10 筆交易記錄
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { balance: 0, transactions: [] };

    const [userRow, txRows] = await Promise.all([
      db
        .select({ pointsBalance: users.pointsBalance })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1),
      db
        .select()
        .from(pointsTransactions)
        .where(eq(pointsTransactions.userId, ctx.user.id))
        .orderBy(desc(pointsTransactions.createdAt))
        .limit(10),
    ]);

    return {
      balance: Number(userRow[0]?.pointsBalance ?? 0),
      transactions: txRows,
    };
  }),
});
