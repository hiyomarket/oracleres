/**
 * 虛相世界遊戲 tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameAgents, agentEvents, gameWorld, agentInventory } from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { MAP_NODES, NODE_MAP, WUXING_OVERCOME, WUXING_GENERATE } from "../../shared/mapNodes";
import { MONSTERS, MONSTER_MAP } from "../../shared/monsters";
import { processTick, calcExpToNext } from "../tickEngine";
import type { WuXing } from "../../shared/mapNodes";

// Mock 命格資料（待主系統串接後替換）
const MOCK_WUXING_PROFILE = {
  wood: 35,
  fire: 25,
  earth: 20,
  metal: 12,
  water: 8,
  dominant: "wood" as WuXing,
  gender: "male" as const,
};

function calcStatsFromWuxing(wuxing: typeof MOCK_WUXING_PROFILE) {
  return {
    maxHp: Math.floor(100 + wuxing.wood * 2),
    maxMp: Math.floor(50 + wuxing.water * 1.5),
    attack: Math.floor(10 + wuxing.fire * 0.8),
    defense: Math.floor(8 + wuxing.earth * 0.6),
    speed: Math.floor(5 + wuxing.metal * 0.7),
  };
}

export const gameRouter = router({
  // ─── 取得或建立玩家角色 ───
  getOrCreateAgent: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(20).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const existing = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, ctx.user.id))
        .limit(1);

      if (existing[0]) return existing[0];

      // 建立新角色（使用 Mock 命格資料）
      const wuxing = MOCK_WUXING_PROFILE;
      const stats = calcStatsFromWuxing(wuxing);
      const agentName = input?.name ?? ctx.user.name ?? "旅人";

      await db.insert(gameAgents).values({
        userId: ctx.user.id,
        name: agentName,
        gender: wuxing.gender,
        currentNodeId: "taipei-zhongzheng",
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        mp: stats.maxMp,
        maxMp: stats.maxMp,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        wuxingWood: wuxing.wood,
        wuxingFire: wuxing.fire,
        wuxingEarth: wuxing.earth,
        wuxingMetal: wuxing.metal,
        wuxingWater: wuxing.water,
        dominantElement: wuxing.dominant,
        level: 1,
        exp: 0,
        expToNext: calcExpToNext(1),
        gold: 50,
        spiritStone: 10,
        strategy: "explore",
        status: "idle",
        isActive: true,
      });

      const created = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, ctx.user.id))
        .limit(1);
      return created[0];
    }),

  // ─── 取得角色狀態 ───
  getAgentStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const agent = await db
      .select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, ctx.user.id))
      .limit(1);

    if (!agent[0]) return null;

    const currentNode = NODE_MAP[agent[0].currentNodeId];
    const movingToNode = agent[0].movingToNodeId ? NODE_MAP[agent[0].movingToNodeId] : null;

    return {
      agent: agent[0],
      currentNode,
      movingToNode,
    };
  }),

  // ─── 取得事件日誌 ───
  getEventLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const agent = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, ctx.user.id))
        .limit(1);

      if (!agent[0]) return [];

      return db
        .select()
        .from(agentEvents)
        .where(eq(agentEvents.agentId, agent[0].id))
        .orderBy(desc(agentEvents.createdAt))
        .limit(input.limit);
    }),

  // ─── 切換策略 ───
  setStrategy: protectedProcedure
    .input(z.object({
      strategy: z.enum(["explore", "farm", "merchant", "rest"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .update(gameAgents)
        .set({ strategy: input.strategy })
        .where(eq(gameAgents.userId, ctx.user.id));

      return { success: true };
    }),

  // ─── 神蹟：治癒 ───
  divineHeal: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const agents = await db
      .select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, ctx.user.id))
      .limit(1);

    const agent = agents[0];
    if (!agent) throw new Error("角色不存在");
    if (agent.spiritStone < 5) throw new Error("靈石不足（需要 5 顆）");

    const healAmount = Math.floor(agent.maxHp * 0.5);
    const newHp = Math.min(agent.maxHp, agent.hp + healAmount);

    await db.update(gameAgents).set({
      hp: newHp,
      spiritStone: agent.spiritStone - 5,
      status: "idle",
    }).where(eq(gameAgents.id, agent.id));

    await db.insert(agentEvents).values({
      agentId: agent.id,
      tick: 0,
      eventType: "divine",
      message: `⚡ 神明降下神蹟，${agent.name} 恢復了 ${healAmount} 點 HP！（消耗 5 靈石）`,
      data: { healAmount, spiritStoneUsed: 5 },
      nodeId: agent.currentNodeId,
    });

    return { success: true, healAmount };
  }),

  // ─── 神蹟：傳送 ───
  divineTransport: protectedProcedure
    .input(z.object({ targetNodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const targetNode = NODE_MAP[input.targetNodeId];
      if (!targetNode) throw new Error("目標節點不存在");

      const agents = await db
        .select()
        .from(gameAgents)
        .where(eq(gameAgents.userId, ctx.user.id))
        .limit(1);

      const agent = agents[0];
      if (!agent) throw new Error("角色不存在");
      if (agent.spiritStone < 10) throw new Error("靈石不足（需要 10 顆）");

      await db.update(gameAgents).set({
        currentNodeId: input.targetNodeId,
        movingToNodeId: null,
        moveArrivesAt: null,
        status: "idle",
        spiritStone: agent.spiritStone - 10,
      }).where(eq(gameAgents.id, agent.id));

      await db.insert(agentEvents).values({
        agentId: agent.id,
        tick: 0,
        eventType: "divine",
        message: `🌸 神明施展傳送神蹟，${agent.name} 瞬間出現在 ${targetNode.name}！（消耗 10 靈石）`,
        data: { targetNodeId: input.targetNodeId },
        nodeId: input.targetNodeId,
      });

      return { success: true };
    }),

  // ─── 取得地圖節點列表 ───
  getMapNodes: publicProcedure.query(() => {
    return MAP_NODES;
  }),

  // ─── 取得全服狀態 ───
  getWorldStatus: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const worlds = await db.select().from(gameWorld).limit(1);
    return worlds[0] ?? null;
  }),

  // ─── 手動觸發 Tick（測試用）───
  triggerTick: protectedProcedure.mutation(async ({ ctx }) => {
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
      .where(eq(gameAgents.userId, ctx.user.id))
      .limit(1);

    if (!agents[0]) return [];

    return db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agentId, agents[0].id));
  }),

  // ─── 取得怪物圖鑑（公開）───
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
