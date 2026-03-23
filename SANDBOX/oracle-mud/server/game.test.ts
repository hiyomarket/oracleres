import { describe, it, expect } from "vitest";
import { resolveCombat, calcExpToNext } from "./tickEngine";
import { calcWuxingMultiplier, WUXING_OVERCOME, WUXING_GENERATE } from "../shared/mapNodes";
import { MONSTERS, getMonstersForNode, getMonstersForLevel } from "../shared/monsters";
import { MAP_NODES, NODE_MAP } from "../shared/mapNodes";

describe("五行相剋計算", () => {
  it("木剋土：傷害 +50%", () => {
    expect(calcWuxingMultiplier("wood", "earth")).toBe(1.5);
  });

  it("土剋水：傷害 +50%", () => {
    expect(calcWuxingMultiplier("earth", "water")).toBe(1.5);
  });

  it("水剋火：傷害 +50%", () => {
    expect(calcWuxingMultiplier("water", "fire")).toBe(1.5);
  });

  it("火剋金：傷害 +50%", () => {
    expect(calcWuxingMultiplier("fire", "metal")).toBe(1.5);
  });

  it("金剋木：傷害 +50%", () => {
    expect(calcWuxingMultiplier("metal", "wood")).toBe(1.5);
  });

  it("被剋：傷害 -30%", () => {
    expect(calcWuxingMultiplier("earth", "wood")).toBe(0.7);
  });

  it("相生：傷害 +20%", () => {
    expect(calcWuxingMultiplier("wood", "fire")).toBe(1.2);
  });

  it("無關係：傷害 x1（木 vs 水）", () => {
    expect(calcWuxingMultiplier("wood", "water")).toBe(1.0);
  });
});

describe("升級經驗計算", () => {
  it("1 級需要 100 經驗", () => {
    expect(calcExpToNext(1)).toBe(100);
  });

  it("2 級需要更多經驗", () => {
    expect(calcExpToNext(2)).toBeGreaterThan(100);
  });

  it("等級越高需要越多經驗", () => {
    const exp1 = calcExpToNext(5);
    const exp2 = calcExpToNext(10);
    expect(exp2).toBeGreaterThan(exp1);
  });
});

describe("戰鬥結算", () => {
  const mockAgent = {
    attack: 20,
    defense: 15,
    speed: 10,
    hp: 100,
    maxHp: 100,
    dominantElement: "wood",
    level: 5,
  };

  const weakMonster = MONSTERS.find((m) => m.level <= 3 && !m.isBoss)!;

  it("應能擊敗低等級怪物", () => {
    const result = resolveCombat(mockAgent, weakMonster);
    expect(result.won).toBe(true);
    expect(result.expGained).toBeGreaterThan(0);
    expect(result.goldGained).toBeGreaterThan(0);
  });

  it("勝利時 HP 損失應大於等於 0", () => {
    const result = resolveCombat(mockAgent, weakMonster);
    expect(result.hpLost).toBeGreaterThanOrEqual(0);
  });

  it("失敗時不應獲得金幣", () => {
    const bossMonster = MONSTERS.find((m) => m.isBoss && m.level >= 35)!;
    const weakAgent = { ...mockAgent, attack: 1, defense: 1, hp: 10, maxHp: 10 };
    const result = resolveCombat(weakAgent, bossMonster);
    if (!result.won) {
      expect(result.goldGained).toBe(0);
    }
  });
});

describe("怪物資料庫", () => {
  it("應有 50 隻怪物（含 Boss）", () => {
    expect(MONSTERS.length).toBe(50);
  });

  it("每個五行各有 10 隻怪物", () => {
    const elements = ["wood", "fire", "earth", "metal", "water"] as const;
    for (const el of elements) {
      const count = MONSTERS.filter((m) => m.element === el).length;
      expect(count).toBe(10);
    }
  });

  it("每個五行各有 1 隻 Boss", () => {
    const elements = ["wood", "fire", "earth", "metal", "water"] as const;
    for (const el of elements) {
      const bosses = MONSTERS.filter((m) => m.element === el && m.isBoss);
      expect(bosses.length).toBe(1);
    }
  });

  it("所有怪物都有有效的 ID", () => {
    for (const m of MONSTERS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
    }
  });
});

describe("地圖節點資料庫", () => {
  it("應有 72 個地圖節點", () => {
    expect(MAP_NODES.length).toBe(72);
  });

  it("所有節點都有有效的 ID 和連線", () => {
    for (const node of MAP_NODES) {
      expect(node.id).toBeTruthy();
      expect(node.name).toBeTruthy();
      expect(node.connections).toBeDefined();
    }
  });

  it("所有連線目標節點都存在", () => {
    for (const node of MAP_NODES) {
      for (const connId of node.connections) {
        expect(NODE_MAP[connId]).toBeDefined();
      }
    }
  });

  it("台北中正紀念堂廣場應存在", () => {
    expect(NODE_MAP["taipei-zhongzheng"]).toBeDefined();
    expect(NODE_MAP["taipei-zhongzheng"].element).toBe("earth");
  });

  it("玉山主峰應為最高危險等級", () => {
    expect(NODE_MAP["yushan-peak"].dangerLevel).toBe(5);
  });
});

describe("依節點取得怪物", () => {
  it("木屬性節點應返回木屬性怪物", () => {
    const monsters = getMonstersForNode("wood", [1, 10]);
    expect(monsters.length).toBeGreaterThan(0);
    expect(monsters.every((m) => m.element === "wood")).toBe(true);
  });

  it("依等級範圍篩選", () => {
    const monsters = getMonstersForLevel(1, 5);
    expect(monsters.every((m) => m.level >= 1 && m.level <= 5)).toBe(true);
  });
});
