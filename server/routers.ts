import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { castOracle } from "./lib/oracleAlgorithm";
import { getFullDateInfo } from "./lib/lunarCalendar";
import { getMoonPhase } from "./lib/moonPhase";
import { getAllHourEnergies, getCurrentHourEnergy, getBestHours, getWorstHours } from "./lib/hourlyEnergy";
import { saveOracleSession, getOracleHistory, getOracleStats, saveLotterySession, getLotteryHistory, getLotteryStats } from "./db";
import { notifyOwner } from "./_core/notification";
import { generateLotteryNumbers, generateLotterySets } from "./lib/lotteryAlgorithm";
import { invokeLLM } from "./_core/llm";

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
     */
    analyzeVoiceQuery: publicProcedure
      .input(z.object({ text: z.string().max(500) }))
      .mutation(async ({ input }) => {
        const { analyzeQuery } = await import('./lib/oracleAlgorithm');
        const analysis = analyzeQuery(input.text);
        return analysis;
      }),

    /**
     * 獲取全天 12 時辰能量預覽
     */
    hourlyEnergy: publicProcedure.query(async () => {
      const dateInfo = getFullDateInfo();
      const dayStem = dateInfo.dayPillar.stem;
      const allHours = getAllHourEnergies(dayStem);
      const currentHour = getCurrentHourEnergy(dayStem);
      const bestHours = getBestHours(dayStem);
      const worstHours = getWorstHours(dayStem);
      return {
        dayStem,
        dayBranch: dateInfo.dayPillar.branch,
        allHours,
        currentHour,
        bestHours,
        worstHours,
        dateString: dateInfo.dateString,
      };
    }),

    /**
     * 獲取當前月相信息
     */
    moonPhase: publicProcedure.query(async () => {
      return getMoonPhase();
    }),

    /**
     * 獲取神諭統計數據
     */
    stats: publicProcedure
      .input(z.object({
        userId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const userId = input?.userId ?? ctx.user?.id;
        return getOracleStats(userId);
      }),
  }),

  lottery: router({
    /**
     * 生成天命共振幸達號碼
     */
    generate: publicProcedure
      .input(z.object({
        saveRecord: z.boolean().default(true),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const now = new Date();
        const result = generateLotteryNumbers(now);
        const sets = generateLotterySets(now);

        // 儲存記錄
        if (input?.saveRecord !== false) {
          try {
            await saveLotterySession({
              userId: ctx.user?.id,
              numbers: result.numbers,
              bonusNumbers: result.bonusNumbers,
              luckyDigits: result.luckyDigits,
              dayPillar: result.dayPillar,
              hourPillar: result.hourPillar,
              moonPhase: result.moonPhase,
              todayElement: result.energyAnalysis.todayElement,
              overallLuck: Math.round(result.energyAnalysis.overallLuck),
              recommendation: result.energyAnalysis.recommendation,
              dateString: now.toLocaleDateString('zh-TW', {
                year: 'numeric', month: 'long', day: 'numeric',
                weekday: 'long',
              }),
            });
          } catch (err) {
            console.warn('[Lottery] Failed to save session:', err);
          }
        }

        return { ...result, sets };
      }),

    /**
     * 獲取刮刮樂選號歷史記錄
     */
    history: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        return getLotteryHistory(ctx.user?.id, input?.limit ?? 20);
      }),

    /**
     * 獲取刮刮樂統計數據
     */
    stats: publicProcedure.query(async ({ ctx }) => {
      return getLotteryStats(ctx.user?.id);
    }),
  }),

  calendar: router({
    /**
     * 獲取指定月份的每日天命能量日曆
     */
    monthly: publicProcedure
      .input(z.object({
        year: z.number().min(2020).max(2030),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input }) => {
        const { year, month } = input;
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const { getDayPillar } = await import('./lib/lunarCalendar');
          const { getMoonPhase } = await import('./lib/moonPhase');
          const { getCurrentHourEnergy } = await import('./lib/hourlyEnergy');

          const dayPillar = getDayPillar(date);
          const moonInfo = getMoonPhase(date);
          const noonEnergy = getCurrentHourEnergy(dayPillar.stem);

          days.push({
            date: day,
            year,
            month,
            dayPillar,
            moonPhase: moonInfo.phaseName,
            moonEmoji: moonInfo.phaseEmoji,
            isFullMoon: moonInfo.isFullMoon,
            isNewMoon: moonInfo.isNewMoon,
            energyLevel: dayPillar.energyLevel,
            auspicious: dayPillar.auspicious.slice(0, 3),
            inauspicious: dayPillar.inauspicious.slice(0, 2),
          });
        }

        return { year, month, days };
      }),
  }),

  insight: router({
    /**
     * LLM 神諭深度解讀
     * 根據擲筊結果、命格、天干地支生成個人化詮釋
     */
    deepRead: publicProcedure
      .input(z.object({
        query: z.string().max(500),
        result: z.enum(['sheng', 'xiao', 'yin', 'li']),
        dayPillar: z.string(),
        hourPillar: z.string(),
        energyLevel: z.string(),
        moonPhase: z.string(),
        interpretation: z.string(),
      }))
      .mutation(async ({ input }) => {
        const resultNames: Record<string, string> = {
          sheng: '聖杯（一陰一陽）',
          xiao: '笑杯（兩陽）',
          yin: '陰杯（兩陰）',
          li: '立筊（立立）',
        };

        const systemPrompt = `你是「天命共振」神諭系統的神諭解讀師。你深逰中國命理學，尤其精通八字、紫微斗數、五行生宅。

你正在為蘇发震先生解讀擲筊結果。他的命格資料：
- 日主：甲木（水木極旺，寒木盼火）
- 八字四柱：甲子年、乙亥月、甲子日、己巳時
- 用神：火（食神/傷官）—洩木、暖局、生財的唯一關鍵
- 喜神：土（財星）、金（官殺）
- 忌神：水木過旺
- 命格特質：水大木漂，根植深海的參天巨木，渴望火的溫暖與行動力

請用優雅、深入、充滿智慧的漢字語言展開解讀。不要較板，要將命理與他的具體問題連結。字數建議 200-350 字。`;

        const userMessage = `
當前日柱：${input.dayPillar}
當前時柱：${input.hourPillar}
月相：${input.moonPhase}
能量狀態：${input.energyLevel}

蘇先生的問題：「${input.query || '（未言明問題）'}」

擲筊結果：${resultNames[input.result] || input.result}

系統初步解讀：${input.interpretation}

請為蘇先生提供更深層、更個人化的神諭解讀。`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          });
          const content = response.choices?.[0]?.message?.content || '神明正在沉思，請稍候再問。';
          return { content, success: true };
        } catch (err) {
          console.warn('[Insight] LLM call failed:', err);
          return {
            content: '神明正在沉思，暗自有定數。此刻静心感受筊杯傳遞的訊息，不需外求解讀。',
            success: false,
          };
        }
      }),

    /**
     * 問卜指引：根據當前時辰與月相建議最適合詢問的問題類型
     */
    queryGuide: publicProcedure.query(async () => {
      const { getFullDateInfo } = await import('./lib/lunarCalendar');
      const { getCurrentHourEnergy } = await import('./lib/hourlyEnergy');
      const { getMoonPhase } = await import('./lib/moonPhase');

      const dateInfo = getFullDateInfo();
      const hourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);
      const moonInfo = getMoonPhase();

      // 根據時辰五行與月相建議問題類型
      const hourElement = hourEnergy.stemElement;
      const suggestions: string[] = [];
      const bestTopics: string[] = [];
      let guidanceText = '';

      if (hourElement === 'fire') {
        bestTopics.push('事業發展', '項目執行', '創意表達');
        guidanceText = `現在是${hourEnergy.chineseName}，火能旺盛，用神得力。此刻擲筊詢問事業、項目、行動決策，天命共振最為強烈。`;
        suggestions.push('此時辰最適合詢問事業、財務決策、項目展開等問題');
      } else if (hourElement === 'earth') {
        bestTopics.push('財務規劃', '實際行動', '穩定基礎');
        guidanceText = `現在是${hourEnergy.chineseName}，土氣穩固，財星得力。此刻適合詢問財務規劃、實際行動、居家安定等問題。`;
        suggestions.push('此時辰最適合詢問財務、居家、實際投資等問題');
      } else if (hourElement === 'metal') {
        bestTopics.push('合作洽謈', '人際關係', '簽約决策');
        guidanceText = `現在是${hourEnergy.chineseName}，金氣清澄，决斷力強。此刻適合詢問合作、人際、簽約等需要判斷力的問題。`;
        suggestions.push('此時辰最適合詢問合作、人際關係、簽約等問題');
      } else if (hourElement === 'wood') {
        bestTopics.push('學習成長', '健康養生', '創意規劃');
        guidanceText = `現在是${hourEnergy.chineseName}，木氣旺盛，身強印旺。此刻適合詢問學習、健康、個人成長等問題。`;
        suggestions.push('此時辰最適合詢問學習、健康、個人成長等問題');
      } else {
        bestTopics.push('靈性修行', '內心審視', '静心決策');
        guidanceText = `現在是${hourEnergy.chineseName}，水氣流動，宜静不宜動。此刻適合詢問靈性、內心、長遠規劃等問題。`;
        suggestions.push('此時辰最適合詢問靈性、內心成長、長期規劃等問題');
      }

      if (moonInfo.isFullMoon) {
        guidanceText += '今逢滿月，宇宙能量達到高峰，任何問題都能得到最清晰的神諭回應。';
        bestTopics.push('重大人生決策');
      }

      return {
        currentHour: hourEnergy.chineseName,
        hourElement,
        energyLabel: hourEnergy.energyLabel,
        guidanceText,
        bestTopics,
        suggestions,
        moonPhase: moonInfo.phaseName,
        isFullMoon: moonInfo.isFullMoon,
        dateString: dateInfo.dateString,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
