import { describe, expect, it, beforeEach } from "vitest";
import {
  getEngineConfig,
  updateEngineConfig,
  resetEngineConfig,
  getRewardMultipliers,
  getAfkTickConfig,
  getInfuseConfig,
  getMultipliers,
  getEventChances,
} from "./gameEngineConfig";

describe("gameEngineConfig", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    resetEngineConfig("test");
  });

  it("returns default config values", () => {
    const cfg = getEngineConfig();
    expect(cfg.tickIntervalMs).toBe(5 * 60 * 1000);
    expect(cfg.expMultiplier).toBe(1.0);
    expect(cfg.goldMultiplier).toBe(1.0);
    expect(cfg.dropMultiplier).toBe(1.0);
    expect(cfg.combatChance).toBe(0.65);
    expect(cfg.gatherChance).toBe(0.20);
    expect(cfg.rogueChance).toBe(0.05);
    expect(cfg.gameEnabled).toBe(true);
  });

  it("returns default reward multipliers (idle=0.33, closed=1.0, open=1.5)", () => {
    const mults = getRewardMultipliers();
    expect(mults.idle).toBe(0.33);
    expect(mults.player_closed).toBe(1.0);
    expect(mults.player_open).toBe(1.5);
  });

  it("returns default AFK tick config (15s, enabled)", () => {
    const afk = getAfkTickConfig();
    expect(afk.intervalMs).toBe(15_000);
    expect(afk.enabled).toBe(true);
  });

  it("returns default infuse config", () => {
    const infuse = getInfuseConfig();
    expect(infuse.minGain).toBe(0.1);
    expect(infuse.maxGain).toBe(0.5);
    expect(infuse.failRate).toBe(0.2);
    expect(infuse.maxWuxing).toBe(100);
  });

  it("updates reward multipliers via updateEngineConfig", () => {
    updateEngineConfig(
      { rewardMultIdle: 0.5, rewardMultClosed: 1.2, rewardMultOpen: 2.0 },
      "admin"
    );
    const mults = getRewardMultipliers();
    expect(mults.idle).toBe(0.5);
    expect(mults.player_closed).toBe(1.2);
    expect(mults.player_open).toBe(2.0);
  });

  it("updates AFK tick config via updateEngineConfig", () => {
    updateEngineConfig(
      { afkTickIntervalMs: 30_000, afkTickEnabled: false },
      "admin"
    );
    const afk = getAfkTickConfig();
    expect(afk.intervalMs).toBe(30_000);
    expect(afk.enabled).toBe(false);
  });

  it("partial update preserves other fields", () => {
    updateEngineConfig({ rewardMultOpen: 3.0 }, "admin");
    const cfg = getEngineConfig();
    // Updated field
    expect(cfg.rewardMultOpen).toBe(3.0);
    // Preserved fields
    expect(cfg.rewardMultIdle).toBe(0.33);
    expect(cfg.rewardMultClosed).toBe(1.0);
    expect(cfg.afkTickEnabled).toBe(true);
    expect(cfg.expMultiplier).toBe(1.0);
  });

  it("resetEngineConfig restores all defaults", () => {
    updateEngineConfig(
      {
        rewardMultIdle: 0.5,
        rewardMultOpen: 3.0,
        afkTickEnabled: false,
        afkTickIntervalMs: 60_000,
        expMultiplier: 5.0,
      },
      "admin"
    );
    resetEngineConfig("admin");
    const cfg = getEngineConfig();
    expect(cfg.rewardMultIdle).toBe(0.33);
    expect(cfg.rewardMultOpen).toBe(1.5);
    expect(cfg.afkTickEnabled).toBe(true);
    expect(cfg.afkTickIntervalMs).toBe(15_000);
    expect(cfg.expMultiplier).toBe(1.0);
  });

  it("tracks lastUpdatedBy and lastUpdatedAt", () => {
    const before = Date.now();
    updateEngineConfig({ expMultiplier: 2.0 }, "test-admin");
    const cfg = getEngineConfig();
    expect(cfg.lastUpdatedBy).toBe("test-admin");
    expect(cfg.lastUpdatedAt).toBeGreaterThanOrEqual(before);
  });

  it("getMultipliers returns exp/gold/drop", () => {
    updateEngineConfig({ expMultiplier: 2.5, goldMultiplier: 3.0, dropMultiplier: 1.5 }, "admin");
    const m = getMultipliers();
    expect(m.exp).toBe(2.5);
    expect(m.gold).toBe(3.0);
    expect(m.drop).toBe(1.5);
  });

  it("getEventChances returns combat/gather/rogue", () => {
    updateEngineConfig({ combatChance: 0.8, gatherChance: 0.1, rogueChance: 0.1 }, "admin");
    const c = getEventChances();
    expect(c.combat).toBe(0.8);
    expect(c.gather).toBe(0.1);
    expect(c.rogue).toBe(0.1);
  });
});
