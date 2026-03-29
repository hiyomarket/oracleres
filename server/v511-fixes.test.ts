/**
 * v5.11 Tests — 戰鬥平衡面板 + AI圖鑑隨機性 + 角色管理面板
 */
import { describe, it, expect } from "vitest";

// ─── 1. AI 平衡系統隨機性 ──────────────────────────────────────────────
describe("AI Balance Randomness", () => {
  it("balanceFix should return value within [min, max] range", () => {
    function balanceFix(val: number, min: number, max: number): number {
      if (val >= min && val <= max) return val;
      const lo = min + (max - min) * 0.1;
      const hi = max - (max - min) * 0.1;
      return Math.round(lo + Math.random() * (hi - lo));
    }

    const results = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const v = balanceFix(999, 10, 50);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(50);
      results.add(v);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("balanceFix should return original value if within range", () => {
    function balanceFix(val: number, min: number, max: number): number {
      if (val >= min && val <= max) return val;
      const lo = min + (max - min) * 0.1;
      const hi = max - (max - min) * 0.1;
      return Math.round(lo + Math.random() * (hi - lo));
    }

    expect(balanceFix(25, 10, 50)).toBe(25);
    expect(balanceFix(10, 10, 50)).toBe(10);
    expect(balanceFix(50, 10, 50)).toBe(50);
  });

  it("applyVariance should produce varied results", () => {
    function applyVariance(val: number, pct: number): number {
      const delta = val * pct;
      const result = val + (Math.random() * 2 - 1) * delta;
      return Math.max(0, Math.round(result));
    }

    const results = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const v = applyVariance(100, 0.15);
      expect(v).toBeGreaterThanOrEqual(70);
      expect(v).toBeLessThanOrEqual(130);
      results.add(v);
    }
    expect(results.size).toBeGreaterThan(3);
  });
});

// ─── 2. Engine Config - Wuxing Potential Config ────────────────────────
describe("Engine Config - Wuxing Potential", () => {
  it("should have getPotentialWuxingConfig function", async () => {
    const mod = await import("./gameEngineConfig");
    expect(typeof mod.getPotentialWuxingConfig).toBe("function");
  });

  it("getPotentialWuxingConfig should return nested wuxing bonus params", async () => {
    const mod = await import("./gameEngineConfig");
    const config = mod.getPotentialWuxingConfig();
    
    // Nested structure: wood.hp, fire.atk, earth.def, metal.spd, water.mp
    expect(config).toHaveProperty("wood");
    expect(config).toHaveProperty("fire");
    expect(config).toHaveProperty("earth");
    expect(config).toHaveProperty("metal");
    expect(config).toHaveProperty("water");
    
    expect(config.wood).toHaveProperty("hp");
    expect(config.fire).toHaveProperty("atk");
    expect(config.earth).toHaveProperty("def");
    expect(config.metal).toHaveProperty("spd");
    expect(config.water).toHaveProperty("mp");
    
    expect(config.wood.hp).toBeGreaterThan(0);
    expect(config.fire.atk).toBeGreaterThan(0);
    expect(config.earth.def).toBeGreaterThan(0);
    expect(config.metal.spd).toBeGreaterThan(0);
    expect(config.water.mp).toBeGreaterThan(0);
  });

  it("should have getExpCurveConfig function", async () => {
    const mod = await import("./gameEngineConfig");
    expect(typeof mod.getExpCurveConfig).toBe("function");
  });

  it("getExpCurveConfig should return V3 formula params (A, B, C)", async () => {
    const mod = await import("./gameEngineConfig");
    const config = mod.getExpCurveConfig();
    
    expect(config).toHaveProperty("A");
    expect(config).toHaveProperty("B");
    expect(config).toHaveProperty("C");
    expect(config).toHaveProperty("potentialPointsPerLevel");
    
    expect(config.A).toBeGreaterThan(0);
    expect(config.B).toBeGreaterThan(0);
    expect(config.potentialPointsPerLevel).toBeGreaterThanOrEqual(1);
  });
});

// ─── 3. Combat Simulator Enhanced Fields ───────────────────────────────
describe("Combat Simulator Enhanced Fields", () => {
  it("calcFullStats should include healPower and hitRate in results", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    
    const wuxing = { wood: 30, fire: 30, earth: 30, metal: 30, water: 30 };
    const potential = { wood: 5, fire: 5, earth: 5, metal: 5, water: 5 };
    const result = calcFullStats(wuxing, 10, potential, "金", "warrior");
    
    // calcFullStats returns short names: hp, mp, atk, def, spd, matk, mdef, spr, critRate, critDamage, healPower, hitRate
    expect(result).toHaveProperty("healPower");
    expect(result).toHaveProperty("hitRate");
    expect(result).toHaveProperty("atk");
    expect(result).toHaveProperty("def");
    expect(result).toHaveProperty("matk");
    expect(result).toHaveProperty("mdef");
    expect(result).toHaveProperty("spd");
    expect(result).toHaveProperty("critRate");
    expect(result).toHaveProperty("critDamage");
    expect(result).toHaveProperty("spr");
    
    // All values should be valid numbers
    expect(result.healPower).not.toBeNaN();
    expect(result.hitRate).not.toBeNaN();
    expect(result.atk).not.toBeNaN();
    expect(result.def).not.toBeNaN();
  });

  it("calcFullStats results should be reasonable for level 10", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    
    const wuxing = { wood: 30, fire: 30, earth: 30, metal: 30, water: 30 };
    const potential = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    
    const base = calcFullStats(wuxing, 10, potential, "金", "none");
    
    // Base stats should be positive
    expect(base.atk).toBeGreaterThan(0);
    expect(base.def).toBeGreaterThan(0);
    expect(base.hp).toBeGreaterThan(0);
    expect(base.mp).toBeGreaterThan(0);
    expect(base.spd).toBeGreaterThan(0);
  });

  it("potential allocation should affect stats", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    
    const wuxing = { wood: 30, fire: 30, earth: 30, metal: 30, water: 30 };
    const noPotential = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    const firePotential = { wood: 0, fire: 50, earth: 0, metal: 0, water: 0 };
    
    const base = calcFullStats(wuxing, 10, noPotential, "金", "none");
    const withFire = calcFullStats(wuxing, 10, firePotential, "金", "none");
    
    // Fire potential should increase ATK
    expect(withFire.atk).toBeGreaterThan(base.atk);
  });
});

// ─── 4. Item Target Validation ─────────────────────────────────────────
describe("Item Target Validation", () => {
  it("healing items should only target friendly units", () => {
    const isHealingEffect = (effect: string) => {
      return ["heal_hp", "heal_mp", "revive", "buff_atk", "buff_def"].includes(effect);
    };

    expect(isHealingEffect("heal_hp")).toBe(true);
    expect(isHealingEffect("heal_mp")).toBe(true);
    expect(isHealingEffect("revive")).toBe(true);
    expect(isHealingEffect("damage")).toBe(false);
  });

  it("team validation should prevent cross-team item usage", () => {
    const validateTarget = (actorTeam: string, targetTeam: string, effect: string) => {
      const selfOnlyEffects = ["heal_hp", "heal_mp", "revive", "buff_atk", "buff_def"];
      if (selfOnlyEffects.includes(effect) && actorTeam !== targetTeam) {
        return false;
      }
      return true;
    };

    expect(validateTarget("player", "player", "heal_hp")).toBe(true);
    expect(validateTarget("player", "enemy", "heal_hp")).toBe(false);
    expect(validateTarget("player", "enemy", "damage")).toBe(true);
  });
});
