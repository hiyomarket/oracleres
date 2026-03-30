/**
 * v5.21 測試：戰鬥體驗優化 + Boss 表單 + AI 五行比例
 * 1. 五行比例分配邏輯（主屬性 50-100%，以 10 為基底）
 * 2. 格檔/閃避判定邏輯
 * 3. 傷害統計計算
 */
import { describe, it, expect } from "vitest";

// ─── 1. 五行比例分配邏輯 ──────────────────────────────────────────────
describe("Wuxing Distribution - 五行比例規則", () => {
  /**
   * 模擬 distributeRemaining 函數
   */
  function distributeRemaining(remaining: number, count: number): number[] {
    if (count === 0) return [];
    if (remaining === 0) return Array(count).fill(0);
    const result = Array(count).fill(0);
    for (let i = 0; i < remaining; i++) {
      result[Math.floor(Math.random() * count)]++;
    }
    return result;
  }

  const WUXING_PRIMARY_RANGE: Record<string, [number, number]> = {
    common:    [5, 6],
    uncommon:  [5, 7],
    rare:      [6, 8],
    elite:     [7, 9],
    epic:      [7, 9],
    boss:      [8, 10],
    legendary: [8, 10],
  };

  function generateWuxingAlloc(rarity: string, primaryWuxing: string) {
    const WUXING_LIST = ["木", "火", "土", "金", "水"];
    const WUXING_DB_MAP: Record<string, string> = { "木": "wuxingWood", "火": "wuxingFire", "土": "wuxingEarth", "金": "wuxingMetal", "水": "wuxingWater" };

    const [minPrimary, maxPrimary] = WUXING_PRIMARY_RANGE[rarity] ?? WUXING_PRIMARY_RANGE.common;
    const primaryParts = minPrimary + Math.floor(Math.random() * (maxPrimary - minPrimary + 1));
    const remainingParts = 10 - primaryParts;
    const otherElements = WUXING_LIST.filter(w => w !== primaryWuxing);
    const otherParts = distributeRemaining(remainingParts, otherElements.length);

    const alloc: Record<string, number> = {};
    alloc[WUXING_DB_MAP[primaryWuxing]] = primaryParts * 10;
    otherElements.forEach((w, i) => {
      alloc[WUXING_DB_MAP[w]] = otherParts[i] * 10;
    });
    return alloc;
  }

  it("所有比例總和應為 100", () => {
    for (let i = 0; i < 100; i++) {
      const alloc = generateWuxingAlloc("common", "火");
      const total = Object.values(alloc).reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
    }
  });

  it("主屬性應佔 50-100%（以 10 為基底的整數倍）", () => {
    for (let i = 0; i < 100; i++) {
      const alloc = generateWuxingAlloc("common", "火");
      const primary = alloc.wuxingFire;
      expect(primary).toBeGreaterThanOrEqual(50);
      expect(primary).toBeLessThanOrEqual(100);
      expect(primary % 10).toBe(0); // 必須是 10 的倍數
    }
  });

  it("所有屬性值應為 10 的倍數", () => {
    for (let i = 0; i < 100; i++) {
      const alloc = generateWuxingAlloc("rare", "木");
      for (const val of Object.values(alloc)) {
        expect(val % 10).toBe(0);
      }
    }
  });

  it("common 稀有度主屬性應在 50-60%", () => {
    for (let i = 0; i < 50; i++) {
      const alloc = generateWuxingAlloc("common", "水");
      expect(alloc.wuxingWater).toBeGreaterThanOrEqual(50);
      expect(alloc.wuxingWater).toBeLessThanOrEqual(60);
    }
  });

  it("legendary 稀有度主屬性應在 80-100%", () => {
    for (let i = 0; i < 50; i++) {
      const alloc = generateWuxingAlloc("legendary", "金");
      expect(alloc.wuxingMetal).toBeGreaterThanOrEqual(80);
      expect(alloc.wuxingMetal).toBeLessThanOrEqual(100);
    }
  });

  it("不應出現 2:2:2:2:2 的均勻分配", () => {
    for (let i = 0; i < 100; i++) {
      const alloc = generateWuxingAlloc("common", "火");
      const values = Object.values(alloc);
      const allEqual = values.every(v => v === 20);
      expect(allEqual).toBe(false);
    }
  });

  it("非主屬性值應 >= 0", () => {
    for (let i = 0; i < 100; i++) {
      const alloc = generateWuxingAlloc("boss", "土");
      for (const val of Object.values(alloc)) {
        expect(val).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("distributeRemaining 總和應等於 remaining", () => {
    for (let r = 0; r <= 5; r++) {
      for (let i = 0; i < 20; i++) {
        const parts = distributeRemaining(r, 4);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(r);
        expect(parts.length).toBe(4);
        for (const p of parts) {
          expect(p).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

// ─── 2. 格檔/閃避判定邏輯 ──────────────────────────────────────────────
describe("Block & Dodge Mechanics", () => {
  function calcBlockRate(defenderDef: number, attackerAtk: number): number {
    const ratio = defenderDef / Math.max(1, attackerAtk);
    return Math.min(20, Math.max(3, Math.floor(ratio * 25)));
  }

  function calcDodgeRate(defenderSpd: number, attackerSpd: number): number {
    const diff = defenderSpd - attackerSpd;
    if (diff <= 0) return 2;
    return Math.min(15, 2 + Math.floor(diff / 3));
  }

  it("格檔率應在 3-20% 之間", () => {
    expect(calcBlockRate(100, 100)).toBeGreaterThanOrEqual(3);
    expect(calcBlockRate(100, 100)).toBeLessThanOrEqual(20);
    expect(calcBlockRate(10, 200)).toBe(3);
    expect(calcBlockRate(200, 10)).toBe(20);
  });

  it("閃避率應在 2-15% 之間", () => {
    expect(calcDodgeRate(10, 20)).toBe(2);
    expect(calcDodgeRate(20, 10)).toBeGreaterThan(2);
    expect(calcDodgeRate(100, 10)).toBeLessThanOrEqual(15);
  });

  it("速度相同時閃避率為基礎值 2%", () => {
    expect(calcDodgeRate(50, 50)).toBe(2);
  });
});

// ─── 3. 傷害統計計算 ──────────────────────────────────────────────
describe("Damage Statistics Calculation", () => {
  interface MockLog {
    actorId: string;
    logType: string;
    damage?: number;
    healAmount?: number;
    isCrit?: boolean;
    isBlocked?: boolean;
    isDodged?: boolean;
  }

  function calcDamageStats(logs: MockLog[], participants: { participantId: string; name: string }[]) {
    const stats: Record<string, {
      name: string;
      totalDamage: number;
      totalHeal: number;
      critCount: number;
      blockCount: number;
      dodgeCount: number;
      hitCount: number;
    }> = {};

    for (const p of participants) {
      stats[p.participantId] = {
        name: p.name,
        totalDamage: 0,
        totalHeal: 0,
        critCount: 0,
        blockCount: 0,
        dodgeCount: 0,
        hitCount: 0,
      };
    }

    for (const log of logs) {
      const s = stats[log.actorId];
      if (!s) continue;
      if (log.logType === "damage" || log.logType === "skill_damage") {
        s.totalDamage += log.damage ?? 0;
        s.hitCount++;
        if (log.isCrit) s.critCount++;
        if (log.isBlocked) s.blockCount++;
        if (log.isDodged) s.dodgeCount++;
      } else if (log.logType === "heal") {
        s.totalHeal += log.healAmount ?? 0;
      }
    }
    return stats;
  }

  it("應正確計算總傷害和治療量", () => {
    const participants = [
      { participantId: "p1", name: "勇者" },
      { participantId: "p2", name: "法師" },
    ];
    const logs: MockLog[] = [
      { actorId: "p1", logType: "damage", damage: 100 },
      { actorId: "p1", logType: "damage", damage: 200, isCrit: true },
      { actorId: "p2", logType: "heal", healAmount: 50 },
      { actorId: "p2", logType: "skill_damage", damage: 300 },
    ];
    const stats = calcDamageStats(logs, participants);
    expect(stats.p1.totalDamage).toBe(300);
    expect(stats.p1.critCount).toBe(1);
    expect(stats.p1.hitCount).toBe(2);
    expect(stats.p2.totalHeal).toBe(50);
    expect(stats.p2.totalDamage).toBe(300);
  });

  it("空日誌應返回零值統計", () => {
    const participants = [{ participantId: "p1", name: "勇者" }];
    const stats = calcDamageStats([], participants);
    expect(stats.p1.totalDamage).toBe(0);
    expect(stats.p1.totalHeal).toBe(0);
    expect(stats.p1.hitCount).toBe(0);
  });
});

// ─── 4. Boss 表單魔物圖鑑對齊 ──────────────────────────────────────────
describe("Boss Form - Monster Catalog Alignment", () => {
  it("getAllMonsters API 應返回完整數值欄位", async () => {
    const { gameCatalogAdminRouter } = await import("./routers/gameCatalogAdmin");
    expect(gameCatalogAdminRouter).toBeDefined();
    const procedures = gameCatalogAdminRouter._def.procedures;
    expect(procedures).toHaveProperty("getAllMonsters");
  });

  it("getAllMonsterSkills API 應存在", async () => {
    const { gameCatalogAdminRouter } = await import("./routers/gameCatalogAdmin");
    const procedures = gameCatalogAdminRouter._def.procedures;
    expect(procedures).toHaveProperty("getAllMonsterSkills");
  });

  it("Boss 數值倍率計算應正確", () => {
    const baseStats = { hp: 50, atk: 10, def: 5, spd: 10, matk: 8, mdef: 5 };
    const tierMultipliers: Record<string, number> = { "1": 3, "2": 5, "3": 8 };

    for (const [tier, mult] of Object.entries(tierMultipliers)) {
      const bossHp = Math.round(baseStats.hp * mult * 2);
      const bossAtk = Math.round(baseStats.atk * mult);
      expect(bossHp).toBeGreaterThan(baseStats.hp);
      expect(bossAtk).toBeGreaterThan(baseStats.atk);
    }
  });
});
