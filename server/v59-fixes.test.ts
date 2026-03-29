/**
 * v5.9 修復測試
 * 測試項目：
 * 1. 五行潛能分配系統（statEngine）
 * 2. 強化系統引擎（enhanceEngine）
 * 3. 伺服器重置引擎（worldResetEngine）
 * 4. 地圖節點連接（mapNodes）
 */
import { describe, it, expect } from "vitest";

// 模擬五行比例（平均分配）
const BALANCED_WUXING = { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };

// ─── 1. 五行潛能分配系統 ─────────────────────────────────────
describe("五行潛能分配系統 (statEngine)", () => {
  it("should import wuxing-based PotentialAllocation type", async () => {
    const mod = await import("./services/statEngine");
    expect(mod.calcFullStats).toBeDefined();
    expect(typeof mod.calcFullStats).toBe("function");
  });

  it("should calculate stats with zero wuxing potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    // calcFullStats(wuxing, level, potential, fateElement?, profession?)
    const stats = calcFullStats(BALANCED_WUXING, 1, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    expect(stats).toBeDefined();
    expect(stats.hp).toBeGreaterThan(0);
    expect(stats.mp).toBeGreaterThan(0);
    expect(stats.atk).toBeGreaterThan(0);
    expect(stats.def).toBeGreaterThan(0);
    expect(stats.spd).toBeGreaterThan(0);
  });

  it("should increase HP when allocating wood potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    const baseStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    const woodStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 50, fire: 0, earth: 0, metal: 0, water: 0,
    });
    // 木：+2 HP per point → 50 points = +100 HP
    expect(woodStats.hp).toBeGreaterThan(baseStats.hp);
  });

  it("should increase ATK when allocating fire potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    const baseStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    const fireStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 50, earth: 0, metal: 0, water: 0,
    });
    // 火：+0.5 ATK per point → 50 points = +25 ATK
    expect(fireStats.atk).toBeGreaterThan(baseStats.atk);
    // 確保不會太誇張 - 50 點火不應該超過 30 ATK 加成
    const atkDiff = fireStats.atk - baseStats.atk;
    expect(atkDiff).toBeLessThanOrEqual(30);
  });

  it("should increase DEF when allocating earth potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    const baseStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    const earthStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 50, metal: 0, water: 0,
    });
    expect(earthStats.def).toBeGreaterThan(baseStats.def);
  });

  it("should increase SPD when allocating metal potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    const baseStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    const metalStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 50, water: 0,
    });
    expect(metalStats.spd).toBeGreaterThan(baseStats.spd);
  });

  it("should increase MP when allocating water potential", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    const baseStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
    });
    const waterStats = calcFullStats(BALANCED_WUXING, 10, {
      wood: 0, fire: 0, earth: 0, metal: 0, water: 50,
    });
    expect(waterStats.mp).toBeGreaterThan(baseStats.mp);
  });

  it("should not allow level 1 character to have overpowered ATK", async () => {
    const { calcFullStats } = await import("./services/statEngine");
    // 1 等角色，全部 5 點都點火
    const stats = calcFullStats(BALANCED_WUXING, 1, {
      wood: 0, fire: 5, earth: 0, metal: 0, water: 0,
    });
    // 1 等角色的 ATK 不應超過 50（舊系統 50 點直接加 ATK 會有 150+，新系統只加 2.5）
    // 基礎 ATK = Lv*8 + 15 + (fire/100)*30 ≈ 29，加 5 點火潛能 ≈ 31
    expect(stats.atk).toBeLessThan(50);
  });

  it("should validate potential allocation", async () => {
    const { validatePotentialAllocation } = await import("./services/statEngine");
    // validatePotentialAllocation returns null for valid, string for error
    // 有效分配
    const valid = validatePotentialAllocation(
      { wood: 3, fire: 2, earth: 0, metal: 0, water: 0 },
      5
    );
    expect(valid).toBeNull(); // null = valid

    // 超額分配
    const invalid = validatePotentialAllocation(
      { wood: 3, fire: 3, earth: 0, metal: 0, water: 0 },
      5
    );
    expect(invalid).not.toBeNull(); // string = error message

    // 負數分配
    const negative = validatePotentialAllocation(
      { wood: -1, fire: 0, earth: 0, metal: 0, water: 0 },
      5
    );
    expect(negative).not.toBeNull(); // string = error message
  });
});

// ─── 2. 強化系統引擎 ─────────────────────────────────────
describe("強化系統引擎 (enhanceEngine)", () => {
  it("should export all required functions", async () => {
    const mod = await import("./services/enhanceEngine");
    expect(mod.performEnhanceWithConfig).toBeDefined();
    expect(mod.getEnhanceLevelInfo).toBeDefined();
    expect(mod.isScrollApplicable).toBeDefined();
    expect(mod.isBlessedScroll).toBeDefined();
    expect(mod.getSafeLevel).toBeDefined();
    expect(mod.getEnhancedBonusPreview).toBeDefined();
    expect(mod.calcEnhancedStat).toBeDefined();
  });

  it("should return correct safe levels for different slots", async () => {
    const { getSafeLevel } = await import("./services/enhanceEngine");
    expect(getSafeLevel("weapon")).toBe(6);
    expect(getSafeLevel("offhand")).toBe(6);
    expect(getSafeLevel("armor")).toBe(4);
    expect(getSafeLevel("helmet")).toBe(4);
    expect(getSafeLevel("shoes")).toBe(4);
    expect(getSafeLevel("accessory")).toBe(2);
  });

  it("should correctly identify blessed scrolls", async () => {
    const { isBlessedScroll } = await import("./services/enhanceEngine");
    expect(isBlessedScroll("blessed_weapon_scroll")).toBe(true);
    expect(isBlessedScroll("blessed_armor_scroll")).toBe(true);
    expect(isBlessedScroll("weapon_scroll")).toBe(false);
    expect(isBlessedScroll("armor_scroll")).toBe(false);
  });

  it("should correctly check scroll applicability", async () => {
    const { isScrollApplicable } = await import("./services/enhanceEngine");
    // 武器卷軸只能用於武器
    expect(isScrollApplicable("weapon_scroll", "weapon")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "offhand")).toBe(true);
    expect(isScrollApplicable("weapon_scroll", "armor")).toBe(false);
    // 防具卷軸用於非武器
    expect(isScrollApplicable("armor_scroll", "armor")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "helmet")).toBe(true);
    expect(isScrollApplicable("armor_scroll", "weapon")).toBe(false);
  });

  it("should return correct enhance level info", async () => {
    const { getEnhanceLevelInfo } = await import("./services/enhanceEngine");
    const info0 = getEnhanceLevelInfo(0);
    expect(info0.color).toBe("white");
    expect(info0.label).toBe("白");
    const info5 = getEnhanceLevelInfo(5);
    expect(info5.color).toBe("red");
    expect(info5.label).toBe("紅");
  });

  it("should calculate enhanced stat bonus correctly", async () => {
    const { calcEnhancedStat } = await import("./services/enhanceEngine");
    // +0 should return base value
    expect(calcEnhancedStat(100, 0)).toBe(100);
    // Higher levels should give more bonus
    const lv5 = calcEnhancedStat(100, 5);
    const lv10 = calcEnhancedStat(100, 10);
    expect(lv5).toBeGreaterThan(100);
    expect(lv10).toBeGreaterThan(lv5);
  });

  it("should return enhanced bonus preview with resist", async () => {
    const { getEnhancedBonusPreview } = await import("./services/enhanceEngine");
    const preview = getEnhancedBonusPreview({
      hpBonus: 100, attackBonus: 50, defenseBonus: 30, speedBonus: 10,
      resistBonus: { wood: 5, fire: 3, earth: 2, metal: 1, water: 4 },
    }, 5);
    expect(preview.hpBonus).toBeGreaterThanOrEqual(100);
    expect(preview.attackBonus).toBeGreaterThanOrEqual(50);
    expect(preview.resistBonus).toBeDefined();
    expect(preview.bonusPercent).toBeGreaterThan(0);
  });
});

// ─── 3. 地圖節點連接 ─────────────────────────────────────
describe("地圖節點連接 (mapNodes)", () => {
  it("should have connections for realm2 NPC nodes", async () => {
    const { MAP_NODES } = await import("../shared/mapNodes");
    const realm2Nodes = MAP_NODES.filter(n => n.id.startsWith("npc-realm2"));
    expect(realm2Nodes.length).toBeGreaterThan(0);
    // 每個 realm2 節點都應該有 connections
    for (const node of realm2Nodes) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it("should have entry point from realm1 to realm2", async () => {
    const { MAP_NODES } = await import("../shared/mapNodes");
    // realm1 的最後一個節點應該連接到 realm2 的第一個節點
    const realm1Nodes = MAP_NODES.filter(n => n.id.startsWith("npc-realm1"));
    const realm2Nodes = MAP_NODES.filter(n => n.id.startsWith("npc-realm2"));
    if (realm1Nodes.length > 0 && realm2Nodes.length > 0) {
      // 至少有一個 realm1 節點連接到 realm2
      const hasConnection = realm1Nodes.some(n =>
        n.connections.some(c => c.startsWith("npc-realm2"))
      );
      expect(hasConnection).toBe(true);
    }
  });

  it("should have connections for tower and abyss nodes", async () => {
    const { MAP_NODES } = await import("../shared/mapNodes");
    const towerNodes = MAP_NODES.filter(n => n.id.startsWith("npc-tower"));
    const abyssNodes = MAP_NODES.filter(n => n.id.startsWith("npc-abyss"));
    // Tower 和 Abyss 節點應該有 connections
    for (const node of [...towerNodes, ...abyssNodes]) {
      expect(node.connections.length).toBeGreaterThan(0);
    }
  });

  it("should not have self-referencing connections", async () => {
    const { MAP_NODES } = await import("../shared/mapNodes");
    for (const node of MAP_NODES) {
      expect(node.connections).not.toContain(node.id);
    }
  });
});

// ─── 4. 伺服器重置引擎 ─────────────────────────────────────
describe("伺服器重置引擎 (worldResetEngine)", () => {
  it("should export resetWorld function", async () => {
    const mod = await import("./worldResetEngine");
    expect(mod.resetWorld).toBeDefined();
    expect(typeof mod.resetWorld).toBe("function");
  });
});
