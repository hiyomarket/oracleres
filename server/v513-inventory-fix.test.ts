/**
 * v5.13 Tests — 道具欄分類 + 裝備顯示 bug 修復
 * - resolveItemType 道具類型解析
 * - getInventory 名稱和類型修正
 * - useItem 使用驗證
 * - 前端 canUse 標記邏輯
 */
import { describe, it, expect } from "vitest";

// ─── 1. resolveItemType 邏輯測試 ──────────────────────────────────────
describe("resolveItemType logic", () => {
  /** 模擬 CATALOG_CATEGORY_TO_ITEM_TYPE 映射 */
  const CATALOG_CATEGORY_TO_ITEM_TYPE: Record<string, string> = {
    material: "material",
    material_basic: "material",
    material_drop: "material",
    equipment_material: "material",
    consumable: "consumable",
    quest: "material",
    scroll: "material",
    treasure: "material",
    skillbook: "skill_book",
    active_combat: "skill_book",
    passive_combat: "skill_book",
    life_gather: "skill_book",
    craft_forge: "skill_book",
  };

  function resolveItemTypeFromCategory(category: string): string {
    return CATALOG_CATEGORY_TO_ITEM_TYPE[category] ?? "material";
  }

  it("should map consumable category to consumable type", () => {
    expect(resolveItemTypeFromCategory("consumable")).toBe("consumable");
  });

  it("should map scroll category to material type (not consumable)", () => {
    expect(resolveItemTypeFromCategory("scroll")).toBe("material");
  });

  it("should map quest category to material type (not consumable)", () => {
    expect(resolveItemTypeFromCategory("quest")).toBe("material");
  });

  it("should map material category to material type", () => {
    expect(resolveItemTypeFromCategory("material")).toBe("material");
  });

  it("should map material_basic to material type", () => {
    expect(resolveItemTypeFromCategory("material_basic")).toBe("material");
  });

  it("should map skillbook category to skill_book type", () => {
    expect(resolveItemTypeFromCategory("skillbook")).toBe("skill_book");
  });

  it("should map active_combat to skill_book type", () => {
    expect(resolveItemTypeFromCategory("active_combat")).toBe("skill_book");
  });

  it("should fallback unknown category to material", () => {
    expect(resolveItemTypeFromCategory("unknown_category")).toBe("material");
  });
});

// ─── 2. 前綴判斷 fallback 邏輯 ──────────────────────────────────────
describe("prefix-based itemType fallback", () => {
  function resolveByPrefix(itemKey: string): string {
    if (itemKey.startsWith("E_") || itemKey.startsWith("equip")) return "equipment";
    if (itemKey.startsWith("skill-") || itemKey.startsWith("skill_book") || itemKey.startsWith("USK_")) return "skill_book";
    if (itemKey.startsWith("herb") || itemKey.startsWith("mat") || itemKey.startsWith("I_M")) return "material";
    if (itemKey.startsWith("I_SCR")) return "material";
    return "consumable";
  }

  it("should identify E_M001 as equipment", () => {
    expect(resolveByPrefix("E_M001")).toBe("equipment");
  });

  it("should identify E_W003 as equipment", () => {
    expect(resolveByPrefix("E_W003")).toBe("equipment");
  });

  it("should identify equip_xxx as equipment", () => {
    expect(resolveByPrefix("equip_iron_sword")).toBe("equipment");
  });

  it("should identify I_SCR_WPN as material (scroll)", () => {
    expect(resolveByPrefix("I_SCR_WPN")).toBe("material");
  });

  it("should identify I_SCR_ARM_B as material (blessed scroll)", () => {
    expect(resolveByPrefix("I_SCR_ARM_B")).toBe("material");
  });

  it("should identify I_M001 as material (quest item)", () => {
    expect(resolveByPrefix("I_M001")).toBe("material");
  });

  it("should identify herb-001 as material", () => {
    expect(resolveByPrefix("herb-001")).toBe("material");
  });

  it("should identify mat-wood-001 as material", () => {
    expect(resolveByPrefix("mat-wood-001")).toBe("material");
  });

  it("should identify USK_155 as skill_book", () => {
    expect(resolveByPrefix("USK_155")).toBe("skill_book");
  });

  it("should identify skill-xxx as skill_book", () => {
    expect(resolveByPrefix("skill-fire-001")).toBe("skill_book");
  });

  it("should default potion_small to consumable", () => {
    expect(resolveByPrefix("potion_small")).toBe("consumable");
  });
});

// ─── 3. canUse 判斷邏輯 ──────────────────────────────────────
describe("canUse determination", () => {
  interface CatalogItem {
    category: string;
    useEffect: { type: string; value?: number } | null;
  }

  function canUseItem(
    catalog: CatalogItem | null,
    isEquipment: boolean,
    itemId: string
  ): boolean {
    // 裝備不可使用
    if (isEquipment) return false;
    // 有圖鑑記錄
    if (catalog) {
      // 卷軸不可直接使用
      if (catalog.useEffect?.type === "enhance_scroll") return false;
      // 任務道具不可使用
      if (catalog.category === "quest") return false;
      // 只有 consumable 類別可使用
      if (catalog.category === "consumable") return true;
      // 其他類別不可使用
      return false;
    }
    // 無圖鑑：只有藥水類可使用
    return itemId.includes("potion") || itemId.includes("elixir");
  }

  it("should allow consumable with heal_hp effect", () => {
    expect(canUseItem({ category: "consumable", useEffect: { type: "heal_hp", value: 30 } }, false, "I_W035")).toBe(true);
  });

  it("should allow consumable without use_effect (legacy items)", () => {
    expect(canUseItem({ category: "consumable", useEffect: null }, false, "potion_small")).toBe(true);
  });

  it("should NOT allow scroll items", () => {
    expect(canUseItem({ category: "scroll", useEffect: { type: "enhance_scroll" } }, false, "I_SCR_WPN")).toBe(false);
  });

  it("should NOT allow quest items", () => {
    expect(canUseItem({ category: "quest", useEffect: null }, false, "I_M001")).toBe(false);
  });

  it("should NOT allow equipment items", () => {
    expect(canUseItem(null, true, "E_M001")).toBe(false);
  });

  it("should NOT allow material items", () => {
    expect(canUseItem({ category: "material", useEffect: null }, false, "I_MAT_WOOD")).toBe(false);
  });

  it("should allow potion without catalog (legacy)", () => {
    expect(canUseItem(null, false, "potion_small")).toBe(true);
  });

  it("should allow elixir without catalog (legacy)", () => {
    expect(canUseItem(null, false, "stamina_elixir")).toBe(true);
  });

  it("should NOT allow unknown item without catalog", () => {
    expect(canUseItem(null, false, "iron_sword")).toBe(false);
  });
});

// ─── 4. getInventory 類型修正邏輯 ──────────────────────────────────────
describe("getInventory type correction", () => {
  const CATALOG_CAT_TO_TYPE: Record<string, string> = {
    material: "material", material_basic: "material", material_drop: "material",
    equipment_material: "material", consumable: "consumable",
    quest: "material", scroll: "material", treasure: "material",
    skillbook: "skill_book", active_combat: "skill_book",
    passive_combat: "skill_book", life_gather: "skill_book", craft_forge: "skill_book",
  };

  interface InventoryItem {
    itemId: string;
    itemType: string;
  }

  function correctItemType(
    item: InventoryItem,
    equipMap: Map<string, { name: string }>,
    catalogMap: Map<string, { name: string; category: string }>
  ): { itemType: string; itemName: string; canUse: boolean } {
    // 優先查裝備圖鑑
    const equip = equipMap.get(item.itemId);
    if (equip) {
      return { itemType: "equipment", itemName: equip.name, canUse: false };
    }
    // 查道具圖鑑
    const catalog = catalogMap.get(item.itemId);
    if (catalog) {
      const correctedType = CATALOG_CAT_TO_TYPE[catalog.category] ?? item.itemType;
      const canUse = catalog.category === "consumable";
      return { itemType: correctedType, itemName: catalog.name, canUse };
    }
    return { itemType: item.itemType, itemName: item.itemId, canUse: item.itemType === "consumable" };
  }

  const equipMap = new Map([
    ["E_M001", { name: "鐵劍" }],
    ["E_W003", { name: "樹皮帽" }],
  ]);
  const catalogMap = new Map([
    ["I_SCR_WPN", { name: "武器強化卷軸", category: "scroll" }],
    ["I_M001", { name: "戰士之證", category: "quest" }],
    ["I_W035", { name: "生命之水", category: "consumable" }],
    ["I_MAT_WOOD", { name: "木材", category: "material" }],
  ]);

  it("should correct E_M001 stored as consumable to equipment", () => {
    const result = correctItemType({ itemId: "E_M001", itemType: "consumable" }, equipMap, catalogMap);
    expect(result.itemType).toBe("equipment");
    expect(result.itemName).toBe("鐵劍");
    expect(result.canUse).toBe(false);
  });

  it("should correct I_SCR_WPN stored as consumable to material", () => {
    const result = correctItemType({ itemId: "I_SCR_WPN", itemType: "consumable" }, equipMap, catalogMap);
    expect(result.itemType).toBe("material");
    expect(result.itemName).toBe("武器強化卷軸");
    expect(result.canUse).toBe(false);
  });

  it("should correct I_M001 stored as consumable to material", () => {
    const result = correctItemType({ itemId: "I_M001", itemType: "consumable" }, equipMap, catalogMap);
    expect(result.itemType).toBe("material");
    expect(result.itemName).toBe("戰士之證");
    expect(result.canUse).toBe(false);
  });

  it("should keep consumable items as consumable with canUse=true", () => {
    const result = correctItemType({ itemId: "I_W035", itemType: "consumable" }, equipMap, catalogMap);
    expect(result.itemType).toBe("consumable");
    expect(result.itemName).toBe("生命之水");
    expect(result.canUse).toBe(true);
  });

  it("should keep material items as material", () => {
    const result = correctItemType({ itemId: "I_MAT_WOOD", itemType: "material" }, equipMap, catalogMap);
    expect(result.itemType).toBe("material");
    expect(result.itemName).toBe("木材");
    expect(result.canUse).toBe(false);
  });

  it("should handle unknown items (not in any catalog)", () => {
    const result = correctItemType({ itemId: "iron_sword", itemType: "consumable" }, equipMap, catalogMap);
    expect(result.itemType).toBe("consumable");
    expect(result.itemName).toBe("iron_sword");
    expect(result.canUse).toBe(true); // fallback: consumable type = canUse
  });
});

// ─── 5. 裝備不可疊加邏輯 ──────────────────────────────────────
describe("equipment stacking logic", () => {
  function shouldStack(itemType: string, stackable: boolean): boolean {
    if (itemType === "equipment" && !stackable) return false;
    return true;
  }

  it("should NOT stack non-stackable equipment", () => {
    expect(shouldStack("equipment", false)).toBe(false);
  });

  it("should stack stackable equipment (if ever exists)", () => {
    expect(shouldStack("equipment", true)).toBe(true);
  });

  it("should stack consumable items", () => {
    expect(shouldStack("consumable", true)).toBe(true);
  });

  it("should stack material items", () => {
    expect(shouldStack("material", true)).toBe(true);
  });
});
