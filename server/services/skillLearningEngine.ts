/**
 * 技能學習引擎 ── GD-028 步驟 10
 *
 * 四種技能學習方式：
 * 1. levelup   ─ 升級自動學習（初階/中階，根據等級+五行+職業）
 * 2. profession ─ 職業解鎖（轉職時自動獲得該職業初始技能）
 * 3. skillbook  ─ 技能書（怪物掉落後使用，含五行門檻檢查）
 * 4. destiny    ─ 天命覺醒（Lv.61+ 特殊任務觸發）
 *
 * 命格加成：命格屬性技能經驗 +50%
 */

import type { Profession, WuXingElement } from "./statEngine";

// ═══════════════════════════════════════════════════════════════
// 一、技能階級門檻定義
// ═══════════════════════════════════════════════════════════════

/** 技能階級 */
export type SkillTier = "basic" | "intermediate" | "advanced" | "destiny" | "legendary";

/** 技能階級門檻配置 */
export interface SkillTierRequirement {
  /** 最低等級 */
  minLevel: number;
  /** 最低五行點數（對應技能五行屬性） */
  minWuxingPoints: number;
  /** 學習方式 */
  acquireMethods: string[];
}

/** 預設技能階級門檻（GM 可調） */
export const DEFAULT_SKILL_TIER_REQUIREMENTS: Record<SkillTier, SkillTierRequirement> = {
  basic: {
    minLevel: 1,
    minWuxingPoints: 0,
    acquireMethods: ["levelup", "skillbook", "profession"],
  },
  intermediate: {
    minLevel: 15,
    minWuxingPoints: 15,
    acquireMethods: ["levelup", "skillbook", "profession"],
  },
  advanced: {
    minLevel: 30,
    minWuxingPoints: 40,
    acquireMethods: ["skillbook", "profession"],
  },
  destiny: {
    minLevel: 61,
    minWuxingPoints: 80,
    acquireMethods: ["destiny"],
  },
  legendary: {
    minLevel: 81,
    minWuxingPoints: 95,
    acquireMethods: ["destiny", "skillbook"],
  },
};

// ═══════════════════════════════════════════════════════════════
// 二、職業初始技能定義
// ═══════════════════════════════════════════════════════════════

/** 每個職業轉職時自動獲得的技能 ID 列表 */
export const PROFESSION_STARTER_SKILLS: Record<string, string[]> = {
  hunter: ["S_M001", "S_M002"],  // 金行技能：疾風箭、鷹眼術
  mage:   ["S_F001", "S_W001"],  // 火/水行技能：火球術、冰霜術
  tank:   ["S_E001", "S_E002"],  // 土行技能：岩盾術、大地之力
  thief:  ["S_M003", "S_M004"],  // 金行技能：暗影步、毒刃
  wizard: ["S_W002", "S_F002"],  // 水/火行技能：治癒術、雷擊
  none: [],
};

// ═══════════════════════════════════════════════════════════════
// 三、升級自動學習規則
// ═══════════════════════════════════════════════════════════════

/** 升級自動學習的技能等級對照表 */
export interface AutoLearnRule {
  /** 學習等級 */
  level: number;
  /** 技能階級 */
  tier: SkillTier;
  /** 需要的五行屬性（null = 不限） */
  requiredElement?: WuXingElement;
  /** 需要的職業（null = 不限） */
  requiredProfession?: Profession;
}

/**
 * 檢查角色是否滿足學習某技能的條件
 */
export function checkSkillLearnRequirements(
  skillTier: SkillTier,
  skillWuxing: WuXingElement,
  skillProfessionRequired: string,
  agentLevel: number,
  agentWuxing: Record<WuXingElement, number>,
  agentProfession: Profession,
  tierRequirements: Record<SkillTier, SkillTierRequirement> = DEFAULT_SKILL_TIER_REQUIREMENTS,
): { canLearn: boolean; reason?: string } {
  const req = tierRequirements[skillTier];
  if (!req) return { canLearn: false, reason: `未知的技能階級: ${skillTier}` };

  // 等級門檻
  if (agentLevel < req.minLevel) {
    return { canLearn: false, reason: `等級不足（需要 Lv.${req.minLevel}，目前 Lv.${agentLevel}）` };
  }

  // 五行門檻（檢查技能對應的五行點數）
  const wuxingPoints = agentWuxing[skillWuxing] ?? 0;
  if (wuxingPoints < req.minWuxingPoints) {
    return {
      canLearn: false,
      reason: `${WX_ZH[skillWuxing]}行點數不足（需要 ${req.minWuxingPoints}，目前 ${Math.floor(wuxingPoints)}）`,
    };
  }

  // 職業門檻
  if (skillProfessionRequired && skillProfessionRequired !== "none") {
    if (agentProfession !== skillProfessionRequired) {
      return {
        canLearn: false,
        reason: `需要職業「${PROFESSION_ZH[skillProfessionRequired] ?? skillProfessionRequired}」`,
      };
    }
  }

  return { canLearn: true };
}

// ═══════════════════════════════════════════════════════════════
// 四、升級時自動學習技能
// ═══════════════════════════════════════════════════════════════

/**
 * 根據角色等級、五行、職業，找出應該自動學習的技能
 *
 * @param newLevel 升級後的等級
 * @param agentWuxing 角色五行點數
 * @param agentProfession 角色職業
 * @param allSkills 所有技能目錄（acquireMethod = "levelup" 的技能）
 * @param alreadyLearned 已學習的技能 ID 集合
 * @returns 應該自動學習的技能 ID 列表
 */
export function getAutoLearnSkills(
  newLevel: number,
  agentWuxing: Record<WuXingElement, number>,
  agentProfession: Profession,
  allSkills: Array<{
    skillId: string;
    learnLevel: number;
    skillTier: string;
    wuxing: string;
    professionRequired: string;
    acquireMethod: string;
  }>,
  alreadyLearned: Set<string>,
  tierRequirements: Record<SkillTier, SkillTierRequirement> = DEFAULT_SKILL_TIER_REQUIREMENTS,
): string[] {
  const toLearn: string[] = [];

  for (const skill of allSkills) {
    // 只處理 levelup 方式的技能
    if (skill.acquireMethod !== "levelup") continue;
    // 已學習的跳過
    if (alreadyLearned.has(skill.skillId)) continue;
    // 等級未到跳過
    if (newLevel < skill.learnLevel) continue;

    // 檢查完整門檻
    const result = checkSkillLearnRequirements(
      skill.skillTier as SkillTier,
      skill.wuxing as WuXingElement,
      skill.professionRequired,
      newLevel,
      agentWuxing,
      agentProfession,
      tierRequirements,
    );

    if (result.canLearn) {
      toLearn.push(skill.skillId);
    }
  }

  return toLearn;
}

// ═══════════════════════════════════════════════════════════════
// 五、職業轉職時自動解鎖技能
// ═══════════════════════════════════════════════════════════════

/**
 * 取得轉職後應該自動獲得的技能
 */
export function getProfessionUnlockSkills(
  newProfession: Profession,
  allSkills: Array<{
    skillId: string;
    professionRequired: string;
    acquireMethod: string;
    learnLevel: number;
    skillTier: string;
  }>,
  agentLevel: number,
  alreadyLearned: Set<string>,
): string[] {
  const toLearn: string[] = [];

  // 1. 職業初始技能
  const starterSkills = PROFESSION_STARTER_SKILLS[newProfession] ?? [];
  for (const skillId of starterSkills) {
    if (!alreadyLearned.has(skillId)) {
      toLearn.push(skillId);
    }
  }

  // 2. 該職業的 profession 類型技能（等級已達標的）
  for (const skill of allSkills) {
    if (skill.acquireMethod !== "profession") continue;
    if (skill.professionRequired !== newProfession) continue;
    if (agentLevel < skill.learnLevel) continue;
    if (alreadyLearned.has(skill.skillId)) continue;
    if (toLearn.includes(skill.skillId)) continue;
    toLearn.push(skill.skillId);
  }

  return toLearn;
}

// ═══════════════════════════════════════════════════════════════
// 六、命格技能經驗加成
// ═══════════════════════════════════════════════════════════════

/** 五行→命格對照 */
const FATE_ELEMENT_MAP: Record<WuXingElement, string> = {
  wood: "青龍", fire: "朱雀", earth: "麒麟", metal: "白虎", water: "玄武",
};

/**
 * 計算技能經驗加成倍率
 *
 * 命格屬性技能經驗 +50%
 * 例：青龍命（木）使用木行技能時，技能經驗 ×1.5
 */
export function calcSkillExpBonus(
  skillWuxing: WuXingElement,
  agentFateElement: WuXingElement,
  baseBonusRate: number = 0.5,
): number {
  if (skillWuxing === agentFateElement) {
    return 1 + baseBonusRate; // 1.5x
  }
  return 1.0;
}

// ═══════════════════════════════════════════════════════════════
// 七、天命覺醒技能條件
// ═══════════════════════════════════════════════════════════════

export interface DestinyAwakeningCondition {
  /** 最低等級 */
  minLevel: number;
  /** 最低五行點數（命格對應五行） */
  minFateWuxingPoints: number;
  /** 需要完成的任務 ID（null = 無任務需求） */
  questId?: string;
  /** 需要的金幣 */
  goldCost: number;
}

/** 預設天命覺醒條件 */
export const DEFAULT_DESTINY_AWAKENING: DestinyAwakeningCondition = {
  minLevel: 61,
  minFateWuxingPoints: 80,
  goldCost: 10000,
};

/**
 * 檢查是否滿足天命覺醒條件
 */
export function checkDestinyAwakening(
  agentLevel: number,
  agentFateElement: WuXingElement,
  agentWuxing: Record<WuXingElement, number>,
  agentGold: number,
  condition: DestinyAwakeningCondition = DEFAULT_DESTINY_AWAKENING,
): { canAwaken: boolean; reason?: string } {
  if (agentLevel < condition.minLevel) {
    return { canAwaken: false, reason: `等級不足（需要 Lv.${condition.minLevel}）` };
  }

  const fateWuxing = agentWuxing[agentFateElement] ?? 0;
  if (fateWuxing < condition.minFateWuxingPoints) {
    return {
      canAwaken: false,
      reason: `${WX_ZH[agentFateElement]}行點數不足（需要 ${condition.minFateWuxingPoints}，目前 ${Math.floor(fateWuxing)}）`,
    };
  }

  if (agentGold < condition.goldCost) {
    return { canAwaken: false, reason: `金幣不足（需要 ${condition.goldCost}）` };
  }

  return { canAwaken: true };
}

// ═══════════════════════════════════════════════════════════════
// 輔助常數
// ═══════════════════════════════════════════════════════════════

const WX_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

const PROFESSION_ZH: Record<string, string> = {
  hunter: "獵人", mage: "法師", tank: "鬥士", thief: "盜賊", wizard: "巫師", none: "無",
};
