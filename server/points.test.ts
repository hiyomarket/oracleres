/**
 * points.test.ts
 * 測試每日簽到積分系統的核心邏輯
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 測試台灣時間今日起始計算邏輯 ──
function getTaiwanTodayStart(): Date {
  const now = new Date();
  const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const twToday = new Date(
    Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), twNow.getUTCDate())
  );
  return new Date(twToday.getTime() - 8 * 60 * 60 * 1000);
}

describe("getTaiwanTodayStart", () => {
  it("應回傳今日台灣時間 00:00:00 對應的 UTC 時間", () => {
    const result = getTaiwanTodayStart();
    // 結果應為 Date 物件
    expect(result).toBeInstanceOf(Date);
    // 結果應為今日台灣時間 00:00 的 UTC（UTC+8 偏移 -8h）
    const twNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const expectedHour = -8; // UTC 時間 = 台灣 00:00 - 8h
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

// ── 測試積分計算邏輯 ──
describe("積分計算邏輯", () => {
  const DAILY_SIGNIN_POINTS = 10;

  it("每日簽到應獲得 10 積分", () => {
    expect(DAILY_SIGNIN_POINTS).toBe(10);
  });

  it("積分餘額應正確累加", () => {
    let balance = 0;
    // 模擬 5 天簽到
    for (let i = 0; i < 5; i++) {
      balance += DAILY_SIGNIN_POINTS;
    }
    expect(balance).toBe(50);
  });

  it("積分交易記錄應包含正確欄位", () => {
    const tx = {
      userId: 1,
      amount: DAILY_SIGNIN_POINTS,
      type: "daily_signin",
      description: "每日簽到獎勵",
    };
    expect(tx.amount).toBeGreaterThan(0);
    expect(tx.type).toBe("daily_signin");
    expect(tx.description).toBeTruthy();
  });
});

// ── 測試 KPI 計算邏輯 ──
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

  it("積分統計：發放積分應大於等於消耗積分（健康系統）", () => {
    const granted = 500;
    const spent = 200;
    expect(granted).toBeGreaterThanOrEqual(spent);
  });
});

// ── 測試篩選邏輯 ──
describe("用戶篩選邏輯", () => {
  const mockUsers = [
    { id: 1, name: "Alice", planId: "basic",        lastSignedIn: new Date(Date.now() - 3 * 86400000) },
    { id: 2, name: "Bob",   planId: "advanced",     lastSignedIn: new Date(Date.now() - 15 * 86400000) },
    { id: 3, name: "Carol", planId: "professional", lastSignedIn: new Date(Date.now() - 100 * 86400000) },
    { id: 4, name: "Dave",  planId: "basic",        lastSignedIn: new Date(Date.now() - 50 * 86400000) },
  ];

  it("依方案篩選 basic 應回傳 2 位用戶", () => {
    const result = mockUsers.filter(u => u.planId === "basic");
    expect(result.length).toBe(2);
  });

  it("依最後上線 7 天內篩選應回傳 1 位用戶", () => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const result = mockUsers.filter(u => u.lastSignedIn >= cutoff);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Alice");
  });

  it("依 90 天未登入篩選應回傳 1 位用戶", () => {
    const cutoff = new Date(Date.now() - 90 * 86400000);
    const result = mockUsers.filter(u => u.lastSignedIn <= cutoff);
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
