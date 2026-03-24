/**
 * Game CMS 後台管理 Router
 * 提供怪物、技能、地圖節點、採集物、隨機任務、流浪商人商品池、成就的 CRUD
 * 所有 procedures 均為 adminProcedure（需 role = admin）
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gameMonsters,
  gameSkills,
  gameMapNodes,
  gameGatherables,
  gameRandomQuests,
  gameMerchantPool,
  gameAchievements,
  userAchievements,
  gameItems,
  gameInventoryItems,
  gameVirtualShop,
  gameSpiritShop,
  gameHiddenShopPool,
  gameMonsterCatalog,
  gameItemCatalog,
  gameEquipmentCatalog,
  gameSkillCatalog,
  gameConfig,
  adminGameControl,
  gameAgents,
  users,
  equipmentTemplates,
  gameBroadcast,
  worldEvents,
  gameRogueEvents,
} from "../../drizzle/schema";
import { sql, like, or, eq, desc, lt, and, gte, asc } from "drizzle-orm";
import {
  getEngineConfig,
  updateEngineConfig,
  resetEngineConfig,
} from "../gameEngineConfig";
import { restartTickEngine } from "../tickEngine";
import {
  processWorldTick,
  getWorldEventConfig,
  updateWorldEventConfig,
  getWorldState,
  isWorldTickRunning,
  startWorldTickEngine,
  stopWorldTickEngine,
} from "../worldTickEngine";
import { resetWorld, triggerHiddenShop, cleanExpiredHiddenShops } from "../worldResetEngine";

// Admin guard middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ─── Monsters ────────────────────────────────────────────────────
const monsterSchema = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  baseHp: z.number().int().positive(),
  baseAttack: z.number().int().positive(),
  baseDefense: z.number().int().nonnegative(),
  baseSpeed: z.number().int().nonnegative(),
  imageUrl: z.string().default(""),
  catchRate: z.number().min(0).max(1).default(0.1),
  isActive: z.number().int().min(0).max(1).default(1),
});

// ─── Skills ──────────────────────────────────────────────────────
const skillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  mpCost: z.number().int().nonnegative(),
  damageMultiplier: z.number().positive(),
  skillType: z.enum(["attack", "heal", "buff", "debuff"]),
});

// ─── Map Nodes ───────────────────────────────────────────────────
const mapNodeSchema = z.object({
  name: z.string().min(1).max(100),
  lat: z.number(),
  lng: z.number(),
  nodeType: z.enum(["forest", "water", "market", "temple", "mountain"]),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  isActive: z.number().int().min(0).max(1).default(1),
});

// ─── Gatherables ─────────────────────────────────────────────────
const gatherableSchema = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  rarity: z.enum(["common", "rare", "epic"]),
  spawnRate: z.number().min(0).max(1).default(0.5),
  imageUrl: z.string().optional(),
});

// ─── Random Quests ───────────────────────────────────────────────
const randomQuestSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  requiredWuxing: z.enum(["木", "火", "土", "金", "水"]).optional(),
  rewardType: z.enum(["stones", "aura", "item"]),
  rewardAmount: z.number().int().positive(),
  isActive: z.number().int().min(0).max(1).default(1),
});

// ─── Merchant Pool ───────────────────────────────────────────────
const merchantPoolSchema = z.object({
  itemId: z.number().int().positive(),
  priceStones: z.number().int().positive(),
  appearanceRate: z.number().min(0).max(1).default(0.1),
  isActive: z.number().int().min(0).max(1).default(1),
});

// ─── Achievements ────────────────────────────────────────────────
const achievementSchema = z.object({
  category: z.enum(["avatar", "explore", "combat", "oracle"]),
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  conditionType: z.string().min(1).max(50),
  conditionValue: z.number().int().positive(),
  rewardType: z.enum(["stones", "coins", "title", "item", "frame"]),
  rewardAmount: z.number().int().nonnegative(),
  iconUrl: z.string().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

export const gameAdminRouter = router({
  // ─── Monsters CRUD ─────────────────────────────────────────────
  getMonsters: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameMonsters).orderBy(gameMonsters.id);
  }),

  createMonster: adminProcedure.input(monsterSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameMonsters).values(input);
    return { id: (result as any).insertId };
  }),

  updateMonster: adminProcedure
    .input(z.object({ id: z.number().int(), data: monsterSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMonsters).set(input.data).where(eq(gameMonsters.id, input.id));
      return { success: true };
    }),

  deleteMonster: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameMonsters).where(eq(gameMonsters.id, input.id));
    return { success: true };
  }),

  // ─── Skills CRUD ───────────────────────────────────────────────
  getSkills: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameSkills).orderBy(gameSkills.id);
  }),

  createSkill: adminProcedure.input(skillSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameSkills).values(input);
    return { id: (result as any).insertId };
  }),

  updateSkill: adminProcedure
    .input(z.object({ id: z.number().int(), data: skillSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameSkills).set(input.data).where(eq(gameSkills.id, input.id));
      return { success: true };
    }),

  deleteSkill: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameSkills).where(eq(gameSkills.id, input.id));
    return { success: true };
  }),

  // ─── Map Nodes CRUD ────────────────────────────────────────────
  getMapNodes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameMapNodes).orderBy(gameMapNodes.id);
  }),

  createMapNode: adminProcedure.input(mapNodeSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameMapNodes).values(input);
    return { id: (result as any).insertId };
  }),

  updateMapNode: adminProcedure
    .input(z.object({ id: z.number().int(), data: mapNodeSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMapNodes).set(input.data).where(eq(gameMapNodes.id, input.id));
      return { success: true };
    }),

  deleteMapNode: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameMapNodes).where(eq(gameMapNodes.id, input.id));
    return { success: true };
  }),

  // ─── Gatherables CRUD ──────────────────────────────────────────
  getGatherables: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameGatherables).orderBy(gameGatherables.id);
  }),

  createGatherable: adminProcedure.input(gatherableSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameGatherables).values(input);
    return { id: (result as any).insertId };
  }),

  updateGatherable: adminProcedure
    .input(z.object({ id: z.number().int(), data: gatherableSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameGatherables).set(input.data).where(eq(gameGatherables.id, input.id));
      return { success: true };
    }),

  deleteGatherable: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameGatherables).where(eq(gameGatherables.id, input.id));
    return { success: true };
  }),

  // ─── Random Quests CRUD ────────────────────────────────────────
  getRandomQuests: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameRandomQuests).orderBy(gameRandomQuests.id);
  }),

  createRandomQuest: adminProcedure.input(randomQuestSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameRandomQuests).values(input);
    return { id: (result as any).insertId };
  }),

  updateRandomQuest: adminProcedure
    .input(z.object({ id: z.number().int(), data: randomQuestSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameRandomQuests).set(input.data).where(eq(gameRandomQuests.id, input.id));
      return { success: true };
    }),

  deleteRandomQuest: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameRandomQuests).where(eq(gameRandomQuests.id, input.id));
    return { success: true };
  }),

  // ─── Merchant Pool CRUD ────────────────────────────────────────
  getMerchantPool: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameMerchantPool).orderBy(gameMerchantPool.id);
  }),

  createMerchantItem: adminProcedure.input(merchantPoolSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameMerchantPool).values(input);
    return { id: (result as any).insertId };
  }),

  updateMerchantItem: adminProcedure
    .input(z.object({ id: z.number().int(), data: merchantPoolSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMerchantPool).set(input.data).where(eq(gameMerchantPool.id, input.id));
      return { success: true };
    }),

  deleteMerchantItem: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameMerchantPool).where(eq(gameMerchantPool.id, input.id));
    return { success: true };
  }),

  // ─── Achievements CRUD ─────────────────────────────────────────
  getAchievements: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameAchievements).orderBy(gameAchievements.id);
  }),

  createAchievement: adminProcedure.input(achievementSchema).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [result] = await db.insert(gameAchievements).values(input);
    return { id: (result as any).insertId };
  }),

  updateAchievement: adminProcedure
    .input(z.object({ id: z.number().int(), data: achievementSchema.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameAchievements).set(input.data).where(eq(gameAchievements.id, input.id));
      return { success: true };
    }),

  deleteAchievement: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameAchievements).where(eq(gameAchievements.id, input.id));
    return { success: true };
  }),

  // ─── Game Items (商城商品管理) ──────────────────────────────────
  getGameItems: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameItems).orderBy(gameItems.id);
  }),

  updateGameItem: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: z.object({
          name: z.string().optional(),
          price: z.number().int().optional(),
          isOnSale: z.number().int().min(0).max(1).optional(),
          imageUrl: z.string().optional(),
          rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameItems).set(input.data).where(eq(gameItems.id, input.id));
      return { success: true };
    }),

  // ─── User Achievements（查詢用） ────────────────────────────────
  getUserAchievements: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, input.userId));
    }),

  // ─── Game Inventory Items（遊戲道具管理） ──────────────────────
  getInventoryItems: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameInventoryItems).orderBy(gameInventoryItems.id);
  }),
  createInventoryItem: adminProcedure
    .input(z.object({
      itemKey: z.string().min(1).max(100),
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      itemType: z.enum(["consumable", "equipment", "weapon", "material", "special"]).default("consumable"),
      subType: z.string().optional().default(""),
      wuxing: z.string().optional().default(""),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
      emoji: z.string().default("📦"),
      statBonus: z.record(z.string(), z.number()).optional(),
      useEffect: z.record(z.string(), z.any()).optional(),
      equipSlot: z.string().optional().default(""),
      maxStack: z.number().int().default(99),
      isTradable: z.number().int().min(0).max(1).default(1),
      isActive: z.number().int().min(0).max(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(gameInventoryItems).values({ ...input, createdAt: now, updatedAt: now });
      return { id: (result as any).insertId };
    }),
  updateInventoryItem: adminProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        itemType: z.enum(["consumable", "equipment", "weapon", "material", "special"]).optional(),
        subType: z.string().optional(),
        wuxing: z.string().optional(),
        rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
        emoji: z.string().optional(),
        statBonus: z.record(z.string(), z.number()).optional(),
        useEffect: z.record(z.string(), z.any()).optional(),
        equipSlot: z.string().optional(),
        maxStack: z.number().int().optional(),
        isTradable: z.number().int().optional(),
        isActive: z.number().int().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameInventoryItems).set({ ...input.data, updatedAt: Date.now() }).where(eq(gameInventoryItems.id, input.id));
      return { success: true };
    }),
  deleteInventoryItem: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameInventoryItems).where(eq(gameInventoryItems.id, input.id));
    return { success: true };
  }),

  // ─── Virtual Shop（虛界商店管理） ──────────────────────────────
  getVirtualShop: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameVirtualShop).orderBy(gameVirtualShop.sortOrder);
  }),
  createVirtualShopItem: adminProcedure
    .input(z.object({
      itemKey: z.string().min(1),
      displayName: z.string().min(1),
      description: z.string().optional(),
      priceCoins: z.number().int().nonnegative().default(0),
      quantity: z.number().int().positive().default(1),
      stock: z.number().int().default(-1),
      nodeId: z.string().optional().default(""),
      sortOrder: z.number().int().default(0),
      isOnSale: z.number().int().min(0).max(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(gameVirtualShop).values({ ...input, createdAt: Date.now() });
      return { id: (result as any).insertId };
    }),
  updateVirtualShopItem: adminProcedure
    .input(z.object({ id: z.number().int(), data: z.object({
      displayName: z.string().optional(),
      description: z.string().optional(),
      priceCoins: z.number().int().optional(),
      quantity: z.number().int().optional(),
      stock: z.number().int().optional(),
      nodeId: z.string().optional(),
      sortOrder: z.number().int().optional(),
      isOnSale: z.number().int().optional(),
    }) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameVirtualShop).set(input.data).where(eq(gameVirtualShop.id, input.id));
      return { success: true };
    }),
  deleteVirtualShopItem: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameVirtualShop).where(eq(gameVirtualShop.id, input.id));
    return { success: true };
  }),

  // ─── Spirit Shop（靈相商店管理） ───────────────────────────────
  getSpiritShop: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameSpiritShop).orderBy(gameSpiritShop.sortOrder);
  }),
  createSpiritShopItem: adminProcedure
    .input(z.object({
      itemKey: z.string().min(1),
      displayName: z.string().min(1),
      description: z.string().optional(),
      priceStones: z.number().int().nonnegative().default(0),
      quantity: z.number().int().positive().default(1),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).default("rare"),
      sortOrder: z.number().int().default(0),
      isOnSale: z.number().int().min(0).max(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(gameSpiritShop).values({ ...input, createdAt: Date.now() });
      return { id: (result as any).insertId };
    }),
  updateSpiritShopItem: adminProcedure
    .input(z.object({ id: z.number().int(), data: z.object({
      displayName: z.string().optional(),
      description: z.string().optional(),
      priceStones: z.number().int().optional(),
      quantity: z.number().int().optional(),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
      sortOrder: z.number().int().optional(),
      isOnSale: z.number().int().optional(),
    }) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameSpiritShop).set(input.data).where(eq(gameSpiritShop.id, input.id));
      return { success: true };
    }),
  deleteSpiritShopItem: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameSpiritShop).where(eq(gameSpiritShop.id, input.id));
    return { success: true };
  }),

  // ─── Hidden Shop Pool（密店商品池管理） ────────────────────────
  getHiddenShopPool: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameHiddenShopPool).orderBy(gameHiddenShopPool.id);
  }),
  createHiddenShopItem: adminProcedure
    .input(z.object({
      itemKey: z.string().min(1),
      displayName: z.string().min(1),
      description: z.string().optional(),
      currencyType: z.enum(["coins", "stones"]).default("coins"),
      price: z.number().int().nonnegative().default(0),
      quantity: z.number().int().positive().default(1),
      weight: z.number().int().positive().default(10),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).default("rare"),
      isActive: z.number().int().min(0).max(1).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(gameHiddenShopPool).values({ ...input, createdAt: Date.now() });
      return { id: (result as any).insertId };
    }),
  updateHiddenShopItem: adminProcedure
    .input(z.object({ id: z.number().int(), data: z.object({
      displayName: z.string().optional(),
      description: z.string().optional(),
      currencyType: z.enum(["coins", "stones"]).optional(),
      price: z.number().int().optional(),
      quantity: z.number().int().optional(),
      weight: z.number().int().optional(),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
      isActive: z.number().int().optional(),
    }) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameHiddenShopPool).set(input.data).where(eq(gameHiddenShopPool.id, input.id));
      return { success: true };
    }),
  deleteHiddenShopItem: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db.delete(gameHiddenShopPool).where(eq(gameHiddenShopPool.id, input.id));
    return { success: true };
  }),

  // ─── 圖鑑管理（GD-011~016 資料庫）────────────────────────────
  getMonsterCatalog: adminProcedure
    .input(z.object({ wuxing: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(gameMonsterCatalog).orderBy(gameMonsterCatalog.monsterId);
      let result = rows;
      if (input.wuxing) result = result.filter(r => r.wuxing === input.wuxing);
      if (input.search) result = result.filter(r => r.name.includes(input.search!));
      return result;
    }),

  getItemCatalog: adminProcedure
    .input(z.object({ wuxing: z.string().optional(), category: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(gameItemCatalog).orderBy(gameItemCatalog.itemId);
      let result = rows;
      if (input.wuxing) result = result.filter(r => r.wuxing === input.wuxing);
      if (input.category) result = result.filter(r => r.category === input.category);
      if (input.search) result = result.filter(r => r.name.includes(input.search!));
      return result;
    }),

  getEquipmentCatalog: adminProcedure
    .input(z.object({ wuxing: z.string().optional(), slot: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(gameEquipmentCatalog).orderBy(gameEquipmentCatalog.equipId);
      let result = rows;
      if (input.wuxing) result = result.filter(r => r.wuxing === input.wuxing);
      if (input.slot) result = result.filter(r => r.slot === input.slot);
      if (input.search) result = result.filter(r => r.name.includes(input.search!));
      return result;
    }),

  getSkillCatalog: adminProcedure
    .input(z.object({ wuxing: z.string().optional(), category: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(gameSkillCatalog).orderBy(gameSkillCatalog.skillId);
      let result = rows;
      if (input.wuxing) result = result.filter(r => r.wuxing === input.wuxing);
      if (input.category) result = result.filter(r => r.category === input.category);
      if (input.search) result = result.filter(r => r.name.includes(input.search!));
      return result;
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // 遊戲劇院（Game Theater）— 角色帳號管理
  // ─────────────────────────────────────────────────────────────────────────

  /** 搜尋角色（by 名稱或 userId） */
  searchAgents: adminProcedure
    .input(z.object({ keyword: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select({
        id: gameAgents.id,
        userId: gameAgents.userId,
        agentName: gameAgents.agentName,
        level: gameAgents.level,
        exp: gameAgents.exp,
        dominantElement: gameAgents.dominantElement,
        hp: gameAgents.hp,
        maxHp: gameAgents.maxHp,
        mp: gameAgents.mp,
        maxMp: gameAgents.maxMp,
        stamina: gameAgents.stamina,
        maxStamina: gameAgents.maxStamina,
        actionPoints: gameAgents.actionPoints,
        maxActionPoints: gameAgents.maxActionPoints,
        gold: gameAgents.gold,
        wuxingWood: gameAgents.wuxingWood,
        wuxingFire: gameAgents.wuxingFire,
        wuxingEarth: gameAgents.wuxingEarth,
        wuxingMetal: gameAgents.wuxingMetal,
        wuxingWater: gameAgents.wuxingWater,
        currentNodeId: gameAgents.currentNodeId,
        isActive: gameAgents.isActive,
        createdAt: gameAgents.createdAt,
      }).from(gameAgents)
        .where(
          or(
            like(gameAgents.agentName, `%${input.keyword}%`),
            like(gameAgents.userId, `%${input.keyword}%`)
          )
        )
        .limit(20);

      // 查詢對應 users 表的 pointsBalance、gameCoins、gameStones
      const results = await Promise.all(agents.map(async (agent) => {
        const userRows = await db.select({
          pointsBalance: users.pointsBalance,
          gameCoins: users.gameCoins,
          gameStones: users.gameStones,
        }).from(users).where(eq(users.openId, agent.userId)).limit(1);
        const control = await db.select().from(adminGameControl).where(eq(adminGameControl.agentId, agent.id)).limit(1);
        return {
          ...agent,
          pointsBalance: userRows[0]?.pointsBalance ?? 0,
          gameCoins: userRows[0]?.gameCoins ?? 0,
          gameStones: userRows[0]?.gameStones ?? 0,
          control: control[0] ?? null,
        };
      }));
      return results;
    }),

  /** 調整角色數值（遊戲幣/靈石/積分/體力/AP/HP/MP/等級/五行） */
  adjustAgentValues: adminProcedure
    .input(z.object({
      agentId: z.number().int(),
      userId: z.string(),
      // 可選調整項目
      gold: z.number().int().optional(),
      hp: z.number().int().min(0).max(9999).optional(),
      mp: z.number().int().min(0).max(9999).optional(),
      stamina: z.number().int().min(0).max(255).optional(),
      actionPoints: z.number().int().min(0).max(10).optional(),
      level: z.number().int().min(1).max(999).optional(),
      exp: z.number().int().min(0).optional(),
      wuxingWood: z.number().int().min(0).max(255).optional(),
      wuxingFire: z.number().int().min(0).max(255).optional(),
      wuxingEarth: z.number().int().min(0).max(255).optional(),
      wuxingMetal: z.number().int().min(0).max(255).optional(),
      wuxingWater: z.number().int().min(0).max(255).optional(),
      currentNodeId: z.string().optional(),
      // users 表的點數
      pointsBalance: z.number().int().optional(),
      gameCoins: z.number().int().optional(),
      gameStones: z.number().int().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const agentUpdate: Record<string, number | string> = {};
      if (input.gold !== undefined) agentUpdate.gold = input.gold;
      if (input.hp !== undefined) agentUpdate.hp = input.hp;
      if (input.mp !== undefined) agentUpdate.mp = input.mp;
      if (input.stamina !== undefined) agentUpdate.stamina = input.stamina;
      if (input.actionPoints !== undefined) agentUpdate.actionPoints = input.actionPoints;
      if (input.level !== undefined) agentUpdate.level = input.level;
      if (input.exp !== undefined) agentUpdate.exp = input.exp;
      if (input.wuxingWood !== undefined) agentUpdate.wuxingWood = input.wuxingWood;
      if (input.wuxingFire !== undefined) agentUpdate.wuxingFire = input.wuxingFire;
      if (input.wuxingEarth !== undefined) agentUpdate.wuxingEarth = input.wuxingEarth;
      if (input.wuxingMetal !== undefined) agentUpdate.wuxingMetal = input.wuxingMetal;
      if (input.wuxingWater !== undefined) agentUpdate.wuxingWater = input.wuxingWater;
      if (input.currentNodeId !== undefined) agentUpdate.currentNodeId = input.currentNodeId;

      if (Object.keys(agentUpdate).length > 0) {
        await db.update(gameAgents).set({ ...agentUpdate, updatedAt: Date.now() }).where(eq(gameAgents.id, input.agentId));
      }

      const userUpdate: Record<string, number> = {};
      if (input.pointsBalance !== undefined) userUpdate.pointsBalance = input.pointsBalance;
      if (input.gameCoins !== undefined) userUpdate.gameCoins = input.gameCoins;
      if (input.gameStones !== undefined) userUpdate.gameStones = input.gameStones;
      if (Object.keys(userUpdate).length > 0) {
        await db.update(users).set(userUpdate).where(eq(users.openId, input.userId));
      }

      return { success: true };
    }),

  /** 設定角色永久滿值開關 */
  setAgentControl: adminProcedure
    .input(z.object({
      agentId: z.number().int(),
      infiniteStamina: z.boolean().optional(),
      infiniteAP: z.boolean().optional(),
      infiniteHP: z.boolean().optional(),
      infiniteMP: z.boolean().optional(),
      infiniteGold: z.boolean().optional(),
      isBanned: z.boolean().optional(),
      banReason: z.string().optional(),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = Date.now();
      const existing = await db.select().from(adminGameControl).where(eq(adminGameControl.agentId, input.agentId)).limit(1);

      const controlData = {
        infiniteStamina: input.infiniteStamina !== undefined ? (input.infiniteStamina ? 1 : 0) : undefined,
        infiniteAP: input.infiniteAP !== undefined ? (input.infiniteAP ? 1 : 0) : undefined,
        infiniteHP: input.infiniteHP !== undefined ? (input.infiniteHP ? 1 : 0) : undefined,
        infiniteMP: input.infiniteMP !== undefined ? (input.infiniteMP ? 1 : 0) : undefined,
        infiniteGold: input.infiniteGold !== undefined ? (input.infiniteGold ? 1 : 0) : undefined,
        isBanned: input.isBanned !== undefined ? (input.isBanned ? 1 : 0) : undefined,
        banReason: input.banReason,
        adminNote: input.adminNote,
          lastModifiedBy: String(ctx.user.id),
        updatedAt: now,
      };

      // 過濾掉 undefined
      const cleanData = Object.fromEntries(Object.entries(controlData).filter(([, v]) => v !== undefined));

      if (existing.length > 0) {
        await db.update(adminGameControl).set(cleanData).where(eq(adminGameControl.agentId, input.agentId));
      } else {
        await db.insert(adminGameControl).values({
          agentId: input.agentId,
          infiniteStamina: (input.infiniteStamina ? 1 : 0),
          infiniteAP: (input.infiniteAP ? 1 : 0),
          infiniteHP: (input.infiniteHP ? 1 : 0),
          infiniteMP: (input.infiniteMP ? 1 : 0),
          infiniteGold: (input.infiniteGold ? 1 : 0),
          isBanned: (input.isBanned ? 1 : 0),
          banReason: input.banReason ?? null,
          adminNote: input.adminNote ?? null,
          lastModifiedBy: String(ctx.user.id),
          updatedAt: now,
          createdAt: now,
        });
      }
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // 遊戲劇院（Game Theater）— 全域參數管理
  // ─────────────────────────────────────────────────────────────────────────

  /** 取得所有全域遊戲參數 */
  getGameConfigs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameConfig).orderBy(gameConfig.category, gameConfig.configKey);
  }),

  /** 更新單一全域遊戲參數 */
  updateGameConfig: adminProcedure
    .input(z.object({
      configKey: z.string(),
      configValue: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameConfig)
        .set({ configValue: input.configValue, updatedBy: String(ctx.user.id), updatedAt: Date.now() })
        .where(eq(gameConfig.configKey, input.configKey));
      return { success: true };
    }),

  /** 批量更新全域遊戲參數 */
  batchUpdateGameConfigs: adminProcedure
    .input(z.array(z.object({
      configKey: z.string(),
      configValue: z.string(),
    })))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await Promise.all(input.map(item =>
        db.update(gameConfig)
          .set({ configValue: item.configValue, updatedBy: String(ctx.user.id), updatedAt: Date.now() })
          .where(eq(gameConfig.configKey, item.configKey))
      ));
      return { success: true, updated: input.length };
    }),

  // ─────────────────────────────────────────────────────────────────────────
  // 裝備模板管理（GD-021 後續建議）
  // ─────────────────────────────────────────────────────────────────────────

  /** 取得所有裝備模板 */
  getEquipmentTemplates: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(equipmentTemplates).orderBy(equipmentTemplates.element, equipmentTemplates.tier);
  }),

  /** 新增裝備模板 */
  createEquipmentTemplate: adminProcedure
    .input(z.object({
      id: z.string().min(1).max(20),
      name: z.string().min(1).max(50),
      element: z.enum(["wood", "fire", "earth", "metal", "water"]),
      slot: z.enum(["weapon", "helmet", "armor", "boots", "accessory"]),
      tier: z.enum(["basic", "mid", "high", "legendary"]),
      levelReq: z.number().int().default(1),
      hpBonus: z.number().int().default(0),
      atkBonus: z.number().int().default(0),
      defBonus: z.number().int().default(0),
      spdBonus: z.number().int().default(0),
      matkBonus: z.number().int().default(0),
      mpBonus: z.number().int().default(0),
      setId: z.string().optional(),
      shopPrice: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(equipmentTemplates).values({
        ...input,
        setId: input.setId ?? null,
        shopPrice: input.shopPrice ?? null,
        isActive: 1,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  /** 更新裝備模板 */
  updateEquipmentTemplate: adminProcedure
    .input(z.object({
      id: z.string().min(1).max(20),
      name: z.string().optional(),
      hpBonus: z.number().int().optional(),
      atkBonus: z.number().int().optional(),
      defBonus: z.number().int().optional(),
      spdBonus: z.number().int().optional(),
      matkBonus: z.number().int().optional(),
      mpBonus: z.number().int().optional(),
      isActive: z.number().int().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...rest } = input;
      const cleanData = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
      await db.update(equipmentTemplates).set(cleanData).where(eq(equipmentTemplates.id, id));
      return { success: true };
    }),

  // ─────────────────────────────────────────────────────────────────────────────
  // 引擎彈性調控（記憶體即時生效）
  // ─────────────────────────────────────────────────────────────────────────────

  /** 取得目前引擎配置 */
  getEngineConfig: adminProcedure.query(() => {
    return getEngineConfig();
  }),

  /** 更新引擎配置（部分更新，立即生效） */
  updateEngineConfig: adminProcedure
    .input(z.object({
      tickIntervalMs: z.number().int().min(5000).max(30 * 60 * 1000).optional(),
      expMultiplier: z.number().min(0.1).max(10).optional(),
      goldMultiplier: z.number().min(0.1).max(10).optional(),
      dropMultiplier: z.number().min(0.1).max(10).optional(),
      combatChance: z.number().min(0).max(0.95).optional(),
      gatherChance: z.number().min(0).max(0.95).optional(),
      rogueChance: z.number().min(0).max(0.5).optional(),
      gameEnabled: z.boolean().optional(),
      maintenanceMsg: z.string().max(200).optional(),
      // 注靈配置
      infuseMinGain: z.number().min(0.01).max(5).optional(),
      infuseMaxGain: z.number().min(0.01).max(10).optional(),
      infuseFailRate: z.number().min(0).max(0.99).optional(),
      infuseMaxWuxing: z.number().min(10).max(9999).optional(),
    }))
    .mutation(({ input, ctx }) => {
      const { tickIntervalMs, ...rest } = input;
      const updated = updateEngineConfig({ ...rest, ...(tickIntervalMs ? { tickIntervalMs } : {}) }, String(ctx.user.id));
      // 如果調整了 Tick 間隔，重啟引擎
      if (tickIntervalMs !== undefined) {
        restartTickEngine();
      }
      return updated;
    }),

  /** 重置引擎配置為預設値 */
  resetEngineConfig: adminProcedure.mutation(({ ctx }) => {
    const reset = resetEngineConfig(String(ctx.user.id));
    restartTickEngine();
    return reset;
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // 全服廣播系統
  // ─────────────────────────────────────────────────────────────────────────────

  /** 發送全服廣播訊息 */
  broadcastMessage: adminProcedure
    .input(z.object({
      content: z.string().min(1).max(500),
      msgType: z.enum(["info", "warning", "event", "maintenance"]).default("info"),
      /** 顯示持續秒數（null = 永久） */
      durationSeconds: z.number().int().min(10).max(3600).nullable().default(300),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const expiresAt = input.durationSeconds ? Date.now() + input.durationSeconds * 1000 : null;
      await db.insert(gameBroadcast).values({
        content: input.content,
        msgType: input.msgType,
        sentBy: String(ctx.user.id),
        isActive: 1,
        expiresAt: expiresAt ?? undefined,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  /** 取得廣播歷史（最新 20 筆） */
  getBroadcastHistory: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameBroadcast).orderBy(desc(gameBroadcast.createdAt)).limit(20);
  }),

  /** 關閉廣播訊息 */
  closeBroadcast: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameBroadcast).set({ isActive: 0 }).where(eq(gameBroadcast.id, input.id));
      return { success: true };
    }),

  // ─── 世界事件管理 API ───

  /** 取得世界事件歷史 */
  getWorldEvents: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const events = await db.select().from(worldEvents)
        .orderBy(desc(worldEvents.createdAt))
        .limit(input.limit);
      return events;
    }),

  /** 取得世界事件配置（機率設定） */
  getWorldEventConfig: adminProcedure
    .query(() => {
      return getWorldEventConfig();
    }),

  /** 更新世界事件配置 */
  updateWorldEventConfig: adminProcedure
    .input(z.object({
      weatherChange:  z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      globalBlessing: z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      hiddenNpc:      z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      hiddenQuest:    z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      elementalSurge: z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      meteorShower:   z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
      divineArrival:  z.object({ enabled: z.boolean(), probability: z.number().min(0).max(100) }).optional(),
    }))
    .mutation(({ input }) => {
      updateWorldEventConfig(input);
      return { success: true, config: getWorldEventConfig() };
    }),

  /** 手動觸發世界 Tick */
  triggerWorldTick: adminProcedure
    .mutation(async ({ ctx }) => {
      const result = await processWorldTick(String(ctx.user.id));
      return result;
    }),

  /** 取得世界狀態（當前天氣/祝福/隱藏節點等） */
  getWorldState: adminProcedure
    .query(() => {
      return getWorldState();
    }),

  /** 世界 Tick 引擎狀態和控制 */
  getWorldTickStatus: adminProcedure
    .query(() => {
      return {
        isRunning: isWorldTickRunning(),
        worldState: getWorldState(),
        config: getWorldEventConfig(),
      };
    }),

  /** 啟動/停止世界 Tick 引擎 */
  toggleWorldTickEngine: adminProcedure
    .input(z.object({ running: z.boolean() }))
    .mutation(({ input }) => {
      if (input.running) {
        startWorldTickEngine();
      } else {
        stopWorldTickEngine();
      }
      return { success: true, isRunning: isWorldTickRunning() };
    }),

  // ─── 世界重置 ────────────────────────────────────────────────
  /** 格式化世界並重新啟動新世界（清除所有角色資料、重置商店） */
  resetWorld: adminProcedure
    .input(z.object({ confirmText: z.string() }))
    .mutation(async ({ input }) => {
      if (input.confirmText !== "確認重置世界") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "請輸入正確的確認文字" });
      }
      const result = await resetWorld();
      return result;
    }),

  /** 手動觸發隱藏商店（在指定節點生成密店） */
  triggerHiddenShop: adminProcedure
    .input(z.object({
      nodeId: z.string(),
      reason: z.enum(["world_tick", "node_explore", "meteor_shower"]).default("world_tick"),
    }))
    .mutation(async ({ input }) => {
      const success = await triggerHiddenShop(input.nodeId, input.reason);
      return { success };
    }),

   /** 清除過期的隱藏商店實例 */
  cleanExpiredHiddenShops: adminProcedure
    .mutation(async () => {
      const count = await cleanExpiredHiddenShops();
      return { cleaned: count };
    }),

  // ─── 奇遇事件 CRUD ──────────────────────────────────────────────────
  /** 取得所有奇遇事件（包含停用的） */
  getRogueEvents: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameRogueEvents).orderBy(gameRogueEvents.id);
  }),

  /** 新增奇遇事件 */
  createRogueEvent: adminProcedure
    .input(z.object({
      eventId: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "只能使用小寫英文、數字和底線"),
      name: z.string().min(1).max(50),
      description: z.string().min(1),
      icon: z.string().default("\u2728"),
      rewardType: z.enum(["gold", "exp", "item", "heal", "buff", "debuff", "mixed"]).default("gold"),
      goldMin: z.number().int().nonnegative().default(0),
      goldMax: z.number().int().nonnegative().default(0),
      expReward: z.number().int().nonnegative().default(0),
      hpChange: z.number().int().default(0),
      healFull: z.number().int().min(0).max(1).default(0),
      itemRewardId: z.string().default(""),
      itemRewardQty: z.number().int().nonnegative().default(0),
      weight: z.number().int().positive().default(10),
      isActive: z.number().int().min(0).max(1).default(1),
      wuxingFilter: z.string().default(""),
      minLevel: z.number().int().nonnegative().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(gameRogueEvents).values({
        ...input,
        createdAt: now,
        updatedAt: now,
      });
      return { id: (result as any).insertId };
    }),

  /** 更新奇遇事件 */
  updateRogueEvent: adminProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        name: z.string().min(1).max(50).optional(),
        description: z.string().min(1).optional(),
        icon: z.string().optional(),
        rewardType: z.enum(["gold", "exp", "item", "heal", "buff", "debuff", "mixed"]).optional(),
        goldMin: z.number().int().nonnegative().optional(),
        goldMax: z.number().int().nonnegative().optional(),
        expReward: z.number().int().nonnegative().optional(),
        hpChange: z.number().int().optional(),
        healFull: z.number().int().min(0).max(1).optional(),
        itemRewardId: z.string().optional(),
        itemRewardQty: z.number().int().nonnegative().optional(),
        weight: z.number().int().positive().optional(),
        isActive: z.number().int().min(0).max(1).optional(),
        wuxingFilter: z.string().optional(),
        minLevel: z.number().int().nonnegative().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameRogueEvents).set({
        ...input.data,
        updatedAt: Date.now(),
      }).where(eq(gameRogueEvents.id, input.id));
      return { success: true };
    }),

  /** 刪除奇遇事件 */
  deleteRogueEvent: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameRogueEvents).where(eq(gameRogueEvents.id, input.id));
      return { success: true };
    }),

  /** 分頁列出有玩的角色（createdAt 不為 null，即已建立角色的帳號） */
  listAgentsPaginated: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      keyword: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const offset = (input.page - 1) * input.pageSize;

      // 建立搜尋條件
      const conditions = [];
      if (input.keyword && input.keyword.trim()) {
        conditions.push(
          or(
            like(gameAgents.agentName, `%${input.keyword.trim()}%`),
            like(gameAgents.userId, `%${input.keyword.trim()}%`)
          )
        );
      }
      const whereClause = conditions.length > 0 ? and(...conditions as [ReturnType<typeof eq>]) : undefined;

      // 取得總數
      const countRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(gameAgents)
        .where(whereClause);
      const total = Number(countRows[0]?.count ?? 0);
      const totalPages = Math.ceil(total / input.pageSize);

      // 取得分頁資料
      const agents = await db.select({
        id: gameAgents.id,
        userId: gameAgents.userId,
        agentName: gameAgents.agentName,
        level: gameAgents.level,
        exp: gameAgents.exp,
        dominantElement: gameAgents.dominantElement,
        hp: gameAgents.hp,
        maxHp: gameAgents.maxHp,
        mp: gameAgents.mp,
        maxMp: gameAgents.maxMp,
        stamina: gameAgents.stamina,
        maxStamina: gameAgents.maxStamina,
        actionPoints: gameAgents.actionPoints,
        maxActionPoints: gameAgents.maxActionPoints,
        gold: gameAgents.gold,
        wuxingWood: gameAgents.wuxingWood,
        wuxingFire: gameAgents.wuxingFire,
        wuxingEarth: gameAgents.wuxingEarth,
        wuxingMetal: gameAgents.wuxingMetal,
        wuxingWater: gameAgents.wuxingWater,
        currentNodeId: gameAgents.currentNodeId,
        isActive: gameAgents.isActive,
        createdAt: gameAgents.createdAt,
      })
        .from(gameAgents)
        .where(whereClause)
        .orderBy(desc(gameAgents.createdAt))
        .limit(input.pageSize)
        .offset(offset);

      // 補充 users 表的 pointsBalance、gameCoins、gameStones
      const results = await Promise.all(agents.map(async (agent) => {
        const userRows = await db.select({
          pointsBalance: users.pointsBalance,
          gameCoins: users.gameCoins,
          gameStones: users.gameStones,
        }).from(users).where(eq(users.openId, agent.userId)).limit(1);
        const control = await db.select().from(adminGameControl).where(eq(adminGameControl.agentId, agent.id)).limit(1);
        return {
          ...agent,
          pointsBalance: userRows[0]?.pointsBalance ?? 0,
          gameCoins: userRows[0]?.gameCoins ?? 0,
          gameStones: userRows[0]?.gameStones ?? 0,
          control: control[0] ?? null,
        };
      }));

      return { agents: results, total, totalPages, page: input.page, pageSize: input.pageSize };
    }),
});
