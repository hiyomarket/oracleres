import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, tinyint, bigint, uniqueIndex } from "drizzle-orm/mysql-core";

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

/**
 * 刮刮樂購買日誌資料表
 * 記錄每次購買的面額、地址、時辰、結果，用於長期統計分析
 */
export const scratchLogs = mysqlTable("scratch_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // 購買面額（100/200/300/500/1000/2000）
  denomination: int("denomination").notNull(),
  // 彩券行地址（可選）
  storeAddress: varchar("storeAddress", { length: 500 }),
  // 購買時辰（地支，例：申）
  purchaseHour: varchar("purchaseHour", { length: 10 }),
  // 購買時的天命共振分數（1-10）
  resonanceScore: int("resonanceScore"),
  // 是否中獎（0=未中，1=中獎）
  isWon: int("isWon").default(0).notNull(),
  // 中獎金額（元）
  wonAmount: int("wonAmount").default(0),
  // 備註
  note: varchar("note", { length: 300 }),
  // 風水地場等級（大吉/吉/平/凶/大凶）
  fengShuiGrade: varchar("fengShuiGrade", { length: 10 }),
  // 風水分數（0-100）
  fengShuiScore: int("fengShuiScore"),
  // 購買時間（UTC timestamp）
  purchasedAt: bigint("purchasedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScratchLog = typeof scratchLogs.$inferSelect;
export type InsertScratchLog = typeof scratchLogs.$inferInsert;

/**
 * 手串佩戴記錄資料表
 * 記錄每日佩戴的手串，長期追蹤手串與刷刷樂命中率的關聯
 */
export const braceletWearLogs = mysqlTable("bracelet_wear_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  // 佩戴日期（YYYY-MM-DD）
  wearDate: varchar("wearDate", { length: 12 }).notNull(),
  // 手串 ID（HS-A 等）
  braceletId: varchar("braceletId", { length: 10 }).notNull(),
  // 手串名稱
  braceletName: varchar("braceletName", { length: 100 }).notNull(),
  // 佩戴手（left=左手, right=右手）
  hand: mysqlEnum("hand", ["left", "right"]).notNull(),
  // 當日天干（用於統計天命對應）
  dayStem: varchar("dayStem", { length: 4 }),
  // 當日十神
  tenGod: varchar("tenGod", { length: 10 }),
  // 對應的刷刷樂購買日誌 ID（可選）
  scratchLogId: int("scratchLogId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BraceletWearLog = typeof braceletWearLogs.$inferSelect;
export type InsertBraceletWearLog = typeof braceletWearLogs.$inferInsert;

/**
 * 使用者個人命格資料表
 * 儲存每位使用者的八字/五行命格等重要資訊，用於個人化風水分析
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // 姓名
  displayName: varchar("displayName", { length: 100 }),
  // 出生地（城市/縣市）
  birthPlace: varchar("birthPlace", { length: 100 }),
  // 出生年月日（YYYY-MM-DD）
  birthDate: varchar("birthDate", { length: 12 }),
  // 出生時間（HH:MM，24小時制）
  birthTime: varchar("birthTime", { length: 8 }),
  // 出生時辰（地支，例：申）
  birthHour: varchar("birthHour", { length: 4 }),
  // 年柱（例：甲子）
  yearPillar: varchar("yearPillar", { length: 8 }),
  // 月柱（例：丙寅）
  monthPillar: varchar("monthPillar", { length: 8 }),
  // 日柱（例：庚午）
  dayPillar: varchar("dayPillar", { length: 8 }),
  // 時柱（例：壬申）
  hourPillar: varchar("hourPillar", { length: 8 }),
  // 日主五行（fire/earth/metal/wood/water）
  dayMasterElement: varchar("dayMasterElement", { length: 20 }),
  // 喜用神五行（逗號分隔，例：fire,earth）
  favorableElements: varchar("favorableElements", { length: 100 }),
  // 忌神五行（逗號分隔）
  unfavorableElements: varchar("unfavorableElements", { length: 100 }),
  // 職業
  occupation: varchar("occupation", { length: 200 }),
  // 農曆生日（例：甲子年 閏十月 初四日）
  birthLunar: varchar("birthLunar", { length: 100 }),
  // 個人備註
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * 邀請碼資料表
 * 主帳號（owner）可產生邀請碼，受邀者使用後才能進入系統
 */
export const inviteCodes = mysqlTable("invite_codes", {
  id: int("id").autoincrement().primaryKey(),
  // 邀請碼（8位英數字）
  code: varchar("code", { length: 16 }).notNull().unique(),
  // 建立者（主帳號 userId）
  createdBy: int("createdBy").notNull(),
  // 使用者（受邀者 userId，null 表示尚未使用）
  usedBy: int("usedBy"),
  // 備註（例：給誰的邀請碼）
  label: varchar("label", { length: 100 }),
  // 是否已使用
  isUsed: tinyint("isUsed").default(0).notNull(),
  // 過期時間（null 表示永不過期）
  expiresAt: timestamp("expiresAt"),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  // 命格預填（可選）
  presetDisplayName: varchar("presetDisplayName", { length: 100 }),
  presetBirthDate: varchar("presetBirthDate", { length: 12 }),
  presetBirthTime: varchar("presetBirthTime", { length: 8 }),
  presetDayMasterElement: varchar("presetDayMasterElement", { length: 20 }),
  presetFavorableElements: varchar("presetFavorableElements", { length: 100 }),
  presetUnfavorableElements: varchar("presetUnfavorableElements", { length: 100 }),
});
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;

/**
 * 使用者功能權限資料表
 * 主帳號可對每位使用者設定可用的功能模組與使用截止日期
 * 
 * 功能模組清單：
 *   oracle            - 擲筊（天命問卦）
 *   lottery           - 選號（天命選號）
 *   calendar          - 日曆（命理日曆）
 *   warroom           - 作戰室（基礎入口）
 *   warroom_divination - 作戰室 > 天命問掛
 *   warroom_outfit    - 作戰室 > 穿搭手串
 *   warroom_wealth    - 作戰室 > 財運羅盤
 *   warroom_dietary   - 作戰室 > 飲食建議
 *   weekly            - 週報
 *   stats             - 統計
 *   profile           - 命格資料
 */
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  // 被授權的使用者
  userId: int("userId").notNull(),
  // 功能模組 ID（見上方清單）
  feature: varchar("feature", { length: 50 }).notNull(),
  // 是否啟用（0=關閉, 1=開啟）
  enabled: tinyint("enabled").default(1).notNull(),
  // 使用截止日期（null 表示永久有效）
  expiresAt: timestamp("expiresAt"),
  // 備註（主帳號可填寫說明）
  note: varchar("note", { length: 200 }),
  // 授權者（主帳號 userId）
  grantedBy: int("grantedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // 每位使用者每個功能只有一筆記錄
  uniqueUserFeature: uniqueIndex("user_feature_idx").on(table.userId, table.feature),
}));
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;
