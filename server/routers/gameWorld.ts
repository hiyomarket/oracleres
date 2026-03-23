/**
 * 虛相世界 tRPC Router
 * 包含：角色命名、角色狀態、事件日誌、策略切換、Tick 觸發
 * GD-018：等級扁平化，裝備為核心成長
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getUserProfileForEngine } from "../db";
import { gameAgents, agentEvents, gameWorld, agentInventory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { MAP_NODES, MAP_NODE_MAP } from "../../shared/mapNodes";
import { MONSTERS } from "../../shared/monsters";
import { processTick, calcExpToNext, resolveCombat } from "../tickEngine";
import type { WuXing } from "../../shared/types";

// ─── 從命格資料計算角色初始屬性 ───
function calcStatsFromNatal(natalStats: {
  wood: number; fire: number; earth: number; metal: number; water: number;
}) {
  return {
    maxHp: Math.floor(100 + natalStats.wood * 2),
    maxMp: Math.floor(50 + natalStats.water * 1.5),
    attack: Math.floor(10 + natalStats.fire * 0.8),
    defense: Math.floor(8 + natalStats.earth * 0.6),
    speed: Math.floor(5 + natalStats.metal * 0.7),
  };
}

// ─── 取得或建立玩家角色 ───
export const gameWorldRouter = router({
  getOrCreateAgent: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const existing = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);

      if (existing[0]) {
        return {
          agent: existing[0],
          isNew: false,
          needsNaming: !existing[0].isNamed,
        };
      }

      // 讀取真實命格資料
      const profile = await getUserProfileForEngine(ctx.user.id);
      const natalStats = {
        wood: Math.round((profile.natalElementRatio["木"] ?? 0.2) * 100),
        fire: Math.round((profile.natalElementRatio["火"] ?? 0.2) * 100),
        earth: Math.round((profile.natalElementRatio["土"] ?? 0.2) * 100),
        metal: Math.round((profile.natalElementRatio["金"] ?? 0.2) * 100),
        water: Math.round((profile.natalElementRatio["水"] ?? 0.2) * 100),
      };

      // 找出主屬性
      const elementEntries = Object.entries(natalStats) as [WuXing, number][];
      const dominant = elementEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

      const stats = calcStatsFromNatal(natalStats);
      const now = Date.now();

      await db.insert(gameAgents).values({
        userId: String(ctx.user.id),
        agentName: null,
        isNamed: 0,
        level: 1,
        exp: 0,
        currentNodeId: "taipei-zhongzheng",
        strategy: "explore",
        status: "idle",
        dominantElement: dominant,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        mp: stats.maxMp,
        maxMp: stats.maxMp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        wuxingWood: natalStats.wood,
        wuxingFire: natalStats.fire,
        wuxingEarth: natalStats.earth,
        wuxingMetal: natalStats.metal,
        wuxingWater: natalStats.water,
        gold: 50,
        stamina: 100,
        maxStamina: 100,
        staminaLastRegen: now,
        actionPoints: 5,
        maxActionPoints: 5,
        isActive: 1,
        createdAt: now,
        updatedAt: now,
      });

      const created = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);

      return {
        agent: created[0],
        isNew: true,
        needsNaming: true,
      };
    }),

  // ─── 首次命名（P0） ───
  nameAgent: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(12).trim(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // 驗證名稱不含特殊字元
      if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-·•]+$/.test(input.name)) {
        throw new Error("名稱只能包含中文、英文、數字及 _ - · • 符號");
      }

      const agents = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);

      if (!agents[0]) throw new Error("角色不存在");
      if (agents[0].isNamed) throw new Error("已完成命名，無法再次修改");

      const now = Date.now();
      await db.update(gameAgents).set({
        agentName: input.name,
        isNamed: 1,
        updatedAt: now,
      }).where(eq(gameAgents.id, agents[0].id));

      // 記錄命名事件
      await db.insert(agentEvents).values({
        agentId: agents[0].id,
        eventType: "system",
        nodeId: agents[0].currentNodeId,
        message: `✨ 旅人獲得了名字：${input.name}。命運的齒輪開始轉動……`,
        detail: { type: "naming", name: input.name },
        createdAt: now,
      });

      return { success: true, name: input.name };
    }),

  // ─── 取得角色狀態 ───
  getAgentStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const agents = await db
      .select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id)))
      .limit(1);

    if (!agents[0]) return null;

    const agent = agents[0];
    const currentNode = MAP_NODE_MAP.get(agent.currentNodeId);
    const targetNode = agent.targetNodeId ? MAP_NODE_MAP.get(agent.targetNodeId) : null;

    // 計算體力值再生
    const now = Date.now();
    const lastRegen = agent.staminaLastRegen ?? now;
    const elapsed = now - lastRegen;
    const regenIntervalMs = 20 * 60 * 1000;
    const pendingRegen = Math.floor(elapsed / regenIntervalMs);
    const currentStamina = Math.min(agent.maxStamina, agent.stamina + pendingRegen);
    const nextRegenMs = regenIntervalMs - (elapsed % regenIntervalMs);

    return {
      agent: {
        ...agent,
        stamina: currentStamina,
      },
      currentNode,
      targetNode,
      staminaInfo: {
        current: currentStamina,
        max: agent.maxStamina,
        nextRegenMs,
        nextRegenMin: Math.ceil(nextRegenMs / 60000),
      },
    };
  }),

  // ─── 取得事件日誌 ───
  getEventLog: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      eventType: z.enum(["move", "combat", "gather", "rest", "rogue", "system"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const agents = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);

      if (!agents[0]) return [];

      const query = db
        .select()
        .from(agentEvents)
        .where(
          input.eventType
            ? and(eq(agentEvents.agentId, agents[0].id), eq(agentEvents.eventType, input.eventType))
            : eq(agentEvents.agentId, agents[0].id)
        )
        .orderBy(desc(agentEvents.createdAt))
        .limit(input.limit);

      return query;
    }),

  // ─── 切換策略 ───
  setStrategy: protectedProcedure
    .input(z.object({
      strategy: z.enum(["explore", "gather", "rest", "combat"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .update(gameAgents)
        .set({ strategy: input.strategy, updatedAt: Date.now() })
        .where(eq(gameAgents.userId, String(ctx.user.id)));

      return { success: true };
    }),

  // ─── 神蹟：治癒（消耗靈力值） ───
  divineHeal: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const agents = await db
      .select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id)))
      .limit(1);

    const agent = agents[0];
    if (!agent) throw new Error("角色不存在");
    if (agent.actionPoints < 1) throw new Error("靈力值不足（需要 1 點）");

    const healAmount = Math.floor(agent.maxHp * 0.5);
    const newHp = Math.min(agent.maxHp, agent.hp + healAmount);
    const now = Date.now();

    await db.update(gameAgents).set({
      hp: newHp,
      actionPoints: agent.actionPoints - 1,
      status: "idle",
      updatedAt: now,
    }).where(eq(gameAgents.id, agent.id));

    await db.insert(agentEvents).values({
      agentId: agent.id,
      eventType: "system",
      message: `⚡ 神明降下神蹟，${agent.agentName ?? "旅人"} 恢復了 ${healAmount} 點 HP！（消耗 1 靈力值）`,
      detail: { type: "divine_heal", healAmount, actionPointsUsed: 1 },
      nodeId: agent.currentNodeId,
      createdAt: now,
    });

    return { success: true, healAmount };
  }),

  // ─── 神蹟：傳送（消耗靈力值） ───
  divineTransport: protectedProcedure
    .input(z.object({ targetNodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const targetNode = MAP_NODE_MAP.get(input.targetNodeId);
      if (!targetNode) throw new Error("目標節點不存在");

      const agents = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);

      const agent = agents[0];
      if (!agent) throw new Error("角色不存在");
      if (agent.actionPoints < 2) throw new Error("靈力值不足（需要 2 點）");

      const now = Date.now();
      await db.update(gameAgents).set({
        currentNodeId: input.targetNodeId,
        targetNodeId: null,
        status: "idle",
        actionPoints: agent.actionPoints - 2,
        updatedAt: now,
      }).where(eq(gameAgents.id, agent.id));

      await db.insert(agentEvents).values({
        agentId: agent.id,
        eventType: "system",
        message: `🌸 神明施展傳送神蹟，${agent.agentName ?? "旅人"} 瞬間出現在 ${targetNode.name}！（消耗 2 靈力值）`,
        detail: { type: "divine_transport", targetNodeId: input.targetNodeId },
        nodeId: input.targetNodeId,
        createdAt: now,
      });

      return { success: true };
    }),

  // ─── 取得地圖節點列表 ───
  getMapNodes: publicProcedure.query(() => {
    return MAP_NODES;
  }),

  // ─── 取得全服世界狀態 ───
  getWorldStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const worlds = await db.select().from(gameWorld).limit(1);
    return worlds[0] ?? null;
  }),

  // ─── 手動觸發 Tick（測試用） ───
  triggerTick: protectedProcedure.mutation(async () => {
    const result = await processTick();
    return result;
  }),

  // ─── 取得背包 ───
  getInventory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const agents = await db
      .select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id)))
      .limit(1);

    if (!agents[0]) return [];

    return db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agentId, agents[0].id));
  }),

  // ─── 取得怪物圖鑑（公開） ───
  getMonsterBestiary: publicProcedure
    .input(z.object({
      element: z.enum(["wood", "fire", "earth", "metal", "water"]).optional(),
    }).optional())
    .query(({ input }) => {
      if (input?.element) {
        return MONSTERS.filter((m) => m.element === input.element);
      }
      return MONSTERS;
    }),
});
