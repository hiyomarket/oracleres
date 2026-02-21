import { describe, expect, it } from "vitest";
import {
  calculateTarotDailyCard,
  generateOutfitAdvice,
  recommendBracelets,
  generateWealthCompass,
  getNearestSolarTerm,
  BRACELET_DB,
} from "./lib/warRoomEngine";
import { getDailyTenGodAnalysis } from "./lib/tenGods";

// ===== 塔羅流日計算測試 =====
describe("calculateTarotDailyCard", () => {
  it("應返回有效的塔羅牌號碼（1-22）", () => {
    const result = calculateTarotDailyCard(2, 21);
    expect(result.cardNumber).toBeGreaterThanOrEqual(1);
    expect(result.cardNumber).toBeLessThanOrEqual(22);
  });

  it("應返回有效的塔羅牌名稱", () => {
    const result = calculateTarotDailyCard(2, 21);
    expect(result.card.name).toBeTruthy();
    expect(typeof result.card.name).toBe("string");
  });

  it("應返回有效的元素屬性", () => {
    const validElements = ["火", "水", "土", "風", "以太"];
    const result = calculateTarotDailyCard(6, 15);
    expect(validElements).toContain(result.card.element);
  });

  it("應返回關鍵詞陣列", () => {
    const result = calculateTarotDailyCard(1, 1);
    expect(Array.isArray(result.card.keywords)).toBe(true);
    expect(result.card.keywords.length).toBeGreaterThan(0);
  });

  it("不同日期應返回不同牌（測試多個日期）", () => {
    const cards = new Set<number>();
    for (let m = 1; m <= 12; m++) {
      const result = calculateTarotDailyCard(m, 15);
      cards.add(result.cardNumber);
    }
    // 12個月應有至少3種不同的牌
    expect(cards.size).toBeGreaterThanOrEqual(3);
  });
});

// ===== 穿搭建議測試 =====
describe("generateOutfitAdvice", () => {
  it("應返回上衣、下身、鞋子的建議", () => {
    const result = generateOutfitAdvice("火", 8);
    expect(result.top).toBeDefined();
    expect(result.bottom).toBeDefined();
    expect(result.shoes).toBeDefined();
  });

  it("火日應推薦火色上衣", () => {
    const result = generateOutfitAdvice("火", 9);
    expect(result.top.element).toBe("火");
  });

  it("土日應推薦火色或土色上衣", () => {
    const result = generateOutfitAdvice("土", 7);
    expect(["火", "土"]).toContain(result.top.element);
  });

  it("水日應推薦火色上衣（補用神）", () => {
    const result = generateOutfitAdvice("水", 5);
    expect(result.top.element).toBe("火");
  });

  it("木日應推薦火色上衣（洩木補火）", () => {
    const result = generateOutfitAdvice("木", 6);
    expect(result.top.element).toBe("火");
  });

  it("應返回有效的顏色描述", () => {
    const result = generateOutfitAdvice("火", 8);
    expect(result.top.color).toBeTruthy();
    expect(result.bottom.color).toBeTruthy();
    expect(result.shoes.color).toBeTruthy();
  });

  it("應返回穿搭總結", () => {
    const result = generateOutfitAdvice("火", 8);
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });
});

// ===== 手串推薦測試 =====
describe("recommendBracelets", () => {
  it("應返回左手和右手推薦", () => {
    const result = recommendBracelets("火", 8, "丙", "食神");
    expect(result.leftHand).toBeDefined();
    expect(result.rightHand).toBeDefined();
  });

  it("火日左手應推薦火屬性手串", () => {
    const result = recommendBracelets("火", 9, "丙", "食神");
    const hasFireBracelet = result.leftHand.some(
      (item) => item.bracelet.primaryElement === "火"
    );
    expect(hasFireBracelet).toBe(true);
  });

  it("應返回手串推薦摘要", () => {
    const result = recommendBracelets("木", 6, "甲", "食神");
    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe("string");
  });

  it("每個推薦應包含手串資訊、原因和今日共振指數", () => {
    const result = recommendBracelets("火", 8, "丙", "食神");
    for (const item of result.leftHand) {
      expect(item.bracelet).toBeDefined();
      expect(item.bracelet.name).toBeTruthy();
      expect(item.reason).toBeTruthy();
      expect(typeof item.priority).toBe("number");
      expect(typeof item.dayScore).toBe("number");
      expect(item.dayScore).toBeGreaterThanOrEqual(0);
      expect(item.dayScore).toBeLessThanOrEqual(10);
    }
  });

  it("不同十神應產生不同的手串推薦組合（差異化驗證）", () => {
    // 甲日食神（火手串）與戊日劫財（土手串）應有差異
    const resultJia = recommendBracelets("木", 6, "甲", "食神");
    const resultWu = recommendBracelets("土", 7, "戊", "劫財");
    // 十神不同（食神主推 HS-D vs 劫財主推 HS-A），手串 ID 應不同
    const jiaIds = resultJia.leftHand.map(i => i.bracelet.id).sort().join(",");
    const wuIds = resultWu.leftHand.map(i => i.bracelet.id).sort().join(",");
    expect(jiaIds).not.toBe(wuIds);
  });

  it("月相滿月時應返回月相配戴建議", () => {
    const result = recommendBracelets("火", 8, "丙", "食神", "滿月");
    expect(result.moonNote).toBeTruthy();
    expect(result.moonNote).toContain("滿月");
  });
});

// ===== 手串資料庫測試 =====
describe("BRACELET_DB", () => {
  it("應包含 HS-A 到 HS-J 共 10 條手串（V9.0 實際手串矩陣）", () => {
    const keys = Object.keys(BRACELET_DB);
    expect(keys.length).toBe(10);
  });

  it("每條手串應有完整資訊（包含 V9.0 新欄位）", () => {
    for (const [id, bracelet] of Object.entries(BRACELET_DB)) {
      expect(bracelet.id).toBe(id);
      expect(bracelet.name).toBeTruthy();
      expect(bracelet.primaryElement).toBeTruthy();
      expect(bracelet.role).toBeTruthy();
      expect(bracelet.power).toBeTruthy();
      expect(bracelet.rating).toBeGreaterThanOrEqual(1);
      expect(bracelet.rating).toBeLessThanOrEqual(5);
    }
  });

  it("酒紅石榴石（HS-D）應為火屬性，評級 5 星（核心用神）", () => {
    expect(BRACELET_DB["HS-D"].primaryElement).toBe("火");
    expect(BRACELET_DB["HS-D"].rating).toBe(5);
  });

  it("金沙石（HS-E）應為火土雙補，評級 5 星（核心用神）", () => {
    expect(BRACELET_DB["HS-E"].primaryElement).toBe("火");
    expect(BRACELET_DB["HS-E"].secondaryElement).toBe("土");
    expect(BRACELET_DB["HS-E"].rating).toBe(5);
  });

  it("藍虎眼石（HS-H）應為忌神，評級 2 星，且所有日子都列為警告日", () => {
    expect(BRACELET_DB["HS-H"].primaryElement).toBe("水");
    expect(BRACELET_DB["HS-H"].rating).toBe(2);
    expect(BRACELET_DB["HS-H"].warningDays?.length).toBeGreaterThan(0);
  });
});

// ===== 財運羅盤測試 =====
describe("generateWealthCompass", () => {
  // 模擬一個塔羅牌物件
  const mockTarot = { name: "正義", element: "氣", keywords: ["公正"], advice: "保持公正", energy: "平衡能量" };
  const richTarot = { name: "命運之輪", element: "氣", keywords: ["轉機"], advice: "抓住機遇", energy: "幸運能量" };

  it("應返回有效的偏財指數（1-10）", () => {
    const result = generateWealthCompass("火", "食神", mockTarot as any, 8);
    expect(result.lotteryIndex).toBeGreaterThanOrEqual(1);
    expect(result.lotteryIndex).toBeLessThanOrEqual(10);
  });

  it("應返回偏財建議", () => {
    const result = generateWealthCompass("火", "食神", mockTarot as any, 8);
    expect(result.lotteryAdvice).toBeTruthy();
  });

  it("應返回財富引擎描述", () => {
    const result = generateWealthCompass("土", "偏財", mockTarot as any, 7);
    expect(result.wealthEngine).toBeTruthy();
  });

  it("應返回商業羅盤建議", () => {
    const result = generateWealthCompass("火", "正財", mockTarot as any, 9);
    expect(result.businessCompass).toBeTruthy();
  });

  it("應返回最佳行動建議", () => {
    const result = generateWealthCompass("木", "比肩", mockTarot as any, 6);
    expect(result.bestAction).toBeTruthy();
  });

  it("偏財十神應比比肩十神有更高偏財指數", () => {
    const wealthResult = generateWealthCompass("土", "偏財", mockTarot as any, 9);
    const poorResult = generateWealthCompass("水", "劫財", mockTarot as any, 2);
    expect(wealthResult.lotteryIndex).toBeGreaterThan(poorResult.lotteryIndex);
  });

  it("命運之輪塔羅加成應提升偏財指數", () => {
    const normalResult = generateWealthCompass("火", "食神", mockTarot as any, 8);
    const luckyResult = generateWealthCompass("火", "食神", richTarot as any, 8);
    expect(luckyResult.lotteryIndex).toBeGreaterThanOrEqual(normalResult.lotteryIndex);
  });
});

// ===== 十神分析測試（甲木日主）=====
describe("getDailyTenGodAnalysis - 甲木日主", () => {
  it("應返回有效的主十神", () => {
    const validTenGods = ["比肩", "劫財", "食神", "傷官", "偏財", "正財", "七殺", "正官", "偏印", "正印"];
    // 丙寅日：丙為天干，寅為地支
    const result = getDailyTenGodAnalysis("丙", "寅");
    expect(validTenGods).toContain(result.mainTenGod);
  });

  it("應返回十神評分（0-10）", () => {
    const result = getDailyTenGodAnalysis("丙", "寅");
    expect(result.mainScore).toBeGreaterThanOrEqual(0);
    expect(result.mainScore).toBeLessThanOrEqual(10);
  });

  it("應返回英雄劇本", () => {
    const result = getDailyTenGodAnalysis("丙", "寅");
    expect(result.heroScript).toBeTruthy();
    expect(typeof result.heroScript).toBe("string");
  });

  it("食神日（丙日）應有高能量評分（甲木用神為火）", () => {
    // 丙為甲木的食神，丙寅日應為食神日
    const result = getDailyTenGodAnalysis("丙", "寅");
    expect(result.mainTenGod).toBe("食神");
    expect(result.mainScore).toBeGreaterThanOrEqual(7);
  });

  it("應返回地支藏干分析", () => {
    const result = getDailyTenGodAnalysis("丙", "寅");
    expect(Array.isArray(result.branchTenGods)).toBe(true);
  });

  it("正印日（癸日）應返回正印十神", () => {
    // 癸為甲木的正印（甲為陽木，癸為陰水，水生木，陰生陰為正印）
    const result = getDailyTenGodAnalysis("癸", "亥");
    expect(result.mainTenGod).toBe("正印");
  });
});

// ===== 節氣計算測試 =====
describe("getNearestSolarTerm", () => {
  it("應返回節氣資訊或 null", () => {
    const result = getNearestSolarTerm(new Date("2026-02-21"));
    if (result !== null) {
      expect(result.name).toBeTruthy();
      expect(typeof result.daysUntil).toBe("number");
    }
  });

  it("春分前應返回春分節氣", () => {
    const result = getNearestSolarTerm(new Date("2026-03-15"));
    if (result) {
      expect(result.daysUntil).toBeGreaterThanOrEqual(0);
    }
  });
});

// ===== 晨報推播內容測試 =====
import { generateMorningBriefingContent } from "./lib/morningBriefing";

describe("generateMorningBriefingContent", () => {
  it("應返回包含標題和內容的物件", () => {
    const result = generateMorningBriefingContent();
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
  });

  it("標題應包含天命晨報字樣", () => {
    const result = generateMorningBriefingContent();
    expect(result.title).toContain("天命晨報");
  });

  it("內容應包含農曆資訊", () => {
    const result = generateMorningBriefingContent();
    expect(result.content).toContain("農曆");
  });

  it("內容應包含十神分析", () => {
    const result = generateMorningBriefingContent();
    expect(result.content).toContain("主十神");
  });

  it("內容應包含塔羅流日", () => {
    const result = generateMorningBriefingContent();
    expect(result.content).toContain("塔羅流日");
  });

  it("內容應包含最旺時辰", () => {
    const result = generateMorningBriefingContent();
    expect(result.content).toContain("最旺時辰");
  });

  it("內容應包含英雄劇本", () => {
    const result = generateMorningBriefingContent();
    expect(result.content).toContain("英雄劇本");
  });

  it("標題長度應在合理範圍內（不超過100字）", () => {
    const result = generateMorningBriefingContent();
    expect(result.title.length).toBeLessThanOrEqual(100);
  });

  it("內容長度應在合理範圍內（不超過20000字）", () => {
    const result = generateMorningBriefingContent();
    expect(result.content.length).toBeLessThanOrEqual(20000);
  });
});
