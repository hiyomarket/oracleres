/**
 * 六大圖鑑後台管理 Router（M3D 升級）
 * 魔物圖鑑 / 道具圖鑑 / 裝備圖鑑 / 技能圖鑑 / 成就系統 / 魔物技能圖鑑
 * 所有 procedures 均為 adminProcedure（需 role = admin）
 * 自動編碼：Boss 只需輸入名稱 + 選五行，系統自動生成 ID
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gameMonsterCatalog,
  gameItemCatalog,
  gameEquipmentCatalog,
  gameSkillCatalog,
  gameAchievements,
  gameMonsterSkillCatalog,
} from "../../drizzle/schema";
import { sql, like, or, eq, desc, asc, and, gte, lte } from "drizzle-orm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ===== 自動編碼工具 =====
const WUXING_CODE: Record<string, string> = {
  "木": "W", "火": "F", "土": "E", "金": "M", "水": "Wt",
};

async function generateNextId(
  db: any,
  table: any,
  idColumn: any,
  prefix: string,
  wuxing: string
): Promise<string> {
  const code = WUXING_CODE[wuxing] || "X";
  const fullPrefix = `${prefix}_${code}`;
  // 查詢該前綴下最大的編號
  const rows = await db
    .select({ id: idColumn })
    .from(table)
    .where(like(idColumn, `${fullPrefix}%`))
    .orderBy(desc(idColumn))
    .limit(1);
  
  let nextNum = 1;
  if (rows.length > 0) {
    const lastId = rows[0].id as string;
    const numPart = lastId.replace(fullPrefix, "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `${fullPrefix}${String(nextNum).padStart(3, "0")}`;
}

async function generateAchievementId(db: any): Promise<string> {
  const rows = await db
    .select({ achId: gameAchievements.achId })
    .from(gameAchievements)
    .where(like(gameAchievements.achId, "ACH_%"))
    .orderBy(desc(gameAchievements.achId))
    .limit(1);
  let nextNum = 1;
  if (rows.length > 0 && rows[0].achId) {
    const numPart = rows[0].achId.replace("ACH_", "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `ACH_${String(nextNum).padStart(3, "0")}`;
}

async function generateMonsterSkillId(db: any): Promise<string> {
  const rows = await db
    .select({ id: gameMonsterSkillCatalog.monsterSkillId })
    .from(gameMonsterSkillCatalog)
    .where(like(gameMonsterSkillCatalog.monsterSkillId, "SK_M%"))
    .orderBy(desc(gameMonsterSkillCatalog.monsterSkillId))
    .limit(1);
  let nextNum = 1;
  if (rows.length > 0) {
    const numPart = rows[0].id.replace("SK_M", "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `SK_M${String(nextNum).padStart(3, "0")}`;
}

// ===== Zod Schemas =====

const monsterCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  levelRange: z.string().default("1-5"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  baseHp: z.number().int().positive().default(100),
  baseAttack: z.number().int().positive().default(10),
  baseDefense: z.number().int().nonnegative().default(5),
  baseSpeed: z.number().int().nonnegative().default(5),
  baseAccuracy: z.number().int().nonnegative().default(80),
  baseMagicAttack: z.number().int().nonnegative().default(8),
  resistWood: z.number().int().default(0),
  resistFire: z.number().int().default(0),
  resistEarth: z.number().int().default(0),
  resistMetal: z.number().int().default(0),
  resistWater: z.number().int().default(0),
  counterBonus: z.number().int().default(50),
  skillId1: z.string().default(""),
  skillId2: z.string().default(""),
  skillId3: z.string().default(""),
  aiLevel: z.number().int().min(1).max(4).default(1),
  growthRate: z.number().positive().default(1.0),
  dropItem1: z.string().default(""),
  dropRate1: z.number().min(0).max(100).default(0),
  dropItem2: z.string().default(""),
  dropRate2: z.number().min(0).max(100).default(0),
  dropItem3: z.string().default(""),
  dropRate3: z.number().min(0).max(100).default(0),
  dropItem4: z.string().default(""),
  dropRate4: z.number().min(0).max(100).default(0),
  dropItem5: z.string().default(""),
  dropRate5: z.number().min(0).max(100).default(0),
  dropGold: z.object({ min: z.number(), max: z.number() }).default({ min: 5, max: 15 }),
  legendaryDrop: z.string().default(""),
  legendaryDropRate: z.number().min(0).max(100).default(0),
  destinyClue: z.string().optional(),
  spawnNodes: z.array(z.string()).default([]),
  imageUrl: z.string().default(""),
  catchRate: z.number().min(0).max(1).default(0.1),
  isActive: z.number().int().min(0).max(1).default(1),
});

const itemCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  category: z.enum(["material_basic", "material_drop", "consumable", "quest", "treasure", "skillbook", "equipment_material"]).default("material_basic"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  stackLimit: z.number().int().positive().default(99),
  shopPrice: z.number().int().nonnegative().default(0),
  inNormalShop: z.number().int().min(0).max(1).default(0),
  inSpiritShop: z.number().int().min(0).max(1).default(0),
  inSecretShop: z.number().int().min(0).max(1).default(0),
  isMonsterDrop: z.number().int().min(0).max(1).default(0),
  dropMonsterId: z.string().default(""),
  dropRate: z.number().min(0).max(100).default(0),
  gatherLocations: z.array(z.object({ nodeId: z.string(), nodeName: z.string(), rate: z.number() })).default([]),
  useEffect: z.object({ type: z.string(), value: z.number(), duration: z.number().optional(), description: z.string() }).nullable().default(null),
  source: z.string().default(""),
  effect: z.string().optional(),
  imageUrl: z.string().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

const equipCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  slot: z.enum(["weapon", "helmet", "armor", "shoes", "accessory", "offhand"]).default("weapon"),
  tier: z.string().default("初階"),
  quality: z.enum(["white", "green", "blue", "purple", "orange", "red"]).default("white"),
  levelRequired: z.number().int().nonnegative().default(1),
  hpBonus: z.number().int().default(0),
  attackBonus: z.number().int().default(0),
  defenseBonus: z.number().int().default(0),
  speedBonus: z.number().int().default(0),
  resistBonus: z.object({ wood: z.number(), fire: z.number(), earth: z.number(), metal: z.number(), water: z.number() }).default({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }),
  affix1: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullable().default(null),
  affix2: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullable().default(null),
  affix3: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullable().default(null),
  affix4: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullable().default(null),
  affix5: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullable().default(null),
  craftMaterialsList: z.array(z.object({ itemId: z.string(), name: z.string(), quantity: z.number() })).default([]),
  setId: z.string().default(""),
  specialEffect: z.string().optional(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  imageUrl: z.string().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

const skillCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  category: z.enum(["active_combat", "passive_combat", "life_gather", "craft_forge"]).default("active_combat"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  tier: z.string().default("初階"),
  mpCost: z.number().int().nonnegative().default(0),
  cooldown: z.number().int().nonnegative().default(0),
  powerPercent: z.number().int().nonnegative().default(100),
  learnLevel: z.number().int().positive().default(1),
  acquireType: z.enum(["shop", "drop", "quest", "craft", "hidden"]).default("shop"),
  shopPrice: z.number().int().nonnegative().default(0),
  dropMonsterId: z.string().default(""),
  hiddenTrigger: z.string().optional(),
  description: z.string().optional(),
  skillType: z.enum(["attack", "heal", "buff", "debuff", "passive", "special"]).default("attack"),
  isActive: z.number().int().min(0).max(1).default(1),
});

const achievementInput = z.object({
  category: z.enum(["avatar", "explore", "combat", "oracle", "social", "collection"]),
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  conditionType: z.string().min(1).max(50),
  conditionValue: z.number().int().positive(),
  conditionParams: z.record(z.string(), z.any()).default({}),
  rewardType: z.enum(["stones", "coins", "title", "item", "frame", "skill"]),
  rewardAmount: z.number().int().nonnegative(),
  rewardContent: z.array(z.object({ type: z.string(), itemId: z.string().optional(), amount: z.number() })).default([]),
  titleReward: z.string().default(""),
  glowEffect: z.string().default(""),
  iconUrl: z.string().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

const monsterSkillInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  skillType: z.enum(["attack", "heal", "buff", "debuff", "special", "passive"]).default("attack"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  powerPercent: z.number().int().nonnegative().default(100),
  mpCost: z.number().int().nonnegative().default(0),
  cooldown: z.number().int().nonnegative().default(0),
  accuracyMod: z.number().int().nonnegative().default(100),
  additionalEffect: z.object({ type: z.string(), chance: z.number(), duration: z.number().optional(), value: z.number().optional() }).nullable().default(null),
  aiCondition: z.object({ hpBelow: z.number().optional(), targetElement: z.string().optional(), priority: z.number().optional() }).nullable().default(null),
  description: z.string().optional(),
  isActive: z.number().int().min(0).max(1).default(1),
});

// ===== Router =====
export const gameCatalogAdminRouter = router({

  // ════════════════════════════════════════════════════════════════
  // 1. 魔物圖鑑 CRUD
  // ════════════════════════════════════════════════════════════════
  getMonsterCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      rarity: z.string().optional(),
      levelMin: z.number().int().optional(),
      levelMax: z.number().int().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameMonsterCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gameMonsterCatalog.wuxing, p.wuxing));
      if (p.rarity) conditions.push(eq(gameMonsterCatalog.rarity, p.rarity));
      // levelRange is stored as "1-5", parse min from it for filtering
      if (p.levelMin !== undefined) {
        conditions.push(sql`CAST(SUBSTRING_INDEX(${gameMonsterCatalog.levelRange}, '-', 1) AS UNSIGNED) >= ${p.levelMin}`);
      }
      if (p.levelMax !== undefined) {
        conditions.push(sql`CAST(SUBSTRING_INDEX(${gameMonsterCatalog.levelRange}, '-', -1) AS UNSIGNED) <= ${p.levelMax}`);
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameMonsterCatalog).where(whereClause);
      const rows = await db.select().from(gameMonsterCatalog).where(whereClause).orderBy(asc(gameMonsterCatalog.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createMonsterCatalog: adminProcedure.input(monsterCatalogInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const monsterId = await generateNextId(db, gameMonsterCatalog, gameMonsterCatalog.monsterId, "M", input.wuxing);
    const [result] = await db.insert(gameMonsterCatalog).values({
      ...input,
      monsterId,
      spawnNodes: input.spawnNodes as any,
      dropGold: input.dropGold as any,
    });
    return { id: (result as any).insertId, monsterId };
  }),

  updateMonsterCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: monsterCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMonsterCatalog).set(input.data as any).where(eq(gameMonsterCatalog.id, input.id));
      return { success: true };
    }),

  deleteMonsterCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameMonsterCatalog).where(eq(gameMonsterCatalog.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 2. 道具圖鑑 CRUD
  // ════════════════════════════════════════════════════════════════
  getItemCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      category: z.string().optional(),
      rarity: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameItemCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gameItemCatalog.wuxing, p.wuxing));
      if (p.category) conditions.push(eq(gameItemCatalog.category, p.category));
      if (p.rarity) conditions.push(eq(gameItemCatalog.rarity, p.rarity));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameItemCatalog).where(whereClause);
      const rows = await db.select().from(gameItemCatalog).where(whereClause).orderBy(asc(gameItemCatalog.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createItemCatalog: adminProcedure.input(itemCatalogInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const itemId = await generateNextId(db, gameItemCatalog, gameItemCatalog.itemId, "I", input.wuxing);
    const [result] = await db.insert(gameItemCatalog).values({
      ...input,
      itemId,
      gatherLocations: input.gatherLocations as any,
      useEffect: input.useEffect as any,
    });
    return { id: (result as any).insertId, itemId };
  }),

  updateItemCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: itemCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameItemCatalog).set(input.data as any).where(eq(gameItemCatalog.id, input.id));
      return { success: true };
    }),

  deleteItemCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameItemCatalog).where(eq(gameItemCatalog.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 3. 裝備圖鑑 CRUD
  // ════════════════════════════════════════════════════════════════
  getEquipCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      slot: z.string().optional(),
      quality: z.string().optional(),
      rarity: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameEquipmentCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gameEquipmentCatalog.wuxing, p.wuxing));
      if (p.slot) conditions.push(eq(gameEquipmentCatalog.slot, p.slot));
      if (p.quality) conditions.push(eq(gameEquipmentCatalog.quality, p.quality));
      if (p.rarity) conditions.push(eq(gameEquipmentCatalog.rarity, p.rarity));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameEquipmentCatalog).where(whereClause);
      const rows = await db.select().from(gameEquipmentCatalog).where(whereClause).orderBy(asc(gameEquipmentCatalog.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createEquipCatalog: adminProcedure.input(equipCatalogInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const equipId = await generateNextId(db, gameEquipmentCatalog, gameEquipmentCatalog.equipId, "E", input.wuxing);
    const [result] = await db.insert(gameEquipmentCatalog).values({
      ...input,
      equipId,
      resistBonus: input.resistBonus as any,
      affix1: input.affix1 as any,
      affix2: input.affix2 as any,
      affix3: input.affix3 as any,
      affix4: input.affix4 as any,
      affix5: input.affix5 as any,
      craftMaterialsList: input.craftMaterialsList as any,
    });
    return { id: (result as any).insertId, equipId };
  }),

  updateEquipCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: equipCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameEquipmentCatalog).set(input.data as any).where(eq(gameEquipmentCatalog.id, input.id));
      return { success: true };
    }),

  deleteEquipCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 4. 技能圖鑑 CRUD
  // ════════════════════════════════════════════════════════════════
  getSkillCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      category: z.string().optional(),
      rarity: z.string().optional(),
      skillType: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameSkillCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gameSkillCatalog.wuxing, p.wuxing));
      if (p.category) conditions.push(eq(gameSkillCatalog.category, p.category));
      if (p.rarity) conditions.push(eq(gameSkillCatalog.rarity, p.rarity));
      if (p.skillType) conditions.push(eq(gameSkillCatalog.skillType, p.skillType));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameSkillCatalog).where(whereClause);
      const rows = await db.select().from(gameSkillCatalog).where(whereClause).orderBy(asc(gameSkillCatalog.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createSkillCatalog: adminProcedure.input(skillCatalogInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const skillId = await generateNextId(db, gameSkillCatalog, gameSkillCatalog.skillId, "S", input.wuxing);
    const [result] = await db.insert(gameSkillCatalog).values({
      ...input,
      skillId,
    });
    return { id: (result as any).insertId, skillId };
  }),

  updateSkillCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: skillCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameSkillCatalog).set(input.data as any).where(eq(gameSkillCatalog.id, input.id));
      return { success: true };
    }),

  deleteSkillCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameSkillCatalog).where(eq(gameSkillCatalog.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 5. 成就系統 CRUD
  // ════════════════════════════════════════════════════════════════
  getAchievementCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      rarity: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameAchievements.title, `%${p.search}%`));
      if (p.category) conditions.push(eq(gameAchievements.category, p.category));
      if (p.rarity) conditions.push(eq(gameAchievements.rarity, p.rarity));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameAchievements).where(whereClause);
      const rows = await db.select().from(gameAchievements).where(whereClause).orderBy(asc(gameAchievements.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createAchievement: adminProcedure.input(achievementInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const achId = await generateAchievementId(db);
    const [result] = await db.insert(gameAchievements).values({
      ...input,
      achId,
      conditionParams: input.conditionParams as any,
      rewardContent: input.rewardContent as any,
    });
    return { id: (result as any).insertId, achId };
  }),

  updateAchievementCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: achievementInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameAchievements).set(input.data as any).where(eq(gameAchievements.id, input.id));
      return { success: true };
    }),

  deleteAchievementCatalog: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameAchievements).where(eq(gameAchievements.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 6. 魔物技能圖鑑 CRUD
  // ════════════════════════════════════════════════════════════════
  getMonsterSkillCatalog: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      wuxing: z.string().optional(),
      rarity: z.string().optional(),
      skillType: z.string().optional(),
      page: z.number().int().positive().default(1),
      pageSize: z.number().int().positive().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const p = input ?? { page: 1, pageSize: 50 };
      const conditions: any[] = [];
      if (p.search) conditions.push(like(gameMonsterSkillCatalog.name, `%${p.search}%`));
      if (p.wuxing) conditions.push(eq(gameMonsterSkillCatalog.wuxing, p.wuxing));
      if (p.rarity) conditions.push(eq(gameMonsterSkillCatalog.rarity, p.rarity));
      if (p.skillType) conditions.push(eq(gameMonsterSkillCatalog.skillType, p.skillType));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const total = await db.select({ count: sql<number>`count(*)` }).from(gameMonsterSkillCatalog).where(whereClause);
      const rows = await db.select().from(gameMonsterSkillCatalog).where(whereClause).orderBy(asc(gameMonsterSkillCatalog.id)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);
      return { items: rows, total: total[0]?.count ?? 0, page: p.page, pageSize: p.pageSize };
    }),

  createMonsterSkill: adminProcedure.input(monsterSkillInput).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const monsterSkillId = await generateMonsterSkillId(db);
    const [result] = await db.insert(gameMonsterSkillCatalog).values({
      ...input,
      monsterSkillId,
      additionalEffect: input.additionalEffect as any,
      aiCondition: input.aiCondition as any,
    });
    return { id: (result as any).insertId, monsterSkillId };
  }),

  updateMonsterSkill: adminProcedure
    .input(z.object({ id: z.number().int(), data: monsterSkillInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMonsterSkillCatalog).set(input.data as any).where(eq(gameMonsterSkillCatalog.id, input.id));
      return { success: true };
    }),

  deleteMonsterSkill: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameMonsterSkillCatalog).where(eq(gameMonsterSkillCatalog.id, input.id));
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════
  // 連動查詢（供下拉選單使用）
  // ════════════════════════════════════════════════════════════════
  
  /** 取得所有魔物技能（供魔物建製的技能下拉） */
  getAllMonsterSkills: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      monsterSkillId: gameMonsterSkillCatalog.monsterSkillId,
      name: gameMonsterSkillCatalog.name,
      wuxing: gameMonsterSkillCatalog.wuxing,
      skillType: gameMonsterSkillCatalog.skillType,
    }).from(gameMonsterSkillCatalog).where(eq(gameMonsterSkillCatalog.isActive, 1)).orderBy(asc(gameMonsterSkillCatalog.name));
  }),

  /** 取得所有道具（供魔物掉落的道具下拉） */
  getAllItems: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      itemId: gameItemCatalog.itemId,
      name: gameItemCatalog.name,
      wuxing: gameItemCatalog.wuxing,
      category: gameItemCatalog.category,
      rarity: gameItemCatalog.rarity,
    }).from(gameItemCatalog).where(eq(gameItemCatalog.isActive, 1)).orderBy(asc(gameItemCatalog.name));
  }),

  /** 取得所有魔物（供道具/技能掉落來源的下拉） */
  getAllMonsters: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      monsterId: gameMonsterCatalog.monsterId,
      name: gameMonsterCatalog.name,
      wuxing: gameMonsterCatalog.wuxing,
      levelRange: gameMonsterCatalog.levelRange,
    }).from(gameMonsterCatalog).where(eq(gameMonsterCatalog.isActive, 1)).orderBy(asc(gameMonsterCatalog.name));
  }),

  /** 取得所有玩家技能（供技能圖鑑下拉） */
  getAllSkills: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      skillId: gameSkillCatalog.skillId,
      name: gameSkillCatalog.name,
      wuxing: gameSkillCatalog.wuxing,
      skillType: gameSkillCatalog.skillType,
    }).from(gameSkillCatalog).where(eq(gameSkillCatalog.isActive, 1)).orderBy(asc(gameSkillCatalog.name));
  }),

  /** 取得所有裝備（供成就獎勵的下拉） */
  getAllEquipments: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select({
      equipId: gameEquipmentCatalog.equipId,
      name: gameEquipmentCatalog.name,
      wuxing: gameEquipmentCatalog.wuxing,
      slot: gameEquipmentCatalog.slot,
    }).from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.isActive, 1)).orderBy(asc(gameEquipmentCatalog.name));
  }),

  // ════════════════════════════════════════════════════════════════
  // 匯出端點（CSV/JSON）
  // ════════════════════════════════════════════════════════════════
  exportMonsterCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameMonsterCatalog).orderBy(asc(gameMonsterCatalog.id));
  }),
  exportItemCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameItemCatalog).orderBy(asc(gameItemCatalog.id));
  }),
  exportEquipCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameEquipmentCatalog).orderBy(asc(gameEquipmentCatalog.id));
  }),
  exportSkillCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameSkillCatalog).orderBy(asc(gameSkillCatalog.id));
  }),
  exportAchievementCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameAchievements).orderBy(asc(gameAchievements.id));
  }),
  exportMonsterSkillCatalog: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(gameMonsterSkillCatalog).orderBy(asc(gameMonsterSkillCatalog.id));
  }),
});
