/**
 * 組隊系統 Router
 * 支援：建立隊伍、邀請成員、接受/拒絕邀請、離開隊伍、解散隊伍、查詢隊伍
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql, or } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameParties, gamePartyInvites, gameAgents } from "../../drizzle/schema";

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
});
