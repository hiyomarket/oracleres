/**
 * wbcMatchLock.ts
 * WBC 賽事下注截止排程
 * - 每分鐘揃描 pending 賽事
 * - 比賽開始前 N 分鐘自動將狀態改為 "live"（鎖定下注）
 * - N 由各賽事的 bettingDeadlineMinutes 欄位決定（預設 30 分鐘）
 */
import { getDb } from "../db";
import { wbcMatches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
export async function checkAndLockWbcMatches(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = Date.now();
  // 找出所有仍為 pending 的賽事（不限時間，逐一判斷各自的截止時間）
  const pendingMatches = await db
    .select()
    .from(wbcMatches)
    .where(eq(wbcMatches.status, "pending"));
  if (pendingMatches.length === 0) return;
  for (const match of pendingMatches) {
    const deadlineMinutes = match.bettingDeadlineMinutes ?? 30;
    const lockThreshold = match.matchTime - deadlineMinutes * 60 * 1000;
    if (now >= lockThreshold) {
      await db
        .update(wbcMatches)
        .set({ status: "live" })
        .where(eq(wbcMatches.id, match.id));
      console.log(
        `[WbcMatchLock] Match #${match.id} (${match.teamA} vs ${match.teamB}) locked for betting — deadline was ${deadlineMinutes}min before start at ${new Date(match.matchTime).toISOString()}`
      );
    }
  }
}
