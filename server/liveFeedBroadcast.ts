/**
 * liveFeedBroadcast.ts
 * 全服即時動態廣播工具
 *
 * 負責統一管理所有 live_feed 事件的格式與廣播邏輯
 * 事件類型：level_up / achievement_unlock / legendary_drop / pvp_win / weekly_champion / world_event
 *
 * 使用方式：
 *   import { broadcastLiveFeed, broadcastAchievementUnlock } from "./liveFeedBroadcast";
 *   broadcastLiveFeed({ feedType: "level_up", agentName: "旅人", agentElement: "fire", detail: "Lv.10" });
 */

import { broadcastToAll, sendToAgent } from "./wsServer";

// ─── 動態類型定義 ─────────────────────────────────────────────
export type LiveFeedType =
  | "level_up"           // 升級
  | "achievement_unlock" // 成就解鎖（全服廣播）
  | "legendary_drop"     // 傳說掉落
  | "pvp_win"            // PvP 勝利
  | "weekly_champion"    // 週冠軍
  | "world_event"        // 世界事件（重要）
  | "boss_kill";         // Boss 擊殺公告

export interface LiveFeedPayload {
  feedType: LiveFeedType;
  agentName: string;
  agentElement: string;   // wood/fire/earth/metal/water
  agentLevel?: number;
  detail: string;         // 顯示文字，例如 "升至 Lv.15"
  icon?: string;          // emoji 圖示
  targetPath?: string;    // 點擊跳轉路徑
  ts: number;
}

// ─── 各類型預設圖示 ──────────────────────────────────────────
const FEED_ICONS: Record<LiveFeedType, string> = {
  level_up: "⬆️",
  achievement_unlock: "🏅",
  legendary_drop: "💎",
  pvp_win: "⚔️",
  weekly_champion: "👑",
  world_event: "🌍",
  boss_kill: "🏆",
};

// ─── 各類型預設跳轉路徑 ──────────────────────────────────────
const FEED_PATHS: Record<LiveFeedType, string> = {
  level_up: "/game",
  achievement_unlock: "/game/achievements",
  legendary_drop: "/game",
  pvp_win: "/game/achievements",
  weekly_champion: "/game/achievements",
  world_event: "/game",
  boss_kill: "/game",
};

// ─── 廣播全服動態 ────────────────────────────────────────────
export function broadcastLiveFeed(params: {
  feedType: LiveFeedType;
  agentName: string;
  agentElement: string;
  agentLevel?: number;
  detail: string;
  icon?: string;
  targetPath?: string;
}): void {
  const payload: LiveFeedPayload = {
    feedType: params.feedType,
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail: params.detail,
    icon: params.icon ?? FEED_ICONS[params.feedType],
    targetPath: params.targetPath ?? FEED_PATHS[params.feedType],
    ts: Date.now(),
  };

  try {
    broadcastToAll({ type: "live_feed", payload });
  } catch {
    // 廣播失敗不影響主流程
  }
}

// ─── 廣播成就解鎖通知（全服 + 個人專屬） ────────────────────
export function broadcastAchievementUnlock(params: {
  agentId: number;
  agentName: string;
  agentElement: string;
  agentLevel: number;
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  achievementDesc: string;
  rewardType?: string;
  rewardAmount?: number;
}): void {
  const ts = Date.now();

  // 1. 全服 live_feed 廣播（所有人都看到）
  broadcastLiveFeed({
    feedType: "achievement_unlock",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail: `解鎖了「${params.achievementName}」`,
    icon: params.achievementIcon,
    targetPath: "/game/achievements",
  });

  // 2. 個人專屬 achievement_unlock 通知（觸發右下角彈窗）
  try {
    sendToAgent(params.agentId, {
      type: "achievement_unlock",
      payload: {
        id: params.achievementId,
        name: params.achievementName,
        icon: params.achievementIcon,
        desc: params.achievementDesc,
        rewardType: params.rewardType ?? "none",
        rewardAmount: params.rewardAmount ?? 0,
        ts,
      },
    });
  } catch {
    // 玩家不在線時忽略
  }
}

// ─── 廣播升級事件 ────────────────────────────────────────────
export function broadcastLevelUp(params: {
  agentId: number;
  agentName: string;
  agentElement: string;
  newLevel: number;
}): void {
  broadcastLiveFeed({
    feedType: "level_up",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.newLevel,
    detail: `升至 Lv.${params.newLevel}`,
    icon: "⬆️",
    targetPath: "/game",
  });
}

// ─── 廣播傳說掉落 ────────────────────────────────────────────
export function broadcastLegendaryDrop(params: {
  agentId: number;
  agentName: string;
  agentElement: string;
  agentLevel: number;
  itemName: string;
}): void {
  broadcastLiveFeed({
    feedType: "legendary_drop",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail: `獲得傳說裝備「${params.itemName}」`,
    icon: "💎",
    targetPath: "/game",
  });
}

// ─── 廣播 PvP 勝利 ───────────────────────────────────────────
export function broadcastPvpWin(params: {
  agentId: number;
  agentName: string;
  agentElement: string;
  agentLevel: number;
  defenderName: string;
  streak?: number;
}): void {
  const detail = params.streak && params.streak >= 3
    ? `擊敗 ${params.defenderName}（${params.streak} 連勝！）`
    : `擊敗 ${params.defenderName}`;

  broadcastLiveFeed({
    feedType: "pvp_win",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail,
    icon: params.streak && params.streak >= 3 ? "🔥" : "⚔️",
    targetPath: "/game/achievements",
  });
}

// ─── 廣播週冠軍 ──────────────────────────────────────────────
export function broadcastWeeklyChampion(params: {
  agentName: string;
  agentElement: string;
  agentLevel: number;
  category: "level" | "combat";
}): void {
  const label = params.category === "level" ? "等級週冠軍" : "戰鬥週冠軍";
  broadcastLiveFeed({
    feedType: "weekly_champion",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail: `榮獲本週${label}！`,
    icon: "👑",
    targetPath: "/game/achievements",
  });
}

// ─── 廣播 Boss 擊殺 ──────────────────────────────────────────
export function broadcastBossKill(params: {
  agentName: string;
  agentElement: string;
  agentLevel?: number;
  bossName: string;
  drops?: string[];
  isParty?: boolean;
  partyName?: string;
}): void {
  const who = params.isParty && params.partyName
    ? `${params.partyName}（隊伍）`
    : params.agentName;
  const dropText = params.drops && params.drops.length > 0
    ? `，獲得 ${params.drops.slice(0, 3).join("、")}${params.drops.length > 3 ? "…" : ""}`
    : "";
  broadcastLiveFeed({
    feedType: "boss_kill",
    agentName: params.agentName,
    agentElement: params.agentElement,
    agentLevel: params.agentLevel,
    detail: `${who} 擊殺了 ${params.bossName}${dropText}！`,
    icon: "🏆",
    targetPath: "/game",
  });
}
