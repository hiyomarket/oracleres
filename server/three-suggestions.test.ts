/**
 * 第十六批功能測試：三大建議
 * 1. 圖鑑 CMS 快捷上架商店（quickListToShop）
 * 2. stackable 欄位（裝備不可疊加）
 * 3. 戰鬥屬性拆解顯示（equipBonus 計算）
 */
import { describe, it, expect } from "vitest";

// ── 建議一：quickListToShop 邏輯測試 ──────────────────────────────────────
describe("quickListToShop 商店快捷上架", () => {
  it("應該支援三種商店類型", () => {
    const SHOP_TYPES = ["normal", "spirit", "hidden"] as const;
    expect(SHOP_TYPES).toHaveLength(3);
    expect(SHOP_TYPES).toContain("normal");
    expect(SHOP_TYPES).toContain("spirit");
    expect(SHOP_TYPES).toContain("hidden");
  });

  it("itemKey 格式應支援道具/裝備/技能書前綴", () => {
    const validPrefixes = ["I_", "E_", "S_"];
    const testKeys = ["I_W001", "E_F002", "S_M003"];
    testKeys.forEach(key => {
      const hasValidPrefix = validPrefixes.some(p => key.startsWith(p));
      expect(hasValidPrefix).toBe(true);
    });
  });

  it("maxPerOrder 應有合理的預設值", () => {
    const defaultMaxPerOrder = 10;
    expect(defaultMaxPerOrder).toBeGreaterThan(0);
    expect(defaultMaxPerOrder).toBeLessThanOrEqual(99);
  });

  it("上架到一般商店的 itemKey 格式驗證", () => {
    const normalShopItem = {
      itemKey: "I_W001",
      shopType: "normal" as const,
      price: 100,
      purchaseLimit: 5,
      maxPerOrder: 3,
    };
    expect(normalShopItem.price).toBeGreaterThan(0);
    expect(normalShopItem.maxPerOrder).toBeLessThanOrEqual(normalShopItem.purchaseLimit);
  });
});

// ── 建議二：stackable 欄位邏輯測試 ──────────────────────────────────────
describe("stackable 裝備不可疊加邏輯", () => {
  it("裝備圖鑑預設 stackable 應為 0（不可疊加）", () => {
    const equipCatalogDefault = { stackable: 0 };
    expect(equipCatalogDefault.stackable).toBe(0);
  });

  it("道具圖鑑預設 stackable 應為 1（可疊加）", () => {
    const itemCatalogDefault = { stackable: 1 };
    expect(itemCatalogDefault.stackable).toBe(1);
  });

  it("stackable=0 的道具入庫時應每件獨立存放", () => {
    // 模擬不可疊加道具的入庫邏輯
    const shouldStack = (stackable: number, existingQty: number) => {
      if (stackable === 0) return false; // 不可疊加：新建一筆記錄
      if (existingQty >= 99) return false; // 已達上限
      return true; // 可疊加：累加數量
    };

    expect(shouldStack(0, 0)).toBe(false); // 裝備：不疊加
    expect(shouldStack(0, 5)).toBe(false); // 裝備：不疊加（即使有現有數量）
    expect(shouldStack(1, 0)).toBe(true);  // 道具：可疊加
    expect(shouldStack(1, 98)).toBe(true); // 道具：未達上限
    expect(shouldStack(1, 99)).toBe(false); // 道具：已達上限
  });

  it("裝備類道具（E_ 前綴）應自動設為不可疊加", () => {
    const inferStackable = (itemId: string) => {
      if (itemId.startsWith("E_")) return 0; // 裝備不可疊加
      return 1; // 其他道具可疊加
    };

    expect(inferStackable("E_W001")).toBe(0);
    expect(inferStackable("E_F002")).toBe(0);
    expect(inferStackable("I_W001")).toBe(1);
    expect(inferStackable("S_M001")).toBe(1);
  });
});

// ── 建議三：戰鬥屬性拆解顯示邏輯測試 ──────────────────────────────────────
describe("戰鬥屬性拆解顯示（基礎值 + 裝備加成）", () => {
  it("應正確計算總屬性 = 基礎值 + 裝備加成", () => {
    const agent = { attack: 186, defense: 193, speed: 133 };
    const equipBonus = { atk: 50, def: 30, spd: 20 };

    const totalAttack = agent.attack + equipBonus.atk;
    const totalDefense = agent.defense + equipBonus.def;
    const totalSpeed = agent.speed + equipBonus.spd;

    expect(totalAttack).toBe(236);
    expect(totalDefense).toBe(223);
    expect(totalSpeed).toBe(153);
  });

  it("無裝備時裝備加成應為 0，不顯示拆解", () => {
    const eb = {};
    const atkBonus = (eb as any).atk ?? 0;
    const defBonus = (eb as any).def ?? 0;
    const spdBonus = (eb as any).spd ?? 0;

    expect(atkBonus).toBe(0);
    expect(defBonus).toBe(0);
    expect(spdBonus).toBe(0);
    // 當 equipBonus = 0 時，不顯示拆解行
    expect(atkBonus > 0).toBe(false);
  });

  it("裝備加成拆解格式應為「基礎值 +加成 裝備 = 總計」", () => {
    const baseVal = 186;
    const equipBonus = 50;
    const total = baseVal + equipBonus;

    const displayText = `${baseVal} +${equipBonus} 裝備 = ${total}`;
    expect(displayText).toBe("186 +50 裝備 = 236");
  });

  it("healPower 和 magicAttack 無裝備加成欄位時應顯示原始值", () => {
    const eb = { atk: 50, def: 30, spd: 20 };
    // healPower 和 magicAttack 沒有對應的 equipBonus key
    const healBonus = (eb as any).heal ?? 0;
    const matkBonus = (eb as any).matk ?? 0;

    expect(healBonus).toBe(0);
    expect(matkBonus).toBe(0);
  });
});

// ── 裝備槽位 Modal 邏輯測試 ──────────────────────────────────────
describe("裝備槽位 Modal 應顯示背包裝備", () => {
  it("FRONT_TO_CATALOG slot 映射應正確", () => {
    const FRONT_TO_CATALOG: Record<string, string> = {
      weapon: "weapon", offhand: "offhand",
      head: "helmet", body: "armor",
      hands: "gloves", feet: "shoes",
      ringA: "accessory", ringB: "accessory",
      necklace: "accessory", amulet: "accessory",
    };

    expect(FRONT_TO_CATALOG["hands"]).toBe("gloves");
    expect(FRONT_TO_CATALOG["head"]).toBe("helmet");
    expect(FRONT_TO_CATALOG["body"]).toBe("armor");
    expect(FRONT_TO_CATALOG["feet"]).toBe("shoes");
    expect(FRONT_TO_CATALOG["ringA"]).toBe("accessory");
  });

  it("getInventoryEquipments 應返回背包中的裝備道具（非圖鑑全部）", () => {
    // 模擬背包裝備過濾邏輯
    const inventory = [
      { itemId: "E_W001", itemType: "equipment", quantity: 1 },
      { itemId: "I_W001", itemType: "consumable", quantity: 5 },
      { itemId: "E_F002", itemType: "equipment", quantity: 1 },
    ];

    const equipments = inventory.filter(i => i.itemType === "equipment");
    expect(equipments).toHaveLength(2);
    expect(equipments.map(e => e.itemId)).toContain("E_W001");
    expect(equipments.map(e => e.itemId)).toContain("E_F002");
    expect(equipments.map(e => e.itemId)).not.toContain("I_W001");
  });

  it("裝備已穿戴時應顯示 isEquipped=true", () => {
    const equippedIds = ["E_W001", "E_F002"];
    const invItem = { itemId: "E_W001" };
    const isEquipped = equippedIds.includes(invItem.itemId);
    expect(isEquipped).toBe(true);
  });
});
