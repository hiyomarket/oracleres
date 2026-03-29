/**
 * 組隊系統 Router
 * 支援：建立隊伍、邀請成員、接受/拒絕邀請、離開隊伍、解散隊伍、查詢隊伍
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, or } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameParties, gamePartyInvites, gameAgents, partyBattleInvites, gameBattles, gameBattleParticipants, gamePlayerPets, gamePetCatalog, gamePetInnateSkills, gamePetLearnedSkills, agentSkills, gameUnifiedSkillCatalog, gameLearnedQuestSkills, gameQuestSkillCatalog, gameEquipmentCatalog } from "../../drizzle/schema";
import { randomUUID } from "crypto";
import { getCombatMonsterById } from "../monsterDataService";
import { MONSTERS } from "../../shared/monsters";
import { calcCharacterStatsV2 } from "../services/balanceFormulas";
import { getStatCaps, getStatBalanceConfig, getEngineConfig } from "../gameEngineConfig";
import { calcPetStatsGD024, calcPetStats, petSkillsToCombatFormat } from "../services/petEngine";
import { inArray } from "drizzle-orm";

// 輔助：取得玩家 agent（gameAgents.userId 是 varchar，ctx.user.id 是 number）
async function getAgentByUserId(db: any, userId: number | string) {
  const [agent] = await db.select({ id: gameAgents.id, agentName: gameAgents.agentName })
    .from(gameAgents).where(eq(gameAgents.userId, String(userId)));
  return agent ?? null;
}

// 輔助：確認玩家是否在隊伍中
async function isInParty(db: any, agentId: number) {
  const rows = await db.select({ id: gameParties.id }).from(gameParties)
    .where(and(
      sql`JSON_CONTAINS(${gameParties.memberIds}, JSON_ARRAY(${agentId}))`,
      or(eq(gameParties.status, "waiting"), eq(gameParties.status, "active"))
    ));
  return rows.length > 0 ? rows[0] : null;
}

export const gamePartyRouter = router({
  /** 取得目前玩家的隊伍資訊（包含隊員節點位置） */
  getMyParty: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) return null;
    const parties = await db.select().from(gameParties)
      .where(and(
        sql`JSON_CONTAINS(${gameParties.memberIds}, JSON_ARRAY(${agent.id}))`,
        or(eq(gameParties.status, "waiting"), eq(gameParties.status, "active"))
      ));
    if (parties.length === 0) return null;
    const party = parties[0];
    // 查詢隊員的節點位置
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const memberAgents = memberIds.length > 0
      ? await db.select({ id: gameAgents.id, agentName: gameAgents.agentName, currentNodeId: gameAgents.currentNodeId, status: gameAgents.status })
          .from(gameAgents)
          .where(sql`${gameAgents.id} IN (${sql.join(memberIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const memberNodeMap: Record<number, { nodeId: string; status: string }> = {};
    for (const a of memberAgents) {
      memberNodeMap[a.id] = { nodeId: a.currentNodeId ?? "", status: a.status ?? "idle" };
    }
    return { ...party, memberNodeMap };
  }),

  /** 建立隊伍 */
  createParty: protectedProcedure.input(z.object({
    partyName: z.string().max(50).optional(),
    maxMembers: z.number().int().min(2).max(6).default(4),
    isPublic: z.boolean().default(true),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "請先建立角色" });
    const agentName = agent.agentName ?? "旅人";
    const inParty = await isInParty(db, agent.id);
    if (inParty) throw new TRPCError({ code: "CONFLICT", message: "您已在隊伍中，請先離開" });
    const now = Date.now();
    const [result] = await db.insert(gameParties).values({
      partyName: input.partyName || `${agentName}的隊伍`,
      leaderId: agent.id,
      leaderName: agentName,
      memberIds: [agent.id],
      memberNames: [agentName],
      status: "waiting",
      maxMembers: input.maxMembers,
      isPublic: input.isPublic ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
    return { partyId: (result as any).insertId, message: "隊伍建立成功" };
  }),

  /** 邀請玩家加入隊伍 */
  invitePlayer: protectedProcedure.input(z.object({
    partyId: z.number().int(),
    targetAgentId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
    const agentName = agent.agentName ?? "旅人";
    const [party] = await db.select().from(gameParties)
      .where(and(eq(gameParties.id, input.partyId), eq(gameParties.status, "waiting")));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在或已開始戰鬥" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    if (!memberIds.includes(agent.id)) throw new TRPCError({ code: "FORBIDDEN", message: "您不在此隊伍中" });
    if (memberIds.length >= party.maxMembers) throw new TRPCError({ code: "CONFLICT", message: "隊伍已滿" });
    const [target] = await db.select({ id: gameAgents.id, agentName: gameAgents.agentName })
      .from(gameAgents).where(eq(gameAgents.id, input.targetAgentId));
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "目標玩家不存在" });
    const targetName = target.agentName ?? "旅人";
    if (memberIds.includes(target.id)) throw new TRPCError({ code: "CONFLICT", message: "該玩家已在隊伍中" });
    const [existingInvite] = await db.select({ id: gamePartyInvites.id }).from(gamePartyInvites)
      .where(and(
        eq(gamePartyInvites.partyId, input.partyId),
        eq(gamePartyInvites.inviteeId, target.id),
        eq(gamePartyInvites.status, "pending")
      ));
    if (existingInvite) throw new TRPCError({ code: "CONFLICT", message: "已有待處理的邀請" });
    const now = Date.now();
    await db.insert(gamePartyInvites).values({
      partyId: input.partyId,
      inviteeId: target.id,
      inviteeName: targetName,
      inviterId: agent.id,
      inviterName: agentName,
      status: "pending",
      expiresAt: now + 5 * 60 * 1000,
      createdAt: now,
    });
    return { message: `已邀請 ${targetName} 加入隊伍` };
  }),

  /** 取得待處理的邀請 */
  getPendingInvites: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) return [];
    const now = Date.now();
    await db.update(gamePartyInvites).set({ status: "expired" })
      .where(and(eq(gamePartyInvites.status, "pending"), sql`${gamePartyInvites.expiresAt} < ${now}`));
    return db.select().from(gamePartyInvites)
      .where(and(eq(gamePartyInvites.inviteeId, agent.id), eq(gamePartyInvites.status, "pending")));
  }),

  /** 接受邀請 */
  acceptInvite: protectedProcedure.input(z.object({
    inviteId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });
    const agentName = agent.agentName ?? "旅人";
    const [invite] = await db.select().from(gamePartyInvites)
      .where(and(
        eq(gamePartyInvites.id, input.inviteId),
        eq(gamePartyInvites.inviteeId, agent.id),
        eq(gamePartyInvites.status, "pending")
      ));
    if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "邀請不存在或已過期" });
    if (invite.expiresAt < Date.now()) {
      await db.update(gamePartyInvites).set({ status: "expired" }).where(eq(gamePartyInvites.id, input.inviteId));
      throw new TRPCError({ code: "BAD_REQUEST", message: "邀請已過期" });
    }
    const [party] = await db.select().from(gameParties)
      .where(and(eq(gameParties.id, invite.partyId), eq(gameParties.status, "waiting")));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在或已開始戰鬥" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const memberNames: string[] = Array.isArray(party.memberNames) ? (party.memberNames as string[]) : [];
    if (memberIds.length >= party.maxMembers) throw new TRPCError({ code: "CONFLICT", message: "隊伍已滿" });
    const inParty = await isInParty(db, agent.id);
    if (inParty) throw new TRPCError({ code: "CONFLICT", message: "您已在其他隊伍中" });
    await db.update(gameParties).set({
      memberIds: [...memberIds, agent.id],
      memberNames: [...memberNames, agentName],
      updatedAt: Date.now(),
    }).where(eq(gameParties.id, invite.partyId));
    await db.update(gamePartyInvites).set({ status: "accepted" }).where(eq(gamePartyInvites.id, input.inviteId));
    return { message: `已加入 ${party.partyName || "隊伍"}` };
  }),

  /** 拒絕邀請 */
  rejectInvite: protectedProcedure.input(z.object({
    inviteId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
    await db.update(gamePartyInvites).set({ status: "rejected" })
      .where(and(eq(gamePartyInvites.id, input.inviteId), eq(gamePartyInvites.inviteeId, agent.id)));
    return { message: "已拒絕邀請" };
  }),

  /** 離開隊伍 */
  leaveParty: protectedProcedure.input(z.object({
    partyId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
    const [party] = await db.select().from(gameParties).where(eq(gameParties.id, input.partyId));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const memberNames: string[] = Array.isArray(party.memberNames) ? (party.memberNames as string[]) : [];
    if (!memberIds.includes(agent.id)) throw new TRPCError({ code: "FORBIDDEN", message: "您不在此隊伍中" });
    const idx = memberIds.indexOf(agent.id);
    const newMemberIds = memberIds.filter(id => id !== agent.id);
    const newMemberNames = memberNames.filter((_, i) => i !== idx);
    if (newMemberIds.length === 0) {
      await db.update(gameParties).set({ status: "disbanded", updatedAt: Date.now() })
        .where(eq(gameParties.id, input.partyId));
      return { message: "隊伍已解散" };
    }
    const newLeaderId = party.leaderId === agent.id ? newMemberIds[0] : party.leaderId;
    const newLeaderName = party.leaderId === agent.id ? (newMemberNames[0] ?? "旅人") : party.leaderName;
    await db.update(gameParties).set({
      memberIds: newMemberIds,
      memberNames: newMemberNames,
      leaderId: newLeaderId,
      leaderName: newLeaderName,
      updatedAt: Date.now(),
    }).where(eq(gameParties.id, input.partyId));
    return { message: "已離開隊伍" };
  }),

  /** 解散隊伍（隊長專用） */
  disbandParty: protectedProcedure.input(z.object({
    partyId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
    const [party] = await db.select().from(gameParties)
      .where(and(eq(gameParties.id, input.partyId), eq(gameParties.leaderId, agent.id)));
    if (!party) throw new TRPCError({ code: "FORBIDDEN", message: "只有隊長可以解散隊伍" });
    await db.update(gameParties).set({ status: "disbanded", updatedAt: Date.now() })
      .where(eq(gameParties.id, input.partyId));
    return { message: "隊伍已解散" };
  }),

  /** 搜尋公開隊伍 */
  searchPublicParties: publicProcedure.input(z.object({
    limit: z.number().int().min(1).max(20).default(10),
  }).optional()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(gameParties)
      .where(and(eq(gameParties.status, "waiting"), eq(gameParties.isPublic, 1)))
      .orderBy(sql`${gameParties.createdAt} DESC`)
      .limit(input?.limit ?? 10);
  }),

  /** 申請加入公開隊伍 */
  joinPublicParty: protectedProcedure.input(z.object({
    partyId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "請先建立角色" });
    const agentName = agent.agentName ?? "旅人";
    const inParty = await isInParty(db, agent.id);
    if (inParty) throw new TRPCError({ code: "CONFLICT", message: "您已在其他隊伍中，請先離開" });
    const [party] = await db.select().from(gameParties)
      .where(and(
        eq(gameParties.id, input.partyId),
        eq(gameParties.status, "waiting"),
        eq(gameParties.isPublic, 1)
      ));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在或已關閉" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const memberNames: string[] = Array.isArray(party.memberNames) ? (party.memberNames as string[]) : [];
    if (memberIds.length >= party.maxMembers) throw new TRPCError({ code: "CONFLICT", message: "隊伍已滿" });
    if (memberIds.includes(agent.id)) throw new TRPCError({ code: "CONFLICT", message: "您已在此隊伍中" });
    await db.update(gameParties).set({
      memberIds: [...memberIds, agent.id],
      memberNames: [...memberNames, agentName],
      updatedAt: Date.now(),
    }).where(eq(gameParties.id, input.partyId));
    return { message: `已加入 ${party.partyName || "隊伍"}` };
  }),

  /** 踢出成員（隊長專用） */
  kickMember: protectedProcedure.input(z.object({
    partyId: z.number().int(),
    targetAgentId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
    const [party] = await db.select().from(gameParties)
      .where(and(eq(gameParties.id, input.partyId), eq(gameParties.leaderId, agent.id)));
    if (!party) throw new TRPCError({ code: "FORBIDDEN", message: "只有隊長可以踢出成員" });
    if (input.targetAgentId === agent.id) throw new TRPCError({ code: "BAD_REQUEST", message: "不能踢出自己" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const memberNames: string[] = Array.isArray(party.memberNames) ? (party.memberNames as string[]) : [];
    const targetIdx = memberIds.indexOf(input.targetAgentId);
    if (targetIdx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "該成員不在隊伍中" });
    const newMemberIds = memberIds.filter(id => id !== input.targetAgentId);
    const newMemberNames = memberNames.filter((_, i) => i !== targetIdx);
    await db.update(gameParties).set({
      memberIds: newMemberIds,
      memberNames: newMemberNames,
      updatedAt: Date.now(),
    }).where(eq(gameParties.id, input.partyId));
    return { message: "已踢出成員" };
  }),

  /** 取得附近節點的玩家列表（可邀請的對象） */
  getNearbyPlayers: protectedProcedure.input(z.object({
    nodeId: z.string(),
  })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return [];
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) return [];
    // 取得同節點的玩家（排除自己）
    const players = await db.select({
      id: gameAgents.id,
      agentName: gameAgents.agentName,
      level: gameAgents.level,
      currentNodeId: gameAgents.currentNodeId,
    }).from(gameAgents)
      .where(and(
        eq(gameAgents.currentNodeId, input.nodeId),
        sql`${gameAgents.id} != ${agent.id}`,
        sql`${gameAgents.isNamed} = 1`
      ))
      .limit(20);
    return players;
  }),

  // ═══════════════════════════════════════════════════════════════
  // 組隊戰鬥系統：隊長發起 Boss 挑戰 → 隊員確認 → 開始戰鬥
  // ═══════════════════════════════════════════════════════════════

  /** 隊長發起 Boss 戰鬥邀請（通知所有隊員） */
  initiateBossBattle: protectedProcedure.input(z.object({
    partyId: z.number().int(),
    monsterId: z.string(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

    // 驗證隊長身份
    const [party] = await db.select().from(gameParties)
      .where(and(eq(gameParties.id, input.partyId), eq(gameParties.leaderId, agent.id)));
    if (!party) throw new TRPCError({ code: "FORBIDDEN", message: "只有隊長可以發起戰鬥" });
    if (party.status !== "waiting" && party.status !== "active")
      throw new TRPCError({ code: "BAD_REQUEST", message: "隊伍狀態異常" });

    // 驗證怪物存在
    const combatMonster = await getCombatMonsterById(input.monsterId);
    const staticMonster = MONSTERS.find(m => m.id === input.monsterId);
    const monsterData = combatMonster || staticMonster;
    if (!monsterData) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });

    // 檢查是否已有待處理的戰鬥邀請
    const [existing] = await db.select({ id: partyBattleInvites.id }).from(partyBattleInvites)
      .where(and(
        eq(partyBattleInvites.partyId, input.partyId),
        eq(partyBattleInvites.status, "pending"),
        sql`${partyBattleInvites.expiresAt} > ${Date.now()}`
      ));
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "已有待處理的戰鬥邀請" });

    const battleId = randomUUID();
    const now = Date.now();
    const expiresAt = now + 60 * 1000; // 60 秒內回應

    // 建立邀請，隊長自動接受
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const responses: Record<string, string> = {};
    responses[String(agent.id)] = "accepted";

    await db.insert(partyBattleInvites).values({
      partyId: input.partyId,
      battleId,
      initiatorAgentId: agent.id,
      monsterId: input.monsterId,
      monsterName: monsterData.name,
      status: "pending",
      responses,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      battleId,
      monsterName: monsterData.name,
      expiresAt,
      memberCount: memberIds.length,
      message: `已向隊員發出挑戰 ${monsterData.name} 的邀請，等待確認中...`,
    };
  }),

  /** 隊員回應戰鬥邀請（接受/拒絕） */
  respondBattleInvite: protectedProcedure.input(z.object({
    inviteId: z.number().int(),
    response: z.enum(["accepted", "declined"]),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

    const [invite] = await db.select().from(partyBattleInvites)
      .where(and(eq(partyBattleInvites.id, input.inviteId), eq(partyBattleInvites.status, "pending")));
    if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "邀請不存在或已過期" });
    if (invite.expiresAt < Date.now()) {
      await db.update(partyBattleInvites).set({ status: "expired", updatedAt: Date.now() })
        .where(eq(partyBattleInvites.id, input.inviteId));
      throw new TRPCError({ code: "BAD_REQUEST", message: "邀請已過期" });
    }

    // 驗證玩家在隊伍中
    const [party] = await db.select().from(gameParties).where(eq(gameParties.id, invite.partyId));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在" });
    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    if (!memberIds.includes(agent.id)) throw new TRPCError({ code: "FORBIDDEN", message: "您不在此隊伍中" });

    // 更新回應
    const responses: Record<string, string> = (invite.responses as Record<string, string>) ?? {};
    responses[String(agent.id)] = input.response;
    await db.update(partyBattleInvites).set({ responses, updatedAt: Date.now() })
      .where(eq(partyBattleInvites.id, input.inviteId));

    // 檢查是否所有隊員都已回應
    const allResponded = memberIds.every(mid => responses[String(mid)] !== undefined);
    const acceptedIds = memberIds.filter(mid => responses[String(mid)] === "accepted");

    return {
      message: input.response === "accepted" ? "已確認參戰" : "已拒絕參戰",
      allResponded,
      acceptedCount: acceptedIds.length,
      totalMembers: memberIds.length,
      responses,
    };
  }),

  /** 查詢當前待處理的戰鬥邀請 */
  getPendingBattleInvite: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) return null;

    // 找到玩家所在隊伍
    const partyRow = await isInParty(db, agent.id);
    if (!partyRow) return null;

    // 過期清理
    await db.update(partyBattleInvites).set({ status: "expired", updatedAt: Date.now() })
      .where(and(eq(partyBattleInvites.status, "pending"), sql`${partyBattleInvites.expiresAt} < ${Date.now()}`));

    const [invite] = await db.select().from(partyBattleInvites)
      .where(and(
        eq(partyBattleInvites.partyId, partyRow.id),
        eq(partyBattleInvites.status, "pending"),
      ));
    if (!invite) return null;

    // 查詢隊員名稱
    const [party] = await db.select().from(gameParties).where(eq(gameParties.id, partyRow.id));
    const memberIds: number[] = party ? (Array.isArray(party.memberIds) ? (party.memberIds as number[]) : []) : [];
    const responses = (invite.responses as Record<string, string>) ?? {};
    const myResponse = responses[String(agent.id)];

    return {
      id: invite.id,
      battleId: invite.battleId,
      monsterName: invite.monsterName,
      monsterId: invite.monsterId,
      initiatorAgentId: invite.initiatorAgentId,
      expiresAt: invite.expiresAt,
      responses,
      myResponse,
      totalMembers: memberIds.length,
      acceptedCount: memberIds.filter(mid => responses[String(mid)] === "accepted").length,
      isLeader: agent.id === party?.leaderId,
    };
  }),

  /** 隊長確認開始組隊戰鬥（所有接受的隊員進入戰鬥） */
  startPartyBattle: protectedProcedure.input(z.object({
    inviteId: z.number().int(),
  })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const agent = await getAgentByUserId(db, ctx.user.id);
    if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

    const [invite] = await db.select().from(partyBattleInvites)
      .where(and(eq(partyBattleInvites.id, input.inviteId), eq(partyBattleInvites.status, "pending")));
    if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "邀請不存在" });
    if (invite.initiatorAgentId !== agent.id)
      throw new TRPCError({ code: "FORBIDDEN", message: "只有隊長可以開始戰鬥" });

    const [party] = await db.select().from(gameParties).where(eq(gameParties.id, invite.partyId));
    if (!party) throw new TRPCError({ code: "NOT_FOUND", message: "隊伍不存在" });

    const memberIds: number[] = Array.isArray(party.memberIds) ? (party.memberIds as number[]) : [];
    const responses = (invite.responses as Record<string, string>) ?? {};
    const acceptedIds = memberIds.filter(mid => responses[String(mid)] === "accepted");

    if (acceptedIds.length === 0)
      throw new TRPCError({ code: "BAD_REQUEST", message: "沒有隊員接受挑戰" });

    // 取得怪物
    const combatMonster = await getCombatMonsterById(invite.monsterId);
    const staticMonster = MONSTERS.find(m => m.id === invite.monsterId);
    const monsterData = combatMonster || staticMonster;
    if (!monsterData) throw new TRPCError({ code: "NOT_FOUND", message: "怪物不存在" });

    // 取得所有接受的隊員 agent 資料
    const acceptedAgents = await db.select().from(gameAgents)
      .where(sql`${gameAgents.id} IN (${sql.join(acceptedIds.map(id => sql`${id}`), sql`, `)})`);

    // 建立戰鬥記錄
    const battleId = invite.battleId;
    const now = Date.now();
    const engineCfg = getEngineConfig();
    const turnTimer = invite.monsterId.startsWith("boss_") ? engineCfg.battleTurnTimerBoss : engineCfg.battleTurnTimerPvE;

    await db.insert(gameBattles).values({
      battleId,
      mode: invite.monsterId.startsWith("boss_") ? "boss" : "map_mob",
      state: "active",
      currentRound: 0,
      maxRounds: 30, // 組隊戰鬥回合數更多
      currentTurnIndex: 0,
      turnOrder: [],
      rewardMultiplier: 1.0,
      initiatorAgentId: agent.id,
      nodeId: acceptedAgents[0]?.currentNodeId ?? null,
      turnTimeLimit: turnTimer,
      partyId: invite.partyId,
      createdAt: now,
      updatedAt: now,
    });

    const [battleRow] = await db.select().from(gameBattles).where(eq(gameBattles.battleId, battleId));
    let nextId = 1;

    // 為每個接受的隊員建立參與者（玩家 + 寵物）
    for (const memberAgent of acceptedAgents) {
      // 讀取裝備加成
      const equipBonus = { hp: 0, atk: 0, def: 0, spd: 0, resistWood: 0, resistFire: 0, resistEarth: 0, resistMetal: 0, resistWater: 0 };
      const equippedIds = [
        memberAgent.equippedWeapon, memberAgent.equippedOffhand, memberAgent.equippedHead,
        memberAgent.equippedBody, memberAgent.equippedHands, memberAgent.equippedFeet,
        memberAgent.equippedRingA, memberAgent.equippedRingB, memberAgent.equippedNecklace, memberAgent.equippedAmulet,
      ].filter(Boolean) as string[];
      if (equippedIds.length > 0) {
        const equips = await db.select().from(gameEquipmentCatalog).where(inArray(gameEquipmentCatalog.equipId, equippedIds));
        for (const e of equips) {
          equipBonus.hp  += e.hpBonus       ?? 0;
          equipBonus.atk += e.attackBonus   ?? 0;
          equipBonus.def += e.defenseBonus  ?? 0;
          equipBonus.spd += e.speedBonus    ?? 0;
          const rb = (e.resistBonus as any) ?? {};
          equipBonus.resistWood  += rb.wood  ?? 0;
          equipBonus.resistFire  += rb.fire  ?? 0;
          equipBonus.resistEarth += rb.earth ?? 0;
          equipBonus.resistMetal += rb.metal ?? 0;
          equipBonus.resistWater += rb.water ?? 0;
        }
      }

      // 讀取裝備技能
      const equippedAgentSkills = await db.select({
        skillId: agentSkills.skillId,
        awakeTier: agentSkills.awakeTier,
      }).from(agentSkills).where(
        and(eq(agentSkills.agentId, memberAgent.id), eq(agentSkills.isEquipped, 1))
      );
      const agentSkillIds = equippedAgentSkills.map(s => s.skillId);
      let combatSkills: any[] = [];
      if (agentSkillIds.length > 0) {
        const skillData = await db.select({
          skillId: gameUnifiedSkillCatalog.skillId,
          name: gameUnifiedSkillCatalog.name,
          skillType: gameUnifiedSkillCatalog.skillType,
          wuxing: gameUnifiedSkillCatalog.wuxing,
          mpCost: gameUnifiedSkillCatalog.mpCost,
          cooldown: gameUnifiedSkillCatalog.cooldown,
          powerPercent: gameUnifiedSkillCatalog.powerPercent,
          targetType: gameUnifiedSkillCatalog.targetType,
        }).from(gameUnifiedSkillCatalog).where(inArray(gameUnifiedSkillCatalog.skillId, agentSkillIds));
        combatSkills = skillData.map(sk => {
          const equipped = equippedAgentSkills.find(e => e.skillId === sk.skillId);
          const mappedType = sk.skillType === "heal" ? "heal" :
            sk.skillType === "buff" ? "buff" :
            sk.skillType === "debuff" ? "buff" :
            sk.skillType === "passive" ? "buff" : "attack";
          return {
            id: `skill_${sk.skillId}`, name: sk.name, skillType: mappedType,
            damageMultiplier: (sk.powerPercent ?? 100) / 100, mpCost: sk.mpCost ?? 0,
            wuxing: sk.wuxing === "無" ? undefined : sk.wuxing ?? undefined,
            cooldown: sk.cooldown ?? 3, currentCooldown: 0,
            skillLevel: (equipped?.awakeTier ?? 0) + 1,
          };
        });
      }

      // 讀取天命技能
      const equippedQuestSkills = await db.select({
        skillId: gameLearnedQuestSkills.skillId,
        level: gameLearnedQuestSkills.level,
      }).from(gameLearnedQuestSkills).where(
        and(eq(gameLearnedQuestSkills.agentId, memberAgent.id), eq(gameLearnedQuestSkills.isEquipped, 1))
      );
      const questSkillIds = equippedQuestSkills.map(s => s.skillId);
      if (questSkillIds.length > 0) {
        const questSkillData = await db.select({
          id: gameQuestSkillCatalog.id,
          name: gameQuestSkillCatalog.name,
          skillType: gameQuestSkillCatalog.skillType,
          powerPercent: gameQuestSkillCatalog.powerPercent,
          mpCost: gameQuestSkillCatalog.mpCost,
          cooldown: gameQuestSkillCatalog.cooldown,
          wuxing: gameQuestSkillCatalog.wuxing,
        }).from(gameQuestSkillCatalog).where(inArray(gameQuestSkillCatalog.id, questSkillIds));
        for (const qs of questSkillData) {
          const learned = equippedQuestSkills.find(e => e.skillId === qs.id);
          const mappedType = qs.skillType === "heal" ? "heal" :
            qs.skillType === "buff" ? "buff" :
            qs.skillType === "utility" ? "buff" : "attack";
          combatSkills.push({
            id: `quest_${qs.id}`, name: qs.name, skillType: mappedType,
            damageMultiplier: (qs.powerPercent ?? 100) / 100, mpCost: qs.mpCost ?? 0,
            wuxing: qs.wuxing ?? undefined, cooldown: qs.cooldown ?? 3, currentCooldown: 0,
            skillLevel: learned?.level ?? 1,
          });
        }
      }

      // 建立角色參與者
      const wuxing = {
        wood: memberAgent.wuxingWood ?? 0, fire: memberAgent.wuxingFire ?? 0,
        earth: memberAgent.wuxingEarth ?? 0, metal: memberAgent.wuxingMetal ?? 0,
        water: memberAgent.wuxingWater ?? 0,
      };
      const cfg = getStatBalanceConfig();
      const caps = getStatCaps();
      const rawStats = calcCharacterStatsV2(wuxing, memberAgent.level ?? 1, cfg);
      const stats = {
        hp: Math.min(rawStats.hp + equipBonus.hp, caps.hp),
        mp: Math.min(rawStats.mp, caps.mp),
        atk: Math.min(rawStats.atk + equipBonus.atk, caps.atk),
        def: Math.min(rawStats.def + equipBonus.def, caps.def),
        spd: Math.min(rawStats.spd + equipBonus.spd, caps.spd),
        matk: Math.min(rawStats.matk, caps.matk),
        mdef: Math.min(rawStats.mdef, caps.mdef),
      };
      const elements = Object.entries(wuxing) as [string, number][];
      elements.sort((a, b) => b[1] - a[1]);
      const dominantElement = elements[0][1] > 0 ? elements[0][0] : "earth";

      // 玩家在後排（寵物在前排）
      await db.insert(gameBattleParticipants).values({
        battleId: battleRow.id,
        participantType: "character",
        side: "ally",
        agentId: memberAgent.id,
        displayName: memberAgent.agentName || "修行者",
        level: memberAgent.level ?? 1,
        maxHp: stats.hp, currentHp: stats.hp,
        maxMp: stats.mp, currentMp: stats.mp,
        attack: stats.atk, defense: stats.def,
        magicAttack: stats.matk, magicDefense: stats.mdef,
        speed: stats.spd,
        dominantElement,
        equippedSkills: combatSkills as any,
        isDefending: 0, isDefeated: 0, speedScore: 0,
        skillCooldowns: {} as any, activeBuffs: [] as any,
        actionsPerTurn: 1,
        rowPosition: "back", // 玩家在後排
      });
      nextId++;

      // 寵物在前排
      const [activePet] = await db.select().from(gamePlayerPets)
        .where(and(eq(gamePlayerPets.agentId, memberAgent.id), eq(gamePlayerPets.isActive, 1)));
      if (activePet) {
        const [petCat] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, activePet.petCatalogId));
        if (petCat) {
          const innateSkills = await db.select().from(gamePetInnateSkills)
            .where(eq(gamePetInnateSkills.petCatalogId, activePet.petCatalogId));
          (activePet as any).innateSkills = innateSkills.map(s => ({
            id: s.id, name: s.name, skillType: s.skillType,
            damageMultiplier: (s.powerPercent ?? 100) / 100, mpCost: s.mpCost ?? 0,
            wuxing: s.wuxing ?? undefined, cooldown: s.cooldown ?? 3,
          }));
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

          const bp = {
            constitution: activePet.bpConstitution ?? 0, strength: activePet.bpStrength ?? 0,
            defense: activePet.bpDefense ?? 0, agility: activePet.bpAgility ?? 0,
            magic: activePet.bpMagic ?? 0,
          };
          const raceHpMul = petCat.race ? (({ dragon: 1.3, undead: 1.2, normal: 1.0, flying: 1.0, insect: 0.9, plant: 0.8 } as any)[petCat.race] ?? 1.0) : 1.0;
          const ownerStats = { hp: stats.hp, atk: stats.atk, def: stats.def, spd: stats.spd, matk: stats.matk, mp: stats.mp };
          const petStats = calcPetStatsGD024(ownerStats, activePet.level ?? 1, bp, raceHpMul);
          const petSkills = petSkillsToCombatFormat(
            (activePet as any).innateSkills ?? [],
            (activePet as any).destinySkills ?? [],
          ).map(s => ({ ...s, cooldown: s.cooldown ?? 0, currentCooldown: 0 }));

          await db.insert(gameBattleParticipants).values({
            battleId: battleRow.id,
            participantType: "pet",
            side: "ally",
            agentId: memberAgent.id,
            petId: activePet.id,
            displayName: activePet.nickname || petCat.name || "靈寵",
            level: activePet.level ?? 1,
            maxHp: petStats.hp, currentHp: petStats.hp,
            maxMp: petStats.mp, currentMp: petStats.mp,
            attack: petStats.attack, defense: petStats.defense,
            magicAttack: petStats.magicAttack,
            magicDefense: (petStats as any).mdef ?? Math.floor(petStats.defense * 0.6),
            speed: petStats.speed,
            dominantElement: (petCat.wuxing || "earth") as any,
            race: petCat.race ?? null,
            equippedSkills: petSkills as any,
            isDefending: 0, isDefeated: 0, speedScore: 0,
            skillCooldowns: {} as any, activeBuffs: [] as any,
            actionsPerTurn: 1,
            rowPosition: "front", // 寵物在前排
          });
          nextId++;
        }
      }
    }

    // 加入怪物參與者
    const isBossMode = invite.monsterId.startsWith("boss_");
    const monsterCount = isBossMode ? 1 : Math.min(acceptedIds.length + 1, 5); // 組隊戰怪物數量與隊員數相當
    for (let mi = 0; mi < monsterCount; mi++) {
      const cm = combatMonster || staticMonster;
      if (!cm) break;
      const level = cm.level;
      const levelScale = 1;
      const monsterSkills = ((cm as any).dbSkills ?? []).map((s: any) => ({
        id: s.id, name: s.name, skillType: s.skillType,
        damageMultiplier: (s.powerPercent ?? 100) / 100, mpCost: s.mpCost ?? 0,
        wuxing: s.wuxing, cooldown: s.cooldown ?? 0, currentCooldown: 0,
      }));

      await db.insert(gameBattleParticipants).values({
        battleId: battleRow.id,
        participantType: "monster",
        side: "enemy",
        monsterId: invite.monsterId,
        displayName: monsterCount > 1 && mi > 0 ? `${cm.name} (${mi + 1})` : cm.name,
        level,
        maxHp: Math.floor(cm.hp * levelScale),
        currentHp: Math.floor(cm.hp * levelScale),
        maxMp: (cm as any).baseMp ?? Math.floor(30 + level * 2),
        currentMp: (cm as any).baseMp ?? Math.floor(30 + level * 2),
        attack: Math.floor(cm.attack * levelScale),
        defense: Math.floor(cm.defense * levelScale),
        magicAttack: (cm as any).magicAttack ?? Math.floor(cm.attack * 0.8),
        magicDefense: Math.floor(cm.defense * 0.6),
        speed: Math.floor(cm.speed * levelScale),
        dominantElement: cm.element as any,
        race: (cm as any).race ?? null,
        equippedSkills: monsterSkills as any,
        isDefending: 0, isDefeated: 0, speedScore: 0,
        skillCooldowns: {} as any, activeBuffs: [] as any,
        actionsPerTurn: (cm as any).actionsPerTurn ?? 1,
        rowPosition: "front",
      });
      nextId++;
    }

    // 更新邀請狀態
    await db.update(partyBattleInvites).set({ status: "started", updatedAt: Date.now() })
      .where(eq(partyBattleInvites.id, input.inviteId));

    // 更新隊伍狀態
    await db.update(gameParties).set({ status: "active", updatedAt: Date.now() })
      .where(eq(gameParties.id, invite.partyId));

    return {
      battleId,
      message: `組隊戰鬥開始！${acceptedIds.length} 位隊員參戰`,
      participantCount: acceptedIds.length,
    };
  }),
});
