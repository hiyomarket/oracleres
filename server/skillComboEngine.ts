/**
 * GD-022 技能 Combo 計算引擎
 * 處理：
 * 1. 裝備技能的 Combo 標籤配對加成
 * 2. 命格元素對技能的加成
 * 3. 隱藏技能追蹤器進度更新
 * 4. 覺醒技能效果倍率計算
 */
import { getDb } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  agentSkills,
  skillTemplates,
  hiddenSkillTrackers,
  globalFirstTriggers,
} from "../drizzle/schema";
import { broadcastLiveFeed } from "./liveFeedBroadcast";
import type { WuXing } from "../shared/types";

// ─── 五行元素對應 skill element 字串 ─────────────────────────────────────────
const WUXING_TO_ELEMENT: Record<WuXing, string> = {
  wood: "wood",
  fire: "fire",
  earth: "earth",
  metal: "metal",
  water: "water",
};

// ─── 覺醒倍率表 ───────────────────────────────────────────────────────────────
// tier 0=普通(1.0x), 1=大招(1.3x), 2=奧義(1.6x), 3=神技(2.0x)
const AWAKE_TIER_MULTIPLIER = [1.0, 1.3, 1.6, 2.0];

// ─── Combo 標籤加成規則 ───────────────────────────────────────────────────────
// 當裝備的技能中有 2+ 個共同標籤時，觸發 Combo 加成
const COMBO_BONUS_TABLE: Record<string, number> = {
  "fire":     0.15,  // 火系技能 2+ 個：+15% 傷害
  "water":    0.12,  // 水系技能 2+ 個：+12% 傷害
  "wood":     0.10,  // 木系技能 2+ 個：+10% 傷害
  "metal":    0.18,  // 金系技能 2+ 個：+18% 傷害（攻擊型）
  "earth":    0.08,  // 土系技能 2+ 個：+8% 防禦/回血
  "aoe":      0.20,  // 範圍技能 2+ 個：+20% 群體傷害
  "burn":     0.25,  // 燃燒標籤 2+ 個：+25% 灼燒傷害
  "freeze":   0.20,  // 冰凍標籤 2+ 個：+20% 冰凍效果
  "stun":     0.15,  // 暈眩標籤 2+ 個：+15% 暈眩機率
  "heal":     0.15,  // 治療標籤 2+ 個：+15% 回血量
  "passive":  0.10,  // 被動技能 2+ 個：+10% 全屬性
};

// ─── 命格元素對技能加成 ───────────────────────────────────────────────────────
// 當技能元素與角色命格主屬性相同時，額外加成
const DESTINY_ELEMENT_BONUS = 0.20; // +20% 技能效果

export interface SkillComboResult {
  /** 最終傷害倍率（基礎 1.0） */
  damageMultiplier: number;
  /** 最終治療倍率（基礎 1.0） */
  healMultiplier: number;
  /** 觸發的 Combo 標籤列表 */
  activeComboTags: string[];
  /** 命格加成是否觸發 */
  destinyBonus: boolean;
  /** 說明文字 */
  description: string;
}

/**
 * 計算角色裝備技能的 Combo 加成和命格加成
 * @param agentId 角色 ID
 * @param agentElement 角色命格主屬性（五行）
 * @param activeSkillId 本次使用的技能 ID（null = 普攻）
 */
export async function calcSkillCombo(
  agentId: number,
  agentElement: WuXing,
  activeSkillId: string | null
): Promise<SkillComboResult> {
  const db = await getDb();
  if (!db) {
    return { damageMultiplier: 1.0, healMultiplier: 1.0, activeComboTags: [], destinyBonus: false, description: "" };
  }

  // 取得玩家所有裝備中的技能
  const equipped = await db.select({
    agentSkill: agentSkills,
    template: skillTemplates,
  })
    .from(agentSkills)
    .innerJoin(skillTemplates, eq(agentSkills.skillId, skillTemplates.id))
    .where(and(
      eq(agentSkills.agentId, agentId),
      sql`${agentSkills.installedSlot} IS NOT NULL`
    ));

  if (equipped.length === 0) {
    return { damageMultiplier: 1.0, healMultiplier: 1.0, activeComboTags: [], destinyBonus: false, description: "" };
  }

  // 收集所有技能的 Combo 標籤
  const tagCount: Record<string, number> = {};
  let activeSkillElement: string | null = null;
  let activeSkillAwakeTier = 0;

  for (const { template, agentSkill } of equipped) {
    // 記錄當前使用技能的覺醒階段
    if (activeSkillId && template.id === activeSkillId) {
      activeSkillElement = template.element;
      activeSkillAwakeTier = agentSkill.awakeTier;
    }

    if (template.comboTags) {
      const tags = template.comboTags.split(",").map(t => t.trim()).filter(Boolean);
      for (const tag of tags) {
        tagCount[tag] = (tagCount[tag] ?? 0) + 1;
      }
    }
    // 元素本身也算標籤
    tagCount[template.element] = (tagCount[template.element] ?? 0) + 1;
  }

  // 計算 Combo 加成
  let damageMultiplier = 1.0;
  let healMultiplier = 1.0;
  const activeComboTags: string[] = [];
  const descParts: string[] = [];

  for (const [tag, count] of Object.entries(tagCount)) {
    if (count >= 2 && COMBO_BONUS_TABLE[tag] !== undefined) {
      const bonus = COMBO_BONUS_TABLE[tag];
      activeComboTags.push(tag);
      if (tag === "heal") {
        healMultiplier += bonus;
        descParts.push(`治療Combo+${Math.round(bonus * 100)}%`);
      } else {
        damageMultiplier += bonus;
        descParts.push(`${tag}Combo+${Math.round(bonus * 100)}%`);
      }
    }
  }

  // 命格加成：當前使用技能的元素 = 角色命格主屬性
  let destinyBonus = false;
  if (activeSkillElement && activeSkillElement === WUXING_TO_ELEMENT[agentElement]) {
    destinyBonus = true;
    damageMultiplier += DESTINY_ELEMENT_BONUS;
    descParts.push(`命格加成+${Math.round(DESTINY_ELEMENT_BONUS * 100)}%`);
  }

  // 覺醒倍率加成（當前使用技能的覺醒階段）
  if (activeSkillId && activeSkillAwakeTier > 0) {
    const awakeMult = AWAKE_TIER_MULTIPLIER[activeSkillAwakeTier] ?? 1.0;
    damageMultiplier *= awakeMult;
    const tierNames = ["普通", "大招", "奧義", "神技"];
    descParts.push(`覺醒${tierNames[activeSkillAwakeTier]}×${awakeMult}`);
  }

  return {
    damageMultiplier: Math.round(damageMultiplier * 100) / 100,
    healMultiplier: Math.round(healMultiplier * 100) / 100,
    activeComboTags,
    destinyBonus,
    description: descParts.join("，"),
  };
}

/**
 * 更新隱藏技能追蹤器進度（P2）
 * @param agentId 角色 ID
 * @param trackerId 追蹤器 ID（例如 "S_Wd051_kill_count"）
 * @param increment 增加量（預設 1）
 */
export async function updateHiddenSkillTracker(
  agentId: number,
  trackerId: string,
  increment = 1
): Promise<{ unlocked: boolean; skillId?: string }> {
  const db = await getDb();
  if (!db) return { unlocked: false };

  // 取得追蹤器
  const [tracker] = await db.select().from(hiddenSkillTrackers)
    .where(and(
      eq(hiddenSkillTrackers.agentId, agentId),
      eq(hiddenSkillTrackers.trackerId, trackerId)
    ));

  if (!tracker || tracker.isUnlocked) return { unlocked: false };

  const newValue = tracker.currentValue + increment;
  const justUnlocked = newValue >= tracker.targetValue;

  await db.update(hiddenSkillTrackers)
    .set({
      currentValue: newValue,
      isUnlocked: justUnlocked ? 1 : 0,
      unlockedAt: justUnlocked ? new Date() : null,
    })
    .where(and(
      eq(hiddenSkillTrackers.agentId, agentId),
      eq(hiddenSkillTrackers.trackerId, trackerId)
    ));

  return { unlocked: justUnlocked };
}

/**
 * 初始化角色的隱藏技能追蹤器（首次登入或世界重置後）
 * 為每個隱藏技能建立追蹤器記錄
 */
export async function initHiddenSkillTrackers(agentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // 取得所有隱藏技能
  const hiddenSkills = await db.select({ id: skillTemplates.id })
    .from(skillTemplates)
    .where(and(
      eq(skillTemplates.category, "hidden"),
      eq(skillTemplates.isActive, 1)
    ));

  for (const skill of hiddenSkills) {
    const trackerId = `${skill.id}_kill_count`;
    // 檢查是否已存在
    const [existing] = await db.select().from(hiddenSkillTrackers)
      .where(and(
        eq(hiddenSkillTrackers.agentId, agentId),
        eq(hiddenSkillTrackers.trackerId, trackerId)
      ));

    if (!existing) {
      await db.insert(hiddenSkillTrackers).values({
        agentId,
        trackerId,
        currentValue: 0,
        targetValue: 50, // 預設需要 50 次擊殺
        isUnlocked: 0,
      });
    }
  }
}
