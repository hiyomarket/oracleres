/**
 * yangzhai.ts
 * 陽宅開運系統 API：
 * - 每日方位吉凶報告（結合八宅 + 流日動態加權）
 * - 衝突解決分析（八宅 vs 五行喜忌）
 * - 形煞識別（LLM 照片分析 + 問答診斷）
 * - 避小人方位建議
 * - 後台管理：八宅星分數、流日加權、形煞庫、化解物品庫
 * - 分析記錄儲存與歷史查詢
 */
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getUserProfileForEngine } from "../db";
import {
  yangzhaiConfig,
  remedyItems as remedyItemsTable,
  yangzhaiAnalyses,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// 引擎 imports
import {
  getDirectionAnalysis,
  getFullBazhaiAnalysis,
  calculateMingGua,
  type Gender,
  type Direction,
} from "../lib/bazhai";
import {
  getDailyDirectionReport,
  type EarthlyBranch,
  type DailyDirectionConfig,
  DEFAULT_DAILY_CONFIG,
} from "../lib/dailyDirectionEngine";
import {
  getConflictReport,
  getAllDefaultRemedyItems,
  type WuXing,
} from "../lib/fengshuiConflictResolver";
import {
  detectFormSha,
  diagnoseByDescription,
  DEFAULT_FORM_SHA_LIBRARY,
  type FormSha,
} from "../lib/formShaDetector";

// ═══ 工具函數 ═══

/** 從 DB 讀取陽宅設定（帶快取 key） */
async function getYangzhaiConfigValue<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = (await getDb())!;
    const rows = await db
      .select()
      .from(yangzhaiConfig)
      .where(and(eq(yangzhaiConfig.configKey, key), eq(yangzhaiConfig.isActive, 1)))
      .limit(1);
    if (rows.length > 0 && rows[0].configValue !== null) {
      return rows[0].configValue as T;
    }
  } catch (e) {
    console.warn(`Failed to load yangzhai config '${key}':`, e);
  }
  return defaultValue;
}

/** 取得流日地支（簡化版，從 wuxingEngine 的邏輯） */
function getDayBranch(date: Date): EarthlyBranch {
  const BRANCHES: EarthlyBranch[] = [
    '子', '丑', '寅', '卯', '辰', '巳',
    '午', '未', '申', '酉', '戌', '亥',
  ];
  // 基準日：2000-01-07 為甲子日
  const baseDate = new Date(2000, 0, 7);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / 86400000);
  const branchIndex = ((diffDays % 12) + 12) % 12;
  return BRANCHES[branchIndex];
}

/** 從 profile 取得性別 */
function getGenderFromProfile(profile: any): Gender {
  if (profile.gender === '女' || profile.gender === 'female' || profile.gender === 'F') {
    return '女';
  }
  return '男';
}

// ═══ Router 定義 ═══

export const yangzhaiRouter = router({

  // ────────────────────────────────────────────
  // 前端 API
  // ────────────────────────────────────────────

  /** 取得每日方位吉凶報告 */
  getDailyDirections: protectedProcedure
    .input(z.object({
      date: z.string().optional(), // YYYY-MM-DD，預設今天
    }).optional())
    .query(async ({ ctx, input }) => {
      const profile = await getUserProfileForEngine(ctx.user.id);
      const targetDate = input?.date ? new Date(input.date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayBranch = getDayBranch(targetDate);
      const gender = getGenderFromProfile(profile);
      const birthYear = profile.birthYear || 1990;

      // 從後台讀取可調參數
      const dailyConfig = await getYangzhaiConfigValue<Partial<DailyDirectionConfig>>(
        'daily_direction_config', {}
      );
      const starScores = await getYangzhaiConfigValue<Record<string, number> | null>(
        'bazhai_star_scores', null
      );
      if (starScores) {
        dailyConfig.starScores = starScores as any;
      }

      // 喜忌神
      const favorableElements = (profile as any).favorableElements || ['木', '火'];
      const unfavorableElements = (profile as any).unfavorableElements || ['金'];

      const report = getDailyDirectionReport(
        birthYear,
        gender,
        dayBranch,
        favorableElements,
        unfavorableElements,
        dateStr,
        dailyConfig,
      );

      // 加入避小人建議
      const villainConfig = await getYangzhaiConfigValue<any>('villain_direction_config', null);
      const villainAdvice = villainConfig?.customAdvice ||
        `今日小人方在${report.villainDirection}方（禍害位），避免在此方向與人爭執或談判。` +
        `如果座位朝向此方，可在桌上放一杯清水化解。`;

      return {
        ...report,
        villainAdvice,
        kuaNumber: calculateMingGua(birthYear, gender),
      };
    }),

  /** 取得八宅基礎分析（不含流日動態） */
  getBazhaiAnalysis: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await getUserProfileForEngine(ctx.user.id);
      const gender = getGenderFromProfile(profile);
      const birthYear = profile.birthYear || 1990;

      const starScores = await getYangzhaiConfigValue<Record<string, number> | null>(
        'bazhai_star_scores', null
      );

      return getFullBazhaiAnalysis(birthYear, gender, starScores as any);
    }),

  /** 取得衝突解決報告 */
  getConflictAnalysis: protectedProcedure
    .query(async ({ ctx }) => {
      const profile = await getUserProfileForEngine(ctx.user.id);
      const favorableElements = ((profile as any).favorableElements || ['木', '火']) as WuXing[];
      const unfavorableElements = ((profile as any).unfavorableElements || ['金']) as WuXing[];

      // 從後台讀取自訂化解物品
      const customRemedies = await getYangzhaiConfigValue<any>('custom_remedy_items', null);

      return getConflictReport(favorableElements, unfavorableElements, customRemedies);
    }),

  /** 形煞照片分析 */
  analyzeFormShaPhoto: protectedProcedure
    .input(z.object({
      photoUrl: z.string().url(),
      context: z.string().optional(), // 如 "辦公桌" / "租屋房間"
    }))
    .mutation(async ({ ctx, input }) => {
      // 從後台讀取形煞庫設定
      const shaLibrary = await getYangzhaiConfigValue<FormSha[] | null>(
        'form_sha_library', null
      );

      const report = await detectFormSha(
        input.photoUrl,
        shaLibrary || undefined,
        input.context,
      );

      // 儲存分析記錄
      const db = (await getDb())!;
      await db.insert(yangzhaiAnalyses).values({
        userId: String(ctx.user.id),
        analysisType: 'form_sha_photo',
        result: report,
        score: report.overallScore ?? null,
        photoUrl: input.photoUrl,
        sceneDescription: input.context || '辦公環境',
      });

      return report;
    }),

  /** 形煞問答診斷（不需要照片） */
  diagnoseFormShaQuiz: protectedProcedure
    .input(z.object({
      answers: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const shaLibrary = await getYangzhaiConfigValue<FormSha[] | null>(
        'form_sha_library', null
      );

      const report = await diagnoseByDescription(
        input.answers,
        shaLibrary || undefined,
      );

      // 儲存分析記錄
      const db = (await getDb())!;
      await db.insert(yangzhaiAnalyses).values({
        userId: String(ctx.user.id),
        analysisType: 'form_sha_quiz',
        result: report,
        score: report.overallScore ?? null,
        sceneDescription: JSON.stringify(input.answers),
      });

      return report;
    }),

  /** 取得分析歷史 */
  getAnalysisHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const limit = input?.limit || 10;

      const baseCondition = eq(yangzhaiAnalyses.userId, String(ctx.user.id));
      const typeCondition = input?.type ? eq(yangzhaiAnalyses.analysisType, input.type) : undefined;
      const whereClause = typeCondition ? and(baseCondition, typeCondition) : baseCondition;

      return db
        .select()
        .from(yangzhaiAnalyses)
        .where(whereClause)
        .orderBy(desc(yangzhaiAnalyses.createdAt))
        .limit(limit);
    }),

  /** 提交分析反饋 */
  submitFeedback: protectedProcedure
    .input(z.object({
      analysisId: z.number(),
      feedback: z.enum(['helpful', 'not_helpful']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      await db
        .update(yangzhaiAnalyses)
        .set({ feedback: input.feedback })
        .where(and(
          eq(yangzhaiAnalyses.id, input.analysisId),
          eq(yangzhaiAnalyses.userId, String(ctx.user.id)),
        ));
      return { success: true };
    }),

  // ────────────────────────────────────────────
  // 後台管理 API（Admin Only）
  // ────────────────────────────────────────────

  admin: router({

    /** 取得所有陽宅設定 */
    getAllConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;
        return db.select().from(yangzhaiConfig).orderBy(yangzhaiConfig.category);
      }),

    /** 更新設定值 */
    updateConfig: protectedProcedure
      .input(z.object({
        key: z.string(),
        value: z.any(),
        description: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;

        // Upsert
        const existing = await db
          .select()
          .from(yangzhaiConfig)
          .where(eq(yangzhaiConfig.configKey, input.key))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(yangzhaiConfig)
            .set({
              configValue: input.value,
              description: input.description || existing[0].description,
              category: input.category || existing[0].category,
              updatedBy: String(ctx.user.name || ctx.user.id),
              updatedAt: Date.now(),
            })
            .where(eq(yangzhaiConfig.configKey, input.key));
        } else {
          await db.insert(yangzhaiConfig).values({
            configKey: input.key,
            configValue: input.value,
            description: input.description || '',
            category: input.category || 'general',
            updatedBy: String(ctx.user.name || ctx.user.id),
          });
        }

        return { success: true };
      }),

    /** 初始化預設設定（首次使用時呼叫） */
    initDefaults: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;

        const defaults = [
          {
            configKey: 'bazhai_star_scores',
            configValue: {
              '生氣': 90, '天醫': 85, '延年': 80, '伏位': 60,
              '絕命': 15, '五鬼': 20, '六煞': 30, '禍害': 35,
            },
            description: '八宅八星基礎分數（0-100），數值越高越吉',
            category: 'bazhai',
          },
          {
            configKey: 'daily_direction_config',
            configValue: DEFAULT_DAILY_CONFIG,
            description: '流日方位加權係數：六沖扣分、三煞扣分、喜用神加分、忌神扣分',
            category: 'daily',
          },
          {
            configKey: 'form_sha_library',
            configValue: DEFAULT_FORM_SHA_LIBRARY,
            description: '形煞識別庫：定義所有可識別的形煞類型、優先級和化解方案',
            category: 'formsha',
          },
          {
            configKey: 'villain_direction_config',
            configValue: {
              customAdvice: null,
              enableDailyVillainTip: true,
              villainStar: '禍害',
            },
            description: '避小人方位設定：自訂建議文案、是否啟用每日提示',
            category: 'villain',
          },
          {
            configKey: 'remedy_display_config',
            configValue: {
              maxItemsPerElement: 5,
              showPriceRange: true,
              showAffordableTag: true,
              preferAffordable: true,
            },
            description: '化解物品顯示設定：每個五行最多顯示幾個物品、是否顯示價格',
            category: 'display',
          },
        ];

        let created = 0;
        for (const d of defaults) {
          const existing = await db
            .select()
            .from(yangzhaiConfig)
            .where(eq(yangzhaiConfig.configKey, d.configKey))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(yangzhaiConfig).values({
              configKey: d.configKey,
              configValue: d.configValue,
              description: d.description,
              category: d.category,
              updatedBy: String(ctx.user.name || ctx.user.id),
            });
            created++;
          }
        }

        return { success: true, created, total: defaults.length };
      }),

    /** 取得所有化解物品 */
    getAllRemedyItems: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;
        return db
          .select()
          .from(remedyItemsTable)
          .orderBy(remedyItemsTable.element, remedyItemsTable.sortOrder);
      }),

    /** 新增化解物品 */
    createRemedyItem: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        element: z.string(),
        category: z.string(),
        description: z.string().optional(),
        priceRange: z.string().optional(),
        isAffordable: z.number().min(0).max(1).optional(),
        applicableScene: z.string().optional(),
        applicableShaIds: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;
        const result = await db.insert(remedyItemsTable).values({
          name: input.name,
          element: input.element,
          category: input.category,
          description: input.description || null,
          priceRange: input.priceRange || null,
          isAffordable: input.isAffordable ?? 1,
          applicableScene: input.applicableScene || 'both',
          applicableShaIds: input.applicableShaIds || null,
          imageUrl: input.imageUrl || null,
          sortOrder: input.sortOrder || 0,
        });
        return { success: true, id: result[0].insertId };
      }),

    /** 更新化解物品 */
    updateRemedyItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        element: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        priceRange: z.string().optional(),
        isAffordable: z.number().min(0).max(1).optional(),
        applicableScene: z.string().optional(),
        applicableShaIds: z.array(z.string()).optional(),
        imageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;
        const { id, ...updates } = input;
        await db
          .update(remedyItemsTable)
          .set({ ...updates, updatedAt: Date.now() } as any)
          .where(eq(remedyItemsTable.id, id));
        return { success: true };
      }),

    /** 刪除（停用）化解物品 */
    toggleRemedyItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.number().min(0).max(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;
        await db
          .update(remedyItemsTable)
          .set({ isActive: input.isActive, updatedAt: Date.now() })
          .where(eq(remedyItemsTable.id, input.id));
        return { success: true };
      }),

    /** 取得形煞庫（從 config 讀取） */
    getFormShaLibrary: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getYangzhaiConfigValue<FormSha[]>('form_sha_library', DEFAULT_FORM_SHA_LIBRARY);
      }),

    /** 更新形煞庫（整體替換） */
    updateFormShaLibrary: protectedProcedure
      .input(z.object({
        library: z.array(z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          priority: z.enum(['critical', 'high', 'medium', 'low']),
          category: z.enum(['office', 'rental', 'both']),
          detection_keywords: z.array(z.string()),
          remedy: z.string(),
          remedy_items: z.array(z.string()),
          enabled: z.boolean(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;

        const existing = await db
          .select()
          .from(yangzhaiConfig)
          .where(eq(yangzhaiConfig.configKey, 'form_sha_library'))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(yangzhaiConfig)
            .set({
              configValue: input.library,
              updatedBy: String(ctx.user.name || ctx.user.id),
              updatedAt: Date.now(),
            })
            .where(eq(yangzhaiConfig.configKey, 'form_sha_library'));
        } else {
          await db.insert(yangzhaiConfig).values({
            configKey: 'form_sha_library',
            configValue: input.library,
            description: '形煞識別庫',
            category: 'formsha',
            updatedBy: String(ctx.user.name || ctx.user.id),
          });
        }

        return { success: true };
      }),

    /** 取得分析統計 */
    getAnalyticsStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const db = (await getDb())!;

        const stats = await db
          .select({
            analysisType: yangzhaiAnalyses.analysisType,
            count: sql<number>`count(*)`,
            avgScore: sql<number>`avg(${yangzhaiAnalyses.score})`,
            helpfulCount: sql<number>`sum(case when ${yangzhaiAnalyses.feedback} = 'helpful' then 1 else 0 end)`,
            notHelpfulCount: sql<number>`sum(case when ${yangzhaiAnalyses.feedback} = 'not_helpful' then 1 else 0 end)`,
          })
          .from(yangzhaiAnalyses)
          .groupBy(yangzhaiAnalyses.analysisType);

        const totalAnalyses = await db
          .select({ count: sql<number>`count(*)` })
          .from(yangzhaiAnalyses);

        return {
          byType: stats,
          total: totalAnalyses[0]?.count || 0,
        };
      }),
  }),
});
