/**
 * hiddenEventEngine.ts
 * 隱藏事件引擎：密店 / 隱藏NPC / 隱藏任務 的隨機生成與管理
 *
 * 設計原則：
 * - 事件不固定在某個節點，每次 Tick 隨機選取節點生成
 * - 每個事件有 remainingTicks（預設 5），每次 Tick 遞減，歸零後消失
 * - 玩家的 treasureHunting（洞察力）決定感知機率
 * - 全地圖同時存在的隱藏事件數量上限：10 個
 */

import { getDb } from "./db";
import { gameHiddenEvents } from "../drizzle/schema";
import { MAP_NODES } from "../shared/mapNodes";
import { eq, lt } from "drizzle-orm";

// ─── 密店商品池 ───────────────────────────────────────────────
const HIDDEN_SHOP_ITEMS = [
  { id: "rare-herb-001",   name: "靈魂草",     price: 50,  currency: "gold", rarity: "rare",  emoji: "🌿" },
  { id: "rare-herb-002",   name: "天靈根",     price: 80,  currency: "gold", rarity: "epic",  emoji: "🍀" },
  { id: "rare-mat-001",    name: "龍晶碎片",   price: 120, currency: "gold", rarity: "rare",  emoji: "💎" },
  { id: "rare-mat-002",    name: "鳳凰羽毛",   price: 200, currency: "gold", rarity: "epic",  emoji: "🪶" },
  { id: "skill-book-001",  name: "初階技能書（木）", price: 100, currency: "gold", rarity: "uncommon", emoji: "📖" },
  { id: "skill-book-002",  name: "初階技能書（火）", price: 100, currency: "gold", rarity: "uncommon", emoji: "📕" },
  { id: "skill-book-003",  name: "初階技能書（水）", price: 100, currency: "gold", rarity: "uncommon", emoji: "📘" },
  { id: "equip-ring-001",  name: "靈氣指環",   price: 150, currency: "gold", rarity: "rare",  emoji: "💍" },
  { id: "consumable-001",  name: "大回血藥",   price: 30,  currency: "gold", rarity: "common", emoji: "🧪" },
  { id: "consumable-002",  name: "靈力丹",     price: 40,  currency: "gold", rarity: "uncommon", emoji: "💊" },
];

// ─── 隱藏 NPC 對話池 ───────────────────────────────────────────
const HIDDEN_NPC_POOL = [
  {
    npcId: "mysterious-merchant",
    name: "神秘行商",
    emoji: "🧙",
    dialogue: "旅人，我看你骨骼清奇，有緣人才能見到我。我這裡有些特別的東西……",
    reward: { type: "item", itemId: "rare-herb-001", quantity: 1 },
    questHint: "聽說城北有一座古廟，裡面封印著上古靈獸……",
  },
  {
    npcId: "lost-scholar",
    name: "迷路學者",
    emoji: "📚",
    dialogue: "啊，終於遇到人了！我在研究這片土地的五行脈絡，你能幫我嗎？",
    reward: { type: "exp", amount: 50 },
    questHint: "五行之中，水克火，火克金，金克木，木克土，土克水……此乃天道循環。",
  },
  {
    npcId: "spirit-guardian",
    name: "靈域守護者",
    emoji: "👻",
    dialogue: "你的靈氣感知力很強，才能看見我。我守護這片土地已有千年……",
    reward: { type: "buff", buffId: "perception-boost", duration: 3 },
    questHint: "此地靈脈匯聚，若能在此修煉，必有所得。",
  },
  {
    npcId: "wandering-alchemist",
    name: "流浪煉金師",
    emoji: "⚗️",
    dialogue: "哦？你也是修行者？我正好缺少幾種材料，你若能幫我，我以秘方相贈。",
    reward: { type: "recipe", recipeId: "basic-potion" },
    questHint: "煉金之術，在於平衡五行。木生火，火生土，土生金，金生水，水生木……",
  },
];

// ─── 隱藏任務池 ───────────────────────────────────────────────
const HIDDEN_QUEST_POOL = [
  {
    questId: "find-ancient-relic",
    title: "尋找古代遺物",
    desc: "傳說此地曾有一件古代靈器被封印，你能找到它嗎？",
    objective: { type: "explore", count: 3 },
    reward: { exp: 100, gold: 50, item: "rare-mat-001" },
    emoji: "🏺",
  },
  {
    questId: "defeat-shadow-beast",
    title: "討伐影獸",
    desc: "最近此地出現了一種奇異的影獸，請將其消滅。",
    objective: { type: "combat", target: "shadow-beast", count: 1 },
    reward: { exp: 150, gold: 80 },
    emoji: "⚔️",
  },
  {
    questId: "collect-spirit-herbs",
    title: "採集靈草",
    desc: "神秘老人需要三株靈草，你願意幫忙嗎？",
    objective: { type: "gather", itemId: "herb-001", count: 3 },
    reward: { exp: 80, gold: 30, item: "skill-book-001" },
    emoji: "🌿",
  },
  {
    questId: "deliver-message",
    title: "傳遞訊息",
    desc: "有人委託你將一封信件送到另一個節點。",
    objective: { type: "move", targetNodeId: "random" },
    reward: { exp: 60, gold: 40 },
    emoji: "📜",
  },
];

// ─── 工具函數 ─────────────────────────────────────────────────
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── 主函數：每次 Tick 呼叫 ───────────────────────────────────
export async function processHiddenEvents(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = Date.now();

  // 1. 遞減現有事件的 remainingTicks，清除過期事件
  const allEvents = await db.select().from(gameHiddenEvents);
  for (const evt of allEvents) {
    if (evt.remainingTicks <= 1 || evt.expiresAt <= now) {
      await db.delete(gameHiddenEvents).where(eq(gameHiddenEvents.id, evt.id));
    } else {
      await db.update(gameHiddenEvents)
        .set({ remainingTicks: evt.remainingTicks - 1 })
        .where(eq(gameHiddenEvents.id, evt.id));
    }
  }

  // 2. 計算目前有效事件數量
  const validEvents = allEvents.filter(e => e.remainingTicks > 1 && e.expiresAt > now);
  const MAX_EVENTS = 10;
  if (validEvents.length >= MAX_EVENTS) return;

  // 3. 隨機決定是否生成新事件（每次 Tick 有 40% 機率生成 1-2 個新事件）
  if (Math.random() > 0.4) return;

  const newEventCount = randomInt(1, 2);
  const usedNodes = new Set(validEvents.map(e => e.nodeId));

  for (let i = 0; i < newEventCount; i++) {
    // 選取未使用的隨機節點
    const availableNodes = MAP_NODES.filter(n => !usedNodes.has(n.id));
    if (availableNodes.length === 0) break;

    const targetNode = randomItem(availableNodes);
    usedNodes.add(targetNode.id);

    // 隨機決定事件類型（密店 40%, 隱藏NPC 35%, 隱藏任務 25%）
    const roll = Math.random();
    let eventType: "hidden_shop" | "hidden_npc" | "hidden_quest";
    let eventData: object;
    let perceptionThreshold: number;

    if (roll < 0.4) {
      // 密店：隨機選取 3-5 個商品
      eventType = "hidden_shop";
      const shopItems = [...HIDDEN_SHOP_ITEMS].sort(() => Math.random() - 0.5).slice(0, randomInt(3, 5));
      eventData = {
        shopName: randomItem(["神秘行商", "流浪商人", "靈域密市", "天機商行"]),
        emoji: "🏪",
        items: shopItems,
        discount: Math.random() < 0.3 ? randomInt(10, 30) : 0, // 30% 機率有折扣
      };
      perceptionThreshold = randomInt(20, 50);
    } else if (roll < 0.75) {
      // 隱藏 NPC
      eventType = "hidden_npc";
      const npc = randomItem(HIDDEN_NPC_POOL);
      eventData = { ...npc };
      perceptionThreshold = randomInt(25, 55);
    } else {
      // 隱藏任務
      eventType = "hidden_quest";
      const quest = randomItem(HIDDEN_QUEST_POOL);
      eventData = { ...quest };
      perceptionThreshold = randomInt(30, 60);
    }

    const remainingTicks = randomInt(3, 7);
    const expiresAt = now + remainingTicks * 20 * 60 * 1000; // 每 Tick 約 20 分鐘

    await db.insert(gameHiddenEvents).values({
      nodeId: targetNode.id,
      eventType,
      eventData: eventData as any,
      perceptionThreshold,
      remainingTicks,
      isDiscovered: 0,
      createdAt: now,
      expiresAt,
    });
  }
}
