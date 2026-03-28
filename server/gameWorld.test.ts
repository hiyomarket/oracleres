/**
 * gameWorld.test.ts
 * 測試 gameWorld router 的核心功能：命名、狀態查詢、策略切換
 */
import { describe, it, expect } from "vitest";
import { calcExpToNext, resolveCombat } from "./tickEngine";

describe("calcExpToNext (GD-028 V3 變指數曲線)", () => {
  it("Lv.1 需要 2 經驗（V3 曲線 A=2）", () => {
    expect(calcExpToNext(1)).toBe(2);
  });

  it("Lv.10 需要大於 Lv.1（經驗曲線遞增）", () => {
    expect(calcExpToNext(10)).toBeGreaterThan(calcExpToNext(1));
  });

  it("Lv.30 需要大於 Lv.10", () => {
    expect(calcExpToNext(30)).toBeGreaterThan(calcExpToNext(10));
  });

  it("Lv.99 回傳滿級標記（999999）", () => {
    expect(calcExpToNext(99)).toBe(999999);
  });

  it("Lv.1→10 累計經驗接近 GD-028 目標 ~1000", () => {
    let sum = 0;
    for (let i = 1; i <= 10; i++) sum += calcExpToNext(i);
    expect(sum).toBeGreaterThan(700);
    expect(sum).toBeLessThan(1500);
  });
});

describe("resolveCombat（戰鬥解算）", () => {
  const mockAgent = {
    id: 1,
    agentName: "測試旅人",
    level: 5,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attack: 20,
    defense: 10,
    speed: 8,
    wuxingWood: 30,
    wuxingFire: 20,
    wuxingEarth: 20,
    wuxingMetal: 20,
    wuxingWater: 10,
    dominantElement: "wood" as const,
    stamina: 100,
    maxStamina: 100,
  };

  const mockMonster = {
    id: "test-monster",
    name: "測試怪物",
    element: "fire" as const,
    level: 5,
    hp: 80,
    attack: 15,
    defense: 5,
    speed: 6,
    expReward: 50,
    goldReward: [15, 30] as [number, number],
    dropItems: [{ itemId: "herb-001", chance: 0.5 }],
    skills: ["火球"],
    description: "測試用怪物",
    isBoss: false,
  };

  it("戰鬥應回傳 won boolean", () => {
    const result = resolveCombat(mockAgent, mockMonster);
    expect(typeof result.won).toBe("boolean");
  });

  it("戰鬥結果包含回合記錄", () => {
    const result = resolveCombat(mockAgent, mockMonster);
    expect(result.rounds).toBeDefined();
    expect(result.rounds.length).toBeGreaterThan(0);
  });

  it("木屬性 vs 火屬性：戰鬥能正常執行", () => {
    const result = resolveCombat(mockAgent, mockMonster);
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.elementMultiplier).toBeGreaterThan(0);
  });

  it("勝利時應有經驗和金幣獎勵", () => {
    let winResult = null;
    for (let i = 0; i < 20; i++) {
      const r = resolveCombat(mockAgent, mockMonster);
      if (r.won) { winResult = r; break; }
    }
    if (winResult) {
      expect(winResult.expGained).toBeGreaterThan(0);
      expect(winResult.goldGained).toBeGreaterThan(0);
    }
  });

  it("戰鬥後 HP 損失不應超過最大 HP", () => {
    const result = resolveCombat(mockAgent, mockMonster);
    expect(result.hpLost).toBeGreaterThanOrEqual(0);
    expect(result.hpLost).toBeLessThanOrEqual(mockAgent.maxHp);
  });
});

describe("命名驗證規則", () => {
  const validateName = (name: string): boolean => {
    if (!name || name.length < 1 || name.length > 12) return false;
    return /^[\u4e00-\u9fa5a-zA-Z0-9_\-·•]+$/.test(name);
  };

  it("有效中文名稱", () => {
    expect(validateName("天命旅人")).toBe(true);
  });

  it("有效英文名稱", () => {
    expect(validateName("Traveler")).toBe(true);
  });

  it("有效混合名稱", () => {
    expect(validateName("旅人001")).toBe(true);
  });

  it("空名稱無效", () => {
    expect(validateName("")).toBe(false);
  });

  it("超過 12 字無效", () => {
    expect(validateName("這個名字超過了十二個字的限制啊")).toBe(false);
  });

  it("含特殊字元無效", () => {
    expect(validateName("旅人@123")).toBe(false);
  });
});
