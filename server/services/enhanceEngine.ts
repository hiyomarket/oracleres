/**
 * enhanceEngine.ts
 * 裝備強化系統核心引擎
 *
 * 六色分級：白(+0) / 綠(+1) / 藍(+2) / 紫(+3) / 橙(+4) / 紅(+5)
 * 安定值、成功率、消失率、數值加成 — 全部可透過 game_config 動態調整
 * 卷軸類型：武器強化卷軸（weapon）、防具強化卷軸（armor）
 */

import { getDb } from "../db";
import { gameConfig } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── 顏色等級定義（靜態，不可調） ─────────────────────────────
export const ENHANCE_LEVELS = [
  { level: 0, color: "white",  label: "白", colorHex: "#94a3b8" },
  { level: 1, color: "green",  label: "綠", colorHex: "#4ade80" },
  { level: 2, color: "blue",   label: "藍", colorHex: "#60a5fa" },
  { level: 3, color: "purple", label: "紫", colorHex: "#a78bfa" },
  { level: 4, color: "orange", label: "橙", colorHex: "#fb923c" },
  { level: 5, color: "red",    label: "紅", colorHex: "#ef4444" },
] as const;

export type EnhanceColor = typeof ENHANCE_LEVELS[number]["color"];

// ─── 預設值（靜態 fallback，後台可覆蓋） ─────────────────────
/** 安定值：此等級以下（含）強化必定成功 */
export const SAFE_LEVEL = 2;

/** 各等級強化成功率（從該等級升到下一級） */
export const ENHANCE_RATES: Record<number, number> = {
  0: 1.00,   // +0 → +1：100%（安定值內）
  1: 1.00,   // +1 → +2：100%（安定值內）
  2: 0.70,   // +2 → +3：70%
  3: 0.50,   // +3 → +4：50%
  4: 0.30,   // +4 → +5：30%
};

/** 失敗時裝備消失的機率 */
export const DESTROY_CHANCE = 0.01; // 1%

/** 最大強化等級 */
export const MAX_ENHANCE_LEVEL = 5;

/** 每個強化等級對基礎數值的加成百分比 */
export const ENHANCE_STAT_BONUS: Record<number, number> = {
  0: 0,      // +0：無加成
  1: 0.05,   // +1：+5%
  2: 0.10,   // +2：+10%
  3: 0.18,   // +3：+18%
  4: 0.28,   // +4：+28%
  5: 0.40,   // +5：+40%
};

// ─── 卷軸類型與適用部位 ─────────────────────────────────────
export type ScrollType = "weapon_scroll" | "armor_scroll";

/** 武器卷軸適用的部位 */
export const WEAPON_SLOTS = ["weapon"];

/** 防具卷軸適用的部位（防具 + 飾品） */
export const ARMOR_SLOTS = ["helmet", "armor", "shoes", "accessory", "offhand"];

/** 判斷卷軸是否適用於該裝備部位 */
export function isScrollApplicable(scrollType: ScrollType, equipSlot: string): boolean {
  if (scrollType === "weapon_scroll") {
    return WEAPON_SLOTS.includes(equipSlot);
  }
  return ARMOR_SLOTS.includes(equipSlot);
}

// ─── 動態設定讀取（從 game_config） ─────────────────────────
export type EnhanceConfig = {
  safeLevel: number;
  rates: Record<number, number>;
  destroyChance: number;
  maxLevel: number;
  statBonus: Record<number, number>;
};

/**
 * 從 game_config 讀取強化系統的動態設定
 * config keys:
 *   enhance_safe_level       → 安定值（預設 2）
 *   enhance_rates            → JSON: {"0":1,"1":1,"2":0.7,"3":0.5,"4":0.3}
 *   enhance_destroy_chance   → 消失機率（預設 0.01）
 *   enhance_max_level        → 最大等級（預設 5）
 *   enhance_stat_bonus       → JSON: {"0":0,"1":0.05,"2":0.1,"3":0.18,"4":0.28,"5":0.4}
 */
export async function getEnhanceConfig(): Promise<EnhanceConfig> {
  const defaults: EnhanceConfig = {
    safeLevel: SAFE_LEVEL,
    rates: { ...ENHANCE_RATES },
    destroyChance: DESTROY_CHANCE,
    maxLevel: MAX_ENHANCE_LEVEL,
    statBonus: { ...ENHANCE_STAT_BONUS },
  };

  try {
    const db = await getDb();
    if (!db) return defaults;

    const rows = await db.select({
      configKey: gameConfig.configKey,
      configValue: gameConfig.configValue,
    }).from(gameConfig).where(
      and(
        eq(gameConfig.isActive, 1),
      )
    );

    const cfgMap = new Map(rows.map(r => [r.configKey, r.configValue]));

    if (cfgMap.has("enhance_safe_level")) {
      const v = parseInt(cfgMap.get("enhance_safe_level")!, 10);
      if (!isNaN(v) && v >= 0 && v <= 5) defaults.safeLevel = v;
    }
    if (cfgMap.has("enhance_destroy_chance")) {
      const v = parseFloat(cfgMap.get("enhance_destroy_chance")!);
      if (!isNaN(v) && v >= 0 && v <= 1) defaults.destroyChance = v;
    }
    if (cfgMap.has("enhance_max_level")) {
      const v = parseInt(cfgMap.get("enhance_max_level")!, 10);
      if (!isNaN(v) && v >= 1 && v <= 10) defaults.maxLevel = v;
    }
    if (cfgMap.has("enhance_rates")) {
      try {
        const parsed = JSON.parse(cfgMap.get("enhance_rates")!);
        if (typeof parsed === "object") {
          for (const [k, val] of Object.entries(parsed)) {
            const lv = parseInt(k, 10);
            if (!isNaN(lv) && typeof val === "number") defaults.rates[lv] = val;
          }
        }
      } catch {}
    }
    if (cfgMap.has("enhance_stat_bonus")) {
      try {
        const parsed = JSON.parse(cfgMap.get("enhance_stat_bonus")!);
        if (typeof parsed === "object") {
          for (const [k, val] of Object.entries(parsed)) {
            const lv = parseInt(k, 10);
            if (!isNaN(lv) && typeof val === "number") defaults.statBonus[lv] = val;
          }
        }
      } catch {}
    }

    return defaults;
  } catch {
    return defaults;
  }
}

// ─── 強化結果類型 ─────────────────────────────────────────
export type EnhanceResult = {
  success: boolean;
  newLevel: number;
  newColor: EnhanceColor;
  destroyed: boolean;
  message: string;
  successRate: number;
};

/**
 * 執行強化邏輯（使用靜態預設值，供測試用）
 */
export function performEnhance(currentLevel: number): EnhanceResult {
  return performEnhanceWithConfig(currentLevel, {
    safeLevel: SAFE_LEVEL,
    rates: ENHANCE_RATES,
    destroyChance: DESTROY_CHANCE,
    maxLevel: MAX_ENHANCE_LEVEL,
    statBonus: ENHANCE_STAT_BONUS,
  });
}

/**
 * 執行強化邏輯（使用動態設定）
 */
export function performEnhanceWithConfig(currentLevel: number, cfg: EnhanceConfig): EnhanceResult {
  // 已達最大等級
  if (currentLevel >= cfg.maxLevel) {
    return {
      success: false,
      newLevel: currentLevel,
      newColor: ENHANCE_LEVELS[Math.min(currentLevel, 5)].color,
      destroyed: false,
      message: `裝備已達最高強化等級（+${cfg.maxLevel}），無法繼續強化。`,
      successRate: 0,
    };
  }

  const successRate = cfg.rates[currentLevel] ?? 0;

  // 安定值內必定成功
  if (currentLevel < cfg.safeLevel) {
    const newLevel = currentLevel + 1;
    return {
      success: true,
      newLevel,
      newColor: ENHANCE_LEVELS[Math.min(newLevel, 5)].color,
      destroyed: false,
      message: `強化成功！裝備提升至 +${newLevel}（${ENHANCE_LEVELS[Math.min(newLevel, 5)].label}色）。安定值範圍內，必定成功！`,
      successRate,
    };
  }

  // 擲骰
  const roll = Math.random();

  if (roll < successRate) {
    // 成功
    const newLevel = currentLevel + 1;
    return {
      success: true,
      newLevel,
      newColor: ENHANCE_LEVELS[Math.min(newLevel, 5)].color,
      destroyed: false,
      message: `強化成功！裝備提升至 +${newLevel}（${ENHANCE_LEVELS[Math.min(newLevel, 5)].label}色）！`,
      successRate,
    };
  }

  // 失敗 — 檢查是否消失
  const destroyRoll = Math.random();
  if (destroyRoll < cfg.destroyChance) {
    return {
      success: false,
      newLevel: -1,
      newColor: "white",
      destroyed: true,
      message: `強化失敗！裝備在強化過程中碎裂消失了…（${(cfg.destroyChance * 100).toFixed(1)}% 消失機率觸發）`,
      successRate,
    };
  }

  // 失敗 — 退一階
  const newLevel = Math.max(0, currentLevel - 1);
  return {
    success: false,
    newLevel,
    newColor: ENHANCE_LEVELS[Math.min(newLevel, 5)].color,
    destroyed: false,
    message: `強化失敗！裝備退回 +${newLevel}（${ENHANCE_LEVELS[Math.min(newLevel, 5)].label}色）。`,
    successRate,
  };
}

/**
 * 計算強化後的數值加成
 */
export function calcEnhancedStat(baseValue: number, enhanceLevel: number): number {
  const bonus = ENHANCE_STAT_BONUS[enhanceLevel] ?? 0;
  return Math.floor(baseValue * (1 + bonus));
}

/**
 * 計算強化後的數值加成（使用動態設定）
 */
export function calcEnhancedStatWithConfig(baseValue: number, enhanceLevel: number, cfg: EnhanceConfig): number {
  const bonus = cfg.statBonus[enhanceLevel] ?? 0;
  return Math.floor(baseValue * (1 + bonus));
}

/**
 * 取得強化等級資訊
 */
export function getEnhanceLevelInfo(level: number) {
  return ENHANCE_LEVELS[Math.max(0, Math.min(level, MAX_ENHANCE_LEVEL))];
}
