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
  // ─── 戰鬥經驗倍率配置 ───
  /** 掛機模式經驗倍率（預設 0.33） */
  rewardMultIdle: number;
  /** 關閉戰鬥視窗經驗倍率（預設 1.0） */
  rewardMultClosed: number;
  /** 打開戰鬥視窗經驗倍率（預設 1.5） */
  rewardMultOpen: number;
  // ─── 伺服器端掛機循環配置 ───
  /** 掛機循環間隔（毫秒，預設 15000 = 15秒） */
  afkTickIntervalMs: number;
  /** 是否啟用伺服器端掛機循環 */
  afkTickEnabled: boolean;
  // ─── 戰鬥倒數計時配置 ───
  /** 個人戰回合倒數秒數（0=不限制） */
  battleTurnTimerPvE: number;
  /** Boss 戰回合倒數秒數（0=不限制） */
  battleTurnTimerBoss: number;
  /** PvP 戰回合倒數秒數（0=不限制） */
  battleTurnTimerPvP: number;
  // ─── Boss 系統配置 ───
  /** 是否啟用 Boss 系統 */
  bossSystemEnabled: boolean;
  /** T1 常駐最大數量 */
  bossT1MaxCount: number;
  /** T1 移動間隔（秒） */
  bossT1MoveInterval: number;
  /** T2 移動間隔（秒） */
  bossT2MoveInterval: number;
  // ─── 屬性平衡參數 ───
  /** 等級 HP 基礎倍率（Lv × N），預設 12 */
  statLvHpMult: number;
  /** 等級 HP 基礎常數，預設 80 */
  statLvHpBase: number;
  /** 等級 ATK 基礎倍率（Lv × N），預設 8 */
  statLvAtkMult: number;
  /** 等級 ATK 基礎常數，預設 15 */
  statLvAtkBase: number;
  /** 等級 DEF 基礎倍率（Lv × N），預設 8 */
  statLvDefMult: number;
  /** 等級 DEF 基礎常數，預設 15 */
  statLvDefBase: number;
  /** 等級 SPD 基礎倍率（Lv × N），預設 6 */
  statLvSpdMult: number;
  /** 等級 SPD 基礎常數，預設 10 */
  statLvSpdBase: number;
  /** 等級 MP 基礎倍率（Lv × N），預設 8 */
  statLvMpMult: number;
  /** 等級 MP 基礎常數，預設 40 */
  statLvMpBase: number;
  /** 注靈 木→HP 加成（每 100 點），預設 30 */
  infuseHpPer100: number;
  /** 注靈 火→ATK 加成（每 100 點），預設 20 */
  infuseAtkPer100: number;
  /** 注靈 土→DEF 加成（每 100 點），預設 20 */
  infuseDefPer100: number;
  /** 注靈 金→SPD 加成（每 100 點），預設 15 */
  infuseSpdPer100: number;
  /** 注靈 水→MP 加成（每 100 點），預設 20 */
  infuseMpPer100: number;
  /** 五行抗性上限（%），預設 50 */
  resistMaxPct: number;
  /** 戰鬥公式 ATK 係數 A（預設 1.5） */
  combatAtkCoeff: number;
  /** 戰鬥公式 DEF 係數 B（預設 0.5） */
  combatDefCoeff: number;
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
  // 戰鬥經驗倍率預設值
  rewardMultIdle: 0.33,
  rewardMultClosed: 1.0,
  rewardMultOpen: 1.5,
  // 掙機循環預設值
  afkTickIntervalMs: 15_000,
  afkTickEnabled: true,
  // 戰鬥倒數計時預設值
  battleTurnTimerPvE: 30,   // 個人戰 30 秒
  battleTurnTimerBoss: 20,  // Boss 戰 20 秒
  battleTurnTimerPvP: 15,   // PvP 戰 15 秒
  // Boss 系統預設値
  bossSystemEnabled: true,
  bossT1MaxCount: 5,
  bossT1MoveInterval: 300,
  bossT2MoveInterval: 600,
  // 屬性平衡參數預設値
  statLvHpMult: 12,
  statLvHpBase: 80,
  statLvAtkMult: 8,
  statLvAtkBase: 15,
  statLvDefMult: 8,
  statLvDefBase: 15,
  statLvSpdMult: 6,
  statLvSpdBase: 10,
  statLvMpMult: 8,
  statLvMpBase: 40,
  infuseHpPer100: 30,
  infuseAtkPer100: 20,
  infuseDefPer100: 20,
  infuseSpdPer100: 15,
  infuseMpPer100: 20,
  resistMaxPct: 50,
  combatAtkCoeff: 1.5,
  combatDefCoeff: 0.5,
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

/** 取得戰鬥經驗倍率配置 */
export function getRewardMultipliers(): { idle: number; player_closed: number; player_open: number } {
  return {
    idle: _config.rewardMultIdle,
    player_closed: _config.rewardMultClosed,
    player_open: _config.rewardMultOpen,
  };
}

/** 取得掛機循環配置 */
export function getAfkTickConfig(): { intervalMs: number; enabled: boolean } {
  return {
    intervalMs: _config.afkTickIntervalMs,
    enabled: _config.afkTickEnabled,
  };
}

/** 取得 Boss 系統配置 */
export function getBossConfig(): { enabled: boolean; t1MaxCount: number; t1MoveInterval: number; t2MoveInterval: number } {
  return {
    enabled: _config.bossSystemEnabled,
    t1MaxCount: _config.bossT1MaxCount,
    t1MoveInterval: _config.bossT1MoveInterval,
    t2MoveInterval: _config.bossT2MoveInterval,
  };
}

/** 取得屬性平衡參數 */
export function getStatBalanceConfig() {
  return {
    statLvHpMult:    _config.statLvHpMult    ?? 12,
    statLvHpBase:    _config.statLvHpBase    ?? 80,
    statLvAtkMult:   _config.statLvAtkMult   ?? 8,
    statLvAtkBase:   _config.statLvAtkBase   ?? 15,
    statLvDefMult:   _config.statLvDefMult   ?? 8,
    statLvDefBase:   _config.statLvDefBase   ?? 15,
    statLvSpdMult:   _config.statLvSpdMult   ?? 6,
    statLvSpdBase:   _config.statLvSpdBase   ?? 10,
    statLvMpMult:    _config.statLvMpMult    ?? 8,
    statLvMpBase:    _config.statLvMpBase    ?? 40,
    infuseHpPer100:  _config.infuseHpPer100  ?? 30,
    infuseAtkPer100: _config.infuseAtkPer100 ?? 20,
    infuseDefPer100: _config.infuseDefPer100 ?? 20,
    infuseSpdPer100: _config.infuseSpdPer100 ?? 15,
    infuseMpPer100:  _config.infuseMpPer100  ?? 20,
    resistMaxPct:    _config.resistMaxPct    ?? 50,
    combatAtkCoeff:  _config.combatAtkCoeff  ?? 1.5,
    combatDefCoeff:  _config.combatDefCoeff  ?? 0.5,
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
