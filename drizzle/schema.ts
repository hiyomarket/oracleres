import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, tinyint, bigint, uniqueIndex, decimal, float } from "drizzle-orm/mysql-core";

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
  /** 成就分類：avatar / explore / combat / oracle */
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description").notNull(),
  /**
   * 條件類型：
   * login_days / buy_items / daily_quest_streak / collect_wuxing_sets /
   * map_checkin / gather_count / random_quest_count /
   * combat_win / catch_monster / kill_count / element_counter /
   * oracle_deep_read / disaster_quest
   */
  conditionType: varchar("condition_type", { length: 50 }).notNull(),
  conditionValue: int("condition_value").notNull(),
  /** 獎勵類型：stones / coins / title / item / frame */
  rewardType: varchar("reward_type", { length: 50 }).notNull(),
  rewardAmount: int("reward_amount").notNull(),
  /** 徽章圖片 URL（美術 TASK-010 提供） */
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
  strategy: mysqlEnum("strategy", ["explore", "gather", "rest", "combat"]).notNull().default("explore"),
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
  /** 裝備詞條等額外資料 */
  itemData: json("item_data"),
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
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameSpiritShopItem = typeof gameSpiritShop.$inferSelect;
export type InsertGameSpiritShopItem = typeof gameSpiritShop.$inferInsert;

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
  createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(() => Date.now()),
});
export type GameHiddenShopItem = typeof gameHiddenShopPool.$inferSelect;
export type InsertGameHiddenShopItem = typeof gameHiddenShopPool.$inferInsert;
