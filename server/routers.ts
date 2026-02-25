import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { accountRouter } from "./routers/account";
import { permissionsRouter } from "./routers/permissions";
import { dashboardRouter } from "./routers/dashboard";
import { pointsRouter } from "./routers/points";
import { businessHubRouter } from "./routers/businessHub";
import { getDailyTenGodAnalysis, getTenGod, getDailyTenGodAnalysisDynamic, getTenGodDynamic } from "./lib/tenGods";
import { calculateTarotDailyCard, generateOutfitAdvice, recommendBracelets, generateWealthCompass, getNearestSolarTerm } from "./lib/warRoomEngine";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { castOracle } from "./lib/oracleAlgorithm";
import { getFullDateInfo, getTaiwanHour, getTaiwanDate } from "./lib/lunarCalendar";
import { getMoonPhase } from "./lib/moonPhase";
import { getAllHourEnergies, getCurrentHourEnergy, getBestHours, getWorstHours, getAllHourEnergiesDynamic, getCurrentHourEnergyDynamic } from "./lib/hourlyEnergy";
import { getDb, saveOracleSession, getOracleHistory, getOracleStats, saveLotterySession, getLotteryHistory, getLotteryStats, getUserProfileForEngine } from "./db";
import { userProfiles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { generateLotteryNumbers, generateLotterySets, generateScratchStrategies, analyzeAddressWuxing } from "./lib/lotteryAlgorithm";
import { invokeLLM } from "./_core/llm";
import { scoreNearbyStores, buildDestinyWeightsFromProfile, type StoreInput, type WuXing } from "./lib/storeResonance";
import { sendMorningBriefing, generateMorningBriefingContent } from "./lib/morningBriefing";
import {
  calculateEnvironmentElements,
  calculateWeightedElements,
  generateElementOverview,
  generateOutfitAdviceV9,
  generateDietaryAdvice,
  recommendBraceletsV9,
} from "./lib/wuxingEngine";

export const appRouter = router({
  system: systemRouter,
  account: accountRouter,
  permissions: permissionsRouter,
  dashboard: dashboardRouter,
  points: pointsRouter,
  businessHub: businessHubRouter,
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
    hourlyEnergy: publicProcedure.query(async ({ ctx }) => {
      const dateInfo = getFullDateInfo();
      const dayStem = dateInfo.dayPillar.stem;
      // 登入用戶使用動態命格分數，未登入則退回靜態預設
      let dynamicProfile: import('./lib/hourlyEnergy').DynamicHourProfile | undefined;
      if (ctx.user?.id) {
        const ep = await getUserProfileForEngine(ctx.user.id);
        if (!ep.isDefault) {
          // 將 EngineProfile 轉換為 DynamicHourProfile
          const ZH_TO_SCORE: Record<string, number> = {
            '火': 30, '土': 20, '金': 5, '水': -25, '木': -20,
          };
          const favorableZh = ep.favorableElements;
          const unfavorableZh = ep.unfavorableElements;
          const hourElementScores: Record<string, number> = {};
          for (const el of ['火', '土', '金', '水', '木']) {
            if (favorableZh.includes(el)) hourElementScores[el] = 25;
            else if (unfavorableZh.includes(el)) hourElementScores[el] = -20;
            else hourElementScores[el] = 5;
          }
          dynamicProfile = { hourElementScores, specialHourBonus: {} };
        }
      }
      const allHours = dynamicProfile
        ? getAllHourEnergiesDynamic(dayStem, dynamicProfile)
        : getAllHourEnergies(dayStem);
      const currentHour = dynamicProfile
        ? getCurrentHourEnergyDynamic(dayStem, dynamicProfile)
        : getCurrentHourEnergy(dayStem);
      const bestHours = [...allHours].sort((a, b) => b.energyScore - a.energyScore).slice(0, 3);
      const worstHours = [...allHours].sort((a, b) => a.energyScore - b.energyScore).slice(0, 2);
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
      return getMoonPhase(getTaiwanDate());
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
     * 生成天命共振幸達號碼（支援可選日期）
     */
    generate: publicProcedure
      .input(z.object({
        saveRecord: z.boolean().default(true),
        targetDate: z.string().optional(), // ISO date string e.g. "2026-02-22"
        weather: z.object({
          condition: z.string().optional(), // e.g. "sunny", "rainy", "cloudy"
          temperature: z.number().optional(),
          humidity: z.number().optional(),
          weatherElement: z.string().optional(), // fire/water/wood/metal/earth
        }).optional(),
        profileUserId: z.number().int().optional(), // 切換命格（主帳號專屬）
      }).optional())
      .mutation(async ({ ctx, input }) => {
        // 支援指定日期，預設今日
        let now: Date;
        if (input?.targetDate) {
          // 將 YYYY-MM-DD 轉成台灣時間 00:00
          const [y, m, d] = input.targetDate.split('-').map(Number);
          now = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 8 * 3600000); // UTC+8 對齊
          now = new Date(y, m - 1, d, 8, 0, 0); // 簡化：台灣早上 8 點
        } else {
          now = getTaiwanDate();
        }
        // V3.0+：已登入用戶自動使用自己的命格，profileUserId 可覆寫（主帳號切換命格用）
        let customBaseWeights: Record<number, number> | undefined;
        let customElementBoost: Record<string, number> | undefined;
        const targetUserId = input?.profileUserId ?? ctx.user?.id;
        if (targetUserId) {
          try {
            const ep = await getUserProfileForEngine(targetUserId);
            if (!ep.isDefault) {
              const favElements = ep.favorableElementsEn;
              const unfavElements = ep.unfavorableElements.map(e => {
                const m: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
                return m[e] ?? e;
              });
              // 依命格計算動態五行加成
              const allElements = ['fire', 'earth', 'metal', 'wood', 'water'];
              customElementBoost = Object.fromEntries(allElements.map(el => {
                if (favElements.includes(el)) return [el, 3];
                if (unfavElements.includes(el)) return [el, -2];
                return [el, 0];
              }));
              // 依五行加成計算基礎權重
              const WUXING_MAP: Record<string, number[]> = {
                wood: [1, 3, 8], fire: [2, 7], earth: [0, 5], metal: [4, 9], water: [6]
              };
              customBaseWeights = {};
              for (let i = 0; i <= 9; i++) {
                const el = allElements.find(e => WUXING_MAP[e]?.includes(i)) ?? 'earth';
                if (favElements.includes(el)) customBaseWeights[i] = 10;
                else if (unfavElements.includes(el)) customBaseWeights[i] = 3;
                else customBaseWeights[i] = 6;
              }
            }
          } catch (e) {
            console.warn('[Lottery] Failed to load profile for userId', targetUserId, e);
          }
        }
        const lotteryOptions = {
          weatherElement: input?.weather?.weatherElement,
          useWeather: !!(input?.weather?.weatherElement),
          customBaseWeights,
          customElementBoost,
        };
        const result = generateLotteryNumbers(now, lotteryOptions);
        const sets = generateLotterySets(now, lotteryOptions);

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
      // 使用台灣時間 UTC+8
      const currentHour = getTaiwanHour();;

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

        // ✅ 修正：使用真實 energyScore（0-100），依命格用神（火土金）計算
        const rawScore = h.energyScore; // 0-100 真實分數
        const displayScore = Math.round(rawScore / 10 * 10) / 10; // 0-10 顯示用
        return {
          branch,
          chineseName: h.chineseName,
          startHour,
          endHour,
          energyLabel: h.energyLabel,
          score: displayScore,    // 0-10 顯示用
          rawScore,               // 0-100 排序用
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
        .sort((a, b) => b.rawScore - a.rawScore)
        .slice(0, 3);

      // 找出下一個最佳時辰（未來且分數最高）
      const nextBest = [...hourSlots]
        .filter(h => !h.isPast && !h.isCurrent)
        .sort((a, b) => b.rawScore - a.rawScore)
        .find(h => h.rawScore >= 65);

      // 計算到下一個最佳時辰的倒數
      let countdownSeconds = 0;
      if (nextBest) {
        const targetHour = nextBest.startHour;
        const nowReal = new Date();
        // 台灣時間對應的 UTC 時間
        const taiwanNowMs = nowReal.getTime() + 8 * 60 * 60 * 1000;
        const taiwanNow = new Date(taiwanNowMs);
        const targetDate = new Date(taiwanNow);
        targetDate.setUTCHours(targetHour, 0, 0, 0);
        if (targetDate <= taiwanNow) targetDate.setUTCDate(targetDate.getUTCDate() + 1);
        countdownSeconds = Math.floor((targetDate.getTime() - taiwanNow.getTime()) / 1000);
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
      .mutation(async ({ ctx, input }) => {
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
        // 登入用戶使用動態命格權重
        let dynamicWeights: Record<WuXing, number> | undefined;
        if (ctx.user?.id) {
          const ep = await getUserProfileForEngine(ctx.user.id);
          if (!ep.isDefault) {
            dynamicWeights = buildDestinyWeightsFromProfile(ep.favorableElementsEn);
          }
        }
        const scored = scoreNearbyStores(
          input.stores as StoreInput[],
          input.userLat,
          input.userLng,
          dayElement,
          hourElement,
          dynamicWeights,
        );

        return {
          stores: scored,
          dayPillar: dateInfo.dayPillar,
          hourPillar: {
            chineseName: hourEnergy.chineseName,
            stemElement: hourEnergy.stemElement,
            energyLabel: hourEnergy.energyLabel,
          },
          analysisTime: getTaiwanDate().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' }),
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
      const now = getTaiwanDate();
      const dp = getDayPillar(now);
      // 對每家收藏彩券行計算當日共振指數g
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
    scratchStrategies: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weatherElement: z.string().optional(),
        addressElement: z.string().optional(),
        useWeather: z.boolean().optional(),
        useAddress: z.boolean().optional(),
      }).optional())
      .query(({ input }) => {
        let date: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          date = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          date = getTaiwanDate();
        }
        const options = {
          weatherElement: input?.weatherElement,
          addressElement: input?.addressElement,
          useWeather: input?.useWeather ?? !!(input?.weatherElement),
          useAddress: input?.useAddress ?? !!(input?.addressElement),
        };
        return generateScratchStrategies(date, options);
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
        fengShuiGrade: z.string().max(10).optional(),
        fengShuiScore: z.number().int().min(0).max(100).optional(),
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
          fengShuiGrade: input.fengShuiGrade,
          fengShuiScore: input.fengShuiScore,
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

    /**
     * 彩券能量指數：結合日柱/十神/月相計算紹合分數（支援可選日期）
     */
    energyIndex: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(), // YYYY-MM-DD
      }).optional())
      .query(async ({ input }) => {
        let date: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          date = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          date = getTaiwanDate();
        }
        const { getFullDateInfo } = await import('./lib/lunarCalendar');
        const { getMoonPhase } = await import('./lib/moonPhase');
        const dateInfo = getFullDateInfo(date);
        const moonInfo = getMoonPhase(date);

        // 計算彩券能量指數（1-10）
        const dayLuck = generateLotteryNumbers(date).energyAnalysis.overallLuck;
        const moonBoost = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? 0.5 : 0;
        const rawScore = Math.min(10, dayLuck + moonBoost);
        const score = Math.round(rawScore * 10) / 10;

        // 建議類型
        const recommendation = score >= 8 ? 'suitable' : score >= 5 ? 'observe' : 'unsuitable';
        const recommendationLabel = score >= 8 ? '適合購彩' : score >= 5 ? '觀望等待' : '不建議購彩';
        const recommendationDesc = score >= 8
          ? `今日天命能量極佳，${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日五行共振強勁，適合出手購彩。`
          : score >= 5
          ? `今日能量尚可，${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日建議選擇吉時出手，勿強求。`
          : `今日能量較弱，${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日五行不利，建議暂緩購彩。`;

        // 影響因素分析
        const factors = [
          { label: '日柱能量', value: Math.round(dayLuck * 10), maxValue: 100, desc: `${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日` },
          { label: '月相加成', value: Math.round(moonBoost * 10), maxValue: 20, desc: moonInfo.phaseName },
          { label: '天干加持', value: Math.round(dayLuck * 5), maxValue: 50, desc: `${dateInfo.dayPillar.stem}日主` },
        ];

        return {
          score,
          recommendation,
          recommendationLabel,
          recommendationDesc,
          dayPillar: `${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}`,
          moonPhase: moonInfo.phaseName,
          moonEmoji: moonInfo.phaseEmoji,
          factors,
          dateString: date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        };
      }),

    /**
     * 取得指定地點天氣資訊（Open-Meteo 免費 API）
     */
    getWeather: publicProcedure
      .input(z.object({
        lat: z.number(),
        lon: z.number(),
        targetDate: z.string().optional(), // YYYY-MM-DD
      }))
      .query(async ({ input }) => {
        const { lat, lon, targetDate } = input;
        const dateStr = targetDate ?? new Date().toISOString().split('T')[0];
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=Asia%2FTaipei&start_date=${dateStr}&end_date=${dateStr}&current_weather=true`;

        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error('Weather API failed');
          const data = await res.json() as any;

          const wCode = data.daily?.weathercode?.[0] ?? data.current_weather?.weathercode ?? 0;
          const tMax = data.daily?.temperature_2m_max?.[0] ?? data.current_weather?.temperature ?? 20;
          const tMin = data.daily?.temperature_2m_min?.[0] ?? tMax - 5;
          const precip = data.daily?.precipitation_sum?.[0] ?? 0;

          // WMO 天氣碼 → 中文描述
          const getCondition = (code: number) => {
            if (code === 0) return { label: '晴天', element: 'fire', icon: '☀️' };
            if (code <= 3) return { label: '多雲', element: 'metal', icon: '⛅' };
            if (code <= 49) return { label: '霧', element: 'water', icon: '🌫️' };
            if (code <= 67) return { label: '雨天', element: 'water', icon: '🌧️' };
            if (code <= 77) return { label: '雪天', element: 'metal', icon: '❄️' };
            if (code <= 82) return { label: '陣雨', element: 'water', icon: '🌦️' };
            if (code <= 99) return { label: '雷雨', element: 'fire', icon: '⚡' };
            return { label: '未知', element: 'earth', icon: '🌡️' };
          };

          const condition = getCondition(wCode);
          return {
            condition: condition.label,
            conditionIcon: condition.icon,
            weatherElement: condition.element,
            temperature: Math.round((tMax + tMin) / 2),
            tempMax: Math.round(tMax),
            tempMin: Math.round(tMin),
            precipitation: Math.round(precip * 10) / 10,
            humidity: precip > 0 ? 80 : 60,
          };
        } catch {
          // 天氣 API 失敗時返回預設天氣
          return {
            condition: '未知',
            conditionIcon: '🌡️',
            weatherElement: 'earth',
            temperature: 22,
            tempMax: 25,
            tempMin: 18,
            precipitation: 0,
            humidity: 65,
          };
        }
      }),
    /**
     * 統一購彩綜合建議 API
     * 整合：財運羅盤偏財指數 + 彩券能量指數 + 天氣五行 + 當前時辰 + 命格用神
     * 輸出：綜合購彩指數（1-10）、購彩方向、面額建議、最佳時機
     */
    purchaseAdvice: protectedProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weatherElement: z.string().optional(),
        weatherCondition: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getFullDateInfo } = await import('./lib/lunarCalendar');
        const { getMoonPhase } = await import('./lib/moonPhase');
        const { getCurrentHourEnergy } = await import('./lib/hourlyEnergy');
        const { getTenGod } = await import('./lib/tenGods');
        const { calculateTarotDailyCard } = await import('./lib/warRoomEngine');

        // 取得登入者動態命格
        const ep = await getUserProfileForEngine(ctx.user.id);
        // 動態喜忌神（英文 → 中文）
        const EN_TO_ZH: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
        const favorableZh = ep.favorableElementsEn.map(e => EN_TO_ZH[e] || e);
        const unfavorableZh = ep.unfavorableElements;

        let date: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          date = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          date = getTaiwanDate();
        }

        const dateInfo = getFullDateInfo(date);
        const moonInfo = getMoonPhase(date);
        const hourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);
        const tenGod = getTenGodDynamic(dateInfo.dayPillar.stem, ep.dayMasterElement, ep.dayMasterYinYang);
        const tarotCard = calculateTarotDailyCard(date.getMonth() + 1, date.getDate(), ep.birthMonth ?? undefined, ep.birthDay ?? undefined);
        // 1. 偏財指數（依十神計算，與財運羅盤一致））
        const tenGodLotteryMap: Record<string, number> = {
          偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
          七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
          偏印: 4, 正印: 5,
        };
        const fortuneScore = tenGodLotteryMap[tenGod] ?? 5;

        // 2. 日柱五行能量（依登入者喜忌神動態計算）
        const dayElement = dateInfo.dayPillar.stemElement;
        const dayElementScore = favorableZh.includes(dayElement) ? 2.0
          : unfavorableZh.includes(dayElement) ? -2.0 : 0;
        const dayScore = Math.min(10, Math.max(1, 5 + dayElementScore * 2));

        // 3. 月相加成
        const moonBonus = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? -0.5 : 0;

        // 4. 天氣五行加成
        const weatherEl = input?.weatherElement ?? 'earth';
        const WEATHER_SCORE: Record<string, number> = {
          fire: 1.5, earth: 1.0, metal: 0.5, wood: -0.5, water: -1.5,
        };
        const weatherBonus = WEATHER_SCORE[weatherEl] ?? 0;

        // 5. 當前時辰加成（依登入者喜忌神）
        const hourElement = hourEnergy.stemElement;
        const hourBonus = favorableZh.includes(hourElement) ? 0.5
          : unfavorableZh.includes(hourElement) ? -0.3 : 0;

        // 6. 塔羅加成
        const tarotBonus = tarotCard
          ? (["命運之輪", "太陽", "世界", "女皇"].includes(tarotCard.card.name) ? 0.5 : 0)
          : 0;

        // 綜合分：偏財(40%) + 日柱(30%) + 月相(10%) + 天氣(10%) + 時辰(5%) + 塔羅(5%)
        const rawTotal =
          fortuneScore * 0.40 +
          dayScore * 0.30 +
          (5 + moonBonus) * 0.10 +
          (5 + weatherBonus) * 0.10 +
          (5 + hourBonus) * 0.05 +
          (5 + tarotBonus) * 0.05;
        const compositeScore = Math.round(Math.min(10, Math.max(1, rawTotal)) * 10) / 10;

        const level = compositeScore >= 8 ? 'excellent' : compositeScore >= 6.5 ? 'good' : compositeScore >= 5 ? 'observe' : 'avoid';
        const levelLabel = compositeScore >= 8 ? '大吉，強烈推薦' : compositeScore >= 6.5 ? '吉，可以嘗試' : compositeScore >= 5 ? '平，小額觀望' : '不建議購彩';
        const levelColor = compositeScore >= 8 ? 'green' : compositeScore >= 6.5 ? 'yellow' : compositeScore >= 5 ? 'orange' : 'red';

        let lotteryTypeAdvice = '';
        if (compositeScore >= 8) {
          lotteryTypeAdvice = `今日${tenGod}日，偏財能量極強（${fortuneScore}/10），天命強力加持！建議：刮刮樂 1000-2000 元 × 1-2 張，或大樂透/威力彩各一注。把握今日吉時出手。`;
        } else if (compositeScore >= 6.5) {
          lotteryTypeAdvice = `今日${tenGod}日，有一定偏財能量（${fortuneScore}/10）。建議小試：刮刮樂 200-500 元 × 1-2 張，量力而為，以平常心待之。`;
        } else if (compositeScore >= 5) {
          lotteryTypeAdvice = `今日${tenGod}日，能量平平（${fortuneScore}/10）。若真的要買，建議僅限 100 元刮刮樂 × 1 張，以娛樂心態為主，勿強求。`;
        } else {
          lotteryTypeAdvice = `今日${tenGod}日，忌神當道，偏財能量極弱（${fortuneScore}/10）。強烈建議暫緩購彩，專注於正財積累（工作、儲蓄），等待更好的天命時機。`;
        }

        const scoreBreakdown = [
          { label: '財運羅盤偏財指數', score: fortuneScore, maxScore: 10, desc: `${tenGod}日`, weight: '40%' },
          { label: '日柱五行能量', score: Math.round(dayScore * 10) / 10, maxScore: 10, desc: `${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}日（${dayElement}行）`, weight: '30%' },
          { label: '月相加成', score: Math.round((5 + moonBonus) * 10) / 10, maxScore: 10, desc: moonInfo.phaseName, weight: '10%' },
          { label: '天氣五行', score: Math.round((5 + weatherBonus) * 10) / 10, maxScore: 10, desc: input?.weatherCondition ?? '未取得天氣', weight: '10%' },
          { label: '當前時辰', score: Math.round((5 + hourBonus) * 10) / 10, maxScore: 10, desc: `${hourEnergy.chineseName}（${hourElement}行）`, weight: '5%' },
          { label: '塔羅流日', score: Math.round((5 + tarotBonus) * 10) / 10, maxScore: 10, desc: tarotCard?.card.name ?? '未知', weight: '5%' },
        ];

        return {
          compositeScore,
          level,
          levelLabel,
          levelColor,
          lotteryTypeAdvice,
          scoreBreakdown,
          tenGod,
          dayPillar: `${dateInfo.dayPillar.stem}${dateInfo.dayPillar.branch}`,
          moonPhase: moonInfo.phaseName,
          currentHour: hourEnergy.chineseName,
          weatherCondition: input?.weatherCondition ?? '',
          dateString: date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        };
      }),
    /**
     * 過去 14 天購彩指數走勢（含購買記錄標記）
     */
    indexHistory: protectedProcedure
      .input(z.object({
        userId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getFullDateInfo } = await import('./lib/lunarCalendar');
        const { getMoonPhase } = await import('./lib/moonPhase');
        const { getCurrentHourEnergy } = await import('./lib/hourlyEnergy');
        const { calculateTarotDailyCard } = await import('./lib/warRoomEngine');
        const { getScratchLogs } = await import('./db');

        // 取得登入者動態命格
        const ep = await getUserProfileForEngine(ctx.user.id);
        const EN_TO_ZH: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
        const favorableZh = ep.favorableElementsEn.map(e => EN_TO_ZH[e] || e);
        const unfavorableZh = ep.unfavorableElements;

        const today = getTaiwanDate();
        const history: Array<{
          date: string;
          dateLabel: string;
          compositeScore: number;
          level: string;
          levelLabel: string;
          hasPurchase: boolean;
          hasWin: boolean;
          purchaseCount: number;
          wonCount: number;
        }> = [];
        // 取得使用者購買記錄
        const scratchLogs = input?.userId ? await getScratchLogs(input.userId) : await getScratchLogs(ctx.user.id);

        // 共用六維加權計算函數（使用登入者動態命格）
        const calcDayScore = (d: Date) => {
          const dateInfo = getFullDateInfo(d);
          const moonInfo = getMoonPhase(d);
          const hourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);
          const tenGod = getTenGodDynamic(dateInfo.dayPillar.stem, ep.dayMasterElement, ep.dayMasterYinYang);
          const tarotCard = calculateTarotDailyCard(d.getMonth() + 1, d.getDate(), ep.birthMonth ?? undefined, ep.birthDay ?? undefined);
          const tenGodLotteryMap: Record<string, number> = {
            偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
            七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
            偏印: 4, 正印: 5,
          };
          const fortuneScore = tenGodLotteryMap[tenGod] ?? 5;
          const dayElement = dateInfo.dayPillar.stemElement;
          const dayElementScore = favorableZh.includes(dayElement) ? 2.0
            : unfavorableZh.includes(dayElement) ? -2.0 : 0;
          const dayScore = Math.min(10, Math.max(1, 5 + dayElementScore * 2));
          const moonBonus = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? -0.5 : 0;
          const hourElement = hourEnergy.stemElement;
          const hourBonus = favorableZh.includes(hourElement) ? 0.5
            : unfavorableZh.includes(hourElement) ? -0.3 : 0;
          const tarotBonus = tarotCard
            ? (["命運之輪", "太陽", "世界", "女皇"].includes(tarotCard.card.name) ? 0.5 : 0)
            : 0;
          const rawTotal =
            fortuneScore * 0.40 +
            dayScore * 0.30 +
            (5 + moonBonus) * 0.10 +
            5 * 0.10 +
            (5 + hourBonus) * 0.05 +
            (5 + tarotBonus) * 0.05;
          return Math.round(Math.min(10, Math.max(1, rawTotal)) * 10) / 10;
        };

        // 計算過去 14 天（含今日）
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          d.setHours(8, 0, 0, 0);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
          const compositeScore = calcDayScore(d);
          const level = compositeScore >= 8 ? 'excellent' : compositeScore >= 6.5 ? 'good' : compositeScore >= 5 ? 'observe' : 'avoid';
          const levelLabel = compositeScore >= 8 ? '大吉' : compositeScore >= 6.5 ? '吉' : compositeScore >= 5 ? '平' : '凶';
          // 標記購買記錄
          const dayStart = d.getTime();
          const dayEnd = dayStart + 86400000;
          const dayLogs = scratchLogs.filter(l => l.purchasedAt >= dayStart && l.purchasedAt < dayEnd);
          const wonLogs = dayLogs.filter(l => l.isWon === 1);
          history.push({
            date: dateStr,
            dateLabel,
            compositeScore,
            level,
            levelLabel,
            hasPurchase: dayLogs.length > 0,
            hasWin: wonLogs.length > 0,
            purchaseCount: dayLogs.length,
            wonCount: wonLogs.length,
          });
        }

        // 計算明日預測分數
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(8, 0, 0, 0);
        const tomorrowScore = calcDayScore(tomorrow);
        const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
        const tomorrowLabel = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;
        const tomorrowLevel = tomorrowScore >= 8 ? 'excellent' : tomorrowScore >= 6.5 ? 'good' : tomorrowScore >= 5 ? 'observe' : 'avoid';
        const tomorrowLevelLabel = tomorrowScore >= 8 ? '大吉' : tomorrowScore >= 6.5 ? '吉' : tomorrowScore >= 5 ? '平' : '凶';

        return {
          history,
          tomorrow: {
            date: tomorrowDateStr,
            dateLabel: tomorrowLabel,
            compositeScore: tomorrowScore,
            level: tomorrowLevel,
            levelLabel: tomorrowLevelLabel,
          },
        };
      }),
  }),

  calendar: router({
    /**
     * 獲取指定月份的每日天命能量日曆（包含農曆日期、宜忌、時辰吉凶）
     */
    monthly: protectedProcedure
      .input(z.object({
        year: z.number().min(2020).max(2030),
        month: z.number().min(1).max(12),
      }))
      .query(async ({ input, ctx }) => {
        const { year, month } = input;
        const engineProfile = await getUserProfileForEngine(ctx.user.id);
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];

        const { getDayPillar, getMonthPillar } = await import('./lib/lunarCalendar');
        const { getMoonPhase } = await import('./lib/moonPhase');
        const {
          solarToLunarByYMD, getDayHourFortunes, getDayAuspicious,
          getDayDirections, getPengzuBaiji, getDayGodsAndShas,
        } = await import('./lib/lunarConverter');
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month - 1, day);
          const dayPillar = getDayPillar(date);
          const monthPillar = getMonthPillar(date);
          // 月相計算：傳入純日期（不依賴時區）
          const moonInfo = getMoonPhase(new Date(Date.UTC(year, month - 1, day)));
          // 農曆日期（直接傳入年月日數字，不依賴時區）
          const lunarDate = solarToLunarByYMD(year, month, day);

          // 日柱宜忌（基於日支）
          const dayAuspicious = getDayAuspicious(dayPillar.branch);

          // 方位吉凶
          const directions = getDayDirections(dayPillar.stem);

          // 彭祖百忌
          const pengzu = getPengzuBaiji(dayPillar.stem, dayPillar.branch);

          // 吉神凶煞
          const godsAndShas = getDayGodsAndShas(monthPillar.branch, dayPillar.branch);

          // 時辰吉凶
          const hourFortunes = getDayHourFortunes(dayPillar.stem);

          // 沖屬相（日支對沖）
          const chongBranchMap: Record<string, string> = {
            '子': '午', '丑': '未', '寅': '申', '卯': '酉',
            '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
            '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
          };
          const zodiacMap: Record<string, string> = {
            '子': '鼠', '丑': '牛', '寅': '虎', '卯': '兔',
            '辰': '龍', '巳': '蛇', '午': '馬', '未': '羊',
            '申': '猴', '酉': '雞', '戌': '狗', '亥': '豬',
          };
          const chongBranch = chongBranchMap[dayPillar.branch] ?? '';
          const chongZodiac = zodiacMap[chongBranch] ?? '';
          const shaMap: Record<string, string> = {
            '子': '南方', '丑': '東方', '寅': '北方', '卯': '西方',
            '辰': '南方', '巳': '東方', '午': '北方', '未': '西方',
            '申': '南方', '酉': '東方', '戌': '北方', '亥': '西方',
          };

          days.push({
            date: day,
            year,
            month,
            dayPillar,
            monthPillar,
            moonPhase: moonInfo.phaseName,
            moonEmoji: moonInfo.phaseEmoji,
            isFullMoon: moonInfo.isFullMoon,
            isNewMoon: moonInfo.isNewMoon,
            energyLevel: dayPillar.energyLevel,
            // 農曆資訊
            lunarDate,
            lunarDayName: lunarDate.lunarDayName,
            lunarMonthName: lunarDate.lunarMonthName,
            festival: lunarDate.festival,
            deityBirthday: lunarDate.deityBirthday,
            // 宜忌
            auspicious: dayAuspicious.yi,
            inauspicious: dayAuspicious.ji,
            // 方位
            directions,
            // 彭祖百忌
            pengzu,
            // 吉神凶煞
            luckyGods: godsAndShas.luckyGods,
            unluckyGods: godsAndShas.unluckyGods,
            // 沖屬相
            chong: `(${chongBranch})屬${chongZodiac}`,
            sha: shaMap[dayPillar.branch] ?? '',
            // 時辰吉凶
            hourFortunes,
          });
        }

        // 計算每日購彩指數，標記本月最高分 3 天
        const tenGodLotteryMap: Record<string, number> = {
          偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
          七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
          偏印: 4, 正印: 5,
        };
        // 根據登入者喜忌神動態計算五行分數
        const { favorableElements, unfavorableElements } = engineProfile;
        const ELEMENT_ZH_SCORE: Record<string, number> = {};
        const allElements = ['木', '火', '土', '金', '水'];
        allElements.forEach(el => {
          if (favorableElements[0] === el) ELEMENT_ZH_SCORE[el] = 2.0;       // 用神
          else if (favorableElements[1] === el) ELEMENT_ZH_SCORE[el] = 1.5;  // 喜神
          else if (favorableElements[2] === el) ELEMENT_ZH_SCORE[el] = 0.5;  // 次喜
          else if (unfavorableElements[0] === el) ELEMENT_ZH_SCORE[el] = -2.0; // 忌神
          else if (unfavorableElements[1] === el) ELEMENT_ZH_SCORE[el] = -1.5; // 次忌
          else ELEMENT_ZH_SCORE[el] = 0;
        });
        const { getTenGod } = await import('./lib/tenGods');
        // 計算每日購彩指數
        const daysWithScore = days.map((d: any) => {
          const tenGod = getTenGod(d.dayPillar.stem);
          const fortuneScore = tenGodLotteryMap[tenGod] ?? 5;
          const dayElementScore = ELEMENT_ZH_SCORE[d.dayPillar.stemElement] ?? 0;
          const dayScore = Math.min(10, Math.max(1, 5 + dayElementScore * 2));
          const moonBonus = d.isFullMoon ? 1.5 : d.isNewMoon ? -0.5 : 0;
          const rawTotal = fortuneScore * 0.40 + dayScore * 0.30 + (5 + moonBonus) * 0.10 + 5 * 0.20;
          const lotteryScore = Math.round(Math.min(10, Math.max(1, rawTotal)) * 10) / 10;
          return { ...d, lotteryScore };
        });
        // 找出最高分的前 3 天
        const sorted = [...daysWithScore].sort((a: any, b: any) => b.lotteryScore - a.lotteryScore);
        const top3Scores = new Set(sorted.slice(0, 3).map((d: any) => d.date));
        const finalDays = daysWithScore.map((d: any) => ({
          ...d,
          lotteryScore: d.lotteryScore,
          isBestLotteryDay: top3Scores.has(d.date),
        }));
        return { year, month, days: finalDays };
      }),
  }),
  insight: router({
    /**
     * LLM 神諭深度解讀
     * 根據擲筊結果、命格、天干地支生成個人化詮釋
     */
    deepRead: protectedProcedure
      .input(z.object({
        query: z.string().max(500),
        result: z.enum(['sheng', 'xiao', 'yin', 'li']),
        dayPillar: z.string(),
        hourPillar: z.string(),
        energyLevel: z.string(),
        moonPhase: z.string(),
        interpretation: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const engineProfile = await getUserProfileForEngine(ctx.user.id);
        const { dayMasterStem, dayMasterElement, favorableElements, unfavorableElements, isDefault } = engineProfile;
        const ELEMENT_ZH: Record<string, string> = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' };
        const favorableStr = favorableElements.join('、');
        const unfavorableStr = unfavorableElements.join('、');
        const profileNote = isDefault
          ? '（命格未設定，使用預設分析）'
          : '';

        const resultNames: Record<string, string> = {
          sheng: '聖杯（一陰一陽）',
          xiao: '笑杯（兩陽）',
          yin: '陰杯（兩陰）',
          li: '立筊（立立）',
        };

        const systemPrompt = `你是「天命共振」神諦系統的神諦解讀師。你深游中國命理學，尤其精通八字、紫微斗數、五行生宅。${profileNote}

你正在為該用戶解讀擲筊結果。他的命格資料：
- 日主：${dayMasterStem}${dayMasterElement}
- 用神（喜用神）：${favorableStr}
- 忌神：${unfavorableStr}

請用優雅、深入、充滿智慧的漢字語言展開解讀。不要較板，要將命理與具體問題連結。字數建議 200-350 字。`;

        const userMessage = `
當前日柱：${input.dayPillar}
當前時柱：${input.hourPillar}
月相：${input.moonPhase}
能量狀態：${input.energyLevel}

用戶的問題：「${input.query || '（未言明問題）'}」

擲筊結果：${resultNames[input.result] || input.result}

系統初步解讀：${input.interpretation}

請提供更深層、更個人化的神諦解讀。`;

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
        const today = getTaiwanDate();
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
     sevenDays: protectedProcedure.query(async ({ ctx }) => {
      const engineProfile = await getUserProfileForEngine(ctx.user.id);
      const { favorableElements, unfavorableElements } = engineProfile;
      // 將喜忌神轉為英文對照
      const ZH_TO_EN_EL: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
      const favorableEn = favorableElements.map(e => ZH_TO_EN_EL[e]).filter(Boolean);
      const unfavorableEn = unfavorableElements.map(e => ZH_TO_EN_EL[e]).filter(Boolean);

      const { getDayPillar } = await import('./lib/lunarCalendar');
      const { getMoonPhase } = await import('./lib/moonPhase');

      const today = getTaiwanDate();
      const days = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayPillar = getDayPillar(date);
        const moonInfo = getMoonPhase(date);
        // 計算當日綜合能量分數 (0-100)
        let energyScore = 50;
        // 五行與登入者命格的共振計算（動態）
        const stemEl = dayPillar.stemElement;
        const branchEl = dayPillar.branchElement;
        // 用神（最高優先）
        if (favorableEn[0] && stemEl === favorableEn[0]) energyScore += 20;
        if (favorableEn[0] && branchEl === favorableEn[0]) energyScore += 10;
        // 喜神（第二優先）
        if (favorableEn[1] && stemEl === favorableEn[1]) energyScore += 12;
        if (favorableEn[1] && branchEl === favorableEn[1]) energyScore += 6;
        // 次喜（第三優先）
        if (favorableEn[2] && stemEl === favorableEn[2]) energyScore += 5;
        if (favorableEn[2] && branchEl === favorableEn[2]) energyScore += 3;
        // 忌神（主忌）
        if (unfavorableEn[0] && stemEl === unfavorableEn[0]) energyScore -= 15;
        if (unfavorableEn[0] && branchEl === unfavorableEn[0]) energyScore -= 8;
        // 次忌
        if (unfavorableEn[1] && stemEl === unfavorableEn[1]) energyScore -= 8;
        if (unfavorableEn[1] && branchEl === unfavorableEn[1]) energyScore -= 4;

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
    dailyReport: protectedProcedure
      .input(z.object({
        // 指定日期（ISO 字串，例如 "2026-02-22"），不傳則為今日
        date: z.string().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
      // 動態讀取登入用戶的命格資料
      const engineProfile = await getUserProfileForEngine(ctx.user.id);
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
      // 財位方向將在 dateInfo 計算後取得，先定義占位符
      let todayDirections: { xi: string; fu: string; cai: string } = { xi: '東南', fu: '東北', cai: '正南' };
      const hour = isToday
        ? Math.floor((realNow.getTime() + 8 * 60 * 60 * 1000) / 3600000) % 24
        : 12; // 非今日預設顯示午時

      // 1. 農曆日期與天干地支
      const dateInfo = getFullDateInfo(now);
      const dayPillar = dateInfo.dayPillar;
      // 計算今日吉方（財神方、喜神方、福德方）
      { const { getDayDirections } = await import('./lib/lunarConverter'); todayDirections = getDayDirections(dayPillar.stem); }
      const monthPillar = dateInfo.monthPillar;
      const yearPillar = dateInfo.yearPillar;

      // 2. 月相
      const moonInfo = getMoonPhase(now);

      // 3. 八字十神分析（動態版：使用登入用戶的日主命格）
      const tenGodAnalysis = getDailyTenGodAnalysisDynamic(
        dayPillar.stem,
        dayPillar.branch,
        engineProfile.dayMasterElement,
        engineProfile.dayMasterYinYang
      );
      // 4. 塔羅流日（動態：將用戶出生月日傳入計算中間個性）
      const tarot = calculateTarotDailyCard(month, day, engineProfile.birthMonth ?? undefined, engineProfile.birthDay ?? undefined);
       // 5. 加權五行計算（V9.0：本命30% + 環境五行70%）
      const envElements = calculateEnvironmentElements(
        yearPillar.stem,
        yearPillar.branch,
        monthPillar.stem,
        monthPillar.branch,
        dayPillar.stem,
        dayPillar.branch,
      );
      // 動態版：傳入登入用戶的本命五行比例
      const wuxingResult = calculateWeightedElements(envElements, engineProfile.natalElementRatio);
      const elementOverview = generateElementOverview(wuxingResult);
      // 5b. 穿搭建議（V9.0：加權五行驅動）
      const outfit = generateOutfitAdviceV9(wuxingResult);
      // 5c. 飲食建議（V9.0：加權五行驅動）
      const dietary = generateDietaryAdvice(wuxingResult);
      // 6. 手串推薦（V9.0：加權五行驅動）
      const braceletsV9 = recommendBraceletsV9(wuxingResult);

      // 7. 財運羅盤（lotteryIndex 改用六維加權算法，與選號頁 purchaseAdvice 一致）
      const wealthCompass = generateWealthCompass(
        tenGodAnalysis.mainMeaning.wuxing,
        tenGodAnalysis.mainTenGod,
        tarot.card,
        tenGodAnalysis.overallScore,
      );
      // 覆蓋 lotteryIndex：使用六維加權算法（偏財×0.4 + 日柱×0.3 + 月相×0.1 + 天氣×0.1 + 時辰×0.05 + 塔羅×0.05）
      {
        // 動態版：使用登入用戶的喜用神五行
        const FAVORABLE_ELEMENTS = engineProfile.favorableElements;
        const tenGodLotteryMap: Record<string, number> = {     偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
          七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
          偏印: 4, 正印: 5,
        };
        const fortuneScore = tenGodLotteryMap[tenGodAnalysis.mainTenGod] ?? 5;
        const dayEl = dayPillar.stemElement;
        const ELEMENT_ZH_SCORE: Record<string, number> = {
          '火': 2.0, '土': 1.5, '金': 0.5, '水': -2.0, '木': -1.5,
        };
        const dayElScore = ELEMENT_ZH_SCORE[dayEl] ?? 0;
        const dayScore = Math.min(10, Math.max(1, 5 + dayElScore * 2));
        const moonBonus = moonInfo.isFullMoon ? 1.5 : moonInfo.isNewMoon ? -0.5 : 0;
        const currentHourForLottery = getCurrentHourEnergy(dayPillar.stem);
        const hourEl = currentHourForLottery.stemElement;
        const hourBonus = FAVORABLE_ELEMENTS.includes(hourEl as any) ? 0.5 : -0.3;
        const tarotBonus = ["命運之輪", "太陽", "世界", "女皇"].includes(tarot.card.name) ? 0.5 : 0;
        const rawTotal =
          fortuneScore * 0.40 +
          dayScore * 0.30 +
          (5 + moonBonus) * 0.10 +
          5 * 0.10 +
          (5 + hourBonus) * 0.05 +
          (5 + tarotBonus) * 0.05;
        const unifiedScore = Math.round(Math.min(10, Math.max(1, rawTotal)) * 10) / 10;
        (wealthCompass as any).lotteryIndex = unifiedScore;
        const lotteryAdvice = unifiedScore >= 8
          ? `🎰 今日購彩綜合指數 ${unifiedScore}/10（六維加權），天命強力加持！建議在吉時出手，可嘗試 1000-2000 元刮刮樂或大樂透。`
          : unifiedScore >= 6.5
          ? `🎰 今日購彩綜合指數 ${unifiedScore}/10（六維加權），有一定偏財能量。可小試 200-500 元刮刮樂，以平常心待之。`
          : unifiedScore >= 5
          ? `🎰 今日購彩綜合指數 ${unifiedScore}/10（六維加權），能量平平。若要買，建議僅限 100 元刮刮樂 × 1 張，娛樂為主。`
          : `🎰 今日購彩綜合指數 ${unifiedScore}/10（六維加權），忌神當道。強烈建議暫緩購彩，專注正財積累。`;
        (wealthCompass as any).lotteryAdvice = lotteryAdvice;
      }

      // 8. 時辰能量（動態版：使用登入用戶的喜用神計算時辰分數）
      const ZH_TO_SCORE_HOUR: Record<string, number> = {
        '火': 30, '土': 20, '金': 5, '水': -25, '木': -20,
      };
      const hourDynamicProfile: import('./lib/hourlyEnergy').DynamicHourProfile = {
        hourElementScores: Object.fromEntries(
          ['火', '土', '金', '水', '木'].map(el => [
            el,
            engineProfile.favorableElements.includes(el) ? 25
              : engineProfile.unfavorableElements.includes(el) ? -20
              : 5
          ])
        ),
        specialHourBonus: {},
      };
      const currentHour = getCurrentHourEnergyDynamic(dayPillar.stem, hourDynamicProfile);
      const allHours = getAllHourEnergiesDynamic(dayPillar.stem, hourDynamicProfile);
      const bestHours = [...allHours].sort((a, b) => b.energyScore - a.energyScore).slice(0, 3);

      // 9. 節氣
      const nearestTerm = getNearestSolarTerm(now);

      // 10. 本週七日購彩指數（用於作戰室日期切換列標記最佳購彩日）
      const weeklyLotteryScores: Array<{
        date: string;
        dateLabel: string;
        compositeScore: number;
        levelLabel: string;
        isBest: boolean;
        bestHour?: {
          chineseName: string;
          displayTime: string;
          energyScore: number;
          weekdayName: string;
        };
      }> = [];
      {
        // 動態版：使用登入用戶的喜用神五行
        const FAV_EL = engineProfile.favorableElements;
        const calcWeekDayScore = (d: Date) => {
          const di = getFullDateInfo(d);
          const mi = getMoonPhase(d);
          const he = getCurrentHourEnergy(di.dayPillar.stem);
          const tg = getTenGodDynamic(di.dayPillar.stem, engineProfile.dayMasterElement, engineProfile.dayMasterYinYang);
          const tc = calculateTarotDailyCard(d.getMonth() + 1, d.getDate(), engineProfile.birthMonth ?? undefined, engineProfile.birthDay ?? undefined);
          const tgMap: Record<string, number> = {
            偏財: 9, 正財: 7, 食神: 8, 傷官: 6,
            七殺: 4, 正官: 5, 比肩: 3, 劫財: 2,
            偏印: 4, 正印: 5,
          };
          const fs = tgMap[tg] ?? 5;
          // 動態元素分數：根據登入者喜忌神動態計算
          const elMap: Record<string, number> = Object.fromEntries(
            Object.keys({ '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 }).map(el => [
              el,
              FAV_EL.includes(el) ? 2.0 : engineProfile.unfavorableElements.includes(el) ? -2.0 : 0
            ])
          );
          const ds = Math.min(10, Math.max(1, 5 + (elMap[di.dayPillar.stemElement] ?? 0) * 2));
          const mb = mi.isFullMoon ? 1.5 : mi.isNewMoon ? -0.5 : 0;
          const hb = FAV_EL.includes(he.stemElement as any) ? 0.5 : -0.3;
          const tb = tc ? (['命運之輪', '太陽', '世界', '女皇'].includes(tc.card.name) ? 0.5 : 0) : 0;
          const raw = fs * 0.40 + ds * 0.30 + (5 + mb) * 0.10 + 5 * 0.10 + (5 + hb) * 0.05 + (5 + tb) * 0.05;
          return Math.round(Math.min(10, Math.max(1, raw)) * 10) / 10;
        };
        // 找到本週一（以指定日期為基準，往前找到週一）
        const baseDate = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
        const dayOfWeek = baseDate.getUTCDay(); // 0=日, 1=一 ... 6=六
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(baseDate);
        weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday);
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekStart);
          d.setUTCDate(d.getUTCDate() + i);
          const dy = d.getUTCFullYear();
          const dm = d.getUTCMonth() + 1;
          const dd = d.getUTCDate();
          const dateStr = `${dy}-${String(dm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
          const dateLabel = `${dm}/${dd}`;
          const score = calcWeekDayScore(d);
          weeklyLotteryScores.push({
            date: dateStr,
            dateLabel,
            compositeScore: score,
            levelLabel: score >= 8 ? '大吉' : score >= 6.5 ? '吉' : score >= 5 ? '平' : '凶',
            isBest: false, // 待標記
          });
        }
        // 標記最高分日
        const maxScore = Math.max(...weeklyLotteryScores.map(s => s.compositeScore));
        const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];
        weeklyLotteryScores.forEach((s, idx) => {
          if (s.compositeScore === maxScore) {
            s.isBest = true;
            // 計算最佳日的最旺時辰
            const bestDate = new Date(weekStart);
            bestDate.setUTCDate(bestDate.getUTCDate() + idx);
            const bestDi = getFullDateInfo(bestDate);
            const bestHours = getBestHours(bestDi.dayPillar.stem);
            const topHour = bestHours[0];
            const weekdayIdx = bestDate.getUTCDay();
            s.bestHour = {
              chineseName: topHour.chineseName,
              displayTime: topHour.displayTime,
              energyScore: topHour.energyScore,
              weekdayName: `週${WEEKDAY_ZH[weekdayIdx]}`,
            };
          }
        });
      }

      // 11. 一句話總結
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
        // 穿搭建議（V9.0：加權五行驅動）
        outfit,
        // 手串推薦（V9.0：加權五行驅動）
        bracelets: {
          leftHand: braceletsV9.leftHand,
          rightHand: braceletsV9.rightHand,
          coreGoal: braceletsV9.coreGoal,
        },
        // 飲食建議（V9.0 新增）
        dietary,
        // 五行總覽表（V9.0 新增）
        elementOverview,
        // 加權五行計算詳情（V9.0 新增）
        wuxing: {
          natal: wuxingResult.natal,
          environment: wuxingResult.environment,
          weighted: wuxingResult.weighted,
          dominantElement: wuxingResult.dominantElement,
          weakestElement: wuxingResult.weakestElement,
          coreContradiction: wuxingResult.coreContradiction,
        },
        // 財運羅盤
        wealthCompass,
        // 今日吉方（財神方、喜神方、福德方）
        todayDirections,
        // 本週七日購彩指數
        weeklyLotteryScores,
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
     * 天命問卜 - 针對特定主題的命理分析與建議
     * 主題：工作、愛情、健康、財運、決策
     */
    topicAdvice: protectedProcedure
      .input(z.object({
        topic: z.enum(['work', 'love', 'health', 'wealth', 'decision']),
        question: z.string().max(300).optional(),
        date: z.string().optional(), // YYYY-MM-DD
      }))
      .mutation(async ({ input, ctx }) => {
        // 動態讀取登入者命格
        const ep = await getUserProfileForEngine(ctx.user.id);
        const realNow = new Date();
        const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
        const todayStr = twNow.toISOString().split('T')[0];

        let year: number, month: number, day: number;
        if (input.date) {
          const parts = input.date.split('-');
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        } else {
          year = twNow.getUTCFullYear();
          month = twNow.getUTCMonth() + 1;
          day = twNow.getUTCDate();
        }
        const now = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));

        // 取得日柱、月柱、年柱、時辰資訊
        const dateInfo = getFullDateInfo(now);
        const { dayPillar, monthPillar, yearPillar } = dateInfo;
        const tarot = calculateTarotDailyCard(month, day, ep.birthMonth ?? undefined, ep.birthDay ?? undefined);
        const tenGodAnalysis = getDailyTenGodAnalysis(dayPillar.stem, dayPillar.branch);
        const moonInfo = getMoonPhase(now);

        // 五行加權計算
        const envElements = calculateEnvironmentElements(
          yearPillar.stem, yearPillar.branch,
          monthPillar.stem, monthPillar.branch,
          dayPillar.stem, dayPillar.branch,
        );
        const wuxingResult = calculateWeightedElements(envElements);

        const topicNames: Record<string, string> = {
          work: '工作事業',
          love: '愛情感情',
          health: '健康身心',
          wealth: '財運金錢',
          decision: '重要決策',
        };
        const topicName = topicNames[input.topic];

        // 建構命格描述
        const profileDesc = ep.isDefault
          ? `用戶（${ep.dayMasterElement}行日主，用神為${ep.favorableElements.join('、')})`
          : `用戶（${ep.dayMasterStem}${ep.dayMasterElement}日主，用神為${ep.favorableElements.join('、')}，忌神為${ep.unfavorableElements.join('、')}）`;

        const systemPrompt = `你是天命共振神論系統，擅長結合八字十神、塔羅、五行、月相等多維命理進行精準分析。
${profileDesc}
今日日柱：${dayPillar.stem}${dayPillar.branch}，月柱：${monthPillar.stem}${monthPillar.branch}，年柱：${yearPillar.stem}${yearPillar.branch}
十神：${tenGodAnalysis.mainTenGod}，能量分數：${tenGodAnalysis.overallScore}/10
塔羅流日：${tarot.card.name}（${tarot.card.keywords.join('、')}）
月相：${moonInfo.phaseName}，月相影響：${moonInfo.castInfluence}
主導五行：${wuxingResult.dominantElement}，最弱五行：${wuxingResult.weakestElement}

請针對「${topicName}」領域提供具體建議。回應格式要求：
1. 天命能量解讀：今日${topicName}的天命能量狀態（100字內）
2. 三大行動指引：具體可執行的行動建議（每項不超遆40字）
3. 需要警惕：今日${topicName}領域的雱陷與風險（不超遆60字）
4. 吉時建議：今日處理${topicName}事務的最佳時辰
5. 一句話天命符言：一句話結尾（不超遆30字）

回復繁體中文，風格神秘且具體實用。`;

        const userMessage = input.question
          ? `我想詢問關於${topicName}的問題：${input.question}`
          : `請分析今日的${topicName}天命能量與建議。`;

        const llmResponse = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        });

        const advice = llmResponse.choices?.[0]?.message?.content ?? '天命能量正在對齊中，請稍後再試...';

        return {
          topic: input.topic,
          topicName,
          question: input.question,
          advice,
          context: {
            dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
            monthPillar: `${monthPillar.stem}${monthPillar.branch}`,
            tenGod: tenGodAnalysis.mainTenGod,
            overallScore: tenGodAnalysis.overallScore,
            tarotCard: tarot.card.name,
            moonPhase: moonInfo.phaseName,
          },
          generatedAt: new Date().toISOString(),
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

    /**
     * 發送本週最旺時辰通知到 Mail
     */
    notifyBestHour: publicProcedure
      .input(z.object({
        bestDayLabel: z.string(),   // 例：「週四」
        bestHourName: z.string(),   // 例：「午時」
        displayTime: z.string(),    // 例：「11:00–13:00」
        compositeScore: z.number(), // 例： 9.2
        energyScore: z.number(),    // 時辰能量分數 0-100
        dateLabel: z.string(),      // 例：「2/26」
      }))
      .mutation(async ({ input }) => {
        const { bestDayLabel, bestHourName, displayTime, compositeScore, energyScore, dateLabel } = input;
        const title = `⚡ 本週最旺購彩時機：${bestDayLabel} ${bestHourName}`;
        const content = [
          `【天命共振•本週購彩指引】`,
          ``,
          `本週購彩指數最旺日：${bestDayLabel}（${dateLabel}）`,
          `最旺時辰：${bestHourName}（${displayTime}）`,
          `日綜購彩指數：${compositeScore.toFixed(1)} / 10`,
          `時辰能量分數：${energyScore} / 100`,
          ``,
          `建議在 ${displayTime} 期間出手購彩，天時地利人和共振最強。`,
          ``,
          `— 天命共振系統自動推送`,
        ].join('\n');
        const success = await notifyOwner({ title, content });
        return { success };
      }),
  }),

  // ── 手串佩戴記錄 ──────────────────────────────────────────────────────────
  /**
   * 命格分析 - 流年流月分析
   */
  profile: router({
    yearlyAnalysis: publicProcedure
      .input(z.object({
        startYear: z.number().min(2024).max(2035).default(2026),
        endYear: z.number().min(2024).max(2035).default(2030),
      }).optional())
      .query(async ({ input }) => {
        const { getMultiYearAnalysis } = await import('./lib/yearlyAnalysis');
        const startYear = input?.startYear ?? 2026;
        const endYear = input?.endYear ?? 2030;
        return getMultiYearAnalysis(startYear, endYear);
      }),
  }),
  braceletWear: router({
    /**
     * 勾選佩戴（新增記錄）
     */
    toggle: publicProcedure
      .input(z.object({
        wearDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        braceletId: z.string().max(10),
        braceletName: z.string().max(100),
        hand: z.enum(["left", "right"]),
        dayStem: z.string().max(4).optional(),
        tenGod: z.string().max(10).optional(),
        isWearing: z.boolean(), // true=新增, false=取消
      }))
      .mutation(async ({ input, ctx }) => {
        const { addBraceletWearLog, removeBraceletWearLog } = await import('./db');
        if (input.isWearing) {
          const id = await addBraceletWearLog({
            userId: ctx.user?.id,
            wearDate: input.wearDate,
            braceletId: input.braceletId,
            braceletName: input.braceletName,
            hand: input.hand,
            dayStem: input.dayStem,
            tenGod: input.tenGod,
          });
          return { success: true, id, action: 'added' as const };
        } else {
          await removeBraceletWearLog(ctx.user?.id, input.wearDate, input.braceletId, input.hand);
          return { success: true, id: 0, action: 'removed' as const };
        }
      }),

    /**
     * 取得指定日期的佩戴記錄
     */
    getByDate: publicProcedure
      .input(z.object({ wearDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .query(async ({ input, ctx }) => {
        const { getBraceletWearLogsByDate } = await import('./db');
        return getBraceletWearLogsByDate(ctx.user?.id, input.wearDate);
      }),

    /**
     * 取得佩戴歷史（最近 30 天）
     */
    history: publicProcedure.query(async ({ ctx }) => {
      const { getBraceletWearHistory } = await import('./db');
      return getBraceletWearHistory(ctx.user?.id, 30);
    }),

    /**
     * 手串佩戴統計
     */
    stats: publicProcedure.query(async ({ ctx }) => {
      const { getBraceletWearStats } = await import('./db');
      return getBraceletWearStats(ctx.user?.id);
    }),
  }),
});
export type AppRouter = typeof appRouter;
// Re-export for type inference
export { accountRouter };
