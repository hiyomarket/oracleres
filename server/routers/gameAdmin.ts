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
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
});
