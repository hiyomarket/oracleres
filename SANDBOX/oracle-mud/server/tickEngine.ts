/**
 * 虛相世界 Tick 引擎
 * 每 5 秒執行一次，處理所有活躍角色的行動
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
  MONSTERS,
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
    "✨ {name} 等級提升至 {level} 級！能力大幅增強！",
    "🌟 {name} 突破境界，晉升至 {level} 級！五行能量更加純粹！",
  ],
  weather: [
    "🌧 {node} 附近下起了大雨，水靈能量增強，水屬性怪物更加活躍。",
    "☀️ {node} 陽光普照，火靈能量充沛，火屬性技能威力提升。",
    "🌪 {node} 狂風大作，金靈能量湧動，金屬性怪物出沒頻繁。",
  ],
  divine: [
    "⚡ 神明降下神蹟，{name} 獲得了神力加持！",
    "🌸 神明的祝福降臨，{name} 的傷口迅速癒合。",
  ],
};

function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

// ─── 戰鬥結算 ───
export type CombatResult = {
  won: boolean;
  expGained: number;
  goldGained: number;
  hpLost: number;
  mpUsed: number;
  messages: string[];
  lootItems: string[];
};

export function resolveCombat(
  agent: { attack: number; defense: number; speed: number; hp: number; maxHp: number; dominantElement: string; level: number },
  monster: Monster
): CombatResult {
  const agentElement = agent.dominantElement as WuXing;
  const monsterElement = monster.element;

  // 五行加成
  const atkMultiplier = calcWuxingMultiplier(agentElement, monsterElement);
  const defMultiplier = calcWuxingMultiplier(monsterElement, agentElement);

  // 計算傷害（含隨機波動 ±20%）
  const agentDmg = Math.max(1, Math.round(agent.attack * atkMultiplier * randFloat(0.8, 1.2) - monster.defense * 0.5));
  const monsterDmg = Math.max(1, Math.round(monster.attack * defMultiplier * randFloat(0.8, 1.2) - agent.defense * 0.5));

  // 回合制戰鬥模擬（最多 10 回合）
  let agentHp = agent.hp;
  let monsterHp = monster.hp;
  const messages: string[] = [];
  let rounds = 0;

  // 速度決定先手
  const agentFirst = agent.speed >= monster.speed;

  while (agentHp > 0 && monsterHp > 0 && rounds < 10) {
    rounds++;
    if (agentFirst) {
      monsterHp -= agentDmg;
      if (monsterHp <= 0) break;
      agentHp -= monsterDmg;
    } else {
      agentHp -= monsterDmg;
      if (agentHp <= 0) break;
      monsterHp -= agentDmg;
    }
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

  return { won, expGained, goldGained, hpLost, mpUsed, messages, lootItems };
}

// ─── 計算升級所需經驗 ───
export function calcExpToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// ─── 主 Tick 處理函數 ───
export async function processTick(): Promise<{ processed: number; events: number }> {
  // 取得全服 Tick 狀態
  const worlds = await (await getDb())!.select().from(gameWorld).limit(1);
  let world = worlds[0];
  if (!world) {
    await (await getDb())!.insert(gameWorld).values({
      currentTick: 0,
      dailyElement: "wood",
      dailyStem: "甲",
      dailyBranch: "子",
      weatherModifier: 1.0,
    });
    world = (await (await getDb())!.select().from(gameWorld).limit(1))[0];
  }

  const currentTick = world.currentTick + 1;

  // 更新 Tick
  await (await getDb())!.update(gameWorld).set({ currentTick }).where(eq(gameWorld.id, world.id));

  // 取得所有活躍角色
  const db2 = await getDb();
  if (!db2) return { processed: 0, events: 0 };
  const agents = await db2
    .select()
    .from(gameAgents)
    .where(and(eq(gameAgents.isActive, true)));

  let totalEvents = 0;

  for (const agent of agents) {
    try {
      const events = await processAgentTick(agent, currentTick, world.dailyElement as WuXing);
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
  const now = new Date();
  let eventsCreated = 0;

  // 死亡狀態：不處理
  if (agent.status === "dead") return 0;

  // 移動中：檢查是否抵達
  if (agent.status === "moving" && agent.movingToNodeId && agent.moveArrivesAt) {
    if (now >= agent.moveArrivesAt) {
      const destNode = NODE_MAP[agent.movingToNodeId];
      if (destNode) {
        await (await getDb())!.update(gameAgents).set({
          currentNodeId: agent.movingToNodeId,
          movingToNodeId: null,
          moveArrivesAt: null,
          status: "idle",
        }).where(eq(gameAgents.id, agent.id));

        const msg = formatMessage(pickRandom(EVENT_MESSAGES.arrive), {
          name: agent.name,
          dest: destNode.name,
          desc: destNode.description,
        });
        await createEvent(agent.id, tick, "move", msg, { nodeId: destNode.id }, destNode.id);
        eventsCreated++;

        // 更新 agent 狀態以繼續處理
        agent = { ...agent, currentNodeId: agent.movingToNodeId, status: "idle" };
      }
    } else {
      return 0; // 還在移動中
    }
  }

  // 休息狀態
  if (agent.status === "resting") {
    const hpRestore = Math.floor(agent.maxHp * 0.15);
    const mpRestore = Math.floor(agent.maxMp * 0.15);
    const newHp = Math.min(agent.maxHp, agent.hp + hpRestore);
    const newMp = Math.min(agent.maxMp, agent.mp + mpRestore);
    await (await getDb())!.update(gameAgents).set({ hp: newHp, mp: newMp, status: "idle" }).where(eq(gameAgents.id, agent.id));
    const msg = formatMessage(pickRandom(EVENT_MESSAGES.rest), {
      name: agent.name,
      node: NODE_MAP[agent.currentNodeId]?.name ?? "此地",
      hp: hpRestore,
      mp: mpRestore,
    });
    await createEvent(agent.id, tick, "rest", msg, {}, agent.currentNodeId);
    return 1;
  }

  // HP 過低：強制休息
  if (agent.hp < agent.maxHp * 0.2) {
    await (await getDb())!.update(gameAgents).set({ status: "resting" }).where(eq(gameAgents.id, agent.id));
    return 0;
  }

  // 根據策略決定行動
  const strategy = agent.strategy;
  const currentNode: MapNode | undefined = NODE_MAP[agent.currentNodeId];
  if (!currentNode) return 0;

  // 隨機事件觸發（每 tick 有機率觸發戰鬥或採集）
  const roll = Math.random();

  if (strategy === "explore" || strategy === "farm") {
    // 60% 機率觸發戰鬥
    if (roll < 0.6) {
      eventsCreated += await processCombatEvent(agent, currentNode, tick, dailyElement);
    }
    // 25% 機率採集
    else if (roll < 0.85) {
      eventsCreated += await processGatherEvent(agent, currentNode, tick);
    }
    // 15% 機率移動（explore 策略）
    else if (strategy === "explore") {
      eventsCreated += await processMoveEvent(agent, currentNode, tick);
    }
  } else if (strategy === "merchant") {
    // 商人策略：主要採集，偶爾移動
    if (roll < 0.5) {
      eventsCreated += await processGatherEvent(agent, currentNode, tick);
    } else if (roll < 0.7) {
      eventsCreated += await processMoveEvent(agent, currentNode, tick);
    }
  } else if (strategy === "rest") {
    // 休息策略
    await (await getDb())!.update(gameAgents).set({ status: "resting" }).where(eq(gameAgents.id, agent.id));
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
  const monsters = getMonstersForNode(currentNode.element, currentNode.monsterLevel);
  if (monsters.length === 0) return 0;

  const monster = pickRandom(monsters);

  // 戰鬥開始訊息
  const startMsg = formatMessage(pickRandom(EVENT_MESSAGES.combat_start), {
    name: agent.name,
    node: currentNode.name,
    monster: monster.name,
  });
  await createEvent(agent.id, tick, "encounter", startMsg, { monsterId: monster.id }, currentNode.id);

  // 結算戰鬥
  const result = resolveCombat(
    {
      attack: agent.attack,
      defense: agent.defense,
      speed: agent.speed,
      hp: agent.hp,
      maxHp: agent.maxHp,
      dominantElement: agent.dominantElement,
      level: agent.level,
    },
    monster
  );

  // 更新角色狀態
  let newHp = Math.max(0, agent.hp - result.hpLost);
  let newMp = Math.max(0, agent.mp - result.mpUsed);
  let newExp = agent.exp + result.expGained;
  let newGold = agent.gold + result.goldGained;
  let newLevel = agent.level;
  let newExpToNext = agent.expToNext;
  let newStatus: typeof agent.status = agent.status;

  // 升級判斷
  while (newExp >= newExpToNext) {
    newExp -= newExpToNext;
    newLevel++;
    newExpToNext = calcExpToNext(newLevel);
    // 升級時提升能力值
    const lvupMsg = formatMessage(pickRandom(EVENT_MESSAGES.levelup), {
      name: agent.name,
      level: newLevel,
    });
    await createEvent(agent.id, tick, "levelup", lvupMsg, { level: newLevel }, currentNode.id);
  }

  // HP 為 0：死亡
  if (newHp <= 0) {
    newHp = 1;
    newStatus = "resting";
  }

  await (await getDb())!.update(gameAgents).set({
    hp: newHp,
    mp: newMp,
    exp: newExp,
    expToNext: newExpToNext,
    level: newLevel,
    gold: newGold,
    status: newStatus,
    attack: newLevel > agent.level ? (agent.attack + 2) : agent.attack,
    defense: newLevel > agent.level ? (agent.defense + 1) : agent.defense,
    maxHp: newLevel > agent.level ? (agent.maxHp + 10) : agent.maxHp,
    maxMp: newLevel > agent.level ? (agent.maxMp + 5) : agent.maxMp,
  }).where(eq(gameAgents.id, agent.id));

  // 戰鬥結果訊息
  const resultMsg = result.won
    ? formatMessage(pickRandom(EVENT_MESSAGES.combat_win), {
        name: agent.name,
        monster: monster.name,
        exp: result.expGained,
        gold: result.goldGained,
      })
    : formatMessage(pickRandom(EVENT_MESSAGES.combat_lose), {
        name: agent.name,
        monster: monster.name,
        hp: newHp,
      });

  await createEvent(agent.id, tick, "combat", resultMsg, {
    monsterId: monster.id,
    won: result.won,
    expGained: result.expGained,
    goldGained: result.goldGained,
    hpLost: result.hpLost,
    lootItems: result.lootItems,
  }, currentNode.id);

  // 掉落物事件
  for (const itemId of result.lootItems) {
    const lootMsg = formatMessage(pickRandom(EVENT_MESSAGES.loot), {
      name: agent.name,
      node: currentNode.name,
      item: itemId,
      monster: monster.name,
    });
    await createEvent(agent.id, tick, "loot", lootMsg, { itemId }, currentNode.id);
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
    name: agent.name,
    node: currentNode.name,
    item,
  });

  await createEvent(agent.id, tick, "gather", msg, { itemId: item }, currentNode.id);
  return 1;
}

// ─── 移動事件 ───
async function processMoveEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  if (currentNode.connections.length === 0) return 0;

  const destId = pickRandom(currentNode.connections);
  const destNode = NODE_MAP[destId];
  if (!destNode) return 0;

  const arrivalTime = new Date(Date.now() + destNode.travelTime * 1000);

  await (await getDb())!.update(gameAgents).set({
    movingToNodeId: destId,
    moveArrivesAt: arrivalTime,
    status: "moving",
  }).where(eq(gameAgents.id, agent.id));

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.move), {
    name: agent.name,
    dest: destNode.name,
  });

  await createEvent(agent.id, tick, "move", msg, { destNodeId: destId }, currentNode.id);
  return 1;
}

// ─── 建立事件記錄 ───
async function createEvent(
  agentId: number,
  tick: number,
  eventType: typeof agentEvents.$inferInsert["eventType"],
  message: string,
  data: Record<string, unknown>,
  nodeId?: string
): Promise<void> {
  await (await getDb())!.insert(agentEvents).values({
    agentId,
    tick,
    eventType,
    message,
    data,
    nodeId,
  });
}

// ─── Tick 引擎啟動器 ───
let tickInterval: ReturnType<typeof setInterval> | null = null;
const TICK_INTERVAL_MS = 5000; // 5 秒

export function startTickEngine(): void {
  if (tickInterval) return;
  console.log("[TickEngine] 啟動虛相世界 Tick 引擎，間隔 5 秒");
  tickInterval = setInterval(async () => {
    try {
      const result = await processTick();
      if (result.processed > 0) {
        console.log(`[TickEngine] Tick 完成：${result.processed} 位角色，${result.events} 個事件`);
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
