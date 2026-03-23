/**
 * 虛相世界 tRPC Router
 * 包含：角色命名、角色狀態、事件日誌、策略切換、Tick 觸發
 * GD-018：等級扁平化，裝備為核心成長
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb, getUserProfileForEngine } from "../db";
import { gameAgents, agentEvents, gameWorld, agentInventory, gameHiddenEvents, agentTitles, gameTitles } from "../../drizzle/schema";
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
// ─── 根據主屬性取得初始技能 ───
function getInitialSkills(dominant: WuXing): { slot1: string; slot2: string; passive1: string } {
  const INITIAL_SKILLS: Record<WuXing, { slot1: string; slot2: string; passive1: string }> = {
    wood: { slot1: "wood-basic-atk", slot2: "wood-heal", passive1: "wood-regen" },
    fire: { slot1: "fire-basic-atk", slot2: "fire-burst", passive1: "fire-boost" },
    earth: { slot1: "earth-basic-atk", slot2: "earth-shield", passive1: "earth-tough" },
    metal: { slot1: "metal-basic-atk", slot2: "metal-pierce", passive1: "metal-crit" },
    water: { slot1: "water-basic-atk", slot2: "water-flow", passive1: "water-sense" },
  };
  return INITIAL_SKILLS[dominant];
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
            skillSlot1: ag.skillSlot1 ?? initSkills.slot1,
            skillSlot2: ag.skillSlot2 ?? initSkills.slot2,
            passiveSlot1: ag.passiveSlot1 ?? initSkills.passive1,
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
    const items = await db
      .select()
      .from(agentInventory)
      .where(eq(agentInventory.agentId, agents[0].id));
    // 道具名稱映射表（對應 tickEngine 實際產生的道具 ID）
    const ITEM_NAMES: Record<string, { name: string; rarity: string; emoji: string }> = {
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
    };
    return items.map(item => ({
      ...item,
      itemName: ITEM_NAMES[item.itemId]?.name ?? item.itemId,
      rarity: ITEM_NAMES[item.itemId]?.rarity ?? "common",
      emoji: ITEM_NAMES[item.itemId]?.emoji ?? "📦",
    }));
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
      const nodeMonsters = MONSTERS.filter(
        (m) => m.element === node.element &&
          m.level >= node.monsterLevel[0] &&
          m.level <= node.monsterLevel[1]
      ).slice(0, 5);
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
      if (agent.status === "dead") throw new Error("旅人已倒下，無法傳送");
      if (agent.actionPoints < 1) throw new Error("靈力值不足（傳送需要 1 點靈力值）");
      if (agent.currentNodeId === input.targetNodeId) throw new Error("已在目標節點");

      const now = Date.now();
      await db.update(gameAgents).set({
        targetNodeId: input.targetNodeId,
        status: "moving",
        actionPoints: agent.actionPoints - 1,
        updatedAt: now,
      }).where(eq(gameAgents.id, agent.id));

      await db.insert(agentEvents).values({
        agentId: agent.id,
        eventType: "move",
        message: `🗺️ ${agent.agentName ?? "旅人"} 啟程前往 ${targetNode.name}！（消耗 1 靈力值）`,
        detail: { type: "teleport", targetNodeId: input.targetNodeId, targetNodeName: targetNode.name },
        nodeId: agent.currentNodeId,
        createdAt: now,
      });

      return { success: true, targetNode };
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

    // 依洞察力計算感知機率（treasureHunting 1-100 → 1%-100%）
    const perception = agent.treasureHunting ?? 20;
    const perceived: typeof validEvents = [];
    for (const evt of validEvents) {
      // 感知機率：(treasureHunting / perceptionThreshold) * 100%，上限100%
      const chance = Math.min(100, (perception / evt.perceptionThreshold) * 100);
      if (Math.random() * 100 < chance) {
        perceived.push(evt);
        // 標記已被發現
        if (!evt.isDiscovered) {
          await db.update(gameHiddenEvents).set({ isDiscovered: 1 })
            .where(eq(gameHiddenEvents.id, evt.id));
        }
      }
    }
    return perceived;
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
