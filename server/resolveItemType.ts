/**
 * resolveItemType.ts — 共用道具類型解析器
 * 根據 itemKey 查詢 game_item_catalog 和 game_equipment_catalog，
 * 返回正確的 agentInventory.itemType 和是否可疊加。
 *
 * 用於所有將道具寫入背包的場景（商店購買、戰鬥掉落、任務獎勵等），
 * 確保 itemType 一致性。
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { gameItemCatalog, gameEquipmentCatalog } from "../drizzle/schema";

/** agentInventory 允許的 itemType enum 值 */
export type InventoryItemType = "material" | "equipment" | "skill_book" | "consumable" | "pet";

/** 道具圖鑑 category → agentInventory itemType 映射 */
const CATALOG_CATEGORY_TO_ITEM_TYPE: Record<string, InventoryItemType> = {
  material: "material",
  material_basic: "material",
  material_drop: "material",
  equipment_material: "material",
  consumable: "consumable",
  quest: "material",          // 任務道具不可使用，歸類為 material 防止被「使用」消耗
  scroll: "material",         // 卷軸需要特殊系統（強化系統），不是普通消耗品
  treasure: "material",       // 寶物不可使用
  skillbook: "skill_book",
  active_combat: "skill_book",
  passive_combat: "skill_book",
  life_gather: "skill_book",
  craft_forge: "skill_book",
};

export interface ResolvedItemInfo {
  itemType: InventoryItemType;
  stackable: boolean;
  name: string | null;
  rarity: string | null;
  /** 道具是否可以被「使用」按鈕消耗（僅限有 use_effect 的消耗品） */
  canUse: boolean;
}

/**
 * 根據 itemKey 查詢圖鑑，返回正確的 itemType、是否可疊加、名稱等資訊。
 * 優先查裝備圖鑑（E_ 開頭），再查道具圖鑑，最後 fallback 到前綴判斷。
 */
export async function resolveItemType(itemKey: string): Promise<ResolvedItemInfo> {
  const db = await getDb();

  // 1. 查裝備圖鑑
  if (db) {
    const [equipRow] = await db.select({
      equipId: gameEquipmentCatalog.equipId,
      name: gameEquipmentCatalog.name,
      rarity: gameEquipmentCatalog.rarity,
      stackable: gameEquipmentCatalog.stackable,
    }).from(gameEquipmentCatalog)
      .where(eq(gameEquipmentCatalog.equipId, itemKey))
      .limit(1);

    if (equipRow) {
      return {
        itemType: "equipment",
        stackable: equipRow.stackable === 1,
        name: equipRow.name,
        rarity: equipRow.rarity,
        canUse: false,
      };
    }
  }

  // 2. 查道具圖鑑
  if (db) {
    const [itemRow] = await db.select({
      itemId: gameItemCatalog.itemId,
      name: gameItemCatalog.name,
      rarity: gameItemCatalog.rarity,
      category: gameItemCatalog.category,
      stackable: gameItemCatalog.stackable,
      useEffect: gameItemCatalog.useEffect,
    }).from(gameItemCatalog)
      .where(eq(gameItemCatalog.itemId, itemKey))
      .limit(1);

    if (itemRow) {
      const mappedType = CATALOG_CATEGORY_TO_ITEM_TYPE[itemRow.category ?? ""] ?? "material";
      // 只有 category=consumable 且有 use_effect 且 type 不是 enhance_scroll 的才算可使用
      const useEff = itemRow.useEffect as { type?: string } | null;
      const isConsumableWithEffect = mappedType === "consumable" && useEff && useEff.type && useEff.type !== "enhance_scroll";
      return {
        itemType: isConsumableWithEffect ? "consumable" : mappedType,
        stackable: itemRow.stackable === 1,
        name: itemRow.name,
        rarity: itemRow.rarity,
        canUse: !!isConsumableWithEffect,
      };
    }
  }

  // 3. Fallback：根據前綴判斷（與 tickEngine 一致）
  if (itemKey.startsWith("E_") || itemKey.startsWith("equip")) {
    return { itemType: "equipment", stackable: false, name: null, rarity: null, canUse: false };
  }
  if (itemKey.startsWith("skill-") || itemKey.startsWith("skill_book") || itemKey.startsWith("USK_")) {
    return { itemType: "skill_book", stackable: true, name: null, rarity: null, canUse: false };
  }
  if (itemKey.startsWith("herb") || itemKey.startsWith("mat") || itemKey.startsWith("I_M")) {
    return { itemType: "material", stackable: true, name: null, rarity: null, canUse: false };
  }
  if (itemKey.startsWith("I_SCR")) {
    return { itemType: "material", stackable: true, name: null, rarity: null, canUse: false };
  }
  // 預設為消耗品（藥水等）
  return { itemType: "consumable", stackable: true, name: null, rarity: null, canUse: true };
}
