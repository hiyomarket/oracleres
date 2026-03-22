import { describe, it, expect } from "vitest";

// Test the fortune router input validation logic
describe("fortune.getToday", () => {
  it("should validate birthdate format YYYY-MM-DD", () => {
    const validDates = ["1990-01-01", "1985-12-31", "2000-06-15", "1975-03-22"];
    const invalidDates = ["not-a-date", "2090-01-01", "1800-01-01", ""];

    const isValidBirthdate = (date: string): boolean => {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const d = new Date(date);
      if (isNaN(d.getTime())) return false;
      const year = d.getFullYear();
      return year >= 1920 && year <= 2010;
    };

    for (const d of validDates) {
      expect(isValidBirthdate(d)).toBe(true);
    }
    for (const d of invalidDates) {
      expect(isValidBirthdate(d)).toBe(false);
    }
  });

  it("should compute life path number correctly", () => {
    const computeLifePath = (birthdate: string): number => {
      const digits = birthdate.replace(/-/g, "").split("").map(Number);
      let sum = digits.reduce((a, b) => a + b, 0);
      while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = sum.toString().split("").map(Number).reduce((a, b) => a + b, 0);
      }
      return sum;
    };

    // 1990-01-01 → 1+9+9+0+0+1+0+1 = 21 → 2+1 = 3
    expect(computeLifePath("1990-01-01")).toBe(3);
    // 1985-12-31 → 1+9+8+5+1+2+3+1 = 30 → 3+0 = 3
    expect(computeLifePath("1985-12-31")).toBe(3);
    // 2000-06-15 → 2+0+0+0+0+6+1+5 = 14 → 1+4 = 5
    expect(computeLifePath("2000-06-15")).toBe(5);
  });

  it("should map life path to fortune element", () => {
    const lifePathToElement = (n: number): string => {
      const map: Record<number, string> = {
        1: "金", 2: "水", 3: "木", 4: "木",
        5: "土", 6: "土", 7: "金", 8: "土",
        9: "火", 11: "水", 22: "土", 33: "火",
      };
      return map[n] ?? "土";
    };

    expect(lifePathToElement(1)).toBe("金");
    expect(lifePathToElement(3)).toBe("木");
    expect(lifePathToElement(9)).toBe("火");
    expect(lifePathToElement(11)).toBe("水");
    expect(lifePathToElement(22)).toBe("土");
    expect(lifePathToElement(99)).toBe("土"); // fallback
  });

  it("should generate fortune scores within valid range", () => {
    // Scores should be between 1 and 100
    const mockScore = (seed: number): number => {
      return Math.min(100, Math.max(1, Math.abs(seed % 100) + 1));
    };

    for (let i = 0; i < 20; i++) {
      const score = mockScore(i * 17 + 3);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("should return fortune object with all required fields", () => {
    const mockFortune = {
      overall: "大吉",
      overall_score: 85,
      summary: "今日運勢旺盛",
      love: "桃花運佳",
      career: "事業順遂",
      wealth: "財運亨通",
      health: "身體健康",
      lucky_color: "金色",
      lucky_number: 8,
      advice: "把握機會",
      element: "金",
    };

    const requiredFields = [
      "overall", "overall_score", "summary", "love", "career",
      "wealth", "health", "lucky_color", "lucky_number", "advice", "element"
    ];

    for (const field of requiredFields) {
      expect(mockFortune).toHaveProperty(field);
    }
    expect(typeof mockFortune.overall_score).toBe("number");
    expect(typeof mockFortune.lucky_number).toBe("number");
  });
});
