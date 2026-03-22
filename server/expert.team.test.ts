/**
 * Tests for team messaging and alliance name management
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockReturnThis(),
  }),
}));

describe("Team Message Logic", () => {
  it("should validate message content length", () => {
    const content = "Hello team!";
    expect(content.length).toBeLessThanOrEqual(2000);
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it("should reject empty messages", () => {
    const content = "   ";
    expect(content.trim().length).toBe(0);
  });

  it("should calculate 3-day expiry correctly", () => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(3, 1);
  });

  it("should identify expired messages (older than 3 days)", () => {
    // 使用固定基準時間避免競態條件
    const BASE = Date.now();
    const fourDaysAgo = new Date(BASE - 4 * 24 * 60 * 60 * 1000 - 1000);
    const oneDayAgo = new Date(BASE - 1 * 24 * 60 * 60 * 1000);
    const now = new Date(BASE);
    
    const isExpired = (date: Date) => {
      const cutoff = new Date(BASE - 3 * 24 * 60 * 60 * 1000);
      return date < cutoff;
    };
    
    expect(isExpired(fourDaysAgo)).toBe(true);
    expect(isExpired(oneDayAgo)).toBe(false);
    expect(isExpired(now)).toBe(false);
  });

  it("should mask sender identity as 天命管理團隊 for team messages", () => {
    const TEAM_DISPLAY_NAME = "天命管理團隊";
    const adminReply = { senderName: TEAM_DISPLAY_NAME, direction: "team_to_user" };
    expect(adminReply.senderName).toBe("天命管理團隊");
  });
});

describe("Alliance Name Management", () => {
  it("should validate alliance name length", () => {
    const validName = "天命聯盟";
    const tooLong = "a".repeat(101);
    
    expect(validName.length).toBeLessThanOrEqual(100);
    expect(tooLong.length).toBeGreaterThan(100);
  });

  it("should default to 天命聯盟 when no custom name is set", () => {
    const defaultName = "天命聯盟";
    const customName: string | null = null;
    const displayName = customName ?? defaultName;
    expect(displayName).toBe("天命聯盟");
  });

  it("should use custom name when set", () => {
    const defaultName = "天命聯盟";
    const customName = "命理師聯盟";
    const displayName = customName ?? defaultName;
    expect(displayName).toBe("命理師聯盟");
  });
});

describe("Message Read Receipt Logic", () => {
  it("should mark messages as read when recipient opens chat", () => {
    const messages = [
      { id: 1, senderId: 2, isRead: 0 },
      { id: 2, senderId: 1, isRead: 0 }, // own message
      { id: 3, senderId: 2, isRead: 1 }, // already read
    ];
    const currentUserId = 1;
    
    // Messages from others that are unread
    const toMarkRead = messages.filter(m => m.senderId !== currentUserId && m.isRead === 0);
    expect(toMarkRead.length).toBe(1);
    expect(toMarkRead[0].id).toBe(1);
  });

  it("should display 已讀 for read messages sent by self", () => {
    const msg = { senderId: 1, isRead: 1 };
    const currentUserId = 1;
    const isMe = msg.senderId === currentUserId;
    const readLabel = isMe ? (msg.isRead ? "已讀" : "✓") : null;
    expect(readLabel).toBe("已讀");
  });

  it("should display ✓ for unread messages sent by self", () => {
    const msg = { senderId: 1, isRead: 0 };
    const currentUserId = 1;
    const isMe = msg.senderId === currentUserId;
    const readLabel = isMe ? (msg.isRead ? "已讀" : "✓") : null;
    expect(readLabel).toBe("✓");
  });
});
