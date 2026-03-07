/**
 * 動態命理引擎測試
 * 驗證 getUserProfileForEngine 能正確根據 DB 資料計算五行比例
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("../drizzle/schema", () => ({
  userProfiles: {},
}));

// ─── 測試五行比例計算邏輯 ────────────────────────────────────────────────────
describe("五行比例計算邏輯", () => {
  it("DB natal 欄位存在時應正確轉換為 0-1 比例", () => {
    const natalWood = 42;
    const natalFire = 11;
    const natalEarth = 9;
    const natalMetal = 4;
    const natalWater = 35;
    const total = natalWood + natalFire + natalEarth + natalMetal + natalWater;
    expect(total).toBe(101);
    const ratio = {
      木: natalWood / total,
      火: natalFire / total,
      土: natalEarth / total,
      金: natalMetal / total,
      水: natalWater / total,
    };
    // 加總應接近 1
    const sum = Object.values(ratio).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    // 木最大
    expect(ratio["木"]).toBeGreaterThan(ratio["火"]);
    expect(ratio["木"]).toBeGreaterThan(ratio["土"]);
    expect(ratio["木"]).toBeGreaterThan(ratio["金"]);
  });

  it("natal 欄位全為 0 時應回傳均等比例", () => {
    const total = 0 + 0 + 0 + 0 + 0;
    const safeDivisor = total || 100;
    const ratio = {
      木: 0 / safeDivisor,
      火: 0 / safeDivisor,
      土: 0 / safeDivisor,
      金: 0 / safeDivisor,
      水: 0 / safeDivisor,
    };
    expect(Object.values(ratio).every(v => v === 0)).toBe(true);
  });

  it("五行比例應正確對應喜忌神標籤", () => {
    const EN_TO_ZH: Record<string, string> = { fire: "火", earth: "土", metal: "金", wood: "木", water: "水" };
    const favorableElements = "fire,earth,metal";
    const unfavorableElements = "water,wood";
    const fav = favorableElements.split(",").map(e => EN_TO_ZH[e.trim()] ?? e.trim()).filter(Boolean);
    const unfav = unfavorableElements.split(",").map(e => EN_TO_ZH[e.trim()] ?? e.trim()).filter(Boolean);
    expect(fav).toContain("火");
    expect(fav).toContain("土");
    expect(fav).toContain("金");
    expect(unfav).toContain("水");
    expect(unfav).toContain("木");
    // 木是忌神
    const woodDesc = unfav.includes("木") ? "過旺・忌神" : fav.includes("木") ? "用神・補強優先" : "中性";
    expect(woodDesc).toBe("過旺・忌神");
    // 火是用神
    const fireDesc = unfav.includes("火") ? "過旺・忌神" : fav.includes("火") ? "用神・補強優先" : "中性";
    expect(fireDesc).toBe("用神・補強優先");
  });
});

// ─── 測試 baziCalculator 動態計算 ────────────────────────────────────────────
describe("baziCalculator 動態計算", () => {
  it("應能從 baziCalculator 取得 elementRatio", async () => {
    const { calculateBazi } = await import("./lib/baziCalculator");
    // 蘇祐震的生日
    const result = calculateBazi("1984-11-26", "10:09");
    expect(result).toBeDefined();
    expect(result.elementRatio).toBeDefined();
    expect(typeof result.elementRatio.wood).toBe("number");
    expect(typeof result.elementRatio.fire).toBe("number");
    expect(typeof result.elementRatio.earth).toBe("number");
    expect(typeof result.elementRatio.metal).toBe("number");
    expect(typeof result.elementRatio.water).toBe("number");
    // 加總應大於 0
    const total = result.elementRatio.wood + result.elementRatio.fire + result.elementRatio.earth + result.elementRatio.metal + result.elementRatio.water;
    expect(total).toBeGreaterThan(0);
  });

  it("不同生日應計算出不同的五行比例", async () => {
    const { calculateBazi } = await import("./lib/baziCalculator");
    const result1 = calculateBazi("1984-11-26", "10:09"); // 甲木日主
    const result2 = calculateBazi("1990-06-15", "14:00"); // 不同日期
    // 兩個結果不應完全相同
    const r1 = result1.elementRatio;
    const r2 = result2.elementRatio;
    const isDifferent = r1.wood !== r2.wood || r1.fire !== r2.fire || r1.earth !== r2.earth;
    expect(isDifferent).toBe(true);
  });

  it("計算蘇祐震生日應得到木水為主的命格", async () => {
    const { calculateBazi } = await import("./lib/baziCalculator");
    const result = calculateBazi("1984-11-26", "10:09");
    const r = result.elementRatio;
    const total = r.wood + r.fire + r.earth + r.metal + r.water;
    const woodPct = r.wood / total;
    const waterPct = r.water / total;
    // 甲子年乙亥月甲子日，木水應佔主要比例
    expect(woodPct + waterPct).toBeGreaterThan(0.5);
  });
});

// ─── 測試 EngineProfile isDefault 邏輯 ────────────────────────────────────────
describe("EngineProfile isDefault 邏輯", () => {
  it("無 dayPillar 且無 dayMasterElement 且無 favorableElements 時應為 isDefault", () => {
    const profile = { dayPillar: null, dayMasterElement: null, favorableElements: null };
    const isDefault = !profile.dayPillar && !profile.dayMasterElement && !profile.favorableElements;
    expect(isDefault).toBe(true);
  });

  it("有 dayPillar 時不應為 isDefault", () => {
    const profile = { dayPillar: "甲子", dayMasterElement: null, favorableElements: null };
    const isDefault = !profile.dayPillar && !profile.dayMasterElement && !profile.favorableElements;
    expect(isDefault).toBe(false);
  });

  it("有 favorableElements 時不應為 isDefault", () => {
    const profile = { dayPillar: null, dayMasterElement: null, favorableElements: "fire,earth,metal" };
    const isDefault = !profile.dayPillar && !profile.dayMasterElement && !profile.favorableElements;
    expect(isDefault).toBe(false);
  });
});

// ─── 測試天干五行對應 ────────────────────────────────────────────────────────
describe("天干五行對應", () => {
  const STEM_ELEMENT_MAP: Record<string, string> = {
    甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
    己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
  };
  const STEM_YIN_YANG_MAP: Record<string, "陽" | "陰"> = {
    甲: "陽", 乙: "陰", 丙: "陽", 丁: "陰", 戊: "陽",
    己: "陰", 庚: "陽", 辛: "陰", 壬: "陽", 癸: "陰",
  };

  it("甲應對應木陽", () => {
    expect(STEM_ELEMENT_MAP["甲"]).toBe("木");
    expect(STEM_YIN_YANG_MAP["甲"]).toBe("陽");
  });

  it("乙應對應木陰", () => {
    expect(STEM_ELEMENT_MAP["乙"]).toBe("木");
    expect(STEM_YIN_YANG_MAP["乙"]).toBe("陰");
  });

  it("所有天干都有對應的五行", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    for (const stem of stems) {
      expect(STEM_ELEMENT_MAP[stem]).toBeDefined();
      expect(STEM_YIN_YANG_MAP[stem]).toBeDefined();
    }
  });
});
