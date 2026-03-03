/**
 * 策略閾值快取模組
 * 
 * 從 DB 讀取 strategy_thresholds 表，快取 5 分鐘。
 * 讓管理員在後台調整閾值後，最多 5 分鐘內自動生效，無需重啟伺服器。
 */
import { getDb } from "../db";
import { strategyThresholds, type StrategyThreshold } from "../../drizzle/schema";
import { asc } from "drizzle-orm";

export interface StrategyThresholdConfig {
  /** 策略名稱 */
  strategyName: string;
  /** 弱勢觸發閾值（百分比，0-100） */
  weakThreshold: number;
  /** 強勢觸發閾值（百分比，0-100） */
  strongThreshold: number;
  /** 優先級（數字越小越優先） */
  priority: number;
  /** 是否啟用 */
  enabled: boolean;
}

/** 快取結構 */
interface CacheEntry {
  data: StrategyThresholdConfig[];
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘

let cache: CacheEntry | null = null;

/**
 * 取得策略閾值設定（有快取則直接返回，否則從 DB 讀取）
 */
export async function getStrategyThresholdConfigs(): Promise<StrategyThresholdConfig[]> {
  const now = Date.now();

  // 快取命中
  if (cache && now < cache.expiresAt) {
    return cache.data;
  }

  // 從 DB 讀取
  try {
    const database = await getDb();
    if (!database) return getDefaultThresholds();

    const rows = await database
      .select()
      .from(strategyThresholds)
      .orderBy(asc(strategyThresholds.priority));

    const data: StrategyThresholdConfig[] = rows.map((r: StrategyThreshold) => ({
      strategyName: r.strategyName,
      weakThreshold: r.weakThreshold,
      strongThreshold: r.strongThreshold,
      priority: r.priority,
      enabled: r.enabled === 1,
    }));

    cache = { data, expiresAt: now + CACHE_TTL_MS };
    return data;
  } catch (err) {
    // DB 讀取失敗時，返回預設值（不影響主流程）
    console.error("[strategyThresholdCache] DB read failed, using defaults:", err);
    return getDefaultThresholds();
  }
}

/**
 * 強制清除快取（管理員更新閾值後呼叫）
 */
export function invalidateStrategyThresholdCache(): void {
  cache = null;
}

/**
 * 預設閾值（與 strategyEngine.ts 常數一致）
 */
function getDefaultThresholds(): StrategyThresholdConfig[] {
  return [
    { strategyName: "強勢補弱", weakThreshold: 8,  strongThreshold: 30, priority: 1, enabled: true },
    { strategyName: "借力打力", weakThreshold: 15, strongThreshold: 40, priority: 2, enabled: true },
    { strategyName: "順勢生旺", weakThreshold: 15, strongThreshold: 25, priority: 3, enabled: true },
    { strategyName: "食神生財", weakThreshold: 15, strongThreshold: 25, priority: 4, enabled: true },
    { strategyName: "均衡守成", weakThreshold: 0,  strongThreshold: 100, priority: 5, enabled: true },
  ];
}
