/**
 * 裝備加成計算器
 * 查詢角色已裝備的裝備，計算含強化的總屬性加成
 */
import { getDb } from "../db";
import { agentInventory, gameEquipmentCatalog } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { calcEnhancedStat } from "./enhanceEngine";

export interface EquipBonus {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
  mdef: number;
}

const ZERO_BONUS: EquipBonus = { hp: 0, atk: 0, def: 0, spd: 0, matk: 0, mdef: 0 };

/**
 * 計算角色所有已裝備裝備的總屬性加成（含強化加成）
 * @param equippedIds - 角色各部位已裝備的 itemId 列表
 */
export async function calcEquipBonus(equippedIds: string[]): Promise<EquipBonus> {
  if (!equippedIds.length) return { ...ZERO_BONUS };

  const db = await getDb();
  if (!db) return { ...ZERO_BONUS };

  // 查詢裝備圖鑑屬性
  const catalogs = await db.select().from(gameEquipmentCatalog)
    .where(inArray(gameEquipmentCatalog.equipId, equippedIds));

  // 查詢背包中的強化等級
  const inventories = await db.select().from(agentInventory)
    .where(inArray(agentInventory.itemId, equippedIds));

  const enhanceLevelMap = new Map<string, number>();
  for (const inv of inventories) {
    const data = inv.itemData ? (typeof inv.itemData === "string" ? JSON.parse(inv.itemData) : inv.itemData) : null;
    enhanceLevelMap.set(inv.itemId, data?.enhanceLevel ?? 0);
  }

  const bonus: EquipBonus = { ...ZERO_BONUS };

  for (const cat of catalogs) {
    const enhLv = enhanceLevelMap.get(cat.equipId) ?? 0;
    bonus.hp   += calcEnhancedStat(cat.hpBonus ?? 0, enhLv);
    bonus.atk  += calcEnhancedStat(cat.attackBonus ?? 0, enhLv);
    bonus.def  += calcEnhancedStat(cat.defenseBonus ?? 0, enhLv);
    bonus.spd  += calcEnhancedStat(cat.speedBonus ?? 0, enhLv);
    bonus.matk += calcEnhancedStat(cat.magicAttackBonus ?? 0, enhLv);
    bonus.mdef += calcEnhancedStat(cat.magicDefenseBonus ?? 0, enhLv);
  }

  return bonus;
}

/**
 * 查詢角色已裝備的裝備，計算含強化的總屬性加成（透過 agentId 查詢）
 * 此函數直接查詢 agentInventory 中 isEquipped=1 的裝備
 * @param agentId - 角色 ID
 * @returns EquipBonus - 各屬性的加成值
 */
export async function calcEquipBonusForAgent(agentId: number): Promise<EquipBonus> {
  const db = await getDb();
  if (!db) return { ...ZERO_BONUS };

  // 查詢已裝備的裝備
  const equippedItems = await db.select().from(agentInventory)
    .where(and(
      eq(agentInventory.agentId, agentId),
      eq(agentInventory.isEquipped, 1),
      eq(agentInventory.itemType, "equipment"),
    ));

  if (!equippedItems.length) return { ...ZERO_BONUS };

  // 取得所有裝備的 itemId
  const equipIds = equippedItems.map(e => e.itemId);

  // 查詢裝備圖鑑屬性
  const catalogs = await db.select().from(gameEquipmentCatalog)
    .where(inArray(gameEquipmentCatalog.equipId, equipIds));

  // 建立 itemId → catalog 映射
  const catalogMap = new Map(catalogs.map(c => [c.equipId, c]));

  const bonus: EquipBonus = { ...ZERO_BONUS };

  for (const inv of equippedItems) {
    const cat = catalogMap.get(inv.itemId);
    if (!cat) continue;

    // 從 itemData 取得強化等級
    const data = inv.itemData ? (typeof inv.itemData === "string" ? JSON.parse(inv.itemData) : inv.itemData) : null;
    const enhLv = (data as any)?.enhanceLevel ?? 0;

    bonus.hp   += calcEnhancedStat(cat.hpBonus ?? 0, enhLv);
    bonus.atk  += calcEnhancedStat(cat.attackBonus ?? 0, enhLv);
    bonus.def  += calcEnhancedStat(cat.defenseBonus ?? 0, enhLv);
    bonus.spd  += calcEnhancedStat(cat.speedBonus ?? 0, enhLv);
    bonus.matk += calcEnhancedStat(cat.magicAttackBonus ?? 0, enhLv);
    bonus.mdef += calcEnhancedStat(cat.magicDefenseBonus ?? 0, enhLv);
  }

  return bonus;
}

/**
 * 從 agent 物件中提取所有已裝備的 itemId
 */
export function getEquippedIds(agent: {
  equippedHead?: string | null;
  equippedBody?: string | null;
  equippedHands?: string | null;
  equippedFeet?: string | null;
  equippedWeapon?: string | null;
  equippedOffhand?: string | null;
  equippedRingA?: string | null;
  equippedRingB?: string | null;
  equippedNecklace?: string | null;
  equippedAmulet?: string | null;
}): string[] {
  return [
    agent.equippedHead,
    agent.equippedBody,
    agent.equippedHands,
    agent.equippedFeet,
    agent.equippedWeapon,
    agent.equippedOffhand,
    agent.equippedRingA,
    agent.equippedRingB,
    agent.equippedNecklace,
    agent.equippedAmulet,
  ].filter(Boolean) as string[];
}
