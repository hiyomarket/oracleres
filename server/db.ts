import { eq, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, oracleSessions, InsertOracleSession, OracleSession } from "../drizzle/schema";
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
