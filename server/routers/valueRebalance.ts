/**
 * 價值引擎重新評估 Router
 * 批量修正所有圖鑑的數值、稀有度、品質、價格、流通權限
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, between } from "drizzle-orm";
import {
  gameItemCatalog,
  gameEquipmentCatalog,
  gameUnifiedSkillCatalog,
  gameMonsterCatalog,
  monsterDropTables,
} from "../../drizzle/schema";
import {
  evaluateItem,
  evaluateEquipment,
  evaluateSkill,
  parseSkillRealStats,
  calculateEquipRealStats,
  type ItemValueResult,
} from "../services/valueEngine";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const valueRebalanceRouter = router({
  /**
   * 預覽所有圖鑑的價值評估結果（不寫入資料庫）
   */
  previewAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const items = await db.select().from(gameItemCatalog).where(eq(gameItemCatalog.isActive, 1));
    const equips = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.isActive, 1));
    const skills = await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.isActive, 1));

    const itemResults = items.map(item => {
      const result = evaluateItem({
        category: item.category,
        rarity: item.rarity,
        useEffect: item.useEffect as any,
        stackLimit: item.stackLimit,
      });
      return {
        id: item.itemId,
        name: item.name,
        type: "item" as const,
        wuxing: item.wuxing,
        currentRarity: item.rarity,
        currentPrice: item.shopPrice,
        ...result,
      };
    });

    const equipResults = equips.map(equip => {
      // 先計算合理數值（如果全為 0）
      const realStats = calculateEquipRealStats({
        tier: equip.tier,
        slot: equip.slot,
        hpBonus: equip.hpBonus,
        attackBonus: equip.attackBonus,
        defenseBonus: equip.defenseBonus,
        speedBonus: equip.speedBonus,
      });
      const result = evaluateEquipment({
        tier: equip.tier,
        rarity: equip.rarity,
        slot: equip.slot,
        hpBonus: realStats.hpBonus,
        attackBonus: realStats.attackBonus,
        defenseBonus: realStats.defenseBonus,
        speedBonus: realStats.speedBonus,
        levelRequired: Number(equip.levelRequired) || 1,
        specialEffect: equip.specialEffect,
        affix1: equip.affix1 as any,
        affix2: equip.affix2 as any,
        affix3: equip.affix3 as any,
        affix4: equip.affix4 as any,
        affix5: equip.affix5 as any,
      });
      return {
        id: equip.equipId,
        name: equip.name,
        type: "equipment" as const,
        wuxing: equip.wuxing,
        tier: equip.tier,
        slot: equip.slot,
        currentRarity: equip.rarity,
        currentPrice: equip.shopPrice,
        currentStats: {
          hp: equip.hpBonus, atk: equip.attackBonus,
          def: equip.defenseBonus, spd: equip.speedBonus,
        },
        newStats: realStats,
        ...result,
      };
    });

    const skillResults = skills.map(skill => {
      // 先解析真實數值
      const realStats = parseSkillRealStats({
        powerPercent: skill.powerPercent,
        mpCost: skill.mpCost,
        cooldown: skill.cooldown,
        tier: skill.tier,
        skillType: skill.skillType,
        description: skill.description,
      });
      const result = evaluateSkill({
        tier: skill.tier,
        rarity: skill.rarity,
        skillType: skill.skillType,
        powerPercent: realStats.powerPercent,
        mpCost: realStats.mpCost,
        cooldown: realStats.cooldown,
        learnLevel: skill.learnLevel,
        description: skill.description,
      });
      return {
        id: skill.skillId,
        name: skill.name,
        type: "skill" as const,
        wuxing: skill.wuxing,
        tier: skill.tier,
        currentRarity: skill.rarity,
        currentPrice: skill.shopPrice,
        currentStats: {
          power: skill.powerPercent, mp: skill.mpCost, cd: skill.cooldown,
        },
        newStats: realStats,
        ...result,
      };
    });

    // 統計摘要
    const summary = {
      items: {
        total: itemResults.length,
        rarityChanges: itemResults.filter(r => r.currentRarity !== r.correctedRarity).length,
        priceChanges: itemResults.filter(r => r.currentPrice !== r.suggestedCoinPrice).length,
        byQuality: { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<string, number>,
      },
      equipment: {
        total: equipResults.length,
        rarityChanges: equipResults.filter((r: any) => r.currentRarity !== r.correctedRarity).length,
        priceChanges: equipResults.filter((r: any) => r.currentPrice !== r.suggestedCoinPrice).length,
        statsFixed: equipResults.filter((r: any) =>
          r.currentStats.hp !== r.newStats.hpBonus ||
          r.currentStats.atk !== r.newStats.attackBonus
        ).length,
        byQuality: { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<string, number>,
      },
      skills: {
        total: skillResults.length,
        rarityChanges: skillResults.filter((r: any) => r.currentRarity !== r.correctedRarity).length,
        priceChanges: skillResults.filter((r: any) => r.currentPrice !== r.suggestedCoinPrice).length,
        statsFixed: skillResults.filter((r: any) =>
          r.currentStats.power !== r.newStats.powerPercent ||
          r.currentStats.mp !== r.newStats.mpCost
        ).length,
        byQuality: { S: 0, A: 0, B: 0, C: 0, D: 0 } as Record<string, number>,
      },
    };
    for (const r of itemResults) summary.items.byQuality[r.qualityGrade]++;
    for (const r of equipResults) summary.equipment.byQuality[r.qualityGrade]++;
    for (const r of skillResults) summary.skills.byQuality[r.qualityGrade]++;

    return {
      summary,
      items: itemResults,
      equipment: equipResults,
      skills: skillResults,
    };
  }),

  /**
   * 執行批量重新評估並寫入資料庫
   */
  applyAll: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    let itemsUpdated = 0;
    let equipsUpdated = 0;
    let skillsUpdated = 0;

    // 1. 更新道具
    const items = await db.select().from(gameItemCatalog).where(eq(gameItemCatalog.isActive, 1));
    for (const item of items) {
      const result = evaluateItem({
        category: item.category,
        rarity: item.rarity,
        useEffect: item.useEffect as any,
        stackLimit: item.stackLimit,
      });
      await db.update(gameItemCatalog)
        .set({
          rarity: result.correctedRarity,
          shopPrice: result.suggestedCoinPrice,
          valueScore: result.valueScore,
          qualityGrade: result.qualityGrade,
          dropLevelMin: result.dropLevelRange[0],
          dropLevelMax: result.dropLevelRange[1],
          tradeable: result.tradeRules.tradeable ? 1 : 0,
          inNormalShop: result.tradeRules.normalShop ? 1 : 0,
          inSpiritShop: result.tradeRules.spiritShop ? 1 : 0,
          inSecretShop: result.tradeRules.secretShop ? 1 : 0,
          inAuctionHouse: result.tradeRules.auctionHouse ? 1 : 0,
        })
        .where(eq(gameItemCatalog.id, item.id));
      itemsUpdated++;
    }

    // 2. 更新裝備
    const equips = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.isActive, 1));
    for (const equip of equips) {
      const realStats = calculateEquipRealStats({
        tier: equip.tier,
        slot: equip.slot,
        hpBonus: equip.hpBonus,
        attackBonus: equip.attackBonus,
        defenseBonus: equip.defenseBonus,
        speedBonus: equip.speedBonus,
      });
      const result = evaluateEquipment({
        tier: equip.tier,
        rarity: equip.rarity,
        slot: equip.slot,
        hpBonus: realStats.hpBonus,
        attackBonus: realStats.attackBonus,
        defenseBonus: realStats.defenseBonus,
        speedBonus: realStats.speedBonus,
        levelRequired: Number(equip.levelRequired) || 1,
        specialEffect: equip.specialEffect,
        affix1: equip.affix1 as any,
        affix2: equip.affix2 as any,
        affix3: equip.affix3 as any,
        affix4: equip.affix4 as any,
        affix5: equip.affix5 as any,
      });

      // 更新品質顏色（根據品質等級映射）
      const qualityColorMap: Record<string, string> = {
        S: "red", A: "orange", B: "purple", C: "blue", D: "green",
      };

      await db.update(gameEquipmentCatalog)
        .set({
          rarity: result.correctedRarity,
          shopPrice: result.suggestedCoinPrice,
          quality: qualityColorMap[result.qualityGrade] || "white",
          hpBonus: realStats.hpBonus,
          attackBonus: realStats.attackBonus,
          defenseBonus: realStats.defenseBonus,
          speedBonus: realStats.speedBonus,
          valueScore: result.valueScore,
          qualityGrade: result.qualityGrade,
          dropLevelMin: result.dropLevelRange[0],
          dropLevelMax: result.dropLevelRange[1],
          tradeable: result.tradeRules.tradeable ? 1 : 0,
          inNormalShop: result.tradeRules.normalShop ? 1 : 0,
          inSpiritShop: result.tradeRules.spiritShop ? 1 : 0,
          inSecretShop: result.tradeRules.secretShop ? 1 : 0,
          inAuctionHouse: result.tradeRules.auctionHouse ? 1 : 0,
        })
        .where(eq(gameEquipmentCatalog.id, equip.id));
      equipsUpdated++;
    }

    // 3. 更新技能
    const skills = await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.isActive, 1));
    for (const skill of skills) {
      const realStats = parseSkillRealStats({
        powerPercent: skill.powerPercent,
        mpCost: skill.mpCost,
        cooldown: skill.cooldown,
        tier: skill.category,
        skillType: skill.skillType,
        description: skill.description,
      });
      const result = evaluateSkill({
        tier: skill.category,
        rarity: skill.rarity,
        skillType: skill.skillType,
        powerPercent: realStats.powerPercent,
        mpCost: realStats.mpCost,
        cooldown: realStats.cooldown,
        learnLevel: skill.prerequisiteLevel ?? 1,
        description: skill.description,
      });

      await db.update(gameUnifiedSkillCatalog)
        .set({
          rarity: result.correctedRarity,
          powerPercent: realStats.powerPercent,
          mpCost: realStats.mpCost,
          cooldown: realStats.cooldown,
        })
        .where(eq(gameUnifiedSkillCatalog.id, skill.id));
      skillsUpdated++;
    }

    return {
      success: true,
      updated: {
        items: itemsUpdated,
        equipment: equipsUpdated,
        skills: skillsUpdated,
      },
    };
  }),

  /**
   * 單一物品價值評估（即時計算，不寫入）
   */
  evaluateSingle: adminProcedure
    .input(z.object({
      type: z.enum(["item", "equipment", "skill"]),
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (input.type === "item") {
        const [item] = await db.select().from(gameItemCatalog)
          .where(eq(gameItemCatalog.itemId, input.id));
        if (!item) throw new TRPCError({ code: "NOT_FOUND" });
        return evaluateItem({
          category: item.category,
          rarity: item.rarity,
          useEffect: item.useEffect as any,
          stackLimit: item.stackLimit,
        });
      }
      if (input.type === "equipment") {
        const [equip] = await db.select().from(gameEquipmentCatalog)
          .where(eq(gameEquipmentCatalog.equipId, input.id));
        if (!equip) throw new TRPCError({ code: "NOT_FOUND" });
        const realStats = calculateEquipRealStats({
          tier: equip.tier, slot: equip.slot,
          hpBonus: equip.hpBonus, attackBonus: equip.attackBonus,
          defenseBonus: equip.defenseBonus, speedBonus: equip.speedBonus,
        });
        return evaluateEquipment({
          ...equip, ...realStats,
          levelRequired: Number(equip.levelRequired) || 1,
          affix1: equip.affix1 as any, affix2: equip.affix2 as any,
          affix3: equip.affix3 as any, affix4: equip.affix4 as any,
          affix5: equip.affix5 as any,
        });
      }
      // skill
      const [skill] = await db.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.skillId, input.id));
      if (!skill) throw new TRPCError({ code: "NOT_FOUND" });
      const realStats = parseSkillRealStats({
        powerPercent: skill.powerPercent, mpCost: skill.mpCost,
        cooldown: skill.cooldown, tier: skill.tier,
        skillType: skill.skillType, description: skill.description,
      });
      return evaluateSkill({
        ...skill, ...realStats, description: skill.description,
      });
    }),

  /**
   * AI 一鍵怪物掉落分配
   * 根據 ValueEngine 規則，自動為每個怪物分配合適等級和稀有度的掉落物品
   */
  aiAssignDrops: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // 1. 讀取所有怪物
      const monsters = await db.select().from(gameMonsterCatalog).where(eq(gameMonsterCatalog.isActive, 1));
      // 2. 讀取所有可用道具、裝備、技能書
      const items = await db.select().from(gameItemCatalog).where(eq(gameItemCatalog.isActive, 1));
      const equips = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.isActive, 1));
      const skills = await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.isActive, 1));

      // 3. 為每個道具/裝備/技能計算價值和掉落等級範圍
      const dropPool: Array<{
        id: string; name: string; type: "item" | "equipment" | "skill";
        rarity: string; qualityGrade: string; dropLevelMin: number; dropLevelMax: number;
        dropRate: number; valueScore: number;
      }> = [];

      for (const item of items) {
        // 排除任務道具和寶物
        if (item.category === "quest" || item.category === "treasure") continue;
        const eval_ = evaluateItem({
          category: item.category, rarity: item.rarity,
          useEffect: item.useEffect as any, stackLimit: item.stackLimit,
        });
        const [dMin, dMax] = eval_.dropLevelRange;
        // 掉落率根據稀有度和品質計算
        const baseRate = { common: 0.15, rare: 0.08, epic: 0.03, legendary: 0.008 }[eval_.correctedRarity] || 0.1;
        const qualityMod = { S: 0.5, A: 0.7, B: 0.9, C: 1.0, D: 1.2 }[eval_.qualityGrade] || 1.0;
        dropPool.push({
          id: item.itemId, name: item.name, type: "item",
          rarity: eval_.correctedRarity, qualityGrade: eval_.qualityGrade,
          dropLevelMin: dMin, dropLevelMax: dMax,
          dropRate: Math.round(baseRate * qualityMod * 1000) / 1000,
          valueScore: eval_.valueScore,
        });
      }

      for (const equip of equips) {
        const realStats = calculateEquipRealStats({
          tier: equip.tier, slot: equip.slot,
          hpBonus: equip.hpBonus, attackBonus: equip.attackBonus,
          defenseBonus: equip.defenseBonus, speedBonus: equip.speedBonus,
        });
        const eval_ = evaluateEquipment({
          ...equip, ...realStats,
          levelRequired: Number(equip.levelRequired) || 1,
          affix1: equip.affix1 as any, affix2: equip.affix2 as any,
          affix3: equip.affix3 as any, affix4: equip.affix4 as any,
          affix5: equip.affix5 as any,
        });
        const [dMin, dMax] = eval_.dropLevelRange;
        const baseRate = { common: 0.10, rare: 0.05, epic: 0.02, legendary: 0.005 }[eval_.correctedRarity] || 0.08;
        const qualityMod = { S: 0.4, A: 0.6, B: 0.85, C: 1.0, D: 1.3 }[eval_.qualityGrade] || 1.0;
        dropPool.push({
          id: equip.equipId, name: equip.name, type: "equipment",
          rarity: eval_.correctedRarity, qualityGrade: eval_.qualityGrade,
          dropLevelMin: dMin, dropLevelMax: dMax,
          dropRate: Math.round(baseRate * qualityMod * 1000) / 1000,
          valueScore: eval_.valueScore,
        });
      }

      for (const skill of skills) {
        // 傳說級技能書不能掉落
        if (skill.rarity === "legendary" && (skill.tier === "傳說" || skill.tier === "天命")) continue;
        const realStats = parseSkillRealStats({
          powerPercent: skill.powerPercent, mpCost: skill.mpCost,
          cooldown: skill.cooldown, tier: skill.tier,
          skillType: skill.skillType, description: skill.description,
        });
        const eval_ = evaluateSkill({
          ...skill, ...realStats, description: skill.description,
        });
        const [dMin, dMax] = eval_.dropLevelRange;
        const baseRate = { common: 0.06, rare: 0.03, epic: 0.01, legendary: 0.003 }[eval_.correctedRarity] || 0.05;
        const qualityMod = { S: 0.3, A: 0.5, B: 0.8, C: 1.0, D: 1.3 }[eval_.qualityGrade] || 1.0;
        dropPool.push({
          id: skill.skillId, name: skill.name, type: "skill",
          rarity: eval_.correctedRarity, qualityGrade: eval_.qualityGrade,
          dropLevelMin: dMin, dropLevelMax: dMax,
          dropRate: Math.round(baseRate * qualityMod * 1000) / 1000,
          valueScore: eval_.valueScore,
        });
      }

      // 4. 為每個怪物分配掉落
      const assignments: Array<{
        monsterId: string; monsterName: string; monsterLevel: string; monsterRarity: string;
        drops: Array<{ slot: number; itemId: string; itemName: string; type: string; rate: number }>;
        legendaryDrop?: { itemId: string; itemName: string; type: string; rate: number };
      }> = [];

      for (const monster of monsters) {
        // 解析怪物等級範圍
        const [lvMin, lvMax] = monster.levelRange.split("-").map(Number);
        const monsterMidLv = Math.round((lvMin + lvMax) / 2);

        // 篩選等級範圍重疊的掉落物
        const eligible = dropPool.filter(d => {
          // 掉落物的等級範圍要與怪物等級重疊
          return d.dropLevelMin <= lvMax && d.dropLevelMax >= lvMin;
        });

        // 根據怪物稀有度決定掉落槽位數
        const slotCount = { common: 2, rare: 3, elite: 3, epic: 4, boss: 4, legendary: 5 }[monster.rarity] || 3;

        // 優先分配同五行的物品，然後填充其他
        const sameWuxing = eligible.filter(d => {
          // 檢查道具的五行屬性
          const itemObj = items.find(i => i.itemId === d.id) || equips.find(e => e.equipId === d.id) || skills.find(s => s.skillId === d.id);
          return itemObj && (itemObj as any).wuxing === monster.wuxing;
        });
        const otherWuxing = eligible.filter(d => !sameWuxing.includes(d));

        // 排序：同五行優先，然後按價值分散選取
        const sorted = [...sameWuxing, ...otherWuxing];

        // 選取掉落物（確保類型多樣性）
        const selected: typeof dropPool = [];
        const usedTypes = new Set<string>();
        
        // 第一輪：每種類型至少一個
        for (const d of sorted) {
          if (selected.length >= slotCount) break;
          if (!usedTypes.has(d.type)) {
            selected.push(d);
            usedTypes.add(d.type);
          }
        }
        // 第二輪：填滿剩餘槽位
        for (const d of sorted) {
          if (selected.length >= slotCount) break;
          if (!selected.includes(d)) {
            selected.push(d);
          }
        }

        // 傳說掉落（只有 epic/boss/legendary 怪物才有）
        let legendaryDrop: typeof dropPool[0] | undefined;
        if (["epic", "boss", "legendary"].includes(monster.rarity)) {
          const legendaryEligible = eligible.filter(d => 
            d.rarity === "epic" || d.rarity === "legendary"
          ).sort((a, b) => b.valueScore - a.valueScore);
          if (legendaryEligible.length > 0) {
            legendaryDrop = legendaryEligible[0];
          }
        }

        const dropAssignment = {
          monsterId: monster.monsterId,
          monsterName: monster.name,
          monsterLevel: monster.levelRange,
          monsterRarity: monster.rarity,
          drops: selected.map((d, i) => ({
            slot: i + 1,
            itemId: d.id,
            itemName: d.name,
            type: d.type,
            rate: d.dropRate,
          })),
          legendaryDrop: legendaryDrop ? {
            itemId: legendaryDrop.id,
            itemName: legendaryDrop.name,
            type: legendaryDrop.type,
            rate: legendaryDrop.dropRate * 0.3, // 傳說掉落率更低
          } : undefined,
        };
        assignments.push(dropAssignment);

        // 5. 寫入資料庫
        if (!input.dryRun) {
          const updateData: Record<string, any> = {};
          for (let i = 0; i < 5; i++) {
            if (i < selected.length) {
              updateData[`dropItem${i + 1}`] = selected[i].id;
              updateData[`dropRate${i + 1}`] = selected[i].dropRate;
            } else {
              updateData[`dropItem${i + 1}`] = "";
              updateData[`dropRate${i + 1}`] = 0;
            }
          }
          if (legendaryDrop) {
            updateData.legendaryDrop = legendaryDrop.id;
            updateData.legendaryDropRate = legendaryDrop.dropRate * 0.3;
          } else {
            updateData.legendaryDrop = "";
            updateData.legendaryDropRate = 0;
          }
          await db.update(gameMonsterCatalog)
            .set(updateData)
            .where(eq(gameMonsterCatalog.monsterId, monster.monsterId));

          // 同時更新 monsterDropTables（裝備掉落）
          const equipDrops = selected.filter(d => d.type === "equipment");
          // 清除舊的裝備掉落
          await db.delete(monsterDropTables)
            .where(eq(monsterDropTables.monsterId, monster.monsterId));
          // 插入新的裝備掉落
          for (const ed of equipDrops) {
            await db.insert(monsterDropTables).values({
              monsterId: monster.monsterId,
              equipmentId: ed.id,
              baseDropRate: Math.round(ed.dropRate * 1000),
              weight: 100,
            });
          }
        }
      }

      return {
        dryRun: input.dryRun,
        totalMonsters: monsters.length,
        totalDropPool: dropPool.length,
        assignments: assignments.slice(0, 50), // 預覽最多顯示 50 個
        message: input.dryRun
          ? `預覽完成：${monsters.length} 隻怪物已分配掉落（待確認）`
          : `✅ 已為 ${monsters.length} 隻怪物分配掉落物品`,
      };
    }),
});
