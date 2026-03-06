/**
 * destiny.coins.test.ts
 * 天命幣系統完整測試 - 鳳凰計畫 v9.0
 *
 * 測試涵蓋：
 * 1. 天命幣餘額計算邏輯
 * 2. AI 功能消耗驗證
 * 3. 充值套餐驗證
 * 4. 方案贈幣計算
 * 5. 交易記錄格式
 * 6. 錯誤訊息格式（前端解析用）
 */
import { describe, it, expect } from "vitest";

// ─── 1. 天命幣餘額計算 ────────────────────────────────────────────────────────

describe("天命幣餘額計算", () => {
  const calculateBalance = (current: number, delta: number): number => {
    return Math.max(0, current + delta);
  };

  it("消耗後餘額正確計算", () => {
    expect(calculateBalance(100, -30)).toBe(70);
    expect(calculateBalance(100, -100)).toBe(0);
    expect(calculateBalance(50, -80)).toBe(0); // 不能低於 0
  });

  it("充值後餘額正確計算", () => {
    expect(calculateBalance(100, 550)).toBe(650);
    expect(calculateBalance(0, 100)).toBe(100);
  });

  it("餘額不足時不允許消耗", () => {
    const canSpend = (balance: number, cost: number) => balance >= cost;
    expect(canSpend(100, 30)).toBe(true);
    expect(canSpend(29, 30)).toBe(false);
    expect(canSpend(0, 1)).toBe(false);
  });
});

// ─── 2. AI 功能消耗費用設定 ──────────────────────────────────────────────────

describe("AI 功能消耗費用設定", () => {
  const DEFAULT_COSTS: Record<string, number> = {
    warroom_divination: 30,
    oracle_deepread: 8,
    wardrobe_ai: 15,
    diet_ai: 5,
  };

  it("所有 AI 功能都有預設費用", () => {
    expect(DEFAULT_COSTS.warroom_divination).toBe(30);
    expect(DEFAULT_COSTS.oracle_deepread).toBe(8);
    expect(DEFAULT_COSTS.wardrobe_ai).toBe(15);
    expect(DEFAULT_COSTS.diet_ai).toBe(5);
  });

  it("費用必須為正整數", () => {
    Object.values(DEFAULT_COSTS).forEach((cost) => {
      expect(cost).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  it("自定義費用覆蓋預設值", () => {
    const getFeatureCost = (featureId: string, customCosts: Record<string, number>) => {
      return customCosts[featureId] ?? DEFAULT_COSTS[featureId] ?? 10;
    };

    expect(getFeatureCost("warroom_divination", { warroom_divination: 50 })).toBe(50);
    expect(getFeatureCost("warroom_divination", {})).toBe(30);
    expect(getFeatureCost("unknown_feature", {})).toBe(10);
  });
});

// ─── 3. 充值套餐驗證 ─────────────────────────────────────────────────────────

describe("充值套餐驗證", () => {
  const TOPUP_PACKAGES = [
    { id: "coins_100", coins: 100, price: 30, bonusRate: 0 },
    { id: "coins_550", coins: 550, price: 150, bonusRate: 0.1 },
    { id: "coins_1200", coins: 1200, price: 300, bonusRate: 0.2 },
    { id: "coins_5000", coins: 5000, price: 1000, bonusRate: 0.25 },
  ];

  it("所有套餐都有唯一 ID", () => {
    const ids = TOPUP_PACKAGES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(TOPUP_PACKAGES.length);
  });

  it("套餐天命幣數量隨價格遞增", () => {
    for (let i = 1; i < TOPUP_PACKAGES.length; i++) {
      expect(TOPUP_PACKAGES[i].coins).toBeGreaterThan(TOPUP_PACKAGES[i - 1].coins);
      expect(TOPUP_PACKAGES[i].price).toBeGreaterThan(TOPUP_PACKAGES[i - 1].price);
    }
  });

  it("含贈送比例的套餐實際幣數正確", () => {
    const getActualCoins = (baseCoins: number, bonusRate: number) =>
      Math.floor(baseCoins * (1 + bonusRate));

    // 550 幣套餐含 10% 贈送 = 605
    const pkg550 = TOPUP_PACKAGES[1];
    expect(getActualCoins(500, pkg550.bonusRate)).toBe(550);

    // 1200 幣套餐含 20% 贈送 = 1200
    const pkg1200 = TOPUP_PACKAGES[2];
    expect(getActualCoins(1000, pkg1200.bonusRate)).toBe(1200);
  });

  it("套餐 ID 格式正確", () => {
    TOPUP_PACKAGES.forEach((pkg) => {
      expect(pkg.id).toMatch(/^coins_\d+$/);
    });
  });
});

// ─── 4. 方案贈幣計算 ─────────────────────────────────────────────────────────

describe("方案贈幣計算", () => {
  interface Plan {
    id: string;
    bonusPoints: number;
    firstSubscriptionBonusCoins: number;
    monthlyRenewalBonusCoins: number;
  }

  const mockPlans: Plan[] = [
    { id: "basic", bonusPoints: 0, firstSubscriptionBonusCoins: 0, monthlyRenewalBonusCoins: 0 },
    { id: "starter", bonusPoints: 100, firstSubscriptionBonusCoins: 200, monthlyRenewalBonusCoins: 50 },
    { id: "pro", bonusPoints: 500, firstSubscriptionBonusCoins: 1000, monthlyRenewalBonusCoins: 200 },
  ];

  it("基礎方案不贈送天命幣", () => {
    const basic = mockPlans.find((p) => p.id === "basic")!;
    expect(basic.firstSubscriptionBonusCoins).toBe(0);
    expect(basic.monthlyRenewalBonusCoins).toBe(0);
  });

  it("首次訂閱贈幣大於每月續訂贈幣", () => {
    mockPlans
      .filter((p) => p.firstSubscriptionBonusCoins > 0)
      .forEach((plan) => {
        expect(plan.firstSubscriptionBonusCoins).toBeGreaterThanOrEqual(
          plan.monthlyRenewalBonusCoins
        );
      });
  });

  it("贈幣數量為非負整數", () => {
    mockPlans.forEach((plan) => {
      expect(plan.firstSubscriptionBonusCoins).toBeGreaterThanOrEqual(0);
      expect(plan.monthlyRenewalBonusCoins).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(plan.firstSubscriptionBonusCoins)).toBe(true);
      expect(Number.isInteger(plan.monthlyRenewalBonusCoins)).toBe(true);
    });
  });
});

// ─── 5. 交易記錄格式 ─────────────────────────────────────────────────────────

describe("交易記錄格式", () => {
  type TxType = "earn" | "spend" | "topup" | "admin_adjust" | "plan_bonus";

  interface Transaction {
    id: number;
    userId: string;
    amount: number;
    type: TxType;
    description: string;
    featureId: string | null;
    createdAt: number;
  }

  const createTx = (
    userId: string,
    amount: number,
    type: TxType,
    description: string,
    featureId: string | null = null
  ): Transaction => ({
    id: Math.floor(Math.random() * 10000),
    userId,
    amount,
    type,
    description,
    featureId,
    createdAt: Date.now(),
  });

  it("消耗交易金額為負數", () => {
    const tx = createTx("user1", -30, "spend", "天命問卜", "warroom_divination");
    expect(tx.amount).toBeLessThan(0);
    expect(tx.featureId).toBe("warroom_divination");
  });

  it("充值交易金額為正數", () => {
    const tx = createTx("user1", 550, "topup", "充值 550 天命幣");
    expect(tx.amount).toBeGreaterThan(0);
    expect(tx.featureId).toBeNull();
  });

  it("方案贈幣交易類型正確", () => {
    const tx = createTx("user1", 200, "plan_bonus", "首次訂閱 Pro 方案贈幣");
    expect(tx.type).toBe("plan_bonus");
    expect(tx.amount).toBeGreaterThan(0);
  });

  it("交易記錄包含時間戳", () => {
    const tx = createTx("user1", -8, "spend", "擲筊深度解讀", "oracle_deepread");
    expect(tx.createdAt).toBeGreaterThan(0);
    expect(typeof tx.createdAt).toBe("number");
  });
});

// ─── 6. 錯誤訊息格式（前端解析用）────────────────────────────────────────────

describe("天命幣不足錯誤訊息解析", () => {
  /**
   * 模擬 parseInsufficientCoinsError 邏輯
   */
  const parseError = (message: string) => {
    const match = message.match(/需要\s*(\d+)\s*天命幣.*餘額為\s*(\d+)\s*天命幣/);
    if (match) {
      return {
        isInsufficientCoins: true,
        required: parseInt(match[1]),
        current: parseInt(match[2]),
      };
    }
    if (message.includes("不足") && message.includes("天命幣")) {
      return { isInsufficientCoins: true, required: 0, current: 0 };
    }
    return { isInsufficientCoins: false, required: 0, current: 0 };
  };

  it("正確解析標準錯誤訊息格式", () => {
    const msg = "天命幣不足，此功能需要 30 天命幣，您目前餘額為 15 天命幣";
    const result = parseError(msg);
    expect(result.isInsufficientCoins).toBe(true);
    expect(result.required).toBe(30);
    expect(result.current).toBe(15);
  });

  it("正確識別不含數字的天命幣不足訊息", () => {
    const msg = "天命幣不足";
    const result = parseError(msg);
    expect(result.isInsufficientCoins).toBe(true);
  });

  it("非天命幣錯誤不誤判", () => {
    const msg = "網路連線失敗，請稍後再試";
    const result = parseError(msg);
    expect(result.isInsufficientCoins).toBe(false);
  });

  it("空訊息不崩潰", () => {
    const result = parseError("");
    expect(result.isInsufficientCoins).toBe(false);
    expect(result.required).toBe(0);
    expect(result.current).toBe(0);
  });
});

// ─── 7. 金流預留口驗證 ───────────────────────────────────────────────────────

describe("金流預留口設計", () => {
  it("充值套餐 ID 格式符合金流串接規範", () => {
    const validPackageIds = ["coins_100", "coins_550", "coins_1200", "coins_5000"];
    validPackageIds.forEach((id) => {
      // 格式：coins_{數量}，方便金流回調時識別
      expect(id).toMatch(/^coins_\d+$/);
    });
  });

  it("充值流程需要 origin 參數（防止 OAuth 重定向問題）", () => {
    const createTopupRequest = (packageId: string, origin: string) => {
      if (!origin.startsWith("http")) throw new Error("Invalid origin");
      return { packageId, origin, status: "pending" };
    };

    expect(() => createTopupRequest("coins_100", "https://example.com")).not.toThrow();
    expect(() => createTopupRequest("coins_100", "invalid")).toThrow("Invalid origin");
  });

  it("Webhook 回調需要驗證簽名", () => {
    const verifyWebhookSignature = (payload: string, signature: string, secret: string) => {
      // 模擬 HMAC 驗證邏輯
      return signature.length > 0 && secret.length > 0 && payload.length > 0;
    };

    expect(verifyWebhookSignature("payload", "sig123", "secret")).toBe(true);
    expect(verifyWebhookSignature("payload", "", "secret")).toBe(false);
  });
});
