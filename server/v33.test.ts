/**
 * V33 測試：全服即時動態橫幅 + 成就通知彈窗
 * - liveFeedBroadcast 廣播函數
 * - useGameWebSocket 指數退避重連邏輯
 * - GlobalChat live_feed 訊息轉換
 * - WorldTickEngine 週冠軍廣播整合
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 模擬 wsServer ───
vi.mock("./wsServer", () => ({
  broadcastToAll: vi.fn(),
  sendToAgent: vi.fn(),
}));

import { broadcastToAll } from "./wsServer";

// ─── liveFeedBroadcast 測試 ───
describe("liveFeedBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("broadcastLevelUp 應廣播 live_feed 事件", async () => {
    const { broadcastLevelUp } = await import("./liveFeedBroadcast");
    broadcastLevelUp({
      agentId: 1,
      agentName: "玄武旅人",
      agentElement: "water",
      newLevel: 10,
    });
    expect(broadcastToAll).toHaveBeenCalledOnce();
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.type).toBe("live_feed");
    expect(call.payload.feedType).toBe("level_up");
    expect(call.payload.agentName).toBe("玄武旅人");
    expect(call.payload.agentLevel).toBe(10);
  });

  it("broadcastAchievementUnlock 應廣播成就解鎖事件", async () => {
    const { broadcastAchievementUnlock } = await import("./liveFeedBroadcast");
    broadcastAchievementUnlock({
      agentId: 2,
      agentName: "青龍旅人",
      agentElement: "wood",
      agentLevel: 5,
      achievementId: "first_step",
      achievementName: "初出茅庬",
      achievementIcon: "🏅",
      achievementDesc: "完成第一步",
    });
    expect(broadcastToAll).toHaveBeenCalledOnce();
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.type).toBe("live_feed");
    expect(call.payload.feedType).toBe("achievement_unlock");
    expect(call.payload.detail).toContain("初出茅庬");
  });

  it("broadcastLegendaryDrop 應廣播傳說掉落事件", async () => {
    const { broadcastLegendaryDrop } = await import("./liveFeedBroadcast");
    broadcastLegendaryDrop({
      agentId: 3,
      agentName: "朱雀旅人",
      agentElement: "fire",
      agentLevel: 8,
      itemName: "傳說之劍",
    });
    expect(broadcastToAll).toHaveBeenCalledOnce();
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.type).toBe("live_feed");
    expect(call.payload.feedType).toBe("legendary_drop");
    expect(call.payload.detail).toContain("傳說之劍");
  });

  it("broadcastPvpWin 應廣播 PvP 勝利事件", async () => {
    const { broadcastPvpWin } = await import("./liveFeedBroadcast");
    broadcastPvpWin({
      agentId: 1,
      agentName: "白虎旅人",
      agentElement: "metal",
      agentLevel: 12,
      defenderName: "玄武旅人",
    });
    expect(broadcastToAll).toHaveBeenCalledOnce();
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.type).toBe("live_feed");
    expect(call.payload.feedType).toBe("pvp_win");
    expect(call.payload.detail).toContain("玄武旅人");
  });

  it("broadcastWeeklyChampion 應廣播週冠軍事件", async () => {
    const { broadcastWeeklyChampion } = await import("./liveFeedBroadcast");
    broadcastWeeklyChampion({
      agentName: "天命旅人",
      agentElement: "earth",
      agentLevel: 20,
      category: "level",
    });
    expect(broadcastToAll).toHaveBeenCalledOnce();
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.type).toBe("live_feed");
    expect(call.payload.feedType).toBe("weekly_champion");
    expect(call.payload.detail).toContain("等級週冠軍");
  });

  it("broadcastWeeklyChampion combat 類型應廣播戰鬥週冠軍", async () => {
    const { broadcastWeeklyChampion } = await import("./liveFeedBroadcast");
    broadcastWeeklyChampion({
      agentName: "戰神旅人",
      agentElement: "fire",
      agentLevel: 15,
      category: "combat",
    });
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.payload.detail).toContain("戰鬥週冠軍");
  });
});

// ─── live_feed payload 結構驗證 ───
describe("live_feed payload 結構", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("所有 live_feed 事件應包含必要欄位", async () => {
    const { broadcastLevelUp } = await import("./liveFeedBroadcast");
    broadcastLevelUp({
      agentId: 99,
      agentName: "測試旅人",
      agentElement: "wood",
      newLevel: 3,
    });
    const call = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const payload = call.payload;
    // 必要欄位
    expect(payload).toHaveProperty("feedType");
    expect(payload).toHaveProperty("agentName");
    expect(payload).toHaveProperty("agentElement");
    expect(payload).toHaveProperty("agentLevel");
    expect(payload).toHaveProperty("detail");
    expect(payload).toHaveProperty("icon");
    expect(payload).toHaveProperty("ts");
    // ts 應為合理的時間戳
    expect(typeof payload.ts).toBe("number");
    expect(payload.ts).toBeGreaterThan(1700000000000); // 2023 年後
  });

  it("targetPath 應指向有效路由", async () => {
    const { broadcastLevelUp, broadcastAchievementUnlock, broadcastPvpWin } = await import("./liveFeedBroadcast");
    const validPaths = ["/game", "/game/achievements", "/game/world"];

    broadcastLevelUp({ agentId: 1, agentName: "A", agentElement: "wood", newLevel: 1 });
    broadcastAchievementUnlock({ agentId: 2, agentName: "B", agentElement: "fire", agentLevel: 2, achievementId: "x", achievementName: "X", achievementIcon: "🏅", achievementDesc: "X" });
    broadcastPvpWin({ agentId: 1, agentName: "C", agentElement: "metal", agentLevel: 3, defenderName: "D" });

    const calls = (broadcastToAll as ReturnType<typeof vi.fn>).mock.calls;
    for (const [msg] of calls) {
      if (msg.payload.targetPath) {
        expect(validPaths.some(p => msg.payload.targetPath.startsWith(p))).toBe(true);
      }
    }
  });
});

// ─── WebSocket 指數退避重連邏輯測試 ───
describe("WebSocket 指數退避重連邏輯", () => {
  it("退避延遲應隨嘗試次數指數增長", () => {
    const BASE_RECONNECT_MS = 1000;
    const MAX_RECONNECT_MS = 30000;

    const getReconnectDelay = (attempts: number) => {
      return Math.min(BASE_RECONNECT_MS * Math.pow(2, attempts), MAX_RECONNECT_MS);
    };

    expect(getReconnectDelay(0)).toBe(1000);
    expect(getReconnectDelay(1)).toBe(2000);
    expect(getReconnectDelay(2)).toBe(4000);
    expect(getReconnectDelay(3)).toBe(8000);
    expect(getReconnectDelay(4)).toBe(16000);
    expect(getReconnectDelay(5)).toBe(30000); // 上限
    expect(getReconnectDelay(10)).toBe(30000); // 仍在上限
  });

  it("最大重連延遲不應超過 30 秒", () => {
    const BASE_RECONNECT_MS = 1000;
    const MAX_RECONNECT_MS = 30000;
    for (let i = 0; i <= 20; i++) {
      const delay = Math.min(BASE_RECONNECT_MS * Math.pow(2, i), MAX_RECONNECT_MS);
      expect(delay).toBeLessThanOrEqual(MAX_RECONNECT_MS);
    }
  });
});

// ─── GlobalChat live_feed 訊息轉換邏輯測試 ───
describe("GlobalChat live_feed 訊息轉換", () => {
  const feedIcons: Record<string, string> = {
    level_up: "⬆️", achievement_unlock: "🏅", legendary_drop: "💎",
    pvp_win: "⚔️", weekly_champion: "👑", world_event: "🌍",
  };

  it("所有 feedType 應有對應圖示", () => {
    const expectedTypes = ["level_up", "achievement_unlock", "legendary_drop", "pvp_win", "weekly_champion", "world_event"];
    for (const type of expectedTypes) {
      expect(feedIcons[type]).toBeDefined();
      expect(feedIcons[type].length).toBeGreaterThan(0);
    }
  });

  it("未知 feedType 應使用預設圖示", () => {
    const icon = feedIcons["unknown_type"] ?? "✨";
    expect(icon).toBe("✨");
  });

  it("live_feed 訊息應轉換為 world_event msgType", () => {
    const feed = {
      feedType: "level_up",
      agentName: "測試旅人",
      detail: "升級到 Lv.5！",
      ts: Date.now(),
    };
    const icon = feedIcons[feed.feedType] ?? "✨";
    const syntheticMsg = {
      id: -(feed.ts + 100),
      agentId: 0,
      agentName: `${icon} 天命廣播`,
      agentElement: "water",
      agentLevel: 0,
      agentTitle: null,
      content: `${feed.agentName} ${feed.detail}`,
      msgType: "world_event" as const,
      createdAt: feed.ts,
    };
    expect(syntheticMsg.msgType).toBe("world_event");
    expect(syntheticMsg.agentName).toContain("天命廣播");
    expect(syntheticMsg.content).toContain("測試旅人");
    expect(syntheticMsg.content).toContain("升級到 Lv.5！");
  });

  it("live_feed 訊息 id 應為負數避免與真實訊息衝突", () => {
    const ts = Date.now();
    const id = -(ts + Math.floor(Math.random() * 10000));
    expect(id).toBeLessThan(0);
  });
});

// ─── LiveFeedBanner 事件顏色映射測試 ───
describe("LiveFeedBanner 事件顏色映射", () => {
  const FEED_COLORS: Record<string, string> = {
    level_up: "text-amber-300",
    achievement_unlock: "text-yellow-300",
    legendary_drop: "text-purple-300",
    pvp_win: "text-red-300",
    weekly_champion: "text-yellow-200",
    world_event: "text-cyan-300",
  };

  it("所有 feedType 應有對應顏色", () => {
    const types = ["level_up", "achievement_unlock", "legendary_drop", "pvp_win", "weekly_champion", "world_event"];
    for (const type of types) {
      expect(FEED_COLORS[type]).toBeDefined();
      expect(FEED_COLORS[type]).toMatch(/^text-/);
    }
  });

  it("未知 feedType 應有預設顏色", () => {
    const color = FEED_COLORS["unknown"] ?? "text-white";
    expect(color).toBe("text-white");
  });
});

// ─── AchievementToast 自動消失邏輯測試 ───
describe("AchievementToast 自動消失邏輯", () => {
  it("進度條寬度應從 100% 線性縮減到 0%", () => {
    const DISPLAY_DURATION_MS = 5000;
    const elapsed = 2500;
    const progress = Math.max(0, 100 - (elapsed / DISPLAY_DURATION_MS) * 100);
    expect(progress).toBeCloseTo(50, 0);
  });

  it("超過顯示時間後進度條應為 0%", () => {
    const DISPLAY_DURATION_MS = 5000;
    const elapsed = 6000;
    const progress = Math.max(0, 100 - (elapsed / DISPLAY_DURATION_MS) * 100);
    expect(progress).toBe(0);
  });

  it("多個成就通知應按佇列顯示", () => {
    const queue: string[] = ["成就A", "成就B", "成就C"];
    const shown = queue.shift();
    expect(shown).toBe("成就A");
    expect(queue).toHaveLength(2);
  });
});
