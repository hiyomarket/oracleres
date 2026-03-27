/**
 * petBpHistory.test.ts — 寵物 BP 歷史記錄相關測試
 */
import { describe, it, expect } from "vitest";

// ─── BP 歷史記錄資料結構測試 ─────────────────────────────────
describe("BP History Data Structure", () => {
  it("should have correct delta calculation", () => {
    const prev = { constitution: 20, strength: 15, defense: 18, agility: 12, magic: 25 };
    const next = { constitution: 22, strength: 16, defense: 18, agility: 14, magic: 25 };
    const delta = {
      constitution: next.constitution - prev.constitution,
      strength: next.strength - prev.strength,
      defense: next.defense - prev.defense,
      agility: next.agility - prev.agility,
      magic: next.magic - prev.magic,
    };
    expect(delta.constitution).toBe(2);
    expect(delta.strength).toBe(1);
    expect(delta.defense).toBe(0);
    expect(delta.agility).toBe(2);
    expect(delta.magic).toBe(0);
  });

  it("should calculate total BP correctly", () => {
    const bp = { constitution: 22, strength: 16, defense: 18, agility: 14, magic: 25 };
    const total = bp.constitution + bp.strength + bp.defense + bp.agility + bp.magic;
    expect(total).toBe(95);
  });

  it("should calculate total delta correctly", () => {
    const delta = { constitution: 2, strength: 1, defense: 0, agility: 2, magic: 0 };
    const totalDelta = delta.constitution + delta.strength + delta.defense + delta.agility + delta.magic;
    expect(totalDelta).toBe(5);
  });
});

// ─── BP 成長來源分類測試 ─────────────────────────────────────
describe("BP Growth Source Classification", () => {
  const SOURCE_LABELS: Record<string, string> = {
    battle: "⚔️ 戰鬥",
    idle: "💤 掛機",
    levelup: "⬆️ 升級",
    manual: "🔧 手動",
  };

  it("should have labels for all known sources", () => {
    expect(SOURCE_LABELS.battle).toBe("⚔️ 戰鬥");
    expect(SOURCE_LABELS.idle).toBe("💤 掛機");
    expect(SOURCE_LABELS.levelup).toBe("⬆️ 升級");
    expect(SOURCE_LABELS.manual).toBe("🔧 手動");
  });

  it("should handle unknown source gracefully", () => {
    const source = "unknown_source";
    const label = SOURCE_LABELS[source] || source;
    expect(label).toBe("unknown_source");
  });
});

// ─── 掛機 BP 成長計算測試 ─────────────────────────────────────
describe("Idle BP Growth Calculation", () => {
  const BP_PER_HOUR = 5;
  const MAX_IDLE_HOURS = 8;
  const MAX_BP = BP_PER_HOUR * MAX_IDLE_HOURS; // 40

  function calcIdleBpGrowth(durationMs: number): number {
    const hours = Math.min(durationMs / 3600000, MAX_IDLE_HOURS);
    return Math.floor(hours * BP_PER_HOUR);
  }

  it("should give 0 BP for 0 duration", () => {
    expect(calcIdleBpGrowth(0)).toBe(0);
  });

  it("should give 5 BP for 1 hour", () => {
    expect(calcIdleBpGrowth(3600000)).toBe(5);
  });

  it("should give 2 BP for 30 minutes", () => {
    expect(calcIdleBpGrowth(1800000)).toBe(2);
  });

  it("should cap at 40 BP for 8 hours", () => {
    expect(calcIdleBpGrowth(8 * 3600000)).toBe(MAX_BP);
  });

  it("should cap at 40 BP for 12 hours (beyond max)", () => {
    expect(calcIdleBpGrowth(12 * 3600000)).toBe(MAX_BP);
  });

  it("should give 10 BP for 2 hours", () => {
    expect(calcIdleBpGrowth(2 * 3600000)).toBe(10);
  });

  it("should give 37 BP for 7.5 hours", () => {
    expect(calcIdleBpGrowth(7.5 * 3600000)).toBe(37);
  });
});

// ─── 雷達圖座標計算測試 ─────────────────────────────────────
describe("Radar Chart Coordinate Calculation", () => {
  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  it("should calculate correct position at 0 degrees", () => {
    const pt = polarToCartesian(100, 100, 50, 0);
    expect(pt.x).toBeCloseTo(150, 5);
    expect(pt.y).toBeCloseTo(100, 5);
  });

  it("should calculate correct position at 90 degrees", () => {
    const pt = polarToCartesian(100, 100, 50, 90);
    expect(pt.x).toBeCloseTo(100, 5);
    expect(pt.y).toBeCloseTo(150, 5);
  });

  it("should calculate correct position at -90 degrees (top)", () => {
    const pt = polarToCartesian(100, 100, 50, -90);
    expect(pt.x).toBeCloseTo(100, 5);
    expect(pt.y).toBeCloseTo(50, 5);
  });

  it("should return center when radius is 0", () => {
    const pt = polarToCartesian(100, 100, 0, 45);
    expect(pt.x).toBeCloseTo(100, 5);
    expect(pt.y).toBeCloseTo(100, 5);
  });

  it("should handle 5 pentagon vertices correctly", () => {
    const angles = [-90, -18, 54, 126, 198];
    const points = angles.map(a => polarToCartesian(100, 100, 50, a));
    // All points should be at distance 50 from center
    points.forEach(pt => {
      const dist = Math.sqrt((pt.x - 100) ** 2 + (pt.y - 100) ** 2);
      expect(dist).toBeCloseTo(50, 3);
    });
  });
});

// ─── 雷達圖比例計算測試 ─────────────────────────────────────
describe("Radar Chart Scale Calculation", () => {
  function calcMaxBp(records: { constitution: number; strength: number; defense: number; agility: number; magic: number }[]): number {
    let max = 10;
    for (const r of records) {
      max = Math.max(max, r.constitution, r.strength, r.defense, r.agility, r.magic);
    }
    return Math.ceil(max / 5) * 5;
  }

  it("should default to 10 for empty records", () => {
    expect(calcMaxBp([])).toBe(10);
  });

  it("should round up to nearest 5", () => {
    expect(calcMaxBp([{ constitution: 23, strength: 10, defense: 10, agility: 10, magic: 10 }])).toBe(25);
  });

  it("should handle exact multiples of 5", () => {
    expect(calcMaxBp([{ constitution: 20, strength: 15, defense: 10, agility: 10, magic: 10 }])).toBe(20);
  });

  it("should handle large values", () => {
    expect(calcMaxBp([{ constitution: 97, strength: 10, defense: 10, agility: 10, magic: 10 }])).toBe(100);
  });
});

// ─── 歷史記錄排序測試 ─────────────────────────────────────
describe("History Record Sorting", () => {
  it("should sort records from oldest to newest", () => {
    const records = [
      { id: 3, createdAt: 3000 },
      { id: 1, createdAt: 1000 },
      { id: 2, createdAt: 2000 },
    ];
    const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);
    expect(sorted[0].id).toBe(1);
    expect(sorted[1].id).toBe(2);
    expect(sorted[2].id).toBe(3);
  });

  it("should reverse DESC query to ASC for timeline display", () => {
    // Backend returns DESC (newest first), frontend reverses to ASC
    const descRecords = [
      { id: 3, createdAt: 3000 },
      { id: 2, createdAt: 2000 },
      { id: 1, createdAt: 1000 },
    ];
    const reversed = [...descRecords].reverse();
    expect(reversed[0].id).toBe(1);
    expect(reversed[reversed.length - 1].id).toBe(3);
  });
});
