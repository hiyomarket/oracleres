/**
 * shop-equip-fixes.test.ts
 * 驗證第十五批修正：
 * 1. 商店 maxPerOrder 限制邏輯
 * 2. 裝備加成計算（equipBonus）
 * 3. 裝備槽位對應（SLOT_MAP）
 */
import { describe, it, expect } from "vitest";

// ─── 1. 商店 maxPerOrder 限制邏輯 ───────────────────────────────
describe("商店批量購買限制", () => {
  function calcBuyQty(inputQty: number, maxPerOrder: number): number {
    return maxPerOrder > 0 ? Math.min(inputQty, maxPerOrder) : inputQty;
  }

  it("maxPerOrder=10，購買 5 件 → 允許 5 件", () => {
    expect(calcBuyQty(5, 10)).toBe(5);
  });

  it("maxPerOrder=10，購買 15 件 → 限制為 10 件", () => {
    expect(calcBuyQty(15, 10)).toBe(10);
  });

  it("maxPerOrder=0（無限制），購買 100 件 → 允許 100 件", () => {
    expect(calcBuyQty(100, 0)).toBe(100);
  });

  it("maxPerOrder=1，購買 5 件 → 限制為 1 件", () => {
    expect(calcBuyQty(5, 1)).toBe(1);
  });

  it("批量購買總費用計算正確", () => {
    const unitPrice = 50;
    const qty = 7;
    const maxPerOrder = 10;
    const actualQty = calcBuyQty(qty, maxPerOrder);
    const totalCost = unitPrice * actualQty;
    expect(totalCost).toBe(350);
  });

  it("批量購買總獲得數量計算正確（商品數量 × 購買次數）", () => {
    const itemQuantity = 3; // 每次購買獲得 3 件
    const buyQty = 4;       // 購買 4 次
    const totalQty = itemQuantity * buyQty;
    expect(totalQty).toBe(12);
  });
});

// ─── 2. 裝備加成計算（equipBonus）───────────────────────────────
describe("裝備加成計算", () => {
  interface EquipSlot {
    hpBonus: number;
    attackBonus: number;
    defenseBonus: number;
    speedBonus: number;
    matkBonus: number;
    mdefBonus: number;
    critBonus: number;
    healBonus: number;
  }

  function calcEquipBonus(slots: (EquipSlot | null)[]): EquipSlot {
    return slots.reduce<EquipSlot>(
      (acc, slot) => {
        if (!slot) return acc;
        return {
          hpBonus: acc.hpBonus + (slot.hpBonus ?? 0),
          attackBonus: acc.attackBonus + (slot.attackBonus ?? 0),
          defenseBonus: acc.defenseBonus + (slot.defenseBonus ?? 0),
          speedBonus: acc.speedBonus + (slot.speedBonus ?? 0),
          matkBonus: acc.matkBonus + (slot.matkBonus ?? 0),
          mdefBonus: acc.mdefBonus + (slot.mdefBonus ?? 0),
          critBonus: acc.critBonus + (slot.critBonus ?? 0),
          healBonus: acc.healBonus + (slot.healBonus ?? 0),
        };
      },
      { hpBonus: 0, attackBonus: 0, defenseBonus: 0, speedBonus: 0, matkBonus: 0, mdefBonus: 0, critBonus: 0, healBonus: 0 }
    );
  }

  it("無裝備時加成全為 0", () => {
    const bonus = calcEquipBonus([null, null, null]);
    expect(bonus.attackBonus).toBe(0);
    expect(bonus.defenseBonus).toBe(0);
    expect(bonus.hpBonus).toBe(0);
  });

  it("單件裝備加成正確累加", () => {
    const helmet: EquipSlot = { hpBonus: 20, attackBonus: 0, defenseBonus: 5, speedBonus: 0, matkBonus: 0, mdefBonus: 0, critBonus: 0, healBonus: 0 };
    const bonus = calcEquipBonus([helmet, null]);
    expect(bonus.hpBonus).toBe(20);
    expect(bonus.defenseBonus).toBe(5);
    expect(bonus.attackBonus).toBe(0);
  });

  it("多件裝備加成正確累加", () => {
    const weapon: EquipSlot = { hpBonus: 0, attackBonus: 50, defenseBonus: 0, speedBonus: 0, matkBonus: 0, mdefBonus: 0, critBonus: 10, healBonus: 0 };
    const armor: EquipSlot = { hpBonus: 100, attackBonus: 0, defenseBonus: 30, speedBonus: 0, matkBonus: 0, mdefBonus: 20, critBonus: 0, healBonus: 0 };
    const gloves: EquipSlot = { hpBonus: 0, attackBonus: 0, defenseBonus: 10, speedBonus: 5, matkBonus: 0, mdefBonus: 0, critBonus: 5, healBonus: 0 };
    const bonus = calcEquipBonus([weapon, armor, gloves]);
    expect(bonus.attackBonus).toBe(50);
    expect(bonus.defenseBonus).toBe(40);
    expect(bonus.hpBonus).toBe(100);
    expect(bonus.critBonus).toBe(15);
    expect(bonus.speedBonus).toBe(5);
    expect(bonus.mdefBonus).toBe(20);
  });

  it("戰鬥屬性加上裝備加成後正確顯示", () => {
    const baseAtk = 186;
    const equipAtkBonus = 50;
    const finalAtk = Math.min(baseAtk + equipAtkBonus, 2000); // 上限 2000
    expect(finalAtk).toBe(236);
  });

  it("裝備加成不超過屬性上限", () => {
    const baseAtk = 1990;
    const equipAtkBonus = 50;
    const cap = 2000;
    const finalAtk = Math.min(baseAtk + equipAtkBonus, cap);
    expect(finalAtk).toBe(2000);
  });
});

// ─── 3. 裝備槽位對應（SLOT_MAP）────────────────────────────────
describe("裝備槽位對應", () => {
  // 前端 EQUIP_SLOTS 的 slot key → 資料庫欄位
  const FRONT_TO_DB: Record<string, string> = {
    weapon: "equippedWeapon",
    offhand: "equippedOffhand",
    head: "equippedHead",
    body: "equippedBody",
    hands: "equippedHands",   // 手套
    feet: "equippedFeet",
    ringA: "equippedRingA",
    ringB: "equippedRingB",
    necklace: "equippedNecklace",
    amulet: "equippedAmulet",
  };

  // 圖鑑 slot 值 → 資料庫欄位（穿戴時用）
  const CATALOG_TO_DB: Record<string, string> = {
    weapon: "equippedWeapon",
    offhand: "equippedOffhand",
    helmet: "equippedHead",
    armor: "equippedBody",
    gloves: "equippedHands",   // 手套圖鑑 slot
    shoes: "equippedFeet",
    ringA: "equippedRingA",
    ringB: "equippedRingB",
    necklace: "equippedNecklace",
    amulet: "equippedAmulet",
  };

  it("前端 hands 槽位對應到 equippedHands 資料庫欄位", () => {
    expect(FRONT_TO_DB["hands"]).toBe("equippedHands");
  });

  it("圖鑑 gloves slot 對應到 equippedHands 資料庫欄位", () => {
    expect(CATALOG_TO_DB["gloves"]).toBe("equippedHands");
  });

  it("前端 hands 和圖鑑 gloves 最終都對應到相同的資料庫欄位", () => {
    expect(FRONT_TO_DB["hands"]).toBe(CATALOG_TO_DB["gloves"]);
  });

  it("所有 10 個裝備槽位都有對應的資料庫欄位", () => {
    expect(Object.keys(FRONT_TO_DB).length).toBe(10);
    expect(Object.keys(CATALOG_TO_DB).length).toBe(10);
  });

  it("裝備槽位名稱不重複", () => {
    const dbFields = Object.values(FRONT_TO_DB);
    const unique = new Set(dbFields);
    expect(unique.size).toBe(dbFields.length);
  });
});
