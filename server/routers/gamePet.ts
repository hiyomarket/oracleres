/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 寵物系統 tRPC Router (GD-019)
 * 
 * 功能：
 * 1. 寵物圖鑑 CRUD（管理員）
 * 2. 天生技能池 CRUD（管理員）
 * 3. 玩家寵物管理（捕捉、升級、BP成長、出戰切換）
 * 4. 天命技能學習/替換/升級
 * 5. 寵物戰鬥數值計算
 * ═══════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gamePetCatalog,
  gamePetInnateSkills,
  gamePlayerPets,
  gamePetLearnedSkills,
  gameAgents,
  gamePetBpHistory,
  agentInventory,
  gameItemCatalog,
} from "../../drizzle/schema";
import { eq, and, desc, asc, sql, like } from "drizzle-orm";
import {
  rollTier,
  rollInitialBP,
  levelUpBP,
  calcPetStats,
  calcCaptureRate,
  calcPetExpToNext,
  DESTINY_SKILLS,
  DESTINY_SLOT_UNLOCK,
  INNATE_SLOT_UNLOCK,
  RACE_HP_MULTIPLIER,
  getDestinySkillPower,
  checkDestinySkillLevelUp,
  auditPetCatalog,
  TIER_CONFIG,
  recalcReasonableBP,
} from "../services/petEngine";

// ─── 權限中間件 ───
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ─── Zod Schemas ───
const petCatalogInput = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  race: z.enum(["dragon", "undead", "normal", "insect", "plant", "flying"]).default("normal"),
  wuxing: z.enum(["wood", "fire", "earth", "metal", "water"]).default("earth"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  growthType: z.enum(["fighter", "guardian", "swift", "mage", "balanced"]).default("balanced"),
  baseBpConstitution: z.number().int().min(1).max(100).default(20),
  baseBpStrength: z.number().int().min(1).max(100).default(20),
  baseBpDefense: z.number().int().min(1).max(100).default(20),
  baseBpAgility: z.number().int().min(1).max(100).default(20),
  baseBpMagic: z.number().int().min(1).max(100).default(20),
  raceHpMultiplier: z.number().min(0.5).max(2.0).default(1.0),
  minLevel: z.number().int().min(1).max(60).default(1),
  maxLevel: z.number().int().min(1).max(60).default(50),
  baseCaptureRate: z.number().int().min(1).max(100).default(30),
  imageUrl: z.string().optional(),
  isActive: z.number().int().min(0).max(1).default(1),
  sortOrder: z.number().int().default(0),
});

const innateSkillInput = z.object({
  petCatalogId: z.number().int(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  skillType: z.enum(["attack", "heal", "buff", "debuff", "utility"]).default("attack"),
  wuxing: z.enum(["wood", "fire", "earth", "metal", "water"]).nullable().optional(),
  powerPercent: z.number().int().min(0).max(500).default(100),
  mpCost: z.number().int().min(0).max(100).default(5),
  cooldown: z.number().int().min(0).max(10).default(2),
  unlockLevel: z.number().int().min(1).max(60).default(1),
  slotIndex: z.number().int().min(1).max(3).default(1),
  sortOrder: z.number().int().default(0),
});

export const gamePetRouter = router({

  // ════════════════════════════════════════════════════════════════
  // 1. 寵物圖鑑 CRUD（管理員）
  // ════════════════════════════════════════════════════════════════

  getPetCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      rarity: z.string().optional(),
      race: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gamePetCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gamePetCatalog.wuxing, p.wuxing));
      if (p.rarity) conditions.push(eq(gamePetCatalog.rarity, p.rarity));
      if (p.race) conditions.push(eq(gamePetCatalog.race, p.race));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gamePetCatalog).where(whereClause);
      const rows = await db.select().from(gamePetCatalog).where(whereClause)
        .orderBy(asc(gamePetCatalog.sortOrder), asc(gamePetCatalog.id))
        .limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createPetCatalog: adminProcedure.input(petCatalogInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // 自動校正種族 HP 倍率
    const raceHpMul = RACE_HP_MULTIPLIER[input.race] ?? 1.0;
    const [result] = await db.insert(gamePetCatalog).values({
      ...input,
      raceHpMultiplier: raceHpMul,
    });
    return { id: (result as any).insertId };
  }),

  updatePetCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: petCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const updateData: any = { ...input.data, updatedAt: Date.now() };
      // 如果更新了種族，自動校正 HP 倍率
      if (input.data.race) {
        updateData.raceHpMultiplier = RACE_HP_MULTIPLIER[input.data.race] ?? 1.0;
      }
      await db.update(gamePetCatalog).set(updateData).where(eq(gamePetCatalog.id, input.id));
      return { success: true };
    }),

  deletePetCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 同時刪除關聯的天生技能
      await db.delete(gamePetInnateSkills).where(eq(gamePetInnateSkills.petCatalogId, input.id));
      await db.delete(gamePetCatalog).where(eq(gamePetCatalog.id, input.id));
      return { success: true };
    }),

  /** 審核寵物圖鑑數值 */
  auditPetCatalogItem: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [pet] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, input.id));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });
      return auditPetCatalog(pet);
    }),

  // ════════════════════════════════════════════════════════════════
  // 2. 天生技能池 CRUD（管理員）
  // ════════════════════════════════════════════════════════════════

  getInnateSkills: adminProcedure
    .input(z.object({ petCatalogId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(gamePetInnateSkills)
        .where(eq(gamePetInnateSkills.petCatalogId, input.petCatalogId))
        .orderBy(asc(gamePetInnateSkills.slotIndex));
      return rows;
    }),

  createInnateSkill: adminProcedure.input(innateSkillInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gamePetInnateSkills).values(input);
    return { id: (result as any).insertId };
  }),

  updateInnateSkill: adminProcedure
    .input(z.object({ id: z.number().int(), data: innateSkillInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gamePetInnateSkills).set(input.data).where(eq(gamePetInnateSkills.id, input.id));
      return { success: true };
    }),

  deleteInnateSkill: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gamePetInnateSkills).where(eq(gamePetInnateSkills.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 3. 玩家寵物管理
  // ════════════════════════════════════════════════════════════════

  /** 取得玩家所有寵物 */
  getMyPets: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // 找到玩家角色
    const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agent) return [];
    const pets = await db.select().from(gamePlayerPets)
      .where(eq(gamePlayerPets.agentId, agent.id))
      .orderBy(desc(gamePlayerPets.isActive), desc(gamePlayerPets.level));
    // 附加圖鑑資料
    const catalogIds = Array.from(new Set(pets.map(p => p.petCatalogId)));
    if (catalogIds.length === 0) return [];
    const catalogs = await db.select().from(gamePetCatalog)
      .where(sql`${gamePetCatalog.id} IN (${sql.join(catalogIds.map(id => sql`${id}`), sql`, `)})`);
    const catalogMap = new Map(catalogs.map(c => [c.id, c]));
    return pets.map(p => ({
      ...p,
      catalog: catalogMap.get(p.petCatalogId) ?? null,
      expToNext: calcPetExpToNext(p.level),
    }));
  }),

  /** 取得單隻寵物詳情（含技能） */
  getPetDetail: protectedProcedure
    .input(z.object({ petId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });
      
      // 圖鑑資料
      const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, pet.petCatalogId));
      
      // 天生技能（從圖鑑取得，按解鎖等級過濾）
      const innateSkills = catalog ? await db.select().from(gamePetInnateSkills)
        .where(eq(gamePetInnateSkills.petCatalogId, catalog.id))
        .orderBy(asc(gamePetInnateSkills.slotIndex)) : [];
      const unlockedInnate = innateSkills.filter(s => pet.level >= s.unlockLevel);
      
      // 天命技能
      const learnedSkills = await db.select().from(gamePetLearnedSkills)
        .where(eq(gamePetLearnedSkills.playerPetId, pet.id))
        .orderBy(asc(gamePetLearnedSkills.slotIndex));
      
      // 計算戰鬥數值
      const stats = calcPetStats(
        { constitution: pet.bpConstitution, strength: pet.bpStrength, defense: pet.bpDefense, agility: pet.bpAgility, magic: pet.bpMagic },
        pet.level,
        catalog?.raceHpMultiplier ?? 1.0,
      );
      
      // 天命技能格解鎖狀態
      const destinySlots = DESTINY_SLOT_UNLOCK.map((lvl, i) => ({
        slotIndex: i + 4,
        unlockLevel: lvl,
        isUnlocked: pet.level >= lvl,
      }));
      
      // 天生技能格解鎖狀態
      const innateSlots = INNATE_SLOT_UNLOCK.map((lvl, i) => ({
        slotIndex: i + 1,
        unlockLevel: lvl,
        isUnlocked: pet.level >= lvl,
      }));
      
      return {
        pet,
        catalog,
        innateSkills: unlockedInnate,
        learnedSkills,
        stats,
        destinySlots,
        innateSlots,
        expToNext: calcPetExpToNext(pet.level),
        totalBp: pet.bpConstitution + pet.bpStrength + pet.bpDefense + pet.bpAgility + pet.bpMagic,
      };
    }),

  /** 查詢背包中的捕捉球道具 */
  getCaptureItems: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 查詢背包中的捕捉球
      const items = await db.select({
        inventoryId: agentInventory.id,
        itemId: agentInventory.itemId,
        quantity: agentInventory.quantity,
        name: gameItemCatalog.name,
        rarity: gameItemCatalog.rarity,
        useEffect: gameItemCatalog.useEffect,
        imageUrl: gameItemCatalog.imageUrl,
      })
        .from(agentInventory)
        .innerJoin(gameItemCatalog, eq(agentInventory.itemId, gameItemCatalog.itemId))
        .where(
          and(
            eq(agentInventory.agentId, agent.id),
            sql`${agentInventory.quantity} > 0`,
            sql`JSON_EXTRACT(${gameItemCatalog.useEffect}, '$.type') = 'capture'`,
          )
        );

      return items.map(i => ({
        inventoryId: i.inventoryId,
        itemId: i.itemId,
        name: i.name,
        rarity: i.rarity,
        quantity: i.quantity,
        imageUrl: i.imageUrl,
        captureItemType: (i.useEffect as any)?.captureItemType ?? "normal",
        multiplier: (i.useEffect as any)?.multiplier ?? 1.0,
        description: (i.useEffect as any)?.description ?? "",
      }));
    }),

  /** 捕捉寵物（含道具扣除） */
  capturePet: protectedProcedure
    .input(z.object({
      petCatalogId: z.number().int(),
      monsterCurrentHp: z.number().int().min(0),
      monsterMaxHp: z.number().int().min(1),
      monsterLevel: z.number().int().min(1),
      captureItemId: z.string().min(1), // 使用的捕捉球 itemId
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // ─── 驗證並扣除捕捉球道具 ───
      const [invItem] = await db.select({
        id: agentInventory.id,
        quantity: agentInventory.quantity,
        itemId: agentInventory.itemId,
      }).from(agentInventory).where(
        and(
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.itemId, input.captureItemId),
          sql`${agentInventory.quantity} > 0`,
        )
      ).limit(1);
      if (!invItem) throw new TRPCError({ code: "BAD_REQUEST", message: "背包中沒有此捕捉球道具" });

      // 查詢道具效果取得 captureItemType
      const [itemCat] = await db.select({ useEffect: gameItemCatalog.useEffect })
        .from(gameItemCatalog).where(eq(gameItemCatalog.itemId, input.captureItemId)).limit(1);
      const captureItemType = (itemCat?.useEffect as any)?.captureItemType ?? "normal";

      // 扣除 1 個捕捉球
      const newQty = invItem.quantity - 1;
      if (newQty <= 0) {
        await db.update(agentInventory).set({ quantity: 0, updatedAt: Date.now() })
          .where(eq(agentInventory.id, invItem.id));
      } else {
        await db.update(agentInventory).set({ quantity: newQty, updatedAt: Date.now() })
          .where(eq(agentInventory.id, invItem.id));
      }

      // 取得寵物圖鑑
      const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, input.petCatalogId));
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "寵物種類不存在" });
      if (!catalog.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "此寵物目前無法捕捉" });
      
      // 計算捕捉率
      const captureRate = calcCaptureRate({
        baseCaptureRate: catalog.baseCaptureRate,
        monsterCurrentHp: input.monsterCurrentHp,
        monsterMaxHp: input.monsterMaxHp,
        monsterLevel: input.monsterLevel,
        playerLevel: agent.level,
        captureItemType,
      });
      
      // 擲骰
      const roll = Math.random();
      const success = roll <= captureRate;
      
      if (!success) {
        return {
          success: false,
          captureRate: Math.round(captureRate * 100),
          roll: Math.round(roll * 100),
          captureItemUsed: captureItemType,
          message: `捕捉失敗！成功率 ${Math.round(captureRate * 100)}%，已消耗 1 個捕捉球`,
        };
      }
      
      // 捕捉成功：決定檔位、初始 BP
      const tier = rollTier();
      const baseBp = {
        constitution: catalog.baseBpConstitution,
        strength: catalog.baseBpStrength,
        defense: catalog.baseBpDefense,
        agility: catalog.baseBpAgility,
        magic: catalog.baseBpMagic,
      };
      const initialBp = rollInitialBP(tier, baseBp);
      const stats = calcPetStats(initialBp, 1, catalog.raceHpMultiplier);
      
      // 寫入資料庫
      const [result] = await db.insert(gamePlayerPets).values({
        agentId: agent.id,
        petCatalogId: catalog.id,
        nickname: catalog.name,
        level: 1,
        exp: 0,
        tier,
        bpConstitution: initialBp.constitution,
        bpStrength: initialBp.strength,
        bpDefense: initialBp.defense,
        bpAgility: initialBp.agility,
        bpMagic: initialBp.magic,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: stats.mp,
        maxMp: stats.mp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        magicAttack: stats.magicAttack,
        growthType: catalog.growthType,
        isActive: 0,
        friendship: 0,
      });
      
      const petId = (result as any).insertId;
      
      return {
        success: true,
        petId,
        tier,
        captureRate: Math.round(captureRate * 100),
        initialBp,
        stats,
        message: `成功捕捉 ${catalog.name}！檔位：${tier}，BP 總值：${initialBp.totalBp}`,
      };
    }),

  /** 設定出戰寵物 */
  setActivePet: protectedProcedure
    .input(z.object({ petId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      
      // 先取消所有出戰
      await db.update(gamePlayerPets).set({ isActive: 0 })
        .where(eq(gamePlayerPets.agentId, agent.id));
      
      // 設定新的出戰寵物
      await db.update(gamePlayerPets).set({ isActive: 1, updatedAt: Date.now() })
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      
      return { success: true };
    }),

  /** 取消出戰寵物 */
  unsetActivePet: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(gamePlayerPets).set({ isActive: 0 })
        .where(eq(gamePlayerPets.agentId, agent.id));
      return { success: true };
    }),

  /** 修改寵物暱稱 */
  renamePet: protectedProcedure
    .input(z.object({ petId: z.number().int(), nickname: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(gamePlayerPets).set({ nickname: input.nickname, updatedAt: Date.now() })
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      return { success: true };
    }),

  /** 寵物獲得經驗值（戰鬥後調用） */
  addPetExp: protectedProcedure
    .input(z.object({ petId: z.number().int(), exp: z.number().int().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });
      
      let currentExp = pet.exp + input.exp;
      let currentLevel = pet.level;
      const bp = {
        constitution: pet.bpConstitution,
        strength: pet.bpStrength,
        defense: pet.bpDefense,
        agility: pet.bpAgility,
        magic: pet.bpMagic,
      };
      let bpUnallocated = pet.bpUnallocated ?? 0;
      const levelUps: Array<{ level: number; bpGained: number }> = [];
      
      // 連續升級檢查
      const growthBonus = 1 + (({ S: 0.3, A: 0.2, B: 0.1, C: 0, D: -0.05, E: -0.1 } as Record<string, number>)[pet.tier] ?? 0);
      while (currentLevel < 60) {
        const expToNext = calcPetExpToNext(currentLevel);
        if (currentExp < expToNext) break;
        currentExp -= expToNext;
        currentLevel++;
        
        // 每級獲得 4 點未分配 BP（乘以檔位加成）
        const bpGained = Math.max(1, Math.round(4 * growthBonus));
        bpUnallocated += bpGained;
        levelUps.push({ level: currentLevel, bpGained });
      }
      
      // 取得圖鑑資料以獲取種族 HP 倍率
      const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, pet.petCatalogId));
      const stats = calcPetStats(bp, currentLevel, catalog?.raceHpMultiplier ?? 1.0);
      
      // 更新資料庫
      await db.update(gamePlayerPets).set({
        exp: currentExp,
        level: currentLevel,
        bpUnallocated,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: stats.mp,
        maxMp: stats.mp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        magicAttack: stats.magicAttack,
        updatedAt: Date.now(),
      }).where(eq(gamePlayerPets.id, pet.id));
      
      return {
        newLevel: currentLevel,
        newExp: currentExp,
        expToNext: calcPetExpToNext(currentLevel),
        levelUps,
        stats,
        bpUnallocated,
        totalBp: bp.constitution + bp.strength + bp.defense + bp.agility + bp.magic,
      };
    }),

  // ════════════════════════════════════════════════════════════════
  // 4. 天命技能管理
  // ════════════════════════════════════════════════════════════════

  /** 取得可學習的天命技能列表 */
  getAvailableDestinySkills: protectedProcedure
    .input(z.object({ petId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND" });
      
      // 已學技能
      const learned = await db.select().from(gamePetLearnedSkills)
        .where(eq(gamePetLearnedSkills.playerPetId, pet.id));
      const learnedKeys = new Set(learned.map(s => s.skillKey));
      
      // 所有天命技能
      return Object.entries(DESTINY_SKILLS).map(([key, skill]) => ({
        key,
        ...skill,
        isLearned: learnedKeys.has(key),
        learnedData: learned.find(s => s.skillKey === key) ?? null,
      }));
    }),

  /** 學習天命技能 */
  learnDestinySkill: protectedProcedure
    .input(z.object({
      petId: z.number().int(),
      skillKey: z.string(),
      slotIndex: z.number().int().min(4).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });
      
      // 檢查天命技能格是否解鎖
      const slotIdx = input.slotIndex - 4; // 0-based
      if (slotIdx < 0 || slotIdx >= DESTINY_SLOT_UNLOCK.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "無效的技能格位置" });
      }
      if (pet.level < DESTINY_SLOT_UNLOCK[slotIdx]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `天命技能格 ${input.slotIndex} 需要等級 ${DESTINY_SLOT_UNLOCK[slotIdx]} 才能解鎖` });
      }
      
      // 檢查技能是否存在
      const skillDef = DESTINY_SKILLS[input.skillKey];
      if (!skillDef) throw new TRPCError({ code: "BAD_REQUEST", message: "無效的天命技能" });
      
      // 檢查該格是否已有技能（替換）
      const [existing] = await db.select().from(gamePetLearnedSkills)
        .where(and(
          eq(gamePetLearnedSkills.playerPetId, pet.id),
          eq(gamePetLearnedSkills.slotIndex, input.slotIndex),
        ));
      
      const power = getDestinySkillPower(skillDef, 1);
      
      if (existing) {
        // 替換技能
        await db.update(gamePetLearnedSkills).set({
          skillName: skillDef.name,
          skillType: skillDef.skillType,
          skillKey: input.skillKey,
          wuxing: skillDef.wuxing,
          powerPercent: power.powerPercent,
          mpCost: power.mpCost,
          cooldown: power.cooldown,
          skillLevel: 1,
          usageCount: 0,
          updatedAt: Date.now(),
        }).where(eq(gamePetLearnedSkills.id, existing.id));
        return { success: true, action: "replaced", message: `已將天命技能替換為 ${skillDef.name}` };
      } else {
        // 新學技能
        await db.insert(gamePetLearnedSkills).values({
          playerPetId: pet.id,
          skillName: skillDef.name,
          skillType: skillDef.skillType,
          skillKey: input.skillKey,
          wuxing: skillDef.wuxing,
          powerPercent: power.powerPercent,
          mpCost: power.mpCost,
          cooldown: power.cooldown,
          skillLevel: 1,
          usageCount: 0,
          slotIndex: input.slotIndex,
          isEquipped: 1,
        });
        return { success: true, action: "learned", message: `成功學習天命技能 ${skillDef.name}` };
      }
    }),

  /** 天命技能使用次數增加（戰鬥中調用） */
  incrementSkillUsage: protectedProcedure
    .input(z.object({ learnedSkillId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      await db.update(gamePetLearnedSkills).set({
        usageCount: sql`${gamePetLearnedSkills.usageCount} + 1`,
        updatedAt: Date.now(),
      }).where(eq(gamePetLearnedSkills.id, input.learnedSkillId));
      
      // 檢查是否可以升級
      const [skill] = await db.select().from(gamePetLearnedSkills).where(eq(gamePetLearnedSkills.id, input.learnedSkillId));
      if (!skill) return { leveledUp: false };
      
      const check = checkDestinySkillLevelUp(skill.skillLevel, skill.usageCount);
      if (check.canLevelUp) {
        const skillDef = DESTINY_SKILLS[skill.skillKey];
        if (skillDef) {
          const newPower = getDestinySkillPower(skillDef, check.nextLevel);
          await db.update(gamePetLearnedSkills).set({
            skillLevel: check.nextLevel,
            powerPercent: newPower.powerPercent,
            mpCost: newPower.mpCost,
            updatedAt: Date.now(),
          }).where(eq(gamePetLearnedSkills.id, input.learnedSkillId));
          return { leveledUp: true, newLevel: check.nextLevel, newPower };
        }
      }
      
      return { leveledUp: false, usageCount: skill.usageCount, nextLevelReq: check.requiredUsage };
    }),

  // ════════════════════════════════════════════════════════════════
  // 5. 寵物圖鑑瀏覽（玩家端）
  // ════════════════════════════════════════════════════════════════

  /** 玩家端瀏覽寵物圖鑑 */
  browsePetCatalog: protectedProcedure
    .input(z.object({
      wuxing: z.string().optional(),
      rarity: z.string().optional(),
      race: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions: any[] = [eq(gamePetCatalog.isActive, 1)];
      if (input?.wuxing) conditions.push(eq(gamePetCatalog.wuxing, input.wuxing));
      if (input?.rarity) conditions.push(eq(gamePetCatalog.rarity, input.rarity));
      if (input?.race) conditions.push(eq(gamePetCatalog.race, input.race));
      const rows = await db.select().from(gamePetCatalog)
        .where(and(...conditions))
        .orderBy(asc(gamePetCatalog.sortOrder), asc(gamePetCatalog.id));
      return rows;
    }),

  /** 取得出戰寵物資訊（戰鬥用） */
  getActivePet: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agent) return null;
    
    const [pet] = await db.select().from(gamePlayerPets)
      .where(and(eq(gamePlayerPets.agentId, agent.id), eq(gamePlayerPets.isActive, 1)));
    if (!pet) return null;
    
    // 圖鑑
    const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, pet.petCatalogId));
    
    // 天生技能（已解鎖的）
    const innateSkills = catalog ? await db.select().from(gamePetInnateSkills)
      .where(and(eq(gamePetInnateSkills.petCatalogId, catalog.id)))
      .orderBy(asc(gamePetInnateSkills.slotIndex)) : [];
    const unlockedInnate = innateSkills.filter(s => pet.level >= s.unlockLevel);
    
    // 天命技能（已裝備的）
    const learnedSkills = await db.select().from(gamePetLearnedSkills)
      .where(and(eq(gamePetLearnedSkills.playerPetId, pet.id), eq(gamePetLearnedSkills.isEquipped, 1)));
    
    return {
      pet,
      catalog,
      innateSkills: unlockedInnate,
      learnedSkills,
      stats: calcPetStats(
        { constitution: pet.bpConstitution, strength: pet.bpStrength, defense: pet.bpDefense, agility: pet.bpAgility, magic: pet.bpMagic },
        pet.level,
        catalog?.raceHpMultiplier ?? 1.0,
      ),
    };
  }),

  // ════════════════════════════════════════════════════════════════
  // 6. 管理員工具
  // ════════════════════════════════════════════════════════════════

  /** 取得所有玩家寵物（管理員） */
  getAllPlayerPets: adminProcedure
    .input(z.object({
      agentId: z.number().int().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.agentId) conditions.push(eq(gamePlayerPets.agentId, p.agentId));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gamePlayerPets).where(whereClause);
      const rows = await db.select().from(gamePlayerPets).where(whereClause)
        .orderBy(desc(gamePlayerPets.level)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  /** 檔位分佈統計（管理員） */
  getTierDistribution: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      tier: gamePlayerPets.tier,
      count: sql<number>`count(*)`,
    }).from(gamePlayerPets).groupBy(gamePlayerPets.tier);
    return rows;
  }),

  /** 取得天命技能定義列表 */
  getDestinySkillDefs: protectedProcedure.query(() => {
    return Object.entries(DESTINY_SKILLS).map(([key, skill]) => ({
      key,
      ...skill,
    }));
  }),

  /** 取得檔位配置 */
  getTierConfig: protectedProcedure.query(() => {
    return Object.entries(TIER_CONFIG).map(([tier, config]) => ({
      tier,
      ...config,
    }));
  }),

  /** 取得寵物 BP 歷史記錄 */
  getPetBpHistory: protectedProcedure
    .input(z.object({
      petId: z.number(),
      limit: z.number().min(1).max(200).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 確認寵物屬於當前用戶（透過 agent 關聯）
      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)));
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(
          eq(gamePlayerPets.id, input.petId),
          eq(gamePlayerPets.agentId, agent.id)
        ));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });

      const history = await db.select().from(gamePetBpHistory)
        .where(eq(gamePetBpHistory.petId, input.petId))
        .orderBy(desc(gamePetBpHistory.createdAt))
        .limit(input.limit);

      // 返回時序排序（舊→新）
      return history.reverse();
    }),

  // ════════════════════════════════════════════════════════════════
  // 7. BP 手動分配
  // ════════════════════════════════════════════════════════════════

  /** 分配未使用的 BP 點數到指定屬性 */
  allocateBp: protectedProcedure
    .input(z.object({
      petId: z.number().int(),
      constitution: z.number().int().min(0).default(0),
      strength: z.number().int().min(0).default(0),
      defense: z.number().int().min(0).default(0),
      agility: z.number().int().min(0).default(0),
      magic: z.number().int().min(0).default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const [pet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.id, input.petId), eq(gamePlayerPets.agentId, agent.id)));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });

      const totalAllocate = input.constitution + input.strength + input.defense + input.agility + input.magic;
      if (totalAllocate <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "請至少分配 1 點 BP" });
      if (totalAllocate > (pet.bpUnallocated ?? 0)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `未分配 BP 不足，可用 ${pet.bpUnallocated ?? 0} 點，嘗試分配 ${totalAllocate} 點` });
      }

      // 記錄變動前的 BP
      const oldBp = {
        constitution: pet.bpConstitution,
        strength: pet.bpStrength,
        defense: pet.bpDefense,
        agility: pet.bpAgility,
        magic: pet.bpMagic,
      };

      const newBp = {
        constitution: pet.bpConstitution + input.constitution,
        strength: pet.bpStrength + input.strength,
        defense: pet.bpDefense + input.defense,
        agility: pet.bpAgility + input.agility,
        magic: pet.bpMagic + input.magic,
      };

      // 重新計算戰鬥數值
      const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, pet.petCatalogId));
      const stats = calcPetStats(newBp, pet.level, catalog?.raceHpMultiplier ?? 1.0);

      await db.update(gamePlayerPets).set({
        bpConstitution: newBp.constitution,
        bpStrength: newBp.strength,
        bpDefense: newBp.defense,
        bpAgility: newBp.agility,
        bpMagic: newBp.magic,
        bpUnallocated: (pet.bpUnallocated ?? 0) - totalAllocate,
        hp: stats.hp,
        maxHp: stats.hp,
        mp: stats.mp,
        maxMp: stats.mp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        magicAttack: stats.magicAttack,
        updatedAt: Date.now(),
      }).where(eq(gamePlayerPets.id, pet.id));

      // 記錄 BP 歷史
      await db.insert(gamePetBpHistory).values({
        petId: pet.id,
        source: "manual",
        description: `手動分配 ${totalAllocate} 點 BP`,
        prevConstitution: oldBp.constitution,
        prevStrength: oldBp.strength,
        prevDefense: oldBp.defense,
        prevAgility: oldBp.agility,
        prevMagic: oldBp.magic,
        newConstitution: newBp.constitution,
        newStrength: newBp.strength,
        newDefense: newBp.defense,
        newAgility: newBp.agility,
        newMagic: newBp.magic,
        deltaConstitution: input.constitution,
        deltaStrength: input.strength,
        deltaDefense: input.defense,
        deltaAgility: input.agility,
        deltaMagic: input.magic,
        createdAt: Date.now(),
      });

      return {
        success: true,
        newBp,
        bpUnallocated: (pet.bpUnallocated ?? 0) - totalAllocate,
        stats,
        totalBp: newBp.constitution + newBp.strength + newBp.defense + newBp.agility + newBp.magic,
      };
    }),

  // ═══ 管理員專用：BP 過度膨脹修正（一次性遷移） ═══
  adminFixInflatedBP: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allPets = await db.select().from(gamePlayerPets);
      const results: Array<{ id: number; nickname: string | null; level: number; tier: string; oldTotal: number; newTotal: number; changed: boolean }> = [];

      for (const pet of allPets) {
        const oldBp = {
          constitution: pet.bpConstitution,
          strength: pet.bpStrength,
          defense: pet.bpDefense,
          agility: pet.bpAgility,
          magic: pet.bpMagic,
        };
        const oldTotal = oldBp.constitution + oldBp.strength + oldBp.defense + oldBp.agility + oldBp.magic;
        const newBp = recalcReasonableBP(oldBp, pet.level, pet.tier);
        const newTotal = newBp.constitution + newBp.strength + newBp.defense + newBp.agility + newBp.magic;
        const changed = newTotal < oldTotal;

        if (changed && !input.dryRun) {
          // 重新計算戰鬥數值
          const [catalog] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, pet.petCatalogId));
          const stats = calcPetStats(newBp, pet.level, catalog?.raceHpMultiplier ?? 1.0);

          await db.update(gamePlayerPets).set({
            bpConstitution: newBp.constitution,
            bpStrength: newBp.strength,
            bpDefense: newBp.defense,
            bpAgility: newBp.agility,
            bpMagic: newBp.magic,
            bpUnallocated: 0, // 重置未分配點數
            hp: stats.hp,
            maxHp: stats.hp,
            mp: stats.mp,
            maxMp: stats.mp,
            attack: stats.attack,
            defense: stats.defense,
            speed: stats.speed,
            magicAttack: stats.magicAttack,
            updatedAt: Date.now(),
          }).where(eq(gamePlayerPets.id, pet.id));

          // 記錄 BP 歷史
          await db.insert(gamePetBpHistory).values({
            petId: pet.id,
            source: "system_migration",
            description: `系統修正 BP 膨脹：${oldTotal} → ${newTotal}`,
            prevConstitution: oldBp.constitution,
            prevStrength: oldBp.strength,
            prevDefense: oldBp.defense,
            prevAgility: oldBp.agility,
            prevMagic: oldBp.magic,
            newConstitution: newBp.constitution,
            newStrength: newBp.strength,
            newDefense: newBp.defense,
            newAgility: newBp.agility,
            newMagic: newBp.magic,
            deltaConstitution: newBp.constitution - oldBp.constitution,
            deltaStrength: newBp.strength - oldBp.strength,
            deltaDefense: newBp.defense - oldBp.defense,
            deltaAgility: newBp.agility - oldBp.agility,
            deltaMagic: newBp.magic - oldBp.magic,
            createdAt: Date.now(),
          });
        }

        results.push({ id: pet.id, nickname: pet.nickname, level: pet.level, tier: pet.tier, oldTotal, newTotal, changed });
      }

      return {
        dryRun: input.dryRun,
        totalPets: allPets.length,
        affectedPets: results.filter(r => r.changed).length,
        results,
      };
    }),
});
