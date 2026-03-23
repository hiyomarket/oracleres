/**
 * 虛相世界 Tick 引擎
 * 每 5 分鐘執行一次，處理所有活躍角色的行動
 * GD-018：等級扁平化，裝備為核心成長
 */

import { getDb } from "./db";
import { gameAgents, agentEvents, gameWorld } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  MAP_NODES,
  NODE_MAP,
  calcWuxingMultiplier,
  type WuXing,
  type MapNode,
} from "../shared/mapNodes";
import {
  getMonstersForNode,
  type Monster,
} from "../shared/monsters";

// ─── 工具函數 ───
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── 事件訊息模板 ───
const EVENT_MESSAGES = {
  move: [
    "{name} 踏上前往 {dest} 的旅途，腳步堅定。",
    "{name} 沿著古道向 {dest} 前進，路旁野花盛開。",
    "{name} 啟程前往 {dest}，心中充滿期待。",
  ],
  arrive: [
    "{name} 抵達 {dest}，{desc}",
    "{name} 踏入 {dest} 的領域，{desc}",
    "{name} 終於來到 {dest}，{desc}",
  ],
  combat_start: [
    "{name} 在 {node} 遭遇了 {monster}！",
    "一隻 {monster} 從暗處躍出，攔住了 {name} 的去路！",
    "{name} 不慎驚動了 {monster}，戰鬥一觸即發！",
  ],
  combat_win: [
    "{name} 擊敗了 {monster}！獲得 {exp} 點經驗、{gold} 枚金幣。",
    "{name} 以精湛的戰技制服了 {monster}！獲得 {exp} 點經驗、{gold} 枚金幣。",
    "{monster} 倒下了，{name} 勝利！獲得 {exp} 點經驗、{gold} 枚金幣。",
  ],
  combat_lose: [
    "{name} 不敵 {monster}，被迫撤退，HP 降至 {hp}。",
    "{name} 在與 {monster} 的戰鬥中落敗，狼狽逃脫。",
  ],
  loot: [
    "{name} 在 {node} 撿到了 {item}！",
    "{name} 從 {monster} 的遺體中取出了 {item}。",
  ],
  gather: [
    "{name} 在 {node} 採集到了 {item}。",
    "{name} 發現了一叢 {item}，小心翼翼地採摘。",
  ],
  rest: [
    "{name} 在 {node} 找了個安全的地方休息，恢復了 {hp} 點 HP。",
    "{name} 盤腿打坐，運轉五行真氣，恢復了 {hp} 點 HP 與 {mp} 點 MP。",
  ],
  levelup: [
    "✨ {name} 等級提升至 {level} 級！踏上更廣闊的地圖！",
    "🌟 {name} 突破境界，晉升至 {level} 級！解鎖新的探索區域！",
  ],
  rogue: [
    "🎲 {name} 在 {node} 遭遇了奇異事件：{event}",
    "✨ 命運的齒輪轉動，{name} 在 {node} 觸發了奇遇！",
  ],
};

function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

// ─── 戰鬥結算（詳細回合制） ───
export type CombatRound = {
  round: number;
  agentAtk: number;
  monsterAtk: number;
  agentHpAfter: number;
  monsterHpAfter: number;
  agentFirst: boolean;
};

export type CombatResult = {
  won: boolean;
  expGained: number;
  goldGained: number;
  hpLost: number;
  mpUsed: number;
  rounds: CombatRound[];
  lootItems: string[];
  monsterName: string;
  elementMultiplier: number;
};

export function resolveCombat(
  agent: {
    attack: number;
    defense: number;
    speed: number;
    hp: number;
    maxHp: number;
    dominantElement: string;
    level: number;
  },
  monster: Monster
): CombatResult {
  const agentElement = agent.dominantElement as WuXing;
  const monsterElement = monster.element;

  // 五行加成
  const atkMultiplier = calcWuxingMultiplier(agentElement, monsterElement);
  const defMultiplier = calcWuxingMultiplier(monsterElement, agentElement);

  // 計算基礎傷害
  const agentBaseDmg = Math.max(1, Math.round(agent.attack * atkMultiplier - monster.defense * 0.5));
  const monsterBaseDmg = Math.max(1, Math.round(monster.attack * defMultiplier - agent.defense * 0.5));

  // 回合制戰鬥模擬（最多 10 回合）
  let agentHp = agent.hp;
  let monsterHp = monster.hp;
  const rounds: CombatRound[] = [];
  const agentFirst = agent.speed >= monster.speed;

  while (agentHp > 0 && monsterHp > 0 && rounds.length < 10) {
    const roundNum = rounds.length + 1;
    const agentAtk = Math.round(agentBaseDmg * randFloat(0.8, 1.2));
    const monsterAtk = Math.round(monsterBaseDmg * randFloat(0.8, 1.2));

    if (agentFirst) {
      monsterHp = Math.max(0, monsterHp - agentAtk);
      if (monsterHp <= 0) {
        rounds.push({ round: roundNum, agentAtk, monsterAtk: 0, agentHpAfter: agentHp, monsterHpAfter: 0, agentFirst });
        break;
      }
      agentHp = Math.max(0, agentHp - monsterAtk);
    } else {
      agentHp = Math.max(0, agentHp - monsterAtk);
      if (agentHp <= 0) {
        rounds.push({ round: roundNum, agentAtk: 0, monsterAtk, agentHpAfter: 0, monsterHpAfter: monsterHp, agentFirst });
        break;
      }
      monsterHp = Math.max(0, monsterHp - agentAtk);
    }

    rounds.push({ round: roundNum, agentAtk, monsterAtk, agentHpAfter: agentHp, monsterHpAfter: monsterHp, agentFirst });
  }

  const won = monsterHp <= 0;
  const hpLost = Math.min(agent.hp, agent.hp - agentHp);
  const mpUsed = randInt(2, 8);

  // 計算獎勵
  const expGained = won ? monster.expReward : Math.floor(monster.expReward * 0.1);
  const goldGained = won ? randInt(monster.goldReward[0], monster.goldReward[1]) : 0;

  // 掉落物
  const lootItems: string[] = [];
  if (won) {
    for (const drop of monster.dropItems) {
      if (Math.random() < drop.chance) {
        lootItems.push(drop.itemId);
      }
    }
  }

  return {
    won,
    expGained,
    goldGained,
    hpLost,
    mpUsed,
    rounds,
    lootItems,
    monsterName: monster.name,
    elementMultiplier: atkMultiplier,
  };
}

// ─── 計算升級所需經驗（GD-018：60 級上限，等級只是地圖通行證） ───
export function calcExpToNext(level: number): number {
  if (level >= 60) return 999999; // 滿級
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

// ─── 體力值再生（100 上限，每 20 分鐘 +1） ───
function regenStamina(agent: typeof gameAgents.$inferSelect): number {
  const now = Date.now();
  const lastRegen = agent.staminaLastRegen ?? now;
  const elapsed = now - lastRegen;
  const regenIntervalMs = 20 * 60 * 1000; // 20 分鐘
  const regenAmount = Math.floor(elapsed / regenIntervalMs);
  if (regenAmount <= 0) return agent.stamina;
  return Math.min(agent.maxStamina, agent.stamina + regenAmount);
}

// ─── 主 Tick 處理函數 ───
export async function processTick(): Promise<{ processed: number; events: number }> {
  const db = await getDb();
  if (!db) return { processed: 0, events: 0 };

  // 取得或建立世界狀態
  const worlds = await db.select().from(gameWorld).limit(1);
  let world = worlds[0];
  if (!world) {
    await db.insert(gameWorld).values({
      worldKey: "main",
      worldData: { currentTick: 0, dailyElement: "wood", dailyStem: "甲", dailyBranch: "子" },
      updatedAt: Date.now(),
    });
    const newWorlds = await db.select().from(gameWorld).limit(1);
    world = newWorlds[0];
    if (!world) return { processed: 0, events: 0 };
  }

  const worldData = (world.worldData as Record<string, unknown>) ?? {};
  const currentTick = ((worldData.currentTick as number) ?? 0) + 1;
  const dailyElement = (worldData.dailyElement as WuXing) ?? "wood";

  // 更新 Tick
  await db.update(gameWorld).set({
    worldData: { ...worldData, currentTick },
    updatedAt: Date.now(),
  }).where(eq(gameWorld.id, world.id));

  // 取得所有活躍角色
  const agents = await db
    .select()
    .from(gameAgents)
    .where(and(eq(gameAgents.isActive, 1)));

  let totalEvents = 0;

  for (const agent of agents) {
    try {
      // 體力值再生
      const newStamina = regenStamina(agent);
      if (newStamina !== agent.stamina) {
        await db.update(gameAgents).set({
          stamina: newStamina,
          staminaLastRegen: Date.now(),
        }).where(eq(gameAgents.id, agent.id));
      }

      // 體力值不足時跳過行動
      if (newStamina <= 0) continue;

      const events = await processAgentTick({ ...agent, stamina: newStamina }, currentTick, dailyElement);
      totalEvents += events;
    } catch (err) {
      console.error(`[Tick] Error processing agent ${agent.id}:`, err);
    }
  }

  return { processed: agents.length, events: totalEvents };
}

// ─── 單一角色 Tick 處理 ───
async function processAgentTick(
  agent: typeof gameAgents.$inferSelect,
  tick: number,
  dailyElement: WuXing
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 死亡狀態：不處理
  if (agent.status === "dead") return 0;

  // 移動中：檢查是否抵達
  if (agent.status === "moving" && agent.targetNodeId) {
    const destNode = NODE_MAP[agent.targetNodeId];
    if (destNode) {
      await db.update(gameAgents).set({
        currentNodeId: agent.targetNodeId,
        targetNodeId: null,
        status: "idle",
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, agent.id));

      const msg = formatMessage(pickRandom(EVENT_MESSAGES.arrive), {
        name: agent.agentName ?? "旅人",
        dest: destNode.name,
        desc: destNode.description,
      });
      await createEvent(agent.id, "move", msg, { nodeId: destNode.id }, destNode.id);
      agent = { ...agent, currentNodeId: agent.targetNodeId, status: "idle" };
      return 1;
    }
  }

  // 休息狀態
  if (agent.status === "resting") {
    const hpRestore = Math.floor(agent.maxHp * 0.15);
    const mpRestore = Math.floor(agent.maxMp * 0.15);
    const newHp = Math.min(agent.maxHp, agent.hp + hpRestore);
    const newMp = Math.min(agent.maxMp, agent.mp + mpRestore);
    await db.update(gameAgents).set({
      hp: newHp,
      mp: newMp,
      status: "idle",
      updatedAt: Date.now(),
    }).where(eq(gameAgents.id, agent.id));
    const msg = formatMessage(pickRandom(EVENT_MESSAGES.rest), {
      name: agent.agentName ?? "旅人",
      node: NODE_MAP[agent.currentNodeId]?.name ?? "此地",
      hp: hpRestore,
      mp: mpRestore,
    });
    await createEvent(agent.id, "rest", msg, {}, agent.currentNodeId);
    return 1;
  }

  // HP 過低：強制休息
  if (agent.hp < agent.maxHp * 0.2) {
    await db.update(gameAgents).set({ status: "resting" }).where(eq(gameAgents.id, agent.id));
    return 0;
  }

  // 根據策略決定行動
  const currentNode: MapNode | undefined = NODE_MAP[agent.currentNodeId];
  if (!currentNode) return 0;

  // 消耗體力值
  await db.update(gameAgents).set({
    stamina: Math.max(0, agent.stamina - 1),
    staminaLastRegen: agent.staminaLastRegen ?? Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  const roll = Math.random();
  let eventsCreated = 0;

  // Roguelike 奇遇（5% 機率）
  if (roll < 0.05) {
    eventsCreated += await processRogueEvent(agent, currentNode, tick);
    return eventsCreated;
  }

  const strategy = agent.strategy;

  if (strategy === "explore" || strategy === "combat") {
    if (roll < 0.65) {
      eventsCreated += await processCombatEvent(agent, currentNode, tick, dailyElement);
    } else if (roll < 0.85) {
      eventsCreated += await processGatherEvent(agent, currentNode, tick);
    } else if (strategy === "explore") {
      eventsCreated += await processMoveEvent(agent, currentNode, tick);
    }
  } else if (strategy === "gather") {
    if (roll < 0.6) {
      eventsCreated += await processGatherEvent(agent, currentNode, tick);
    } else if (roll < 0.75) {
      eventsCreated += await processMoveEvent(agent, currentNode, tick);
    } else {
      eventsCreated += await processCombatEvent(agent, currentNode, tick, dailyElement);
    }
  } else if (strategy === "rest") {
    await db.update(gameAgents).set({ status: "resting" }).where(eq(gameAgents.id, agent.id));
  }

  return eventsCreated;
}

// ─── 戰鬥事件 ───
async function processCombatEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number,
  dailyElement: WuXing
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const monsters = getMonstersForNode(currentNode.element, currentNode.monsterLevel);
  if (monsters.length === 0) return 0;

  const monster = pickRandom(monsters);

  // 戰鬥開始訊息
  const startMsg = formatMessage(pickRandom(EVENT_MESSAGES.combat_start), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    monster: monster.name,
  });
  await createEvent(agent.id, "combat", startMsg, { phase: "start", monsterId: monster.id }, currentNode.id);

  // 結算戰鬥
  const result = resolveCombat(
    {
      attack: agent.attack,
      defense: agent.defense,
      speed: agent.speed,
      hp: agent.hp,
      maxHp: agent.maxHp,
      dominantElement: agent.dominantElement ?? "wood",
      level: agent.level,
    },
    monster
  );

  // 更新角色狀態
  let newHp = Math.max(1, agent.hp - result.hpLost);
  let newMp = Math.max(0, agent.mp - result.mpUsed);
  let newExp = agent.exp + result.expGained;
  let newGold = agent.gold + result.goldGained;
  let newLevel = agent.level;
  let newExpToNext = calcExpToNext(agent.level);
  let newStatus: typeof agent.status = agent.status;
  let newTotalKills = agent.totalKills + (result.won ? 1 : 0);

  // 升級判斷（GD-018：等級只是地圖通行證，上限 60）
  while (newExp >= newExpToNext && newLevel < 60) {
    newExp -= newExpToNext;
    newLevel++;
    newExpToNext = calcExpToNext(newLevel);
    const lvupMsg = formatMessage(pickRandom(EVENT_MESSAGES.levelup), {
      name: agent.agentName ?? "旅人",
      level: newLevel,
    });
    await createEvent(agent.id, "system", lvupMsg, { type: "levelup", level: newLevel }, currentNode.id);
  }

  if (newHp <= 1) {
    newStatus = "resting";
  }

  await db.update(gameAgents).set({
    hp: newHp,
    mp: newMp,
    exp: newExp,
    level: newLevel,
    gold: newGold,
    status: newStatus,
    totalKills: newTotalKills,
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  // 戰鬥結果訊息（含詳細回合日誌）
  const resultMsg = result.won
    ? formatMessage(pickRandom(EVENT_MESSAGES.combat_win), {
        name: agent.agentName ?? "旅人",
        monster: monster.name,
        exp: result.expGained,
        gold: result.goldGained,
      })
    : formatMessage(pickRandom(EVENT_MESSAGES.combat_lose), {
        name: agent.agentName ?? "旅人",
        monster: monster.name,
        hp: newHp,
      });

  await createEvent(agent.id, "combat", resultMsg, {
    phase: "result",
    monsterId: monster.id,
    monsterName: monster.name,
    won: result.won,
    expGained: result.expGained,
    goldGained: result.goldGained,
    hpLost: result.hpLost,
    elementMultiplier: result.elementMultiplier,
    rounds: result.rounds,
    lootItems: result.lootItems,
  }, currentNode.id);

  // 掉落物事件
  for (const itemId of result.lootItems) {
    const lootMsg = formatMessage(pickRandom(EVENT_MESSAGES.loot), {
      name: agent.agentName ?? "旅人",
      node: currentNode.name,
      item: itemId,
      monster: monster.name,
    });
    await createEvent(agent.id, "gather", lootMsg, { itemId }, currentNode.id);
  }

  return 1 + result.lootItems.length;
}

// ─── 採集事件 ───
async function processGatherEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const gatherItems: Record<WuXing, string[]> = {
    wood: ["herb-001", "herb-002", "mat-wood-001", "mat-wood-002"],
    fire: ["herb-fire-001", "mat-fire-001", "mat-fire-002"],
    earth: ["mat-earth-001", "mat-earth-002", "food-earth-001"],
    metal: ["mat-metal-001", "mat-metal-002", "mat-metal-003"],
    water: ["mat-water-001", "mat-water-002", "herb-water-001"],
  };

  const items = gatherItems[currentNode.element];
  const item = pickRandom(items);

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.gather), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    item,
  });

  await createEvent(agent.id, "gather", msg, { itemId: item }, currentNode.id);
  return 1;
}

// ─── 移動事件 ───
async function processMoveEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  if (currentNode.connections.length === 0) return 0;

  const destId = pickRandom(currentNode.connections);
  const destNode = NODE_MAP[destId];
  if (!destNode) return 0;

  await db.update(gameAgents).set({
    targetNodeId: destId,
    status: "moving",
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.move), {
    name: agent.agentName ?? "旅人",
    dest: destNode.name,
  });

  await createEvent(agent.id, "move", msg, { destNodeId: destId }, currentNode.id);
  return 1;
}

// ─── Roguelike 奇遇事件 ───
const ROGUE_EVENTS = [
  { id: "treasure_chest", name: "神秘寶箱", desc: "發現一個古老的寶箱，裡面藏有珍貴的道具！", goldReward: [50, 150] as [number, number] },
  { id: "wandering_merchant", name: "流浪商人", desc: "遇到一位神秘的流浪商人，以低廉的價格出售稀有道具。", goldReward: [0, 0] as [number, number] },
  { id: "ancient_ruins", name: "古代遺跡", desc: "發現了隱藏的古代遺跡，獲得了大量的經驗值！", expReward: 200 },
  { id: "spirit_spring", name: "靈泉", desc: "找到了一處神秘的靈泉，HP 和 MP 完全恢復！", healFull: true },
  { id: "cursed_item", name: "詛咒道具", desc: "撿到了一件詛咒道具，損失了一些 HP。", hpLoss: 20 },
  { id: "divine_blessing", name: "神明祝福", desc: "感受到神明的祝福，臨時提升了戰鬥能力！", buffTick: 3 },
  { id: "lost_traveler", name: "迷路旅人", desc: "遇到了一位迷路的旅人，幫助他後獲得了獎勵。", goldReward: [20, 80] as [number, number] },
  { id: "elemental_surge", name: "元素湧動", desc: "感受到強烈的五行元素湧動，五行能量暫時增強！", elementBuff: true },
];

async function processRogueEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rogueEvent = pickRandom(ROGUE_EVENTS);
  let goldChange = 0;
  let expChange = 0;
  let hpChange = 0;

  if (rogueEvent.goldReward) {
    goldChange = randInt(rogueEvent.goldReward[0], rogueEvent.goldReward[1]);
  }
  if (rogueEvent.expReward) {
    expChange = rogueEvent.expReward;
  }
  if (rogueEvent.healFull) {
    hpChange = agent.maxHp - agent.hp;
  }
  if (rogueEvent.hpLoss) {
    hpChange = -rogueEvent.hpLoss;
  }

  const newGold = agent.gold + goldChange;
  const newExp = agent.exp + expChange;
  const newHp = Math.max(1, Math.min(agent.maxHp, agent.hp + hpChange));

  await db.update(gameAgents).set({
    gold: newGold,
    exp: newExp,
    hp: newHp,
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.rogue), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    event: rogueEvent.name,
  });

  await createEvent(agent.id, "rogue", msg, {
    rogueEventId: rogueEvent.id,
    rogueEventName: rogueEvent.name,
    rogueEventDesc: rogueEvent.desc,
    goldChange,
    expChange,
    hpChange,
  }, currentNode.id);

  return 1;
}

// ─── 建立事件記錄 ───
async function createEvent(
  agentId: number,
  eventType: typeof agentEvents.$inferInsert["eventType"],
  message: string,
  detail: Record<string, unknown>,
  nodeId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(agentEvents).values({
    agentId,
    eventType,
    message,
    detail,
    nodeId,
    createdAt: Date.now(),
  });
}

// ─── Tick 引擎啟動器 ───
let tickInterval: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 分鐘

export function startTickEngine(): void {
  if (tickInterval) return;
  console.log("[TickEngine] 啟動虛相世界 Tick 引擎，間隔 5 分鐘");
  tickInterval = setInterval(async () => {
    try {
      const result = await processTick();
      if (result.processed > 0) {
        console.log(`[TickEngine] Tick 完成：${result.processed} 位旅人，${result.events} 個事件`);
      }
    } catch (err) {
      console.error("[TickEngine] Tick 錯誤：", err);
    }
  }, TICK_INTERVAL_MS);
}

export function stopTickEngine(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log("[TickEngine] 已停止");
  }
}
