import { eq, desc, sql, count, and, lte, gte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, oracleSessions, InsertOracleSession, OracleSession, lotterySessions, InsertLotterySession, LotterySession, lotteryResults, InsertLotteryResult, LotteryResult, favoriteStores, InsertFavoriteStore, scratchLogs, InsertScratchLog, ScratchLog, braceletWearLogs, InsertBraceletWearLog, BraceletWearLog, campaigns, userSubscriptions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 自動迎新：對新用戶套用默認迎新活動的獎勵
 * 在 OAuth 回調建立新用戶後呼叫此函數
 * 如果沒有設定默認迎新活動，會靜默返回
 */
export async function applyDefaultOnboardingCampaign(userId: number): Promise<{ applied: boolean; campaignName?: string }> {
  const db = await getDb();
  if (!db) return { applied: false };
  try {
    const now = new Date();
    // 查詢是否有有效的默認迎新活動
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.isDefaultOnboarding, 1),
          eq(campaigns.isActive, 1),
          lte(campaigns.startDate, now),
          gte(campaigns.endDate, now)
        )
      )
      .limit(1);
    if (!campaign) return { applied: false };
    const ruleType = campaign.ruleType;
    const ruleValue = campaign.ruleValue as Record<string, unknown>;
    if (ruleType === 'giveaway') {
      const moduleId = ruleValue.giveaway_module_id as string;
      if (!moduleId) return { applied: false };
      // 計算到期日
      const durationDays = (ruleValue.duration_days as number) || 0;
      const expiresAt = durationDays > 0
        ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      // 查詢用戶訂閱記錄
      const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
      const existingCustom = (sub?.customModules as Array<{ module_id: string; expires_at: string | null }> ?? []);
      const already = existingCustom.find(m => m.module_id === moduleId);
      if (!already) {
        const newCustom = [...existingCustom, { module_id: moduleId, expires_at: expiresAt }];
        if (sub) {
          await db.update(userSubscriptions).set({ customModules: newCustom }).where(eq(userSubscriptions.userId, userId));
        } else {
          await db.insert(userSubscriptions).values({ userId, customModules: newCustom });
        }
      }
      console.log(`[Onboarding] Applied campaign "${campaign.name}" (module: ${moduleId}) to user #${userId}`);
      return { applied: true, campaignName: campaign.name };
    } else if (ruleType === 'discount') {
      // 貼上折扣券
      const discountPct = ruleValue.discount_percentage as number;
      const expiresAt = (ruleValue.expires_at as string | null) ?? null;
      const [u] = await db.select().from(users).where(eq(users.id, userId));
      const existing = (u?.availableDiscounts ?? []) as Array<{ campaign_id: number; discount_percentage?: number; expires_at: string | null }>;
      const newDiscounts = [...existing, { campaign_id: campaign.id, discount_percentage: discountPct, expires_at: expiresAt }];
      await db.update(users).set({ availableDiscounts: newDiscounts }).where(eq(users.id, userId));
      console.log(`[Onboarding] Applied discount campaign "${campaign.name}" to user #${userId}`);
      return { applied: true, campaignName: campaign.name };
    } else if (ruleType === 'plan_assign') {
      // 指派方案：將用戶的 planId 設為指定方案
      const planId = ruleValue.plan_id as string;
      if (!planId) return { applied: false };
      const durationDays = (ruleValue.duration_days as number) || 0;
      const planExpiresAt = durationDays > 0
        ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
        : null;
      await db.update(users)
        .set({ planId, ...(planExpiresAt ? { planExpiresAt } : {}) })
        .where(eq(users.id, userId));
      console.log(`[Onboarding] Applied plan_assign campaign "${campaign.name}" (plan: ${planId}) to user #${userId}`);
      return { applied: true, campaignName: campaign.name };
    }
    return { applied: false };
  } catch (error) {
    console.error('[Onboarding] Failed to apply default campaign:', error);
    return { applied: false };
  }
}

/**
 * 儲存擲筊記錄
 */
export async function saveOracleSession(session: InsertOracleSession): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save oracle session: database not available");
    return null;
  }
  const result = await db.insert(oracleSessions).values(session);
  return Number((result as any)[0]?.insertId) || null;
}

/**
 * 獲取擲筊歷史記錄
 */
export async function getOracleHistory(userId?: number, limit = 20): Promise<OracleSession[]> {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    return db.select().from(oracleSessions)
      .where(eq(oracleSessions.userId, userId))
      .orderBy(desc(oracleSessions.createdAt))
      .limit(limit);
  }

  return db.select().from(oracleSessions)
    .orderBy(desc(oracleSessions.createdAt))
    .limit(limit);
}

/**
 * 獲取最近一次擲筊記錄
 */
export async function getLatestOracleSession(userId?: number): Promise<OracleSession | null> {
  const sessions = await getOracleHistory(userId, 1);
  return sessions[0] || null;
}

/**
 * 獲取神諭統計數據
 */
export async function getOracleStats(userId?: number) {
  const db = await getDb();
  if (!db) return null;

  // 基礎過濾條件
  const baseWhere = userId ? eq(oracleSessions.userId, userId) : undefined;

  // 結果分布
  const resultCounts = await db
    .select({
      result: oracleSessions.result,
      count: count(),
    })
    .from(oracleSessions)
    .where(baseWhere)
    .groupBy(oracleSessions.result);

  // 問題類型分布
  const queryTypeCounts = await db
    .select({
      queryType: oracleSessions.queryType,
      count: count(),
    })
    .from(oracleSessions)
    .where(baseWhere)
    .groupBy(oracleSessions.queryType);

  // 能量等級分布
  const energyCounts = await db
    .select({
      energyLevel: oracleSessions.energyLevel,
      count: count(),
    })
    .from(oracleSessions)
    .where(baseWhere)
    .groupBy(oracleSessions.energyLevel);

  // 每月擲筊次數（最近 12 個月）
  const monthlyRaw = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      count: count(),
    })
    .from(oracleSessions)
    .where(baseWhere)
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m') DESC`)
    .limit(12);

  // 總次數
  const totalResult = await db
    .select({ total: count() })
    .from(oracleSessions)
    .where(baseWhere);

  const total = totalResult[0]?.total ?? 0;

  // 最近 10 筆記錄
  const recentSessions = await getOracleHistory(userId, 10);

  return {
    total,
    resultCounts,
    queryTypeCounts,
    energyCounts,
    monthlyCounts: monthlyRaw.reverse(), // 按時間正序
    recentSessions,
  };
}

// ============================================================
// 刮刮樂選號資料庫操作
// ============================================================

/**
 * 儲存刮刮樂選號記錄
 */
export async function saveLotterySession(session: InsertLotterySession): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save lottery session: database not available");
    return null;
  }
  const result = await db.insert(lotterySessions).values(session);
  return Number((result as any)[0]?.insertId) || null;
}

/**
 * 獲取刮刮樂選號歷史記錄
 */
export async function getLotteryHistory(userId?: number, limit = 20): Promise<LotterySession[]> {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    return db.select().from(lotterySessions)
      .where(eq(lotterySessions.userId, userId))
      .orderBy(desc(lotterySessions.createdAt))
      .limit(limit);
  }

  return db.select().from(lotterySessions)
    .orderBy(desc(lotterySessions.createdAt))
    .limit(limit);
}

/**
 * 獲取刮刮樂統計數據
 */
export async function getLotteryStats(userId?: number) {
  const db = await getDb();
  if (!db) return null;

  const baseWhere = userId ? eq(lotterySessions.userId, userId) : undefined;

  // 總次數
  const totalResult = await db
    .select({ total: count() })
    .from(lotterySessions)
    .where(baseWhere);

  const total = totalResult[0]?.total ?? 0;

  // 每月選號次數
  const monthlyRaw = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      count: count(),
    })
    .from(lotterySessions)
    .where(baseWhere)
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m') DESC`)
    .limit(12);

  // 五行分布
  const elementCounts = await db
    .select({
      element: lotterySessions.todayElement,
      count: count(),
    })
    .from(lotterySessions)
    .where(baseWhere)
    .groupBy(lotterySessions.todayElement);

  // 最近 10 筆記錄
  const recentSessions = await getLotteryHistory(userId, 10);

  return {
    total,
    monthlyCounts: monthlyRaw.reverse(),
    elementCounts,
    recentSessions,
  };
}

// ===== Lottery Results (開獎對照) =====
export async function saveLotteryResult(data: {
  userId?: number;
  sessionId?: number;
  predictedNumbers: number[];
  actualNumbers: number[];
  actualBonus?: number;
  matchCount: number;
  bonusMatch: number;
  resonanceScore: number;
  dayPillar: string;
  dateString: string;
  // 刮刮樂專用
  ticketType?: string;
  scratchPrice?: number;
  scratchPrize?: number;
  scratchWon?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(lotteryResults).values(data).$returningId();
  return result?.id ?? null;
}

export async function getLotteryResults(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lotteryResults)
    .orderBy(desc(lotteryResults.createdAt))
    .limit(limit);
}

export async function getLotteryResultStats() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lotteryResults);
  if (!rows.length) return {
    total: 0, totalMatches: 0, avgMatchCount: 0,
    avgResonance: 0, bestMatch: 0, distribution: {} as Record<number, number>,
    scratchTotal: 0, scratchWonCount: 0, scratchWinRate: 0, scratchTotalInvest: 0, scratchTotalPrize: 0,
  };

  const distribution: Record<number, number> = {};
  let totalMatches = 0;
  let totalResonance = 0;
  let bestMatch = 0;
  // 刮刮樂統計
  let scratchTotal = 0;
  let scratchWonCount = 0;
  let scratchTotalInvest = 0;
  let scratchTotalPrize = 0;

  const lotteryRows = rows.filter(r => (r.ticketType ?? 'lottery') === 'lottery');
  const scratchRows = rows.filter(r => r.ticketType === 'scratch');

  for (const r of lotteryRows) {
    distribution[r.matchCount] = (distribution[r.matchCount] ?? 0) + 1;
    totalMatches += r.matchCount;
    totalResonance += r.resonanceScore;
    if (r.matchCount > bestMatch) bestMatch = r.matchCount;
  }
  for (const r of scratchRows) {
    scratchTotal++;
    if (r.scratchWon) scratchWonCount++;
    scratchTotalInvest += r.scratchPrice ?? 0;
    scratchTotalPrize += r.scratchPrize ?? 0;
    totalResonance += r.resonanceScore;
  }

  const totalAll = rows.length;
  return {
    total: lotteryRows.length,
    totalMatches,
    avgMatchCount: lotteryRows.length > 0 ? +(totalMatches / lotteryRows.length).toFixed(2) : 0,
    avgResonance: totalAll > 0 ? +(totalResonance / totalAll).toFixed(1) : 0,
    bestMatch,
    distribution,
    scratchTotal,
    scratchWonCount,
    scratchWinRate: scratchTotal > 0 ? +(scratchWonCount / scratchTotal * 100).toFixed(1) : 0,
    scratchTotalInvest,
    scratchTotalPrize,
  };
}

// ============================================================
// 彩券行收藏 CRUD
// ============================================================

/** 取得使用者的收藏彩券行列表（最多 5 家） */
export async function getFavoriteStores(userId?: number): Promise<typeof favoriteStores.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(favoriteStores).where(eq(favoriteStores.userId, userId)).limit(5);
  }
  return [];
}

/** 新增收藏彩券行 */
export async function addFavoriteStore(data: InsertFavoriteStore): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(favoriteStores).values(data);
  return (result[0] as any).insertId ?? 0;
}

/** 刪除收藏彩券行 */
export async function removeFavoriteStore(id: number, userId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (userId) {
    await db.delete(favoriteStores).where(and(eq(favoriteStores.id, id), eq(favoriteStores.userId, userId)));
  } else {
    await db.delete(favoriteStores).where(eq(favoriteStores.id, id));
  }
}

/** 檢查是否已收藏（避免重複） */
export async function isFavoriteStore(placeId: string, userId?: number): Promise<boolean> {
  const db = await getDb();
  if (!db || !userId) return false;
  const rows = await db.select({ id: favoriteStores.id })
    .from(favoriteStores)
    .where(and(eq(favoriteStores.placeId, placeId), eq(favoriteStores.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

// ── 刮刮樂購買日誌 ──────────────────────────────────────────────────────────

/** 新增一筆購買日誌 */
export async function addScratchLog(data: InsertScratchLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scratchLogs).values(data);
  return (result[0] as any).insertId ?? 0;
}

/** 取得使用者的購買日誌（最新 50 筆） */
export async function getScratchLogs(userId?: number): Promise<ScratchLog[]> {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(scratchLogs)
      .where(eq(scratchLogs.userId, userId))
      .orderBy(desc(scratchLogs.purchasedAt))
      .limit(50);
  }
  return [];
}

/** 取得統計分析：各面額中獎率、各時辰中獎率、各地址中獎率 */
export async function getScratchStats(userId?: number): Promise<{
  byDenomination: { denomination: number; total: number; won: number; totalInvested: number; totalWon: number }[];
  byHour: { hour: string; total: number; won: number }[];
  byFengShui: { grade: string; total: number; won: number; winRate: number }[];
  totalInvested: number;
  totalWon: number;
  winRate: number;
}> {
  const db = await getDb();
  const empty = { byDenomination: [], byHour: [], byFengShui: [], totalInvested: 0, totalWon: 0, winRate: 0 };
  if (!db) return empty;

  const whereClause = userId ? eq(scratchLogs.userId, userId) : undefined;

  // 按面額統計
  const denomRows = await db.select({
    denomination: scratchLogs.denomination,
    total: count(),
    won: sql<number>`SUM(${scratchLogs.isWon})`,
    totalInvested: sql<number>`SUM(${scratchLogs.denomination})`,
    totalWon: sql<number>`SUM(${scratchLogs.wonAmount})`,
  }).from(scratchLogs)
    .where(whereClause)
    .groupBy(scratchLogs.denomination)
    .orderBy(scratchLogs.denomination);

  // 按時辰統計
  const hourRows = await db.select({
    hour: scratchLogs.purchaseHour,
    total: count(),
    won: sql<number>`SUM(${scratchLogs.isWon})`,
  }).from(scratchLogs)
    .where(whereClause)
    .groupBy(scratchLogs.purchaseHour);
  // 按風水等級統計
  const fengShuiRows = await db.select({
    grade: scratchLogs.fengShuiGrade,
    total: count(),
    won: sql<number>`SUM(${scratchLogs.isWon})`,
  }).from(scratchLogs)
    .where(whereClause)
    .groupBy(scratchLogs.fengShuiGrade);

  const byDenomination = denomRows.map(r => ({
    denomination: r.denomination,
    total: Number(r.total),
    won: Number(r.won ?? 0),
    totalInvested: Number(r.totalInvested ?? 0),
    totalWon: Number(r.totalWon ?? 0),
  }));

   const byHour = hourRows
    .filter(r => r.hour)
    .map(r => ({
      hour: r.hour ?? "",
      total: Number(r.total),
      won: Number(r.won ?? 0),
    }));
  // 風水等級排序：大吉 > 吉 > 平 > 凶 > 大凶 > 無記錄
  const GRADE_ORDER = ["大吉", "吉", "平", "凶", "大凶"];
  const byFengShui = fengShuiRows
    .filter(r => r.grade)
    .map(r => {
      const t = Number(r.total);
      const w = Number(r.won ?? 0);
      return { grade: r.grade ?? "", total: t, won: w, winRate: t > 0 ? Math.round((w / t) * 100) : 0 };
    })
    .sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade));
  const totalInvested = byDenomination.reduce((s, r) => s + r.totalInvested, 0);
  const totalWon = byDenomination.reduce((s, r) => s + r.totalWon, 0);
  const totalCount = byDenomination.reduce((s, r) => s + r.total, 0);
  const totalWonCount = byDenomination.reduce((s, r) => s + r.won, 0);
  const winRate = totalCount > 0 ? Math.round((totalWonCount / totalCount) * 100) : 0;
  return { byDenomination, byHour, byFengShui, totalInvested, totalWon, winRate };
}

// ── 手串佩戴記錄 ─────────────────────────────────────────────────────────────

/** 新增一筆手串佩戴記錄 */
export async function addBraceletWearLog(data: InsertBraceletWearLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(braceletWearLogs).values(data);
  return (result[0] as any).insertId ?? 0;
}

/** 取消佩戴記錄（刪除指定日期+手串ID+手的記錄） */
export async function removeBraceletWearLog(userId: number | undefined, wearDate: string, braceletId: string, hand: "left" | "right"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const conditions = [
    eq(braceletWearLogs.wearDate, wearDate),
    eq(braceletWearLogs.braceletId, braceletId),
    eq(braceletWearLogs.hand, hand),
  ];
  if (userId) conditions.push(eq(braceletWearLogs.userId, userId) as any);
  await db.delete(braceletWearLogs).where(and(...conditions));
}

/** 取得指定日期的佩戴記錄 */
export async function getBraceletWearLogsByDate(userId: number | undefined, wearDate: string): Promise<BraceletWearLog[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(braceletWearLogs.wearDate, wearDate)];
  if (userId) conditions.push(eq(braceletWearLogs.userId, userId) as any);
  return db.select().from(braceletWearLogs).where(and(...conditions));
}

/** 取得最近 N 天的佩戴歷史 */
export async function getBraceletWearHistory(userId: number | undefined, limit = 30): Promise<BraceletWearLog[]> {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(braceletWearLogs)
      .where(eq(braceletWearLogs.userId, userId))
      .orderBy(desc(braceletWearLogs.wearDate))
      .limit(limit);
  }
  return db.select().from(braceletWearLogs)
    .orderBy(desc(braceletWearLogs.wearDate))
    .limit(limit);
}

/** 統計各手串佩戴次數（用於長期分析） */
export async function getBraceletWearStats(userId: number | undefined): Promise<{
  braceletId: string;
  braceletName: string;
  totalWears: number;
}[]> {
  const db = await getDb();
  if (!db) return [];
  const whereClause = userId ? eq(braceletWearLogs.userId, userId) : undefined;
  const rows = await db.select({
    braceletId: braceletWearLogs.braceletId,
    braceletName: braceletWearLogs.braceletName,
    totalWears: count(),
  }).from(braceletWearLogs)
    .where(whereClause)
    .groupBy(braceletWearLogs.braceletId, braceletWearLogs.braceletName)
    .orderBy(desc(count()));
  return rows.map(r => ({
    braceletId: r.braceletId,
    braceletName: r.braceletName,
    totalWears: Number(r.totalWears),
  }));
}

// ─── 命格引擎輔助函式 ─────────────────────────────────────────────────────────

/**
 * 動態命格資料（供後端算法引擎使用）
 * 若用戶已填寫 userProfiles，使用其資料；否則退回預設甲木命格
 */
export interface EngineProfile {
  /** 日主天干（例：甲） */
  dayMasterStem: string;
  /** 日主五行（例：木） */
  dayMasterElement: string;
  /** 日主陰陽（例：陽） */
  dayMasterYinYang: "陽" | "陰";
  /** 本命五行比例（0~1，加總為1） */
  natalElementRatio: Record<string, number>;
  /** 喜用神五行（中文，例：["火","土","金"]） */
  favorableElements: string[];
  /** 忌神五行（中文） */
  unfavorableElements: string[];
  /** 喜用神五行（英文，例：["fire","earth","metal"]） */
  favorableElementsEn: string[];
  /** 出生日期（YYYY-MM-DD 格式） */
  birthDate: string | null;
  /** 出生月份（1-12） */
  birthMonth: number | null;
  /** 出生日（1-31） */
  birthDay: number | null;
  /** 是否使用預設命格（用戶未填寫時為 true） */
  isDefault: boolean;
}

/** 五行中英文對照 */
const ZH_TO_EN: Record<string, string> = {
  木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water",
};

/** 天干五行對照 */
const STEM_ELEMENT_MAP: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

/** 天干陰陽對照 */
const STEM_YIN_YANG_MAP: Record<string, "陽" | "陰"> = {
  甲: "陽", 乙: "陰", 丙: "陽", 丁: "陰", 戊: "陽",
  己: "陰", 庚: "陽", 辛: "陰", 壬: "陽", 癸: "陰",
};

/** 預設命格（甲木，蘇先生命格，作為系統 fallback） */
const DEFAULT_ENGINE_PROFILE: EngineProfile = {
  dayMasterStem: "甲",
  dayMasterElement: "木",
  dayMasterYinYang: "陽",
  natalElementRatio: { 木: 0.42, 水: 0.35, 火: 0.11, 土: 0.09, 金: 0.04 },
  favorableElements: ["火", "土", "金"],
  unfavorableElements: ["水", "木"],
  favorableElementsEn: ["fire", "earth", "metal"],
  birthDate: "1984-11-26",
  birthMonth: 11,
  birthDay: 26,
  isDefault: true,
};

/**
 * 從資料庫讀取指定用戶的命格資料，供後端算法引擎使用
 * 若用戶未填寫命格資料，退回預設甲木命格
 */
export async function getUserProfileForEngine(userId: number): Promise<EngineProfile> {
  const db = await getDb();
  if (!db) return { ...DEFAULT_ENGINE_PROFILE };

  try {
    const { userProfiles } = await import("../drizzle/schema");
    const rows = await db.select().from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (rows.length === 0) {
      return { ...DEFAULT_ENGINE_PROFILE };
    }
    const profile = rows[0];
    // 如果用戶完全沒有命格資料（連 dayPillar 都沒有），才退回預設
    if (!profile.dayPillar && !profile.dayMasterElement && !profile.favorableElements) {
      return { ...DEFAULT_ENGINE_PROFILE };
    };

    // 解析日主天干（從四柱日柱取得，例："甲子" → "甲"）
    const dayPillarStem = profile.dayPillar ? profile.dayPillar[0] : null;
    const dayMasterStem = dayPillarStem && STEM_ELEMENT_MAP[dayPillarStem] ? dayPillarStem : "甲";
    const dayMasterElement = STEM_ELEMENT_MAP[dayMasterStem] || "木";
    const dayMasterYinYang = STEM_YIN_YANG_MAP[dayMasterStem] || "陽";

    // 解析喜用神（逗號分隔的英文，例："fire,earth,metal"）
    const favorableElementsEn = profile.favorableElements
      ? profile.favorableElements.split(",").map(s => s.trim()).filter(Boolean)
      : DEFAULT_ENGINE_PROFILE.favorableElementsEn;

    // 轉換為中文
    const EN_TO_ZH: Record<string, string> = {
      wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
    };
    const favorableElements = favorableElementsEn.map(e => EN_TO_ZH[e] || e).filter(Boolean);

    const unfavorableElementsEn = profile.unfavorableElements
      ? profile.unfavorableElements.split(",").map(s => s.trim()).filter(Boolean)
      : DEFAULT_ENGINE_PROFILE.favorableElementsEn.filter(e => !favorableElementsEn.includes(e));
    const unfavorableElements = unfavorableElementsEn.map(e => EN_TO_ZH[e] || e).filter(Boolean);

    // 本命五行比例：目前從四柱推算較複雜，暫時根據日主五行給出合理預設
    // 未來可擴充為完整的八字五行計算
    const natalElementRatio = buildNatalRatioFromDayMaster(dayMasterElement, favorableElements);

    // 解析出生日期
    const birthDateStr = profile.birthDate || null;
    let birthMonth: number | null = null;
    let birthDay: number | null = null;
    if (birthDateStr) {
      const parts = birthDateStr.split('-');
      if (parts.length >= 3) {
        birthMonth = parseInt(parts[1]) || null;
        birthDay = parseInt(parts[2]) || null;
      }
    }
    return {
      dayMasterStem,
      dayMasterElement,
      dayMasterYinYang,
      natalElementRatio,
      favorableElements,
      unfavorableElements,
      favorableElementsEn,
      birthDate: birthDateStr,
      birthMonth,
      birthDay,
      isDefault: false,
    };
  } catch {
    return { ...DEFAULT_ENGINE_PROFILE };
  }
}

/**
 * 根據日主五行和喜用神，推算合理的本命五行比例
 * 這是一個簡化的估算，實際應由完整八字計算
 */
function buildNatalRatioFromDayMaster(
  dayMasterElement: string,
  favorableElements: string[]
): Record<string, number> {
  // 預設均等分布
  const base: Record<string, number> = { 木: 0.20, 火: 0.20, 土: 0.20, 金: 0.20, 水: 0.20 };

  // 日主五行本身偏強（身強格局）
  base[dayMasterElement] = Math.min(0.40, (base[dayMasterElement] || 0.20) + 0.15);

  // 生日主的五行也偏強（印星）
  const GENERATES: Record<string, string> = {
    木: "水", 火: "木", 土: "火", 金: "土", 水: "金",
  };
  const generatorEl = GENERATES[dayMasterElement];
  if (generatorEl) base[generatorEl] = Math.min(0.35, (base[generatorEl] || 0.20) + 0.10);

  // 喜用神五行偏弱（需補）
  for (const el of favorableElements) {
    if (base[el] !== undefined) {
      base[el] = Math.max(0.04, (base[el] || 0.10) - 0.05);
    }
  }

  // 正規化為加總 1
  const total = Object.values(base).reduce((a, b) => a + b, 0);
  for (const el of Object.keys(base)) {
    base[el] = Math.round((base[el] / total) * 100) / 100;
  }

  return base;
}
