/**
 * wealth.ts — 財運羅盤延伸 Router
 * 功能：財運日記（logEntry / getJournal）、本月財運走勢（getMonthlyTrend）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getUserProfileForEngine } from "../db";
import { wealthJournal } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

function getTaiwanDateStr(date?: Date): string {
  const d = date ?? new Date();
  const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return tw.toISOString().slice(0, 10);
}

export const wealthRouter = router({
  /**
   * 記錄或更新今日財運日記
   */
  logEntry: protectedProcedure
    .input(z.object({
      date: z.string().optional(), // YYYY-MM-DD，預設今日
      lotteryScore: z.number().min(1).max(10).optional(),
      tenGod: z.string().optional(),
      note: z.string().max(500).optional(),
      didBuyLottery: z.boolean().optional(),
      lotteryAmount: z.number().min(0).optional(),
      lotteryResult: z.enum(["win", "lose", "pending"]).optional(),
      winAmount: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const dateStr = input.date ?? getTaiwanDateStr();
      const userId = ctx.user.id;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // 查詢是否已有今日記錄
      const existing = await db.select()
        .from(wealthJournal)
        .where(and(eq(wealthJournal.userId, userId), eq(wealthJournal.date, dateStr)))
        .limit(1);

      if (existing.length > 0) {
        // 更新
        await db.update(wealthJournal)
          .set({
            ...(input.lotteryScore !== undefined && { lotteryScore: input.lotteryScore }),
            ...(input.tenGod !== undefined && { tenGod: input.tenGod }),
            ...(input.note !== undefined && { note: input.note }),
            ...(input.didBuyLottery !== undefined && { didBuyLottery: input.didBuyLottery ? 1 : 0 }),
            ...(input.lotteryAmount !== undefined && { lotteryAmount: input.lotteryAmount }),
            ...(input.lotteryResult !== undefined && { lotteryResult: input.lotteryResult }),
            ...(input.winAmount !== undefined && { winAmount: input.winAmount }),
          })
          .where(and(eq(wealthJournal.userId, userId), eq(wealthJournal.date, dateStr)));
        return { action: "updated", date: dateStr };
      } else {
        // 新增
        await db.insert(wealthJournal).values({
          userId,
          date: dateStr,
          lotteryScore: input.lotteryScore ?? 5,
          tenGod: input.tenGod ?? "",
          note: input.note ?? "",
          didBuyLottery: input.didBuyLottery ? 1 : 0,
          lotteryAmount: input.lotteryAmount ?? 0,
          lotteryResult: input.lotteryResult ?? "pending",
          winAmount: input.winAmount ?? 0,
        });
        return { action: "created", date: dateStr };
      }
    }),

  /**
   * 取得財運日記列表（最近 30 筆）
   */
  getJournal: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(90).optional().default(30),
    }).optional())
    .query(async ({ input, ctx }) => {
      const limit = input?.limit ?? 30;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const entries = await db.select()
        .from(wealthJournal)
        .where(eq(wealthJournal.userId, ctx.user.id))
        .orderBy(desc(wealthJournal.date))
        .limit(limit);
      return entries;
    }),

  /**
   * 本月每日財運走勢（從 dailyReport 快取或重新計算）
   * 回傳本月每日的偏財指數
   */
  getMonthlyTrend: protectedProcedure
    .input(z.object({
      year: z.number().optional(),
      month: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const now = new Date();
      const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const year = input?.year ?? twNow.getUTCFullYear();
      const month = input?.month ?? (twNow.getUTCMonth() + 1);

      // 計算本月起訖日期
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      // 從財運日記撈已記錄的資料
      const journalEntries = await db.select()
        .from(wealthJournal)
        .where(and(
          eq(wealthJournal.userId, ctx.user.id),
          gte(wealthJournal.date, startDate),
          lte(wealthJournal.date, endDate)
        ))
        .orderBy(wealthJournal.date);

      // 建立日期 → 分數的 map
      const journalMap = new Map(journalEntries.map((e: typeof journalEntries[0]) => [e.date, e]));

      // 用農曆/八字引擎計算本月每日理論偏財指數
      const { getFullDateInfo } = await import('../lib/lunarCalendar');
      const { getMoonPhase } = await import('../lib/moonPhase');
      // getUserProfileForEngine already imported at top
      const { getTenGodDynamic } = await import('../lib/tenGods');

      const ep = await getUserProfileForEngine(ctx.user.id);
      const EN_TO_ZH: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
      const favorableZh = ep.favorableElementsEn.map((e: string) => EN_TO_ZH[e] || e);
      const unfavorableZh = ep.unfavorableElements;

      const tenGodLotteryMap: Record<string, number> = {
        偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
        七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
        偏印: 4, 正印: 5,
      };

      const trend: Array<{
        date: string;
        day: number;
        score: number;
        tenGod: string;
        moonPhase: string;
        hasJournal: boolean;
        note: string;
        didBuyLottery: boolean;
        winAmount: number;
      }> = [];

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, d, 8, 0, 0);
        const dateInfo = getFullDateInfo(dateObj);
        const moonInfo = getMoonPhase(dateObj);
        const tenGod = getTenGodDynamic(dateInfo.dayPillar.stem, ep.dayMasterElement, ep.dayMasterYinYang);
        const fortuneScore = tenGodLotteryMap[tenGod] ?? 5;
        const dayEl = dateInfo.dayPillar.stemElement;
        const dayElScore = favorableZh.includes(dayEl) ? 2.0 : unfavorableZh.includes(dayEl) ? -2.0 : 0;
        const dayScore = Math.min(10, Math.max(1, 5 + dayElScore * 2));
        const moonBonus = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? -0.5 : 0;
        const rawScore = fortuneScore * 0.55 + dayScore * 0.35 + (5 + moonBonus) * 0.10;
        const score = Math.round(Math.min(10, Math.max(1, rawScore)) * 10) / 10;

        type JournalEntry = typeof journalEntries[0];
        const journal = journalMap.get(dateStr) as JournalEntry | undefined;
        trend.push({
          date: dateStr,
          day: d,
          score,
          tenGod,
          moonPhase: moonInfo.phaseName,
          hasJournal: !!journal,
          note: journal?.note ?? "",
          didBuyLottery: (journal?.didBuyLottery ?? 0) === 1,
          winAmount: journal?.winAmount ?? 0,
        });
      }

      return {
        year,
        month,
        trend,
        summary: {
          avgScore: Math.round(trend.reduce((s, d) => s + d.score, 0) / trend.length * 10) / 10,
          bestDay: trend.reduce((best, d) => d.score > best.score ? d : best, trend[0]),
          worstDay: trend.reduce((worst, d) => d.score < worst.score ? d : worst, trend[0]),
          journalCount: journalEntries.length,
          totalWin: journalEntries.reduce((s: number, e: typeof journalEntries[0]) => s + (e.winAmount ?? 0), 0),
        },
      };
    }),
});
