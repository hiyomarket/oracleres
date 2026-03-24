/**
 * 世界重置引擎 worldResetEngine.ts
 * V34 新增：格式化世界並重新啟動新世界
 *
 * 重置流程：
 * 1. 停止世界 Tick 引擎
 * 2. 清除所有角色資料（保留帳號）
 * 3. 清除世界事件歷史
 * 4. 清除聊天訊息
 * 5. 清除 PvP 戰績
 * 6. 清除週冠軍記錄
 * 7. 清除成就記錄
 * 8. 初始化基礎商店商品
 * 9. 初始化隱藏商店商品池
 * 10. 重啟世界 Tick 引擎
 * 11. 廣播新世界誕生
 */

import { getDb } from "./db";
import { broadcastToAll } from "./wsServer";
import { broadcastLiveFeed } from "./liveFeedBroadcast";
import {
  gameAgents,
  agentEvents,
  agentInventory,
  agentDropCounters,
  worldEvents,
  chatMessages,
  pvpChallenges,
  agentPvpStats,
  weeklyChampions,
  hiddenShopInstances,
  gameVirtualShop,
  gameHiddenShopPool,
} from "../drizzle/schema";
import { sql } from "drizzle-orm";
import { stopWorldTickEngine, startWorldTickEngine } from "./worldTickEngine";
import { restartTickEngine } from "./tickEngine";

// ─── 基礎商店初始化商品清單 ───────────────────────────────────
// 每次世界重置後，基礎商店必定包含這些商品
const BASE_SHOP_ITEMS: Array<{
  itemKey: string;
  displayName: string;
  description: string;
  priceCoins: number;
  quantity: number;
  stock: number;
  sortOrder: number;
}> = [
  // ── 消耗品 ──
  {
    itemKey: "potion_small",
    displayName: "小回復藥",
    description: "恢復 30 點 HP，旅人必備的基礎補給品。",
    priceCoins: 50,
    quantity: 1,
    stock: -1,
    sortOrder: 1,
  },
  {
    itemKey: "potion_medium",
    displayName: "中回復藥",
    description: "恢復 80 點 HP，適合中途補給。",
    priceCoins: 120,
    quantity: 1,
    stock: -1,
    sortOrder: 2,
  },
  {
    itemKey: "potion_large",
    displayName: "大回復藥",
    description: "恢復 200 點 HP，長途旅行的必備良藥。",
    priceCoins: 280,
    quantity: 1,
    stock: -1,
    sortOrder: 3,
  },
  {
    itemKey: "mp_potion_small",
    displayName: "靈力小藥",
    description: "恢復 20 點 MP，補充元素能量。",
    priceCoins: 60,
    quantity: 1,
    stock: -1,
    sortOrder: 4,
  },
  {
    itemKey: "stamina_elixir",
    displayName: "體力靈液",
    description: "立即恢復 30 點體力，讓旅人繼續前行。",
    priceCoins: 80,
    quantity: 1,
    stock: -1,
    sortOrder: 5,
  },
  {
    itemKey: "antidote",
    displayName: "解毒藥",
    description: "解除中毒狀態，在毒沼地帶旅行的必備品。",
    priceCoins: 40,
    quantity: 1,
    stock: -1,
    sortOrder: 6,
  },
  // ── 道具 ──
  {
    itemKey: "map_fragment",
    displayName: "地圖碎片",
    description: "揭示附近隱藏節點的線索，尋寶必備。",
    priceCoins: 200,
    quantity: 1,
    stock: -1,
    sortOrder: 10,
  },
  {
    itemKey: "compass",
    displayName: "羅盤",
    description: "提升下次移動的方向感知，減少體力消耗 1 點。",
    priceCoins: 150,
    quantity: 1,
    stock: -1,
    sortOrder: 11,
  },
  {
    itemKey: "incense_stick",
    displayName: "靈香",
    description: "點燃後吸引附近的靈獸，增加戰鬥機率 20%。",
    priceCoins: 100,
    quantity: 1,
    stock: -1,
    sortOrder: 12,
  },
  {
    itemKey: "gathering_kit",
    displayName: "採集工具包",
    description: "提升採集力 +5，持續 10 次採集行動。",
    priceCoins: 180,
    quantity: 1,
    stock: -1,
    sortOrder: 13,
  },
  // ── 裝備（基礎） ──
  {
    itemKey: "iron_sword",
    displayName: "鐵劍",
    description: "普通的鐵製長劍，攻擊力 +8。適合初入江湖的旅人。",
    priceCoins: 300,
    quantity: 1,
    stock: 5,
    sortOrder: 20,
  },
  {
    itemKey: "leather_armor",
    displayName: "皮革護甲",
    description: "輕便的皮革護甲，防禦力 +6。",
    priceCoins: 250,
    quantity: 1,
    stock: 5,
    sortOrder: 21,
  },
  {
    itemKey: "wooden_shield",
    displayName: "木製盾牌",
    description: "簡單的木製盾牌，防禦力 +4，HP +10。",
    priceCoins: 200,
    quantity: 1,
    stock: 5,
    sortOrder: 22,
  },
  {
    itemKey: "cloth_robe",
    displayName: "布衣法袍",
    description: "魔法師的入門法袍，魔法攻擊 +5，MP +20。",
    priceCoins: 280,
    quantity: 1,
    stock: 5,
    sortOrder: 23,
  },
  {
    itemKey: "iron_boots",
    displayName: "鐵製靴子",
    description: "堅固的鐵製靴子，速度 +3，防禦力 +2。",
    priceCoins: 180,
    quantity: 1,
    stock: 5,
    sortOrder: 24,
  },
  // ── 素材 ──
  {
    itemKey: "wood_essence",
    displayName: "木之精華",
    description: "木屬性素材，用於製作木系裝備和技能書。",
    priceCoins: 30,
    quantity: 3,
    stock: -1,
    sortOrder: 30,
  },
  {
    itemKey: "fire_crystal",
    displayName: "火晶石",
    description: "火屬性素材，用於強化火系裝備。",
    priceCoins: 35,
    quantity: 3,
    stock: -1,
    sortOrder: 31,
  },
  {
    itemKey: "earth_ore",
    displayName: "土靈礦石",
    description: "土屬性素材，用於鍛造防禦型裝備。",
    priceCoins: 25,
    quantity: 3,
    stock: -1,
    sortOrder: 32,
  },
  {
    itemKey: "metal_shard",
    displayName: "金屬碎片",
    description: "金屬性素材，用於製作精準型武器。",
    priceCoins: 40,
    quantity: 3,
    stock: -1,
    sortOrder: 33,
  },
  {
    itemKey: "water_pearl",
    displayName: "水靈珠",
    description: "水屬性素材，用於製作魔法型裝備和技能書。",
    priceCoins: 35,
    quantity: 3,
    stock: -1,
    sortOrder: 34,
  },
];

// ─── 隱藏商店商品池初始化清單 ────────────────────────────────
// 隱藏商店出現條件：
//   - 世界 Tick 觸發（每 6 次 Tick，15% 機率）
//   - 玩家探索特定節點（尋寶力 >= 30 時，10% 機率）
//   - 流星雨事件發生後（固定觸發）
// 隱藏商店持續時間：30 分鐘後自動消失
const HIDDEN_SHOP_POOL: Array<{
  itemKey: string;
  displayName: string;
  description: string;
  currencyType: "coins" | "stones";
  price: number;
  quantity: number;
  weight: number;
  rarity: "common" | "rare" | "epic" | "legendary";
}> = [
  // ── 稀有消耗品（高權重） ──
  {
    itemKey: "elixir_of_fortune",
    displayName: "幸運靈藥",
    description: "飲用後 3 次戰鬥內掉落率 +30%，極為罕見。",
    currencyType: "coins",
    price: 800,
    quantity: 1,
    weight: 30,
    rarity: "rare",
  },
  {
    itemKey: "speed_talisman",
    displayName: "疾行符",
    description: "使用後下次移動體力消耗減半（一次性）。",
    currencyType: "coins",
    price: 500,
    quantity: 2,
    weight: 40,
    rarity: "rare",
  },
  {
    itemKey: "revival_stone",
    displayName: "復生石",
    description: "HP 歸零時自動觸發，恢復至 50% HP（一次性）。",
    currencyType: "coins",
    price: 1200,
    quantity: 1,
    weight: 20,
    rarity: "epic",
  },
  {
    itemKey: "exp_scroll",
    displayName: "悟道卷軸",
    description: "使用後獲得 500 點額外經驗值。",
    currencyType: "coins",
    price: 600,
    quantity: 1,
    weight: 35,
    rarity: "rare",
  },
  // ── 稀有裝備（中權重） ──
  {
    itemKey: "jade_pendant",
    displayName: "翡翠玉佩",
    description: "木屬性護符，HP +50，治癒力 +15，採集力 +10。",
    currencyType: "coins",
    price: 1500,
    quantity: 1,
    weight: 15,
    rarity: "rare",
  },
  {
    itemKey: "flame_ring",
    displayName: "烈焰指環",
    description: "火屬性戒指，攻擊力 +20，魔法攻擊 +15。",
    currencyType: "coins",
    price: 1800,
    quantity: 1,
    weight: 12,
    rarity: "rare",
  },
  {
    itemKey: "shadow_cloak",
    displayName: "暗影披風",
    description: "金屬性護甲，防禦力 +25，速度 +10，有 10% 機率迴避攻擊。",
    currencyType: "coins",
    price: 2200,
    quantity: 1,
    weight: 10,
    rarity: "epic",
  },
  {
    itemKey: "water_staff",
    displayName: "水靈法杖",
    description: "水屬性武器，魔法攻擊 +35，MP +40，水系技能傷害 +20%。",
    currencyType: "coins",
    price: 2500,
    quantity: 1,
    weight: 8,
    rarity: "epic",
  },
  // ── 技能書（低權重） ──
  {
    itemKey: "skill_book_wood_heal",
    displayName: "《春風愈傈》技能書",
    description: "學習木屬性治癒技能，戰鬥中可恢復 20% HP。",
    currencyType: "coins",
    price: 1000,
    quantity: 1,
    weight: 20,
    rarity: "rare",
  },
  {
    itemKey: "skill_book_fire_burst",
    displayName: "《爆烎衝波》技能書",
    description: "學習火屬性範圍攻擊技能，消耗 MP 造成群體傷害。",
    currencyType: "coins",
    price: 1000,
    quantity: 1,
    weight: 20,
    rarity: "rare",
  },
  {
    itemKey: "skill_book_metal_pierce",
    displayName: "《穿雲一擊》技能書",
    description: "學習金屬性穿透技能，忠實命中造成 150% 傷害。",
    currencyType: "coins",
    price: 1200,
    quantity: 1,
    weight: 15,
    rarity: "rare",
  },
  // ── 傳說道具（極低權重） ──
  {
    itemKey: "destiny_orb",
    displayName: "命格水晶球",
    description: "傳說道具，使用後重新抽取命格屬性（保留等級）。",
    currencyType: "stones",
    price: 50,
    quantity: 1,
    weight: 3,
    rarity: "legendary",
  },
  {
    itemKey: "world_tree_seed",
    displayName: "世界樹種子",
    description: "傳說素材，用於覺醒最高階木屬性技能。",
    currencyType: "stones",
    price: 30,
    quantity: 1,
    weight: 2,
    rarity: "legendary",
  },
  {
    itemKey: "phoenix_feather",
    displayName: "鳳凰羽毛",
    description: "傳說素材，用於覺醒最高階火屬性技能。",
    currencyType: "stones",
    price: 30,
    quantity: 1,
    weight: 2,
    rarity: "legendary",
  },
];

// ─── 隱藏商店觸發機制 ────────────────────────────────────────
export interface HiddenShopTriggerConfig {
  worldTickChance: number;    // 世界 Tick 觸發機率（0-1）
  worldTickInterval: number;  // 每幾次 Tick 才判斷一次
  exploreChance: number;      // 探索觸發機率（需尋寶力 >= 30）
  meteorShowerForced: boolean; // 流星雨事件強制觸發
  durationMs: number;         // 持續時間（毫秒）
  maxItemsPerShop: number;    // 每家隱藏商店最多幾種商品
  maxActiveShops: number;     // 同時最多幾家隱藏商店
}

export const DEFAULT_HIDDEN_SHOP_CONFIG: HiddenShopTriggerConfig = {
  worldTickChance: 0.15,
  worldTickInterval: 6,
  exploreChance: 0.10,
  meteorShowerForced: true,
  durationMs: 30 * 60 * 1000, // 30 分鐘
  maxItemsPerShop: 5,
  maxActiveShops: 3,
};

/**
 * 從商品池中隨機抽取商品（加權隨機）
 */
async function rollHiddenShopItems(
  pool: typeof gameHiddenShopPool.$inferSelect[],
  count: number
): Promise<Array<{ itemId: number; price: number; quantity: number }>> {
  if (pool.length === 0) return [];
  // 加權隨機選取
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  const selected: Set<number> = new Set();
  const result: Array<{ itemId: number; price: number; quantity: number }> = [];
  const maxAttempts = count * 5;
  let attempts = 0;
  while (result.length < count && attempts < maxAttempts) {
    attempts++;
    let rand = Math.random() * totalWeight;
    for (const item of pool) {
      rand -= item.weight;
      if (rand <= 0 && !selected.has(item.id)) {
        selected.add(item.id);
        result.push({ itemId: item.id, price: item.price, quantity: item.quantity });
        break;
      }
    }
  }
  return result;
}

/**
 * 觸發隱藏商店（在指定節點生成一個隱藏商店實例）
 */
export async function triggerHiddenShop(
  nodeId: string,
  reason: "world_tick" | "node_explore" | "meteor_shower",
  config: HiddenShopTriggerConfig = DEFAULT_HIDDEN_SHOP_CONFIG
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  // 檢查是否已達到最大同時隱藏商店數量
  const now = Date.now();
  const activeShops = await db
    .select()
    .from(hiddenShopInstances)
    .where(sql`is_closed = 0 AND expires_at > ${now}`);
  if (activeShops.length >= config.maxActiveShops) return false;
  // 從商品池中抽取商品
  const pool = await db.select().from(gameHiddenShopPool).where(sql`is_active = 1`);
  if (pool.length === 0) return false;
  const items = await rollHiddenShopItems(pool, config.maxItemsPerShop);
  if (items.length === 0) return false;
  // 建立隱藏商店實例
  const expiresAt = now + config.durationMs;
  await db.insert(hiddenShopInstances).values({
    nodeId,
    triggerReason: reason,
    items,
    startAt: now,
    expiresAt,
    isClosed: 0,
  });
  // 廣播隱藏商店出現
  const nodeNames: Record<string, string> = {
    "meteor_shower": "流星雨降臨",
    "world_tick": "天機感應",
    "node_explore": "探索發現",
  };
  broadcastToAll({
    type: "world_event",
    payload: {
      title: "🏪 密店現身！",
      content: `${nodeNames[reason] || "神秘力量"}在某處節點召喚了一家密店，限時 30 分鐘！`,
      nodeId,
      expiresAt,
    },
  });
  broadcastLiveFeed({
    feedType: "world_event",
    agentName: "天命系統",
    agentElement: "wood",
    detail: `密店在某節點出現（${reason}觸發），限時 30 分鐘`,
    icon: "🎪",
  });
  return true;
}

/**
 * 清除過期的隱藏商店實例
 */
export async function cleanExpiredHiddenShops(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const now = Date.now();
  const result = await db
    .update(hiddenShopInstances)
    .set({ isClosed: 1 })
    .where(sql`is_closed = 0 AND expires_at < ${now}`);
  return (result as unknown as { affectedRows?: number }).affectedRows ?? 0;
}

// ─── 世界重置主函數 ──────────────────────────────────────────
export interface WorldResetResult {
  success: boolean;
  agentsCleared: number;
  eventsCleared: number;
  chatCleared: number;
  pvpCleared: number;
  shopItemsAdded: number;
  hiddenPoolAdded: number;
  errors: string[];
}

export async function resetWorld(): Promise<WorldResetResult> {
  const db = await getDb();
  if (!db) return { success: false, agentsCleared: 0, eventsCleared: 0, chatCleared: 0, pvpCleared: 0, shopItemsAdded: 0, hiddenPoolAdded: 0, errors: ["DB not available"] };

  const errors: string[] = [];
  let agentsCleared = 0;
  let eventsCleared = 0;
  let chatCleared = 0;
  let pvpCleared = 0;
  let shopItemsAdded = 0;
  let hiddenPoolAdded = 0;

  // 1. 停止世界 Tick 引擎
  try {
    stopWorldTickEngine();
  } catch (e) {
    errors.push(`停止 Tick 引擎失敗: ${e}`);
  }

  // 2. 清除所有角色資料（保留 users 帳號）
  try {
    const agents = await db.select({ id: gameAgents.id }).from(gameAgents);
    agentsCleared = agents.length;
    // 清除角色相關資料
    await db.delete(agentInventory);
    await db.delete(agentEvents);
    await db.delete(agentDropCounters);
    // 清除角色本身（玩家重新登入時會自動重新建立）
    await db.delete(gameAgents);
  } catch (e) {
    errors.push(`清除角色失敗: ${e}`);
  }

  // 3. 清除世界事件歷史
  try {
    const result = await db.delete(worldEvents);
    eventsCleared = (result as unknown as { affectedRows?: number }).affectedRows ?? 0;
  } catch (e) {
    errors.push(`清除世界事件失敗: ${e}`);
  }

  // 4. 清除聊天訊息
  try {
    const result = await db.delete(chatMessages);
    chatCleared = (result as unknown as { affectedRows?: number }).affectedRows ?? 0;
  } catch (e) {
    errors.push(`清除聊天訊息失敗: ${e}`);
  }

  // 5. 清除 PvP 戰績和週冠軍
  try {
    await db.delete(pvpChallenges);
    await db.delete(agentPvpStats);
    await db.delete(weeklyChampions);
    pvpCleared = 1;
  } catch (e) {
    errors.push(`清除 PvP 資料失敗: ${e}`);
  }

  // 6. 清除隱藏商店實例
  try {
    await db.delete(hiddenShopInstances);
  } catch (e) {
    errors.push(`清除隱藏商店失敗: ${e}`);
  }

  // 7. 重置基礎商店（清除舊商品，插入初始商品）
  try {
    await db.delete(gameVirtualShop);
    for (const item of BASE_SHOP_ITEMS) {
      await db.insert(gameVirtualShop).values({
        ...item,
        isOnSale: 1,
        createdAt: Date.now(),
      });
      shopItemsAdded++;
    }
  } catch (e) {
    errors.push(`初始化基礎商店失敗: ${e}`);
  }

  // 8. 初始化隱藏商店商品池（如果為空則插入）
  try {
    const existingPool = await db.select({ id: gameHiddenShopPool.id }).from(gameHiddenShopPool).limit(1);
    if (existingPool.length === 0) {
      for (const item of HIDDEN_SHOP_POOL) {
        await db.insert(gameHiddenShopPool).values({
          ...item,
          isActive: 1,
          createdAt: Date.now(),
        });
        hiddenPoolAdded++;
      }
    } else {
      hiddenPoolAdded = -1; // 已存在，跳過
    }
  } catch (e) {
    errors.push(`初始化隱藏商店池失敗: ${e}`);
  }

  // 9. 重啟 Tick 引擎
  try {
    restartTickEngine();
    startWorldTickEngine();
  } catch (e) {
    errors.push(`重啟引擎失敗: ${e}`);
  }

  // 10. 廣播新世界誕生
  try {
    broadcastToAll({
      type: "world_event",
      payload: {
        title: "🌍 新世界誕生！",
        content: "天命重啟，命格洗牌！所有旅人請重新命名，踏上全新的命格之旅！",
        isWorldReset: true,
      },
    });
    broadcastLiveFeed({
      feedType: "world_event",
      agentName: "天命系統",
      agentElement: "wood",
      detail: "天命重啟！所有旅人請重新命名，踏上全新的命格之旅！",
      icon: "🌍",
    });
  } catch (e) {
    errors.push(`廣播失敗: ${e}`);
  }

  return {
    success: errors.length === 0,
    agentsCleared,
    eventsCleared,
    chatCleared,
    pvpCleared,
    shopItemsAdded,
    hiddenPoolAdded,
    errors,
  };
}
