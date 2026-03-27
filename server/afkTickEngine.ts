/**
 * 伺服器端掛機循環引擎 (AFK Tick Engine)
 * 每 15 秒（可配置）自動處理所有活躍角色的行動
 * 取代前端 triggerTick 的依賴，確保離線玩家也能持續行動
 */

import { getDb } from "./db";
import { getAfkTickConfig, getEngineConfig } from "./gameEngineConfig";
import { processAgentTick, regenStamina } from "./tickEngine";
import { gameAgents, gameWorld, gameConfig } from "../drizzle/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import type { WuXing } from "../shared/types";

let afkInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/** 取得體力相關的動態配置 */
async function getStaminaConfig(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const cfgRows = await db.select({
    configKey: gameConfig.configKey,
    configValue: gameConfig.configValue,
  }).from(gameConfig).where(
    and(
      eq(gameConfig.isActive, 1),
      sql`${gameConfig.configKey} IN ('stamina_per_tick','stamina_regen_minutes','stamina_regen_amount')`
    )
  );
  const cfgMap: Record<string, number> = {};
  for (const row of cfgRows) {
    cfgMap[row.configKey] = parseFloat(row.configValue) || 0;
  }
  return {
    staminaPerTick: cfgMap["stamina_per_tick"] ?? 5,
    regenMinutes: cfgMap["stamina_regen_minutes"] ?? 30,
    regenAmount: cfgMap["stamina_regen_amount"] ?? 30,
  };
}

/** 處理所有活躍角色的 Tick */
async function processAllAgents(): Promise<{ processed: number; events: number }> {
  if (isProcessing) return { processed: 0, events: 0 };
  isProcessing = true;

  try {
    const db = await getDb();
    if (!db) return { processed: 0, events: 0 };

    const cfg = getEngineConfig();
    if (!cfg.gameEnabled) return { processed: 0, events: 0 };

    // 取得世界狀態
    const worlds = await db.select().from(gameWorld).limit(1);
    const world = worlds[0];
    if (!world) return { processed: 0, events: 0 };

    const worldData = (world.worldData as Record<string, unknown>) ?? {};
    const currentTick = (worldData.currentTick as number) ?? 0;
    const dailyElement = (worldData.dailyElement as WuXing) ?? "wood";

    // 取得體力配置
    const staminaCfg = await getStaminaConfig(db);

    // 取得所有活躍且非死亡狀態的角色
    const agents = await db.select().from(gameAgents).where(
      and(
        eq(gameAgents.isActive, 1),
        ne(gameAgents.status, "dead")
      )
    );

    let totalEvents = 0;
    let processed = 0;

    for (const agent of agents) {
      try {
        // 1. 體力再生
        const newStamina = regenStamina(agent, staminaCfg.regenMinutes, staminaCfg.regenAmount);
        if (newStamina !== agent.stamina) {
          await db.update(gameAgents).set({
            stamina: newStamina,
            staminaLastRegen: Date.now(),
          }).where(eq(gameAgents.id, agent.id));
        }

        // 2. 執行角色行動
        const agentWithStamina = { ...agent, stamina: newStamina };
        const result = await processAgentTick(agentWithStamina, currentTick, dailyElement, staminaCfg.staminaPerTick);
        totalEvents += result.events;
        processed++;
      } catch (err) {
        console.error(`[AfkTick] 角色 ${agent.id} 處理失敗:`, err);
      }
    }

    if (processed > 0 && totalEvents > 0) {
      console.log(`[AfkTick] 完成：${processed} 位角色，${totalEvents} 個事件`);
    }

    return { processed, events: totalEvents };
  } catch (err) {
    console.error("[AfkTick] 全域錯誤:", err);
    return { processed: 0, events: 0 };
  } finally {
    isProcessing = false;
  }
}

/** 啟動掛機循環引擎 */
export function startAfkTickEngine(): void {
  if (afkInterval) return;
  const afkCfg = getAfkTickConfig();
  if (!afkCfg.enabled) {
    console.log("[AfkTick] 掛機循環已停用");
    return;
  }
  const intervalMs = afkCfg.intervalMs;
  console.log(`[AfkTick] 啟動掛機循環引擎，間隔 ${intervalMs / 1000} 秒`);
  afkInterval = setInterval(async () => {
    const afkCfgNow = getAfkTickConfig();
    if (!afkCfgNow.enabled) return;
    await processAllAgents();
  }, intervalMs);
}

/** 停止掛機循環引擎 */
export function stopAfkTickEngine(): void {
  if (afkInterval) {
    clearInterval(afkInterval);
    afkInterval = null;
    console.log("[AfkTick] 掛機循環已停止");
  }
}

/** 重啟掛機循環引擎（用於動態調整間隔後） */
export function restartAfkTickEngine(): void {
  stopAfkTickEngine();
  startAfkTickEngine();
}

/** 取得掛機循環引擎狀態 */
export function getAfkTickStatus(): { running: boolean; intervalMs: number; enabled: boolean } {
  const afkCfg = getAfkTickConfig();
  return {
    running: afkInterval !== null,
    intervalMs: afkCfg.intervalMs,
    enabled: afkCfg.enabled,
  };
}
