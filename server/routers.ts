import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { accountRouter } from "./routers/account";
import { permissionsRouter } from "./routers/permissions";
import { dashboardRouter } from "./routers/dashboard";
import { adminConfigRouter } from "./routers/adminConfig";
import { pointsRouter } from "./routers/points";
import { businessHubRouter } from "./routers/businessHub";
import { userGroupsRouter } from "./routers/userGroups";
import { wardrobeRouter } from "./routers/wardrobe";
import { dietRouter } from './routers/diet';
import { wealthRouter } from './routers/wealth';
import { exchangeRouter } from './routers/exchange';
import { wbcRouter } from './routers/wbc';
import { marketingRouter } from './routers/marketing';
import { notificationsRouter } from './routers/notifications';
import { featureStoreRouter } from './routers/featureStore';
import { getDailyTenGodAnalysis, getTenGod, getDailyTenGodAnalysisDynamic, getTenGodDynamic } from "./lib/tenGods";
import { calculateTarotDailyCard, generateOutfitAdvice, recommendBracelets, generateWealthCompass, getNearestSolarTerm } from "./lib/warRoomEngine";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { castOracle } from "./lib/oracleAlgorithm";
import { getFullDateInfo, getTaiwanHour, getTaiwanDate, getYearPillar, STEM_ELEMENT } from "./lib/lunarCalendar";
import { solarToLunarByYMD } from "./lib/lunarConverter";
import { getMoonPhase } from "./lib/moonPhase";
import { getAllHourEnergies, getCurrentHourEnergy, getBestHours, getWorstHours, getAllHourEnergiesDynamic, getCurrentHourEnergyDynamic, HOUR_BRANCHES, getHourStem } from "./lib/hourlyEnergy";
import { getDb, saveOracleSession, getOracleHistory, getOracleStats, saveLotterySession, getLotteryHistory, getLotteryStats, getUserProfileForEngine, getUserFullProfile, saveDivinationSession, getDivinationHistory } from "./db";
import { userProfiles, userSubscriptions, plans, users, pointsTransactions, auraEngineConfig } from "../drizzle/schema";
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
  wardrobe: wardrobeRouter,
  dashboard: dashboardRouter,
  adminConfig: adminConfigRouter,
  points: pointsRouter,
  businessHub: businessHubRouter,
  userGroups: userGroupsRouter,
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      // 查詢訂閱方案名稱
      try {
        const db = await getDb();
        if (db) {
          const [sub] = await db
            .select({ planId: userSubscriptions.planId, planExpiresAt: userSubscriptions.planExpiresAt })
            .from(userSubscriptions)
            .where(eq(userSubscriptions.userId, user.id));
          if (sub?.planId) {
            const now = new Date();
            const expired = sub.planExpiresAt && sub.planExpiresAt < now;
            if (!expired) {
              const [plan] = await db
                .select({ name: plans.name })
                .from(plans)
                .where(eq(plans.id, sub.planId));
              if (plan) {
                return { ...user, planName: plan.name };
              }
            }
          }
        }
      } catch (_) { /* 靜默失敗，回覆基礎用戶資訊 */ }
      return { ...user, planName: null };
    }),
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
        const { getCurrentHourEnergy, getBestHours } = await import('./lib/hourlyEnergy');
        const dateInfo = getFullDateInfo();
        const hourEnergy = getCurrentHourEnergy(dateInfo.dayPillar.stem);
        const bestHours = getBestHours(dateInfo.dayPillar.stem).slice(0, 3);
        // stemElement 返回中文（火/土/金/水/木），需轉換為英文 WuXing
        const ELEMENT_ZH_TO_EN: Record<string, WuXing> = {
          '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water',
        };
        const dayElement = (ELEMENT_ZH_TO_EN[dateInfo.dayPillar.stemElement] ?? 'fire') as WuXing;
        const hourElement = (ELEMENT_ZH_TO_EN[hourEnergy.stemElement] ?? 'fire') as WuXing;
        // 登入用戶使用動態加權（本命30% + 流日五行70%）
        let dynamicWeights: Record<WuXing, number> | undefined;
        if (ctx.user?.id) {
          const ep = await getUserProfileForEngine(ctx.user.id);
          if (!ep.isDefault) {
            // 計算流日環境五行比例
            const envElements = calculateEnvironmentElements(
              dateInfo.yearPillar.stem,
              dateInfo.yearPillar.branch,
              dateInfo.monthPillar.stem,
              dateInfo.monthPillar.branch,
              dateInfo.dayPillar.stem,
              dateInfo.dayPillar.branch,
            );
            // 動態加權：本命30% + 環境五行70%
            const wuxingResult = calculateWeightedElements(envElements, ep.natalElementRatio);
            // 將加權五行比例轉換為 WuXing 權重（以加權比例作為相對分數）
            const ZH_TO_EN: Record<string, WuXing> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
            const weighted = wuxingResult.weighted;
            // 將五行比例正規化為 0.5~1.5 的評分權重（比例高 → 喜用神能量強 → 加成）
            const maxVal = Math.max(...Object.values(weighted));
            const minVal = Math.min(...Object.values(weighted));
            const range = maxVal - minVal || 0.01;
            dynamicWeights = {
              wood:  0.5 + ((weighted.木 - minVal) / range),
              fire:  0.5 + ((weighted.火 - minVal) / range),
              earth: 0.5 + ((weighted.土 - minVal) / range),
              metal: 0.5 + ((weighted.金 - minVal) / range),
              water: 0.5 + ((weighted.水 - minVal) / range),
            };
            // 喜用神額外加成（確保喜用神方位優先）
            for (const favEn of ep.favorableElementsEn) {
              const key = ZH_TO_EN[Object.keys(ZH_TO_EN).find(k => ZH_TO_EN[k] === favEn) ?? ''] ?? favEn as WuXing;
              if (key in dynamicWeights) dynamicWeights[key as WuXing] = Math.min(1.5, dynamicWeights[key as WuXing] * 1.2);
            }
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
          bestHours: bestHours.map(h => ({
            chineseName: h.chineseName,
            displayTime: h.displayTime,
            energyLabel: h.energyLabel,
            energyScore: h.energyScore,
            branch: h.branch,
            isCurrentHour: h.isCurrentHour,
          })),
          analysisTime: getTaiwanDate().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit' }),
          favorableElements: ctx.user?.id
            ? (await getUserProfileForEngine(ctx.user.id)).favorableElements
            : null,
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
        // 店家風水參數
        storeResonanceScore: z.number().min(0).max(100).optional(),
        storeFengShuiGrade: z.string().optional(),
        storeBearingElement: z.string().optional(),
        denomination: z.number().optional(),
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
          storeResonanceScore: input?.storeResonanceScore,
          storeFengShuiGrade: input?.storeFengShuiGrade,
          storeBearingElement: input?.storeBearingElement,
          denomination: input?.denomination,
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

        // 刮刮樂連中里程碑通知：若本次中獎，檢查最近3筆是否連中
        if (input.isWon && ctx.user?.id) {
          try {
            const { getScratchLogs } = await import('./db');
            const recentLogs = await getScratchLogs(ctx.user.id);
            const last3 = recentLogs.slice(0, 3);
            if (last3.length === 3 && last3.every(l => l.isWon === 1)) {
              const { notifyUser } = await import('./lib/notifyUser');
              await notifyUser({
                userId: String(ctx.user.id),
                type: 'scratch_milestone',
                title: '🎰 天命連中！連續3次命中',
                content: `恭喜！您已連續3次刮刮樂中獎，天命能量正處於爆發期！建議把握今日剩餘最旺時辰繼續出手。`,
                linkUrl: '/lottery',
                relatedId: String(id),
              }).catch(() => {});
            }
          } catch (_e) { /* 靜默失敗，不影響主流程 */ }
        }

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
        // 4. 天氣五行加成（動態版：依登入者喜忌神計算）
        const weatherEl = input?.weatherElement ?? 'earth';
        const EN_TO_ZH_W: Record<string, string> = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
        const weatherElZh = EN_TO_ZH_W[weatherEl] ?? '土';
        const weatherBonus = favorableZh.includes(weatherElZh) ? 1.5
          : unfavorableZh.includes(weatherElZh) ? -1.5 : 0;
        // 5. 当前時辰加成（依登入者喜忌神）
        const hourElement = hourEnergy.stemElement;
        const hourBonus = favorableZh.includes(hourElement) ? 0.5
          : unfavorableZh.includes(hourElement) ? -0.3 : 0;
        // 6. 塔羅加成
        const tarotBonus = tarotCard
          ? (["\u547d\u904b\u4e4b\u8f2a", "\u592a\u967d", "\u4e16\u754c", "\u5973\u7687"].includes(tarotCard.card.name) ? 0.5 : 0)
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
    // ── 大樂透選號 ──────────────────────────────────────────────────────────────
    bigLotto: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weather: z.object({
          weatherElement: z.string().optional(),
          condition: z.string().optional(),
          temperature: z.number().optional(),
          humidity: z.number().optional(),
        }).optional(),
        profileUserId: z.number().int().optional(),
        storeResonanceScore: z.number().min(0).max(100).optional(), // 店家共振分數
        randomSeed: z.number().optional(), // 隨機种子
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const { generateBigLottoNumbers } = await import('./lib/lotteryAlgorithm');
        const { getTaiwanDate } = await import('./lib/lunarCalendar');
        let now: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          now = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          now = getTaiwanDate();
        }
        let customBaseWeights: Record<number, number> | undefined;
        let customElementBoost: Record<string, number> | undefined;
        const targetUserId = input?.profileUserId ?? ctx.user?.id;
        if (targetUserId) {
          try {
            const { getUserProfileForEngine } = await import('./db');
            const ep = await getUserProfileForEngine(targetUserId);
            if (!ep.isDefault) {
              const favElements = ep.favorableElementsEn;
              const unfavElements = ep.unfavorableElements.map((e: string) => {
                const m: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
                return m[e] ?? e;
              });
              const allElements = ['fire', 'earth', 'metal', 'wood', 'water'];
              customElementBoost = Object.fromEntries(allElements.map(el => {
                if (favElements.includes(el)) return [el, 3];
                if (unfavElements.includes(el)) return [el, -2];
                return [el, 0];
              }));
              const WUXING_MAP: Record<string, number[]> = { wood: [1,3,8], fire: [2,7], earth: [0,5], metal: [4,9], water: [6] };
              customBaseWeights = {};
              for (let i = 0; i <= 9; i++) {
                const el = allElements.find(e => WUXING_MAP[e]?.includes(i)) ?? 'earth';
                if (favElements.includes(el)) customBaseWeights[i] = 10;
                else if (unfavElements.includes(el)) customBaseWeights[i] = 3;
                else customBaseWeights[i] = 6;
              }
            }
          } catch (e) { console.warn('[BigLotto] Failed to load profile', e); }
        }
        const opts = {
          weatherElement: input?.weather?.weatherElement,
          useWeather: !!(input?.weather?.weatherElement),
          customBaseWeights,
          customElementBoost,
          randomSeed: input?.randomSeed,
        };
        const result = generateBigLottoNumbers(now, opts);
        // 店家共振分數影響整體運氣描述
        const storeBonus = input?.storeResonanceScore ?? 0;
        const storeLabel = storeBonus >= 80 ? '（大吉彩券行加持✦）' : storeBonus >= 60 ? '（吉地加持）' : '';
        return { ...result, storeLabel };
      }),

    // ── 威力彩選號 ──────────────────────────────────────────────────────────────
    powerball: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weather: z.object({ weatherElement: z.string().optional() }).optional(),
        profileUserId: z.number().int().optional(),
        storeResonanceScore: z.number().min(0).max(100).optional(),
        randomSeed: z.number().optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const { generatePowerballNumbers } = await import('./lib/lotteryAlgorithm');
        const { getTaiwanDate } = await import('./lib/lunarCalendar');
        let now: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          now = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          now = getTaiwanDate();
        }
        let customBaseWeights: Record<number, number> | undefined;
        let customElementBoost: Record<string, number> | undefined;
        const targetUserId = input?.profileUserId ?? ctx.user?.id;
        if (targetUserId) {
          try {
            const { getUserProfileForEngine } = await import('./db');
            const ep = await getUserProfileForEngine(targetUserId);
            if (!ep.isDefault) {
              const favElements = ep.favorableElementsEn;
              const unfavElements = ep.unfavorableElements.map((e: string) => {
                const m: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
                return m[e] ?? e;
              });
              const allElements = ['fire', 'earth', 'metal', 'wood', 'water'];
              customElementBoost = Object.fromEntries(allElements.map(el => {
                if (favElements.includes(el)) return [el, 3];
                if (unfavElements.includes(el)) return [el, -2];
                return [el, 0];
              }));
              const WUXING_MAP: Record<string, number[]> = { wood: [1,3,8], fire: [2,7], earth: [0,5], metal: [4,9], water: [6] };
              customBaseWeights = {};
              for (let i = 0; i <= 9; i++) {
                const el = allElements.find(e => WUXING_MAP[e]?.includes(i)) ?? 'earth';
                if (favElements.includes(el)) customBaseWeights[i] = 10;
                else if (unfavElements.includes(el)) customBaseWeights[i] = 3;
                else customBaseWeights[i] = 6;
              }
            }
          } catch (e) { console.warn('[Powerball] Failed to load profile', e); }
        }
        const result = generatePowerballNumbers(now, {
          weatherElement: input?.weather?.weatherElement,
          useWeather: !!(input?.weather?.weatherElement),
          customBaseWeights,
          customElementBoost,
          randomSeed: input?.randomSeed,
        });
        const storeBonus = input?.storeResonanceScore ?? 0;
        const storeLabel = storeBonus >= 80 ? '（大吉彩券行加持✦）' : storeBonus >= 60 ? '（吉地加持）' : '';
        return { ...result, storeLabel };
      }),

    // ── 三星彩選號 ──────────────────────────────────────────────────────────────
    threeStar: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weather: z.object({ weatherElement: z.string().optional() }).optional(),
        profileUserId: z.number().int().optional(),
        storeResonanceScore: z.number().min(0).max(100).optional(),
        randomSeed: z.number().optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const { generateThreeStarNumbers } = await import('./lib/lotteryAlgorithm');
        const { getTaiwanDate } = await import('./lib/lunarCalendar');
        let now: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          now = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          now = getTaiwanDate();
        }
        let customBaseWeights: Record<number, number> | undefined;
        let customElementBoost: Record<string, number> | undefined;
        const targetUserId = input?.profileUserId ?? ctx.user?.id;
        if (targetUserId) {
          try {
            const { getUserProfileForEngine } = await import('./db');
            const ep = await getUserProfileForEngine(targetUserId);
            if (!ep.isDefault) {
              const favElements = ep.favorableElementsEn;
              const unfavElements = ep.unfavorableElements.map((e: string) => {
                const m: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
                return m[e] ?? e;
              });
              const allElements = ['fire', 'earth', 'metal', 'wood', 'water'];
              customElementBoost = Object.fromEntries(allElements.map(el => {
                if (favElements.includes(el)) return [el, 3];
                if (unfavElements.includes(el)) return [el, -2];
                return [el, 0];
              }));
              const WUXING_MAP: Record<string, number[]> = { wood: [1,3,8], fire: [2,7], earth: [0,5], metal: [4,9], water: [6] };
              customBaseWeights = {};
              for (let i = 0; i <= 9; i++) {
                const el = allElements.find(e => WUXING_MAP[e]?.includes(i)) ?? 'earth';
                if (favElements.includes(el)) customBaseWeights[i] = 10;
                else if (unfavElements.includes(el)) customBaseWeights[i] = 3;
                else customBaseWeights[i] = 6;
              }
            }
          } catch (e) { console.warn('[ThreeStar] Failed to load profile', e); }
        }
        const result = generateThreeStarNumbers(now, {
          weatherElement: input?.weather?.weatherElement,
          useWeather: !!(input?.weather?.weatherElement),
          customBaseWeights,
          customElementBoost,
          randomSeed: input?.randomSeed,
        });
        const storeBonus = input?.storeResonanceScore ?? 0;
        const storeLabel = storeBonus >= 80 ? '（大吉彩券行加持✦）' : storeBonus >= 60 ? '（吉地加持）' : '';
        return { ...result, storeLabel };
      }),

    // ── 四星彩選號 ──────────────────────────────────────────────────────────────
    fourStar: publicProcedure
      .input(z.object({
        targetDate: z.string().optional(),
        weather: z.object({ weatherElement: z.string().optional() }).optional(),
        profileUserId: z.number().int().optional(),
        storeResonanceScore: z.number().min(0).max(100).optional(),
        randomSeed: z.number().optional(),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        const { generateFourStarNumbers } = await import('./lib/lotteryAlgorithm');
        const { getTaiwanDate } = await import('./lib/lunarCalendar');
        let now: Date;
        if (input?.targetDate) {
          const [y, m, d] = input.targetDate.split('-').map(Number);
          now = new Date(y, m - 1, d, 8, 0, 0);
        } else {
          now = getTaiwanDate();
        }
        let customBaseWeights: Record<number, number> | undefined;
        let customElementBoost: Record<string, number> | undefined;
        const targetUserId = input?.profileUserId ?? ctx.user?.id;
        if (targetUserId) {
          try {
            const { getUserProfileForEngine } = await import('./db');
            const ep = await getUserProfileForEngine(targetUserId);
            if (!ep.isDefault) {
              const favElements = ep.favorableElementsEn;
              const unfavElements = ep.unfavorableElements.map((e: string) => {
                const m: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
                return m[e] ?? e;
              });
              const allElements = ['fire', 'earth', 'metal', 'wood', 'water'];
              customElementBoost = Object.fromEntries(allElements.map(el => {
                if (favElements.includes(el)) return [el, 3];
                if (unfavElements.includes(el)) return [el, -2];
                return [el, 0];
              }));
              const WUXING_MAP: Record<string, number[]> = { wood: [1,3,8], fire: [2,7], earth: [0,5], metal: [4,9], water: [6] };
              customBaseWeights = {};
              for (let i = 0; i <= 9; i++) {
                const el = allElements.find(e => WUXING_MAP[e]?.includes(i)) ?? 'earth';
                if (favElements.includes(el)) customBaseWeights[i] = 10;
                else if (unfavElements.includes(el)) customBaseWeights[i] = 3;
                else customBaseWeights[i] = 6;
              }
            }
          } catch (e) { console.warn('[FourStar] Failed to load profile', e); }
        }
        const result = generateFourStarNumbers(now, {
          weatherElement: input?.weather?.weatherElement,
          useWeather: !!(input?.weather?.weatherElement),
          customBaseWeights,
          customElementBoost,
          randomSeed: input?.randomSeed,
        });
        const storeBonus = input?.storeResonanceScore ?? 0;
        const storeLabel = storeBonus >= 80 ? '（大吉彩券行加持✦）' : storeBonus >= 60 ? '（吉地加持）' : '';
        return { ...result, storeLabel };
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
        // 彩券類型
        ticketType: z.enum(['lottery', 'scratch', 'bigLotto', 'powerball', 'threeStar', 'fourStar']).optional().default('lottery'),
        // 刮刮樂專用欄位
        scratchPrice: z.number().optional(),
        scratchPrize: z.number().optional(),
        scratchWon: z.boolean().optional(),
        // 大樂透/威力彩：允許非6個號碼
        actualNumbersFlex: z.array(z.number()).optional(),
        // 三星/四星彩：用戶輸入的開獎號碼字串
        actualDigitString: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { getDayPillar } = await import('./lib/lunarCalendar');
        const today = getTaiwanDate();
        const dp = getDayPillar(today);
        const { saveLotteryResult } = await import('./db');

        // ===== 三星/四星彩共振計算 =====
        if (input.ticketType === 'threeStar' || input.ticketType === 'fourStar') {
          const predicted = input.predictedNumbers.join('');
          const actual = input.actualDigitString ?? '';
          const digitLen = input.ticketType === 'threeStar' ? 3 : 4;
          let matchCount = 0;
          for (let i = 0; i < digitLen; i++) {
            if (predicted[i] && actual[i] && predicted[i] === actual[i]) matchCount++;
          }
          const isExact = predicted === actual;
          let resonanceScore = 30 + matchCount * 15;
          if (isExact) resonanceScore = 95;
          resonanceScore = Math.min(100, resonanceScore);
          const id = await saveLotteryResult({
            userId: ctx.user?.id,
            predictedNumbers: input.predictedNumbers,
            actualNumbers: [],
            matchCount,
            bonusMatch: isExact ? 1 : 0,
            resonanceScore,
            dayPillar: input.dayPillar || `${dp.stem}${dp.branch}`,
            dateString: input.dateString || `${dp.stem}${dp.branch}日`,
            ticketType: input.ticketType,
          });
          return { id, matchCount, bonusMatch: isExact ? 1 : 0, resonanceScore, ticketType: input.ticketType, isExact };
        }
        // ===== 大樂透/威力彩共振計算 =====
        if (input.ticketType === 'bigLotto' || input.ticketType === 'powerball') {
          const actualNums = input.actualNumbersFlex ?? input.actualNumbers;
          const predicted = new Set(input.predictedNumbers);
          const matchCount = actualNums.filter(n => predicted.has(n)).length;
          const bonusMatch = input.actualBonus !== undefined && predicted.has(input.actualBonus) ? 1 : 0;
          const ELEMENT_MAP: Record<number, string> = { 1:'wood',3:'wood',8:'wood',2:'fire',7:'fire',5:'earth',0:'earth',4:'metal',9:'metal',6:'water' };
          const FAVORABLE = ['fire', 'earth'];
          let resonanceScore = 40;
          actualNums.filter(n => predicted.has(n)).forEach(n => {
            const el = ELEMENT_MAP[n % 10];
            resonanceScore += FAVORABLE.includes(el ?? '') ? 12 : 5;
          });
          if (bonusMatch) resonanceScore += 8;
          resonanceScore = Math.min(100, resonanceScore);
          const id = await saveLotteryResult({
            userId: ctx.user?.id,
            predictedNumbers: input.predictedNumbers,
            actualNumbers: actualNums.slice(0, 6),
            actualBonus: input.actualBonus,
            matchCount,
            bonusMatch,
            resonanceScore,
            dayPillar: input.dayPillar || `${dp.stem}${dp.branch}`,
            dateString: input.dateString || `${dp.stem}${dp.branch}日`,
            ticketType: input.ticketType,
          });
          return { id, matchCount, bonusMatch, resonanceScore, ticketType: input.ticketType };
        }
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
        // 用戶座標（用於天氣五行計算）
        lat: z.number().optional(),
        lon: z.number().optional(),
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
      // 天氣五行（若用戶提供座標則呼叫 Open-Meteo API）
      let weatherWuxing: import('./lib/weatherEngine').WeatherWuxing | undefined;
      if (input?.lat && input?.lon) {
        try {
          const { getCurrentWeatherWuxing } = await import('./lib/weatherEngine');
          weatherWuxing = await getCurrentWeatherWuxing(input.lat, input.lon);
        } catch {
          // 天氣 API 失敗不影響主流程
        }
      }
      const weatherRatio = weatherWuxing ? {
        木: weatherWuxing.木, 火: weatherWuxing.火, 土: weatherWuxing.土, 金: weatherWuxing.金, 水: weatherWuxing.水,
      } : undefined;
      // 動態版：傳入登入用戶的本命五行比例 + 天氣五行（三維加權）
      const wuxingResult = calculateWeightedElements(envElements, engineProfile.natalElementRatio, weatherRatio);
      const elementOverview = generateElementOverview(wuxingResult);
      // 5b. 穿搭建議（V9.0：加權五行驅動）
      // 傳入用戶的備用神優先級，確保每個用戶得到自己命格的結果
      const userSupplementPriority = engineProfile.favorableElements;
      const outfit = generateOutfitAdviceV9(wuxingResult, userSupplementPriority);
      // 5c. 飲食建議（V9.0：加權五行驅動）
      const dietary = generateDietaryAdvice(wuxingResult, userSupplementPriority);
      // 6. 手串推薦（V9.0：加權五行驅動）
      const braceletsV9 = recommendBraceletsV9(wuxingResult, userSupplementPriority);

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
        // 動態版：依登入用戶的喜忌神計算日柱五行分數（與 purchaseAdvice 邏輯一致）
        const dayElScore = engineProfile.favorableElements.includes(dayEl) ? 2.0
          : engineProfile.unfavorableElements.includes(dayEl) ? -2.0 : 0;
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
        食神: `才華即財富，${engineProfile.dayMasterElement}氣化生，創意引財。今日，讓世界看見你的光。`,
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
        // 天氣五行資訊（若有座標則回傳）
        weather: weatherWuxing ? {
          description: weatherWuxing.description,
          temperature: weatherWuxing.temperature,
          humidity: weatherWuxing.humidity,
          windSpeed: weatherWuxing.windSpeed,
          precipitation: weatherWuxing.precipitation,
          wuxing: { 木: weatherWuxing.木, 火: weatherWuxing.火, 土: weatherWuxing.土, 金: weatherWuxing.金, 水: weatherWuxing.水 },
        } : null,
        // 用戶喜用神（供前端動態計算命理評分使用）
        favorableElements: engineProfile.favorableElements,
        unfavorableElements: engineProfile.unfavorableElements,
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
        // 今日十神（用於財運日記記錄）
        todayTenGod: tenGodAnalysis.mainTenGod,
        // 今日吉方（財神方、喜神方、福德方）
        todayDirections,
        // 命格資料是否為預設値（用於前端顯示提示橫幅）
        profileIsDefault: engineProfile.isDefault,
        // 用戶日主五行與喜忌神（用於前端顯示命格摘要）
        userProfile: {
          dayMasterStem: engineProfile.dayMasterStem,
          dayMasterElement: engineProfile.dayMasterElement,
          favorableElements: engineProfile.favorableElements,
          unfavorableElements: engineProfile.unfavorableElements,
        },
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
     * 天命問卜 - 针對特定主題的命理分析與建議（v2：結構化 JSON 輸出）
     * 主題：工作、愛情、健康、財運、決策
     */
    topicAdvice: protectedProcedure
      .input(z.object({
        topic: z.enum(['work', 'love', 'health', 'wealth', 'decision']),
        question: z.string().max(500).optional(),
        date: z.string().optional(), // YYYY-MM-DD
      }))
      .mutation(async ({ input, ctx }) => {
        // 扣除積分：每次問卜扣 10 點
        const db = await getDb();
        if (db) {
          const [currentUser] = await db.select({ pointsBalance: users.pointsBalance }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
          const balance = Number(currentUser?.pointsBalance ?? 0);
          if (balance < 10) {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '積分不足，問卜需要 10 點積分' });
          }
          const topicLabels: Record<string, string> = { work: '工作', love: '愛情', health: '健康', wealth: '財運', decision: '決策' };
          await db.update(users).set({ pointsBalance: balance - 10 }).where(eq(users.id, ctx.user.id));
          await db.insert(pointsTransactions).values({
            userId: ctx.user.id,
            amount: -10,
            type: 'spend',
            description: `天命問卜：${topicLabels[input.topic] ?? input.topic}`,
          });
        }
        // 動態讀取登入者命格（含完整四柱）
        const ep = await getUserProfileForEngine(ctx.user.id);
        const fullProfile = await getUserFullProfile(ctx.user.id);
        const realNow = new Date();
        const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
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
        const dateString = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const now = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
        // 取得日柱、月柱、年柱、時辰資訊
        const dateInfo = getFullDateInfo(now);
        const { dayPillar, monthPillar, yearPillar, hourInfo } = dateInfo;
        // 動態十神分析（依用戶日主）
        const tenGodAnalysis = getDailyTenGodAnalysisDynamic(
          dayPillar.stem, dayPillar.branch,
          ep.dayMasterElement, ep.dayMasterYinYang
        );
        const tarot = calculateTarotDailyCard(month, day, ep.birthMonth ?? undefined, ep.birthDay ?? undefined);
        const moonInfo = getMoonPhase(now);
        // 五行加權計算（含本命五行）
        const envElements = calculateEnvironmentElements(
          yearPillar.stem, yearPillar.branch,
          monthPillar.stem, monthPillar.branch,
          dayPillar.stem, dayPillar.branch,
        );
        const wuxingResult = calculateWeightedElements(envElements, ep.natalElementRatio);
        // 今日最佳時辰（動態命格）
        const hourDynProfile = {
          hourElementScores: Object.fromEntries(
            ep.favorableElements.map((el: string) => [el, 25] as [string, number])
              .concat(ep.unfavorableElements.map((el: string) => [el, -20] as [string, number]))
          ),
        };
        const bestHours = getAllHourEnergiesDynamic(dayPillar.stem, hourDynProfile)
          .sort((a, b) => b.energyScore - a.energyScore)
          .slice(0, 3);
        const solarTerm = getNearestSolarTerm(now);
        const topicNames: Record<string, string> = {
          work: '工作事業',
          love: '愛情感情',
          health: '健康身心',
          wealth: '財運金錢',
          decision: '重要決策',
        };
        const topicName = topicNames[input.topic];
        // 建構完整命格描述（含四柱）
        const natalPillarsDesc = fullProfile.yearPillar && fullProfile.monthPillar && fullProfile.dayPillar
          ? `本命四柱：年柱${fullProfile.yearPillar}・月柱${fullProfile.monthPillar}・日柱${fullProfile.dayPillar}・時柱${fullProfile.hourPillar ?? '未知'}\n`
          : '';
        const natalElementDesc = Object.entries(ep.natalElementRatio)
          .sort(([,a],[,b]) => (b as number) - (a as number))
          .map(([el, ratio]) => `${el}${Math.round((ratio as number) * 100)}%`)
          .join('・');
        const profileSection = ep.isDefault
          ? `【命格資訊】日主：${ep.dayMasterElement}行（${ep.dayMasterStem}）・喜用神：${ep.favorableElements.join('、')}・忌神：${ep.unfavorableElements.join('、')}`
          : `【命格資訊】日主：${ep.dayMasterStem}${ep.dayMasterElement}（${ep.dayMasterYinYang}）\n${natalPillarsDesc}本命五行：${natalElementDesc}\n喜用神：${ep.favorableElements.join('、')}・忌神：${ep.unfavorableElements.join('、')}`;
        const systemPrompt = `你是天命共振神諭系統，一位精通八字命理、十神、塔羅、五行、月相的命理大師。你的回答必須深度結合用戶的個人命格，給出精準、具體、有深度的分析，而非泛泛而談。

${profileSection}

【今日天象】
流日四柱：年${yearPillar.stem}${yearPillar.branch}・月${monthPillar.stem}${monthPillar.branch}・日${dayPillar.stem}${dayPillar.branch}・時${hourInfo.branch}時
流日十神：${tenGodAnalysis.mainTenGod}（${tenGodAnalysis.mainMeaning.role}）・能量評分：${tenGodAnalysis.overallScore}/10
十神解讀：${tenGodAnalysis.mainMeaning.advice}
英雄劇本：${tenGodAnalysis.heroScript}
塔羅流日：${tarot.card.name}（${tarot.card.keywords.join('、')}）・${tarot.card.advice}
月相：${moonInfo.phaseName}（農曆${moonInfo.lunarDay}日，照明${moonInfo.illumination}%）・${moonInfo.description}
主導五行：${wuxingResult.dominantElement}・最弱五行：${wuxingResult.weakestElement}
今日環境五行：木${Math.round(wuxingResult.environment.木*100)}%・火${Math.round(wuxingResult.environment.火*100)}%・土${Math.round(wuxingResult.environment.土*100)}%・金${Math.round(wuxingResult.environment.金*100)}%・水${Math.round(wuxingResult.environment.水*100)}%
${solarTerm ? `節氣：距${solarTerm.name}還有${solarTerm.daysUntil}天` : ''}
今日最旺時辰：${bestHours.map(h => `${h.chineseName}(${h.displayTime})`).join('・')}

【分析要求】
針對「${topicName}」領域，結合上述命格與天象，以 JSON 格式回答。

重要：你的分析必須具體說明「為什麼」——例如「因為今日日柱${dayPillar.stem}${dayPillar.branch}對你的${ep.dayMasterElement}日主來說是${tenGodAnalysis.mainTenGod}，意味著...」

請嚴格按照以下 JSON Schema 輸出，不要有任何額外文字：
{
  "fortuneIndex": <0-100的整數，綜合吉凶指數，結合十神分數、五行匹配度、月相加成計算>,
  "fortuneLabel": <"大吉"|"吉"|"小吉"|"平"|"小凶"|"凶"|"大凶">,
  "coreReading": <150-200字的核心命理解讀，必須具體說明今日天象如何影響此主題，結合十神、塔羅、月相，有深度有溫度>,
  "actions": [
    {"title": <行動標題，10字內>, "desc": <具體可執行的建議，40-60字，說明為何此時宜此行動>},
    {"title": <行動標題>, "desc": <具體建議>},
    {"title": <行動標題>, "desc": <具體建議>}
  ],
  "warnings": <60-100字的警示，說明今日此主題需避開的陷阱與風險，要具體指出原因>,
  "bestHours": [
    {"name": <時辰名，如「午時」>, "time": <時段，如「11:00-13:00」>, "reason": <20字內說明為何此時辰最宜>}
  ],
  "oracle": <一句充滿詩意又具體的天命符言，20-35字，要有命理依據>
}`;
        const userMessage = input.question
          ? `我的具體問題是：「${input.question}」\n\n請針對這個問題，結合我的命格與今日天象，給出深度分析。`
          : `請分析今日「${topicName}」的天命能量走勢，給出完整的命理指引。`;
        const llmResponse = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'divination_result',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  fortuneIndex: { type: 'integer' },
                  fortuneLabel: { type: 'string' },
                  coreReading: { type: 'string' },
                  actions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { title: { type: 'string' }, desc: { type: 'string' } },
                      required: ['title', 'desc'],
                      additionalProperties: false,
                    },
                  },
                  warnings: { type: 'string' },
                  bestHours: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { name: { type: 'string' }, time: { type: 'string' }, reason: { type: 'string' } },
                      required: ['name', 'time', 'reason'],
                      additionalProperties: false,
                    },
                  },
                  oracle: { type: 'string' },
                },
                required: ['fortuneIndex', 'fortuneLabel', 'coreReading', 'actions', 'warnings', 'bestHours', 'oracle'],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = (llmResponse.choices?.[0]?.message?.content as string) ?? '{}';
        let structured: {
          fortuneIndex: number;
          fortuneLabel: string;
          coreReading: string;
          actions: Array<{ title: string; desc: string }>;
          warnings: string;
          bestHours: Array<{ name: string; time: string; reason: string }>;
          oracle: string;
        };
        try {
          structured = JSON.parse(rawContent);
        } catch {
          structured = {
            fortuneIndex: tenGodAnalysis.overallScore * 10,
            fortuneLabel: tenGodAnalysis.overallScore >= 8 ? '大吉' : tenGodAnalysis.overallScore >= 6 ? '吉' : tenGodAnalysis.overallScore >= 4 ? '平' : '凶',
            coreReading: typeof rawContent === 'string' ? rawContent : '解析異常',
            actions: [{ title: '靜待天時', desc: '天命能量正在對齊中，建議保持靜觀其變的態度，等待最佳時機。' }],
            warnings: '解析異常，請重新問卜。',
            bestHours: bestHours.slice(0, 2).map(h => ({ name: h.chineseName, time: h.displayTime, reason: '能量最旺' })),
            oracle: '天命自有安排，靜待花開。',
          };
        }
        // 確保 fortuneIndex 在合理範圍
        structured.fortuneIndex = Math.max(0, Math.min(100, structured.fortuneIndex));
        const contextObj = {
          dayPillar: `${dayPillar.stem}${dayPillar.branch}`,
          monthPillar: `${monthPillar.stem}${monthPillar.branch}`,
          yearPillar: `${yearPillar.stem}${yearPillar.branch}`,
          hourBranch: hourInfo.branch,
          tenGod: tenGodAnalysis.mainTenGod,
          overallScore: tenGodAnalysis.overallScore,
          tarotCard: tarot.card.name,
          tarotKeywords: tarot.card.keywords,
          moonPhase: moonInfo.phaseName,
          moonLunarDay: moonInfo.lunarDay,
          dominantElement: wuxingResult.dominantElement,
          weakestElement: wuxingResult.weakestElement,
          favorableElements: ep.favorableElements,
          unfavorableElements: ep.unfavorableElements,
          dayMasterStem: ep.dayMasterStem,
          dayMasterElement: ep.dayMasterElement,
        };
        // 儲存問卜記錄（非阻塞）
        saveDivinationSession({
          userId: ctx.user.id,
          topic: input.topic,
          topicName,
          question: input.question ?? null,
          adviceJson: JSON.stringify(structured),
          contextJson: JSON.stringify(contextObj),
          dateString,
          energyScore: tenGodAnalysis.overallScore,
        }).catch(() => {});
        return {
          topic: input.topic,
          topicName,
          question: input.question,
          structured,
          context: contextObj,
          generatedAt: new Date().toISOString(),
        };
      }),
    /**
     * 天命問卜歷史記錄
     */
    divinationHistory: protectedProcedure
      .query(async ({ ctx }) => {
        const history = await getDivinationHistory(ctx.user.id);
        return history.map(h => ({
          id: h.id,
          topic: h.topic,
          topicName: h.topicName,
          question: h.question,
          structured: (() => { try { return JSON.parse(h.adviceJson); } catch { return null; } })(),
          context: (() => { try { return JSON.parse(h.contextJson); } catch { return null; } })(),
          dateString: h.dateString,
          energyScore: h.energyScore,
          createdAt: h.createdAt,
        }));
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

    /**
     * 神諭穿搭 V3.0 - 時辰動態穿搭建議
     * 支援指定時辰（預覽未來時辰）+ 五種情境模式
     */
    getOutfitByShichen: protectedProcedure
      .input(z.object({
        date: z.string().optional(), // YYYY-MM-DD
        hourBranchIndex: z.number().min(0).max(11).optional(), // 0=子時...11=亥時，不傳則用當前時辰
        mode: z.enum(['default', 'love', 'work', 'leisure', 'travel']).default('default'),
        lat: z.number().optional(),
        lon: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const ep = await getUserProfileForEngine(ctx.user.id);
        const realNow = new Date();
        const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
        const dateStr = input.date ?? twNow.toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
        const dateInfo = getFullDateInfo(dateObj);
        const { yearPillar, monthPillar, dayPillar } = dateInfo;

        // 取得目標時辰
        const twHour = twNow.getUTCHours();
        const currentBranchIndex = HOUR_BRANCHES.findIndex(h => {
          if (h.startHour > h.endHour) return twHour >= h.startHour || twHour < h.endHour;
          return twHour >= h.startHour && twHour < h.endHour;
        });
        const targetBranchIndex = input.hourBranchIndex ?? (currentBranchIndex >= 0 ? currentBranchIndex : 0);
        const targetBranch = HOUR_BRANCHES[targetBranchIndex];
        const hourStem = getHourStem(dayPillar.stem, targetBranchIndex);

        // 計算包含時辰的環境五行（六柱：年月日時）
        const envWithHour = calculateEnvironmentElements(
          yearPillar.stem, yearPillar.branch,
          monthPillar.stem, monthPillar.branch,
          dayPillar.stem, dayPillar.branch,
        );
        // 加入時柱五行加成（時辰佔環境權重 15%）
        const hourStemEl = STEM_ELEMENT[hourStem] as keyof typeof envWithHour;
        const hourBranchEl = targetBranch.branchElement as keyof typeof envWithHour;
        const envAdjusted = { ...envWithHour };
        if (hourStemEl && hourStemEl in envAdjusted) {
          envAdjusted[hourStemEl] = Math.min(1, envAdjusted[hourStemEl] + 0.08);
        }
        if (hourBranchEl && hourBranchEl in envAdjusted) {
          envAdjusted[hourBranchEl] = Math.min(1, envAdjusted[hourBranchEl] + 0.07);
        }
        // 正規化
        const envTotal = Object.values(envAdjusted).reduce((a, b) => a + b, 0);
        const normalizedEnv: typeof envWithHour = {
          木: envAdjusted.木 / envTotal,
          火: envAdjusted.火 / envTotal,
          土: envAdjusted.土 / envTotal,
          金: envAdjusted.金 / envTotal,
          水: envAdjusted.水 / envTotal,
        };

        // 天氣五行（可選）
        let weatherRatio: typeof envWithHour | undefined;
        if (input.lat && input.lon) {
          try {
            const { getCurrentWeatherWuxing } = await import('./lib/weatherEngine');
            const ww = await getCurrentWeatherWuxing(input.lat, input.lon);
            if (ww) weatherRatio = { 木: ww.木, 火: ww.火, 土: ww.土, 金: ww.金, 水: ww.水 };
          } catch { /* ignore */ }
        }

        const wuxingResult = calculateWeightedElements(normalizedEnv, ep.natalElementRatio, weatherRatio);

        // 根據情境模式調整補運優先級
        const modeSupplementMap: Record<string, string[]> = {
          default: ep.favorableElements,
          love:    ['水', '木', '火', '土', '金'], // 水木主感情流動
          work:    ['金', '火', '土', '木', '水'], // 金主決斷，火主創意
          leisure: ['木', '土', '水', '火', '金'], // 木主放鬆，土主穩定
          travel:  ['火', '木', '金', '水', '土'], // 火主活力，木主生長
        };
        // 戀愛/工作模式的優先級與用戶喜用神交叉加權
        const modeBase = modeSupplementMap[input.mode] ?? ep.favorableElements;
        const blendedPriority = input.mode === 'default'
          ? ep.favorableElements
          : [
              ...ep.favorableElements.filter(el => modeBase.includes(el)),
              ...modeBase.filter(el => !ep.favorableElements.includes(el)),
              ...ep.favorableElements.filter(el => !modeBase.includes(el)),
            ];

        // V10.0：動態策略判定層（從 DB 快取讀取閾值）
        const { determineDailyStrategy } = await import('./lib/strategyEngine');
        const { getStrategyThresholdConfigs } = await import('./lib/strategyThresholdCache');
        const dbThresholds = await getStrategyThresholdConfigs();
        const dailyStrategy = determineDailyStrategy(
          wuxingResult,
          blendedPriority,
          ep.unfavorableElements,
          input.mode,
          dbThresholds,
        );
        const outfit = generateOutfitAdviceV9(wuxingResult, blendedPriority, dailyStrategy);
        // 塔羅流日卡號
        const { calculateTarotDailyCard } = await import('./lib/warRoomEngine');
        const dailyTarotCard = calculateTarotDailyCard(month, day, ep.birthMonth ?? undefined, ep.birthDay ?? undefined);
        // 時辰能量分數（用於前端時間軸顯示））
        const hourDynamicProfile: import('./lib/hourlyEnergy').DynamicHourProfile = {
          hourElementScores: Object.fromEntries(
            ['火', '土', '金', '水', '木'].map(el => [
              el,
              ep.favorableElements.includes(el) ? 25
                : ep.unfavorableElements.includes(el) ? -20
                : 5
            ])
          ),
          specialHourBonus: {},
        };
        const allHours = getAllHourEnergiesDynamic(dayPillar.stem, hourDynamicProfile);

        // 情境模式文字說明
        const modeLabels: Record<string, { label: string; icon: string; desc: string }> = {
          default: { label: '天命模式', icon: '☯️', desc: '依您的命格喜用神優化，全方位能量補強' },
          love:    { label: '戀愛模式', icon: '💕', desc: '強化桃花能量，增進人際吸引力與感情運勢' },
          work:    { label: '工作模式', icon: '⚡', desc: '強化決斷力與創意，提升職場競爭力' },
          leisure: { label: '休閒模式', icon: '🌿', desc: '放鬆身心，補充木土能量，享受當下' },
          travel:  { label: '出遊模式', icon: '🌟', desc: '活力滿點，火木能量加持，開拓視野' },
        };

        return {
          outfit,
          targetHour: {
            branchIndex: targetBranchIndex,
            branch: targetBranch.branch,
            chineseName: targetBranch.chineseName,
            displayTime: targetBranch.displayTime,
            stem: hourStem,
            stemElement: STEM_ELEMENT[hourStem] ?? '',
            branchElement: targetBranch.branchElement,
            isCurrent: targetBranchIndex === (currentBranchIndex >= 0 ? currentBranchIndex : 0),
          },
          mode: input.mode,
          modeInfo: modeLabels[input.mode] ?? modeLabels.default,
          wuxing: {
            weighted: wuxingResult.weighted,
            dominantElement: wuxingResult.dominantElement,
            weakestElement: wuxingResult.weakestElement,
          },
          allHours: allHours.map(h => ({
            branchIndex: HOUR_BRANCHES.findIndex(b => b.branch === h.branch),
            branch: h.branch,
            chineseName: h.chineseName,
            displayTime: h.displayTime,
            stem: h.stem,
            score: h.energyScore,
            level: h.energyLevel,
            label: h.energyLabel,
            isCurrent: h.isCurrentHour,
          })),
          favorableElements: ep.favorableElements,
          strategy: dailyStrategy,
          tarotCardNumber: dailyTarotCard?.cardNumber ?? null,
          tarotCardName: dailyTarotCard?.card.name ?? null,
        };
      }),
    /**
     * 神諶穿搭 V4.0 - 取得完整模擬器初始化資料料
     * 包含：Innate Aura 分數、系統推薦穿搭、虛擬衣櫥、手串列表
     */
    getOutfitSimulatorData: protectedProcedure
      .input(z.object({
        date: z.string().optional(),
        hourBranchIndex: z.number().min(0).max(11).optional(),
        mode: z.enum(['default', 'love', 'work', 'leisure', 'travel']).default('default'),
        lat: z.number().optional(),
        lon: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { calculateInnateAura, getAuraLevel, DEFAULT_ENGINE_RULES } = await import('./lib/auraEngine');
        const ep = await getUserProfileForEngine(ctx.user.id);
        const realNow = new Date();
        const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
        const dateStr = input.date ?? twNow.toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
        const dateInfo = getFullDateInfo(dateObj);
        const { yearPillar, monthPillar, dayPillar } = dateInfo;

        // 從 DB 讀取 aura 計算規則
        const db = await getDb();
        let engineRules = { ...DEFAULT_ENGINE_RULES };
        if (db) {
          const dbRules = await db.select().from(auraEngineConfig);
          if (dbRules.length > 0) {
            const ruleMap: Record<string, number> = {};
            for (const r of dbRules) { ruleMap[r.configKey] = parseFloat(r.configValue); }
            engineRules = {
              categoryWeights: {
                upper:         ruleMap['upper']          ?? DEFAULT_ENGINE_RULES.categoryWeights.upper,
                outer:         ruleMap['outer']          ?? DEFAULT_ENGINE_RULES.categoryWeights.outer,
                lower:         ruleMap['lower']          ?? DEFAULT_ENGINE_RULES.categoryWeights.lower,
                shoes:         ruleMap['shoes']          ?? DEFAULT_ENGINE_RULES.categoryWeights.shoes,
                accessory:     ruleMap['accessory']      ?? DEFAULT_ENGINE_RULES.categoryWeights.accessory,
                bracelet:      ruleMap['bracelet']       ?? DEFAULT_ENGINE_RULES.categoryWeights.bracelet,
                leftBracelet:  ruleMap['leftBracelet']   ?? DEFAULT_ENGINE_RULES.categoryWeights.leftBracelet,
                leftAccessory: ruleMap['leftAccessory']  ?? DEFAULT_ENGINE_RULES.categoryWeights.leftAccessory,
                rightBracelet: ruleMap['rightBracelet']  ?? DEFAULT_ENGINE_RULES.categoryWeights.rightBracelet,
                rightAccessory:ruleMap['rightAccessory'] ?? DEFAULT_ENGINE_RULES.categoryWeights.rightAccessory,
              },
              directMatchRatio:    ruleMap['direct_match']    ?? DEFAULT_ENGINE_RULES.directMatchRatio,
              generatesMatchRatio: ruleMap['generates_match'] ?? DEFAULT_ENGINE_RULES.generatesMatchRatio,
              controlsMatchRatio:  ruleMap['controls_match']  ?? DEFAULT_ENGINE_RULES.controlsMatchRatio,
              boostCap:      ruleMap['boost_cap']      ?? DEFAULT_ENGINE_RULES.boostCap,
              innateMin:     ruleMap['innate_min']     ?? DEFAULT_ENGINE_RULES.innateMin,
              innateMax:     ruleMap['innate_max']     ?? DEFAULT_ENGINE_RULES.innateMax,
              natalWeight:   ruleMap['natal_weight']   ?? DEFAULT_ENGINE_RULES.natalWeight,
              timeWeight:    ruleMap['time_weight']    ?? DEFAULT_ENGINE_RULES.timeWeight,
              weatherWeight: ruleMap['weather_weight'] ?? DEFAULT_ENGINE_RULES.weatherWeight,
            };
          }
        }

        // 計算環境五行（含時辰）
        const twHour = twNow.getUTCHours();
        const currentBranchIndex = HOUR_BRANCHES.findIndex(h => {
          if (h.startHour > h.endHour) return twHour >= h.startHour || twHour < h.endHour;
          return twHour >= h.startHour && twHour < h.endHour;
        });
        const targetBranchIndex = input.hourBranchIndex ?? (currentBranchIndex >= 0 ? currentBranchIndex : 0);
        const targetBranch = HOUR_BRANCHES[targetBranchIndex];
        const hourStem = getHourStem(dayPillar.stem, targetBranchIndex);

        const envBase = calculateEnvironmentElements(
          yearPillar.stem, yearPillar.branch,
          monthPillar.stem, monthPillar.branch,
          dayPillar.stem, dayPillar.branch,
        );
        const hourStemEl = STEM_ELEMENT[hourStem] as keyof typeof envBase;
        const hourBranchEl = targetBranch.branchElement as keyof typeof envBase;
        const envAdj = { ...envBase };
        if (hourStemEl && hourStemEl in envAdj) envAdj[hourStemEl] = Math.min(1, envAdj[hourStemEl] + 0.08);
        if (hourBranchEl && hourBranchEl in envAdj) envAdj[hourBranchEl] = Math.min(1, envAdj[hourBranchEl] + 0.07);
        const envTotal = Object.values(envAdj).reduce((a, b) => a + b, 0);
        const normalizedEnv = {
          木: envAdj.木 / envTotal,
          火: envAdj.火 / envTotal,
          土: envAdj.土 / envTotal,
          金: envAdj.金 / envTotal,
          水: envAdj.水 / envTotal,
        };

        // 天氣五行
        let weatherData: { wuxingRatio?: typeof normalizedEnv } | undefined;
        if (input.lat && input.lon) {
          try {
            const { getCurrentWeatherWuxing } = await import('./lib/weatherEngine');
            const ww = await getCurrentWeatherWuxing(input.lat, input.lon);
            if (ww) weatherData = { wuxingRatio: { 木: ww.木, 火: ww.火, 土: ww.土, 金: ww.金, 水: ww.水 } };
          } catch { /* ignore */ }
        }

        // 計算 Innate Aura（傳入 DB 規則）
        const innateAnalysis = calculateInnateAura(
          ep.natalElementRatio,
          ep.favorableElements,
          ep.unfavorableElements,
          normalizedEnv,
          weatherData,
          engineRules,
        );
        const auraLevel = getAuraLevel(innateAnalysis.score);

        // 取得虛擬衣樻（重用已存在的 db 變數）
        const { wardrobeItems } = await import('../drizzle/schema');
        const wardrobe = db ? await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, ctx.user.id)) : [];

        // 取得手串列表（從 wuxingEngine）
        const { BRACELET_DB } = await import('./lib/wuxingEngine');
        const bracelets = BRACELET_DB.map(b => ({
          code: b.code,
          name: b.name,
          element: b.element,
          color: b.color,
          function: b.function,
        }));

        // 系統推薦穿搭（基於今日短板五行）
        const { ELEMENT_COLORS } = await import('./lib/auraEngine');
        const primaryTarget = innateAnalysis.weakestElements[0] ?? ep.favorableElements[0] ?? '火';
        const secondaryTarget = innateAnalysis.weakestElements[1] ?? ep.favorableElements[1] ?? '土';
        const systemRecommendation = {
          upper: { color: ELEMENT_COLORS[primaryTarget]?.[0] ?? '紅色', wuxing: primaryTarget, reason: `上衣補${primaryTarget}能量` },
          lower: { color: ELEMENT_COLORS[secondaryTarget]?.[0] ?? '黃色', wuxing: secondaryTarget, reason: `下身補${secondaryTarget}能量` },
          shoes: { color: ELEMENT_COLORS[primaryTarget]?.[1] ?? '橘色', wuxing: primaryTarget, reason: `鞋子強化${primaryTarget}能量` },
          bracelet: bracelets.find(b => b.element === primaryTarget) ?? bracelets[0],
        };

         return {
          innateAura: innateAnalysis.score,
          innateMax: engineRules.innateMax,  // 天命底盤最高分（從 DB 讀取）
          auraLevel,
          innateAnalysis,
          systemRecommendation,
          wardrobe,
          bracelets,
          targetHour: {
            branchIndex: targetBranchIndex,
            branch: targetBranch.branch,
            chineseName: targetBranch.chineseName,
            displayTime: targetBranch.displayTime,
          },
          mode: input.mode,
          favorableElements: ep.favorableElements,
          unfavorableElements: ep.unfavorableElements,
        };
      }),
    /**
     * 神諭穿搭 V4.0 - 即時模擬穿搭組合，計算 Aura Score
     */
    simulateOutfit: protectedProcedure
      .input(z.object({
        date: z.string().optional(),
        hourBranchIndex: z.number().min(0).max(11).optional(),
        mode: z.enum(['default', 'love', 'work', 'leisure', 'travel']).default('default'),
        outfit: z.object({
          upper: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          lower: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          shoes: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          outer: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          // 舊版相容
          accessory: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          bracelet: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          // 新版：左右手分開
          leftBracelet: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          leftAccessory: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          rightBracelet: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
          rightAccessory: z.object({ color: z.string(), wuxing: z.string().optional(), name: z.string().optional() }).optional(),
        }),
        lat: z.number().optional(),
        lon: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { calculateAuraScore, getAuraLevel, DEFAULT_ENGINE_RULES } = await import('./lib/auraEngine');
        const ep = await getUserProfileForEngine(ctx.user.id);
        const realNow = new Date();
        const twNow = new Date(realNow.getTime() + 8 * 60 * 60 * 1000);
        const dateStr = input.date ?? twNow.toISOString().split('T')[0];
        const [year, month, day] = dateStr.split('-').map(Number);
        const dateObj = new Date(Date.UTC(year, month - 1, day, 4, 0, 0));
        const dateInfo = getFullDateInfo(dateObj);
        const { yearPillar, monthPillar, dayPillar } = dateInfo;

        // 從 DB 讀取 aura 計算規則
        const dbSim = await getDb();
        let simEngineRules = { ...DEFAULT_ENGINE_RULES };
        if (dbSim) {
          const dbRules = await dbSim.select().from(auraEngineConfig);
          if (dbRules.length > 0) {
            const ruleMap: Record<string, number> = {};
            for (const r of dbRules) { ruleMap[r.configKey] = parseFloat(r.configValue); }
            simEngineRules = {
              categoryWeights: {
                upper:         ruleMap['upper']          ?? DEFAULT_ENGINE_RULES.categoryWeights.upper,
                outer:         ruleMap['outer']          ?? DEFAULT_ENGINE_RULES.categoryWeights.outer,
                lower:         ruleMap['lower']          ?? DEFAULT_ENGINE_RULES.categoryWeights.lower,
                shoes:         ruleMap['shoes']          ?? DEFAULT_ENGINE_RULES.categoryWeights.shoes,
                accessory:     ruleMap['accessory']      ?? DEFAULT_ENGINE_RULES.categoryWeights.accessory,
                bracelet:      ruleMap['bracelet']       ?? DEFAULT_ENGINE_RULES.categoryWeights.bracelet,
                leftBracelet:  ruleMap['leftBracelet']   ?? DEFAULT_ENGINE_RULES.categoryWeights.leftBracelet,
                leftAccessory: ruleMap['leftAccessory']  ?? DEFAULT_ENGINE_RULES.categoryWeights.leftAccessory,
                rightBracelet: ruleMap['rightBracelet']  ?? DEFAULT_ENGINE_RULES.categoryWeights.rightBracelet,
                rightAccessory:ruleMap['rightAccessory'] ?? DEFAULT_ENGINE_RULES.categoryWeights.rightAccessory,
              },
              directMatchRatio:    ruleMap['direct_match']    ?? DEFAULT_ENGINE_RULES.directMatchRatio,
              generatesMatchRatio: ruleMap['generates_match'] ?? DEFAULT_ENGINE_RULES.generatesMatchRatio,
              controlsMatchRatio:  ruleMap['controls_match']  ?? DEFAULT_ENGINE_RULES.controlsMatchRatio,
              boostCap:      ruleMap['boost_cap']      ?? DEFAULT_ENGINE_RULES.boostCap,
              innateMin:     ruleMap['innate_min']     ?? DEFAULT_ENGINE_RULES.innateMin,
              innateMax:     ruleMap['innate_max']     ?? DEFAULT_ENGINE_RULES.innateMax,
              natalWeight:   ruleMap['natal_weight']   ?? DEFAULT_ENGINE_RULES.natalWeight,
              timeWeight:    ruleMap['time_weight']    ?? DEFAULT_ENGINE_RULES.timeWeight,
              weatherWeight: ruleMap['weather_weight'] ?? DEFAULT_ENGINE_RULES.weatherWeight,
            };
          }
        }

        const twHour = twNow.getUTCHours();
        const currentBranchIndex = HOUR_BRANCHES.findIndex(h => {
          if (h.startHour > h.endHour) return twHour >= h.startHour || twHour < h.endHour;
          return twHour >= h.startHour && twHour < h.endHour;
        });
        const targetBranchIndex = input.hourBranchIndex ?? (currentBranchIndex >= 0 ? currentBranchIndex : 0);
        const targetBranch = HOUR_BRANCHES[targetBranchIndex];
        const hourStem = getHourStem(dayPillar.stem, targetBranchIndex);

        const envBase = calculateEnvironmentElements(
          yearPillar.stem, yearPillar.branch,
          monthPillar.stem, monthPillar.branch,
          dayPillar.stem, dayPillar.branch,
        );
        const hourStemEl = STEM_ELEMENT[hourStem] as keyof typeof envBase;
        const hourBranchEl = targetBranch.branchElement as keyof typeof envBase;
        const envAdj = { ...envBase };
        if (hourStemEl && hourStemEl in envAdj) envAdj[hourStemEl] = Math.min(1, envAdj[hourStemEl] + 0.08);
        if (hourBranchEl && hourBranchEl in envAdj) envAdj[hourBranchEl] = Math.min(1, envAdj[hourBranchEl] + 0.07);
        const envTotal = Object.values(envAdj).reduce((a, b) => a + b, 0);
        const normalizedEnv = {
          木: envAdj.木 / envTotal,
          火: envAdj.火 / envTotal,
          土: envAdj.土 / envTotal,
          金: envAdj.金 / envTotal,
          水: envAdj.水 / envTotal,
        };

        let weatherData: { wuxingRatio?: typeof normalizedEnv } | undefined;
        if (input.lat && input.lon) {
          try {
            const { getCurrentWeatherWuxing } = await import('./lib/weatherEngine');
            const ww = await getCurrentWeatherWuxing(input.lat, input.lon);
            if (ww) weatherData = { wuxingRatio: { 木: ww.木, 火: ww.火, 土: ww.土, 金: ww.金, 水: ww.水 } };
          } catch { /* ignore */ }
        }

        const result = calculateAuraScore(
          ep.natalElementRatio,
          ep.favorableElements,
          ep.unfavorableElements,
          normalizedEnv,
          input.outfit as import('./lib/auraEngine').OutfitCombination,
          weatherData,
          simEngineRules,
        );

        const auraLevel = getAuraLevel(result.totalScore);

        // 生成 AI 點評（簡短版，不調用 LLM，用規則生成）
        const topBoost = result.boostBreakdown
          .filter(b => b.points > 0)
          .sort((a, b) => b.points - a.points)
          .slice(0, 2);
        const aiComment = topBoost.length > 0
          ? `今日穿搭能量加成 +${result.outfitBoost} 分！${topBoost.map(b => b.reason).join('；')}。${auraLevel.description}`
          : `今日穿搭能量中性，建議加入${result.innateAnalysis.weakestElements[0] ?? '火'}系顏色提升能量共振。`;

        return {
          ...result,
          auraLevel,
          aiComment,
        };
      }),

    /**
     * 取得手串左右手佩戴的「左進右出」能量說明
     */
    getBraceletHandExplanation: publicProcedure
      .input(z.object({
        element: z.string(),
        hand: z.enum(['left', 'right']),
      }))
      .query(async ({ input }) => {
        const { getBraceletHandExplanation } = await import('./lib/auraEngine');
        return getBraceletHandExplanation(input.element, input.hand);
      }),
    /**
     * 本週策略分布：計算過去 7 日每日觸發的策略名稱
     */
    weeklyStrategyDistribution: protectedProcedure
      .input(z.object({
        endDate: z.string().optional(), // YYYY-MM-DD，預設今日
      }).optional())
      .query(async ({ input, ctx }) => {
        const ep = await getUserProfileForEngine(ctx.user.id);
        const { getFullDateInfo } = await import('./lib/lunarCalendar');
        const { calculateWeightedElements, calculateEnvironmentElements } = await import('./lib/wuxingEngine');
        const { determineDailyStrategy, getStrategyDescription } = await import('./lib/strategyEngine');
        const { getStrategyThresholdConfigs: getThresholdConfigs } = await import('./lib/strategyThresholdCache');
        const dbThresholdsForWeekly = await getThresholdConfigs();
        const twNow = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
        const baseDate = input?.endDate
          ? new Date(input.endDate + 'T04:00:00Z')
          : new Date(Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), twNow.getUTCDate(), 4, 0, 0));
        const days: Array<{
          date: string;
          dayOfWeek: string;
          strategyName: string;
          strategyIcon: string;
          strategyColor: string;
          energyTag: string;
          isToday: boolean;
        }> = [];
        const todayStr = twNow.toISOString().split('T')[0];
        const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = d.toISOString().split('T')[0];
          const dateInfo = getFullDateInfo(d);
          const { yearPillar, monthPillar, dayPillar } = dateInfo;
          const env = calculateEnvironmentElements(
            yearPillar.stem, yearPillar.branch,
            monthPillar.stem, monthPillar.branch,
            dayPillar.stem, dayPillar.branch,
          );
          const wuxingResult = calculateWeightedElements(env, ep.natalElementRatio);
          const strategy = determineDailyStrategy(
            wuxingResult,
            ep.favorableElements,
            ep.unfavorableElements,
            'default',
            dbThresholdsForWeekly,
          );
          const desc = getStrategyDescription(strategy.strategyName);
          const [y, m, dd] = dateStr.split('-').map(Number);
          const jsDate = new Date(y, m - 1, dd);
          days.push({
            date: dateStr,
            dayOfWeek: `週${DOW_ZH[jsDate.getDay()]}`,
            strategyName: strategy.strategyName,
            strategyIcon: desc.icon,
            strategyColor: desc.color,
            energyTag: strategy.energyTag,
            isToday: dateStr === todayStr,
          });
        }
        // 統計各策略出現次數
        const countMap: Record<string, number> = {};
        for (const d of days) {
          countMap[d.strategyName] = (countMap[d.strategyName] ?? 0) + 1;
        }
        const distribution = Object.entries(countMap)
          .map(([name, count]) => ({
            name,
            count,
            icon: getStrategyDescription(name as Parameters<typeof getStrategyDescription>[0]).icon,
            color: getStrategyDescription(name as Parameters<typeof getStrategyDescription>[0]).color,
          }))
          .sort((a, b) => b.count - a.count);
        return { days, distribution };
      }),
  }),
  // ── 手串佩戴記錄 ───────────────────────────────────────────────────────────
  /**
   * 命格分析 - 流年流月分析
   */
  profile: router({
    yearlyAnalysis: protectedProcedure
      .input(z.object({
        startYear: z.number().min(2024).max(2035).default(2026),
        endYear: z.number().min(2024).max(2035).default(2030),
      }).optional())
      .query(async ({ input, ctx }) => {
        const { getMultiYearAnalysis } = await import('./lib/yearlyAnalysis');
        const startYear = input?.startYear ?? 2026;
        const endYear = input?.endYear ?? 2030;
        // 使用用戶動態命格計算流年流月
        const ep = await getUserProfileForEngine(ctx.user.id);
        // 從出生日期動態計算中間個性數字（生命靈數）
        let middleNumber: number | undefined;
        if (ep.birthDate && !ep.isDefault) {
          const digits = ep.birthDate.replace(/-/g, '').split('').map(Number);
          let sum = digits.reduce((a, b) => a + b, 0);
          while (sum > 22) { sum = String(sum).split('').reduce((a, b) => a + parseInt(b), 0); }
          middleNumber = sum;
        }
        const userProfileForYearly = {
          middleNumber,
          favorableElements: ep.favorableElements,
          unfavorableElements: ep.unfavorableElements,
        };
        return getMultiYearAnalysis(startYear, endYear, userProfileForYearly);
      }),
  }),
  diet: dietRouter,
  wealth: wealthRouter,
  exchange: exchangeRouter,
  wbc: wbcRouter,
  featureStore: featureStoreRouter,
  marketing: marketingRouter,
  notifications: notificationsRouter,
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

  /**
   * 工具類 API
   */
  utils: router({
    /**
     * 陽曆轉農曆：接收産曆日期，返回格式化的農曆字串
     * 例如："2000-01-01" → "農曆：己卯年十二月巭五"
     */
    toLunar: publicProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "請提供 YYYY-MM-DD 格式日期") }))
      .query(async ({ input }) => {
        const [year, month, day] = input.date.split("-").map(Number);
        try {
          // 使用 lunar-typescript 進行精確農曆換算（1900-2100 年）
          const { Solar } = await import('lunar-typescript');
          const solar = Solar.fromYmd(year, month, day);
          const lunar = solar.getLunar();
          const lunarYear = lunar.getYear();
          const lunarMonthNum = lunar.getMonth();
          const isLeap = lunarMonthNum < 0;
          const absMonth = Math.abs(lunarMonthNum);
          const yearGanzhi = lunar.getYearInGanZhi();
          const monthChinese = lunar.getMonthInChinese();
          const dayChinese = lunar.getDayInChinese();
          const leapPrefix = isLeap ? '閏' : '';
          const lunarStr = `農曆：${yearGanzhi}年${leapPrefix}${monthChinese}月${dayChinese}`;
          return {
            lunarString: lunarStr,
            lunarYear,
            lunarMonth: absMonth,
            lunarDay: lunar.getDay(),
            lunarMonthName: `${leapPrefix}${monthChinese}月`,
            lunarDayName: dayChinese,
            isLeapMonth: isLeap,
            yearGanzhi,
            festival: lunar.getFestivals().join('') || null,
            deityBirthday: null,
          };
        } catch {
          // 備用：回落到內建轉換
          const lunar = solarToLunarByYMD(year, month, day);
          const yearPillar = getYearPillar(lunar.lunarYear);
          const yearName = `${yearPillar.stem}${yearPillar.branch}`;
          const leapPrefix = lunar.isLeapMonth ? '閏' : '';
          const lunarStr = `農曆：${yearName}年${leapPrefix}${lunar.lunarMonthName}${lunar.lunarDayName}`;
          return {
            lunarString: lunarStr,
            lunarYear: lunar.lunarYear,
            lunarMonth: lunar.lunarMonth,
            lunarDay: lunar.lunarDay,
            lunarMonthName: lunar.lunarMonthName,
            lunarDayName: lunar.lunarDayName,
            isLeapMonth: lunar.isLeapMonth,
            yearGanzhi: yearName,
            festival: lunar.festival,
            deityBirthday: lunar.deityBirthday,
          };
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
// Re-export for type inference
export { accountRouter };
