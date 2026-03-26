/**
 * M3K：五大行動體力扣除全盤測試
 * 確認：
 * - 「注靈」不扣體力
 * - 「休息」不扣體力
 * - 「戰鬥」正確扣除體力
 * - 「探索」正確扣除體力
 * - 「採集」正確扣除體力
 * - 體力不足時，戰鬥/探索/採集跳過行動
 * - 注靈時體力回復後自動切回 previousStrategy
 */
import { describe, it, expect } from "vitest";

// 模擬 processAgentTick 的體力扣除邏輯（純邏輯測試）
function simulateStaminaDeduction(strategy: string, currentStamina: number, staminaPerTick: number = 5) {
  const needsStamina = strategy !== "rest" && strategy !== "infuse";
  
  if (needsStamina) {
    if (currentStamina < staminaPerTick) {
      return { action: "skip", staminaAfter: currentStamina, reason: "體力不足" };
    }
    const newStamina = Math.max(0, currentStamina - staminaPerTick);
    return { action: "deduct", staminaAfter: newStamina, reason: `扣除 ${staminaPerTick} 點體力` };
  }
  
  // 休息和注靈不扣體力
  return { action: "no_deduct", staminaAfter: currentStamina, reason: `${strategy} 不消耗體力` };
}

// 模擬注靈的體力回復自動切換邏輯
function simulateInfuseAutoSwitch(stamina: number, previousStrategy: string | null) {
  if (stamina > 0) {
    const prevStrategy = previousStrategy ?? "explore";
    const nextStrategy = prevStrategy !== "infuse" ? prevStrategy : "explore";
    return { switched: true, newStrategy: nextStrategy };
  }
  return { switched: false, newStrategy: "infuse" };
}

describe("M3K 五大行動體力扣除", () => {
  
  describe("注靈策略（infuse）", () => {
    it("注靈不扣體力（體力 100）", () => {
      const result = simulateStaminaDeduction("infuse", 100);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(100);
    });

    it("注靈不扣體力（體力 0）", () => {
      const result = simulateStaminaDeduction("infuse", 0);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(0);
    });

    it("注靈不扣體力（體力 3，低於 staminaPerTick）", () => {
      const result = simulateStaminaDeduction("infuse", 3);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(3);
    });

    it("注靈時體力回復（>0）自動切回 previousStrategy=combat", () => {
      const result = simulateInfuseAutoSwitch(10, "combat");
      expect(result.switched).toBe(true);
      expect(result.newStrategy).toBe("combat");
    });

    it("注靈時體力回復，previousStrategy 為 null 時預設切回 explore", () => {
      const result = simulateInfuseAutoSwitch(5, null);
      expect(result.switched).toBe(true);
      expect(result.newStrategy).toBe("explore");
    });

    it("注靈時體力回復，previousStrategy 為 infuse 時切回 explore", () => {
      const result = simulateInfuseAutoSwitch(5, "infuse");
      expect(result.switched).toBe(true);
      expect(result.newStrategy).toBe("explore");
    });

    it("注靈時體力仍為 0，不切換", () => {
      const result = simulateInfuseAutoSwitch(0, "combat");
      expect(result.switched).toBe(false);
      expect(result.newStrategy).toBe("infuse");
    });
  });

  describe("休息策略（rest）", () => {
    it("休息不扣體力（體力 100）", () => {
      const result = simulateStaminaDeduction("rest", 100);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(100);
    });

    it("休息不扣體力（體力 0）", () => {
      const result = simulateStaminaDeduction("rest", 0);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(0);
    });

    it("休息不扣體力（體力 50）", () => {
      const result = simulateStaminaDeduction("rest", 50);
      expect(result.action).toBe("no_deduct");
      expect(result.staminaAfter).toBe(50);
    });
  });

  describe("戰鬥策略（combat）", () => {
    it("戰鬥正確扣除體力（100 → 95）", () => {
      const result = simulateStaminaDeduction("combat", 100);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(95);
    });

    it("戰鬥正確扣除體力（5 → 0）", () => {
      const result = simulateStaminaDeduction("combat", 5);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(0);
    });

    it("戰鬥體力不足時跳過行動（體力 3）", () => {
      const result = simulateStaminaDeduction("combat", 3);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(3);
    });

    it("戰鬥體力為 0 時跳過行動", () => {
      const result = simulateStaminaDeduction("combat", 0);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(0);
    });

    it("戰鬥自訂 staminaPerTick=10 正確扣除", () => {
      const result = simulateStaminaDeduction("combat", 50, 10);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(40);
    });
  });

  describe("探索策略（explore）", () => {
    it("探索正確扣除體力（100 → 95）", () => {
      const result = simulateStaminaDeduction("explore", 100);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(95);
    });

    it("探索正確扣除體力（10 → 5）", () => {
      const result = simulateStaminaDeduction("explore", 10);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(5);
    });

    it("探索體力不足時跳過行動（體力 4）", () => {
      const result = simulateStaminaDeduction("explore", 4);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(4);
    });

    it("探索體力為 0 時跳過行動", () => {
      const result = simulateStaminaDeduction("explore", 0);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(0);
    });
  });

  describe("採集策略（gather）", () => {
    it("採集正確扣除體力（100 → 95）", () => {
      const result = simulateStaminaDeduction("gather", 100);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(95);
    });

    it("採集正確扣除體力（20 → 15）", () => {
      const result = simulateStaminaDeduction("gather", 20);
      expect(result.action).toBe("deduct");
      expect(result.staminaAfter).toBe(15);
    });

    it("採集體力不足時跳過行動（體力 2）", () => {
      const result = simulateStaminaDeduction("gather", 2);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(2);
    });

    it("採集體力為 0 時跳過行動", () => {
      const result = simulateStaminaDeduction("gather", 0);
      expect(result.action).toBe("skip");
      expect(result.staminaAfter).toBe(0);
    });
  });

  describe("跨策略對比測試", () => {
    it("相同體力下，五大策略的扣除行為正確", () => {
      const stamina = 50;
      const combat = simulateStaminaDeduction("combat", stamina);
      const explore = simulateStaminaDeduction("explore", stamina);
      const gather = simulateStaminaDeduction("gather", stamina);
      const rest = simulateStaminaDeduction("rest", stamina);
      const infuse = simulateStaminaDeduction("infuse", stamina);

      // 戰鬥/探索/採集 扣體力
      expect(combat.action).toBe("deduct");
      expect(explore.action).toBe("deduct");
      expect(gather.action).toBe("deduct");
      expect(combat.staminaAfter).toBe(45);
      expect(explore.staminaAfter).toBe(45);
      expect(gather.staminaAfter).toBe(45);

      // 休息/注靈 不扣體力
      expect(rest.action).toBe("no_deduct");
      expect(infuse.action).toBe("no_deduct");
      expect(rest.staminaAfter).toBe(50);
      expect(infuse.staminaAfter).toBe(50);
    });

    it("體力為 0 時，只有注靈和休息能行動", () => {
      const stamina = 0;
      const combat = simulateStaminaDeduction("combat", stamina);
      const explore = simulateStaminaDeduction("explore", stamina);
      const gather = simulateStaminaDeduction("gather", stamina);
      const rest = simulateStaminaDeduction("rest", stamina);
      const infuse = simulateStaminaDeduction("infuse", stamina);

      expect(combat.action).toBe("skip");
      expect(explore.action).toBe("skip");
      expect(gather.action).toBe("skip");
      expect(rest.action).toBe("no_deduct");
      expect(infuse.action).toBe("no_deduct");
    });

    it("體力剛好等於 staminaPerTick 時，戰鬥/探索/採集能行動", () => {
      const stamina = 5;
      const combat = simulateStaminaDeduction("combat", stamina);
      const explore = simulateStaminaDeduction("explore", stamina);
      const gather = simulateStaminaDeduction("gather", stamina);

      expect(combat.action).toBe("deduct");
      expect(explore.action).toBe("deduct");
      expect(gather.action).toBe("deduct");
      expect(combat.staminaAfter).toBe(0);
      expect(explore.staminaAfter).toBe(0);
      expect(gather.staminaAfter).toBe(0);
    });

    it("體力比 staminaPerTick 少 1 時，戰鬥/探索/採集跳過", () => {
      const stamina = 4;
      const combat = simulateStaminaDeduction("combat", stamina);
      const explore = simulateStaminaDeduction("explore", stamina);
      const gather = simulateStaminaDeduction("gather", stamina);

      expect(combat.action).toBe("skip");
      expect(explore.action).toBe("skip");
      expect(gather.action).toBe("skip");
    });
  });

  describe("注靈自動切換完整流程", () => {
    it("注靈 → 體力恢復 → 切回戰鬥", () => {
      // 1. 體力為 0，注靈不扣體力
      const step1 = simulateStaminaDeduction("infuse", 0);
      expect(step1.action).toBe("no_deduct");
      expect(step1.staminaAfter).toBe(0);

      // 2. 體力回復到 10，自動切回 combat
      const step2 = simulateInfuseAutoSwitch(10, "combat");
      expect(step2.switched).toBe(true);
      expect(step2.newStrategy).toBe("combat");

      // 3. 切回 combat 後，正常扣體力
      const step3 = simulateStaminaDeduction("combat", 10);
      expect(step3.action).toBe("deduct");
      expect(step3.staminaAfter).toBe(5);
    });

    it("注靈 → 體力恢復 → 切回採集", () => {
      const step1 = simulateStaminaDeduction("infuse", 0);
      expect(step1.action).toBe("no_deduct");

      const step2 = simulateInfuseAutoSwitch(5, "gather");
      expect(step2.switched).toBe(true);
      expect(step2.newStrategy).toBe("gather");

      const step3 = simulateStaminaDeduction("gather", 5);
      expect(step3.action).toBe("deduct");
      expect(step3.staminaAfter).toBe(0);
    });

    it("注靈 → 體力恢復 → 切回探索", () => {
      const step1 = simulateStaminaDeduction("infuse", 0);
      expect(step1.action).toBe("no_deduct");

      const step2 = simulateInfuseAutoSwitch(20, "explore");
      expect(step2.switched).toBe(true);
      expect(step2.newStrategy).toBe("explore");

      const step3 = simulateStaminaDeduction("explore", 20);
      expect(step3.action).toBe("deduct");
      expect(step3.staminaAfter).toBe(15);
    });
  });
});
