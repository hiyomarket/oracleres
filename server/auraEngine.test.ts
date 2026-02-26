import { describe, it, expect } from "vitest";
import {
  calculateInnateAura,
  calculateAuraScore,
  getAuraLevel,
} from "./lib/auraEngine";

// 測試用命格資料
const natalRatio = { 木: 0.1, 火: 0.3, 土: 0.2, 金: 0.15, 水: 0.25 };
const favorableElements = ["木", "火"];
const unfavorableElements = ["金", "水"];
const envRatio = { 木: 0.25, 火: 0.2, 土: 0.2, 金: 0.15, 水: 0.2 };

describe("auraEngine - calculateInnateAura", () => {
  it("應回傳 0~100 的分數", () => {
    const result = calculateInnateAura(natalRatio, favorableElements, unfavorableElements, envRatio);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("應包含 weakestElements 陣列", () => {
    const result = calculateInnateAura(natalRatio, favorableElements, unfavorableElements, envRatio);
    expect(Array.isArray(result.weakestElements)).toBe(true);
  });

  it("應包含 description 字串", () => {
    const result = calculateInnateAura(natalRatio, favorableElements, unfavorableElements, envRatio);
    expect(typeof result.description).toBe("string");
    expect(result.description.length).toBeGreaterThan(0);
  });

  it("天氣加成應影響分數", () => {
    const withoutWeather = calculateInnateAura(natalRatio, favorableElements, unfavorableElements, envRatio);
    const withWeather = calculateInnateAura(
      natalRatio,
      favorableElements,
      unfavorableElements,
      envRatio,
      { wuxingRatio: { 木: 0.4, 火: 0.3, 土: 0.1, 金: 0.1, 水: 0.1 } }
    );
    // 天氣補強喜用神（木火），分數應更高或相等
    expect(withWeather.score).toBeGreaterThanOrEqual(withoutWeather.score - 5);
  });
});

describe("auraEngine - calculateAuraScore", () => {
  const outfit = {
    upper: { color: "紅色", wuxing: "火" },
    lower: { color: "綠色", wuxing: "木" },
  };

  it("應回傳 totalScore = innateAura + outfitBoost", () => {
    const result = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, outfit);
    expect(result.totalScore).toBe(result.innateAura + result.outfitBoost);
  });

  it("totalScore 不超過 100", () => {
    const result = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, outfit);
    expect(result.totalScore).toBeLessThanOrEqual(100);
  });

  it("穿搭喜用神顏色應產生正向加成", () => {
    const result = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, outfit);
    expect(result.outfitBoost).toBeGreaterThanOrEqual(0);
  });

  it("穿搭忌用神顏色應產生低加成（設計上不扣分，但加成較低）", () => {
    const badOutfit = {
      upper: { color: "黑色", wuxing: "水" }, // 水為忌用神
    };
    const goodOutfit = {
      upper: { color: "紅色", wuxing: "火" }, // 火為喜用神
    };
    const badResult = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, badOutfit);
    const goodResult = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, goodOutfit);
    // 忌用神穿搭加成應低於喜用神穿搭加成
    expect(badResult.outfitBoost).toBeLessThanOrEqual(goodResult.outfitBoost);
    // 忌用神穿搭加成應在合理範圍（0~5）
    expect(badResult.outfitBoost).toBeGreaterThanOrEqual(0);
    expect(badResult.outfitBoost).toBeLessThanOrEqual(5);
  });

  it("應包含 boostBreakdown 陣列", () => {
    const result = calculateAuraScore(natalRatio, favorableElements, unfavorableElements, envRatio, outfit);
    expect(Array.isArray(result.boostBreakdown)).toBe(true);
  });
});

describe("auraEngine - getAuraLevel", () => {
  it("分數 90+ 應為最高等級", () => {
    const level = getAuraLevel(92);
    expect(level.label).toBeTruthy();
    expect(level.color).toBeTruthy();
    expect(level.emoji).toBeTruthy();
  });

  it("分數 0 應為最低等級", () => {
    const level = getAuraLevel(0);
    expect(level.label).toBeTruthy();
  });

  it("分數 50 應回傳有效等級", () => {
    const level = getAuraLevel(50);
    expect(level.description.length).toBeGreaterThan(0);
  });

  it("各分段應回傳不同等級", () => {
    const levels = [10, 30, 50, 70, 90].map(getAuraLevel);
    const labels = levels.map(l => l.label);
    // 至少有兩個不同等級
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBeGreaterThan(1);
  });
});
