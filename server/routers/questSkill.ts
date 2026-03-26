import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { getDb } from "../db";
import {
  gameNpcCatalog,
  gameQuestSkillCatalog,
  gameQuestSteps,
  gameQuestProgress,
  gameLearnedQuestSkills,
  type InsertGameNpcCatalog,
  type InsertGameQuestSkillCatalog,
  type InsertGameQuestStep,
} from "../../drizzle/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { gameAgents } from "../../drizzle/schema";

// ═══════════════════════════════════════════════════════════════════════
// NPC 圖鑑 CRUD
// ═══════════════════════════════════════════════════════════════════════

const npcRouter = router({
  /** 取得所有 NPC */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    return db!.select().from(gameNpcCatalog).orderBy(asc(gameNpcCatalog.sortOrder));
  }),

  /** 取得單一 NPC */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    const [npc] = await db!.select().from(gameNpcCatalog).where(eq(gameNpcCatalog.id, input.id));
    return npc ?? null;
  }),

  /** 新增 NPC */
  create: protectedProcedure
    .input(z.object({
      code: z.string(),
      name: z.string(),
      title: z.string().optional(),
      location: z.string().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      region: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      isHidden: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const [result] = await db!.insert(gameNpcCatalog).values({
        ...input,
        createdAt: now,
        updatedAt: now,
      } as InsertGameNpcCatalog);
      return { id: result.insertId };
    }),

  /** 更新 NPC */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      title: z.string().optional(),
      location: z.string().optional(),
      posX: z.number().optional(),
      posY: z.number().optional(),
      region: z.string().optional(),
      avatarUrl: z.string().optional(),
      description: z.string().optional(),
      isHidden: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;      
      await db!.update(gameNpcCatalog)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(gameNpcCatalog.id, id));
      return { success: true };
    }),

  /** 刪除 NPC */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(gameNpcCatalog).where(eq(gameNpcCatalog.id, input.id));
      return { success: true };
    }),

  /** 批量新增 NPC（用於種子資料匯入） */
  batchCreate: protectedProcedure
    .input(z.object({
      npcs: z.array(z.object({
        code: z.string(),
        name: z.string(),
        title: z.string().optional(),
        location: z.string().optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        region: z.string().optional(),
        avatarUrl: z.string().optional(),
        description: z.string().optional(),
        isHidden: z.number().optional(),
        sortOrder: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const values = input.npcs.map((npc: any, i: number) => ({
        ...npc,
        sortOrder: npc.sortOrder ?? i,
        createdAt: now,
        updatedAt: now,
      } as InsertGameNpcCatalog));
      if (values.length > 0) {
        await db!.insert(gameNpcCatalog).values(values);
      }
      return { count: values.length };
    }),
});

// ═══════════════════════════════════════════════════════════════════════
// 天命考核技能圖鑑 CRUD
// ═══════════════════════════════════════════════════════════════════════

const skillCatalogRouter = router({
  /** 取得所有技能（含 NPC 資訊） */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    const skills = await db!.select().from(gameQuestSkillCatalog).orderBy(asc(gameQuestSkillCatalog.sortOrder));
    // 取得關聯的 NPC
    const npcIds = Array.from(new Set(skills.map((s: any) => s.npcId).filter(Boolean))) as number[];
    let npcMap: Record<number, typeof gameNpcCatalog.$inferSelect> = {};
    if (npcIds.length > 0) {
      const npcs = await db!.select().from(gameNpcCatalog).where(inArray(gameNpcCatalog.id, npcIds));
      npcMap = Object.fromEntries(npcs.map((n: any) => [n.id, n]));
    }
    return skills.map((s: any) => ({
      ...s,
      npc: s.npcId ? npcMap[s.npcId] ?? null : null,
    }));
  }),

  /** 按分類取得技能 */
  listByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return (await getDb())!.select().from(gameQuestSkillCatalog)
        .where(eq(gameQuestSkillCatalog.category, input.category))
        .orderBy(asc(gameQuestSkillCatalog.sortOrder));
    }),

  /** 取得單一技能（含步驟） */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    const [skill] = await db!.select().from(gameQuestSkillCatalog).where(eq(gameQuestSkillCatalog.id, input.id));
    if (!skill) return null;
    const steps = await db!.select().from(gameQuestSteps)
      .where(eq(gameQuestSteps.skillId, input.id))
      .orderBy(asc(gameQuestSteps.stepNumber));
    const npc = skill.npcId
      ? (await db!.select().from(gameNpcCatalog).where(eq(gameNpcCatalog.id, skill.npcId)))[0] ?? null
      : null;
    return { ...skill, steps, npc };
  }),

  /** 新增技能 */
  create: protectedProcedure
    .input(z.object({
      code: z.string(),
      name: z.string(),
      questTitle: z.string().optional(),
      category: z.string(),
      skillType: z.string().optional(),
      description: z.string().optional(),
      wuxing: z.string().optional(),
      powerPercent: z.number().optional(),
      mpCost: z.number().optional(),
      cooldown: z.number().optional(),
      maxLevel: z.number().optional(),
      levelUpBonus: z.number().optional(),
      additionalEffect: z.any().optional(),
      specialMechanic: z.any().optional(),
      learnCost: z.any().optional(),
      prerequisites: z.any().optional(),
      npcId: z.number().optional(),
      rarity: z.string().optional(),
      iconUrl: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const [result] = await db!.insert(gameQuestSkillCatalog).values({
        ...input,
        createdAt: now,
        updatedAt: now,
      } as InsertGameQuestSkillCatalog);
      return { id: result.insertId };
    }),

  /** 更新技能 */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      questTitle: z.string().optional(),
      category: z.string().optional(),
      skillType: z.string().optional(),
      description: z.string().optional(),
      wuxing: z.string().optional(),
      powerPercent: z.number().optional(),
      mpCost: z.number().optional(),
      cooldown: z.number().optional(),
      maxLevel: z.number().optional(),
      levelUpBonus: z.number().optional(),
      additionalEffect: z.any().optional(),
      specialMechanic: z.any().optional(),
      learnCost: z.any().optional(),
      prerequisites: z.any().optional(),
      npcId: z.number().optional(),
      rarity: z.string().optional(),
      iconUrl: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db!.update(gameQuestSkillCatalog)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(gameQuestSkillCatalog.id, id));
      return { success: true };
    }),

  /** 刪除技能（連同步驟） */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(gameQuestSteps).where(eq(gameQuestSteps.skillId, input.id));
      await db!.delete(gameQuestSkillCatalog).where(eq(gameQuestSkillCatalog.id, input.id));
      return { success: true };
    }),

  /** 批量新增技能（種子資料） */
  batchCreate: protectedProcedure
    .input(z.object({
      skills: z.array(z.object({
        code: z.string(),
        name: z.string(),
        questTitle: z.string().optional(),
        category: z.string(),
        skillType: z.string().optional(),
        description: z.string().optional(),
        wuxing: z.string().optional(),
        powerPercent: z.number().optional(),
        mpCost: z.number().optional(),
        cooldown: z.number().optional(),
        maxLevel: z.number().optional(),
        levelUpBonus: z.number().optional(),
        additionalEffect: z.any().optional(),
        specialMechanic: z.any().optional(),
        learnCost: z.any().optional(),
        prerequisites: z.any().optional(),
        npcId: z.number().optional(),
        rarity: z.string().optional(),
        iconUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const values = input.skills.map((s: any, i: number) => ({
        ...s,
        sortOrder: s.sortOrder ?? i,
        createdAt: now,
        updatedAt: now,
      } as InsertGameQuestSkillCatalog));
      if (values.length > 0) {
        await db!.insert(gameQuestSkillCatalog).values(values);
      }
      return { count: values.length };
    }),
});

// ═══════════════════════════════════════════════════════════════════════
// 任務步驟 CRUD
// ═══════════════════════════════════════════════════════════════════════

const questStepRouter = router({
  /** 取得某技能的所有步驟 */
  listBySkill: publicProcedure
    .input(z.object({ skillId: z.number() }))
    .query(async ({ input }) => {
      return (await getDb())!.select().from(gameQuestSteps)
        .where(eq(gameQuestSteps.skillId, input.skillId))
        .orderBy(asc(gameQuestSteps.stepNumber));
    }),

  /** 新增步驟 */
  create: protectedProcedure
    .input(z.object({
      skillId: z.number(),
      stepNumber: z.number(),
      title: z.string(),
      dialogue: z.string().optional(),
      objective: z.string().optional(),
      location: z.string().optional(),
      objectives: z.any().optional(),
      rewards: z.any().optional(),
      specialNote: z.string().optional(),
      npcId: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const [result] = await db!.insert(gameQuestSteps).values({
        ...input,
        createdAt: now,
        updatedAt: now,
      } as InsertGameQuestStep);
      return { id: result.insertId };
    }),

  /** 更新步驟 */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      stepNumber: z.number().optional(),
      title: z.string().optional(),
      dialogue: z.string().optional(),
      objective: z.string().optional(),
      location: z.string().optional(),
      objectives: z.any().optional(),
      rewards: z.any().optional(),
      specialNote: z.string().optional(),
      npcId: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db!.update(gameQuestSteps)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(gameQuestSteps.id, id));
      return { success: true };
    }),

  /** 刪除步驟 */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(gameQuestSteps).where(eq(gameQuestSteps.id, input.id));
      return { success: true };
    }),

  /** 批量新增步驟（種子資料） */
  batchCreate: protectedProcedure
    .input(z.object({
      steps: z.array(z.object({
        skillId: z.number(),
        stepNumber: z.number(),
        title: z.string(),
        dialogue: z.string().optional(),
        objective: z.string().optional(),
        location: z.string().optional(),
        objectives: z.any().optional(),
        rewards: z.any().optional(),
        specialNote: z.string().optional(),
        npcId: z.number().optional(),
        sortOrder: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const values = input.steps.map((s: any, i: number) => ({
        ...s,
        sortOrder: s.sortOrder ?? i,
        createdAt: now,
        updatedAt: now,
      } as InsertGameQuestStep));
      if (values.length > 0) {
        await db!.insert(gameQuestSteps).values(values);
      }
      return { count: values.length };
    }),
});

// ═══════════════════════════════════════════════════════════════════════
// 玩家任務進度追蹤 + 前置條件檢查
// ═══════════════════════════════════════════════════════════════════════

const questProgressRouter = router({
  /** 取得玩家所有任務進度 */
  myProgress: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    // 找到玩家的 agent
    const agentId = await getAgentId(ctx.user.id);
    if (!agentId) return [];
    const progress = await db!.select().from(gameQuestProgress)
      .where(eq(gameQuestProgress.agentId, agentId));
    return progress;
  }),

  /** 取得玩家已習得的天命考核技能 */
  myLearnedSkills: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const agentId = await getAgentId(ctx.user.id);
    if (!agentId) return [];
    const learned = await db!.select().from(gameLearnedQuestSkills)
      .where(eq(gameLearnedQuestSkills.agentId, agentId));
    // 取得技能詳情
    if (learned.length === 0) return [];
    const skillIds = learned.map(l => l.skillId);
    const skills = await db!.select().from(gameQuestSkillCatalog)
      .where(inArray(gameQuestSkillCatalog.id, skillIds));
    const skillMap = Object.fromEntries(skills.map(s => [s.id, s]));
    return learned.map(l => ({
      ...l,
      skill: skillMap[l.skillId] ?? null,
    }));
  }),

  /** 開始任務鏈 */
  startQuest: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) throw new Error("找不到你的角色");

      // 檢查是否已開始
      const [existing] = await db!.select().from(gameQuestProgress)
        .where(and(
          eq(gameQuestProgress.agentId, agentId),
          eq(gameQuestProgress.skillId, input.skillId),
        ));
      if (existing && existing.status !== "not_started") {
        throw new Error("你已經開始了這個任務鏈");
      }

      // 檢查前置條件
      const prereqResult = await checkPrerequisites(agentId, input.skillId);
      if (!prereqResult.passed) {
        throw new Error(`前置條件未滿足：${prereqResult.reason}`);
      }

      const now = Date.now();
      if (existing) {
        await db!.update(gameQuestProgress)
          .set({ currentStep: 1, status: "in_progress", startedAt: now, updatedAt: now })
          .where(eq(gameQuestProgress.id, existing.id));
      } else {
        await db!.insert(gameQuestProgress).values({
          agentId,
          skillId: input.skillId,
          currentStep: 1,
          status: "in_progress",
          startedAt: now,
          updatedAt: now,
        });
      }
      return { success: true, message: "任務鏈已開始！" };
    }),

  /** 推進任務步驟（完成當前步驟，進入下一步） */
  advanceStep: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) throw new Error("找不到你的角色");

      const [progress] = await db!.select().from(gameQuestProgress)
        .where(and(
          eq(gameQuestProgress.agentId, agentId),
          eq(gameQuestProgress.skillId, input.skillId),
        ));
      if (!progress || progress.status !== "in_progress") {
        throw new Error("任務鏈尚未開始或已完成");
      }

      // 取得所有步驟
      const steps = await db!.select().from(gameQuestSteps)
        .where(eq(gameQuestSteps.skillId, input.skillId))
        .orderBy(asc(gameQuestSteps.stepNumber));

      const currentStepIdx = steps.findIndex(s => s.stepNumber === progress.currentStep);
      const nextStep = steps[currentStepIdx + 1];

      const now = Date.now();
      if (nextStep) {
        // 進入下一步
        await db!.update(gameQuestProgress)
          .set({
            currentStep: nextStep.stepNumber,
            stepProgress: null,
            updatedAt: now,
          })
          .where(eq(gameQuestProgress.id, progress.id));
        return { success: true, message: `進入步驟 ${nextStep.stepNumber}：${nextStep.title}`, nextStep: nextStep.stepNumber };
      } else {
        // 所有步驟完成，進入最終確認
        await db!.update(gameQuestProgress)
          .set({
            currentStep: 99,
            status: "ready_to_confirm",
            updatedAt: now,
          })
          .where(eq(gameQuestProgress.id, progress.id));
        return { success: true, message: "所有步驟完成！準備進行最終確認。", nextStep: 99 };
      }
    }),

  /** 最終確認 — 支付代價並習得技能 */
  confirmLearn: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) throw new Error("找不到你的角色");

      const [progress] = await db!.select().from(gameQuestProgress)
        .where(and(
          eq(gameQuestProgress.agentId, agentId),
          eq(gameQuestProgress.skillId, input.skillId),
        ));
      if (!progress || progress.status !== "ready_to_confirm") {
        throw new Error("任務鏈尚未完成所有步驟");
      }

      // 取得技能資料以檢查代價
      const [skill] = await db!.select().from(gameQuestSkillCatalog)
        .where(eq(gameQuestSkillCatalog.id, input.skillId));
      if (!skill) throw new Error("找不到技能資料");

      // TODO: 在這裡扣除 learnCost（金幣、魂晶、道具等）
      // 目前先跳過代價扣除，直接習得

      const now = Date.now();

      // 更新進度為已完成
      await db!.update(gameQuestProgress)
        .set({
          currentStep: 100,
          status: "completed",
          completedAt: now,
          skillLevel: 1,
          updatedAt: now,
        })
        .where(eq(gameQuestProgress.id, progress.id));

      // 新增已習得技能
      const [existing] = await db!.select().from(gameLearnedQuestSkills)
        .where(and(
          eq(gameLearnedQuestSkills.agentId, agentId),
          eq(gameLearnedQuestSkills.skillId, input.skillId),
        ));
      if (!existing) {
        await db!.insert(gameLearnedQuestSkills).values({
          agentId,
          skillId: input.skillId,
          level: 1,
          exp: 0,
          isEquipped: 0,
          slotIndex: 0,
          learnedAt: now,
          updatedAt: now,
        });
      }

      return { success: true, message: `恭喜！你已習得「${skill.name}」！` };
    }),

  /** 裝備/卸下天命考核技能到主技能欄 */
  equipSkill: protectedProcedure
    .input(z.object({
      skillId: z.number(),
      slotIndex: z.number().min(1).max(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) throw new Error("找不到你的角色");

      // 確認已習得
      const [learned] = await db!.select().from(gameLearnedQuestSkills)
        .where(and(
          eq(gameLearnedQuestSkills.agentId, agentId),
          eq(gameLearnedQuestSkills.skillId, input.skillId),
        ));
      if (!learned) throw new Error("尚未習得此技能");

      // 先清除該欄位上的其他天命技能
      await db!.update(gameLearnedQuestSkills)
        .set({ isEquipped: 0, slotIndex: 0, updatedAt: Date.now() })
        .where(and(
          eq(gameLearnedQuestSkills.agentId, agentId),
          eq(gameLearnedQuestSkills.slotIndex, input.slotIndex),
        ));

      // 裝備到指定欄位
      await db!.update(gameLearnedQuestSkills)
        .set({ isEquipped: 1, slotIndex: input.slotIndex, updatedAt: Date.now() })
        .where(eq(gameLearnedQuestSkills.id, learned.id));

      return { success: true };
    }),

  /** 卸下天命考核技能 */
  unequipSkill: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) throw new Error("找不到你的角色");

      await db!.update(gameLearnedQuestSkills)
        .set({ isEquipped: 0, slotIndex: 0, updatedAt: Date.now() })
        .where(and(
          eq(gameLearnedQuestSkills.agentId, agentId),
          eq(gameLearnedQuestSkills.skillId, input.skillId),
        ));

      return { success: true };
    }),

  /** 檢查前置條件（公開查詢，讓前端顯示） */
  checkPrereqs: protectedProcedure
    .input(z.object({ skillId: z.number() }))
    .query(async ({ ctx, input }) => {
      const agentId = await getAgentId(ctx.user.id);
      if (!agentId) return { passed: false, reason: "找不到你的角色" };
      return checkPrerequisites(agentId, input.skillId);
    }),
});

// ═══════════════════════════════════════════════════════════════════════
// 輔助函數
// ═══════════════════════════════════════════════════════════════════════

/** 從 userId 取得 agentId */
async function getAgentId(userId: number): Promise<number | null> {
  const db = await getDb();
  const [row] = await db!.execute(
    sql`SELECT id FROM game_agents WHERE user_id = ${userId} LIMIT 1`
  ) as any;
  if (Array.isArray(row) && row.length > 0) return row[0].id;
  return null;
}

/** 檢查前置條件 */
async function checkPrerequisites(agentId: number, skillId: number): Promise<{ passed: boolean; reason: string }> {
  const db = await getDb();
  const [skill] = await db!.select().from(gameQuestSkillCatalog)
    .where(eq(gameQuestSkillCatalog.id, skillId));
  if (!skill) return { passed: false, reason: "找不到技能資料" };

  const prereqs = skill.prerequisites as any;
  if (!prereqs) return { passed: true, reason: "" };

  // 檢查前置技能
  if (prereqs.skills && Array.isArray(prereqs.skills) && prereqs.skills.length > 0) {
    // 取得已習得的技能代碼
    const learned = await db!.select().from(gameLearnedQuestSkills)
      .where(eq(gameLearnedQuestSkills.agentId, agentId));
    const learnedSkillIds = learned.map((l: any) => l.skillId);
    
    let learnedCodes: string[] = [];
    if (learnedSkillIds.length > 0) {
      const skills = await db!.select({ code: gameQuestSkillCatalog.code })
        .from(gameQuestSkillCatalog)
        .where(inArray(gameQuestSkillCatalog.id, learnedSkillIds));
      learnedCodes = skills.map((s: any) => s.code);
    }

    for (const reqCode of prereqs.skills) {
      // 特殊處理「任一魔法」
      if (reqCode === "any_magic") {
        const hasMagic = learnedCodes.some(c => c.startsWith("M"));
        if (!hasMagic) return { passed: false, reason: "需要先習得任一魔法攻擊技能" };
      } else {
        if (!learnedCodes.includes(reqCode)) {
          return { passed: false, reason: `需要先習得技能 ${reqCode}` };
        }
      }
    }
  }

  // 檢查等級要求
  if (prereqs.level) {
    const [agent] = await db!.execute(
      sql`SELECT level FROM game_agents WHERE id = ${agentId} LIMIT 1`
    ) as any;
    const agentLevel = Array.isArray(agent) && agent.length > 0 ? agent[0].level : 1;
    if (agentLevel < prereqs.level) {
      return { passed: false, reason: `需要角色等級 ${prereqs.level} 以上（目前 ${agentLevel}）` };
    }
  }

  // 檢查特殊條件（文字描述，無法自動驗證的由管理員手動確認）
  if (prereqs.special) {
    // 特殊條件目前只做提示，不阻擋
    // 未來可加入更精確的檢查
  }

  return { passed: true, reason: "" };
}

// ═══════════════════════════════════════════════════════════════════════
// 組合匯出
// ═══════════════════════════════════════════════════════════════════════

export const questSkillRouter = router({
  npc: npcRouter,
  catalog: skillCatalogRouter,
  step: questStepRouter,
  progress: questProgressRouter,
});
