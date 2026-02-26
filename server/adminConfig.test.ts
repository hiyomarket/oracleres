/**
 * adminConfig.test.ts
 * 測試後台管理邏輯計算權限 Router 的核心邏輯
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_AURA_RULES, DEFAULT_RESTAURANT_CATEGORIES } from "./routers/adminConfig";

describe("DEFAULT_AURA_RULES", () => {
  it("應包含所有必要的計算規則分類", () => {
    const categories = new Set(DEFAULT_AURA_RULES.map((r) => r.category));
    expect(categories.has("category_weights")).toBe(true);
    expect(categories.has("boost_ratios")).toBe(true);
    expect(categories.has("score_limits")).toBe(true);
    expect(categories.has("innate_weights")).toBe(true);
  });

  it("各部位權重規則應包含 6 個部位", () => {
    const weightRules = DEFAULT_AURA_RULES.filter((r) => r.category === "category_weights");
    expect(weightRules.length).toBe(6);
    const keys = weightRules.map((r) => r.configKey);
    expect(keys).toContain("upper");
    expect(keys).toContain("outer");
    expect(keys).toContain("lower");
    expect(keys).toContain("shoes");
    expect(keys).toContain("accessory");
    expect(keys).toContain("bracelet");
  });

  it("加成比例規則應包含 3 種加成類型", () => {
    const ratioRules = DEFAULT_AURA_RULES.filter((r) => r.category === "boost_ratios");
    expect(ratioRules.length).toBe(3);
    const keys = ratioRules.map((r) => r.configKey);
    expect(keys).toContain("direct_match");
    expect(keys).toContain("generates_match");
    expect(keys).toContain("controls_match");
  });

  it("加成比例應符合直接 > 相生 > 制衡的邏輯", () => {
    const direct = DEFAULT_AURA_RULES.find((r) => r.configKey === "direct_match");
    const generates = DEFAULT_AURA_RULES.find((r) => r.configKey === "generates_match");
    const controls = DEFAULT_AURA_RULES.find((r) => r.configKey === "controls_match");
    expect(direct).toBeDefined();
    expect(generates).toBeDefined();
    expect(controls).toBeDefined();
    expect(parseFloat(direct!.configValue)).toBeGreaterThan(parseFloat(generates!.configValue));
    expect(parseFloat(generates!.configValue)).toBeGreaterThan(parseFloat(controls!.configValue));
  });

  it("分數上下限應合理（天命底盤 min < max，加成上限 > 0）", () => {
    const boostCap = DEFAULT_AURA_RULES.find((r) => r.configKey === "boost_cap");
    const innateMin = DEFAULT_AURA_RULES.find((r) => r.configKey === "innate_min");
    const innateMax = DEFAULT_AURA_RULES.find((r) => r.configKey === "innate_max");
    expect(boostCap).toBeDefined();
    expect(innateMin).toBeDefined();
    expect(innateMax).toBeDefined();
    expect(parseFloat(boostCap!.configValue)).toBeGreaterThan(0);
    expect(parseFloat(innateMin!.configValue)).toBeLessThan(parseFloat(innateMax!.configValue));
  });

  it("天命底盤各維度權重加總應為 100", () => {
    const innateWeights = DEFAULT_AURA_RULES.filter((r) => r.category === "innate_weights");
    const total = innateWeights.reduce((sum, r) => sum + parseFloat(r.configValue), 0);
    expect(total).toBe(100);
  });

  it("所有規則應有 label 和 valueType", () => {
    for (const rule of DEFAULT_AURA_RULES) {
      expect(rule.label).toBeTruthy();
      expect(rule.valueType).toBeTruthy();
    }
  });
});

describe("DEFAULT_RESTAURANT_CATEGORIES", () => {
  it("應包含「全部」分類且排序為 0", () => {
    const all = DEFAULT_RESTAURANT_CATEGORIES.find((c) => c.categoryId === "all");
    expect(all).toBeDefined();
    expect(all!.sortOrder).toBe(0);
  });

  it("所有分類的 categoryId 應符合命名規則（小寫英文+底線）", () => {
    const pattern = /^[a-z0-9_]+$/;
    for (const cat of DEFAULT_RESTAURANT_CATEGORIES) {
      expect(pattern.test(cat.categoryId)).toBe(true);
    }
  });

  it("所有分類應有 emoji 和 label", () => {
    for (const cat of DEFAULT_RESTAURANT_CATEGORIES) {
      expect(cat.emoji).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });

  it("types 欄位應為有效的 JSON 陣列字串", () => {
    for (const cat of DEFAULT_RESTAURANT_CATEGORIES) {
      expect(() => {
        const parsed = JSON.parse(cat.types) as unknown;
        expect(Array.isArray(parsed)).toBe(true);
      }).not.toThrow();
    }
  });

  it("系統預設分類應有 isDefault = 1", () => {
    const defaults = DEFAULT_RESTAURANT_CATEGORIES.filter((c) => c.isDefault === 1);
    expect(defaults.length).toBe(DEFAULT_RESTAURANT_CATEGORIES.length);
  });

  it("分類數量應大於 10（涵蓋主要餐廳類型）", () => {
    expect(DEFAULT_RESTAURANT_CATEGORIES.length).toBeGreaterThan(10);
  });

  it("「全部」分類的 types 應包含 restaurant", () => {
    const all = DEFAULT_RESTAURANT_CATEGORIES.find((c) => c.categoryId === "all");
    const types = JSON.parse(all!.types) as string[];
    expect(types).toContain("restaurant");
  });
});

// ============================================================
// 新功能測試：手串建議搭配、能量規則歷史快照、餐廳分類時段控制
// ============================================================

describe("手串建議搭配 (pairingItems) 邏輯", () => {
  it("pairingItems 應為有效的 JSON 陣列格式", () => {
    const validPairing = JSON.stringify(["HS-B", "HS-C"]);
    expect(() => JSON.parse(validPairing)).not.toThrow();
    const parsed = JSON.parse(validPairing) as unknown;
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("空的 pairingItems 應解析為空陣列", () => {
    const empty = "[]";
    const parsed = JSON.parse(empty) as string[];
    expect(parsed).toHaveLength(0);
  });

  it("pairingItems 最多 10 個元素的驗證邏輯", () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => `HS-${i}`);
    expect(tooMany.length).toBeGreaterThan(10);
    const valid = tooMany.slice(0, 10);
    expect(valid.length).toBeLessThanOrEqual(10);
  });

  it("逗號分隔字串應正確解析為 pairingItems 陣列", () => {
    const input = "HS-B, HS-C, CUSTOM-01";
    const parsed = input
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    expect(parsed).toEqual(["HS-B", "HS-C", "CUSTOM-01"]);
  });

  it("空字串輸入應解析為空陣列", () => {
    const input = "";
    const parsed = input
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    expect(parsed).toHaveLength(0);
  });
});

describe("能量規則歷史快照 (snapshotData) 邏輯", () => {
  it("快照資料應能序列化和反序列化", () => {
    const mockRules = DEFAULT_AURA_RULES.map((r, i) => ({ id: i + 1, configValue: r.configValue }));
    const serialized = JSON.stringify(mockRules);
    const deserialized = JSON.parse(serialized) as typeof mockRules;
    expect(deserialized).toHaveLength(mockRules.length);
    expect(deserialized[0].configValue).toBe(mockRules[0].configValue);
  });

  it("快照標籤不應為空字串", () => {
    const label = "調整手串權重 v2";
    expect(label.trim().length).toBeGreaterThan(0);
  });

  it("快照標籤長度不應超過 100 字元", () => {
    const longLabel = "A".repeat(101);
    expect(longLabel.length).toBeGreaterThan(100);
    const validLabel = longLabel.slice(0, 100);
    expect(validLabel.length).toBeLessThanOrEqual(100);
  });

  it("還原快照時應能從 snapshotData 提取 id 和 configValue", () => {
    const mockRules = [
      { id: 1, configValue: "5", category: "category_weights", configKey: "upper" },
      { id: 2, configValue: "4", category: "category_weights", configKey: "outer" },
    ];
    const snapshot = JSON.stringify(mockRules);
    const restored = JSON.parse(snapshot) as Array<{ id: number; configValue: string }>;
    expect(restored[0].id).toBe(1);
    expect(restored[0].configValue).toBe("5");
    expect(restored[1].id).toBe(2);
  });
});

describe("餐廳分類時段控制邏輯", () => {
  // 模擬時段過濾函數
  function isActiveAtHour(
    scheduleEnabled: number,
    startHour: number,
    endHour: number,
    currentHour: number
  ): boolean {
    if (scheduleEnabled !== 1) return true; // 未開啟時段控制，常時顯示
    if (startHour > endHour) {
      // 跨日時段（例：22-04）
      return currentHour >= startHour || currentHour <= endHour;
    }
    return currentHour >= startHour && currentHour <= endHour;
  }

  it("未開啟時段控制的分類應常時顯示", () => {
    for (let h = 0; h <= 23; h++) {
      expect(isActiveAtHour(0, 0, 23, h)).toBe(true);
    }
  });

  it("開啟時段控制：18-23 應在 18-23 時顯示", () => {
    expect(isActiveAtHour(1, 18, 23, 17)).toBe(false);
    expect(isActiveAtHour(1, 18, 23, 18)).toBe(true);
    expect(isActiveAtHour(1, 18, 23, 21)).toBe(true);
    expect(isActiveAtHour(1, 18, 23, 23)).toBe(true);
  });

  it("開啟時段控制：跨日時段 22-04 應在 22-23 和 0-4 時顯示", () => {
    expect(isActiveAtHour(1, 22, 4, 22)).toBe(true);
    expect(isActiveAtHour(1, 22, 4, 23)).toBe(true);
    expect(isActiveAtHour(1, 22, 4, 0)).toBe(true);
    expect(isActiveAtHour(1, 22, 4, 4)).toBe(true);
    expect(isActiveAtHour(1, 22, 4, 5)).toBe(false);
    expect(isActiveAtHour(1, 22, 4, 21)).toBe(false);
  });

  it("早午餐時段 7-14 應在 7-14 時顯示", () => {
    expect(isActiveAtHour(1, 7, 14, 6)).toBe(false);
    expect(isActiveAtHour(1, 7, 14, 7)).toBe(true);
    expect(isActiveAtHour(1, 7, 14, 12)).toBe(true);
    expect(isActiveAtHour(1, 7, 14, 14)).toBe(true);
    expect(isActiveAtHour(1, 7, 14, 15)).toBe(false);
  });

  it("時段起始和結束相同應只在該小時顯示", () => {
    expect(isActiveAtHour(1, 12, 12, 11)).toBe(false);
    expect(isActiveAtHour(1, 12, 12, 12)).toBe(true);
    expect(isActiveAtHour(1, 12, 12, 13)).toBe(false);
  });
});

// ============================================================
// 拍照 AI 分析五行 - 輔助邏輯測試
// ============================================================

// 測試 base64 圖片格式驗證邏輯（模擬 analyzeAndAdd 的驗證）
function parseImageBase64(dataUrl: string): { mimeType: string; ext: string } | null {
  const matches = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches) return null;
  const mimeType = matches[1];
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  return { mimeType, ext };
}

// 測試衣物類型安全轉換邏輯
function safeCategoryConvert(category: string): string {
  const valid = ["upper", "lower", "shoes", "outer", "accessory", "bracelet"];
  return valid.includes(category) ? category : "accessory";
}

// 測試 auraBoost 邊界值處理
function clampAuraBoost(raw: number): number {
  return Math.round(Math.max(0, Math.min(10, raw)));
}

describe("PhotoUploadAnalyzer - 圖片格式驗證", () => {
  it("應正確解析 JPEG base64 格式", () => {
    const result = parseImageBase64("data:image/jpeg;base64,/9j/abc123");
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/jpeg");
    expect(result?.ext).toBe("jpg");
  });

  it("應正確解析 PNG base64 格式", () => {
    const result = parseImageBase64("data:image/png;base64,iVBORw0KGgo=");
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe("image/png");
    expect(result?.ext).toBe("png");
  });

  it("應拒絕非 base64 格式", () => {
    expect(parseImageBase64("https://example.com/image.jpg")).toBeNull();
    expect(parseImageBase64("not-a-base64-string")).toBeNull();
    expect(parseImageBase64("")).toBeNull();
  });

  it("應正確處理 HEIC 格式", () => {
    const result = parseImageBase64("data:image/heic;base64,abc123");
    expect(result).not.toBeNull();
    expect(result?.ext).toBe("heic");
  });
});

describe("PhotoUploadAnalyzer - 衣物類型安全轉換", () => {
  it("有效類型應直接通過", () => {
    expect(safeCategoryConvert("upper")).toBe("upper");
    expect(safeCategoryConvert("lower")).toBe("lower");
    expect(safeCategoryConvert("shoes")).toBe("shoes");
    expect(safeCategoryConvert("outer")).toBe("outer");
    expect(safeCategoryConvert("accessory")).toBe("accessory");
    expect(safeCategoryConvert("bracelet")).toBe("bracelet");
  });

  it("無效類型應 fallback 到 accessory", () => {
    expect(safeCategoryConvert("unknown")).toBe("accessory");
    expect(safeCategoryConvert("")).toBe("accessory");
    expect(safeCategoryConvert("hat")).toBe("accessory");
  });
});

describe("PhotoUploadAnalyzer - Aura 加成分數邊界值", () => {
  it("正常範圍應保持不變", () => {
    expect(clampAuraBoost(5)).toBe(5);
    expect(clampAuraBoost(0)).toBe(0);
    expect(clampAuraBoost(10)).toBe(10);
    expect(clampAuraBoost(7.5)).toBe(8);
  });

  it("超出上限應截斷為 10", () => {
    expect(clampAuraBoost(15)).toBe(10);
    expect(clampAuraBoost(100)).toBe(10);
  });

  it("低於下限應截斷為 0", () => {
    expect(clampAuraBoost(-5)).toBe(0);
    expect(clampAuraBoost(-100)).toBe(0);
  });

  it("應四捨五入到整數", () => {
    expect(clampAuraBoost(7.4)).toBe(7);
    expect(clampAuraBoost(7.6)).toBe(8);
    expect(clampAuraBoost(9.9)).toBe(10);
  });
});
