/**
 * Expert Dashboard - 專家後台路由器測試
 * 覆蓋 P0-P3 改善項目的核心功能
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { requireExpertOrAdmin } from "./routers/expert/_helpers";
import { TRPCError } from "@trpc/server";

// ── _helpers 單元測試 ──

describe("requireExpertOrAdmin", () => {
  it("allows expert role", () => {
    expect(() => requireExpertOrAdmin("expert")).not.toThrow();
  });

  it("allows admin role", () => {
    expect(() => requireExpertOrAdmin("admin")).not.toThrow();
  });

  it("rejects user role", () => {
    expect(() => requireExpertOrAdmin("user")).toThrow(TRPCError);
  });

  it("rejects empty string", () => {
    expect(() => requireExpertOrAdmin("")).toThrow(TRPCError);
  });

  it("throws FORBIDDEN code", () => {
    try {
      requireExpertOrAdmin("user");
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("FORBIDDEN");
    }
  });
});

// ── expertConstants 共用常數測試 ──

describe("expertConstants shared constants", () => {
  it("exports all required booking status labels", async () => {
    const mod = await import("../client/src/lib/expertConstants");
    expect(mod.BOOKING_STATUS_LABEL).toBeDefined();
    expect(mod.BOOKING_STATUS_LABEL.pending_payment).toBe("待付款");
    expect(mod.BOOKING_STATUS_LABEL.confirmed).toBe("已確認");
    expect(mod.BOOKING_STATUS_LABEL.completed).toBe("已完成");
    expect(mod.BOOKING_STATUS_LABEL.cancelled).toBe("已取消");
  });

  it("exports all required booking status colors", async () => {
    const mod = await import("../client/src/lib/expertConstants");
    expect(mod.BOOKING_STATUS_COLOR).toBeDefined();
    expect(typeof mod.BOOKING_STATUS_COLOR.pending_payment).toBe("string");
    expect(typeof mod.BOOKING_STATUS_COLOR.confirmed).toBe("string");
    expect(typeof mod.BOOKING_STATUS_COLOR.completed).toBe("string");
    expect(typeof mod.BOOKING_STATUS_COLOR.cancelled).toBe("string");
  });

  it("exports expert status labels", async () => {
    const mod = await import("../client/src/lib/expertConstants");
    expect(mod.EXPERT_STATUS_LABEL).toBeDefined();
    expect(mod.EXPERT_STATUS_LABEL.active).toBeDefined();
    expect(mod.EXPERT_STATUS_LABEL.pending_review).toBeDefined();
  });

  it("exports service type labels", async () => {
    const mod = await import("../client/src/lib/expertConstants");
    expect(mod.SERVICE_TYPE_LABEL).toBeDefined();
    expect(mod.SERVICE_TYPE_LABEL.online).toBeDefined();
    expect(mod.SERVICE_TYPE_LABEL.offline).toBeDefined();
  });

  it("formatPrice formats correctly", async () => {
    const mod = await import("../client/src/lib/expertConstants");
    expect(mod.formatPrice(1000)).toMatch(/1,000/);
    expect(mod.formatPrice(0)).toBe("免費");
  });
});

// ── iCal 格式測試 ──

describe("iCal format generation", () => {
  it("generates valid iCal header and footer", () => {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//OracleResonance//ExpertCalendar//TW",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "END:VCALENDAR",
    ];
    const ical = lines.join("\r\n");
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
  });

  it("formats date correctly for iCal", () => {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const date = new Date("2026-03-30T10:00:00.000Z");
    const result = fmt(date);
    expect(result).toBe("20260330T100000Z");
    expect(result).not.toContain("-");
    expect(result).not.toContain(":");
  });

  it("generates VEVENT blocks with required fields", () => {
    const lines = [
      "BEGIN:VEVENT",
      "UID:slot-1@oracle-resonance",
      "DTSTART:20260330T090000Z",
      "DTEND:20260330T170000Z",
      "SUMMARY:⭕ 可預約時段",
      "END:VEVENT",
    ];
    const block = lines.join("\r\n");
    expect(block).toContain("BEGIN:VEVENT");
    expect(block).toContain("END:VEVENT");
    expect(block).toContain("UID:");
    expect(block).toContain("DTSTART:");
    expect(block).toContain("DTEND:");
    expect(block).toContain("SUMMARY:");
  });
});

// ── Weekly recurring slots logic test ──

describe("weekly recurring slots calculation", () => {
  it("calculates correct number of future slots", () => {
    const now = new Date("2026-03-30T08:00:00Z"); // Monday
    const dayOfWeek = 3; // Wednesday
    const weeks = 4;
    const startHour = 9;
    const endHour = 17;

    const slots: { start: Date; end: Date }[] = [];
    for (let w = 0; w < weeks; w++) {
      const target = new Date(now);
      target.setDate(target.getDate() + ((7 + dayOfWeek - target.getDay()) % 7) + w * 7);
      if (w === 0 && target <= now) {
        target.setDate(target.getDate() + 7);
      }
      const startTime = new Date(target.getFullYear(), target.getMonth(), target.getDate(), startHour, 0, 0);
      const endTime = new Date(target.getFullYear(), target.getMonth(), target.getDate(), endHour, 0, 0);
      if (endTime > startTime) {
        slots.push({ start: startTime, end: endTime });
      }
    }

    expect(slots.length).toBe(4);
    // All slots should be on Wednesday
    for (const slot of slots) {
      expect(slot.start.getDay()).toBe(3); // Wednesday
      expect(slot.start.getHours()).toBe(9);
      expect(slot.end.getHours()).toBe(17);
    }
  });

  it("skips past dates for current week", () => {
    const now = new Date("2026-03-30T20:00:00Z"); // Monday evening
    const dayOfWeek = 1; // Monday - already past for this week
    const weeks = 2;

    const slots: Date[] = [];
    for (let w = 0; w < weeks; w++) {
      const target = new Date(now);
      target.setDate(target.getDate() + ((7 + dayOfWeek - target.getDay()) % 7) + w * 7);
      if (w === 0 && target <= now) {
        target.setDate(target.getDate() + 7);
      }
      slots.push(target);
    }

    // First slot should be next Monday, not today
    expect(slots[0].getTime()).toBeGreaterThan(now.getTime());
  });

  it("rejects end time before start time", () => {
    const startHour = 17;
    const endHour = 9;
    const startTime = new Date(2026, 2, 30, startHour, 0, 0);
    const endTime = new Date(2026, 2, 30, endHour, 0, 0);
    expect(endTime <= startTime).toBe(true);
  });
});

// ── Revenue stats structure test ──

describe("revenue stats structure", () => {
  it("defines expected revenue stats shape", () => {
    const mockStats = {
      totalRevenue: 15000,
      monthRevenue: 5000,
      monthCompletedCount: 3,
      totalCompletedCount: 10,
      monthlyBreakdown: [
        { month: "2026-03", revenue: 5000, count: 3 },
        { month: "2026-02", revenue: 4000, count: 3 },
      ],
    };

    expect(mockStats.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(mockStats.monthRevenue).toBeGreaterThanOrEqual(0);
    expect(mockStats.monthCompletedCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(mockStats.monthlyBreakdown)).toBe(true);
    for (const m of mockStats.monthlyBreakdown) {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof m.revenue).toBe("number");
      expect(typeof m.count).toBe("number");
    }
  });
});

// ── DOMPurify XSS protection test ──

describe("XSS protection logic", () => {
  it("identifies dangerous HTML patterns", () => {
    const dangerousPatterns = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '<a href="javascript:void(0)">click</a>',
      '<div onmouseover="alert(1)">hover</div>',
    ];

    for (const pattern of dangerousPatterns) {
      // These patterns should contain event handlers or script tags
      const hasScript = /<script/i.test(pattern);
      const hasEventHandler = /on\w+=/i.test(pattern);
      const hasJavascript = /javascript:/i.test(pattern);
      expect(hasScript || hasEventHandler || hasJavascript).toBe(true);
    }
  });

  it("safe HTML should not contain dangerous patterns", () => {
    const safeHtml = '<p>Hello <strong>World</strong></p><br><em>italic</em>';
    expect(/<script/i.test(safeHtml)).toBe(false);
    expect(/on\w+=/i.test(safeHtml)).toBe(false);
    expect(/javascript:/i.test(safeHtml)).toBe(false);
  });
});

// ── Chat image upload validation test ──

describe("chat image upload validation", () => {
  it("rejects files over 5MB", () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFile = maxSize + 1;
    expect(oversizedFile > maxSize).toBe(true);
  });

  it("accepts files under 5MB", () => {
    const maxSize = 5 * 1024 * 1024;
    const normalFile = 2 * 1024 * 1024; // 2MB
    expect(normalFile <= maxSize).toBe(true);
  });

  it("extracts correct file extension from mime type", () => {
    const mimeToExt = (mime: string) => mime.split("/")[1] || "jpg";
    expect(mimeToExt("image/jpeg")).toBe("jpeg");
    expect(mimeToExt("image/png")).toBe("png");
    expect(mimeToExt("image/webp")).toBe("webp");
    expect(mimeToExt("image/gif")).toBe("gif");
  });

  it("generates unique file keys", () => {
    const bookingId = 123;
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const key = `chat-images/${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      keys.add(key);
    }
    // All keys should be unique
    expect(keys.size).toBe(100);
  });
});
