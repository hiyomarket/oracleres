/**
 * wuxing-growth.test.ts
 * 五行屬性升級成長系統 + 大平衡公式的 Vitest 測試
 */
import { describe, it, expect } from "vitest";
import {
  MONSTER_HP_TABLE,
  PRICE_TABLE,
  getSuggestedPrice,
  auditMonsterStats,
  auditSkillStats,
  auditPrice,
  auditEquipStats,
  calcLevelUpWuxingGrowth,
  calcCumulativeWuxing,
  calcCharacterStatsV2,
  simulateCharacterAtLevel,
  generateGrowthCurve,
  compareCharacterVsMonster,
  WUXING_GENERATES,
  WUXING_STAT_ZH,
  type WuXingElement,
} from "./services/balanceFormulas";

// ═══════════════════════════════════════════════════════════════
// 一、怪物 HP 基準表
// ═══════════════════════════════════════════════════════════════
describe("MONSTER_HP_TABLE", () => {
  it("Lv1 基準 HP 為 80", () => {
    expect(MONSTER_HP_TABLE[1]).toBe(80);
  });

  it("Lv50 基準 HP 為 11500", () => {
    expect(MONSTER_HP_TABLE[50]).toBe(11500);
  });

  it("HP 隨等級遞增", () => {
    for (let lv = 2; lv <= 51; lv++) {
      expect(MONSTER_HP_TABLE[lv]).toBeGreaterThan(MONSTER_HP_TABLE[lv - 1]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 二、價格體系
// ═══════════════════════════════════════════════════════════════
describe("PRICE_TABLE", () => {
  it("技能書金幣價格 > 裝備 > 消耗品 > 材料（同稀有度）", () => {
    const rarities = ["common", "rare", "epic", "legendary"] as const;
    for (const r of rarities) {
      expect(PRICE_TABLE.skillBook[r].coins).toBeGreaterThan(PRICE_TABLE.equipment[r].coins);
      expect(PRICE_TABLE.equipment[r].coins).toBeGreaterThan(PRICE_TABLE.consumable[r].coins);
      expect(PRICE_TABLE.consumable[r].coins).toBeGreaterThan(PRICE_TABLE.material[r].coins);
    }
  });

  it("同類型中，稀有度越高金幣價格越高", () => {
    const categories = ["skillBook", "equipment", "consumable", "material"] as const;
    for (const cat of categories) {
      expect(PRICE_TABLE[cat].legendary.coins).toBeGreaterThan(PRICE_TABLE[cat].epic.coins);
      expect(PRICE_TABLE[cat].epic.coins).toBeGreaterThan(PRICE_TABLE[cat].rare.coins);
      expect(PRICE_TABLE[cat].rare.coins).toBeGreaterThan(PRICE_TABLE[cat].common.coins);
    }
  });

  it("史詩技能書價格應為 5000 金幣", () => {
    expect(PRICE_TABLE.skillBook.epic.coins).toBe(5000);
  });
});

describe("getSuggestedPrice", () => {
  it("返回正確的建議價格（含金幣和靈石）", () => {
    const price = getSuggestedPrice("skillBook", "epic");
    expect(price.coins).toBe(5000);
    expect(price.stones).toBe(150);
  });
});

// ═══════════════════════════════════════════════════════════════
// 三、AI 審核函數
// ═══════════════════════════════════════════════════════════════
describe("auditMonsterStats", () => {
  it("合理數值不產生違規", () => {
    // auditMonsterStats(stats, levelRange, rarity, race)
    const violations = auditMonsterStats(
      { baseHp: 420, baseAttack: 67, baseDefense: 50, baseSpeed: 16 },
      "10-10", "common", "一般",
    );
    expect(violations.length).toBe(0);
  });

  it("HP 過高會產生違規", () => {
    const violations = auditMonsterStats(
      { baseHp: 9999, baseAttack: 10, baseDefense: 5, baseSpeed: 8 },
      "1-1", "common", "一般",
    );
    expect(violations.some(v => v.field === "baseHp")).toBe(true);
  });

  it("HP 過低會產生違規", () => {
    const violations = auditMonsterStats(
      { baseHp: 10, baseAttack: 10, baseDefense: 5, baseSpeed: 8 },
      "50-50", "common", "一般",
    );
    expect(violations.some(v => v.field === "baseHp")).toBe(true);
  });
});

describe("auditSkillStats", () => {
  it("合理技能不產生違規", () => {
    // auditSkillStats(stats, tier, skillType)
    const violations = auditSkillStats(
      { powerPercent: 180, mpCost: 30, cooldown: 3 },
      "高階", "attack",
    );
    expect(violations.length).toBe(0);
  });

  it("初階技能 powerPercent 過高會違規", () => {
    const violations = auditSkillStats(
      { powerPercent: 500, mpCost: 5, cooldown: 0 },
      "初階", "attack",
    );
    expect(violations.some(v => v.field === "powerPercent")).toBe(true);
  });
});

describe("auditPrice", () => {
  it("合理價格不產生違規", () => {
    // auditPrice(price, itemType, rarity, currency)
    const violations = auditPrice(5000, "skillBook", "epic", "coins");
    expect(violations.length).toBe(0);
  });

  it("史詩技能書 800 金幣會違規（太低）", () => {
    const violations = auditPrice(800, "skillBook", "epic", "coins");
    expect(violations.some(v => v.field === "price")).toBe(true);
  });

  it("傳說技能書 25000 金幣不違規", () => {
    const violations = auditPrice(25000, "skillBook", "legendary", "coins");
    expect(violations.length).toBe(0);
  });
});

describe("auditEquipStats", () => {
  it("呼叫時不報錯", () => {
    // auditEquipStats(stats, tier, slot)
    const violations = auditEquipStats(
      { hpBonus: 50, attackBonus: 15, defenseBonus: 10, speedBonus: 5 },
      "rare",
      "weapon",
    );
    expect(Array.isArray(violations)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// 四、五行屬性升級成長系統
// ═══════════════════════════════════════════════════════════════
describe("五行屬性升級成長系統", () => {
  describe("calcLevelUpWuxingGrowth", () => {
    it("每次升級總共獲得 5 點五行屬性", () => {
      const growth = calcLevelUpWuxingGrowth("wood", 1);
      const total = growth.wood + growth.fire + growth.earth + growth.metal + growth.water;
      expect(total).toBeCloseTo(5, 0);
    });

    it("主屬性獲得最多點數（約 2 點）", () => {
      const growth = calcLevelUpWuxingGrowth("fire", 1);
      expect(growth.fire).toBeGreaterThanOrEqual(1.5);
      expect(growth.fire).toBeLessThanOrEqual(2.5);
    });

    it("相生屬性獲得次多點數", () => {
      // 木生火：木的相生是火
      const growth = calcLevelUpWuxingGrowth("wood", 1);
      const generating = WUXING_GENERATES["wood"];
      expect(growth[generating]).toBeGreaterThan(growth.metal);
    });

    it("不同主屬性的成長分布不同", () => {
      const woodGrowth = calcLevelUpWuxingGrowth("wood", 1);
      const fireGrowth = calcLevelUpWuxingGrowth("fire", 1);
      expect(woodGrowth.wood).toBeGreaterThan(fireGrowth.wood);
      expect(fireGrowth.fire).toBeGreaterThan(woodGrowth.fire);
    });
  });

  describe("calcCumulativeWuxing", () => {
    it("Lv1 角色有初始五行屬性 20", () => {
      const wuxing = calcCumulativeWuxing("wood", 1);
      expect(wuxing.wood).toBe(20);
      expect(wuxing.fire).toBe(20);
    });

    it("Lv10 角色的主屬性 > 其他屬性", () => {
      const wuxing = calcCumulativeWuxing("fire", 10);
      expect(wuxing.fire).toBeGreaterThan(wuxing.wood);
      expect(wuxing.fire).toBeGreaterThan(wuxing.earth);
      expect(wuxing.fire).toBeGreaterThan(wuxing.metal);
      expect(wuxing.fire).toBeGreaterThan(wuxing.water);
    });

    it("等級越高五行屬性越高", () => {
      const lv5 = calcCumulativeWuxing("wood", 5);
      const lv20 = calcCumulativeWuxing("wood", 20);
      expect(lv20.wood).toBeGreaterThan(lv5.wood);
      expect(lv20.fire).toBeGreaterThan(lv5.fire);
    });
  });

  describe("calcCharacterStatsV2", () => {
    it("返回完整的戰鬥數值", () => {
      const stats = calcCharacterStatsV2(
        { wood: 30, fire: 25, earth: 25, metal: 22, water: 22 },
        5
      );
      expect(stats.hp).toBeGreaterThan(0);
      expect(stats.mp).toBeGreaterThan(0);
      expect(stats.atk).toBeGreaterThan(0);
      expect(stats.def).toBeGreaterThan(0);
      expect(stats.spd).toBeGreaterThan(0);
      expect(stats.matk).toBeGreaterThan(0);
    });

    it("木屬性高 → HP 高", () => {
      const highWood = calcCharacterStatsV2({ wood: 80, fire: 20, earth: 20, metal: 20, water: 20 }, 10);
      const lowWood = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 20, metal: 20, water: 80 }, 10);
      expect(highWood.hp).toBeGreaterThan(lowWood.hp);
    });

    it("火屬性高 → ATK 高", () => {
      const highFire = calcCharacterStatsV2({ wood: 20, fire: 80, earth: 20, metal: 20, water: 20 }, 10);
      const lowFire = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 20, metal: 80, water: 20 }, 10);
      expect(highFire.atk).toBeGreaterThan(lowFire.atk);
    });

    it("土屬性高 → DEF 高", () => {
      const highEarth = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 80, metal: 20, water: 20 }, 10);
      const lowEarth = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 20, metal: 20, water: 80 }, 10);
      expect(highEarth.def).toBeGreaterThan(lowEarth.def);
    });

    it("金屬性高 → SPD 高", () => {
      const highMetal = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 20, metal: 80, water: 20 }, 10);
      const lowMetal = calcCharacterStatsV2({ wood: 80, fire: 20, earth: 20, metal: 20, water: 20 }, 10);
      expect(highMetal.spd).toBeGreaterThan(lowMetal.spd);
    });

    it("水屬性高 → MP 和 MATK 高", () => {
      const highWater = calcCharacterStatsV2({ wood: 20, fire: 20, earth: 20, metal: 20, water: 80 }, 10);
      const lowWater = calcCharacterStatsV2({ wood: 20, fire: 80, earth: 20, metal: 20, water: 20 }, 10);
      expect(highWater.mp).toBeGreaterThan(lowWater.mp);
      expect(highWater.matk).toBeGreaterThan(lowWater.matk);
    });

    it("等級越高戰鬥數值越高", () => {
      const wuxing = { wood: 30, fire: 30, earth: 30, metal: 30, water: 30 };
      const lv5 = calcCharacterStatsV2(wuxing, 5);
      const lv30 = calcCharacterStatsV2(wuxing, 30);
      expect(lv30.hp).toBeGreaterThan(lv5.hp);
      expect(lv30.atk).toBeGreaterThan(lv5.atk);
    });
  });

  describe("simulateCharacterAtLevel", () => {
    it("模擬角色在指定等級的完整數值", () => {
      const result = simulateCharacterAtLevel("wood", 20);
      expect(result.level).toBe(20);
      expect(result.wuxing.wood).toBeGreaterThan(result.wuxing.fire);
      expect(result.stats.hp).toBeGreaterThan(0);
    });
  });

  describe("generateGrowthCurve", () => {
    it("生成完整的成長曲線（Lv1~60）", () => {
      const curve = generateGrowthCurve("fire");
      expect(curve.length).toBe(60);
      expect(curve[0].level).toBe(1);
      expect(curve[59].level).toBe(60);
      // HP 應該遞增
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].stats.hp).toBeGreaterThanOrEqual(curve[i - 1].stats.hp);
      }
    });
  });

  describe("compareCharacterVsMonster", () => {
    it("比較角色和怪物的數值差距", () => {
      // 參數順序：characterLevel, dominantElement, monsterLevel, monsterRarity, monsterRace
      const comparison = compareCharacterVsMonster(10, "wood", 10, "common", "一般");
      expect(comparison).toHaveProperty("character");
      expect(comparison).toHaveProperty("monster");
      expect(comparison).toHaveProperty("analysis");
      expect(comparison.analysis).toHaveProperty("hpRatio");
      expect(comparison.analysis.hpRatio).toBeGreaterThan(0);
    });

    it("同等級角色應能戰勝 common 怪物", () => {
      const comparison = compareCharacterVsMonster(10, "fire", 10, "common", "一般");
      expect(comparison.analysis.winnable).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 五、五行相生相剋
// ═══════════════════════════════════════════════════════════════
describe("五行相生", () => {
  it("木生火、火生土、土生金、金生水、水生木", () => {
    expect(WUXING_GENERATES.wood).toBe("fire");
    expect(WUXING_GENERATES.fire).toBe("earth");
    expect(WUXING_GENERATES.earth).toBe("metal");
    expect(WUXING_GENERATES.metal).toBe("water");
    expect(WUXING_GENERATES.water).toBe("wood");
  });
});

describe("五行屬性中文名", () => {
  it("五行對應正確的戰鬥屬性名稱", () => {
    expect(WUXING_STAT_ZH.wood).toBe("體力");
    expect(WUXING_STAT_ZH.fire).toBe("力量");
    expect(WUXING_STAT_ZH.earth).toBe("強度");
    expect(WUXING_STAT_ZH.metal).toBe("速度");
    expect(WUXING_STAT_ZH.water).toBe("魔法");
  });
});

// ═══════════════════════════════════════════════════════════════
// 六、平衡一致性驗證
// ═══════════════════════════════════════════════════════════════
describe("平衡一致性驗證", () => {
  it("Lv10 木屬性角色應能撐住 Lv10 common 怪物至少 2 回合", () => {
    const comparison = compareCharacterVsMonster(10, "wood", 10, "common", "一般");
    expect(comparison.analysis.turnsToSurvive).toBeGreaterThanOrEqual(2);
  });

  it("Lv30 角色的 HP 應在合理範圍（GD-024: 300-10000）", () => {
    const player = simulateCharacterAtLevel("wood", 30);
    // GD-024 新公式下，低注靈的角色 HP 較低但仍在合理範圍
    expect(player.stats.hp).toBeGreaterThanOrEqual(300);
    expect(player.stats.hp).toBeLessThanOrEqual(10000);
  });

  it("不同五行主屬性的角色在同等級下總戰力應接近（±30%）", () => {
    const elements: WuXingElement[] = ["wood", "fire", "earth", "metal", "water"];
    const powers = elements.map(el => {
      const p = simulateCharacterAtLevel(el, 20);
      return p.stats.hp + p.stats.atk * 10 + p.stats.def * 8 + p.stats.spd * 5 + p.stats.mp * 2;
    });
    const avg = powers.reduce((a, b) => a + b, 0) / powers.length;
    for (const power of powers) {
      expect(power / avg).toBeGreaterThan(0.7);
      expect(power / avg).toBeLessThan(1.3);
    }
  });
});
