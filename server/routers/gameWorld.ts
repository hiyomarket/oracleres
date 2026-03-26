/**
 * 虛相世界 tRPC Router
 * 包含：角色命名、角色狀態、事件日誌、策略切換、Tick 觸發
 * GD-018：等級扁平化，裝備為核心成長
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getUserProfileForEngine } from "../db";
import { gameAgents, agentEvents, gameWorld, agentInventory, gameHiddenEvents, agentTitles, gameTitles, gameSkillCatalog, gameItemCatalog, gameEquipmentCatalog, gameMonsterCatalog, gameVirtualShop, gameSpiritShop, gameHiddenShopPool, hiddenShopInstances, users, equipmentTemplates, agentDropCounters, gameBroadcast, pvpChallenges, chatMessages, agentPvpStats, achievements, agentAchievements, agentSkills, gameConfig } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gt, lt, sql, count, asc, inArray } from "drizzle-orm";
import { MAP_NODES, MAP_NODE_MAP } from "../../shared/mapNodes";
import { broadcastToAll, broadcastToAllIncludingAnon, sendToAgent } from "../wsServer";
import { updatePvpStats } from "../achievementEngine";
import { broadcastPvpWin, broadcastWeeklyChampion } from "../liveFeedBroadcast";
import { MONSTERS } from "../../shared/monsters";
import { processTick, processAgentTick, regenStamina, calcExpToNext, resolveCombat, calcCharacterStats } from "../tickEngine";
import { storagePut } from "../storage";
import type { WuXing } from "../../shared/types";

// ─── GD-020 補充二：從命格資料計算角色初始屬性（使用統一公式） ───
function calcStatsFromNatal(natalStats: {
  wood: number; fire: number; earth: number; metal: number; water: number;
}, level: number = 1) {
  // 使用 tickEngine 的統一公式：HP = 100 + Lv×10 + 木×3.0，以此類推
  const base = calcCharacterStats(natalStats, level);
  return {
    maxHp: base.hp,
    maxMp: base.mp,
    attack: base.atk,
    defense: base.def,
    speed: base.spd,
    // GD-002 生活系屬性（五行比例 → 生活技能，10 + 比例*1.5，最低10最高100）
    gatherPower: Math.min(100, Math.max(10, Math.round(10 + natalStats.wood * 1.5))),
    forgePower: Math.min(100, Math.max(10, Math.round(10 + natalStats.fire * 1.5))),
    carryWeight: Math.min(100, Math.max(10, Math.round(10 + natalStats.earth * 1.5))),
    refinePower: Math.min(100, Math.max(10, Math.round(10 + natalStats.metal * 1.5))),
    treasureHunting: Math.min(100, Math.max(10, Math.round(10 + natalStats.water * 1.5))),
    // GD-002 戰鬥系額外屬性
    healPower: Math.min(100, Math.max(10, Math.round(10 + natalStats.wood * 1.2))),
    magicAttack: Math.min(100, Math.max(10, Math.round(10 + natalStats.water * 1.2))),
    hitRate: Math.min(100, Math.max(10, Math.round(10 + natalStats.metal * 1.2))),
  };
}
// ─── 根據主屬性取得初始技能（使用技能目錄 ID） ───
// 舊格式 → 新格式映射表（用於資料遷移）
const OLD_TO_NEW_SKILL_MAP: Record<string, string> = {
  "wood-basic-atk": "S_W001", "wood-heal": "S_W009", "wood-regen": "S_W021",
  "fire-basic-atk": "S_F001", "fire-burst": "S_F002", "fire-boost": "S_F009",
  "earth-basic-atk": "S_E001", "earth-shield": "S_E002", "earth-tough": "S_E007",
  "metal-basic-atk": "S_M001", "metal-pierce": "S_M002", "metal-crit": "S_M006",
  "water-basic-atk": "S_W057", "water-flow": "S_W059", "water-sense": "S_W063",
};
function getInitialSkills(dominant: WuXing): { slot1: string; slot2: string; passive1: string } {
  const INITIAL_SKILLS: Record<WuXing, { slot1: string; slot2: string; passive1: string }> = {
    wood:  { slot1: "S_W001", slot2: "S_W009", passive1: "S_W021" },
    fire:  { slot1: "S_F001", slot2: "S_F002", passive1: "S_F009" },
    earth: { slot1: "S_E001", slot2: "S_E002", passive1: "S_E007" },
    metal: { slot1: "S_M001", slot2: "S_M002", passive1: "S_M006" },
    water: { slot1: "S_W057", slot2: "S_W059", passive1: "S_W063" },
  };
  return INITIAL_SKILLS[dominant];
}
/** 將舊格式技能 ID 轉換為新格式，若已是新格式則原樣返回 */
function migrateSkillId(id: string | null | undefined): string | null {
  if (!id) return null;
  return OLD_TO_NEW_SKILL_MAP[id] ?? id;
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
        const ag = existing[0];

        // ★ 舊格式技能 ID 自動遷移：將 "wood-basic-atk" 等舊 ID 轉為 "S_W001" 等新 ID
        const migratedSlot1 = migrateSkillId(ag.skillSlot1);
        const migratedSlot2 = migrateSkillId(ag.skillSlot2);
        const migratedSlot3 = migrateSkillId(ag.skillSlot3);
        const migratedSlot4 = migrateSkillId(ag.skillSlot4);
        const migratedPassive1 = migrateSkillId(ag.passiveSlot1);
        const migratedPassive2 = migrateSkillId(ag.passiveSlot2);
        const needsMigration = migratedSlot1 !== ag.skillSlot1 || migratedSlot2 !== ag.skillSlot2 ||
          migratedSlot3 !== ag.skillSlot3 || migratedSlot4 !== ag.skillSlot4 ||
          migratedPassive1 !== ag.passiveSlot1 || migratedPassive2 !== ag.passiveSlot2;

        // 若生活技能仍是預設值 20 但五行值已正確，自動同步
        if (ag.gatherPower === 20 && ag.wuxingWood !== 20) {
          const lifeStats = calcStatsFromNatal({
            wood: ag.wuxingWood, fire: ag.wuxingFire, earth: ag.wuxingEarth,
            metal: ag.wuxingMetal, water: ag.wuxingWater,
          });
          const initSkills = getInitialSkills(ag.dominantElement as WuXing);
          await db.update(gameAgents).set({
            gatherPower: lifeStats.gatherPower,
            forgePower: lifeStats.forgePower,
            carryWeight: lifeStats.carryWeight,
            refinePower: lifeStats.refinePower,
            treasureHunting: lifeStats.treasureHunting,
            healPower: lifeStats.healPower,
            magicAttack: lifeStats.magicAttack,
            hitRate: lifeStats.hitRate,
            skillSlot1: migratedSlot1 ?? initSkills.slot1,
            skillSlot2: migratedSlot2 ?? initSkills.slot2,
            passiveSlot1: migratedPassive1 ?? initSkills.passive1,
            updatedAt: Date.now(),
          }).where(eq(gameAgents.id, ag.id));
          const updated = await db.select().from(gameAgents)
            .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
          return { agent: updated[0], isNew: false, needsNaming: !ag.isNamed };
        }

        // ★ 如果有舊格式技能需要遷移，更新資料庫
        if (needsMigration) {
          await db.update(gameAgents).set({
            skillSlot1: migratedSlot1,
            skillSlot2: migratedSlot2,
            skillSlot3: migratedSlot3,
            skillSlot4: migratedSlot4,
            passiveSlot1: migratedPassive1,
            passiveSlot2: migratedPassive2,
            updatedAt: Date.now(),
          }).where(eq(gameAgents.id, ag.id));
          const updated = await db.select().from(gameAgents)
            .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
          return { agent: updated[0], isNew: false, needsNaming: !ag.isNamed };
        }

        return {
          agent: ag,
          isNew: false,
          needsNaming: !ag.isNamed,
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
        currentNodeId: "tp-zhongzheng",
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
        // GD-002 生活系屬性（從五行比例計算）
        gatherPower: stats.gatherPower,
        forgePower: stats.forgePower,
        carryWeight: stats.carryWeight,
        refinePower: stats.refinePower,
        treasureHunting: stats.treasureHunting,
        healPower: stats.healPower,
        magicAttack: stats.magicAttack,
        hitRate: stats.hitRate,
        // 初始技能
        skillSlot1: getInitialSkills(dominant).slot1,
        skillSlot2: getInitialSkills(dominant).slot2,
        passiveSlot1: getInitialSkills(dominant).passive1,
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

    // 從 game_config 讀取體力恢復參數（動態設定）
    const configRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
      .from(gameConfig)
      .where(and(
        eq(gameConfig.isActive, 1),
        sql`${gameConfig.configKey} IN ('stamina_regen_minutes','stamina_regen_amount','stamina_per_tick','move_stamina_cost','sell_discount_rate')`
      ));
    const cfgMap: Record<string, number> = {};
    for (const row of configRows) {
      cfgMap[row.configKey] = parseFloat(row.configValue) || 0;
    }
    const regenMinutes = cfgMap['stamina_regen_minutes'] ?? 30;
    const regenAmount  = cfgMap['stamina_regen_amount']  ?? 30;

    // 計算體力值再生
    const now = Date.now();
    const lastRegen = agent.staminaLastRegen ?? now;
    const elapsed = now - lastRegen;
    const regenIntervalMs = regenMinutes * 60 * 1000;
    const regenCycles = Math.floor(elapsed / regenIntervalMs);
    const pendingRegen = regenCycles * regenAmount;
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
        regenAmount,
        regenMinutes,
        staminaPerTick: cfgMap['stamina_per_tick'] ?? 5,
        moveStaminaCost: cfgMap['move_stamina_cost'] ?? 2,
        sellDiscountRate: cfgMap['sell_discount_rate'] ?? 0.3,
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
      strategy: z.enum(["explore", "gather", "rest", "combat", "infuse"]),
      movementMode: z.enum(["roaming", "stationary"]).optional(),
    }))
       .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // 查詢當前角色狀態
      const [agent] = await db.select()
        .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agent) throw new Error("角色不存在");

      // ★ 注靈限制：只有體力為 0 時才能切換到注靈
      if (input.strategy === "infuse" && agent.stamina > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "注靈只能在體力為 0 時執行！請先耗盡體力再嘗試。" });
      }

      const updateData: Record<string, unknown> = { strategy: input.strategy, updatedAt: Date.now() };
      if (input.movementMode) updateData.movementMode = input.movementMode;
      // 切換到 rest 或 infuse 時，記錄前一個策略以便自動切回
      if (input.strategy === "rest" || input.strategy === "infuse") {
        if (agent.strategy !== "rest" && agent.strategy !== "infuse") {
          updateData.previousStrategy = agent.strategy;
        }
      } else {
        // 主動切換非 rest/infuse 策略時，清除 previousStrategy
        updateData.previousStrategy = null;
      }
      await db
        .update(gameAgents)
        .set(updateData)
        .where(eq(gameAgents.userId, String(ctx.user.id)));
      return { success: true };
    }),
  // ─── 神跡：治癒（消耗靈力値） ────
  divineHeal: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // 從 game_config 讀取靈相干預參數
    const cfgRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
      .from(gameConfig)
      .where(and(eq(gameConfig.isActive, 1), sql`${gameConfig.configKey} IN ('divine_heal_hp_percent','divine_heal_ap_cost','divine_cooldown_seconds')`));
    const cfg: Record<string, string> = {};
    cfgRows.forEach(r => { cfg[r.configKey] = r.configValue; });
    const healPercent = Number(cfg.divine_heal_hp_percent ?? "50");
    const apCost = Number(cfg.divine_heal_ap_cost ?? "1");

    const agents = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    const agent = agents[0];
    if (!agent) throw new Error("角色不存在");
    if (agent.actionPoints < apCost) throw new Error(`靈力值不足（需要 ${apCost} 點）`);

    const healAmount = Math.floor(agent.maxHp * (healPercent / 100));
    const newHp = Math.min(agent.maxHp, agent.hp + healAmount);
    const now = Date.now();

    await db.update(gameAgents).set({
      hp: newHp,
      actionPoints: agent.actionPoints - apCost,
      status: "idle",
      updatedAt: now,
    }).where(eq(gameAgents.id, agent.id));

    await db.insert(agentEvents).values({
      agentId: agent.id,
      eventType: "system",
      message: `⚡ 神明降下神蹟，${agent.agentName ?? "旅人"} 恢復了 ${healAmount} 點 HP！（消耗 ${apCost} 靈力值）`,
      detail: { type: "divine_heal", healAmount, actionPointsUsed: apCost },
      nodeId: agent.currentNodeId,
      createdAt: now,
    });

    return { success: true, healAmount };
  }),
  // ─── 靈相干預：神眼加持（洞察力+15%，10行動內） ───
  divineEye: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const cfgRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
      .from(gameConfig)
      .where(and(eq(gameConfig.isActive, 1), sql`${gameConfig.configKey} IN ('divine_eye_boost_percent','divine_eye_ap_cost')`));
    const cfg: Record<string, string> = {};
    cfgRows.forEach(r => { cfg[r.configKey] = r.configValue; });
    const boostPercent = Number(cfg.divine_eye_boost_percent ?? "15");
    const apCost = Number(cfg.divine_eye_ap_cost ?? "1");

    const agents = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    const agent = agents[0];
    if (!agent) throw new Error("角色不存在");
    if (agent.actionPoints < apCost) throw new Error(`靈力值不足（需要 ${apCost} 點）`);

    const now = Date.now();
    const newTreasure = Math.min(1000, Math.round((agent.treasureHunting ?? 20) * (1 + boostPercent / 100)));
    await db.update(gameAgents).set({
      treasureHunting: newTreasure,
      actionPoints: agent.actionPoints - apCost,
      updatedAt: now,
    }).where(eq(gameAgents.id, agent.id));
    await db.insert(agentEvents).values({
      agentId: agent.id,
      eventType: "system",
      message: `👁 神眼加持降臨，${agent.agentName ?? "旅人"} 的洞察力提升至 ${newTreasure}！（消耗 ${apCost} 靈力值）`,
      detail: { type: "divine_eye", newTreasure, actionPointsUsed: apCost },
      nodeId: agent.currentNodeId,
      createdAt: now,
    });
    return { success: true, newTreasure };
  }),
  // ─── 靈相干預：靈癒疲勞（體力恢復至50） ───
  divineStamina: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const cfgRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
      .from(gameConfig)
      .where(and(eq(gameConfig.isActive, 1), sql`${gameConfig.configKey} IN ('divine_stamina_restore','divine_stamina_ap_cost')`));
    const cfg: Record<string, string> = {};
    cfgRows.forEach(r => { cfg[r.configKey] = r.configValue; });
    const staminaRestore = Number(cfg.divine_stamina_restore ?? "50");
    const apCost = Number(cfg.divine_stamina_ap_cost ?? "1");

    const agents = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    const agent = agents[0];
    if (!agent) throw new Error("角色不存在");
    if (agent.actionPoints < apCost) throw new Error(`靈力值不足（需要 ${apCost} 點）`);

    const now = Date.now();
    const newStamina = Math.max(agent.stamina ?? 0, staminaRestore);
    await db.update(gameAgents).set({
      stamina: newStamina,
      actionPoints: agent.actionPoints - apCost,
      updatedAt: now,
    }).where(eq(gameAgents.id, agent.id));
    await db.insert(agentEvents).values({
      agentId: agent.id,
      eventType: "system",
      message: `✨ 靈癒疲勞，${agent.agentName ?? "旅人"} 的體力恢復至 ${newStamina}！（消耗 ${apCost} 靈力值）`,
      detail: { type: "divine_stamina", newStamina, actionPointsUsed: apCost },
      nodeId: agent.currentNodeId,
      createdAt: now,
    });
    return { success: true, newStamina };
  }),
  // ─── 神蹟：傳送（消耗靈力值） ────
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
  // ─── PvP 挑戰 ───
  // ═══════════════════════════════════════════════════════════════
  // PVP 挑戰系統 v2（即時挑戰 + 應戰 + 倒數 + 冷卻 + 經驗獎勵）
  // ═══════════════════════════════════════════════════════════════

  /** 發起 PVP 挑戰（創建 pending 記錄，透過 WS 通知被挑戰者） */
  sendPvpChallenge: protectedProcedure
    .input(z.object({ defenderAgentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const challengerRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const challenger = challengerRows[0];
      if (!challenger) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      if (!challenger.isNamed) throw new TRPCError({ code: "BAD_REQUEST", message: "請先命名角色" });

      const defenderRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.id, input.defenderAgentId)).limit(1);
      const defender = defenderRows[0];
      if (!defender) throw new TRPCError({ code: "NOT_FOUND", message: "對手角色不存在" });
      if (challenger.id === defender.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能挑戰自己" });

      // 檢查 1 小時冷卻：同一對玩家 1 小時內不能重複挑戰
      const ONE_HOUR = 60 * 60 * 1000;
      const recentPvp = await db.select({ id: pvpChallenges.id }).from(pvpChallenges)
        .where(and(
          gt(pvpChallenges.createdAt, Date.now() - ONE_HOUR),
          sql`(
            (${pvpChallenges.challengerAgentId} = ${challenger.id} AND ${pvpChallenges.defenderAgentId} = ${defender.id})
            OR
            (${pvpChallenges.challengerAgentId} = ${defender.id} AND ${pvpChallenges.defenderAgentId} = ${challenger.id})
          )`,
          sql`${pvpChallenges.status} IN ('completed', 'accepted', 'pending')`
        ))
        .limit(1);
      if (recentPvp.length > 0) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "您與該玩家在 1 小時內已有對戰記錄，請稍後再試" });
      }

      // 檢查是否有其他 pending 挑戰
      const pendingChallenges = await db.select({ id: pvpChallenges.id }).from(pvpChallenges)
        .where(and(
          eq(pvpChallenges.status, "pending"),
          sql`(${pvpChallenges.challengerAgentId} = ${challenger.id} OR ${pvpChallenges.defenderAgentId} = ${challenger.id})`
        ))
        .limit(1);
      if (pendingChallenges.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "您已有進行中的挑戰，請等待結束" });
      }

      // 創建 pending 挑戰記錄
      const [inserted] = await db.insert(pvpChallenges).values({
        challengerAgentId: challenger.id,
        challengerName: challenger.agentName ?? "旅人",
        defenderAgentId: defender.id,
        defenderName: defender.agentName ?? "旅人",
        status: "pending",
        result: "draw", // 暫時預設，完成後更新
        goldReward: 0,
        expRewardChallenger: 0,
        expRewardDefender: 0,
        createdAt: Date.now(),
      });
      const challengeId = inserted.insertId;

      // 透過 WS 通知被挑戰者
      try {
        sendToAgent(defender.id, {
          type: "pvp_challenge" as const,
          payload: {
            challengeId: Number(challengeId),
            challengerAgentId: challenger.id,
            challengerName: challenger.agentName ?? "旅人",
            challengerLevel: challenger.level,
            challengerElement: challenger.dominantElement ?? "metal",
            challengerAvatarUrl: challenger.avatarUrl ?? "",
          },
        });
      } catch { /* WS 失敗不影響流程 */ }

      // 5 秒後自動逾時
      setTimeout(async () => {
        try {
          const db2 = await getDb();
          if (!db2) return;
          const rows = await db2.select().from(pvpChallenges)
            .where(and(eq(pvpChallenges.id, Number(challengeId)), eq(pvpChallenges.status, "pending")))
            .limit(1);
          if (rows[0]) {
            await db2.update(pvpChallenges)
              .set({ status: "timeout" })
              .where(eq(pvpChallenges.id, Number(challengeId)));
            // 通知雙方逾時
            sendToAgent(challenger.id, {
              type: "pvp_challenge_cancelled" as const,
              payload: { challengeId: Number(challengeId), reason: "timeout", defenderName: defender.agentName ?? "旅人" },
            });
            sendToAgent(defender.id, {
              type: "pvp_challenge_cancelled" as const,
              payload: { challengeId: Number(challengeId), reason: "timeout", challengerName: challenger.agentName ?? "旅人" },
            });
          }
        } catch (e) { console.error("[PvP] timeout handler error:", e); }
      }, 5000);

      return {
        challengeId: Number(challengeId),
        defenderName: defender.agentName ?? "旅人",
        defenderLevel: defender.level,
        defenderElement: defender.dominantElement ?? "metal",
      };
    }),

  /** 回應 PVP 挑戰（接受或拒絕） */
  respondPvpChallenge: protectedProcedure
    .input(z.object({
      challengeId: z.number(),
      accept: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 取得挑戰記錄
      const challengeRows = await db.select().from(pvpChallenges)
        .where(eq(pvpChallenges.id, input.challengeId)).limit(1);
      const challenge = challengeRows[0];
      if (!challenge) throw new TRPCError({ code: "NOT_FOUND", message: "挑戰記錄不存在" });
      if (challenge.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "挑戰已結束或已回應" });

      // 驗證是被挑戰者
      const defenderRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const defender = defenderRows[0];
      if (!defender || defender.id !== challenge.defenderAgentId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "您不是被挑戰者" });
      }

      if (!input.accept) {
        // 拒絕挑戰
        await db.update(pvpChallenges)
          .set({ status: "declined" })
          .where(eq(pvpChallenges.id, input.challengeId));
        // 通知挑戰者
        sendToAgent(challenge.challengerAgentId, {
          type: "pvp_challenge_response" as const,
          payload: { challengeId: input.challengeId, accepted: false, defenderName: defender.agentName ?? "旅人" },
        });
        return { accepted: false, result: null };
      }

      // 接受挑戰 → 執行戰鬥
      const challengerRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.id, challenge.challengerAgentId)).limit(1);
      const challenger = challengerRows[0];
      if (!challenger) throw new TRPCError({ code: "NOT_FOUND", message: "挑戰者角色不存在" });

      // 戰鬥計算（模擬 5 回合，含五行相剋加成）
      const cAtk = challenger.attack + Math.floor(challenger.level * 2);
      const cDef = challenger.defense;
      const cHp = challenger.maxHp;
      const cSpd = challenger.speed;
      const dAtk = defender.attack + Math.floor(defender.level * 2);
      const dDef = defender.defense;
      const dHp = defender.maxHp;
      const dSpd = defender.speed;

      // ★ 五行相剋機制：木剋土、火剋金、土剋水、金剋木、水剋火
      const WUXING_COUNTER_PVP: Record<string, string> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
      const WX_ZH_PVP: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
      const cElement = (challenger.dominantElement ?? "wood") as string;
      const dElement = (defender.dominantElement ?? "wood") as string;

      // 計算五行相剋倍率
      let cWuxingMultiplier = 1.0; // 挑戰者對防御者的倍率
      let dWuxingMultiplier = 1.0; // 防御者對挑戰者的倍率
      let wuxingDesc = "";
      if (WUXING_COUNTER_PVP[cElement] === dElement) {
        cWuxingMultiplier = 1.2; // 挑戰者剋制防御者，傷害 +20%
        wuxingDesc = `${WX_ZH_PVP[cElement] ?? cElement}剋${WX_ZH_PVP[dElement] ?? dElement}！${challenger.agentName ?? "旅人"}傷害+20%`;
      } else if (WUXING_COUNTER_PVP[dElement] === cElement) {
        dWuxingMultiplier = 1.2; // 防御者剋制挑戰者，傷害 +20%
        wuxingDesc = `${WX_ZH_PVP[dElement] ?? dElement}剋${WX_ZH_PVP[cElement] ?? cElement}！${defender.agentName ?? "旅人"}傷害+20%`;
      }

      let cHpCur = cHp, dHpCur = dHp;
      const battleLog: string[] = [];
      if (wuxingDesc) battleLog.push(`✨ 五行相剋：${wuxingDesc}`);

      for (let round = 1; round <= 5; round++) {
        // 速度高者先攻
        const first = cSpd >= dSpd ? "challenger" : "defender";
        const second = first === "challenger" ? "defender" : "challenger";
        for (const who of [first, second]) {
          if (who === "challenger") {
            const rawDmg = Math.max(1, cAtk - Math.floor(dDef * 0.5) + Math.floor(Math.random() * 5));
            const dmg = Math.round(rawDmg * cWuxingMultiplier);
            dHpCur -= dmg;
            const wuxingTag = cWuxingMultiplier > 1 ? ` 【剋制+${Math.round((cWuxingMultiplier - 1) * 100)}%】` : "";
            battleLog.push(`第${round}回合：${challenger.agentName ?? "旅人"} 攻擊 ${dmg} 點${wuxingTag}`);
            if (dHpCur <= 0) { battleLog.push(`${defender.agentName ?? "旅人"} 戰敗！`); break; }
          } else {
            const rawDmg = Math.max(1, dAtk - Math.floor(cDef * 0.5) + Math.floor(Math.random() * 5));
            const dmg = Math.round(rawDmg * dWuxingMultiplier);
            cHpCur -= dmg;
            const wuxingTag = dWuxingMultiplier > 1 ? ` 【剋制+${Math.round((dWuxingMultiplier - 1) * 100)}%】` : "";
            battleLog.push(`第${round}回合：${defender.agentName ?? "旅人"} 攻擊 ${dmg} 點${wuxingTag}`);
            if (cHpCur <= 0) { battleLog.push(`${challenger.agentName ?? "旅人"} 戰敗！`); break; }
          }
        }
        if (cHpCur <= 0 || dHpCur <= 0) break;
      }

      // 判定結果
      let result: "challenger_win" | "defender_win" | "draw";
      if (cHpCur > dHpCur) result = "challenger_win";
      else if (dHpCur > cHpCur) result = "defender_win";
      else result = "draw";

      // 經驗獎勵（輸贏都有，勝者多）
      const baseExp = 15;
      const levelDiffBonus = Math.abs(challenger.level - defender.level) * 2;
      let expChallenger = baseExp + levelDiffBonus;
      let expDefender = baseExp + levelDiffBonus;
      if (result === "challenger_win") {
        expChallenger = Math.floor(expChallenger * 1.5);
      } else if (result === "defender_win") {
        expDefender = Math.floor(expDefender * 1.5);
      }

      // 金幣獎勵（僅勝者）
      const goldReward = result === "challenger_win"
        ? Math.floor(50 + defender.level * 10)
        : result === "defender_win"
          ? Math.floor(50 + challenger.level * 10)
          : 10;

      // 更新雙方經驗和金幣
      await db.update(gameAgents).set({
        exp: challenger.exp + expChallenger,
        gold: result === "challenger_win" ? challenger.gold + goldReward : challenger.gold,
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, challenger.id));
      await db.update(gameAgents).set({
        exp: defender.exp + expDefender,
        gold: result === "defender_win" ? defender.gold + goldReward : defender.gold,
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, defender.id));

      // 更新挑戰記錄
      await db.update(pvpChallenges).set({
        status: "completed",
        result,
        battleLog,
        goldReward,
        expRewardChallenger: expChallenger,
        expRewardDefender: expDefender,
      }).where(eq(pvpChallenges.id, input.challengeId));

      // 更新 PvP 戰績統計
      try {
        await updatePvpStats(challenger.id, defender.id, result);
      } catch (e) {
        console.error("[PvP] updatePvpStats error:", e);
      }

      // WS 通知雙方戰鬥結果
      const pvpResultPayload = {
        challengeId: input.challengeId,
        challengerName: challenger.agentName ?? "旅人",
        defenderName: defender.agentName ?? "旅人",
        result,
        battleLog,
        goldReward,
        expChallenger,
        expDefender,
      };
      try {
        sendToAgent(challenger.id, { type: "pvp_challenge_response" as const, payload: { ...pvpResultPayload, accepted: true } });
        sendToAgent(defender.id, { type: "pvp_result" as const, payload: pvpResultPayload });
      } catch { /* 忽略 */ }

      // live_feed 廣播
      const winnerName = result === "challenger_win" ? challenger.agentName : result === "defender_win" ? defender.agentName : null;
      if (winnerName) {
        try {
          broadcastPvpWin({
            agentId: result === "challenger_win" ? challenger.id : defender.id,
            agentName: winnerName ?? "旅人",
            agentElement: (result === "challenger_win" ? challenger.dominantElement : defender.dominantElement) ?? "wood",
            agentLevel: result === "challenger_win" ? challenger.level : defender.level,
            defenderName: result === "challenger_win" ? (defender.agentName ?? "旅人") : (challenger.agentName ?? "旅人"),
          });
        } catch { }
      }

      return {
        accepted: true,
        result,
        battleLog,
        goldReward,
        expChallenger,
        expDefender,
        challengerName: challenger.agentName ?? "旅人",
        defenderName: defender.agentName ?? "旅人",
      };
    }),

  /** 查詢與某玩家的 PVP 冷卻狀態 */
  getPvpCooldown: protectedProcedure
    .input(z.object({ targetAgentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { onCooldown: false, remainingMs: 0 };

      const agentRows = await db.select({ id: gameAgents.id })
        .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agentRows[0]) return { onCooldown: false, remainingMs: 0 };
      const myId = agentRows[0].id;

      const ONE_HOUR = 60 * 60 * 1000;
      const cutoff = Date.now() - ONE_HOUR;
      const recent = await db.select({ createdAt: pvpChallenges.createdAt }).from(pvpChallenges)
        .where(and(
          gt(pvpChallenges.createdAt, cutoff),
          sql`(
            (${pvpChallenges.challengerAgentId} = ${myId} AND ${pvpChallenges.defenderAgentId} = ${input.targetAgentId})
            OR
            (${pvpChallenges.challengerAgentId} = ${input.targetAgentId} AND ${pvpChallenges.defenderAgentId} = ${myId})
          )`,
          sql`${pvpChallenges.status} IN ('completed', 'accepted', 'pending')`
        ))
        .orderBy(desc(pvpChallenges.createdAt))
        .limit(1);

      if (recent.length > 0) {
        const remainingMs = Math.max(0, (recent[0].createdAt + ONE_HOUR) - Date.now());
        return { onCooldown: true, remainingMs };
      }
      return { onCooldown: false, remainingMs: 0 };
    }),

  /** 查詢當前是否有待處理的 PVP 挑戰 */
  getPendingPvpChallenge: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const agentRows = await db.select({ id: gameAgents.id })
      .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agentRows[0]) return null;
    const myId = agentRows[0].id;

    const pending = await db.select().from(pvpChallenges)
      .where(and(
        eq(pvpChallenges.status, "pending"),
        eq(pvpChallenges.defenderAgentId, myId),
        gt(pvpChallenges.createdAt, Date.now() - 10000) // 只查 10 秒內的
      ))
      .orderBy(desc(pvpChallenges.createdAt))
      .limit(1);

    if (!pending[0]) return null;
    return {
      challengeId: pending[0].id,
      challengerAgentId: pending[0].challengerAgentId,
      challengerName: pending[0].challengerName,
      createdAt: pending[0].createdAt,
    };
  }),

  /** 舊版相容：直接 PVP（對 NPC 或舊流程） */
  challengePvp: protectedProcedure
    .input(z.object({ defenderAgentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const challengerRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const challenger = challengerRows[0];
      if (!challenger) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      if (!challenger.isNamed) throw new TRPCError({ code: "BAD_REQUEST", message: "請先命名角色" });

      const defenderRows = await db.select().from(gameAgents)
        .where(eq(gameAgents.id, input.defenderAgentId)).limit(1);
      const defender = defenderRows[0];
      if (!defender) throw new TRPCError({ code: "NOT_FOUND", message: "對手角色不存在" });
      if (challenger.id === defender.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能挑戰自己" });

      const cAtk = challenger.attack + Math.floor(challenger.level * 2);
      const cDef = challenger.defense;
      const cHp = challenger.maxHp;
      const cSpd = challenger.speed;
      const dAtk = defender.attack + Math.floor(defender.level * 2);
      const dDef = defender.defense;
      const dHp = defender.maxHp;
      const dSpd = defender.speed;

      let cHpCur = cHp, dHpCur = dHp;
      const battleLog: string[] = [];
      for (let round = 1; round <= 5; round++) {
        const cDmg = Math.max(1, cAtk - Math.floor(dDef * 0.5) + Math.floor(Math.random() * 5));
        dHpCur -= cDmg;
        battleLog.push(`第${round}回合：${challenger.agentName ?? "旅人"} 攻擊 ${cDmg} 點`);
        if (dHpCur <= 0) { battleLog.push(`${defender.agentName ?? "旅人"} 戰敗！`); break; }
        if (dSpd >= cSpd) {
          const dDmg = Math.max(1, dAtk - Math.floor(cDef * 0.5) + Math.floor(Math.random() * 5));
          cHpCur -= dDmg;
          battleLog.push(`${defender.agentName ?? "旅人"} 反擊 ${dDmg} 點`);
          if (cHpCur <= 0) { battleLog.push(`${challenger.agentName ?? "旅人"} 戰敗！`); break; }
        }
      }

      let result: "challenger_win" | "defender_win" | "draw";
      if (cHpCur > dHpCur) result = "challenger_win";
      else if (dHpCur > cHpCur) result = "defender_win";
      else result = "draw";

      const baseExp = 15;
      const expChallenger = result === "challenger_win" ? Math.floor(baseExp * 1.5) : baseExp;
      const expDefender = result === "defender_win" ? Math.floor(baseExp * 1.5) : baseExp;
      const goldReward = result === "challenger_win" ? Math.floor(50 + defender.level * 10) : 10;

      if (result === "challenger_win") {
        await db.update(gameAgents)
          .set({ gold: challenger.gold + goldReward, exp: challenger.exp + expChallenger, updatedAt: Date.now() })
          .where(eq(gameAgents.id, challenger.id));
      }
      await db.update(gameAgents).set({
        exp: defender.exp + expDefender, updatedAt: Date.now(),
      }).where(eq(gameAgents.id, defender.id));

      await db.insert(pvpChallenges).values({
        challengerAgentId: challenger.id,
        challengerName: challenger.agentName ?? "旅人",
        defenderAgentId: defender.id,
        defenderName: defender.agentName ?? "旅人",
        status: "completed",
        result,
        battleLog,
        goldReward,
        expRewardChallenger: expChallenger,
        expRewardDefender: expDefender,
        createdAt: Date.now(),
      });

      try { await updatePvpStats(challenger.id, defender.id, result); } catch (e) { console.error("[PvP] updatePvpStats error:", e); }

      try {
        const pvpMsg = { type: "pvp_result" as const, payload: { challengerName: challenger.agentName ?? "旅人", defenderName: defender.agentName ?? "旅人", result } };
        sendToAgent(challenger.id, pvpMsg);
        sendToAgent(defender.id, pvpMsg);
      } catch { }
      if (result === "challenger_win") {
        try {
          broadcastPvpWin({ agentId: challenger.id, agentName: challenger.agentName ?? "旅人", agentElement: challenger.dominantElement ?? "wood", agentLevel: challenger.level, defenderName: defender.agentName ?? "旅人" });
        } catch { }
      }

      return { result, battleLog, goldReward, expChallenger, expDefender, challengerName: challenger.agentName ?? "旅人", defenderName: defender.agentName ?? "旅人" };
    }),

  // ─── 取得 PvP 戰鬥歷史 ───
  getPvpHistory: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const agentRows = await db.select({ id: gameAgents.id })
      .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agentRows[0]) return [];
    const agentId = agentRows[0].id;

    const history = await db.select().from(pvpChallenges)
      .where(sql`${pvpChallenges.challengerAgentId} = ${agentId} OR ${pvpChallenges.defenderAgentId} = ${agentId}`)
      .orderBy(desc(pvpChallenges.createdAt))
      .limit(20);

    return history;
  }),

  // ─── 手動觸發 Tick（前端「啟動探索」按鈕觸發） ───
  // 只處理當前登入玩家的角色行動，不影響其他玩家
  triggerTick: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // 取得當前登入玩家的完整角色資料
    const agentRows = await db.select()
      .from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id)))
      .limit(1);
    if (!agentRows[0]) return { processed: 0, events: 0, levelUps: [], legendaryDrops: [], lastCombat: undefined };

    const agent = agentRows[0];

    // 從 game_config 讀取 stamina_per_tick（動態設定）
    const cfgTickRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
      .from(gameConfig)
      .where(and(
        eq(gameConfig.isActive, 1),
        sql`${gameConfig.configKey} IN ('stamina_per_tick','stamina_regen_minutes','stamina_regen_amount')`
      ));
    const cfgTickMap: Record<string, number> = {};
    for (const row of cfgTickRows) {
      cfgTickMap[row.configKey] = parseFloat(row.configValue) || 0;
    }
    const staminaPerTick = cfgTickMap['stamina_per_tick'] ?? 5;
    const regenMinutesTick = cfgTickMap['stamina_regen_minutes'] ?? 30;
    const regenAmountTick  = cfgTickMap['stamina_regen_amount']  ?? 30;

    // 體力再生計算（使用動態參數）
    const newStamina = regenStamina(agent, regenMinutesTick, regenAmountTick);
    if (newStamina !== agent.stamina) {
      await db.update(gameAgents).set({
        stamina: newStamina,
        staminaLastRegen: Date.now(),
      }).where(eq(gameAgents.id, agent.id));
    }

    // 體力不足時不再跳過，讓 processAgentTick 自動切換為注靈模式
    // （持續行動邏輯：體力歸零 → 自動注靈 → 體力回復 → 自動切回原策略）

    // 取得世界狀態（當日五行元素）
    const worlds = await db.select().from(gameWorld).limit(1);
    const world = worlds[0];
    const worldData = (world?.worldData as Record<string, unknown>) ?? {};
    const currentTick = ((worldData.currentTick as number) ?? 0);
    const dailyElement = (worldData.dailyElement as import("../../shared/types").WuXing) ?? "wood";

    // 執行當前玩家的角色行動（傳入動態 stamina_per_tick）
    const agentResult = await processAgentTick({ ...agent, stamina: newStamina }, currentTick, dailyElement, staminaPerTick);

    return {
      processed: 1,
      events: agentResult.events,
      levelUps: agentResult.levelUps,
      legendaryDrops: agentResult.legendaryDrops,
      lastCombat: agentResult.lastCombat,
    };
  }),

  // ─── 玩家頭像上傳（地圖標記顯示） ───
  uploadAgentAvatar: protectedProcedure
    .input(z.object({
      /** Base64 編碼的圖片資料（前端先壓縮到 200x200 JPEG） */
      imageBase64: z.string(),
      /** MIME 類型（image/jpeg 或 image/png） */
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const agents = await db.select({ id: gameAgents.id })
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);
      if (!agents[0]) throw new Error("角色不存在");

      // 解碼 Base64
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // 限制大小：最大 500KB
      if (buffer.length > 500 * 1024) {
        throw new Error("圖片檔案過大，請壓縮後再上傳");
      }

      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const fileKey = `agent-avatars/${agents[0].id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      // 更新資料庫
      await db.update(gameAgents)
        .set({ avatarUrl: url, updatedAt: Date.now() })
        .where(eq(gameAgents.id, agents[0].id));

      return { url };
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
    const items = await db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agentId, agents[0].id));
    // 道具名稱映射表（對應 tickEngine 實際產生的道具 ID）
    // 使用 shared/itemNames 的共用道具名稱表（支援新舊格式）
    const { getItemInfo: getSharedItemInfo } = await import("../../shared/itemNames");
    /* 舊版獨立 ITEM_NAMES 已廢棄，改用 shared/itemNames 統一管理 */
    const ITEM_NAMES_LEGACY: Record<string, { name: string; rarity: string; emoji: string }> = {
      // 木系草藥
      "herb-001":        { name: "青草藥",     rarity: "common",   emoji: "🌿" },
      "herb-002":        { name: "靈芝草",     rarity: "uncommon", emoji: "🍄" },
      "herb-fire-001":   { name: "火焰草",     rarity: "uncommon", emoji: "🌺" },
      "herb-water-001":  { name: "水靈草",     rarity: "uncommon", emoji: "💧" },
      // 木系材料
      "mat-wood-001":    { name: "堅木材",     rarity: "common",   emoji: "🪵" },
      "mat-wood-002":    { name: "靈木精華",   rarity: "uncommon", emoji: "🌳" },
      // 火系材料
      "mat-fire-001":    { name: "火焰石",     rarity: "common",   emoji: "🔥" },
      "mat-fire-002":    { name: "熔岩碎片",   rarity: "uncommon", emoji: "🌋" },
      // 土系材料
      "mat-earth-001":   { name: "土元素晶",   rarity: "common",   emoji: "🪨" },
      "mat-earth-002":   { name: "大地精華",   rarity: "uncommon", emoji: "⛰️" },
      "food-earth-001":  { name: "山藥",       rarity: "common",   emoji: "🥔" },
      // 金系材料
      "mat-metal-001":   { name: "鐵礦石",     rarity: "common",   emoji: "⚙️" },
      "mat-metal-002":   { name: "銀礦石",     rarity: "uncommon", emoji: "🥈" },
      "mat-metal-003":   { name: "金礦石",     rarity: "rare",     emoji: "🥇" },
      // 水系材料
      "mat-water-001":   { name: "水晶碎片",   rarity: "common",   emoji: "💎" },
      "mat-water-002":   { name: "深海珍珠",   rarity: "rare",     emoji: "🔮" },
      // 怪物掉落
      "material-bone":   { name: "怪物骨骼",   rarity: "common",   emoji: "🦴" },
      "material-scale":  { name: "怪物鱗片",   rarity: "uncommon", emoji: "🐉" },
      "material-crystal":{ name: "元素水晶",   rarity: "rare",     emoji: "💠" },
      "material-core":   { name: "怪物核心",   rarity: "epic",     emoji: "⭐" },
      "consumable-potion":{ name: "小回血藥",  rarity: "common",   emoji: "🧪" },
      "consumable-elixir":{ name: "元氣丹",    rarity: "uncommon", emoji: "💊" },
      // 食物類（怪物掉落）
      "food-001":          { name: "野豬肉",     rarity: "common",   emoji: "🥩" },
      "food-002":          { name: "靈果",       rarity: "uncommon", emoji: "🍎" },
      "food-003":          { name: "仙桃",       rarity: "rare",     emoji: "🍑" },
      // 草藥類（補充）
      "herb-earth-001":    { name: "土靈草",     rarity: "uncommon", emoji: "🌱" },
      "herb-metal-001":    { name: "金靈草",     rarity: "uncommon", emoji: "🌾" },
      "herb-wood-001":     { name: "木靈草",     rarity: "common",   emoji: "🌿" },
      // 木系材料（進階）
      "mat-wood-003":      { name: "古木精華",   rarity: "uncommon", emoji: "🌲" },
      "mat-wood-004":      { name: "神木碎片",   rarity: "rare",     emoji: "🪵" },
      "mat-wood-005":      { name: "木靈結晶",   rarity: "rare",     emoji: "💚" },
      "mat-wood-006":      { name: "千年木髓",   rarity: "epic",     emoji: "🌳" },
      "mat-wood-007":      { name: "木元素核",   rarity: "epic",     emoji: "🌿" },
      "mat-wood-008":      { name: "靈木精粹",   rarity: "legendary",emoji: "✨" },
      "mat-wood-009":      { name: "木命神晶",   rarity: "legendary",emoji: "💎" },
      "mat-wood-010":      { name: "太古木靈",   rarity: "legendary",emoji: "🌟" },
      // 火系材料（進階）
      "mat-fire-003":      { name: "烈焰碎片",   rarity: "uncommon", emoji: "🔥" },
      "mat-fire-004":      { name: "火靈結晶",   rarity: "rare",     emoji: "❤️‍🔥" },
      "mat-fire-005":      { name: "鳳凰羽毛",   rarity: "rare",     emoji: "🪶" },
      "mat-fire-006":      { name: "熔岩精華",   rarity: "epic",     emoji: "🌋" },
      "mat-fire-007":      { name: "火元素核",   rarity: "epic",     emoji: "🔴" },
      "mat-fire-008":      { name: "炎靈精粹",   rarity: "legendary",emoji: "✨" },
      "mat-fire-009":      { name: "火命神晶",   rarity: "legendary",emoji: "💎" },
      "mat-fire-010":      { name: "太古火靈",   rarity: "legendary",emoji: "🌟" },
      // 土系材料（進階）
      "mat-earth-003":     { name: "黃土精華",   rarity: "uncommon", emoji: "🪨" },
      "mat-earth-004":     { name: "土靈結晶",   rarity: "rare",     emoji: "🟤" },
      "mat-earth-005":     { name: "山嶽碎片",   rarity: "rare",     emoji: "⛰️" },
      "mat-earth-006":     { name: "大地精粹",   rarity: "epic",     emoji: "🌍" },
      "mat-earth-007":     { name: "土元素核",   rarity: "epic",     emoji: "🟫" },
      "mat-earth-008":     { name: "岩靈精粹",   rarity: "legendary",emoji: "✨" },
      "mat-earth-009":     { name: "土命神晶",   rarity: "legendary",emoji: "💎" },
      "mat-earth-010":     { name: "太古土靈",   rarity: "legendary",emoji: "🌟" },
      // 金系材料（進階）
      "mat-metal-004":     { name: "精鋼碎片",   rarity: "uncommon", emoji: "⚙️" },
      "mat-metal-005":     { name: "金靈結晶",   rarity: "rare",     emoji: "🟡" },
      "mat-metal-006":     { name: "玄鐵精華",   rarity: "rare",     emoji: "⚔️" },
      "mat-metal-007":     { name: "金元素核",   rarity: "epic",     emoji: "🔱" },
      "mat-metal-008":     { name: "金靈精粹",   rarity: "epic",     emoji: "✨" },
      "mat-metal-009":     { name: "金命神晶",   rarity: "legendary",emoji: "💎" },
      "mat-metal-010":     { name: "太古金靈",   rarity: "legendary",emoji: "🌟" },
      "mat-metal-011":     { name: "混沌金核",   rarity: "legendary",emoji: "⭐" },
      // 水系材料（進階）
      "mat-water-003":     { name: "寒冰碎片",   rarity: "uncommon", emoji: "🧊" },
      "mat-water-004":     { name: "水靈結晶",   rarity: "rare",     emoji: "💙" },
      "mat-water-005":     { name: "龍宮珍珠",   rarity: "rare",     emoji: "🔮" },
      "mat-water-006":     { name: "深海精華",   rarity: "epic",     emoji: "🌊" },
      "mat-water-007":     { name: "水元素核",   rarity: "epic",     emoji: "🔵" },
      "mat-water-008":     { name: "水靈精粹",   rarity: "legendary",emoji: "✨" },
      "mat-water-009":     { name: "水命神晶",   rarity: "legendary",emoji: "💎" },
      "mat-water-010":     { name: "太古水靈",   rarity: "legendary",emoji: "🌟" },
      // 裝備類（怪物掉落）
      "equip-wood-001":    { name: "木靈護符",   rarity: "common",   emoji: "🟢" },
      "equip-wood-002":    { name: "翠玉戒指",   rarity: "uncommon", emoji: "💚" },
      "equip-wood-003":    { name: "木靈劍",     rarity: "rare",     emoji: "🗡️" },
      "equip-wood-004":    { name: "靈木鎧甲",   rarity: "epic",     emoji: "🛡️" },
      "equip-wood-005":    { name: "木命神器",   rarity: "legendary",emoji: "⚔️" },
      "equip-fire-001":    { name: "火靈護符",   rarity: "common",   emoji: "🔴" },
      "equip-fire-002":    { name: "紅玉戒指",   rarity: "uncommon", emoji: "❤️" },
      "equip-fire-003":    { name: "火靈劍",     rarity: "rare",     emoji: "🗡️" },
      "equip-fire-004":    { name: "炎鐵鎧甲",   rarity: "epic",     emoji: "🛡️" },
      "equip-fire-005":    { name: "火命神器",   rarity: "legendary",emoji: "⚔️" },
      "equip-earth-001":   { name: "土靈護符",   rarity: "common",   emoji: "🟤" },
      "equip-earth-002":   { name: "黃玉戒指",   rarity: "uncommon", emoji: "🟡" },
      "equip-earth-003":   { name: "土靈劍",     rarity: "rare",     emoji: "🗡️" },
      "equip-earth-004":   { name: "山嶽鎧甲",   rarity: "epic",     emoji: "🛡️" },
      "equip-earth-005":   { name: "土命神器",   rarity: "legendary",emoji: "⚔️" },
      "equip-metal-001":   { name: "金靈護符",   rarity: "common",   emoji: "⚙️" },
      "equip-metal-002":   { name: "白玉戒指",   rarity: "uncommon", emoji: "🥈" },
      "equip-metal-003":   { name: "金靈劍",     rarity: "rare",     emoji: "🗡️" },
      "equip-metal-004":   { name: "玄鐵鎧甲",   rarity: "epic",     emoji: "🛡️" },
      "equip-metal-005":   { name: "金命神器",   rarity: "legendary",emoji: "⚔️" },
      "equip-water-001":   { name: "水靈護符",   rarity: "common",   emoji: "💙" },
      "equip-water-002":   { name: "藍玉戒指",   rarity: "uncommon", emoji: "🔵" },
      "equip-water-003":   { name: "水靈劍",     rarity: "rare",     emoji: "🗡️" },
      "equip-water-004":   { name: "深海鎧甲",   rarity: "epic",     emoji: "🛡️" },
      "equip-water-005":   { name: "水命神器",   rarity: "legendary",emoji: "⚔️" },
      // 技能書類（怪物掉落）
      "skill-wood-001":    { name: "木靈術·初",  rarity: "uncommon", emoji: "📗" },
      "skill-wood-002":    { name: "木靈術·進",  rarity: "rare",     emoji: "📗" },
      "skill-fire-001":    { name: "火靈術·初",  rarity: "uncommon", emoji: "📕" },
      "skill-fire-002":    { name: "火靈術·進",  rarity: "rare",     emoji: "📕" },
      "skill-earth-001":   { name: "土靈術·初",  rarity: "uncommon", emoji: "📒" },
      "skill-earth-002":   { name: "土靈術·進",  rarity: "rare",     emoji: "📒" },
      "skill-metal-001":   { name: "金靈術·初",  rarity: "uncommon", emoji: "📙" },
      "skill-metal-002":   { name: "金靈術·進",  rarity: "rare",     emoji: "📙" },
      "skill-water-001":   { name: "水靈術·初",  rarity: "uncommon", emoji: "📘" },
      "skill-water-002":   { name: "水靈術·進",  rarity: "rare",     emoji: "📘" },
    };
    return items.map(item => {
      // 優先查 shared/itemNames（含新格式 I_W001 等），再 fallback 到舊版 ITEM_NAMES_LEGACY
      const sharedInfo = getSharedItemInfo(item.itemId);
      const isKnown = sharedInfo.name !== item.itemId; // getItemInfo fallback 會返回 itemId 本身
      if (isKnown) {
        return { ...item, itemName: sharedInfo.name, rarity: sharedInfo.rarity, emoji: sharedInfo.emoji };
      }
      // fallback 到舊版本地映射
      const legacy = ITEM_NAMES_LEGACY[item.itemId];
      return {
        ...item,
        itemName: legacy?.name ?? item.itemId,
        rarity: legacy?.rarity ?? "common",
        emoji: legacy?.emoji ?? "📦",
      };
    });
  }),

  // ─── 取得節點詳細資訊（怪物/資源/在場冒險者） ───
  getNodeInfo: publicProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input }) => {
      // 嘗試直接查找，若找不到則嘗試常見格式轉換（舊格式 taipei-* → tp-*）
      let node = MAP_NODE_MAP.get(input.nodeId);
      if (!node) {
        // 嘗試舊格式轉換：taipei-xxx → tp-xxx
        const converted = input.nodeId.replace(/^taipei-/, "tp-");
        node = MAP_NODE_MAP.get(converted);
      }
      // 仍找不到則使用預設節點（台北中正區）
      if (!node) {
        node = MAP_NODE_MAP.get("tp-zhongzheng") ?? MAP_NODES[0];
      }
      // 優先從資料庫圖鑑讀取怪物，fallback 到靜態資料
      const WUXING_MAP: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
      const nodeWuxing = WUXING_MAP[node.element] ?? "金";
      const [minLv, maxLv] = node.monsterLevel;
      let nodeMonsters: Array<{ id: string; name: string; element: string; level: number; hp: number; attack: number; defense: number; speed: number; expReward: number; goldReward: [number, number]; description?: string; rarity?: string; isBoss: boolean; skills?: string[] }> = [];
      const dbInstance = await getDb();
      if (dbInstance) {
        const catalogMonsters = await dbInstance.select().from(gameMonsterCatalog)
          .where(eq(gameMonsterCatalog.wuxing, nodeWuxing))
          .limit(20);
        // 按等級範圍篩選（levelRange 格式如 "1-5"）
        const filtered = catalogMonsters.filter(m => {
          const [lo, hi] = (m.levelRange ?? "1-5").split("-").map(Number);
          return lo <= maxLv && hi >= minLv;
        }).slice(0, 5);
        if (filtered.length > 0) {
          nodeMonsters = filtered.map(m => {
            const [lo, hi] = (m.levelRange ?? "1-5").split("-").map(Number);
            const midLv = Math.round((lo + hi) / 2);
            // 從圖鑑讀取掉落物（最多 5 個）
            const dropItems: Array<{ itemId: string; chance: number }> = [];
            if (m.dropItem1) dropItems.push({ itemId: m.dropItem1, chance: (m.dropRate1 ?? 10) / 100 });
            if (m.dropItem2) dropItems.push({ itemId: m.dropItem2, chance: (m.dropRate2 ?? 10) / 100 });
            if (m.dropItem3) dropItems.push({ itemId: m.dropItem3, chance: (m.dropRate3 ?? 5) / 100 });
            if (m.dropItem4) dropItems.push({ itemId: m.dropItem4, chance: (m.dropRate4 ?? 3) / 100 });
            if (m.dropItem5) dropItems.push({ itemId: m.dropItem5, chance: (m.dropRate5 ?? 1) / 100 });
            // 從圖鑑讀取技能名稱
            const skills: string[] = [];
            if (m.skillId1) skills.push(m.skillId1);
            if (m.skillId2) skills.push(m.skillId2);
            if (m.skillId3) skills.push(m.skillId3);
            return {
              id: m.monsterId,
              name: m.name,
              element: node.element,
              level: midLv,
              hp: m.baseHp,
              attack: m.baseAttack,
              defense: m.baseDefense,
              speed: m.baseSpeed,
              expReward: Math.round(midLv * 8),
              goldReward: [midLv * 2, midLv * 5] as [number, number],
              dropItems,
              description: m.description ?? undefined,
              rarity: m.rarity,
              isBoss: m.rarity === "boss" || m.rarity === "legendary",
              skills,
              race: (m.race as any) ?? undefined,
            };
          });
        }
      }
      // Fallback 到靜態資料
      if (nodeMonsters.length === 0) {
        nodeMonsters = MONSTERS.filter(
          (m) => m.element === node.element &&
            m.level >= node.monsterLevel[0] &&
            m.level <= node.monsterLevel[1]
        ).slice(0, 5);
      }
      // 地形特定資源（讓不同地形有不同稀有資源）
      const TERRAIN_RESOURCES: Record<string, Array<{ name: string; rarity: string; icon: string }>> = {
        "都市廣場": [{ name: "市井靈氣", rarity: "精良", icon: "🏛️" }, { name: "人氣精華", rarity: "普通", icon: "🌺" }],
        "都市商業區": [{ name: "商氣靈石", rarity: "精良", icon: "💰" }, { name: "財靈結晶", rarity: "稀有", icon: "💎" }],
        "山區": [{ name: "靈山露水", rarity: "精良", icon: "💧" }, { name: "山靈芬芳", rarity: "稀有", icon: "🌻" }],
        "海岸": [{ name: "海靈沙粒", rarity: "普通", icon: "🟡" }, { name: "海晶精體", rarity: "稀有", icon: "🔮" }],
        "古蹟": [{ name: "古靈碎片", rarity: "精良", icon: "🏺" }, { name: "封印結晶", rarity: "稀有", icon: "🔮" }],
        "溫泉": [{ name: "溫泉靈氣", rarity: "精良", icon: "♨️" }, { name: "溫泉水晶", rarity: "稀有", icon: "💧" }],
        "港口": [{ name: "海靈魚鱗", rarity: "普通", icon: "🐟" }, { name: "港口靈石", rarity: "精良", icon: "⚓" }],
        "國家公園": [{ name: "靈林葉片", rarity: "精良", icon: "🍃" }, { name: "原始靈核", rarity: "稀有", icon: "🌏" }],
        "科學園區": [{ name: "技術靈氣", rarity: "精良", icon: "🔬" }, { name: "靈數結晶", rarity: "稀有", icon: "💻" }],
        "離峳": [{ name: "靈峳露水", rarity: "精良", icon: "🏖️" }, { name: "靈峳結晶", rarity: "稀有", icon: "🐚" }],
      };
      const RESOURCES_BY_ELEMENT: Record<string, Array<{ name: string; rarity: string; icon: string }>> = {
        wood: [
          { name: "靈草", rarity: "普通", icon: "🌿" },
          { name: "竹節精體", rarity: "稀有", icon: "🎋" },
          { name: "古木碎片", rarity: "精良", icon: "🪵" },
        ],
        fire: [
          { name: "火靈石", rarity: "普通", icon: "🔥" },
          { name: "燔岩晶", rarity: "稀有", icon: "🌋" },
          { name: "赤焰羽", rarity: "精良", icon: "🪶" },
        ],
        earth: [
          { name: "黃土精", rarity: "普通", icon: "🪨" },
          { name: "大地靈核", rarity: "稀有", icon: "💎" },
          { name: "山嶽碎晶", rarity: "精良", icon: "⛰️" },
        ],
        metal: [
          { name: "金屬碎片", rarity: "普通", icon: "⚡" },
          { name: "精龋礦石", rarity: "稀有", icon: "🔩" },
          { name: "白金結晶", rarity: "精良", icon: "✨" },
        ],
        water: [
          { name: "水靈珠", rarity: "普通", icon: "💧" },
          { name: "深海晶石", rarity: "稀有", icon: "🔮" },
          { name: "冰靈核", rarity: "精良", icon: "❄️" },
        ],
      };
      // 合併基礎資源 + 地形特定資源
      const baseResources = RESOURCES_BY_ELEMENT[node.element] ?? [];
      const terrainResources = TERRAIN_RESOURCES[node.terrain] ?? [];
      const resources = [...baseResources.slice(0, 3), ...terrainResources.slice(0, 2)];
      // 更豐富的隱藏任務提示
      const questHints = [
        ...(node.dangerLevel >= 3 ? ["⚠️ 此地有隱藏任務的氣息…"] : []),
        ...(node.dangerLevel >= 4 ? ["🔮 感應到強力寶物的存在"] : []),
        ...(node.dangerLevel >= 5 ? ["👑 傳說級 Boss 可能出氒"] : []),
        ...(node.terrain.includes("古") || node.terrain.includes("遗") ? ["📜 此地藏有古老秘密"] : []),
        ...(node.terrain.includes("溫泉") ? ["♨️ 溫泉靈氣能快速回復活躍"] : []),
        ...(node.terrain.includes("港口") || node.terrain.includes("海岸") ? ["⚓ 港口商人有特殊委托"] : []),
        ...(node.terrain.includes("科學") ? ["🔬 科學園區有神秘實驗任務"] : []),
        ...(node.terrain.includes("離峳") ? ["🏖️ 靈峳上有遠古靈居的躕跡"] : []),
      ];
      const db = await getDb();
      let adventurers: Array<{ name: string; level: number; hp: number; maxHp: number; element: string; status: string }> = [];
      if (db) {
        const agents = await db
          .select({
            agentName: gameAgents.agentName,
            level: gameAgents.level,
            hp: gameAgents.hp,
            maxHp: gameAgents.maxHp,
            dominantElement: gameAgents.dominantElement,
            status: gameAgents.status,
          })
          .from(gameAgents)
          .where(eq(gameAgents.currentNodeId, input.nodeId))
          .limit(8);
        adventurers = agents.map((a) => ({
          name: a.agentName ?? "旅人",
          level: a.level,
          hp: a.hp,
          maxHp: a.maxHp,
          element: a.dominantElement,
          status: a.status,
        }));
      }
      return { node, monsters: nodeMonsters, resources, questHints, adventurers };
    }),
  // ─── 取得全服在線統計 ───
  getOnlineStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { onlineCount: 0, totalAdventurers: 0 };
    const allAgents = await db.select({ id: gameAgents.id, isActive: gameAgents.isActive, updatedAt: gameAgents.updatedAt }).from(gameAgents);
    const totalAdventurers = allAgents.length;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const onlineCount = allAgents.filter((a) => a.isActive && (a.updatedAt ?? 0) > fiveMinAgo).length;
    return { onlineCount, totalAdventurers };
  }),

  // ─── 地圖傳送：設定目標節點（消耗 1 靈力值） ───
  setTeleport: protectedProcedure
    .input(z.object({ targetNodeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const targetNode = MAP_NODE_MAP.get(input.targetNodeId);
      if (!targetNode) throw new Error("目標節點不存在");

      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const agent = agents[0];
      if (!agent) throw new Error("角色不存在");
      if (agent.status === "dead") throw new Error("旅人已倒下，無法移動");
      if (agent.currentNodeId === input.targetNodeId) throw new Error("已在目標節點");

      // 從 game_config 讀取移動體力消耗（動態設定）
      const moveCfgRows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
        .from(gameConfig)
        .where(and(eq(gameConfig.isActive, 1), eq(gameConfig.configKey, 'move_stamina_cost')));
      const moveStaminaCost = moveCfgRows[0] ? (parseFloat(moveCfgRows[0].configValue) || 2) : 2;

      if (agent.stamina < moveStaminaCost) throw new Error(`體力不足（移動需要 ${moveStaminaCost} 點體力）`);

      const now = Date.now();
      await db.update(gameAgents).set({
        targetNodeId: input.targetNodeId,
        status: "moving",
        stamina: Math.max(0, agent.stamina - moveStaminaCost),
        updatedAt: now,
      }).where(eq(gameAgents.id, agent.id));

      await db.insert(agentEvents).values({
        agentId: agent.id,
        eventType: "move",
        message: `🗺️ ${agent.agentName ?? "旅人"} 啟程前往 ${targetNode.name}！（消耗 ${moveStaminaCost} 點體力）`,
        detail: { type: "teleport", targetNodeId: input.targetNodeId, targetNodeName: targetNode.name },
        nodeId: agent.currentNodeId,
        createdAt: now,
      });

      return { success: true, targetNode, moveStaminaCost };
    }),

  // ─── 取得當前節點的隱藏事件（依洞察力機率感知） ───
  getHiddenEvents: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const agents = await db.select().from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    const agent = agents[0];
    if (!agent) return [];

    const now = Date.now();
    // 查詢當前節點的有效隱藏事件
    const events = await db.select().from(gameHiddenEvents)
      .where(eq(gameHiddenEvents.nodeId, agent.currentNodeId));

    const validEvents = events.filter(e => e.expiresAt > now && e.remainingTicks > 0);

    // 依洞察力計算感知機率
    // 核心原則：所有人都有機會（最低 5%），高洞察力機率更高（最高 95%）
    // 公式：min(95, max(5, (perception / threshold) * 100))
    const perception = agent.treasureHunting ?? 20;
    const perceived: typeof validEvents = [];
    for (const evt of validEvents) {
      const chance = Math.min(95, Math.max(5, (perception / evt.perceptionThreshold) * 100));
      if (Math.random() * 100 < chance) {
        perceived.push(evt);
        // 標記已被發現
        if (!evt.isDiscovered) {
          await db.update(gameHiddenEvents).set({ isDiscovered: 1 })
            .where(eq(gameHiddenEvents.id, evt.id));
        }
      }
    }
    // 回傳感知結果 + 洞察力等級資訊
    const perceptionLevel = perception >= 80 ? "strong" : perception >= 50 ? "mid" : perception >= 30 ? "low" : "weak";
    const perceptionLabel = perception >= 80 ? "感知強烈" : perception >= 50 ? "偶有感知" : perception >= 30 ? "微弱感知" : "極弱感知";
    return { events: perceived, perceptionLevel, perceptionLabel, perception };
  }),

  // ─── 取得玩家稱號列表 ───
  getTitles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const agents = await db.select().from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agents[0]) return [];

    const agentId = agents[0].id;
    const myTitles = await db.select().from(agentTitles)
      .where(eq(agentTitles.agentId, agentId));

    // 取得稱號詳細資料
    const allTitles = await db.select().from(gameTitles);
    const titleMap = new Map(allTitles.map(t => [t.titleKey, t]));

    return myTitles.map(at => ({
      ...at,
      titleInfo: titleMap.get(at.titleKey) ?? null,
    }));
  }),

  // ─── 取得技能圖鑑（玩家可安裝的技能列表） ───
  getSkillCatalogForPlayer: protectedProcedure
    .input(z.object({ wuxing: z.string().optional(), category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(gameSkillCatalog).orderBy(gameSkillCatalog.skillId);
      let result = rows;
      if (input?.wuxing) result = result.filter(r => r.wuxing === input.wuxing);
      if (input?.category) result = result.filter(r => r.category === input.category);
      return result;
    }),

  // ─── 安裝技能到技能欄位 ───
  installSkill: protectedProcedure
    .input(z.object({
      skillId: z.string(),
      slot: z.enum(["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4", "passiveSlot1", "passiveSlot2", "hiddenSlot1"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];

      // 驗證玩家是否擁有該技能：檢查 agentSkills 表 + 初始技能列表 + 當前槽位
      const currentSlotSkills = [
        agent.skillSlot1, agent.skillSlot2, agent.skillSlot3, agent.skillSlot4,
        agent.passiveSlot1, agent.passiveSlot2,
      ].filter(Boolean);
      const isInSlot = currentSlotSkills.includes(input.skillId);
      // 檢查是否為任何屬性的初始技能
      const allInitialSkillIds = new Set(
        (["wood", "fire", "earth", "metal", "water"] as WuXing[]).flatMap(e => {
          const s = getInitialSkills(e); return [s.slot1, s.slot2, s.passive1];
        })
      );
      const isInitialSkill = allInitialSkillIds.has(input.skillId);

      if (!isInSlot && !isInitialSkill) {
        // 檢查 agent_skills 表
        const owned = await db.select().from(agentSkills)
          .where(and(eq(agentSkills.agentId, agent.id), eq(agentSkills.skillId, input.skillId)))
          .limit(1);
        if (!owned[0]) {
          throw new TRPCError({ code: "FORBIDDEN", message: "尚未習得此技能，請先使用技能書學習" });
        }
      }

      // BUG-1 FIX: 找出目前佔據目標槽位的舊技能，清除其 agentSkills.installedSlot
      const oldSkillId = (agent as any)[input.slot] as string | null;
      if (oldSkillId && oldSkillId !== input.skillId) {
        await db.update(agentSkills)
          .set({ installedSlot: null })
          .where(and(eq(agentSkills.agentId, agent.id), eq(agentSkills.skillId, oldSkillId)));
      }

      // BUG-1 FIX: 如果新技能之前安裝在其他槽位，先清除舊槽位
      const ALL_SKILL_SLOTS = ["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4", "passiveSlot1", "passiveSlot2", "hiddenSlot1"] as const;
      const updateFields: Record<string, any> = { [input.slot]: input.skillId, updatedAt: Date.now() };
      for (const slotKey of ALL_SKILL_SLOTS) {
        if (slotKey !== input.slot && (agent as any)[slotKey] === input.skillId) {
          updateFields[slotKey] = null; // 清除舊槽位
        }
      }

      // 更新 gameAgents 的槽位
      await db.update(gameAgents)
        .set(updateFields)
        .where(eq(gameAgents.id, agent.id));

      // 同步更新 agentSkills.installedSlot
      await db.update(agentSkills)
        .set({ installedSlot: input.slot })
        .where(and(eq(agentSkills.agentId, agent.id), eq(agentSkills.skillId, input.skillId)));

      return { success: true };
    }),

  // ─── 學習技能書 ───
  learnSkillFromBook: protectedProcedure
    .input(z.object({ inventoryId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      const [invItem] = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.id, input.inventoryId), eq(agentInventory.agentId, agent.id))).limit(1);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "道具不存在" });
      if (invItem.itemType !== "skill_book") throw new TRPCError({ code: "BAD_REQUEST", message: "此道具不是技能書" });
      // 技能書 itemId 對應的技能目錄 skillId
      const SKILL_BOOK_MAP: Record<string, string> = {
        "skill-wood-001": "S_W005",
        "skill-wood-002": "S_W012",
        "skill-fire-001": "S_F004",
        "skill-fire-002": "S_F006",
        "skill-earth-001": "S_E003",
        "skill-earth-002": "S_E005",
        "skill-metal-001": "S_M003",
        "skill-metal-002": "S_M004",
        "skill-water-001": "S_W057",
        "skill-water-002": "S_W060",
      };
      const skillId = SKILL_BOOK_MAP[invItem.itemId];
      if (!skillId) throw new TRPCError({ code: "BAD_REQUEST", message: "此技能書對應的技能不存在" });
      // 檢查是否已習得
      const already = await db.select().from(agentSkills)
        .where(and(eq(agentSkills.agentId, agent.id), eq(agentSkills.skillId, skillId))).limit(1);
      if (already[0]) throw new TRPCError({ code: "CONFLICT", message: "已習得此技能，無需重複學習" });
      // 查詢技能名稱
      const [skillCatalog] = await db.select().from(gameSkillCatalog)
        .where(eq(gameSkillCatalog.skillId, skillId)).limit(1);
      const skillName = skillCatalog?.name ?? skillId;
      // 寫入 agentSkills
      await db.insert(agentSkills).values({
        agentId: agent.id,
        skillId,
        awakeTier: 0,
        useCount: 0,
      });
      // 消耗技能書（數量 -1 或刪除）
      if (invItem.quantity > 1) {
        await db.update(agentInventory).set({ quantity: invItem.quantity - 1, updatedAt: Date.now() }).where(eq(agentInventory.id, invItem.id));
      } else {
        await db.delete(agentInventory).where(eq(agentInventory.id, invItem.id));
      }
      // 寫入事件日誌
      await db.insert(agentEvents).values({
        agentId: agent.id,
        eventType: "system",
        detail: { skillId, skillName },
        message: `習得了技能「${skillName}」！`,
        createdAt: Date.now(),
      });
      return { success: true, skillId, skillName };
    }),

  // ─── 查詢已學技能列表 ───
  getMyLearnedSkills: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) return [];
      const skills = await db.select().from(agentSkills)
        .where(eq(agentSkills.agentId, agents[0].id));
      return skills.map(s => ({
        id: s.id,
        skillId: s.skillId,
        awakeTier: s.awakeTier,
        useCount: s.useCount,
        installedSlot: s.installedSlot,
      }));
    }),

  // ─── 使用消耗道具 ───
  useItem: protectedProcedure
    .input(z.object({ inventoryId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      const [invItem] = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.id, input.inventoryId), eq(agentInventory.agentId, agent.id))).limit(1);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "道具不存在" });
      if (invItem.itemType !== "consumable") throw new TRPCError({ code: "BAD_REQUEST", message: "此道具無法使用" });
      // 查詢圖鑑效果
      const [catalog] = await db.select().from(gameItemCatalog)
        .where(eq(gameItemCatalog.itemId, invItem.itemId)).limit(1);
      const effect = catalog?.effect ?? "";
      let newHp = agent.hp;
      let newMp = agent.mp;
      let newStamina = agent.stamina;
      // 解析效果字串：hp+50% / hp+100 / mp+50 / stamina+50
      const hpPctM = effect.match(/hp\+(\d+)%/);
      const hpFlatM = effect.match(/hp\+(\d+)(?!%)/);
      const mpFlatM = effect.match(/mp\+(\d+)/);
      const staminaM = effect.match(/stamina\+(\d+)/);
      if (hpPctM) newHp = Math.min(agent.maxHp, agent.hp + Math.floor(agent.maxHp * parseInt(hpPctM[1]) / 100));
      else if (hpFlatM) newHp = Math.min(agent.maxHp, agent.hp + parseInt(hpFlatM[1]));
      if (mpFlatM) newMp = Math.min(agent.maxMp, agent.mp + parseInt(mpFlatM[1]));
      if (staminaM) newStamina = Math.min(100, agent.stamina + parseInt(staminaM[1]));
      // 預設效果（無圖鑑記錄）
      if (!catalog && invItem.itemId.includes("potion")) newHp = Math.min(agent.maxHp, agent.hp + 50);
      if (!catalog && invItem.itemId.includes("elixir")) { newHp = Math.min(agent.maxHp, agent.hp + 100); newMp = Math.min(agent.maxMp, agent.mp + 50); }
      await db.update(gameAgents).set({ hp: newHp, mp: newMp, stamina: newStamina, updatedAt: Date.now() }).where(eq(gameAgents.id, agent.id));
      if (invItem.quantity > 1) {
        await db.update(agentInventory).set({ quantity: invItem.quantity - 1, updatedAt: Date.now() }).where(eq(agentInventory.id, invItem.id));
      } else {
        await db.delete(agentInventory).where(eq(agentInventory.id, invItem.id));
      }
      await db.insert(agentEvents).values({
        agentId: agent.id, eventType: "system",
        detail: { itemId: invItem.itemId, itemName: catalog?.name ?? invItem.itemId },
        message: `使用了「${catalog?.name ?? invItem.itemId}」`,
        createdAt: Date.now(),
      });
      return { success: true, newHp, newMp, newStamina, itemName: catalog?.name ?? invItem.itemId };
    }),

  // ─── 取得裝備圖鑑 ───
  getEquipmentCatalog: protectedProcedure
    .input(z.object({ wuxing: z.string().optional(), slot: z.string().optional(), tier: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const agents = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const agent = agents[0];
      let rows = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.isActive, 1));
      if (input?.wuxing) rows = rows.filter(r => r.wuxing === input.wuxing);
      if (input?.slot) rows = rows.filter(r => r.slot === input.slot);
      if (input?.tier) rows = rows.filter(r => r.tier === input.tier);
      const equippedIds = agent ? [
        agent.equippedWeapon, agent.equippedOffhand, agent.equippedHead,
        agent.equippedBody, agent.equippedHands, agent.equippedFeet,
        agent.equippedRingA, agent.equippedRingB, agent.equippedNecklace, agent.equippedAmulet,
      ].filter(Boolean) : [];
      return rows.map(r => ({ ...r, isEquipped: equippedIds.includes(r.equipId) }));
    }),

  // ─── 裝備/卸下裝備 ───
  equipItem: protectedProcedure
    .input(z.object({ equipId: z.string(), action: z.enum(["equip", "unequip"]) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      const [equip] = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.equipId, input.equipId)).limit(1);
      if (!equip) throw new TRPCError({ code: "NOT_FOUND", message: "裝備不存在" });
      const SLOT_MAP: Record<string, string> = {
        weapon: "equippedWeapon", offhand: "equippedOffhand",
        helmet: "equippedHead", armor: "equippedBody",
        gloves: "equippedHands", shoes: "equippedFeet",
        ringA: "equippedRingA", ringB: "equippedRingB",
        necklace: "equippedNecklace", amulet: "equippedAmulet",
      };
      const dbField = SLOT_MAP[equip.slot] ?? "equippedWeapon";
      await db.update(gameAgents).set({ [dbField]: input.action === "equip" ? input.equipId : null, updatedAt: Date.now() }).where(eq(gameAgents.id, agent.id));
      // BUG-5 FIX: 同步更新 agentInventory 的 isEquipped 狀態
      const AGENT_FIELD_TO_INV_SLOT: Record<string, string> = {
        equippedWeapon: "weapon", equippedOffhand: "offhand",
        equippedHead: "helmet", equippedBody: "armor",
        equippedHands: "gloves", equippedFeet: "boots",
        equippedRingA: "ring1", equippedRingB: "ring2",
        equippedNecklace: "accessory1", equippedAmulet: "accessory2",
      };
      const invSlot = AGENT_FIELD_TO_INV_SLOT[dbField] ?? equip.slot;
      if (input.action === "equip") {
        // 先卸下同槽位的舊裝備
        await db.update(agentInventory).set({ isEquipped: 0, equippedSlot: null, updatedAt: Date.now() })
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.isEquipped, 1), eq(agentInventory.equippedSlot, invSlot)));
        // 標記新裝備
        await db.update(agentInventory).set({ isEquipped: 1, equippedSlot: invSlot, updatedAt: Date.now() })
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, input.equipId)));
      } else {
        // 卸下裝備
        await db.update(agentInventory).set({ isEquipped: 0, equippedSlot: null, updatedAt: Date.now() })
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, input.equipId)));
      }
      await db.insert(agentEvents).values({
        agentId: agent.id, eventType: "system",
        detail: { equipId: input.equipId, equipName: equip.name, action: input.action },
        message: input.action === "equip" ? `裝備了「${equip.name}」` : `卸下了「${equip.name}」`,
        createdAt: Date.now(),
      });
      return { success: true, equipName: equip.name, action: input.action };
    }),

  // ─── Widget 位置記憶 ───
  saveWidgetLayout: protectedProcedure
    .input(z.object({
      layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(gameAgents)
        .set({ widgetLayout: input.layout, updatedAt: Date.now() })
        .where(eq(gameAgents.userId, String(ctx.user.id)));
      return { success: true };
    }),
  getWidgetLayout: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select({ widgetLayout: gameAgents.widgetLayout })
        .from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id)))
        .limit(1);
      return agents[0]?.widgetLayout ?? null;
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

  // ─── 取得虛相世界商店商品（金幣區 + 靈石區） ───
  getGameShopItems: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 取得角色資料（金幣）
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      const agent = agents[0];
      // 取得用戶靈石
      const userRows = await db.select({ gameStones: users.gameStones })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const gameStones = userRows[0]?.gameStones ?? 0;
      // 取得金幣商店商品
      const coinItems = await db.select().from(gameVirtualShop)
        .where(eq(gameVirtualShop.isOnSale, 1))
        .orderBy(gameVirtualShop.sortOrder);
      // 取得靈石商店商品
      const stoneItems = await db.select().from(gameSpiritShop)
        .where(eq(gameSpiritShop.isOnSale, 1))
        .orderBy(gameSpiritShop.sortOrder);
      return {
        gold: agent?.gold ?? 0,
        gameStones,
        coinItems,
        stoneItems,
      };
    }),

  // ─── 購買虛相世界商店商品 ───
  buyGameShopItem: protectedProcedure
    .input(z.object({
      shopType: z.enum(["coin", "stone"]),
      itemId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];

      if (input.shopType === "coin") {
        // 金幣商店
        const [item] = await db.select().from(gameVirtualShop)
          .where(and(eq(gameVirtualShop.id, input.itemId), eq(gameVirtualShop.isOnSale, 1))).limit(1);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在" });
        if (agent.gold < item.priceCoins) throw new TRPCError({ code: "BAD_REQUEST", message: "金幣不足" });
        // 扣除金幣
        await db.update(gameAgents).set({ gold: agent.gold - item.priceCoins, updatedAt: Date.now() })
          .where(eq(gameAgents.id, agent.id));
        // 加入背包
        const existing = await db.select().from(agentInventory)
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, item.itemKey))).limit(1);
        if (existing[0]) {
          await db.update(agentInventory).set({ quantity: existing[0].quantity + item.quantity, updatedAt: Date.now() })
            .where(eq(agentInventory.id, existing[0].id));
        } else {
          await db.insert(agentInventory).values({ agentId: agent.id, itemId: item.itemKey, itemType: "consumable", quantity: item.quantity, acquiredAt: Date.now(), updatedAt: Date.now() });
        }
        await db.insert(agentEvents).values({
          agentId: agent.id, eventType: "system",
          message: `🛒 購買了「${item.displayName}」x${item.quantity}（花費 ${item.priceCoins} 金幣）`,
          detail: { type: "shop_buy", itemId: item.itemKey, qty: item.quantity, cost: item.priceCoins, currency: "gold" },
          createdAt: Date.now(),
        });
        return { success: true, itemName: item.displayName, quantity: item.quantity, currency: "gold", cost: item.priceCoins };
      } else {
        // 靈石商店
        const [item] = await db.select().from(gameSpiritShop)
          .where(and(eq(gameSpiritShop.id, input.itemId), eq(gameSpiritShop.isOnSale, 1))).limit(1);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "商品不存在" });
        const userRows = await db.select({ gameStones: users.gameStones, id: users.id })
          .from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!userRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
        if (userRows[0].gameStones < item.priceStones) throw new TRPCError({ code: "BAD_REQUEST", message: "靈石不足" });
        // 扣除靈石
        await db.update(users).set({ gameStones: userRows[0].gameStones - item.priceStones })
          .where(eq(users.id, ctx.user.id));
        // 加入背包
        const existing = await db.select().from(agentInventory)
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, item.itemKey))).limit(1);
        if (existing[0]) {
          await db.update(agentInventory).set({ quantity: existing[0].quantity + item.quantity, updatedAt: Date.now() })
            .where(eq(agentInventory.id, existing[0].id));
        } else {
          await db.insert(agentInventory).values({ agentId: agent.id, itemId: item.itemKey, itemType: "consumable", quantity: item.quantity, acquiredAt: Date.now(), updatedAt: Date.now() });
        }
        await db.insert(agentEvents).values({
          agentId: agent.id, eventType: "system",
          message: `💎 購買了「${item.displayName}」x${item.quantity}（花費 ${item.priceStones} 靈石）`,
          detail: { type: "shop_buy", itemId: item.itemKey, qty: item.quantity, cost: item.priceStones, currency: "stones" },
          createdAt: Date.now(),
        });
        return { success: true, itemName: item.displayName, quantity: item.quantity, currency: "stones", cost: item.priceStones };
      }
    }),

  // ─── 取得目前活躍的密店節點（地圖發光用） ───
  getActiveHiddenShopNodes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { nodes: [] };
    const now = Date.now();
    const shops = await db.select({ nodeId: hiddenShopInstances.nodeId, expiresAt: hiddenShopInstances.expiresAt })
      .from(hiddenShopInstances)
      .where(sql`is_closed = 0 AND expires_at > ${now}`);
    return { nodes: shops.map(s => ({ nodeId: s.nodeId, expiresAt: s.expiresAt })) };
  }),

  // ─── 取得密店商品（需感知檢定） ───
  getHiddenShopItems: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      // 感知檢定：最低 5%，尋寶力每點 +0.5%，上限 80%
      const baseChance = 0.05;
      const bonusChance = Math.min(0.75, (agent.treasureHunting / 100) * 0.75);
      const totalChance = baseChance + bonusChance;
      const roll = Math.random();
      if (roll > totalChance) {
        return { found: false, items: [], gold: agent.gold };
      }
      // 從密店池隨機抽取 3-5 件商品（依權重）
      const pool = await db.select().from(gameHiddenShopPool)
        .where(eq(gameHiddenShopPool.isActive, 1));
      if (pool.length === 0) return { found: true, items: [], gold: agent.gold };
      // 加權隨機抽取
      const totalWeight = pool.reduce((s, i) => s + i.weight, 0);
      const count = Math.min(pool.length, 3 + Math.floor(Math.random() * 3));
      const selected: typeof pool = [];
      const remaining = [...pool];
      for (let i = 0; i < count && remaining.length > 0; i++) {
        let rnd = Math.random() * remaining.reduce((s, x) => s + x.weight, 0);
        for (let j = 0; j < remaining.length; j++) {
          rnd -= remaining[j].weight;
          if (rnd <= 0) {
            selected.push(remaining[j]);
            remaining.splice(j, 1);
            break;
          }
        }
      }
      const userRows = await db.select({ gameStones: users.gameStones })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return {
        found: true,
        items: selected,
        gold: agent.gold,
        gameStones: userRows[0]?.gameStones ?? 0,
        totalWeight,
      };
    }),

  // ─── 購買密店商品 ───
  buyHiddenShopItem: protectedProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      const [item] = await db.select().from(gameHiddenShopPool)
        .where(and(eq(gameHiddenShopPool.id, input.itemId), eq(gameHiddenShopPool.isActive, 1))).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "密店商品不存在" });
      if (item.currencyType === "coins") {
        if (agent.gold < item.price) throw new TRPCError({ code: "BAD_REQUEST", message: "金幣不足" });
        await db.update(gameAgents).set({ gold: agent.gold - item.price, updatedAt: Date.now() })
          .where(eq(gameAgents.id, agent.id));
      } else {
        const userRows = await db.select({ gameStones: users.gameStones })
          .from(users).where(eq(users.id, ctx.user.id)).limit(1);
        if (!userRows[0] || userRows[0].gameStones < item.price)
          throw new TRPCError({ code: "BAD_REQUEST", message: "靈石不足" });
        await db.update(users).set({ gameStones: userRows[0].gameStones - item.price })
          .where(eq(users.id, ctx.user.id));
      }
      // 判斷道具類型（技能書需要特殊處理）
      const isSkillBook = item.itemKey.startsWith("skill-");
      const resolvedItemType = isSkillBook ? "skill_book" : "consumable";
      const existing = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, item.itemKey))).limit(1);
      if (existing[0]) {
        await db.update(agentInventory).set({ quantity: existing[0].quantity + item.quantity, updatedAt: Date.now() })
          .where(eq(agentInventory.id, existing[0].id));
      } else {
        await db.insert(agentInventory).values({ agentId: agent.id, itemId: item.itemKey, itemType: resolvedItemType, quantity: item.quantity, acquiredAt: Date.now(), updatedAt: Date.now() });
      }
      const currencyLabel = item.currencyType === "coins" ? "金幣" : "靈石";
      await db.insert(agentEvents).values({
        agentId: agent.id, eventType: "system",
        message: `🔮 密店購買了「${item.displayName}」x${item.quantity}（花費 ${item.price} ${currencyLabel}）`,
        detail: { type: "hidden_shop_buy", itemId: item.itemKey, qty: item.quantity, cost: item.price, currency: item.currencyType },
        createdAt: Date.now(),
      });
      return { success: true, itemName: item.displayName, quantity: item.quantity };
    }),

  // ─── GD-021 P1：取得背包道具列表（包含裝備模板資訊） ───
  getInventoryWithTemplates: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agents = await db.select().from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agents[0]) return { items: [], equippedSlots: {} };
    const agent = agents[0];
    // 取得背包道具
    const items = await db.select().from(agentInventory)
      .where(eq(agentInventory.agentId, agent.id));
    // 對裝備類型道具，查詢裝備模板取得屬性資訊
    const equipItems = items.filter(i => i.itemType === "equipment");
    const templateIds = Array.from(new Set(equipItems.map(i => i.itemId)));
    const templates: Record<string, typeof equipmentTemplates.$inferSelect> = {};
    for (const tid of templateIds) {
      const [tmpl] = await db.select().from(equipmentTemplates)
        .where(eq(equipmentTemplates.id, tid)).limit(1);
      if (tmpl) templates[tid] = tmpl;
    }
    // 建立裝備槽位對照
    const equippedSlots: Record<string, string> = {};
    for (const item of equipItems) {
      if (item.isEquipped && item.equippedSlot) {
        equippedSlots[item.equippedSlot] = item.itemId;
      }
    }
    return {
      items: items.map(item => ({
        ...item,
        template: item.itemType === "equipment" ? (templates[item.itemId] ?? null) : null,
      })),
      equippedSlots,
      agentId: agent.id,
    };
  }),

  // ─── GD-021 P1：安裝掉落裝備（安裝到裝備槽） ───
  equipDroppedItem: protectedProcedure
    .input(z.object({
      inventoryId: z.number().int().positive(),
      slot: z.enum(["weapon", "armor", "helmet", "boots", "accessory1", "accessory2", "ring1", "ring2"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      // 查詢道具
      const [invItem] = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.id, input.inventoryId), eq(agentInventory.agentId, agent.id)))
        .limit(1);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "道具不存在" });
      if (invItem.itemType !== "equipment") throw new TRPCError({ code: "BAD_REQUEST", message: "此道具不是裝備" });
      // 卸下同槽位的裝備
      const [currentEquipped] = await db.select().from(agentInventory)
        .where(and(
          eq(agentInventory.agentId, agent.id),
          eq(agentInventory.isEquipped, 1),
          eq(agentInventory.equippedSlot, input.slot)
        )).limit(1);
      if (currentEquipped) {
        await db.update(agentInventory).set({ isEquipped: 0, equippedSlot: null, updatedAt: Date.now() })
          .where(eq(agentInventory.id, currentEquipped.id));
      }
      // 安裝新裝備
      await db.update(agentInventory).set({ isEquipped: 1, equippedSlot: input.slot, updatedAt: Date.now() })
        .where(eq(agentInventory.id, input.inventoryId));
      // 查詢裝備模板取得屬性加成
      const [tmpl] = await db.select().from(equipmentTemplates)
        .where(eq(equipmentTemplates.id, invItem.itemId)).limit(1);
      // 重新計算裝備加成後的角色屬性
      if (tmpl) {
        const allEquipped = await db.select().from(agentInventory)
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.isEquipped, 1)));
        const equipBonuses = { hp: 0, atk: 0, def: 0, spd: 0, matk: 0, mp: 0 };
        for (const eq_item of allEquipped) {
          const [eq_tmpl] = await db.select().from(equipmentTemplates)
            .where(eq(equipmentTemplates.id, eq_item.itemId)).limit(1);
          if (eq_tmpl) {
            equipBonuses.hp   += eq_tmpl.hpBonus   ?? 0;
            equipBonuses.atk  += eq_tmpl.atkBonus  ?? 0;
            equipBonuses.def  += eq_tmpl.defBonus  ?? 0;
            equipBonuses.spd  += eq_tmpl.spdBonus  ?? 0;
            equipBonuses.matk += eq_tmpl.matkBonus ?? 0;
            equipBonuses.mp   += eq_tmpl.mpBonus   ?? 0;
          }
        }
          // BUG-6 FIX: 實際寫入裝備加成到角色屬性
        console.log("[equipDroppedItem] equip bonuses:", equipBonuses);
      }
      // BUG-5 FIX: 同步更新 gameAgents 的裝備欄位
      const SLOT_TO_AGENT_FIELD: Record<string, string> = {
        weapon: "equippedWeapon", armor: "equippedBody",
        helmet: "equippedHead", boots: "equippedFeet",
        accessory1: "equippedRingA", accessory2: "equippedRingB",
        ring1: "equippedRingA", ring2: "equippedRingB",
      };
      const agentField = SLOT_TO_AGENT_FIELD[input.slot];
      if (agentField) {
        await db.update(gameAgents)
          .set({ [agentField]: invItem.itemId, updatedAt: Date.now() })
          .where(eq(gameAgents.id, agent.id));
      }
      // 記錄事件
      const { getItemInfo } = await import("../../shared/itemNames");
      const itemInfo = getItemInfo(invItem.itemId);
      await db.insert(agentEvents).values({
        agentId: agent.id, eventType: "system",
        detail: { inventoryId: input.inventoryId, slot: input.slot, itemId: invItem.itemId },
        message: `裝備了「${itemInfo.name}」到${input.slot}槽位`,
        createdAt: Date.now(),
      });
      return { success: true, slot: input.slot, itemId: invItem.itemId, itemName: itemInfo.name };
    }),

  // ─── GD-021 P1：取得低保計數器 ───
  getDropCounters: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agents = await db.select().from(gameAgents)
      .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agents[0]) return null;
    const [counter] = await db.select().from(agentDropCounters)
      .where(eq(agentDropCounters.agentId, agents[0].id)).limit(1);
    return counter ?? null;
  }),

  // ─── 玩家排行榜 ───
  getLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { levelRank: [], combatRank: [] };

    // 等級排行：前 20 名（依等級降序，同等級依 exp 降序）
    const levelRankRaw = await db
      .select({
        id: gameAgents.id,
        agentName: gameAgents.agentName,
        level: gameAgents.level,
        exp: gameAgents.exp,
        dominantElement: gameAgents.dominantElement,
        status: gameAgents.status,
        currentNodeId: gameAgents.currentNodeId,
      })
      .from(gameAgents)
      .where(sql`${gameAgents.isNamed} = 1`)
      .orderBy(desc(gameAgents.level), desc(gameAgents.exp))
      .limit(20);

    // 戰鬥王排行：本週戰鬥場次最多（近 7 天）
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const combatRankRaw = await db
      .select({
        agentId: agentEvents.agentId,
        combatCount: count(agentEvents.id).as("combat_count"),
      })
      .from(agentEvents)
      .where(and(
        eq(agentEvents.eventType, "combat"),
        gt(agentEvents.createdAt, weekAgo)
      ))
      .groupBy(agentEvents.agentId)
      .orderBy(desc(sql`combat_count`))
      .limit(20);

    // 對戰鬥排行补充角色名稱
    const combatRank: Array<{ agentName: string; combatCount: number; level: number; dominantElement: string }> = [];
    for (const row of combatRankRaw) {
      const agentRow = await db.select({
        agentName: gameAgents.agentName,
        level: gameAgents.level,
        dominantElement: gameAgents.dominantElement,
        isNamed: gameAgents.isNamed,
      }).from(gameAgents).where(eq(gameAgents.id, row.agentId)).limit(1);
      if (agentRow[0]?.isNamed) {
        combatRank.push({
          agentName: agentRow[0].agentName ?? "旅人",
          combatCount: Number(row.combatCount),
          level: agentRow[0].level,
          dominantElement: agentRow[0].dominantElement,
        });
      }
    }

    return {
      levelRank: levelRankRaw.map(r => ({
        agentId: r.id,
        agentName: r.agentName ?? "旅人",
        level: r.level,
        exp: r.exp,
        dominantElement: r.dominantElement,
        status: r.status,
        currentNodeId: r.currentNodeId,
      })),
      combatRank,
    };
  }),

  // ─── 全服廣播（前端輪詢） ───
  getBroadcast: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = Date.now();
    // 取有效且未過期的廣播（最新 5 筆）
    const rows = await db.select().from(gameBroadcast)
      .where(eq(gameBroadcast.isActive, 1))
      .orderBy(desc(gameBroadcast.createdAt))
      .limit(5);
    // 過濾已過期的
    return rows.filter(r => !r.expiresAt || r.expiresAt > now);
  }),

  // ─── 世界狀態（前端輪詢，用於顯示隱藏節點發光） ───
  getWorldState: publicProcedure.query(() => {
    // 從 worldTickEngine 的記憶體狀態取得
    const { getWorldState } = require("../worldTickEngine");
    return getWorldState() as {
      currentWeather: string;
      activeBlessing: { type: string; multiplier: number } | null;
      activeHiddenNodes: string[];
      elementalSurge: { element: string; type: string } | null;
      meteorActive: boolean;
      lastTickAt: number;
    };
  }),

  // ─── 全服聊天室 ───
  getChatMessages: publicProcedure
    .input(z.object({ since: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(chatMessages)
        .where(input.since ? gt(chatMessages.createdAt, input.since) : undefined)
        .orderBy(desc(chatMessages.createdAt)) // 最新在前
        .limit(20);
      return rows; // 最新在最上
    }),

  sendChatMessage: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // 取得玩家角色
      const agentRows = await db.select({
        id: gameAgents.id,
        agentName: gameAgents.agentName,
        dominantElement: gameAgents.dominantElement,
        level: gameAgents.level,
        isNamed: gameAgents.isNamed,
      }).from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agentRows[0] || !agentRows[0].isNamed) {
        throw new TRPCError({ code: "FORBIDDEN", message: "需要先命名角色才能發言" });
      }
      const agent = agentRows[0];
      // 防刷送：同一玩家 10 秒內最多發送 3 条
      const recentCount = await db.select({ c: count(chatMessages.id) }).from(chatMessages)
        .where(and(eq(chatMessages.agentId, agent.id), gt(chatMessages.createdAt, Date.now() - 10000)));
      if ((recentCount[0]?.c ?? 0) >= 3) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "發言太頻繁，請稍候再試" });
      }
      const now = Date.now();
      // 清理30分鐘前的訊息
      await db.delete(chatMessages).where(lt(chatMessages.createdAt, now - 30 * 60 * 1000));
      // 如果剩餘訊息還是超過 20 則，刪除最舊的超出部分
      const existing = await db.select({ id: chatMessages.id })
        .from(chatMessages).orderBy(desc(chatMessages.createdAt)).limit(100);
      if (existing.length >= 20) {
        const toDelete = existing.slice(19).map(r => r.id);
        if (toDelete.length > 0) {
          await db.delete(chatMessages).where(inArray(chatMessages.id, toDelete));
        }
      }
      const [inserted] = await db.insert(chatMessages).values({
        agentId: agent.id,
        agentName: agent.agentName ?? "旅人",
        agentElement: agent.dominantElement ?? "wood",
        agentLevel: agent.level,
        content: input.content.trim(),
        msgType: "normal",
        createdAt: now,
      });
      // 透過 WebSocket 即時廣播給所有連線玩家（含未認證客戶端）
      try {
        broadcastToAllIncludingAnon({
          type: "chat_message",
          payload: {
            id: (inserted as { insertId?: number })?.insertId ?? now,
            agentId: agent.id,
            agentName: agent.agentName ?? "旅人",
            agentElement: agent.dominantElement ?? "wood",
            agentLevel: agent.level,
            content: input.content.trim(),
            msgType: "normal",
            createdAt: now,
          },
        });
      } catch {
        // WS 廣播失敗不影響 HTTP 回導
      }
      return { ok: true };
    }),

  // ─── PvP 戰績排行榜 ───
  getPvpLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { winRank: [], streakRank: [] };

    const all = await db.select().from(agentPvpStats)
      .orderBy(desc(agentPvpStats.wins))
      .limit(50);

    // 勝率榜（至少 5 場）
    const winRank = all
      .filter(r => r.wins + r.losses + r.draws >= 5)
      .map(r => ({
        agentId: r.agentId,
        agentName: r.agentName,
        agentElement: r.agentElement,
        agentLevel: r.agentLevel,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        total: r.wins + r.losses + r.draws,
        winRate: r.wins + r.losses + r.draws > 0
          ? Math.round((r.wins / (r.wins + r.losses + r.draws)) * 100)
          : 0,
        currentStreak: r.currentStreak,
        maxStreak: r.maxStreak,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
      .slice(0, 10);

    // 連勝榜（依當前連勝排序）
    const streakRank = all
      .filter(r => r.currentStreak > 0)
      .map(r => ({
        agentId: r.agentId,
        agentName: r.agentName,
        agentElement: r.agentElement,
        agentLevel: r.agentLevel,
        currentStreak: r.currentStreak,
        maxStreak: r.maxStreak,
        wins: r.wins,
      }))
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 10);

    return { winRank, streakRank };
  }),

  // ─── 取得自己 PvP 戰績 ───
  getMyPvpStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const agentRows = await db.select({ id: gameAgents.id })
      .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agentRows[0]) return null;
    const agentId = agentRows[0].id;
    const rows = await db.select().from(agentPvpStats)
      .where(eq(agentPvpStats.agentId, agentId)).limit(1);
    if (!rows[0]) return { wins: 0, losses: 0, draws: 0, currentStreak: 0, maxStreak: 0, winRate: 0, total: 0 };
    const r = rows[0];
    const total = r.wins + r.losses + r.draws;
    return {
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      currentStreak: r.currentStreak,
      maxStreak: r.maxStreak,
      winRate: total > 0 ? Math.round((r.wins / total) * 100) : 0,
      total,
    };
  }),

  // ─── 取得成就列表 ───
  getAchievements: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agentRows = await db.select({ id: gameAgents.id })
      .from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
    if (!agentRows[0]) return [];
    const agentId = agentRows[0].id;

    const allDefs = await db.select().from(achievements)
      .where(eq(achievements.isActive, 1))
      .orderBy(asc(achievements.sortOrder));

    const myProgress = await db.select().from(agentAchievements)
      .where(eq(agentAchievements.agentId, agentId));
    const progressMap = new Map(myProgress.map(p => [p.achievementId, p]));

    return allDefs.map(def => {
      const prog = progressMap.get(def.id);
      return {
        id: def.id,
        name: def.name,
        desc: def.desc,
        icon: def.icon,
        type: def.type,
        threshold: (def.condition as { threshold: number }).threshold,
        progress: prog?.progress ?? 0,
        unlocked: (prog?.unlocked ?? 0) === 1,
        unlockedAt: prog?.unlockedAt ?? null,
      };
    });
  }),

  // ─── 全服最新成就動態 ───
  getRecentAchievements: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const recent = await db.select({
      agentId: agentAchievements.agentId,
      achievementId: agentAchievements.achievementId,
      unlockedAt: agentAchievements.unlockedAt,
      agentName: gameAgents.agentName,
    })
      .from(agentAchievements)
      .innerJoin(gameAgents, eq(agentAchievements.agentId, gameAgents.id))
      .where(eq(agentAchievements.unlocked, 1))
      .orderBy(desc(agentAchievements.unlockedAt))
      .limit(20);

    const allDefs = await db.select({ id: achievements.id, name: achievements.name, icon: achievements.icon })
      .from(achievements);
    const defMap = new Map(allDefs.map(d => [d.id, d]));

    return recent.map(r => ({
      agentName: r.agentName ?? "旅人",
      achievementId: r.achievementId,
      name: defMap.get(r.achievementId)?.name ?? r.achievementId,
      icon: defMap.get(r.achievementId)?.icon ?? "🏅",
      unlockedAt: r.unlockedAt,
    }));
  }),

  // ─── 玩家販售道具（換取金幣） ───
  sellInventoryItem: protectedProcedure
    .input(z.object({
      inventoryId: z.number().int().positive(),
      quantity: z.number().int().positive().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agents = await db.select().from(gameAgents)
        .where(eq(gameAgents.userId, String(ctx.user.id))).limit(1);
      if (!agents[0]) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
      const agent = agents[0];
      // 查詢背包道具
      const [invItem] = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.id, input.inventoryId), eq(agentInventory.agentId, agent.id)))
        .limit(1);
      if (!invItem) throw new TRPCError({ code: "NOT_FOUND", message: "道具不存在" });
      if (invItem.isEquipped) throw new TRPCError({ code: "BAD_REQUEST", message: "裝備中的裝備無法販售" });
      // BUG-7 FIX: 也檢查 gameAgents 的裝備欄位（防止兩套裝備系統不同步）
      if (invItem.itemType === "equipment") {
        const equippedIds = [
          agent.equippedWeapon, agent.equippedOffhand, agent.equippedHead,
          agent.equippedBody, agent.equippedHands, agent.equippedFeet,
          agent.equippedRingA, agent.equippedRingB, agent.equippedNecklace, agent.equippedAmulet,
        ].filter(Boolean);
        if (equippedIds.includes(invItem.itemId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "裝備中的裝備無法販售，請先卸下" });
        }
      }
      const sellQty = Math.min(input.quantity, invItem.quantity);
      if (sellQty <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "數量不足" });
      // 計算販售價格（依稀有度定價，乘以後台折扣率）
      const { getItemInfo } = await import("../../shared/itemNames");
      const itemInfo = getItemInfo(invItem.itemId);
      // 從 game_config 讀取販售折扣率
      const discountCfg = await db.select({ configValue: gameConfig.configValue })
        .from(gameConfig)
        .where(and(eq(gameConfig.isActive, 1), eq(gameConfig.configKey, 'sell_discount_rate')))
        .limit(1);
      const sellDiscountRate = discountCfg[0] ? (parseFloat(discountCfg[0].configValue) || 0.3) : 0.3;
      const rarityBasePrice: Record<string, number> = { common: 20, uncommon: 60, rare: 150, epic: 500, legendary: 2000 };
      const basePrice = rarityBasePrice[itemInfo.rarity] ?? 20;
      const unitPrice = Math.max(1, Math.floor(basePrice * sellDiscountRate));
      const totalGold = unitPrice * sellQty;
      // 更新背包數量
      if (invItem.quantity <= sellQty) {
        await db.delete(agentInventory).where(eq(agentInventory.id, invItem.id));
      } else {
        await db.update(agentInventory).set({ quantity: invItem.quantity - sellQty, updatedAt: Date.now() })
          .where(eq(agentInventory.id, invItem.id));
      }
      // 增加金幣
      await db.update(gameAgents).set({ gold: agent.gold + totalGold, updatedAt: Date.now() })
        .where(eq(gameAgents.id, agent.id));
      // 記錄事件
      await db.insert(agentEvents).values({
        agentId: agent.id, eventType: "system",
        message: `💰 販售了「${itemInfo.name}」 x${sellQty}，獲得 ${totalGold} 金幣`,
        detail: { type: "sell_item", itemId: invItem.itemId, qty: sellQty, gold: totalGold },
        createdAt: Date.now(),
      });
      return { success: true, itemName: itemInfo.name, quantity: sellQty, goldEarned: totalGold };
    }),

  // ─── 立即刷新商店（管理員手動觸發） ───
  adminRefreshShop: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { refreshShopItems } = await import("../tickEngine");
      const result = await refreshShopItems(db);
      return { success: true, virtualCount: result?.virtualCount ?? 0, spiritCount: result?.spiritCount ?? 0 };
    }),

  // ─── 在線玩家地圖顯示（靠近玩家節點，最多 50 位） ───
  getNearbyPlayers: protectedProcedure
    .input(z.object({ currentNodeId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { players: [] };
      const myUserId = String(ctx.user.id);
      const now = Date.now();
      // 視為在線：5 分鐘內有更新的角色
      const onlineThreshold = now - 5 * 60 * 1000;
      // 取得所有在線玩家（排除自己）
      const allOnline = await db
        .select({
          id: gameAgents.id,
          agentName: gameAgents.agentName,
          currentNodeId: gameAgents.currentNodeId,
          dominantElement: gameAgents.dominantElement,
          avatarUrl: gameAgents.avatarUrl,
          level: gameAgents.level,
          hp: gameAgents.hp,
          maxHp: gameAgents.maxHp,
          status: gameAgents.status,
          strategy: gameAgents.strategy,
        })
        .from(gameAgents)
        .where(sql`${gameAgents.userId} != ${myUserId} AND ${gameAgents.updatedAt} > ${onlineThreshold} AND ${gameAgents.agentName} IS NOT NULL`)
        .limit(500);
      if (allOnline.length === 0) return { players: [] };
      const currentNode = input.currentNodeId;
      // 排序邏輯：同節點的玩家排在前面，最多 50 位
      const sorted = allOnline.sort((a, b) => {
        const aScore = a.currentNodeId === currentNode ? 2 : 0;
        const bScore = b.currentNodeId === currentNode ? 2 : 0;
        return bScore - aScore;
      }).slice(0, 50);
      return {
        players: sorted.map(p => ({
          id: p.id,
          agentName: p.agentName ?? "旅人",
          nodeId: p.currentNodeId,
          element: p.dominantElement,
          avatarUrl: p.avatarUrl,
          level: p.level,
          hp: p.hp,
          maxHp: p.maxHp,
          status: p.status,
          strategy: p.strategy,
        })),
      };
    }),
});
