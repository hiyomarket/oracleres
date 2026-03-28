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
  gameAgents,
  gameVirtualShop,
  gameSpiritShop,
  gameHiddenShopPool,
} from "../../drizzle/schema";
import { sql, like, or, eq, desc, asc, and, gte, lte, count } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

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
  levelRange: z.string().nullish().default("1-5"),
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
  skillId1: z.string().nullish().default(""),
  skillId2: z.string().nullish().default(""),
  skillId3: z.string().nullish().default(""),
  aiLevel: z.number().int().min(1).max(4).default(1),
  growthRate: z.number().positive().default(1.0),
  dropItem1: z.string().nullish().default(""),
  dropRate1: z.number().min(0).max(100).default(0),
  dropItem2: z.string().nullish().default(""),
  dropRate2: z.number().min(0).max(100).default(0),
  dropItem3: z.string().nullish().default(""),
  dropRate3: z.number().min(0).max(100).default(0),
  dropItem4: z.string().nullish().default(""),
  dropRate4: z.number().min(0).max(100).default(0),
  dropItem5: z.string().nullish().default(""),
  dropRate5: z.number().min(0).max(100).default(0),
  dropGold: z.object({ min: z.number(), max: z.number() }).nullish().default({ min: 5, max: 15 }),
  legendaryDrop: z.string().nullish().default(""),
  legendaryDropRate: z.number().min(0).max(100).default(0),
  destinyClue: z.string().nullish(),
  spawnNodes: z.array(z.string()).nullish().default([]),
  imageUrl: z.string().nullish().default(""),
  catchRate: z.number().min(0).max(1).default(0.1),
  actionsPerTurn: z.number().int().min(1).max(5).default(1),
  // GD-028 新增
  baseMp: z.number().int().nonnegative().default(30),
  baseMagicDefense: z.number().int().nonnegative().default(5),
  baseHealPower: z.number().int().nonnegative().default(0),
  baseCritRate: z.number().min(0).max(100).default(5),
  baseCritDamage: z.number().min(0).max(500).default(150),
  wuxingWood: z.number().int().min(0).max(100).default(20),
  wuxingFire: z.number().int().min(0).max(100).default(20),
  wuxingEarth: z.number().int().min(0).max(100).default(20),
  wuxingMetal: z.number().int().min(0).max(100).default(20),
  wuxingWater: z.number().int().min(0).max(100).default(20),
  realm: z.enum(["初界", "中界", "高界"]).default("初界"),
  realmMultiplier: z.number().min(0.5).max(5).default(1.0),
  species: z.enum(["humanoid", "beast", "plant", "undead", "dragon", "flying", "insect", "special", "metal", "demon"]).default("beast"),
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
  dropMonsterId: z.string().nullish().default(""),
  dropRate: z.number().min(0).max(100).default(0),
  stackable: z.number().int().min(0).max(1).default(1),
  usableInBattle: z.number().int().min(0).max(1).default(0),
  gatherLocations: z.array(z.object({ nodeId: z.string(), nodeName: z.string(), rate: z.number() })).nullish().default([]),
  useEffect: z.object({ type: z.string(), value: z.number(), duration: z.number().optional(), description: z.string() }).nullish().default(null),
  source: z.string().nullish().default(""),
  effect: z.string().nullish(),
  imageUrl: z.string().nullish().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

const equipCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  slot: z.enum(["weapon", "helmet", "armor", "gloves", "shoes", "accessory", "offhand"]).default("weapon"),
  tier: z.string().nullish().default("初階"),
  quality: z.enum(["white", "green", "blue", "purple", "orange", "red"]).default("white"),
  levelRequired: z.number().int().nonnegative().default(1),
  hpBonus: z.number().int().default(0),
  attackBonus: z.number().int().default(0),
  defenseBonus: z.number().int().default(0),
  speedBonus: z.number().int().default(0),
  // GD-028 新增加成
  mpBonus: z.number().int().default(0),
  magicAttackBonus: z.number().int().default(0),
  magicDefenseBonus: z.number().int().default(0),
  healPowerBonus: z.number().int().default(0),
  critRateBonus: z.number().min(0).max(100).default(0),
  critDamageBonus: z.number().min(0).max(500).default(0),
  resistBonus: z.object({ wood: z.number(), fire: z.number(), earth: z.number(), metal: z.number(), water: z.number() }).nullish().default({ wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }),
  affix1: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullish().default(null),
  affix2: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullish().default(null),
  affix3: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullish().default(null),
  affix4: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullish().default(null),
  affix5: z.object({ name: z.string(), type: z.string(), value: z.number(), description: z.string() }).nullish().default(null),
  craftMaterialsList: z.array(z.object({ itemId: z.string(), name: z.string(), quantity: z.number() })).nullish().default([]),
  setId: z.string().nullish().default(""),
  specialEffect: z.string().nullish(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  shopPrice: z.number().int().nonnegative().default(0),
  inNormalShop: z.number().int().min(0).max(1).default(0),
  inSpiritShop: z.number().int().min(0).max(1).default(0),
  inSecretShop: z.number().int().min(0).max(1).default(0),
  stackable: z.number().int().min(0).max(1).default(0),
  imageUrl: z.string().nullish().default(""),
  isActive: z.number().int().min(0).max(1).default(1),
});

const skillCatalogInput = z.object({
  name: z.string().min(1).max(100),
  wuxing: z.enum(["木", "火", "土", "金", "水"]),
  category: z.enum(["active_combat", "passive_combat", "life_gather", "craft_forge"]).default("active_combat"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  tier: z.string().nullish().default("初階"),
  mpCost: z.number().int().nonnegative().default(0),
  cooldown: z.number().int().nonnegative().default(0),
  powerPercent: z.number().int().nonnegative().default(100),
  learnLevel: z.number().int().positive().default(1),
  acquireType: z.enum(["shop", "drop", "quest", "craft", "hidden"]).default("shop"),
  shopPrice: z.number().int().nonnegative().default(0),
  dropMonsterId: z.string().nullish().default(""),
  hiddenTrigger: z.union([z.string(), z.array(z.any())]).nullish(),
  description: z.string().nullish(),
  skillType: z.enum(["attack", "heal", "buff", "debuff", "passive", "special"]).default("attack"),
  damageType: z.enum(["single", "aoe"]).default("single"),
  // GD-028 新增
  wuxingThreshold: z.number().int().min(0).max(100).default(0),
  statusEffect: z.enum(["none", "poison", "petrify", "sleep", "confuse", "forget", "drunk", "stun"]).default("none"),
  statusChance: z.number().int().min(0).max(100).default(0),
  statusDuration: z.number().int().min(0).max(10).default(0),
  healPercent: z.number().int().min(0).max(100).default(0),
  professionRequired: z.enum(["none", "hunter", "mage", "tank", "thief", "wizard"]).default("none"),
  skillTier: z.enum(["basic", "intermediate", "advanced", "destiny", "legendary"]).default("basic"),
  acquireMethod: z.enum(["levelup", "profession", "skillbook", "destiny"]).default("levelup"),
  inNormalShop: z.number().int().min(0).max(1).default(0),
  inSpiritShop: z.number().int().min(0).max(1).default(0),
  inSecretShop: z.number().int().min(0).max(1).default(0),
  isActive: z.number().int().min(0).max(1).default(1),
});

const achievementInput = z.object({
  category: z.enum(["avatar", "explore", "combat", "oracle", "social", "collection"]),
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  conditionType: z.string().max(50).default(""),
  conditionValue: z.number().int().nonnegative().default(1),
  conditionParams: z.record(z.string(), z.any()).nullish().default({}),
  rewardType: z.enum(["stones", "coins", "title", "item", "frame", "skill"]),
  rewardAmount: z.number().int().nonnegative(),
  rewardContent: z.array(z.object({ type: z.string(), itemId: z.string().optional(), amount: z.number() })).nullish().default([]),
  titleReward: z.string().nullish().default(""),
  glowEffect: z.string().nullish().default(""),
  iconUrl: z.string().nullish().default(""),
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
  additionalEffect: z.any().nullish().optional(),
  aiCondition: z.any().nullish().optional(),
  description: z.string().nullish(),
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
      destinyClue: input.destinyClue ?? "",
      imageUrl: input.imageUrl ?? "",
      levelRange: input.levelRange ?? "1-5",
      skillId1: input.skillId1 ?? "",
      skillId2: input.skillId2 ?? "",
      skillId3: input.skillId3 ?? "",
      dropItem1: input.dropItem1 ?? "",
      dropItem2: input.dropItem2 ?? "",
      dropItem3: input.dropItem3 ?? "",
      dropItem4: input.dropItem4 ?? "",
      dropItem5: input.dropItem5 ?? "",
      legendaryDrop: input.legendaryDrop ?? "",
      spawnNodes: (input.spawnNodes ?? []) as any,
      dropGold: (input.dropGold ?? { min: 5, max: 15 }) as any,
    });
    return { id: (result as any).insertId, monsterId };
  }),

  updateMonsterCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: monsterCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 將 null 轉為安全預設值，避免 DB 寫入 null
      const safeData = { ...input.data } as any;
      if (safeData.destinyClue === null) safeData.destinyClue = "";
      if (safeData.imageUrl === null) safeData.imageUrl = "";
      if (safeData.spawnNodes === null) safeData.spawnNodes = [];
      if (safeData.dropGold === null) safeData.dropGold = { min: 5, max: 15 };
      if (safeData.levelRange === null) safeData.levelRange = "1-5";
      if (safeData.legendaryDrop === null) safeData.legendaryDrop = "";
      for (const k of ["skillId1","skillId2","skillId3","dropItem1","dropItem2","dropItem3","dropItem4","dropItem5"]) {
        if (safeData[k] === null) safeData[k] = "";
      }
      await db.update(gameMonsterCatalog).set(safeData).where(eq(gameMonsterCatalog.id, input.id));
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
      dropMonsterId: input.dropMonsterId ?? "",
      source: input.source ?? "",
      effect: input.effect ?? "",
      imageUrl: input.imageUrl ?? "",
      gatherLocations: (input.gatherLocations ?? []) as any,
      useEffect: input.useEffect as any,
    });
    return { id: (result as any).insertId, itemId };
  }),

  updateItemCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: itemCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const safeData = { ...input.data } as any;
      for (const k of ["dropMonsterId","source","effect","imageUrl"]) {
        if (safeData[k] === null) safeData[k] = "";
      }
      if (safeData.gatherLocations === null) safeData.gatherLocations = [];
      await db.update(gameItemCatalog).set(safeData).where(eq(gameItemCatalog.id, input.id));
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
      tier: input.tier ?? "初階",
      setId: input.setId ?? "",
      specialEffect: input.specialEffect ?? "",
      imageUrl: input.imageUrl ?? "",
      resistBonus: (input.resistBonus ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 }) as any,
      affix1: input.affix1 as any,
      affix2: input.affix2 as any,
      affix3: input.affix3 as any,
      affix4: input.affix4 as any,
      affix5: input.affix5 as any,
      craftMaterialsList: (input.craftMaterialsList ?? []) as any,
    });
    return { id: (result as any).insertId, equipId };
  }),

  updateEquipCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: equipCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const safeData = { ...input.data } as any;
      for (const k of ["tier","setId","specialEffect","imageUrl"]) {
        if (safeData[k] === null) safeData[k] = "";
      }
      if (safeData.resistBonus === null) safeData.resistBonus = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
      if (safeData.craftMaterialsList === null) safeData.craftMaterialsList = [];
      for (const k of ["affix1","affix2","affix3","affix4","affix5"]) {
        // affix null 是合法的（表示無詞綴），保留
      }
      await db.update(gameEquipmentCatalog).set(safeData).where(eq(gameEquipmentCatalog.id, input.id));
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
      tier: input.tier ?? "初階",
      dropMonsterId: input.dropMonsterId ?? "",
      hiddenTrigger: Array.isArray(input.hiddenTrigger) ? JSON.stringify(input.hiddenTrigger) : (input.hiddenTrigger ?? ""),
      description: input.description ?? "",
    });
    return { id: (result as any).insertId, skillId };
  }),

  updateSkillCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: skillCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const safeData = { ...input.data } as any;
      for (const k of ["tier","dropMonsterId","description"]) {
        if (safeData[k] === null) safeData[k] = "";
      }
      // hiddenTrigger 必須儲存為 JSON 字串
      if (safeData.hiddenTrigger !== undefined) {
        safeData.hiddenTrigger = Array.isArray(safeData.hiddenTrigger)
          ? JSON.stringify(safeData.hiddenTrigger)
          : (safeData.hiddenTrigger === null ? "" : safeData.hiddenTrigger);
      }
      await db.update(gameSkillCatalog).set(safeData).where(eq(gameSkillCatalog.id, input.id));
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
      titleReward: input.titleReward ?? "",
      glowEffect: input.glowEffect ?? "",
      iconUrl: input.iconUrl ?? "",
      conditionParams: (input.conditionParams ?? {}) as any,
      rewardContent: (input.rewardContent ?? []) as any,
    });
    return { id: (result as any).insertId, achId };
  }),

  updateAchievementCatalog: adminProcedure
    .input(z.object({ id: z.number().int(), data: achievementInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const safeData = { ...input.data } as any;
      for (const k of ["titleReward","glowEffect","iconUrl"]) {
        if (safeData[k] === null) safeData[k] = "";
      }
      if (safeData.conditionParams === null) safeData.conditionParams = {};
      if (safeData.rewardContent === null) safeData.rewardContent = [];
      await db.update(gameAchievements).set(safeData).where(eq(gameAchievements.id, input.id));
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
      description: input.description ?? "",
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
      const safeData = { ...input.data } as any;
      if (safeData.description === null) safeData.description = "";
      await db.update(gameMonsterSkillCatalog).set(safeData).where(eq(gameMonsterSkillCatalog.id, input.id));
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
  // 批量刪除 API
  // ════════════════════════════════════════════════════════════════
  batchDeleteMonsters: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { ids } = input;
      await db.delete(gameMonsterCatalog).where(sql`${gameMonsterCatalog.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: ids.length };
    }),

  batchDeleteItems: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameItemCatalog).where(sql`${gameItemCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: input.ids.length };
    }),

  batchDeleteEquips: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameEquipmentCatalog).where(sql`${gameEquipmentCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: input.ids.length };
    }),

  batchDeleteSkills: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameSkillCatalog).where(sql`${gameSkillCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: input.ids.length };
    }),

  batchDeleteAchievements: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameAchievements).where(sql`${gameAchievements.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: input.ids.length };
    }),

  batchDeleteMonsterSkills: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(gameMonsterSkillCatalog).where(sql`${gameMonsterSkillCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { deleted: input.ids.length };
    }),

  // ════════════════════════════════════════════════════════════════
  // 批量編輯 API
  // ════════════════════════════════════════════════════════════════
  batchUpdateMonsters: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: monsterCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMonsterCatalog).set(input.data as any).where(sql`${gameMonsterCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
    }),

  batchUpdateItems: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: itemCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameItemCatalog).set(input.data as any).where(sql`${gameItemCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
    }),

  batchUpdateEquips: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: equipCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameEquipmentCatalog).set(input.data as any).where(sql`${gameEquipmentCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
    }),

  batchUpdateSkills: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: skillCatalogInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameSkillCatalog).set(input.data as any).where(sql`${gameSkillCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
    }),

  batchUpdateAchievements: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: achievementInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameAchievements).set(input.data as any).where(sql`${gameAchievements.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
    }),

  batchUpdateMonsterSkills: adminProcedure
    .input(z.object({ ids: z.array(z.number().int()).min(1).max(500), data: monsterSkillInput.partial() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameMonsterSkillCatalog).set(input.data as any).where(sql`${gameMonsterSkillCatalog.id} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
      return { updated: input.ids.length };
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

  // ===== 批量匯入 =====
  bulkImportMonsters: adminProcedure
    .input(z.object({
      items: z.array(z.record(z.string(), z.any())).min(1).max(500),
      autoLinkSkills: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 預載所有魔物技能（用於自動關聯）
      let allMonsterSkills: { monsterSkillId: string; wuxing: string; skillType: string; rarity: string }[] = [];
      if (input.autoLinkSkills) {
        const skills = await db.select({
          monsterSkillId: gameMonsterSkillCatalog.monsterSkillId,
          wuxing: gameMonsterSkillCatalog.wuxing,
          skillType: gameMonsterSkillCatalog.skillType,
          rarity: gameMonsterSkillCatalog.rarity,
        }).from(gameMonsterSkillCatalog).where(eq(gameMonsterSkillCatalog.isActive, 1));
        allMonsterSkills = skills;
      }

      let imported = 0;
      let skillsLinked = 0;
      for (const item of input.items) {
        try {
          const wuxingCode = WUXING_CODE[item.wuxing] ?? "W";
          const prefix = `M_${wuxingCode}`;
          const existing = await db.select({ monsterId: gameMonsterCatalog.monsterId }).from(gameMonsterCatalog)
            .where(like(gameMonsterCatalog.monsterId, `${prefix}%`)).orderBy(desc(gameMonsterCatalog.id)).limit(1);
          const lastNum = existing[0] ? parseInt(existing[0].monsterId.replace(prefix, "")) || 0 : 0;
          const monsterId = `${prefix}${String(lastNum + 1).padStart(3, "0")}`;

          // 自動關聯技能：根據五行屬性 + 稀有度配置技能
          let skillId1 = item.skillId1 ?? "";
          let skillId2 = item.skillId2 ?? "";
          let skillId3 = item.skillId3 ?? "";
          if (input.autoLinkSkills && !skillId1 && allMonsterSkills.length > 0) {
            const monsterWuxing = item.wuxing ?? "木";
            const monsterRarity = item.rarity ?? "common";
            // 策略：同五行技能優先，再補充其他五行
            const sameElement = allMonsterSkills.filter(s => s.wuxing === monsterWuxing);
            const otherElement = allMonsterSkills.filter(s => s.wuxing !== monsterWuxing);
            // 根據稀有度決定技能數量：common=1, rare=2, elite/boss/legendary=3
            const skillCount = monsterRarity === "common" ? 1 : monsterRarity === "rare" ? 2 : 3;
            const picked: string[] = [];
            // 優先選同五行 attack 技能
            const sameAttack = sameElement.filter(s => s.skillType === "attack");
            if (sameAttack.length > 0) picked.push(sameAttack[Math.floor(Math.random() * sameAttack.length)].monsterSkillId);
            // 補充同五行其他技能
            const sameOther = sameElement.filter(s => !picked.includes(s.monsterSkillId));
            while (picked.length < skillCount && sameOther.length > 0) {
              const idx = Math.floor(Math.random() * sameOther.length);
              picked.push(sameOther[idx].monsterSkillId);
              sameOther.splice(idx, 1);
            }
            // 仍不夠則從其他五行補充
            while (picked.length < skillCount && otherElement.length > 0) {
              const idx = Math.floor(Math.random() * otherElement.length);
              picked.push(otherElement[idx].monsterSkillId);
              otherElement.splice(idx, 1);
            }
            skillId1 = picked[0] ?? "";
            skillId2 = picked[1] ?? "";
            skillId3 = picked[2] ?? "";
            if (picked.length > 0) skillsLinked += picked.length;
          }

          await db.insert(gameMonsterCatalog).values({
            monsterId, name: item.name ?? "未命名", wuxing: item.wuxing ?? "木",
            levelRange: item.levelRange ?? "1-5", rarity: item.rarity ?? "common",
            baseHp: item.baseHp ?? 100, baseAttack: item.baseAttack ?? 10,
            baseDefense: item.baseDefense ?? 5, baseSpeed: item.baseSpeed ?? 5,
            baseAccuracy: item.baseAccuracy ?? 80, baseMagicAttack: item.baseMagicAttack ?? 8,
            skillId1, skillId2, skillId3,
            ...(item.resistWood !== undefined && { resistWood: item.resistWood }),
            ...(item.resistFire !== undefined && { resistFire: item.resistFire }),
            ...(item.resistEarth !== undefined && { resistEarth: item.resistEarth }),
            ...(item.resistMetal !== undefined && { resistMetal: item.resistMetal }),
            ...(item.resistWater !== undefined && { resistWater: item.resistWater }),
            ...(item.growthRate !== undefined && { growthRate: item.growthRate }),
            ...(item.aiLevel !== undefined && { aiLevel: item.aiLevel }),
            ...(item.destinyClue !== undefined && { destinyClue: item.destinyClue }),
            ...(item.imageUrl !== undefined && { imageUrl: item.imageUrl }),
            isActive: item.isActive ?? 1,
            createdAt: Date.now(),
          });
          imported++;
        } catch (e) { console.error("[BulkImport] Monster error:", e); }
      }
      return { imported, total: input.items.length, skillsLinked };
    }),

  bulkImportItems: adminProcedure
    .input(z.object({ items: z.array(z.record(z.string(), z.any())).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const item of input.items) {
        try {
          await db.insert(gameItemCatalog).values({
            itemId: item.itemId ?? `item-${Date.now()}-${imported}`,
            name: item.name ?? "未命名", wuxing: item.wuxing ?? "木",
            category: item.category ?? "material_basic", rarity: item.rarity ?? "common",
            effect: item.effect ?? item.description ?? "",
            shopPrice: item.shopPrice ?? item.sellPrice ?? 0,
            stackLimit: item.stackLimit ?? 99, isActive: item.isActive ?? 1,
            createdAt: Date.now(),
          });
          imported++;
        } catch (e) { console.error("[BulkImport] Item error:", e); }
      }
      return { imported, total: input.items.length };
    }),

  bulkImportEquipments: adminProcedure
    .input(z.object({ items: z.array(z.record(z.string(), z.any())).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const item of input.items) {
        try {
          await db.insert(gameEquipmentCatalog).values({
            equipId: item.equipId ?? `equip-${Date.now()}-${imported}`,
            name: item.name ?? "未命名", wuxing: item.wuxing ?? "木",
            slot: item.slot ?? "weapon", quality: item.quality ?? "common",
            attackBonus: item.attackBonus ?? item.baseAttack ?? 0,
            defenseBonus: item.defenseBonus ?? item.baseDefense ?? 0,
            speedBonus: item.speedBonus ?? item.baseSpeed ?? 0,
            specialEffect: item.specialEffect ?? item.description ?? "",
            isActive: item.isActive ?? 1,
            createdAt: Date.now(),
          });
          imported++;
        } catch (e) { console.error("[BulkImport] Equipment error:", e); }
      }
      return { imported, total: input.items.length };
    }),

  bulkImportSkills: adminProcedure
    .input(z.object({ items: z.array(z.record(z.string(), z.any())).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const item of input.items) {
        try {
          await db.insert(gameSkillCatalog).values({
            skillId: item.skillId ?? `skill-${Date.now()}-${imported}`,
            name: item.name ?? "未命名", wuxing: item.wuxing ?? "木",
            category: item.category ?? "active_combat", tier: item.tier ?? "basic",
            description: item.description ?? "", mpCost: item.mpCost ?? 0,
            cooldown: item.cooldown ?? 0, isActive: item.isActive ?? 1,
            createdAt: Date.now(),
          });
          imported++;
        } catch (e) { console.error("[BulkImport] Skill error:", e); }
      }
      return { imported, total: input.items.length };
    }),

  bulkImportAchievements: adminProcedure
    .input(z.object({ items: z.array(z.record(z.string(), z.any())).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const item of input.items) {
        try {
          await db.insert(gameAchievements).values({
            achId: item.achId ?? `ACH_${String(Date.now()).slice(-6)}`,
            title: item.title ?? item.name ?? "未命名",
            description: item.description ?? "",
            category: item.category ?? "combat",
            rarity: item.rarity ?? item.tier ?? "common",
            conditionType: item.conditionType ?? "login_days",
            conditionValue: item.conditionValue ?? 1,
            rewardType: item.rewardType ?? "coins",
            rewardAmount: item.rewardAmount ?? 100,
            isActive: item.isActive ?? 1,
          });
          imported++;
        } catch (e) { console.error("[BulkImport] Achievement error:", e); }
      }
      return { imported, total: input.items.length };
    }),

  bulkImportMonsterSkills: adminProcedure
    .input(z.object({ items: z.array(z.record(z.string(), z.any())).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const item of input.items) {
        try {
          await db.insert(gameMonsterSkillCatalog).values({
            monsterSkillId: item.monsterSkillId ?? `mskill-${Date.now()}-${imported}`,
            name: item.name ?? "未命名", wuxing: item.wuxing ?? "木",
            skillType: item.skillType ?? "attack",
            powerPercent: item.powerPercent ?? 100,
            mpCost: item.mpCost ?? 0,
            cooldown: item.cooldown ?? 0,
            accuracyMod: item.accuracyMod ?? 100,
            description: item.description ?? "",
            isActive: item.isActive ?? 1,
            createdAt: Date.now(),
          });
          imported++;
        } catch (e) { console.error("[BulkImport] MonsterSkill error:", e); }
      }
      return { imported, total: input.items.length };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 圖鑑統計儀表板 API
  // ═══════════════════════════════════════════════════════════════
  getCatalogStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // 怪物統計
    const monsterTotal = await db.select({ count: sql<number>`count(*)` }).from(gameMonsterCatalog);
    const monsterByWuxing = await db.select({
      wuxing: gameMonsterCatalog.wuxing,
      count: sql<number>`count(*)`,
    }).from(gameMonsterCatalog).groupBy(gameMonsterCatalog.wuxing);
    const monsterByRarity = await db.select({
      rarity: gameMonsterCatalog.rarity,
      count: sql<number>`count(*)`,
    }).from(gameMonsterCatalog).groupBy(gameMonsterCatalog.rarity);

    // 道具統計
    const itemTotal = await db.select({ count: sql<number>`count(*)` }).from(gameItemCatalog);
    const itemByWuxing = await db.select({
      wuxing: gameItemCatalog.wuxing,
      count: sql<number>`count(*)`,
    }).from(gameItemCatalog).groupBy(gameItemCatalog.wuxing);
    const itemByRarity = await db.select({
      rarity: gameItemCatalog.rarity,
      count: sql<number>`count(*)`,
    }).from(gameItemCatalog).groupBy(gameItemCatalog.rarity);

    // 裝備統計
    const equipTotal = await db.select({ count: sql<number>`count(*)` }).from(gameEquipmentCatalog);
    const equipByWuxing = await db.select({
      wuxing: gameEquipmentCatalog.wuxing,
      count: sql<number>`count(*)`,
    }).from(gameEquipmentCatalog).groupBy(gameEquipmentCatalog.wuxing);
    const equipByRarity = await db.select({
      rarity: gameEquipmentCatalog.rarity,
      count: sql<number>`count(*)`,
    }).from(gameEquipmentCatalog).groupBy(gameEquipmentCatalog.rarity);

    // 技能統計
    const skillTotal = await db.select({ count: sql<number>`count(*)` }).from(gameSkillCatalog);
    const skillByWuxing = await db.select({
      wuxing: gameSkillCatalog.wuxing,
      count: sql<number>`count(*)`,
    }).from(gameSkillCatalog).groupBy(gameSkillCatalog.wuxing);

    // 成就統計
    const achieveTotal = await db.select({ count: sql<number>`count(*)` }).from(gameAchievements);

    // 魔物技能統計
    const monsterSkillTotal = await db.select({ count: sql<number>`count(*)` }).from(gameMonsterSkillCatalog);
    const monsterSkillByWuxing = await db.select({
      wuxing: gameMonsterSkillCatalog.wuxing,
      count: sql<number>`count(*)`,
    }).from(gameMonsterSkillCatalog).groupBy(gameMonsterSkillCatalog.wuxing);

    return {
      monsters: {
        total: monsterTotal[0]?.count ?? 0,
        byWuxing: monsterByWuxing,
        byRarity: monsterByRarity,
      },
      items: {
        total: itemTotal[0]?.count ?? 0,
        byWuxing: itemByWuxing,
        byRarity: itemByRarity,
      },
      equipment: {
        total: equipTotal[0]?.count ?? 0,
        byWuxing: equipByWuxing,
        byRarity: equipByRarity,
      },
      skills: {
        total: skillTotal[0]?.count ?? 0,
        byWuxing: skillByWuxing,
      },
      achievements: {
        total: achieveTotal[0]?.count ?? 0,
      },
      monsterSkills: {
        total: monsterSkillTotal[0]?.count ?? 0,
        byWuxing: monsterSkillByWuxing,
      },
    };
  }),

  // ===== 遊戲數值平衡分析 =====
  getBalanceAnalysis: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // 1. 怪物攻擊力異常檢測（按等級分組，找出偏離平均值 > 2倍標準差的）
    const monsters = await db.select({
      id: gameMonsterCatalog.id,
      name: gameMonsterCatalog.name,
      monsterId: gameMonsterCatalog.monsterId,
      level: gameMonsterCatalog.aiLevel,
      wuxing: gameMonsterCatalog.wuxing,
      attack: gameMonsterCatalog.baseAttack,
      defense: gameMonsterCatalog.baseDefense,
      hp: gameMonsterCatalog.baseHp,
      dropRate: gameMonsterCatalog.dropRate1,
    }).from(gameMonsterCatalog);

    // 按等級分組分析
    const monstersByLevel: Record<number, typeof monsters> = {};
    for (const m of monsters) {
      const lvl = m.level ?? 1;
      if (!monstersByLevel[lvl]) monstersByLevel[lvl] = [];
      monstersByLevel[lvl].push(m);
    }

    const monsterAnomalies: Array<{ name: string; monsterId: string; level: number; field: string; value: number; avg: number; severity: string }> = [];
    for (const [lvl, group] of Object.entries(monstersByLevel)) {
      if (group.length < 2) continue;
      for (const field of ["attack", "defense", "hp", "dropRate"] as const) {
        const vals = group.map((m: any) => Number(m[field]) || 0);
        const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        const stdDev = Math.sqrt(vals.reduce((a: number, b: number) => a + (b - avg) ** 2, 0) / vals.length);
        if (stdDev === 0) continue;
        for (const m of group) {
          const v = Number(m[field]) || 0;
          const zScore = Math.abs(v - avg) / stdDev;
          if (zScore > 2) {
            monsterAnomalies.push({
              name: m.name,
              monsterId: m.monsterId ?? "",
              level: Number(lvl),
              field: field === "attack" ? "攻擊力" : field === "defense" ? "防禦力" : field === "hp" ? "血量" : "掉率",
              value: v,
              avg: Math.round(avg),
              severity: zScore > 3 ? "嚴重" : "警告",
            });
          }
        }
      }
    }

    // 2. 道具掉率異常檢測
    const db2 = await getDb();
    if (!db2) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const items = await db2.select({
      id: gameItemCatalog.id,
      name: gameItemCatalog.name,
      itemId: gameItemCatalog.itemId,
      rarity: gameItemCatalog.rarity,
      shopPrice: gameItemCatalog.shopPrice,
      dropRate: gameItemCatalog.dropRate,
    }).from(gameItemCatalog);

    const itemAnomalies: Array<{ name: string; itemId: string; field: string; value: number; threshold: string; severity: string }> = [];
    for (const item of items) {
      const dr = Number(item.dropRate) || 0;
      if (dr > 0 && dr < 1) {
        itemAnomalies.push({ name: item.name, itemId: item.itemId ?? "", field: "掉率過低", value: dr, threshold: "< 1%", severity: "警告" });
      }
      if (dr > 80) {
        itemAnomalies.push({ name: item.name, itemId: item.itemId ?? "", field: "掉率過高", value: dr, threshold: "> 80%", severity: "警告" });
      }
      const price = Number(item.shopPrice) || 0;
      if (price > 0 && price < 10) {
        itemAnomalies.push({ name: item.name, itemId: item.itemId ?? "", field: "售價過低", value: price, threshold: "< 10", severity: "提示" });
      }
    }

    // 3. 裝備屬性異常檢測
    const db3 = await getDb();
    if (!db3) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const equips = await db3.select({
      id: gameEquipmentCatalog.id,
      name: gameEquipmentCatalog.name,
      equipId: gameEquipmentCatalog.equipId,
      quality: gameEquipmentCatalog.quality,
      attackBonus: gameEquipmentCatalog.attackBonus,
      defenseBonus: gameEquipmentCatalog.defenseBonus,
      hpBonus: gameEquipmentCatalog.hpBonus,
      levelReq: gameEquipmentCatalog.levelRequired,
    }).from(gameEquipmentCatalog);

    const equipAnomalies: Array<{ name: string; equipId: string; field: string; value: number; avg: number; severity: string }> = [];
    const equipByQuality: Record<string, typeof equips> = {};
    for (const e of equips) {
      const q = e.quality ?? "普通";
      if (!equipByQuality[q]) equipByQuality[q] = [];
      equipByQuality[q].push(e);
    }
    for (const [quality, group] of Object.entries(equipByQuality)) {
      if (group.length < 2) continue;
      for (const field of ["attackBonus", "defenseBonus", "hpBonus"] as const) {
        const vals = group.map((e: any) => Number(e[field]) || 0);
        const avg = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
        const stdDev = Math.sqrt(vals.reduce((a: number, b: number) => a + (b - avg) ** 2, 0) / vals.length);
        if (stdDev === 0) continue;
        for (const e of group) {
          const v = Number(e[field]) || 0;
          const zScore = Math.abs(v - avg) / stdDev;
          if (zScore > 2) {
            equipAnomalies.push({
              name: e.name,
              equipId: e.equipId ?? "",
              field: field === "attackBonus" ? "攻擊加成" : field === "defenseBonus" ? "防禦加成" : "血量加成",
              value: v,
              avg: Math.round(avg),
              severity: zScore > 3 ? "嚴重" : "警告",
            });
          }
        }
      }
    }

    // 4. 綜合健康分數
    const totalAnomalies = monsterAnomalies.length + itemAnomalies.length + equipAnomalies.length;
    const severeCount = [...monsterAnomalies, ...equipAnomalies].filter(a => a.severity === "嚴重").length;
    const healthScore = Math.max(0, 100 - severeCount * 10 - (totalAnomalies - severeCount) * 3);

    return {
      healthScore,
      totalAnomalies,
      monsterAnomalies: monsterAnomalies.slice(0, 20),
      itemAnomalies: itemAnomalies.slice(0, 20),
      equipAnomalies: equipAnomalies.slice(0, 20),
      summary: {
        monsters: { total: monsters.length, anomalies: monsterAnomalies.length },
        items: { total: items.length, anomalies: itemAnomalies.length },
        equipment: { total: equips.length, anomalies: equipAnomalies.length },
      },
    };
  }),

  // ════════════════════════════════════════════════════════════════
  // AI 商店佈局功能
  // ════════════════════════════════════════════════════════════════

  /** AI 分析玩家統計 + 圖鑑數據，推薦商店佈局 */
  aiShopLayoutAnalyze: adminProcedure
    .input(z.object({
      shopType: z.enum(["normal", "spirit", "secret"]),
      maxItems: z.number().int().min(5).max(50).default(20),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 1. 玩家統計
      const agents = await db.select({
        level: gameAgents.level,
        gold: gameAgents.gold,
      }).from(gameAgents);
      const totalPlayers = agents.length;
      const avgLevel = totalPlayers > 0 ? Math.round(agents.reduce((s, a) => s + a.level, 0) / totalPlayers) : 1;
      const avgGold = totalPlayers > 0 ? Math.round(agents.reduce((s, a) => s + a.gold, 0) / totalPlayers) : 0;
      const maxLevel = totalPlayers > 0 ? Math.max(...agents.map(a => a.level)) : 1;
      const levelDist: Record<string, number> = {};
      for (const a of agents) {
        const bracket = `${Math.floor(a.level / 5) * 5}-${Math.floor(a.level / 5) * 5 + 4}`;
        levelDist[bracket] = (levelDist[bracket] || 0) + 1;
      }

      // 2. 圖鑑數據
      const shopField = input.shopType === "normal" ? "inNormalShop"
        : input.shopType === "spirit" ? "inSpiritShop" : "inSecretShop";

      const items = await db.select({
        id: gameItemCatalog.id,
        itemId: gameItemCatalog.itemId,
        name: gameItemCatalog.name,
        category: gameItemCatalog.category,
        rarity: gameItemCatalog.rarity,
        shopPrice: gameItemCatalog.shopPrice,

        inNormalShop: gameItemCatalog.inNormalShop,
        inSpiritShop: gameItemCatalog.inSpiritShop,
        inSecretShop: gameItemCatalog.inSecretShop,
      }).from(gameItemCatalog);

      const equips = await db.select({
        id: gameEquipmentCatalog.id,
        equipId: gameEquipmentCatalog.equipId,
        name: gameEquipmentCatalog.name,
        slot: gameEquipmentCatalog.slot,
        quality: gameEquipmentCatalog.quality,
        rarity: gameEquipmentCatalog.rarity,
        shopPrice: gameEquipmentCatalog.shopPrice,
        levelRequired: gameEquipmentCatalog.levelRequired,
        inNormalShop: gameEquipmentCatalog.inNormalShop,
        inSpiritShop: gameEquipmentCatalog.inSpiritShop,
        inSecretShop: gameEquipmentCatalog.inSecretShop,
      }).from(gameEquipmentCatalog);

      const skills = await db.select({
        id: gameSkillCatalog.id,
        skillId: gameSkillCatalog.skillId,
        name: gameSkillCatalog.name,
        category: gameSkillCatalog.category,
        rarity: gameSkillCatalog.rarity,
        shopPrice: gameSkillCatalog.shopPrice,
        learnLevel: gameSkillCatalog.learnLevel,
        inNormalShop: gameSkillCatalog.inNormalShop,
        inSpiritShop: gameSkillCatalog.inSpiritShop,
        inSecretShop: gameSkillCatalog.inSecretShop,
      }).from(gameSkillCatalog);

      // 3. LLM 分析
      const catalogSummary = JSON.stringify({
        items: items.slice(0, 100).map(i => ({ id: i.id, itemId: i.itemId, name: i.name, category: i.category, rarity: i.rarity, price: i.shopPrice, [shopField]: (i as any)[shopField] })),
        equips: equips.slice(0, 100).map(e => ({ id: e.id, equipId: e.equipId, name: e.name, slot: e.slot, quality: e.quality, rarity: e.rarity, price: e.shopPrice, lvReq: e.levelRequired, [shopField]: (e as any)[shopField] })),
        skills: skills.slice(0, 100).map(s => ({ id: s.id, skillId: s.skillId, name: s.name, category: s.category, rarity: s.rarity, price: s.shopPrice, lvReq: s.learnLevel, [shopField]: (s as any)[shopField] })),
      });

      const shopTypeLabel = input.shopType === "normal" ? "一般商店（金幣）" : input.shopType === "spirit" ? "靈相商店（靈石）" : "密店（隨機出現）";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一個 RPG 遊戲經濟平衡專家。請根據玩家統計和圖鑑數據，為「${shopTypeLabel}」推薦最佳商品組合。
要求：
1. 選擇最多 ${input.maxItems} 個商品
2. 考慮玩家等級分佈，確保各等級段都有可購買的商品
3. 考慮經濟平衡，不要讓玩家太容易獲得高級裝備
4. 確保商品類型多樣化（道具/裝備/技能都要有）
5. 建議合理售價（如果現有售價為 0 或不合理）

返回 JSON 格式：
{
  "recommendations": [
    { "type": "item"|"equip"|"skill", "id": number, "name": string, "suggestedPrice": number, "reason": string }
  ],
  "analysis": string,
  "priceAdjustments": [
    { "type": "item"|"equip"|"skill", "id": number, "name": string, "currentPrice": number, "suggestedPrice": number, "reason": string }
  ]
}`,
          },
          {
            role: "user",
            content: `玩家統計：
- 總玩家數：${totalPlayers}
- 平均等級：${avgLevel}，最高等級：${maxLevel}
- 平均金幣：${avgGold}
- 等級分佈：${JSON.stringify(levelDist)}

圖鑑數據：
${catalogSummary}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "shop_layout",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["item", "equip", "skill"] },
                      id: { type: "number" },
                      name: { type: "string" },
                      suggestedPrice: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["type", "id", "name", "suggestedPrice", "reason"],
                    additionalProperties: false,
                  },
                },
                analysis: { type: "string" },
                priceAdjustments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["item", "equip", "skill"] },
                      id: { type: "number" },
                      name: { type: "string" },
                      currentPrice: { type: "number" },
                      suggestedPrice: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["type", "id", "name", "currentPrice", "suggestedPrice", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations", "analysis", "priceAdjustments"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices?.[0]?.message?.content ?? "{}";
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const parsed = JSON.parse(content);

      return {
        shopType: input.shopType,
        playerStats: { totalPlayers, avgLevel, maxLevel, avgGold, levelDist },
        ...parsed,
      };
    }),

  /** 一鍵套用 AI 推薦的商店佈局 */
  aiShopLayoutApply: adminProcedure
    .input(z.object({
      shopType: z.enum(["normal", "spirit", "secret"]),
      /** 要上架的商品 */
      toEnable: z.array(z.object({
        type: z.enum(["item", "equip", "skill"]),
        id: z.number().int(),
        suggestedPrice: z.number().int().optional(),
      })),
      /** 要下架的商品 */
      toDisable: z.array(z.object({
        type: z.enum(["item", "equip", "skill"]),
        id: z.number().int(),
      })).optional(),
      /** 是否同時更新售價 */
      updatePrices: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const shopField = input.shopType === "normal" ? "inNormalShop"
        : input.shopType === "spirit" ? "inSpiritShop" : "inSecretShop";

      let enabled = 0;
      let disabled = 0;
      let pricesUpdated = 0;

      // 上架商品
      for (const item of input.toEnable) {
        const updateData: any = { [shopField]: 1 };
        if (input.updatePrices && item.suggestedPrice != null) {
          updateData.shopPrice = item.suggestedPrice;
          pricesUpdated++;
        }
        if (item.type === "item") {
          await db.update(gameItemCatalog).set(updateData).where(eq(gameItemCatalog.id, item.id));
        } else if (item.type === "equip") {
          await db.update(gameEquipmentCatalog).set(updateData).where(eq(gameEquipmentCatalog.id, item.id));
        } else {
          await db.update(gameSkillCatalog).set(updateData).where(eq(gameSkillCatalog.id, item.id));
        }
        enabled++;
      }

      // 下架商品
      if (input.toDisable) {
        for (const item of input.toDisable) {
          const updateData: any = { [shopField]: 0 };
          if (item.type === "item") {
            await db.update(gameItemCatalog).set(updateData).where(eq(gameItemCatalog.id, item.id));
          } else if (item.type === "equip") {
            await db.update(gameEquipmentCatalog).set(updateData).where(eq(gameEquipmentCatalog.id, item.id));
          } else {
            await db.update(gameSkillCatalog).set(updateData).where(eq(gameSkillCatalog.id, item.id));
          }
          disabled++;
        }
      }

      return { enabled, disabled, pricesUpdated };
    }),
});
