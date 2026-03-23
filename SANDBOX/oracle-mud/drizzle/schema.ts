import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 五行屬性
export type WuXing = "wood" | "fire" | "earth" | "metal" | "water";

// 玩家的遊戲 Agent（虛相角色）
export const gameAgents = mysqlTable("game_agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 64 }).notNull().default("旅人"),
  gender: mysqlEnum("gender", ["male", "female"]).default("male").notNull(),

  // 當前位置
  currentNodeId: varchar("currentNodeId", { length: 32 }).notNull().default("taipei-zhongzheng"),
  movingToNodeId: varchar("movingToNodeId", { length: 32 }),
  moveArrivesAt: timestamp("moveArrivesAt"),

  // 生命值與魔力
  hp: int("hp").notNull().default(100),
  maxHp: int("maxHp").notNull().default(100),
  mp: int("mp").notNull().default(50),
  maxMp: int("maxMp").notNull().default(50),

  // 基礎能力值（來自命格五行%數）
  attack: int("attack").notNull().default(20),
  defense: int("defense").notNull().default(15),
  speed: int("speed").notNull().default(10),

  // 五行屬性（命格五行%數）
  wuxingWood: int("wuxingWood").notNull().default(20),
  wuxingFire: int("wuxingFire").notNull().default(20),
  wuxingEarth: int("wuxingEarth").notNull().default(20),
  wuxingMetal: int("wuxingMetal").notNull().default(20),
  wuxingWater: int("wuxingWater").notNull().default(20),

  // 主命五行
  dominantElement: mysqlEnum("dominantElement", ["wood", "fire", "earth", "metal", "water"]).default("wood").notNull(),

  // 等級與經驗
  level: int("level").notNull().default(1),
  exp: int("exp").notNull().default(0),
  expToNext: int("expToNext").notNull().default(100),

  // 貨幣
  gold: int("gold").notNull().default(50),
  spiritStone: int("spiritStone").notNull().default(10),
  destinyCoins: int("destinyCoins").notNull().default(0),

  // 行為策略
  strategy: mysqlEnum("strategy", ["explore", "farm", "merchant", "rest"]).default("explore").notNull(),

  // 狀態
  status: mysqlEnum("status", ["idle", "moving", "fighting", "gathering", "resting", "dead"]).default("idle").notNull(),
  isActive: boolean("isActive").notNull().default(true),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameAgent = typeof gameAgents.$inferSelect;
export type InsertGameAgent = typeof gameAgents.$inferInsert;

// 背包物品
export const agentInventory = mysqlTable("agent_inventory", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  itemId: varchar("itemId", { length: 32 }).notNull(),
  itemType: mysqlEnum("itemType", ["consumable", "material", "equipment", "quest"]).notNull(),
  quantity: int("quantity").notNull().default(1),
  equippedSlot: varchar("equippedSlot", { length: 16 }), // weapon/armor/accessory 或 null
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentInventory = typeof agentInventory.$inferSelect;

// 事件日誌
export const agentEvents = mysqlTable("agent_events", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agentId").notNull(),
  tick: int("tick").notNull(),
  eventType: mysqlEnum("eventType", [
    "move", "combat", "loot", "gather", "trade", "rest",
    "levelup", "divine", "weather", "encounter", "death", "system"
  ]).notNull(),
  message: text("message").notNull(),
  data: json("data"), // 額外資料（怪物ID、物品ID等）
  nodeId: varchar("nodeId", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentEvent = typeof agentEvents.$inferSelect;

// 全服 Tick 狀態
export const gameWorld = mysqlTable("game_world", {
  id: int("id").autoincrement().primaryKey(),
  currentTick: int("currentTick").notNull().default(0),
  // 今日流日（命理）
  dailyElement: mysqlEnum("dailyElement", ["wood", "fire", "earth", "metal", "water"]).default("wood").notNull(),
  dailyStem: varchar("dailyStem", { length: 4 }).notNull().default("甲"),
  dailyBranch: varchar("dailyBranch", { length: 4 }).notNull().default("子"),
  // 天氣（影響部分節點）
  weatherModifier: float("weatherModifier").notNull().default(1.0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GameWorld = typeof gameWorld.$inferSelect;
