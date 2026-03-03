/**
 * wbcMatchLock.ts
 * WBC 賽事下注截止排程
 * - 每分鐘掃描 pending 賽事
 * - 比賽開始前 30 分鐘自動將狀態改為 "live"（鎖定下注）
 */
import { getDb } from "../db";
import { wbcMatches } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";

export async function checkAndLockWbcMatches(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();
  const lockThreshold = now + 30 * 60 * 1000; // 30 分鐘後

  // 找出所有「比賽時間 <= 現在+30分鐘」且狀態仍為 pending 的賽事
  const matchesToLock = await db
    .select()
    .from(wbcMatches)
    .where(
      and(
        eq(wbcMatches.status, "pending"),
        lte(wbcMatches.matchTime, lockThreshold)
      )
    );

  if (matchesToLock.length === 0) return;

  for (const match of matchesToLock) {
    await db
      .update(wbcMatches)
      .set({ status: "live" })
      .where(eq(wbcMatches.id, match.id));
    console.log(
      `[WbcMatchLock] Match #${match.id} (${match.teamA} vs ${match.teamB}) locked for betting — starts at ${new Date(match.matchTime).toISOString()}`
    );
  }
}
