import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { marketingConfig, wbcMatches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const marketingRouter = router({
  // 取得經濟系統配置（公開）
  getEconomyConfig: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {
      pointsToCoinsRate: 20,
      coinsToPointsRate: 50,
      dailyCoinsToPointsLimit: 100,
      casinoEnabled: true,
    };
    const configs = await db.select().from(marketingConfig);
    const configMap = Object.fromEntries(configs.map(c => [c.configKey, c.configValue]));
    const rates = (configMap["exchange_rates"] as any) ?? {};
    return {
      pointsToCoinsRate: rates.pointsToCoinsRate ?? 20,
      coinsToPointsRate: rates.coinsToPointsRate ?? 50,
      dailyCoinsToPointsLimit: rates.dailyCoinsToPointsLimit ?? 100,
      casinoEnabled: configMap["casino_enabled"] !== false,
    };
  }),

  // 更新經濟系統配置（管理員）
  updateEconomyConfig: protectedProcedure
    .input(z.object({
      pointsToCoinsRate: z.number().int().min(1).max(1000),
      coinsToPointsRate: z.number().int().min(1).max(1000),
      dailyCoinsToPointsLimit: z.number().int().min(1).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(marketingConfig)
        .set({ configValue: input })
        .where(eq(marketingConfig.configKey, "exchange_rates"));
      return { success: true };
    }),

  // 是否有新遊戲（用於 NEW 標籤）
  getNewGames: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { hasNew: false, games: [] };
    const config = await db.select().from(marketingConfig)
      .where(eq(marketingConfig.configKey, "new_games")).limit(1);
    if (config.length === 0) return { hasNew: false, games: [] };
    return config[0].configValue as { hasNew: boolean; games: string[] };
  }),

  // 取得所有賽事（管理員）
  getAdminMatches: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) return [];
    return db.select().from(wbcMatches).orderBy(wbcMatches.matchTime);
  }),

  // 新增賽事（管理員）
  createMatch: protectedProcedure
    .input(z.object({
      teamA: z.string().min(1).max(50),
      teamB: z.string().min(1).max(50),
      teamAFlag: z.string().max(10).default("🏳️"),
      teamBFlag: z.string().max(10).default("🏳️"),
      matchTime: z.number().int(),
      venue: z.string().max(100).default(""),
      poolGroup: z.string().max(20).default(""),
      rateA: z.number().min(1).max(99).default(1.9),
      rateB: z.number().min(1).max(99).default(1.9),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(wbcMatches).values({
        ...input,
        rateA: String(input.rateA),
        rateB: String(input.rateB),
        status: "pending",
      });
      return { success: true, id: Number((result as any).insertId) };
    }),

  // 更新賽事（管理員）
  updateMatch: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      teamA: z.string().min(1).max(50).optional(),
      teamB: z.string().min(1).max(50).optional(),
      teamAFlag: z.string().max(10).optional(),
      teamBFlag: z.string().max(10).optional(),
      matchTime: z.number().int().optional(),
      venue: z.string().max(100).optional(),
      poolGroup: z.string().max(20).optional(),
      rateA: z.number().min(1).max(99).optional(),
      rateB: z.number().min(1).max(99).optional(),
      status: z.enum(["pending", "live", "finished", "cancelled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, rateA, rateB, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (rateA !== undefined) updateData.rateA = String(rateA);
      if (rateB !== undefined) updateData.rateB = String(rateB);
      await db.update(wbcMatches).set(updateData).where(eq(wbcMatches.id, id));
      return { success: true };
    }),

  // 刪除賽事（管理員）
  deleteMatch: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(wbcMatches).where(eq(wbcMatches.id, input.id));
      return { success: true };
    }),

  // 批量匯入 WBC 2026 完整賽程（管理員）
  importWbcSchedule: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // WBC 2026 完整賽程（UTC 時間）- 4 組各 10 場小組賽，共 40 場
    const matches = [
      // === A 組 - 聖胡安（Puerto Rico）===
      { teamA: "波多黎各", teamB: "尼加拉瓜", teamAFlag: "🇵🇷", teamBFlag: "🇳🇮", matchTime: new Date("2026-03-05T00:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "1.25", rateB: "4.20" },
      { teamA: "哥倫比亞", teamB: "巴拿馬", teamAFlag: "🇨🇴", teamBFlag: "🇵🇦", matchTime: new Date("2026-03-05T04:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "1.60", rateB: "2.40" },
      { teamA: "尼加拉瓜", teamB: "哥倫比亞", teamAFlag: "🇳🇮", teamBFlag: "🇨🇴", matchTime: new Date("2026-03-06T00:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "3.50", rateB: "1.35" },
      { teamA: "波多黎各", teamB: "巴拿馬", teamAFlag: "🇵🇷", teamBFlag: "🇵🇦", matchTime: new Date("2026-03-06T04:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "1.30", rateB: "3.80" },
      { teamA: "巴拿馬", teamB: "尼加拉瓜", teamAFlag: "🇵🇦", teamBFlag: "🇳🇮", matchTime: new Date("2026-03-07T00:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "1.50", rateB: "2.70" },
      { teamA: "哥倫比亞", teamB: "波多黎各", teamAFlag: "🇨🇴", teamBFlag: "🇵🇷", matchTime: new Date("2026-03-07T04:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "3.20", rateB: "1.30" },
      { teamA: "巴拿馬", teamB: "哥倫比亞", teamAFlag: "🇵🇦", teamBFlag: "🇨🇴", matchTime: new Date("2026-03-08T00:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "2.20", rateB: "1.70" },
      { teamA: "尼加拉瓜", teamB: "波多黎各", teamAFlag: "🇳🇮", teamBFlag: "🇵🇷", matchTime: new Date("2026-03-08T04:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "4.50", rateB: "1.20" },
      { teamA: "波多黎各", teamB: "哥倫比亞", teamAFlag: "🇵🇷", teamBFlag: "🇨🇴", matchTime: new Date("2026-03-09T00:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "1.40", rateB: "2.90" },
      { teamA: "尼加拉瓜", teamB: "巴拿馬", teamAFlag: "🇳🇮", teamBFlag: "🇵🇦", matchTime: new Date("2026-03-09T04:00:00Z").getTime(), venue: "席然畢松球場", poolGroup: "A組", rateA: "2.60", rateB: "1.55" },
      // === B 組 - 休士頓（Houston）===
      { teamA: "美國", teamB: "巴西", teamAFlag: "🇺🇸", teamBFlag: "🇧🇷", matchTime: new Date("2026-03-05T01:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "1.15", rateB: "5.50" },
      { teamA: "墨西哥", teamB: "古巴", teamAFlag: "🇲🇽", teamBFlag: "🇨🇺", matchTime: new Date("2026-03-05T05:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "1.45", rateB: "2.80" },
      { teamA: "巴西", teamB: "墨西哥", teamAFlag: "🇧🇷", teamBFlag: "🇲🇽", matchTime: new Date("2026-03-06T01:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "3.00", rateB: "1.40" },
      { teamA: "古巴", teamB: "美國", teamAFlag: "🇨🇺", teamBFlag: "🇺🇸", matchTime: new Date("2026-03-06T05:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "5.00", rateB: "1.18" },
      { teamA: "墨西哥", teamB: "美國", teamAFlag: "🇲🇽", teamBFlag: "🇺🇸", matchTime: new Date("2026-03-07T01:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "2.40", rateB: "1.55" },
      { teamA: "巴西", teamB: "古巴", teamAFlag: "🇧🇷", teamBFlag: "🇨🇺", matchTime: new Date("2026-03-07T05:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "1.80", rateB: "2.10" },
      { teamA: "美國", teamB: "墨西哥", teamAFlag: "🇺🇸", teamBFlag: "🇲🇽", matchTime: new Date("2026-03-08T01:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "1.55", rateB: "2.40" },
      { teamA: "古巴", teamB: "巴西", teamAFlag: "🇨🇺", teamBFlag: "🇧🇷", matchTime: new Date("2026-03-08T05:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "4.20", rateB: "1.22" },
      { teamA: "美國", teamB: "古巴", teamAFlag: "🇺🇸", teamBFlag: "🇨🇺", matchTime: new Date("2026-03-09T01:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "1.12", rateB: "6.00" },
      { teamA: "巴西", teamB: "墨西哥", teamAFlag: "🇧🇷", teamBFlag: "🇲🇽", matchTime: new Date("2026-03-09T05:00:00Z").getTime(), venue: "大金球場", poolGroup: "B組", rateA: "2.80", rateB: "1.45" },
      // === C 組 - 東京（UTC+9 轉 UTC）===
      { teamA: "中華臺北", teamB: "澳大利亞", teamAFlag: "🇹🇼", teamBFlag: "🇦🇺", matchTime: new Date("2026-03-05T03:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "2.50", rateB: "1.60" },
      { teamA: "捷克", teamB: "南韓", teamAFlag: "🇨🇿", teamBFlag: "🇰🇷", matchTime: new Date("2026-03-05T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "4.00", rateB: "1.25" },
      { teamA: "澳大利亞", teamB: "捷克", teamAFlag: "🇦🇺", teamBFlag: "🇨🇿", matchTime: new Date("2026-03-06T03:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "1.50", rateB: "2.80" },
      { teamA: "日本", teamB: "中華臺北", teamAFlag: "🇯🇵", teamBFlag: "🇹🇼", matchTime: new Date("2026-03-06T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "1.20", rateB: "4.50" },
      { teamA: "中華臺北", teamB: "捷克", teamAFlag: "🇹🇼", teamBFlag: "🇨🇿", matchTime: new Date("2026-03-07T03:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "1.80", rateB: "2.20" },
      { teamA: "南韓", teamB: "日本", teamAFlag: "🇰🇷", teamBFlag: "🇯🇵", matchTime: new Date("2026-03-07T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "2.80", rateB: "1.40" },
      { teamA: "中華臺北", teamB: "南韓", teamAFlag: "🇹🇼", teamBFlag: "🇰🇷", matchTime: new Date("2026-03-08T03:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "3.20", rateB: "1.35" },
      { teamA: "澳大利亞", teamB: "日本", teamAFlag: "🇦🇺", teamBFlag: "🇯🇵", matchTime: new Date("2026-03-08T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "5.00", rateB: "1.15" },
      { teamA: "南韓", teamB: "澳大利亞", teamAFlag: "🇰🇷", teamBFlag: "🇦🇺", matchTime: new Date("2026-03-09T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "1.45", rateB: "2.70" },
      { teamA: "捷克", teamB: "日本", teamAFlag: "🇨🇿", teamBFlag: "🇯🇵", matchTime: new Date("2026-03-10T10:00:00Z").getTime(), venue: "東京巨蛋", poolGroup: "C組", rateA: "8.00", rateB: "1.08" },
      // === D 組 - 邁阿密（Miami）===
      { teamA: "委內瑞拉", teamB: "多明尼加", teamAFlag: "🇻🇪", teamBFlag: "🇩🇴", matchTime: new Date("2026-03-05T01:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.60", rateB: "2.30" },
      { teamA: "荷蘭", teamB: "以色列", teamAFlag: "🇳🇱", teamBFlag: "🇮🇱", matchTime: new Date("2026-03-05T05:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.35", rateB: "3.20" },
      { teamA: "多明尼加", teamB: "荷蘭", teamAFlag: "🇩🇴", teamBFlag: "🇳🇱", matchTime: new Date("2026-03-06T01:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.50", rateB: "2.60" },
      { teamA: "以色列", teamB: "委內瑞拉", teamAFlag: "🇮🇱", teamBFlag: "🇻🇪", matchTime: new Date("2026-03-06T05:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "2.50", rateB: "1.55" },
      { teamA: "委內瑞拉", teamB: "荷蘭", teamAFlag: "🇻🇪", teamBFlag: "🇳🇱", matchTime: new Date("2026-03-07T01:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.45", rateB: "2.80" },
      { teamA: "多明尼加", teamB: "以色列", teamAFlag: "🇩🇴", teamBFlag: "🇮🇱", matchTime: new Date("2026-03-07T05:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.30", rateB: "3.60" },
      { teamA: "多明尼加", teamB: "委內瑞拉", teamAFlag: "🇩🇴", teamBFlag: "🇻🇪", matchTime: new Date("2026-03-08T01:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.50", rateB: "2.60" },
      { teamA: "荷蘭", teamB: "以色列", teamAFlag: "🇳🇱", teamBFlag: "🇮🇱", matchTime: new Date("2026-03-08T05:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.40", rateB: "3.00" },
      { teamA: "委內瑞拉", teamB: "以色列", teamAFlag: "🇻🇪", teamBFlag: "🇮🇱", matchTime: new Date("2026-03-09T01:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.40", rateB: "2.90" },
      { teamA: "多明尼加", teamB: "荷蘭", teamAFlag: "🇩🇴", teamBFlag: "🇳🇱", matchTime: new Date("2026-03-09T05:00:00Z").getTime(), venue: "龍帝霸公園球場", poolGroup: "D組", rateA: "1.55", rateB: "2.50" },
    ];

    // 僅清除 pending 狀態的賽事（保留已結算的歷史記錄）
    await db.delete(wbcMatches).where(eq(wbcMatches.status, "pending"));

    // 批量插入
    for (const m of matches) {
      await db.insert(wbcMatches).values(m);
    }

    return { success: true, count: matches.length };
  }),
});
