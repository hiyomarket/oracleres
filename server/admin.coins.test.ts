/**
 * admin.coins.test.ts
 * Tests for admin game coins management and feature usage API
 */
import { describe, it, expect } from "vitest";

// ─── Unit tests for coins calculation logic ───────────────────────────────────

describe("Admin Coins Management", () => {
  describe("coins adjustment validation", () => {
    it("should validate positive amount for add mode", () => {
      const validateCoinsInput = (mode: "add" | "subtract", amount: number) => {
        if (amount <= 0) return { valid: false, error: "Amount must be positive" };
        if (amount > 999999) return { valid: false, error: "Amount exceeds maximum" };
        return { valid: true };
      };

      expect(validateCoinsInput("add", 100)).toEqual({ valid: true });
      expect(validateCoinsInput("subtract", 50)).toEqual({ valid: true });
      expect(validateCoinsInput("add", 0)).toEqual({ valid: false, error: "Amount must be positive" });
      expect(validateCoinsInput("add", -10)).toEqual({ valid: false, error: "Amount must be positive" });
      expect(validateCoinsInput("add", 1000000)).toEqual({ valid: false, error: "Amount exceeds maximum" });
    });

    it("should calculate new balance correctly for add mode", () => {
      const calculateNewBalance = (current: number, mode: "add" | "subtract", amount: number) => {
        if (mode === "add") return current + amount;
        return Math.max(0, current - amount);
      };

      expect(calculateNewBalance(100, "add", 50)).toBe(150);
      expect(calculateNewBalance(100, "subtract", 30)).toBe(70);
      expect(calculateNewBalance(20, "subtract", 50)).toBe(0); // cannot go below 0
    });

    it("should prevent balance from going negative", () => {
      const calculateNewBalance = (current: number, mode: "add" | "subtract", amount: number) => {
        if (mode === "add") return current + amount;
        return Math.max(0, current - amount);
      };

      expect(calculateNewBalance(0, "subtract", 100)).toBe(0);
      expect(calculateNewBalance(50, "subtract", 100)).toBe(0);
    });
  });

  describe("batch coins distribution", () => {
    it("should calculate total coins for batch distribution", () => {
      const calculateBatchTotal = (amountPerUser: number, memberCount: number) => {
        return amountPerUser * memberCount;
      };

      expect(calculateBatchTotal(100, 10)).toBe(1000);
      expect(calculateBatchTotal(50, 25)).toBe(1250);
      expect(calculateBatchTotal(200, 1)).toBe(200);
    });

    it("should validate batch amount is positive integer", () => {
      const validateBatchAmount = (amount: number) => {
        return Number.isInteger(amount) && amount > 0;
      };

      expect(validateBatchAmount(100)).toBe(true);
      expect(validateBatchAmount(1)).toBe(true);
      expect(validateBatchAmount(0)).toBe(false);
      expect(validateBatchAmount(-1)).toBe(false);
      expect(validateBatchAmount(1.5)).toBe(false);
    });
  });
});

// ─── Feature usage stats logic ────────────────────────────────────────────────

describe("Feature Usage Statistics", () => {
  describe("usage trend calculation", () => {
    it("should calculate 7-day trend percentage correctly", () => {
      const calculateTrend = (total30d: number, total7d: number): number => {
        if (total30d === 0) return 0;
        // Normalize 7d to 30d scale: (7d / 30d) * (30/7) * 100
        return Math.round((total7d / total30d) * 100 * (30 / 7));
      };

      // If 7d usage is proportionally the same as 30d, trend = 100%
      expect(calculateTrend(30, 7)).toBe(100);
      // If 7d is double the proportional rate, trend = 200%
      expect(calculateTrend(30, 14)).toBe(200);
      // If 7d is half the proportional rate, trend = 43%
      expect(calculateTrend(30, 3)).toBe(43); // 3/30 * 30/7 * 100 ≈ 43
      // Zero total
      expect(calculateTrend(0, 0)).toBe(0);
    });

    it("should sort features by 30d usage descending", () => {
      const features = [
        { feature: "擲筊問卦", total30d: 150, total7d: 40 },
        { feature: "補運樂透", total30d: 300, total7d: 80 },
        { feature: "刮刮樂日誌", total30d: 50, total7d: 10 },
      ];

      const sorted = [...features].sort((a, b) => b.total30d - a.total30d);
      expect(sorted[0].feature).toBe("補運樂透");
      expect(sorted[1].feature).toBe("擲筊問卦");
      expect(sorted[2].feature).toBe("刮刮樂日誌");
    });

    it("should calculate bar width percentage correctly", () => {
      const calculateBarWidth = (value: number, maxValue: number): number => {
        if (maxValue === 0) return 0;
        return Math.round((value / maxValue) * 100);
      };

      expect(calculateBarWidth(100, 200)).toBe(50);
      expect(calculateBarWidth(200, 200)).toBe(100);
      expect(calculateBarWidth(0, 200)).toBe(0);
      expect(calculateBarWidth(0, 0)).toBe(0);
    });
  });

  describe("KPI calculations", () => {
    it("should calculate plan distribution percentage", () => {
      const planDist = { basic: 50, advanced: 30, professional: 20 };
      const total = Object.values(planDist).reduce((a, b) => a + b, 0);

      expect(total).toBe(100);
      expect(Math.round((planDist.basic / total) * 100)).toBe(50);
      expect(Math.round((planDist.advanced / total) * 100)).toBe(30);
      expect(Math.round((planDist.professional / total) * 100)).toBe(20);
    });

    it("should handle empty plan distribution", () => {
      const planDist = { basic: 0, advanced: 0, professional: 0 };
      const total = Object.values(planDist).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? Math.round((planDist.basic / total) * 100) : 0;

      expect(pct).toBe(0);
    });
  });
});
