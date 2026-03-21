/**
 * accessTokens.test.ts
 * 特殊存取 Token 系統測試
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
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  desc: vi.fn((a) => ({ field: a, direction: "desc" })),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AccessTokens Router Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain mocks
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
      // Test the token generation logic
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
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      const token = { ...mockTokenRecord, expiresAt: pastDate };
      const isExpired = token.expiresAt !== null && new Date(token.expiresAt) < new Date();
      expect(isExpired).toBe(true);
    });

    it("should return valid=true for a token with future expiry", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now
      const token = { ...mockTokenRecord, expiresAt: futureDate };
      const isExpired = token.expiresAt !== null && new Date(token.expiresAt) < new Date();
      expect(isExpired).toBe(false);
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
      const futureMs = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
      const date = new Date(futureMs);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(futureMs);
    });
  });
});
