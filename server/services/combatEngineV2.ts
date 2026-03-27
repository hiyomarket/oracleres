/**
 * ═══════════════════════════════════════════════════════════════
 * 天命共振 ── GD-020 回合制戰鬥引擎 V2
 * ═══════════════════════════════════════════════════════════════
 *
 * 核心設計：
 * 1. 先手判定：SPD 降冪 + 角色優先於寵物 + 隨機雜湊
 * 2. 人寵協同：角色 + 寵物 = 2 個行動單位，分開排序
 * 3. 指令系統：攻擊/技能/防禦/道具/逃跑/投降
 * 4. 傷害公式：物理 ATK×2-DEF÷2 / 魔法 MAG×2-MDEF÷2
 * 5. 狀態效果：DoT/眩暈/冰凍/中毒/灼燒/石化/混亂/遺忘/昏睡
 * 6. AI 決策樹：HP 閾值 + MP 判斷 + 技能選擇
 * 7. 戰鬥狀態機：START→SPEED_SORT→TURN→CHECK_END→END
 */

import type { WuXing } from "../../shared/types";
import { calcWuxingMultiplier } from "../../shared/mapNodes";
import { DESTINY_SKILLS, DESTINY_AWAKENING_EFFECTS, getDestinySkillPower } from "./petEngine";
import { getRewardMultipliers } from "../gameEngineConfig";

// ═══════════════════════════════════════════════════════════════
// 類型定義
// ═══════════════════════════════════════════════════════════════

export type BattleMode = "idle" | "player_closed" | "player_open" | "pvp" | "map_mob" | "boss";
export type BattleState = "waiting" | "speed_sort" | "turn_begin" | "player_turn" | "enemy_turn" | "calculating" | "status_effect" | "check_end" | "ended";
export type ParticipantType = "character" | "pet" | "monster";
export type ParticipantSide = "ally" | "enemy";
export type CommandType = "attack" | "skill" | "defend" | "item" | "flee" | "surrender" | "auto";

export interface CombatSkill {
  id: string;
  name: string;
  skillType: string;       // attack / heal / buff / debuff / special
  damageMultiplier: number; // 威力百分比 / 100
  mpCost: number;
  wuxing?: string;
  cooldown: number;
  currentCooldown?: number;
  /** 附加效果 */
  additionalEffect?: {
    type: string;           // poison, burn, freeze, stun, petrify, confuse, forget, sleep
    chance: number;         // 0-100
    duration?: number;
    value?: number;
  };
  /** 覺醒效果（Lv10 天命技能） */
  awakening?: typeof DESTINY_AWAKENING_EFFECTS[string];
  /** 技能等級 */
  skillLevel?: number;
}

export interface StatusEffect {
  type: string;           // poison, burn, freeze, stun, petrify, confuse, forget, sleep
  duration: number;       // 剩餘回合數
  value: number;          // 每回合傷害值或效果強度
  source: string;         // 施加者名稱
  appliedRound: number;   // 施加回合
}

export interface BattleParticipant {
  id: number;             // 唯一 ID
  type: ParticipantType;
  side: ParticipantSide;
  name: string;
  level: number;
  // 屬性
  maxHp: number;
  currentHp: number;
  maxMp: number;
  currentMp: number;
  attack: number;
  defense: number;
  magicAttack: number;
  magicDefense: number;
  speed: number;
  // 五行
  dominantElement?: WuXing;
  race?: string;
  // 技能
  skills: CombatSkill[];
  // 狀態
  isDefending: boolean;
  isDefeated: boolean;
  speedScore: number;
  statusEffects: StatusEffect[];
  // 關聯 ID
  agentId?: number;
  petId?: number;
  monsterId?: string;
  // 寵物天命技能使用次數追蹤
  destinySkillUsage?: Record<string, number>;
}

export interface BattleCommand {
  participantId: number;
  commandType: CommandType;
  targetId?: number;
  skillId?: string;
  itemId?: string;
}

export interface BattleLogEntry {
  round: number;
  actorId: number;
  actorName: string;
  logType: string;        // damage, heal, buff, debuff, flee, defeat, status_tick, defend, miss
  targetId?: number;
  targetName?: string;
  value: number;
  isCritical: boolean;
  skillName?: string;
  elementBoostDesc?: string;
  statusEffectDesc?: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface BattleResult {
  result: "win" | "lose" | "flee" | "draw";
  rounds: number;
  logs: BattleLogEntry[];
  /** 獎勵倍率 */
  rewardMultiplier: number;
  /** 寵物天命技能使用次數 */
  petDestinySkillUsage: Record<string, number>;
  /** 怪物剩餘 HP 百分比（用於重傷捕捉判定） */
  monsterHpPercent?: number;
}

/** 獎勵倍率表（idle/player_closed/player_open 從後台配置讀取） */
export function getRewardMultiplierForMode(mode: BattleMode): number {
  const dynamic = getRewardMultipliers();
  const table: Record<BattleMode, number> = {
    idle: dynamic.idle,
    player_closed: dynamic.player_closed,
    player_open: dynamic.player_open,
    pvp: 0,
    map_mob: 1.5,
    boss: 2.0,
  };
  return table[mode] ?? 1.0;
}
/** @deprecated 使用 getRewardMultiplierForMode() 代替 */
export const REWARD_MULTIPLIERS: Record<BattleMode, number> = {
  idle: 0.33,
  player_closed: 1.0,
  player_open: 1.5,
  pvp: 0,
  map_mob: 1.5,
  boss: 2.0,
};

// ═══════════════════════════════════════════════════════════════
// 一、先手判定系統
// ═══════════════════════════════════════════════════════════════

/**
 * 計算先手分數
 * 公式：final_speed = spd * 1000 + (500 if CHARACTER else 0) + random_hash % 500
 * 角色優先於寵物，寵物優先於怪物
 */
export function calcSpeedScore(participant: BattleParticipant): number {
  const baseScore = participant.speed * 1000;
  const typeBonus = participant.type === "character" ? 500
    : participant.type === "pet" ? 250
    : 0;
  const randomHash = Math.floor(Math.random() * 500);
  return baseScore + typeBonus + randomHash;
}

/**
 * 排序所有參與者的行動順序
 * @returns 按速度降冪排序的參與者 ID 列表
 */
export function sortTurnOrder(participants: BattleParticipant[]): number[] {
  const alive = participants.filter(p => !p.isDefeated);
  // 計算每個參與者的速度分數
  for (const p of alive) {
    p.speedScore = calcSpeedScore(p);
  }
  // 降冪排序
  alive.sort((a, b) => b.speedScore - a.speedScore);
  return alive.map(p => p.id);
}

// ═══════════════════════════════════════════════════════════════
// 二、傷害計算系統
// ═══════════════════════════════════════════════════════════════

/**
 * 計算物理傷害
 * 公式：(ATK × 2 - DEF ÷ 2) × 隨機係數(0.85~1.15)
 */
export function calcPhysicalDamage(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  skillMultiplier: number = 1.0,
): { damage: number; isCritical: boolean } {
  const rawDamage = attacker.attack * 2 - defender.defense / 2;
  const randomFactor = 0.85 + Math.random() * 0.30; // 0.85~1.15
  // 暴擊判定：5% 基礎暴擊率，暴擊傷害 ×1.5
  const critChance = 0.05 + (attacker.speed / 500); // 速度越高暴擊率越高
  const isCritical = Math.random() < critChance;
  const critMultiplier = isCritical ? 1.5 : 1.0;
  // 防禦減傷
  const defenseReduction = defender.isDefending ? 0.5 : 1.0;
  let damage = Math.max(1, Math.floor(rawDamage * skillMultiplier * randomFactor * critMultiplier * defenseReduction));
  return { damage, isCritical };
}

/**
 * 計算魔法傷害
 * 公式：(MAG × 2 - MDEF ÷ 2) × 隨機係數(0.85~1.15)
 */
export function calcMagicDamage(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  skillMultiplier: number = 1.0,
): { damage: number; isCritical: boolean } {
  const rawDamage = attacker.magicAttack * 2 - defender.magicDefense / 2;
  const randomFactor = 0.85 + Math.random() * 0.30;
  const critChance = 0.03 + (attacker.speed / 600);
  const isCritical = Math.random() < critChance;
  const critMultiplier = isCritical ? 1.5 : 1.0;
  const defenseReduction = defender.isDefending ? 0.5 : 1.0;
  let damage = Math.max(1, Math.floor(rawDamage * skillMultiplier * randomFactor * critMultiplier * defenseReduction));
  return { damage, isCritical };
}

/**
 * 計算五行加成
 */
export function calcElementBoost(
  attackerElement: WuXing | undefined,
  defenderElement: WuXing | undefined,
  skillElement: string | undefined,
): { multiplier: number; description: string } {
  const atkEl = (skillElement || attackerElement) as WuXing | undefined;
  if (!atkEl || !defenderElement) return { multiplier: 1.0, description: "" };
  const mult = calcWuxingMultiplier(atkEl, defenderElement);
  if (mult > 1.2) return { multiplier: mult, description: `${atkEl}剋${defenderElement}，傷害+${Math.round((mult - 1) * 100)}%` };
  if (mult > 1.0) return { multiplier: mult, description: `${atkEl}生${defenderElement}，傷害+${Math.round((mult - 1) * 100)}%` };
  if (mult < 1.0) return { multiplier: mult, description: `${atkEl}被${defenderElement}剋，傷害-${Math.round((1 - mult) * 100)}%` };
  return { multiplier: 1.0, description: "" };
}

// ═══════════════════════════════════════════════════════════════
// 三、狀態效果系統
// ═══════════════════════════════════════════════════════════════

/** 狀態效果定義 */
const STATUS_EFFECTS: Record<string, {
  name: string;
  isDoT: boolean;      // 是否為持續傷害
  isStun: boolean;     // 是否無法行動
  defReduction: number; // 防禦降低百分比
}> = {
  poison:  { name: "中毒", isDoT: true, isStun: false, defReduction: 0 },
  burn:    { name: "灼燒", isDoT: true, isStun: false, defReduction: 0.1 },
  freeze:  { name: "凍結", isDoT: false, isStun: true, defReduction: 0 },
  stun:    { name: "眩暈", isDoT: false, isStun: true, defReduction: 0 },
  petrify: { name: "石化", isDoT: false, isStun: true, defReduction: 0.3 },
  confuse: { name: "混亂", isDoT: false, isStun: false, defReduction: 0 },
  forget:  { name: "遺忘", isDoT: false, isStun: false, defReduction: 0 },
  sleep:   { name: "昏睡", isDoT: false, isStun: true, defReduction: 0 },
};

/**
 * 嘗試施加狀態效果
 */
export function tryApplyStatusEffect(
  target: BattleParticipant,
  effectType: string,
  chance: number,
  duration: number,
  value: number,
  sourceName: string,
  round: number,
): { applied: boolean; description: string } {
  if (Math.random() * 100 > chance) {
    return { applied: false, description: "" };
  }
  // 檢查是否已有同類效果（不疊加，但刷新持續時間）
  const existing = target.statusEffects.find(e => e.type === effectType);
  if (existing) {
    existing.duration = Math.max(existing.duration, duration);
    existing.value = Math.max(existing.value, value);
    return { applied: true, description: `${target.name}的${STATUS_EFFECTS[effectType]?.name || effectType}效果被刷新` };
  }
  target.statusEffects.push({
    type: effectType,
    duration,
    value,
    source: sourceName,
    appliedRound: round,
  });
  return { applied: true, description: `${target.name}陷入${STATUS_EFFECTS[effectType]?.name || effectType}狀態（${duration}回合）` };
}

/**
 * 處理回合開始時的狀態效果
 * @returns 產生的日誌列表
 */
export function processStatusEffects(
  participant: BattleParticipant,
  round: number,
): BattleLogEntry[] {
  const logs: BattleLogEntry[] = [];
  const toRemove: number[] = [];

  for (let i = 0; i < participant.statusEffects.length; i++) {
    const effect = participant.statusEffects[i];
    const def = STATUS_EFFECTS[effect.type];

    if (def?.isDoT && effect.value > 0) {
      // 持續傷害
      const dotDamage = effect.value;
      participant.currentHp = Math.max(0, participant.currentHp - dotDamage);
      logs.push({
        round,
        actorId: participant.id,
        actorName: participant.name,
        logType: "status_tick",
        targetId: participant.id,
        targetName: participant.name,
        value: dotDamage,
        isCritical: false,
        statusEffectDesc: `${def.name}持續傷害`,
        message: `${participant.name}受到${def.name}效果，損失 ${dotDamage} HP`,
      });
      if (participant.currentHp <= 0) {
        participant.isDefeated = true;
        logs.push({
          round,
          actorId: participant.id,
          actorName: participant.name,
          logType: "defeat",
          value: 0,
          isCritical: false,
          message: `${participant.name}因${def.name}效果而倒下！`,
        });
      }
    }

    // 減少持續時間
    effect.duration--;
    if (effect.duration <= 0) {
      toRemove.push(i);
      logs.push({
        round,
        actorId: participant.id,
        actorName: participant.name,
        logType: "buff",
        value: 0,
        isCritical: false,
        statusEffectDesc: `${def?.name || effect.type}效果消失`,
        message: `${participant.name}的${def?.name || effect.type}效果消失了`,
      });
    }
  }

  // 移除過期效果（從後往前刪除）
  for (let i = toRemove.length - 1; i >= 0; i--) {
    participant.statusEffects.splice(toRemove[i], 1);
  }

  return logs;
}

/**
 * 檢查參與者是否被控制（無法行動）
 */
export function isStunned(participant: BattleParticipant): boolean {
  return participant.statusEffects.some(e => {
    const def = STATUS_EFFECTS[e.type];
    return def?.isStun;
  });
}

/**
 * 檢查參與者是否被遺忘（無法使用技能）
 */
export function isForgotten(participant: BattleParticipant): boolean {
  return participant.statusEffects.some(e => e.type === "forget");
}

/**
 * 檢查參與者是否混亂（50% 機率攻擊隊友）
 */
export function isConfused(participant: BattleParticipant): boolean {
  return participant.statusEffects.some(e => e.type === "confuse");
}

// ═══════════════════════════════════════════════════════════════
// 四、AI 決策樹
// ═══════════════════════════════════════════════════════════════

/**
 * AI 決策：根據 HP/MP 狀態和可用技能選擇行動
 */
export function aiDecideCommand(
  actor: BattleParticipant,
  allies: BattleParticipant[],
  enemies: BattleParticipant[],
  round: number,
): BattleCommand {
  const aliveEnemies = enemies.filter(e => !e.isDefeated);
  const aliveAllies = allies.filter(a => !a.isDefeated);
  if (aliveEnemies.length === 0) {
    return { participantId: actor.id, commandType: "attack" };
  }

  const hpPercent = actor.currentHp / actor.maxHp;
  const forgotten = isForgotten(actor);

  // 可用技能（非冷卻中、MP 足夠、未被遺忘）
  const availableSkills = forgotten ? [] : actor.skills.filter(s =>
    (s.currentCooldown ?? 0) <= 0 && actor.currentMp >= s.mpCost
  );

  // 治療技能
  const healSkills = availableSkills.filter(s => s.skillType === "heal");
  // 攻擊技能
  const attackSkills = availableSkills.filter(s =>
    s.skillType === "attack" || s.skillType === "debuff" || s.skillType === "special"
  );

  // HP > 50%：進攻
  if (hpPercent > 0.5) {
    if (attackSkills.length > 0) {
      // 選擇威力最高的技能
      const bestSkill = attackSkills.reduce((a, b) => a.damageMultiplier > b.damageMultiplier ? a : b);
      // 選擇 HP 最低的敵人
      const weakestEnemy = aliveEnemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
      return {
        participantId: actor.id,
        commandType: "skill",
        targetId: weakestEnemy.id,
        skillId: bestSkill.id,
      };
    }
    // 普通攻擊
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    return { participantId: actor.id, commandType: "attack", targetId: target.id };
  }

  // HP < 30%：求生
  if (hpPercent < 0.3) {
    // 嘗試治療
    if (healSkills.length > 0) {
      const bestHeal = healSkills.reduce((a, b) => a.damageMultiplier > b.damageMultiplier ? a : b);
      return {
        participantId: actor.id,
        commandType: "skill",
        targetId: actor.id,
        skillId: bestHeal.id,
      };
    }
    // 防禦
    return { participantId: actor.id, commandType: "defend" };
  }

  // HP 30-50%：平衡策略
  // 有治療技能且 HP < 40% → 治療
  if (hpPercent < 0.4 && healSkills.length > 0) {
    const bestHeal = healSkills.reduce((a, b) => a.damageMultiplier > b.damageMultiplier ? a : b);
    return {
      participantId: actor.id,
      commandType: "skill",
      targetId: actor.id,
      skillId: bestHeal.id,
    };
  }

  // 使用攻擊技能
  if (attackSkills.length > 0) {
    const bestSkill = attackSkills.reduce((a, b) => a.damageMultiplier > b.damageMultiplier ? a : b);
    const target = aliveEnemies.reduce((a, b) => a.currentHp < b.currentHp ? a : b);
    return {
      participantId: actor.id,
      commandType: "skill",
      targetId: target.id,
      skillId: bestSkill.id,
    };
  }

  // 普通攻擊
  const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
  return { participantId: actor.id, commandType: "attack", targetId: target.id };
}

// ═══════════════════════════════════════════════════════════════
// 五、執行指令
// ═══════════════════════════════════════════════════════════════

/**
 * 執行單個指令，返回日誌
 */
export function executeCommand(
  command: BattleCommand,
  participants: BattleParticipant[],
  round: number,
): BattleLogEntry[] {
  const logs: BattleLogEntry[] = [];
  const actor = participants.find(p => p.id === command.participantId);
  if (!actor || actor.isDefeated) return logs;

  // 混亂判定：50% 機率攻擊隊友
  if (isConfused(actor) && Math.random() < 0.5 && (command.commandType === "attack" || command.commandType === "skill")) {
    const allies = participants.filter(p => p.side === actor.side && !p.isDefeated && p.id !== actor.id);
    if (allies.length > 0) {
      const confuseTarget = allies[Math.floor(Math.random() * allies.length)];
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "buff", value: 0, isCritical: false,
        statusEffectDesc: "混亂",
        message: `${actor.name}陷入混亂，攻擊了隊友${confuseTarget.name}！`,
      });
      // 執行普通攻擊打隊友
      const { damage, isCritical } = calcPhysicalDamage(actor, confuseTarget);
      confuseTarget.currentHp = Math.max(0, confuseTarget.currentHp - damage);
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "damage", targetId: confuseTarget.id, targetName: confuseTarget.name,
        value: damage, isCritical,
        message: `${actor.name}混亂中攻擊${confuseTarget.name}，造成 ${damage} 點傷害`,
      });
      if (confuseTarget.currentHp <= 0) {
        confuseTarget.isDefeated = true;
        logs.push({
          round, actorId: actor.id, actorName: actor.name,
          logType: "defeat", targetId: confuseTarget.id, targetName: confuseTarget.name,
          value: 0, isCritical: false,
          message: `${confuseTarget.name}被隊友擊倒了！`,
        });
      }
      return logs;
    }
  }

  switch (command.commandType) {
    case "attack": {
      const target = participants.find(p => p.id === command.targetId);
      if (!target || target.isDefeated) {
        // 自動選擇目標
        const enemies = participants.filter(p => p.side !== actor.side && !p.isDefeated);
        if (enemies.length === 0) break;
        const autoTarget = enemies[0];
        return executeAttack(actor, autoTarget, round);
      }
      return executeAttack(actor, target, round);
    }

    case "skill": {
      const skill = actor.skills.find(s => s.id === command.skillId);
      if (!skill || (skill.currentCooldown ?? 0) > 0 || actor.currentMp < skill.mpCost) {
        // 技能不可用，改為普通攻擊
        const enemies = participants.filter(p => p.side !== actor.side && !p.isDefeated);
        if (enemies.length > 0) return executeAttack(actor, enemies[0], round);
        break;
      }
      const target = participants.find(p => p.id === command.targetId);
      if (!target || target.isDefeated) {
        const enemies = participants.filter(p => p.side !== actor.side && !p.isDefeated);
        const allies = participants.filter(p => p.side === actor.side && !p.isDefeated);
        const autoTarget = skill.skillType === "heal" ? (allies.length > 0 ? allies[0] : actor) : (enemies.length > 0 ? enemies[0] : null);
        if (!autoTarget) break;
        return executeSkill(actor, autoTarget, skill, participants, round);
      }
      return executeSkill(actor, target, skill, participants, round);
    }

    case "defend": {
      actor.isDefending = true;
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "defend", value: 0, isCritical: false,
        message: `${actor.name}進入防禦姿態，本回合受傷減半`,
      });
      break;
    }

    case "flee": {
      // 20% 失敗率
      const fleeSuccess = Math.random() > 0.2;
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "flee", value: fleeSuccess ? 1 : 0, isCritical: false,
        message: fleeSuccess ? `${actor.name}成功逃離了戰鬥！` : `${actor.name}嘗試逃跑，但失敗了！`,
      });
      break;
    }

    case "surrender": {
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "flee", value: 1, isCritical: false,
        message: `${actor.name}投降了！`,
      });
      break;
    }

    case "item": {
      // 道具使用（簡化版：恢復 HP 30%）
      const healAmount = Math.floor(actor.maxHp * 0.3);
      actor.currentHp = Math.min(actor.maxHp, actor.currentHp + healAmount);
      logs.push({
        round, actorId: actor.id, actorName: actor.name,
        logType: "heal", targetId: actor.id, targetName: actor.name,
        value: healAmount, isCritical: false,
        message: `${actor.name}使用道具，恢復 ${healAmount} HP`,
      });
      break;
    }
  }

  return logs;
}

/** 執行普通攻擊 */
function executeAttack(
  attacker: BattleParticipant,
  defender: BattleParticipant,
  round: number,
): BattleLogEntry[] {
  const logs: BattleLogEntry[] = [];
  const { damage, isCritical } = calcPhysicalDamage(attacker, defender);
  const elementBoost = calcElementBoost(attacker.dominantElement, defender.dominantElement, undefined);
  const finalDamage = Math.max(1, Math.floor(damage * elementBoost.multiplier));

  defender.currentHp = Math.max(0, defender.currentHp - finalDamage);
  logs.push({
    round, actorId: attacker.id, actorName: attacker.name,
    logType: "damage", targetId: defender.id, targetName: defender.name,
    value: finalDamage, isCritical,
    elementBoostDesc: elementBoost.description || undefined,
    message: `${attacker.name}攻擊${defender.name}，造成 ${finalDamage} 點${isCritical ? "暴擊" : ""}傷害${elementBoost.description ? `（${elementBoost.description}）` : ""}`,
  });

  if (defender.currentHp <= 0) {
    defender.isDefeated = true;
    logs.push({
      round, actorId: attacker.id, actorName: attacker.name,
      logType: "defeat", targetId: defender.id, targetName: defender.name,
      value: 0, isCritical: false,
      message: `${defender.name}被擊敗了！`,
    });
  }

  return logs;
}

/** 執行技能 */
function executeSkill(
  attacker: BattleParticipant,
  target: BattleParticipant,
  skill: CombatSkill,
  allParticipants: BattleParticipant[],
  round: number,
): BattleLogEntry[] {
  const logs: BattleLogEntry[] = [];

  // 消耗 MP
  attacker.currentMp = Math.max(0, attacker.currentMp - skill.mpCost);
  // 設定冷卻
  skill.currentCooldown = skill.cooldown;

  // 追蹤天命技能使用次數
  if (attacker.type === "pet" && attacker.destinySkillUsage) {
    const destinyKey = Object.keys(DESTINY_SKILLS).find(k => skill.id.includes(k));
    if (destinyKey) {
      attacker.destinySkillUsage[destinyKey] = (attacker.destinySkillUsage[destinyKey] || 0) + 1;
    }
  }

  // 覺醒效果加成
  let awakenMultiplier = 1.0;
  if (skill.awakening) {
    awakenMultiplier = skill.awakening.damageMultiplier;
  }

  if (skill.skillType === "heal") {
    // 治療技能
    const healBase = attacker.magicAttack * skill.damageMultiplier * awakenMultiplier;
    const healAmount = Math.max(1, Math.floor(healBase * (0.9 + Math.random() * 0.2)));
    target.currentHp = Math.min(target.maxHp, target.currentHp + healAmount);
    logs.push({
      round, actorId: attacker.id, actorName: attacker.name,
      logType: "heal", targetId: target.id, targetName: target.name,
      value: healAmount, isCritical: false,
      skillName: skill.name,
      message: `${attacker.name}使用${skill.name}，恢復${target.name} ${healAmount} HP`,
    });

    // 覺醒效果：MP 恢復
    if (skill.awakening?.extraEffect === "mpRestore" && skill.awakening.extraValue) {
      const mpRestore = Math.floor(target.maxMp * skill.awakening.extraValue / 100);
      target.currentMp = Math.min(target.maxMp, target.currentMp + mpRestore);
      logs.push({
        round, actorId: attacker.id, actorName: attacker.name,
        logType: "heal", targetId: target.id, targetName: target.name,
        value: mpRestore, isCritical: false,
        message: `覺醒效果：${target.name}恢復 ${mpRestore} MP`,
      });
    }
  } else {
    // 攻擊/Debuff 技能
    const isMagic = skill.wuxing || skill.skillType === "debuff";
    const { damage, isCritical } = isMagic
      ? calcMagicDamage(attacker, target, skill.damageMultiplier * awakenMultiplier)
      : calcPhysicalDamage(attacker, target, skill.damageMultiplier * awakenMultiplier);

    const elementBoost = calcElementBoost(attacker.dominantElement, target.dominantElement, skill.wuxing);
    let finalDamage = Math.max(1, Math.floor(damage * elementBoost.multiplier));

    // 覺醒效果：護甲穿透
    if (skill.awakening?.extraEffect === "armorPen" && skill.awakening.extraValue) {
      const penPercent = skill.awakening.extraValue / 100;
      const bonusDamage = Math.floor(target.defense * penPercent * 0.5);
      finalDamage += bonusDamage;
    }

    target.currentHp = Math.max(0, target.currentHp - finalDamage);
    logs.push({
      round, actorId: attacker.id, actorName: attacker.name,
      logType: "damage", targetId: target.id, targetName: target.name,
      value: finalDamage, isCritical,
      skillName: skill.name,
      elementBoostDesc: elementBoost.description || undefined,
      message: `${attacker.name}使用${skill.name}攻擊${target.name}，造成 ${finalDamage} 點${isCritical ? "暴擊" : ""}傷害${elementBoost.description ? `（${elementBoost.description}）` : ""}`,
    });

    // 連擊效果
    if (skill.awakening?.extraEffect === "extraHits" && skill.awakening.extraValue) {
      for (let i = 0; i < skill.awakening.extraValue; i++) {
        if (target.isDefeated) break;
        const extraDmg = Math.max(1, Math.floor(finalDamage * 0.6));
        target.currentHp = Math.max(0, target.currentHp - extraDmg);
        logs.push({
          round, actorId: attacker.id, actorName: attacker.name,
          logType: "damage", targetId: target.id, targetName: target.name,
          value: extraDmg, isCritical: false,
          skillName: `${skill.name}(追擊${i + 1})`,
          message: `${attacker.name}追擊${target.name}，造成 ${extraDmg} 點傷害`,
        });
        if (target.currentHp <= 0) {
          target.isDefeated = true;
          logs.push({
            round, actorId: attacker.id, actorName: attacker.name,
            logType: "defeat", targetId: target.id, targetName: target.name,
            value: 0, isCritical: false,
            message: `${target.name}被擊敗了！`,
          });
        }
      }
    }

    // 附加狀態效果
    if (skill.additionalEffect && !target.isDefeated) {
      const eff = skill.additionalEffect;
      const statusResult = tryApplyStatusEffect(
        target, eff.type, eff.chance,
        eff.duration ?? 3,
        eff.value ?? Math.floor(finalDamage * 0.2),
        attacker.name, round,
      );
      if (statusResult.applied) {
        logs.push({
          round, actorId: attacker.id, actorName: attacker.name,
          logType: "debuff", targetId: target.id, targetName: target.name,
          value: 0, isCritical: false,
          statusEffectDesc: statusResult.description,
          message: statusResult.description,
        });
      }
    }

    // 擊敗判定
    if (target.currentHp <= 0 && !target.isDefeated) {
      target.isDefeated = true;
      logs.push({
        round, actorId: attacker.id, actorName: attacker.name,
        logType: "defeat", targetId: target.id, targetName: target.name,
        value: 0, isCritical: false,
        message: `${target.name}被擊敗了！`,
      });
    }
  }

  return logs;
}

// ═══════════════════════════════════════════════════════════════
// 六、戰鬥主循環
// ═══════════════════════════════════════════════════════════════

/**
 * 完整戰鬥模擬（用於掛機模式和快速結算）
 * 自動執行所有回合直到結束
 */
export function simulateBattle(
  participants: BattleParticipant[],
  mode: BattleMode,
  maxRounds: number = 20,
): BattleResult {
  const logs: BattleLogEntry[] = [];
  const rewardMultiplier = getRewardMultiplierForMode(mode);
  const petDestinySkillUsage: Record<string, number> = {};

  for (let round = 1; round <= maxRounds; round++) {
    // ── 1. 速度排序 ──
    const turnOrder = sortTurnOrder(participants);

    // ── 2. 逐一行動 ──
    for (const participantId of turnOrder) {
      const actor = participants.find(p => p.id === participantId);
      if (!actor || actor.isDefeated) continue;

      // 處理狀態效果（回合開始時）
      const statusLogs = processStatusEffects(actor, round);
      logs.push(...statusLogs);
      if (actor.isDefeated) continue;

      // 檢查是否被控制
      if (isStunned(actor)) {
        const stunEffect = actor.statusEffects.find(e => STATUS_EFFECTS[e.type]?.isStun);
        logs.push({
          round, actorId: actor.id, actorName: actor.name,
          logType: "buff", value: 0, isCritical: false,
          statusEffectDesc: `${STATUS_EFFECTS[stunEffect?.type || ""]?.name || "控制"}`,
          message: `${actor.name}處於${STATUS_EFFECTS[stunEffect?.type || ""]?.name || "控制"}狀態，無法行動`,
        });
        continue;
      }

      // 重置防禦狀態
      actor.isDefending = false;

      // AI 決策
      const allies = participants.filter(p => p.side === actor.side);
      const enemies = participants.filter(p => p.side !== actor.side);
      const command = aiDecideCommand(actor, allies, enemies, round);

      // 執行指令
      const commandLogs = executeCommand(command, participants, round);
      logs.push(...commandLogs);

      // 檢查逃跑
      if (command.commandType === "flee") {
        const fleeLog = commandLogs.find(l => l.logType === "flee");
        if (fleeLog?.value === 1) {
          // 合併寵物天命技能使用次數
          for (const p of participants.filter(pp => pp.type === "pet" && pp.destinySkillUsage)) {
            for (const [k, v] of Object.entries(p.destinySkillUsage!)) {
              petDestinySkillUsage[k] = (petDestinySkillUsage[k] || 0) + v;
            }
          }
          return { result: "flee", rounds: round, logs, rewardMultiplier: 0, petDestinySkillUsage };
        }
      }

      // 檢查戰鬥結束
      const alliesAlive = participants.filter(p => p.side === "ally" && !p.isDefeated);
      const enemiesAlive = participants.filter(p => p.side === "enemy" && !p.isDefeated);

      if (enemiesAlive.length === 0) {
        for (const p of participants.filter(pp => pp.type === "pet" && pp.destinySkillUsage)) {
          for (const [k, v] of Object.entries(p.destinySkillUsage!)) {
            petDestinySkillUsage[k] = (petDestinySkillUsage[k] || 0) + v;
          }
        }
        return { result: "win", rounds: round, logs, rewardMultiplier, petDestinySkillUsage };
      }
      if (alliesAlive.length === 0) {
        for (const p of participants.filter(pp => pp.type === "pet" && pp.destinySkillUsage)) {
          for (const [k, v] of Object.entries(p.destinySkillUsage!)) {
            petDestinySkillUsage[k] = (petDestinySkillUsage[k] || 0) + v;
          }
        }
        return { result: "lose", rounds: round, logs, rewardMultiplier: 0, petDestinySkillUsage };
      }
    }

    // ── 3. 回合結束：減少技能冷卻 ──
    for (const p of participants) {
      if (p.isDefeated) continue;
      for (const skill of p.skills) {
        if (skill.currentCooldown && skill.currentCooldown > 0) {
          skill.currentCooldown--;
        }
      }
    }
  }

  // 超過最大回合數 → 平局
  for (const p of participants.filter(pp => pp.type === "pet" && pp.destinySkillUsage)) {
    for (const [k, v] of Object.entries(p.destinySkillUsage!)) {
      petDestinySkillUsage[k] = (petDestinySkillUsage[k] || 0) + v;
    }
  }

  // 計算怪物剩餘 HP 百分比（用於重傷捕捉）
  const monsters = participants.filter(p => p.side === "enemy");
  const totalMaxHp = monsters.reduce((s, m) => s + m.maxHp, 0);
  const totalCurrentHp = monsters.reduce((s, m) => s + Math.max(0, m.currentHp), 0);
  const monsterHpPercent = totalMaxHp > 0 ? (totalCurrentHp / totalMaxHp) * 100 : 0;

  return {
    result: "draw",
    rounds: maxRounds,
    logs,
    rewardMultiplier: rewardMultiplier * 0.5, // 平局獎勵減半
    petDestinySkillUsage,
    monsterHpPercent,
  };
}

// ═══════════════════════════════════════════════════════════════
// 七、快速結算演算法（掛機模式用）
// ═══════════════════════════════════════════════════════════════

/**
 * 快速結算：不產生詳細日誌，只計算結果
 * 用於掛機模式的批量戰鬥
 */
export function quickBattle(
  allyPower: number,     // 我方總戰力
  enemyPower: number,    // 敵方總戰力
  allyLevel: number,
  enemyLevel: number,
): { win: boolean; hpLostPercent: number; roundsEstimate: number } {
  // 戰力比 = 我方 / 敵方
  const powerRatio = allyPower / Math.max(1, enemyPower);
  // 等級差加成
  const levelDiff = allyLevel - enemyLevel;
  const levelBonus = levelDiff > 0 ? 1 + levelDiff * 0.02 : 1 / (1 + Math.abs(levelDiff) * 0.03);
  // 最終勝率
  const adjustedRatio = powerRatio * levelBonus;
  const winChance = Math.min(0.95, Math.max(0.05, 0.5 + (adjustedRatio - 1) * 0.3));
  const win = Math.random() < winChance;
  // 估算 HP 損失
  const hpLostPercent = win
    ? Math.max(5, Math.min(80, Math.floor((1 / adjustedRatio) * 50 + Math.random() * 20)))
    : 100;
  // 估算回合數
  const roundsEstimate = Math.max(3, Math.min(20, Math.floor(10 / adjustedRatio + Math.random() * 5)));

  return { win, hpLostPercent, roundsEstimate };
}

/**
 * 計算總戰力（用於快速結算）
 */
export function calcTotalPower(participant: BattleParticipant): number {
  return participant.attack * 2 + participant.defense + participant.magicAttack * 2
    + participant.magicDefense + participant.speed * 1.5 + participant.maxHp * 0.1;
}
