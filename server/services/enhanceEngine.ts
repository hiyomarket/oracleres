/**
 * enhanceEngine.ts
 * 裝備強化系統核心引擎（天堂模式 +0 到 +20）
 *
 * 三段安定值設計：
 *   武器：+0~+6 必定成功（白武卷/黃武卷）
 *   防具：+0~+4 必定成功（白防卷/黃防卷）
 *   飾品：+0~+2 必定成功（白防卷/黃防卷）
 *
 * 四種卷軸：
 *   weapon_scroll（白武卷）：武器專用，失敗 = 爆裝，+1
 *   blessed_weapon_scroll（黃武卷）：武器專用，爆裝率減半，成功 +1~+3 隨機
 *   armor_scroll（白防卷）：防具/飾品，失敗 = 爆裝，+1
 *   blessed_armor_scroll（黃防卷）：防具/飾品，爆裝率減半，成功 +1~+3 隨機
 *
 * 失敗結果（安定值後）：
 *   - 爆裝（裝備消失）：機率見 DESTROY_RATES
 *   - 閃光失敗（裝備保留，強化值不變）：1 - 爆裝率
 *   注意：天堂模式沒有「退階」，只有「爆裝」或「閃光失敗」
 */
import { getDb } from "../db";
import { gameConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ─── 20 色等級定義 ─────────────────────────────────────────
export const ENHANCE_LEVELS = [
  { level: 0,  color: "white",         label: "白",      colorHex: "#94a3b8" },
  { level: 1,  color: "green",         label: "綠",      colorHex: "#4ade80" },
  { level: 2,  color: "blue",          label: "藍",      colorHex: "#60a5fa" },
  { level: 3,  color: "purple",        label: "紫",      colorHex: "#a78bfa" },
  { level: 4,  color: "orange",        label: "橙",      colorHex: "#fb923c" },
  { level: 5,  color: "red",           label: "紅",      colorHex: "#ef4444" },
  { level: 6,  color: "gold",          label: "金",      colorHex: "#f59e0b" },
  { level: 7,  color: "platinum",      label: "白金",    colorHex: "#fde68a" },
  { level: 8,  color: "cyan",          label: "青",      colorHex: "#34d399" },
  { level: 9,  color: "skyblue",       label: "天藍",    colorHex: "#38bdf8" },
  { level: 10, color: "starpurple",    label: "星紫",    colorHex: "#8b5cf6" },
  { level: 11, color: "deepred",       label: "深紅",    colorHex: "#dc2626" },
  { level: 12, color: "flameorange",   label: "烈焰橙",  colorHex: "#ea580c" },
  { level: 13, color: "lavagold",      label: "熔岩金",  colorHex: "#d97706" },
  { level: 14, color: "destinyyellow", label: "天命黃",  colorHex: "#eab308" },
  { level: 15, color: "artifactcyan",  label: "神器青",  colorHex: "#06b6d4" },
  { level: 16, color: "legendwhite",   label: "傳說白金",colorHex: "#e2e8f0" },
  { level: 17, color: "ancientsilver", label: "太古銀",  colorHex: "#cbd5e1" },
  { level: 18, color: "chaosmag",      label: "混沌紫紅",colorHex: "#c026d3" },
  { level: 19, color: "holywhite",     label: "神聖金白",colorHex: "#fef9c3" },
  { level: 20, color: "rainbow",       label: "絕頂彩虹",colorHex: "rainbow" },
] as const;

export type EnhanceColor = typeof ENHANCE_LEVELS[number]["color"];

// ─── 最大強化等級 ─────────────────────────────────────────
export const MAX_ENHANCE_LEVEL = 20;

// ─── 卷軸類型 ─────────────────────────────────────────────
export type ScrollType =
  | "weapon_scroll"          // 白武卷
  | "blessed_weapon_scroll"  // 黃武卷
  | "armor_scroll"           // 白防卷
  | "blessed_armor_scroll";  // 黃防卷

/** 武器卷軸適用的部位 */
export const WEAPON_SLOTS = ["weapon", "offhand"];
/** 防具卷軸適用的部位（防具 + 飾品） */
export const ARMOR_SLOTS = ["helmet", "armor", "shoes", "gloves", "accessory", "ring", "necklace", "amulet"];

/** 判斷卷軸是否適用於該裝備部位 */
export function isScrollApplicable(scrollType: ScrollType, equipSlot: string): boolean {
  if (scrollType === "weapon_scroll" || scrollType === "blessed_weapon_scroll") {
    return WEAPON_SLOTS.includes(equipSlot);
  }
  return ARMOR_SLOTS.includes(equipSlot);
}

/** 是否為祝福卷軸（黃卷） */
export function isBlessedScroll(scrollType: ScrollType): boolean {
  return scrollType === "blessed_weapon_scroll" || scrollType === "blessed_armor_scroll";
}

// ─── 三段安定值（依裝備部位） ────────────────────────────
/**
 * 取得裝備部位的安定值
 * 安定值以下（含）強化必定成功
 */
export function getSafeLevel(equipSlot: string): number {
  if (WEAPON_SLOTS.includes(equipSlot)) return 6;  // 武器：+0~+6
  if (["ring", "necklace", "amulet", "accessory"].includes(equipSlot)) return 2;  // 飾品：+0~+2
  return 4;  // 防具（helmet/armor/shoes/gloves）：+0~+4
}

// ─── 成功率表（+3 到 +20 的機率） ────────────────────────
/**
 * 各等級強化成功率（從該等級升到下一級）
 * 安定值內不查此表（必定成功）
 * +7~+9：33.33%（過3裝內）
 * +9~+10：1.5%（驟降）
 * +10~+20：緩慢降低
 * 注意：飾品安定值為 +2，所以 +3 開始就查此表
 *       防具安定值為 +4，所以 +5 開始查此表
 *       武器安定值為 +6，所以 +7 開始查此表
 */
export const ENHANCE_SUCCESS_RATES: Record<number, number> = {
  3:  0.3333, // 飾品 +3（安定值後第一級）
  4:  0.3333, // 飾品 +4
  5:  0.3333, // 防具 +5（安定值後第一級）
  6:  0.3333, // 防具 +6
  7:  0.3333, // 武器 +7（安定值後第一級）
  8:  0.3333, // +8
  9:  0.3333, // +9（最後一個 33.33%）
  10: 0.0150, // +10（驟降到 1.5%）
  11: 0.0135, // +11
  12: 0.0120, // +12
  13: 0.0105, // +13
  14: 0.0090, // +14
  15: 0.0075, // +15
  16: 0.0062, // +16
  17: 0.0050, // +17
  18: 0.0040, // +18
  19: 0.0030, // +19
  20: 0.0000, // +20 已是最高，不可繼續
};

// ─── 爆裝率表（失敗時裝備消失的機率） ────────────────────
/**
 * 安定值後失敗時的爆裝率（白卷）
 * 黃卷的爆裝率為此表的一半
 * 天堂模式：安定值後失敗 = 100% 爆裝（無退階）
 */
export const DESTROY_RATES: Record<number, number> = {
  3:  1.0,  4:  1.0,  5:  1.0,  6:  1.0,
  7:  1.0,  8:  1.0,  9:  1.0,  10: 1.0,
  11: 1.0,  12: 1.0,  13: 1.0,  14: 1.0,
  15: 1.0,  16: 1.0,  17: 1.0,  18: 1.0,
  19: 1.0,
};

// ─── 數值加成百分比（每 +1 都有成長） ────────────────────
/**
 * 每個強化等級對基礎數值的加成百分比
 * 安定值內加成較低，過安定值後加速成長，+15 後大幅躍升
 */
export const ENHANCE_STAT_BONUS: Record<number, number> = {
  0:  0.00,  // +0：無加成
  1:  0.02,  // +1：+2%
  2:  0.04,  // +2：+4%
  3:  0.06,  // +3：+6%
  4:  0.09,  // +4：+9%
  5:  0.12,  // +5：+12%
  6:  0.16,  // +6：+16%（武器安定值上限）
  7:  0.20,  // +7：+20%
  8:  0.25,  // +8：+25%
  9:  0.30,  // +9：+30%
  10: 0.36,  // +10：+36%
  11: 0.43,  // +11：+43%
  12: 0.50,  // +12：+50%
  13: 0.57,  // +13：+57%
  14: 0.65,  // +14：+65%
  15: 0.80,  // +15：+80%（神器青，質的飛躍）
  16: 1.00,  // +16：+100%（傳說白金，翻倍）
  17: 1.25,  // +17：+125%
  18: 1.55,  // +18：+155%
  19: 2.00,  // +19：+200%
  20: 3.00,  // +20：+300%（絕頂彩虹）
};

// ─── 動態設定型別 ─────────────────────────────────────────
export type EnhanceConfig = {
  successRates: Record<number, number>;
  destroyRates: Record<number, number>;
  statBonus: Record<number, number>;
  maxLevel: number;
};

/**
 * 從 game_config 讀取強化系統的動態設定
 * config keys:
 *   enhance_success_rates  → JSON: {"7":0.3333,"8":0.3333,...}
 *   enhance_destroy_rates  → JSON: {"7":1.0,"8":1.0,...}
 *   enhance_stat_bonus     → JSON: {"0":0,"1":0.02,...}
 *   enhance_max_level      → 最大等級（預設 20）
 */
export async function getEnhanceConfig(): Promise<EnhanceConfig> {
  const defaults: EnhanceConfig = {
    successRates: { ...ENHANCE_SUCCESS_RATES },
    destroyRates: { ...DESTROY_RATES },
    statBonus: { ...ENHANCE_STAT_BONUS },
    maxLevel: MAX_ENHANCE_LEVEL,
  };
  try {
    const db = await getDb();
    if (!db) return defaults;
    const rows = await db.select({
      configKey: gameConfig.configKey,
      configValue: gameConfig.configValue,
    }).from(gameConfig).where(eq(gameConfig.isActive, 1));
    const cfgMap = new Map(rows.map(r => [r.configKey, r.configValue]));

    if (cfgMap.has("enhance_max_level")) {
      const v = parseInt(cfgMap.get("enhance_max_level")!, 10);
      if (!isNaN(v) && v >= 1 && v <= 20) defaults.maxLevel = v;
    }
    if (cfgMap.has("enhance_success_rates")) {
      try {
        const parsed = JSON.parse(cfgMap.get("enhance_success_rates")!);
        if (typeof parsed === "object") {
          for (const [k, val] of Object.entries(parsed)) {
            const lv = parseInt(k, 10);
            if (!isNaN(lv) && typeof val === "number") defaults.successRates[lv] = val;
          }
        }
      } catch { /* ignore */ }
    }
    if (cfgMap.has("enhance_destroy_rates")) {
      try {
        const parsed = JSON.parse(cfgMap.get("enhance_destroy_rates")!);
        if (typeof parsed === "object") {
          for (const [k, val] of Object.entries(parsed)) {
            const lv = parseInt(k, 10);
            if (!isNaN(lv) && typeof val === "number") defaults.destroyRates[lv] = val;
          }
        }
      } catch { /* ignore */ }
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
      } catch { /* ignore */ }
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
  flashEffect: boolean;   // 閃光效果（失敗但未爆裝時）
  bonusLevels: number;    // 黃卷成功時的隨機加成等級數（1~3）
  message: string;
  successRate: number;
  destroyRate: number;
};

/**
 * 取得等級顏色資訊（安全版，超出範圍 clamp 到 20）
 */
export function getEnhanceLevelInfo(level: number) {
  const clamped = Math.max(0, Math.min(level, MAX_ENHANCE_LEVEL));
  return ENHANCE_LEVELS[clamped];
}

/**
 * 執行強化邏輯（使用靜態預設值，供測試用）
 */
export function performEnhance(
  currentLevel: number,
  scrollType: ScrollType,
  equipSlot: string,
): EnhanceResult {
  return performEnhanceWithConfig(currentLevel, scrollType, equipSlot, {
    successRates: ENHANCE_SUCCESS_RATES,
    destroyRates: DESTROY_RATES,
    statBonus: ENHANCE_STAT_BONUS,
    maxLevel: MAX_ENHANCE_LEVEL,
  });
}

/**
 * 執行強化邏輯（使用動態設定）
 *
 * 天堂模式規則：
 * 1. 安定值內：必定成功，+1（黃卷也是 +1，因為安定值內無風險）
 * 2. 安定值後：
 *    - 白卷：成功 +1，失敗 → 爆裝率決定消失或閃光失敗
 *    - 黃卷：成功 +1~+3 隨機，失敗 → 爆裝率減半決定消失或閃光失敗
 */
export function performEnhanceWithConfig(
  currentLevel: number,
  scrollType: ScrollType,
  equipSlot: string,
  cfg: EnhanceConfig,
): EnhanceResult {
  const safeLevel = getSafeLevel(equipSlot);
  const isBlessed = isBlessedScroll(scrollType);

  // 已達最大等級
  if (currentLevel >= cfg.maxLevel) {
    return {
      success: false,
      newLevel: currentLevel,
      newColor: getEnhanceLevelInfo(currentLevel).color,
      destroyed: false,
      flashEffect: false,
      bonusLevels: 0,
      message: `裝備已達最高強化等級（+${cfg.maxLevel}），無法繼續強化。`,
      successRate: 0,
      destroyRate: 0,
    };
  }

  // ── 安定值內：必定成功 ──
  if (currentLevel < safeLevel) {
    const newLevel = currentLevel + 1;
    return {
      success: true,
      newLevel,
      newColor: getEnhanceLevelInfo(newLevel).color,
      destroyed: false,
      flashEffect: false,
      bonusLevels: 1,
      message: `強化成功！裝備提升至 +${newLevel}（${getEnhanceLevelInfo(newLevel).label}色）。安定值範圍內，必定成功！`,
      successRate: 1.0,
      destroyRate: 0,
    };
  }

  // ── 安定值後：查成功率表 ──
  const successRate = cfg.successRates[currentLevel] ?? 0;
  const baseDestroyRate = cfg.destroyRates[currentLevel] ?? 1.0;
  // 黃卷爆裝率減半
  const destroyRate = isBlessed ? baseDestroyRate * 0.5 : baseDestroyRate;

  const roll = Math.random();

  if (roll < successRate) {
    // ── 成功 ──
    // 黃卷：+1~+3 隨機，但不超過最大等級
    let bonusLevels = 1;
    if (isBlessed) {
      bonusLevels = Math.floor(Math.random() * 3) + 1; // 1, 2, 或 3
    }
    const newLevel = Math.min(currentLevel + bonusLevels, cfg.maxLevel);
    const actualBonus = newLevel - currentLevel;
    const bonusText = isBlessed && actualBonus > 1 ? `（+${actualBonus} 隨機加成！）` : "";
    return {
      success: true,
      newLevel,
      newColor: getEnhanceLevelInfo(newLevel).color,
      destroyed: false,
      flashEffect: false,
      bonusLevels: actualBonus,
      message: `強化成功！裝備提升至 +${newLevel}（${getEnhanceLevelInfo(newLevel).label}色）！${bonusText}`,
      successRate,
      destroyRate,
    };
  }

  // ── 失敗 ──
  const destroyRoll = Math.random();
  if (destroyRoll < destroyRate) {
    // 爆裝
    return {
      success: false,
      newLevel: -1,
      newColor: "white",
      destroyed: true,
      flashEffect: true,
      bonusLevels: 0,
      message: `強化失敗！裝備在強化過程中發出耀眼閃光後碎裂消失了…`,
      successRate,
      destroyRate,
    };
  }

  // 閃光失敗（裝備保留，強化值不變）
  return {
    success: false,
    newLevel: currentLevel,
    newColor: getEnhanceLevelInfo(currentLevel).color,
    destroyed: false,
    flashEffect: true,
    bonusLevels: 0,
    message: `強化失敗！裝備發出一道閃光，但強化未能成功…（裝備保留在 +${currentLevel}）`,
    successRate,
    destroyRate,
  };
}

/**
 * 計算強化後的數值加成（HP/ATK/DEF/SPD/MATK/MDEF）
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
 * 計算強化後的五行抗性加成（與數值加成使用相同百分比曲線）
 */
export function calcEnhancedResist(baseResist: number, enhanceLevel: number): number {
  const bonus = ENHANCE_STAT_BONUS[enhanceLevel] ?? 0;
  return Math.floor(baseResist * (1 + bonus));
}

/**
 * 計算強化後的五行抗性加成（使用動態設定）
 */
export function calcEnhancedResistWithConfig(baseResist: number, enhanceLevel: number, cfg: EnhanceConfig): number {
  const bonus = cfg.statBonus[enhanceLevel] ?? 0;
  return Math.floor(baseResist * (1 + bonus));
}

/**
 * 取得裝備強化後的完整加成預覽
 * 包含 HP/ATK/DEF/SPD 和五行抗性
 */
export function getEnhancedBonusPreview(
  catalog: {
    hpBonus: number;
    attackBonus: number;
    defenseBonus: number;
    speedBonus: number;
    resistBonus?: { wood: number; fire: number; earth: number; metal: number; water: number } | null;
  },
  enhanceLevel: number,
) {
  const bonus = ENHANCE_STAT_BONUS[enhanceLevel] ?? 0;
  const resist = catalog.resistBonus ?? { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  return {
    hpBonus: Math.floor(catalog.hpBonus * (1 + bonus)),
    attackBonus: Math.floor(catalog.attackBonus * (1 + bonus)),
    defenseBonus: Math.floor(catalog.defenseBonus * (1 + bonus)),
    speedBonus: Math.floor(catalog.speedBonus * (1 + bonus)),
    resistBonus: {
      wood:  Math.floor(resist.wood  * (1 + bonus)),
      fire:  Math.floor(resist.fire  * (1 + bonus)),
      earth: Math.floor(resist.earth * (1 + bonus)),
      metal: Math.floor(resist.metal * (1 + bonus)),
      water: Math.floor(resist.water * (1 + bonus)),
    },
    bonusPercent: bonus,
  };
}
