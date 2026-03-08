/**
 * wbcScoreFetcher.ts
 * WBC 賽後 AI 自動抓取比分更新排程
 * - 每 5 分鐘掃描「live」狀態且比賽時間已過 3 小時的賽事
 * - 呼叫 LLM 搜尋最新比分
 * - 若 LLM 回傳確定比分，自動更新資料庫並結算下注
 *
 * 防護機制：
 * - MAX_AI_RETRY = 10：每場賽事最多查詢 10 次（約 50 分鐘），超過自動取消，防止算力無限消耗
 */
import { getDb } from "../db";
import { wbcMatches, wbcBets } from "../../drizzle/schema";
import { eq, and, lte, lt } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/** 每場賽事 AI 比分查詢的最大重試次數，超過後自動取消該賽事 */
const MAX_AI_RETRY = 10;

interface ScoreResult {
  found: boolean;
  teamAScore: number;
  teamBScore: number;
  finalScore: string;
  winner: "teamA" | "teamB" | "draw";
  confidence: "high" | "medium" | "low";
}

async function fetchScoreWithAI(
  teamA: string,
  teamB: string,
  matchTimeMs: number
): Promise<ScoreResult | null> {
  const matchDate = new Date(matchTimeMs);
  const dateStr = `${matchDate.getUTCFullYear()}年${matchDate.getUTCMonth() + 1}月${matchDate.getUTCDate()}日`;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是一個 WBC 世界棒球經典賽比分查詢助手。
根據用戶提供的比賽資訊，回傳 JSON 格式的比分結果。
如果比賽已結束且你有確定的比分，設 found: true。
如果比賽尚未結束或你不確定比分，設 found: false。
只回傳 JSON，不要有其他文字。`,
        },
        {
          role: "user",
          content: `請查詢以下 2026 WBC 世界棒球經典賽的比分：
比賽日期：${dateStr}
對戰：${teamA} vs ${teamB}

請回傳以下 JSON 格式：
{
  "found": true/false,
  "teamAScore": 數字（${teamA}的得分）,
  "teamBScore": 數字（${teamB}的得分）,
  "finalScore": "X:Y 格式的比分字串",
  "winner": "teamA" 或 "teamB" 或 "draw",
  "confidence": "high"/"medium"/"low"
}

如果比賽未結束或不確定，回傳 {"found": false, "teamAScore": 0, "teamBScore": 0, "finalScore": "", "winner": "draw", "confidence": "low"}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "score_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              found: { type: "boolean" },
              teamAScore: { type: "number" },
              teamBScore: { type: "number" },
              finalScore: { type: "string" },
              winner: { type: "string", enum: ["teamA", "teamB", "draw"] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["found", "teamAScore", "teamBScore", "finalScore", "winner", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices[0]?.message?.content;
    if (!content || typeof content !== "string") return null;

    const parsed = JSON.parse(content) as ScoreResult;
    return parsed;
  } catch (err) {
    console.error(`[WbcScoreFetcher] AI score fetch failed for ${teamA} vs ${teamB}:`, err);
    return null;
  }
}

async function settleMatchBets(
  db: Awaited<ReturnType<typeof getDb>>,
  matchId: number,
  winningTeam: string
): Promise<void> {
  if (!db) return;

  // 取得所有此賽事的下注
  const bets = await db
    .select()
    .from(wbcBets)
    .where(eq(wbcBets.matchId, matchId));

  // 實際結算邏輯在 wbc.settleMatch 程序中，這裡只記錄日誌
  console.log(`[WbcScoreFetcher] Match #${matchId}: ${bets.length} bets found, settlement pending manual confirmation`);
}

export async function checkAndFetchWbcScores(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();
  // 比賽時間超過 3 小時前（比賽應已結束）
  const finishedThreshold = now - 3 * 60 * 60 * 1000;

  // 找出所有「live」狀態且比賽時間已過 3 小時，且重試次數未超過上限的賽事
  const matchesToCheck = await db
    .select()
    .from(wbcMatches)
    .where(
      and(
        eq(wbcMatches.status, "live"),
        lte(wbcMatches.matchTime, finishedThreshold),
        lt(wbcMatches.aiRetryCount, MAX_AI_RETRY)
      )
    );

  if (matchesToCheck.length === 0) return;

  console.log(`[WbcScoreFetcher] Checking scores for ${matchesToCheck.length} matches...`);

  for (const match of matchesToCheck) {
    const newRetryCount = (match.aiRetryCount ?? 0) + 1;

    // 先更新重試次數，防止同一輪重複計算
    await db
      .update(wbcMatches)
      .set({ aiRetryCount: newRetryCount })
      .where(eq(wbcMatches.id, match.id));

    // 若已達最大重試次數，自動取消此賽事並通知管理員
    if (newRetryCount >= MAX_AI_RETRY) {
      await db
        .update(wbcMatches)
        .set({ status: "cancelled", aiRetryCount: newRetryCount })
        .where(eq(wbcMatches.id, match.id));

      console.warn(
        `[WbcScoreFetcher] ⚠️ Match #${match.id} (${match.teamA} vs ${match.teamB}) auto-cancelled after ${MAX_AI_RETRY} retries — no confirmed score found.`
      );

      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: `⚠️ WBC 賽事自動取消：${match.teamA} vs ${match.teamB}`,
          content: `AI 已嘗試查詢比分 ${MAX_AI_RETRY} 次，仍無法確認結果，已自動將此賽事標記為「取消」。\n\n請前往後台手動確認並結算 → 管理中心 → WBC 競猜`,
        });
      } catch (e) {
        // 通知失敗不影響主流程
      }
      continue;
    }

    console.log(`[WbcScoreFetcher] Fetching score for Match #${match.id}: ${match.teamA} vs ${match.teamB} (retry ${newRetryCount}/${MAX_AI_RETRY})`);

    const scoreResult = await fetchScoreWithAI(match.teamA, match.teamB, match.matchTime);

    if (!scoreResult) {
      console.log(`[WbcScoreFetcher] No result for Match #${match.id}, will retry later (${newRetryCount}/${MAX_AI_RETRY})`);
      continue;
    }

    if (!scoreResult.found || scoreResult.confidence === "low") {
      console.log(`[WbcScoreFetcher] Match #${match.id}: Score not confirmed yet (found=${scoreResult.found}, confidence=${scoreResult.confidence}) (${newRetryCount}/${MAX_AI_RETRY})`);
      continue;
    }

    // 有確定比分，更新資料庫
    const winningTeam =
      scoreResult.winner === "teamA"
        ? "A"
        : scoreResult.winner === "teamB"
        ? "B"
        : null;

    await db
      .update(wbcMatches)
      .set({
        status: "finished",
        finalScore: scoreResult.finalScore,
        winningTeam: winningTeam,
        updatedAt: new Date(),
      })
      .where(eq(wbcMatches.id, match.id));

    console.log(
      `[WbcScoreFetcher] ✅ Match #${match.id} (${match.teamA} vs ${match.teamB}) finished: ${scoreResult.finalScore}, winner: ${scoreResult.winner} (confidence: ${scoreResult.confidence})`
    );

    // 記錄到後台日誌（通知 Owner）
    try {
      const { notifyOwner } = await import("../_core/notification");
      await notifyOwner({
        title: `🏆 WBC 比分更新：${match.teamA} vs ${match.teamB}`,
        content: `比賽結果：${scoreResult.finalScore}\n勝隊：${scoreResult.winner === "teamA" ? match.teamA : match.teamB}\n\n請前往後台執行結算 → 管理中心 → WBC 競猜 → 結算比賽`,
      });
    } catch (e) {
      // 通知失敗不影響主流程
    }
  }
}
