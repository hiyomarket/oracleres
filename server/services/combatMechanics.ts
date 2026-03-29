/**
 * 戰鬥機制模組 v2.0
 * 處理所有 specialMechanic JSON 定義的戰鬥效果
 * 包含：吸血、多段攻擊、護盾、增益減益、吸收、明鏡止水、被動觸發、治療、嘲諷、潔淨、先制等
 */

// ─── 類型定義 ───

/** 擴展的狀態異常類型（v2.0 新增 6 種咒術異常） */
export type StatusEffectType =
  | "poison" | "burn" | "freeze" | "stun" | "slow"  // 原有
  | "petrify" | "sleep" | "confuse" | "forget" | "drunk"; // v2.0 咒術系

/** 戰鬥中的狀態效果實例 */
export interface BattleStatusEffect {
  type: StatusEffectType;
  source: "agent" | "monster";
  remainingTurns: number;
  value: number;       // DoT 傷害值 or 減速值
  chance: number;      // 每回合觸發機率（stun/freeze/confuse 用）
  stackCount?: number; // 疊加層數（中毒可疊加）
}

/** 增益/減益 buff */
export interface BattleBuff {
  stat: "atk" | "def" | "mtk" | "spd" | "mdef";
  percent: number;     // 正數=增益，負數=減益
  remainingTurns: number;
  source: "agent" | "monster";
  skillName: string;
}

/** 護盾效果 */
export interface BattleShield {
  absorbPercent: number; // 吸收傷害百分比（0~1）
  remainingTurns: number;
  source: "agent" | "monster";
  target: "agent" | "monster"; // 護盾保護的對象
}

/** 吸收效果（物理/魔法吸收） */
export interface BattleAbsorb {
  type: "physical" | "magical";
  reflectPercent: number; // 反彈百分比
  remainingTurns: number;
  source: "agent" | "monster";
  target: "agent" | "monster";
}

/** 明鏡止水效果 */
export interface MirrorWater {
  reflectPercent: number;
  remainingTurns: number;
  target: "agent" | "monster";
}

/** 嘲諷效果 */
export interface TauntEffect {
  remainingTurns: number;
  source: "agent" | "monster"; // 誰施放嘲諷
}

/** 被動技能觸發記錄 */
export interface PassiveTrigger {
  skillName: string;
  type: string; // counterAttack, guard, sunflame, knightHonor, resistance
  triggered: boolean;
  value?: number;
}

/** 戰鬥狀態容器 */
export interface BattleState {
  agentHp: number;
  agentMaxHp: number;
  agentMp: number;
  agentMaxMp: number;
  agentBaseAtk: number;
  agentBaseDef: number;
  agentBaseMtk: number;
  agentBaseSpd: number;
  agentBaseMdef: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterMp: number;
  monsterMaxMp: number;
  monsterBaseAtk: number;
  monsterBaseDef: number;
  monsterBaseSpd: number;
  monsterBaseMtk: number;
  monsterBaseMdef: number;

  // 狀態效果
  statusEffects: BattleStatusEffect[];
  buffs: BattleBuff[];
  shields: BattleShield[];
  absorbs: BattleAbsorb[];
  mirrorWaters: MirrorWater[];
  taunt: TauntEffect | null;

  // 戰鬥日誌
  log: string[];
}

// ─── 狀態異常效果名稱映射 ───
export const STATUS_EFFECT_NAMES: Record<StatusEffectType, string> = {
  poison: "中毒",
  burn: "灼燒",
  freeze: "冰凍",
  stun: "眩暈",
  slow: "減速",
  petrify: "石化",
  sleep: "昏睡",
  confuse: "混亂",
  forget: "遺忘",
  drunk: "酒醉",
};

/** 判斷狀態異常是否導致無法行動 */
export function isIncapacitated(effects: BattleStatusEffect[], target: "agent" | "monster"): { stunned: boolean; reason: string } {
  for (const eff of effects) {
    const affectsTarget = eff.source === (target === "agent" ? "monster" : "agent");
    if (!affectsTarget) continue;

    switch (eff.type) {
      case "stun":
      case "freeze":
        // 每回合有機率無法行動
        if (Math.random() * 100 < eff.chance) {
          return { stunned: true, reason: STATUS_EFFECT_NAMES[eff.type] };
        }
        break;
      case "petrify":
        // 石化：100% 無法行動
        return { stunned: true, reason: "石化" };
      case "sleep":
        // 昏睡：100% 無法行動（受到攻擊時解除）
        return { stunned: true, reason: "昏睡" };
      case "confuse":
        // 混亂：50% 機率攻擊自己
        // 不算完全無法行動，在攻擊時處理
        break;
      case "forget":
        // 遺忘：無法使用技能，只能普攻
        break;
      case "drunk":
        // 酒醉：命中率大幅降低
        break;
    }
  }
  return { stunned: false, reason: "" };
}

/** 判斷是否被遺忘（無法使用技能） */
export function isForgotten(effects: BattleStatusEffect[], target: "agent" | "monster"): boolean {
  return effects.some(eff =>
    eff.type === "forget" &&
    eff.source === (target === "agent" ? "monster" : "agent")
  );
}

/** 判斷是否混亂（可能攻擊自己） */
export function isConfused(effects: BattleStatusEffect[], target: "agent" | "monster"): boolean {
  return effects.some(eff =>
    eff.type === "confuse" &&
    eff.source === (target === "agent" ? "monster" : "agent")
  );
}

/** 判斷是否酒醉（命中率降低） */
export function isDrunk(effects: BattleStatusEffect[], target: "agent" | "monster"): boolean {
  return effects.some(eff =>
    eff.type === "drunk" &&
    eff.source === (target === "agent" ? "monster" : "agent")
  );
}

// ─── 回合開始時處理 DoT 和狀態效果 ───
export function processStatusEffectsV2(state: BattleState): {
  agentDot: number;
  monsterDot: number;
  agentStunned: boolean;
  monsterStunned: boolean;
  agentStunReason: string;
  monsterStunReason: string;
  expiredEffects: string[];
} {
  let agentDot = 0;
  let monsterDot = 0;
  const expiredEffects: string[] = [];

  // 檢查無法行動
  const agentCheck = isIncapacitated(state.statusEffects, "agent");
  const monsterCheck = isIncapacitated(state.statusEffects, "monster");

  // 處理 DoT
  for (let i = state.statusEffects.length - 1; i >= 0; i--) {
    const eff = state.statusEffects[i];
    const target = eff.source === "agent" ? "monster" : "agent";

    if (eff.type === "poison" || eff.type === "burn") {
      if (target === "agent") {
        agentDot += eff.value;
      } else {
        monsterDot += eff.value;
      }
    }

    // 回合倒數
    eff.remainingTurns--;
    if (eff.remainingTurns <= 0) {
      expiredEffects.push(`${STATUS_EFFECT_NAMES[eff.type]}效果消失`);
      state.statusEffects.splice(i, 1);
    }
  }

  // 應用 DoT
  if (agentDot > 0) {
    state.agentHp = Math.max(0, state.agentHp - agentDot);
    state.log.push(`旅人受到 ${agentDot} 點持續傷害`);
  }
  if (monsterDot > 0) {
    state.monsterHp = Math.max(0, state.monsterHp - monsterDot);
    state.log.push(`怪物受到 ${monsterDot} 點持續傷害`);
  }

  return {
    agentDot,
    monsterDot,
    agentStunned: agentCheck.stunned,
    monsterStunned: monsterCheck.stunned,
    agentStunReason: agentCheck.reason,
    monsterStunReason: monsterCheck.reason,
    expiredEffects,
  };
}

// ─── 處理 buff 回合倒數 ───
export function processBuffs(state: BattleState): void {
  for (let i = state.buffs.length - 1; i >= 0; i--) {
    state.buffs[i].remainingTurns--;
    if (state.buffs[i].remainingTurns <= 0) {
      state.log.push(`${state.buffs[i].skillName}的${state.buffs[i].stat.toUpperCase()}${state.buffs[i].percent > 0 ? "增益" : "減益"}效果消失`);
      state.buffs.splice(i, 1);
    }
  }
  // 護盾
  for (let i = state.shields.length - 1; i >= 0; i--) {
    state.shields[i].remainingTurns--;
    if (state.shields[i].remainingTurns <= 0) {
      state.log.push("護盾效果消失");
      state.shields.splice(i, 1);
    }
  }
  // 吸收
  for (let i = state.absorbs.length - 1; i >= 0; i--) {
    state.absorbs[i].remainingTurns--;
    if (state.absorbs[i].remainingTurns <= 0) {
      state.log.push(`${state.absorbs[i].type === "physical" ? "攻擊" : "魔法"}吸收效果消失`);
      state.absorbs.splice(i, 1);
    }
  }
  // 明鏡止水
  for (let i = state.mirrorWaters.length - 1; i >= 0; i--) {
    state.mirrorWaters[i].remainingTurns--;
    if (state.mirrorWaters[i].remainingTurns <= 0) {
      state.log.push("明鏡止水效果消失");
      state.mirrorWaters.splice(i, 1);
    }
  }
  // 嘲諷
  if (state.taunt) {
    state.taunt.remainingTurns--;
    if (state.taunt.remainingTurns <= 0) {
      state.log.push("嘲諷效果消失");
      state.taunt = null;
    }
  }
}

// ─── 計算 buff 後的實際屬性 ───
export function getBuffedStat(baseStat: number, stat: string, target: "agent" | "monster", buffs: BattleBuff[]): number {
  let totalPercent = 0;
  for (const buff of buffs) {
    if (buff.stat === stat) {
      const isForTarget = (target === "agent" && buff.source === "agent") ||
                          (target === "monster" && buff.source === "monster") ||
                          // 減益：敵方施加的
                          (target === "agent" && buff.source === "monster" && buff.percent < 0) ||
                          (target === "monster" && buff.source === "agent" && buff.percent < 0);
      if (isForTarget) {
        totalPercent += buff.percent;
      }
    }
  }
  return Math.max(1, Math.round(baseStat * (1 + totalPercent / 100)));
}

// ─── 護盾傷害吸收 ───
export function applyShieldAbsorption(damage: number, target: "agent" | "monster", state: BattleState): { finalDamage: number; absorbed: number } {
  let remaining = damage;
  let totalAbsorbed = 0;

  for (const shield of state.shields) {
    if (shield.target === target && remaining > 0) {
      const absorbed = Math.round(remaining * shield.absorbPercent);
      remaining -= absorbed;
      totalAbsorbed += absorbed;
    }
  }

  return { finalDamage: Math.max(0, remaining), absorbed: totalAbsorbed };
}

// ─── 吸收效果（物理/魔法反彈） ───
export function applyAbsorption(damage: number, damageType: "physical" | "magical", target: "agent" | "monster", state: BattleState): { finalDamage: number; reflected: number } {
  let reflected = 0;
  for (const absorb of state.absorbs) {
    if (absorb.target === target && absorb.type === damageType) {
      reflected += Math.round(damage * absorb.reflectPercent);
    }
  }
  return { finalDamage: damage, reflected };
}

// ─── 明鏡止水反射 ───
export function applyMirrorWater(damage: number, target: "agent" | "monster", state: BattleState): { reflected: number } {
  let reflected = 0;
  for (const mirror of state.mirrorWaters) {
    if (mirror.target === target) {
      reflected += Math.round(damage * mirror.reflectPercent);
    }
  }
  return { reflected };
}

// ─── 施加狀態異常 ───
export function tryApplyStatusEffect(
  effectData: { type: string; chance: number; duration?: number; value?: number },
  source: "agent" | "monster",
  state: BattleState,
  resistances?: Record<string, number> // 目標的異常抵抗值
): boolean {
  const { type, chance, duration = 2, value = 5 } = effectData;
  const validTypes: StatusEffectType[] = [
    "poison", "burn", "freeze", "stun", "slow",
    "petrify", "sleep", "confuse", "forget", "drunk"
  ];
  if (!validTypes.includes(type as StatusEffectType)) return false;

  // 抵抗判定
  const resistKey = `${type}Resist`;
  const resistValue = resistances?.[resistKey] ?? 0;
  const effectiveChance = Math.max(0, chance - resistValue);
  if (Math.random() * 100 >= effectiveChance) return false;

  // 檢查是否已存在同類型效果（刷新持續時間）
  const existing = state.statusEffects.find(e =>
    e.type === type as StatusEffectType && e.source === source
  );
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, duration);
    return true;
  }

  state.statusEffects.push({
    type: type as StatusEffectType,
    source,
    remainingTurns: duration,
    value,
    chance,
  });

  const targetName = source === "agent" ? "怪物" : "旅人";
  state.log.push(`${targetName}被施加了${STATUS_EFFECT_NAMES[type as StatusEffectType]}效果（${duration}回合）`);
  return true;
}

// ─── 施加 Buff/Debuff ───
export function applyBuff(
  buffData: { stat: string; percent: number; duration: number },
  source: "agent" | "monster",
  skillName: string,
  state: BattleState
): void {
  const validStats = ["atk", "def", "mtk", "spd", "mdef"];
  if (!validStats.includes(buffData.stat)) return;

  // 同技能同屬性不疊加，刷新持續時間
  const existing = state.buffs.find(b =>
    b.stat === buffData.stat as any && b.source === source && b.skillName === skillName
  );
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, buffData.duration);
    return;
  }

  state.buffs.push({
    stat: buffData.stat as any,
    percent: buffData.percent,
    remainingTurns: buffData.duration,
    source,
    skillName,
  });

  const targetName = source === "agent" ? "旅人" : "怪物";
  const effectType = buffData.percent > 0 ? "提升" : "降低";
  state.log.push(`${targetName}的${buffData.stat.toUpperCase()}${effectType}了${Math.abs(buffData.percent)}%（${buffData.duration}回合）`);
}

// ─── 施加護盾 ───
export function applyShield(
  shieldData: { absorbPercent: number; duration: number },
  source: "agent" | "monster",
  target: "agent" | "monster",
  state: BattleState
): void {
  state.shields.push({
    absorbPercent: shieldData.absorbPercent,
    remainingTurns: shieldData.duration,
    source,
    target,
  });
  const targetName = target === "agent" ? "旅人" : "怪物";
  state.log.push(`${targetName}獲得護盾（吸收${Math.round(shieldData.absorbPercent * 100)}%傷害，${shieldData.duration}回合）`);
}

// ─── 施加吸收 ───
export function applyAbsorbEffect(
  absorbData: { type: "physical" | "magical"; reflectPercent: number; duration: number },
  source: "agent" | "monster",
  target: "agent" | "monster",
  state: BattleState
): void {
  state.absorbs.push({
    type: absorbData.type,
    reflectPercent: absorbData.reflectPercent,
    remainingTurns: absorbData.duration,
    source,
    target,
  });
  const targetName = target === "agent" ? "旅人" : "怪物";
  const typeName = absorbData.type === "physical" ? "物理" : "魔法";
  state.log.push(`${targetName}獲得${typeName}吸收效果（反彈${Math.round(absorbData.reflectPercent * 100)}%傷害，${absorbData.duration}回合）`);
}

// ─── 施加明鏡止水 ───
export function applyMirrorWaterEffect(
  data: { reflectPercent: number; duration: number },
  target: "agent" | "monster",
  state: BattleState
): void {
  state.mirrorWaters.push({
    reflectPercent: data.reflectPercent,
    remainingTurns: data.duration,
    target,
  });
  const targetName = target === "agent" ? "旅人" : "怪物";
  state.log.push(`${targetName}進入明鏡止水狀態（反射${Math.round(data.reflectPercent * 100)}%魔法傷害，${data.duration}回合）`);
}

// ─── 潔淨（清除異常狀態） ───
export function cleanse(target: "agent" | "monster", state: BattleState): number {
  const source = target === "agent" ? "monster" : "agent";
  let cleansed = 0;
  for (let i = state.statusEffects.length - 1; i >= 0; i--) {
    if (state.statusEffects[i].source === source) {
      state.log.push(`${STATUS_EFFECT_NAMES[state.statusEffects[i].type]}效果被清除`);
      state.statusEffects.splice(i, 1);
      cleansed++;
    }
  }
  return cleansed;
}

// ─── 計算多段攻擊 ───
export function resolveMultiHit(
  hitCount: number[],
  baseDamage: number,
  multiTargetHit: boolean
): { hits: number[]; totalDamage: number } {
  // hitCount = [min, max] 表示攻擊次數範圍
  const min = hitCount[0] ?? 1;
  const max = hitCount[1] ?? min;
  const actualHits = Math.floor(Math.random() * (max - min + 1)) + min;

  const hits: number[] = [];
  let totalDamage = 0;
  for (let i = 0; i < actualHits; i++) {
    // 每段傷害有 ±10% 浮動
    const hitDmg = Math.round(baseDamage * (0.9 + Math.random() * 0.2));
    hits.push(hitDmg);
    totalDamage += hitDmg;
  }

  return { hits, totalDamage };
}

// ─── 計算吸血回復 ───
export function calcLifesteal(damage: number, lifestealPercent: number): number {
  return Math.round(damage * lifestealPercent / 100);
}

// ─── 計算治療量 ───
export function calcHealAmount(
  healType: string,
  casterMtk: number,
  targetMaxHp: number,
  skillMultiplier: number
): number {
  switch (healType) {
    case "instant":
      // 瞬間治療：基於 MTK 的 50% + 目標最大 HP 的 10%
      return Math.round((casterMtk * 0.5 + targetMaxHp * 0.1) * skillMultiplier);
    case "hot":
      // 持續治療（每回合）：較小的回復量
      return Math.round((casterMtk * 0.2 + targetMaxHp * 0.05) * skillMultiplier);
    case "revive":
      // 復活：恢復目標最大 HP 的 30%
      return Math.round(targetMaxHp * 0.3 * skillMultiplier);
    case "mpRestore":
      // MP 恢復：基於 MTK
      return Math.round(casterMtk * 0.3 * skillMultiplier);
    case "cleanse":
      // 潔淨：小量治療 + 清除異常
      return Math.round((casterMtk * 0.2 + targetMaxHp * 0.05) * skillMultiplier);
    default:
      return Math.round(targetMaxHp * 0.15 * skillMultiplier);
  }
}

// ─── 計算傷害（支援 ATK 和 MTK 基礎） ───
export function calcSkillDamage(
  scaleStat: string,
  attackerAtk: number,
  attackerMtk: number,
  defenderDef: number,
  defenderMdef: number,
  skillMultiplier: number,
  ignoreDefPercent: number = 0,
  wuxingMultiplier: number = 1.0,
  raceMultiplier: number = 1.0,
  spiritCoeffA: number = 1.0
): number {
  let baseDamage: number;
  if (scaleStat === "mtk") {
    // 魔法傷害：MTK vs MDEF
    const effectiveMdef = Math.round(defenderMdef * (1 - ignoreDefPercent / 100));
    baseDamage = Math.max(1, Math.round(
      attackerMtk * 1.5 * spiritCoeffA - effectiveMdef * 0.5
    ));
  } else {
    // 物理傷害：ATK vs DEF
    const effectiveDef = Math.round(defenderDef * (1 - ignoreDefPercent / 100));
    baseDamage = Math.max(1, Math.round(
      attackerAtk * 1.5 - effectiveDef * 0.5
    ));
  }

  return Math.max(1, Math.round(baseDamage * skillMultiplier * wuxingMultiplier * raceMultiplier));
}

// ─── 被動技能檢查 ───
export function checkPassiveTrigger(
  passiveType: string,
  triggerChance: number,
  level: number = 1,
  chancePerLevel: number = 0
): boolean {
  const effectiveChance = triggerChance + (level - 1) * chancePerLevel;
  return Math.random() * 100 < effectiveChance;
}

/** 處理反擊被動 */
export function resolveCounterAttack(
  attackerAtk: number,
  defenderDef: number,
  counterMultiplier: number = 0.5
): number {
  return Math.max(1, Math.round((attackerAtk * counterMultiplier - defenderDef * 0.3)));
}

/** 處理護衛被動（替隊友承受傷害） */
export function resolveGuard(
  damage: number,
  guardReduction: number = 0.3
): { guardedDamage: number; guardianDamage: number } {
  const guardedDamage = Math.round(damage * (1 - guardReduction));
  const guardianDamage = Math.round(damage * guardReduction);
  return { guardedDamage, guardianDamage };
}

/** 處理陽炎被動（受攻擊時反傷） */
export function resolveSunflame(
  damage: number,
  reflectPercent: number = 0.2
): number {
  return Math.round(damage * reflectPercent);
}

// ─── 昏睡被攻擊時解除 ───
export function wakeUpFromSleep(target: "agent" | "monster", state: BattleState): boolean {
  const source = target === "agent" ? "monster" : "agent";
  const sleepIdx = state.statusEffects.findIndex(e =>
    e.type === "sleep" && e.source === source
  );
  if (sleepIdx >= 0) {
    state.statusEffects.splice(sleepIdx, 1);
    state.log.push(`${target === "agent" ? "旅人" : "怪物"}被攻擊後從昏睡中醒來！`);
    return true;
  }
  return false;
}

// ─── 初始化戰鬥狀態 ───
export function initBattleState(
  agent: { hp: number; maxHp: number; mp: number; maxMp: number; atk: number; def: number; mtk: number; spd: number; mdef: number },
  monster: { hp: number; maxHp: number; mp: number; maxMp: number; atk: number; def: number; mtk: number; spd: number; mdef: number }
): BattleState {
  return {
    agentHp: agent.hp,
    agentMaxHp: agent.maxHp,
    agentMp: agent.mp,
    agentMaxMp: agent.maxMp,
    agentBaseAtk: agent.atk,
    agentBaseDef: agent.def,
    agentBaseMtk: agent.mtk,
    agentBaseSpd: agent.spd,
    agentBaseMdef: agent.mdef,
    monsterHp: monster.hp,
    monsterMaxHp: monster.maxHp,
    monsterMp: monster.mp,
    monsterMaxMp: monster.maxMp,
    monsterBaseAtk: monster.atk,
    monsterBaseDef: monster.def,
    monsterBaseSpd: monster.spd,
    monsterBaseMtk: monster.mtk,
    monsterBaseMdef: monster.mdef,
    statusEffects: [],
    buffs: [],
    shields: [],
    absorbs: [],
    mirrorWaters: [],
    taunt: null,
    log: [],
  };
}
