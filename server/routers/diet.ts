/**
 * diet.ts
 * 飲食羅盤後端 API V10.0+V11.0
 * - getDietaryAdvice：整合策略層 + 情境模式 + 短期記憶過濾 + 健康標籤
 * - logConsumption：記錄飲食日誌
 * - getTodayLogs：取得今日飲食日誌
 * - aiChefMenu：AI 主廚菜單（LLM 生成個人化菜單）
 * - getUserPreferences：取得用戶飲食偏好
 * - updateUserPreferences：更新用戶飲食偏好
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getUserProfileForEngine } from "../db";
import { dietaryLogs, userDietPreferences } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  calculateEnvironmentElements,
  calculateWeightedElements,
  generateDietaryAdviceV10,
  ELEMENT_KNOWLEDGE,
  ELEMENT_FOODS,
  ELEMENT_FOODS_LIGHT,
} from "../lib/wuxingEngine";
import { getFullDateInfo, getTaiwanDate, getTaiwanHour, STEM_ELEMENT } from "../lib/lunarCalendar";
import { invokeLLM } from "../_core/llm";

// ── 情境模式補運優先級映射 ──────────────────────────────────────────────────
const MODE_SUPPLEMENT_MAP: Record<string, string[]> = {
  default: [],     // 使用用戶命格喜用神
  work:    ["金", "火", "土", "木", "水"],  // 工作：決斷力+創意
  love:    ["水", "木", "火", "土", "金"],  // 戀愛：桃花+流動
  leisure: ["木", "土", "水", "火", "金"],  // 休閒：放鬆+穩定
  health:  ["土", "金", "水", "木", "火"],  // 健康：脾胃+肺腎
};

// ── 場景感知：依時辰判斷用餐場景 ──────────────────────────────────────────
export function detectMealScene(twHour: number): "breakfast" | "lunch" | "dinner" | "snack" {
  if (twHour >= 6 && twHour < 10) return "breakfast";
  if (twHour >= 11 && twHour < 14) return "lunch";
  if (twHour >= 17 && twHour < 21) return "dinner";
  return "snack";
}

// ── 時辰動態調整：依當前時辰微調補運優先級 ──────────────────────────────────
function applyHourlyAdjustment(
  basePriority: string[],
  hourStemElement: string,
): string[] {
  // 若當前時辰五行在優先級中，提升其優先級
  const idx = basePriority.indexOf(hourStemElement);
  if (idx > 0) {
    const adjusted = [...basePriority];
    adjusted.splice(idx, 1);
    adjusted.unshift(hourStemElement);
    return adjusted;
  }
  return basePriority;
}

export const dietRouter = router({
  /**
   * 取得今日飲食建議 V10.0
   * 整合：動態策略層 + 情境模式 + 時辰動態調整 + 短期記憶過濾 + 健康標籤
   */
  getDietaryAdvice: protectedProcedure
    .input(z.object({
      date: z.string().optional(),
      mode: z.enum(["default", "work", "love", "leisure", "health"]).default("default"),
      hourBranchIndex: z.number().min(0).max(11).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. 取得用戶命格
      const ep = await getUserProfileForEngine(ctx.user.id);

      // 2. 計算日期與五行
      const twDate = getTaiwanDate();
      const dateStr = input.date ?? `${twDate.getUTCFullYear()}-${String(twDate.getUTCMonth() + 1).padStart(2, '0')}-${String(twDate.getUTCDate()).padStart(2, '0')}`;
      // 將日期字串轉為 Date 物件傳入 getFullDateInfo
      const [yearN, monthN, dayN] = dateStr.split("-").map(Number);
      const targetDate = new Date(Date.UTC(yearN, monthN - 1, dayN, 8, 0, 0)); // UTC+8 台灣時間
      const fullDate = getFullDateInfo(targetDate);
      const dayPillar = fullDate.dayPillar;
      const monthPillar = fullDate.monthPillar;
      const yearPillar = fullDate.yearPillar;

      const envElements = calculateEnvironmentElements(
        yearPillar.stem, yearPillar.branch,
        monthPillar.stem, monthPillar.branch,
        dayPillar.stem, dayPillar.branch,
      );
      const wuxingResult = calculateWeightedElements(envElements, ep.natalElementRatio);

      // 3. 取得當前時辰五行
      const twHour = input.hourBranchIndex !== undefined
        ? input.hourBranchIndex * 2 + 1
        : getTaiwanHour(twDate);
      const hourStem = (() => {
        const { getHourStem } = require("../lib/hourlyEnergy");
        return getHourStem(dayPillar.stem, twHour);
      })();
      const hourStemElement = STEM_ELEMENT[hourStem] ?? "木";
      const mealScene = detectMealScene(twHour);

      // 4. 決定補運優先級（情境模式 + 時辰動態調整）
      const modeBase = input.mode === "default"
        ? ep.favorableElements
        : MODE_SUPPLEMENT_MAP[input.mode] ?? ep.favorableElements;
      const blendedPriority = input.mode === "default"
        ? ep.favorableElements
        : [
            ...ep.favorableElements.filter(el => modeBase.includes(el)),
            ...modeBase.filter(el => !ep.favorableElements.includes(el)),
            ...ep.favorableElements.filter(el => !modeBase.includes(el)),
          ];
      const hourAdjustedPriority = applyHourlyAdjustment(blendedPriority, hourStemElement);

      // 5. 取得動態策略
      let strategy: import("../lib/strategyEngine").DailyStrategyObject | undefined;
      try {
        const { determineDailyStrategy } = await import("../lib/strategyEngine");
        const { getStrategyThresholdConfigs } = await import("../lib/strategyThresholdCache");
        const dbThresholds = await getStrategyThresholdConfigs();
        strategy = determineDailyStrategy(
          wuxingResult,
          hourAdjustedPriority,
          ep.unfavorableElements,
          input.mode === "health" ? "default" : input.mode,
          dbThresholds,
        );
      } catch {
        // fallback：無策略
      }

      // 6. 取得短期記憶（過去24小時攝取的五行）
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const recentLogs = await db.select()
        .from(dietaryLogs)
        .where(eq(dietaryLogs.userId, ctx.user.id))
        .orderBy(desc(dietaryLogs.createdAt))
        .limit(10);
      const recentConsumedElements = Array.from(new Set(recentLogs.map(l => l.consumedElement)));

      // 7. 取得用戶健康標籤
      const prefRows = await db.select()
        .from(userDietPreferences)
        .where(eq(userDietPreferences.userId, ctx.user.id))
        .limit(1);
      const prefs = prefRows[0];
      const healthTags: string[] = prefs?.healthTags ? JSON.parse(prefs.healthTags) : [];
      const budgetPreference = prefs?.budgetPreference ?? "mid";
      const dislikedElements: string[] = prefs?.dislikedElements ? JSON.parse(prefs.dislikedElements) : [];

      // 8. 生成 V10.0 飲食建議
      const dietaryAdvice = generateDietaryAdviceV10(
        wuxingResult,
        strategy,
        hourAdjustedPriority,
        { recentConsumedElements, healthTags },
      );

      // 9. 五行知識延伸
      const targetKnowledge = ELEMENT_KNOWLEDGE[dietaryAdvice.targetElement] ?? null;

      return {
        advice: dietaryAdvice,
        mealScene,
        hourStemElement,
        mode: input.mode,
        modeLabel: {
          default: "天命模式",
          work: "工作模式",
          love: "戀愛模式",
          leisure: "休閒模式",
          health: "健康模式",
        }[input.mode] ?? "天命模式",
        wuxing: {
          weighted: wuxingResult.weighted,
          dominantElement: wuxingResult.dominantElement,
          weakestElement: wuxingResult.weakestElement,
        },
        allHours: (() => {
          try {
            const { getAllHourEnergiesDynamic, HOUR_BRANCHES } = require("../lib/hourlyEnergy");
            const hourDynamicProfile = {
              hourElementScores: Object.fromEntries(
                ["火", "土", "金", "水", "木"].map(el => [
                  el,
                  ep.favorableElements.includes(el) ? 25
                    : ep.unfavorableElements.includes(el) ? -20
                    : 5,
                ])
              ),
              specialHourBonus: {},
            };
            const allHours = getAllHourEnergiesDynamic(dayPillar.stem, hourDynamicProfile);
            return allHours.map((h: { branch: string; chineseName: string; displayTime: string; stem: string; energyScore: number; energyLevel: string; energyLabel: string; isCurrentHour: boolean }) => ({
              branchIndex: HOUR_BRANCHES.findIndex((b: { branch: string }) => b.branch === h.branch),
              branch: h.branch,
              chineseName: h.chineseName,
              displayTime: h.displayTime,
              stem: h.stem,
              score: h.energyScore,
              level: h.energyLevel,
              label: h.energyLabel,
              isCurrent: h.isCurrentHour,
            }));
          } catch {
            return [];
          }
        })(),
        targetKnowledge,
        recentConsumedElements,
        healthTags,
        budgetPreference,
        dislikedElements,
        strategy: strategy ? {
          name: strategy.strategyName,
          coreText: strategy.coreStrategyText,
          energyTag: strategy.energyTag,
          primaryElement: strategy.primaryTargetElement,
          secondaryElement: strategy.secondaryTargetElement,
        } : null,
      };
    }),

  /**
   * 記錄飲食日誌
   */
  logConsumption: protectedProcedure
    .input(z.object({
      logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      consumedElement: z.string(),
      consumedFood: z.string().max(100),
      preference: z.enum(["like", "neutral", "dislike"]).default("neutral"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(dietaryLogs).values({
        userId: ctx.user.id,
        logDate: input.logDate,
        mealType: input.mealType,
        consumedElement: input.consumedElement,
        consumedFood: input.consumedFood,
        preference: input.preference,
      });
      return { success: true };
    }),

  /**
   * 取得今日飲食日誌
   */
  getTodayLogs: protectedProcedure
    .input(z.object({ logDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const twDate3 = getTaiwanDate();
      const todayStr = `${twDate3.getUTCFullYear()}-${String(twDate3.getUTCMonth() + 1).padStart(2, '0')}-${String(twDate3.getUTCDate()).padStart(2, '0')}`;
      const dateStr = input.logDate ?? todayStr;
      const logs = await db.select()
        .from(dietaryLogs)
        .where(and(
          eq(dietaryLogs.userId, ctx.user.id),
          eq(dietaryLogs.logDate, dateStr),
        ))
        .orderBy(desc(dietaryLogs.createdAt));
      return logs;
    }),

  /**
   * AI 主廚菜單：根據今日五行能量 + 情境模式 + 健康標籤，LLM 生成個人化菜單
   */
  aiChefMenu: protectedProcedure
    .input(z.object({
      targetElement: z.string(),
      secondaryElement: z.string().optional(),
      mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      mode: z.enum(["default", "work", "love", "leisure", "health"]).default("default"),
      healthTags: z.array(z.string()).default([]),
      budgetPreference: z.enum(["budget", "mid", "premium"]).default("mid"),
    }))
    .mutation(async ({ input, ctx }) => {
      // 【鳳凰計畫】扣除天命幣（天命菜單 AI 主廨）
      const { spendCoins } = await import('./coins');
      await spendCoins(ctx.user.id, 'warroom_dietary');
      const modeLabels: Record<string, string> = {
        default: "天命模式",
        work: "工作模式",
        love: "戀愛模式",
        leisure: "休閒模式",
        health: "健康模式",
      };
      const mealLabels: Record<string, string> = {
        breakfast: "早餐",
        lunch: "午餐",
        dinner: "晚餐",
        snack: "點心",
      };
      const budgetLabels: Record<string, string> = {
        budget: "平價（100元以下）",
        mid: "中等（100-300元）",
        premium: "高檔（300元以上）",
      };
      const healthTagLabels: Record<string, string> = {
        vegetarian: "素食",
        no_seafood: "不吃海鮮",
        no_spicy: "不吃辣",
        low_carb: "低碳水",
        gluten_free: "無麩質",
      };
      const healthTagStr = input.healthTags.length > 0
        ? input.healthTags.map(t => healthTagLabels[t] || t).join("、")
        : "無特殊限制";

      const primaryFoods = ELEMENT_FOODS[input.targetElement] ?? [];
      const lightFoods = ELEMENT_FOODS_LIGHT[input.targetElement] ?? [];
      const knowledge = ELEMENT_KNOWLEDGE[input.targetElement];

      const systemPrompt = `你是一位精通中醫五行飲食學的天命美食軍師，同時也是一位米其林等級的主廚。
你的任務是根據用戶的今日五行能量狀態，生成一份個人化的菜單建議。
請用繁體中文回答，語氣要充滿能量感和儀式感，讓用戶感覺每一餐都是一次「天命補運儀式」。`;

      const userPrompt = `今日用戶資料：
- 主攻補充五行：${input.targetElement}（${knowledge?.organ ?? ""}）
- 輔助五行：${input.secondaryElement ?? "無"}
- 用餐場景：${mealLabels[input.mealType]}
- 情境模式：${modeLabels[input.mode]}
- 預算偏好：${budgetLabels[input.budgetPreference]}
- 健康限制：${healthTagStr}
- 推薦食材參考：${primaryFoods.join("、")}
- 輕型食材參考：${lightFoods.join("、")}
- 中醫功效：${knowledge?.tcmBenefit ?? ""}
- 建議烹飪方式：${knowledge?.cookingStyle ?? ""}

請生成一份「天命菜單」，包含：
1. 菜單名稱（充滿儀式感的名字，例如「火焰覺醒套餐」）
2. 主菜推薦（2道，含食材說明和五行功效）
3. 配菜推薦（1道）
4. 飲品推薦（1杯，含五行說明）
5. 一句天命飲食箴言（激勵性的結語）

請以 JSON 格式回答，結構如下：
{
  "menuName": "菜單名稱",
  "mainDishes": [
    {"name": "菜名", "ingredients": "食材", "wuxingEffect": "五行功效說明"},
    {"name": "菜名", "ingredients": "食材", "wuxingEffect": "五行功效說明"}
  ],
  "sideDish": {"name": "菜名", "ingredients": "食材", "wuxingEffect": "五行功效說明"},
  "drink": {"name": "飲品名", "description": "說明", "wuxingEffect": "五行功效說明"},
  "motto": "天命飲食箴言"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "ai_chef_menu",
            strict: true,
            schema: {
              type: "object",
              properties: {
                menuName: { type: "string" },
                mainDishes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      ingredients: { type: "string" },
                      wuxingEffect: { type: "string" },
                    },
                    required: ["name", "ingredients", "wuxingEffect"],
                    additionalProperties: false,
                  },
                },
                sideDish: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    ingredients: { type: "string" },
                    wuxingEffect: { type: "string" },
                  },
                  required: ["name", "ingredients", "wuxingEffect"],
                  additionalProperties: false,
                },
                drink: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    wuxingEffect: { type: "string" },
                  },
                  required: ["name", "description", "wuxingEffect"],
                  additionalProperties: false,
                },
                motto: { type: "string" },
              },
              required: ["menuName", "mainDishes", "sideDish", "drink", "motto"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      try {
        const menu = JSON.parse(content);
        return { success: true, menu };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 主廚菜單生成失敗，請稍後再試" });
      }
    }),

  /**
   * 取得用戶飲食偏好
   */
  getUserPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select()
        .from(userDietPreferences)
        .where(eq(userDietPreferences.userId, ctx.user.id))
        .limit(1);
      if (rows.length === 0) {
        return {
          healthTags: [] as string[],
          budgetPreference: "mid",
          dislikedElements: [] as string[],
        };
      }
      const pref = rows[0];
      return {
        healthTags: pref.healthTags ? JSON.parse(pref.healthTags) : [],
        budgetPreference: pref.budgetPreference ?? "mid",
        dislikedElements: pref.dislikedElements ? JSON.parse(pref.dislikedElements) : [],
      };
    }),

  /**
   * 更新用戶飲食偏好
   */
  updateUserPreferences: protectedProcedure
    .input(z.object({
      healthTags: z.array(z.string()).default([]),
      budgetPreference: z.enum(["budget", "mid", "premium"]).default("mid"),
      dislikedElements: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const healthTagsJson = JSON.stringify(input.healthTags);
      const dislikedElementsJson = JSON.stringify(input.dislikedElements);
      // Upsert
      const existing = await db.select({ id: userDietPreferences.id })
        .from(userDietPreferences)
        .where(eq(userDietPreferences.userId, ctx.user.id))
        .limit(1);
      if (existing.length > 0) {
        await db.update(userDietPreferences)
          .set({
            healthTags: healthTagsJson,
            budgetPreference: input.budgetPreference,
            dislikedElements: dislikedElementsJson,
          })
          .where(eq(userDietPreferences.userId, ctx.user.id));
      } else {
        await db.insert(userDietPreferences).values({
          userId: ctx.user.id,
          healthTags: healthTagsJson,
          budgetPreference: input.budgetPreference,
          dislikedElements: dislikedElementsJson,
        });
      }
      return { success: true };
    }),

  /**
   * 取得本週五行飲食分布統計（圓餅圖資料）
   */
  getWeeklyDietStats: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 取得7天內的飲食日誌
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startDate = sevenDaysAgo.toISOString().split("T")[0];
      const logs = await db.select()
        .from(dietaryLogs)
        .where(eq(dietaryLogs.userId, ctx.user.id))
        .orderBy(desc(dietaryLogs.logDate))
        .limit(300);
      // 字串比較過濾最近7天
      const recentLogs = logs.filter(l => l.logDate >= startDate);
      // 五行計數
      const elementCount: Record<string, number> = { "火": 0, "木": 0, "水": 0, "土": 0, "金": 0 };
      for (const log of recentLogs) {
        const el = log.consumedElement;
        if (el in elementCount) elementCount[el] = (elementCount[el] ?? 0) + 1;
      }
      const total = recentLogs.length;
      const distribution = Object.entries(elementCount)
        .map(([element, count]) => ({
          element,
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
      // 每日分布
      const dailyMap: Record<string, Record<string, number>> = {};
      for (const log of recentLogs) {
        if (!dailyMap[log.logDate]) dailyMap[log.logDate] = { "火": 0, "木": 0, "水": 0, "土": 0, "金": 0 };
        const el = log.consumedElement;
        if (el in dailyMap[log.logDate]!) {
          dailyMap[log.logDate]![el] = (dailyMap[log.logDate]![el] ?? 0) + 1;
        }
      }
      const dailyDistribution = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, counts]) => ({ date, ...(counts as Record<string, number>) }));
      return { distribution, dailyDistribution, totalLogs: total, startDate };
    }),
});
