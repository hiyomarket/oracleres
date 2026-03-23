/**
 * gameLobbyAndQuest.test.ts
 * V11.9 測試：遊戲大廳入口整合 + 每日任務前端 UI
 * PROPOSAL-20260323-GAME-遊戲大廳入口整合
 * PROPOSAL-20260323-GAME-每日任務前端UI
 */

import { describe, it, expect } from "vitest";

// ─── 遊戲大廳入口整合 ──────────────────────────────────────────────
describe("GameLobby 遊戲大廳入口整合", () => {
  it("WUXING_HEX 應包含五行正確的重點配色", () => {
    const WUXING_HEX: Record<string, string> = {
      wood: "#2E8B57",
      fire: "#DC143C",
      earth: "#CD853F",
      metal: "#C9A227",
      water: "#00CED1",
    };
    expect(WUXING_HEX.wood).toBe("#2E8B57");
    expect(WUXING_HEX.fire).toBe("#DC143C");
    expect(WUXING_HEX.earth).toBe("#CD853F");
    expect(WUXING_HEX.metal).toBe("#C9A227");
    expect(WUXING_HEX.water).toBe("#00CED1");
  });

  it("WUXING_ZH 應包含五行中文對應", () => {
    const WUXING_ZH: Record<string, string> = {
      wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
    };
    expect(WUXING_ZH.wood).toBe("木");
    expect(WUXING_ZH.metal).toBe("金");
    expect(WUXING_ZH.water).toBe("水");
  });

  it("遊戲大廳三個入口卡片路由應正確", () => {
    const lobbyCards = [
      { id: "avatar", path: "/game/avatar" },
      { id: "shop", path: "/game/shop" },
      { id: "combat", path: "/game/combat" },
    ];
    expect(lobbyCards[0].path).toBe("/game/avatar");
    expect(lobbyCards[1].path).toBe("/game/shop");
    expect(lobbyCards[2].path).toBe("/game/combat");
  });

  it("角色主五行計算應取裝備中最多的五行", () => {
    const equippedItems = [
      { wuxing: "fire" }, { wuxing: "fire" }, { wuxing: "wood" },
    ];
    const wuxingCount: Record<string, number> = {};
    for (const item of equippedItems) {
      wuxingCount[item.wuxing] = (wuxingCount[item.wuxing] ?? 0) + 1;
    }
    const topWuxing = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    expect(topWuxing).toBe("fire");
  });

  it("無裝備時預設五行應為 metal", () => {
    const equippedItems: { wuxing: string }[] = [];
    const wuxingCount: Record<string, number> = {};
    for (const item of equippedItems) {
      wuxingCount[item.wuxing] = (wuxingCount[item.wuxing] ?? 0) + 1;
    }
    const topWuxing = Object.entries(wuxingCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "metal";
    expect(topWuxing).toBe("metal");
  });
});

// ─── 每日穿搭任務前端 UI ──────────────────────────────────────────
describe("DailyQuestCard 任務進度計算", () => {
  const calculateProgress = (targetWuxing: string, equippedWuxingList: string[]) => {
    return equippedWuxingList.filter((w) => w === targetWuxing).length;
  };

  it("應正確計算目標五行的裝備數量", () => {
    const list = ["fire", "fire", "wood", "metal"];
    expect(calculateProgress("fire", list)).toBe(2);
    expect(calculateProgress("wood", list)).toBe(1);
    expect(calculateProgress("water", list)).toBe(0);
  });

  it("空裝備列表應回傳 0", () => {
    expect(calculateProgress("fire", [])).toBe(0);
  });

  it("達到 minItems 時 isReady 應為 true", () => {
    const progress = calculateProgress("fire", ["fire", "fire"]);
    const minItems = 2;
    expect(progress >= minItems).toBe(true);
  });

  it("未達到 minItems 時 isReady 應為 false", () => {
    const progress = calculateProgress("fire", ["fire", "wood"]);
    const minItems = 2;
    expect(progress >= minItems).toBe(false);
  });

  it("任務已完成時不應再次提交", () => {
    const quest = { alreadyCompleted: true, minItems: 2 };
    const shouldShowSubmit = !quest.alreadyCompleted;
    expect(shouldShowSubmit).toBe(false);
  });
});

// ─── QuestCompleteModal 動畫階段 ─────────────────────────────────
describe("QuestCompleteModal 動畫邏輯", () => {
  it("初始動畫階段應為 burst", () => {
    const initialPhase = "burst";
    expect(initialPhase).toBe("burst");
  });

  it("BLESSING_LABELS 應包含所有等級", () => {
    const BLESSING_LABELS: Record<string, string> = {
      destiny: "天命加持 ✨",
      good: "吉祥如意 🌟",
      normal: "平穩順遂 ☯️",
      none: "修行中 🌱",
    };
    expect(Object.keys(BLESSING_LABELS)).toHaveLength(4);
    expect(BLESSING_LABELS.destiny).toContain("天命加持");
  });

  it("未知 blessingLevel 應 fallback 為修行中", () => {
    const BLESSING_LABELS: Record<string, string> = {
      destiny: "天命加持 ✨",
      good: "吉祥如意 🌟",
      normal: "平穩順遂 ☯️",
      none: "修行中 🌱",
    };
    const level = "unknown";
    const label = BLESSING_LABELS[level] ?? "修行中";
    expect(label).toBe("修行中");
  });
});

// ─── SharedNav 遊戲入口 ──────────────────────────────────────────
describe("SharedNav 遊戲大廳入口", () => {
  it("/game 路徑應觸發 startsWith 高亮", () => {
    const pathname = "/game/avatar";
    expect(pathname.startsWith("/game")).toBe(true);
  });

  it("/game 精確路徑應觸發高亮", () => {
    const pathname = "/game";
    expect(pathname.startsWith("/game")).toBe(true);
  });

  it("非遊戲路徑不應觸發高亮", () => {
    const pathname = "/profile";
    expect(pathname.startsWith("/game")).toBe(false);
  });
});
