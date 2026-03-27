/**
 * enhanceEngine.ts
 * 裝備強化系統核心引擎
 *
 * 六色分級：白(+0) / 綠(+1) / 藍(+2) / 紫(+3) / 橙(+4) / 紅(+5)
 * 安定值：2（+0 → +1, +1 → +2 必定成功）
 * 失敗機制：退一階，1% 機率裝備消失
 * 卷軸類型：武器強化卷軸（weapon）、防具強化卷軸（armor）
 */

// ─── 顏色等級定義 ─────────────────────────────────────────
export const ENHANCE_LEVELS = [
  { level: 0, color: "white",  label: "白", colorHex: "#94a3b8" },
  { level: 1, color: "green",  label: "綠", colorHex: "#4ade80" },
  { level: 2, color: "blue",   label: "藍", colorHex: "#60a5fa" },
  { level: 3, color: "purple", label: "紫", colorHex: "#a78bfa" },
  { level: 4, color: "orange", label: "橙", colorHex: "#fb923c" },
  { level: 5, color: "red",    label: "紅", colorHex: "#ef4444" },
] as const;

export type EnhanceColor = typeof ENHANCE_LEVELS[number]["color"];

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

// ─── 強化數值加成 ─────────────────────────────────────────
/** 每個強化等級對基礎數值的加成百分比 */
export const ENHANCE_STAT_BONUS: Record<number, number> = {
  0: 0,      // +0：無加成
  1: 0.05,   // +1：+5%
  2: 0.10,   // +2：+10%
  3: 0.18,   // +3：+18%
  4: 0.28,   // +4：+28%
  5: 0.40,   // +5：+40%
};

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
 * 執行強化邏輯
 * @param currentLevel 當前強化等級（0-4）
 * @returns 強化結果
 */
export function performEnhance(currentLevel: number): EnhanceResult {
  // 已達最大等級
  if (currentLevel >= MAX_ENHANCE_LEVEL) {
    return {
      success: false,
      newLevel: currentLevel,
      newColor: ENHANCE_LEVELS[currentLevel].color,
      destroyed: false,
      message: "裝備已達最高強化等級（+5 紅），無法繼續強化。",
      successRate: 0,
    };
  }

  const successRate = ENHANCE_RATES[currentLevel] ?? 0;

  // 安定值內必定成功
  if (currentLevel < SAFE_LEVEL) {
    const newLevel = currentLevel + 1;
    return {
      success: true,
      newLevel,
      newColor: ENHANCE_LEVELS[newLevel].color,
      destroyed: false,
      message: `強化成功！裝備提升至 +${newLevel}（${ENHANCE_LEVELS[newLevel].label}色）。安定值範圍內，必定成功！`,
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
      newColor: ENHANCE_LEVELS[newLevel].color,
      destroyed: false,
      message: `強化成功！裝備提升至 +${newLevel}（${ENHANCE_LEVELS[newLevel].label}色）！`,
      successRate,
    };
  }

  // 失敗 — 檢查是否消失
  const destroyRoll = Math.random();
  if (destroyRoll < DESTROY_CHANCE) {
    return {
      success: false,
      newLevel: -1,
      newColor: "white",
      destroyed: true,
      message: `強化失敗！裝備在強化過程中碎裂消失了…（1% 消失機率觸發）`,
      successRate,
    };
  }

  // 失敗 — 退一階
  const newLevel = currentLevel - 1;
  return {
    success: false,
    newLevel,
    newColor: ENHANCE_LEVELS[newLevel].color,
    destroyed: false,
    message: `強化失敗！裝備退回 +${newLevel}（${ENHANCE_LEVELS[newLevel].label}色）。`,
    successRate,
  };
}

/**
 * 計算強化後的數值加成
 * @param baseValue 基礎數值
 * @param enhanceLevel 強化等級
 * @returns 加成後的數值
 */
export function calcEnhancedStat(baseValue: number, enhanceLevel: number): number {
  const bonus = ENHANCE_STAT_BONUS[enhanceLevel] ?? 0;
  return Math.floor(baseValue * (1 + bonus));
}

/**
 * 取得強化等級資訊
 */
export function getEnhanceLevelInfo(level: number) {
  return ENHANCE_LEVELS[Math.max(0, Math.min(level, MAX_ENHANCE_LEVEL))];
}
