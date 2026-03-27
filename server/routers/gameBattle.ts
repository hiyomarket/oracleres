/**
 * ═══════════════════════════════════════════════════════════════
 * gameBattle Router — GD-020 戰鬥系統 API
 * ═══════════════════════════════════════════════════════════════
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameAgents, gamePlayerPets, gamePetCatalog, gameBattles, gameBattleParticipants, gameBattleCommands, gameBattleLogs, gameIdleSessions } from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { calcCharacterStatsV2 } from "../services/balanceFormulas";
import { calcPetStats, petSkillsToCombatFormat, DESTINY_SKILLS, DESTINY_AWAKENING_EFFECTS, checkDestinySkillLevelUp, calcPetBattleExp, levelUpBP } from "../services/petEngine";
import {
  type BattleParticipant, type BattleMode, type BattleCommand, type BattleLogEntry,
  simulateBattle, aiDecideCommand, executeCommand, sortTurnOrder, processStatusEffects,
  isStunned, calcTotalPower, quickBattle, REWARD_MULTIPLIERS,
} from "../services/combatEngineV2";
import { MONSTERS, type Monster } from "../../shared/monsters";
import { getCombatMonsterById, type CombatMonster, type MonsterSkillData } from "../monsterDataService";
import { randomUUID } from "crypto";

// ─── 輔助函數 ───

/** 從角色數據建立戰鬥參與者 */
function buildCharacterParticipant(
  agent: any,
  id: number,
): BattleParticipant {
  const wuxing = {
    wood: agent.wuxingWood ?? 0,
    fire: agent.wuxingFire ?? 0,
    earth: agent.wuxingEarth ?? 0,
    metal: agent.wuxingMetal ?? 0,
    water: agent.wuxingWater ?? 0,
  };
  const stats = calcCharacterStatsV2(wuxing, agent.level ?? 1);
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
    magicDefense: Math.floor(stats.def * 0.7),
    speed: stats.spd,
    dominantElement,
    skills: [], // 角色技能從裝備的天命技能轉換
    isDefending: false,
    isDefeated: false,
    speedScore: 0,
    statusEffects: [],
    agentId: agent.id,
  };
}

/** 從寵物數據建立戰鬥參與者 */
function buildPetParticipant(
  pet: any,
  catalog: any,
  id: number,
): BattleParticipant {
  const bp = {
    constitution: pet.bpConstitution ?? 0,
    strength: pet.bpStrength ?? 0,
    defense: pet.bpDefense ?? 0,
    agility: pet.bpAgility ?? 0,
    magic: pet.bpMagic ?? 0,
  };
  const raceHpMul = catalog?.race ? (({ dragon: 1.3, undead: 1.2, normal: 1.0, flying: 1.0, insect: 0.9, plant: 0.8 } as any)[catalog.race] ?? 1.0) : 1.0;
  const stats = calcPetStats(bp, pet.level ?? 1, raceHpMul);
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
    magicDefense: Math.floor(stats.defense * 0.6),
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
      }

      // 取得怪物
      const monster = await getCombatMonsterById(input.monsterId);
      if (!monster) {
        // 嘗試從靜態數據中找
        const staticMonster = MONSTERS.find(m => m.id === input.monsterId);
        if (!staticMonster) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });
      }
      const combatMonster = monster || MONSTERS.find(m => m.id === input.monsterId)!;

      // 建立參與者
      const participants: BattleParticipant[] = [];
      let nextId = 1;

      const charParticipant = buildCharacterParticipant(agent, nextId++);
      participants.push(charParticipant);

      if (activePet && petCatalog) {
        const petParticipant = buildPetParticipant(activePet, petCatalog, nextId++);
        participants.push(petParticipant);
      }

      const monsterParticipant = buildMonsterParticipant(
        combatMonster as any, nextId++, input.monsterLevelOverride,
      );
      participants.push(monsterParticipant);

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
        });
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
      }

      // 取得怪物
      const combatMonster = await getCombatMonsterById(input.monsterId);
      const staticMonster = MONSTERS.find(m => m.id === input.monsterId);
      const monsterData = combatMonster || staticMonster;
      if (!monsterData) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });

      // 建立參與者
      const participants: BattleParticipant[] = [];
      let nextId = 1;
      participants.push(buildCharacterParticipant(agent, nextId++));
      if (activePet && petCatalog) {
        participants.push(buildPetParticipant(activePet, petCatalog, nextId++));
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
        commandType: z.enum(["attack", "skill", "defend", "item", "flee", "surrender"]),
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
        } else {
          const allies = participants.filter(p => p.side === actor.side);
          const enemies = participants.filter(p => p.side !== actor.side);
          command = aiDecideCommand(actor, allies, enemies, round);
        }

        // 儲存指令
        await db.insert(gameBattleCommands).values({
          battleId: battle.id,
          round,
          participantId: pid,
          commandType: command.commandType as any,
          targetId: command.targetId ?? null,
          skillId: command.skillId ?? null,
          itemId: command.itemId ?? null,
          isAutoDecision: playerCmd ? 0 : 1,
          createdAt: Date.now(),
        });

        const cmdLogs = executeCommand(command, participants, round);
        allLogs.push(...cmdLogs);

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

          return { state: "ended", result: battleResult, round, logs: allLogs };
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

      return {
        battle: {
          battleId: battle.battleId,
          mode: battle.mode,
          state: battle.state,
          currentRound: battle.currentRound,
          maxRounds: battle.maxRounds,
          result: battle.result,
          rewardMultiplier: battle.rewardMultiplier,
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
          skills: ((p.equippedSkills ?? []) as any[]).map((s: any) => ({
            id: s.id, name: s.name, mpCost: s.mpCost,
            cooldown: s.cooldown ?? 0, currentCooldown: s.currentCooldown ?? 0,
          })),
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

    // 結算
    await db.update(gameIdleSessions).set({
      endedAt: Date.now(),
      isSettled: 1,
    }).where(eq(gameIdleSessions.id, session.id));

    return {
      totalExp: session.totalExp,
      totalGold: session.totalGold,
      totalBattles: session.totalBattles,
      totalWins: session.totalWins,
      petTotalExp: session.petTotalExp,
      petTotalBp: session.petTotalBp,
      duration: Math.min(Date.now() - session.startedAt, session.maxDuration),
    };
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
