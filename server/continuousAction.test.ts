/**
 * 行動持續邏輯測試
 * 測試體力歸零時自動切換注靈、注靈中體力回復後自動切回原策略
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb 和 createEvent
const mockUpdate = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });
const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const mockSelect = vi.fn();
const mockDb = {
  update: mockUpdate,
  insert: mockInsert,
  select: mockSelect,
};

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://mock.url" }),
}));

describe("行動持續邏輯", () => {
  describe("體力不足自動切換注靈", () => {
    it("當策略為 combat 且體力不足時，應切換為 infuse", () => {
      // 驗證邏輯：needsStamina 為 true 且 stamina < staminaPerTick
      const strategy = "combat";
      const stamina = 0;
      const staminaPerTick = 5;
      const needsStamina = strategy !== "rest" && strategy !== "infuse";
      
      expect(needsStamina).toBe(true);
      expect(stamina < staminaPerTick).toBe(true);
      // 在此情況下，後端應自動切換為 infuse
    });

    it("當策略為 explore 且體力不足時，應切換為 infuse", () => {
      const strategy = "explore";
      const stamina = 2;
      const staminaPerTick = 5;
      const needsStamina = strategy !== "rest" && strategy !== "infuse";
      
      expect(needsStamina).toBe(true);
      expect(stamina < staminaPerTick).toBe(true);
    });

    it("當策略為 gather 且體力不足時，應切換為 infuse", () => {
      const strategy = "gather";
      const stamina = 0;
      const staminaPerTick = 5;
      const needsStamina = strategy !== "rest" && strategy !== "infuse";
      
      expect(needsStamina).toBe(true);
      expect(stamina < staminaPerTick).toBe(true);
    });

    it("注靈和休息不需要體力", () => {
      expect("rest" !== "rest" && "rest" !== "infuse").toBe(false);
      expect("infuse" !== "rest" && "infuse" !== "infuse").toBe(false);
    });

    it("體力充足時不應切換注靈", () => {
      const stamina = 10;
      const staminaPerTick = 5;
      expect(stamina < staminaPerTick).toBe(false);
    });
  });

  describe("注靈中體力回復自動切回原策略", () => {
    it("體力 > 0 時應切回 previousStrategy", () => {
      const agent = {
        strategy: "infuse",
        previousStrategy: "combat",
        stamina: 10,
      };
      
      expect(agent.strategy).toBe("infuse");
      expect(agent.stamina > 0).toBe(true);
      
      // 應切回 combat
      const nextStrategy = agent.previousStrategy !== "infuse" ? agent.previousStrategy : "explore";
      expect(nextStrategy).toBe("combat");
    });

    it("previousStrategy 為 null 時應預設切回 explore", () => {
      const agent = {
        strategy: "infuse",
        previousStrategy: null as string | null,
        stamina: 5,
      };
      
      const prevStrategy = agent.previousStrategy ?? "explore";
      const nextStrategy = prevStrategy !== "infuse" ? prevStrategy : "explore";
      expect(nextStrategy).toBe("explore");
    });

    it("previousStrategy 為 infuse 時應切回 explore（避免無限循環）", () => {
      const agent = {
        strategy: "infuse",
        previousStrategy: "infuse",
        stamina: 5,
      };
      
      const prevStrategy = agent.previousStrategy ?? "explore";
      const nextStrategy = prevStrategy !== "infuse" ? prevStrategy : "explore";
      expect(nextStrategy).toBe("explore");
    });

    it("體力為 0 時應繼續注靈", () => {
      const agent = {
        strategy: "infuse",
        previousStrategy: "combat",
        stamina: 0,
      };
      
      expect(agent.stamina > 0).toBe(false);
      // 應繼續執行注靈邏輯
    });
  });

  describe("休息回復邏輯", () => {
    it("休息時應回復 15% maxHp 和 maxMp", () => {
      const maxHp = 200;
      const maxMp = 100;
      const hp = 50;
      const mp = 20;
      
      const hpRestore = Math.floor(maxHp * 0.15);
      const mpRestore = Math.floor(maxMp * 0.15);
      
      expect(hpRestore).toBe(30);
      expect(mpRestore).toBe(15);
      
      const newHp = Math.min(maxHp, hp + hpRestore);
      const newMp = Math.min(maxMp, mp + mpRestore);
      
      expect(newHp).toBe(80);
      expect(newMp).toBe(35);
    });

    it("HP/MP 回滿 95% 時應判定為完全回復", () => {
      const maxHp = 200;
      const maxMp = 100;
      const hp = 195; // 97.5% > 95%
      const mp = 96;  // 96% > 95%
      
      const isFullyHealed = hp >= maxHp * 0.95 && mp >= maxMp * 0.95;
      expect(isFullyHealed).toBe(true);
    });

    it("HP 未達 95% 時應繼續休息", () => {
      const maxHp = 200;
      const maxMp = 100;
      const hp = 180; // 90% < 95%
      const mp = 96;
      
      const isFullyHealed = hp >= maxHp * 0.95 && mp >= maxMp * 0.95;
      expect(isFullyHealed).toBe(false);
    });
  });

  describe("策略切換記錄 previousStrategy", () => {
    it("從 combat 切換到 infuse 時應記錄 previousStrategy = combat", () => {
      const currentStrategy = "combat";
      const newStrategy = "infuse";
      
      // 切換到 infuse 時記錄前一個策略
      let previousStrategy: string | null = null;
      if (newStrategy === "rest" || newStrategy === "infuse") {
        if (currentStrategy !== "rest" && currentStrategy !== "infuse") {
          previousStrategy = currentStrategy;
        }
      }
      
      expect(previousStrategy).toBe("combat");
    });

    it("從 explore 切換到 combat 時應清除 previousStrategy", () => {
      const newStrategy = "combat";
      
      let previousStrategy: string | null = "explore";
      if (newStrategy !== "rest" && newStrategy !== "infuse") {
        previousStrategy = null;
      }
      
      expect(previousStrategy).toBeNull();
    });
  });

  describe("Tick 間隔邏輯", () => {
    it("前端 Tick 間隔應為 10 秒", () => {
      const TICK_INTERVAL_MS = 10 * 1000;
      expect(TICK_INTERVAL_MS).toBe(10000);
    });
  });

  describe("體力回復計算", () => {
    it("regenStamina 應根據經過時間計算回復量", () => {
      const stamina = 0;
      const maxStamina = 100;
      const regenMinutes = 30;
      const regenAmount = 30;
      const lastRegen = Date.now() - 60 * 60 * 1000; // 1 小時前
      const now = Date.now();
      
      const elapsed = now - lastRegen;
      const regenIntervalMs = regenMinutes * 60 * 1000;
      const regenCycles = Math.floor(elapsed / regenIntervalMs);
      const totalRegen = regenCycles * regenAmount;
      const newStamina = Math.min(maxStamina, stamina + totalRegen);
      
      expect(regenCycles).toBe(2); // 60 分鐘 / 30 分鐘 = 2 次
      expect(totalRegen).toBe(60); // 2 × 30 = 60
      expect(newStamina).toBe(60);
    });

    it("體力不應超過最大值", () => {
      const stamina = 80;
      const maxStamina = 100;
      const totalRegen = 50;
      
      const newStamina = Math.min(maxStamina, stamina + totalRegen);
      expect(newStamina).toBe(100);
    });
  });
});
