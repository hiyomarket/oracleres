import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, wbcMatches, wbcBets } from "../../drizzle/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// 分差競猜賠率
const SPREAD_RATES: Record<string, number> = {
  spread_1_3: 1.5,
  spread_4_6: 2.5,
  spread_7plus: 4.0,
  draw: 8.0,
};

export const wbcRouter = router({
  // 取得所有賽事（公開）
  getMatches: publicProcedure
    .input(z.object({
      status: z.enum(["pending", "live", "finished", "cancelled", "all"]).default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const query = db.select().from(wbcMatches).orderBy(wbcMatches.matchTime);
      if (input.status !== "all") {
        const rows = await db.select().from(wbcMatches)
          .where(eq(wbcMatches.status, input.status))
          .orderBy(wbcMatches.matchTime);
        return rows;
      }
      return query;
    }),

  // 取得單場賽事
  getMatch: publicProcedure
    .input(z.object({ matchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(wbcMatches).where(eq(wbcMatches.id, input.matchId)).limit(1);
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "賽事不存在" });
      return rows[0];
    }),

  // 下注（支援三種玩法）
  placeBet: protectedProcedure
    .input(z.object({
      matchId: z.number().int(),
      betType: z.enum(["winlose", "spread", "combo"]),
      betOn: z.string().min(1),
      amount: z.number().int().min(10),
      // 組合投注的額外 matchId 列表（combo 玩法）
      comboMatchIds: z.array(z.number().int()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      // 取得賽事
      const matchRows = await db.select().from(wbcMatches).where(eq(wbcMatches.id, input.matchId)).limit(1);
      if (matchRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "賽事不存在" });
      const match = matchRows[0];
      if (match.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此賽事已不接受下注" });
      }

      // 計算賠率
      let appliedRate: number;
      if (input.betType === "winlose") {
        if (input.betOn === "A") appliedRate = Number(match.rateA);
        else if (input.betOn === "B") appliedRate = Number(match.rateB);
        else throw new TRPCError({ code: "BAD_REQUEST", message: "無效的下注選項" });
      } else if (input.betType === "spread") {
        appliedRate = SPREAD_RATES[input.betOn];
        if (!appliedRate) throw new TRPCError({ code: "BAD_REQUEST", message: "無效的分差選項" });
      } else {
        // combo：賠率 = 各場賠率相乘
        if (!input.comboMatchIds || input.comboMatchIds.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "組合投注需要指定多場賽事" });
        }
        const allMatchIds = [input.matchId, ...input.comboMatchIds];
        const allMatches = await db.select().from(wbcMatches).where(inArray(wbcMatches.id, allMatchIds));
        // 解析 betOn 格式：A:matchId,B:matchId2,...
        const picks = input.betOn.split(",").map(p => {
          const [side, mId] = p.split(":");
          return { side, matchId: Number(mId) };
        });
        appliedRate = 1;
        for (const pick of picks) {
          const m = allMatches.find(m => m.id === pick.matchId);
          if (!m) throw new TRPCError({ code: "BAD_REQUEST", message: `賽事 ${pick.matchId} 不存在` });
          if (m.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: `賽事 ${m.teamA} vs ${m.teamB} 已不接受下注` });
          appliedRate *= pick.side === "A" ? Number(m.rateA) : Number(m.rateB);
        }
        appliedRate = Math.round(appliedRate * 100) / 100;
      }

      const potentialWin = Math.floor(input.amount * appliedRate);

      // 檢查用戶遊戲點餘額
      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (userRows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      const user = userRows[0];
      if ((user.gameCoins ?? 0) < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `遊戲點不足，目前餘額 ${user.gameCoins ?? 0} 遊戲點` });
      }

      // 扣除遊戲點
      await db.update(users).set({
        gameCoins: (user.gameCoins ?? 0) - input.amount,
      }).where(eq(users.id, ctx.user.id));

      // 建立下注記錄
      const betResult = await db.insert(wbcBets).values({
        userId: ctx.user.id,
        matchId: input.matchId,
        betType: input.betType,
        betOn: input.betOn,
        amount: input.amount,
        appliedRate: String(appliedRate),
        potentialWin,
        status: "placed",
        comboMatchIds: input.comboMatchIds ?? null,
      });

      return {
        success: true,
        betId: Number((betResult as any).insertId),
        message: `下注成功！押注 ${input.amount} 遊戲點，潛在獲利 ${potentialWin} 遊戲點`,
        newGameCoins: (user.gameCoins ?? 0) - input.amount,
      };
    }),

  // 取得我的下注記錄
  getMyBets: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(50).default(20),
      matchId: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let query;
      if (input.matchId) {
        query = db.select().from(wbcBets)
          .where(and(eq(wbcBets.userId, ctx.user.id), eq(wbcBets.matchId, input.matchId)))
          .orderBy(desc(wbcBets.createdAt))
          .limit(input.limit);
      } else {
        query = db.select().from(wbcBets)
          .where(eq(wbcBets.userId, ctx.user.id))
          .orderBy(desc(wbcBets.createdAt))
          .limit(input.limit);
      }
      return query;
    }),

  // 結算賽事（管理員）
  settleMatch: protectedProcedure
    .input(z.object({
      matchId: z.number().int(),
      winningTeam: z.enum(["A", "B", "draw"]),
      finalScore: z.string().optional(),
      // 分差（用於 spread 結算）
      scoreDiff: z.number().int().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以結算賽事" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得賽事
      const matchRows = await db.select().from(wbcMatches).where(eq(wbcMatches.id, input.matchId)).limit(1);
      if (matchRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "賽事不存在" });
      const match = matchRows[0];
      if (match.status === "finished") throw new TRPCError({ code: "BAD_REQUEST", message: "賽事已結算" });

      // 更新賽事狀態
      await db.update(wbcMatches).set({
        status: "finished",
        winningTeam: input.winningTeam,
        finalScore: input.finalScore ?? "",
      }).where(eq(wbcMatches.id, input.matchId));

      // 取得所有此場下注
      const bets = await db.select().from(wbcBets)
        .where(and(eq(wbcBets.matchId, input.matchId), eq(wbcBets.status, "placed")));

      let winnersCount = 0;
      let totalPayout = 0;

      for (const bet of bets) {
        let isWin = false;

        if (bet.betType === "winlose") {
          isWin = bet.betOn === input.winningTeam;
        } else if (bet.betType === "spread") {
          const diff = input.scoreDiff ?? 0;
          if (bet.betOn === "spread_1_3") isWin = diff >= 1 && diff <= 3;
          else if (bet.betOn === "spread_4_6") isWin = diff >= 4 && diff <= 6;
          else if (bet.betOn === "spread_7plus") isWin = diff >= 7;
          else if (bet.betOn === "draw") isWin = diff === 0;
        } else if (bet.betType === "combo") {
          // combo 結算：只結算此場的部分，需要所有場都贏才算贏
          // 此處標記此場結果，combo 全部結算後再判斷
          isWin = bet.betOn.includes(`${input.winningTeam}:${input.matchId}`);
        }

        if (isWin) {
          const payout = bet.potentialWin;
          await db.update(users).set({
            gameCoins: sql`gameCoins + ${payout}`,
          }).where(eq(users.id, bet.userId));
          await db.update(wbcBets).set({ status: "won", actualWin: payout }).where(eq(wbcBets.id, bet.id));
          winnersCount++;
          totalPayout += payout;
        } else {
          await db.update(wbcBets).set({ status: "lost" }).where(eq(wbcBets.id, bet.id));
        }
      }

      // 通知管理員
      await notifyOwner({
        title: `WBC 結算完成：${match.teamA} vs ${match.teamB}`,
        content: `獲勝方：${input.winningTeam === "A" ? match.teamA : input.winningTeam === "B" ? match.teamB : "平局"}，共 ${bets.length} 筆下注，${winnersCount} 筆獲勝，總派彩 ${totalPayout} 遊戲點`,
      });

      return {
        success: true,
        totalBets: bets.length,
        winnersCount,
        totalPayout,
        message: `結算完成！共 ${bets.length} 筆下注，${winnersCount} 筆獲勝`,
      };
    }),

  // 取得下注統計（管理員）
  getBetStats: protectedProcedure
    .input(z.object({ matchId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return null;
      const bets = await db.select().from(wbcBets).where(eq(wbcBets.matchId, input.matchId));
      const totalBets = bets.length;
      const totalAmount = bets.reduce((s, b) => s + b.amount, 0);
      const betOnA = bets.filter(b => b.betOn === "A").reduce((s, b) => s + b.amount, 0);
      const betOnB = bets.filter(b => b.betOn === "B").reduce((s, b) => s + b.amount, 0);
      return { totalBets, totalAmount, betOnA, betOnB };
    }),
});
