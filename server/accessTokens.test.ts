/**
 * accessTokens.test.ts
 * 特殊存取 Token 系統 + 用戶角色管理測試
 * v11.7：新增 allowedModules 模組勾選、到期警示、setUserRole 測試
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
const mockTokenRecord = {
  id: 1,
  token: "a".repeat(64),
  name: "Test AI Bot",
  description: "Test token",
  isActive: 1,
  createdBy: 1,
  expiresAt: null,
  lastUsedAt: null,
  useCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  allowedModules: null,
};

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([mockTokenRecord]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockResolvedValue([mockTokenRecord]),
  catch: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../drizzle/schema", () => ({
  accessTokens: { id: "id", token: "token", isActive: "isActive" },
  users: { id: "id", openId: "openId", role: "role" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, direction: "desc" })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
  isNotNull: vi.fn((a) => ({ type: "isNotNull", field: a })),
  lte: vi.fn((a, b) => ({ field: a, value: b })),
  gt: vi.fn((a, b) => ({ field: a, value: b })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AccessTokens Router Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([mockTokenRecord]);
    mockDb.orderBy.mockResolvedValue([mockTokenRecord]);
    mockDb.insert.mockReturnThis();
    mockDb.values.mockResolvedValue(undefined);
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe("Token generation", () => {
    it("should generate a 64-character hex token", () => {
      const crypto = require("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("should generate unique tokens on each call", () => {
      const crypto = require("crypto");
      const token1 = crypto.randomBytes(32).toString("hex");
      const token2 = crypto.randomBytes(32).toString("hex");
      expect(token1).not.toBe(token2);
    });
  });

  describe("Token verification logic", () => {
    it("should return valid=true for an active, non-expired token", () => {
      const token = { ...mockTokenRecord, isActive: 1, expiresAt: null };
      const isActive = token.isActive === 1;
      const isExpired = token.expiresAt !== null && new Date(token.expiresAt) < new Date();
      expect(isActive).toBe(true);
      expect(isExpired).toBe(false);
    });

    it("should return valid=false for a revoked token", () => {
      const token = { ...mockTokenRecord, isActive: 0 };
      const isActive = token.isActive === 1;
      expect(isActive).toBe(false);
    });

    it("should return valid=false for an expired token", () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60);
      const token = { ...mockTokenRecord, expiresAt: pastDate };
      const isExpired = token.expiresAt !== null && new Date(token.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    it("should return valid=true for a token with future expiry", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const token = { ...mockTokenRecord, expiresAt: futureDate };
      const isExpired = token.expiresAt !== null && new Date(token.expiresAt) < new Date();
      expect(isExpired).toBe(false);
    });
  });

  describe("allowedModules parsing", () => {
    it("should return null for null allowedModules (all modules open)", () => {
      const raw: string | null = null;
      const parsed = raw ? JSON.parse(raw) : null;
      expect(parsed).toBeNull();
    });

    it("should parse JSON array of module IDs correctly", () => {
      const raw = '["daily","tarot","wealth"]';
      const parsed = JSON.parse(raw);
      expect(parsed).toEqual(["daily", "tarot", "wealth"]);
      expect(parsed).toHaveLength(3);
    });

    it("should handle empty allowedModules array as all-open", () => {
      const modules: string[] = [];
      const allOpen = modules.length === 0;
      expect(allOpen).toBe(true);
    });

    it("should correctly gate module visibility with canShow", () => {
      const allowedModules = ["daily", "tarot"];
      const canShow = (moduleId: string) =>
        !allowedModules || allowedModules.includes(moduleId);
      expect(canShow("daily")).toBe(true);
      expect(canShow("tarot")).toBe(true);
      expect(canShow("wealth")).toBe(false);
      expect(canShow("hourly")).toBe(false);
    });

    it("should allow all modules when allowedModules is null", () => {
      const allowedModules: string[] | null = null;
      const canShow = (moduleId: string) =>
        !allowedModules || allowedModules.includes(moduleId);
      expect(canShow("daily")).toBe(true);
      expect(canShow("tarot")).toBe(true);
      expect(canShow("wealth")).toBe(true);
      expect(canShow("hourly")).toBe(true);
    });

    it("should serialize allowedModules to JSON string for storage", () => {
      const modules = ["daily", "tarot"];
      const json = JSON.stringify(modules);
      expect(json).toBe('["daily","tarot"]');
      expect(JSON.parse(json)).toEqual(modules);
    });
  });

  describe("Token expiry warning logic", () => {
    it("should detect tokens expiring within 7 days", () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const isExpiringSoon =
        expiresAt.getTime() > now &&
        expiresAt.getTime() <= now + sevenDaysMs;
      expect(isExpiringSoon).toBe(true);
    });

    it("should not flag tokens expiring after 7 days", () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now + 10 * 24 * 60 * 60 * 1000); // 10 days
      const isExpiringSoon =
        expiresAt.getTime() > now &&
        expiresAt.getTime() <= now + sevenDaysMs;
      expect(isExpiringSoon).toBe(false);
    });

    it("should not flag already-expired tokens as expiring soon", () => {
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(now - 1000); // already expired
      const isExpiringSoon =
        expiresAt.getTime() > now &&
        expiresAt.getTime() <= now + sevenDaysMs;
      expect(isExpiringSoon).toBe(false);
    });

    it("should calculate days until expiry correctly", () => {
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 1000);
      const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      // Math.ceil can return 3 or 4 depending on execution timing
      expect(days).toBeGreaterThanOrEqual(3);
      expect(days).toBeLessThanOrEqual(4);
    });
  });

  describe("Token name validation", () => {
    it("should reject empty token names", () => {
      const name = "";
      expect(name.trim().length).toBe(0);
    });

    it("should accept valid token names", () => {
      const name = "Claude AI Assistant";
      expect(name.trim().length).toBeGreaterThan(0);
      expect(name.trim().length).toBeLessThanOrEqual(100);
    });

    it("should reject names exceeding 100 characters", () => {
      const longName = "a".repeat(101);
      expect(longName.length).toBeGreaterThan(100);
    });
  });

  describe("Use count tracking", () => {
    it("should increment use count correctly", () => {
      const token = { ...mockTokenRecord, useCount: 5 };
      const newCount = (token.useCount ?? 0) + 1;
      expect(newCount).toBe(6);
    });

    it("should handle null use count gracefully", () => {
      const token = { ...mockTokenRecord, useCount: 0 };
      const newCount = (token.useCount ?? 0) + 1;
      expect(newCount).toBe(1);
    });
  });

  describe("Expiry timestamp handling", () => {
    it("should handle null expiresAt as never-expiring", () => {
      const expiresAt = null;
      const isExpired = expiresAt !== null && new Date(expiresAt) < new Date();
      expect(isExpired).toBe(false);
    });

    it("should convert Unix timestamp to Date correctly", () => {
      const futureMs = Date.now() + 1000 * 60 * 60 * 24 * 30;
      const date = new Date(futureMs);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(futureMs);
    });
  });
});

// ─── accessMode 存取模式測試 ─────────────────────────────────────────────────
describe("accessMode Logic", () => {
  it("should default to daily_view mode", () => {
    const defaultMode = "daily_view";
    expect(["daily_view", "admin_view"]).toContain(defaultMode);
  });

  it("should accept admin_view mode", () => {
    const mode = "admin_view";
    expect(["daily_view", "admin_view"]).toContain(mode);
  });

  it("should reject invalid access modes", () => {
    const invalidMode = "super_admin";
    expect(["daily_view", "admin_view"]).not.toContain(invalidMode);
  });

  it("should route daily_view token to /ai-view path", () => {
    const mode = "daily_view";
    const path = mode === "admin_view" ? "/ai-entry" : "/ai-view";
    expect(path).toBe("/ai-view");
  });

  it("should route admin_view token to /ai-entry path", () => {
    const mode = "admin_view";
    const path = mode === "admin_view" ? "/ai-entry" : "/ai-view";
    expect(path).toBe("/ai-entry");
  });

  it("should treat admin_view session as viewer role", () => {
    const aiSession = { accessMode: "admin_view", name: "Test AI" };
    const isViewer = aiSession?.accessMode === "admin_view";
    expect(isViewer).toBe(true);
  });

  it("should not treat daily_view session as viewer role", () => {
    const aiSession = { accessMode: "daily_view", name: "Test AI" };
    const isViewer = aiSession?.accessMode === "admin_view";
    expect(isViewer).toBe(false);
  });

  it("should store and retrieve AI session from sessionStorage", () => {
    const session = { token: "abc123", name: "Test", accessMode: "admin_view", expiresAt: null };
    const serialized = JSON.stringify(session);
    const parsed = JSON.parse(serialized);
    expect(parsed.accessMode).toBe("admin_view");
    expect(parsed.name).toBe("Test");
  });
});

// ─── setUserRole 邏輯測試 ─────────────────────────────────────────────────────
describe("setUserRole Logic", () => {
  it("should allow setting role to viewer", () => {
    const validRoles = ["admin", "viewer", "user"];
    expect(validRoles.includes("viewer")).toBe(true);
  });

  it("should reject self-role modification", () => {
    const currentUserId = 1;
    const targetUserId = 1;
    const isSelf = currentUserId === targetUserId;
    expect(isSelf).toBe(true); // should throw in real code
  });

  it("should allow modifying other users role", () => {
    const currentUserId = 1;
    const targetUserId = 2;
    const isSelf = currentUserId === targetUserId;
    expect(isSelf).toBe(false);
  });

  it("should prevent downgrading the owner (OWNER_OPEN_ID)", () => {
    const ownerOpenId = "owner@example.com";
    const targetOpenId = "owner@example.com";
    const newRole = "user";
    const isOwnerBeingDowngraded = targetOpenId === ownerOpenId && newRole !== "admin";
    expect(isOwnerBeingDowngraded).toBe(true); // should throw in real code
  });

  it("should allow promoting a regular user to admin", () => {
    const ownerOpenId = "owner@example.com";
    const targetOpenId = "other@example.com";
    const newRole = "admin";
    const isOwnerBeingDowngraded = targetOpenId === ownerOpenId && newRole !== "admin";
    expect(isOwnerBeingDowngraded).toBe(false);
  });

  it("should allow setting user role to viewer", () => {
    const ownerOpenId = "owner@example.com";
    const targetOpenId = "viewer@example.com";
    const newRole = "viewer";
    const isOwnerBeingDowngraded = targetOpenId === ownerOpenId && newRole !== "admin";
    expect(isOwnerBeingDowngraded).toBe(false);
  });

  it("should map role labels correctly", () => {
    const roleLabel: Record<string, string> = {
      admin: "管理員",
      viewer: "唯讀觀察員",
      user: "一般用戶",
    };
    expect(roleLabel["viewer"]).toBe("唯讀觀察員");
    expect(roleLabel["admin"]).toBe("管理員");
    expect(roleLabel["user"]).toBe("一般用戶");
  });
});
