import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getDailyTenGodAnalysis } from "./lib/tenGods";
import { calculateTarotDailyCard, generateOutfitAdvice, recommendBracelets, generateWealthCompass, getNearestSolarTerm } from "./lib/warRoomEngine";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { castOracle } from "./lib/oracleAlgorithm";
import { getFullDateInfo } from "./lib/lunarCalendar";
import { getMoonPhase } from "./lib/moonPhase";
import { getAllHourEnergies, getCurrentHourEnergy, getBestHours, getWorstHours } from "./lib/hourlyEnergy";
import { saveOracleSession, getOracleHistory, getOracleStats, saveLotterySession, getLotteryHistory, getLotteryStats } from "./db";
import { notifyOwner } from "./_core/notification";
import { generateLotteryNumbers, generateLotterySets, generateScratchStrategies, analyzeAddressWuxing } from "./lib/lotteryAlgorithm";
import { invokeLLM } from "./_core/llm";
import { scoreNearbyStores, type StoreInput, type WuXing } from "./lib/storeResonance";
import { sendMorningBriefing, generateMorningBriefingContent } from "./lib/morningBriefing";

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
     * 獲取刷刷樂統計數據
     */
    stats: publicProcedure.query(async ({ ctx }) => {
      return getLotteryStats(ctx.user?.id);
    }),

    /**
     * 今日最佳購買時機：計算今日所有時辰的能量等級，找出最適合購買的時辰
     */
    bestTime: publicProcedure.query(async () => {
      const { getFullDateInfo } = await import('./lib/lunarCalendar');
      const { getAllHourEnergies } = await import('./lib/hourlyEnergy');
      const dateInfo = getFullDateInfo();
      const allHours = getAllHourEnergies(dateInfo.dayPillar.stem);

      const now = new Date();
      const currentHour = now.getHours();

      // 將時辰映射到小時範圍
      const hourRanges: Record<string, [number, number]> = {
        '子': [23, 1], '丑': [1, 3], '寅': [3, 5], '卯': [5, 7],
        '辰': [7, 9], '巳': [9, 11], '午': [11, 13], '未': [13, 15],
        '申': [15, 17], '酉': [17, 19], '戌': [19, 21], '亥': [21, 23],
      };

      const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

      const hourSlots = allHours.map((h, idx) => {
        const branch = BRANCH_ORDER[idx];
        const range = hourRanges[branch] ?? [idx * 2, idx * 2 + 2];
        const startHour = range[0];
        const endHour = range[1];
        // 判斷是否為當前時辰
        let isCurrent = false;
        if (branch === '子') {
          isCurrent = currentHour >= 23 || currentHour < 1;
        } else {
          isCurrent = currentHour >= startHour && currentHour < endHour;
        }
        // 判斷是否已過
        const isPast = branch !== '子'
          ? currentHour >= endHour
          : (currentHour >= 1 && currentHour < 23);

        // 將能量等級轉為分數（energyLabel 為中文：大吉/吉/平/凶）
        const scoreMap: Record<string, number> = {
          '大吉': 10, '吉': 8, '平': 5, '凶': 2,
          // 相容舊版英文標籤
          excellent: 10, good: 8, neutral: 5, challenging: 2, complex: 4
        };
        const score = scoreMap[h.energyLabel] ?? 5;

        return {
          branch,
          chineseName: h.chineseName,
          startHour,
          endHour,
          energyLabel: h.energyLabel,
          score,
          isCurrent,
          isPast,
          stemElement: h.stemElement,
          actionSuggestion: h.actionSuggestion,
          auspicious: h.auspicious,
          inauspicious: h.inauspicious,
        };
      });

      // 找出最佳時辰（分數最高的兩個）
      const bestSlots = [...hourSlots]
        .filter(h => !h.isPast || h.isCurrent)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // 找出下一個最佳時辰（未來且分數最高）
      const nextBest = hourSlots.find(h => !h.isPast && !h.isCurrent && h.score >= 7);

      // 計算到下一個最佳時辰的倒數
      let countdownSeconds = 0;
      if (nextBest) {
        const targetHour = nextBest.startHour;
        const targetDate = new Date(now);
        targetDate.setHours(targetHour, 0, 0, 0);
        if (targetDate <= now) targetDate.setDate(targetDate.getDate() + 1);
        countdownSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
      }

      return {
        hourSlots,
        bestSlots,
        nextBest,
        countdownSeconds,
        currentHour,
        dayPillar: dateInfo.dayPillar,
      };
    }),

    /**
     * 附近彩券行天命共振評分
     * 輸入：使用者座標 + 店家列表
     * 輸出：每家店的天命共振指數、方位五行、門牌五行、店名五行、流日流時加成
     */
    scoreStores: publicProcedure
      .input(z.object({
        userLat: z.number(),
        userLng: z.number(),
        stores: z.array(z.object({
          placeId: z.string(),
          name: z.string(),
          address: z.string(),
          lat: z.number(),
          lng: z.number(),
          distance: z.number(),
          rating: z.number().optional(),
          isOpen: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { getFullDateInfo } = await import('./lib/lunarCalendar');
        const { getCurrentHourEnergy } = await import('./lib/hourlyEnergy');
        const dateInfo = getFullDateInfo();
        const hourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);

        // stemElement 返回中文（火/土/金/水/木），需轉換為英文 WuXing
        const ELEMENT_ZH_TO_EN: Record<string, WuXing> = {
          '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
        };
        const dayElement = (ELEMENT_ZH_TO_EN[dateInfo.dayPillar.stemElement] ?? 'fire') as WuXing;
        const hourElement = (ELEMENT_ZH_TO_EN[hourEnergy.stemElement] ?? 'fire') as WuXing;

        const scored = scoreNearbyStores(
          input.stores as StoreInput[],
          input.userLat,
          input.userLng,
          dayElement,
          hourElement,
        );

        return {
          stores: scored,
          dayPillar: dateInfo.dayPillar,
          hourPillar: {
            chineseName: hourEnergy.chineseName,
            stemElement: hourEnergy.stemElement,
            energyLabel: hourEnergy.energyLabel,
          },
          analysisTime: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
        };
      }),

    /**
     * 彩券行收藏 - 取得列表
     */
    getFavorites: publicProcedure.query(async ({ ctx }) => {
      const { getFavoriteStores } = await import('./db');
      const stores = await getFavoriteStores(ctx.user?.id);
      // 對每家收藏彩券行計算當日共振指數
      const { getDayPillar, getCurrentHourInfo } = await import('./lib/lunarCalendar');
      const { scoreNearbyStores } = await import('./lib/storeResonance');
      const now = new Date();
      const dp = getDayPillar(now);
      // 將中文五行轉為英文 WuXing
      const CN_TO_EN: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
      const dayEl = (CN_TO_EN[dp.stemElement] ?? 'earth') as any;
      // 時辰五行由地支推算
      const BRANCH_EL: Record<string, string> = {
        '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood', '辰': 'earth', '巳': 'fire',
        '午': 'fire', '未': 'earth', '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water',
      };
      const hourEl = (BRANCH_EL[dp.branch] ?? 'earth') as any;
      const scored = stores.map(s => {
        const lat = parseFloat(s.lat);
        const lng = parseFloat(s.lng);
        const result = scoreNearbyStores(
          [{ placeId: s.placeId, name: s.name, address: s.address, lat, lng, distance: 0 }],
          lat, lng, dayEl, hourEl,
        );
        return {
          id: s.id,
          placeId: s.placeId,
          name: s.name,
          address: s.address,
          note: s.note,
          resonanceScore: result[0]?.resonanceScore ?? 50,
          resonanceLabel: result[0]?.recommendation ?? '天命能量平穩',
          dayPillar: `${dp.stem}${dp.branch}`,
        };
      });
      return scored.sort((a, b) => b.resonanceScore - a.resonanceScore);
    }),

    /**
     * 彩券行收藏 - 新增
     */
    addFavorite: publicProcedure
      .input(z.object({
        placeId: z.string(),
        name: z.string(),
        address: z.string(),
        lat: z.number(),
        lng: z.number(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { addFavoriteStore, isFavoriteStore, getFavoriteStores } = await import('./db');
        const userId = ctx.user?.id;
        // 檢查是否已收藏
        const already = await isFavoriteStore(input.placeId, userId);
        if (already) return { success: false, message: '已收藏過此彩券行' };
        // 檢查數量上限
        const existing = await getFavoriteStores(userId);
        if (existing.length >= 5) return { success: false, message: '最多收藏 5 家彩券行' };
        const id = await addFavoriteStore({
          userId,
          placeId: input.placeId,
          name: input.name,
          address: input.address,
          lat: String(input.lat),
          lng: String(input.lng),
          note: input.note,
        });
        return { success: true, id };
      }),

    /**
     * 彩券行收藏 - 刪除
     */
    removeFavorite: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { removeFavoriteStore } = await import('./db');
        await removeFavoriteStore(input.id, ctx.user?.id);
        return { success: true };
      }),

    /**
     * 刮刮樂面額選號策略：根據面額（50/100/200/500元）生成對應的天命選號建議
     */
    scratchStrategies: publicProcedure.query(() => {
      return generateScratchStrategies(new Date());
    }),

    /**
     * 地址五行分析：輸入彩券行地址，分析其五行屬性與甲木命格的共振程度
     */
    addressAnalysis: publicProcedure
      .input(z.object({ address: z.string().min(1).max(200) }))
      .query(({ input }) => {
        return analyzeAddressWuxing(input.address);
      }),

    // ── 刮刮樂購買日誌 ──────────────────────────────────────────────
    /** 新增一筆購買日誌 */
    addScratchLog: publicProcedure
      .input(z.object({
        denomination: z.number().int().refine(v => [100, 200, 300, 500, 1000, 2000].includes(v), "無效面額"),
        storeAddress: z.string().max(500).optional(),
        purchaseHour: z.string().max(10).optional(),
        resonanceScore: z.number().int().min(1).max(10).optional(),
        isWon: z.boolean().default(false),
        wonAmount: z.number().int().min(0).default(0),
        note: z.string().max(300).optional(),
        purchasedAt: z.number().int(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { addScratchLog } = await import('./db');
        const id = await addScratchLog({
          userId: ctx.user?.id,
          denomination: input.denomination,
          storeAddress: input.storeAddress,
          purchaseHour: input.purchaseHour,
          resonanceScore: input.resonanceScore,
          isWon: input.isWon ? 1 : 0,
          wonAmount: input.wonAmount,
          note: input.note,
          purchasedAt: input.purchasedAt,
        });
        return { id, success: true };
      }),

    /** 取得購買日誌列表 */
    getScratchLogs: publicProcedure.query(async ({ ctx }) => {
      const { getScratchLogs } = await import('./db');
      return getScratchLogs(ctx.user?.id);
    }),

    /** 取得統計分析 */
    getScratchStats: publicProcedure.query(async ({ ctx }) => {
      const { getScratchStats } = await import('./db');
      return getScratchStats(ctx.user?.id);
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

  lotteryResult: router({
    /**
     * 儲存開獎對照記錄
     */
    save: publicProcedure
      .input(z.object({
        sessionId: z.number().optional(),
        predictedNumbers: z.array(z.number()),
        actualNumbers: z.array(z.number()).length(6),
        actualBonus: z.number().optional(),
        dayPillar: z.string(),
        dateString: z.string(),
        // 刮刮樂專用欄位
        ticketType: z.enum(['lottery', 'scratch']).optional().default('lottery'),
        scratchPrice: z.number().optional(),
        scratchPrize: z.number().optional(),
        scratchWon: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDayPillar } = await import('./lib/lunarCalendar');
        const today = new Date();
        const dp = getDayPillar(today);
        const { saveLotteryResult } = await import('./db');

        if (input.ticketType === 'scratch') {
          // ===== 刮刮樂共振計算 =====
          const prize = input.scratchPrize ?? 0;
          const price = input.scratchPrice ?? 100;
          const won = input.scratchWon ?? false;
          let resonanceScore = won ? 55 : 30;
          if (won) {
            const multiplier = prize / price;
            if (multiplier >= 100) resonanceScore = 95;
            else if (multiplier >= 20) resonanceScore = 85;
            else if (multiplier >= 5) resonanceScore = 75;
            else if (multiplier >= 2) resonanceScore = 65;
          }
          // 当日天干五行加成
          const stemEl = dp.stemElement;
          if (stemEl === '火' || stemEl === '土') resonanceScore = Math.min(100, resonanceScore + 10);
          else if (stemEl === '水') resonanceScore = Math.max(0, resonanceScore - 5);
          const id = await saveLotteryResult({
            userId: ctx.user?.id,
            predictedNumbers: [],
            actualNumbers: [],
            matchCount: 0,
            bonusMatch: 0,
            resonanceScore,
            dayPillar: input.dayPillar || `${dp.stem}${dp.branch}`,
            dateString: input.dateString || `${dp.stem}${dp.branch}日`,
            ticketType: 'scratch',
            scratchPrice: price,
            scratchPrize: prize,
            scratchWon: won ? 1 : 0,
          });
          return { id, matchCount: 0, bonusMatch: 0, resonanceScore, ticketType: 'scratch' as const, scratchWon: won, scratchPrize: prize };
        }

        // ===== 大樂透共振計算 =====
        const predicted = new Set(input.predictedNumbers);
        const matchCount = input.actualNumbers.filter(n => predicted.has(n)).length;
        const bonusMatch = input.actualBonus !== undefined && predicted.has(input.actualBonus) ? 1 : 0;
        const ELEMENT_MAP: Record<number, string> = {
          1: 'wood', 3: 'wood', 8: 'wood',
          2: 'fire', 7: 'fire',
          5: 'earth', 0: 'earth',
          4: 'metal', 9: 'metal',
          6: 'water',
        };
        const FAVORABLE = ['fire', 'earth'];
        let resonanceScore = 40;
        const matchedNums = input.actualNumbers.filter(n => predicted.has(n));
        for (const n of matchedNums) {
          const el = ELEMENT_MAP[n % 10];
          if (FAVORABLE.includes(el ?? '')) resonanceScore += 12;
          else resonanceScore += 5;
        }
        if (bonusMatch) resonanceScore += 8;
        resonanceScore = Math.min(100, resonanceScore);
        const id = await saveLotteryResult({
          userId: ctx.user?.id,
          sessionId: input.sessionId,
          predictedNumbers: input.predictedNumbers,
          actualNumbers: input.actualNumbers,
          actualBonus: input.actualBonus,
          matchCount,
          bonusMatch,
          resonanceScore,
          dayPillar: input.dayPillar || `${dp.stem}${dp.branch}`,
          dateString: input.dateString || `${dp.stem}${dp.branch}日`,
          ticketType: 'lottery',
        });
        return { id, matchCount, bonusMatch, resonanceScore, ticketType: 'lottery' as const };
      }),

    /**
     * 取得開獎對照歷史與統計
     */
    history: publicProcedure.query(async ({ ctx }) => {
      const { getLotteryResults, getLotteryResultStats } = await import('./db');
      const [records, stats] = await Promise.all([
        getLotteryResults(30),
        getLotteryResultStats(),
      ]);
      return { records, stats };
    }),
  }),

  weeklyReport: router({
    /**
     * 命理週報：未來七日能量走勢
     */
    sevenDays: publicProcedure.query(async () => {
      const { getDayPillar } = await import('./lib/lunarCalendar');
      const { getMoonPhase } = await import('./lib/moonPhase');

      const today = new Date();
      const days = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);

        const dayPillar = getDayPillar(date);
        const moonInfo = getMoonPhase(date);

        // 計算當日綜合能量分數 (0-100)
        let energyScore = 50;

        // 五行與蘇先生命格的共振計算
        const stemEl = dayPillar.stemElement;
        const branchEl = dayPillar.branchElement;

        // 火/土日對蘇先生有利（用神）
        if (stemEl === 'fire' || stemEl === 'earth') energyScore += 20;
        if (branchEl === 'fire' || branchEl === 'earth') energyScore += 10;
        // 木日中性
        if (stemEl === 'wood') energyScore += 5;
        if (branchEl === 'wood') energyScore += 3;
        // 水日對蘇先生小利（水旨已強）
        if (stemEl === 'water') energyScore -= 5;
        if (branchEl === 'water') energyScore -= 3;
        // 金日中性偏低
        if (stemEl === 'metal') energyScore -= 2;

        // 滿月加成
        if (moonInfo.isFullMoon) energyScore += 8;
        if (moonInfo.isNewMoon) energyScore -= 3;

        // 限制範圍
        energyScore = Math.max(10, Math.min(100, energyScore));

        // 定義最適合的行動類型
        let bestAction = '';
        let actionIcon = '';
        let colorClass = ''
        if (energyScore >= 75) {
          bestAction = '重大決策 / 事業推進';
          actionIcon = '🔥';
          colorClass = 'excellent';
        } else if (energyScore >= 60) {
          bestAction = '創意表達 / 社交合作';
          actionIcon = '✨';
          colorClass = 'good';
        } else if (energyScore >= 45) {
          bestAction = '日常推進 / 學習研究';
          actionIcon = '🌿';
          colorClass = 'neutral';
        } else if (energyScore >= 30) {
          bestAction = '静心觀察 / 整理資訊';
          actionIcon = '🌊';
          colorClass = 'low';
        } else {
          bestAction = '休养蓄勢 / 避免重大行動';
          actionIcon = '🌙';
          colorClass = 'rest';
        }

        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[date.getDay()];

        days.push({
          date: date.toISOString().split('T')[0],
          dayOffset: i,
          weekday,
          isToday: i === 0,
          dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
          stemElement: stemEl,
          branchElement: branchEl,
          energyScore,
          colorClass,
          bestAction,
          actionIcon,
          moonPhase: moonInfo.phaseName,
          moonEmoji: moonInfo.phaseEmoji,
          isFullMoon: moonInfo.isFullMoon,
          auspicious: dayPillar.auspicious.slice(0, 2),
          inauspicious: dayPillar.inauspicious.slice(0, 1),
        });
      }

      // 計算本週最佳日
      const bestDay = days.reduce((best, d) => d.energyScore > best.energyScore ? d : best, days[0]);
      const worstDay = days.reduce((worst, d) => d.energyScore < worst.energyScore ? d : worst, days[0]);

      return {
        days,
        bestDay,
        worstDay,
        weekSummary: `本週天命能量綜合評估：${bestDay.dayPillar}日為最佳行動日，${worstDay.dayPillar}日宜静心蓄勢。`,
      };
    }),
  }),

  warRoom: router({
    /**
     * 今日作戰室完整報告
     */
    dailyReport: publicProcedure
      .input(z.object({
        // 指定日期（ISO 字串，例如 "2026-02-22"），不傳則為今日
        date: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
      // 若傳入指定日期，直接解析年月日（避免伺服器時區轉換問題）
      // 否則使用當前台灣時間
      const realNow = new Date();
      // 台灣時間 UTC+8
      const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
      const todayStr = twNow.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const isToday = !input?.date || input.date === todayStr;

      let year: number, month: number, day: number;
      if (input?.date) {
        // 直接解析 "YYYY-MM-DD" 字串，不經過時區轉換
        const parts = input.date.split('-');
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else {
        year = twNow.getUTCFullYear();
        month = twNow.getUTCMonth() + 1;
        day = twNow.getUTCDate();
      }
      // 建立代表指定日期的 Date 物件（用 UTC 中午避免時區偏移）
      const now = new Date(Date.UTC(year, month - 1, day, 4, 0, 0)); // UTC 04:00 = 台灣時間 12:00
      const hour = isToday
        ? Math.floor((realNow.getTime() + 8 * 60 * 60 * 1000) / 3600000) % 24
        : 12; // 非今日預設顯示午時

      // 1. 農曆日期與天干地支
      const dateInfo = getFullDateInfo(now);
      const dayPillar = dateInfo.dayPillar;
      const monthPillar = dateInfo.monthPillar;
      const yearPillar = dateInfo.yearPillar;

      // 2. 月相
      const moonInfo = getMoonPhase(now);

      // 3. 八字十神分析
      const tenGodAnalysis = getDailyTenGodAnalysis(dayPillar.stem, dayPillar.branch);

      // 4. 塔羅流日
      const tarot = calculateTarotDailyCard(month, day);

      // 5. 穿搭建議
      const outfit = generateOutfitAdvice(tenGodAnalysis.mainMeaning.wuxing, tenGodAnalysis.overallScore);

      // 6. 手串推薦
      const bracelets = recommendBracelets(tenGodAnalysis.mainMeaning.wuxing, tenGodAnalysis.overallScore);

      // 7. 財運羅盤
      const wealthCompass = generateWealthCompass(
        tenGodAnalysis.mainMeaning.wuxing,
        tenGodAnalysis.mainTenGod,
        tarot.card,
        tenGodAnalysis.overallScore,
      );

      // 8. 時辰能量
      const currentHour = getCurrentHourEnergy(dayPillar.stem);
      const allHours = getAllHourEnergies(dayPillar.stem);
      const bestHours = getBestHours(dayPillar.stem).slice(0, 3);

      // 9. 節氣
      const nearestTerm = getNearestSolarTerm(now);

      // 10. 一句話總結
      const oneLinerMap: Record<string, string> = {
        食神: `甲木化火，才華即財富。今日，讓世界看見你的光。`,
        傷官: `破繭之日，鋒芒畢露。今日，打破一個讓你不舒服的框架。`,
        偏財: `財星入局，機不可失。今日，主動出擊，把握每一個偏財機遇。`,
        正財: `穩健積累，水到渠成。今日，每一個認真的細節都是在種下財富的種子。`,
        七殺: `壓力即動力，挑戰即機遇。今日，以食神之火，制七殺之金。`,
        正官: `規範護身，官運加持。今日，以專業與誠信，贏得最重要的認可。`,
        偏印: `深水靜流，智慧沉澱。今日，向內探索，答案就在你的靜默之中。`,
        正印: `貴人相助，滋養之日。今日，放下自我，接受宇宙的饋贈。`,
        比肩: `自強不息，獨立前行。今日，以實力說話，讓作品成為最好的名片。`,
        劫財: `守住根基，靜待時機。今日，低調是最高明的策略。`,
      };
      const oneLiner = oneLinerMap[tenGodAnalysis.mainTenGod] || `天命能量 ${tenGodAnalysis.overallScore}/10，保持覺察，順勢而為。`;

      return {
        // 頂部核心數據
        date: {
          gregorian: `${year}年${month}月${day}日`,
          lunar: dateInfo.dateString,
          weekday: ["日", "一", "二", "三", "四", "五", "六"][now.getDay()],
          nearestSolarTerm: nearestTerm,
          yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
          monthPillar: `${monthPillar.stem}${monthPillar.branch}`,
          dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
          currentHourName: currentHour.chineseName,
          currentHourStem: currentHour.stem,
        },
        // 一句話總結與核心矛盾
        oneLiner,
        coreConflict: tenGodAnalysis.coreConflict,
        overallScore: tenGodAnalysis.overallScore,
        // 十神分析
        tenGod: {
          main: tenGodAnalysis.mainTenGod,
          score: tenGodAnalysis.mainScore,
          role: tenGodAnalysis.mainMeaning.role,
          energy: tenGodAnalysis.mainMeaning.energy,
          advice: tenGodAnalysis.mainMeaning.advice,
          wuxing: tenGodAnalysis.mainMeaning.wuxing,
          branchGods: tenGodAnalysis.branchTenGods,
        },
        // 英雄劇本
        heroScript: tenGodAnalysis.heroScript,
        // 塔羅流日
        tarot: {
          cardNumber: tarot.cardNumber,
          name: tarot.card.name,
          element: tarot.card.element,
          keywords: tarot.card.keywords,
          advice: tarot.card.advice,
          energy: tarot.card.energy,
          calculation: tarot.calculation,
        },
        // 月相
        moon: {
          phase: moonInfo.phaseName,
          emoji: moonInfo.phaseEmoji,
          illumination: moonInfo.illumination,
          lunarDay: moonInfo.lunarDay,
          isFullMoon: moonInfo.isFullMoon,
          castInfluence: moonInfo.castInfluence,
        },
        // 穿搭建議
        outfit,
        // 手串推薦
        bracelets: {
          leftHand: bracelets.leftHand,
          rightHand: bracelets.rightHand,
          summary: bracelets.summary,
        },
        // 財運羅盤
        wealthCompass,
        // 時辰能量
        hourEnergy: {
          current: currentHour,
          bestHours: bestHours.map(h => ({ name: h.chineseName, branch: h.branch, stem: h.stem, score: h.energyScore, displayTime: h.displayTime })),
          allHours: allHours.map(h => ({
            name: h.chineseName,
            branch: h.branch,
            stem: h.stem,
            score: h.energyScore,
            level: h.energyLevel,
            label: h.energyLabel,
            isCurrent: h.isCurrentHour,
            displayTime: h.displayTime,
          })),
        },
      };
    }),

    /**
     * 手動觸發晨報推播（測試用）
     */
    triggerMorningBriefing: publicProcedure
      .mutation(async () => {
        const { title, content } = generateMorningBriefingContent();
        const success = await sendMorningBriefing();
        return { success, title, contentPreview: content.substring(0, 200) + '...' };
      }),
  }),
});
export type AppRouter = typeof appRouter;
