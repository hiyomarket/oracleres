import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, tinyint, bigint, uniqueIndex, decimal, float, boolean } from "drizzle-orm/mysql-core";

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
  // 訂閱此方案時贈送的積分（舊欄位，保留相容性）
  bonusPoints: int("bonusPoints").notNull().default(0),
  // 【鳳凰計畫】首次訂閱贈送天命幣數量
  firstSubscriptionBonusCoins: int("firstSubscriptionBonusCoins").notNull().default(0),
  // 【鳳凰計畫】每月續訂贈送天命幣數量
  monthlyRenewalBonusCoins: int("monthlyRenewalBonusCoins").notNull().default(0),
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
  // 【鳳凰計畫】單次使用此功能消耗的天命幣數量（0 = 免費，NULL = 不適用）
  coinCostPerUse: int("coinCostPerUse").default(0),
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
  // 顯示位置：main=主功能列表（預設）, profile=個人下拉選單, both=兩處都顯示
  displayLocation: mysqlEnum("displayLocation", ["main", "profile", "both"]).notNull().default("main"),
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
  // 類型：daily_signin / feature_redemption / admin_grant / admin_deduct / spend / bonus / top-up
  type: varchar("type", { length: 50 }).notNull(),
  description: varchar("description", { length: 200 }),
  // 【鳳凰計畫】對應的功能 ID（如 topicAdvice / deepRead / wardrobe_scan 等）
  featureId: varchar("featureId", { length: 50 }),
  // 【鳳凰計畫】充値訂單 ID（金流回調用）
  paymentOrderId: varchar("paymentOrderId", { length: 100 }),
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
  role: mysqlEnum("role", ["user", "expert", "admin", "viewer"]).default("user").notNull(),
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
  // 遊戲點餘額（天命娛樂城專用貨幣）
  gameCoins: int("gameCoins").notNull().default(0),
  // 靈石（遊戲綁定貨幣，每日任務/活動獲得，可在靈石專區消費）
  gameStones: int("gameStones").notNull().default(0),
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
  // 彩券類型: 'lottery'(大樂透) | 'scratch'(刮刮樂) | 'bigLotto'(大樂透新) | 'powerball'(威力彩) | 'threeStar'(三星彩) | 'fourStar'(四星彩)
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
  // 性別（male/female/other）
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  // 個人備註
  notes: text("notes"),
  // 本命五行比例（0-100 整數，由八字計算得出）
  natalWood: int("natalWood"),
  natalFire: int("natalFire"),
  natalEarth: int("natalEarth"),
  natalMetal: int("natalMetal"),
  natalWater: int("natalWater"),
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
  // AI 分析結果（JSON）：包含 detectedColors / energyExplanation / auraBoost 等
  aiAnalysis: text("aiAnalysis"),
  // 對 Aura Score 的加成分數（0-10），由 AI 分析後寫入
  auraBoost: int("auraBoost").default(0),
  // 標記是否由 AI 拍照分析新增
  fromPhoto: int("fromPhoto").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WardrobeItem = typeof wardrobeItems.$inferSelect;
export type InsertWardrobeItem = typeof wardrobeItems.$inferInsert;

// ============================================================
// 後台管理：能量模擬器計算規則設定表
// ============================================================
export const auraEngineConfig = mysqlTable("aura_engine_config", {
  id: int("id").autoincrement().primaryKey(),
  // 規則分類：category_weights / boost_ratios / score_limits / innate_weights
  category: varchar("category", { length: 50 }).notNull(),
  // 規則鍵（例：upper, outer, direct_match_ratio）
  configKey: varchar("configKey", { length: 80 }).notNull(),
  // 規則值（JSON 字串，可存數字/物件）
  configValue: text("configValue").notNull(),
  // 顯示名稱（中文）
  label: varchar("label", { length: 100 }).notNull(),
  // 說明文字
  description: varchar("description", { length: 300 }),
  // 值類型：number / json / boolean
  valueType: varchar("valueType", { length: 20 }).notNull().default("number"),
  // 最小值（number 類型用）
  minValue: decimal("minValue", { precision: 10, scale: 2 }),
  // 最大值（number 類型用）
  maxValue: decimal("maxValue", { precision: 10, scale: 2 }),
  // 步進值（number 類型用）
  step: decimal("step", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AuraEngineConfig = typeof auraEngineConfig.$inferSelect;
export type InsertAuraEngineConfig = typeof auraEngineConfig.$inferInsert;

// ============================================================
// 後台管理：餐廳分類設定表
// ============================================================
export const restaurantCategories = mysqlTable("restaurant_categories", {
  id: int("id").autoincrement().primaryKey(),
  // 唯一識別碼（例：all, local_snack, brunch）
  categoryId: varchar("categoryId", { length: 50 }).notNull().unique(),
  // 顯示名稱（例：全部、小吃、早午餐）
  label: varchar("label", { length: 50 }).notNull(),
  // Emoji 圖示
  emoji: varchar("emoji", { length: 10 }).notNull().default("🍽️"),
  // Google Places API includedTypes（JSON 陣列字串）
  types: text("types").notNull(),
  // 搜尋文字後綴（例：小吃、早午餐）
  textSuffix: varchar("textSuffix", { length: 50 }),
  // 排序順序（越小越前面）
  sortOrder: int("sortOrder").notNull().default(99),
  // 是否啟用
  enabled: tinyint("enabled").notNull().default(1),
  // 是否為系統預設（系統預設不可刪除）
  isDefault: tinyint("isDefault").notNull().default(0),
  // 時段自動啟用：是否開啟時段控制
  scheduleEnabled: tinyint("scheduleEnabled").notNull().default(0),
  // 時段起始小時（0-23，例：18 代表 18:00）
  scheduleStartHour: int("scheduleStartHour").notNull().default(0),
  // 時段結束小時（0-23，例：23 代表 23:59）
  scheduleEndHour: int("scheduleEndHour").notNull().default(23),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RestaurantCategory = typeof restaurantCategories.$inferSelect;
export type InsertRestaurantCategory = typeof restaurantCategories.$inferInsert;

// ============================================================
// 後台管理：能量規則歷史快照表
// ============================================================
export const auraRuleHistory = mysqlTable("aura_rule_history", {
  id: int("id").autoincrement().primaryKey(),
  // 快照標籤（管理員自訂名稱，例：「調整手串權重 v2」）
  snapshotLabel: varchar("snapshotLabel", { length: 100 }).notNull(),
  // 快照資料（JSON 字串，儲存當時所有規則的完整副本）
  snapshotData: text("snapshotData").notNull(),
  // 建立者（admin user id）
  createdBy: varchar("createdBy", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuraRuleHistory = typeof auraRuleHistory.$inferSelect;
export type InsertAuraRuleHistory = typeof auraRuleHistory.$inferInsert;

// ============================================================
// 後台管理：自訂手串/配飾資料庫
// ============================================================
export const customBracelets = mysqlTable("custom_bracelets", {
  id: int("id").autoincrement().primaryKey(),
  // 手串代碼（例：HS-A、CUSTOM-01）
  code: varchar("code", { length: 30 }).notNull().unique(),
  // 名稱
  name: varchar("name", { length: 100 }).notNull(),
  // 主要五行屬性（木/火/土/金/水）
  element: varchar("element", { length: 10 }).notNull(),
  // 顏色描述
  color: varchar("color", { length: 100 }).notNull(),
  // 功能說明
  functionDesc: varchar("functionDesc", { length: 200 }).notNull(),
  // 戰術角色（JSON 物件，key 為情境，value 為角色說明）
  tacticalRoles: text("tacticalRoles").notNull(),
  // 是否啟用（停用後不出現在推薦清單）
  enabled: tinyint("enabled").notNull().default(1),
  // 排序
  sortOrder: int("sortOrder").notNull().default(99),
  // 是否為系統內建（內建不可刪除）
  isBuiltin: tinyint("isBuiltin").notNull().default(0),
  // 建議搭配：JSON 陣列，存其他手串/配飾的 code（例：["HS-B","HS-C"]）
  pairingItems: text("pairingItems"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CustomBracelet = typeof customBracelets.$inferSelect;
export type InsertCustomBracelet = typeof customBracelets.$inferInsert;

// ============================================================
// 天命問卜：問卜歷史記錄
// ============================================================
export const divinationSessions = mysqlTable("divination_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 問卜主題（work/love/health/wealth/decision）
  topic: varchar("topic", { length: 20 }).notNull(),
  // 主題中文名稱
  topicName: varchar("topicName", { length: 20 }).notNull(),
  // 用戶輸入的具體問題（可為空）
  question: text("question"),
  // AI 回答（JSON 格式，含分段結構）
  adviceJson: text("adviceJson").notNull(),
  // 命理上下文（JSON）
  contextJson: text("contextJson").notNull(),
  // 問卜日期（YYYY-MM-DD，台灣時區）
  dateString: varchar("dateString", { length: 12 }).notNull(),
  // 十神能量分數（1-10）
  energyScore: int("energyScore").notNull().default(5),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DivinationSession = typeof divinationSessions.$inferSelect;
export type InsertDivinationSession = typeof divinationSessions.$inferInsert;

// ============================================================
// 後台管理：策略引擎閾值設定
// ============================================================
export const strategyThresholds = mysqlTable("strategy_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  // 策略名稱（強勢補弱/順勢生旺/借力打力/食神生財/均衡守成）
  strategyName: varchar("strategyName", { length: 20 }).notNull().unique(),
  // 策略說明
  description: varchar("description", { length: 200 }).notNull(),
  // 主攻目標（補弱/生旺/借力/生財/守成）
  primaryTarget: varchar("primaryTarget", { length: 20 }).notNull(),
  // 觸發閾值：弱勢元素佔比下限（0-100 整數，代表百分比）
  weakThreshold: int("weakThreshold").notNull().default(15),
  // 觸發閾值：強勢元素佔比上限（0-100 整數，代表百分比）
  strongThreshold: int("strongThreshold").notNull().default(30),
  // 優先級（數字越小越優先）
  priority: int("priority").notNull().default(99),
  // 是否啟用
  enabled: tinyint("enabled").notNull().default(1),
  // 備註（管理員筆記）
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type StrategyThreshold = typeof strategyThresholds.$inferSelect;
export type InsertStrategyThreshold = typeof strategyThresholds.$inferInsert;

// ============================================================
// 飲食羅盤 V11.0：飲食日誌
// ============================================================
export const dietaryLogs = mysqlTable("dietary_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 日期字串（YYYY-MM-DD，台灣時區）
  logDate: varchar("logDate", { length: 12 }).notNull(),
  // 餐別（breakfast/lunch/dinner/snack）
  mealType: varchar("mealType", { length: 20 }).notNull(),
  // 攝取的五行元素（木/火/土/金/水）
  consumedElement: varchar("consumedElement", { length: 10 }).notNull(),
  // 攝取的食物名稱（例：炒青菜、紅燒肉）
  consumedFood: varchar("consumedFood", { length: 100 }).notNull(),
  // 用戶回饋（like/neutral/dislike）
  preference: varchar("preference", { length: 10 }).default("neutral"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DietaryLog = typeof dietaryLogs.$inferSelect;
export type InsertDietaryLog = typeof dietaryLogs.$inferInsert;

// ============================================================
// 飲食羅盤 V11.0：用戶飲食偏好設定
// ============================================================
export const userDietPreferences = mysqlTable("user_diet_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // 健康標籤（JSON 陣列，例：["vegetarian","no_seafood","no_spicy"]）
  healthTags: varchar("healthTags", { length: 500 }).default("[]"),
  // 預算偏好（budget/mid/premium，對應 Google price_level 1/2/3）
  budgetPreference: varchar("budgetPreference", { length: 20 }).default("mid"),
  // 不喜歡的五行元素（JSON 陣列，例：["金","水"]）
  dislikedElements: varchar("dislikedElements", { length: 200 }).default("[]"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserDietPreference = typeof userDietPreferences.$inferSelect;
export type InsertUserDietPreference = typeof userDietPreferences.$inferInsert;

// ============================================================
// 財運羅盤 V4.22：財運日記
// ============================================================
export const wealthJournal = mysqlTable("wealth_journal", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 日期（台灣時間 YYYY-MM-DD）
  date: varchar("date", { length: 10 }).notNull(),
  // 今日偏財指數（1-10）
  lotteryScore: int("lotteryScore").notNull().default(5),
  // 今日十神（偏財/正財/食神等）
  tenGod: varchar("tenGod", { length: 20 }).default(""),
  // 用戶心得（最多 500 字）
  note: varchar("note", { length: 500 }).default(""),
  // 今日是否有購彩（true/false）
  didBuyLottery: tinyint("didBuyLottery").default(0),
  // 購彩金額（元）
  lotteryAmount: int("lotteryAmount").default(0),
  // 購彩結果（win/lose/pending）
  lotteryResult: varchar("lotteryResult", { length: 20 }).default("pending"),
  // 中獎金額（元）
  winAmount: int("winAmount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WealthJournal = typeof wealthJournal.$inferSelect;
export type InsertWealthJournal = typeof wealthJournal.$inferInsert;

/**
 * 貨幣兌換日誌
 * 記錄積分 ↔ 遊戲點的所有兌換操作
 */
export const currencyExchangeLogs = mysqlTable("currency_exchange_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 兌換方向
  direction: mysqlEnum("direction", ["points_to_coins", "coins_to_points"]).notNull(),
  // 積分變動量（正數=獲得，負數=扣除）
  pointsAmount: int("pointsAmount").notNull(),
  // 遊戲點變動量（正數=獲得，負數=扣除）
  gameCoinsAmount: int("gameCoinsAmount").notNull(),
  // 兌換比率（快照）
  exchangeRate: decimal("exchangeRate", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CurrencyExchangeLog = typeof currencyExchangeLogs.$inferSelect;
export type InsertCurrencyExchangeLog = typeof currencyExchangeLogs.$inferInsert;

/**
 * WBC 賽事資料表
 * 管理員建立並管理每一場 WBC 比賽
 */
export const wbcMatches = mysqlTable("wbc_matches", {
  id: int("id").autoincrement().primaryKey(),
  // 客場隊伍名稱
  teamA: varchar("teamA", { length: 50 }).notNull(),
  // 主場隊伍名稱
  teamB: varchar("teamB", { length: 50 }).notNull(),
  // 客場隊伍旗幟 emoji
  teamAFlag: varchar("teamAFlag", { length: 10 }).notNull().default("🏳️"),
  // 主場隊伍旗幟 emoji
  teamBFlag: varchar("teamBFlag", { length: 10 }).notNull().default("🏳️"),
  // 比賽時間（UTC 時間戳）
  matchTime: bigint("matchTime", { mode: "number" }).notNull(),
  // 比賽場地
  venue: varchar("venue", { length: 100 }).notNull().default(""),
  // 分組（A/B/C/D/複賽/決賽）
  poolGroup: varchar("poolGroup", { length: 20 }).notNull().default(""),
  // 客場隊伍勝利賠率（固定賠率）
  rateA: decimal("rateA", { precision: 5, scale: 2 }).notNull().default("1.90"),
  // 主場隊伍勝利賠率（固定賠率）
  rateB: decimal("rateB", { precision: 5, scale: 2 }).notNull().default("1.90"),
  // 比賽狀態
  status: mysqlEnum("status", ["pending", "live", "finished", "cancelled"]).notNull().default("pending"),
  // 獲勝隊伍（A/B/draw，結算後填入）
  winningTeam: varchar("winningTeam", { length: 5 }),
  // 最終比分（快照，例如 "3-2"）
  finalScore: varchar("finalScore", { length: 20 }),
  // 下注截止時間（比賽開始前幾分鐘截止，預設 30 分鐘）
  bettingDeadlineMinutes: int("bettingDeadlineMinutes").notNull().default(30),
  // AI 比分查詢重試次數（超過 MAX_AI_RETRY 次自動取消，防止無限消耗算力）
  aiRetryCount: int("aiRetryCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WbcMatch = typeof wbcMatches.$inferSelect;
export type InsertWbcMatch = typeof wbcMatches.$inferInsert;

/**
 * WBC 下注記錄
 * 記錄每位用戶的每一筆下注
 */
export const wbcBets = mysqlTable("wbc_bets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matchId: int("matchId").notNull(),
  // 玩法類型：winlose=單場勝負, spread=分差競猜, combo=天命組合
  betType: mysqlEnum("betType", ["winlose", "spread", "combo"]).notNull().default("winlose"),
  // 押注選項（A=客場隊, B=主場隊, spread_1_3=1-3分差, spread_4_6=4-6分差, spread_7plus=7+分差, draw=平局）
  betOn: varchar("betOn", { length: 30 }).notNull(),
  // 下注遊戲點數量
  amount: int("amount").notNull(),
  // 適用賠率（快照）
  appliedRate: decimal("appliedRate", { precision: 5, scale: 2 }).notNull(),
  // 潛在獲利（amount * appliedRate，快照）
  potentialWin: int("potentialWin").notNull(),
  // 下注狀態
  status: mysqlEnum("status", ["placed", "won", "lost", "cancelled"]).notNull().default("placed"),
  // 實際獲得遊戲點（結算後填入）
  actualWin: int("actualWin").notNull().default(0),
  // 組合投注的關聯 matchId 列表（JSON，僅 combo 類型使用）
  comboMatchIds: json("comboMatchIds").$type<number[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WbcBet = typeof wbcBets.$inferSelect;
export type InsertWbcBet = typeof wbcBets.$inferInsert;

/**
 * 行銷系統配置
 * 儲存娛樂城的全域配置（兌換比率、每日限額等）
 */
export const marketingConfig = mysqlTable("marketing_config", {
  id: int("id").autoincrement().primaryKey(),
  // 配置鍵
  configKey: varchar("configKey", { length: 50 }).notNull().unique(),
  // 配置值（JSON 格式）
  configValue: json("configValue").notNull(),
  // 描述
  description: varchar("description", { length: 200 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MarketingConfig = typeof marketingConfig.$inferSelect;
export type InsertMarketingConfig = typeof marketingConfig.$inferInsert;

/**
 * 用戶個人通知
 * 儲存發給每個用戶的個人通知（WBC 競猜結算、系統公告等）
 */
export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  // 接收通知的用戶 ID
  userId: varchar("userId", { length: 100 }).notNull(),
  // 通知類型
  type: mysqlEnum("type", ["wbc_result", "system", "reward", "announcement", "daily_briefing", "fortune_reminder", "scratch_milestone", "booking_update"]).notNull().default("system"),
  // 通知標題
  title: varchar("title", { length: 200 }).notNull(),
  // 通知內容
  content: text("content").notNull(),
  // 相關連結（可選，如 /casino/wbc）
  linkUrl: varchar("linkUrl", { length: 500 }),
  // 是否已讀
  isRead: tinyint("isRead").notNull().default(0),
  // 相關資源 ID（如 matchId）
  relatedId: varchar("relatedId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

/**
 * 功能兌換方案設定表
 * 後台管理員設定可供用戶兌換/購買的功能模塊方案
 */
export const featurePlans = mysqlTable("feature_plans", {
  id: varchar("id", { length: 50 }).primaryKey(), // 'plan_warroom', 'plan_lottery_pro'
  // 對應的模塊 ID（對應 modules.id）
  moduleId: varchar("moduleId", { length: 50 }).notNull(),
  // 顯示名稱
  name: varchar("name", { length: 100 }).notNull(),
  // 功能說明
  description: text("description"),
  // 積分兌換價格（null = 不開放積分兌換）
  points3Days: int("points3Days"),   // 3天所需積分
  points7Days: int("points7Days"),   // 7天所需積分
  points15Days: int("points15Days"), // 15天所需積分
  points30Days: int("points30Days"), // 30天所需積分
  // 付費購買外部商城連結（null = 不開放付費購買）
  shopUrl: varchar("shopUrl", { length: 500 }),
  // 是否開放積分兌換
  allowPointsRedemption: tinyint("allowPointsRedemption").notNull().default(1),
  // 是否開放付費購買
  allowPurchase: tinyint("allowPurchase").notNull().default(1),
  // 是否啟用（false = 不在兌換中心顯示）
  isActive: tinyint("isActive").notNull().default(1),
  // 排序
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FeaturePlan = typeof featurePlans.$inferSelect;
export type InsertFeaturePlan = typeof featurePlans.$inferInsert;

/**
 * 用戶功能兌換紀錄表
 * 記錄每次積分兌換或管理員核發的功能天數
 */
export const featureRedemptions = mysqlTable("feature_redemptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 對應的功能兌換方案 ID
  featurePlanId: varchar("featurePlanId", { length: 50 }).notNull(),
  // 對應的模塊 ID
  moduleId: varchar("moduleId", { length: 50 }).notNull(),
  // 兌換天數
  durationDays: int("durationDays").notNull(),
  // 消耗積分（0 = 管理員免費核發）
  pointsSpent: int("pointsSpent").notNull().default(0),
  // 來源：points=積分兌換, purchase=付費購買核發, admin=管理員手動核發
  source: mysqlEnum("source", ["points", "purchase", "admin"]).notNull().default("points"),
  // 兌換前的到期時間（用於顯示「延長前」資訊）
  previousExpiresAt: timestamp("previousExpiresAt"),
  // 兌換後的新到期時間
  newExpiresAt: timestamp("newExpiresAt").notNull(),
  // 備註（管理員核發時可填寫）
  note: varchar("note", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type FeatureRedemption = typeof featureRedemptions.$inferSelect;
export type InsertFeatureRedemption = typeof featureRedemptions.$inferInsert;

/**
 * 付費訂單表
 * 用戶在外部商城購買後，回到系統填入訂單號等待管理員審核
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 對應的功能兌換方案 ID
  featurePlanId: varchar("featurePlanId", { length: 50 }).notNull(),
  // 對應的模塊 ID
  moduleId: varchar("moduleId", { length: 50 }).notNull(),
  // 用戶選擇的天數（15 或 30）
  durationDays: int("durationDays").notNull(),
  // 用戶在外部商城的訂單號
  externalOrderId: varchar("externalOrderId", { length: 200 }).notNull(),
  // 用戶備註
  userNote: varchar("userNote", { length: 500 }),
  // 審核狀態：pending=待審核, approved=已核發, rejected=已拒絕
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  // 管理員拒絕原因
  rejectReason: varchar("rejectReason", { length: 300 }),
  // 審核時間
  reviewedAt: timestamp("reviewedAt"),
  // 審核管理員 ID
  reviewedBy: int("reviewedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * 全站懸浮廣告/公告表
 * 管理員可新增、編輯、啟用/停用全站懸浮橫幅
 */
export const siteBanners = mysqlTable("site_banners", {
  id: int("id").autoincrement().primaryKey(),
  // 標題（顯示在橫幅左側）
  title: varchar("title", { length: 100 }).notNull(),
  // 內容文字
  content: varchar("content", { length: 300 }).notNull(),
  // 點擊連結（可選）
  linkUrl: varchar("linkUrl", { length: 500 }),
  // 連結文字（如「查看詳情」）
  linkText: varchar("linkText", { length: 50 }),
  // 圖示（emoji 或 lucide icon name）
  icon: varchar("icon", { length: 50 }).default("🔔"),
  // 類型：info=一般資訊, warning=警告, success=成功, promo=促銷
  type: mysqlEnum("type", ["info", "warning", "success", "promo"]).notNull().default("info"),
  // 是否啟用
  isActive: tinyint("isActive").notNull().default(1),
  // 排序（數字越小越優先）
  sortOrder: int("sortOrder").notNull().default(0),
  // 顯示開始時間（null=立即）
  startsAt: timestamp("startsAt"),
  // 顯示結束時間（null=永久）
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SiteBanner = typeof siteBanners.$inferSelect;
export type InsertSiteBanner = typeof siteBanners.$inferInsert;

/**
 * 專家資料表 (Project Nexus)
 * 存儲專家的公開資訊和狀態
 */
export const experts = mysqlTable("experts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  publicName: varchar("publicName", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }),
  bio: text("bio"),
  profileImageUrl: varchar("profileImageUrl", { length: 500 }),
  coverImageUrl: varchar("coverImageUrl", { length: 500 }),
  tags: json("tags").$type<string[]>().default([]),
  // 狀態： active=公開發佈, inactive=暫停接客, pending_review=待審核
  status: mysqlEnum("status", ["active", "inactive", "pending_review"]).notNull().default("pending_review"),
  // 專業領域標籤
  specialties: json("specialties").$type<string[]>().default([]),
  // 服務語言
  languages: varchar("languages", { length: 200 }).default("中文"),
  // 諮詢方式 (video/voice/text/in_person)
  consultationModes: json("consultationModes").$type<string[]>().default(["video"]),
  // 社群連結
  socialLinks: json("socialLinks").$type<Record<string, string>>().default({}),
  // 收費範圍
  priceMin: int("priceMin").default(0),
  priceMax: int("priceMax").default(0),
  // 收款 QR Code 圖片
  paymentQrUrl: varchar("paymentQrUrl", { length: 500 }),
  // 【v10.0】專屬網址（slug），如 /experts/william
  slug: varchar("slug", { length: 100 }).unique(),
  // 【v10.0】HTML 格式的個人介紹（富文本）
  bioHtml: text("bioHtml"),
  // 【v10.0】後台自訂模塊名稱（如「天命聯盟」可改名）
  sectionTitle: varchar("sectionTitle", { length: 100 }),
  // 累計評分平均分
  ratingAvg: decimal("ratingAvg", { precision: 3, scale: 2 }).default("0.00"),
  ratingCount: int("ratingCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Expert = typeof experts.$inferSelect;
export type InsertExpert = typeof experts.$inferInsert;

/**
 * 專家服務項目表
 */
export const expertServices = mysqlTable("expert_services", {
  id: int("id").autoincrement().primaryKey(),
  expertId: int("expertId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  durationMinutes: int("durationMinutes").notNull().default(60),
  price: int("price").notNull().default(0),
  type: mysqlEnum("type", ["online", "offline"]).notNull().default("online"),
  isActive: tinyint("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExpertService = typeof expertServices.$inferSelect;
export type InsertExpertService = typeof expertServices.$inferInsert;

/**
 * 專家可預約時間表
 */
export const expertAvailability = mysqlTable("expert_availability", {
  id: int("id").autoincrement().primaryKey(),
  expertId: int("expertId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  isBooked: tinyint("isBooked").notNull().default(0),
  bookingId: int("bookingId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExpertAvailability = typeof expertAvailability.$inferSelect;
export type InsertExpertAvailability = typeof expertAvailability.$inferInsert;

/**
 * 預約訂單表
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  expertId: int("expertId").notNull(),
  serviceId: int("serviceId").notNull(),
  bookingTime: timestamp("bookingTime").notNull(),
  // 【v10.0】預約結束時間（自動依服務時長推算）
  endTime: timestamp("endTime"),
  // 狀態： pending_payment=待付款, confirmed=已確認, completed=已完成, cancelled=已取消
  status: mysqlEnum("status", ["pending_payment", "confirmed", "completed", "cancelled"]).notNull().default("pending_payment"),
  paymentProofUrl: varchar("paymentProofUrl", { length: 500 }),
  // 【v10.0】付款方式説明（如「轉帳、LINE Pay」）
  paymentNote: text("paymentNote"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * 私訊表
 */
export const privateMessages = mysqlTable("private_messages", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull(),
  senderId: int("senderId").notNull(),
  content: text("content").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }),
  // 已讀功能：對方是否已讀
  isRead: tinyint("isRead").notNull().default(0),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PrivateMessage = typeof privateMessages.$inferSelect;
export type InsertPrivateMessage = typeof privateMessages.$inferInsert;
/**
 * 用戶傳訊給天命管理團隊（主帳號）
 * 保存三天，三天無回應自動清除
 */
export const teamMessages = mysqlTable("team_messages", {
  id: int("id").autoincrement().primaryKey(),
  // 發送者（用戶）
  userId: int("userId").notNull(),
  // 訊息內容
  content: text("content").notNull(),
  // 方向：user_to_team = 用戶發給團隊，team_to_user = 團隊回覆用戶
  direction: mysqlEnum("direction", ["user_to_team", "team_to_user"]).notNull().default("user_to_team"),
  // 已讀標記（用戶端看到團隊回覆後標記已讀）
  isRead: tinyint("isRead").notNull().default(0),
  readAt: timestamp("readAt"),
  // 自動清除時間（三天後）
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TeamMessage = typeof teamMessages.$inferSelect;
export type InsertTeamMessage = typeof teamMessages.$inferInsert;

/**
 * 評論表
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId").notNull().unique(),
  userId: int("userId").notNull(),
  expertId: int("expertId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── 命理師申請 ──────────────────────────────────────────────────────────────
export const expertApplications = mysqlTable("expert_applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 申請者填寫的公開名稱
  publicName: varchar("publicName", { length: 100 }).notNull(),
  // 申請理由/自我介紹
  motivation: text("motivation"),
  // 申請狀態：pending=待審核, approved=已核准, rejected=已拒絕
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  // 管理員備註
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpertApplication = typeof expertApplications.$inferSelect;
export type InsertExpertApplication = typeof expertApplications.$inferInsert;

/**
 * 專家行事歷活動表（線下課程/活動公告）
 */
export const expertCalendarEvents = mysqlTable("expert_calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  expertId: int("expertId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("eventDate").notNull(),
  endDate: timestamp("endDate"),
  // 活動類型：offline=線下活動, online=線上課程, announcement=公告
  eventType: mysqlEnum("eventType", ["offline", "online", "announcement"]).notNull().default("offline"),
  location: varchar("location", { length: 300 }),
  maxAttendees: int("maxAttendees"),
  price: int("price").default(0),
  isPublic: tinyint("isPublic").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ExpertCalendarEvent = typeof expertCalendarEvents.$inferSelect;
export type InsertExpertCalendarEvent = typeof expertCalendarEvents.$inferInsert;

/**
 * 系統設定表（可儲存如「天命聯盟」模塊名稱等全域設定）
 */
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  description: varchar("description", { length: 300 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * 特殊存取 Token 資料表
 * 供 AI 系統或無法完成 OAuth 登入的特殊渠道使用
 * 管理員可生成/廢止 Token，Token 持有者獲得 viewer 等級的唯讀存取權
 */
export const tokenAccessLogs = mysqlTable("token_access_logs", {
  id: int("id").primaryKey().autoincrement(),
  tokenId: int("token_id").notNull(),
  ip: varchar("ip", { length: 64 }),
  path: varchar("path", { length: 255 }).default("/ai-view"),
  accessedAt: timestamp("accessed_at").defaultNow(),
});

export const accessTokens = mysqlTable("access_tokens", {
  id: int("id").autoincrement().primaryKey(),
  // Token 值（隨機生成的 32 字元 hex 字串）
  token: varchar("token", { length: 64 }).notNull().unique(),
  // Token 名稱（方便管理員識別用途）
  name: varchar("name", { length: 100 }).notNull(),
  // 描述（說明此 Token 的用途）
  description: varchar("description", { length: 300 }),
  // 是否啟用
  isActive: tinyint("isActive").notNull().default(1),
  // 建立者（管理員 userId）
  createdBy: int("createdBy").notNull(),
  // 到期時間（null = 永不過期）
  expiresAt: timestamp("expiresAt"),
  // 最後使用時間
  lastUsedAt: timestamp("lastUsedAt"),
  // 使用次數
  useCount: int("useCount").notNull().default(0),
  // 開放模組（JSON 陣列字串，例如 '["daily","tarot","wealth"]'）
  // 可選項目：daily（運勢摘要）、tarot（塔羅牌）、wealth（偶財指數）、hourly（時辰能量）
  // null = 全部開放
  allowedModules: text("allowedModules"),
  // 存取模式：daily_view（今日運勢頁）、admin_view（後台唯讀瀏覽）
  accessMode: varchar("access_mode", { length: 20 }).notNull().default("daily_view"),
  // 身分類型：
  //   'ai_readonly' = AI 全站唯讀（無虛擬命盤）
  //   'ai_full'     = AI 全功能（含虛擬命盤，可體驗完整前台）
  //   其他值 = 後台方案 ID（如 'basic', 'advanced', 'professional'），訪客體驗方案，含虛擬命盤
  identityType: varchar("identityType", { length: 50 }).notNull().default("ai_readonly"),
  // 虛擬命盤（體驗/基礎方案 Token 使用，隨機生成）
  guestName: varchar("guestName", { length: 20 }),
  guestGender: mysqlEnum("guestGender", ["male", "female"]),
  guestBirthYear: int("guestBirthYear"),
  guestBirthMonth: int("guestBirthMonth"),
  guestBirthDay: int("guestBirthDay"),
  guestBirthHour: int("guestBirthHour"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AccessToken = typeof accessTokens.$inferSelect;
export type InsertAccessToken = typeof accessTokens.$inferInsert;

/**
 * 每日五行能量記錄表（V11.0 新增）
 * 用於追蹤命格進化軌跡，提供趨勢分析
 */
export const dailyEnergyLogs = mysqlTable("daily_energy_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 日期字串 YYYY-MM-DD */
  date: varchar("date", { length: 10 }).notNull(),
  /** 木能量比例（0-100，整數） */
  wood: int("wood").notNull().default(0),
  /** 火能量比例（0-100，整數） */
  fire: int("fire").notNull().default(0),
  /** 土能量比例（0-100，整數） */
  earth: int("earth").notNull().default(0),
  /** 金能量比例（0-100，整數） */
  metal: int("metal").notNull().default(0),
  /** 水能量比例（0-100，整數） */
  water: int("water").notNull().default(0),
  /** 當日主導五行 */
  dominantElement: varchar("dominantElement", { length: 10 }).notNull(),
  /** 當日最弱五行 */
  weakestElement: varchar("weakestElement", { length: 10 }).notNull(),
  /** 當日策略 */
  strategy: varchar("strategy", { length: 20 }),
  /** 當日十神 */
  tenGod: varchar("tenGod", { length: 10 }),
  createdAt: bigint("createdAt", { mode: "number" }).notNull(),
  updatedAt: bigint("updatedAt", { mode: "number" }).notNull(),
});
export type DailyEnergyLog = typeof dailyEnergyLogs.$inferSelect;
export type InsertDailyEnergyLog = typeof dailyEnergyLogs.$inferInsert;

// ============================================================
// 遊戲化模組：靈相換裝系統（PROPOSAL-20260323-GAME-靈相換裝系統）
// ============================================================

/**
 * 遊戲虛擬服裝庫
 * 儲存用戶擁有的所有虛擬服裝部件（商城購買 / 任務獲得）
 * 與現有 wardrobe_items（真實衣物）完全獨立，採 game_ 前綴
 */
export const gameWardrobe = mysqlTable("game_wardrobe", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 對應商品 ID（未來 game_items 資料表） */
  itemId: int("itemId").notNull().default(0),
  /** 圖層類型：body / hair / top / bottom / shoes / accessory / background */
  layer: varchar("layer", { length: 20 }).notNull(),
  /** PNG 透明圖層 URL（S3 CDN） */
  imageUrl: text("imageUrl").notNull(),
  /** 五行屬性（wood / fire / earth / metal / water） */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 10 }).notNull().default("common"),
  /** 1 = 裝備中，0 = 未裝備 */
  isEquipped: tinyint("isEquipped").notNull().default(0),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
});
export type GameWardrobeItem = typeof gameWardrobe.$inferSelect;
export type InsertGameWardrobeItem = typeof gameWardrobe.$inferInsert;

/**
 * 每日穿搭紀錄與 Aura Score
 * 記錄用戶每日完成靈相穿搭後的氣場分數與祝福等級
 */
export const gameDailyAura = mysqlTable("game_daily_aura", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** 日期字串 YYYY-MM-DD（台灣時間） */
  recordDate: varchar("recordDate", { length: 10 }).notNull(),
  /** Aura Score（0-100） */
  score: int("score").notNull(),
  /** 祝福等級：none / normal / good / destiny */
  blessingLevel: varchar("blessingLevel", { length: 20 }).notNull().default("none"),
  /** 當日裝備的五行屬性組合（JSON 字串，例如 ["wood","fire","water"]） */
  equippedWuxing: text("equippedWuxing"),
  /** 今日建議五行（來自 wuxingEngine） */
  recommendedWuxing: varchar("recommendedWuxing", { length: 10 }),
  /** 1 = 今日穿搭任務已完成 */
  questCompleted: tinyint("questCompleted").notNull().default(0),
  /** 任務完成獲得的靈石數量 */
  earnedStones: int("earnedStones").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameDailyAura = typeof gameDailyAura.$inferSelect;
export type InsertGameDailyAura = typeof gameDailyAura.$inferInsert;

/**
 * 遊戲服裝道具商品目錄
 * 儲存所有可裝備的虛擬服裝部件，包含三視角圖片 URL
 * is_initial = 1 代表命盤連動初始外觀可選的庫存（TASK-004 種子資料）
 */
export const gameItems = mysqlTable("game_items", {
  id: int("id").autoincrement().primaryKey(),
  /** 道具名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 性別：female / male / unisex */
  gender: varchar("gender", { length: 10 }).notNull().default("female"),
  /** 圖層類型：body / hair / top / bottom / shoes / accessory / bracelet / background */
  layer: varchar("layer", { length: 20 }).notNull(),
  /** 視角：front / left45 / right45 */
  view: varchar("view", { length: 10 }).notNull().default("front"),
  /** 五行屬性（wood / fire / earth / metal / water） */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 五行顏色 HEX（例如 #2E8B57） */
  wuxingColor: varchar("wuxingColor", { length: 10 }).notNull().default("#888888"),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 10 }).notNull().default("common"),
  /** 貨幣類型：initial / coins / stones */
  currencyType: varchar("currencyType", { length: 20 }).notNull().default("initial"),
  /** 價格（0 = 免費初始道具） */
  price: int("price").notNull().default(0),
  /** 1 = 初始發放基礎服裝（命盤連動可選），0 = 商城購買道具 */
  isInitial: tinyint("isInitial").notNull().default(0),
  /** 1 = 上架販售，0 = 未上架 */
  isOnSale: tinyint("isOnSale").notNull().default(0),
  /** PNG 透明圖層 URL（S3 CDN 或 file_path） */
  imageUrl: text("imageUrl").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameItem = typeof gameItems.$inferSelect;
export type InsertGameItem = typeof gameItems.$inferInsert;

// ═══════════════════════════════════════════════════════════════
// 遊戲 CMS 資料表（PROPOSAL-20260323-GAME-內容管理後台CMS）
// ═══════════════════════════════════════════════════════════════

/**
 * 怪物/魔物表
 * 虛相世界的敵人資料，由 Game CMS 後台管理
 */
export const gameMonsters = mysqlTable("game_monsters", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性（中文：木/火/土/金/水） */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  baseHp: int("base_hp").notNull(),
  baseAttack: int("base_attack").notNull(),
  baseDefense: int("base_defense").notNull(),
  baseSpeed: int("base_speed").notNull(),
  /** 關聯美術 TASK-006 的圖片 URL */
  imageUrl: text("image_url").notNull(),
  /** 捕捉機率（0.0-1.0） */
  catchRate: float("catch_rate").notNull().default(0.1),
  isActive: tinyint("is_active").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameMonster = typeof gameMonsters.$inferSelect;
export type InsertGameMonster = typeof gameMonsters.$inferInsert;

/**
 * 技能表
 * 玩家與怪物可使用的技能定義
 */
export const gameSkills = mysqlTable("game_skills", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  /** 五行屬性 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  mpCost: int("mp_cost").notNull(),
  /** 傷害倍率（1.0 = 100%） */
  damageMultiplier: float("damage_multiplier").notNull(),
  /** 技能類型：attack / heal / buff / debuff */
  skillType: varchar("skill_type", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameSkill = typeof gameSkills.$inferSelect;
export type InsertGameSkill = typeof gameSkills.$inferInsert;

/**
 * 地圖節點表
 * 大地圖上的 LBS 打卡節點（對應 GD-003）
 */
export const gameMapNodes = mysqlTable("game_map_nodes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  lat: float("lat").notNull(),
  lng: float("lng").notNull(),
  /** 節點類型：forest / water / market / temple / mountain */
  nodeType: varchar("node_type", { length: 50 }).notNull(),
  /** 五行屬性 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  isActive: tinyint("is_active").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameMapNode = typeof gameMapNodes.$inferSelect;
export type InsertGameMapNode = typeof gameMapNodes.$inferInsert;

/**
 * 採集物圖鑑表
 * 地圖節點上可採集的資源
 */
export const gameGatherables = mysqlTable("game_gatherables", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 稀有度：common / rare / epic */
  rarity: varchar("rarity", { length: 20 }).notNull(),
  /** 在節點上的生成機率（0.0-1.0） */
  spawnRate: float("spawn_rate").notNull().default(0.5),
  imageUrl: text("image_url"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameGatherable = typeof gameGatherables.$inferSelect;
export type InsertGameGatherable = typeof gameGatherables.$inferInsert;

/**
 * 隨機任務庫
 * 地圖上隨機觸發的 NPC 任務文本與獎勵設定
 */
export const gameRandomQuests = mysqlTable("game_random_quests", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  /** 觸發此任務需要的流日五行（null = 任何日子均可觸發） */
  requiredWuxing: varchar("required_wuxing", { length: 10 }),
  /** 獎勵類型：stones / aura / item */
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardAmount: int("reward_amount").notNull(),
  isActive: tinyint("is_active").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameRandomQuest = typeof gameRandomQuests.$inferSelect;
export type InsertGameRandomQuest = typeof gameRandomQuests.$inferInsert;

/**
 * 流浪商人商品池
 * 流浪商人可能販售的稀有物品與靈石價格
 */
export const gameMerchantPool = mysqlTable("game_merchant_pool", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯 game_items */
  itemId: int("item_id").notNull(),
  priceStones: int("price_stones").notNull(),
  /** 出現在商人清單的機率（0.0-1.0） */
  appearanceRate: float("appearance_rate").notNull().default(0.1),
  isActive: tinyint("is_active").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameMerchantPool = typeof gameMerchantPool.$inferSelect;
export type InsertGameMerchantPool = typeof gameMerchantPool.$inferInsert;

// ═══════════════════════════════════════════════════════════════
// 成就徽章系統（PROPOSAL-20260323-GAME-成就徽章系統）
// ═══════════════════════════════════════════════════════════════

/**
 * 成就定義表
 * 可透過 Game CMS 後台管理成就內容
 */
export const gameAchievements = mysqlTable("game_achievements", {
  id: int("id").autoincrement().primaryKey(),
  /** 成就唯一編碼，如 ACH_001 */
  achId: varchar("ach_id", { length: 20 }).notNull().default(""),
  /** 成就分類：avatar / explore / combat / oracle / social / collection */
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("ach_rarity", { length: 20 }).notNull().default("common"),
  /**
   * 條件類型：
   * login_days / buy_items / daily_quest_streak / collect_wuxing_sets /
   * map_checkin / gather_count / random_quest_count /
   * combat_win / catch_monster / kill_count / element_counter /
   * oracle_deep_read / disaster_quest / pvp_win / auction_trade / craft_count
   */
  conditionType: varchar("condition_type", { length: 50 }).notNull(),
  conditionValue: int("condition_value").notNull(),
  /** 條件參數（JSON：更複雜的條件定義，如 {monsterId, element, minLevel}） */
  conditionParams: json("condition_params").$type<Record<string, any>>().default({}),
  /** 獎勵類型：stones / coins / title / item / frame / skill */
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardAmount: int("reward_amount").notNull(),
  /** 獎勵內容（JSON：更複雜的獎勵定義，如 [{type, itemId, amount}]） */
  rewardContent: json("reward_content").$type<Array<{type: string; itemId?: string; amount: number}>>().default([]),
  /** 稱號（解鎖後可使用的稱號文字） */
  titleReward: varchar("title_reward", { length: 50 }).default(""),
  /** 光效代碼（解鎖後的特殊光效） */
  glowEffect: varchar("glow_effect", { length: 50 }).default(""),
  /** 徽章圖片 URL */
  iconUrl: varchar("icon_url", { length: 500 }).notNull().default(""),
  isActive: tinyint("is_active").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GameAchievement = typeof gameAchievements.$inferSelect;
export type InsertGameAchievement = typeof gameAchievements.$inferInsert;

/**
 * 玩家成就紀錄表
 * 記錄每位用戶已解鎖的成就與裝備狀態
 */
export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  achievementId: int("achievement_id").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  /** 1 = 裝備展示在個人檔案（最多 3 枚） */
  isEquipped: tinyint("is_equipped").default(0),
});
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = typeof userAchievements.$inferInsert;

// ============================================================
// 虛相世界系統（V11.14 + GD-018）
// ============================================================

/**
 * 旅人主表：每位用戶在虛相世界的旅人角色
 * 含 GD-018 雙軌體力值、裝備欄（8格）、技能欄（6格）
 */
export const gameAgents = mysqlTable("game_agents", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  /** 旅人名稱（玩家自訂，非 Manus 帳號名） */
  agentName: varchar("agent_name", { length: 50 }),
  /** 是否已完成首次命名 */
  isNamed: tinyint("is_named").notNull().default(0),
  level: int("level").notNull().default(1),
  exp: int("exp").notNull().default(0),
  currentNodeId: varchar("current_node_id", { length: 50 }).notNull().default("taipei_main"),
  targetNodeId: varchar("target_node_id", { length: 50 }),
  strategy: mysqlEnum("strategy", ["explore", "gather", "rest", "combat", "infuse"]).notNull().default("explore"),
  /** 休息前的上一個策略（回滿後自動切回） */
  previousStrategy: mysqlEnum("previous_strategy", ["explore", "gather", "rest", "combat", "infuse"]),
  /** 移動模式：roaming 漫遊（隨機移動探索世界）/ stationary 定點（固定在當前節點行動） */
  movementMode: mysqlEnum("movement_mode", ["roaming", "stationary"]).notNull().default("roaming"),
  /** 當前狀態 */
  status: mysqlEnum("status", ["idle", "moving", "resting", "combat", "dead"]).notNull().default("idle"),
  /** 命格主屬性（五行） */
  dominantElement: mysqlEnum("dominant_element", ["wood", "fire", "earth", "metal", "water"]).notNull().default("wood"),
  hp: int("hp").notNull().default(100),
  maxHp: int("max_hp").notNull().default(100),
  mp: int("mp").notNull().default(50),
  maxMp: int("max_mp").notNull().default(50),
  attack: int("attack").notNull().default(10),
  defense: int("defense").notNull().default(5),
  speed: int("speed").notNull().default(8),
  wuxingWood: int("wuxing_wood").notNull().default(20),
  wuxingFire: int("wuxing_fire").notNull().default(20),
  wuxingEarth: int("wuxing_earth").notNull().default(20),
  wuxingMetal: int("wuxing_metal").notNull().default(20),
  wuxingWater: int("wuxing_water").notNull().default(20),
  gold: int("gold").notNull().default(0),
  totalKills: int("total_kills").notNull().default(0),
  totalSteps: int("total_steps").notNull().default(0),
  // 雙軌體力值（GD-018）
  /** 活躍值：上限 100，每 20 分鐘 +1，Tick 引擎自動行動消耗 */
  stamina: int("stamina").notNull().default(100),
  maxStamina: int("max_stamina").notNull().default(100),
  staminaLastRegen: bigint("stamina_last_regen", { mode: "number" }),
  /** 靈力值：上限 5，每 2 小時 +1，玩家主動干預消耗 */
  actionPoints: int("action_points").notNull().default(5),
  maxActionPoints: int("max_action_points").notNull().default(5),
  actionPointsLastRegen: bigint("action_points_last_regen", { mode: "number" }),
  // ── GD-002 生活系五行屬性 ──
  /** 採集力（木）：植物/草藥類掉落率加成 */
  gatherPower: int("gather_power").notNull().default(20),
  /** 鍛冶力（火）：製造武器/裝備的成功率與品質 */
  forgePower: int("forge_power").notNull().default(20),
  /** 承重力（土）：背包格子數量、可攜帶道具總重 */
  carryWeight: int("carry_weight").notNull().default(20),
  /** 精煉力（金）：提升素材品質等級的機率 */
  refinePower: int("refine_power").notNull().default(20),
  /** 尋寶力（水）：地圖可視範圍、稀有素材/寵物出現率、隱藏商店感知 */
  treasureHunting: int("treasure_hunting").notNull().default(20),
  // ── GD-002 戰鬥系五行屬性 ──
  /** 治癒力（木）：戰鬥中自我回血量 */
  healPower: int("heal_power").notNull().default(20),
  /** 魔法攻擊（水）：元素傷害基礎值、狀態異常觸發率 */
  magicAttack: int("magic_attack").notNull().default(20),
  /** 命中力（金）：攻擊命中率、穿透敵方防禦比例 */
  hitRate: int("hit_rate").notNull().default(20),
  // ── 裝備欄位（GD-006 八部位 + 護符）──
  equippedHead: varchar("equipped_head", { length: 100 }),
  equippedBody: varchar("equipped_body", { length: 100 }),
  equippedHands: varchar("equipped_hands", { length: 100 }),
  equippedFeet: varchar("equipped_feet", { length: 100 }),
  equippedWeapon: varchar("equipped_weapon", { length: 100 }),
  equippedOffhand: varchar("equipped_offhand", { length: 100 }),
  equippedRingA: varchar("equipped_ring_a", { length: 100 }),
  equippedRingB: varchar("equipped_ring_b", { length: 100 }),
  equippedNecklace: varchar("equipped_necklace", { length: 100 }),
  equippedAmulet: varchar("equipped_amulet", { length: 100 }),
  // 技能欄位（6格：4主動+2被動）
  skillSlot1: varchar("skill_slot_1", { length: 100 }),
  skillSlot2: varchar("skill_slot_2", { length: 100 }),
  skillSlot3: varchar("skill_slot_3", { length: 100 }),
  skillSlot4: varchar("skill_slot_4", { length: 100 }),
  passiveSlot1: varchar("passive_slot_1", { length: 100 }),
  passiveSlot2: varchar("passive_slot_2", { length: 100 }),
  isActive: tinyint("is_active").notNull().default(1),
  // ── 靈相干預冷卻時間（每日限用一次，儲存最後使用的台灣日期 YYYY-MM-DD）──
  /** 神蹟治癒最後使用日期 */
  lastDivineHealDate: varchar("last_divine_heal_date", { length: 10 }),
  /** 神眼加持最後使用日期 */
  lastDivineEyeDate: varchar("last_divine_eye_date", { length: 10 }),
  /** 靈癒疲勞最後使用日期 */
  lastDivineStaminaDate: varchar("last_divine_stamina_date", { length: 10 }),
  /** 桌機版浮動 Widget 位置記憶（JSON: { widgetId: { x, y } }） */
  /** 手動注靈已使用點數（上限 = level × 2） */
  infusePointsUsed: int("infuse_points_used").notNull().default(0),
  /** 五行抗性（由注靈自動計算，0-50） */
  resistWood: int("resist_wood").notNull().default(0),
  resistFire: int("resist_fire").notNull().default(0),
  resistEarth: int("resist_earth").notNull().default(0),
  resistMetal: int("resist_metal").notNull().default(0),
  resistWater: int("resist_water").notNull().default(0),
  /** 升級自由點數（每級 +5 點） */
  freeStatPoints: int("free_stat_points").notNull().default(0),
  // ===== GD-028 新增欄位 =====
  /** 魔法防禦 */
  mdef: int("mdef").notNull().default(10),
  /** 精神值 */
  spr: int("spr").notNull().default(10),
  /** 暴擊率（%） */
  critRate: float("crit_rate").notNull().default(5),
  /** 暴擊傷害（%） */
  critDamage: float("crit_damage").notNull().default(150),
  /** 境界（初界/中界/高界） */
  realm: varchar("realm", { length: 10 }).notNull().default("初界"),
  /** 職業（none/hunter/mage/tank/thief/wizard） */
  profession: varchar("profession", { length: 20 }).notNull().default("none"),
  /** 職業階級（0=無業, 1=初階, 2=二次進階） */
  professionTier: int("profession_tier").notNull().default(0),
  /** 上次轉職時間戳（冷却判定用） */
  professionChangedAt: bigint("profession_changed_at", { mode: "number" }).notNull().default(0),
  /** 潛能點數分配：HP */
  potentialHp: int("potential_hp").notNull().default(0),
  /** 潛能點數分配：MP */
  potentialMp: int("potential_mp").notNull().default(0),
  /** 潛能點數分配：ATK */
  potentialAtk: int("potential_atk").notNull().default(0),
  /** 潛能點數分配：DEF */
  potentialDef: int("potential_def").notNull().default(0),
  /** 潛能點數分配：SPD */
  potentialSpd: int("potential_spd").notNull().default(0),
  /** 潛能點數分配：MATK */
  potentialMatk: int("potential_matk").notNull().default(0),
  /** 命格主屬性（從用戶八字自動帶入：wood/fire/earth/metal/water） */
  fateElement: varchar("fate_element", { length: 10 }).notNull().default("wood"),
  /** 玩家自訂頭像（S3 URL） */
  avatarUrl: varchar("avatar_url", { length: 500 }),
  widgetLayout: json("widget_layout").$type<Record<string, { x: number; y: number }>>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameAgent = typeof gameAgents.$inferSelect;
export type InsertGameAgent = typeof gameAgents.$inferInsert;

/**
 * 事件日誌表：記錄旅人的所有行動事件
 * 含戰鬥回合日誌、Roguelike 奇遇等
 */
export const agentEvents = mysqlTable("agent_events", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  eventType: mysqlEnum("event_type", ["move", "combat", "gather", "rest", "rogue", "system"]).notNull().default("system"),
  nodeId: varchar("node_id", { length: 50 }),
  message: text("message").notNull(),
  /** 詳細資料（戰鬥回合日誌、Roguelike 選項等） */
  detail: json("detail"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentEvent = typeof agentEvents.$inferSelect;
export type InsertAgentEvent = typeof agentEvents.$inferInsert;

/**
 * 背包表：旅人持有的道具、裝備、技能書等
 */
export const agentInventory = mysqlTable("agent_inventory", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  itemId: varchar("item_id", { length: 100 }).notNull(),
  itemType: mysqlEnum("item_type", ["material", "equipment", "skill_book", "consumable", "pet"]).notNull().default("material"),
  quantity: int("quantity").notNull().default(1),
  /** 裝備詞梜等額外資料 */
  itemData: json("item_data"),
  /** 是否已裝備 */
  isEquipped: tinyint("is_equipped").notNull().default(0),
  /** 裝備欄位：weapon/helmet/armor/boots/accessory1/accessory2 */
  equippedSlot: varchar("equipped_slot", { length: 20 }),
  obtainedAt: bigint("obtained_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  acquiredAt: bigint("acquired_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentInventoryItem = typeof agentInventory.$inferSelect;

/**
 * 世界狀態表：全域世界狀態（天氣、事件等）
 */
export const gameWorld = mysqlTable("game_world", {
  id: int("id").autoincrement().primaryKey(),
  worldKey: varchar("world_key", { length: 100 }).notNull().unique(),
  worldData: json("world_data").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameWorld = typeof gameWorld.$inferSelect;

/**
 * 隱藏事件表：密店/隱藏NPC/隱藏任務的隨機生成記錄
 * 每個事件有效期 5 個 Tick，過期後重新隨機
 */
export const gameHiddenEvents = mysqlTable("game_hidden_events", {
  id: int("id").autoincrement().primaryKey(),
  nodeId: varchar("node_id", { length: 50 }).notNull(),
  eventType: mysqlEnum("event_type", ["hidden_shop", "hidden_npc", "hidden_quest"]).notNull(),
  /** 事件資料（商品清單/NPC對話/任務內容） */
  eventData: json("event_data").notNull(),
  /** 感知門檻（1-100，洞察力需超過此值才有機率感知） */
  perceptionThreshold: int("perception_threshold").notNull().default(30),
  /** 剩餘有效 Tick 數 */
  remainingTicks: int("remaining_ticks").notNull().default(5),
  /** 是否已被發現（任意玩家） */
  isDiscovered: tinyint("is_discovered").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull().$defaultFn(() => Date.now() + 5 * 20 * 60 * 1000),
});
export type GameHiddenEvent = typeof gameHiddenEvents.$inferSelect;
export type InsertGameHiddenEvent = typeof gameHiddenEvents.$inferInsert;

/**
 * 稱號表：玩家可獲得的稱號（命格/成就/特殊事件）
 */
export const gameTitles = mysqlTable("game_titles", {
  id: int("id").autoincrement().primaryKey(),
  titleKey: varchar("title_key", { length: 100 }).notNull().unique(),
  titleName: varchar("title_name", { length: 50 }).notNull(),
  titleDesc: text("title_desc"),
  titleType: mysqlEnum("title_type", ["natal", "achievement", "event", "special"]).notNull().default("natal"),
  /** 稱號顏色（hex） */
  color: varchar("color", { length: 20 }).default("#f59e0b"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameTitle = typeof gameTitles.$inferSelect;

/**
 * 玩家稱號表：玩家已獲得的稱號
 */
export const agentTitles = mysqlTable("agent_titles", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  titleKey: varchar("title_key", { length: 100 }).notNull(),
  isEquipped: tinyint("is_equipped").notNull().default(0),
  acquiredAt: bigint("acquired_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentTitle = typeof agentTitles.$inferSelect;

// ═══════════════════════════════════════════════════════════════
// V14 新增資料表
// ═══════════════════════════════════════════════════════════════

/**
 * 遊戲道具定義表（消耗品/裝備/武器）
 * 由後台 CMS 管理，與 agentInventory 關聯
 */
export const gameInventoryItems = mysqlTable("game_inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  /** 道具唯一 key（如 herb-001, sword-fire-001） */
  itemKey: varchar("item_key", { length: 100 }).notNull().unique(),
  /** 道具名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 道具描述 */
  description: text("description"),
  /** 道具類型：consumable / equipment / weapon / material / special */
  itemType: mysqlEnum("item_type", ["consumable", "equipment", "weapon", "material", "special"]).notNull().default("consumable"),
  /** 子分類：heal_hp / heal_mp / buff / debuff / armor / ring / necklace / sword / staff / bow / ore / herb */
  subType: varchar("sub_type", { length: 50 }).default(""),
  /** 五行屬性（wood/fire/earth/metal/water） */
  wuxing: varchar("wuxing", { length: 10 }).default(""),
  /** 稀有度：common / rare / epic / legendary */
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).notNull().default("common"),
  /** 圖示 emoji */
  emoji: varchar("emoji", { length: 10 }).notNull().default("📦"),
  /** 數值加成（JSON）：{ hp: 50, mp: 20, atk: 5, def: 3, spd: 2 } */
  statBonus: json("stat_bonus"),
  /** 使用效果（JSON）：{ effect: "heal_hp", value: 100 } */
  useEffect: json("use_effect"),
  /** 裝備部位（equipment/weapon 用）：head/body/hand/foot/ring/necklace/weapon/offhand/belt/accessory */
  equipSlot: varchar("equip_slot", { length: 30 }).default(""),
  /** 最大堆疊數量 */
  maxStack: int("max_stack").notNull().default(99),
  /** 是否可交易 */
  isTradable: tinyint("is_tradable").notNull().default(1),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameInventoryItem = typeof gameInventoryItems.$inferSelect;
export type InsertGameInventoryItem = typeof gameInventoryItems.$inferInsert;

/**
 * 虛界商店商品表（遊戲幣購買）
 * 玩家在虛相世界各節點的商店購買道具
 */
export const gameVirtualShop = mysqlTable("game_virtual_shop", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯 game_inventory_items.item_key */
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  /** 商品名稱（可覆蓋道具名稱） */
  displayName: varchar("display_name", { length: 100 }).notNull(),
  /** 描述 */
  description: text("description"),
  /** 價格（遊戲幣） */
  priceCoins: int("price_coins").notNull().default(0),
  /** 每次購買數量 */
  quantity: int("quantity").notNull().default(1),
  /** 庫存（-1 = 無限） */
  stock: int("stock").notNull().default(-1),
  /** 節點限定（空 = 全節點可購買） */
  nodeId: varchar("node_id", { length: 50 }).default(""),
  /** 排序 */
  sortOrder: int("sort_order").notNull().default(0),
  /** 是否上架 */
  isOnSale: tinyint("is_on_sale").notNull().default(1),
  /** 每人限購數量（0 = 不限） */
  purchaseLimit: int("purchase_limit").notNull().default(0),
  /** 每次最多購買數量（1 = 每次只能買 1 個，0 = 不限） */
  maxPerOrder: int("max_per_order").notNull().default(0),
  /** 是否鎖定（鎖定後 AI 刷新不會覆蓋） */
  isLocked: tinyint("is_locked").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameVirtualShopItem = typeof gameVirtualShop.$inferSelect;
export type InsertGameVirtualShopItem = typeof gameVirtualShop.$inferInsert;

/**
 * 靈相商店商品表（靈石購買）
 * 用於虛相世界的靈石專區（與靈相空間的紙娃娃商店分開）
 */
export const gameSpiritShop = mysqlTable("game_spirit_shop", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯 game_inventory_items.item_key（特殊道具） */
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  /** 商品名稱 */
  displayName: varchar("display_name", { length: 100 }).notNull(),
  /** 描述 */
  description: text("description"),
  /** 價格（靈石） */
  priceStones: int("price_stones").notNull().default(0),
  /** 每次購買數量 */
  quantity: int("quantity").notNull().default(1),
  /** 稀有度（影響顯示樣式） */
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).notNull().default("rare"),
  /** 排序 */
  sortOrder: int("sort_order").notNull().default(0),
  /** 是否上架 */
  isOnSale: tinyint("is_on_sale").notNull().default(1),
  /** 每人限購數量（0 = 不限） */
  purchaseLimit: int("purchase_limit").notNull().default(0),
  /** 每次最多購買數量（1 = 每次只能買 1 個，0 = 不限） */
  maxPerOrder: int("max_per_order").notNull().default(0),
  /** 是否鎖定（鎖定後 AI 刷新不會覆蓋） */
  isLocked: tinyint("is_locked").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameSpiritShopItem = typeof gameSpiritShop.$inferSelect;
export type InsertGameSpiritShopItem = typeof gameSpiritShop.$inferInsert;

/**
 * 商店購買記錄（用於限購檢查）
 */
export const gameShopPurchaseLog = mysqlTable("game_shop_purchase_log", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  shopType: varchar("shop_type", { length: 20 }).notNull(),
  shopItemId: int("shop_item_id").notNull(),
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  purchasedAt: bigint("purchased_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});

/**
 * 密店商品池（隨機密店商品）
 * 密店隨機出現時，從此池中抽取商品
 */
export const gameHiddenShopPool = mysqlTable("game_hidden_shop_pool", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯 game_inventory_items.item_key */
  itemKey: varchar("item_key", { length: 100 }).notNull(),
  /** 商品名稱 */
  displayName: varchar("display_name", { length: 100 }).notNull(),
  /** 描述 */
  description: text("description"),
  /** 貨幣類型：coins / stones */
  currencyType: mysqlEnum("currency_type", ["coins", "stones"]).notNull().default("coins"),
  /** 價格 */
  price: int("price").notNull().default(0),
  /** 每次購買數量 */
  quantity: int("quantity").notNull().default(1),
  /** 出現機率權重（越高越常出現） */
  weight: int("weight").notNull().default(10),
  /** 稀有度 */
  rarity: mysqlEnum("rarity", ["common", "rare", "epic", "legendary"]).notNull().default("rare"),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  /** 是否鎖定（鎖定後 AI 刷新不會覆蓋） */
  isLocked: tinyint("is_locked").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameHiddenShopItem = typeof gameHiddenShopPool.$inferSelect;
export type InsertGameHiddenShopItem = typeof gameHiddenShopPool.$inferInsert;

// ═══════════════════════════════════════════════════════════════
// 遊戲圖鑑擴充資料表（GD-014/015/016 完整資料庫）
// ═══════════════════════════════════════════════════════════════

/**
 * 怪物圖鑑擴充表（對應 GD-011A~E 五行怪物圖鑑）
 * 補充 gameMonsters 缺少的欄位
 */
export const gameMonsterCatalog = mysqlTable("game_monster_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 怪物唯一識別碼，如 M_W001 */
  monsterId: varchar("monster_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性：木/火/土/金/水 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 等級範圍，如 "1-5" */
  levelRange: varchar("level_range", { length: 20 }).notNull().default("1-5"),
  /** 稀有度：common / rare / elite / boss / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  // ===== 基礎能力值 =====
  baseHp: int("base_hp").notNull().default(50),
  baseAttack: int("base_attack").notNull().default(10),
  baseDefense: int("base_defense").notNull().default(5),
  baseSpeed: int("base_speed").notNull().default(10),
  /** 命中力 */
  baseAccuracy: int("base_accuracy").notNull().default(80),
  /** 魔法攻擊 */
  baseMagicAttack: int("base_magic_attack").notNull().default(8),
  // ===== 五行抗性 (%) =====
  resistWood: int("resist_wood").notNull().default(0),
  resistFire: int("resist_fire").notNull().default(0),
  resistEarth: int("resist_earth").notNull().default(0),
  resistMetal: int("resist_metal").notNull().default(0),
  resistWater: int("resist_water").notNull().default(0),
  /** 被剋制加成% */
  counterBonus: int("counter_bonus").notNull().default(50),
  // ===== 技能（最多 3 個，從魔物技能圖鑑選取） =====
  skillId1: varchar("skill_id_1", { length: 20 }).default(""),
  skillId2: varchar("skill_id_2", { length: 20 }).default(""),
  skillId3: varchar("skill_id_3", { length: 20 }).default(""),
  /** 種族（靈獸系/亡魂系/金屬系/人型系/植物系/水生系/妖化系/龍種系/蟲類系/天命系） */
  race: varchar("race", { length: 20 }).default(""),
  /** AI 等級：1=隨機 2=弱點優先 3=策略型 4=BOSS級 */
  aiLevel: int("ai_level").notNull().default(1),
  /** 成長率（每升 1 級的屬性倍率，如 1.05） */
  growthRate: float("growth_rate").notNull().default(1.0),
  // ===== 掉落系統（最多 5 個掉落欄位） =====
  dropItem1: varchar("drop_item_1", { length: 20 }).default(""),
  dropRate1: float("drop_rate_1").notNull().default(0),
  dropItem2: varchar("drop_item_2", { length: 20 }).default(""),
  dropRate2: float("drop_rate_2").notNull().default(0),
  dropItem3: varchar("drop_item_3", { length: 20 }).default(""),
  dropRate3: float("drop_rate_3").notNull().default(0),
  dropItem4: varchar("drop_item_4", { length: 20 }).default(""),
  dropRate4: float("drop_rate_4").notNull().default(0),
  dropItem5: varchar("drop_item_5", { length: 20 }).default(""),
  dropRate5: float("drop_rate_5").notNull().default(0),
  /** 掉落金幣範圍（JSON: {min, max}） */
  dropGold: json("drop_gold").$type<{min: number; max: number}>().default({min: 5, max: 15}),
  /** 傳說掉落（極低機率的特殊道具） */
  legendaryDrop: varchar("legendary_drop", { length: 20 }).default(""),
  legendaryDropRate: float("legendary_drop_rate").notNull().default(0),
  /** 天命線索（觸發隱藏任務的文字） */
  destinyClue: text("destiny_clue"),
  /** 出沒節點 ID 列表（JSON 陣列） */
  spawnNodes: json("spawn_nodes").$type<string[]>().default([]),
  /** 描述文字 */
  description: text("description"),
  /** 舊版掉落道具清單（保留相容） */
  dropItems: json("drop_items").$type<string[]>().default([]),
  /** 圖片 URL */
  imageUrl: text("image_url").default(""),
  /** 捕捉機率（0.0-1.0）（舊版欄位，保留相容） */
  catchRate: float("catch_rate").notNull().default(0.1),
  /** 是否可捕捉（1=可捕捉, 0=不可捕捉，boss 預設不可） */
  isCapturable: tinyint("is_capturable").notNull().default(1),
  /** 捕捉基礎率（0-100，預設 25） */
  baseCaptureRate: int("base_capture_rate").notNull().default(25),
  /** 基礎 BP 總值（捕捉後轉換為寵物時使用） */
  baseBp: int("base_bp").notNull().default(50),
  /** 每回合動作次數（Boss 可設為 2~3，普通怪物為 1） */
  actionsPerTurn: int("actions_per_turn").notNull().default(1),
  // ===== GD-028 新增欄位 =====
  /** 基礎 MP */
  baseMp: int("base_mp").notNull().default(30),
  /** 基礎魔法防禦 */
  baseMagicDefense: int("base_magic_defense").notNull().default(5),
  /** 基礎回復力 */
  baseHealPower: int("base_heal_power").notNull().default(0),
  /** 基礎暴擊率（%） */
  baseCritRate: float("base_crit_rate").notNull().default(5),
  /** 基礎暴擊傷害（%） */
  baseCritDamage: float("base_crit_damage").notNull().default(150),
  // ===== 五行分配百分比（合計 100） =====
  /** 木屬性百分比 */
  wuxingWood: int("wuxing_wood").notNull().default(20),
  /** 火屬性百分比 */
  wuxingFire: int("wuxing_fire").notNull().default(20),
  /** 土屬性百分比 */
  wuxingEarth: int("wuxing_earth").notNull().default(20),
  /** 金屬性百分比 */
  wuxingMetal: int("wuxing_metal").notNull().default(20),
  /** 水屬性百分比 */
  wuxingWater: int("wuxing_water").notNull().default(20),
  /** 境界（初界/中界/高界） */
  realm: varchar("realm", { length: 10 }).notNull().default("初界"),
  /** 境界倍率（初界1.0/中界1.5/高界2.0） */
  realmMultiplier: float("realm_multiplier").notNull().default(1.0),
  /** 種族（統一10種：humanoid/beast/plant/undead/dragon/flying/insect/special/metal/demon） */
  species: varchar("species", { length: 20 }).notNull().default("beast"),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameMonsterCatalog = typeof gameMonsterCatalog.$inferSelect;
export type InsertGameMonsterCatalog = typeof gameMonsterCatalog.$inferInsert;

/**
 * 道具圖鑑表（對應 GD-014 完整道具資料庫，250 種）
 */
export const gameItemCatalog = mysqlTable("game_item_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 道具唯一識別碼，如 I_W001 */
  itemId: varchar("item_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性：木/火/土/金/水 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 分類：material_basic / material_drop / consumable / quest / treasure / skillbook / equipment_material */
  category: varchar("category", { length: 30 }).notNull().default("material_basic"),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  /** 疊加上限（背包中同一道具最多疊幾個） */
  stackLimit: int("stack_limit").notNull().default(99),
  /** 是否可疊加（1=可疊加, 0=不可疊加）裝備類道具應設為 0 */
  stackable: tinyint("stackable").notNull().default(1),
  // ===== 商店系統 =====
  /** 商店售價（金幣） */
  shopPrice: int("shop_price").notNull().default(0),
  /** 是否在一般商店上架 */
  inNormalShop: tinyint("in_normal_shop").default(0),
  /** 是否在靈相商店上架 */
  inSpiritShop: tinyint("in_spirit_shop").default(0),
  /** 是否在密店上架 */
  inSecretShop: tinyint("in_secret_shop").default(0),
  // ===== 掉落系統 =====
  /** 是否可從怪物掉落 */
  isMonsterDrop: tinyint("is_monster_drop").default(0),
  /** 掉落怪物 ID（從魔物圖鑑選取） */
  dropMonsterId: varchar("drop_monster_id", { length: 20 }).default(""),
  /** 掉落機率 % */
  dropRate: float("drop_rate").notNull().default(0),
  // ===== 採集系統 =====
  /** 採集地點（JSON：[{nodeId, nodeName, rate}]） */
  gatherLocations: json("gather_locations").$type<Array<{nodeId: string; nodeName: string; rate: number}>>().default([]),
  // ===== 使用效果 =====
  /** 使用效果（JSON：{type, value, duration, description}） */
  useEffect: json("use_effect").$type<{type: string; value: number; duration?: number; description: string} | null>().default(null),
  /** 獲取途徑或掉落來源（文字說明） */
  source: varchar("source", { length: 200 }).default(""),
  /** 用途或效果說明（文字） */
  effect: text("effect"),
  /** 圖片 URL */
  imageUrl: text("image_url").default(""),
  // ===== 價值評估引擎 =====
  /** 價值分數（0~1000） */
  valueScore: int("value_score").notNull().default(0),
  /** 品質等級：S/A/B/C/D */
  qualityGrade: varchar("quality_grade", { length: 5 }).notNull().default("C"),
  /** 建議掉落等級下限 */
  dropLevelMin: int("drop_level_min").notNull().default(1),
  /** 建議掉落等級上限 */
  dropLevelMax: int("drop_level_max").notNull().default(15),
  /** 是否可交易 */
  tradeable: tinyint("tradeable").notNull().default(1),
  /** 是否可在拍賣行上架 */
  inAuctionHouse: tinyint("in_auction_house").notNull().default(1),
  /** 是否可在戰鬥中使用（僅消耗品） */
  usableInBattle: tinyint("usable_in_battle").notNull().default(0),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameItemCatalog = typeof gameItemCatalog.$inferSelect;
export type InsertGameItemCatalog = typeof gameItemCatalog.$inferInsert;

/**
 * 裝備圖鑑表（對應 GD-015 完整裝備資料庫，150 種）
 */
export const gameEquipmentCatalog = mysqlTable("game_equipment_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 裝備唯一識別碼，如 E_W001 */
  equipId: varchar("equip_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性：木/火/土/金/水 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 部位：weapon / helmet / armor / shoes / accessory / offhand */
  slot: varchar("slot", { length: 20 }).notNull().default("weapon"),
  /** 階級：初階/中階/高階/傳說 */
  tier: varchar("tier", { length: 20 }).notNull().default("初階"),
  /** 品質：white / green / blue / purple / orange / red */
  quality: varchar("quality", { length: 20 }).notNull().default("white"),
  /** 等級需求 */
  levelRequired: int("level_required").notNull().default(1),
  // ===== 數值加成 =====
  hpBonus: int("hp_bonus").notNull().default(0),
  attackBonus: int("attack_bonus").notNull().default(0),
  defenseBonus: int("defense_bonus").notNull().default(0),
  speedBonus: int("speed_bonus").notNull().default(0),
  // ===== GD-028 新增加成欄位 =====
  /** MP 加成 */
  mpBonus: int("mp_bonus").notNull().default(0),
  /** 魔法攻擊加成 */
  magicAttackBonus: int("magic_attack_bonus").notNull().default(0),
  /** 魔法防禦加成 */
  magicDefenseBonus: int("magic_defense_bonus").notNull().default(0),
  /** 回復力加成 */
  healPowerBonus: int("heal_power_bonus").notNull().default(0),
  /** 暴擊率加成（%） */
  critRateBonus: float("crit_rate_bonus").notNull().default(0),
  /** 暴擊傷害加成（%） */
  critDamageBonus: float("crit_damage_bonus").notNull().default(0),
  /** 五行抗性加成（JSON：{wood, fire, earth, metal, water}） */
  resistBonus: json("resist_bonus").$type<{wood: number; fire: number; earth: number; metal: number; water: number}>().default({wood:0, fire:0, earth:0, metal:0, water:0}),
  // ===== 詞條系統（最多 5 個詞條） =====
  /** 詞條 1~5（JSON：{name, type, value, description}） */
  affix1: json("affix_1").$type<{name: string; type: string; value: number; description: string} | null>().default(null),
  affix2: json("affix_2").$type<{name: string; type: string; value: number; description: string} | null>().default(null),
  affix3: json("affix_3").$type<{name: string; type: string; value: number; description: string} | null>().default(null),
  affix4: json("affix_4").$type<{name: string; type: string; value: number; description: string} | null>().default(null),
  affix5: json("affix_5").$type<{name: string; type: string; value: number; description: string} | null>().default(null),
  // ===== 製作系統 =====
  /** 製作材料（JSON：[{itemId, name, quantity}]） */
  craftMaterialsList: json("craft_materials_list").$type<Array<{itemId: string; name: string; quantity: number}>>().default([]),
  /** 套裝 ID（屬於哪個套裝組，null 表示無套裝） */
  setId: varchar("set_id", { length: 20 }).default(""),
  // ===== 舊欄位保留相容 =====
  /** 基礎屬性說明（文字） */
  baseStats: varchar("base_stats", { length: 300 }).default(""),
  /** 特殊效果或傳說被動技能 */
  specialEffect: text("special_effect"),
  /** 鍛造核心素材（文字說明，舊欄位） */
  craftMaterials: varchar("craft_materials", { length: 300 }).default(""),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  /** 商店售價（金幣，0 表示不在商店販售） */
  shopPrice: int("shop_price").notNull().default(0),
  /** 是否在一般商店上架 */
  inNormalShop: tinyint("in_normal_shop").default(0),
  /** 是否在靈相商店上架 */
  inSpiritShop: tinyint("in_spirit_shop").default(0),
  /** 是否在密店上架 */
  inSecretShop: tinyint("in_secret_shop").default(0),
  /** 圖片 URL */
  imageUrl: text("image_url").default(""),
  // ===== 價值評估引擎 =====
  /** 價值分數（0~1000） */
  valueScore: int("value_score").notNull().default(0),
  /** 品質等級：S/A/B/C/D */
  qualityGrade: varchar("quality_grade", { length: 5 }).notNull().default("C"),
  /** 建議掉落等級下限 */
  dropLevelMin: int("drop_level_min").notNull().default(1),
  /** 建議掉落等級上限 */
  dropLevelMax: int("drop_level_max").notNull().default(15),
  /** 是否可交易 */
  tradeable: tinyint("tradeable").notNull().default(1),
  /** 是否可在拍賣行上架 */
  inAuctionHouse: tinyint("in_auction_house").notNull().default(1),
  /** 是否可疊加（1=可疊加, 0=不可疊加）裝備預設不可疊加 */
  stackable: tinyint("stackable").notNull().default(0),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameEquipmentCatalog = typeof gameEquipmentCatalog.$inferSelect;
export type InsertGameEquipmentCatalog = typeof gameEquipmentCatalog.$inferInsert;

/**
 * 技能圖鑑表（對應 GD-016 完整技能資料庫，250 種）
 */
export const gameSkillCatalog = mysqlTable("game_skill_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 技能唯一識別碼，如 S_W001 */
  skillId: varchar("skill_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性：木/火/土/金/水 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 類別：active_combat / passive_combat / life_gather / craft_forge */
  category: varchar("category", { length: 30 }).notNull().default("active_combat"),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  /** 階級：初階/中階/高階/傳說/天命 */
  tier: varchar("tier", { length: 20 }).notNull().default("初階"),
  /** MP 消耗（被動技能為 0） */
  mpCost: int("mp_cost").notNull().default(0),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(0),
  /** 威力 %（基礎攻擊的倍率，如 150 = 150%） */
  powerPercent: int("power_percent").notNull().default(100),
  /** 習得等級 */
  learnLevel: int("learn_level").notNull().default(1),
  /** 獲取類型：shop / drop / quest / craft / hidden */
  acquireType: varchar("acquire_type", { length: 20 }).notNull().default("shop"),
  /** 商店售價（金幣，0 表示不在商店販售） */
  shopPrice: int("shop_price").notNull().default(0),
  /** 掉落怪物 ID（從魔物圖鑑選取） */
  dropMonsterId: varchar("drop_monster_id", { length: 20 }).default(""),
  /** 隱藏觸發條件（文字說明） */
  hiddenTrigger: text("hidden_trigger"),
  /** 效果說明 */
  description: text("description"),
  /** 技能類型：attack / heal / buff / debuff / passive / special */
  skillType: varchar("skill_type", { length: 20 }).notNull().default("attack"),
  /** 是否在一般商店上架 */
  inNormalShop: tinyint("in_normal_shop").default(0),
  /** 是否在靈相商店上架 */
  inSpiritShop: tinyint("in_spirit_shop").default(0),
  /** 是否在密店上架 */
  inSecretShop: tinyint("in_secret_shop").default(0),
  // ===== 價值評估引擎 =====
  /** 價值分數（0~1000） */
  valueScore: int("value_score").notNull().default(0),
  /** 品質等級：S/A/B/C/D */
  qualityGrade: varchar("quality_grade", { length: 5 }).notNull().default("C"),
  /** 建議掉落等級下限 */
  dropLevelMin: int("drop_level_min").notNull().default(1),
  /** 建議掉落等級上限 */
  dropLevelMax: int("drop_level_max").notNull().default(15),
  /** 是否可交易 */
  tradeable: tinyint("tradeable").notNull().default(1),
  /** 是否可在拍賣行上架 */
  inAuctionHouse: tinyint("in_auction_house").notNull().default(1),
  /** 圖片 URL */
  imageUrl: text("image_url").default(""),
  /** 傷害方式： single 單體攻擊 / aoe 全體攻擊 */
  damageType: mysqlEnum("damage_type", ["single", "aoe"]).notNull().default("single"),
  // ===== GD-028 新增欄位 =====
  /** 五行門檻（學習該技能所需的主屬性最低值，0=無門檻） */
  wuxingThreshold: int("wuxing_threshold").notNull().default(0),
  /** 狀態異常效果（poison/petrify/sleep/confuse/forget/drunk/stun/none） */
  statusEffect: varchar("status_effect", { length: 20 }).notNull().default("none"),
  /** 狀態異常觸發機率（%） */
  statusChance: int("status_chance").notNull().default(0),
  /** 狀態異常持續回合數 */
  statusDuration: int("status_duration").notNull().default(0),
  /** 治療百分比（治療技能用，0=非治療） */
  healPercent: int("heal_percent").notNull().default(0),
  /** 職業需求（none=無限制） */
  professionRequired: varchar("profession_required", { length: 20 }).notNull().default("none"),
  /** 技能階級（basic/intermediate/advanced/destiny/legendary） */
  skillTier: varchar("skill_tier", { length: 20 }).notNull().default("basic"),
  /** 取得方式（levelup/profession/skillbook/destiny） */
  acquireMethod: varchar("acquire_method", { length: 20 }).notNull().default("levelup"),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameSkillCatalog = typeof gameSkillCatalog.$inferSelect;
export type InsertGameSkillCatalog = typeof gameSkillCatalog.$inferInsert;

/**
 * 裝備模板表（GD-021）：所有裝備的定義資料
 * 由後台管理，ID 格式：E_W001（木）、E_F001（火）、E_E001（土）、E_M001（金）、E_Wt001（水）
 */
export const equipmentTemplates = mysqlTable("equipment_templates", {
  id: varchar("id", { length: 20 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  element: mysqlEnum("element", ["wood", "fire", "earth", "metal", "water"]).notNull(),
  tier: mysqlEnum("tier", ["basic", "mid", "high", "legendary"]).notNull().default("basic"),
  slot: mysqlEnum("slot", ["weapon", "helmet", "armor", "boots", "accessory"]).notNull(),
  levelReq: int("level_req").notNull().default(1),
  /** 基礎屬性加成 */
  hpBonus: int("hp_bonus").notNull().default(0),
  atkBonus: int("atk_bonus").notNull().default(0),
  defBonus: int("def_bonus").notNull().default(0),
  spdBonus: int("spd_bonus").notNull().default(0),
  matkBonus: int("matk_bonus").notNull().default(0),
  mpBonus: int("mp_bonus").notNull().default(0),
  /** 特殊詞條（JSON，最多 3 個） */
  affixes: json("affixes"),
  /** 套裝 ID（如 SET_WOOD_LEGENDARY） */
  setId: varchar("set_id", { length: 30 }),
  /** 套裝第幾件（1~5） */
  setPiece: int("set_piece"),
  /** 商店售價（NULL 表示不可購買） */
  shopPrice: int("shop_price"),
  /** NPC 收購價 */
  npcSellPrice: int("npc_sell_price").notNull().default(10),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type EquipmentTemplate = typeof equipmentTemplates.$inferSelect;
export type InsertEquipmentTemplate = typeof equipmentTemplates.$inferInsert;

/**
 * 怪物掉落表（GD-021）：定義每隻怪物可掉落的裝備及機率
 * 基礎掉落率已依 GD-015B 下修 50%（初階 7~10%、中階 1.5~2.5%、高階 0.5~1%）
 */
export const monsterDropTables = mysqlTable("monster_drop_tables", {
  id: int("id").autoincrement().primaryKey(),
  /** 怪物 ID（對應 shared/monsters.ts） */
  monsterId: varchar("monster_id", { length: 20 }).notNull(),
  /** 可掉落的裝備 ID */
  equipmentId: varchar("equipment_id", { length: 20 }).notNull(),
  /** 基礎掉落率（0.0~1.0） */
  baseDropRate: int("base_drop_rate").notNull(), // 儲存為千分比，如 80 = 8.0%
  /** 掉落權重（同 tier 內的相對機率） */
  weight: int("weight").notNull().default(100),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type MonsterDropTable = typeof monsterDropTables.$inferSelect;

/**
 * 旅人掉落計數表（GD-021）：低保系統計數器
 * 低保觸發：連續 15 場無掉落→初階保底；30 場無中階→中階保底；75 場無高階→高階保底
 */
export const agentDropCounters = mysqlTable("agent_drop_counters", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull().unique(),
  /** 連續未掉落場次（初階低保計數） */
  noDropStreak: int("no_drop_streak").notNull().default(0),
  /** 連續未掉落中階以上場次 */
  noMidStreak: int("no_mid_streak").notNull().default(0),
  /** 連續未掉落高階以上場次 */
  noHighStreak: int("no_high_streak").notNull().default(0),
  /** 總戰鬥場次 */
  totalBattles: int("total_battles").notNull().default(0),
  /** 總掉落次數 */
  totalDrops: int("total_drops").notNull().default(0),
  lastUpdated: bigint("last_updated", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentDropCounter = typeof agentDropCounters.$inferSelect;

/**
 * 旅人套裝進度表（GD-021）：追蹤套裝收集進度
 */
export const agentSetProgress = mysqlTable("agent_set_progress", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull(),
  setId: varchar("set_id", { length: 30 }).notNull(),
  /** 已收集的套裝件數 */
  piecesOwned: int("pieces_owned").notNull().default(0),
  /** 是否已啟動套裝效果 */
  isActivated: tinyint("is_activated").notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentSetProgress = typeof agentSetProgress.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 遊戲劇院（Game Theater）管理系統
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 全域遊戲參數表（gameConfig）
 * 管理員可在後台即時調整所有遊戲參數，無需重新部署
 */
export const gameConfig = mysqlTable("game_config", {
  id: int("id").autoincrement().primaryKey(),
  /** 參數鍵值（唯一識別） */
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  /** 參數值（JSON 格式，支援數字/布林/字串） */
  configValue: text("config_value").notNull(),
  /** 參數類型：number / boolean / string */
  valueType: varchar("value_type", { length: 20 }).notNull().default("number"),
  /** 顯示名稱 */
  label: varchar("label", { length: 100 }).notNull(),
  /** 說明文字 */
  description: text("description"),
  /** 分類群組：combat / economy / exploration / system / event */
  category: varchar("category", { length: 50 }).notNull().default("system"),
  /** 最小值（數字類型用） */
  minValue: float("min_value"),
  /** 最大值（數字類型用） */
  maxValue: float("max_value"),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameConfig = typeof gameConfig.$inferSelect;
export type InsertGameConfig = typeof gameConfig.$inferInsert;

/**
 * 管理員角色控制表（adminGameControl）
 * 為特定角色設定永久滿值開關或特殊狀態
 */
export const adminGameControl = mysqlTable("admin_game_control", {
  id: int("id").autoincrement().primaryKey(),
  agentId: int("agent_id").notNull().unique(),
  /** 體力永遠滿（stamina 永遠 = maxStamina） */
  infiniteStamina: tinyint("infinite_stamina").notNull().default(0),
  /** 靈力永遠滿（actionPoints 永遠 = maxActionPoints） */
  infiniteAP: tinyint("infinite_ap").notNull().default(0),
  /** HP 永遠滿（hp 永遠 = maxHp） */
  infiniteHP: tinyint("infinite_hp").notNull().default(0),
  /** MP 永遠滿（mp 永遠 = maxMp） */
  infiniteMP: tinyint("infinite_mp").notNull().default(0),
  /** 遊戲幣永遠滿（gold 永遠 = 99999） */
  infiniteGold: tinyint("infinite_gold").notNull().default(0),
  /** 是否封禁（封禁後無法進入遊戲） */
  isBanned: tinyint("is_banned").notNull().default(0),
  /** 封禁原因 */
  banReason: text("ban_reason"),
  /** 管理員備註 */
  adminNote: text("admin_note"),
  /** 最後操作管理員 */
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AdminGameControl = typeof adminGameControl.$inferSelect;
export type InsertAdminGameControl = typeof adminGameControl.$inferInsert;

/**
 * 全服廣播訊息表
 * 管理員發送的系統公告，前端輪詢顯示
 */
export const gameBroadcast = mysqlTable("game_broadcast", {
  id: int("id").autoincrement().primaryKey(),
  /** 訊息類型：info=一般公告, warning=警告, event=活動, maintenance=維護 */
  msgType: mysqlEnum("msg_type", ["info", "warning", "event", "maintenance"]).notNull().default("info"),
  /** 廣播內容 */
  content: text("content").notNull(),
  /** 發送者（管理員 openId） */
  sentBy: varchar("sent_by", { length: 255 }),
  /** 是否有效（可手動關閉） */
  isActive: tinyint("is_active").notNull().default(1),
  /** 顯示到期時間（Unix ms，null = 永久） */
  expiresAt: bigint("expires_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameBroadcast = typeof gameBroadcast.$inferSelect;
export type InsertGameBroadcast = typeof gameBroadcast.$inferInsert;

// ─────────────────────────────────────────────
// 世界事件表：記錄每次世界 Tick 觸發的全域事件
// ─────────────────────────────────────────────
export const worldEvents = mysqlTable("world_events", {
  id: int("id").autoincrement().primaryKey(),
  /** 事件類型 */
  eventType: mysqlEnum("event_type", [
    "weather_change",   // 天氣/五行變化
    "global_blessing",  // 全服祝福
    "hidden_npc",       // 隱藏 NPC 出現
    "hidden_quest",     // 隱藏任務刷新
    "elemental_surge",  // 天災/祥瑞（五行節點強化/弱化）
    "meteor_shower",    // 流星雨（全服必觸奇遇）
    "divine_arrival",   // 神明降臨（隨機玩家獲祝福）
    "ap_regen",         // 固定靈力回復
    "manual",           // 管理員手動觸發
  ]).notNull(),
  /** 事件標題 */
  title: varchar("title", { length: 100 }).notNull(),
  /** 事件描述 */
  description: text("description").notNull(),
  /** 事件影響的節點 ID（若有） */
  affectedNodeId: varchar("affected_node_id", { length: 50 }),
  /** 事件影響的五行 */
  affectedElement: varchar("affected_element", { length: 10 }),
  /** 事件持續到（timestamp，null 表示立即結束） */
  expiresAt: bigint("expires_at", { mode: "number" }),
  /** 是否為流星雨（全服下次 Tick 必觸奇遇） */
  meteorActive: tinyint("meteor_active").notNull().default(0),
  /** 全服祝福類型（exp/gold/drop） */
  blessingType: varchar("blessing_type", { length: 20 }),
  /** 全服祝福倍率 */
  blessingMultiplier: int("blessing_multiplier").notNull().default(150),
  /** 觸發者（管理員 userId，自動觸發為 null） */
  triggeredBy: varchar("triggered_by", { length: 255 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WorldEvent = typeof worldEvents.$inferSelect;
export type InsertWorldEvent = typeof worldEvents.$inferInsert;

// ─────────────────────────────────────────────
// 全服聊天室訊息表
// ─────────────────────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  /** 發送者 agentId */
  agentId: int("agent_id").notNull(),
  /** 發送者名稱（快取，避免 JOIN） */
  agentName: varchar("agent_name", { length: 50 }).notNull(),
  /** 發送者五行（顯示顏色用） */
  agentElement: varchar("agent_element", { length: 10 }).notNull().default("wood"),
  /** 發送者等級 */
  agentLevel: int("agent_level").notNull().default(1),
  /** 訊息內容（最多100字） */
  content: varchar("content", { length: 100 }).notNull(),
  /** 訊息類型（一般/系統/世界事件） */
  msgType: mysqlEnum("msg_type", ["normal", "system", "world_event"]).notNull().default("normal"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ─────────────────────────────────────────────
// 週冠軍成就表
// ─────────────────────────────────────────────
export const weeklyChampions = mysqlTable("weekly_champions", {
  id: int("id").autoincrement().primaryKey(),
  /** 週次（格式：YYYY-WW） */
  weekKey: varchar("week_key", { length: 10 }).notNull(),
  /** 冠軍類型 */
  championType: mysqlEnum("champion_type", ["level", "combat"]).notNull(),
  /** 獲獎 agentId */
  agentId: int("agent_id").notNull(),
  /** 獲獎旅人名稱 */
  agentName: varchar("agent_name", { length: 50 }).notNull(),
  /** 獲獎數值（等級數 or 戰鬥場次） */
  score: int("score").notNull().default(0),
  /** 是否已頒發徽章 */
  badgeGranted: tinyint("badge_granted").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type WeeklyChampion = typeof weeklyChampions.$inferSelect;

// ─────────────────────────────────────────────
// PvP 挑戰記錄表
// ─────────────────────────────────────────────
export const pvpChallenges = mysqlTable("pvp_challenges", {
  id: int("id").autoincrement().primaryKey(),
  /** 挑戰者 agentId */
  challengerAgentId: int("challenger_agent_id").notNull(),
  /** 挑戰者名稱 */
  challengerName: varchar("challenger_name", { length: 50 }).notNull(),
  /** 被挑戰者 agentId */
  defenderAgentId: int("defender_agent_id").notNull(),
  /** 被挑戰者名稱 */
  defenderName: varchar("defender_name", { length: 50 }).notNull(),
  /** 挑戰狀態：pending=等待回應 / accepted=已接受 / declined=已拒絕 / timeout=逾時 / completed=已完成 */
  status: mysqlEnum("status", ["pending", "accepted", "declined", "timeout", "completed"]).notNull().default("completed"),
  /** 結果（challenger_win / defender_win / draw） */
  result: mysqlEnum("result", ["challenger_win", "defender_win", "draw"]).notNull(),
  /** 戰鬥詳情 JSON */
  battleLog: json("battle_log"),
  /** 挑戰者獲得的金幣獎勵 */
  goldReward: int("gold_reward").notNull().default(0),
  /** 挑戰者獲得的經驗獎勵 */
  expRewardChallenger: int("exp_reward_challenger").notNull().default(0),
  /** 被挑戰者獲得的經驗獎勵 */
  expRewardDefender: int("exp_reward_defender").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type PvpChallenge = typeof pvpChallenges.$inferSelect;

// ─────────────────────────────────────────────
// PvP 戰績統計表（快取，每次 PvP 後更新）
// ─────────────────────────────────────────────
export const agentPvpStats = mysqlTable("agent_pvp_stats", {
  id: int("id").autoincrement().primaryKey(),
  /** 角色 ID */
  agentId: int("agent_id").notNull(),
  /** 角色名稱（快取） */
  agentName: varchar("agent_name", { length: 50 }).notNull(),
  /** 五行屬性（快取） */
  agentElement: varchar("agent_element", { length: 10 }).notNull().default("wood"),
  /** 等級（快取） */
  agentLevel: int("agent_level").notNull().default(1),
  /** 勝場數 */
  wins: int("wins").notNull().default(0),
  /** 敗場數 */
  losses: int("losses").notNull().default(0),
  /** 平局數 */
  draws: int("draws").notNull().default(0),
  /** 當前連勝數 */
  currentStreak: int("current_streak").notNull().default(0),
  /** 歷史最高連勝 */
  maxStreak: int("max_streak").notNull().default(0),
  /** 最後挑戰時間 */
  lastChallengeAt: bigint("last_challenge_at", { mode: "number" }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentPvpStats = typeof agentPvpStats.$inferSelect;
export type InsertAgentPvpStats = typeof agentPvpStats.$inferInsert;

// ─────────────────────────────────────────────
// 成就定義表
// ─────────────────────────────────────────────
export const achievements = mysqlTable("achievements", {
  id: varchar("id", { length: 50 }).primaryKey(),
  /** 成就名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 成就描述 */
  desc: text("desc").notNull(),
  /** 成就圖示（emoji） */
  icon: varchar("icon", { length: 10 }).notNull().default("🏅"),
  /** 成就類型 */
  type: mysqlEnum("type", ["level", "pvp", "combat", "gather", "explore", "legendary", "weekly", "chat", "special"]).notNull().default("special"),
  /** 解鎖條件 JSON（{ metric: string, threshold: number }） */
  condition: json("condition").$type<{ metric: string; threshold: number }>().notNull(),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  /** 排序 */
  sortOrder: int("sort_order").notNull().default(0),
});
export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

// ─────────────────────────────────────────────
// 玩家成就解鎖記錄表
// ─────────────────────────────────────────────
export const agentAchievements = mysqlTable("agent_achievements", {
  id: int("id").autoincrement().primaryKey(),
  /** 角色 ID */
  agentId: int("agent_id").notNull(),
  /** 成就 ID */
  achievementId: varchar("achievement_id", { length: 50 }).notNull(),
  /** 當前進度（用於顯示進度條） */
  progress: int("progress").notNull().default(0),
  /** 是否已解鎖 */
  unlocked: tinyint("unlocked").notNull().default(0),
  /** 解鎖時間 */
  unlockedAt: bigint("unlocked_at", { mode: "number" }),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AgentAchievement = typeof agentAchievements.$inferSelect;
export type InsertAgentAchievement = typeof agentAchievements.$inferInsert;


// ═══════════════════════════════════════════════════════════════════════════
// GD022 技能系統 DB Schema
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// 技能模板表（靜態資料，由企劃填入）
// ─────────────────────────────────────────────
export const skillTemplates = mysqlTable("skill_templates", {
  /** 技能 ID，例：S_Wd001 */
  id: varchar("id", { length: 20 }).primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  /** 屬性：wood/fire/earth/metal/water/cross */
  element: varchar("element", { length: 10 }).notNull(),
  /** 類型：active/passive/life/forge/hidden/fusion */
  category: varchar("category", { length: 20 }).notNull(),
  /** 稀有度：basic/rare/epic/legend/fate/hidden */
  rarity: varchar("rarity", { length: 20 }).notNull(),
  /** 覺醒階段 0=普通 1=大招 2=奧義 3=神技 */
  tier: int("tier").notNull().default(0),
  mpCost: int("mp_cost").notNull().default(0),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(0),
  effectDesc: text("effect_desc").notNull(),
  /** 倍率或效果數值 */
  effectValue: float("effect_value").notNull().default(1.0),
  /** 異常狀態：burn/freeze/stun/bleed/silence/charm */
  statusEffect: varchar("status_effect", { length: 50 }),
  /** 異常狀態觸發機率 0~1 */
  statusChance: float("status_chance").default(0),
  /** 目標類型：single/all/self/ally */
  targetType: varchar("target_type", { length: 20 }).notNull().default("single"),
  /** 取得方式：shop/quest/drop/trigger */
  acquireMethod: varchar("acquire_method", { length: 20 }).notNull(),
  /** 連擊標籤，逗號分隔，例："fire,aoe,burn" */
  comboTags: varchar("combo_tags", { length: 100 }),
  isActive: tinyint("is_active").notNull().default(1),
});
export type SkillTemplate = typeof skillTemplates.$inferSelect;
export type InsertSkillTemplate = typeof skillTemplates.$inferInsert;

// ─────────────────────────────────────────────
// 角色已習得技能表（動態資料）
// ─────────────────────────────────────────────
export const agentSkills = mysqlTable("agent_skills", {
  id: int("id").primaryKey().autoincrement(),
  /** 對應 game_agents.id */
  agentId: int("agent_id").notNull(),
  /** 對應 skill_templates.id */
  skillId: varchar("skill_id", { length: 20 }).notNull(),
  /** 當前覺醒階段 */
  awakeTier: int("awake_tier").notNull().default(0),
  /** 累計使用次數（覺醒條件） */
  useCount: int("use_count").notNull().default(0),
  /** 裝備槽位，null=未裝備；skillSlot1~8 / passiveSlot1~5 / hiddenSlot1~3 */
  installedSlot: varchar("installed_slot", { length: 20 }),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});
export type AgentSkill = typeof agentSkills.$inferSelect;
export type InsertAgentSkill = typeof agentSkills.$inferInsert;

// ─────────────────────────────────────────────
// 技能書道具表（掉落後需使用才習得）
// ─────────────────────────────────────────────
export const skillBooks = mysqlTable("skill_books", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agent_id").notNull(),
  skillId: varchar("skill_id", { length: 20 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  obtainedAt: timestamp("obtained_at").defaultNow(),
});
export type SkillBook = typeof skillBooks.$inferSelect;
export type InsertSkillBook = typeof skillBooks.$inferInsert;

// ─────────────────────────────────────────────
// 技能覺醒素材表（精華 + 天命碎片）
// ─────────────────────────────────────────────
export const awakeMaterials = mysqlTable("awake_materials", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agent_id").notNull(),
  /** wood_essence / fire_essence / earth_essence / metal_essence / water_essence / fate_shard */
  materialType: varchar("material_type", { length: 30 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
export type AwakeMaterial = typeof awakeMaterials.$inferSelect;
export type InsertAwakeMaterial = typeof awakeMaterials.$inferInsert;

// ─────────────────────────────────────────────
// 隱藏技能觸發條件追蹤表
// ─────────────────────────────────────────────
export const hiddenSkillTrackers = mysqlTable("hidden_skill_trackers", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agent_id").notNull(),
  /** 例："S_Wd051_kill_count" / "S_X032_low_battery_wins" */
  trackerId: varchar("tracker_id", { length: 50 }).notNull(),
  currentValue: int("current_value").notNull().default(0),
  targetValue: int("target_value").notNull(),
  isUnlocked: tinyint("is_unlocked").notNull().default(0),
  unlockedAt: timestamp("unlocked_at"),
});
export type HiddenSkillTracker = typeof hiddenSkillTrackers.$inferSelect;
export type InsertHiddenSkillTracker = typeof hiddenSkillTrackers.$inferInsert;

// ─────────────────────────────────────────────
// 全服首觸發記錄表
// ─────────────────────────────────────────────
export const globalFirstTriggers = mysqlTable("global_first_triggers", {
  skillId: varchar("skill_id", { length: 20 }).primaryKey(),
  firstAgentId: int("first_agent_id").notNull(),
  firstAgentName: varchar("first_agent_name", { length: 50 }).notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow(),
});
export type GlobalFirstTrigger = typeof globalFirstTriggers.$inferSelect;
export type InsertGlobalFirstTrigger = typeof globalFirstTriggers.$inferInsert;

// ─────────────────────────────────────────────
// 隱藏商店實例表（當前活躍的隱藏商店）
// ─────────────────────────────────────────────
export const hiddenShopInstances = mysqlTable("hidden_shop_instances", {
  id: int("id").primaryKey().autoincrement(),
  /** 出現的地圖節點 ID */
  nodeId: varchar("node_id", { length: 50 }).notNull(),
  /** 觸發原因：world_tick / node_explore / meteor_shower */
  triggerReason: varchar("trigger_reason", { length: 30 }).notNull().default("world_tick"),
  /** 商品列表（JSON 陣列，從 gameHiddenShopPool 抽取） */
  items: json("items").$type<Array<{ itemId: number; price: number; quantity: number }>>().notNull(),
  /** 開始時間（毫秒 timestamp） */
  startAt: bigint("start_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 結束時間（毫秒 timestamp，預設 30 分鐘後） */
  expiresAt: bigint("expires_at", { mode: "number" }).notNull().$defaultFn(() => Date.now() + 30 * 60 * 1000),
  /** 是否已關閉 */
  isClosed: tinyint("is_closed").notNull().default(0),
});
export type HiddenShopInstance = typeof hiddenShopInstances.$inferSelect;
export type InsertHiddenShopInstance = typeof hiddenShopInstances.$inferInsert;

// ─────────────────────────────────────────────
// 奇遇事件設定表（管理員可自訂奇遇內容與獎勵）
// ─────────────────────────────────────────────
export const gameRogueEvents = mysqlTable("game_rogue_events", {
  id: int("id").primaryKey().autoincrement(),
  /** 事件唯一識別碼（英文，用於程式邏輯） */
  eventId: varchar("event_id", { length: 50 }).notNull().unique(),
  /** 事件名稱（中文顯示用） */
  name: varchar("name", { length: 50 }).notNull(),
  /** 事件描述（顯示給玩家的文字） */
  description: text("description").notNull(),
  /** 事件圖示（emoji） */
  icon: varchar("icon", { length: 10 }).notNull().default("✨"),
  /** 獎勵類型：gold / exp / item / heal / buff / debuff / mixed */
  rewardType: varchar("reward_type", { length: 20 }).notNull().default("gold"),
  /** 金幣獎勵最小值（0 表示無金幣獎勵） */
  goldMin: int("gold_min").notNull().default(0),
  /** 金幣獎勵最大值 */
  goldMax: int("gold_max").notNull().default(0),
  /** 經驗值獎勵（0 表示無經驗獎勵） */
  expReward: int("exp_reward").notNull().default(0),
  /** HP 變化（正數=回血，負數=扣血，0=無變化） */
  hpChange: int("hp_change").notNull().default(0),
  /** 是否完全回復 HP/MP */
  healFull: tinyint("heal_full").notNull().default(0),
  /** 道具獎勵 ID（空字串表示無道具獎勵） */
  itemRewardId: varchar("item_reward_id", { length: 50 }).notNull().default(""),
  /** 道具獎勵數量 */
  itemRewardQty: int("item_reward_qty").notNull().default(0),
  /** 觸發機率權重（越高越容易觸發，預設 10） */
  weight: int("weight").notNull().default(10),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  /** 適用的五行屬性（空字串=所有屬性，wood/fire/earth/metal/water=特定屬性） */
  wuxingFilter: varchar("wuxing_filter", { length: 10 }).notNull().default(""),
  /** 最低等級限制（0=無限制） */
  minLevel: int("min_level").notNull().default(0),
  /** 建立時間 */
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 更新時間 */
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameRogueEvent = typeof gameRogueEvents.$inferSelect;
export type InsertGameRogueEvent = typeof gameRogueEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────
// 拍賣行系統
// ─────────────────────────────────────────────────────────────

/**
 * 拍賣行上架列表
 * 每位玩家最多同時上架 3 件
 */
export const auctionListings = mysqlTable("auction_listings", {
  id: int("id").primaryKey().autoincrement(),
  /** 賣家 agent ID */
  sellerAgentId: int("seller_agent_id").notNull(),
  /** 賣家名稱（快取，避免 join） */
  sellerName: varchar("seller_name", { length: 50 }).notNull(),
  /** 道具 ID（對應 gameItems） */
  itemId: varchar("item_id", { length: 50 }).notNull(),
  /** 道具名稱（快取） */
  itemName: varchar("item_name", { length: 100 }).notNull(),
  /** 道具稀有度（快取） */
  itemRarity: varchar("item_rarity", { length: 20 }).notNull().default("common"),
  /** 道具五行屬性（快取） */
  itemElement: varchar("item_element", { length: 20 }).notNull().default(""),
  /** 上架數量 */
  quantity: int("quantity").notNull().default(1),
  /** 賣家設定的金幣售價 */
  price: int("price").notNull(),
  /** 狀態：active=在售, sold=已售出, cancelled=已下架 */
  status: varchar("status", { length: 20 }).notNull().default("active"),
  /** 買家 agent ID（成交後填入） */
  buyerAgentId: int("buyer_agent_id"),
  /** 買家名稱（成交後填入） */
  buyerName: varchar("buyer_name", { length: 50 }),
  /** 成交時間 */
  soldAt: bigint("sold_at", { mode: "number" }),
  /** 上架時間 */
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 更新時間 */
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type AuctionListing = typeof auctionListings.$inferSelect;
export type InsertAuctionListing = typeof auctionListings.$inferInsert;


/**
 * 魔物技能圖鑑表（M3D 新增）
 * 定義魔物專屬技能，與玩家技能分開管理
 * ID 格式：SK_M001, SK_M002, ...
 */
export const gameMonsterSkillCatalog = mysqlTable("game_monster_skill_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 魔物技能唯一識別碼，如 SK_M001 */
  monsterSkillId: varchar("monster_skill_id", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  /** 五行屬性：木/火/土/金/水 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 技能類型：attack / heal / buff / debuff / special / passive */
  skillType: varchar("skill_type", { length: 20 }).notNull().default("attack"),
  /** 稀有度：common / rare / epic / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  /** 威力 %（基礎攻擊的倍率，如 150 = 150%） */
  powerPercent: int("power_percent").notNull().default(100),
  /** MP 消耗 */
  mpCost: int("mp_cost").notNull().default(0),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(0),
  /** 命中率修正 %（100 = 必中） */
  accuracyMod: int("accuracy_mod").notNull().default(100),
  /** 附加效果（JSON：{type, chance, duration, value}） */
  additionalEffect: json("additional_effect").$type<{type: string; chance: number; duration?: number; value?: number} | null>().default(null),
  /** AI 使用條件（JSON：{hpBelow, targetElement, priority}） */
  aiCondition: json("ai_condition").$type<{hpBelow?: number; targetElement?: string; priority?: number} | null>().default(null),
  /** 效果說明 */
  description: text("description"),
  isActive: tinyint("is_active").default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameMonsterSkillCatalog = typeof gameMonsterSkillCatalog.$inferSelect;
export type InsertGameMonsterSkillCatalog = typeof gameMonsterSkillCatalog.$inferInsert;


/**
 * 平衡規則自訂表
 * 管理員可自訂各圖鑑各稀有度的數值範圍上下限
 * catalogType: monster / monsterSkill / item / equipment / skill / achievement
 * rarity: 對應各圖鑑的稀有度或品質（如 common, rare, epic, legendary, white, green, blue, purple, orange, red）
 * field: 對應各圖鑑的數值欄位（如 hp, atk, def, spd, power, mp, cd, price, coins, stones, aiLevel）
 */
export const gameBalanceRules = mysqlTable("game_balance_rules", {
  id: int("id").autoincrement().primaryKey(),
  /** 圖鑑類型 */
  catalogType: varchar("catalog_type", { length: 30 }).notNull(),
  /** 稀有度/品質 */
  rarity: varchar("rarity", { length: 30 }).notNull(),
  /** 數值欄位名稱 */
  field: varchar("field", { length: 30 }).notNull(),
  /** 最小值 */
  minValue: float("min_value").notNull(),
  /** 最大值 */
  maxValue: float("max_value").notNull(),
  /** 更新時間 */
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameBalanceRule = typeof gameBalanceRules.$inferSelect;
export type InsertGameBalanceRule = typeof gameBalanceRules.$inferInsert;


// ═══════════════════════════════════════════════════════════════════════
// 天命考核 ── 技能任務鏈系統（M3O）
// ═══════════════════════════════════════════════════════════════════════

/**
 * NPC 圖鑑
 * 管理所有任務鏈相關的 NPC（技能導師、工匠、商人等）
 */
export const gameNpcCatalog = mysqlTable("game_npc_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** NPC 唯一代碼（如 npc_xila, npc_hans） */
  code: varchar("code", { length: 50 }).notNull(),
  /** NPC 名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** NPC 稱號/身份（如「傳奇刺客 / 連擊之師」） */
  title: varchar("title", { length: 200 }),
  /** 所在地點名稱（如「迷霧城・戰士公會大廳」） */
  location: varchar("location", { length: 200 }),
  /** 地圖座標 X */
  posX: int("pos_x").default(0),
  /** 地圖座標 Y */
  posY: int("pos_y").default(0),
  /** 所屬區域（初界/中界/高界） */
  region: varchar("region", { length: 30 }).default("初界"),
  /** NPC 頭像圖片 URL */
  avatarUrl: text("avatar_url"),
  /** NPC 描述/背景故事 */
  description: text("description"),
  /** 是否為隱藏 NPC（需要特殊條件才能看到） */
  isHidden: tinyint("is_hidden").notNull().default(0),
  /** 排序權重 */
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameNpcCatalog = typeof gameNpcCatalog.$inferSelect;
export type InsertGameNpcCatalog = typeof gameNpcCatalog.$inferInsert;

/**
 * 統一技能圖鑑（三表合一）
 * 人物、寵物、魔物共用同一套技能池
 * 差異由 usable_by_player / usable_by_pet / usable_by_monster 控制
 * 怪物的強弱由掛載的技能等級決定（如 Lv1-10 小怪掛連擊 Lv1，Lv30 中怪掛連擊 Lv3）
 */
export const gameUnifiedSkillCatalog = mysqlTable("game_unified_skill_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 技能代碼（如 P01, M02, S03, A04, X01, R01） */
  code: varchar("code", { length: 10 }).notNull(),
  /** 統一技能 ID（如 USK_155，用於魔物/代理人技能槽引用） */
  skillId: varchar("skill_id", { length: 20 }).notNull().default(""),
  /** 技能名稱（如「連擊」「火焰魔法」） */
  name: varchar("name", { length: 100 }).notNull(),
  /** 任務鏈副標題（如「碎影雙刃・連環之路」） */
  questTitle: varchar("quest_title", { length: 200 }),
  /** 技能分類：physical / magic / status / support / special / resistance */
  category: varchar("category", { length: 20 }).notNull(),
  /** 技能子類型（用於戰鬥引擎判定）：
   * attack = 攻擊, heal = 治癒, buff = 增益, debuff = 減益,
   * passive = 被動, utility = 功能, defense = 防禦 */
  skillType: varchar("skill_type", { length: 20 }).notNull().default("attack"),
  /** 技能描述/效果說明 */
  description: text("description"),
  /** 五行屬性（金/木/水/火/土/無） */
  wuxing: varchar("wuxing", { length: 10 }).default("無"),
  /** 傷害/效果百分比（如 180 = 180% 物理傷害） */
  powerPercent: int("power_percent").notNull().default(100),
  /** MP 消耗 */
  mpCost: int("mp_cost").notNull().default(10),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(3),
  /** 技能等級上限 */
  maxLevel: int("max_level").notNull().default(10),
  /** 每升一級增加的效果百分比 */
  levelUpBonus: int("level_up_bonus").notNull().default(10),
  /** 命中率修正 %（100 = 必中，-40 = 降低 40%） */
  accuracyMod: int("accuracy_mod").notNull().default(100),

  // ===== 目標與計算 =====
  /** 技能目標範圍：single / t_shape / cross / all_enemy / all_ally / self / party */
  targetType: varchar("target_type", { length: 20 }).notNull().default("single"),
  /** 傷害/效果基於哪個屬性：atk / mtk / none */
  scaleStat: varchar("scale_stat", { length: 10 }).notNull().default("atk"),

  // ===== 可用性控制 =====
  /** 人物可用 */
  usableByPlayer: tinyint("usable_by_player").notNull().default(1),
  /** 寵物可用 */
  usableByPet: tinyint("usable_by_pet").notNull().default(1),
  /** 魔物可用 */
  usableByMonster: tinyint("usable_by_monster").notNull().default(1),

  // ===== 狀態異常（拆分為獨立欄位，不再用 JSON） =====
  /** 狀態異常類型：none/poison/burn/freeze/stun/slow/sleep/petrify/confuse/drunk/forget/bleed */
  statusEffectType: varchar("status_effect_type", { length: 20 }).notNull().default("none"),
  /** 狀態異常觸發機率 %（0-100） */
  statusEffectChance: int("status_effect_chance").notNull().default(0),
  /** 狀態異常持續回合數 */
  statusEffectDuration: int("status_effect_duration").notNull().default(0),
  /** 狀態異常效果值（如每回合傷害佔 ATK 的百分比） */
  statusEffectValue: int("status_effect_value").notNull().default(0),

  // ===== 連擊系統 =====
  /** 攻擊次數（最小）：1 = 單次攻擊 */
  hitCountMin: int("hit_count_min").notNull().default(1),
  /** 攻擊次數（最大）：與 hitCountMin 相同 = 固定次數 */
  hitCountMax: int("hit_count_max").notNull().default(1),
  /** 多段攻擊是否隨機選目標（true = 每段打不同怪） */
  multiTargetHit: tinyint("multi_target_hit").notNull().default(0),

  // ===== 吸血/自傷 =====
  /** 吸血百分比（造成傷害的 X% 回復 HP，0 = 無吸血） */
  lifestealPercent: int("lifesteal_percent").notNull().default(0),
  /** 自傷百分比（消耗自身 X% 當前 HP，0 = 無自傷） */
  selfDamagePercent: int("self_damage_percent").notNull().default(0),
  /** 穿透防禦百分比（無視 X% 防禦，0 = 無穿透） */
  ignoreDefPercent: int("ignore_def_percent").notNull().default(0),

  // ===== 先制/優先 =====
  /** 先制攻擊（無視速度順序） */
  isPriority: tinyint("is_priority").notNull().default(0),

  // ===== 治療系統 =====
  /** 治療類型：none/instant/hot/revive/mpRestore/cleanse */
  healType: varchar("heal_type", { length: 20 }).notNull().default("none"),
  /** HoT 持續回合數 */
  hotDuration: int("hot_duration").notNull().default(0),
  /** MP 恢復百分比（每回合恢復最大 MP 的 X%） */
  mpRestorePercent: int("mp_restore_percent").notNull().default(0),
  /** 潔淨解除異常數量（-1 = 全部） */
  cleanseCount: int("cleanse_count").notNull().default(0),

  // ===== 增益/減益系統 =====
  /** buff 影響的屬性：none/atk/def/mtk/spd/mdef/all */
  buffStat: varchar("buff_stat", { length: 10 }).notNull().default("none"),
  /** buff 百分比（正數 = 增益，負數 = 減益） */
  buffPercent: int("buff_percent").notNull().default(0),
  /** buff 持續回合數 */
  buffDuration: int("buff_duration").notNull().default(0),

  // ===== 護盾系統 =====
  /** 護盾類型：none/physical/magical/all */
  shieldType: varchar("shield_type", { length: 10 }).notNull().default("none"),
  /** 護盾可抵擋次數 */
  shieldCharges: int("shield_charges").notNull().default(0),
  /** 護盾持續回合數 */
  shieldDuration: int("shield_duration").notNull().default(0),
  /** 護盾吸收百分比（100 = 完全免疫） */
  shieldAbsorbPercent: int("shield_absorb_percent").notNull().default(0),

  // ===== 吸收系統（攻擊吸收/魔法吸收） =====
  /** 吸收類型：none/physical/magical */
  absorbType: varchar("absorb_type", { length: 10 }).notNull().default("none"),
  /** 吸收傷害轉 HP 百分比 */
  absorbPercent: int("absorb_percent").notNull().default(0),
  /** 吸收持續回合數 */
  absorbDuration: int("absorb_duration").notNull().default(0),

  // ===== 嘲諷 =====
  /** 嘲諷持續回合數（0 = 無嘲諷） */
  tauntDuration: int("taunt_duration").notNull().default(0),

  // ===== 被動技能系統 =====
  /** 是否為被動技能 */
  isPassive: tinyint("is_passive").notNull().default(0),
  /** 被動類型：none/counter/dodge/guard/lowHpBoost/statusResist */
  passiveType: varchar("passive_type", { length: 20 }).notNull().default("none"),
  /** 被動觸發基礎機率 % */
  passiveTriggerChance: int("passive_trigger_chance").notNull().default(0),
  /** 每等級增加的觸發機率 % */
  passiveChancePerLevel: int("passive_chance_per_level").notNull().default(0),
  /** 護衛時傷害減少百分比 */
  guardDamageReduction: int("guard_damage_reduction").notNull().default(0),
  /** 低血量閾值 %（HP < X% 時觸發） */
  lowHpThreshold: int("low_hp_threshold").notNull().default(0),
  /** 低血量時屬性提升百分比 */
  lowHpBoostPercent: int("low_hp_boost_percent").notNull().default(0),
  /** 抵抗的異常類型：none/petrify/sleep/confuse/poison/forget/drunk */
  resistType: varchar("resist_type", { length: 20 }).notNull().default("none"),
  /** 每等級增加的抵抗機率 % */
  resistChancePerLevel: int("resist_chance_per_level").notNull().default(0),

  // ===== 特殊效果 =====
  /** 即死效果（BOSS 無效） */
  hasInstantKill: tinyint("has_instant_kill").notNull().default(0),
  /** 即死機率 % */
  instantKillChance: int("instant_kill_chance").notNull().default(0),
  /** 偷竊效果 */
  hasSteal: tinyint("has_steal").notNull().default(0),
  /** 偷竊成功率 % */
  stealChance: int("steal_chance").notNull().default(0),
  /** 封印五行屬性 */
  hasSealWuxing: tinyint("has_seal_wuxing").notNull().default(0),
  /** 封印持續回合數 */
  sealDuration: int("seal_duration").notNull().default(0),

  // ===== 防禦觸發（明鏡止水） =====
  /** 防禦時觸發 */
  onDefendTrigger: tinyint("on_defend_trigger").notNull().default(0),
  /** 防禦時回復 HP 百分比 */
  defendHealPercent: int("defend_heal_percent").notNull().default(0),
  /** 防禦時回復 MP 百分比 */
  defendMpPercent: int("defend_mp_percent").notNull().default(0),

  // ===== AI 使用條件（魔物 AI 用） =====
  /** AI 使用條件：HP 低於 X% 時使用（0 = 無條件） */
  aiHpBelow: int("ai_hp_below").notNull().default(0),
  /** AI 優先級（數字越高越優先使用） */
  aiPriority: int("ai_priority").notNull().default(5),
  /** AI 目標偏好元素（空 = 無偏好） */
  aiTargetElement: varchar("ai_target_element", { length: 10 }).notNull().default(""),

  // ===== 學習/取得 =====
  /** 稀有度：common / uncommon / rare / epic / legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("rare"),
  /** 習得代價 JSON { gold?: number, soulCrystal?: number, items?: [{name, count}], reputation?: {area, amount} } */
  learnCost: json("learn_cost"),
  /** 前置條件 JSON [skillCode1, skillCode2, ...] */
  prerequisites: json("prerequisites"),
  /** 前置等級需求 */
  prerequisiteLevel: int("prerequisite_level"),
  /** 教導此技能的 NPC ID（關聯 gameNpcCatalog） */
  npcId: int("npc_id"),

  // ===== 保留的 JSON 欄位（僅供向後兼容和未來擴展） =====
  /** 附加效果 JSON（向後兼容） */
  additionalEffect: json("additional_effect"),
  /** 特殊機制 JSON（向後兼容） */
  specialMechanic: json("special_mechanic"),

  /** 圖示 URL */
  iconUrl: text("icon_url"),
  /** 排序權重 */
  sortOrder: int("sort_order").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameUnifiedSkillCatalog = typeof gameUnifiedSkillCatalog.$inferSelect;
export type InsertGameUnifiedSkillCatalog = typeof gameUnifiedSkillCatalog.$inferInsert;

// Backward-compatible aliases
export const gameQuestSkillCatalog = gameUnifiedSkillCatalog;
export type GameQuestSkillCatalog = GameUnifiedSkillCatalog;
export type InsertGameQuestSkillCatalog = InsertGameUnifiedSkillCatalog;

/**
 * 技能任務鏈步驟
 * 每個技能有 3~4 個步驟 + 最終確認
 */
export const gameQuestSteps = mysqlTable("game_quest_steps", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯的技能 ID（gameUnifiedSkillCatalog） */
  skillId: int("skill_id").notNull(),
  /** 步驟序號（1, 2, 3, 4...；最終確認 = 99） */
  stepNumber: int("step_number").notNull(),
  /** 步驟標題（如「邂逅傳奇刺客」） */
  title: varchar("title", { length: 200 }).notNull(),
  /** NPC 對話文本 */
  dialogue: text("dialogue"),
  /** 任務目標描述 */
  objective: text("objective"),
  /** 任務地點 */
  location: varchar("location", { length: 200 }),
  /** 任務目標 JSON（結構化）
   * { type: "kill"|"collect"|"boss"|"challenge"|"deliver"|"survive"|"craft",
   *   targets?: [{name, count, dropRate?}],
   *   boss?: {name, hp, stars, traits?, drops?},
   *   conditions?: string[],
   *   timeLimit?: number } */
  objectives: json("objectives"),
  /** 步驟獎勵 JSON { exp?: number, gold?: number, silver?: number, items?: [{name, count}], titles?: string[] } */
  rewards: json("rewards"),
  /** 步驟特殊機制說明 */
  specialNote: text("special_note"),
  /** 涉及的 NPC ID（可能與主 NPC 不同，如 P6 Step2 的漢斯） */
  npcId: int("npc_id"),
  /** 排序權重 */
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameQuestStep = typeof gameQuestSteps.$inferSelect;
export type InsertGameQuestStep = typeof gameQuestSteps.$inferInsert;

/**
 * 玩家任務鏈進度追蹤
 * 記錄每個玩家在每個技能任務鏈的進度
 */
export const gameQuestProgress = mysqlTable("game_quest_progress", {
  id: int("id").autoincrement().primaryKey(),
  /** 玩家的代理人 ID（關聯 gameAgents） */
  agentId: int("agent_id").notNull(),
  /** 技能 ID（關聯 gameUnifiedSkillCatalog） */
  skillId: int("skill_id").notNull(),
  /** 當前步驟序號（0=未開始, 1~4=進行中, 99=最終確認, 100=已完成） */
  currentStep: int("current_step").notNull().default(0),
  /** 當前步驟的子進度 JSON（如 { killed: 10, required: 15 }） */
  stepProgress: json("step_progress"),
  /** 狀態：not_started / in_progress / ready_to_confirm / completed */
  status: varchar("status", { length: 20 }).notNull().default("not_started"),
  /** 開始時間 */
  startedAt: bigint("started_at", { mode: "number" }),
  /** 完成時間 */
  completedAt: bigint("completed_at", { mode: "number" }),
  /** 習得的技能等級（完成後從 1 開始） */
  skillLevel: int("skill_level").notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameQuestProgress = typeof gameQuestProgress.$inferSelect;
export type InsertGameQuestProgress = typeof gameQuestProgress.$inferInsert;

/**
 * 玩家已習得的天命考核技能
 * 習得後可裝備到主技能欄（與現有 agentSkills 共用技能欄位）
 */
export const gameLearnedQuestSkills = mysqlTable("game_learned_quest_skills", {
  id: int("id").autoincrement().primaryKey(),
  /** 玩家的代理人 ID */
  agentId: int("agent_id").notNull(),
  /** 技能 ID（關聯 gameUnifiedSkillCatalog） */
  skillId: int("skill_id").notNull(),
  /** 當前技能等級 */
  level: int("level").notNull().default(1),
  /** 技能經驗值（用於升級） */
  exp: int("exp").notNull().default(0),
  /** 是否已裝備到技能欄 */
  isEquipped: tinyint("is_equipped").notNull().default(0),
  /** 裝備的技能欄位置（1~6，0=未裝備） */
  slotIndex: int("slot_index").notNull().default(0),
  /** 習得時間 */
  learnedAt: bigint("learned_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameLearnedQuestSkill = typeof gameLearnedQuestSkills.$inferSelect;
export type InsertGameLearnedQuestSkill = typeof gameLearnedQuestSkills.$inferInsert;


// ═══════════════════════════════════════════════════════════════════════
// M7: 寵物系統 (GD-019)
// ═══════════════════════════════════════════════════════════════════════

/**
 * 寵物圖鑑（管理員定義的寵物種族模板）
 * 每種寵物有基礎屬性、種族、屬性、天生技能池
 */
export const gamePetCatalog = mysqlTable("game_pet_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** 寵物名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 寵物描述 */
  description: text("description"),
  /** 種族：dragon/undead/normal/insect/plant/flying */
  race: varchar("race", { length: 30 }).notNull().default("normal"),
  /** 五行屬性：wood/fire/earth/metal/water */
  wuxing: varchar("wuxing", { length: 20 }).notNull().default("earth"),
  /** 稀有度：common/rare/epic/legendary */
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
  /** 成長型態：fighter/guardian/swift/mage/balanced */
  growthType: varchar("growth_type", { length: 20 }).notNull().default("balanced"),
  /** 基礎 BP 五維（捕捉時的初始分配參考） */
  baseBpConstitution: int("base_bp_constitution").notNull().default(20),
  baseBpStrength: int("base_bp_strength").notNull().default(20),
  baseBpDefense: int("base_bp_defense").notNull().default(20),
  baseBpAgility: int("base_bp_agility").notNull().default(20),
  baseBpMagic: int("base_bp_magic").notNull().default(20),
  /** 來源魔物圖鑑 monsterId（如 M_W001，用於捕捉時對應） */
  sourceMonsterKey: varchar("source_monster_key", { length: 30 }).default(""),
  // ===== GD-028 新增欄位 =====
  /** 木屬性百分比（繼承自魔物，固定） */
  wuxingWood: int("wuxing_wood").notNull().default(20),
  /** 火屬性百分比 */
  wuxingFire: int("wuxing_fire").notNull().default(20),
  /** 土屬性百分比 */
  wuxingEarth: int("wuxing_earth").notNull().default(20),
  /** 金屬性百分比 */
  wuxingMetal: int("wuxing_metal").notNull().default(20),
  /** 水屬性百分比 */
  wuxingWater: int("wuxing_water").notNull().default(20),
  /** 基礎魔法防禦 */
  baseMagicDefense: int("base_magic_defense").notNull().default(5),
  /** 基礎回復力 */
  baseHealPower: int("base_heal_power").notNull().default(0),
  /** 種族（統一10種：humanoid/beast/plant/undead/dragon/flying/insect/special/metal/demon） */
  species: varchar("species", { length: 20 }).notNull().default("beast"),
  /** 種族 HP 倍率（龍×1.3, 不死×1.2, 一般×1.0, 昆蟲×0.9, 植物×0.8, 飛行×1.0） */
  raceHpMultiplier: float("race_hp_multiplier").notNull().default(1.0),
  /** 可出現的最低等級 */
  minLevel: int("min_level").notNull().default(1),
  /** 可出現的最高等級 */
  maxLevel: int("max_level").notNull().default(50),
  /** 捕捉基礎率（0-100，預設 30） */
  baseCaptureRate: int("base_capture_rate").notNull().default(30),
  /** 圖片 URL */
  imageUrl: text("image_url"),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  /** 排序 */
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePetCatalog = typeof gamePetCatalog.$inferSelect;
export type InsertGamePetCatalog = typeof gamePetCatalog.$inferInsert;

/**
 * 寵物天生技能池（每種寵物可擁有的天生技能定義）
 * 天生技能在捕捉時/Lv20/Lv50 自動解鎖，種族固定不可刪除
 */
export const gamePetInnateSkills = mysqlTable("game_pet_innate_skills", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬寵物圖鑑 ID */
  petCatalogId: int("pet_catalog_id").notNull(),
  /** 技能名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 技能描述 */
  description: text("description"),
  /** 技能類型：attack/heal/buff/debuff/utility */
  skillType: varchar("skill_type", { length: 20 }).notNull().default("attack"),
  /** 五行屬性 */
  wuxing: varchar("wuxing", { length: 20 }),
  /** 威力百分比 */
  powerPercent: int("power_percent").notNull().default(100),
  /** MP 消耗 */
  mpCost: int("mp_cost").notNull().default(5),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(2),
  /** 解鎖等級（1=捕捉時, 20=Lv20, 50=Lv50） */
  unlockLevel: int("unlock_level").notNull().default(1),
  /** 技能欄位置（1-3） */
  slotIndex: int("slot_index").notNull().default(1),
  /** 排序 */
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePetInnateSkill = typeof gamePetInnateSkills.$inferSelect;
export type InsertGamePetInnateSkill = typeof gamePetInnateSkills.$inferInsert;

/**
 * 玩家寵物（玩家捕捉到的寵物實例）
 * 每隻寵物有獨立的等級、BP、技能配置
 */
export const gamePlayerPets = mysqlTable("game_player_pets", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬玩家角色 ID */
  agentId: int("agent_id").notNull(),
  /** 寵物圖鑑 ID */
  petCatalogId: int("pet_catalog_id").notNull(),
  /** 寵物暱稱（玩家可自訂） */
  nickname: varchar("nickname", { length: 100 }),
  /** 當前等級 */
  level: int("level").notNull().default(1),
  /** 當前經驗值 */
  exp: int("exp").notNull().default(0),
  /** 檔位等級：S/A/B/C/D/E */
  tier: varchar("tier", { length: 5 }).notNull().default("C"),
  /** BP 五維（當前累積值） */
  bpConstitution: int("bp_constitution").notNull().default(20),
  bpStrength: int("bp_strength").notNull().default(20),
  bpDefense: int("bp_defense").notNull().default(20),
  bpAgility: int("bp_agility").notNull().default(20),
  bpMagic: int("bp_magic").notNull().default(20),
  /** 未分配 BP（升級時獲得，玩家手動分配） */
  bpUnallocated: int("bp_unallocated").notNull().default(0),
  /** 戰鬥數值（由 BP 推導，快取用） */
  hp: int("hp").notNull().default(50),
  maxHp: int("max_hp").notNull().default(50),
  mp: int("mp").notNull().default(30),
  maxMp: int("max_mp").notNull().default(30),
  attack: int("attack").notNull().default(10),
  defense: int("defense").notNull().default(10),
  speed: int("speed").notNull().default(10),
  magicAttack: int("magic_attack").notNull().default(10),
  /** 成長型態（繼承自圖鑑，但可能因特殊道具改變） */
  growthType: varchar("growth_type", { length: 20 }).notNull().default("balanced"),
  // ===== GD-028 新增欄位 =====
  /** 魔法防禦 */
  magicDefense: int("magic_defense").notNull().default(5),
  /** 回復力 */
  healPower: int("heal_power").notNull().default(0),
  /** 木屬性百分比（繼承自圖鑑，不可改） */
  wuxingWood: int("wuxing_wood").notNull().default(20),
  /** 火屬性百分比 */
  wuxingFire: int("wuxing_fire").notNull().default(20),
  /** 土屬性百分比 */
  wuxingEarth: int("wuxing_earth").notNull().default(20),
  /** 金屬性百分比 */
  wuxingMetal: int("wuxing_metal").notNull().default(20),
  /** 水屬性百分比 */
  wuxingWater: int("wuxing_water").notNull().default(20),
  /** 種族（繼承自圖鑑） */
  species: varchar("species", { length: 20 }).notNull().default("beast"),
  /** 寵物境界（初界/中界/高界） */
  realm: varchar("realm", { length: 10 }).notNull().default("初界"),
  /** 是否為出戰寵物 */
  isActive: tinyint("is_active").notNull().default(0),
  /** 好感度（0-100） */
  friendship: int("friendship").notNull().default(0),
  /** 捕捉時間 */
  capturedAt: bigint("captured_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePlayerPet = typeof gamePlayerPets.$inferSelect;
export type InsertGamePlayerPet = typeof gamePlayerPets.$inferInsert;

/**
 * 寵物已學天命技能（玩家寵物學習的可替換技能）
 * 天命技能在 Lv15/Lv35/Lv60 解鎖格子，14 種可學，可替換可升級
 */
export const gamePetLearnedSkills = mysqlTable("game_pet_learned_skills", {
  id: int("id").autoincrement().primaryKey(),
  /** 所屬玩家寵物 ID */
  playerPetId: int("player_pet_id").notNull(),
  /** 技能名稱 */
  skillName: varchar("skill_name", { length: 100 }).notNull(),
  /** 技能類型：attack/heal/buff/debuff/control */
  skillType: varchar("skill_type", { length: 20 }).notNull().default("attack"),
  /** 技能子類型（對應 14 種天命技能：combo/counter/crush/poison/fireMagic/iceMagic/windMagic/meteorMagic/sleepMagic/petrifyMagic/confuseMagic/poisonMagic/forgetMagic/healMagic） */
  skillKey: varchar("skill_key", { length: 50 }).notNull(),
  /** 五行屬性 */
  wuxing: varchar("wuxing", { length: 20 }),
  /** 威力百分比 */
  powerPercent: int("power_percent").notNull().default(100),
  /** MP 消耗 */
  mpCost: int("mp_cost").notNull().default(8),
  /** 冷卻回合數 */
  cooldown: int("cooldown").notNull().default(3),
  /** 技能等級（1-10） */
  skillLevel: int("skill_level").notNull().default(1),
  /** 累積使用次數（升級用） */
  usageCount: int("usage_count").notNull().default(0),
  /** 技能欄位置（4-6，對應天命技能格） */
  slotIndex: int("slot_index").notNull().default(4),
  /** 是否裝備中 */
  isEquipped: tinyint("is_equipped").notNull().default(1),
  learnedAt: bigint("learned_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePetLearnedSkill = typeof gamePetLearnedSkills.$inferSelect;
export type InsertGamePetLearnedSkill = typeof gamePetLearnedSkills.$inferInsert;


// ═══════════════════════════════════════════════════════════════
// GD-020 戰鬥系統 V2 — 回合制戰鬥實例表
// ═══════════════════════════════════════════════════════════════

/** 戰鬥模式枚舉 */
export const battleModeEnum = mysqlEnum("battle_mode", ["idle", "player_closed", "player_open", "pvp", "map_mob", "boss"]);
/** 戰鬥狀態枚舉 */
export const battleStateEnum = mysqlEnum("battle_state", ["waiting", "speed_sort", "turn_begin", "player_turn", "enemy_turn", "calculating", "status_effect", "check_end", "ended"]);

/**
 * game_battles — 戰鬥實例
 * 每場戰鬥一筆記錄，追蹤模式、狀態機、回合數、獎勵倍率
 */
export const gameBattles = mysqlTable("game_battles", {
  id: int("id").primaryKey().autoincrement(),
  /** 戰鬥唯一 ID（UUID） */
  battleId: varchar("battle_id", { length: 64 }).notNull().unique(),
  /** 戰鬥模式 */
  mode: battleModeEnum.notNull(),
  /** 戰鬥狀態機 */
  state: battleStateEnum.notNull().default("waiting"),
  /** 當前回合數 */
  currentRound: int("current_round").notNull().default(0),
  /** 最大回合數 */
  maxRounds: int("max_rounds").notNull().default(20),
  /** 當前行動單位索引（在 participants 中的排序位置） */
  currentTurnIndex: int("current_turn_index").notNull().default(0),
  /** 行動順序快照（JSON: participantId[] 按速度排序） */
  turnOrder: json("turn_order").$type<number[]>(),
  /** 獎勵倍率（經驗/金錢/掉落共用） */
  rewardMultiplier: float("reward_multiplier").notNull().default(1.0),
  /** 發起者 agentId */
  initiatorAgentId: int("initiator_agent_id").notNull(),
  /** 地圖節點 ID（可選） */
  nodeId: varchar("node_id", { length: 64 }),
  /** 戰鬥結果：win / lose / flee / draw */
  result: varchar("result", { length: 20 }),
  /** 結算數據（JSON：expGained, goldGained, lootItems, petExpGained 等） */
  settlementData: json("settlement_data").$type<Record<string, unknown>>(),
  /** 每回合思考時間限制（秒） */
  turnTimeLimit: int("turn_time_limit").notNull().default(20),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  endedAt: bigint("ended_at", { mode: "number" }),
});
export type GameBattle = typeof gameBattles.$inferSelect;
export type InsertGameBattle = typeof gameBattles.$inferInsert;

/** 參與者類型枚舉 */
export const participantTypeEnum = mysqlEnum("participant_type", ["character", "pet", "monster"]);
/** 參與者陣營枚舉 */
export const participantSideEnum = mysqlEnum("participant_side", ["ally", "enemy"]);

/**
 * game_battle_participants — 戰鬥參與者快照
 * 記錄每個參與者在戰鬥開始時的屬性快照 + 即時 HP/MP
 */
export const gameBattleParticipants = mysqlTable("game_battle_participants", {
  id: int("id").primaryKey().autoincrement(),
  /** 關聯戰鬥 ID */
  battleId: int("battle_id").notNull(),
  /** 參與者類型 */
  participantType: participantTypeEnum.notNull(),
  /** 陣營 */
  side: participantSideEnum.notNull(),
  /** 關聯 agentId（角色/寵物擁有者） */
  agentId: int("agent_id"),
  /** 關聯 petId（寵物時） */
  petId: int("pet_id"),
  /** 關聯 monsterId（怪物時） */
  monsterId: varchar("monster_id", { length: 64 }),
  /** 顯示名稱 */
  displayName: varchar("display_name", { length: 100 }).notNull(),
  /** 等級 */
  level: int("level").notNull().default(1),
  /** 屬性快照 */
  maxHp: int("max_hp").notNull(),
  currentHp: int("current_hp").notNull(),
  maxMp: int("max_mp").notNull().default(50),
  currentMp: int("current_mp").notNull().default(50),
  attack: int("attack").notNull(),
  defense: int("defense").notNull(),
  magicAttack: int("magic_attack").notNull().default(0),
  magicDefense: int("magic_defense").notNull().default(0),
  speed: int("speed").notNull(),
  /** 五行屬性 */
  dominantElement: varchar("dominant_element", { length: 20 }),
  /** 種族 */
  race: varchar("race", { length: 50 }),
  /** 裝備技能快照（JSON） */
  equippedSkills: json("equipped_skills").$type<Array<{
    id: string; name: string; skillType: string;
    damageMultiplier: number; mpCost: number;
    wuxing?: string; cooldown?: number;
    element?: string;
  }>>(),
  /** 是否正在防禦 */
  isDefending: tinyint("is_defending").notNull().default(0),
  /** 是否已陣亡 */
  isDefeated: tinyint("is_defeated").notNull().default(0),
  /** 行動順序分數（用於排序） */
  speedScore: int("speed_score").notNull().default(0),
  /** 技能冷卻狀態（JSON: { skillId: remainingCooldown }） */
  skillCooldowns: json("skill_cooldowns").$type<Record<string, number>>(),
  /** 狀態效果（JSON） */
  activeBuffs: json("active_buffs").$type<Array<{
    type: string; duration: number; value: number;
    source: string; appliedRound: number;
  }>>()
  /** 每回合動作次數（Boss 多次行動） */,
  actionsPerTurn: int("actions_per_turn").notNull().default(1),
});
export type GameBattleParticipant = typeof gameBattleParticipants.$inferSelect;
export type InsertGameBattleParticipant = typeof gameBattleParticipants.$inferInsert;

/** 指令類型枚舉 */
export const commandTypeEnum = mysqlEnum("command_type", ["attack", "skill", "defend", "item", "flee", "surrender", "auto"]);

/**
 * game_battle_commands — 戰鬥指令記錄
 */
export const gameBattleCommands = mysqlTable("game_battle_commands", {
  id: int("id").primaryKey().autoincrement(),
  battleId: int("battle_id").notNull(),
  /** 回合數 */
  round: int("round").notNull(),
  /** 發出指令的參與者 ID */
  participantId: int("participant_id").notNull(),
  /** 指令類型 */
  commandType: commandTypeEnum.notNull(),
  /** 目標參與者 ID */
  targetId: int("target_id"),
  /** 使用的技能 ID（技能指令時） */
  skillId: varchar("skill_id", { length: 64 }),
  /** 使用的道具 ID（道具指令時） */
  itemId: varchar("item_id", { length: 64 }),
  /** 是否由 AI 自動決策 */
  isAutoDecision: tinyint("is_auto_decision").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameBattleCommand = typeof gameBattleCommands.$inferSelect;
export type InsertGameBattleCommand = typeof gameBattleCommands.$inferInsert;

/**
 * game_battle_logs — 戰鬥日誌
 * 每個行動產生一筆日誌，前端用於回放
 */
export const gameBattleLogs = mysqlTable("game_battle_logs", {
  id: int("id").primaryKey().autoincrement(),
  battleId: int("battle_id").notNull(),
  round: int("round").notNull(),
  /** 行動者參與者 ID */
  actorId: int("actor_id").notNull(),
  /** 日誌類型 */
  logType: varchar("log_type", { length: 30 }).notNull(), // damage, heal, buff, debuff, flee, defeat, status_tick
  /** 目標參與者 ID */
  targetId: int("target_id"),
  /** 傷害/治療數值 */
  value: int("value").notNull().default(0),
  /** 是否暴擊 */
  isCritical: tinyint("is_critical").notNull().default(0),
  /** 使用的技能名稱 */
  skillName: varchar("skill_name", { length: 100 }),
  /** 五行加成描述 */
  elementBoostDesc: varchar("element_boost_desc", { length: 200 }),
  /** 狀態效果描述 */
  statusEffectDesc: varchar("status_effect_desc", { length: 200 }),
  /** 文字描述 */
  message: text("message").notNull(),
  /** 額外數據（JSON） */
  detail: json("detail").$type<Record<string, unknown>>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameBattleLog = typeof gameBattleLogs.$inferSelect;
export type InsertGameBattleLog = typeof gameBattleLogs.$inferInsert;

/**
 * game_idle_sessions — 掛機記錄
 * 追蹤每次掛機的開始/結束時間和累計獎勵
 */
export const gameIdleSessions = mysqlTable("game_idle_sessions", {
  id: int("id").primaryKey().autoincrement(),
  agentId: int("agent_id").notNull(),
  /** 掛機開始時間 */
  startedAt: bigint("started_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 掛機結束時間 */
  endedAt: bigint("ended_at", { mode: "number" }),
  /** 累計經驗 */
  totalExp: int("total_exp").notNull().default(0),
  /** 累計金幣 */
  totalGold: int("total_gold").notNull().default(0),
  /** 累計戰鬥次數 */
  totalBattles: int("total_battles").notNull().default(0),
  /** 累計勝利次數 */
  totalWins: int("total_wins").notNull().default(0),
  /** 累計掉落物品（JSON） */
  totalLoot: json("total_loot").$type<Record<string, number>>(),
  /** 寵物累計經驗 */
  petTotalExp: int("pet_total_exp").notNull().default(0),
  /** 寵物累計 BP */
  petTotalBp: int("pet_total_bp").notNull().default(0),
  /** 離線封頂時間（毫秒，預設 8 小時） */
  maxDuration: bigint("max_duration", { mode: "number" }).notNull().default(8 * 60 * 60 * 1000),
  /** 是否已結算 */
  isSettled: tinyint("is_settled").notNull().default(0),
});
export type GameIdleSession = typeof gameIdleSessions.$inferSelect;
export type InsertGameIdleSession = typeof gameIdleSessions.$inferInsert;


/**
 * 寵物 BP 歷史記錄
 * 每次 BP 變動時記錄快照，用於五維雷達圖歷史變化動畫
 */
export const gamePetBpHistory = mysqlTable("game_pet_bp_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 寵物 ID */
  petId: int("pet_id").notNull(),
  /** 變動來源：battle(戰鬥)/idle(掛機)/levelup(升級)/manual(手動) */
  source: varchar("source", { length: 20 }).notNull().default("battle"),
  /** 變動描述 */
  description: varchar("description", { length: 200 }),
  /** 變動前 BP 五維 */
  prevConstitution: int("prev_constitution").notNull().default(0),
  prevStrength: int("prev_strength").notNull().default(0),
  prevDefense: int("prev_defense").notNull().default(0),
  prevAgility: int("prev_agility").notNull().default(0),
  prevMagic: int("prev_magic").notNull().default(0),
  /** 變動後 BP 五維 */
  newConstitution: int("new_constitution").notNull().default(0),
  newStrength: int("new_strength").notNull().default(0),
  newDefense: int("new_defense").notNull().default(0),
  newAgility: int("new_agility").notNull().default(0),
  newMagic: int("new_magic").notNull().default(0),
  /** 變動量 */
  deltaConstitution: int("delta_constitution").notNull().default(0),
  deltaStrength: int("delta_strength").notNull().default(0),
  deltaDefense: int("delta_defense").notNull().default(0),
  deltaAgility: int("delta_agility").notNull().default(0),
  deltaMagic: int("delta_magic").notNull().default(0),
  /** 記錄時間 */
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePetBpHistory = typeof gamePetBpHistory.$inferSelect;


/**
 * 遊戲規則指南章節
 * 後台 CMS 可管理的遊戲說明書章節
 */
export const gameGuide = mysqlTable("game_guide", {
  id: int("id").autoincrement().primaryKey(),
  /** 章節 icon（emoji 或文字） */
  icon: varchar("icon", { length: 20 }).notNull().default("📖"),
  /** 章節標題 */
  title: varchar("title", { length: 200 }).notNull(),
  /** 章節內容（Markdown 格式） */
  content: text("content").notNull(),
  /** 排序權重（數字越小越前面） */
  sortOrder: int("sort_order").notNull().default(0),
  /** 是否啟用（停用的章節不會顯示給玩家） */
  enabled: tinyint("enabled").notNull().default(1),
  /** 章節分類標籤（可選，用於前端分組） */
  category: varchar("category", { length: 50 }).default("general"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameGuide = typeof gameGuide.$inferSelect;
export type InsertGameGuide = typeof gameGuide.$inferInsert;

/**
 * 遊戲指南全域設定
 * 控制指南頁面的標題、icon、副標題等
 */
export const gameGuideConfig = mysqlTable("game_guide_config", {
  id: int("id").autoincrement().primaryKey(),
  /** 設定鍵名 */
  configKey: varchar("config_key", { length: 100 }).notNull(),
  /** 設定值 */
  configValue: text("config_value").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameGuideConfig = typeof gameGuideConfig.$inferSelect;


// ═══════════════════════════════════════════════════════════════
// 移動式 Boss 系統
// ═══════════════════════════════════════════════════════════════

/**
 * 移動式 Boss 圖鑑
 * 定義所有可生成的 Boss 模板（Tier 1/2/3）
 */
export const roamingBossCatalog = mysqlTable("roaming_boss_catalog", {
  id: int("id").autoincrement().primaryKey(),
  /** Boss 唯一代碼 */
  bossCode: varchar("boss_code", { length: 50 }).notNull(),
  /** Boss 名稱 */
  name: varchar("name", { length: 100 }).notNull(),
  /** Boss 稱號（如「深淵行者」） */
  title: varchar("title", { length: 100 }),
  /** Tier 等級：1=遊蕩精英, 2=區域守護者, 3=天命凶獸 */
  tier: int("tier").notNull().default(1),
  /** 五行屬性 */
  wuxing: varchar("wuxing", { length: 10 }).notNull(),
  /** 等級 */
  level: int("level").notNull().default(30),
  /** 基礎 HP */
  baseHp: int("base_hp").notNull().default(5000),
  /** 基礎攻擊 */
  baseAttack: int("base_attack").notNull().default(80),
  /** 基礎防禦 */
  baseDefense: int("base_defense").notNull().default(40),
  /** 基礎速度 */
  baseSpeed: int("base_speed").notNull().default(25),
  /** 基礎魔攻 */
  baseMagicAttack: int("base_magic_attack").notNull().default(60),
  /** 基礎魔防 */
  baseMagicDefense: int("base_magic_defense").notNull().default(30),
  /** Boss 專屬技能（JSON 陣列） */
  skills: json("skills").$type<Array<{
    id: string;
    name: string;
    skillType: string;
    damageMultiplier: number;
    mpCost: number;
    wuxing?: string;
    cooldown: number;
    additionalEffect?: {
      type: string;
      chance: number;
      duration?: number;
      value?: number;
    };
  }>>(),
  /** Boss 專屬掉落表（JSON 陣列） */
  dropTable: json("drop_table").$type<Array<{
    itemId: string;
    itemName: string;
    dropRate: number;
    minQty: number;
    maxQty: number;
  }>>(),
  /** 獎勵經驗倍率 */
  expMultiplier: float("exp_multiplier").notNull().default(2.0),
  /** 獎勵金幣倍率 */
  goldMultiplier: float("gold_multiplier").notNull().default(2.0),
  /** 移動間隔（秒） */
  moveIntervalSec: int("move_interval_sec").notNull().default(300),
  /** 存活時限（分鐘，0=無限） */
  lifetimeMinutes: int("lifetime_minutes").notNull().default(0),
  /** 體力消耗 */
  staminaCost: int("stamina_cost").notNull().default(15),
  /** 巡迴範圍（JSON：縣市列表或 "all"） */
  patrolRegion: json("patrol_region").$type<string[] | "all">(),
  /** 初始生成節點 ID（可選，null=隨機） */
  spawnNodeId: varchar("spawn_node_id", { length: 50 }),
  /** Boss 圖片 URL */
  imageUrl: text("image_url"),
  /** Boss 描述 */
  description: text("description"),
  /** 狂暴化設定（JSON） */
  enrageConfig: json("enrage_config").$type<{
    /** HP 百分比閾值觸發狂暴 */
    hpThresholds: Array<{
      hpPercent: number;
      atkBoost: number;
      spdBoost: number;
      message: string;
    }>;
  }>(),
  /** 基礎 MP */
  baseMP: int("base_mp").notNull().default(200),
  /** 金幣掉落（固定值） */
  goldDrop: int("gold_drop").notNull().default(0),
  /** 護衛小兵 ID 列表（來自 gameMonsterCatalog） */
  minionIds: json("minion_ids").$type<string[]>(),
  /** 五行抗性（0-50，代表百分比） */
  resistWood: int("resist_wood").notNull().default(0),
  resistFire: int("resist_fire").notNull().default(0),
  resistEarth: int("resist_earth").notNull().default(0),
  resistMetal: int("resist_metal").notNull().default(0),
  resistWater: int("resist_water").notNull().default(0),
  /** 是否啟用 */
  isActive: tinyint("is_active").notNull().default(1),
  /** 排程設定（JSON：cron 表達式或時間點列表） */
  scheduleConfig: json("schedule_config").$type<{
    /** 排程類型：always=常駐, scheduled=定時, triggered=條件觸發 */
    type: "always" | "scheduled" | "triggered";
    /** cron 表達式（scheduled 類型用） */
    cron?: string;
    /** 固定時間點列表（scheduled 類型用） */
    fixedTimes?: string[];
    /** 觸發條件描述（triggered 類型用） */
    triggerCondition?: string;
    /** 同時存在最大數量 */
    maxInstances: number;
  }>(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type RoamingBossCatalog = typeof roamingBossCatalog.$inferSelect;
export type InsertRoamingBossCatalog = typeof roamingBossCatalog.$inferInsert;

/**
 * 移動式 Boss 實例
 * 記錄當前在地圖上活躍的 Boss 實例
 */
export const roamingBossInstances = mysqlTable("roaming_boss_instances", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯的 Boss 圖鑑 ID */
  catalogId: int("catalog_id").notNull(),
  /** 當前所在節點 ID */
  currentNodeId: varchar("current_node_id", { length: 50 }).notNull(),
  /** 移動歷史（JSON：最近 10 個節點） */
  moveHistory: json("move_history").$type<string[]>(),
  /** 當前 HP（-1 表示滿血） */
  currentHp: int("current_hp").notNull().default(-1),
  /** 狀態：active=活躍, defeated=已擊敗, expired=已過期, despawned=已消失 */
  status: varchar("status", { length: 20 }).notNull().default("active"),
  /** 生成時間 */
  spawnedAt: bigint("spawned_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 過期時間（0=無限） */
  expiresAt: bigint("expires_at", { mode: "number" }).notNull().default(0),
  /** 上次移動時間 */
  lastMovedAt: bigint("last_moved_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  /** 擊敗者列表（JSON：記錄所有參與擊敗的玩家） */
  defeatedBy: json("defeated_by").$type<Array<{
    agentId: number;
    agentName: string;
    damage: number;
    timestamp: number;
  }>>(),
  /** 全服首殺標記 */
  isFirstKill: tinyint("is_first_kill").notNull().default(0),
  /** 擊殺次數（同一實例被多人挑戰的累計） */
  challengeCount: int("challenge_count").notNull().default(0),
});
export type RoamingBossInstance = typeof roamingBossInstances.$inferSelect;
export type InsertRoamingBossInstance = typeof roamingBossInstances.$inferInsert;

/**
 * Boss 擊殺記錄
 * 記錄每次 Boss 戰鬥的詳細結果
 */
export const roamingBossKillLog = mysqlTable("roaming_boss_kill_log", {
  id: int("id").autoincrement().primaryKey(),
  /** Boss 實例 ID */
  instanceId: int("instance_id").notNull(),
  /** Boss 圖鑑 ID */
  catalogId: int("catalog_id").notNull(),
  /** 挑戰者角色 ID */
  agentId: int("agent_id").notNull(),
  /** 挑戰者名稱 */
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  /** 戰鬥結果：win/lose/flee */
  result: varchar("result", { length: 20 }).notNull(),
  /** 造成的傷害 */
  damageDealt: int("damage_dealt").notNull().default(0),
  /** 戰鬥回合數 */
  rounds: int("rounds").notNull().default(0),
  /** 獲得的經驗 */
  expGained: int("exp_gained").notNull().default(0),
  /** 獲得的金幣 */
  goldGained: int("gold_gained").notNull().default(0),
  /** 獲得的掉落物（JSON） */
  dropsGained: json("drops_gained").$type<Array<{ itemId: string; itemName: string; qty: number }>>(),
  /** 是否為首殺 */
  isFirstKill: tinyint("is_first_kill").notNull().default(0),
  /** 戰鬥節點 */
  nodeId: varchar("node_id", { length: 50 }).notNull(),
  /** 戰鬥時間 */
  battleAt: bigint("battle_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type RoamingBossKillLog = typeof roamingBossKillLog.$inferSelect;
export type InsertRoamingBossKillLog = typeof roamingBossKillLog.$inferInsert;


// ═══════════════════════════════════════════════════════════════
// 裝備強化系統
// ═══════════════════════════════════════════════════════════════

/**
 * 裝備強化記錄表
 * 記錄每次強化的結果（成功/失敗/消失）
 */
export const equipEnhanceLogs = mysqlTable("equip_enhance_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 玩家角色 ID */
  agentId: int("agent_id").notNull(),
  /** 背包中的裝備 inventory ID */
  inventoryId: int("inventory_id").notNull(),
  /** 裝備 ID */
  equipId: varchar("equip_id", { length: 50 }).notNull(),
  /** 裝備名稱（快取） */
  equipName: varchar("equip_name", { length: 100 }).notNull(),
  /** 使用的卷軸 itemId */
  scrollItemId: varchar("scroll_item_id", { length: 50 }).notNull(),
  /** 強化前等級 */
  fromLevel: int("from_level").notNull(),
  /** 強化後等級（成功=+1，失敗=-1，消失=-999） */
  toLevel: int("to_level").notNull(),
  /** 結果：success / fail_downgrade / fail_destroy */
  result: varchar("result", { length: 30 }).notNull(),
  /** 強化成功率（記錄當時的成功率） */
  successRate: float("success_rate").notNull(),
  /** 記錄時間 */
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type EquipEnhanceLog = typeof equipEnhanceLogs.$inferSelect;
export type InsertEquipEnhanceLog = typeof equipEnhanceLogs.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 組隊系統（Party System）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 隊伍表
 * 記錄玩家組成的隊伍，支援 2-6 人組隊
 */
export const gameParties = mysqlTable("game_parties", {
  id: int("id").autoincrement().primaryKey(),
  /** 隊伍名稱 */
  partyName: varchar("party_name", { length: 100 }),
  /** 隊長的 agent ID */
  leaderId: int("leader_id").notNull(),
  /** 隊長名稱（快取） */
  leaderName: varchar("leader_name", { length: 100 }).notNull(),
  /** 成員 agent ID 列表 */
  memberIds: json("member_ids").$type<number[]>().notNull(),
  /** 成員名稱列表（快取） */
  memberNames: json("member_names").$type<string[]>().notNull(),
  /** 隊伍狀態：waiting 等待中 / active 戰鬥中 / disbanded 已解散 */
  status: mysqlEnum("status", ["waiting", "active", "disbanded"]).notNull().default("waiting"),
  /** 最大成員數 */
  maxMembers: int("max_members").notNull().default(4),
  /** 是否公開（允許任何人申請加入） */
  isPublic: tinyint("is_public").notNull().default(1),
  /** 當前戰鬥 ID（進行中的戰鬥） */
  currentBattleId: varchar("current_battle_id", { length: 36 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameParty = typeof gameParties.$inferSelect;
export type InsertGameParty = typeof gameParties.$inferInsert;

/**
 * 組隊邀請表
 * 記錄玩家發出的邀請，5 分鐘後過期
 */
export const gamePartyInvites = mysqlTable("game_party_invites", {
  id: int("id").autoincrement().primaryKey(),
  /** 隊伍 ID */
  partyId: int("party_id").notNull(),
  /** 被邀請者的 agent ID */
  inviteeId: int("invitee_id").notNull(),
  /** 被邀請者名稱（快取） */
  inviteeName: varchar("invitee_name", { length: 100 }).notNull(),
  /** 邀請者的 agent ID */
  inviterId: int("inviter_id").notNull(),
  /** 邀請者名稱（快取） */
  inviterName: varchar("inviter_name", { length: 100 }).notNull(),
  /** 邀請狀態：pending 待處理 / accepted 已接受 / rejected 已拒絕 / expired 已過期 */
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "expired"]).notNull().default("pending"),
  /** 過期時間（毫秒時間戳） */
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GamePartyInvite = typeof gamePartyInvites.$inferSelect;
export type InsertGamePartyInvite = typeof gamePartyInvites.$inferInsert;
