import { eq, desc, sql, count, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, oracleSessions, InsertOracleSession, OracleSession, lotterySessions, InsertLotterySession, LotterySession, lotteryResults, InsertLotteryResult, LotteryResult, favoriteStores, InsertFavoriteStore, scratchLogs, InsertScratchLog, ScratchLog } from "../drizzle/schema";
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
  totalInvested: number;
  totalWon: number;
  winRate: number;
}> {
  const db = await getDb();
  const empty = { byDenomination: [], byHour: [], totalInvested: 0, totalWon: 0, winRate: 0 };
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

  const totalInvested = byDenomination.reduce((s, r) => s + r.totalInvested, 0);
  const totalWon = byDenomination.reduce((s, r) => s + r.totalWon, 0);
  const totalCount = byDenomination.reduce((s, r) => s + r.total, 0);
  const totalWonCount = byDenomination.reduce((s, r) => s + r.won, 0);
  const winRate = totalCount > 0 ? Math.round((totalWonCount / totalCount) * 100) : 0;

  return { byDenomination, byHour, totalInvested, totalWon, winRate };
}
