/**
 * ═══════════════════════════════════════════════════════════════
 * 移動式 Boss 引擎 (Roaming Boss Engine)
 * ═══════════════════════════════════════════════════════════════
 *
 * 負責 Boss 的生成、移動、消亡、狀態查詢
 * 整合到 afkTickEngine 中每 tick 自動處理
 *
 * Tier 1: 遊蕩精英（常駐，縣市內巡迴）
 * Tier 2: 區域守護者（定時刷新，跨縣市移動）
 * Tier 3: 天命凶獸（特殊觸發，全島巡迴）
 */

import { getDb } from "../db";
import { roamingBossCatalog, roamingBossInstances, roamingBossKillLog } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { MAP_NODES, type MapNode } from "../../shared/mapNodes";
import { broadcastLiveFeed } from "../liveFeedBroadcast";

// ═══════════════════════════════════════════════════════════════
// Boss 引擎配置（記憶體，可後台即時調整）
// ═══════════════════════════════════════════════════════════════

export interface RoamingBossConfig {
  /** 是否啟用 Boss 系統 */
  enabled: boolean;
  /** Tier 1 同時存在最大數量 */
  tier1MaxInstances: number;
  /** Tier 2 同時存在最大數量 */
  tier2MaxInstances: number;
  /** Tier 3 同時存在最大數量 */
  tier3MaxInstances: number;
  /** Tier 3 觸發條件：全服累計擊殺 Tier 1 次數 */
  tier3TriggerKillCount: number;
  /** Boss 移動檢查間隔（秒，與 afkTick 同步） */
  moveCheckIntervalSec: number;
  /** 全服首殺額外經驗倍率 */
  firstKillExpBonus: number;
  /** 全服首殺額外金幣倍率 */
  firstKillGoldBonus: number;
}

const DEFAULT_BOSS_CONFIG: RoamingBossConfig = {
  enabled: true,
  tier1MaxInstances: 5,
  tier2MaxInstances: 1,
  tier3MaxInstances: 1,
  tier3TriggerKillCount: 100,
  moveCheckIntervalSec: 15,
  firstKillExpBonus: 2.0,
  firstKillGoldBonus: 2.0,
};

let _bossConfig: RoamingBossConfig = { ...DEFAULT_BOSS_CONFIG };

export function getBossConfig(): Readonly<RoamingBossConfig> {
  return _bossConfig;
}

export function updateBossConfig(patch: Partial<RoamingBossConfig>): RoamingBossConfig {
  _bossConfig = { ..._bossConfig, ...patch };
  console.log("[RoamingBoss] 配置已更新:", patch);
  return _bossConfig;
}

export function resetBossConfig(): RoamingBossConfig {
  _bossConfig = { ...DEFAULT_BOSS_CONFIG };
  console.log("[RoamingBoss] 配置已重置");
  return _bossConfig;
}

// ═══════════════════════════════════════════════════════════════
// 地圖工具函數
// ═══════════════════════════════════════════════════════════════

const nodeMap = new Map<string, MapNode>();
MAP_NODES.forEach(n => nodeMap.set(n.id, n));

/** 取得節點的鄰居列表 */
function getNeighbors(nodeId: string): string[] {
  const node = nodeMap.get(nodeId);
  return node ? node.connections : [];
}

/** 取得指定縣市的所有節點 */
function getCountyNodes(county: string): string[] {
  return MAP_NODES.filter(n => n.county === county).map(n => n.id);
}

/** 取得指定縣市列表中的所有節點 */
function getRegionNodes(counties: string[]): string[] {
  return MAP_NODES.filter(n => counties.includes(n.county)).map(n => n.id);
}

/** 隨機選擇一個節點 */
function randomNode(nodeIds: string[]): string {
  return nodeIds[Math.floor(Math.random() * nodeIds.length)];
}

/** 根據巡迴範圍選擇下一個移動目標 */
function pickNextNode(currentNodeId: string, patrolRegion: string[] | "all" | null, moveHistory: string[]): string {
  const neighbors = getNeighbors(currentNodeId);
  if (neighbors.length === 0) return currentNodeId;

  let candidates = neighbors;

  // 如果有巡迴範圍限制，過濾候選節點
  if (patrolRegion && patrolRegion !== "all") {
    const regionNodeSet = new Set(getRegionNodes(patrolRegion));
    const filtered = candidates.filter(id => regionNodeSet.has(id));
    if (filtered.length > 0) candidates = filtered;
  }

  // 避免回頭路（如果有多個選擇）
  if (candidates.length > 1 && moveHistory.length > 0) {
    const lastNode = moveHistory[moveHistory.length - 1];
    const noBacktrack = candidates.filter(id => id !== lastNode);
    if (noBacktrack.length > 0) candidates = noBacktrack;
  }

  return randomNode(candidates);
}

// ═══════════════════════════════════════════════════════════════
// Boss 生成邏輯
// ═══════════════════════════════════════════════════════════════

/** 生成一個 Boss 實例 */
export async function spawnBossInstance(catalogId: number, forceNodeId?: string, forceSpawn = false): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  // 取得 Boss 圖鑑資料
  const [catalog] = await db.select().from(roamingBossCatalog).where(eq(roamingBossCatalog.id, catalogId));
  // forceSpawn=true 時（後台手動召喚）跳過 isActive 檢查
  if (!catalog) return null;
  if (!forceSpawn && !catalog.isActive) return null;

  // 決定生成節點
  let spawnNodeId = forceNodeId || catalog.spawnNodeId;
  if (!spawnNodeId) {
    const patrolRegion = catalog.patrolRegion as string[] | "all" | null;
    if (patrolRegion && patrolRegion !== "all") {
      const regionNodes = getRegionNodes(patrolRegion);
      spawnNodeId = randomNode(regionNodes.length > 0 ? regionNodes : MAP_NODES.map(n => n.id));
    } else {
      spawnNodeId = randomNode(MAP_NODES.map(n => n.id));
    }
  }

  // 計算過期時間
  const now = Date.now();
  const expiresAt = catalog.lifetimeMinutes > 0
    ? now + catalog.lifetimeMinutes * 60 * 1000
    : 0;

  // 建立實例（直接設定滿血 HP，避免前端顯示 -1）
  const initialHp = catalog.baseHp > 0 ? catalog.baseHp : 5000;
  const [result] = await db.insert(roamingBossInstances).values({
    catalogId,
    currentNodeId: spawnNodeId,
    moveHistory: [spawnNodeId],
    currentHp: initialHp,
    status: "active",
    spawnedAt: now,
    expiresAt,
    lastMovedAt: now,
    defeatedBy: [],
    isFirstKill: 0,
    challengeCount: 0,
  });

  const instanceId = result.insertId;
  const node = nodeMap.get(spawnNodeId);

  console.log(`[RoamingBoss] 生成 Boss: ${catalog.name} (Tier ${catalog.tier}) 於 ${node?.name || spawnNodeId}`);

  // 全服廣播
  broadcastLiveFeed({
    feedType: "world_event",
    agentName: catalog.name,
    agentElement: catalog.wuxing,
    detail: `${catalog.title || catalog.name} 出現在 ${node?.name || "未知地點"}！`,
    icon: catalog.tier === 3 ? "🐉" : catalog.tier === 2 ? "💀" : "👹",
  });

  return Number(instanceId);
}

// ═══════════════════════════════════════════════════════════════
// Boss 移動邏輯
// ═══════════════════════════════════════════════════════════════

/** 處理所有活躍 Boss 的移動 */
export async function processAllBossMovement(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (!_bossConfig.enabled) return 0;

  const now = Date.now();
  let movedCount = 0;

  // 取得所有活躍的 Boss 實例
  const instances = await db.select().from(roamingBossInstances)
    .where(eq(roamingBossInstances.status, "active"));

  for (const inst of instances) {
    try {
      // 檢查是否過期
      if (inst.expiresAt > 0 && now >= inst.expiresAt) {
        await db.update(roamingBossInstances)
          .set({ status: "expired" })
          .where(eq(roamingBossInstances.id, inst.id));
        console.log(`[RoamingBoss] Boss 實例 #${inst.id} 已過期`);
        continue;
      }

      // 取得圖鑑資料
      const [catalog] = await db.select().from(roamingBossCatalog)
        .where(eq(roamingBossCatalog.id, inst.catalogId));
      if (!catalog) continue;

      // 檢查是否到移動時間
      const moveIntervalMs = catalog.moveIntervalSec * 1000;
      if (now - inst.lastMovedAt < moveIntervalMs) continue;

      // 計算下一個節點
      const moveHistory = (inst.moveHistory as string[]) || [];
      const patrolRegion = catalog.patrolRegion as string[] | "all" | null;
      const nextNode = pickNextNode(inst.currentNodeId, patrolRegion, moveHistory);

      if (nextNode === inst.currentNodeId) continue;

      // 更新移動歷史（保留最近 10 個）
      const newHistory = [...moveHistory, nextNode].slice(-10);

      await db.update(roamingBossInstances).set({
        currentNodeId: nextNode,
        moveHistory: newHistory,
        lastMovedAt: now,
      }).where(eq(roamingBossInstances.id, inst.id));

      movedCount++;

      const node = nodeMap.get(nextNode);
      if (catalog.tier >= 2) {
        // Tier 2/3 移動時廣播
        broadcastLiveFeed({
          feedType: "world_event",
          agentName: catalog.name,
          agentElement: catalog.wuxing,
          detail: `${catalog.name} 移動到了 ${node?.name || nextNode}`,
          icon: catalog.tier === 3 ? "🐉" : "💀",
        });
      }
    } catch (err) {
      console.error(`[RoamingBoss] 移動處理失敗 (實例 #${inst.id}):`, err);
    }
  }

  return movedCount;
}

// ═══════════════════════════════════════════════════════════════
// Boss 自動生成維護
// ═══════════════════════════════════════════════════════════════

/** 自動維護 Boss 數量（確保各 Tier 達到配置數量） */
export async function maintainBossPopulation(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (!_bossConfig.enabled) return;

  // 統計各 Tier 活躍實例數
  const activeInstances = await db.select({
    catalogId: roamingBossInstances.catalogId,
    count: sql<number>`COUNT(*)`,
  }).from(roamingBossInstances)
    .where(eq(roamingBossInstances.status, "active"))
    .groupBy(roamingBossInstances.catalogId);

  const activeByTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const activeByCatalog = new Map<number, number>();

  // 取得所有活躍的 Boss 圖鑑
  const catalogs = await db.select().from(roamingBossCatalog)
    .where(eq(roamingBossCatalog.isActive, 1));

  const catalogMap = new Map(catalogs.map(c => [c.id, c]));

  for (const inst of activeInstances) {
    const catalog = catalogMap.get(inst.catalogId);
    if (catalog) {
      activeByTier[catalog.tier] = (activeByTier[catalog.tier] || 0) + Number(inst.count);
      activeByCatalog.set(inst.catalogId, Number(inst.count));
    }
  }

  // Tier 1: 常駐，確保達到 maxInstances
  const tier1Catalogs = catalogs.filter(c => c.tier === 1);
  for (const cat of tier1Catalogs) {
    const schedule = cat.scheduleConfig as { type: string; maxInstances: number } | null;
    const maxInst = schedule?.maxInstances ?? 1;
    const currentCount = activeByCatalog.get(cat.id) || 0;

    if (currentCount < maxInst) {
      for (let i = 0; i < maxInst - currentCount; i++) {
        await spawnBossInstance(cat.id);
      }
    }
  }

  // Tier 2: 定時刷新（由後台排程控制，這裡只檢查是否需要補充）
  const tier2Catalogs = catalogs.filter(c => c.tier === 2);
  for (const cat of tier2Catalogs) {
    const schedule = cat.scheduleConfig as { type: string; maxInstances: number; fixedTimes?: string[] } | null;
    if (schedule?.type !== "always") continue; // 非常駐的由排程觸發
    const maxInst = schedule?.maxInstances ?? 1;
    const currentCount = activeByCatalog.get(cat.id) || 0;
    if (currentCount < maxInst) {
      await spawnBossInstance(cat.id);
    }
  }

  // Tier 3: 條件觸發
  const tier3Catalogs = catalogs.filter(c => c.tier === 3);
  if (tier3Catalogs.length > 0 && activeByTier[3] < _bossConfig.tier3MaxInstances) {
    // 檢查觸發條件：全服累計擊殺 Tier 1 次數
    const [killCount] = await db.select({
      total: sql<number>`COUNT(*)`,
    }).from(roamingBossKillLog)
      .innerJoin(roamingBossCatalog, eq(roamingBossKillLog.catalogId, roamingBossCatalog.id))
      .where(and(
        eq(roamingBossKillLog.result, "win"),
        eq(roamingBossCatalog.tier, 1)
      ));

    if (Number(killCount?.total || 0) >= _bossConfig.tier3TriggerKillCount) {
      // 隨機選一隻 Tier 3 Boss 生成
      const randomTier3 = tier3Catalogs[Math.floor(Math.random() * tier3Catalogs.length)];
      await spawnBossInstance(randomTier3.id);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Boss 查詢 API
// ═══════════════════════════════════════════════════════════════

/** 取得所有活躍 Boss 實例（含圖鑑資料） */
export async function getActiveBossInstances() {
  const db = await getDb();
  if (!db) return [];

  const instances = await db.select().from(roamingBossInstances)
    .where(eq(roamingBossInstances.status, "active"));

  const catalogIds = Array.from(new Set(instances.map(i => i.catalogId)));
  if (catalogIds.length === 0) return [];

  const catalogs = await db.select().from(roamingBossCatalog)
    .where(inArray(roamingBossCatalog.id, catalogIds));
  const catalogMap = new Map(catalogs.map(c => [c.id, c]));

  return instances.map(inst => {
    const catalog = catalogMap.get(inst.catalogId);
    const node = nodeMap.get(inst.currentNodeId);
    return {
      instanceId: inst.id,
      catalogId: inst.catalogId,
      bossCode: catalog?.bossCode || "",
      name: catalog?.name || "未知 Boss",
      title: catalog?.title || "",
      tier: catalog?.tier || 1,
      wuxing: catalog?.wuxing || "earth",
      level: catalog?.level || 30,
      baseHp: catalog?.baseHp || 5000,
      imageUrl: catalog?.imageUrl || null,
      description: catalog?.description || "",
      staminaCost: catalog?.staminaCost || 15,
      currentNodeId: inst.currentNodeId,
      nodeName: node?.name || inst.currentNodeId,
      nodeCounty: node?.county || "",
      nodeElement: node?.element || "earth",
      currentHp: inst.currentHp,
      status: inst.status,
      spawnedAt: inst.spawnedAt,
      expiresAt: inst.expiresAt,
      challengeCount: inst.challengeCount,
      moveHistory: inst.moveHistory as string[],
    };
  });
}

/** 取得指定節點上的 Boss 列表 */
export async function getBossesAtNode(nodeId: string) {
  const all = await getActiveBossInstances();
  return all.filter(b => b.currentNodeId === nodeId);
}

/** 取得 Boss 圖鑑資料（用於戰鬥） */
export async function getBossCatalogById(catalogId: number) {
  const db = await getDb();
  if (!db) return null;
  const [catalog] = await db.select().from(roamingBossCatalog)
    .where(eq(roamingBossCatalog.id, catalogId));
  return catalog || null;
}

/** 記錄 Boss 擊殺 */
export async function recordBossKill(params: {
  instanceId: number;
  catalogId: number;
  agentId: number;
  agentName: string;
  result: string;
  damageDealt: number;
  rounds: number;
  expGained: number;
  goldGained: number;
  dropsGained: Array<{ itemId: string; itemName: string; qty: number }>;
  nodeId: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 記錄擊殺日誌
  await db.insert(roamingBossKillLog).values({
    instanceId: params.instanceId,
    catalogId: params.catalogId,
    agentId: params.agentId,
    agentName: params.agentName,
    result: params.result,
    damageDealt: params.damageDealt,
    rounds: params.rounds,
    expGained: params.expGained,
    goldGained: params.goldGained,
    dropsGained: params.dropsGained,
    isFirstKill: 0,
    nodeId: params.nodeId,
    battleAt: Date.now(),
  });

  // 更新實例挑戰次數
  await db.update(roamingBossInstances).set({
    challengeCount: sql`${roamingBossInstances.challengeCount} + 1`,
  }).where(eq(roamingBossInstances.id, params.instanceId));

  // 如果擊敗，標記實例
  if (params.result === "win") {
    // 檢查是否為首殺
    const [existing] = await db.select({ cnt: sql<number>`COUNT(*)` })
      .from(roamingBossKillLog)
      .where(and(
        eq(roamingBossKillLog.catalogId, params.catalogId),
        eq(roamingBossKillLog.result, "win")
      ));

    const isFirstKill = Number(existing?.cnt || 0) <= 1; // 包含剛插入的這筆

    await db.update(roamingBossInstances).set({
      status: "defeated",
      isFirstKill: isFirstKill ? 1 : 0,
      defeatedBy: [{
        agentId: params.agentId,
        agentName: params.agentName,
        damage: params.damageDealt,
        timestamp: Date.now(),
      }],
    }).where(eq(roamingBossInstances.id, params.instanceId));

    if (isFirstKill) {
      await db.update(roamingBossKillLog).set({ isFirstKill: 1 })
        .where(and(
          eq(roamingBossKillLog.instanceId, params.instanceId),
          eq(roamingBossKillLog.agentId, params.agentId)
        ));
    }

    // 取得 Boss 名稱廣播
    const [catalog] = await db.select().from(roamingBossCatalog)
      .where(eq(roamingBossCatalog.id, params.catalogId));

    if (catalog) {
      broadcastLiveFeed({
        feedType: "world_event",
        agentName: params.agentName,
        agentElement: catalog.wuxing,
        detail: isFirstKill
          ? `全服首殺！${params.agentName} 擊敗了 ${catalog.name}！`
          : `${params.agentName} 擊敗了 ${catalog.name}！`,
        icon: isFirstKill ? "🏆" : "⚔️",
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Boss Tick 處理（整合到 afkTickEngine）
// ═══════════════════════════════════════════════════════════════

let lastMaintenanceTime = 0;
const MAINTENANCE_INTERVAL = 60_000; // 每 60 秒檢查一次 Boss 數量

/** 每 tick 處理 Boss 系統（移動 + 數量維護） */
export async function processBossTick(): Promise<void> {
  if (!_bossConfig.enabled) return;

  try {
    // 處理移動
    await processAllBossMovement();

    // 定期維護 Boss 數量
    const now = Date.now();
    if (now - lastMaintenanceTime >= MAINTENANCE_INTERVAL) {
      await maintainBossPopulation();
      lastMaintenanceTime = now;
    }
  } catch (err) {
    console.error("[RoamingBoss] Tick 處理失敗:", err);
  }
}

// ═══════════════════════════════════════════════════════════════
// Boss 統計
// ═══════════════════════════════════════════════════════════════

/** 取得 Boss 統計數據 */
export async function getBossStats() {
  const db = await getDb();
  if (!db) return null;

  const [totalKills] = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(roamingBossKillLog)
    .where(eq(roamingBossKillLog.result, "win"));

  const [totalChallenges] = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(roamingBossKillLog);

  const [activeCount] = await db.select({ cnt: sql<number>`COUNT(*)` })
    .from(roamingBossInstances)
    .where(eq(roamingBossInstances.status, "active"));

  const topKillers = await db.select({
    agentName: roamingBossKillLog.agentName,
    kills: sql<number>`COUNT(*)`,
  }).from(roamingBossKillLog)
    .where(eq(roamingBossKillLog.result, "win"))
    .groupBy(roamingBossKillLog.agentName)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

  return {
    totalKills: Number(totalKills?.cnt || 0),
    totalChallenges: Number(totalChallenges?.cnt || 0),
    activeInstances: Number(activeCount?.cnt || 0),
    topKillers,
  };
}
