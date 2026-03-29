/**
 * equipBonusCalc 測試
 * 驗證 calcEnhancedStat 與 getEquippedIds 的正確性
 * （DB 相關函數 calcEquipBonus / calcEquipBonusForAgent 需要整合測試，這裡只測純函數）
 */
import { describe, it, expect } from "vitest";
import { calcEnhancedStat, ENHANCE_STAT_BONUS, getEnhancedBonusPreview } from "./enhanceEngine";
import { getEquippedIds } from "./equipBonusCalc";

describe("calcEnhancedStat — 強化屬性加成公式", () => {
  it("強化等級 0 時，屬性不變", () => {
    expect(calcEnhancedStat(100, 0)).toBe(100);
    expect(calcEnhancedStat(50, 0)).toBe(50);
    expect(calcEnhancedStat(0, 0)).toBe(0);
  });

  it("強化等級 1 時，屬性 +2%", () => {
    // 100 * 1.02 = 102
    expect(calcEnhancedStat(100, 1)).toBe(102);
    // 50 * 1.02 = 51
    expect(calcEnhancedStat(50, 1)).toBe(51);
  });

  it("強化等級 5 時，屬性 +12%", () => {
    // 100 * 1.12 = 112
    expect(calcEnhancedStat(100, 5)).toBe(112);
    // 200 * 1.12 = 224
    expect(calcEnhancedStat(200, 5)).toBe(224);
  });

  it("強化等級 10 時，屬性 +36%", () => {
    // 100 * 1.36 = 136
    expect(calcEnhancedStat(100, 10)).toBe(136);
  });

  it("強化等級 12 時，屬性 +50%", () => {
    // 100 * 1.50 = 150
    expect(calcEnhancedStat(100, 12)).toBe(150);
    // 33 * 1.50 = 49.5 → floor = 49
    expect(calcEnhancedStat(33, 12)).toBe(49);
  });

  it("基礎值為 0 時，任何強化等級都是 0", () => {
    expect(calcEnhancedStat(0, 5)).toBe(0);
    expect(calcEnhancedStat(0, 12)).toBe(0);
  });

  it("未定義的強化等級回退為 0 加成", () => {
    // 等級 99 不在 ENHANCE_STAT_BONUS 中，bonus = 0
    expect(calcEnhancedStat(100, 99)).toBe(100);
  });

  it("多件裝備加成可正確累加", () => {
    // 模擬：武器 atk=80 +5, 頭盔 atk=20 +3
    const weaponAtk = calcEnhancedStat(80, 5);  // 80 * 1.12 = 89
    const helmetAtk = calcEnhancedStat(20, 3);  // 20 * 1.06 = 21
    expect(weaponAtk + helmetAtk).toBe(89 + 21);
    expect(weaponAtk + helmetAtk).toBe(110);
  });
});

describe("getEquippedIds — 從 agent 物件提取已裝備 ID", () => {
  it("所有欄位都有值時，返回 10 個 ID", () => {
    const agent = {
      equippedHead: "helm_01",
      equippedBody: "armor_01",
      equippedHands: "gloves_01",
      equippedFeet: "boots_01",
      equippedWeapon: "sword_01",
      equippedOffhand: "shield_01",
      equippedRingA: "ring_01",
      equippedRingB: "ring_02",
      equippedNecklace: "neck_01",
      equippedAmulet: "amulet_01",
    };
    const ids = getEquippedIds(agent);
    expect(ids).toHaveLength(10);
    expect(ids).toContain("sword_01");
    expect(ids).toContain("helm_01");
  });

  it("空欄位和 null 會被過濾掉", () => {
    const agent = {
      equippedHead: null,
      equippedBody: "armor_01",
      equippedHands: null,
      equippedFeet: null,
      equippedWeapon: "sword_01",
      equippedOffhand: null,
      equippedRingA: null,
      equippedRingB: null,
      equippedNecklace: null,
      equippedAmulet: null,
    };
    const ids = getEquippedIds(agent);
    expect(ids).toHaveLength(2);
    expect(ids).toContain("armor_01");
    expect(ids).toContain("sword_01");
  });

  it("全部為空時返回空陣列", () => {
    const agent = {
      equippedHead: null,
      equippedBody: null,
      equippedHands: null,
      equippedFeet: null,
      equippedWeapon: null,
      equippedOffhand: null,
      equippedRingA: null,
      equippedRingB: null,
      equippedNecklace: null,
      equippedAmulet: null,
    };
    expect(getEquippedIds(agent)).toHaveLength(0);
  });

  it("未定義的欄位也會被過濾", () => {
    const agent = {
      equippedWeapon: "sword_01",
    };
    const ids = getEquippedIds(agent);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe("sword_01");
  });
});

describe("getEnhancedBonusPreview — 強化預覽含 matk/mdef 和動態設定", () => {
  it("基本預覽含所有屬性", () => {
    const catalog = {
      hpBonus: 100, attackBonus: 50, defenseBonus: 30, speedBonus: 10,
      magicAttackBonus: 40, magicDefenseBonus: 20,
    };
    const preview = getEnhancedBonusPreview(catalog, 5); // +12%
    expect(preview.hpBonus).toBe(112);
    expect(preview.attackBonus).toBe(56);
    expect(preview.defenseBonus).toBe(33);
    expect(preview.speedBonus).toBe(11);
    expect(preview.matkBonus).toBe(44);
    expect(preview.mdefBonus).toBe(22);
    expect(preview.bonusPercent).toBe(0.12);
  });

  it("當 magicAttackBonus 未定義時預設為 0", () => {
    const catalog = {
      hpBonus: 100, attackBonus: 50, defenseBonus: 30, speedBonus: 10,
    };
    const preview = getEnhancedBonusPreview(catalog, 3);
    expect(preview.matkBonus).toBe(0);
    expect(preview.mdefBonus).toBe(0);
  });

  it("使用動態設定的 statBonus 覆寫預設值", () => {
    const catalog = {
      hpBonus: 100, attackBonus: 100, defenseBonus: 100, speedBonus: 100,
    };
    const customBonus: Record<number, number> = { 0: 0, 1: 0.5, 2: 1.0 };
    const preview = getEnhancedBonusPreview(catalog, 1, customBonus);
    expect(preview.attackBonus).toBe(150); // 100 * 1.5
    expect(preview.bonusPercent).toBe(0.5);
  });

  it("等級 0 時屬性不變", () => {
    const catalog = {
      hpBonus: 100, attackBonus: 50, defenseBonus: 30, speedBonus: 10,
      magicAttackBonus: 40, magicDefenseBonus: 20,
    };
    const preview = getEnhancedBonusPreview(catalog, 0);
    expect(preview.hpBonus).toBe(100);
    expect(preview.attackBonus).toBe(50);
    expect(preview.matkBonus).toBe(40);
  });
});

describe("ENHANCE_STAT_BONUS — 加成表完整性", () => {
  it("等級 0-14 都有定義", () => {
    for (let i = 0; i <= 14; i++) {
      expect(ENHANCE_STAT_BONUS[i]).toBeDefined();
      expect(typeof ENHANCE_STAT_BONUS[i]).toBe("number");
    }
  });

  it("加成值隨等級遞增", () => {
    for (let i = 1; i <= 14; i++) {
      expect(ENHANCE_STAT_BONUS[i]).toBeGreaterThan(ENHANCE_STAT_BONUS[i - 1]);
    }
  });
});
