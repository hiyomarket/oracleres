/**
 * 虛相世界 Tick 引擎
 * 每 5 分鐘執行一次，處理所有活躍角色的行動
 * GD-018：等級扁平化，裝備為核心成長
 */

import { getDb } from "./db";
import { checkAchievements, seedAchievements } from "./achievementEngine";
import { broadcastToAll, sendToAgent } from "./wsServer";
import { broadcastLevelUp, broadcastLegendaryDrop, broadcastAchievementUnlock } from "./liveFeedBroadcast";
import { calcSkillCombo, updateHiddenSkillTracker } from "./skillComboEngine";
import { gameAgents, agentEvents, gameWorld, agentInventory, monsterDropTables, agentDropCounters, equipmentTemplates, gameRogueEvents, gameVirtualShop, gameSpiritShop, gameItemCatalog, gameLearnedQuestSkills, gameQuestSkillCatalog } from "../drizzle/schema";
import { processHiddenEvents } from "./hiddenEventEngine";
import { getEngineConfig, getMultipliers, getEventChances, getTickIntervalMs, getInfuseConfig } from "./gameEngineConfig";
import { eq, and, sql } from "drizzle-orm";
import {
  MAP_NODES,
  MAP_NODE_MAP,
  calcWuxingMultiplier,
  calcMoveCost,
  type MapNode,
} from "../shared/mapNodes";
import type { WuXing } from "../shared/types";
import {
  getMonstersForNode,
  type Monster,
} from "../shared/monsters";
import { getCombatMonstersForNode, invalidateMonsterCache, type CombatMonster, type MonsterSkillData } from "./monsterDataService";

// ─── 工具函數 ───
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ─── GD-020 補充二：命盤五行比例 → 屬性數值統一換算公式 ───
// 此函數為全系統唯一標準，CharacterProfile、tickEngine、routers 均應使用此公式
export function calcCharacterStats(natalStats: {
  wood: number; fire: number; earth: number; metal: number; water: number;
}, level: number = 1) {
  const { wood, fire, earth, metal, water } = natalStats;
  return {
    hp:   Math.floor(100 + level * 10 + wood  * 3.0),
    atk:  Math.floor(10  + level * 2  + fire  * 1.5),
    def:  Math.floor(10  + level * 1.5 + earth * 1.5),
    spd:  Math.floor(5   + level * 0.5 + metal * 0.8),
    matk: Math.floor(10  + level * 2   + water * 1.5),
    mp:   Math.floor(50  + level * 5   + water * 1.5),
  };
}

// ─── GD-020 修正一：魔法傷害精神比例（技能屬性 vs 敵方對應抗性） ───
// 五行技能屬性 → 敵方抗性類型對應（依 GD-005 第十二章）
// 木→毒/腐蝕抗性, 火→爆炸/範圍抗性, 土→物理抗性, 金→精神抗性, 水→魔法抗性
// 敵方抗性以其 defense 值的五行比例估算
function getDefenderResistanceBySkillElement(defender: Monster, skillElement: WuXing): number {
  // 敵方對應抗性 = 以怪物 defense 為基礎，依技能五行 vs 怪物五行的相性調整
  // 若技能屬性剋怪物屬性，抗性降低（防禦弱點）；被剋則抗性提高
  const baseResist = Math.max(10, defender.defense);
  const skillVsMonster = calcWuxingMultiplier(skillElement, defender.element);
  // 相剋時怪物抗性低（1.5倍攻擊 → 抗性 ÷1.5），被剋時抗性高（0.7倍 → 抗性 ÷0.7）
  return Math.max(5, Math.round(baseResist / skillVsMonster));
}

// 根據精神比例計算係數 A（GD-020 修正一，維持魔力寶貝原始結構）
function calcSpiritCoeffA(spiritRatio: number): number {
  if (spiritRatio > 119) return 1.1;
  if (spiritRatio >= 113) return 1.0;
  if (spiritRatio >= 105) return 0.9;
  if (spiritRatio >= 97)  return 0.7;
  if (spiritRatio >= 89)  return 0.6;
  if (spiritRatio >= 79)  return 0.4;
  if (spiritRatio >= 69)  return 0.3;
  return 0.1;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── GD-021 命格共鳴掉落加成計算 ───
type WuxingElement = "wood" | "fire" | "earth" | "metal" | "water";

interface DropContext {
  monsterId: string;
  monsterElement: WuxingElement;
  attackerElement: WuxingElement;
  attackerNatalStats: Record<WuxingElement, number>; // 五行比例 0~100
  luckyValue: number; // 幸運值 0~1000（對應金屬性高的玩家）
  hasTaskBonus: boolean;
}

function calculateFinalDropRate(
  baseRate: number,
  equipmentElement: WuxingElement,
  ctx: DropContext
): number {
  // 1. 五行剋制加成（攻擊屬性 vs 怪物屬性）
  const elementBonus = getWuxingDropBonus(ctx.attackerElement, ctx.monsterElement);
  // 2. 命格共鳴加成（玩家命格 vs 掉落裝備屬性）
  const natalRatio = ctx.attackerNatalStats[equipmentElement] ?? 20;
  const natalBonus = Math.max(0.5, Math.min(1.5, 1 + (natalRatio - 20) * 0.005));
  // 3. 幸運加成（金屬性越高，幸運值越高）
  const luckyBonus = 1 + ctx.luckyValue / 1000;
  // 4. 任務加成
  const taskBonus = ctx.hasTaskBonus ? 1.2 : 1.0;
  return baseRate * elementBonus * natalBonus * luckyBonus * taskBonus;
}

function getWuxingDropBonus(attacker: WuxingElement, defender: WuxingElement): number {
  const WUXING_OVERCOME: Record<WuxingElement, WuxingElement> = {
    wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire"
  };
  const WUXING_GENERATE: Record<WuxingElement, WuxingElement> = {
    wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood"
  };
  if (WUXING_OVERCOME[attacker] === defender) return 1.5;
  if (WUXING_GENERATE[attacker] === defender) return 0.8;
  return 1.0;
}

// ─── GD-021 低保系統 ───
async function checkPityAndGetGuaranteedTier(
  agentId: number
): Promise<"basic" | "mid" | "high" | null> {
  const db = await getDb();
  if (!db) return null;
  const [counter] = await db.select().from(agentDropCounters)
    .where(eq(agentDropCounters.agentId, agentId)).limit(1);
  if (!counter) return null;
  if (counter.noHighStreak >= 75) return "high";
  if (counter.noMidStreak >= 30) return "mid";
  if (counter.noDropStreak >= 15) return "basic";
  return null;
}

async function updateDropCounters(
  agentId: number,
  droppedTier: "basic" | "mid" | "high" | "legendary" | null
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // 確保計數器存在
  const [existing] = await db.select().from(agentDropCounters)
    .where(eq(agentDropCounters.agentId, agentId)).limit(1);
  if (!existing) {
    await db.insert(agentDropCounters).values({
      agentId,
      noDropStreak: droppedTier ? 0 : 1,
      noMidStreak: droppedTier && ["mid", "high", "legendary"].includes(droppedTier) ? 0 : 1,
      noHighStreak: droppedTier && ["high", "legendary"].includes(droppedTier) ? 0 : 1,
      totalBattles: 1,
      totalDrops: droppedTier ? 1 : 0,
      lastUpdated: Date.now(),
    });
    return;
  }
  if (!droppedTier) {
    await db.update(agentDropCounters).set({
      noDropStreak: sql`no_drop_streak + 1`,
      noMidStreak: sql`no_mid_streak + 1`,
      noHighStreak: sql`no_high_streak + 1`,
      totalBattles: sql`total_battles + 1`,
      lastUpdated: Date.now(),
    }).where(eq(agentDropCounters.agentId, agentId));
  } else {
    const updates: Record<string, unknown> = {
      noDropStreak: 0,
      totalBattles: sql`total_battles + 1`,
      totalDrops: sql`total_drops + 1`,
      lastUpdated: Date.now(),
    };
    if (["mid", "high", "legendary"].includes(droppedTier)) updates.noMidStreak = 0;
    if (["high", "legendary"].includes(droppedTier)) updates.noHighStreak = 0;
    await db.update(agentDropCounters).set(updates).where(eq(agentDropCounters.agentId, agentId));
  }
}

// ─── GD-021 從資料庫掉落表計算裝備掉落 ───
async function rollEquipmentDrops(
  agentId: number,
  monsterId: string,
  ctx: DropContext
): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  // 查詢怪物的掉落表
  const dropEntries = await db.select()
    .from(monsterDropTables)
    .where(and(eq(monsterDropTables.monsterId, monsterId), eq(monsterDropTables.isActive, 1)));
  if (dropEntries.length === 0) return [];
  // 檢查低保
  const pityTier = await checkPityAndGetGuaranteedTier(agentId);
  const drops: string[] = [];
  let droppedTier: "basic" | "mid" | "high" | "legendary" | null = null;
  for (const entry of dropEntries) {
    // 查詢裝備模板取得屬性和稀有度
    const [template] = await db.select().from(equipmentTemplates)
      .where(eq(equipmentTemplates.id, entry.equipmentId)).limit(1);
    if (!template) continue;
    const equipElement = template.element as WuxingElement;
    const equipTier = template.tier as "basic" | "mid" | "high" | "legendary";
    // 基礎掉落率（千分比 → 0~1）
    const baseRate = entry.baseDropRate / 1000;
    // 低保強制掉落
    const isPityForced = pityTier && (
      (pityTier === "basic") ||
      (pityTier === "mid" && ["mid", "high", "legendary"].includes(equipTier)) ||
      (pityTier === "high" && ["high", "legendary"].includes(equipTier))
    );
    // 計算最終掉落率
    const finalRate = isPityForced ? 1.0 : calculateFinalDropRate(baseRate, equipElement, ctx);
    if (Math.random() < finalRate) {
      drops.push(entry.equipmentId);
      if (!droppedTier || ["mid", "high", "legendary"].indexOf(equipTier) > ["mid", "high", "legendary"].indexOf(droppedTier)) {
        droppedTier = equipTier;
      }
    }
  }
  // 更新低保計數器
  await updateDropCounters(agentId, droppedTier);
  return drops;
}

// ─── 事件訊息模板 ───
const EVENT_MESSAGES = {
  move: [
    "{name} 踏上前往 {dest} 的旅途，腳步堅定。",
    "{name} 沿著古道向 {dest} 前進，路旁野花盛開。",
    "{name} 啟程前往 {dest}，心中充滿期待。",
  ],
  arrive: [
    "{name} 抵達 {dest}，{desc}",
    "{name} 踏入 {dest} 的領域，{desc}",
    "{name} 終於來到 {dest}，{desc}",
  ],
  combat_start: [
    "{name} 在 {node} 遭遇了 {monster}！",
    "一隻 {monster} 從暗處躍出，攔住了 {name} 的去路！",
    "{name} 不慎驚動了 {monster}，戰鬥一觸即發！",
  ],
  combat_win: [
    "{name} 擊敗了 {monster}！獲得 {exp} 點經驗、{gold} 枚金幣。",
    "{name} 以精湛的戰技制服了 {monster}！獲得 {exp} 點經驗、{gold} 枚金幣。",
    "{monster} 倒下了，{name} 勝利！獲得 {exp} 點經驗、{gold} 枚金幣。",
  ],
  combat_lose: [
    "{name} 不敵 {monster}，被迫撤退，HP 降至 {hp}。",
    "{name} 在與 {monster} 的戰鬥中落敗，狼狽逃脫。",
  ],
  loot: [
    "{name} 在 {node} 撿到了 {item}！",
    "{name} 從 {monster} 的遺體中取出了 {item}。",
  ],
  gather: [
    "{name} 在 {node} 採集到了 {item}。",
    "{name} 發現了一叢 {item}，小心翼翼地採摘。",
  ],
  rest: [
    "{name} 在 {node} 找了個安全的地方休息，恢復了 {hp} 點 HP。",
    "{name} 盤腿打坐，運轉五行真氣，恢復了 {hp} 點 HP 與 {mp} 點 MP。",
  ],
  levelup: [
    "✨ {name} 等級提升至 {level} 級！踏上更廣闊的地圖！",
    "🌟 {name} 突破境界，晉升至 {level} 級！解鎖新的探索區域！",
  ],
  rogue: [
    "🎲 {name} 在 {node} 遭遇了奇異事件：{event}",
    "✨ 命運的齒輪轉動，{name} 在 {node} 觸發了奇遇！",
  ],
};

function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

// ─── 戰鬥結算（詳細回合制） ───
// ─── 附加效果實例（戰鬥中追蹤） ───
export interface StatusEffect {
  type: "poison" | "burn" | "freeze" | "stun" | "slow";
  source: "agent" | "monster";  // 誰施加的
  remainingTurns: number;        // 剩餘回合數
  value: number;                 // 每回合傷害值（poison/burn）或速度降低值（slow）
  chance: number;                // 觸發機率（freeze/stun 用）
}

export type CombatRound = {
  round: number;
  agentAtk: number;       // 玩家對怪物造成的實際傷害
  monsterAtk: number;     // 怪物對玩家造成的實際傷害
  agentHpAfter: number;   // 玩家回合後剩餘 HP
  monsterHpAfter: number; // 怪物回合後剩餘 HP
  agentFirst: boolean;    // 玩家是否先手
  // 詳細戰鬥資訊
  agentSkillName?: string;    // 玩家使用的技能名稱
  monsterSkillName?: string;  // 怪物使用的技能名稱
  monsterSkillType?: string;  // M3L: 怪物技能類型
  agentDodged?: boolean;      // 玩家是否閃避了怪物攻擊
  monsterDodged?: boolean;    // 怪物是否閃避了玩家攻擊
  agentBlocked?: boolean;     // 玩家是否格擋（傷害減半）
  monsterBlocked?: boolean;   // 怪物是否格擋
  agentHealAmount?: number;   // 玩家本回合治癒量（治癒技能）
  monsterHealAmount?: number; // M3L: 怪物本回合治癒量
  agentSkillType?: string;    // 玩家技能類型：attack/heal/buff
  isCritical?: boolean;       // 玩家是否暴擊
  monsterIsCritical?: boolean;// 怪物是否暴擊
  description?: string;       // 回合文字描述
  // M3L: 附加效果資訊
  statusEffectsApplied?: Array<{ type: string; target: "agent" | "monster"; duration: number }>;
  dotDamageToAgent?: number;    // 本回合 DoT 對玩家造成的傷害
  dotDamageToMonster?: number;  // 本回合 DoT 對怪物造成的傷害
  agentStunned?: boolean;       // 玩家本回合是否被眩暈/冰凍
  monsterStunned?: boolean;     // 怪物本回合是否被眩暈/冰凍
};

// GD-020 補充四：種族剋制對照表
// 格式：[A, B] 表示 A 種族剋制 B 種族，傷害 +20%
export const RACE_COUNTER: [string, string][] = [
  ["靈獸系", "亡魂系"],  // 靈獸剋制亡魂（活物剋制幽靈）
  ["亡魂系", "人型系"],  // 亡魂剋制人型（鬼魂讓人型恐懼）
  ["金屬系", "靈獸系"],  // 金屬剋制靈獸（金屬兵器對靈獸有效）
  ["人型系", "金屬系"],  // 人型剋制金屬（人类工具對機械有效）
  ["植物系", "水生系"],  // 植物剋制水生（樹根吸水）
  ["水生系", "妖化系"],  // 水生剋制妖化（水居制妖）
  ["妖化系", "植物系"],  // 妖化剋制植物（妖獸吃植物）
  ["龍種系", "金屬系"],  // 龍種剋制金屬（龍火容金）
  ["蟲類系", "植物系"],  // 蟲類剋制植物（蟲虫吁食植物）
  ["天命系", "龍種系"],  // 天命系剋制龍種（天命之力鹽騎龍）
];

export type CombatResult = {
  won: boolean;
  expGained: number;
  goldGained: number;
  hpLost: number;
  mpUsed: number;
  rounds: CombatRound[];
  lootItems: string[];
  monsterName: string;
  elementMultiplier: number;
  // GD-020 修正一：魔法係數 A 資訊
  spiritCoeffA: number;
  skillElement: WuXing;
  wuxingBoostDesc: string; // 五行加成說明文字
  raceBoostDesc: string;   // 種族剣制說明文字
  raceMultiplier: number;  // 種族剣制倍率（1.0 = 無加成，1.2 = +20%）
  monsterRace?: string;    // 怪物種族（用於前端顯示）
  // M3L: 怪物技能和附加效果資訊
  monsterSkillsUsed?: string[];           // 怪物使用過的技能名稱
  statusEffectsSummary?: string[];        // 戰鬥中觸發的附加效果摘要
  monsterMpUsed?: number;                 // 怪物消耗的 MP
};

export function resolveCombat(
  agent: {
    attack: number;
    defense: number;
    speed: number;
    hp: number;
    maxHp: number;
    dominantElement: string;
    level: number;
    // GD-020 修正一：五行屬性數值（用於魔法係數 A 計算）
    wuxingWood?: number; wuxingFire?: number; wuxingEarth?: number;
    wuxingMetal?: number; wuxingWater?: number;
    skillSlot1?: string | null; // 當前技能槽，用於判斷技能屬性
    agentRace?: string;  // GD-020 補充四：旅人種族（用於種族居制判斷）
    // 技能資訊（用於詳細戰鬥計算），M3L: 加入 wuxing 和 cooldown
    equippedSkills?: Array<{ id: string; name: string; skillType: string; damageMultiplier: number; mpCost: number; wuxing?: string; cooldown?: number }>;
    currentMp?: number;
  },
  monster: Monster | CombatMonster
): CombatResult {
  const agentElement = agent.dominantElement as WuXing;
  const monsterElement = monster.element;
  // 五行加成
  const atkMultiplier = calcWuxingMultiplier(agentElement, monsterElement);
  const defMultiplier = calcWuxingMultiplier(monsterElement, agentElement);

  // M3L: 技能屬性根據實際使用的技能動態計算（在回合中更新）
  // 預設為角色主屬性，每回合根據實際使用技能重新計算
  let skillElement: WuXing = agentElement;
  // 施法者對應屬性數值
  const elementValueMap: Record<WuXing, number> = {
    wood:  agent.wuxingWood  ?? 20,
    fire:  agent.wuxingFire  ?? 20,
    earth: agent.wuxingEarth ?? 20,
    metal: agent.wuxingMetal ?? 20,
    water: agent.wuxingWater ?? 20,
  };
  const attackerElementValue = elementValueMap[skillElement];
  // 敵方對應抗性（依 GD-020 公式）
  const defenderResistance = getDefenderResistanceBySkillElement(monster, skillElement);
  // 精神比例 = (施法者屬性數值 / 敵方抗性) × 100
  const spiritRatio = (attackerElementValue / defenderResistance) * 100;
  const spiritCoeffA = calcSpiritCoeffA(spiritRatio);

  // 五行加成說明文字（GD-020 補充三）
  const WX_ZH: Record<WuXing, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  let wuxingBoostDesc = "";
  if (atkMultiplier >= 1.5) {
    wuxingBoostDesc = `${WX_ZH[agentElement]}剋${WX_ZH[monsterElement]}，傷害提升 30%`;
  } else if (atkMultiplier >= 1.2) {
    wuxingBoostDesc = `${WX_ZH[agentElement]}生${WX_ZH[monsterElement]}，傷害提升 20%`;
  } else if (atkMultiplier <= 0.7) {
    wuxingBoostDesc = `${WX_ZH[monsterElement]}剋${WX_ZH[agentElement]}，傷害降低 30%`;
  }
  if (spiritCoeffA >= 1.0) {
    wuxingBoostDesc += (wuxingBoostDesc ? "，" : "") + `${WX_ZH[skillElement]}屬魔法加成強`;
  } else if (spiritCoeffA <= 0.3) {
    wuxingBoostDesc += (wuxingBoostDesc ? "，" : "") + `${WX_ZH[skillElement]}屬魔法效果弱`;
  }

  // GD-020 補充四：種族剋制計算
  // 旅人預設為「人型系」（用户是人類）
  const agentRaceStr = agent.agentRace ?? "人型系";
  const monsterRaceStr = monster.race ?? "";
  let raceMultiplier = 1.0;
  let raceBoostDesc = "";
  if (monsterRaceStr) {
    // 檢查旅人種族是否剋制怪物種族
    const isAgentCounters = RACE_COUNTER.some(([a, b]) => a === agentRaceStr && b === monsterRaceStr);
    // 檢查怪物種族是否剋制旅人種族
    const isMonsterCounters = RACE_COUNTER.some(([a, b]) => a === monsterRaceStr && b === agentRaceStr);
    if (isAgentCounters) {
      raceMultiplier = 1.2;
      raceBoostDesc = `種族剋制！${agentRaceStr}對${monsterRaceStr}傷害+20%`;
    } else if (isMonsterCounters) {
      raceMultiplier = 0.85;
      raceBoostDesc = `種族對抗！${monsterRaceStr}剋制${agentRaceStr}，傷害-15%`;
    }
  }
  // 計算基礎傷害（加入魔法係數 A 修正 + 種族剋制修正）
  const agentBaseDmg = Math.max(1, Math.round(agent.attack * atkMultiplier * spiritCoeffA * raceMultiplier - monster.defense * 0.5));
  const monsterBaseDmg = Math.max(1, Math.round(monster.attack * defMultiplier - agent.defense * 0.5));

  // 回合制戰鬥模擬（最多 10 回合）
  let agentHp = agent.hp;
  let monsterHp = monster.hp;
  let agentMp = agent.currentMp ?? 50;
  const rounds: CombatRound[] = [];
  const agentFirst = agent.speed >= monster.speed;
  let totalMpUsed = 0;
  let totalHealAmount = 0;

  // 技能池（可用技能）
  const equippedSkills = agent.equippedSkills ?? [];
  // 技能冷卻記錄（skillId -> 剩餘冷卻回合數）
  const skillCooldowns: Record<string, number> = {};

  // ─── M3L: 怪物技能系統初始化 ───
  const combatMonster = monster as CombatMonster;
  const monsterDbSkills: MonsterSkillData[] = combatMonster.dbSkills ?? [];
  const monsterMaxHp = monster.hp;
  let monsterMp = combatMonster.baseMp ?? Math.floor(30 + monster.level * 2);
  let totalMonsterMpUsed = 0;
  const monsterSkillCooldowns: Record<string, number> = {};
  const monsterSkillsUsedNames: string[] = [];

  // ─── M3L: 附加效果追蹤系統 ───
  const activeEffects: StatusEffect[] = [];
  const statusEffectsSummary: string[] = [];

  // ─── M3L: 怪物技能 AI 選擇函數 ───
  function chooseMonsterSkill(): MonsterSkillData | null {
    if (monsterDbSkills.length === 0) return null;
    const monsterHpRatio = monsterHp / monsterMaxHp;
    const aiLevel = combatMonster.aiLevel ?? 1;

    // 過濾可用技能（MP 足夠 + 不在冷卻中）
    const available = monsterDbSkills.filter(sk =>
      monsterMp >= sk.mpCost && !(monsterSkillCooldowns[sk.id] > 0)
    );
    if (available.length === 0) return null;

    // AI 等級 1：純隨機
    if (aiLevel <= 1) {
      return available[Math.floor(Math.random() * available.length)];
    }

    // AI 等級 2+：根據 aiCondition 智慧選擇
    // 優先級 1：HP 低於閾值時使用治癒技能
    if (monsterHpRatio < 0.3) {
      const healSkills = available.filter(sk => sk.skillType === "heal");
      if (healSkills.length > 0) return healSkills[0];
    }

    // 優先級 2：檢查 aiCondition.hpBelow 條件
    for (const sk of available) {
      if (sk.aiCondition?.hpBelow && monsterHpRatio * 100 < sk.aiCondition.hpBelow) {
        return sk;
      }
    }

    // 優先級 3：AI 等級 3+ 優先使用剣制玩家屬性的技能
    if (aiLevel >= 3) {
      const WUXING_COUNTER_M: Record<string, string> = { "木": "earth", "火": "metal", "土": "water", "金": "wood", "水": "fire",
        wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
      const counterElement = WUXING_COUNTER_M[agentElement];
      if (counterElement) {
        const counterSkills = available.filter(sk => {
          const skEl = sk.wuxing.toLowerCase();
          return skEl === counterElement || (
            (skEl === "木" && counterElement === "wood") ||
            (skEl === "火" && counterElement === "fire") ||
            (skEl === "土" && counterElement === "earth") ||
            (skEl === "金" && counterElement === "metal") ||
            (skEl === "水" && counterElement === "water")
          );
        });
        if (counterSkills.length > 0 && Math.random() < 0.7) {
          return counterSkills[0];
        }
      }
    }

    // 優先級 4：按 priority 排序，選擇最高優先級的攻擊技能
    const attackSkills = available.filter(sk => sk.skillType === "attack");
    if (attackSkills.length > 0) {
      attackSkills.sort((a, b) => (b.aiCondition?.priority ?? 0) - (a.aiCondition?.priority ?? 0));
      // AI 等級 2+：80% 機率選最強，20% 隨機
      if (aiLevel >= 2 && Math.random() < 0.8) return attackSkills[0];
      return attackSkills[Math.floor(Math.random() * attackSkills.length)];
    }

    // Fallback: 隨機選一個
    return available[Math.floor(Math.random() * available.length)];
  }

  // ─── M3L: 處理附加效果觸發 ───
  function tryApplyEffect(
    effect: { type: string; chance: number; duration?: number; value?: number } | null | undefined,
    source: "agent" | "monster"
  ): void {
    if (!effect) return;
    const { type, chance, duration = 2, value = 5 } = effect;
    if (Math.random() * 100 >= chance) return; // 未觸發
    const validTypes = ["poison", "burn", "freeze", "stun", "slow"];
    if (!validTypes.includes(type)) return;
    // 檢查是否已存在同類型效果（不疊加，但刷新持續時間）
    const target = source === "agent" ? "monster" : "agent";
    const existing = activeEffects.find(e => e.type === type as any && e.source === source);
    if (existing) {
      existing.remainingTurns = Math.max(existing.remainingTurns, duration);
      return;
    }
    activeEffects.push({
      type: type as StatusEffect["type"],
      source,
      remainingTurns: duration,
      value,
      chance,
    });
    const targetName = target === "agent" ? "旅人" : monster.name;
    const effectNames: Record<string, string> = { poison: "中毒", burn: "灼燒", freeze: "冰凍", stun: "眩暈", slow: "減速" };
    statusEffectsSummary.push(`${targetName}被施加了${effectNames[type] ?? type}效果（${duration}回合）`);
  }

  // ─── M3L: 回合開始時處理 DoT 和狀態效果 ───
  function processStatusEffects(roundData: CombatRound): { agentStunned: boolean; monsterStunned: boolean } {
    let agentStunned = false;
    let monsterStunned = false;
    let dotToAgent = 0;
    let dotToMonster = 0;

    for (let i = activeEffects.length - 1; i >= 0; i--) {
      const eff = activeEffects[i];
      const target = eff.source === "agent" ? "monster" : "agent";

      if (eff.type === "poison" || eff.type === "burn") {
        // DoT 傷害
        if (target === "agent") {
          dotToAgent += eff.value;
        } else {
          dotToMonster += eff.value;
        }
      } else if (eff.type === "freeze" || eff.type === "stun") {
        // 眩暈/冰凍：每回合有機率跳過行動
        if (Math.random() * 100 < eff.chance) {
          if (target === "agent") agentStunned = true;
          else monsterStunned = true;
        }
      } else if (eff.type === "slow") {
        // 減速效果在先手判定時已處理（簡化處理）
      }

      eff.remainingTurns--;
      if (eff.remainingTurns <= 0) {
        activeEffects.splice(i, 1);
      }
    }

    // 應用 DoT 傷害
    if (dotToAgent > 0) {
      agentHp = Math.max(0, agentHp - dotToAgent);
      roundData.dotDamageToAgent = dotToAgent;
    }
    if (dotToMonster > 0) {
      monsterHp = Math.max(0, monsterHp - dotToMonster);
      roundData.dotDamageToMonster = dotToMonster;
    }

    roundData.agentStunned = agentStunned;
    roundData.monsterStunned = monsterStunned;
    return { agentStunned, monsterStunned };
  }

  // ★ 智慧技能判定系統：根據戰場情況智能選擇技能
  // 五行相剋查詢表（用於技能屬性判定）
  const WUXING_COUNTER: Record<string, string> = { wood: "earth", fire: "metal", earth: "water", metal: "wood", water: "fire" };
  // M3L: 技能屬性推斷（優先使用技能自身 wuxing 欄位，其次根據 ID 前綴）
  const WUXING_ZH_TO_EN: Record<string, WuXing> = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" };
  function inferSkillElement(skillId: string, skillWuxing?: string): WuXing | null {
    // 優先使用技能自身的五行屬性
    if (skillWuxing) {
      const mapped = WUXING_ZH_TO_EN[skillWuxing] ?? (skillWuxing as WuXing);
      if (["wood", "fire", "earth", "metal", "water"].includes(mapped)) return mapped;
    }
    if (skillId.startsWith("S_Wt")) return "water";
    if (skillId.startsWith("S_W")) return "wood";
    if (skillId.startsWith("S_F")) return "fire";
    if (skillId.startsWith("S_E")) return "earth";
    if (skillId.startsWith("S_M")) return "metal";
    const lower = skillId.toLowerCase();
    if (lower.includes("wood") || lower.includes("heal") || lower.includes("regen")) return "wood";
    if (lower.includes("fire") || lower.includes("burst") || lower.includes("blaze")) return "fire";
    if (lower.includes("earth") || lower.includes("shield") || lower.includes("rock")) return "earth";
    if (lower.includes("metal") || lower.includes("pierce") || lower.includes("blade")) return "metal";
    if (lower.includes("water") || lower.includes("flow") || lower.includes("ice")) return "water";
    return null;
  }

  while (agentHp > 0 && monsterHp > 0 && rounds.length < 10) {
    const roundNum = rounds.length + 1;
    const roundData: CombatRound = { round: roundNum, agentAtk: 0, monsterAtk: 0, agentHpAfter: agentHp, monsterHpAfter: monsterHp, agentFirst };

    // 冷卻倒數
    for (const sk of equippedSkills) {
      if (skillCooldowns[sk.id] && skillCooldowns[sk.id] > 0) skillCooldowns[sk.id]--;
    }
    // M3L: 怪物技能冷卻倒數
    for (const skId of Object.keys(monsterSkillCooldowns)) {
      if (monsterSkillCooldowns[skId] > 0) monsterSkillCooldowns[skId]--;
    }

    // M3L: 回合開始時處理附加效果（DoT/眩暈/冰凍）
    const { agentStunned, monsterStunned } = processStatusEffects(roundData);
    // DoT 可能導致死亡
    if (agentHp <= 0 || monsterHp <= 0) {
      roundData.agentHpAfter = agentHp;
      roundData.monsterHpAfter = monsterHp;
      roundData.description = agentHp <= 0 ? `第${roundNum}回合：旅人因狀態異常而倒下！` : `第${roundNum}回合：${monster.name}因狀態異常而倒下！`;
      rounds.push(roundData);
      break;
    }

    // ★ 智慧技能選擇策略：
    // 1. HP < 30% → 優先使用治癒技能（生存優先）
    // 2. HP < 50% 且有治癒技能 → 50% 機率使用治癒（50% 攻擊
    // 3. 有剋制怪物屬性的技能 → 優先使用（五行相剋）
    // 4. 其他情況 → 按傷害倍率選擇最強攻擊技能
    // 5. 沒有可用技能 → 普通攻擊
    let chosenSkill: typeof equippedSkills[0] | null = null;
    const hpRatio = agentHp / agent.maxHp;
    const availableSkills = equippedSkills.filter(sk => agentMp >= sk.mpCost && !(skillCooldowns[sk.id] > 0));
    const healSkills = availableSkills.filter(sk => sk.skillType === "heal");
    const attackSkills = availableSkills.filter(sk => sk.skillType === "attack");

    // 策略 1：生存危機（HP < 30%）→ 強制治癒
    if (hpRatio < 0.3 && healSkills.length > 0) {
      chosenSkill = healSkills[0];
    }
    // 策略 2：HP 偏低（30%~50%）→ 50% 機率治癒
    else if (hpRatio < 0.5 && healSkills.length > 0 && Math.random() < 0.5) {
      chosenSkill = healSkills[0];
    }
    // 策略 3：五行相剋判定 → 優先使用剋制怪物屬性的技能
    else if (attackSkills.length > 0) {
      // 找出剋制怪物屬性的技能
      const counterElement = Object.entries(WUXING_COUNTER).find(([k]) => k === monsterElement)?.[1];
      // 找對應屬性的攻擊技能
      const counterSkills = attackSkills.filter(sk => {
        const skElement = inferSkillElement(sk.id, sk.wuxing);
        return skElement && WUXING_COUNTER[skElement] === monsterElement;
      });
      if (counterSkills.length > 0) {
        // 有剋制技能，80% 機率使用（20% 機率隨機選擇其他技能）
        chosenSkill = Math.random() < 0.8 ? counterSkills[0] : attackSkills[Math.floor(Math.random() * attackSkills.length)];
      } else {
        // 沒有剋制技能，按傷害倍率選擇最強的
        chosenSkill = attackSkills.sort((a, b) => (b.damageMultiplier ?? 1) - (a.damageMultiplier ?? 1))[0];
      }
    }
    // 策略 4：只有治癒技能且 HP < 70% → 使用治癒
    else if (healSkills.length > 0 && hpRatio < 0.7) {
      chosenSkill = healSkills[0];
    }
    // 策略 5：沒有可用技能 → 普攻
    const usingSkill = chosenSkill !== null;
    const skillMultiplier = usingSkill ? (chosenSkill!.damageMultiplier ?? 1.0) : 1.0;
    const skillType = usingSkill ? chosenSkill!.skillType : "attack";
    const skillName = usingSkill ? chosenSkill!.name : "普通攻擊";
    const mpCost = usingSkill ? chosenSkill!.mpCost : randInt(1, 3);

    if (usingSkill && chosenSkill) {
      agentMp = Math.max(0, agentMp - mpCost);
      totalMpUsed += mpCost;
      skillCooldowns[chosenSkill.id] = chosenSkill.cooldown ?? 2; // M3L: 使用技能自身冷卻值
    } else {
      agentMp = Math.max(0, agentMp - mpCost);
      totalMpUsed += mpCost;
    }

    // M3L: 動態更新技能屬性和魔法係數 A
    if (usingSkill && chosenSkill) {
      const actualSkillElement = inferSkillElement(chosenSkill.id, chosenSkill.wuxing);
      if (actualSkillElement) {
        skillElement = actualSkillElement;
      }
    }

    // 治癒技能處理
    if (skillType === "heal") {
      const healAmount = Math.round(agent.maxHp * 0.2 * skillMultiplier);
      agentHp = Math.min(agent.maxHp, agentHp + healAmount);
      totalHealAmount += healAmount;
      roundData.agentHealAmount = healAmount;
      roundData.agentSkillType = "heal";
      roundData.agentSkillName = skillName;
      roundData.agentAtk = 0;
      // M3L: 治癒回合不攻擊怪物，但怪物使用真正技能攻擊
      let monsterSkillName = "普通攻擊";
      let monsterSkillMultiplier = 1.0;
      let monsterSkillEffect: { type: string; chance: number; duration?: number; value?: number } | null = null;
      let monsterSkillType = "attack";
      if (!monsterStunned) {
        const mSkill = chooseMonsterSkill();
        if (mSkill) {
          monsterSkillName = mSkill.name;
          monsterSkillMultiplier = mSkill.powerPercent / 100;
          monsterSkillEffect = mSkill.additionalEffect ?? null;
          monsterSkillType = mSkill.skillType;
          monsterMp = Math.max(0, monsterMp - mSkill.mpCost);
          totalMonsterMpUsed += mSkill.mpCost;
          monsterSkillCooldowns[mSkill.id] = mSkill.cooldown;
          if (!monsterSkillsUsedNames.includes(mSkill.name)) monsterSkillsUsedNames.push(mSkill.name);
        }
      } else {
        monsterSkillName = "眩暈中";
      }

      // 怪物治癒技能處理
      if (monsterSkillType === "heal" && !monsterStunned) {
        const mHealAmt = Math.round(monsterMaxHp * 0.15 * monsterSkillMultiplier);
        monsterHp = Math.min(monsterMaxHp, monsterHp + mHealAmt);
        roundData.monsterHealAmount = mHealAmt;
        roundData.monsterSkillName = monsterSkillName;
        roundData.monsterSkillType = "heal";
        roundData.monsterAtk = 0;
        roundData.agentHpAfter = agentHp;
        roundData.monsterHpAfter = monsterHp;
        roundData.description = `第${roundNum}回合：${skillName}治癒了 ${healAmount} HP。${monster.name}使用${monsterSkillName}恢復了 ${mHealAmt} HP！`;
        rounds.push(roundData);
        continue;
      }

      const monsterAtk = monsterStunned ? 0 : Math.round(monsterBaseDmg * monsterSkillMultiplier * randFloat(0.8, 1.2));
      const agentDodged = !monsterStunned && Math.random() < Math.min(0.3, agent.speed / (agent.speed + monster.speed + 10));
      const agentBlocked = !agentDodged && !monsterStunned && Math.random() < 0.15;
      const monsterIsCritical = !agentDodged && !agentBlocked && !monsterStunned && Math.random() < 0.1;
      const actualMonsterAtk = monsterStunned ? 0 : agentDodged ? 0 : agentBlocked ? Math.round(monsterAtk * 0.5) : monsterIsCritical ? Math.round(monsterAtk * 1.5) : monsterAtk;
      agentHp = Math.max(0, agentHp - actualMonsterAtk);
      // M3L: 怪物攻擊技能可能觸發附加效果
      if (!monsterStunned && !agentDodged && actualMonsterAtk > 0 && monsterSkillEffect) {
        tryApplyEffect(monsterSkillEffect, "monster");
      }
      roundData.monsterAtk = actualMonsterAtk;
      roundData.monsterSkillName = monsterSkillName;
      roundData.monsterSkillType = monsterSkillType;
      roundData.agentDodged = agentDodged;
      roundData.agentBlocked = agentBlocked;
      roundData.monsterIsCritical = monsterIsCritical;
      roundData.agentHpAfter = agentHp;
      roundData.monsterHpAfter = monsterHp;
      const healDesc = `${skillName}治癒了 ${healAmount} HP`;
      const defDesc = monsterStunned ? `${monster.name}眩暈中，無法行動` : agentDodged ? `閃避了${monsterSkillName}` : agentBlocked ? `格擋了${monsterSkillName}（傷害減半）` : monsterIsCritical ? `被${monsterSkillName}暴擊！受到 ${actualMonsterAtk} 傷害` : `受到${monsterSkillName}攻擊，受到 ${actualMonsterAtk} 傷害`;
      roundData.description = `第${roundNum}回合：${healDesc}。${monster.name}${defDesc}`;
      rounds.push(roundData);
      if (agentHp <= 0) break;
      continue;
    }

    // ─── M3L: 攻擊回合（加入眩暈判定、怪物技能、附加效果） ───
    // 玩家攻擊（如果沒被眩暈）
    let rawAgentAtk = 0;
    let isCritical = false;
    let monsterDodged = false;
    let monsterBlocked = false;
    let agentAtk = 0;
    if (!agentStunned) {
      rawAgentAtk = Math.round(agentBaseDmg * skillMultiplier * randFloat(0.8, 1.2));
      isCritical = Math.random() < 0.1;
      monsterDodged = Math.random() < Math.min(0.2, monster.speed / (monster.speed + agent.speed + 15));
      monsterBlocked = !monsterDodged && Math.random() < 0.1;
      agentAtk = monsterDodged ? 0 : monsterBlocked ? Math.round(rawAgentAtk * 0.5) : isCritical ? Math.round(rawAgentAtk * 1.8) : rawAgentAtk;
    }

    // M3L: 怪物技能選擇（使用真正的技能系統）
    let monsterSkillName = "普通攻擊";
    let monsterSkillMultiplier = 1.0;
    let monsterSkillEffect: { type: string; chance: number; duration?: number; value?: number } | null = null;
    let monsterSkillType = "attack";
    if (!monsterStunned) {
      const mSkill = chooseMonsterSkill();
      if (mSkill) {
        monsterSkillName = mSkill.name;
        monsterSkillMultiplier = mSkill.powerPercent / 100;
        monsterSkillEffect = mSkill.additionalEffect ?? null;
        monsterSkillType = mSkill.skillType;
        monsterMp = Math.max(0, monsterMp - mSkill.mpCost);
        totalMonsterMpUsed += mSkill.mpCost;
        monsterSkillCooldowns[mSkill.id] = mSkill.cooldown;
        if (!monsterSkillsUsedNames.includes(mSkill.name)) monsterSkillsUsedNames.push(mSkill.name);
      }
    } else {
      monsterSkillName = "眩暈中";
    }

    // 怪物治癒技能處理
    if (monsterSkillType === "heal" && !monsterStunned) {
      const mHealAmt = Math.round(monsterMaxHp * 0.15 * monsterSkillMultiplier);
      monsterHp = Math.min(monsterMaxHp, monsterHp + mHealAmt);
      roundData.monsterHealAmount = mHealAmt;
      roundData.monsterSkillType = "heal";
    }

    const rawMonsterAtk = (monsterStunned || monsterSkillType === "heal") ? 0 : Math.round(monsterBaseDmg * monsterSkillMultiplier * randFloat(0.8, 1.2));
    const agentDodged = !monsterStunned && monsterSkillType !== "heal" && Math.random() < Math.min(0.3, agent.speed / (agent.speed + monster.speed + 10));
    const agentBlocked = !agentDodged && !monsterStunned && monsterSkillType !== "heal" && Math.random() < 0.15;
    const monsterIsCritical = !agentDodged && !agentBlocked && !monsterStunned && monsterSkillType !== "heal" && Math.random() < 0.1;
    const monsterAtk = (monsterStunned || monsterSkillType === "heal") ? 0 : agentDodged ? 0 : agentBlocked ? Math.round(rawMonsterAtk * 0.5) : monsterIsCritical ? Math.round(rawMonsterAtk * 1.5) : rawMonsterAtk;

    roundData.agentSkillName = agentStunned ? "眩暈中" : skillName;
    roundData.agentSkillType = skillType;
    roundData.isCritical = isCritical;
    roundData.monsterSkillName = monsterSkillName;
    roundData.monsterSkillType = monsterSkillType;
    roundData.agentDodged = agentDodged;
    roundData.agentBlocked = agentBlocked;
    roundData.monsterDodged = monsterDodged;
    roundData.monsterBlocked = monsterBlocked;
    roundData.monsterIsCritical = monsterIsCritical;

    if (agentFirst) {
      roundData.agentAtk = agentAtk;
      monsterHp = Math.max(0, monsterHp - agentAtk);
      roundData.monsterHpAfter = monsterHp;
      if (monsterHp <= 0) {
        roundData.monsterAtk = 0;
        roundData.agentHpAfter = agentHp;
        const atkDesc = agentStunned ? "眩暈中，無法攻擊" : monsterDodged ? `${monster.name}閃避了${skillName}` : monsterBlocked ? `${monster.name}格擋了${skillName}（傷害減半）` : isCritical ? `${skillName}暴擊！造成 ${agentAtk} 傷害` : `${skillName}造成 ${agentAtk} 傷害`;
        roundData.description = `第${roundNum}回合：${atkDesc}，${monster.name}倒下！`;
        rounds.push(roundData);
        break;
      }
      // M3L: 怪物攻擊觸發附加效果
      if (!monsterStunned && !agentDodged && monsterAtk > 0 && monsterSkillEffect) {
        tryApplyEffect(monsterSkillEffect, "monster");
      }
      roundData.monsterAtk = monsterAtk;
      agentHp = Math.max(0, agentHp - monsterAtk);
      roundData.agentHpAfter = agentHp;
    } else {
      // M3L: 怪物攻擊觸發附加效果
      if (!monsterStunned && !agentDodged && monsterAtk > 0 && monsterSkillEffect) {
        tryApplyEffect(monsterSkillEffect, "monster");
      }
      roundData.monsterAtk = monsterAtk;
      agentHp = Math.max(0, agentHp - monsterAtk);
      roundData.agentHpAfter = agentHp;
      if (agentHp <= 0) {
        roundData.agentAtk = 0;
        roundData.monsterHpAfter = monsterHp;
        const defDesc = monsterStunned ? `${monster.name}眩暈中` : agentDodged ? `閃避了${monsterSkillName}` : agentBlocked ? `格擋了${monsterSkillName}（傷害減半）` : monsterIsCritical ? `被${monsterSkillName}暴擊！受到 ${monsterAtk} 傷害` : `受到${monsterSkillName}攻擊，受到 ${monsterAtk} 傷害`;
        roundData.description = `第${roundNum}回合：${defDesc}，旅人倒下！`;
        rounds.push(roundData);
        break;
      }
      roundData.agentAtk = agentAtk;
      monsterHp = Math.max(0, monsterHp - agentAtk);
      roundData.monsterHpAfter = monsterHp;
    }

    // 回合描述
    const atkDesc = agentStunned ? "眩暈中，無法攻擊" : monsterDodged ? `${monster.name}閃避了${skillName}` : monsterBlocked ? `${monster.name}格擋了${skillName}（傷害減半）` : isCritical ? `${skillName}暴擊！造成 ${agentAtk} 傷害` : `${skillName}造成 ${agentAtk} 傷害`;
    const defDesc = monsterStunned ? `${monster.name}眩暈中，無法行動` : monsterSkillType === "heal" ? `${monster.name}使用${monsterSkillName}恢復了 ${roundData.monsterHealAmount ?? 0} HP` : agentDodged ? `閃避了${monsterSkillName}` : agentBlocked ? `格擋了${monsterSkillName}（傷害減半）` : monsterIsCritical ? `被${monsterSkillName}暴擊！受到 ${monsterAtk} 傷害` : `受到${monsterSkillName}攻擊，受到 ${monsterAtk} 傷害`;
    roundData.description = `第${roundNum}回合：${atkDesc}。${defDesc}`;
    rounds.push(roundData);
  }

  const won = monsterHp <= 0;
  const hpLost = Math.min(agent.hp, agent.hp - agentHp);
  const mpUsed = totalMpUsed;

  // 計算獎勵
  const expGained = won ? monster.expReward : Math.floor(monster.expReward * 0.1);
  const goldGained = won ? randInt(monster.goldReward[0], monster.goldReward[1]) : 0;

  // 掉落物
  const lootItems: string[] = [];
  if (won) {
    for (const drop of monster.dropItems) {
      if (Math.random() < drop.chance) {
        lootItems.push(drop.itemId);
      }
    }
  }

  return {
    won,
    expGained,
    goldGained,
    hpLost,
    mpUsed,
    rounds,
    lootItems,
    monsterName: monster.name,
    elementMultiplier: atkMultiplier,
    // GD-020 修正一
    spiritCoeffA,
    skillElement,
    wuxingBoostDesc,
    // GD-020 補充四
    raceBoostDesc,
    raceMultiplier,
    monsterRace: monsterRaceStr || undefined,
    // M3L: 怪物技能和附加效果資訊
    monsterSkillsUsed: monsterSkillsUsedNames.length > 0 ? monsterSkillsUsedNames : undefined,
    statusEffectsSummary: statusEffectsSummary.length > 0 ? statusEffectsSummary : undefined,
    monsterMpUsed: totalMonsterMpUsed > 0 ? totalMonsterMpUsed : undefined,
  };
}

// ─── 計算升級所需經驗（GD-018：60 級上限，等級只是地圖通行證） ───
export function calcExpToNext(level: number): number {
  if (level >= 60) return 999999; // 滿級
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

// ─── 體力値再生（每 30 分鐘 +30 點，上限 maxStamina） ───
export function regenStamina(
  agent: typeof gameAgents.$inferSelect,
  regenMinutes: number = 30,
  regenAmount: number = 30
): number {
  const now = Date.now();
  const lastRegen = agent.staminaLastRegen ?? now;
  const elapsed = now - lastRegen;
  const regenIntervalMs = regenMinutes * 60 * 1000;
  const regenCycles = Math.floor(elapsed / regenIntervalMs);
  if (regenCycles <= 0) return agent.stamina;
  const totalRegen = regenCycles * regenAmount;
  return Math.min(agent.maxStamina, agent.stamina + totalRegen);
}

// ─── 戰鬥結果類型（共用） ───
export interface CombatResultItem {
  agentId: number;
  agentName: string;
  monsterName: string;
  monsterRace?: string;
  won: boolean;
  expGained: number;
  goldGained: number;
  hpLost: number;
  wuxingBoostDesc?: string;
  raceBoostDesc?: string;
  rounds: CombatRound[];
  agentMaxHp: number;
  monsterMaxHp: number;
  combatKey?: number;
  /** 戰鬥掉落道具列表 */
  lootItems?: string[];
}

// ─── 主 Tick 處理函數 ───
export interface TickResult {
  processed: number;
  events: number;
  /** 本次 Tick 中發生升級的角色資訊 */
  levelUps: Array<{ agentId: number; agentName: string; newLevel: number; agentElement?: string }>;  // agentElement for live_feed
  /** 本次 Tick 中摩落的傳說/高級裝備 */
  legendaryDrops: Array<{ agentId: number; agentName: string; equipId: string; tier: string; agentElement?: string; agentLevel?: number; itemName?: string }>;  // extra fields for live_feed
  /** 本次 Tick 中所有玩家的戰鬥資訊（前端依 agentId 過濾） */
  lastCombats?: CombatResultItem[];
}

export async function processTick(): Promise<TickResult> {
  const db = await getDb();
  if (!db) return { processed: 0, events: 0, levelUps: [], legendaryDrops: [] };

  // 取得或建立世界狀態
  const worlds = await db.select().from(gameWorld).limit(1);
  let world = worlds[0];
  if (!world) {
    await db.insert(gameWorld).values({
      worldKey: "main",
      worldData: { currentTick: 0, dailyElement: "wood", dailyStem: "甲", dailyBranch: "子" },
      updatedAt: Date.now(),
    });
    const newWorlds = await db.select().from(gameWorld).limit(1);
    world = newWorlds[0];
    if (!world) return { processed: 0, events: 0, levelUps: [], legendaryDrops: [] };
  }

  const worldData = (world.worldData as Record<string, unknown>) ?? {};
  const currentTick = ((worldData.currentTick as number) ?? 0) + 1;
  const dailyElement = (worldData.dailyElement as WuXing) ?? "wood";

  // 更新 Tick
  await db.update(gameWorld).set({
    worldData: { ...worldData, currentTick },
    updatedAt: Date.now(),
  }).where(eq(gameWorld.id, world.id));

  // ─── 後端自動 Tick 只處理全地圖事件（不處理個人角色行動）───
  // 個人角色行動由前端「啟動探索」按鈕觸發 triggerTick 來執行

  // 處理隱藏事件（密店/隱藏NPC/隱藏任務）
  try {
    await processHiddenEvents();
  } catch (err) {
    console.error("[Tick] hiddenEventEngine error:", err);
  }

  // 確保成就種子資料存在
  try { await seedAchievements(); } catch { }

  // 自動刷新商店商品（每次全地圖 Tick 同步更新）
  try { await refreshShopItems(db); } catch (err) {
    console.error("[Tick] 商店刷新失敗:", err);
  }

  return { processed: 0, events: 0, levelUps: [], legendaryDrops: [], lastCombats: [] };
}

// ─── 單一角色 Tick 處理 ───
export async function processAgentTick(
  agent: typeof gameAgents.$inferSelect,
  tick: number,
  dailyElement: WuXing,
  staminaPerTick: number = 5
): Promise<{ events: number; levelUps: TickResult["levelUps"]; legendaryDrops: TickResult["legendaryDrops"]; lastCombat?: CombatResultItem }> {
  const EMPTY = { events: 0, levelUps: [] as TickResult["levelUps"], legendaryDrops: [] as TickResult["legendaryDrops"] };
  const db = await getDb();
  if (!db) return EMPTY;

  // 死亡狀態：不處理
  if (agent.status === "dead") return EMPTY;

  // 移動中：檢查是否抵達
  if (agent.status === "moving" && agent.targetNodeId) {
    const destNode = MAP_NODE_MAP.get(agent.targetNodeId);
    if (destNode) {
      await db.update(gameAgents).set({
        currentNodeId: agent.targetNodeId,
        targetNodeId: null,
        status: "idle",
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, agent.id));

      const msg = formatMessage(pickRandom(EVENT_MESSAGES.arrive), {
        name: agent.agentName ?? "旅人",
        dest: destNode.name,
        desc: destNode.description,
      });
      await createEvent(agent.id, "move", msg, { nodeId: destNode.id }, destNode.id);
      agent = { ...agent, currentNodeId: agent.targetNodeId, status: "idle" };
      return { events: 1, levelUps: [], legendaryDrops: [] };
    }
  }

  // 休息狀態：回復 HP/MP
  if (agent.status === "resting") {
    const hpRestore = Math.floor(agent.maxHp * 0.15);
    const mpRestore = Math.floor(agent.maxMp * 0.15);
    const newHp = Math.min(agent.maxHp, agent.hp + hpRestore);
    const newMp = Math.min(agent.maxMp, agent.mp + mpRestore);
    const isFullyHealed = newHp >= agent.maxHp * 0.95 && newMp >= agent.maxMp * 0.95;

    // HP 補滿後的狀態轉換邏輯
    let nextStrategy = agent.strategy;
    let nextMovementMode = agent.movementMode ?? "roaming";
    let nextStatus: "idle" | "moving" | "resting" | "combat" | "dead" = "idle";

    if (isFullyHealed) {
      // 回滿後切回 previousStrategy，如果沒有記錄則預設探索
      const prev = agent.previousStrategy ?? "explore";
      if (prev !== "rest") {
        nextStrategy = prev;
      } else {
        nextStrategy = "explore";
      }
      nextMovementMode = "roaming";
      nextStatus = "idle";
    } else {
      nextStatus = "resting"; // 還沒補滿，繼續休息
    }

    await db.update(gameAgents).set({
      hp: newHp,
      mp: newMp,
      status: nextStatus,
      strategy: nextStrategy,
      movementMode: nextMovementMode,
      // 回滿後清除 previousStrategy
      previousStrategy: isFullyHealed ? null : agent.previousStrategy,
      updatedAt: Date.now(),
    }).where(eq(gameAgents.id, agent.id));

    const msg = formatMessage(pickRandom(EVENT_MESSAGES.rest), {
      name: agent.agentName ?? "旅人",
      node: MAP_NODE_MAP.get(agent.currentNodeId)?.name ?? "此地",
      hp: hpRestore,
      mp: mpRestore,
    });
    await createEvent(agent.id, "rest", msg, { fullyHealed: isFullyHealed }, agent.currentNodeId);
    return { events: 1, levelUps: [], legendaryDrops: [] };
  }

  // HP 過低：強制休息（<20% maxHp）
  if (agent.hp < agent.maxHp * 0.2) {
    await db.update(gameAgents).set({
      status: "resting",
      updatedAt: Date.now(),
    }).where(eq(gameAgents.id, agent.id));
    const warnMsg = `「${agent.agentName ?? "旅人"}」身身受重傷，被迫休息回復體力…`;
    await createEvent(agent.id, "rest", warnMsg, { forced: true }, agent.currentNodeId);
    return { events: 1, levelUps: [], legendaryDrops: [] };
  }

  // 根據策略決定行動
  const currentNode: MapNode | undefined = MAP_NODE_MAP.get(agent.currentNodeId);
  if (!currentNode) return EMPTY;

  // ─── 體力扣除邏輯（策略分流）───
  // 「休息」和「注靈」不消耗體力，其他三個策略（戰鬥/探索/採集）消耗體力
  let strategy = agent.strategy;
  const needsStamina = strategy !== "rest" && strategy !== "infuse";

  if (needsStamina) {
    // 體力檢查：每次行動消耗 staminaPerTick 點體力
    if (agent.stamina < staminaPerTick) {
      // 體力不足 → 自動切換為「注靈」模式（持續行動邏輯）
      await db.update(gameAgents).set({
        previousStrategy: agent.strategy,
        strategy: "infuse",
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, agent.id));
      const strategyLabels: Record<string, string> = { explore: "探索", combat: "戰鬥", gather: "採集", rest: "休息" };
      const autoSwitchMsg = `【體力耗盡】${agent.agentName ?? "旅人"}體力不足，自動切換為「注靈」模式，吸收節點五行能量中…`;
      await createEvent(agent.id, "system", autoSwitchMsg, { type: "stamina_depleted_auto_infuse", previousStrategy: agent.strategy }, currentNode.id);
      // 更新 agent 引用和 strategy 變數，讓後續分支正確走到 infuse
      agent = { ...agent, previousStrategy: agent.strategy, strategy: "infuse" };
      strategy = "infuse";
      // 不 return，讓下方的注靈邏輯繼續執行
    } else {
      // 消耗體力
      const oldStamina = agent.stamina;
      const newStaminaAfterTick = Math.max(0, oldStamina - staminaPerTick);
      await db.update(gameAgents).set({
        stamina: newStaminaAfterTick,
        staminaLastRegen: agent.staminaLastRegen ?? Date.now(),
      }).where(eq(gameAgents.id, agent.id));
      agent = { ...agent, stamina: newStaminaAfterTick };
    }
  }

  const roll = Math.random();
  let eventsCreated = 0;
  const tickLevelUps: TickResult["levelUps"] = [];
  const tickLegendaryDrops: TickResult["legendaryDrops"] = [];
  let tickLastCombat: CombatResultItem | undefined;

  // 從全域引擎配置取得動態機率
  const chances = getEventChances();
  const movementMode = agent.movementMode ?? "roaming";

  // Roguelike 奇遇（動態機率）
  if (roll < chances.rogue) {
    eventsCreated += await processRogueEvent(agent, currentNode, tick);
    return { events: eventsCreated, levelUps: tickLevelUps, legendaryDrops: tickLegendaryDrops };
  }

  const combatThreshold = chances.rogue + chances.combat;
  const gatherThreshold = combatThreshold + chances.gather;

  // ─── 戰鬥策略 ───
  // 戰鬥策略：全力打怪，HP歸零強制休息，補滿後回归戰鬥
  if (strategy === "combat") {
    if (movementMode === "roaming" && roll > 0.7) {
      // 漫遊戰鬥：30% 機率移動到相鄰節點尋战
      eventsCreated += await processMoveEvent(agent, currentNode, tick);
    } else {
      // 定點戰鬥 or 漫遊戰鬥的戰鬥回合
      const combatResult = await processCombatEvent(agent, currentNode, tick, dailyElement);
      eventsCreated += combatResult.events;
      tickLevelUps.push(...combatResult.levelUps);
      tickLegendaryDrops.push(...combatResult.legendaryDrops);
      if (combatResult.lastCombat) tickLastCombat = combatResult.lastCombat;
    }
  }
  // ─── 探索策略 ───
  // 探索策略：打怪40% + 採集40% + 移動20%（漫遊時）
  //             打怪50% + 採集50%（定點時）
  else if (strategy === "explore") {
    if (movementMode === "roaming") {
      if (roll < combatThreshold) {
        const combatResult = await processCombatEvent(agent, currentNode, tick, dailyElement);
        eventsCreated += combatResult.events;
        tickLevelUps.push(...combatResult.levelUps);
        tickLegendaryDrops.push(...combatResult.legendaryDrops);
        if (combatResult.lastCombat) tickLastCombat = combatResult.lastCombat;
      } else if (roll < gatherThreshold) {
        eventsCreated += await processGatherEvent(agent, currentNode, tick);
      } else {
        // 漫遊探索：移動到相鄰節點
        eventsCreated += await processMoveEvent(agent, currentNode, tick);
      }
    } else {
      // 定點探索：打怪50% + 採集50%
      if (roll < 0.5) {
        const combatResult = await processCombatEvent(agent, currentNode, tick, dailyElement);
        eventsCreated += combatResult.events;
        tickLevelUps.push(...combatResult.levelUps);
        tickLegendaryDrops.push(...combatResult.legendaryDrops);
        if (combatResult.lastCombat) tickLastCombat = combatResult.lastCombat;
      } else {
        eventsCreated += await processGatherEvent(agent, currentNode, tick);
      }
    }
  }
  // ─── 採集策略 ───
  // 採集策略：採集 60% + 移動 15% + 打怪 20% + 休息 5%（漫遊）
  //             採集 80% + 打怪 20%（定點）
  else if (strategy === "gather") {
    if (movementMode === "roaming") {
      if (roll < 0.6) {
        eventsCreated += await processGatherEvent(agent, currentNode, tick);
      } else if (roll < 0.75) {
        eventsCreated += await processMoveEvent(agent, currentNode, tick);
      } else if (roll < 0.95) {
        const combatResult = await processCombatEvent(agent, currentNode, tick, dailyElement);
        eventsCreated += combatResult.events;
        tickLevelUps.push(...combatResult.levelUps);
        tickLegendaryDrops.push(...combatResult.legendaryDrops);
        if (combatResult.lastCombat) tickLastCombat = combatResult.lastCombat;
      } else {
        // 5% 機率主動休息回復
        await db.update(gameAgents).set({ status: "resting", updatedAt: Date.now() }).where(eq(gameAgents.id, agent.id));
      }
    } else {
      // 定點採集：採集 80% + 打怪 20%
      if (roll < 0.8) {
        eventsCreated += await processGatherEvent(agent, currentNode, tick);
      } else {
        const combatResult = await processCombatEvent(agent, currentNode, tick, dailyElement);
        eventsCreated += combatResult.events;
        tickLevelUps.push(...combatResult.levelUps);
        tickLegendaryDrops.push(...combatResult.legendaryDrops);
        if (combatResult.lastCombat) tickLastCombat = combatResult.lastCombat;
      }
    }
  }
  // ─── 休息策略 ───
   // 玩家選擇休息：直接進入休息狀態，補滿後自動切換到探索+漫遊
  else if (strategy === "rest") {
    await db.update(gameAgents).set({ status: "resting", updatedAt: Date.now() }).where(eq(gameAgents.id, agent.id));
  }
  // ─── 注靈策略 ───
  // 注靈：不消耗體力，依當前節點屬性截取五行能量，20%機率失敗
  // ★ 注靈只有在體力為 0 時才能執行；一旦體力回復（>0），自動切回上一個動作
  else if (strategy === "infuse") {
    // 體力回復檢查：體力 > 0 時自動切回 previousStrategy
    if (agent.stamina > 0) {
      const prevStrategy = agent.previousStrategy ?? "explore";
      const nextStrategy = prevStrategy !== "infuse" ? prevStrategy : "explore";
      await db.update(gameAgents).set({
        strategy: nextStrategy,
        previousStrategy: null,
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, agent.id));
      const strategyLabels: Record<string, string> = { explore: "探索", combat: "戰鬥", gather: "採集", rest: "休息" };
      const switchMsg = `【注靈中斷】${agent.agentName ?? "旅人"}體力已恢復，自動切換回「${strategyLabels[nextStrategy] ?? nextStrategy}」模式。`;
      await createEvent(agent.id, "system", switchMsg, { type: "infuse_auto_switch", newStrategy: nextStrategy }, currentNode.id);
      // 注靈不消耗體力（已在上層跳過扣除），無需退還
      return { events: 1, levelUps: tickLevelUps, legendaryDrops: tickLegendaryDrops };
    }

    const infuseCfg = getInfuseConfig();
    const nodeElement = currentNode.element as WuXing; // 節點屬性
    const failed = Math.random() < infuseCfg.failRate;
    // 注靈不消耗體力（已在上層跳過扣除）
    if (failed) {
      const WX_ZH_LOCAL: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
      const failMsg = `【注靈失敗】${agent.agentName ?? "旅人"}嘗試在「${currentNode.name}」截取${WX_ZH_LOCAL[nodeElement]}五行之力，但天地靈氣流通不畅，本次注靈未能成功。`;
      await createEvent(agent.id, "rest", failMsg, { type: "infuse_fail", element: nodeElement }, currentNode.id);
      eventsCreated++;
    } else {
      const WX_ZH_LOCAL: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
      const gain = parseFloat((infuseCfg.minGain + Math.random() * (infuseCfg.maxGain - infuseCfg.minGain)).toFixed(2));
      const wuxingKey = `wuxing${nodeElement.charAt(0).toUpperCase() + nodeElement.slice(1)}` as
        "wuxingWood" | "wuxingFire" | "wuxingEarth" | "wuxingMetal" | "wuxingWater";
      const currentVal = agent[wuxingKey] as number;
      const newVal = Math.min(infuseCfg.maxWuxing, parseFloat((currentVal + gain).toFixed(2)));
      await db.update(gameAgents).set({
        [wuxingKey]: newVal,
        updatedAt: Date.now(),
      }).where(eq(gameAgents.id, agent.id));
      const successMsg = `【注靈成功】${agent.agentName ?? "旅人"}在「${currentNode.name}」感懟天地${WX_ZH_LOCAL[nodeElement]}氣，成功截取 ${gain.toFixed(2)} 點${WX_ZH_LOCAL[nodeElement]}五行之力！（${WX_ZH_LOCAL[nodeElement]}：${currentVal.toFixed(1)} → ${newVal.toFixed(1)}）`;
      await createEvent(agent.id, "rest", successMsg, { type: "infuse_success", element: nodeElement, gain, newVal }, currentNode.id);
      eventsCreated++;
    }
  }
  return { events: eventsCreated, levelUps: tickLevelUps, legendaryDrops: tickLegendaryDrops, lastCombat: tickLastCombat };
}

// ─── 戰鬥事件 ───
async function processCombatEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number,
  dailyElement: WuXing
): Promise<{ events: number; levelUps: TickResult["levelUps"]; legendaryDrops: TickResult["legendaryDrops"]; lastCombat?: CombatResultItem }> {
  const EMPTY = { events: 0, levelUps: [] as TickResult["levelUps"], legendaryDrops: [] as TickResult["legendaryDrops"] };
  const db = await getDb();
  if (!db) return EMPTY;

  // M3L: 優先從資料庫讀取怪物（含技能），失敗時 fallback 到靜態陣列
  let monster: Monster | CombatMonster;
  try {
    const dbMonsters = await getCombatMonstersForNode(currentNode.element, currentNode.monsterLevel);
    if (dbMonsters.length > 0) {
      monster = pickRandom(dbMonsters);
    } else {
      const staticMonsters = getMonstersForNode(currentNode.element, currentNode.monsterLevel);
      if (staticMonsters.length === 0) return EMPTY;
      monster = pickRandom(staticMonsters);
    }
  } catch {
    const staticMonsters = getMonstersForNode(currentNode.element, currentNode.monsterLevel);
    if (staticMonsters.length === 0) return EMPTY;
    monster = pickRandom(staticMonsters);
  }

  // 戰鬥開始訊息
  const startMsg = formatMessage(pickRandom(EVENT_MESSAGES.combat_start), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    monster: monster.name,
  });
  await createEvent(agent.id, "combat", startMsg, { phase: "start", monsterId: monster.id }, currentNode.id);

  // GD-022：計算技能 Combo 加成和命格加成
  const comboResult = await calcSkillCombo(
    agent.id,
    (agent.dominantElement ?? "wood") as WuXing,
    agent.skillSlot1 ?? null
  );

  // 取得玩家已裝備技能資訊（用於詳細戰鬥計算）
  // M3L: 取得玩家已裝備技能資訊（加入 wuxing 和 cooldown）
  let equippedSkillsForCombat: Array<{ id: string; name: string; skillType: string; damageMultiplier: number; mpCost: number; wuxing?: string; cooldown?: number }> = [];
  try {
    const { agentSkills, gameSkillCatalog } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const installedSkills = await db
      .select({ id: agentSkills.skillId, installedSlot: agentSkills.installedSlot })
      .from(agentSkills)
      .where(eq(agentSkills.agentId, agent.id));
    const installedIds = installedSkills.filter(s => s.installedSlot).map(s => s.id);
    if (installedIds.length > 0) {
      const { inArray } = await import("drizzle-orm");
      const skillData = await db.select({
        id: gameSkillCatalog.skillId,
        name: gameSkillCatalog.name,
        skillType: gameSkillCatalog.category,
        damageMultiplier: gameSkillCatalog.powerPercent,
        mpCost: gameSkillCatalog.mpCost,
        wuxing: gameSkillCatalog.wuxing,
        cooldown: gameSkillCatalog.cooldown,
      }).from(gameSkillCatalog).where(inArray(gameSkillCatalog.skillId, installedIds));
      equippedSkillsForCombat = skillData.map(s => ({
        id: s.id,
        name: s.name,
        skillType: s.skillType === "active" ? "attack" : (s.skillType === "active_combat" ? "attack" : s.skillType),
        damageMultiplier: s.damageMultiplier ?? 1.0,
        mpCost: s.mpCost ?? 0,
        wuxing: s.wuxing,
        cooldown: s.cooldown ?? 2,
      }));
    }
  } catch {
    equippedSkillsForCombat = [];
  }

  // M3O: 載入天命考核技能（已裝備的）並合併到戰鬥技能列表
  try {
    const { inArray } = await import("drizzle-orm");
    const equippedQuestSkills = await db
      .select({
        skillId: gameLearnedQuestSkills.skillId,
        slotIndex: gameLearnedQuestSkills.slotIndex,
      })
      .from(gameLearnedQuestSkills)
      .where(and(
        eq(gameLearnedQuestSkills.agentId, agent.id),
        eq(gameLearnedQuestSkills.isEquipped, 1),
      ));
    const questSkillIds = equippedQuestSkills.map(s => s.skillId);
    if (questSkillIds.length > 0) {
      const questSkillData = await db.select({
        id: gameQuestSkillCatalog.id,
        name: gameQuestSkillCatalog.name,
        category: gameQuestSkillCatalog.category,
        skillType: gameQuestSkillCatalog.skillType,
        powerPercent: gameQuestSkillCatalog.powerPercent,
        mpCost: gameQuestSkillCatalog.mpCost,
        cooldown: gameQuestSkillCatalog.cooldown,
        wuxing: gameQuestSkillCatalog.wuxing,
      }).from(gameQuestSkillCatalog).where(inArray(gameQuestSkillCatalog.id, questSkillIds));
      for (const qs of questSkillData) {
        // 將天命考核技能轉換為戰鬥技能格式
        const mappedType = qs.skillType === "attack" ? "attack" :
          qs.skillType === "heal" ? "heal" :
          qs.skillType === "buff" ? "buff" :
          qs.skillType === "debuff" ? "attack" : // debuff 當作攻擊處理
          qs.skillType === "utility" ? "buff" : "attack";
        equippedSkillsForCombat.push({
          id: `quest_${qs.id}`,
          name: `[天命] ${qs.name}`,
          skillType: mappedType,
          damageMultiplier: (qs.powerPercent ?? 100) / 100,
          mpCost: qs.mpCost ?? 0,
          wuxing: qs.wuxing ?? undefined,
          cooldown: qs.cooldown ?? 3,
        });
      }
    }
  } catch {
    // 天命考核技能載入失敗不影響戰鬥
  }

  // 結算戰鬥
  const result = resolveCombat(
    {
      attack: Math.round(agent.attack * comboResult.damageMultiplier),
      defense: agent.defense,
      speed: agent.speed,
      hp: agent.hp,
      maxHp: agent.maxHp,
      dominantElement: agent.dominantElement ?? "wood",
      level: agent.level,
      // GD-020 修正一：傳入五行屬性數値
      wuxingWood:  agent.wuxingWood,
      wuxingFire:  agent.wuxingFire,
      wuxingEarth: agent.wuxingEarth,
      wuxingMetal: agent.wuxingMetal,
      wuxingWater: agent.wuxingWater,
      skillSlot1:  agent.skillSlot1,
      agentRace: "人型系", // 旅人預設為人型系
      equippedSkills: equippedSkillsForCombat,
      currentMp: agent.mp,
    },
    monster
  );

  // 更新角色狀態
  const multipliers = getMultipliers();
  let newHp = Math.max(1, agent.hp - result.hpLost);
  let newMp = Math.max(0, agent.mp - result.mpUsed);
  let newExp = agent.exp + Math.floor(result.expGained * multipliers.exp);
  let newGold = agent.gold + Math.floor(result.goldGained * multipliers.gold);
  let newLevel = agent.level;
  let newExpToNext = calcExpToNext(agent.level);
  let newStatus: typeof agent.status = agent.status;
  let newTotalKills = agent.totalKills + (result.won ? 1 : 0);

  // 升級判斷（GD-018：等級只是地圖通行證，上限 60）
  const combatLevelUps: TickResult["levelUps"] = [];
  while (newExp >= newExpToNext && newLevel < 60) {
    newExp -= newExpToNext;
    newLevel++;
    newExpToNext = calcExpToNext(newLevel);
    const lvupMsg = formatMessage(pickRandom(EVENT_MESSAGES.levelup), {
      name: agent.agentName ?? "旅人",
      level: newLevel,
    });
    await createEvent(agent.id, "system", lvupMsg, { type: "levelup", level: newLevel }, currentNode.id);
    combatLevelUps.push({ agentId: agent.id, agentName: agent.agentName ?? "旅人", newLevel, agentElement: agent.dominantElement ?? "wood" });
  }

  // 升級後重新計算基礎屬性（maxHp/maxMp/attack/defense/speed）
  const newStats = calcCharacterStats({
    wood: agent.wuxingWood,
    fire: agent.wuxingFire,
    earth: agent.wuxingEarth,
    metal: agent.wuxingMetal,
    water: agent.wuxingWater,
  }, newLevel);
  const newMaxHp = newStats.hp;
  const newMaxMp = newStats.mp;
  // 升級後 HP/MP 按比例恢復（保持目前比例）
  const hpRatio = agent.maxHp > 0 ? newHp / agent.maxHp : 1;
  const mpRatio = agent.maxMp > 0 ? newMp / agent.maxMp : 1;
  if (combatLevelUps.length > 0) {
    // 升級後 HP/MP 全滿
    newHp = newMaxHp;
    newMp = newMaxMp;
  } else {
    // 未升級，保持原比例
    newHp = Math.min(newMaxHp, Math.max(1, Math.round(newMaxHp * hpRatio)));
    newMp = Math.min(newMaxMp, Math.max(0, Math.round(newMaxMp * mpRatio)));
  }

  if (newHp <= 1) {
    newStatus = "resting";
  }

  await db.update(gameAgents).set({
    hp: newHp,
    mp: newMp,
    maxHp: newMaxHp,
    maxMp: newMaxMp,
    attack: newStats.atk,
    defense: newStats.def,
    speed: newStats.spd,
    exp: newExp,
    level: newLevel,
    gold: newGold,
    status: newStatus,
    totalKills: newTotalKills,
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

   // 戰鬥結果訊息（GD-020 補充三：移除係數數字，加入五行說明文字）
  const baseResultMsg = result.won
    ? formatMessage(pickRandom(EVENT_MESSAGES.combat_win), {
        name: agent.agentName ?? "旅人",
        monster: monster.name,
        exp: result.expGained,
        gold: result.goldGained,
      })
    : formatMessage(pickRandom(EVENT_MESSAGES.combat_lose), {
        name: agent.agentName ?? "旅人",
        monster: monster.name,
        hp: newHp,
      });
  // 如有五行加成說明，附加在訊息後（不顯示係數數字）
  const boostParts: string[] = [];
  if (result.wuxingBoostDesc) boostParts.push(result.wuxingBoostDesc);
  if (result.raceBoostDesc) boostParts.push(result.raceBoostDesc);
  // GD-022：加入 Combo 說明
  if (comboResult.description) boostParts.push(comboResult.description);
  const resultMsg = boostParts.length > 0
    ? `${baseResultMsg}（${boostParts.join("，")}）`
    : baseResultMsg;
  await createEvent(agent.id, "combat", resultMsg, {
    phase: "result",
    monsterId: monster.id,
    monsterName: monster.name,
    won: result.won,
    expGained: result.expGained,
    goldGained: result.goldGained,
    hpLost: result.hpLost,
    elementMultiplier: result.elementMultiplier,
    // GD-020 補允三：加入五行說明文字（移除係數數字）
    wuxingBoostDesc: result.wuxingBoostDesc,
    spiritCoeffA: result.spiritCoeffA,
    skillElement: result.skillElement,
    // GD-020 補充四：種族剋制資訊
    raceBoostDesc: result.raceBoostDesc,
    raceMultiplier: result.raceMultiplier,
    monsterRace: result.monsterRace,
    rounds: result.rounds,
    lootItems: result.lootItems,
  }, currentNode.id);

  // GD-021：命格共鳴裝備摀落（從資料庫摀落表計算）
  const combatLegendaryDrops: TickResult["legendaryDrops"] = [];
  if (result.won) {
    const dropCtx: DropContext = {
      monsterId: monster.id,
      monsterElement: monster.element as WuxingElement,
      attackerElement: (agent.dominantElement ?? "wood") as WuxingElement,
      attackerNatalStats: {
        wood:  agent.wuxingWood  ?? 20,
        fire:  agent.wuxingFire  ?? 20,
        earth: agent.wuxingEarth ?? 20,
        metal: agent.wuxingMetal ?? 20,
        water: agent.wuxingWater ?? 20,
      },
      luckyValue: Math.min(1000, (agent.wuxingMetal ?? 20) * 10), // 金屬性 × 10 = 幸運値
      hasTaskBonus: false,
    };
    const equipDrops = await rollEquipmentDrops(agent.id, monster.id, dropCtx);
    for (const equipId of equipDrops) {
      const lootMsg = `${agent.agentName ?? "旅人"} 從 ${monster.name} 身上獲得了裝備！`;
      await createEvent(agent.id, "gather", lootMsg, { itemId: equipId, isEquipment: true }, currentNode.id);
      // 判斷是否為高級摀落（傳說/高級裝備）
      const tierMatch = equipId.match(/-(basic|mid|high|legendary)/);
      const tier = tierMatch ? tierMatch[1] : "basic";
      if (tier === "legendary" || tier === "high") {
        combatLegendaryDrops.push({ agentId: agent.id, agentName: agent.agentName ?? "旅人", equipId, tier, agentElement: agent.dominantElement ?? "wood", agentLevel: agent.level, itemName: equipId });
      }
      // 寫入背包（裝備類型）
      try {
        const [existingEquip] = await db.select().from(agentInventory)
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, equipId)))
          .limit(1);
        if (existingEquip) {
          await db.update(agentInventory).set({
            quantity: existingEquip.quantity + 1,
            updatedAt: Date.now(),
          }).where(eq(agentInventory.id, existingEquip.id));
        } else {
          await db.insert(agentInventory).values({
            agentId: agent.id,
            itemId: equipId,
            itemType: "equipment" as const,
            quantity: 1,
            acquiredAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      } catch (e) {
        console.error("[Tick] Failed to insert equipment drop:", e);
      }
    }
  }
  // 掉落物事件（同時寫入 agentInventory 表）
  for (const itemId of result.lootItems) {
    const lootMsg = formatMessage(pickRandom(EVENT_MESSAGES.loot), {
      name: agent.agentName ?? "旅人",
      node: currentNode.name,
      item: itemId,
      monster: monster.name,
    });
    await createEvent(agent.id, "gather", lootMsg, { itemId }, currentNode.id);
    // 寫入背包（如果已有相同道具則隨數量）
    try {
      const existing = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, itemId)))
        .limit(1);
      if (existing[0]) {
        await db.update(agentInventory).set({
          quantity: existing[0].quantity + 1,
          updatedAt: Date.now(),
        }).where(eq(agentInventory.id, existing[0].id));
      } else {
        // 判斷道具類型
        const itemType = itemId.startsWith("herb") ? "material" as const
          : itemId.startsWith("mat") ? "material" as const
          : itemId.startsWith("food") ? "consumable" as const
          : itemId.startsWith("consumable") ? "consumable" as const
          : itemId.startsWith("equip") ? "equipment" as const
          : itemId.startsWith("skill") ? "skill_book" as const
          : "material" as const;
        await db.insert(agentInventory).values({
          agentId: agent.id,
          itemId,
          itemType,
          quantity: 1,
          acquiredAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.error("[Tick] Failed to update inventory:", e);
    }
  }

  // GD-022 P2：擊殺後更新隱藏技能追蹤器
  if (result.won) {
    const killTrackerId = `kill_count_${agent.id}`;
    await updateHiddenSkillTracker(agent.id, killTrackerId, 1).catch(() => {});
  }

  return {
    events: 1 + result.lootItems.length,
    levelUps: combatLevelUps,
    legendaryDrops: combatLegendaryDrops,
    // 戰鬥資訊（用於前端戰鬥視窗）
    lastCombat: {
      agentId: agent.id,
      agentName: agent.agentName ?? "旅人",
      monsterName: monster.name,
      monsterRace: monster.race,
      won: result.won,
      expGained: result.expGained,
      goldGained: result.goldGained,
      hpLost: result.hpLost,
      wuxingBoostDesc: result.wuxingBoostDesc,
      raceBoostDesc: result.raceBoostDesc,
      rounds: result.rounds,
      agentMaxHp: agent.maxHp,
      monsterMaxHp: monster.hp,
      lootItems: result.lootItems, // 戰鬥掉落道具列表
      combatKey: Date.now(), // 唯一識別碼，防止前端 data 物件引用變化導致無限 setInterval
    },
  };
}

// ─── 採集事件 ───
async function processGatherEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const gatherItems: Record<WuXing, string[]> = {
    wood: ["herb-001", "herb-002", "mat-wood-001", "mat-wood-002"],
    fire: ["herb-fire-001", "mat-fire-001", "mat-fire-002"],
    earth: ["mat-earth-001", "mat-earth-002", "food-earth-001"],
    metal: ["mat-metal-001", "mat-metal-002", "mat-metal-003"],
    water: ["mat-water-001", "mat-water-002", "herb-water-001"],
  };

  const items = gatherItems[currentNode.element];
  const item = pickRandom(items);

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.gather), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    item,
  });

  await createEvent(agent.id, "gather", msg, { itemId: item }, currentNode.id);
  // 寫入背包（套用掉落倍率）
  const mults = getMultipliers();
  const gatherQty = Math.max(1, Math.floor(mults.drop));
  const db2 = await getDb();
  if (db2) {
    try {
      const existing = await db2.select().from(agentInventory)
        .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, item)))
        .limit(1);
      if (existing[0]) {
        await db2.update(agentInventory).set({
          quantity: existing[0].quantity + gatherQty,
          updatedAt: Date.now(),
        }).where(eq(agentInventory.id, existing[0].id));
      } else {
        await db2.insert(agentInventory).values({
          agentId: agent.id,
          itemId: item,
          itemType: "material",
          quantity: gatherQty,
          acquiredAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } catch (e) {
      console.error("[Tick] Failed to update gather inventory:", e);
    }
  }
  return 1;
}

// ─── 移動事件 ───
async function processMoveEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  if (currentNode.connections.length === 0) return 0;

  const destId = pickRandom(currentNode.connections);
  const destNode = MAP_NODE_MAP.get(destId);
  if (!destNode) return 0;

  // ── 距離制體力消耗（V34 新增）──
  // 根據兩節點的 x,y 距離計算移動體力消耗（最少 2 點，最多 12 點）
  const moveCost = calcMoveCost(currentNode, destNode);
  const currentStamina = agent.stamina ?? 0;
  if (currentStamina < moveCost) {
    // 體力不足以完成此次移動，跳過（等待自然回復）
    const warnMsg = `${agent.agentName ?? '旅人'} 想前往 ${destNode.name}，但體力不足（需 ${moveCost} 點，剩餘 ${currentStamina} 點），原地休息。`;
    await createEvent(agent.id, "rest", warnMsg, { staminaNeeded: moveCost, staminaLeft: currentStamina }, currentNode.id);
    return 0;
  }

  // 扣除移動體力（移動體力在此扣除，主體力扣除在 processAgentTick 已處理）
  // 注意：主體力扣除 5 點已在 processAgentTick 執行，此處額外扣除距離差額
  const extraCost = Math.max(0, moveCost - 5); // 超出基礎 5 點的額外消耗
  if (extraCost > 0) {
    await db.update(gameAgents).set({
      stamina: Math.max(0, currentStamina - extraCost),
      updatedAt: Date.now(),
    }).where(eq(gameAgents.id, agent.id));
  }

  await db.update(gameAgents).set({
    targetNodeId: destId,
    status: "moving",
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  const distLabel = moveCost <= 2 ? '近距離' : moveCost <= 5 ? '短途' : moveCost <= 8 ? '中途' : '長途';
  const msg = formatMessage(pickRandom(EVENT_MESSAGES.move), {
    name: agent.agentName ?? "旅人",
    dest: destNode.name,
  }) + `（${distLabel}，消耗 ${moveCost} 點體力）`;

  await createEvent(agent.id, "move", msg, { destNodeId: destId, moveCost }, currentNode.id);
  return 1;
}

// ─── Roguelike 奇遇事件 ───
// 奇遇事件快取（從 DB 讀取，5 分鐘更新一次）
let rogueEventsCache: Array<{
  id: number;
  eventId: string;
  name: string;
  description: string;
  icon: string;
  rewardType: string;
  goldMin: number;
  goldMax: number;
  expReward: number;
  hpChange: number;
  healFull: number;
  itemRewardId: string;
  itemRewardQty: number;
  weight: number;
  isActive: number;
  wuxingFilter: string;
  minLevel: number;
}> | null = null;
let rogueEventsCacheTime = 0;
const ROGUE_CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

async function getActiveRogueEvents(agentLevel = 1, agentWuxing = "") {
  const now = Date.now();
  if (!rogueEventsCache || now - rogueEventsCacheTime > ROGUE_CACHE_TTL) {
    const db = await getDb();
    if (db) {
      rogueEventsCache = await db.select().from(gameRogueEvents).where(eq(gameRogueEvents.isActive, 1));
      rogueEventsCacheTime = now;
    }
  }
  if (!rogueEventsCache || rogueEventsCache.length === 0) {
    // fallback 到預設奇遇事件
    return ROGUE_EVENTS_FALLBACK;
  }
  // 適用等級和屬性過濾
  return rogueEventsCache.filter(e =>
    e.minLevel <= agentLevel &&
    (e.wuxingFilter === "" || e.wuxingFilter === agentWuxing)
  );
}

/** 快取失效時的備用奇遇事件 */
const ROGUE_EVENTS_FALLBACK = [
  { id: 0, eventId: "treasure_chest", name: "神秘寶笱", description: "發現一個古老的寶笱，裡面藏有珍貴的道具！", icon: "📦", rewardType: "gold", goldMin: 50, goldMax: 150, expReward: 0, hpChange: 0, healFull: 0, itemRewardId: "", itemRewardQty: 0, weight: 10, isActive: 1, wuxingFilter: "", minLevel: 0 },
  { id: 0, eventId: "ancient_ruins", name: "古代遺跡", description: "發現了隱藏的古代遺跡，獲得了大量的經驗値！", icon: "🏗️", rewardType: "exp", goldMin: 0, goldMax: 0, expReward: 200, hpChange: 0, healFull: 0, itemRewardId: "", itemRewardQty: 0, weight: 8, isActive: 1, wuxingFilter: "", minLevel: 0 },
  { id: 0, eventId: "spirit_spring", name: "靈泉", description: "找到了一處神秘的靈泉，HP 完全恢復！", icon: "💧", rewardType: "heal", goldMin: 0, goldMax: 0, expReward: 0, hpChange: 0, healFull: 1, itemRewardId: "", itemRewardQty: 0, weight: 6, isActive: 1, wuxingFilter: "", minLevel: 0 },
  { id: 0, eventId: "lost_traveler", name: "迷路旅人", description: "遇到了一位迷路的旅人，幫助他後獲得了獎勵。", icon: "🧭", rewardType: "mixed", goldMin: 20, goldMax: 80, expReward: 30, hpChange: 0, healFull: 0, itemRewardId: "", itemRewardQty: 0, weight: 9, isActive: 1, wuxingFilter: "", minLevel: 0 },
];

async function processRogueEvent(
  agent: typeof gameAgents.$inferSelect,
  currentNode: MapNode,
  tick: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 從 DB 讀取奇遇事件（快取）
  const activeEvents = await getActiveRogueEvents(agent.level, currentNode.element);
  if (activeEvents.length === 0) return 0;

  // 加權隨機選擇（weight 越高越容易觸發）
  const totalWeight = activeEvents.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;
  let rogueEvent = activeEvents[0];
  for (const e of activeEvents) {
    rand -= e.weight;
    if (rand <= 0) { rogueEvent = e; break; }
  }

  let goldChange = 0;
  let expChange = 0;
  let hpChange = 0;

  if (rogueEvent.goldMin > 0 || rogueEvent.goldMax > 0) {
    goldChange = randInt(rogueEvent.goldMin, rogueEvent.goldMax);
  }
  if (rogueEvent.expReward > 0) {
    expChange = rogueEvent.expReward;
  }
  if (rogueEvent.healFull === 1) {
    hpChange = agent.maxHp - agent.hp;
  } else if (rogueEvent.hpChange !== 0) {
    hpChange = rogueEvent.hpChange;
  }

  const newGold = agent.gold + goldChange;
  const newExp = agent.exp + expChange;
  const newHp = Math.max(1, Math.min(agent.maxHp, agent.hp + hpChange));

  await db.update(gameAgents).set({
    gold: newGold,
    exp: newExp,
    hp: newHp,
    updatedAt: Date.now(),
  }).where(eq(gameAgents.id, agent.id));

  // 如果有道具獎勵，存入背包
  if (rogueEvent.itemRewardId && rogueEvent.itemRewardQty > 0) {
    try {
      const existing = await db.select().from(agentInventory)
        .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, rogueEvent.itemRewardId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(agentInventory).set({ quantity: existing[0].quantity + rogueEvent.itemRewardQty })
          .where(and(eq(agentInventory.agentId, agent.id), eq(agentInventory.itemId, rogueEvent.itemRewardId)));
      } else {
        await db.insert(agentInventory).values({
          agentId: agent.id,
          itemId: rogueEvent.itemRewardId,
          quantity: rogueEvent.itemRewardQty,
          acquiredAt: Date.now(),
        });
      }
    } catch (_) { /* 道具獎勵失敗不影響其他獎勵 */ }
  }

  // 建構獎勵描述文字
  const rewardParts: string[] = [];
  if (goldChange > 0) rewardParts.push(`+${goldChange} 金幣`);
  if (expChange > 0) rewardParts.push(`+${expChange} EXP`);
  if (hpChange > 0) rewardParts.push(`回復 ${hpChange} HP`);
  if (hpChange < 0) rewardParts.push(`損失 ${Math.abs(hpChange)} HP`);
  if (rogueEvent.itemRewardId && rogueEvent.itemRewardQty > 0) rewardParts.push(`獲得道具 x${rogueEvent.itemRewardQty}`);
  const rewardDesc = rewardParts.length > 0 ? `（${rewardParts.join("、")}）` : "";

  const msg = formatMessage(pickRandom(EVENT_MESSAGES.rogue), {
    name: agent.agentName ?? "旅人",
    node: currentNode.name,
    event: rogueEvent.name,
  }) + rewardDesc;

  await createEvent(agent.id, "rogue", msg, {
    rogueEventId: rogueEvent.eventId,
    rogueEventName: rogueEvent.name,
    rogueEventDesc: rogueEvent.description,
    rogueEventIcon: rogueEvent.icon,
    goldChange,
    expChange,
    hpChange,
    itemRewardId: rogueEvent.itemRewardId,
    itemRewardQty: rogueEvent.itemRewardQty,
    rewardDesc,
  }, currentNode.id);

  return 1;
}

// ─── 建立事件記錄 ───
async function createEvent(
  agentId: number,
  eventType: typeof agentEvents.$inferInsert["eventType"],
  message: string,
  detail: Record<string, unknown>,
  nodeId?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(agentEvents).values({
    agentId,
    eventType,
    message,
    detail,
    nodeId,
    createdAt: Date.now(),
  });
}

// ─── Tick 引擎啟動器 ───
let tickInterval: ReturnType<typeof setInterval> | null = null;

export function startTickEngine(): void {
  if (tickInterval) return;
  const intervalMs = getTickIntervalMs();
  console.log(`[TickEngine] 啟動虛相世界 Tick 引擎，間隔 ${intervalMs / 1000} 秒`);
  tickInterval = setInterval(async () => {
    const cfg = getEngineConfig();
    if (!cfg.gameEnabled) {
      console.log("[TickEngine] 遊戲已暫停（維護模式），跳過 Tick");
      return;
    }
    try {
      const result = await processTick();
      if (result.processed > 0) {
        console.log(`[TickEngine] Tick 完成：${result.processed} 位旅人，${result.events} 個事件`);
      }
    } catch (err) {
      console.error("[TickEngine] Tick 錯誤：", err);
    }
  }, intervalMs);
}

export function stopTickEngine(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log("[TickEngine] 已停止");
  }
}

/** 重啟 Tick 引擎（用於動態調整間隔後） */
export function restartTickEngine(): void {
  stopTickEngine();
  startTickEngine();
}

// ─── 商店自動刷新邏輯 ───
/**
 * 從 gameItemCatalog 中隨機抽取初階/中階道具填充商店
 * 一般商店（金幣）：8-12 件 common/rare 道具
 * 靈相商店（靈石）：4-6 件 rare/epic 道具
 * 每次全地圖 Tick 時執行，清空舊商品後重新填充
 */
export async function refreshShopItems(db: Awaited<ReturnType<typeof getDb>>): Promise<{ virtualCount: number; spiritCount: number }> {
  if (!db) return { virtualCount: 0, spiritCount: 0 };

  // 取得所有啟用的道具（排除 quest/treasure 類別）
  const allItems = await db.select({
    itemId: gameItemCatalog.itemId,
    name: gameItemCatalog.name,
    rarity: gameItemCatalog.rarity,
    category: gameItemCatalog.category,
    wuxing: gameItemCatalog.wuxing,
  }).from(gameItemCatalog)
    .where(sql`is_active = 1 AND category NOT IN ('quest', 'treasure')`);

  if (allItems.length === 0) return { virtualCount: 0, spiritCount: 0 };

  // 分層：一般商店用 common/rare，靈相商店用 rare/epic
  const coinPool = allItems.filter(i => i.rarity === "common" || i.rarity === "rare");
  const stonePool = allItems.filter(i => i.rarity === "rare" || i.rarity === "epic");

  if (coinPool.length === 0 && stonePool.length === 0) return { virtualCount: 0, spiritCount: 0 };

  // 隨機抽取（不重複）
  function pickRandom<T>(arr: T[], count: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  // 計算道具基礎售價
  function calcPrice(rarity: string, currency: "coins" | "stones"): number {
    if (currency === "coins") {
      const base: Record<string, number> = { common: 50, rare: 200, epic: 800, legendary: 3000 };
      return base[rarity] ?? 100;
    } else {
      const base: Record<string, number> = { common: 5, rare: 20, epic: 80, legendary: 300 };
      return base[rarity] ?? 20;
    }
  }

  // ─── 刷新一般商店（金幣）───
  if (coinPool.length > 0) {
    const coinItems = pickRandom(coinPool, 20);
    // 清空舊商品（只清除自動生成且未鎖定的，保留 admin 手動添加的和已鎖定的）
    await db.delete(gameVirtualShop).where(sql`(node_id = '' OR node_id IS NULL) AND is_locked = 0`);
    // 插入新商品
    for (let i = 0; i < coinItems.length; i++) {
      const item = coinItems[i];
      await db.insert(gameVirtualShop).values({
        itemKey: item.itemId,
        displayName: item.name,
        description: `【${item.wuxing}行】${item.category === "consumable" ? "消耗品" : item.category === "skill_book" ? "技能書" : "材料"}`,
        priceCoins: calcPrice(item.rarity, "coins"),
        quantity: 1,
        stock: -1,
        nodeId: "",
        sortOrder: i,
        isOnSale: 1,
      });
    }
  }

  // ─── 刷新靈相商店（靈石）───
  if (stonePool.length > 0) {
    const stoneItems = pickRandom(stonePool, 10);
    // 清空舊商品（保留已鎖定的）
    await db.delete(gameSpiritShop).where(sql`is_locked = 0`);
    // 插入新商品
    for (let i = 0; i < stoneItems.length; i++) {
      const item = stoneItems[i];
      await db.insert(gameSpiritShop).values({
        itemKey: item.itemId,
        displayName: item.name,
        description: `【${item.wuxing}行】稀有商品`,
        priceStones: calcPrice(item.rarity, "stones"),
        quantity: 1,
        rarity: (item.rarity === "common" ? "common" : item.rarity === "rare" ? "rare" : item.rarity === "epic" ? "epic" : "legendary") as "common" | "rare" | "epic" | "legendary",
        sortOrder: i,
        isOnSale: 1,
      });
    }
  }

  const virtualCount = coinPool.length > 0 ? Math.min(20, coinPool.length) : 0;
  const spiritCount = stonePool.length > 0 ? Math.min(10, stonePool.length) : 0;
  console.log(`[ShopRefresh] 一般商店 ${virtualCount} 件，靈相商店 ${spiritCount} 件`);
  return { virtualCount, spiritCount };
}
