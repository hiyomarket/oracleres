/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 大平衡批量更新腳本
 * ═══════════════════════════════════════════════════════════════
 *
 * 用法：在 server/routers 中建立 tRPC 端點呼叫此腳本
 * 或直接在後台 AI 工具中觸發
 *
 * 涵蓋：
 * 1. 怪物數值（HP/ATK/DEF/SPD/MATK/ACC）
 * 2. 怪物技能（powerPercent/mpCost/cooldown）
 * 3. 人物技能（powerPercent/mpCost/cooldown/shopPrice）
 * 4. 裝備數值（hpBonus/atkBonus/defBonus/spdBonus/shopPrice）
 * 5. 商店價格（虛界商店/靈相商店/隱藏商店）
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  gameMonsterCatalog,
  gameMonsterSkillCatalog,
  gameUnifiedSkillCatalog,
  gameEquipmentCatalog,
  equipmentTemplates,
  gameVirtualShop,
  gameSpiritShop,
  gameHiddenShopPool,
  gameItemCatalog,
} from "../../drizzle/schema";
import {
  calculateMonsterStats,
  MONSTER_SKILL_RARITY_BASE,
  SKILL_TIER_BASE,
  SKILL_TYPE_MODIFIER,
  calculateEquipStats,
  PRICE_TABLE,
  HIDDEN_SHOP_MARKUP,
  EQUIP_TIER_BASE,
  EQUIP_SLOT_MODIFIER,
} from "../services/balanceFormulas";

export interface BalanceResult {
  monstersUpdated: number;
  monsterSkillsUpdated: number;
  playerSkillsUpdated: number;
  equipmentsUpdated: number;
  equipTemplatesUpdated: number;
  shopVirtualUpdated: number;
  shopSpiritUpdated: number;
  shopHiddenUpdated: number;
  errors: string[];
}

export async function runFullBalance(): Promise<BalanceResult> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const result: BalanceResult = {
    monstersUpdated: 0,
    monsterSkillsUpdated: 0,
    playerSkillsUpdated: 0,
    equipmentsUpdated: 0,
    equipTemplatesUpdated: 0,
    shopVirtualUpdated: 0,
    shopSpiritUpdated: 0,
    shopHiddenUpdated: 0,
    errors: [],
  };

  // ═══════════════════════════════════════════════════════════════
  // 1. 怪物數值校準
  // ═══════════════════════════════════════════════════════════════
  try {
    const monsters = await db.select().from(gameMonsterCatalog).where(sql`is_active = 1`);
    for (const m of monsters) {
      const stats = calculateMonsterStats(m.levelRange, m.rarity, m.race || "");
      await db.update(gameMonsterCatalog)
        .set({
          baseHp: stats.baseHp,
          baseAttack: stats.baseAttack,
          baseDefense: stats.baseDefense,
          baseSpeed: stats.baseSpeed,
          baseMagicAttack: stats.baseMagicAttack,
          baseAccuracy: stats.baseAccuracy,
        })
        .where(eq(gameMonsterCatalog.id, m.id));
      result.monstersUpdated++;
    }
    console.log(`[Balance] 怪物數值校準完成：${result.monstersUpdated} 隻`);
  } catch (e: any) {
    result.errors.push(`怪物校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. 怪物技能校準
  // ═══════════════════════════════════════════════════════════════
  try {
    const mSkills = await db.select().from(gameMonsterSkillCatalog).where(sql`is_active = 1`);
    for (const sk of mSkills) {
      const base = MONSTER_SKILL_RARITY_BASE[sk.rarity] || MONSTER_SKILL_RARITY_BASE["common"];
      const typeMod = SKILL_TYPE_MODIFIER[sk.skillType] || SKILL_TYPE_MODIFIER["attack"];

      const midPower = Math.round((base.powerRange[0] + base.powerRange[1]) / 2 * typeMod.powerMod);
      const midMp = Math.round((base.mpRange[0] + base.mpRange[1]) / 2 * typeMod.mpMod);
      const midCd = Math.round((base.cdRange[0] + base.cdRange[1]) / 2 * typeMod.cdMod);

      await db.update(gameMonsterSkillCatalog)
        .set({
          powerPercent: Math.max(midPower, 10),
          mpCost: Math.max(midMp, 0),
          cooldown: Math.max(midCd, 0),
        })
        .where(eq(gameMonsterSkillCatalog.id, sk.id));
      result.monsterSkillsUpdated++;
    }
    console.log(`[Balance] 怪物技能校準完成：${result.monsterSkillsUpdated} 個`);
  } catch (e: any) {
    result.errors.push(`怪物技能校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. 人物技能校準
  // ═══════════════════════════════════════════════════════════════
  try {
    const pSkills = await db.select().from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
    for (const sk of pSkills) {
      const base = SKILL_TIER_BASE[sk.tier] || SKILL_TIER_BASE["初階"];
      const mod = SKILL_TYPE_MODIFIER[sk.skillType] || SKILL_TYPE_MODIFIER["attack"];

      const midPower = Math.round((base.powerRange[0] + base.powerRange[1]) / 2 * mod.powerMod);
      const midMp = Math.round((base.mpRange[0] + base.mpRange[1]) / 2 * mod.mpMod);
      const midCd = Math.round((base.cdRange[0] + base.cdRange[1]) / 2 * mod.cdMod);
      const midLv = Math.round((base.learnLvRange[0] + base.learnLvRange[1]) / 2);
      const midPrice = Math.round((base.priceRange[0] + base.priceRange[1]) / 2);

      // 根據技能的 acquireType 決定是否設定 shopPrice
      const shopPrice = sk.acquireType === "shop" ? midPrice : 0;

      await db.update(gameUnifiedSkillCatalog)
        .set({
          powerPercent: Math.max(midPower, 10),
          mpCost: Math.max(midMp, 0),
          cooldown: Math.max(midCd, 0),
        })
        .where(eq(gameUnifiedSkillCatalog.id, sk.id));
      result.playerSkillsUpdated++;
    }
    console.log(`[Balance] 人物技能校準完成：${result.playerSkillsUpdated} 個`);
  } catch (e: any) {
    result.errors.push(`人物技能校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. 裝備圖鑑校準
  // ═══════════════════════════════════════════════════════════════
  try {
    const equips = await db.select().from(gameEquipmentCatalog).where(sql`is_active = 1`);
    for (const eq_ of equips) {
      const stats = calculateEquipStats(eq_.tier, eq_.slot);
      await db.update(gameEquipmentCatalog)
        .set({
          hpBonus: stats.hpBonus,
          attackBonus: stats.attackBonus,
          defenseBonus: stats.defenseBonus,
          speedBonus: stats.speedBonus,
        })
        .where(eq(gameEquipmentCatalog.id, eq_.id));
      result.equipmentsUpdated++;
    }
    console.log(`[Balance] 裝備圖鑑校準完成：${result.equipmentsUpdated} 件`);
  } catch (e: any) {
    result.errors.push(`裝備圖鑑校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. 裝備模板校準
  // ═══════════════════════════════════════════════════════════════
  try {
    const templates = await db.select().from(equipmentTemplates).where(sql`is_active = 1`);
    for (const t of templates) {
      const tierMap: Record<string, string> = { basic: "初階", mid: "中階", high: "高階", legendary: "傳說" };
      const mappedTier = tierMap[t.tier] || t.tier;
      const stats = calculateEquipStats(mappedTier, t.slot);

      // 計算 NPC 收購價（售價的 20%）
      const npcPrice = Math.round(stats.shopPrice * 0.2);

      await db.update(equipmentTemplates)
        .set({
          hpBonus: stats.hpBonus,
          atkBonus: stats.attackBonus,
          defBonus: stats.defenseBonus,
          spdBonus: stats.speedBonus,
          shopPrice: stats.shopPrice,
          npcSellPrice: npcPrice,
        })
        .where(eq(equipmentTemplates.id, t.id));
      result.equipTemplatesUpdated++;
    }
    console.log(`[Balance] 裝備模板校準完成：${result.equipTemplatesUpdated} 件`);
  } catch (e: any) {
    result.errors.push(`裝備模板校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. 商店價格校準 ── 虛界商店
  // ═══════════════════════════════════════════════════════════════
  try {
    const shopItems = await db.select().from(gameVirtualShop).where(sql`is_on_sale = 1 AND is_locked = 0`);
    // 取得道具圖鑑的 rarity 和 category 資訊
    const itemCatalog = await db.select({
      itemId: gameItemCatalog.itemId,
      rarity: gameItemCatalog.rarity,
      category: gameItemCatalog.category,
    }).from(gameItemCatalog).where(sql`is_active = 1`);
    const itemMap = new Map(itemCatalog.map((i: { itemId: string; rarity: string; category: string }) => [i.itemId, i]));

    // 同時取得技能圖鑑的 rarity
    const skillCatalog = await db.select({
      skillId: gameUnifiedSkillCatalog.skillId,
      rarity: gameUnifiedSkillCatalog.rarity,
      category: gameUnifiedSkillCatalog.category,
    }).from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
    const skillMap = new Map(skillCatalog.map((s: { skillId: string; rarity: string; category: string }) => [s.skillId, s]));

    for (const si of shopItems) {
      let newPrice = si.priceCoins;

      // 判斷是技能書還是道具
      if (si.itemKey.startsWith("skill-") || si.itemKey.startsWith("S_")) {
        // 技能書
        const skill = skillMap.get(si.itemKey);
        const rarity = skill?.rarity || "rare";
        const tierKey = skill?.tier || "中階";
        const priceBase = SKILL_TIER_BASE[tierKey]?.priceRange;
        newPrice = priceBase ? Math.round((priceBase[0] + priceBase[1]) / 2) : 
          (PRICE_TABLE.skillBook as any)[rarity]?.coins || 800;
      } else {
        // 道具
        const item = itemMap.get(si.itemKey);
        if (item) {
          const cat = item.category;
          const rarity = item.rarity;
          let itemType: "consumable" | "material" | "skillBook" | "equipment" = "material";
          if (cat === "consumable" || cat === "potion") itemType = "consumable";
          else if (cat === "skill_book") itemType = "skillBook";
          else if (cat === "equipment") itemType = "equipment";
          newPrice = (PRICE_TABLE[itemType] as any)[rarity]?.coins || 50;
        }
      }

      if (newPrice !== si.priceCoins) {
        await db.update(gameVirtualShop)
          .set({ priceCoins: newPrice })
          .where(eq(gameVirtualShop.id, si.id));
        result.shopVirtualUpdated++;
      }
    }
    console.log(`[Balance] 虛界商店價格校準完成：${result.shopVirtualUpdated} 件`);
  } catch (e: any) {
    result.errors.push(`虛界商店校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. 商店價格校準 ── 靈相商店
  // ═══════════════════════════════════════════════════════════════
  try {
    const spiritItems = await db.select().from(gameSpiritShop).where(sql`is_on_sale = 1 AND is_locked = 0`);
    const skillCatalog2 = await db.select({
      skillId: gameUnifiedSkillCatalog.skillId,
      rarity: gameUnifiedSkillCatalog.rarity,
      category: gameUnifiedSkillCatalog.category,
    }).from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
    const skillMap = new Map(skillCatalog2.map((s: { skillId: string; rarity: string; category: string }) => [s.skillId, s]));

    const itemCatalog = await db.select({
      itemId: gameItemCatalog.itemId,
      rarity: gameItemCatalog.rarity,
      category: gameItemCatalog.category,
    }).from(gameItemCatalog).where(sql`is_active = 1`);
    const itemMap = new Map(itemCatalog.map((i: { itemId: string; rarity: string; category: string }) => [i.itemId, i]));

    for (const si of spiritItems) {
      let newPrice = si.priceStones;

      if (si.itemKey.startsWith("skill-") || si.itemKey.startsWith("S_")) {
        const skill = skillMap.get(si.itemKey);
        const rarity = skill?.rarity || "rare";
        newPrice = (PRICE_TABLE.skillBook as any)[rarity]?.stones || 30;
      } else {
        const item = itemMap.get(si.itemKey);
        if (item) {
          const cat = item.category;
          const rarity = item.rarity;
          let itemType: "consumable" | "material" | "skillBook" | "equipment" = "material";
          if (cat === "consumable" || cat === "potion") itemType = "consumable";
          else if (cat === "skill_book") itemType = "skillBook";
          newPrice = (PRICE_TABLE[itemType] as any)[rarity]?.stones || 5;
        }
      }

      if (newPrice !== si.priceStones) {
        await db.update(gameSpiritShop)
          .set({ priceStones: newPrice })
          .where(eq(gameSpiritShop.id, si.id));
        result.shopSpiritUpdated++;
      }
    }
    console.log(`[Balance] 靈相商店價格校準完成：${result.shopSpiritUpdated} 件`);
  } catch (e: any) {
    result.errors.push(`靈相商店校準失敗: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. 商店價格校準 ── 隱藏商店
  // ═══════════════════════════════════════════════════════════════
  try {
    const hiddenItems = await db.select().from(gameHiddenShopPool).where(sql`is_active = 1 AND is_locked = 0`);
    const skillCatalog3 = await db.select({
      skillId: gameUnifiedSkillCatalog.skillId,
      rarity: gameUnifiedSkillCatalog.rarity,
      category: gameUnifiedSkillCatalog.category,
    }).from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
    const skillMap = new Map(skillCatalog3.map((s: { skillId: string; rarity: string; category: string }) => [s.skillId, s]));

    const itemCatalog = await db.select({
      itemId: gameItemCatalog.itemId,
      rarity: gameItemCatalog.rarity,
      category: gameItemCatalog.category,
    }).from(gameItemCatalog).where(sql`is_active = 1`);
    const itemMap = new Map(itemCatalog.map((i: { itemId: string; rarity: string; category: string }) => [i.itemId, i]));

    // 裝備圖鑑
    const equipCatalog = await db.select({
      equipId: gameEquipmentCatalog.equipId,
      rarity: gameEquipmentCatalog.rarity,
      tier: gameEquipmentCatalog.tier,
    }).from(gameEquipmentCatalog).where(sql`is_active = 1`);
    const equipMap = new Map(equipCatalog.map((e: { equipId: string; rarity: string; tier: string }) => [e.equipId, e]));

    for (const hi of hiddenItems) {
      let newPrice = hi.price;
      const currency = hi.currencyType;

      if (hi.itemKey.startsWith("skill-") || hi.itemKey.startsWith("S_")) {
        const skill = skillMap.get(hi.itemKey);
        const rarity = skill?.rarity || hi.rarity;
        const basePrice = currency === "coins"
          ? (PRICE_TABLE.skillBook as any)[rarity]?.coins || 800
          : (PRICE_TABLE.skillBook as any)[rarity]?.stones || 30;
        newPrice = Math.round(basePrice * HIDDEN_SHOP_MARKUP);
      } else if (hi.itemKey.startsWith("E_")) {
        const equip = equipMap.get(hi.itemKey);
        const rarity = equip?.rarity || hi.rarity;
        const basePrice = currency === "coins"
          ? (PRICE_TABLE.equipment as any)[rarity]?.coins || 500
          : (PRICE_TABLE.equipment as any)[rarity]?.stones || 20;
        newPrice = Math.round(basePrice * HIDDEN_SHOP_MARKUP);
      } else {
        const item = itemMap.get(hi.itemKey);
        if (item) {
          const cat = item.category;
          const rarity = item.rarity;
          let itemType: "consumable" | "material" | "skillBook" | "equipment" = "material";
          if (cat === "consumable" || cat === "potion") itemType = "consumable";
          const basePrice = currency === "coins"
            ? (PRICE_TABLE[itemType] as any)[rarity]?.coins || 50
            : (PRICE_TABLE[itemType] as any)[rarity]?.stones || 5;
          newPrice = Math.round(basePrice * HIDDEN_SHOP_MARKUP);
        }
      }

      if (newPrice !== hi.price) {
        await db.update(gameHiddenShopPool)
          .set({ price: newPrice })
          .where(eq(gameHiddenShopPool.id, hi.id));
        result.shopHiddenUpdated++;
      }
    }
    console.log(`[Balance] 隱藏商店價格校準完成：${result.shopHiddenUpdated} 件`);
  } catch (e: any) {
    result.errors.push(`隱藏商店校準失敗: ${e.message}`);
  }

  console.log(`[Balance] ═══ 大平衡完成 ═══`);
  console.log(`  怪物: ${result.monstersUpdated}, 怪物技能: ${result.monsterSkillsUpdated}`);
  console.log(`  人物技能: ${result.playerSkillsUpdated}, 裝備: ${result.equipmentsUpdated}+${result.equipTemplatesUpdated}`);
  console.log(`  商店: 虛界${result.shopVirtualUpdated} 靈相${result.shopSpiritUpdated} 密店${result.shopHiddenUpdated}`);
  if (result.errors.length > 0) {
    console.log(`  錯誤: ${result.errors.join("; ")}`);
  }

  return result;
}
