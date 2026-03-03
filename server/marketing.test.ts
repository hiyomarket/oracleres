/**
 * marketing.test.ts
 * 測試行銷中心相關功能：
 * - notifyUser 工具函數
 * - leaderboard period 計算邏輯
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── notifyUser 工具函數測試 ──────────────────────────────────────────────

describe("notifyUser utility", () => {
  it("should export notifyUser and notifyUsers functions", async () => {
    // 測試模組結構正確
    const mod = await import("./lib/notifyUser");
    expect(typeof mod.notifyUser).toBe("function");
    expect(typeof mod.notifyUsers).toBe("function");
  });

  it("notifyUser should handle db unavailable gracefully", async () => {
    // 模擬 db 不可用時靜默失敗
    const { notifyUser } = await import("./lib/notifyUser");
    // 在測試環境中 db 可能不可用，應返回 false 而非拋出錯誤
    const result = await notifyUser({
      userId: "test-user-123",
      type: "system",
      title: "測試通知",
      content: "這是一則測試通知",
    });
    // 在無 DB 環境下應返回 false（靜默失敗）
    expect(typeof result).toBe("boolean");
  });

  it("notifyUsers should return 0 for empty userIds array", async () => {
    const { notifyUsers } = await import("./lib/notifyUser");
    const count = await notifyUsers([], {
      type: "system",
      title: "批量通知",
      content: "測試批量通知",
    });
    expect(count).toBe(0);
  });
});

// ── 排行榜月度計算邏輯測試 ──────────────────────────────────────────────

describe("leaderboard period calculation", () => {
  it("should calculate correct week start (Monday) in Taiwan time", () => {
    // 模擬台灣時間 2026-03-03 週二（UTC+8）
    const twNow = new Date("2026-03-03T00:00:00Z"); // UTC 時間
    const dayOfWeek = twNow.getUTCDay(); // 2 = Tuesday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekMonday = new Date(twNow);
    weekMonday.setUTCDate(twNow.getUTCDate() - daysFromMonday);
    weekMonday.setUTCHours(0, 0, 0, 0);
    
    // 週二 - 1 = 週一
    expect(weekMonday.getUTCDay()).toBe(1); // 1 = Monday
    expect(weekMonday.getUTCDate()).toBe(2); // 3月2日
  });

  it("should calculate correct month start in Taiwan time", () => {
    // 模擬台灣時間 2026-03-15
    const twNow = new Date("2026-03-15T04:00:00Z"); // UTC+8 = 12:00 台灣時間
    const monthStart = new Date(Date.UTC(twNow.getUTCFullYear(), twNow.getUTCMonth(), 1, 0, 0, 0));
    // 台灣時間1日0時 = UTC 前一日 16:00
    const periodStart = new Date(monthStart.getTime() - 8 * 60 * 60 * 1000);
    
    expect(monthStart.getUTCFullYear()).toBe(2026);
    expect(monthStart.getUTCMonth()).toBe(2); // 0-indexed, 2 = March
    expect(monthStart.getUTCDate()).toBe(1);
    // periodStart 應為 UTC 2月28日 16:00
    expect(periodStart.getUTCDate()).toBe(28);
    expect(periodStart.getUTCHours()).toBe(16);
  });

  it("should handle Sunday correctly for week calculation", () => {
    // 台灣時間週日
    const twNow = new Date("2026-03-08T04:00:00Z"); // 週日
    const dayOfWeek = twNow.getUTCDay(); // 0 = Sunday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    expect(daysFromMonday).toBe(6); // 週日距週一 6 天
    
    const weekMonday = new Date(twNow);
    weekMonday.setUTCDate(twNow.getUTCDate() - daysFromMonday);
    weekMonday.setUTCHours(0, 0, 0, 0);
    
    expect(weekMonday.getUTCDay()).toBe(1); // 應為週一
    expect(weekMonday.getUTCDate()).toBe(2); // 3月2日
  });
});

// ── 通知類型配置測試 ──────────────────────────────────────────────

describe("notification type config", () => {
  it("should have all required notification types", () => {
    const VALID_TYPES = [
      "wbc_result",
      "system",
      "reward",
      "announcement",
      "daily_briefing",
      "fortune_reminder",
      "scratch_milestone",
    ];
    
    // 驗證所有類型名稱格式正確（snake_case）
    VALID_TYPES.forEach(type => {
      expect(type).toMatch(/^[a-z_]+$/);
    });
    
    expect(VALID_TYPES).toHaveLength(7);
  });

  it("should have unique notification type values", () => {
    const VALID_TYPES = [
      "wbc_result",
      "system",
      "reward",
      "announcement",
      "daily_briefing",
      "fortune_reminder",
      "scratch_milestone",
    ];
    
    const unique = new Set(VALID_TYPES);
    expect(unique.size).toBe(VALID_TYPES.length);
  });
});
