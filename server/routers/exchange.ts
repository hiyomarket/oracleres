import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, currencyExchangeLogs, marketingConfig } from "../../drizzle/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// 預設兌換比率
const DEFAULT_RATES = {
  pointsToCoinsRate: 20,   // 1 積分 = 20 遊戲點
  coinsToPointsRate: 50,   // 50 遊戲點 = 1 積分
  dailyCoinsToPointsLimit: 100, // 每日最多兌換回 100 積分
};

async function getExchangeRates(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return DEFAULT_RATES;
  const config = await db
    .select()
    .from(marketingConfig)
    .where(eq(marketingConfig.configKey, "exchange_rates"))
    .limit(1);
  if (config.length === 0) return DEFAULT_RATES;
  const val = config[0].configValue as typeof DEFAULT_RATES;
  return {
    pointsToCoinsRate: val.pointsToCoinsRate ?? DEFAULT_RATES.pointsToCoinsRate,
    coinsToPointsRate: val.coinsToPointsRate ?? DEFAULT_RATES.coinsToPointsRate,
    dailyCoinsToPointsLimit: val.dailyCoinsToPointsLimit ?? DEFAULT_RATES.dailyCoinsToPointsLimit,
  };
}

export const exchangeRouter = router({
  // 取得兌換比率（公開）
  getRates: publicProcedure.query(async () => {
    const db = await getDb();
    return getExchangeRates(db);
  }),

  // 積分 → 遊戲點
  pointsToCoins: protectedProcedure
    .input(z.object({ pointsAmount: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      const rates = await getExchangeRates(db);
      const gameCoinsToAdd = input.pointsAmount * rates.pointsToCoinsRate;

      // 讀取用戶餘額
      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (userRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
      const user = userRows[0];

      if (user.pointsBalance < input.pointsAmount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `積分不足，目前餘額 ${user.pointsBalance} 積分` });
      }

      // 執行兌換
      await db.update(users).set({
        pointsBalance: user.pointsBalance - input.pointsAmount,
        gameCoins: (user.gameCoins ?? 0) + gameCoinsToAdd,
      }).where(eq(users.id, ctx.user.id));

      // 記錄日誌
      await db.insert(currencyExchangeLogs).values({
        userId: ctx.user.id,
        direction: "points_to_coins",
        pointsAmount: -input.pointsAmount,
        gameCoinsAmount: gameCoinsToAdd,
        exchangeRate: String(rates.pointsToCoinsRate),
      });

      return {
        success: true,
        message: `成功將 ${input.pointsAmount} 積分兌換為 ${gameCoinsToAdd} 遊戲點`,
        newPointsBalance: user.pointsBalance - input.pointsAmount,
        newGameCoins: (user.gameCoins ?? 0) + gameCoinsToAdd,
      };
    }),

  // 遊戲點 → 積分（含每日限額）
  coinsToPoints: protectedProcedure
    .input(z.object({ gameCoinsAmount: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      const rates = await getExchangeRates(db);

      // 計算可獲得積分（向下取整）
      const pointsToAdd = Math.floor(input.gameCoinsAmount / rates.coinsToPointsRate);
      if (pointsToAdd === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `最少需要 ${rates.coinsToPointsRate} 遊戲點才能兌換 1 積分`,
        });
      }

      // 檢查今日已兌換積分量
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayLogs = await db
        .select({ total: sql<number>`SUM(${currencyExchangeLogs.pointsAmount})` })
        .from(currencyExchangeLogs)
        .where(
          and(
            eq(currencyExchangeLogs.userId, ctx.user.id),
            eq(currencyExchangeLogs.direction, "coins_to_points"),
            gte(currencyExchangeLogs.createdAt, todayStart)
          )
        );
      const todayEarned = todayLogs[0]?.total ?? 0;
      if (todayEarned + pointsToAdd > rates.dailyCoinsToPointsLimit) {
        const remaining = rates.dailyCoinsToPointsLimit - todayEarned;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `今日兌換積分已達上限（${rates.dailyCoinsToPointsLimit} 積分/天），今日剩餘可兌換 ${Math.max(0, remaining)} 積分`,
        });
      }

      // 讀取用戶餘額
      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (userRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
      const user = userRows[0];

      const actualCoinsToDeduct = pointsToAdd * rates.coinsToPointsRate;
      if ((user.gameCoins ?? 0) < actualCoinsToDeduct) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `遊戲點不足，目前餘額 ${user.gameCoins ?? 0} 遊戲點` });
      }

      // 執行兌換
      await db.update(users).set({
        pointsBalance: user.pointsBalance + pointsToAdd,
        gameCoins: (user.gameCoins ?? 0) - actualCoinsToDeduct,
      }).where(eq(users.id, ctx.user.id));

      // 記錄日誌
      await db.insert(currencyExchangeLogs).values({
        userId: ctx.user.id,
        direction: "coins_to_points",
        pointsAmount: pointsToAdd,
        gameCoinsAmount: -actualCoinsToDeduct,
        exchangeRate: String(rates.coinsToPointsRate),
      });

      return {
        success: true,
        message: `成功將 ${actualCoinsToDeduct} 遊戲點兌換為 ${pointsToAdd} 積分`,
        newPointsBalance: user.pointsBalance + pointsToAdd,
        newGameCoins: (user.gameCoins ?? 0) - actualCoinsToDeduct,
      };
    }),

  // 取得用戶餘額
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
    const userRows = await db.select({
      pointsBalance: users.pointsBalance,
      gameCoins: users.gameCoins,
    }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (userRows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      pointsBalance: userRows[0].pointsBalance,
      gameCoins: userRows[0].gameCoins ?? 0,
    };
  }),

  // 取得兌換歷史
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db
        .select()
        .from(currencyExchangeLogs)
        .where(eq(currencyExchangeLogs.userId, ctx.user.id))
        .orderBy(sql`${currencyExchangeLogs.createdAt} DESC`)
        .limit(input.limit);
      return logs;
    }),
});
