/**
 * 世界 Tick 引擎
 * 每 30 分鐘執行一次，觸發全域世界事件
 * 
 * 固定事件：所有玩家 +1 AP（靈力值）
 * 隨機事件（7種）：天氣變化、全服祝福、隱藏NPC、隱藏任務、天災/祥瑞、流星雨、神明降臨
 */
import { getDb } from "./db";
import { broadcastToAll } from "./wsServer";
import { broadcastWeeklyChampion } from "./liveFeedBroadcast";
import {
  gameAgents,
  worldEvents,
  chatMessages,
  gameBroadcast,
  weeklyChampions,
  agentTitles,
  gameTitles,
  agentEvents,
} from "../drizzle/schema";
import { eq, gt, and, desc, count, sql } from "drizzle-orm";
import { MAP_NODES } from "../shared/mapNodes";
import type { WuXing } from "../shared/types";

// ─── 世界事件配置（後台可動態調整） ───
export interface WorldEventConfig {
  weatherChange: { enabled: boolean; probability: number };
  globalBlessing: { enabled: boolean; probability: number };
  hiddenNpc: { enabled: boolean; probability: number };
  hiddenQuest: { enabled: boolean; probability: number };
  elementalSurge: { enabled: boolean; probability: number };
  meteorShower: { enabled: boolean; probability: number };
  divineArrival: { enabled: boolean; probability: number };
}

let worldEventConfig: WorldEventConfig = {
  weatherChange:   { enabled: true, probability: 30 },
  globalBlessing:  { enabled: true, probability: 20 },
  hiddenNpc:       { enabled: true, probability: 15 },
  hiddenQuest:     { enabled: true, probability: 15 },
  elementalSurge:  { enabled: true, probability: 10 },
  meteorShower:    { enabled: true, probability: 5  },
  divineArrival:   { enabled: true, probability: 5  },
};

export function getWorldEventConfig(): WorldEventConfig {
  return { ...worldEventConfig };
}

export function updateWorldEventConfig(patch: Partial<WorldEventConfig>): void {
  worldEventConfig = { ...worldEventConfig, ...patch };
}

// ─── 當前世界狀態（記憶體快取） ───
export interface WorldState {
  currentWeather: WuXing;
  activeBlessing: { type: "exp" | "gold" | "drop"; multiplier: number; expiresAt: number } | null;
  activeHiddenNodes: { nodeId: string; type: "npc" | "quest"; title: string; expiresAt: number }[];
  elementalSurge: { element: WuXing; type: "boost" | "weaken"; expiresAt: number } | null;
  meteorActive: boolean;
  lastWorldTickAt: number;
}

let worldState: WorldState = {
  currentWeather: "wood",
  activeBlessing: null,
  activeHiddenNodes: [],
  elementalSurge: null,
  meteorActive: false,
  lastWorldTickAt: 0,
};

export function getWorldState(): WorldState {
  // 清除過期狀態
  const now = Date.now();
  if (worldState.activeBlessing && worldState.activeBlessing.expiresAt < now) {
    worldState.activeBlessing = null;
  }
  worldState.activeHiddenNodes = worldState.activeHiddenNodes.filter(n => n.expiresAt > now);
  if (worldState.elementalSurge && worldState.elementalSurge.expiresAt < now) {
    worldState.elementalSurge = null;
  }
  return { ...worldState };
}

// ─── 輔助函數 ───
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WUXING_LIST: WuXing[] = ["wood", "fire", "earth", "metal", "water"];
const WUXING_NAMES: Record<WuXing, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};
const WEATHER_TITLES: Record<WuXing, string[]> = {
  wood: ["春風和煦，木氣盛行", "林間靈氣湧動，草木欣欣向榮", "翠綠之氣籠罩大地"],
  fire: ["烈日當空，火氣大旺", "赤焰騰空，火行能量澎湃", "炎陽普照，萬物生機勃發"],
  earth: ["厚土沉穩，地氣凝聚", "黃土氣息瀰漫，大地靜謐安詳", "土行之力充盈四方"],
  metal: ["金風颯颯，金氣清肅", "白氣如霜，金行能量銳利", "秋肅之氣，金光閃耀"],
  water: ["雲霧繚繞，水氣氤氳", "靈泉湧動，水行之力流轉", "寒水凝聚，智慧之氣升騰"],
};

const NPC_TYPES = [
  { title: "神秘商人", desc: "一位神秘的流浪商人出現在此地，據說有稀有道具出售…", type: "npc" as const },
  { title: "古老智者", desc: "一位白髮老者在此靜坐，似乎願意傳授秘法…", type: "npc" as const },
  { title: "受傷旅人", desc: "一位受傷的旅人倒臥在路旁，需要幫助…", type: "npc" as const },
  { title: "神秘使者", desc: "一位身著黑袍的使者在此等候，手持密函…", type: "npc" as const },
];

const QUEST_TYPES = [
  { title: "尋找失蹤的孩子", desc: "村民的孩子在此附近失蹤，請幫忙尋找…", type: "quest" as const },
  { title: "討伐惡靈", desc: "此地最近出現強大的惡靈，需要勇士前來討伐…", type: "quest" as const },
  { title: "採集靈草", desc: "煉藥師急需此地特有的靈草，願意重金酬謝…", type: "quest" as const },
  { title: "護送商隊", desc: "一支商隊需要護衛前往下一個城鎮…", type: "quest" as const },
  { title: "調查異象", desc: "此地近日出現奇異的五行波動，需要有人前來調查…", type: "quest" as const },
];

const BLESSING_TYPES: Array<{ type: "exp" | "gold" | "drop"; title: string; desc: string; multiplier: number }> = [
  { type: "exp", title: "天降祥瑞・經驗加倍", desc: "神明降下祥瑞之氣，所有旅人的經驗獲取提升至 1.5 倍！", multiplier: 150 },
  { type: "gold", title: "財神降臨・金幣加倍", desc: "財神爺顯靈，所有旅人的金幣獲取提升至 1.5 倍！", multiplier: 150 },
  { type: "drop", title: "靈氣充盈・掉落加倍", desc: "天地靈氣充盈，所有旅人的道具掉落率提升至 1.5 倍！", multiplier: 150 },
];

// ─── 廣播輔助函數 ───
async function sendWorldBroadcast(title: string, content: string, durationSec = 60): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    // gameBroadcast 表沒有 title 欄位，將 title 嵌入 content
    await db.insert(gameBroadcast).values({
      content: `${title}\n${content}`,
      msgType: "event",
      expiresAt: Date.now() + durationSec * 1000,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.error("[WorldTick] 廣播失敗：", e);
  }
}

async function sendChatSystemMessage(content: string, eventType?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(chatMessages).values({
      agentId: 0,
      agentName: "🌍 世界之聲",
      agentElement: "earth",
      agentLevel: 99,
      content: content.slice(0, 100),
      msgType: "world_event",
      createdAt: Date.now(),
    });
    // WS 廣播世界事件（即時推送給所有連線玩家）
    try {
      broadcastToAll({
        type: "world_event",
        payload: { eventType: eventType ?? "world_event", content },
      });
      // 同時廣播聊天訊息
      broadcastToAll({
        type: "chat_message",
        payload: {
          id: Date.now(),
          agentId: 0,
          agentName: "🌍 世界之聲",
          agentElement: "earth",
          agentLevel: 99,
          content: content.slice(0, 100),
          msgType: "world_event",
          createdAt: Date.now(),
        },
      });
    } catch { }
  } catch (e) {
    console.error("[WorldTick] 聊天室系統訊息失敗：", e);
  }
}

// ─── 固定事件：所有玩家 +1 AP ───
async function processApRegen(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    const result = await db.execute(
      `UPDATE game_agents SET action_points = LEAST(max_action_points, action_points + 1), updated_at = ${Date.now()} WHERE is_active = 1`
    );
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    console.log(`[WorldTick] 固定事件：${affected} 位旅人獲得 +1 靈力值`);
    return affected;
  } catch (e) {
    console.error("[WorldTick] AP 回復失敗：", e);
    return 0;
  }
}

// ─── 隨機世界事件處理 ───
async function processWeatherChange(): Promise<void> {
  const newWeather = pickRandom(WUXING_LIST);
  const title = pickRandom(WEATHER_TITLES[newWeather]);
  const desc = `天地五行之氣轉換，${WUXING_NAMES[newWeather]}行能量主導當前世界！${WUXING_NAMES[newWeather]}行角色在此期間行動加成提升。`;

  worldState.currentWeather = newWeather;

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "weather_change",
      title,
      description: desc,
      affectedElement: newWeather,
      expiresAt: Date.now() + 30 * 60 * 1000, // 持續30分鐘
      createdAt: Date.now(),
    });
  }

  await sendWorldBroadcast(`🌤️ ${title}`, desc, 120);
  await sendChatSystemMessage(`🌤️ ${title}`);
  console.log(`[WorldTick] 天氣變化：${newWeather}`);
}

async function processGlobalBlessing(): Promise<void> {
  const blessing = pickRandom(BLESSING_TYPES);
  const expiresAt = Date.now() + 30 * 60 * 1000; // 持續到下次世界 Tick

  worldState.activeBlessing = {
    type: blessing.type,
    multiplier: blessing.multiplier,
    expiresAt,
  };

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "global_blessing",
      title: blessing.title,
      description: blessing.desc,
      blessingType: blessing.type,
      blessingMultiplier: blessing.multiplier,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  await sendWorldBroadcast(`✨ ${blessing.title}`, blessing.desc, 180);
  await sendChatSystemMessage(`✨ ${blessing.title}`);
  console.log(`[WorldTick] 全服祝福：${blessing.type} x${blessing.multiplier / 100}`);
}

async function processHiddenNpc(): Promise<void> {
  const availableNodes = MAP_NODES.filter(n => n.id !== "taipei_main");
  const targetNode = pickRandom(availableNodes);
  const npcType = pickRandom(NPC_TYPES);
  const expiresAt = Date.now() + 30 * 60 * 1000;

  worldState.activeHiddenNodes.push({
    nodeId: targetNode.id,
    type: "npc",
    title: npcType.title,
    expiresAt,
  });

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "hidden_npc",
      title: `${npcType.title}現身於${targetNode.name}`,
      description: npcType.desc,
      affectedNodeId: targetNode.id,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  await sendWorldBroadcast(
    `👤 神秘人物現身`,
    `據說在某個神秘之地出現了一位${npcType.title}，洞察力強的旅人或許能找到他…`,
    120
  );
  console.log(`[WorldTick] 隱藏 NPC：${npcType.title} 出現在 ${targetNode.name}`);
}

async function processHiddenQuest(): Promise<void> {
  const availableNodes = MAP_NODES.filter(n => n.id !== "taipei_main");
  const targetNode = pickRandom(availableNodes);
  const questType = pickRandom(QUEST_TYPES);
  const expiresAt = Date.now() + 30 * 60 * 1000;

  worldState.activeHiddenNodes.push({
    nodeId: targetNode.id,
    type: "quest",
    title: questType.title,
    expiresAt,
  });

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "hidden_quest",
      title: `限時任務：${questType.title}`,
      description: questType.desc,
      affectedNodeId: targetNode.id,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  await sendWorldBroadcast(
    `📜 限時任務出現`,
    `某個地方出現了一個緊急任務：「${questType.title}」，洞察力強的旅人能感知到任務的位置…`,
    120
  );
  console.log(`[WorldTick] 隱藏任務：${questType.title} 出現在 ${targetNode.name}`);
}

async function processElementalSurge(): Promise<void> {
  const element = pickRandom(WUXING_LIST);
  const type = Math.random() < 0.6 ? "boost" : "weaken";
  const expiresAt = Date.now() + 30 * 60 * 1000;

  worldState.elementalSurge = { element, type, expiresAt };

  const title = type === "boost"
    ? `${WUXING_NAMES[element]}行大旺！${WUXING_NAMES[element]}行旅人獲得強化`
    : `${WUXING_NAMES[element]}行衰弱…${WUXING_NAMES[element]}行旅人需謹慎行動`;
  const desc = type === "boost"
    ? `天地${WUXING_NAMES[element]}行之氣大旺，${WUXING_NAMES[element]}行屬性的旅人在此期間戰鬥力和採集效率大幅提升！`
    : `${WUXING_NAMES[element]}行之氣受到壓制，${WUXING_NAMES[element]}行屬性的旅人在此期間需要更加謹慎，建議暫時休息或切換策略。`;

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "elemental_surge",
      title,
      description: desc,
      affectedElement: element,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  await sendWorldBroadcast(`⚡ ${title}`, desc, 180);
  await sendChatSystemMessage(`⚡ ${title}`);
  console.log(`[WorldTick] 天災/祥瑞：${element} ${type}`);
}

async function processMeteorShower(): Promise<void> {
  worldState.meteorActive = true;

  const title = "流星雨降臨！所有旅人下次行動必觸奇遇";
  const desc = "璧燦的流星雨划過夜空，天地靈氣激跪，所有旅人在下次行動中必定觸發奇遇事件！";

  const db = await getDb();
  if (db) {
    await db.insert(worldEvents).values({
      eventType: "meteor_shower",
      title,
      description: desc,
      meteorActive: 1,
      expiresAt: Date.now() + 30 * 60 * 1000,
      createdAt: Date.now(),
    });
  }

  // 流星雨觸發密店：隨機選擇 2-4 個節點出現密店
  try {
    const { triggerHiddenShop } = await import("./worldResetEngine");
    const shopNodes = MAP_NODES.filter(n => n.dangerLevel && n.dangerLevel >= 3);
    const selectedNodes = shopNodes.sort(() => Math.random() - 0.5).slice(0, 3);
    for (const node of selectedNodes) {
      await triggerHiddenShop(node.id, "meteor_shower");
    }
    console.log(`[WorldTick] 流星雨觸發密店：${selectedNodes.map(n => n.name).join(", ")}`);
  } catch (err) {
    console.error("[WorldTick] 密店觸發失敗:", err);
  }

  await sendWorldBroadcast(`🌠 ${title}`, desc, 300);
  await sendChatSystemMessage(`🌠 流星雨降臨！多处神秘密店同時出現！`);
  console.log("[WorldTick] 流星雨降臨");
}

async function processDivineArrival(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 隨機選一位活躍玩家
  const agents = await db.select({ id: gameAgents.id, agentName: gameAgents.agentName })
    .from(gameAgents)
    .where(eq(gameAgents.isActive, 1))
    .limit(50);

  if (agents.length === 0) return;

  const chosen = pickRandom(agents);
  const blessingName = chosen.agentName ?? "旅人";

  // 給選中玩家 +50 金幣 + +20 HP
  await db.execute(
    `UPDATE game_agents SET gold = gold + 50, hp = LEAST(max_hp, hp + 20), updated_at = ${Date.now()} WHERE id = ${chosen.id}`
  );

  const title = `神明降臨！「${blessingName}」獲得神明祝福`;
  const desc = `神明的目光落在「${blessingName}」身上，賜予其 50 金幣與 20 點生命力的祝福！`;

  await db.insert(worldEvents).values({
    eventType: "divine_arrival",
    title,
    description: desc,
    expiresAt: null,
    createdAt: Date.now(),
  });

  await sendWorldBroadcast(`🌟 ${title}`, desc, 180);
  await sendChatSystemMessage(`🌟 ${title}`);
  console.log(`[WorldTick] 神明降臨：${blessingName} 獲得祝福`);
}

// ─── 主世界 Tick 函數 ───
export async function processWorldTick(triggeredBy?: string): Promise<{
  apRegen: number;
  worldEventType: string | null;
  worldEventTitle: string | null;
}> {
  console.log("[WorldTick] 開始執行世界 Tick...");
  worldState.lastWorldTickAt = Date.now();

  // 1. 固定事件：所有玩家 +1 AP
  const apRegen = await processApRegen();

  // 2. 隨機世界事件
  let worldEventType: string | null = null;
  let worldEventTitle: string | null = null;

  const cfg = worldEventConfig;
  const roll = Math.random() * 100;

  // 建立事件池（依機率排序）
  const eventPool: Array<{ type: string; prob: number; fn: () => Promise<void> }> = [];
  if (cfg.weatherChange.enabled)  eventPool.push({ type: "weather_change",  prob: cfg.weatherChange.probability,  fn: processWeatherChange });
  if (cfg.globalBlessing.enabled) eventPool.push({ type: "global_blessing", prob: cfg.globalBlessing.probability, fn: processGlobalBlessing });
  if (cfg.hiddenNpc.enabled)      eventPool.push({ type: "hidden_npc",      prob: cfg.hiddenNpc.probability,      fn: processHiddenNpc });
  if (cfg.hiddenQuest.enabled)    eventPool.push({ type: "hidden_quest",    prob: cfg.hiddenQuest.probability,    fn: processHiddenQuest });
  if (cfg.elementalSurge.enabled) eventPool.push({ type: "elemental_surge", prob: cfg.elementalSurge.probability, fn: processElementalSurge });
  if (cfg.meteorShower.enabled)   eventPool.push({ type: "meteor_shower",   prob: cfg.meteorShower.probability,   fn: processMeteorShower });
  if (cfg.divineArrival.enabled)  eventPool.push({ type: "divine_arrival",  prob: cfg.divineArrival.probability,  fn: processDivineArrival });

  // 累積機率選擇
  let cumulative = 0;
  for (const event of eventPool) {
    cumulative += event.prob;
    if (roll < cumulative) {
      try {
        await event.fn();
        worldEventType = event.type;
        worldEventTitle = event.type;
      } catch (e) {
        console.error(`[WorldTick] 世界事件 ${event.type} 執行失敗：`, e);
      }
      break;
    }
  }

  // 如果管理員手動觸發，記錄觸發者
  if (triggeredBy) {
    const db = await getDb();
    if (db) {
      await db.execute(
        `UPDATE world_events SET triggered_by = '${triggeredBy}' WHERE created_at > ${Date.now() - 5000} ORDER BY id DESC LIMIT 1`
      );
    }
  }

  console.log(`[WorldTick] 完成：${apRegen} 位旅人獲得 +1 AP，世界事件：${worldEventType ?? "無"}`);
  return { apRegen, worldEventType, worldEventTitle };
}

// ─── 世界 Tick 引擎啟停 ───
const WORLD_TICK_INTERVAL = 30 * 60 * 1000; // 30 分鐘
let worldTickInterval: ReturnType<typeof setInterval> | null = null;

export function startWorldTickEngine(): void {
  if (worldTickInterval) return;
  console.log("[WorldTickEngine] 啟動世界 Tick 引擎，間隔 30 分鐘");
  worldTickInterval = setInterval(async () => {
    try {
      await processWorldTick();
    } catch (err) {
      console.error("[WorldTickEngine] 世界 Tick 錯誤：", err);
    }
  }, WORLD_TICK_INTERVAL);
}

export function stopWorldTickEngine(): void {
  if (worldTickInterval) {
    clearInterval(worldTickInterval);
    worldTickInterval = null;
    console.log("[WorldTickEngine] 已停止");
  }
}

export function isWorldTickRunning(): boolean {
  return worldTickInterval !== null;
}

// ─── 週冠軍頒發系統 ───
export async function processWeeklyChampions(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const weekKey = `${year}-${String(weekNum).padStart(2, "0")}`;

  const existing = await db.select({ id: weeklyChampions.id })
    .from(weeklyChampions).where(eq(weeklyChampions.weekKey, weekKey)).limit(1);
  if (existing.length > 0) return;

  const levelChampRows = await db.select({
    id: gameAgents.id, agentName: gameAgents.agentName, level: gameAgents.level, exp: gameAgents.exp,
  }).from(gameAgents)
    .where(sql`${gameAgents.isNamed} = 1`)
    .orderBy(desc(gameAgents.level), desc(gameAgents.exp))
    .limit(1);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const combatRankRows = await db.select({
    agentId: agentEvents.agentId,
    combatCount: count(agentEvents.id).as("combat_count"),
  }).from(agentEvents)
    .where(and(eq(agentEvents.eventType, "combat"), gt(agentEvents.createdAt, weekAgo)))
    .groupBy(agentEvents.agentId)
    .orderBy(desc(sql`combat_count`))
    .limit(1);

  const ensureTitle = async (key: string, name: string, titleDesc: string, color: string) => {
    const ex = await db.select({ id: gameTitles.id }).from(gameTitles).where(eq(gameTitles.titleKey, key)).limit(1);
    if (ex.length === 0) {
      await db.insert(gameTitles).values({ titleKey: key, titleName: name, titleDesc, titleType: "event", color, createdAt: Date.now() });
    }
  };

  if (levelChampRows[0]) {
    const champ = levelChampRows[0];
    await db.insert(weeklyChampions).values({ weekKey, championType: "level", agentId: champ.id, agentName: champ.agentName ?? "旅人", score: champ.level, badgeGranted: 0, createdAt: Date.now() });
    const titleKey = `weekly_level_champ_${weekKey}`;
    await ensureTitle(titleKey, `⭐ ${weekKey} 等級冠軍`, `${weekKey} 週等級排行榜第一名`, "#f59e0b");
    const has = await db.select({ id: agentTitles.id }).from(agentTitles)
      .where(and(eq(agentTitles.agentId, champ.id), eq(agentTitles.titleKey, titleKey))).limit(1);
    if (has.length === 0) await db.insert(agentTitles).values({ agentId: champ.id, titleKey, isEquipped: 0, acquiredAt: Date.now() });
    await sendWorldBroadcast(`⭐ 週冠軍領發`, `恭喜 ${champ.agentName ?? "旅人"} 獲得 ${weekKey} 週等級冠軍稱號！`, 120);
    try { broadcastWeeklyChampion({ agentName: champ.agentName ?? "旅人", agentElement: "earth", agentLevel: champ.level, category: "level" }); } catch { }
  }

  if (combatRankRows[0]) {
    const agentRow = await db.select({ id: gameAgents.id, agentName: gameAgents.agentName, isNamed: gameAgents.isNamed })
      .from(gameAgents).where(eq(gameAgents.id, combatRankRows[0].agentId)).limit(1);
    if (agentRow[0]?.isNamed) {
      const champ = agentRow[0];
      await db.insert(weeklyChampions).values({ weekKey, championType: "combat", agentId: champ.id, agentName: champ.agentName ?? "旅人", score: Number(combatRankRows[0].combatCount), badgeGranted: 0, createdAt: Date.now() });
      const titleKey = `weekly_combat_champ_${weekKey}`;
      await ensureTitle(titleKey, `⚔️ ${weekKey} 戰鬥王`, `${weekKey} 週戰鬥場次排行榜第一名`, "#ef4444");
      const has = await db.select({ id: agentTitles.id }).from(agentTitles)
        .where(and(eq(agentTitles.agentId, champ.id), eq(agentTitles.titleKey, titleKey))).limit(1);
      if (has.length === 0) await db.insert(agentTitles).values({ agentId: champ.id, titleKey, isEquipped: 0, acquiredAt: Date.now() });
      await sendWorldBroadcast(`⚔️ 週冠軍領發`, `恭喜 ${champ.agentName ?? "旅人"} 獲得 ${weekKey} 週戰鬥王稱號！`, 120);
      try { broadcastWeeklyChampion({ agentName: champ.agentName ?? "旅人", agentElement: "fire", agentLevel: 0, category: "combat" }); } catch { }
    }
  }

  console.log(`[WorldTickEngine] 週冠軍頒發完成 ${weekKey}`);
}
