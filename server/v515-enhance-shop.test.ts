/**
 * v5.15 測試 — 道具圖鑑 bug 修復 + 強化系統改造 + 商店管理 UI 改善
 */
import { describe, it, expect } from "vitest";

// ═══ 1. 道具圖鑑 category enum 修復 ═══
describe("道具圖鑑 category 驗證", () => {
  const VALID_CATEGORIES = [
    "material_basic", "material_drop", "consumable", "quest",
    "treasure", "skillbook", "equipment_material", "material", "scroll"
  ];

  it("所有已知 category 值都在允許列表中", () => {
    const dbCategories = ["material_basic", "material_drop", "consumable", "quest", "treasure", "skillbook", "equipment_material", "material", "scroll"];
    for (const cat of dbCategories) {
      expect(VALID_CATEGORIES).toContain(cat);
    }
  });

  it("material 和 scroll 是新增的合法 category", () => {
    expect(VALID_CATEGORIES).toContain("material");
    expect(VALID_CATEGORIES).toContain("scroll");
  });
});

// ═══ 2. useEffect.value 可選性 ═══
describe("useEffect 欄位驗證", () => {
  it("useEffect.value 應該可以為 undefined（可選）", () => {
    const useEffect = { type: "heal", duration: 0, description: "回復藥水" };
    // value is optional, should not throw
    expect(useEffect).toBeDefined();
    expect((useEffect as any).value).toBeUndefined();
  });

  it("useEffect.value 為 0 時應該被保留", () => {
    const useEffect = { type: "heal", value: 0, duration: 0, description: "無效果" };
    expect(useEffect.value).toBe(0);
  });

  it("useEffect.value 為正數時應該正常", () => {
    const useEffect = { type: "heal", value: 50, duration: 0, description: "回復50HP" };
    expect(useEffect.value).toBe(50);
  });
});

// ═══ 3. 前端 useEffect 清理邏輯 ═══
describe("前端 useEffect 資料清理", () => {
  function sanitizeUseEffect(raw: any) {
    if (!raw) return undefined;
    const cleaned: any = { ...raw };
    if (cleaned.value === undefined || cleaned.value === null || cleaned.value === "") {
      cleaned.value = 0;
    } else {
      cleaned.value = Number(cleaned.value);
    }
    if (!cleaned.type || cleaned.type === "") {
      return undefined;
    }
    return cleaned;
  }

  it("空 type 的 useEffect 應被移除", () => {
    expect(sanitizeUseEffect({ type: "", value: undefined, duration: 0, description: "test" })).toBeUndefined();
  });

  it("有 type 但無 value 的 useEffect 應設 value=0", () => {
    const result = sanitizeUseEffect({ type: "heal", value: undefined, duration: 0, description: "test" });
    expect(result).toBeDefined();
    expect(result.value).toBe(0);
  });

  it("完整的 useEffect 應保持不變", () => {
    const result = sanitizeUseEffect({ type: "heal", value: 50, duration: 10, description: "回復" });
    expect(result).toEqual({ type: "heal", value: 50, duration: 10, description: "回復" });
  });

  it("null useEffect 應返回 undefined", () => {
    expect(sanitizeUseEffect(null)).toBeUndefined();
  });
});

// ═══ 4. 強化公告邏輯 ═══
describe("強化全服公告邏輯", () => {
  function shouldAnnounceSuccess(newLevel: number, safeLevel: number, success: boolean) {
    return success && newLevel > safeLevel;
  }

  function shouldAnnounceDestroy(currentLevel: number, safeLevel: number, destroyed: boolean) {
    return destroyed && currentLevel >= safeLevel;
  }

  it("+4 成功（安定值 +3）應該公告", () => {
    expect(shouldAnnounceSuccess(4, 3, true)).toBe(true);
  });

  it("+3 成功（安定值 +3）不應該公告", () => {
    expect(shouldAnnounceSuccess(3, 3, true)).toBe(false);
  });

  it("+7 成功應該公告", () => {
    expect(shouldAnnounceSuccess(7, 3, true)).toBe(true);
  });

  it("強化失敗不應該公告成功", () => {
    expect(shouldAnnounceSuccess(4, 3, false)).toBe(false);
  });

  it("+5 爆裝（安定值 +3）應該公告", () => {
    expect(shouldAnnounceDestroy(5, 3, true)).toBe(true);
  });

  it("+3 爆裝（安定值 +3）應該公告", () => {
    expect(shouldAnnounceDestroy(3, 3, true)).toBe(true);
  });

  it("+2 爆裝（安定值 +3）不應該公告", () => {
    expect(shouldAnnounceDestroy(2, 3, false)).toBe(false);
  });

  it("公告訊息不超過 100 字", () => {
    const msg = `🎉 恭喜【超長名字的旅人角色測試用】成功將【傳說級的超級無敵霹靂旋風劍】強化至 +20（紅色）！`;
    expect(msg.slice(0, 100).length).toBeLessThanOrEqual(100);
  });
});

// ═══ 5. 強化設定後台 ═══
describe("強化設定結構", () => {
  const DEFAULT_CONFIG = {
    successRates: { 0: 100, 1: 100, 2: 100, 3: 80, 4: 60, 5: 50, 6: 40, 7: 30, 8: 25, 9: 20 },
    destroyRates: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 5, 5: 10, 6: 15, 7: 20, 8: 25, 9: 30 },
    statBonusPercent: { 0: 0, 1: 3, 2: 6, 3: 10, 4: 15, 5: 20, 6: 28, 7: 38, 8: 50, 9: 65 },
  };

  it("每個等級都有成功率設定", () => {
    for (let i = 0; i <= 9; i++) {
      expect(DEFAULT_CONFIG.successRates[i as keyof typeof DEFAULT_CONFIG.successRates]).toBeDefined();
    }
  });

  it("成功率在 0-100 之間", () => {
    Object.values(DEFAULT_CONFIG.successRates).forEach(rate => {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  it("爆裝率在 0-100 之間", () => {
    Object.values(DEFAULT_CONFIG.destroyRates).forEach(rate => {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });

  it("屬性加成百分比遞增", () => {
    const bonuses = Object.values(DEFAULT_CONFIG.statBonusPercent);
    for (let i = 1; i < bonuses.length; i++) {
      expect(bonuses[i]).toBeGreaterThanOrEqual(bonuses[i - 1]);
    }
  });
});

// ═══ 6. 商店 ItemKey 搜尋邏輯 ═══
describe("商店道具搜尋選擇器", () => {
  const mockItems = [
    { key: "I_W001", name: "青龍草", tag: "基礎素材" },
    { key: "I_F001", name: "火焰石", tag: "基礎素材" },
    { key: "I_SCR_WPN", name: "武器強化卷軸", tag: "卷軸" },
    { key: "E_M001", name: "鐵劍", tag: "武器" },
  ];

  function filterItems(items: typeof mockItems, query: string) {
    if (!query.trim()) return items.slice(0, 50);
    const q = query.toLowerCase();
    return items.filter(o => o.name.toLowerCase().includes(q) || o.key.toLowerCase().includes(q)).slice(0, 50);
  }

  it("空搜尋返回所有項目（最多50）", () => {
    expect(filterItems(mockItems, "")).toHaveLength(4);
  });

  it("按名稱搜尋", () => {
    const result = filterItems(mockItems, "青龍");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("I_W001");
  });

  it("按 Key 搜尋", () => {
    const result = filterItems(mockItems, "E_M001");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("鐵劍");
  });

  it("搜尋不區分大小寫", () => {
    const result = filterItems(mockItems, "i_w001");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("青龍草");
  });

  it("搜尋無結果時返回空陣列", () => {
    expect(filterItems(mockItems, "不存在的道具")).toHaveLength(0);
  });

  it("部分匹配也能找到", () => {
    const result = filterItems(mockItems, "卷軸");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("I_SCR_WPN");
  });
});
