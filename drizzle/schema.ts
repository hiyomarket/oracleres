import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

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

/**
 * 神諭記錄資料表
 * 儲存每次擲筊的完整信息，建立個人神諭資料庫
 */
export const oracleSessions = mysqlTable("oracle_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  query: text("query").notNull(),
  result: mysqlEnum("result", ["sheng", "xiao", "yin", "li"]).notNull(),
  dayPillarStem: varchar("dayPillarStem", { length: 4 }).notNull(),
  dayPillarBranch: varchar("dayPillarBranch", { length: 4 }).notNull(),
  dayPillarStemElement: varchar("dayPillarStemElement", { length: 4 }).notNull(),
  dayPillarBranchElement: varchar("dayPillarBranchElement", { length: 4 }).notNull(),
  energyLevel: varchar("energyLevel", { length: 20 }).notNull(),
  queryType: varchar("queryType", { length: 20 }).notNull(),
  interpretation: text("interpretation").notNull(),
  energyResonance: text("energyResonance").notNull(),
  weights: json("weights").$type<{ sheng: number; xiao: number; yin: number }>(),
  isSpecialEgg: int("isSpecialEgg").default(0).notNull(),
  dateString: varchar("dateString", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OracleSession = typeof oracleSessions.$inferSelect;
export type InsertOracleSession = typeof oracleSessions.$inferInsert;

/**
 * 刮刮樂天命選號記錄資料表
 * 儲存每次選號的完整信息，建立天命選號資料庫
 */
export const lotterySessions = mysqlTable("lottery_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // 主要推薦號碼（6個）
  numbers: json("numbers").$type<number[]>().notNull(),
  // 備選號碼（3個）
  bonusNumbers: json("bonusNumbers").$type<number[]>().notNull(),
  // 最幸達數字（2個）
  luckyDigits: json("luckyDigits").$type<number[]>().notNull(),
  // 日柱天干地支
  dayPillar: varchar("dayPillar", { length: 4 }).notNull(),
  // 時柱天干地支
  hourPillar: varchar("hourPillar", { length: 4 }).notNull(),
  // 月相
  moonPhase: varchar("moonPhase", { length: 20 }).notNull(),
  // 今日主導五行
  todayElement: varchar("todayElement", { length: 10 }).notNull(),
  // 整體運勢分數
  overallLuck: int("overallLuck").notNull(),
  // 選號建議文字
  recommendation: text("recommendation").notNull(),
  // 日期字串
  dateString: varchar("dateString", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LotterySession = typeof lotterySessions.$inferSelect;
export type InsertLotterySession = typeof lotterySessions.$inferInsert;

// 開獎對照資料表
export const lotteryResults = mysqlTable("lottery_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // 關聯的選號記錄 ID
  sessionId: int("sessionId"),
  // 天命選號（6個）
  predictedNumbers: json("predictedNumbers").$type<number[]>().notNull(),
  // 實際開獎號碼（6個）
  actualNumbers: json("actualNumbers").$type<number[]>().notNull(),
  // 實際特別號
  actualBonus: int("actualBonus"),
  // 命中數量
  matchCount: int("matchCount").notNull().default(0),
  // 是否命中特別號
  bonusMatch: int("bonusMatch").notNull().default(0),
  // 五行共振分數 (0-100)
  resonanceScore: int("resonanceScore").notNull().default(0),
  // 日柱
  dayPillar: varchar("dayPillar", { length: 4 }).notNull(),
  // 日期字串
  dateString: varchar("dateString", { length: 50 }).notNull(),
  // 彩券類型: 'lottery'(大樂透) | 'scratch'(刮刮樂)
  ticketType: varchar("ticketType", { length: 20 }).notNull().default('lottery'),
  // 刮刮樂專用：券面面額（元）
  scratchPrice: int("scratchPrice"),
  // 刮刮樂專用：中獎金額（元）
  scratchPrize: int("scratchPrize"),
  // 刮刮樂專用：是否中獎
  scratchWon: int("scratchWon").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LotteryResult = typeof lotteryResults.$inferSelect;
export type InsertLotteryResult = typeof lotteryResults.$inferInsert;

/**
 * 彩券行收藏資料表
 * 儲存使用者收藏的固定彩券行，每次開啟頁面時直接顯示當日共振指數
 */
export const favoriteStores = mysqlTable("favorite_stores", {
  id: int("id").autoincrement().primaryKey(),
  // 使用者 ID（可為 null，允許未登入用戶使用 sessionKey）
  userId: int("userId"),
  // Google Places ID（唯一識別彩券行）
  placeId: varchar("placeId", { length: 255 }).notNull(),
  // 彩券行名稱
  name: varchar("name", { length: 255 }).notNull(),
  // 地址
  address: varchar("address", { length: 500 }).notNull(),
  // 緯度
  lat: varchar("lat", { length: 30 }).notNull(),
  // 經度
  lng: varchar("lng", { length: 30 }).notNull(),
  // 備註（例如：「最近常去」）
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FavoriteStore = typeof favoriteStores.$inferSelect;
export type InsertFavoriteStore = typeof favoriteStores.$inferInsert;
