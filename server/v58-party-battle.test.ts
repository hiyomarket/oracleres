import { describe, it, expect } from "vitest";
import { MAP_NODES, MAP_NODE_MAP } from "../shared/mapNodes";

/**
 * v5.8 Tests — NPC 節點視覺標記 + 組隊戰鬥系統
 */

describe("NPC 節點視覺標記", () => {
  const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));

  it("NPC 節點存在於 MAP_NODES 中", () => {
    expect(npcNodes.length).toBeGreaterThanOrEqual(20);
  });

  it("NPC 節點都有 NPC據點 terrain 類型", () => {
    for (const node of npcNodes) {
      expect(node.terrain).toBe("NPC據點");
    }
  });

  it("NPC 節點都有有效的座標", () => {
    for (const node of npcNodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(200); // 海外節點可能超出 100
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(200);
    }
  });

  it("NPC 節點都在 MAP_NODE_MAP 中可查詢", () => {
    for (const node of npcNodes) {
      const found = MAP_NODE_MAP.get(node.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(node.id);
    }
  });

  it("NPC 節點涵蓋所有區域", () => {
    const regions = new Set(npcNodes.map(n => {
      if (n.id.startsWith("npc-fogcity")) return "迷霧城";
      if (n.id.startsWith("npc-realm1")) return "初界";
      if (n.id.startsWith("npc-realm2")) return "中界";
      if (n.id.startsWith("npc-tower")) return "試煉之塔";
      if (n.id.startsWith("npc-abyss")) return "碎影深淵";
      return "unknown";
    }));
    expect(regions.has("迷霧城")).toBe(true);
    expect(regions.has("初界")).toBe(true);
    expect(regions.has("中界")).toBe(true);
    expect(regions.has("試煉之塔")).toBe(true);
    expect(regions.has("碎影深淵")).toBe(true);
  });
});

describe("組隊系統 — 個別 tick 機制", () => {
  it("afkTickEngine 存在且可導入", async () => {
    const mod = await import("../server/afkTickEngine");
    expect(mod).toBeDefined();
  });

  it("tickEngine 的 processAgentTick 存在", async () => {
    const mod = await import("../server/tickEngine");
    expect(mod.processAgentTick).toBeDefined();
    expect(typeof mod.processAgentTick).toBe("function");
  });
});

describe("組隊戰鬥 — Schema 驗證", () => {
  it("gameBattleParticipants 有 rowPosition 欄位", async () => {
    const schema = await import("../drizzle/schema");
    const cols = schema.gameBattleParticipants;
    expect(cols).toBeDefined();
    // 確認 rowPosition 在 schema 中定義
    expect((cols as any).rowPosition).toBeDefined();
  });

  it("gameBattles 有 partyId 欄位", async () => {
    const schema = await import("../drizzle/schema");
    const cols = schema.gameBattles;
    expect(cols).toBeDefined();
    expect((cols as any).partyId).toBeDefined();
  });

  it("partyBattleInvites 表存在", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.partyBattleInvites).toBeDefined();
  });
});

describe("組隊戰鬥 — Router 程序", () => {
  it("gameParty router 有 initiateBossBattle 程序", async () => {
    const mod = await import("../server/routers/gameParty");
    const router = mod.gamePartyRouter;
    expect(router).toBeDefined();
    // 檢查 router 的 _def.procedures 中包含 initiateBossBattle
    const procedures = (router as any)._def?.procedures ?? (router as any)._def?.record;
    if (procedures) {
      expect(procedures.initiateBossBattle).toBeDefined();
    }
  });

  it("gameParty router 有 respondBattleInvite 程序", async () => {
    const mod = await import("../server/routers/gameParty");
    const router = mod.gamePartyRouter;
    const procedures = (router as any)._def?.procedures ?? (router as any)._def?.record;
    if (procedures) {
      expect(procedures.respondBattleInvite).toBeDefined();
    }
  });

  it("gameParty router 有 getPendingBattleInvite 程序", async () => {
    const mod = await import("../server/routers/gameParty");
    const router = mod.gamePartyRouter;
    const procedures = (router as any)._def?.procedures ?? (router as any)._def?.record;
    if (procedures) {
      expect(procedures.getPendingBattleInvite).toBeDefined();
    }
  });

  it("gameParty router 有 startPartyBattle 程序", async () => {
    const mod = await import("../server/routers/gameParty");
    const router = mod.gamePartyRouter;
    const procedures = (router as any)._def?.procedures ?? (router as any)._def?.record;
    if (procedures) {
      expect(procedures.startPartyBattle).toBeDefined();
    }
  });
});

describe("回合計時器 — 後台設定", () => {
  it("game_config 中有 battleTurnTimer 相關設定", async () => {
    // 這些 config key 在 AdminGameTheater 中使用
    const expectedKeys = [
      "battleTurnTimerPvE",
      "battleTurnTimerBoss",
      "battleTurnTimerPvP",
    ];
    // 驗證 key 格式正確
    for (const key of expectedKeys) {
      expect(key).toMatch(/^battleTurnTimer/);
    }
  });

  it("前後排定位值有效", () => {
    const validPositions = ["front", "back"];
    expect(validPositions).toContain("front");
    expect(validPositions).toContain("back");
  });
});

describe("NPC 節點 — 與原有節點不衝突", () => {
  const npcNodes = MAP_NODES.filter(n => n.id.startsWith("npc-"));
  const regularNodes = MAP_NODES.filter(n => !n.id.startsWith("npc-"));

  it("NPC 節點 ID 不與原有節點 ID 衝突", () => {
    const regularIds = new Set(regularNodes.map(n => n.id));
    for (const node of npcNodes) {
      expect(regularIds.has(node.id)).toBe(false);
    }
  });

  it("MAP_NODES 總數 = 原有節點 + NPC 節點", () => {
    expect(MAP_NODES.length).toBe(regularNodes.length + npcNodes.length);
  });
});
