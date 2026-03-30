/**
 * M3L 怪物數據服務層
 * 統一怪物數據源：優先從資料庫讀取 gameMonsterCatalog + gameUnifiedSkillCatalog，
 * 若資料庫無資料則 fallback 到 shared/monsters.ts 靜態表。
 * 內建記憶體快取，避免每次 Tick 都查資料庫。
 */
import { getDb } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { gameMonsterCatalog, gameUnifiedSkillCatalog, gameConfig } from "../drizzle/schema";
import { getMonstersForNode as getStaticMonstersForNode, MONSTER_MAP, type Monster } from "../shared/monsters";
import type { WuXing } from "../shared/types";

// ─── 魔物數值倍率系統 ─────────────────────────────────────────────────────────────
export interface MonsterMultipliers {
  hp: number; mp: number; atk: number; matk: number;
  def: number; mdef: number; spd: number; acc: number;
  critRate: number; critDmg: number; bp: number;
  heal: number; resist: number;
  rarityMultipliers: Record<string, number>;
}

const DEFAULT_MULTIPLIERS: MonsterMultipliers = {
  hp: 1, mp: 1, atk: 1, matk: 1, def: 1, mdef: 1, spd: 1, acc: 1,
  critRate: 1, critDmg: 1, bp: 1, heal: 1, resist: 1,
  rarityMultipliers: { common: 1, rare: 1, elite: 1, epic: 1, boss: 1, legendary: 1 },
};

let multiplierCache: { data: MonsterMultipliers; timestamp: number } | null = null;
const MULTIPLIER_CACHE_TTL = 60_000; // 1 分鐘

/** 從 game_config 讀取倍率設定 */
export async function getMonsterMultipliers(): Promise<MonsterMultipliers> {
  const now = Date.now();
  if (multiplierCache && (now - multiplierCache.timestamp) < MULTIPLIER_CACHE_TTL) {
    return multiplierCache.data;
  }
  const db = await getDb();
  if (!db) return DEFAULT_MULTIPLIERS;

  const rows = await db.select({ configKey: gameConfig.configKey, configValue: gameConfig.configValue })
    .from(gameConfig)
    .where(and(eq(gameConfig.isActive, 1), sql`${gameConfig.configKey} LIKE 'monster_%_multiplier'`));

  const cfgMap: Record<string, number> = {};
  for (const r of rows) cfgMap[r.configKey] = parseFloat(r.configValue) || 1;

  const result: MonsterMultipliers = {
    hp: cfgMap.monster_hp_multiplier ?? 1,
    mp: cfgMap.monster_mp_multiplier ?? 1,
    atk: cfgMap.monster_atk_multiplier ?? 1,
    matk: cfgMap.monster_matk_multiplier ?? 1,
    def: cfgMap.monster_def_multiplier ?? 1,
    mdef: cfgMap.monster_mdef_multiplier ?? 1,
    spd: cfgMap.monster_spd_multiplier ?? 1,
    acc: cfgMap.monster_acc_multiplier ?? 1,
    critRate: cfgMap.monster_crit_rate_multiplier ?? 1,
    critDmg: cfgMap.monster_crit_dmg_multiplier ?? 1,
    bp: cfgMap.monster_bp_multiplier ?? 1,
    heal: cfgMap.monster_heal_multiplier ?? 1,
    resist: cfgMap.monster_resist_multiplier ?? 1,
    rarityMultipliers: {
      common: cfgMap.monster_rarity_common_multiplier ?? 1,
      rare: cfgMap.monster_rarity_rare_multiplier ?? 1,
      elite: cfgMap.monster_rarity_elite_multiplier ?? 1,
      epic: cfgMap.monster_rarity_epic_multiplier ?? 1,
      boss: cfgMap.monster_rarity_boss_multiplier ?? 1,
      legendary: cfgMap.monster_rarity_legendary_multiplier ?? 1,
    },
  };
  multiplierCache = { data: result, timestamp: now };
  return result;
}

/** 清除倍率快取（後台修改後呼叫） */
export function invalidateMultiplierCache(): void {
  multiplierCache = null;
}

/** 將倍率套用到單隻魔物的原始數值 */
function applyMultipliers(
  m: { hp: number; attack: number; defense: number; speed: number; baseMp: number; magicAttack: number },
  rarity: string,
  mult: MonsterMultipliers,
): { hp: number; attack: number; defense: number; speed: number; baseMp: number; magicAttack: number } {
  const rm = mult.rarityMultipliers[rarity] ?? 1;
  return {
    hp: Math.floor(m.hp * mult.hp * rm),
    attack: Math.floor(m.attack * mult.atk * rm),
    defense: Math.floor(m.defense * mult.def * rm),
    speed: Math.floor(m.speed * mult.spd * rm),
    baseMp: Math.floor(m.baseMp * mult.mp * rm),
    magicAttack: Math.floor(m.magicAttack * mult.matk * rm),
  };
}

// ─── 怪物技能數據結構 ─────────────────────────────────────────────────────────
export interface MonsterSkillData {
  id: string;           // skillId (e.g. USK_229)
  name: string;
  wuxing: string;       // 五行屬性
  skillType: string;    // attack / heal / buff / debuff / special / passive
  rarity: string;
  powerPercent: number; // 威力 %（100 = 基礎傷害 100%）
  mpCost: number;
  cooldown: number;     // 冷卻回合數
  accuracyMod: number;  // 命中率修正 %
  additionalEffect: { type: string; chance: number; duration?: number; value?: number } | null;
  aiCondition: { hpBelow?: number; targetElement?: string; priority?: number } | null;
  description: string;
}

// ─── 擴展的怪物數據結構（含資料庫技能） ─────────────────────────────────────────
export interface CombatMonster extends Monster {
  /** 資料庫技能數據（若有） */
  dbSkills: MonsterSkillData[];
  /** 怪物 AI 等級：1=隨機 2=弱點優先 3=策略型 4=BOSS級 */
  aiLevel: number;
  /** 基礎 MP（根據等級和稀有度計算） */
  baseMp: number;
  /** 五行抗性 */
  resistances: Record<string, number>;
  /** 魔法攻擊 */
  magicAttack: number;
}

// ─── 五行中文 → 英文映射 ─────────────────────────────────────────────────────
const WUXING_ZH_TO_EN: Record<string, WuXing> = {
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
  "wood": "wood", "fire": "fire", "earth": "earth", "metal": "metal", "water": "water",
};

// ─── 稀有度 → 基礎 MP 映射 ─────────────────────────────────────────────────
function calcMonsterBaseMp(level: number, rarity: string): number {
  const rarityMultiplier: Record<string, number> = {
    common: 1.0, rare: 1.3, elite: 1.5, epic: 1.5, boss: 2.0, legendary: 2.5,
  };
  const mult = rarityMultiplier[rarity] ?? 1.0;
  return Math.floor((30 + level * 2) * mult);
}

// ─── 快取系統 ─────────────────────────────────────────────────────────────────
interface CacheEntry {
  monsters: CombatMonster[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘快取
let monsterCache: CacheEntry | null = null;

/** 清除快取（後台修改怪物數據後呼叫） */
export function invalidateMonsterCache(): void {
  monsterCache = null;
}

// ─── 從資料庫載入所有怪物 + 技能 ──────────────────────────────────────────────
async function loadMonstersFromDb(): Promise<CombatMonster[]> {
  const db = await getDb();
  if (!db) return [];

  // 讀取全域倍率設定
  const multipliers = await getMonsterMultipliers();

  try {
    // 載入所有啟用的怪物
    const dbMonsters = await db.select().from(gameMonsterCatalog)
      .where(eq(gameMonsterCatalog.isActive, 1));

    if (dbMonsters.length === 0) return [];

    // 載入所有啟用的怪物技能（從統一技能表讀取，篩選 usable_by_monster=1）
    const dbSkills = await db.select().from(gameUnifiedSkillCatalog)
      .where(and(eq(gameUnifiedSkillCatalog.isActive, 1), eq(gameUnifiedSkillCatalog.usableByMonster, 1)));

    // 建立技能 ID → 技能數據的映射
    const skillMap = new Map<string, MonsterSkillData>();
    for (const sk of dbSkills) {
      const skillId = sk.skillId ?? `USK_${sk.id}`;
      skillMap.set(skillId, {
        id: skillId,
        name: sk.name,
        wuxing: sk.wuxing ?? "",
        skillType: sk.skillType ?? "attack",
        rarity: sk.rarity ?? "common",
        powerPercent: sk.powerPercent ?? 100,
        mpCost: sk.mpCost ?? 0,
        cooldown: sk.cooldown ?? 0,
        accuracyMod: sk.accuracyMod ?? 0,
        additionalEffect: sk.additionalEffect ?? null,
        aiCondition: sk.aiCondition ?? null,
        description: sk.description ?? "",
      });
    }

    // 轉換為 CombatMonster 格式
    const result: CombatMonster[] = [];
    for (const m of dbMonsters) {
      const element = WUXING_ZH_TO_EN[m.wuxing] ?? "wood";
      const levelRange = m.levelRange.split("-").map(Number);
      const minLevel = levelRange[0] ?? 1;
      const maxLevel = levelRange[1] ?? minLevel;
      const avgLevel = Math.floor((minLevel + maxLevel) / 2);

      // 收集怪物的技能數據
      const monsterSkills: MonsterSkillData[] = [];
      const skillNames: string[] = [];
      for (const sid of [m.skillId1, m.skillId2, m.skillId3]) {
        if (sid && sid.trim() !== "") {
          const sk = skillMap.get(sid);
          if (sk) {
            monsterSkills.push(sk);
            skillNames.push(sk.name);
          }
        }
      }

      // 收集掉落物
      const dropItems: Array<{ itemId: string; chance: number }> = [];
      for (const [item, rate] of [
        [m.dropItem1, m.dropRate1], [m.dropItem2, m.dropRate2],
        [m.dropItem3, m.dropRate3], [m.dropItem4, m.dropRate4],
        [m.dropItem5, m.dropRate5],
      ] as [string, number][]) {
        if (item && item.trim() !== "" && rate > 0) {
          dropItems.push({ itemId: item, chance: rate });
        }
      }
      // 傳說掉落
      if (m.legendaryDrop && m.legendaryDrop.trim() !== "" && m.legendaryDropRate > 0) {
        dropItems.push({ itemId: m.legendaryDrop, chance: m.legendaryDropRate });
      }

      const goldRange = m.dropGold ?? { min: 5, max: 15 };
      const isBoss = m.rarity === "boss" || m.rarity === "legendary";

      // 計算經驗獎勵（基於等級和稀有度）
      const rarityExpMult: Record<string, number> = {
        common: 1.0, rare: 1.5, elite: 2.0, epic: 2.0, boss: 5.0, legendary: 8.0,
      };
      const expReward = Math.floor(avgLevel * 8 * (rarityExpMult[m.rarity] ?? 1.0));

      // 套用全域倍率
      const rawBaseMp = calcMonsterBaseMp(avgLevel, m.rarity);
      const scaled = applyMultipliers(
        { hp: m.baseHp, attack: m.baseAttack, defense: m.baseDefense, speed: m.baseSpeed, baseMp: rawBaseMp, magicAttack: m.baseMagicAttack },
        m.rarity, multipliers,
      );
      const rm = multipliers.rarityMultipliers[m.rarity] ?? 1;

      result.push({
        // Monster 基礎欄位
        id: m.monsterId,
        name: m.name,
        element: element,
        level: avgLevel,
        hp: scaled.hp,
        attack: scaled.attack,
        defense: scaled.defense,
        speed: scaled.speed,
        expReward,
        goldReward: [goldRange.min, goldRange.max],
        dropItems,
        skills: skillNames.length > 0 ? skillNames : ["普通攻擊"],
        description: m.description ?? "",
        isBoss,
        race: (m.race as any) ?? undefined,
        // CombatMonster 擴展欄位
        dbSkills: monsterSkills,
        aiLevel: m.aiLevel,
        baseMp: scaled.baseMp,
        resistances: {
          wood: Math.floor(m.resistWood * multipliers.resist * rm),
          fire: Math.floor(m.resistFire * multipliers.resist * rm),
          earth: Math.floor(m.resistEarth * multipliers.resist * rm),
          metal: Math.floor(m.resistMetal * multipliers.resist * rm),
          water: Math.floor(m.resistWater * multipliers.resist * rm),
        },
        magicAttack: scaled.magicAttack,
        imageUrl: m.imageUrl ?? null,
      });
    }

    return result;
  } catch (err) {
    console.error("[MonsterDataService] 從資料庫載入怪物失敗:", err);
    return [];
  }
}

// ─── 取得所有怪物（含快取） ───────────────────────────────────────────────────
async function getAllCombatMonsters(): Promise<CombatMonster[]> {
  const now = Date.now();
  if (monsterCache && (now - monsterCache.timestamp) < CACHE_TTL_MS) {
    return monsterCache.monsters;
  }

  const dbMonsters = await loadMonstersFromDb();
  if (dbMonsters.length > 0) {
    monsterCache = { monsters: dbMonsters, timestamp: now };
    return dbMonsters;
  }

  // Fallback: 使用靜態表，轉換為 CombatMonster
  const staticMonsters: CombatMonster[] = Object.values(MONSTER_MAP).map(m => ({
    ...m,
    dbSkills: [],
    aiLevel: m.isBoss ? 4 : 1,
    baseMp: calcMonsterBaseMp(m.level, m.isBoss ? "boss" : "common"),
    resistances: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    magicAttack: Math.floor(m.attack * 0.8),
  }));
  monsterCache = { monsters: staticMonsters, timestamp: now };
  return staticMonsters;
}

// ─── 依地圖節點取得怪物（替代原本的 getMonstersForNode） ──────────────────────
export async function getCombatMonstersForNode(
  nodeElement: WuXing,
  levelRange: [number, number]
): Promise<CombatMonster[]> {
  const allMonsters = await getAllCombatMonsters();
  const [minLv, maxLv] = levelRange;

  // 優先找同屬性且等級範圍內的怪物
  const primary = allMonsters.filter(m =>
    m.element === nodeElement &&
    m.level >= minLv && m.level <= maxLv &&
    !m.isBoss
  );
  if (primary.length > 0) return primary;

  // 找等級範圍內的所有非 Boss 怪物
  const secondary = allMonsters.filter(m =>
    m.level >= minLv && m.level <= maxLv &&
    !m.isBoss
  );
  if (secondary.length > 0) return secondary;

  // 最終 fallback：使用靜態表
  const staticMonsters = getStaticMonstersForNode(nodeElement, levelRange);
  return staticMonsters.map(m => ({
    ...m,
    dbSkills: [],
    aiLevel: 1,
    baseMp: calcMonsterBaseMp(m.level, "common"),
    resistances: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    magicAttack: Math.floor(m.attack * 0.8),
  }));
}

// ─── 依 ID 取得單隻怪物 ──────────────────────────────────────────────────────
export async function getCombatMonsterById(monsterId: string): Promise<CombatMonster | null> {
  const allMonsters = await getAllCombatMonsters();
  const found = allMonsters.find(m => m.id === monsterId);
  if (found) return found;

  // Fallback: 靜態表
  const staticMonster = MONSTER_MAP[monsterId];
  if (!staticMonster) return null;
  return {
    ...staticMonster,
    dbSkills: [],
    aiLevel: staticMonster.isBoss ? 4 : 1,
    baseMp: calcMonsterBaseMp(staticMonster.level, staticMonster.isBoss ? "boss" : "common"),
    resistances: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    magicAttack: Math.floor(staticMonster.attack * 0.8),
  };
}
