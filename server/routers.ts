import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { castOracle } from "./lib/oracleAlgorithm";
import { getFullDateInfo } from "./lib/lunarCalendar";
import { saveOracleSession, getOracleHistory } from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  oracle: router({
    /**
     * 執行擲筊 - 天命共振算法核心
     */
    cast: publicProcedure
      .input(z.object({
        query: z.string().max(500),
      }))
      .mutation(async ({ input, ctx }) => {
        const castResult = castOracle(input.query);

        // 儲存記錄到資料庫
        try {
          await saveOracleSession({
            userId: ctx.user?.id,
            query: input.query || '（未輸入問題）',
            result: castResult.result,
            dayPillarStem: castResult.dateInfo.dayPillar.stem,
            dayPillarBranch: castResult.dateInfo.dayPillar.branch,
            dayPillarStemElement: castResult.dateInfo.dayPillar.stemElement,
            dayPillarBranchElement: castResult.dateInfo.dayPillar.branchElement,
            energyLevel: castResult.dateInfo.dayPillar.energyLevel,
            queryType: castResult.queryAnalysis.type,
            interpretation: castResult.interpretation,
            energyResonance: castResult.energyResonance,
            weights: castResult.weights,
            isSpecialEgg: castResult.isSpecialEgg ? 1 : 0,
            dateString: castResult.dateInfo.dateString,
          });
        } catch (err) {
          console.warn('[Oracle] Failed to save session:', err);
        }

        return castResult;
      }),

    /**
     * 獲取擲筊歷史記錄
     */
    history: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(50).default(20),
      }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 20;
        const history = await getOracleHistory(ctx.user?.id, limit);
        return history;
      }),

    /**
     * 獲取當日能量狀態
     */
    dailyEnergy: publicProcedure.query(async () => {
      const dateInfo = getFullDateInfo();
      return {
        dateInfo,
        dayPillar: dateInfo.dayPillar,
        dateString: dateInfo.dateString,
        isSpecialChouTime: dateInfo.isSpecialChouTime,
      };
    }),

    /**
     * 推送每日能量通知給擁有者
     */
    notifyDailyEnergy: protectedProcedure.mutation(async ({ ctx }) => {
      const dateInfo = getFullDateInfo();
      const { dayPillar, dateString } = dateInfo;

      const energyEmoji: Record<string, string> = {
        excellent: '🌟',
        good: '✨',
        neutral: '⚪',
        challenging: '⚠️',
        complex: '🔮',
      };

      const emoji = energyEmoji[dayPillar.energyLevel] || '⚪';
      const auspiciousStr = dayPillar.auspicious.length > 0
        ? `宜：${dayPillar.auspicious.join('、')}`
        : '';
      const inauspiciousStr = dayPillar.inauspicious.length > 0
        ? `忌：${dayPillar.inauspicious.join('、')}`
        : '';

      const title = `${emoji} 天命共振 - 今日能量播報`;
      const content = `
【${dateString}】

${dayPillar.energyDescription}

${auspiciousStr}
${inauspiciousStr}

${dateInfo.isSpecialChouTime ? '⭐ 今日逢丑，天命寶庫開啟，擲筊有特殊加成！' : ''}
      `.trim();

      try {
        await notifyOwner({ title, content });
        return { success: true };
      } catch (err) {
        console.warn('[Oracle] Failed to send notification:', err);
        return { success: false };
      }
    }),

    /**
     * 語音轉文字（使用 Web Speech API，前端處理）
     * 此端點用於後端關鍵詞分析預處理
     */
    analyzeVoiceQuery: publicProcedure
      .input(z.object({ text: z.string().max(500) }))
      .mutation(async ({ input }) => {
        const { analyzeQuery } = await import('./lib/oracleAlgorithm');
        const analysis = analyzeQuery(input.text);
        return analysis;
      }),
  }),
});

export type AppRouter = typeof appRouter;
