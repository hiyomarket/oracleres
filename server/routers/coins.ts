/**
 * coins.ts - 天命幣核心路由（鳳凰計畫）
 *
 * 天命幣是「天命共振」系統的核心消耗貨幣，用於啟動所有 AI 功能。
 * 設計原則：
 * - pointsBalance 欄位同時作為「天命幣」的儲存欄位（前端顯示改為「天命幣」）
 * - 所有 AI 功能呼叫前必須先通過 spendCoins 扣款
 * - 餘額不足時拋出 PAYMENT_REQUIRED 錯誤，前端攔截後引導至天命小舖
 * - 所有交易記錄到 points_transactions 表，含 featureId 欄位追蹤功能使用
 */
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { users, pointsTransactions, features, plans } from "../../drizzle/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

// ============================================================
// 天命幣功能 ID 常數（對應 features 表的 id 欄位）
// ============================================================
export const COIN_FEATURE_IDS = {
  TOPIC_ADVICE: "warroom_divination",   // 天命問卜 - 30 幣
  DEEP_READ: "oracle",                   // 擲筊深度解讀 - 8 幣
  WARDROBE_SCAN: "wardrobe",             // 穿搭掃描 - 15 幣
  WARDROBE_ANALYZE: "wardrobe",          // 穿搭分析 - 15 幣
  DIET_AI_CHEF: "warroom_dietary",       // 天命菜單 - 5 幣
} as const;

// ============================================================
// 核心工具函數：扣除天命幣（供其他 router 呼叫）
// ============================================================

/**
 * 扣除天命幣的核心函數
 * 此函數由所有 AI 功能路由在呼叫 LLM 前調用
 * @param userId - 用戶 ID
 * @param featureId - 功能 ID（對應 features.id）
 * @param overrideCost - 覆蓋消耗量（若不傳則從 features 表讀取）
 * @returns 扣款後的新餘額
 * @throws TRPCError PAYMENT_REQUIRED - 餘額不足
 * @throws TRPCError NOT_FOUND - 功能不存在
 */
export async function spendCoins(
  userId: number,
  featureId: string,
  overrideCost?: number
): Promise<{ newBalance: number; cost: number }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

  // 1. 查詢功能定價（若有 override 則跳過）
  let cost = overrideCost ?? 0;
  if (overrideCost === undefined) {
    const [feature] = await db
      .select({ coinCostPerUse: features.coinCostPerUse })
      .from(features)
      .where(eq(features.id, featureId))
      .limit(1);

    if (!feature) {
      // 功能不在 features 表中，視為免費（不阻擋）
      return { newBalance: -1, cost: 0 };
    }
    cost = feature.coinCostPerUse ?? 0;
  }

  // 免費功能直接放行
  if (cost <= 0) {
    return { newBalance: -1, cost: 0 };
  }

  // 2. 查詢用戶當前天命幣餘額
  const [user] = await db
    .select({ pointsBalance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
  }

  const balance = Number(user.pointsBalance ?? 0);

  // 3. 餘額不足檢查
  if (balance < cost) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `天命幣不足，此功能需要 ${cost} 天命幣，您目前餘額為 ${balance} 天命幣`,
    });
  }

  // 4. 執行扣款（原子操作）
  const newBalance = balance - cost;
  await db
    .update(users)
    .set({ pointsBalance: newBalance })
    .where(eq(users.id, userId));

  // 5. 記錄交易流水
  await db.insert(pointsTransactions).values({
    userId,
    amount: -cost,
    type: "spend",
    description: `消耗天命幣：${featureId}`,
    featureId,
  });

  return { newBalance, cost };
}

/**
 * 增加天命幣（充值/贈送/訂閱獎勵）
 * @param userId - 用戶 ID
 * @param amount - 增加數量（正整數）
 * @param type - 交易類型：top-up / bonus / admin_grant / daily_signin
 * @param description - 描述
 * @param featureId - 關聯功能 ID（可選）
 * @param paymentOrderId - 金流訂單 ID（充值時使用）
 */
export async function addCoins(
  userId: number,
  amount: number,
  type: string,
  description: string,
  featureId?: string,
  paymentOrderId?: string
): Promise<{ newBalance: number }> {
  const db = await getDb();
  if (!db) throw new Error("資料庫連線失敗");

  if (amount <= 0) {
    throw new Error("增加天命幣數量必須為正整數");
  }

  // 原子增加餘額
  await db
    .update(users)
    .set({ pointsBalance: sql`pointsBalance + ${amount}` })
    .where(eq(users.id, userId));

  // 查詢新餘額
  const [updated] = await db
    .select({ pointsBalance: users.pointsBalance })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 記錄交易
  await db.insert(pointsTransactions).values({
    userId,
    amount,
    type,
    description,
    featureId: featureId ?? null,
    paymentOrderId: paymentOrderId ?? null,
  });

  return { newBalance: Number(updated?.pointsBalance ?? 0) };
}

// ============================================================
// tRPC 路由
// ============================================================

export const coinsRouter = router({
  /**
   * 查詢天命幣餘額與最近交易記錄
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    const [user] = await db
      .select({ pointsBalance: users.pointsBalance })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const transactions = await db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, ctx.user.id))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(20);

    return {
      balance: Number(user?.pointsBalance ?? 0),
      transactions,
    };
  }),

  /**
   * 查詢所有 AI 功能的天命幣消耗定價
   * 前端用此 API 動態顯示各功能按鈕的消耗量
   */
  getFeaturePricing: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {};
    const allFeatures = await db
      .select({
        id: features.id,
        name: features.name,
        coinCostPerUse: features.coinCostPerUse,
      })
      .from(features);

    // 轉為 { featureId: cost } 的 map
    const pricing: Record<string, number> = {};
    for (const f of allFeatures) {
      pricing[f.id] = f.coinCostPerUse ?? 0;
    }
    return pricing;
  }),

  /**
   * 充值天命幣（金流預留口）
   * 目前返回「即將開放」，等金流串接後替換為實際邏輯
   */
  initiateTopup: protectedProcedure
    .input(
      z.object({
        packageId: z.enum(["coins_100", "coins_550", "coins_1200", "coins_5000"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 【金流預留口】
      // 當 Stripe / 綠界 / 藍新 等金流串接後，此處替換為：
      // 1. 建立支付訂單
      // 2. 返回支付跳轉 URL
      // 3. Webhook 回調後呼叫 addCoins()
      
      const PACKAGES = {
        coins_100: { coins: 100, price: 30, label: "100 天命幣" },
        coins_550: { coins: 550, price: 150, label: "550 天命幣（贈10%）" },
        coins_1200: { coins: 1200, price: 300, label: "1200 天命幣（贈20%）" },
        coins_5000: { coins: 5000, price: 1000, label: "5000 天命幣（贈25%）" },
      };

      const pkg = PACKAGES[input.packageId];
      
      // 暫時：直接發放（測試用，正式上線前移除）
      // 正式環境應改為建立支付訂單並返回支付 URL
      return {
        status: "pending_payment",
        message: "金流功能即將開放，敬請期待",
        package: pkg,
        // paymentUrl: "https://payment.example.com/...",  // 金流串接後填入
      };
    }),

  /**
   * 金流 Webhook 回調處理（預留口）
   * 金流服務商支付成功後呼叫此端點
   */
  handlePaymentWebhook: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        packageId: z.string(),
        signature: z.string(), // 金流簽名驗證
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 【金流 Webhook 預留口】
      // 正式串接時：
      // 1. 驗證 signature（防偽造）
      // 2. 查詢訂單狀態確認支付成功
      // 3. 呼叫 addCoins() 增加天命幣
      // 4. 標記訂單為已處理（防重複發放）
      
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "金流功能尚未開放",
      });
    }),

  // ============================================================
  // 管理員功能
  // ============================================================

  /**
   * 管理員：更新功能的天命幣消耗定價
   */
  adminUpdateFeaturePricing: adminProcedure
    .input(
      z.object({
        featureId: z.string(),
        coinCostPerUse: z.number().int().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      await db
        .update(features)
        .set({ coinCostPerUse: input.coinCostPerUse })
        .where(eq(features.id, input.featureId));

      return { success: true };
    }),

  /**
   * 管理員：更新方案的贈幣設定
   */
  adminUpdatePlanBonusCoins: adminProcedure
    .input(
      z.object({
        planId: z.string(),
        firstSubscriptionBonusCoins: z.number().int().min(0),
        monthlyRenewalBonusCoins: z.number().int().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      await db
        .update(plans)
        .set({
          firstSubscriptionBonusCoins: input.firstSubscriptionBonusCoins,
          monthlyRenewalBonusCoins: input.monthlyRenewalBonusCoins,
        })
        .where(eq(plans.id, input.planId));

      return { success: true };
    }),

  /**
   * 管理員：手動發放天命幣給用戶
   */
  adminGrantCoins: adminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        amount: z.number().int().min(1),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const result = await addCoins(
        input.userId,
        input.amount,
        "admin_grant",
        `管理員發放：${input.reason}`
      );
      return result;
    }),

  /**
   * 管理員：查詢天命幣使用統計（AI 成本分析）
   */
  adminGetUsageStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

    // 按功能分組統計消耗
    const byFeature = await db.execute(sql`
      SELECT 
        featureId,
        COUNT(*) as callCount,
        SUM(ABS(amount)) as totalCoins,
        DATE(createdAt) as date
      FROM points_transactions
      WHERE type = 'spend' AND featureId IS NOT NULL
      GROUP BY featureId, DATE(createdAt)
      ORDER BY date DESC, totalCoins DESC
      LIMIT 100
    `);

    // 今日總消耗
    const todayStats = await db.execute(sql`
      SELECT 
        featureId,
        COUNT(*) as callCount,
        SUM(ABS(amount)) as totalCoins
      FROM points_transactions
      WHERE type = 'spend' 
        AND featureId IS NOT NULL
        AND DATE(createdAt) = DATE(NOW())
      GROUP BY featureId
      ORDER BY totalCoins DESC
    `);

    // 總充值統計
    const topupStats = await db.execute(sql`
      SELECT 
        COUNT(*) as topupCount,
        SUM(amount) as totalTopup
      FROM points_transactions
      WHERE type = 'top-up'
    `);

    return {
      byFeature: byFeature[0],
      todayStats: todayStats[0],
      topupStats: topupStats[0],
    };
  }),
});
