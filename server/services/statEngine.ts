/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── 屬性公式引擎 statEngine.ts
 * GD-028 核心實作
 * ═══════════════════════════════════════════════════════════════
 *
 * 本模組是全系統唯一的角色屬性計算入口。
 * 所有角色（人物/寵物）的戰鬥數值都必須經過此引擎計算。
 *
 * 設計原則：
 * 1. 所有公式係數都從 gameEngineConfig 讀取，後台可調
 * 2. 五行比例（來自用戶真實八字）是屬性計算的核心
 * 3. 命格加成（青龍/朱雀/白虎/玄武/麒麟）融入公式
 * 4. 潛能點數分配提供玩家自訂空間
 * 5. 裝備加成在此引擎之外疊加（戰鬥時額外計算）
 */

import { getStatBalanceConfig, getStatCaps, getEngineConfig } from "../gameEngineConfig";

// ═══════════════════════════════════════════════════════════════
// 一、型別定義
// ═══════════════════════════════════════════════════════════════

export type WuXingElement = "wood" | "fire" | "earth" | "metal" | "water";

export interface WuXingValues {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
}

/** 潛能點數分配 */
export interface PotentialAllocation {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
}

/** 完整角色戰鬥數值 */
export interface FullCharacterStats {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  matk: number;
  mdef: number;
  spr: number;
  critRate: number;
  critDamage: number;
  healPower: number;
  hitRate: number;
}

/** 命格加成定義 */
export interface FateBonus {
  label: string;
  emoji: string;
  bonuses: Partial<Record<keyof FullCharacterStats, number>>; // 百分比加成（如 0.10 = +10%）
}

// ═══════════════════════════════════════════════════════════════
// 二、命格加成表（後台可調 → 步驟 8 gameSystemConfig）
// ═══════════════════════════════════════════════════════════════

/** 命格加成預設值（百分比） */
export const DEFAULT_FATE_BONUSES: Record<WuXingElement, FateBonus> = {
  wood: {
    label: "青龍命",
    emoji: "🐉",
    bonuses: { hp: 0.10, healPower: 0.05 },
  },
  fire: {
    label: "朱雀命",
    emoji: "🔥",
    bonuses: { atk: 0.10, matk: 0.10 },
  },
  earth: {
    label: "麒麟命",
    emoji: "🦌",
    bonuses: { def: 0.10, mdef: 0.10 },
  },
  metal: {
    label: "白虎命",
    emoji: "🐅",
    bonuses: { spd: 0.10, critRate: 5 }, // critRate 是絕對值加成（+5%）
  },
  water: {
    label: "玄武命",
    emoji: "🐢",
    bonuses: { mp: 0.10, spr: 0.05 },
  },
};

// ═══════════════════════════════════════════════════════════════
// 2.5、職業加成表
// ═══════════════════════════════════════════════════════════════

export type Profession = "none" | "hunter" | "mage" | "tank" | "thief" | "wizard";

export interface ProfessionDef {
  label: string;
  emoji: string;
  desc: string;
  /** 百分比加成（如 0.15 = +15%），critRate 為絕對值加成 */
  bonuses: Partial<Record<keyof FullCharacterStats, number>>;
  /** 轉職最低等級 */
  minLevel: number;
  /** 轉職金幣費用 */
  goldCost: number;
}

/** 職業加成預設值 */
export const PROFESSION_DEFS: Record<Profession, ProfessionDef> = {
  none: {
    label: "無職業",
    emoji: "🔰",
    desc: "尚未選擇職業，等級過 10 後可轉職",
    bonuses: {},
    minLevel: 0,
    goldCost: 0,
  },
  hunter: {
    label: "獵人",
    emoji: "🏹",
    desc: "放置效率型，採集力和尋寶力加成，對野獸系傷害提升",
    bonuses: { atk: 0.08, spd: 0.05, critRate: 3, healPower: 0.05 },
    minLevel: 10,
    goldCost: 1000,
  },
  mage: {
    label: "法師",
    emoji: "🔮",
    desc: "魔法攻擊型，元素傷害極強，但身體脆弱",
    bonuses: { matk: 0.15, mp: 0.10, spr: 0.08, critDamage: 10 },
    minLevel: 10,
    goldCost: 1000,
  },
  tank: {
    label: "鬥士",
    emoji: "🛡️",
    desc: "肉盾型，高 HP 高防禦，團隊中的守護者",
    bonuses: { hp: 0.15, def: 0.12, mdef: 0.08 },
    minLevel: 10,
    goldCost: 1000,
  },
  thief: {
    label: "盜賊",
    emoji: "🗡️",
    desc: "暴擊型，高暴擊率和暴擊傷害，適合短戰速決",
    bonuses: { critRate: 8, critDamage: 20, spd: 0.10, atk: 0.05 },
    minLevel: 10,
    goldCost: 1000,
  },
  wizard: {
    label: "巫師",
    emoji: "✨",
    desc: "輔助型，治癒力和精神力極強，可持久作戰",
    bonuses: { healPower: 0.15, spr: 0.12, mp: 0.08, mdef: 0.05 },
    minLevel: 10,
    goldCost: 1000,
  },
};

/** 轉職冷却時間（毫秒） */
export const PROFESSION_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 小時

// ═══════════════════════════════════════════════════════════════
// 三、潛能點數每點效果（後台可調）
// ═══════════════════════════════════════════════════════════════

/** 每點潛能效果預設值 */
export const DEFAULT_POTENTIAL_PER_POINT = {
  hp: 20,
  mp: 10,
  atk: 3,
  def: 3,
  spd: 2,
  matk: 3,
};

// ═══════════════════════════════════════════════════════════════
// 四、核心公式引擎
// ═══════════════════════════════════════════════════════════════

/**
 * GD-028 核心屬性計算公式
 *
 * 公式：
 *   HP   = Lv×12 + 80 + (木÷100)×30 + 潛能分配×20
 *   MP   = Lv×8  + 40 + (水÷100)×20 + 潛能分配×10
 *   ATK  = Lv×8  + 15 + (火÷100)×30 + 潛能分配×3
 *   DEF  = Lv×8  + 15 + (土÷100)×30 + 潛能分配×3
 *   SPD  = Lv×6  + 10 + (金÷100)×20 + 潛能分配×2
 *   MATK = Lv×8  + 15 + (火÷100)×25 + (水÷100)×10 + 潛能分配×3
 *   MDEF = Lv×6  + 10 + (土÷100)×20 + (水÷100)×10
 *   SPR  = Lv×4  + 10 + (水÷100)×15
 *   暴擊率   = 5 + (金÷100)×2
 *   暴擊傷害 = 150 + (火÷100)×10
 *   治癒力   = Lv×2 + (木÷100)×20
 *   命中率   = 80 + (金÷100)×15 + Lv×0.3
 *
 * @param wuxing 五行屬性值（來自用戶八字比例 × 100，如木30代表30%）
 * @param level 角色等級
 * @param potential 潛能點數分配
 * @param fateElement 命格主屬性（用於命格加成）
 * @param configOverride 可選的配置覆蓋（用於測試）
 */
export function calcFullStats(
  wuxing: WuXingValues,
  level: number,
  potential: PotentialAllocation = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 },
  fateElement?: WuXingElement,
  profession?: Profession,
  configOverride?: Partial<ReturnType<typeof getStatBalanceConfig>>,
): FullCharacterStats {
  const cfg = configOverride
    ? { ...getStatBalanceConfig(), ...configOverride }
    : getStatBalanceConfig();
  const caps = getStatCaps();

  const { wood, fire, earth, metal, water } = wuxing;

  // 潛能效果（後台可調，目前使用預設值）
  const pp = DEFAULT_POTENTIAL_PER_POINT;

  // ═══ 基礎公式計算 ═══
  let hp   = Math.floor(level * cfg.statLvHpMult  + cfg.statLvHpBase  + (wood  / 100) * cfg.infuseHpPer100  + potential.hp  * pp.hp);
  let mp   = Math.floor(level * cfg.statLvMpMult  + cfg.statLvMpBase  + (water / 100) * cfg.infuseMpPer100  + potential.mp  * pp.mp);
  let atk  = Math.floor(level * cfg.statLvAtkMult + cfg.statLvAtkBase + (fire  / 100) * cfg.infuseAtkPer100 + potential.atk * pp.atk);
  let def  = Math.floor(level * cfg.statLvDefMult + cfg.statLvDefBase + (earth / 100) * cfg.infuseDefPer100 + potential.def * pp.def);
  let spd  = Math.floor(level * cfg.statLvSpdMult + cfg.statLvSpdBase + (metal / 100) * cfg.infuseSpdPer100 + potential.spd * pp.spd);

  // MATK = Lv×8 + 15 + (火÷100)×25 + (水÷100)×10 + 潛能分配×3
  let matk = Math.floor(level * cfg.statLvAtkMult + cfg.statLvAtkBase + (fire / 100) * 25 + (water / 100) * 10 + potential.matk * pp.matk);

  // MDEF = Lv×6 + 10 + (土÷100)×20 + (水÷100)×10（無潛能分配）
  let mdef = Math.floor(level * cfg.statLvSpdMult + cfg.statLvSpdBase + (earth / 100) * 20 + (water / 100) * 10);

  // SPR = Lv×4 + 10 + (水÷100)×15
  let spr = Math.floor(level * 4 + 10 + (water / 100) * 15);

  // 暴擊率 = 5 + (金÷100)×2
  let critRate = 5 + (metal / 100) * 2;

  // 暴擊傷害 = 150 + (火÷100)×10
  let critDamage = 150 + (fire / 100) * 10;

  // 治癒力 = Lv×2 + (木÷100)×20
  let healPower = Math.floor(level * 2 + (wood / 100) * 20);

  // 命中率 = 80 + (金÷100)×15 + Lv×0.3
  let hitRate = Math.floor(80 + (metal / 100) * 15 + level * 0.3);

  // ═══ 命格加成 ═══
  if (fateElement) {
    const fate = DEFAULT_FATE_BONUSES[fateElement];
    if (fate) {
      for (const [stat, bonus] of Object.entries(fate.bonuses)) {
        const key = stat as keyof FullCharacterStats;
        const val = bonus as number;
        // critRate 的加成是絕對值（+5%），其他是百分比（+10%）
        if (key === "critRate") {
          critRate += val;
        } else {
          // 百分比加成
          switch (key) {
            case "hp": hp = Math.floor(hp * (1 + val)); break;
            case "mp": mp = Math.floor(mp * (1 + val)); break;
            case "atk": atk = Math.floor(atk * (1 + val)); break;
            case "def": def = Math.floor(def * (1 + val)); break;
            case "spd": spd = Math.floor(spd * (1 + val)); break;
            case "matk": matk = Math.floor(matk * (1 + val)); break;
            case "mdef": mdef = Math.floor(mdef * (1 + val)); break;
            case "spr": spr = Math.floor(spr * (1 + val)); break;
            case "critDamage": critDamage = Math.floor(critDamage * (1 + val)); break;
            case "healPower": healPower = Math.floor(healPower * (1 + val)); break;
            case "hitRate": hitRate = Math.floor(hitRate * (1 + val)); break;
          }
        }
      }
    }
  }

  // ═══ 職業加成 ═══
  if (profession && profession !== "none") {
    const prof = PROFESSION_DEFS[profession];
    if (prof) {
      for (const [stat, bonus] of Object.entries(prof.bonuses)) {
        const key = stat as keyof FullCharacterStats;
        const val = bonus as number;
        if (key === "critRate") {
          critRate += val;
        } else if (key === "critDamage") {
          critDamage += val;
        } else {
          switch (key) {
            case "hp": hp = Math.floor(hp * (1 + val)); break;
            case "mp": mp = Math.floor(mp * (1 + val)); break;
            case "atk": atk = Math.floor(atk * (1 + val)); break;
            case "def": def = Math.floor(def * (1 + val)); break;
            case "spd": spd = Math.floor(spd * (1 + val)); break;
            case "matk": matk = Math.floor(matk * (1 + val)); break;
            case "mdef": mdef = Math.floor(mdef * (1 + val)); break;
            case "spr": spr = Math.floor(spr * (1 + val)); break;
            case "healPower": healPower = Math.floor(healPower * (1 + val)); break;
            case "hitRate": hitRate = Math.floor(hitRate * (1 + val)); break;
          }
        }
      }
    }
  }

  // ═══ 套用上限 ═══
  return {
    hp:         Math.min(hp, caps.hp),
    mp:         Math.min(mp, caps.mp),
    atk:        Math.min(atk, caps.atk),
    def:        Math.min(def, caps.def),
    spd:        Math.min(spd, caps.spd),
    matk:       Math.min(matk, caps.matk),
    mdef:       Math.min(mdef, caps.mdef),
    spr:        Math.min(spr, 999),
    critRate:   Math.min(Math.round(critRate * 100) / 100, 100), // 保留兩位小數，上限 100%
    critDamage: Math.min(Math.round(critDamage * 100) / 100, 500), // 上限 500%
    healPower:  Math.min(healPower, 999),
    hitRate:    Math.min(hitRate, 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// 五、向後相容包裝器
// ═══════════════════════════════════════════════════════════════

/**
 * 向後相容：替代舊的 calcCharacterStatsV2
 * 供 tickEngine.ts 和 gameWorld.ts 使用
 */
export function calcCharacterStatsCompat(
  wuxing: WuXingValues,
  level: number,
  fateElement?: WuXingElement,
  profession?: Profession,
): { hp: number; mp: number; atk: number; def: number; spd: number; matk: number; mdef: number; healPower: number; hitRate: number } {
  const full = calcFullStats(wuxing, level, undefined, fateElement, profession);
  return {
    hp: full.hp,
    mp: full.mp,
    atk: full.atk,
    def: full.def,
    spd: full.spd,
    matk: full.matk,
    mdef: full.mdef,
    healPower: full.healPower,
    hitRate: full.hitRate,
  };
}

// ═══════════════════════════════════════════════════════════════
// 六、潛能點數驗證
// ═══════════════════════════════════════════════════════════════

/** 每級獲得的潛能點數 */
export const POTENTIAL_POINTS_PER_LEVEL = 5;

/**
 * 驗證潛能分配是否合法
 * @param allocation 分配方案
 * @param maxPoints 可用總點數
 * @returns 錯誤訊息，null 表示合法
 */
export function validatePotentialAllocation(
  allocation: PotentialAllocation,
  maxPoints: number,
): string | null {
  const total = allocation.hp + allocation.mp + allocation.atk + allocation.def + allocation.spd + allocation.matk;

  if (total > maxPoints) {
    return `分配點數 (${total}) 超過可用點數 (${maxPoints})`;
  }

  for (const [key, val] of Object.entries(allocation)) {
    if (val < 0) {
      return `${key} 不能為負數`;
    }
    if (!Number.isInteger(val)) {
      return `${key} 必須為整數`;
    }
  }

  return null;
}

/**
 * 計算潛能分配後的屬性增量
 * @param allocation 分配方案
 * @returns 各屬性的增量
 */
export function calcPotentialBonus(allocation: PotentialAllocation): Partial<FullCharacterStats> {
  const pp = DEFAULT_POTENTIAL_PER_POINT;
  return {
    hp: allocation.hp * pp.hp,
    mp: allocation.mp * pp.mp,
    atk: allocation.atk * pp.atk,
    def: allocation.def * pp.def,
    spd: allocation.spd * pp.spd,
    matk: allocation.matk * pp.matk,
  };
}

// ═══════════════════════════════════════════════════════════════
// 七、寵物屬性計算（統一入口）
// ═══════════════════════════════════════════════════════════════

/**
 * 計算寵物戰鬥數值
 * 寵物的五行分配繼承自魔物圖鑑（固定不變）
 * 公式與角色相同，但沒有命格加成和潛能分配
 *
 * @param wuxing 寵物五行值（繼承自魔物圖鑑）
 * @param level 寵物等級
 * @param realmMultiplier 境界倍率（初界 1.0, 中界 1.5, 高界 2.0）
 */
export function calcPetStats(
  wuxing: WuXingValues,
  level: number,
  realmMultiplier: number = 1.0,
): FullCharacterStats {
  // 寵物使用基礎公式，無命格加成、無潛能分配
  const base = calcFullStats(wuxing, level);

  // 套用境界倍率
  if (realmMultiplier !== 1.0) {
    return {
      hp:         Math.floor(base.hp * realmMultiplier),
      mp:         Math.floor(base.mp * realmMultiplier),
      atk:        Math.floor(base.atk * realmMultiplier),
      def:        Math.floor(base.def * realmMultiplier),
      spd:        Math.floor(base.spd * realmMultiplier),
      matk:       Math.floor(base.matk * realmMultiplier),
      mdef:       Math.floor(base.mdef * realmMultiplier),
      spr:        Math.floor(base.spr * realmMultiplier),
      critRate:   Math.min(base.critRate * realmMultiplier, 100),
      critDamage: Math.min(base.critDamage * realmMultiplier, 500),
      healPower:  Math.floor(base.healPower * realmMultiplier),
      hitRate:    Math.min(Math.floor(base.hitRate * realmMultiplier), 100),
    };
  }

  return base;
}

// ═══════════════════════════════════════════════════════════════
// 八、工具函數
// ═══════════════════════════════════════════════════════════════

/**
 * 判定命格主屬性（五行中最高的那個）
 */
export function determineFateElement(wuxing: WuXingValues): WuXingElement {
  const entries = Object.entries(wuxing) as [WuXingElement, number][];
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

/**
 * 取得命格資訊
 */
export function getFateInfo(fateElement: WuXingElement): FateBonus {
  return DEFAULT_FATE_BONUSES[fateElement];
}

/**
 * 計算角色在指定等級的完整數值（含命格加成）
 * 用於角色創建、升級、面板顯示
 */
export function calcAgentFullStats(
  wuxing: WuXingValues,
  level: number,
  fateElement: WuXingElement,
  potential: PotentialAllocation = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0, matk: 0 },
  profession: Profession = "none",
): FullCharacterStats {
  return calcFullStats(wuxing, level, potential, fateElement, profession);
}

// ═══════════════════════════════════════════════════════════════
// 九、戰鬥傷害計算（統一入口）
// ═══════════════════════════════════════════════════════════════

/**
 * 五行相剋倍率表
 * 木剋土, 火剋金, 土剋水, 金剋木, 水剋火
 */
const WUXING_OVERCOME: Record<WuXingElement, WuXingElement> = {
  wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire",
};
const WUXING_GENERATE: Record<WuXingElement, WuXingElement> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};

/**
 * 計算五行相剋倍率
 * 剋制 → 1.5, 相生 → 0.8, 其他 → 1.0
 */
export function calcWuxingCombatMultiplier(attacker: WuXingElement, defender: WuXingElement): number {
  if (WUXING_OVERCOME[attacker] === defender) return 1.5;
  if (WUXING_GENERATE[attacker] === defender) return 0.8;
  return 1.0;
}

/**
 * 精神比例係數 A（GD-020 修正一）
 * 用於魔法傷害計算
 */
export function calcSpiritCoefficient(spiritRatio: number): number {
  if (spiritRatio > 119) return 1.1;
  if (spiritRatio >= 113) return 1.0;
  if (spiritRatio >= 105) return 0.9;
  if (spiritRatio >= 97)  return 0.7;
  if (spiritRatio >= 89)  return 0.6;
  if (spiritRatio >= 79)  return 0.4;
  if (spiritRatio >= 69)  return 0.3;
  return 0.1;
}

export interface CombatDamageInput {
  /** 攻擊方 ATK（物理攻擊力） */
  attackerAtk: number;
  /** 攻擊方 MATK（魔法攻擊力） */
  attackerMatk: number;
  /** 攻擊方暴擊率（百分比，如 15 = 15%） */
  attackerCritRate: number;
  /** 攻擊方暴擊傷害（百分比，如 150 = 150%） */
  attackerCritDamage: number;
  /** 攻擊方精神力 */
  attackerSpr: number;
  /** 攻擊方五行屬性值（用於精神比例計算） */
  attackerWuxing: WuXingValues;
  /** 攻擊方主屬性 */
  attackerElement: WuXingElement;
  /** 防禦方 DEF */
  defenderDef: number;
  /** 防禦方 MDEF */
  defenderMdef: number;
  /** 防禦方精神力 */
  defenderSpr: number;
  /** 防禦方主屬性 */
  defenderElement: WuXingElement;
  /** 防禦方五行抗性（百分比，如 30 = 30%） */
  defenderResistance?: number;
  /** 技能倍率（如 1.5 = 150%） */
  skillMultiplier?: number;
  /** 技能屬性（用於五行相剋判定） */
  skillElement?: WuXingElement;
  /** 種族剋制倍率（預設 1.0） */
  raceMultiplier?: number;
  /** 是否為魔法攻擊 */
  isMagic?: boolean;
}

export interface CombatDamageResult {
  /** 最終傷害值 */
  damage: number;
  /** 是否暴擊 */
  isCritical: boolean;
  /** 五行倍率 */
  wuxingMultiplier: number;
  /** 精神係數 A */
  spiritCoeffA: number;
  /** 種族倍率 */
  raceMultiplier: number;
}

/**
 * 統一傷害計算公式
 *
 * 物理傷害 = max(1, ATK × skillMult × spiritCoeffA × raceMult - DEF × 0.5) × wuxingMult × critMult
 * 魔法傷害 = max(1, MATK × skillMult × spiritCoeffA × raceMult - MDEF × 0.5) × wuxingMult × critMult
 *
 * 暴擊判定使用 statEngine 計算的 critRate
 * 暴擊傷害使用 statEngine 計算的 critDamage
 */
export function calcCombatDamage(input: CombatDamageInput): CombatDamageResult {
  const {
    attackerAtk,
    attackerMatk,
    attackerCritRate,
    attackerCritDamage,
    attackerWuxing,
    attackerElement,
    defenderDef,
    defenderMdef,
    defenderSpr,
    defenderElement,
    defenderResistance = 0,
    skillMultiplier = 1.0,
    skillElement,
    raceMultiplier = 1.0,
    isMagic = false,
  } = input;

  // 1. 五行相剋倍率（使用技能屬性，若無則使用攻擊方主屬性）
  const effectiveElement = skillElement ?? attackerElement;
  const wuxingMultiplier = calcWuxingCombatMultiplier(effectiveElement, defenderElement);

  // 2. 精神比例係數 A
  const attackerElementValue = attackerWuxing[effectiveElement] ?? 20;
  const defenderResistValue = Math.max(5, defenderSpr > 0 ? defenderSpr : defenderDef);
  const spiritRatio = (attackerElementValue / defenderResistValue) * 100;
  const spiritCoeffA = calcSpiritCoefficient(spiritRatio);

  // 3. 暴擊判定
  const isCritical = Math.random() * 100 < attackerCritRate;
  const critMultiplier = isCritical ? (attackerCritDamage / 100) : 1.0;

  // 4. 基礎傷害計算
  const baseAtk = isMagic ? attackerMatk : attackerAtk;
  const baseDef = isMagic ? defenderMdef : defenderDef;
  const rawDamage = Math.max(1, Math.round(
    baseAtk * skillMultiplier * spiritCoeffA * raceMultiplier - baseDef * 0.5
  ));

  // 5. 套用五行倍率和暴擊
  let finalDamage = Math.round(rawDamage * wuxingMultiplier * critMultiplier);

  // 6. 套用抗性減傷
  if (defenderResistance > 0) {
    finalDamage = Math.round(finalDamage * (1 - Math.min(defenderResistance, 50) / 100));
  }

  return {
    damage: Math.max(1, finalDamage),
    isCritical,
    wuxingMultiplier,
    spiritCoeffA,
    raceMultiplier,
  };
}

/**
 * 計算閃避率
 * 基於速度差異
 */
export function calcDodgeRate(attackerSpd: number, defenderSpd: number): number {
  return Math.min(0.3, defenderSpd / (defenderSpd + attackerSpd + 10));
}

/**
 * 計算格擋率（固定 15%）
 */
export function calcBlockRate(): number {
  return 0.15;
}

/**
 * 判定先手
 * 速度高者先手
 */
export function determineFirstStrike(agentSpd: number, monsterSpd: number): boolean {
  return agentSpd >= monsterSpd;
}
