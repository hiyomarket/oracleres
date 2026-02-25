/**
 * points.ts
 * 積分系統後端 API：
 * - getSigninStatus：查詢今日是否已簽到
 * - claimDailyPoints：每日簽到領取 10 積分（每日限一次）
 * - getBalance：查詢當前積分餘額與最近交易記錄
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, pointsTransactions } from "../../drizzle/schema";
import { eq, desc, gte, sql, and } from "drizzle-orm";

/** 計算台灣時間今日 00:00:00 的 UTC Date */
function getTaiwanTodayStart(): Date {
  const now = new Date();
  // UTC+8
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const twToday = new Date(
    Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), twNow.getUTCDate())
  );
  // 轉回 UTC（減 8 小時）
  return new Date(twToday.getTime() - 8 * 60 * 60 * 1000);
}

const DAILY_SIGNIN_POINTS = 10;

export const pointsRouter = router({
  /**
   * 查詢今日是否已簽到
   */
  getSigninStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { hasSigned: false, pointsBalance: 0 };

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
        .select({ pointsBalance: users.pointsBalance })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1),
    ]);

    return {
      hasSigned: signinRow.length > 0,
      pointsBalance: Number(userRow[0]?.pointsBalance ?? 0),
    };
  }),

  /**
   * 每日簽到領取積分（每日限一次，每次 +10 積分）
   */
  claimDailyPoints: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    const todayStart = getTaiwanTodayStart();

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

    // 新增積分交易記錄
    await db.insert(pointsTransactions).values({
      userId: ctx.user.id,
      amount: DAILY_SIGNIN_POINTS,
      type: "daily_signin",
      description: "每日簽到獎勵",
    });

    // 更新用戶積分餘額
    await db
      .update(users)
      .set({
        pointsBalance: sql`pointsBalance + ${DAILY_SIGNIN_POINTS}`,
      })
      .where(eq(users.id, ctx.user.id));

    // 查詢更新後的餘額
    const updatedUser = await db
      .select({ pointsBalance: users.pointsBalance })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    return {
      success: true,
      pointsEarned: DAILY_SIGNIN_POINTS,
      newBalance: Number(updatedUser[0]?.pointsBalance ?? DAILY_SIGNIN_POINTS),
      message: `簽到成功！獲得 ${DAILY_SIGNIN_POINTS} 積分`,
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
