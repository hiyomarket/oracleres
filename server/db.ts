import { eq, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, oracleSessions, InsertOracleSession, OracleSession, lotterySessions, InsertLotterySession, LotterySession, lotteryResults, InsertLotteryResult, LotteryResult } from "../drizzle/schema";
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
    avgResonance: 0, bestMatch: 0, distribution: {} as Record<number, number>
  };

  const distribution: Record<number, number> = {};
  let totalMatches = 0;
  let totalResonance = 0;
  let bestMatch = 0;

  for (const r of rows) {
    distribution[r.matchCount] = (distribution[r.matchCount] ?? 0) + 1;
    totalMatches += r.matchCount;
    totalResonance += r.resonanceScore;
    if (r.matchCount > bestMatch) bestMatch = r.matchCount;
  }

  return {
    total: rows.length,
    totalMatches,
    avgMatchCount: +(totalMatches / rows.length).toFixed(2),
    avgResonance: +(totalResonance / rows.length).toFixed(1),
    bestMatch,
    distribution,
  };
}
