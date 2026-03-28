/**
 * 遊戲引擎全域動態配置
 * ★ V2: 持久化到 game_config DB 表，部署新版本後設定不會重置
 * 所有值先載入記憶體快取，管理員調整時同步寫入 DB
 */

import { getDb } from "./db";
import { gameConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
  infuseMinGain: number;
  infuseMaxGain: number;
  infuseFailRate: number;
  infuseMaxWuxing: number;
  // ─── 戰鬥經驗倍率配置 ───
  rewardMultIdle: number;
  rewardMultClosed: number;
  rewardMultOpen: number;
  // ─── 伺服器端掛機循環配置 ───
  afkTickIntervalMs: number;
  afkTickEnabled: boolean;
  // ─── 戰鬥倒數計時配置 ───
  battleTurnTimerPvE: number;
  battleTurnTimerBoss: number;
  battleTurnTimerPvP: number;
  // ─── Boss 系統配置 ───
  bossSystemEnabled: boolean;
  bossT1MaxCount: number;
  bossT1MoveInterval: number;
  bossT2MoveInterval: number;
  // ─── 屬性平衡參數 ───
  statLvHpMult: number;
  statLvHpBase: number;
  statLvAtkMult: number;
  statLvAtkBase: number;
  statLvDefMult: number;
  statLvDefBase: number;
  statLvSpdMult: number;
  statLvSpdBase: number;
  statLvMpMult: number;
  statLvMpBase: number;
  infuseHpPer100: number;
  infuseAtkPer100: number;
  infuseDefPer100: number;
  infuseSpdPer100: number;
  infuseMpPer100: number;
  resistMaxPct: number;
  combatAtkCoeff: number;
  combatDefCoeff: number;
  // ─── 屬性上限 ───
  /** HP 上限（預設 99999） */
  statCapHp: number;
  /** MP 上限（預設 9999） */
  statCapMp: number;
  /** ATK 上限（預設 1500） */
  statCapAtk: number;
  /** DEF 上限（預設 1500） */
  statCapDef: number;
  /** SPD 上限（預設 1500） */
  statCapSpd: number;
  /** MATK 上限（預設 1500） */
  statCapMatk: number;
  /** MDEF 上限（預設 1500） */
  statCapMdef: number;
  /** 五行屬性上限（預設 100） */
  wuxingCap: number;
  // ─── 販售折扣率 ───
  sellDiscountRate: number;
  // ─── GD-028 經驗值曲線配置 ───
  /** 經驗值基礎係數（預設 80） */
  expCurveBase: number;
  /** 經驗值對數係數（預設 0.5） */
  expCurveLogScale: number;
  // ─── GD-028 職業加成配置 ───
  /** 獵人 ATK 加成（預設 0.12） */
  profHunterAtk: number;
  /** 獵人 SPD 加成（預設 0.08） */
  profHunterSpd: number;
  /** 法師 MATK 加成（預設 0.15） */
  profMageMatk: number;
  /** 法師 MP 加成（預設 0.10） */
  profMageMp: number;
  /** 鬥士 HP 加成（預設 0.15） */
  profTankHp: number;
  /** 鬥士 DEF 加成（預設 0.12） */
  profTankDef: number;
  /** 盜賊 SPD 加成（預設 0.15） */
  profThiefSpd: number;
  /** 盜賊 暴擊率 加成（預設 5） */
  profThiefCrit: number;
  /** 巫師 MATK 加成（預設 0.10） */
  profWizardMatk: number;
  /** 巫師 SPR 加成（預設 0.12） */
  profWizardSpr: number;
  // ─── GD-028 命格加成配置 ───
  /** 青龍命 HP 加成（預設 0.10） */
  fateWoodHp: number;
  /** 朱雀命 ATK 加成（預設 0.10） */
  fateFireAtk: number;
  /** 朱雀命 MATK 加成（預設 0.10） */
  fateFireMatk: number;
  /** 麒麟命 DEF 加成（預設 0.10） */
  fateEarthDef: number;
  /** 麒麟命 MDEF 加成（預設 0.10） */
  fateEarthMdef: number;
  /** 白虎命 SPD 加成（預設 0.10） */
  fateMetalSpd: number;
  /** 白虎命 暴擊率 加成（預設 5） */
  fateMetalCrit: number;
  /** 玄武命 MP 加成（預設 0.10） */
  fateWaterMp: number;
  /** 玄武命 SPR 加成（預設 0.05） */
  fateWaterSpr: number;
  // ─── GD-028 寵物協同加成配置 ───
  /** 同五行協同加成（預設 0.15） */
  petSynergySame: number;
  /** 相生協同加成（預設 0.08） */
  petSynergyGenerate: number;
  /** 相剣協同減益（預設 -0.05） */
  petSynergyOvercome: number;
  // ─── GD-028 戰鬥傷害係數 ───
  /** 五行相剣傷害倍率（預設 1.5） */
  wuxingOvercomeMult: number;
  /** 五行相生傷害倍率（預設 0.8） */
  wuxingGenerateMult: number;
}

// ─── 預設值 ───
const DEFAULT_CONFIG: GameEngineConfig = {
  tickIntervalMs: 5 * 60 * 1000,
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
  infuseMinGain: 0.1,
  infuseMaxGain: 0.5,
  infuseFailRate: 0.2,
  infuseMaxWuxing: 100,
  rewardMultIdle: 0.33,
  rewardMultClosed: 1.0,
  rewardMultOpen: 1.5,
  afkTickIntervalMs: 15_000,
  afkTickEnabled: true,
  battleTurnTimerPvE: 30,
  battleTurnTimerBoss: 20,
  battleTurnTimerPvP: 15,
  bossSystemEnabled: true,
  bossT1MaxCount: 5,
  bossT1MoveInterval: 300,
  bossT2MoveInterval: 600,
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
  infuseAtkPer100: 30,
  infuseDefPer100: 30,
  infuseSpdPer100: 20,
  infuseMpPer100: 20,
  resistMaxPct: 50,
  combatAtkCoeff: 1.5,
  combatDefCoeff: 0.5,
  // 屬性上限
  statCapHp: 99999,
  statCapMp: 9999,
  statCapAtk: 1500,
  statCapDef: 1500,
  statCapSpd: 1500,
  statCapMatk: 1500,
  statCapMdef: 1500,
  wuxingCap: 100,
  sellDiscountRate: 0.5,
  // GD-028 經驗值曲線
  expCurveBase: 80,
  expCurveLogScale: 0.5,
  // GD-028 職業加成
  profHunterAtk: 0.12,
  profHunterSpd: 0.08,
  profMageMatk: 0.15,
  profMageMp: 0.10,
  profTankHp: 0.15,
  profTankDef: 0.12,
  profThiefSpd: 0.15,
  profThiefCrit: 5,
  profWizardMatk: 0.10,
  profWizardSpr: 0.12,
  // GD-028 命格加成
  fateWoodHp: 0.10,
  fateFireAtk: 0.10,
  fateFireMatk: 0.10,
  fateEarthDef: 0.10,
  fateEarthMdef: 0.10,
  fateMetalSpd: 0.10,
  fateMetalCrit: 5,
  fateWaterMp: 0.10,
  fateWaterSpr: 0.05,
  // GD-028 寵物協同
  petSynergySame: 0.15,
  petSynergyGenerate: 0.08,
  petSynergyOvercome: -0.05,
  // GD-028 戰鬥傷害
  wuxingOvercomeMult: 1.5,
  wuxingGenerateMult: 0.8,
};

// ─── 記憶體快取 ───
let _config: GameEngineConfig = { ...DEFAULT_CONFIG };
let _dbLoaded = false;

// ─── DB 持久化鍵名（存入 game_config 表的 config_key） ───
const DB_ENGINE_CONFIG_KEY = "__engine_config_v2__";

/**
 * ★ 從 DB 載入已保存的配置（伺服器啟動時呼叫一次）
 * 如果 DB 中沒有記錄，使用預設值
 */
export async function loadEngineConfigFromDb(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.log("[EngineConfig] DB 不可用，使用預設配置");
      return;
    }
    const rows = await db.select().from(gameConfig)
      .where(eq(gameConfig.configKey, DB_ENGINE_CONFIG_KEY))
      .limit(1);
    if (rows[0]) {
      try {
        const saved = JSON.parse(rows[0].configValue) as Partial<GameEngineConfig>;
        // 合併：DB 中的值覆蓋預設值，新增的欄位使用預設值
        _config = { ...DEFAULT_CONFIG, ...saved };
        _dbLoaded = true;
        console.log(`[EngineConfig] ✓ 已從 DB 載入配置（最後更新：${saved.lastUpdatedBy ?? "unknown"}）`);
      } catch (parseErr) {
        console.error("[EngineConfig] DB 配置解析失敗，使用預設值:", parseErr);
      }
    } else {
      console.log("[EngineConfig] DB 中無已保存配置，使用預設值");
    }
  } catch (err) {
    console.error("[EngineConfig] 從 DB 載入配置失敗:", err);
  }
}

/**
 * ★ 將當前配置持久化到 DB（非同步，不阻塞主流程）
 */
async function persistConfigToDb(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const jsonValue = JSON.stringify(_config);
    const rows = await db.select({ id: gameConfig.id }).from(gameConfig)
      .where(eq(gameConfig.configKey, DB_ENGINE_CONFIG_KEY))
      .limit(1);
    if (rows[0]) {
      await db.update(gameConfig).set({
        configValue: jsonValue,
        updatedAt: Date.now(),
      }).where(eq(gameConfig.id, rows[0].id));
    } else {
      await db.insert(gameConfig).values({
        configKey: DB_ENGINE_CONFIG_KEY,
        configValue: jsonValue,
        valueType: "json",
        label: "引擎全域配置",
        description: "遊戲引擎所有動態參數的 JSON 快照",
        category: "system",
        updatedAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  } catch (err) {
    console.error("[EngineConfig] 持久化到 DB 失敗:", err);
  }
}

/** 取得當前引擎配置（唯讀快照） */
export function getEngineConfig(): Readonly<GameEngineConfig> {
  return _config;
}

/** 更新引擎配置（部分更新，立即生效 + 持久化到 DB） */
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
  // ★ 非同步持久化到 DB（不阻塞返回）
  persistConfigToDb().catch(err => console.error("[EngineConfig] 持久化失敗:", err));
  return _config;
}

/** 重置為預設值（同時清除 DB 中的配置） */
export function resetEngineConfig(updatedBy: string): GameEngineConfig {
  _config = {
    ...DEFAULT_CONFIG,
    lastUpdatedAt: Date.now(),
    lastUpdatedBy: updatedBy,
  };
  console.log(`[EngineConfig] 配置已重置 by ${updatedBy}`);
  // ★ 非同步持久化到 DB
  persistConfigToDb().catch(err => console.error("[EngineConfig] 持久化失敗:", err));
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
    infuseAtkPer100: _config.infuseAtkPer100 ?? 30,
    infuseDefPer100: _config.infuseDefPer100 ?? 30,
    infuseSpdPer100: _config.infuseSpdPer100 ?? 20,
    infuseMpPer100:  _config.infuseMpPer100  ?? 20,
    resistMaxPct:    _config.resistMaxPct    ?? 50,
    combatAtkCoeff:  _config.combatAtkCoeff  ?? 1.5,
    combatDefCoeff:  _config.combatDefCoeff  ?? 0.5,
  };
}

/** 取得屬性上限配置 */
export function getStatCaps() {
  return {
    hp:    _config.statCapHp    ?? 99999,
    mp:    _config.statCapMp    ?? 9999,
    atk:   _config.statCapAtk   ?? 1500,
    def:   _config.statCapDef   ?? 1500,
    spd:   _config.statCapSpd   ?? 1500,
    matk:  _config.statCapMatk  ?? 1500,
    mdef:  _config.statCapMdef  ?? 1500,
    wuxing: _config.wuxingCap   ?? 100,
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

/** 取得預設配置（用於測試） */
export function getDefaultConfig(): GameEngineConfig {
  return { ...DEFAULT_CONFIG };
}
