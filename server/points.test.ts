/**
 * points.test.ts
 * 測試每日簽到積分系統的核心邏輯（含累積天數分級獎勵）
 */
import { describe, it, expect } from "vitest";
import {
  getTaiwanTodayStart,
  getTaiwanTodayStr,
  getTaiwanYesterdayStr,
  calcSigninPoints,
  getNextMilestone,
} from "./routers/points";

// ── 測試台灣時間工具函數 ──────────────────────────────────────────────────────
describe("getTaiwanTodayStart", () => {
  it("應回傳今日台灣時間 00:00:00 對應的 UTC 時間", () => {
    const result = getTaiwanTodayStart();
    expect(result).toBeInstanceOf(Date);
    const twNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const twMidnight = new Date(
      Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), twNow.getUTCDate())
    );
    const expectedUTC = new Date(twMidnight.getTime() - 8 * 60 * 60 * 1000);
    expect(result.getTime()).toBe(expectedUTC.getTime());
  });

  it("結果應早於或等於現在時間", () => {
    const result = getTaiwanTodayStart();
    expect(result.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("結果應在 24 小時內", () => {
    const result = getTaiwanTodayStart();
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(Date.now() - result.getTime()).toBeLessThan(oneDayMs);
  });
});

describe("getTaiwanTodayStr", () => {
  it("應回傳 YYYY-MM-DD 格式", () => {
    const result = getTaiwanTodayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getTaiwanYesterdayStr", () => {
  it("應回傳 YYYY-MM-DD 格式", () => {
    const result = getTaiwanYesterdayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("昨日應早於今日", () => {
    const today = getTaiwanTodayStr();
    const yesterday = getTaiwanYesterdayStr();
    expect(yesterday < today).toBe(true);
  });
});

// ── 測試分級積分計算 ──────────────────────────────────────────────────────────
describe("calcSigninPoints - 分級積分計算", () => {
  it("第 1 天應得 10 積分（青銅等級）", () => {
    expect(calcSigninPoints(1)).toBe(10);
  });

  it("第 5 天應得 10 積分（青銅等級上限）", () => {
    expect(calcSigninPoints(5)).toBe(10);
  });

  it("第 6 天應得 15 積分（升級白銀）", () => {
    expect(calcSigninPoints(6)).toBe(15);
  });

  it("第 10 天應得 15 積分（白銀等級中段）", () => {
    expect(calcSigninPoints(10)).toBe(15);
  });

  it("第 19 天應得 15 積分（白銀等級上限）", () => {
    expect(calcSigninPoints(19)).toBe(15);
  });

  it("第 20 天應得 20 積分（升級黃金）", () => {
    expect(calcSigninPoints(20)).toBe(20);
  });

  it("第 50 天應得 20 積分（黃金等級維持）", () => {
    expect(calcSigninPoints(50)).toBe(20);
  });

  it("第 100 天應得 20 積分（黃金等級維持）", () => {
    expect(calcSigninPoints(100)).toBe(20);
  });
});

// ── 測試里程碑資訊 ────────────────────────────────────────────────────────────
describe("getNextMilestone - 里程碑資訊", () => {
  it("第 1 天：應在青銅等級，還需 5 天升白銀", () => {
    const m = getNextMilestone(1);
    expect(m.tier).toBe("bronze");
    expect(m.daysToNext).toBe(5);
    expect(m.nextPoints).toBe(15);
    expect(m.currentPoints).toBe(10);
  });

  it("第 5 天：還需 1 天升白銀", () => {
    const m = getNextMilestone(5);
    expect(m.tier).toBe("bronze");
    expect(m.daysToNext).toBe(1);
  });

  it("第 6 天：應在白銀等級，還需 14 天升黃金", () => {
    const m = getNextMilestone(6);
    expect(m.tier).toBe("silver");
    expect(m.daysToNext).toBe(14);
    expect(m.nextPoints).toBe(20);
    expect(m.currentPoints).toBe(15);
  });

  it("第 19 天：還需 1 天升黃金", () => {
    const m = getNextMilestone(19);
    expect(m.tier).toBe("silver");
    expect(m.daysToNext).toBe(1);
  });

  it("第 20 天：應在黃金等級，daysToNext 為 0", () => {
    const m = getNextMilestone(20);
    expect(m.tier).toBe("gold");
    expect(m.daysToNext).toBe(0);
    expect(m.currentPoints).toBe(20);
  });

  it("第 50 天：應在黃金等級，daysToNext 為 0", () => {
    const m = getNextMilestone(50);
    expect(m.tier).toBe("gold");
    expect(m.daysToNext).toBe(0);
  });
});

// ── 測試連續天數 streak 計算邏輯 ──────────────────────────────────────────────
describe("streak 計算邏輯", () => {
  it("昨日有簽到時，streak 應 +1", () => {
    const prevStreak = 5;
    const lastCheckIn = getTaiwanYesterdayStr();
    const yesterdayStr = getTaiwanYesterdayStr();
    const newStreak = lastCheckIn === yesterdayStr ? prevStreak + 1 : 1;
    expect(newStreak).toBe(6);
  });

  it("昨日未簽到時，streak 應重置為 1", () => {
    const prevStreak = 10;
    const lastCheckIn = "2020-01-01";
    const yesterdayStr = getTaiwanYesterdayStr();
    const newStreak = lastCheckIn === yesterdayStr ? prevStreak + 1 : 1;
    expect(newStreak).toBe(1);
  });

  it("第一次簽到（lastCheckIn 為 null），streak 應為 1", () => {
    const prevStreak = 0;
    const lastCheckIn = null;
    const yesterdayStr = getTaiwanYesterdayStr();
    const newStreak = lastCheckIn === yesterdayStr ? prevStreak + 1 : 1;
    expect(newStreak).toBe(1);
  });

  it("streak 從 5 升到 6 時，積分應從 10 升到 15", () => {
    expect(calcSigninPoints(5)).toBe(10);
    expect(calcSigninPoints(6)).toBe(15);
  });

  it("streak 從 19 升到 20 時，積分應從 15 升到 20", () => {
    expect(calcSigninPoints(19)).toBe(15);
    expect(calcSigninPoints(20)).toBe(20);
  });
});

// ── 測試積分累積計算 ──────────────────────────────────────────────────────────
describe("積分累積計算", () => {
  it("連續簽到 5 天應累積 50 積分", () => {
    let total = 0;
    for (let day = 1; day <= 5; day++) total += calcSigninPoints(day);
    expect(total).toBe(50);
  });

  it("連續簽到 10 天應累積 125 積分（5×10 + 5×15）", () => {
    let total = 0;
    for (let day = 1; day <= 10; day++) total += calcSigninPoints(day);
    expect(total).toBe(5 * 10 + 5 * 15);
  });

  it("連續簽到 20 天應累積 280 積分（5×10 + 14×15 + 1×20）", () => {
    let total = 0;
    for (let day = 1; day <= 20; day++) total += calcSigninPoints(day);
    expect(total).toBe(5 * 10 + 14 * 15 + 1 * 20);
  });
});

// ── 測試 KPI 計算邏輯 ──────────────────────────────────────────────────────────
describe("KPI 計算邏輯", () => {
  it("方案分佈百分比應正確計算", () => {
    const planDist = { basic: 50, advanced: 30, professional: 20 };
    const total = Object.values(planDist).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    const basicPct = Math.round((planDist.basic / total) * 100);
    expect(basicPct).toBe(50);
    const advancedPct = Math.round((planDist.advanced / total) * 100);
    expect(advancedPct).toBe(30);
  });

  it("當總用戶為 0 時百分比應為 0", () => {
    const planDist = { basic: 0, advanced: 0, professional: 0 };
    const total = Object.values(planDist).reduce((a, b) => a + b, 0);
    const pct = total > 0 ? Math.round((planDist.basic / total) * 100) : 0;
    expect(pct).toBe(0);
  });
});

// ── 測試用戶篩選邏輯 ──────────────────────────────────────────────────────────
describe("用戶篩選邏輯", () => {
  const mockUsers = [
    { id: 1, name: "Alice", planId: "basic", lastSignedIn: new Date(Date.now() - 3 * 86400000) },
    { id: 2, name: "Bob", planId: "advanced", lastSignedIn: new Date(Date.now() - 15 * 86400000) },
    { id: 3, name: "Carol", planId: "professional", lastSignedIn: new Date(Date.now() - 100 * 86400000) },
    { id: 4, name: "Dave", planId: "basic", lastSignedIn: new Date(Date.now() - 50 * 86400000) },
  ];

  it("依方案篩選 basic 應回傳 2 位用戶", () => {
    const result = mockUsers.filter((u) => u.planId === "basic");
    expect(result.length).toBe(2);
  });

  it("依最後上線 7 天內篩選應回傳 1 位用戶", () => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const result = mockUsers.filter((u) => u.lastSignedIn >= cutoff);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Alice");
  });

  it("依 90 天未登入篩選應回傳 1 位用戶", () => {
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const result = mockUsers.filter((u) => u.lastSignedIn <= cutoff);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Carol");
  });

  it("分頁邏輯應正確計算總頁數", () => {
    const total = 47;
    const pageSize = 15;
    const totalPages = Math.ceil(total / pageSize);
    expect(totalPages).toBe(4);
  });
});
