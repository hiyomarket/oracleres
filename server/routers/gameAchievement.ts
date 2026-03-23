/**
 * 成就徽章系統 Router
 * 提供用戶端查詢成就、檢查並解鎖成就的 procedures
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  gameAchievements,
  userAchievements,
  users,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// 成就條件類型對應的觸發情境
export type AchievementConditionType =
  | "buy_items"        // 購買道具次數
  | "daily_quest"      // 完成每日任務次數
  | "oracle_cast"      // 擲筊次數
  | "login_days"       // 連續登入天數
  | "aura_score"       // 累計氣場分數
  | "shop_spend"       // 商城消費靈石
  | "wardrobe_items";  // 擁有服裝件數

/**
 * 檢查並解鎖成就（內部工具函數，供其他 router 呼叫）
 * @param userId 用戶 ID
 * @param conditionType 觸發條件類型
 * @param currentValue 當前累計值
 * @returns 新解鎖的成就列表
 */
export async function checkAndUnlockAchievements(
  userId: string,
  conditionType: AchievementConditionType,
  currentValue: number
): Promise<{ id: number; title: string; rewardType: string; rewardAmount: number }[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // 取得該條件類型的所有成就
    const allAchievements = await db
      .select()
      .from(gameAchievements)
      .where(
        and(
          eq(gameAchievements.conditionType, conditionType),
          eq(gameAchievements.isActive, 1)
        )
      );

    // 取得用戶已解鎖的成就
    const unlockedRows = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    const unlockedIds = new Set(unlockedRows.map((r) => r.achievementId));

    const newlyUnlocked: { id: number; title: string; rewardType: string; rewardAmount: number }[] = [];

    for (const achievement of allAchievements) {
      // 已解鎖則跳過
      if (unlockedIds.has(achievement.id)) continue;
      // 未達條件則跳過
      if (currentValue < achievement.conditionValue) continue;

      // 解鎖成就
      await db.insert(userAchievements).values({
        userId,
        achievementId: achievement.id,
      });

      // 發放獎勵（raw SQL 避免型別問題）
      try {
        if (achievement.rewardType === "stones" && achievement.rewardAmount > 0) {
          await db.execute(
            `UPDATE users SET game_stones = COALESCE(game_stones, 0) + ${achievement.rewardAmount} WHERE id = '${userId}'`
          );
        } else if (achievement.rewardType === "coins" && achievement.rewardAmount > 0) {
          await db.execute(
            `UPDATE users SET game_coins = COALESCE(game_coins, 0) + ${achievement.rewardAmount} WHERE id = '${userId}'`
          );
        }
      } catch {
        // 獎勵發放失敗不影響成就解鎖
      }

      newlyUnlocked.push({
        id: achievement.id,
        title: achievement.title,
        rewardType: achievement.rewardType,
        rewardAmount: achievement.rewardAmount,
      });
    }

    return newlyUnlocked;
  } catch {
    return [];
  }
}

export const gameAchievementRouter = router({
  // 取得所有成就定義（含用戶解鎖狀態）
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [allAchievements, userUnlocked] = await Promise.all([
      db.select().from(gameAchievements).where(eq(gameAchievements.isActive, 1)),
      db
        .select()
        .from(userAchievements)
        .where(eq(userAchievements.userId, String(ctx.user.id))),
    ]);
    const unlockedMap = new Map(
      userUnlocked.map((u) => [u.achievementId, u])
    );

    return allAchievements.map((a) => {
      const unlocked = unlockedMap.get(a.id);
      return {
        ...a,
        isUnlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt ?? null,
      };
    });
  }),

  // 取得用戶已解鎖成就（用於 GameLobby 成就牆）
  getUnlocked: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const unlocked = await db
      .select({
        id: gameAchievements.id,
        category: gameAchievements.category,
        title: gameAchievements.title,
        description: gameAchievements.description,
        iconUrl: gameAchievements.iconUrl,
        rewardType: gameAchievements.rewardType,
        rewardAmount: gameAchievements.rewardAmount,
        unlockedAt: userAchievements.unlockedAt,
      })
      .from(userAchievements)
      .innerJoin(gameAchievements, eq(userAchievements.achievementId, gameAchievements.id))
      .where(eq(userAchievements.userId, String(ctx.user.id)))
      .orderBy(userAchievements.id);

    return unlocked;
  }),

  // 手動觸發成就檢查（前端可在特定行為後呼叫）
  checkProgress: protectedProcedure
    .input(
      z.object({
        conditionType: z.enum([
          "buy_items",
          "daily_quest",
          "oracle_cast",
          "login_days",
          "aura_score",
          "shop_spend",
          "wardrobe_items",
        ]),
        currentValue: z.number().int().nonnegative(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newlyUnlocked = await checkAndUnlockAchievements(
        String(ctx.user.id),
        input.conditionType as AchievementConditionType,
        input.currentValue
      );
      return { newlyUnlocked };
    }),
});
