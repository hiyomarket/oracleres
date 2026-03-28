/**
 * ═══════════════════════════════════════════════════════════════
 * gameBattle Router — GD-020 戰鬥系統 API
 * ═══════════════════════════════════════════════════════════════
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameAgents, gamePlayerPets, gamePetCatalog, gameBattles, gameBattleParticipants, gameBattleCommands, gameBattleLogs, gameIdleSessions, agentInventory, gamePetBpHistory, gameLearnedQuestSkills, gameQuestSkillCatalog, gameItemCatalog, agentSkills, gameSkillCatalog, gamePetInnateSkills, gamePetLearnedSkills, roamingBossInstances, roamingBossCatalog, gameParties, gameMonsterCatalog, gameEquipmentCatalog } from "../../drizzle/schema";
import { sql, inArray } from "drizzle-orm";
import { eq, and, desc, isNull } from "drizzle-orm";
import { calcCharacterStatsV2 } from "../services/balanceFormulas";
import { getStatCaps, getStatBalanceConfig } from "../gameEngineConfig";
import { calcPetStats, calcPetStatsGD024, petSkillsToCombatFormat, DESTINY_SKILLS, DESTINY_AWAKENING_EFFECTS, checkDestinySkillLevelUp, calcPetBattleExp, levelUpBP, calcCaptureRate } from "../services/petEngine";
import {
  type BattleParticipant, type BattleMode, type BattleCommand, type BattleLogEntry,
  simulateBattle, aiDecideCommand, executeCommand, sortTurnOrder, processStatusEffects,
  isStunned, calcTotalPower, quickBattle, REWARD_MULTIPLIERS,
} from "../services/combatEngineV2";
import { MONSTERS, type Monster } from "../../shared/monsters";
import { getCombatMonsterById, type CombatMonster, type MonsterSkillData } from "../monsterDataService";
import { randomUUID } from "crypto";
import { getEngineConfig } from "../gameEngineConfig";
import { recordBossKill } from "../services/roamingBossEngine";
import { broadcastLiveFeed, broadcastBossKill } from "../liveFeedBroadcast";

// ─── 輔助函數 ───

/** 從角色數據建立戰鬥參與者 */
function buildCharacterParticipant(
  agent: any,
  id: number,
  equippedSkills: import("../services/combatEngineV2").CombatSkill[] = [],
  equipBonus: { hp: number; atk: number; def: number; spd: number; resistWood?: number; resistFire?: number; resistEarth?: number; resistMetal?: number; resistWater?: number } = { hp: 0, atk: 0, def: 0, spd: 0 },
): BattleParticipant {
  const wuxing = {
    wood: agent.wuxingWood ?? 0,
    fire: agent.wuxingFire ?? 0,
    earth: agent.wuxingEarth ?? 0,
    metal: agent.wuxingMetal ?? 0,
    water: agent.wuxingWater ?? 0,
  };
  const cfg = getStatBalanceConfig();
  const caps = getStatCaps();
  const rawStats = calcCharacterStatsV2(wuxing, agent.level ?? 1, cfg);
  const stats = {
    hp: Math.min(rawStats.hp + equipBonus.hp, caps.hp),
    mp: Math.min(rawStats.mp, caps.mp),
    atk: Math.min(rawStats.atk + equipBonus.atk, caps.atk),
    def: Math.min(rawStats.def + equipBonus.def, caps.def),
    spd: Math.min(rawStats.spd + equipBonus.spd, caps.spd),
    matk: Math.min(rawStats.matk, caps.matk),
    mdef: Math.min(rawStats.mdef, caps.mdef),
    healPower: rawStats.healPower,
    hitRate: rawStats.hitRate,
  };
  // 找出主導五行
  const elements = Object.entries(wuxing) as [string, number][];
  elements.sort((a, b) => b[1] - a[1]);
  const dominantElement = elements[0][1] > 0 ? elements[0][0] as any : "earth";

  return {
    id,
    type: "character",
    side: "ally",
    name: agent.name || "修行者",
    level: agent.level ?? 1,
    maxHp: stats.hp,
    currentHp: stats.hp,
    maxMp: stats.mp,
    currentMp: stats.mp,
    attack: stats.atk,
    defense: stats.def,
    magicAttack: stats.matk,
    magicDefense: stats.mdef,
    speed: stats.spd,
    dominantElement,
    skills: equippedSkills, // 從已裝備的天命技能轉換
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    agentId: agent.id,
    // 五行抗性（注靈自動計算 + 裝備加成，上限 100）
    resistWood:  Math.min((agent.resistWood  ?? 0) + (equipBonus.resistWood  ?? 0), 100),
    resistFire:  Math.min((agent.resistFire  ?? 0) + (equipBonus.resistFire  ?? 0), 100),
    resistEarth: Math.min((agent.resistEarth ?? 0) + (equipBonus.resistEarth ?? 0), 100),
    resistMetal: Math.min((agent.resistMetal ?? 0) + (equipBonus.resistMetal ?? 0), 100),
    resistWater: Math.min((agent.resistWater ?? 0) + (equipBonus.resistWater ?? 0), 100),
  };
}

/** 從寵物數據建立戰鬥參與者（GD-024: 繼承主人屬性） */
function buildPetParticipant(
  pet: any,
  catalog: any,
  id: number,
  ownerStats?: { hp: number; atk: number; def: number; spd: number; matk?: number; mp?: number },
): BattleParticipant {
  const bp = {
    constitution: pet.bpConstitution ?? 0,
    strength: pet.bpStrength ?? 0,
    defense: pet.bpDefense ?? 0,
    agility: pet.bpAgility ?? 0,
    magic: pet.bpMagic ?? 0,
  };
  const raceHpMul = catalog?.race ? (({ dragon: 1.3, undead: 1.2, normal: 1.0, flying: 1.0, insect: 0.9, plant: 0.8 } as any)[catalog.race] ?? 1.0) : 1.0;
  // GD-024: 如果有主人數值，使用繼承公式；否則回退到舊 BP 公式
  const stats = ownerStats
    ? calcPetStatsGD024(ownerStats, pet.level ?? 1, bp, raceHpMul)
    : calcPetStats(bp, pet.level ?? 1, raceHpMul);
  const rawSkills = petSkillsToCombatFormat(
    pet.innateSkills ?? [],
    pet.destinySkills ?? [],
  );
  const skills: import("../services/combatEngineV2").CombatSkill[] = rawSkills.map(s => ({
    ...s,
    cooldown: s.cooldown ?? 0,
    currentCooldown: 0,
  }));

  return {
    id,
    type: "pet",
    side: "ally",
    name: pet.nickname || catalog?.name || "靈寵",
    level: pet.level ?? 1,
    maxHp: stats.hp,
    currentHp: stats.hp,
    maxMp: stats.mp,
    currentMp: stats.mp,
    attack: stats.attack,
    defense: stats.defense,
    magicAttack: stats.magicAttack,
    magicDefense: (stats as any).mdef ?? Math.floor(stats.defense * 0.6),
    speed: stats.speed,
    dominantElement: (catalog?.wuxing || pet.dominantElement || "earth") as any,
    race: catalog?.race,
    skills,
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    petId: pet.id,
    destinySkillUsage: {},
  };
}

/** 從怪物數據建立戰鬥參與者 */
function buildMonsterParticipant(
  monster: CombatMonster | Monster,
  id: number,
  levelOverride?: number,
): BattleParticipant {
  const level = levelOverride ?? monster.level;
  const levelScale = level / Math.max(1, monster.level);
  const cm = monster as CombatMonster;

  // 將怪物技能轉換為 CombatSkill 格式
  const skills = (cm.dbSkills ?? []).map((s: MonsterSkillData) => ({
    id: s.id,
    name: s.name,
    skillType: s.skillType,
    damageMultiplier: s.powerPercent / 100,
    mpCost: s.mpCost,
    wuxing: s.wuxing,
    cooldown: s.cooldown ?? 0,
    currentCooldown: 0,
    damageType: (s as any).damageType ?? "single",
    additionalEffect: s.additionalEffect ? {
      type: s.additionalEffect.type,
      chance: s.additionalEffect.chance,
      duration: s.additionalEffect.duration,
      value: s.additionalEffect.value,
    } : undefined,
  }));

  return {
    id,
    type: "monster",
    side: "enemy",
    name: monster.name,
    level,
    maxHp: Math.floor(monster.hp * levelScale),
    currentHp: Math.floor(monster.hp * levelScale),
    maxMp: cm.baseMp ?? Math.floor(30 + level * 2),
    currentMp: cm.baseMp ?? Math.floor(30 + level * 2),
    attack: Math.floor(monster.attack * levelScale),
    defense: Math.floor(monster.defense * levelScale),
    magicAttack: cm.magicAttack ?? Math.floor(monster.attack * 0.8 * levelScale),
    magicDefense: Math.floor(monster.defense * 0.6 * levelScale),
    speed: Math.floor(monster.speed * levelScale),
    dominantElement: monster.element as any,
    race: (monster as any).race,
    monsterId: monster.id,
    skills,
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    // 怪物的五行抗性（從圖鑑讀取）
    resistWood:  (cm as any).resistWood  ?? 0,
    resistFire:  (cm as any).resistFire  ?? 0,
    resistEarth: (cm as any).resistEarth ?? 0,
    resistMetal: (cm as any).resistMetal ?? 0,
    resistWater: (cm as any).resistWater ?? 0,
    // Boss 多次行動
    actionsPerTurn: (cm as any).actionsPerTurn ?? 1,
  };
}

export const gameBattleRouter = router({
  // ═══════════════════════════════════════════════════════════════
  // 開始新戰鬥（玩家模式）
  // ═══════════════════════════════════════════════════════════════
  startBattle: protectedProcedure
    .input(z.object({
      mode: z.enum(["player_closed", "player_open", "map_mob", "boss"]),
      monsterId: z.string(),
      monsterLevelOverride: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // 取得角色
      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 取得出戰寵物
      const [activePet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.agentId, agent.id), eq(gamePlayerPets.isActive, 1)));
      let petCatalog: any = null;
      if (activePet) {
        const [cat] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, activePet.petCatalogId));
        petCatalog = cat;

        // ─── 載入寵物先天技能 ───
        const innateSkills = await db.select().from(gamePetInnateSkills)
          .where(eq(gamePetInnateSkills.petCatalogId, activePet.petCatalogId));
        (activePet as any).innateSkills = innateSkills.map(s => ({
          id: s.id,
          name: s.name,
          skillType: s.skillType,
          damageMultiplier: (s.powerPercent ?? 100) / 100,
          mpCost: s.mpCost ?? 0,
          wuxing: s.wuxing ?? undefined,
          cooldown: s.cooldown ?? 3,
          description: s.description,
        }));

        // ─── 載入寵物天命技能（已學習的） ───
        const learnedDestinySkills = await db.select().from(gamePetLearnedSkills)
          .where(eq(gamePetLearnedSkills.playerPetId, activePet.id));
        (activePet as any).destinySkills = learnedDestinySkills.map(s => ({
          id: `destiny_${s.skillKey}`,
          name: s.skillName,
          skillType: s.skillType as any ?? "special",
          damageMultiplier: (s.powerPercent ?? 100) / 100,
          mpCost: s.mpCost ?? 10,
          cooldown: s.cooldown ?? 4,
          skillLevel: s.skillLevel ?? 1,
          destinySkillKey: s.skillKey,
          wuxing: s.wuxing ?? undefined,
        }));
      }

      // 取得怪物
      // ─── 特殊處理：移動式 Boss（monsterId 格式為 "boss_{instanceId}"） ───
      let combatMonster: CombatMonster;
      if (input.monsterId.startsWith("boss_")) {
        const instanceId = parseInt(input.monsterId.replace("boss_", ""), 10);
        if (isNaN(instanceId)) throw new TRPCError({ code: "BAD_REQUEST", message: "無效的 Boss 實例 ID" });
        const [bossInst] = await db.select().from(roamingBossInstances)
          .where(and(eq(roamingBossInstances.id, instanceId), eq(roamingBossInstances.status, "active")));
        if (!bossInst) throw new TRPCError({ code: "NOT_FOUND", message: "Boss 已離開或已被擊敗" });
        const [bossCat] = await db.select().from(roamingBossCatalog)
          .where(eq(roamingBossCatalog.id, bossInst.catalogId));
        if (!bossCat) throw new TRPCError({ code: "NOT_FOUND", message: "Boss 圖鑑資料不存在" });
        // 將 Boss 圖鑑轉換為 CombatMonster 格式
        const WUXING_ZH_TO_EN: Record<string, string> = {
          "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
          "wood": "wood", "fire": "fire", "earth": "earth", "metal": "metal", "water": "water",
        };
        const bossElement = WUXING_ZH_TO_EN[bossCat.wuxing] ?? "earth";
        const currentHp = bossInst.currentHp === -1 ? bossCat.baseHp : bossInst.currentHp;
        combatMonster = {
          id: input.monsterId,
          name: `${bossCat.title ? bossCat.title + " " : ""}${bossCat.name}`,
          element: bossElement as any,
          level: bossCat.level,
          hp: currentHp,
          attack: bossCat.baseAttack,
          defense: bossCat.baseDefense,
          speed: bossCat.baseSpeed,
          expReward: Math.round(bossCat.level * 8 * bossCat.expMultiplier),
          goldReward: [bossCat.level * 3, bossCat.level * 8],
          dropItems: [],
          skills: ["普通攻擊"],
          description: bossCat.description ?? "",
          isBoss: true,
          dbSkills: [],
          aiLevel: 4,
          baseMp: bossCat.baseMP ?? Math.floor((30 + bossCat.level * 2) * 2.0),
          resistances: {
            wood:  bossCat.resistWood  ?? 0,
            fire:  bossCat.resistFire  ?? 0,
            earth: bossCat.resistEarth ?? 0,
            metal: bossCat.resistMetal ?? 0,
            water: bossCat.resistWater ?? 0,
          },
          magicAttack: Math.floor(bossCat.baseAttack * 0.9),
        };
      } else {
        const monster = await getCombatMonsterById(input.monsterId);
        if (!monster) {
          const staticMonster = MONSTERS.find(m => m.id === input.monsterId);
          if (!staticMonster) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });
          combatMonster = {
            ...staticMonster,
            dbSkills: [],
            aiLevel: staticMonster.isBoss ? 4 : 1,
            baseMp: Math.floor(30 + staticMonster.level * 2),
            resistances: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
            magicAttack: Math.floor(staticMonster.attack * 0.8),
          };
        } else {
          combatMonster = monster;
        }
      }

      // 建立參與者
      const participants: BattleParticipant[] = [];
      let nextId = 1;

      // ─── 讀取角色已裝備的一般技能（agentSkills） ───
      const equippedAgentSkills = await db.select({
        skillId: agentSkills.skillId,
        awakeTier: agentSkills.awakeTier,
        installedSlot: agentSkills.installedSlot,
      }).from(agentSkills).where(
        and(eq(agentSkills.agentId, agent.id), sql`${agentSkills.installedSlot} IS NOT NULL AND ${agentSkills.installedSlot} LIKE 'skillSlot%'`)
      );
      const agentSkillIds = equippedAgentSkills.map(s => s.skillId);
      let normalCombatSkills: import("../services/combatEngineV2").CombatSkill[] = [];
      if (agentSkillIds.length > 0) {
        const skillData = await db.select({
          skillId: gameSkillCatalog.skillId,
          name: gameSkillCatalog.name,
          category: gameSkillCatalog.category,
          skillType: gameSkillCatalog.skillType,
          wuxing: gameSkillCatalog.wuxing,
          mpCost: gameSkillCatalog.mpCost,
          cooldown: gameSkillCatalog.cooldown,
          powerPercent: gameSkillCatalog.powerPercent,
          damageType: gameSkillCatalog.damageType,
        }).from(gameSkillCatalog).where(inArray(gameSkillCatalog.skillId, agentSkillIds));
        normalCombatSkills = skillData.map(sk => {
          const equipped = equippedAgentSkills.find(e => e.skillId === sk.skillId);
          const mappedType = sk.skillType === "heal" ? "heal" :
            sk.skillType === "buff" ? "buff" :
            sk.skillType === "debuff" ? "buff" :
            sk.skillType === "passive" ? "buff" : "attack";
          return {
            id: `skill_${sk.skillId}`,
            name: sk.name,
            skillType: mappedType as any,
            damageMultiplier: (sk.powerPercent ?? 100) / 100,
            mpCost: sk.mpCost ?? 0,
            wuxing: sk.wuxing === "無" ? undefined : sk.wuxing ?? undefined,
            cooldown: sk.cooldown ?? 3,
            currentCooldown: 0,
            skillLevel: (equipped?.awakeTier ?? 0) + 1,
            damageType: (sk.damageType ?? "single") as "single" | "aoe",
          };
        });
      }

      // ─── 讀取已裝備的天命技能（gameLearnedQuestSkills） ───
      const equippedQuestSkills = await db.select({
        skillId: gameLearnedQuestSkills.skillId,
        level: gameLearnedQuestSkills.level,
      }).from(gameLearnedQuestSkills).where(
        and(eq(gameLearnedQuestSkills.agentId, agent.id), eq(gameLearnedQuestSkills.isEquipped, 1))
      );
      const questSkillIds = equippedQuestSkills.map(s => s.skillId);
      let questCombatSkills: import("../services/combatEngineV2").CombatSkill[] = [];
      if (questSkillIds.length > 0) {
        const questSkillData = await db.select({
          id: gameQuestSkillCatalog.id,
          name: gameQuestSkillCatalog.name,
          skillType: gameQuestSkillCatalog.skillType,
          powerPercent: gameQuestSkillCatalog.powerPercent,
          mpCost: gameQuestSkillCatalog.mpCost,
          cooldown: gameQuestSkillCatalog.cooldown,
          wuxing: gameQuestSkillCatalog.wuxing,
          additionalEffect: gameQuestSkillCatalog.additionalEffect,
        }).from(gameQuestSkillCatalog).where(inArray(gameQuestSkillCatalog.id, questSkillIds));
        questCombatSkills = questSkillData.map(qs => {
          const learned = equippedQuestSkills.find(e => e.skillId === qs.id);
          const mappedType = qs.skillType === "heal" ? "heal" :
            qs.skillType === "buff" ? "buff" :
            qs.skillType === "utility" ? "buff" : "attack";
          return {
            id: `quest_${qs.id}`,
            name: qs.name,
            skillType: mappedType,
            damageMultiplier: (qs.powerPercent ?? 100) / 100,
            mpCost: qs.mpCost ?? 0,
            wuxing: qs.wuxing ?? undefined,
            cooldown: qs.cooldown ?? 3,
            currentCooldown: 0,
            additionalEffect: qs.additionalEffect as any ?? undefined,
            skillLevel: learned?.level ?? 1,
          };
        });
      }

      // ─── 合併所有技能 ───
      const charCombatSkills = [...normalCombatSkills, ...questCombatSkills];

      // ─── 計算裝備加成 ───
      const equipBonus = { hp: 0, atk: 0, def: 0, spd: 0, resistWood: 0, resistFire: 0, resistEarth: 0, resistMetal: 0, resistWater: 0 };
      const equippedIds = [
        agent.equippedWeapon, agent.equippedOffhand, agent.equippedHead,
        agent.equippedBody, agent.equippedHands, agent.equippedFeet,
        agent.equippedRingA, agent.equippedRingB, agent.equippedNecklace, agent.equippedAmulet,
      ].filter(Boolean) as string[];
      if (equippedIds.length > 0) {
        const equips = await db.select().from(gameEquipmentCatalog).where(inArray(gameEquipmentCatalog.equipId, equippedIds));
        for (const eq of equips) {
          equipBonus.hp  += eq.hpBonus       ?? 0;
          equipBonus.atk += eq.attackBonus   ?? 0;
          equipBonus.def += eq.defenseBonus  ?? 0;
          equipBonus.spd += eq.speedBonus    ?? 0;
          // 五行抗性加成（從 resistBonus JSON 欄位解析）
          const rb = (eq.resistBonus as any) ?? {};
          equipBonus.resistWood  += rb.wood  ?? 0;
          equipBonus.resistFire  += rb.fire  ?? 0;
          equipBonus.resistEarth += rb.earth ?? 0;
          equipBonus.resistMetal += rb.metal ?? 0;
          equipBonus.resistWater += rb.water ?? 0;
        }
      }

      const charParticipant = buildCharacterParticipant(agent, nextId++, charCombatSkills, equipBonus);
      participants.push(charParticipant);

      if (activePet && petCatalog) {
        // GD-024: 傳入主人數值讓寵物繼承
        const ownerStats = { hp: charParticipant.maxHp, atk: charParticipant.attack, def: charParticipant.defense, spd: charParticipant.speed, matk: charParticipant.magicAttack, mp: charParticipant.maxMp };
        const petParticipant = buildPetParticipant(activePet, petCatalog, nextId++, ownerStats);
        participants.push(petParticipant);
      }

      // ─── 普通戰鬥（非 Boss）隨機生成 1-3 隻怪 ───
      const isBossMode = input.monsterId.startsWith("boss_");
      const monsterCount = isBossMode ? 1 : Math.floor(Math.random() * 3) + 1; // 1-3 隻
      for (let mi = 0; mi < monsterCount; mi++) {
        const monsterParticipant = buildMonsterParticipant(
          combatMonster as any, nextId++, input.monsterLevelOverride,
        );
        // 多隻怪時稍微調整名稱區分
        if (monsterCount > 1 && mi > 0) monsterParticipant.name = `${combatMonster.name} (${mi + 1})`;
        participants.push(monsterParticipant);
      }

      // ─── Boss 護衛小兵生成 ───
      if (isBossMode) {
        const instanceId2 = parseInt(input.monsterId.replace("boss_", ""), 10);
        if (!isNaN(instanceId2)) {
          const [bossInst2] = await db.select().from(roamingBossInstances)
            .where(eq(roamingBossInstances.id, instanceId2));
          if (bossInst2) {
            const [bossCat2] = await db.select().from(roamingBossCatalog)
              .where(eq(roamingBossCatalog.id, bossInst2.catalogId));
            const minionIds: string[] = (bossCat2?.minionIds as string[] | null) ?? [];
            // 最多生成 2 隻護衛小兵
            const minionSlots = minionIds.slice(0, 2);
            for (const minionId of minionSlots) {
              const minionData = await getCombatMonsterById(minionId);
              if (minionData) {
                const minionParticipant = buildMonsterParticipant(minionData, nextId++);
                minionParticipant.name = `護衛 ${minionData.name}`;
                participants.push(minionParticipant);
              }
            }
          }
        }
      }

      // 建立戰鬥記錄
      const battleId = randomUUID();
      const now = Date.now();
      const rewardMult = REWARD_MULTIPLIERS[input.mode as BattleMode] ?? 1.0;

      await db.insert(gameBattles).values({
        battleId,
        mode: input.mode,
        state: "waiting",
        currentRound: 0,
        maxRounds: 20,
        currentTurnIndex: 0,
        turnOrder: [],
        rewardMultiplier: rewardMult,
        initiatorAgentId: agent.id,
        nodeId: agent.currentNodeId,
        createdAt: now,
        updatedAt: now,
      });

      // 取得戰鬥 DB ID
      const [battleRow] = await db.select().from(gameBattles).where(eq(gameBattles.battleId, battleId));

      // 儲存參與者快照
      for (const p of participants) {
        await db.insert(gameBattleParticipants).values({
          battleId: battleRow.id,
          participantType: p.type,
          side: p.side,
          agentId: p.agentId ?? null,
          petId: (p.petId ?? null) as any,
          monsterId: (p.monsterId ?? null) as any,
          displayName: p.name,
          level: p.level,
          maxHp: p.maxHp,
          currentHp: p.currentHp,
          maxMp: p.maxMp,
          currentMp: p.currentMp,
          attack: p.attack,
          defense: p.defense,
          magicAttack: p.magicAttack,
          magicDefense: p.magicDefense,
          speed: p.speed,
          dominantElement: p.dominantElement,
          race: p.race ?? null,
          equippedSkills: p.skills as any,
          isDefending: 0,
          isDefeated: 0,
          speedScore: 0,
          skillCooldowns: {} as any,
          activeBuffs: [] as any,
          actionsPerTurn: p.actionsPerTurn ?? 1,
        });
      }

      // ─── 全服公告：Boss 挑戰廣播 ───
      if (isBossMode) {
        try {
          const bossParticipant = participants.find(p => p.side === "enemy");
          const playerParticipant = participants.find(p => p.type === "character");
          if (bossParticipant && playerParticipant) {
            broadcastLiveFeed({
              feedType: "world_event",
              agentName: playerParticipant.name,
              agentElement: (playerParticipant.dominantElement as string) || "earth",
              agentLevel: playerParticipant.level,
              detail: `向 ${bossParticipant.name} 發起挑戰！`,
              icon: "⚔️",
              targetPath: "/game",
            });
          }
        } catch { /* 廣播失敗不影響戰鬥 */ }
      }
      return {
        battleId,
        battleDbId: battleRow.id,
        participants: participants.map(p => ({
          id: p.id,
          type: p.type,
          side: p.side,
          name: p.name,
          level: p.level,
          maxHp: p.maxHp,
          currentHp: p.currentHp,
          maxMp: p.maxMp,
          currentMp: p.currentMp,
          attack: p.attack,
          defense: p.defense,
          speed: p.speed,
          dominantElement: p.dominantElement,
          skills: p.skills.map(s => ({ id: s.id, name: s.name, mpCost: s.mpCost, cooldown: s.cooldown })),
        })),
        mode: input.mode,
        rewardMultiplier: rewardMult,
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 快速模擬戰鬥（掛機模式 / 自動戰鬥）
  // ═══════════════════════════════════════════════════════════════
  simulateBattle: protectedProcedure
    .input(z.object({
      monsterId: z.string(),
      mode: z.enum(["idle", "player_closed", "player_open"]).default("idle"),
      monsterLevelOverride: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      // 取得出戰寵物
      const [activePet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.agentId, agent.id), eq(gamePlayerPets.isActive, 1)));
      let petCatalog: any = null;
      if (activePet) {
        const [cat] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, activePet.petCatalogId));
        petCatalog = cat;

        // 載入寵物先天技能
        const innateSkills = await db.select().from(gamePetInnateSkills)
          .where(eq(gamePetInnateSkills.petCatalogId, activePet.petCatalogId));
        (activePet as any).innateSkills = innateSkills.map(s => ({
          id: s.id, name: s.name, skillType: s.skillType,
          damageMultiplier: (s.powerPercent ?? 100) / 100,
          mpCost: s.mpCost ?? 0, wuxing: s.wuxing ?? undefined,
          cooldown: s.cooldown ?? 3, description: s.description,
        }));

        // 載入寵物天命技能
        const learnedDestinySkills = await db.select().from(gamePetLearnedSkills)
          .where(eq(gamePetLearnedSkills.playerPetId, activePet.id));
        (activePet as any).destinySkills = learnedDestinySkills.map(s => ({
          id: `destiny_${s.skillKey}`, name: s.skillName,
          skillType: s.skillType as any ?? "special",
          damageMultiplier: (s.powerPercent ?? 100) / 100,
          mpCost: s.mpCost ?? 10, cooldown: s.cooldown ?? 4,
          skillLevel: s.skillLevel ?? 1, destinySkillKey: s.skillKey,
          wuxing: s.wuxing ?? undefined,
        }));
      }

      // 取得怪物
      const combatMonster = await getCombatMonsterById(input.monsterId);
      const staticMonster = MONSTERS.find(m => m.id === input.monsterId);
      const monsterData = combatMonster || staticMonster;
      if (!monsterData) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });

      // ─── 計算裝備加成 ───
      const simEquipBonus = { hp: 0, atk: 0, def: 0, spd: 0 };
      const simEquippedIds = [
        agent.equippedWeapon, agent.equippedOffhand, agent.equippedHead,
        agent.equippedBody, agent.equippedHands, agent.equippedFeet,
        agent.equippedRingA, agent.equippedRingB, agent.equippedNecklace, agent.equippedAmulet,
      ].filter(Boolean) as string[];
      if (simEquippedIds.length > 0) {
        const simEquips = await db.select().from(gameEquipmentCatalog).where(inArray(gameEquipmentCatalog.equipId, simEquippedIds));
        for (const eq of simEquips) {
          simEquipBonus.hp  += eq.hpBonus       ?? 0;
          simEquipBonus.atk += eq.attackBonus   ?? 0;
          simEquipBonus.def += eq.defenseBonus  ?? 0;
          simEquipBonus.spd += eq.speedBonus    ?? 0;
        }
      }

      // 建立參與者
      const participants: BattleParticipant[] = [];
      let nextId = 1;
      const charP = buildCharacterParticipant(agent, nextId++, [], simEquipBonus);
      participants.push(charP);
      if (activePet && petCatalog) {
        const ownerStats2 = { hp: charP.maxHp, atk: charP.attack, def: charP.defense, spd: charP.speed, matk: charP.magicAttack, mp: charP.maxMp };
        participants.push(buildPetParticipant(activePet, petCatalog, nextId++, ownerStats2));
      }
      participants.push(buildMonsterParticipant(monsterData as any, nextId++, input.monsterLevelOverride));

      // 執行模擬
      const result = simulateBattle(participants, input.mode as BattleMode);

      // 計算獎勵
      const baseMonster = staticMonster || monsterData as Monster;
      const expReward = Math.floor(baseMonster.expReward * result.rewardMultiplier);
      const goldMin = baseMonster.goldReward[0];
      const goldMax = baseMonster.goldReward[1];
      const goldReward = Math.floor((goldMin + Math.random() * (goldMax - goldMin)) * result.rewardMultiplier);

      // 掉落物
      const drops: string[] = [];
      if (result.result === "win") {
        for (const drop of baseMonster.dropItems) {
          if (Math.random() < drop.chance * result.rewardMultiplier) {
            drops.push(drop.itemId);
          }
        }
      }

      // 寵物經驗
      let petExpGained = 0;
      if (activePet && result.result === "win") {
        petExpGained = calcPetBattleExp(baseMonster.expReward, activePet.level, baseMonster.level);
        petExpGained = Math.floor(petExpGained * result.rewardMultiplier);
      }

      return {
        result: result.result,
        rounds: result.rounds,
        logs: result.logs.slice(-30), // 只返回最後 30 條日誌
        expReward: result.result === "win" ? expReward : 0,
        goldReward: result.result === "win" ? goldReward : 0,
        drops,
        petExpGained,
        petDestinySkillUsage: result.petDestinySkillUsage,
        monsterHpPercent: result.monsterHpPercent,
        rewardMultiplier: result.rewardMultiplier,
        monsterName: baseMonster.name,
        monsterLevel: baseMonster.level,
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 提交戰鬥指令（玩家模式回合制）
  // ═══════════════════════════════════════════════════════════════
  submitCommand: protectedProcedure
    .input(z.object({
      battleId: z.string(),
      commands: z.array(z.object({
        participantId: z.number(),
        commandType: z.enum(["attack", "skill", "defend", "item", "flee", "surrender", "capture"]),
        targetId: z.number().optional(),
        skillId: z.string().optional(),
        itemId: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // 取得戰鬥
      const [battle] = await db.select().from(gameBattles).where(eq(gameBattles.battleId, input.battleId));
      if (!battle) throw new TRPCError({ code: "NOT_FOUND", message: "戰鬥不存在" });
      if (battle.state === "ended") throw new TRPCError({ code: "BAD_REQUEST", message: "戰鬥已結束" });

      // 取得參與者
      const dbParticipants = await db.select().from(gameBattleParticipants)
        .where(eq(gameBattleParticipants.battleId, battle.id));

      // 重建 BattleParticipant 陣列
      const participants: BattleParticipant[] = dbParticipants.map(p => ({
        id: p.id,
        type: p.participantType as any,
        side: p.side as any,
        name: p.displayName,
        level: p.level,
        maxHp: p.maxHp,
        currentHp: p.currentHp,
        maxMp: p.maxMp,
        currentMp: p.currentMp,
        attack: p.attack,
        defense: p.defense,
        magicAttack: p.magicAttack,
        magicDefense: p.magicDefense,
        speed: p.speed,
        dominantElement: p.dominantElement as any,
        race: p.race ?? undefined,
        skills: (p.equippedSkills ?? []) as any,
        isDefending: p.isDefending === 1,
        isDefeated: p.isDefeated === 1,
        speedScore: p.speedScore,
        statusEffects: (p.activeBuffs ?? []) as any,
        agentId: p.agentId ?? undefined,
        petId: p.petId ?? undefined,
        monsterId: p.monsterId ?? undefined,
        destinySkillUsage: p.participantType === "pet" ? {} : undefined,
        actionsPerTurn: (p as any).actionsPerTurn ?? 1,
      }));

      const round = battle.currentRound + 1;
      const allLogs: BattleLogEntry[] = [];

      // 速度排序
      const turnOrder = sortTurnOrder(participants);

      // 執行所有行動
      for (const pid of turnOrder) {
        const actor = participants.find(p => p.id === pid);
        if (!actor || actor.isDefeated) continue;

        // 處理狀態效果
        const statusLogs = processStatusEffects(actor, round);
        allLogs.push(...statusLogs);
        if (actor.isDefeated) continue;

        if (isStunned(actor)) {
          allLogs.push({
            round, actorId: actor.id, actorName: actor.name,
            logType: "buff", value: 0, isCritical: false,
            message: `${actor.name}處於控制狀態，無法行動`,
          });
          continue;
        }

        actor.isDefending = false;

        // 找到玩家提交的指令或使用 AI
        let command: BattleCommand;
        const playerCmd = input.commands.find(c => c.participantId === pid);
        if (playerCmd && actor.side === "ally") {
          command = playerCmd as BattleCommand;

          // ─── 捕捉魔物：查詢捕捉道具和目標魔物圖鑑 ───
          if (command.commandType === "capture" && command.itemId && command.targetId) {
            try {
              // 查詢捕捉道具
              const [captureItem] = await db.select({
                name: gameItemCatalog.name,
                useEffect: gameItemCatalog.useEffect,
                category: gameItemCatalog.category,
              }).from(gameItemCatalog).where(eq(gameItemCatalog.itemId, command.itemId)).limit(1);

              // 找到目標魔物的參與者
              const targetP = participants.find(p => p.id === command.targetId && p.side === "enemy" && !p.isDefeated);
              if (!targetP || !targetP.monsterId) {
                command.commandType = "attack" as any; // fallback
              } else {
                // ★ 新捕捉邏輯：先查 gamePetCatalog，沒有就查 gameMonsterCatalog
                let baseCaptureRate = 25;
                let petCatalogId: number | null = null;
                let monsterCatalogId: string | null = null;
                let captureSource: "pet_catalog" | "monster_catalog" = "monster_catalog";

                // 1. 先查寵物圖鑑
                const petCatalogs = await db.select().from(gamePetCatalog)
                  .where(eq(gamePetCatalog.sourceMonsterKey, targetP.monsterId))
                  .limit(1);
                const petCat = petCatalogs[0];

                if (petCat) {
                  baseCaptureRate = petCat.baseCaptureRate;
                  petCatalogId = petCat.id;
                  captureSource = "pet_catalog";
                } else {
                  // 2. 查魔物圖鑑
                  const [monCat] = await db.select().from(gameMonsterCatalog)
                    .where(eq(gameMonsterCatalog.monsterId, targetP.monsterId))
                    .limit(1);
                  if (monCat && monCat.isCapturable) {
                    baseCaptureRate = monCat.baseCaptureRate;
                    monsterCatalogId = monCat.monsterId;
                    captureSource = "monster_catalog";
                  } else {
                    // 此魔物不可捕捉（boss 或未設定）
                    command.commandType = "attack" as any;
                  }
                }

                if (command.commandType === "capture") {
                  // 計算捕捉機率
                  const agentP = dbParticipants.find(dp => dp.participantType === "character");
                  const agentRow = agentP?.agentId ? await db.select().from(gameAgents).where(eq(gameAgents.id, agentP.agentId)).limit(1).then(r => r[0]) : null;
                  const captureItemType = (captureItem?.useEffect as any)?.captureType ?? "normal";
                  const rate = calcCaptureRate({
                    baseCaptureRate,
                    monsterCurrentHp: targetP.currentHp,
                    monsterMaxHp: targetP.maxHp,
                    monsterLevel: targetP.level,
                    playerLevel: agentRow?.level ?? 1,
                    captureItemType,
                  });

                  command.captureInfo = {
                    captureRate: rate,
                    captureItemName: captureItem?.name ?? "捕捉道具",
                    targetMonsterName: targetP.name,
                    petCatalogId,
                    monsterCatalogId,
                    captureSource,
                  };

                  // 扣除捕捉道具
                  if (agentP?.agentId) {
                    const [inv] = await db.select().from(agentInventory)
                      .where(and(
                        eq(agentInventory.agentId, agentP.agentId),
                        eq(agentInventory.itemId, command.itemId),
                        sql`${agentInventory.quantity} > 0`,
                      )).limit(1);
                    if (inv) {
                      await db.update(agentInventory).set({
                        quantity: Math.max(0, inv.quantity - 1),
                        updatedAt: Date.now(),
                      }).where(eq(agentInventory.id, inv.id));
                    }
                  }
                }
              }
            } catch (e) {
              console.error("[Battle] capture lookup error:", e);
              command.commandType = "attack" as any; // fallback
            }
          }

          // ─── 道具使用：查詢效果並扣除背包 ───
          if (command.commandType === "item" && command.itemId) {
            try {
              const [itemRow] = await db.select({
                name: gameItemCatalog.name,
                useEffect: gameItemCatalog.useEffect,
              }).from(gameItemCatalog).where(eq(gameItemCatalog.itemId, command.itemId)).limit(1);

              if (itemRow?.useEffect) {
                const eff = itemRow.useEffect as { type: string; value: number; duration?: number; description: string };
                command.itemEffect = {
                  type: eff.type,
                  value: eff.value,
                  duration: eff.duration,
                  itemName: itemRow.name,
                };
              } else {
                command.itemEffect = {
                  type: "heal_hp",
                  value: 30,
                  itemName: itemRow?.name ?? "未知道具",
                };
              }

              // 扣除背包數量
              const agentP = dbParticipants.find(dp => dp.participantType === "character");
              if (agentP?.agentId) {
                const [inv] = await db.select().from(agentInventory)
                  .where(and(
                    eq(agentInventory.agentId, agentP.agentId),
                    eq(agentInventory.itemId, command.itemId),
                    sql`${agentInventory.quantity} > 0`,
                  )).limit(1);
                if (inv) {
                  await db.update(agentInventory).set({
                    quantity: Math.max(0, inv.quantity - 1),
                    updatedAt: Date.now(),
                  }).where(eq(agentInventory.id, inv.id));
                }
              }
            } catch (e) {
              console.error("[Battle] item lookup error:", e);
            }
          }
        } else {
          const allies = participants.filter(p => p.side === actor.side);
          const enemies = participants.filter(p => p.side !== actor.side);
          // Boss 多次行動：根據 actionsPerTurn 執行多次
          const numActions = actor.side === "enemy" ? Math.max(1, actor.actionsPerTurn ?? 1) : 1;
          for (let actionIdx = 0; actionIdx < numActions; actionIdx++) {
            const enemiesNow = participants.filter(p => p.side !== actor.side && !p.isDefeated);
            if (enemiesNow.length === 0 || actor.isDefeated) break;
            command = aiDecideCommand(actor, allies, enemies, round);
            await db.insert(gameBattleCommands).values({
              battleId: battle.id,
              round,
              participantId: pid,
              commandType: command.commandType as any,
              targetId: command.targetId ?? null,
              skillId: command.skillId ?? null,
              itemId: command.itemId ?? null,
              isAutoDecision: 1,
              createdAt: Date.now(),
            });
            const actionLogs = executeCommand(command, participants, round);
            allLogs.push(...actionLogs);
          }
        }

        // 玩家指令：儲存並執行
        let cmdLogs: any[] = [];
        if (playerCmd && actor.side === "ally") {
          await db.insert(gameBattleCommands).values({
            battleId: battle.id,
            round,
            participantId: pid,
            commandType: command.commandType as any,
            targetId: command.targetId ?? null,
            skillId: command.skillId ?? null,
            itemId: command.itemId ?? null,
            isAutoDecision: 0,
            createdAt: Date.now(),
          });
          cmdLogs = executeCommand(command, participants, round);
          allLogs.push(...cmdLogs);
        }

        // 檢查逃跑
        if (command.commandType === "flee" || command.commandType === "surrender") {
          const fleeLog = cmdLogs.find(l => l.logType === "flee");
          if (fleeLog?.value === 1) {
            await db.update(gameBattles).set({
              state: "ended",
              currentRound: round,
              result: "flee",
              updatedAt: Date.now(),
              endedAt: Date.now(),
            }).where(eq(gameBattles.id, battle.id));

            return { state: "ended", result: "flee", round, logs: allLogs };
          }
        }

        // 檢查捕捉成功
        if (command.commandType === "capture") {
          const captureLog = cmdLogs.find(l => l.logType === "capture" && l.value === 1);
          const cInfo = command.captureInfo;
          if (captureLog && cInfo && (cInfo.petCatalogId || cInfo.monsterCatalogId)) {
            // 捕捉成功！創建寵物
            try {
              const agentP = dbParticipants.find(dp => dp.participantType === "character");
              if (agentP?.agentId) {
                // ─── 捕捉個體差異機制 ───
                const targetMonster = participants.find(p => p.monsterId && p.side === "enemy");
                const monsterBP = (targetMonster as any)?.individualBP;
                const monsterLevel = targetMonster?.level ?? 1;

                // 20% 機率回到 1 等（「重生」機制）
                const isReborn = Math.random() < 0.2;
                const capturedLevel = isReborn ? 1 : monsterLevel;

                let petCatalogId: number;
                let petName: string;
                let petGrowthType: string;
                let bpCon: number, bpStr: number, bpDef2: number, bpAgi: number, bpMag: number;

                if (cInfo.captureSource === "pet_catalog" && cInfo.petCatalogId) {
                  // ★ 路徑 A：有寵物圖鑑記錄
                  const [catalog] = await db.select().from(gamePetCatalog)
                    .where(eq(gamePetCatalog.id, cInfo.petCatalogId)).limit(1);
                  if (!catalog) throw new Error("Pet catalog not found");

                  petCatalogId = catalog.id;
                  petName = catalog.name;
                  petGrowthType = catalog.growthType ?? "balanced";

                  const initBp = monsterBP ? (
                    monsterBP.constitution + monsterBP.strength + monsterBP.defense + monsterBP.agility + monsterBP.magic
                  ) : (catalog.baseBpConstitution + catalog.baseBpStrength + catalog.baseBpDefense + catalog.baseBpAgility + catalog.baseBpMagic);
                  bpCon = monsterBP?.constitution ?? Math.floor(initBp * 0.3);
                  bpStr = monsterBP?.strength ?? Math.floor(initBp * 0.2);
                  bpDef2 = monsterBP?.defense ?? Math.floor(initBp * 0.2);
                  bpAgi = monsterBP?.agility ?? Math.floor(initBp * 0.15);
                  bpMag = monsterBP?.magic ?? Math.floor(initBp * 0.15);
                } else {
                  // ★ 路徑 B：從 gameMonsterCatalog 動態生成寵物
                  const [monCat] = await db.select().from(gameMonsterCatalog)
                    .where(eq(gameMonsterCatalog.monsterId, cInfo.monsterCatalogId!))
                    .limit(1);
                  if (!monCat) throw new Error("Monster catalog not found");

                  // 自動建立 gamePetCatalog 記錄（方便後續管理）
                  const wuxingMap: Record<string, string> = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" };
                  const petWuxing = wuxingMap[monCat.wuxing] ?? "earth";
                  const totalBp = monCat.baseBp ?? 50;
                  const totalBase = Math.max(1, monCat.baseHp + monCat.baseAttack + monCat.baseDefense + monCat.baseSpeed + monCat.baseMagicAttack);
                  const catBpCon = Math.max(5, Math.round(totalBp * (monCat.baseHp / totalBase)));
                  const catBpStr = Math.max(5, Math.round(totalBp * (monCat.baseAttack / totalBase)));
                  const catBpDef = Math.max(5, Math.round(totalBp * (monCat.baseDefense / totalBase)));
                  const catBpAgi = Math.max(5, Math.round(totalBp * (monCat.baseSpeed / totalBase)));
                  const catBpMag = Math.max(5, totalBp - catBpCon - catBpStr - catBpDef - catBpAgi);

                  const maxStat = Math.max(monCat.baseAttack, monCat.baseDefense, monCat.baseSpeed, monCat.baseMagicAttack);
                  let growthType = "balanced";
                  if (maxStat === monCat.baseAttack) growthType = "fighter";
                  else if (maxStat === monCat.baseDefense) growthType = "guardian";
                  else if (maxStat === monCat.baseSpeed) growthType = "swift";
                  else if (maxStat === monCat.baseMagicAttack) growthType = "mage";

                  const raceMap: Record<string, string> = {
                    "靈獸系": "normal", "亡魂系": "undead", "金屬系": "normal",
                    "人型系": "normal", "植物系": "plant", "水生系": "normal",
                    "妖化系": "normal", "龍種系": "dragon", "蟲類系": "insect", "天命系": "normal",
                  };
                  const petRace = raceMap[monCat.race ?? ""] ?? "normal";

                  const [newCatalog] = await db.insert(gamePetCatalog).values({
                    name: monCat.name,
                    description: monCat.description ?? `由${monCat.name}捕捉而來的寵物`,
                    sourceMonsterKey: monCat.monsterId,
                    race: petRace,
                    wuxing: petWuxing,
                    rarity: monCat.rarity === "elite" ? "epic" : (monCat.rarity as any) ?? "common",
                    growthType,
                    baseBpConstitution: catBpCon,
                    baseBpStrength: catBpStr,
                    baseBpDefense: catBpDef,
                    baseBpAgility: catBpAgi,
                    baseBpMagic: catBpMag,
                    baseCaptureRate: monCat.baseCaptureRate,
                    imageUrl: monCat.imageUrl ?? "",
                    isActive: 1,
                  }).$returningId();

                  petCatalogId = newCatalog.id;
                  petName = monCat.name;
                  petGrowthType = growthType;

                  // 使用怪物個體 BP（如果有），否則用剛計算的圖鑑 BP
                  bpCon = monsterBP?.constitution ?? catBpCon;
                  bpStr = monsterBP?.strength ?? catBpStr;
                  bpDef2 = monsterBP?.defense ?? catBpDef;
                  bpAgi = monsterBP?.agility ?? catBpAgi;
                  bpMag = monsterBP?.magic ?? catBpMag;
                }

                await db.insert(gamePlayerPets).values({
                  agentId: agentP.agentId,
                  petCatalogId,
                  nickname: petName,
                  level: capturedLevel,
                  exp: 0,
                  growthType: petGrowthType,
                  bpConstitution: bpCon,
                  bpStrength: bpStr,
                  bpDefense: bpDef2,
                  bpAgility: bpAgi,
                  bpMagic: bpMag,
                  bpUnallocated: 0,
                  hp: 100,
                  maxHp: 100,
                  mp: 50,
                  maxMp: 50,
                  attack: 20,
                  defense: 15,
                  speed: 15,
                  isActive: 0,
                  capturedAt: Date.now(),
                  updatedAt: Date.now(),
                });

                // 添加捕捉成功日誌
                const rebornMsg = isReborn ? "（重生！等級重置為 1）" : `（Lv.${capturedLevel}）`;
                const bpMsg = `BP: 體${bpCon}/力${bpStr}/防${bpDef2}/敏${bpAgi}/魔${bpMag}`;
                allLogs.push({
                  round, actorId: actor.id, actorName: actor.name,
                  logType: "capture_success", value: 1, isCritical: false,
                  message: `🎉 ${cInfo.targetMonsterName}已被成功捕捉，成為你的新寵物「${petName}」${rebornMsg}！${bpMsg}`,
                });
              }
            } catch (e) {
              console.error("[Battle] pet creation after capture error:", e);
            }
            // 捕捉成功等同勝利
            await db.update(gameBattles).set({
              state: "ended",
              currentRound: round,
              result: "win",
              updatedAt: Date.now(),
              endedAt: Date.now(),
            }).where(eq(gameBattles.id, battle.id));
            return { state: "ended", result: "win", round, logs: allLogs };
          }
        }

        // 檢查戰鬥結束
        const alliesAlive = participants.filter(p => p.side === "ally" && !p.isDefeated);
        const enemiesAlive = participants.filter(p => p.side === "enemy" && !p.isDefeated);

        if (enemiesAlive.length === 0 || alliesAlive.length === 0) {
          const battleResult = enemiesAlive.length === 0 ? "win" : "lose";
          await db.update(gameBattles).set({
            state: "ended",
            currentRound: round,
            result: battleResult,
            updatedAt: Date.now(),
            endedAt: Date.now(),
          }).where(eq(gameBattles.id, battle.id));

          // 更新參與者狀態
          for (const p of participants) {
            const dbP = dbParticipants.find(dp => dp.id === p.id);
            if (dbP) {
              await db.update(gameBattleParticipants).set({
                currentHp: p.currentHp,
                currentMp: p.currentMp,
                isDefeated: p.isDefeated ? 1 : 0,
                activeBuffs: (p.statusEffects ?? []) as any,
              }).where(eq(gameBattleParticipants.id, dbP.id));
            }
          }

          // ═══ 戰鬥結算獎勵 ═══
          let rewards: { expReward: number; goldReward: number; drops: string[]; petExpGained: number } = {
            expReward: 0, goldReward: 0, drops: [], petExpGained: 0,
          };
          if (battleResult === "win") {
            // 找到怪物參與者以計算獎勵
            const monsterP = dbParticipants.find(dp => dp.participantType === "monster");
            const monsterId = monsterP?.monsterId;
            const monsterLevel = monsterP?.level ?? 1;
            const mult = battle.rewardMultiplier ?? 1.0;

            // ─── 移動式 Boss 擊敗處理 ───
            if (monsterId && monsterId.startsWith("boss_")) {
              const bossInstanceId = parseInt(monsterId.replace("boss_", ""), 10);
              if (!isNaN(bossInstanceId)) {
                const [bossInst] = await db.select().from(roamingBossInstances)
                  .where(eq(roamingBossInstances.id, bossInstanceId));
                if (bossInst) {
                  const [bossCat] = await db.select().from(roamingBossCatalog)
                    .where(eq(roamingBossCatalog.id, bossInst.catalogId));
                  if (bossCat) {
                    rewards.expReward = Math.round(bossCat.level * 8 * bossCat.expMultiplier * mult);
                    rewards.goldReward = Math.floor((bossCat.level * 3 + Math.random() * bossCat.level * 5) * mult);
                    // ─── Boss 掉落物品（從圖鑑 drop_table 讀取） ───
                    const dropTable = (bossCat.dropTable as Array<{itemId: string; chance: number}> | null) ?? [];
                    for (const drop of dropTable) {
                      if (Math.random() < (drop.chance ?? 0) * mult) {
                        rewards.drops.push(drop.itemId);
                      }
                    }
                    // 記錄 Boss 擊敗日誌
                    const agentP2 = dbParticipants.find(dp => dp.participantType === "character");
                    if (agentP2?.agentId) {
                      const [agentData] = await db.select({ name: gameAgents.agentName, dominantElement: gameAgents.dominantElement, level: gameAgents.level })
                        .from(gameAgents).where(eq(gameAgents.id, agentP2.agentId));
                      await recordBossKill({
                        instanceId: bossInstanceId,
                        catalogId: bossInst.catalogId,
                        agentId: agentP2.agentId,
                        agentName: agentData?.name ?? "未知冒險者",
                        result: "win",
                        damageDealt: rewards.expReward,
                        rounds: round,
                        expGained: rewards.expReward,
                        goldGained: rewards.goldReward,
                        dropsGained: rewards.drops.map(itemId => ({ itemId, itemName: itemId, qty: 1 })),
                        nodeId: bossInst.currentNodeId,
                      });
                      // ─── 全服公告：Boss 擊殺 ───
                      const bossFullName = `${bossCat.title ? bossCat.title + " " : ""}${bossCat.name}`;
                      // 確認是否組隊擊殺
                      const killerParty = await db.select().from(gameParties)
                        .where(and(
                          sql`JSON_CONTAINS(${gameParties.memberIds}, JSON_ARRAY(${agentP2.agentId}))`,
                          eq(gameParties.status, "active")
                        ));
                      const isPartyKill = killerParty.length > 0;
                      broadcastBossKill({
                        agentName: agentData?.name ?? "未知冒險者",
                        agentElement: agentData?.dominantElement ?? "earth",
                        agentLevel: agentData?.level ?? 1,
                        bossName: bossFullName,
                        drops: rewards.drops,
                        isParty: isPartyKill,
                        partyName: isPartyKill ? killerParty[0].partyName ?? undefined : undefined,
                      });
                    }
                  }
                }
              }
            } else {
              const staticMonster = monsterId ? MONSTERS.find(m => m.id === monsterId) : null;
              if (staticMonster) {
                rewards.expReward = Math.floor(staticMonster.expReward * mult);
                const [gMin, gMax] = staticMonster.goldReward;
                rewards.goldReward = Math.floor((gMin + Math.random() * (gMax - gMin)) * mult);
                // 掉落物
                for (const drop of staticMonster.dropItems) {
                  if (Math.random() < drop.chance * mult) {
                    rewards.drops.push(drop.itemId);
                  }
                }
              } else {
                // 無靜態怪物數據，使用基礎公式
                rewards.expReward = Math.floor(monsterLevel * 15 * mult);
                rewards.goldReward = Math.floor(monsterLevel * 8 * mult);
              }
            }

            // ═══ Boss 擊殺全服公告 ═══
            const isBossWin = monsterId?.startsWith("boss_") && battleResult === "win";
            const agentP = dbParticipants.find(dp => dp.participantType === "character");

            if (isBossWin && agentP?.agentId) {
              // 查詢角色屬性用於公告
              const [agentForBroadcast] = await db.select({
                name: gameAgents.agentName, level: gameAgents.level, dominantElement: gameAgents.dominantElement,
              }).from(gameAgents).where(eq(gameAgents.id, agentP.agentId));
              // 查詢是否有組隊
              const partyRows = await db.select().from(gameParties)
                .where(sql`JSON_CONTAINS(${gameParties.memberIds}, JSON_ARRAY(${agentP.agentId})) AND ${gameParties.status} != 'disbanded'`)
                .limit(1);
              const party = partyRows[0] ?? null;
              const bossInstanceId2 = parseInt(monsterId!.replace("boss_", ""), 10);
              const [bossInstForBroadcast] = await db.select({ catalogId: roamingBossInstances.catalogId })
                .from(roamingBossInstances).where(eq(roamingBossInstances.id, bossInstanceId2));
              const [bossCatForBroadcast] = bossInstForBroadcast
                ? await db.select({ name: roamingBossCatalog.name, title: roamingBossCatalog.title })
                    .from(roamingBossCatalog).where(eq(roamingBossCatalog.id, bossInstForBroadcast.catalogId))
                : [null];
              const bossDisplayName = bossCatForBroadcast
                ? `${bossCatForBroadcast.title ? bossCatForBroadcast.title + " " : ""}${bossCatForBroadcast.name}`
                : "Boss";
              const WUXING_EN: Record<string, string> = { "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water" };
              broadcastBossKill({
                agentName: agentForBroadcast?.name ?? "冒險者",
                agentElement: agentForBroadcast?.dominantElement ?? "earth",
                agentLevel: agentForBroadcast?.level,
                bossName: bossDisplayName,
                drops: rewards.drops,
                isParty: !!party,
                partyName: party?.partyName ?? undefined,
              });
            }

            // ═══ 組隊成員物品分配逻輯 ═══
            // 先查詢玩家是否在組隊中
            let partyMemberIds: number[] = [];
            if (agentP?.agentId && rewards.drops.length > 0) {
              const partyRowsForDrop = await db.select().from(gameParties)
                .where(sql`JSON_CONTAINS(${gameParties.memberIds}, JSON_ARRAY(${agentP.agentId})) AND ${gameParties.status} != 'disbanded'`)
                .limit(1);
              if (partyRowsForDrop.length > 0) {
                partyMemberIds = (partyRowsForDrop[0].memberIds as number[]) ?? [];
              }
            }

            // 更新角色經驗/金幣
            if (agentP?.agentId) {
              await db.update(gameAgents).set({
                exp: sql`${gameAgents.exp} + ${rewards.expReward}`,
                gold: sql`${gameAgents.gold} + ${rewards.goldReward}`,
                totalKills: sql`${gameAgents.totalKills} + 1`,
                updatedAt: Date.now(),
              }).where(eq(gameAgents.id, agentP.agentId));

              if (partyMemberIds.length > 1) {
                // ─── 組隊模式：平均分配經驗/金幣，掉落物品隨機分配給隊員 ───
                const memberCount = partyMemberIds.length;
                const expPerMember = Math.floor(rewards.expReward / memberCount);
                const goldPerMember = Math.floor(rewards.goldReward / memberCount);
                // 掉落物品隨機分配給隊員
                const dropAssignments: Record<number, string[]> = {};
                for (const itemId of rewards.drops) {
                  const luckyMemberId = partyMemberIds[Math.floor(Math.random() * memberCount)];
                  if (!dropAssignments[luckyMemberId]) dropAssignments[luckyMemberId] = [];
                  dropAssignments[luckyMemberId].push(itemId);
                }
                // 發放給每位隊員
                for (const memberId of partyMemberIds) {
                  const memberDrops = dropAssignments[memberId] ?? [];
                  await db.update(gameAgents).set({
                    exp: sql`${gameAgents.exp} + ${expPerMember}`,
                    gold: sql`${gameAgents.gold} + ${goldPerMember}`,
                    totalKills: sql`${gameAgents.totalKills} + 1`,
                    updatedAt: Date.now(),
                  }).where(eq(gameAgents.id, memberId));
                  for (const itemId of memberDrops) {
                    try {
                      const itemType = itemId.startsWith("equip") ? "equipment" as const
                        : itemId.startsWith("skill") ? "skill_book" as const
                        : itemId.startsWith("food") || itemId.startsWith("consumable") ? "consumable" as const
                        : "material" as const;
                      // 裝備類不可疊加，每次掉落都是獨立一筆
                      if (itemType === "equipment") {
                        await db.insert(agentInventory).values({
                          agentId: memberId, itemId, itemType, quantity: 1,
                          acquiredAt: Date.now(), updatedAt: Date.now(),
                        });
                      } else {
                        const [ex] = await db.select().from(agentInventory)
                          .where(and(eq(agentInventory.agentId, memberId), eq(agentInventory.itemId, itemId))).limit(1);
                        if (ex) {
                          await db.update(agentInventory).set({ quantity: ex.quantity + 1, updatedAt: Date.now() })
                            .where(eq(agentInventory.id, ex.id));
                        } else {
                          await db.insert(agentInventory).values({
                            agentId: memberId, itemId, itemType, quantity: 1,
                            acquiredAt: Date.now(), updatedAt: Date.now(),
                          });
                        }
                      }
                    } catch (e) { console.error("[Battle] party drop insert error:", e); }
                  }
                }
              } else {
                // ─── 單人模式：直接發放給玩家 ───
                // 寫入背包
                for (const itemId of rewards.drops) {
                  try {
                    const itemType = itemId.startsWith("equip") ? "equipment" as const
                      : itemId.startsWith("skill") ? "skill_book" as const
                      : itemId.startsWith("food") || itemId.startsWith("consumable") ? "consumable" as const
                      : "material" as const;
                    // 裝備類不可疊加，每次掉落都是獨立一筆
                    if (itemType === "equipment") {
                      await db.insert(agentInventory).values({
                        agentId: agentP.agentId, itemId, itemType, quantity: 1,
                        acquiredAt: Date.now(), updatedAt: Date.now(),
                      });
                    } else {
                      const [existing] = await db.select().from(agentInventory)
                        .where(and(eq(agentInventory.agentId, agentP.agentId), eq(agentInventory.itemId, itemId)))
                        .limit(1);
                      if (existing) {
                        await db.update(agentInventory).set({
                          quantity: existing.quantity + 1,
                          updatedAt: Date.now(),
                        }).where(eq(agentInventory.id, existing.id));
                      } else {
                        await db.insert(agentInventory).values({
                          agentId: agentP.agentId, itemId, itemType, quantity: 1,
                          acquiredAt: Date.now(), updatedAt: Date.now(),
                        });
                      }
                    }
                  } catch (e) { console.error("[Battle] drop insert error:", e); }
                }
              }
            }

            // 寵物經驗
            const petP = dbParticipants.find(dp => dp.participantType === "pet");
            if (petP?.petId && rewards.expReward > 0) {
              const [activePet] = await db.select().from(gamePlayerPets).where(eq(gamePlayerPets.id, petP.petId as number));
              if (activePet) {
                rewards.petExpGained = calcPetBattleExp(rewards.expReward, activePet.level, monsterLevel);
                await db.update(gamePlayerPets).set({
                  exp: sql`${gamePlayerPets.exp} + ${rewards.petExpGained}`,
                  friendship: sql`LEAST(100, ${gamePlayerPets.friendship} + 1)`,
                  updatedAt: Date.now(),
                }).where(eq(gamePlayerPets.id, activePet.id));
              }
            }
          }

          return {
            state: "ended", result: battleResult, round, logs: allLogs,
            rewards: {
              expReward: rewards.expReward,
              goldReward: rewards.goldReward,
              drops: rewards.drops,
              petExpGained: rewards.petExpGained,
            },
          };
        }
      }

      // 減少冷卻
      for (const p of participants) {
        if (p.isDefeated) continue;
        for (const skill of p.skills) {
          if (skill.currentCooldown && skill.currentCooldown > 0) skill.currentCooldown--;
        }
      }

      // 更新戰鬥狀態
      await db.update(gameBattles).set({
        currentRound: round,
        turnOrder: turnOrder as any,
        updatedAt: Date.now(),
      }).where(eq(gameBattles.id, battle.id));

      // 更新參與者狀態
      for (const p of participants) {
        const dbP = dbParticipants.find(dp => dp.id === p.id);
        if (dbP) {
          await db.update(gameBattleParticipants).set({
            currentHp: p.currentHp,
            currentMp: p.currentMp,
            isDefending: p.isDefending ? 1 : 0,
            isDefeated: p.isDefeated ? 1 : 0,
            speedScore: p.speedScore,
            skillCooldowns: Object.fromEntries(p.skills.map(s => [s.id, s.currentCooldown ?? 0])) as any,
            activeBuffs: (p.statusEffects ?? []) as any,
          }).where(eq(gameBattleParticipants.id, dbP.id));
        }
      }

      // 儲存日誌
      for (const log of allLogs) {
        await db.insert(gameBattleLogs).values({
          battleId: battle.id,
          round: log.round,
          actorId: log.actorId,
          logType: log.logType,
          targetId: log.targetId ?? null,
          value: log.value,
          isCritical: log.isCritical ? 1 : 0,
          skillName: log.skillName ?? null,
          elementBoostDesc: log.elementBoostDesc ?? null,
          statusEffectDesc: log.statusEffectDesc ?? null,
          message: log.message,
          detail: log.detail ? (log.detail as any) : null,
          createdAt: Date.now(),
        });
      }

      // 返回當前回合結果
      return {
        state: "ongoing",
        round,
        logs: allLogs,
        participants: participants.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          side: p.side,
          currentHp: p.currentHp,
          maxHp: p.maxHp,
          currentMp: p.currentMp,
          maxMp: p.maxMp,
          isDefeated: p.isDefeated,
          isDefending: p.isDefending,
          statusEffects: p.statusEffects,
          skills: p.skills.map(s => ({
            id: s.id, name: s.name, mpCost: s.mpCost,
            cooldown: s.cooldown ?? 0, currentCooldown: s.currentCooldown ?? 0,
          })),
        })),
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 查詢戰鬥狀態
  // ═══════════════════════════════════════════════════════════════
  getBattleState: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [battle] = await db.select().from(gameBattles).where(eq(gameBattles.battleId, input.battleId));
      if (!battle) throw new TRPCError({ code: "NOT_FOUND" });

      const participants = await db.select().from(gameBattleParticipants)
        .where(eq(gameBattleParticipants.battleId, battle.id));

      const logs = await db.select().from(gameBattleLogs)
        .where(eq(gameBattleLogs.battleId, battle.id));

      // 讀取戰鬥倒數計時設定
      const engineCfg = getEngineConfig();
      const turnTimerMap: Record<string, number> = {
        pve: engineCfg.battleTurnTimerPvE,
        boss: engineCfg.battleTurnTimerBoss,
        pvp: engineCfg.battleTurnTimerPvP,
      };
      const turnTimer = turnTimerMap[battle.mode] ?? engineCfg.battleTurnTimerPvE;

      return {
        battle: {
          battleId: battle.battleId,
          mode: battle.mode,
          state: battle.state,
          currentRound: battle.currentRound,
          maxRounds: battle.maxRounds,
          result: battle.result,
          rewardMultiplier: battle.rewardMultiplier,
          turnTimer, // 回合倒數秒數（0=不限制）
        },
        participants: participants.map(p => ({
          id: p.id,
          type: p.participantType,
          side: p.side,
          name: p.displayName,
          level: p.level,
          maxHp: p.maxHp,
          currentHp: p.currentHp,
          maxMp: p.maxMp,
          currentMp: p.currentMp,
          attack: p.attack,
          defense: p.defense,
          speed: p.speed,
          dominantElement: p.dominantElement,
          isDefeated: p.isDefeated === 1,
          isDefending: p.isDefending === 1,
          statusEffects: (p.activeBuffs ?? []) as any,
          agentId: p.agentId ?? null,
          petId: p.petId ?? null,
          monsterId: p.monsterId ?? null,
          skills: ((p.equippedSkills ?? []) as any[]).map((s: any) => {
            const cdMap = (p.skillCooldowns ?? {}) as Record<string, number>;
            return {
              id: s.id, name: s.name, mpCost: s.mpCost,
              cooldown: s.cooldown ?? 0,
              currentCooldown: cdMap[s.id] ?? s.currentCooldown ?? 0,
            };
          }),
        })),
        logs: logs.map(l => ({
          round: l.round,
          actorId: l.actorId,
          logType: l.logType,
          targetId: l.targetId,
          value: l.value,
          isCritical: l.isCritical === 1,
          skillName: l.skillName,
          elementBoostDesc: l.elementBoostDesc,
          statusEffectDesc: l.statusEffectDesc,
          message: l.message,
        })),
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 掛機 Session 管理
  // ═══════════════════════════════════════════════════════════════
  startIdleSession: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

    // 檢查是否已有進行中的掛機
    const [existing] = await db.select().from(gameIdleSessions)
      .where(and(eq(gameIdleSessions.agentId, agent.id), eq(gameIdleSessions.isSettled, 0)));
    if (existing) {
      return { sessionId: existing.id, alreadyActive: true, startedAt: existing.startedAt };
    }

    const now = Date.now();
    await db.insert(gameIdleSessions).values({
      agentId: agent.id,
      startedAt: now,
      totalExp: 0,
      totalGold: 0,
      totalBattles: 0,
      totalWins: 0,
      totalLoot: {} as any,
      petTotalExp: 0,
      petTotalBp: 0,
      maxDuration: 28800000, // 8 小時
      isSettled: 0,
    });

    const [session] = await db.select().from(gameIdleSessions)
      .where(and(eq(gameIdleSessions.agentId, agent.id), eq(gameIdleSessions.isSettled, 0)));

    return { sessionId: session.id, alreadyActive: false, startedAt: now };
  }),

  getIdleSession: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
    if (!agent) return null;

    const [session] = await db.select().from(gameIdleSessions)
      .where(and(eq(gameIdleSessions.agentId, agent.id), eq(gameIdleSessions.isSettled, 0)));
    if (!session) return null;

    const elapsed = Date.now() - session.startedAt;
    const capped = Math.min(elapsed, session.maxDuration);

    return {
      id: session.id,
      startedAt: session.startedAt,
      elapsed: capped,
      maxDuration: session.maxDuration,
      totalExp: session.totalExp,
      totalGold: session.totalGold,
      totalBattles: session.totalBattles,
      totalWins: session.totalWins,
      petTotalExp: session.petTotalExp,
      petTotalBp: session.petTotalBp,
      isMaxed: elapsed >= session.maxDuration,
    };
  }),

  settleIdleSession: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
    if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

    const [session] = await db.select().from(gameIdleSessions)
      .where(and(eq(gameIdleSessions.agentId, agent.id), eq(gameIdleSessions.isSettled, 0)));
    if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "沒有進行中的掛機" });

    const now = Date.now();
    const elapsed = Math.min(now - session.startedAt, session.maxDuration);
    const elapsedHours = elapsed / 3600000; // 毫秒轉小時

    // ─── 掛機離線寵物 BP 成長 ───
    // 每小時 +5 BP，最高 40 BP（8小時封頂）
    const BP_PER_HOUR = 5;
    const bpGained = Math.floor(elapsedHours * BP_PER_HOUR);
    let petBpDetails: { petName: string; bpGained: number; gains: Record<string, number> } | null = null;

    if (bpGained > 0) {
      // 找到出戰寵物
      const [activePet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.agentId, agent.id), eq(gamePlayerPets.isActive, 1)));

      if (activePet) {
        // 累積 BP 成長：每 1 BP 隨機分配到五維
        const totalGains: Record<string, number> = { constitution: 0, strength: 0, defense: 0, agility: 0, magic: 0 };
        const dims = ["constitution", "strength", "defense", "agility", "magic"];
        for (let i = 0; i < bpGained; i++) {
          const d = dims[Math.floor(Math.random() * dims.length)];
          totalGains[d] += 1;
        }

        // 更新寵物 BP
        await db.update(gamePlayerPets).set({
          bpConstitution: activePet.bpConstitution + totalGains.constitution,
          bpStrength: activePet.bpStrength + totalGains.strength,
          bpDefense: activePet.bpDefense + totalGains.defense,
          bpAgility: activePet.bpAgility + totalGains.agility,
          bpMagic: activePet.bpMagic + totalGains.magic,
          updatedAt: now,
        }).where(eq(gamePlayerPets.id, activePet.id));

        // 重新計算戰鬥數值
        const newBp = {
          constitution: activePet.bpConstitution + totalGains.constitution,
          strength: activePet.bpStrength + totalGains.strength,
          defense: activePet.bpDefense + totalGains.defense,
          agility: activePet.bpAgility + totalGains.agility,
          magic: activePet.bpMagic + totalGains.magic,
        };
        const newStats = calcPetStats(newBp, activePet.level);
        await db.update(gamePlayerPets).set({
          hp: newStats.hp, maxHp: newStats.hp,
          mp: newStats.mp, maxMp: newStats.mp,
          attack: newStats.attack, defense: newStats.defense,
          speed: newStats.speed, magicAttack: newStats.magicAttack,
        }).where(eq(gamePlayerPets.id, activePet.id));

        // 記錄 BP 歷史
        await db.insert(gamePetBpHistory).values({
          petId: activePet.id,
          source: "idle",
          description: `掛機 ${Math.floor(elapsedHours)}小時 ${Math.floor((elapsedHours % 1) * 60)}分鐘，獲得 ${bpGained} BP`,
          prevConstitution: activePet.bpConstitution,
          prevStrength: activePet.bpStrength,
          prevDefense: activePet.bpDefense,
          prevAgility: activePet.bpAgility,
          prevMagic: activePet.bpMagic,
          newConstitution: newBp.constitution,
          newStrength: newBp.strength,
          newDefense: newBp.defense,
          newAgility: newBp.agility,
          newMagic: newBp.magic,
          deltaConstitution: totalGains.constitution,
          deltaStrength: totalGains.strength,
          deltaDefense: totalGains.defense,
          deltaAgility: totalGains.agility,
          deltaMagic: totalGains.magic,
          createdAt: now,
        });

        petBpDetails = {
          petName: activePet.nickname || `寵物#${activePet.id}`,
          bpGained,
          gains: totalGains,
        };
      }
    }

    // 更新 session 結算
    await db.update(gameIdleSessions).set({
      endedAt: now,
      isSettled: 1,
      petTotalBp: (session.petTotalBp || 0) + bpGained,
    }).where(eq(gameIdleSessions.id, session.id));

    return {
      totalExp: session.totalExp,
      totalGold: session.totalGold,
      totalBattles: session.totalBattles,
      totalWins: session.totalWins,
      petTotalExp: session.petTotalExp,
      petTotalBp: (session.petTotalBp || 0) + bpGained,
      duration: elapsed,
      petBpDetails,
    };
  }),

  // ═══════════════════════════════════════════════════════════════
  // 戰鬥中可用道具（消耗品）
  // ═══════════════════════════════════════════════════════════════
  getBattleItems: protectedProcedure
    .input(z.object({ battleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
      if (!agent) return [];

      // 查詢背包中的消耗品
      const items = await db.select({
        inventoryId: agentInventory.id,
        itemId: agentInventory.itemId,
        quantity: agentInventory.quantity,
        catalogName: gameItemCatalog.name,
        catalogCategory: gameItemCatalog.category,
        catalogRarity: gameItemCatalog.rarity,
        catalogUseEffect: gameItemCatalog.useEffect,
        catalogEffect: gameItemCatalog.effect,
        catalogWuxing: gameItemCatalog.wuxing,
      }).from(agentInventory)
        .innerJoin(gameItemCatalog, eq(agentInventory.itemId, gameItemCatalog.itemId))
        .where(
          and(
            eq(agentInventory.agentId, agent.id),
            eq(agentInventory.itemType, "consumable"),
            sql`${agentInventory.quantity} > 0`,
            eq(gameItemCatalog.usableInBattle, 1),
          )
        );

      return items.map(item => ({
        inventoryId: item.inventoryId,
        itemId: item.itemId,
        name: item.catalogName,
        quantity: item.quantity,
        category: item.catalogCategory,
        rarity: item.catalogRarity,
        wuxing: item.catalogWuxing,
        useEffect: item.catalogUseEffect as { type: string; value: number; duration?: number; description: string } | null,
        effectDesc: item.catalogEffect ?? "",
      }));
    }),

  // ═══════════════════════════════════════════════════════════════
  // 戰鬥歷史
  // ═══════════════════════════════════════════════════════════════
  getBattleHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [agent] = await db.select().from(gameAgents).where(eq(gameAgents.userId, String(ctx.user.id)));
      if (!agent) return [];

      const battles = await db.select().from(gameBattles)
        .where(eq(gameBattles.initiatorAgentId, agent.id))
        .orderBy(desc(gameBattles.createdAt))
        .limit(input.limit);

      return battles.map(b => ({
        battleId: b.battleId,
        mode: b.mode,
        result: b.result,
        rounds: b.currentRound,
        rewardMultiplier: b.rewardMultiplier,
        createdAt: b.createdAt,
        endedAt: b.endedAt,
      }));
    }),
});
