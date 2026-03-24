/**
 * 遊戲引擎全域動態配置
 * 所有值儲存於記憶體，管理員可即時調整，無需重啟伺服器
 * 後台遊戲劇院 → 彈性調控面板 讀寫此模組
 */

export interface GameEngineConfig {
  /** 伺服器端 Tick 間隔（毫秒），預設 5 分鐘 */
  tickIntervalMs: number;
  /** 經驗值全局倍率（1.0 = 正常，2.0 = 雙倍） */
  expMultiplier: number;
  /** 金幣全局倍率 */
  goldMultiplier: number;
  /** 掉落率全局倍率 */
  dropMultiplier: number;
  /** 戰鬥事件機率（0~1，預設 0.65） */
  combatChance: number;
  /** 採集事件機率（0~1，預設 0.20） */
  gatherChance: number;
  /** Roguelike 奇遇機率（0~1，預設 0.05） */
  rogueChance: number;
  /** 是否開放遊戲（false = 維護中，所有 Tick 暫停） */
  gameEnabled: boolean;
  /** 維護公告訊息（gameEnabled=false 時顯示） */
  maintenanceMsg: string;
  /** 最後修改時間（Unix ms） */
  lastUpdatedAt: number;
  /** 最後修改者 */
  lastUpdatedBy: string;
  // ─── 注靈指令配置 ───
  /** 注靈成功最小截取值（預設 0.1） */
  infuseMinGain: number;
  /** 注靈成功最大截取值（預設 0.5） */
  infuseMaxGain: number;
  /** 注靈失敗機率（0~1，預設 0.2 = 20%） */
  infuseFailRate: number;
  /** 注靈五行值上限（預設 100） */
  infuseMaxWuxing: number;
}

// ─── 預設值 ───
const DEFAULT_CONFIG: GameEngineConfig = {
  tickIntervalMs: 5 * 60 * 1000, // 5 分鐘
  expMultiplier: 1.0,
  goldMultiplier: 1.0,
  dropMultiplier: 1.0,
  combatChance: 0.65,
  gatherChance: 0.20,
  rogueChance: 0.05,
  gameEnabled: true,
  maintenanceMsg: "系統維護中，請稍後再試",
  lastUpdatedAt: Date.now(),
  lastUpdatedBy: "system",
  // 注靈預設值
  infuseMinGain: 0.1,
  infuseMaxGain: 0.5,
  infuseFailRate: 0.2,
  infuseMaxWuxing: 100,
};

// ─── 單例記憶體狀態 ───
let _config: GameEngineConfig = { ...DEFAULT_CONFIG };

/** 取得當前引擎配置（唯讀快照） */
export function getEngineConfig(): Readonly<GameEngineConfig> {
  return _config;
}

/** 更新引擎配置（部分更新，立即生效） */
export function updateEngineConfig(
  patch: Partial<Omit<GameEngineConfig, "lastUpdatedAt" | "lastUpdatedBy">>,
  updatedBy: string
): GameEngineConfig {
  _config = {
    ..._config,
    ...patch,
    lastUpdatedAt: Date.now(),
    lastUpdatedBy: updatedBy,
  };
  console.log(`[EngineConfig] 配置已更新 by ${updatedBy}:`, patch);
  return _config;
}

/** 重置為預設值 */
export function resetEngineConfig(updatedBy: string): GameEngineConfig {
  _config = {
    ...DEFAULT_CONFIG,
    lastUpdatedAt: Date.now(),
    lastUpdatedBy: updatedBy,
  };
  console.log(`[EngineConfig] 配置已重置 by ${updatedBy}`);
  return _config;
}

/** 取得 Tick 間隔（毫秒） */
export function getTickIntervalMs(): number {
  return _config.tickIntervalMs;
}

/** 取得事件機率配置 */
export function getEventChances(): { combat: number; gather: number; rogue: number } {
  return {
    combat: _config.combatChance,
    gather: _config.gatherChance,
    rogue: _config.rogueChance,
  };
}

/** 取得倍率配置 */
export function getMultipliers(): { exp: number; gold: number; drop: number } {
  return {
    exp: _config.expMultiplier,
    gold: _config.goldMultiplier,
    drop: _config.dropMultiplier,
  };
}

/** 取得注靈配置 */
export function getInfuseConfig(): { minGain: number; maxGain: number; failRate: number; maxWuxing: number } {
  return {
    minGain: _config.infuseMinGain,
    maxGain: _config.infuseMaxGain,
    failRate: _config.infuseFailRate,
    maxWuxing: _config.infuseMaxWuxing,
  };
}
