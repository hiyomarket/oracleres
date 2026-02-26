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
