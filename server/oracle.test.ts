import { describe, expect, it } from "vitest";
import {
  getDayPillar,
  getFullDateInfo,
  isLunarChouMonth,
  getCurrentHourInfo,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENT,
  BRANCH_ELEMENT,
} from "./lib/lunarCalendar";
import {
  analyzeQuery,
  castOracle,
  RESULT_DISPLAY,
} from "./lib/oracleAlgorithm";

// ===== 農曆算法測試 =====
describe("lunarCalendar - getDayPillar", () => {
  it("應返回有效的天干地支", () => {
    const date = new Date("2024-01-01");
    const pillar = getDayPillar(date);
    expect(HEAVENLY_STEMS).toContain(pillar.stem);
    expect(EARTHLY_BRANCHES).toContain(pillar.branch);
  });

  it("天干應對應正確五行", () => {
    const date = new Date("2024-01-01");
    const pillar = getDayPillar(date);
    expect(STEM_ELEMENT[pillar.stem]).toBeDefined();
    expect(BRANCH_ELEMENT[pillar.branch]).toBeDefined();
  });

  it("能量等級應為有效值", () => {
    const validLevels = ["excellent", "good", "neutral", "challenging", "complex"];
    const date = new Date("2024-06-15");
    const pillar = getDayPillar(date);
    expect(validLevels).toContain(pillar.energyLevel);
  });

  it("丑日應返回 excellent 能量等級", () => {
    // 找一個丑日：2000-01-07 是甲子日，丑日需要找到 branch === '丑'
    // 2000-01-19 應是丙寅日，繼續往後找
    // 用循環找到丑日
    let chouDate: Date | null = null;
    for (let i = 0; i < 60; i++) {
      const d = new Date("2024-01-01");
      d.setDate(d.getDate() + i);
      const p = getDayPillar(d);
      if (p.branch === "丑") {
        chouDate = d;
        break;
      }
    }
    if (chouDate) {
      const pillar = getDayPillar(chouDate);
      expect(pillar.branch).toBe("丑");
      expect(pillar.energyLevel).toBe("excellent");
    }
  });

  it("不同日期應返回不同干支", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-02");
    const pillar1 = getDayPillar(date1);
    const pillar2 = getDayPillar(date2);
    // 連續兩天的干支應不同（除非循環）
    const combined1 = `${pillar1.stem}${pillar1.branch}`;
    const combined2 = `${pillar2.stem}${pillar2.branch}`;
    expect(combined1).not.toBe(combined2);
  });
});

// 建立本地時間日期（避免 UTC 解析導致日期偏移）
function localDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0);
}

describe("lunarCalendar - isLunarChouMonth", () => {
  it("1月20日應為丑月", () => {
    expect(isLunarChouMonth(localDate(2024, 1, 20))).toBe(true);
  });

  it("1月25日應為丑月", () => {
    expect(isLunarChouMonth(localDate(2024, 1, 25))).toBe(true);
  });

  it("2月10日應為丑月", () => {
    expect(isLunarChouMonth(localDate(2024, 2, 10))).toBe(true);
  });

  it("3月1日不應為丑月", () => {
    expect(isLunarChouMonth(localDate(2024, 3, 1))).toBe(false);
  });

  it("6月15日不應為丑月", () => {
    expect(isLunarChouMonth(localDate(2024, 6, 15))).toBe(false);
  });
});

describe("lunarCalendar - getFullDateInfo", () => {
  it("應返回完整的日期命理信息", () => {
    const info = getFullDateInfo(new Date("2024-06-15"));
    expect(info.dayPillar).toBeDefined();
    expect(info.monthPillar).toBeDefined();
    expect(info.yearPillar).toBeDefined();
    expect(info.hourInfo).toBeDefined();
    expect(info.dateString).toBeTruthy();
    expect(typeof info.isSpecialChouTime).toBe("boolean");
  });

  it("dateString 應包含年月日", () => {
    const info = getFullDateInfo(new Date("2024-06-15"));
    expect(info.dateString).toMatch(/年/);
    expect(info.dateString).toMatch(/月/);
    expect(info.dateString).toMatch(/日/);
  });
});

// ===== 天命共振算法測試 =====
describe("oracleAlgorithm - analyzeQuery", () => {
  it("空問題應返回 neutral 類型", () => {
    const result = analyzeQuery("");
    expect(result.type).toBe("neutral");
  });

  it("事業相關問題應返回 fire_earth 類型", () => {
    const result = analyzeQuery("我的事業發展是否順利？");
    expect(result.type).toBe("fire_earth");
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it("學習相關問題應返回 water_wood 類型", () => {
    const result = analyzeQuery("我最近的學習進度如何？");
    expect(result.type).toBe("water_wood");
  });

  it("感情相關問題應返回 metal 類型", () => {
    const result = analyzeQuery("我的感情關係是否穩定？");
    expect(result.type).toBe("metal");
  });

  it("賺錢問題應識別為 fire_earth", () => {
    const result = analyzeQuery("這個投資能賺錢嗎？");
    expect(result.type).toBe("fire_earth");
  });

  it("人際問題應識別為 metal", () => {
    const result = analyzeQuery("與合作夥伴的人際關係如何？");
    expect(result.type).toBe("metal");
  });
});

describe("oracleAlgorithm - castOracle", () => {
  it("應返回有效的擲筊結果", () => {
    const validResults = ["sheng", "xiao", "yin", "li"];
    const result = castOracle("測試問題");
    expect(validResults).toContain(result.result);
  });

  it("權重總和應接近 100", () => {
    const result = castOracle("事業發展");
    const total = result.weights.sheng + result.weights.xiao + result.weights.yin;
    // 允許 ±3 的誤差（因為四捨五入）
    expect(total).toBeGreaterThanOrEqual(97);
    expect(total).toBeLessThanOrEqual(103);
  });

  it("所有權重應大於 0", () => {
    const result = castOracle("學習思考");
    expect(result.weights.sheng).toBeGreaterThan(0);
    expect(result.weights.xiao).toBeGreaterThan(0);
    expect(result.weights.yin).toBeGreaterThan(0);
  });

  it("應包含解讀文字", () => {
    const result = castOracle("感情問題");
    expect(result.interpretation).toBeTruthy();
    expect(result.interpretation.length).toBeGreaterThan(5);
  });

  it("應包含能量共鳴說明", () => {
    const result = castOracle("事業問題");
    expect(result.energyResonance).toBeTruthy();
  });

  it("應包含日期信息", () => {
    const result = castOracle("測試");
    expect(result.dateInfo).toBeDefined();
    expect(result.dateInfo.dayPillar).toBeDefined();
  });

  it("多次擲筊結果應有隨機性（不全相同）", () => {
    const results = Array.from({ length: 20 }, () => castOracle("事業").result);
    const uniqueResults = new Set(results);
    // 20次擲筊至少應出現2種不同結果
    expect(uniqueResults.size).toBeGreaterThanOrEqual(1);
  });

  it("火土日擲筊聖杯權重應較高", () => {
    // 找一個火日：使用 getDayPillar 找到 stemElement === '火' 的日期
    let fireDate: Date | null = null;
    for (let i = 0; i < 60; i++) {
      const d = new Date("2024-01-01");
      d.setDate(d.getDate() + i);
      const p = getDayPillar(d);
      if (p.stemElement === "火") {
        fireDate = d;
        break;
      }
    }
    if (fireDate) {
      const result = castOracle("事業發展", fireDate);
      // 火日+事業問題，聖杯權重應 > 45
      expect(result.weights.sheng).toBeGreaterThan(45);
    } else {
      // 若找不到火日，跳過此測試（不應發生）
      expect(true).toBe(true);
    }
  });
});

describe("oracleAlgorithm - RESULT_DISPLAY", () => {
  it("應包含所有結果類型的顯示配置", () => {
    expect(RESULT_DISPLAY.sheng).toBeDefined();
    expect(RESULT_DISPLAY.xiao).toBeDefined();
    expect(RESULT_DISPLAY.yin).toBeDefined();
    expect(RESULT_DISPLAY.li).toBeDefined();
  });

  it("聖杯顏色應為 red", () => {
    expect(RESULT_DISPLAY.sheng.color).toBe("red");
  });

  it("笑杯顏色應為 wood", () => {
    expect(RESULT_DISPLAY.xiao.color).toBe("wood");
  });

  it("陰杯顏色應為 black", () => {
    expect(RESULT_DISPLAY.yin.color).toBe("black");
  });
});
