import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, tinyint, bigint, uniqueIndex, decimal } from "drizzle-orm/mysql-core";

/**
 * 會員方案資料表
 * 定義系統中的訂閱方案等級
 */
export const plans = mysqlTable("plans", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'basic', 'advanced', 'professional'
  name: varchar("name", { length: 100 }).notNull(), // '基礎方案', '進階方案', '專業方案'
  // 價格（DECIMAL，0 = 免費）
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  // 等級（用於權限比較，數字越大權限越高）
  level: int("level").notNull().default(1),
  description: text("description"),
  // 是否啟用此方案
  isActive: tinyint("isActive").notNull().default(1),
  // 訂閱此方案時贈送的積分
  bonusPoints: int("bonusPoints").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

/**
 * 功能模組資料表
 * 定義系統中每個可授權的功能，以及所需的最低方案等級
 */
export const features = mysqlTable("features", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'oracle', 'lottery', 'calendar', 'warroom', etc.
  name: varchar("name", { length: 100 }).notNull(), // '擲筊', '選號', '命理日曆'
  description: text("description"),
  // 所需最低方案等級（對應 plans.level）
  requiredPlanLevel: int("requiredPlanLevel").notNull().default(1),
  // 是否啟用此功能管理（false = 所有人皆可用）
  isManaged: tinyint("isManaged").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Feature = typeof features.$inferSelect;
export type InsertFeature = typeof features.$inferInsert;

/**
 * 功能模塊資料表（鳳凰計畫 - 新商業邏輯核心）
 * 定義系統中所有可獨立授權的「功能模塊」，是新的「產品」單位
 */
export const modules = mysqlTable("modules", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'module_profile', 'module_lottery'
  name: varchar("name", { length: 100 }).notNull(), // '【命格】', '【天命選號】'
  description: text("description"),
  icon: varchar("icon", { length: 10 }), // '🔮'
  // 分類：core=基礎免費模塊, addon=選購加値模塊
  category: mysqlEnum("category", ["core", "addon"]).notNull().default("addon"),
  // 用於後台拖拽排序的序位
  sortOrder: int("sortOrder").notNull().default(0),
  // 關鍵欄位：儲存舊 features 表 id 的陣列，建立新舊權限體系的映射關係
  containedFeatures: json("containedFeatures").$type<string[]>().notNull().default([]),
  // 前台導航路徑（如 /oracle, /lottery, /，空白=不顯示在主導航）
  navPath: varchar("navPath", { length: 100 }).default(""),
  // 是否啟用
  isActive: tinyint("isActive").notNull().default(1),
  // 是否為中央焦點模塊（眾星拱月佈局中的「太陽」）
  isCentral: tinyint("isCentral").notNull().default(0),
  // 父模塊 ID（建立父子層級關係，null = 頂層模塊）
  parentId: varchar("parentId", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;

/**
 * 方案-模塊關聯表（鳳凰計畫）
 * 多對多關聯表，描述一個方案包含了哪些功能模塊
 */
export const planModules = mysqlTable("plan_modules", {
  id: int("id").autoincrement().primaryKey(),
  planId: varchar("planId", { length: 50 }).notNull(),
  moduleId: varchar("moduleId", { length: 50 }).notNull(),
}, (table) => ({
  uniquePlanModule: uniqueIndex("plan_module_idx").on(table.planId, table.moduleId),
}));
export type PlanModule = typeof planModules.$inferSelect;
export type InsertPlanModule = typeof planModules.$inferInsert;

/**
 * 行銷活動資料表（鳳凰計畫）
 * 定義各種行銷活動，如折扣、贈送等
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // '周年慶折扣'
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: tinyint("isActive").notNull().default(1),
  // 規則類型：discount=折扣, giveaway=贈送模塊, plan_assign=指派方案
  ruleType: mysqlEnum("ruleType", ["discount", "giveaway", "plan_assign"]).notNull(),
  // 規則目標，例如 { "target_type": "plan", "target_id": "advanced_599" }
  ruleTarget: json("ruleTarget").$type<{ target_type: string; target_id?: string }>().notNull(),
  // 規則內容，例如 { "discount_percentage": 0.8 } 或 { "giveaway_module_id": "module_lottery", "duration_days": 30 }
  ruleValue: json("ruleValue").$type<Record<string, unknown>>().notNull(),
  // 是否為默認迎新活動（最多只能有一個為 true）
  // 新用戶首次登錄時，系統將自動套用此活動的獎勵
  isDefaultOnboarding: tinyint("isDefaultOnboarding").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * 用戶訂閱表（鳳凰計畫 - 取代舊權限設定的核心）
 * 記錄每個用戶當前訂閱了哪個方案，以及任何額外的、單獨購買的模塊
 */
export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // 用戶當前訂閱的主方案 ID（nullable）
  planId: varchar("planId", { length: 50 }),
  // 主方案的到期日（null = 永久有效）
  planExpiresAt: timestamp("planExpiresAt"),
  // 為用戶特殊追加的模塊及其到期日
  // 例如 [{ "module_id": "module_outfit", "expires_at": "2027-01-01" }]
  customModules: json("customModules").$type<Array<{ module_id: string; expires_at: string | null }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

/**
 * 積分流水帳資料表
 * 記錄每次積分的增加（如每日簽到）和減少（如兌換功能）
 */
export const pointsTransactions = mysqlTable("points_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 正數為獲得，負數為消耗
  amount: int("amount").notNull(),
  // 類型：daily_signin / feature_redemption / admin_grant / admin_deduct
  type: varchar("type", { length: 50 }).notNull(),
  description: varchar("description", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = typeof pointsTransactions.$inferInsert;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 當前方案 ID（對應 plans.id）
  planId: varchar("planId", { length: 50 }).notNull().default("basic"),
  // 方案到期日（null = 永久有效，適用基礎免費方案）
  planExpiresAt: timestamp("planExpiresAt"),
  // 積分餘額
  pointsBalance: int("pointsBalance").notNull().default(0),
  // 最後每日登入領取積分的日期（YYYY-MM-DD）
  lastDailyCheckIn: varchar("lastDailyCheckIn", { length: 10 }),
  // 連續簽到天數（累積）
  signinStreak: int("signinStreak").notNull().default(0),
  // 折扣券暫存（JSON 陣列，待支付系統接入時使用）
  // 例如 [{ "campaign_id": 1, "discount_percentage": 0.8, "expires_at": "2027-01-01" }]
  availableDiscounts: json("availableDiscounts").$type<Array<{ campaign_id: number; discount_percentage?: number; expires_at: string | null }>>(),
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
  // 生命靈數（用於管理員篩選，計算自 birthDate）
  lifePathNumber: int("lifePathNumber"),
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
/**
 * 訂閱操作審計日誌表（鳳凰計畫）
 * 記錄每次管理員為用戶指派方案的操作，供未來審計追溯
 */
export const subscriptionLogs = mysqlTable("subscription_logs", {
  id: int("id").autoincrement().primaryKey(),
  // 操作者（管理員 userId）
  operatorId: int("operatorId").notNull(),
  // 目標用戶 userId
  targetUserId: int("targetUserId").notNull(),
  // 操作類型：assign=指派方案, revoke=撤銷方案, add_module=追加模塊, remove_module=移除模塊
  action: varchar("action", { length: 50 }).notNull(),
  // 操作詳情（JSON，記錄 planId、expiresAt、customModules 等）
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SubscriptionLog = typeof subscriptionLogs.$inferSelect;
export type InsertSubscriptionLog = typeof subscriptionLogs.$inferInsert;

/**
 * 兌換碼資料表（鳳凰計畫 - 行銷活動兌換碼）
 * 每個行銷活動可產生多個兌換碼，用戶兌換後獲得對應權益
 */
export const redemptionCodes = mysqlTable("redemption_codes", {
  id: int("id").autoincrement().primaryKey(),
  // 關聯的行銷活動 ID
  campaignId: int("campaignId").notNull(),
  // 兌換碼（唯一，人類可讀，如 ANNIVERSARY-A8X7）
  code: varchar("code", { length: 50 }).notNull().unique(),
  // 是否已被使用
  isUsed: tinyint("isUsed").notNull().default(0),
  // 使用者 userId（null = 尚未使用）
  usedBy: int("usedBy"),
  // 使用時間
  usedAt: timestamp("usedAt"),
  // 是否已作廢（管理員手動作廢）
  isVoided: tinyint("isVoided").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RedemptionCode = typeof redemptionCodes.$inferSelect;
export type InsertRedemptionCode = typeof redemptionCodes.$inferInsert;

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

/**
 * 客群分組資料表
 * 管理員可建立分組，將用戶分配到不同群組進行批量管理
 */
export const userGroups = mysqlTable("user_groups", {
  id: int("id").autoincrement().primaryKey(),
  // 分組名稱（例：家人群組、靈數1群組）
  name: varchar("name", { length: 100 }).notNull(),
  // 分組描述
  description: text("description"),
  // 分組顏色標籤（用於 UI 顯示）
  color: varchar("color", { length: 30 }).default("amber"),
  // 分組圖示 emoji
  icon: varchar("icon", { length: 50 }).default("👥"),
  // 建立者（管理員 userId）
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserGroup = typeof userGroups.$inferSelect;
export type InsertUserGroup = typeof userGroups.$inferInsert;

/**
 * 客群分組成員資料表
 * 記錄每個用戶屬於哪些分組
 */
export const userGroupMembers = mysqlTable("user_group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  userId: int("userId").notNull(),
  // 備注（例：這位是我媽媽）
  note: varchar("note", { length: 200 }),
  addedBy: int("addedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  uniqueGroupUser: uniqueIndex("group_user_idx").on(table.groupId, table.userId),
}));
export type UserGroupMember = typeof userGroupMembers.$inferSelect;
export type InsertUserGroupMember = typeof userGroupMembers.$inferInsert;

/**
 * 虛擬衣櫥衣物資料表
 * 儲存用戶的個人衣物，用於 AI 穿搭建議從衣櫥中挑選
 */
export const wardrobeItems = mysqlTable("wardrobe_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 衣物名稱（例：白色棉質上衣、深藍牛仔褲）
  name: varchar("name", { length: 100 }).notNull(),
  // 衣物類型：upper（上半身）/ lower（下半身）/ shoes（鞋子）/ outer（外套）/ accessory（配件）
  category: varchar("category", { length: 30 }).notNull().default("upper"),
  // 主色系（例：白色、深藍、紅色）
  color: varchar("color", { length: 50 }).notNull(),
  // 五行屬性（木/火/土/金/水）
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  // 材質（例：棉、麻、絲、毛、化纖）
  material: varchar("material", { length: 50 }),
  // 場合標籤（工作/休閒/正式/運動/約會）
  occasion: varchar("occasion", { length: 50 }),
  // 衣物圖片 URL（S3）
  imageUrl: text("imageUrl"),
  // 備注
  note: varchar("note", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;
