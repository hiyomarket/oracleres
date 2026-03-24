/**
 * achievementEngine.ts
 * 成就解鎖邏輯引擎
 * - 定義 20 個成就
 * - 檢查並解鎖成就
 * - 透過 WebSocket 推送解鎖通知
 */

import { getDb } from "./db";
import { achievements, agentAchievements, agentPvpStats, gameAgents } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendToAgent } from "./wsServer";

// ─── 成就定義 ───────────────────────────────────────────────────
export const ACHIEVEMENT_DEFS = [
  { id: "first-steps",      name: "初出茅廬",     icon: "🌱", type: "level"     as const, desc: "旅人達到 Lv.5",              condition: { metric: "level",          threshold: 5   }, sortOrder: 1  },
  { id: "first-pvp-win",    name: "初戰告捷",     icon: "⚔️", type: "pvp"       as const, desc: "第一次 PvP 勝利",            condition: { metric: "pvp_wins",       threshold: 1   }, sortOrder: 2  },
  { id: "streak-3",         name: "連勝三場",     icon: "🔥", type: "pvp"       as const, desc: "PvP 連勝 3 次",              condition: { metric: "pvp_streak",     threshold: 3   }, sortOrder: 3  },
  { id: "wargod",           name: "戰神",         icon: "💀", type: "pvp"       as const, desc: "PvP 連勝 10 次",             condition: { metric: "pvp_streak",     threshold: 10  }, sortOrder: 4  },
  { id: "weekly-champion",  name: "週冠軍",       icon: "👑", type: "weekly"    as const, desc: "獲得週等級冠軍",             condition: { metric: "weekly_level",   threshold: 1   }, sortOrder: 5  },
  { id: "weekly-warrior",   name: "週戰神",       icon: "⚔️", type: "weekly"    as const, desc: "獲得週戰鬥王冠軍",           condition: { metric: "weekly_combat",  threshold: 1   }, sortOrder: 6  },
  { id: "legend-hunter",    name: "傳說獵人",     icon: "💎", type: "legendary" as const, desc: "獲得第一件傳說裝備",         condition: { metric: "legendary_drops",threshold: 1   }, sortOrder: 7  },
  { id: "legend-collector", name: "傳說收藏家",   icon: "💎", type: "legendary" as const, desc: "獲得 5 件傳說裝備",          condition: { metric: "legendary_drops",threshold: 5   }, sortOrder: 8  },
  { id: "explorer",         name: "探索者",       icon: "🗺️", type: "explore"   as const, desc: "累積探索 50 次",             condition: { metric: "explore_count",  threshold: 50  }, sortOrder: 9  },
  { id: "gatherer",         name: "採集達人",     icon: "⛏️", type: "gather"    as const, desc: "累積採集 100 次",            condition: { metric: "gather_count",   threshold: 100 }, sortOrder: 10 },
  { id: "wood-spirit",      name: "木靈共鳴",     icon: "🌿", type: "gather"    as const, desc: "累積採集 500 次",            condition: { metric: "gather_count",   threshold: 500 }, sortOrder: 11 },
  { id: "ascension",        name: "升仙之路",     icon: "🏆", type: "level"     as const, desc: "旅人達到 Lv.50",             condition: { metric: "level",          threshold: 50  }, sortOrder: 12 },
  { id: "chatterbox",       name: "話嘮",         icon: "💬", type: "chat"      as const, desc: "發送 50 則聊天訊息",         condition: { metric: "chat_count",     threshold: 50  }, sortOrder: 13 },
  { id: "challenger",       name: "江湖人",       icon: "🤝", type: "pvp"       as const, desc: "發起 10 次 PvP 挑戰",        condition: { metric: "pvp_total",      threshold: 10  }, sortOrder: 14 },
  { id: "ironwall",         name: "鐵壁",         icon: "🛡️", type: "pvp"       as const, desc: "PvP 勝率達 70% 且場次≥10",  condition: { metric: "pvp_winrate70",  threshold: 1   }, sortOrder: 15 },
  { id: "world-witness",    name: "世界見證者",   icon: "🌍", type: "explore"   as const, desc: "親歷 10 次世界事件",         condition: { metric: "world_events",   threshold: 10  }, sortOrder: 16 },
  { id: "spirit-full",      name: "靈力充盈",     icon: "⚡", type: "special"   as const, desc: "AP 達到 100",                condition: { metric: "ap",             threshold: 100 }, sortOrder: 17 },
  { id: "veteran",          name: "百戰老兵",     icon: "🎯", type: "combat"    as const, desc: "累積戰鬥 100 場",            condition: { metric: "combat_count",   threshold: 100 }, sortOrder: 18 },
  { id: "legend-moment",    name: "傳說時刻",     icon: "🌟", type: "special"   as const, desc: "同一天升級並獲得傳說裝備",   condition: { metric: "legend_moment",  threshold: 1   }, sortOrder: 19 },
  { id: "all-rounder",      name: "全能冒險者",   icon: "🏅", type: "special"   as const, desc: "同時持有戰鬥/採集/探索成就", condition: { metric: "all_rounder",    threshold: 1   }, sortOrder: 20 },
] as const;

/**
 * 初始化成就種子資料（若不存在則插入）
 */
export async function seedAchievements() {
  const db = await getDb();
  if (!db) return;
  for (const def of ACHIEVEMENT_DEFS) {
    try {
      await db.insert(achievements).ignore().values({
        id: def.id,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        type: def.type,
        condition: def.condition,
        isActive: 1,
        sortOrder: def.sortOrder,
      });
    } catch {
      // 已存在則忽略
    }
  }
}

/**
 * 檢查並解鎖成就
 * @param agentId 角色 ID
 * @param metrics 當前指標（由呼叫方提供）
 */
export async function checkAchievements(
  agentId: number,
  metrics: Partial<Record<string, number>>
) {
  const db = await getDb();
  if (!db) return;

  // 取得角色名稱（用於 WS 推送）
  const agentRows = await db.select({ agentName: gameAgents.agentName })
    .from(gameAgents).where(eq(gameAgents.id, agentId)).limit(1);
  const agentName = agentRows[0]?.agentName ?? "旅人";

  // 取得已解鎖的成就
  const unlocked = await db.select({ achievementId: agentAchievements.achievementId })
    .from(agentAchievements)
    .where(and(eq(agentAchievements.agentId, agentId), eq(agentAchievements.unlocked, 1)));
  const unlockedIds = new Set(unlocked.map(u => u.achievementId));

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlockedIds.has(def.id)) continue;

    const metricVal = metrics[def.condition.metric] ?? 0;
    const threshold = def.condition.threshold;

    if (metricVal >= threshold) {
      // 解鎖成就
      try {
        await db.insert(agentAchievements).values({
          agentId,
          achievementId: def.id,
          progress: metricVal,
          unlocked: 1,
          unlockedAt: Date.now(),
          updatedAt: Date.now(),
        });

        // 透過 WebSocket 推送通知
        sendToAgent(agentId, {
          type: "achievement",
          payload: {
            agentId,
            agentName,
            achievementId: def.id,
            name: def.name,
            icon: def.icon,
            desc: def.desc,
          },
        });

        console.log(`[Achievement] ${agentName} 解鎖成就：${def.name}`);
      } catch {
        // 可能已存在，忽略
      }
    } else {
      // 更新進度
      try {
        const existing = await db.select({ id: agentAchievements.id })
          .from(agentAchievements)
          .where(and(eq(agentAchievements.agentId, agentId), eq(agentAchievements.achievementId, def.id)))
          .limit(1);

        if (existing[0]) {
          await db.update(agentAchievements).set({
            progress: metricVal,
            updatedAt: Date.now(),
          }).where(eq(agentAchievements.id, existing[0].id));
        } else {
          await db.insert(agentAchievements).values({
            agentId,
            achievementId: def.id,
            progress: metricVal,
            unlocked: 0,
            updatedAt: Date.now(),
          });
        }
      } catch {
        // 忽略
      }
    }
  }
}

/**
 * 更新 PvP 戰績統計並觸發成就檢查
 */
export async function updatePvpStats(
  challengerAgentId: number,
  defenderAgentId: number,
  result: "challenger_win" | "defender_win" | "draw"
) {
  const db = await getDb();
  if (!db) return;

  async function upsertStats(agentId: number, won: boolean, drew: boolean) {
    const existing = await db!.select().from(agentPvpStats)
      .where(eq(agentPvpStats.agentId, agentId)).limit(1);

    const agentRows = await db!.select({
      agentName: gameAgents.agentName,
      dominantElement: gameAgents.dominantElement,
      level: gameAgents.level,
    }).from(gameAgents).where(eq(gameAgents.id, agentId)).limit(1);
    const agent = agentRows[0];
    if (!agent) return;

    if (existing[0]) {
      const prev = existing[0];
      const newWins = prev.wins + (won ? 1 : 0);
      const newLosses = prev.losses + (!won && !drew ? 1 : 0);
      const newDraws = prev.draws + (drew ? 1 : 0);
      const newStreak = won ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);

      await db!.update(agentPvpStats).set({
        agentName: agent.agentName ?? "旅人",
        agentElement: agent.dominantElement ?? "wood",
        agentLevel: agent.level,
        wins: newWins,
        losses: newLosses,
        draws: newDraws,
        currentStreak: newStreak,
        maxStreak: newMaxStreak,
        lastChallengeAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(agentPvpStats.agentId, agentId));

      // 觸發成就檢查
      const total = newWins + newLosses + newDraws;
      const winRate = total >= 10 ? newWins / total : 0;
      await checkAchievements(agentId, {
        pvp_wins: newWins,
        pvp_streak: newStreak,
        pvp_total: total,
        pvp_winrate70: winRate >= 0.7 && total >= 10 ? 1 : 0,
      });
    } else {
      const newWins = won ? 1 : 0;
      const newLosses = !won && !drew ? 1 : 0;
      const newDraws = drew ? 1 : 0;
      const newStreak = won ? 1 : 0;

      await db!.insert(agentPvpStats).values({
        agentId,
        agentName: agent.agentName ?? "旅人",
        agentElement: agent.dominantElement ?? "wood",
        agentLevel: agent.level,
        wins: newWins,
        losses: newLosses,
        draws: newDraws,
        currentStreak: newStreak,
        maxStreak: newStreak,
        lastChallengeAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (won) {
        await checkAchievements(agentId, {
          pvp_wins: 1,
          pvp_streak: 1,
          pvp_total: 1,
          pvp_winrate70: 0,
        });
      }
    }
  }

  const challengerWon = result === "challenger_win";
  const defenderWon = result === "defender_win";
  const drew = result === "draw";

  await upsertStats(challengerAgentId, challengerWon, drew);
  await upsertStats(defenderAgentId, defenderWon, drew);
}
