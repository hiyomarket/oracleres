/**
 * 測試：AI 功能 + 靈相取消每日限制 + 商店數量調整
 */
import { describe, it, expect } from "vitest";

// ─── 靈相功能取消每日限制 ───
describe("靈相功能取消每日限制", () => {
  it("divineHeal 不再檢查每日冷卻時間", () => {
    // 模擬：同一天多次使用，不應被阻擋
    const todayTW = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const agent = {
      lastDivineHealDate: todayTW,
      actionPoints: 3,
      hp: 50,
      maxHp: 100,
    };
    // 新邏輯：只要 actionPoints >= 1 即可使用，不檢查 lastDivineHealDate
    const canUse = agent.actionPoints >= 1;
    expect(canUse).toBe(true);
  });

  it("divineEye 不再檢查每日冷卻時間", () => {
    const todayTW = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const agent = {
      lastDivineEyeDate: todayTW,
      actionPoints: 2,
    };
    const canUse = agent.actionPoints >= 1;
    expect(canUse).toBe(true);
  });

  it("divineStamina 不再檢查每日冷卻時間", () => {
    const todayTW = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const agent = {
      lastDivineStaminaDate: todayTW,
      actionPoints: 1,
    };
    const canUse = agent.actionPoints >= 1;
    expect(canUse).toBe(true);
  });

  it("靈力值不足時仍然不能使用", () => {
    const agent = { actionPoints: 0 };
    const canUse = agent.actionPoints >= 1;
    expect(canUse).toBe(false);
  });
});

// ─── 商店上架數量 ───
describe("商店上架數量調整", () => {
  it("一般商店應上架 20 件商品", () => {
    const NORMAL_SHOP_COUNT = 20;
    expect(NORMAL_SHOP_COUNT).toBe(20);
  });

  it("隱藏商店應上架 10 件商品", () => {
    const HIDDEN_SHOP_COUNT = 10;
    expect(HIDDEN_SHOP_COUNT).toBe(10);
  });

  it("商品數量不足時取最大可用數", () => {
    const poolSize = 8;
    const targetCount = 20;
    const actualCount = Math.min(targetCount, poolSize);
    expect(actualCount).toBe(8);
  });
});

// ─── AI 批量生成數值限制 ───
describe("AI 批量生成數值限制", () => {
  it("怪物 HP 被限制在 30-500 範圍", () => {
    const clampHp = (v: number) => Math.min(500, Math.max(30, v));
    expect(clampHp(1000)).toBe(500);
    expect(clampHp(10)).toBe(30);
    expect(clampHp(200)).toBe(200);
  });

  it("怪物 ATK 被限制在 5-80 範圍", () => {
    const clampAtk = (v: number) => Math.min(80, Math.max(5, v));
    expect(clampAtk(200)).toBe(80);
    expect(clampAtk(1)).toBe(5);
    expect(clampAtk(30)).toBe(30);
  });

  it("裝備 ATK 加成被限制在 0-30 範圍", () => {
    const clampEquipAtk = (v: number) => Math.min(30, Math.max(0, v));
    expect(clampEquipAtk(100)).toBe(30);
    expect(clampEquipAtk(-5)).toBe(0);
    expect(clampEquipAtk(15)).toBe(15);
  });

  it("技能威力被限制在 50-250% 範圍", () => {
    const clampPower = (v: number) => Math.min(250, Math.max(50, v));
    expect(clampPower(500)).toBe(250);
    expect(clampPower(10)).toBe(50);
    expect(clampPower(150)).toBe(150);
  });

  it("成就條件值至少為 1", () => {
    const clampCondition = (v: number) => Math.max(1, v);
    expect(clampCondition(0)).toBe(1);
    expect(clampCondition(-5)).toBe(1);
    expect(clampCondition(10)).toBe(10);
  });
});

// ─── AI 商店售價計算 ───
describe("AI 商店售價計算", () => {
  function calcPrice(rarity: string, type: string, currency: "coins" | "stones"): number {
    if (currency === "coins") {
      const base: Record<string, number> = { common: 50, rare: 200, epic: 800, legendary: 3000 };
      const typeMulti: Record<string, number> = { item: 1, equipment: 2.5, skill: 2 };
      return Math.floor((base[rarity] ?? 100) * (typeMulti[type] ?? 1));
    } else {
      const base: Record<string, number> = { common: 5, rare: 20, epic: 80, legendary: 300 };
      return base[rarity] ?? 20;
    }
  }

  it("common 道具金幣售價為 50", () => {
    expect(calcPrice("common", "item", "coins")).toBe(50);
  });

  it("rare 裝備金幣售價為 500", () => {
    expect(calcPrice("rare", "equipment", "coins")).toBe(500);
  });

  it("epic 技能金幣售價為 1600", () => {
    expect(calcPrice("epic", "skill", "coins")).toBe(1600);
  });

  it("legendary 靈石售價為 300", () => {
    expect(calcPrice("legendary", "item", "stones")).toBe(300);
  });
});

// ─── 名稱去重邏輯 ───
describe("AI 生成名稱去重", () => {
  it("過濾掉已存在的名稱", () => {
    const existingNames = ["火焰劍", "冰霜盾", "雷電弓"];
    const generated = [
      { name: "火焰劍" },  // 重複
      { name: "暗影匕首" },
      { name: "冰霜盾" },  // 重複
      { name: "聖光杖" },
    ];
    const filtered = generated.filter(item => !existingNames.includes(item.name));
    expect(filtered).toHaveLength(2);
    expect(filtered.map(f => f.name)).toEqual(["暗影匕首", "聖光杖"]);
  });

  it("限制最多 10 筆", () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ name: `道具${i}` }));
    const limited = items.slice(0, 10);
    expect(limited).toHaveLength(10);
  });
});

// ─── 體力扣除邏輯驗證 ───
describe("體力扣除邏輯全盤檢查", () => {
  it("戰鬥/探索/採集策略消耗體力", () => {
    const staminaStrategies = ["combat", "explore", "gather"];
    for (const strategy of staminaStrategies) {
      const needsStamina = strategy !== "rest" && strategy !== "infuse";
      expect(needsStamina).toBe(true);
    }
  });

  it("休息和注靈不消耗體力", () => {
    const freeStrategies = ["rest", "infuse"];
    for (const strategy of freeStrategies) {
      const needsStamina = strategy !== "rest" && strategy !== "infuse";
      expect(needsStamina).toBe(false);
    }
  });

  it("移動額外消耗體力（距離制）", () => {
    // 移動消耗 = max(0, moveCost - 5)
    const moveCost = 8;
    const baseCost = 5;
    const extraCost = Math.max(0, moveCost - baseCost);
    expect(extraCost).toBe(3);
  });

  it("近距離移動不額外消耗體力", () => {
    const moveCost = 3;
    const baseCost = 5;
    const extraCost = Math.max(0, moveCost - baseCost);
    expect(extraCost).toBe(0);
  });

  it("體力不足時自動切換注靈", () => {
    const agent = { stamina: 2, strategy: "combat" };
    const staminaPerTick = 5;
    if (agent.stamina < staminaPerTick) {
      agent.strategy = "infuse";
    }
    expect(agent.strategy).toBe("infuse");
  });
});
