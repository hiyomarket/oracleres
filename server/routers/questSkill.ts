import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { getDb } from "../db";
import {
  gameNpcCatalog,
  gameUnifiedSkillCatalog,
  gameQuestSteps,
  gameQuestProgress,
  gameLearnedQuestSkills,
  agentInventory,
  gameItemCatalog,
  type InsertGameNpcCatalog,
  type InsertGameUnifiedSkillCatalog,
  type InsertGameQuestStep,
} from "../../drizzle/schema";
import { eq, and, sql, desc, asc, inArray, like } from "drizzle-orm";
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
    const skills = await db!.select().from(gameUnifiedSkillCatalog).orderBy(asc(gameUnifiedSkillCatalog.sortOrder));
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
      return (await getDb())!.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.category, input.category))
        .orderBy(asc(gameUnifiedSkillCatalog.sortOrder));
    }),

  /** 取得單一技能（含步驟） */
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    const [skill] = await db!.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.id, input.id));
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
      targetType: z.string().optional(),
      scaleStat: z.string().optional(),
      rarity: z.string().optional(),
      petLearnable: z.number().optional(),
      playerLearnable: z.number().optional(),
      iconUrl: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const [result] = await db!.insert(gameUnifiedSkillCatalog).values({
        ...input,
        createdAt: now,
        updatedAt: now,
      } as InsertGameUnifiedSkillCatalog);
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
      targetType: z.string().optional(),
      scaleStat: z.string().optional(),
      rarity: z.string().optional(),
      petLearnable: z.number().optional(),
      playerLearnable: z.number().optional(),
      iconUrl: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      await db!.update(gameUnifiedSkillCatalog)
        .set({ ...data, updatedAt: Date.now() })
        .where(eq(gameUnifiedSkillCatalog.id, id));
      return { success: true };
    }),

  /** 刪除技能（連同步驟） */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(gameQuestSteps).where(eq(gameQuestSteps.skillId, input.id));
      await db!.delete(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.id, input.id));
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
      } as InsertGameUnifiedSkillCatalog));
      if (values.length > 0) {
        await db!.insert(gameUnifiedSkillCatalog).values(values);
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
    const skills = await db!.select().from(gameUnifiedSkillCatalog)
      .where(inArray(gameUnifiedSkillCatalog.id, skillIds));
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
      if (currentStepIdx < 0) throw new Error("找不到當前步驟");
      const currentStep = steps[currentStepIdx];

      // ─── 道具繳交驗證 ───
      const objectives = (typeof currentStep.objectives === "string"
        ? JSON.parse(currentStep.objectives)
        : currentStep.objectives) as any;

      if (objectives && (objectives.type === "collect" || objectives.type === "deliver")) {
        const targets = objectives.targets as Array<{ name: string; count: number; itemId?: string }>;
        if (targets && targets.length > 0) {
          const missingItems: string[] = [];
          for (const target of targets) {
            // 用 itemId 或 name 查找道具
            let matchedItemId = target.itemId;
            if (!matchedItemId) {
              // 用名稱模糊匹配 gameItemCatalog
              const [catalogItem] = await db!.select({ itemId: gameItemCatalog.itemId })
                .from(gameItemCatalog)
                .where(eq(gameItemCatalog.name, target.name))
                .limit(1);
              matchedItemId = catalogItem?.itemId;
            }

            if (!matchedItemId) {
              missingItems.push(`${target.name} (道具不存在於圖鑑中)`);
              continue;
            }

            // 檢查背包中是否有足夠數量
            const [inv] = await db!.select({ quantity: agentInventory.quantity })
              .from(agentInventory)
              .where(and(
                eq(agentInventory.agentId, agentId),
                eq(agentInventory.itemId, matchedItemId),
              ))
              .limit(1);

            const held = inv?.quantity ?? 0;
            if (held < (target.count || 1)) {
              missingItems.push(`${target.name} (需要 ${target.count || 1} 個，持有 ${held} 個)`);
            }
          }

          if (missingItems.length > 0) {
            throw new Error(`道具不足，無法完成此步驟：\n${missingItems.join("\n")}`);
          }

          // 扣除道具
          for (const target of targets) {
            let matchedItemId = target.itemId;
            if (!matchedItemId) {
              const [catalogItem] = await db!.select({ itemId: gameItemCatalog.itemId })
                .from(gameItemCatalog)
                .where(eq(gameItemCatalog.name, target.name))
                .limit(1);
              matchedItemId = catalogItem?.itemId;
            }
            if (!matchedItemId) continue;

            const deductAmount = target.count || 1;
            // 減少數量
            await db!.execute(
              sql`UPDATE agent_inventory SET quantity = quantity - ${deductAmount}, updated_at = ${Date.now()} WHERE agent_id = ${agentId} AND item_id = ${matchedItemId} AND quantity >= ${deductAmount}`
            );
            // 刪除數量為 0 的道具
            await db!.execute(
              sql`DELETE FROM agent_inventory WHERE agent_id = ${agentId} AND item_id = ${matchedItemId} AND quantity <= 0`
            );
          }
        }
      }
      // ─── 道具繳交驗證結束 ───

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
      const [skill] = await db!.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.id, input.skillId));
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
  const [skill] = await db!.select().from(gameUnifiedSkillCatalog)
    .where(eq(gameUnifiedSkillCatalog.id, skillId));
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
      const skills = await db!.select({ code: gameUnifiedSkillCatalog.code })
        .from(gameUnifiedSkillCatalog)
        .where(inArray(gameUnifiedSkillCatalog.id, learnedSkillIds));
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
// 管理員一鍵種子匯入
// ═══════════════════════════════════════════════════════════════════════

const adminSeedRouter = router({
  /** 一鍵匯入 32 種天命技能 + NPC + 任務步驟 */
  seedAll: protectedProcedure
    .input(z.object({
      npcs: z.array(z.object({
        code: z.string(), name: z.string(), title: z.string().optional(),
        location: z.string().optional(), region: z.string().optional(),
      })),
      skills: z.array(z.object({
        code: z.string(), name: z.string(), questTitle: z.string().optional(),
        category: z.string(), skillType: z.string().optional(),
        description: z.string().optional(), wuxing: z.string().optional(),
        powerPercent: z.number().optional(), mpCost: z.number().optional(),
        cooldown: z.number().optional(), maxLevel: z.number().optional(),
        levelUpBonus: z.number().optional(),
        additionalEffect: z.any().optional(), specialMechanic: z.any().optional(),
        learnCost: z.any().optional(), prerequisites: z.any().optional(),
        rarity: z.string().optional(), sortOrder: z.number().optional(),
        npcCode: z.string().optional(),
      })),
      steps: z.record(z.string(), z.array(z.object({
        stepNumber: z.number(), title: z.string(),
        dialogue: z.string().optional(), objective: z.string().optional(),
        location: z.string().optional(), objectives: z.any().optional(),
        rewards: z.any().optional(),
      }))),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const now = Date.now();
      const results = { npcsCreated: 0, skillsCreated: 0, stepsCreated: 0, skipped: [] as string[] };

      // Step 1: 匯入 NPC（跳過已存在的）
      const existingNpcs = await db!.select({ code: gameNpcCatalog.code, id: gameNpcCatalog.id }).from(gameNpcCatalog);
      const npcCodeMap: Record<string, number> = {};
      for (const n of existingNpcs) npcCodeMap[n.code] = n.id;

      for (const npc of input.npcs) {
        if (npcCodeMap[npc.code]) continue;
        const [res] = await db!.insert(gameNpcCatalog).values({
          code: npc.code, name: npc.name, title: npc.title ?? null,
          location: npc.location ?? null, region: npc.region ?? "初界",
          createdAt: now, updatedAt: now,
        } as any);
        npcCodeMap[npc.code] = Number(res.insertId);
        results.npcsCreated++;
      }

      // Step 2: 匯入技能（跳過已存在的）
      const existingSkills = await db!.select({ code: gameUnifiedSkillCatalog.code, id: gameUnifiedSkillCatalog.id }).from(gameUnifiedSkillCatalog);
      const skillCodeMap: Record<string, number> = {};
      for (const s of existingSkills) skillCodeMap[s.code] = s.id;

      for (const skill of input.skills) {
        if (skillCodeMap[skill.code]) {
          results.skipped.push(skill.code);
          continue;
        }
        const npcId = skill.npcCode ? npcCodeMap[skill.npcCode] ?? null : null;
        const { npcCode, ...skillData } = skill;
        const [res] = await db!.insert(gameUnifiedSkillCatalog).values({
          ...skillData,
          npcId,
          createdAt: now, updatedAt: now,
        } as any);
        skillCodeMap[skill.code] = Number(res.insertId);
        results.skillsCreated++;
      }

      // Step 3: 匯入任務步驟（跳過已存在步驟的技能）
      for (const [skillCode, steps] of Object.entries(input.steps)) {
        const skillId = skillCodeMap[skillCode];
        if (!skillId) continue;

        // 檢查是否已有步驟
        const existingSteps = await db!.select({ id: gameQuestSteps.id }).from(gameQuestSteps)
          .where(eq(gameQuestSteps.skillId, skillId));
        if (existingSteps.length > 0) continue;

        for (const step of steps) {
          await db!.insert(gameQuestSteps).values({
            skillId,
            stepNumber: step.stepNumber,
            title: step.title,
            dialogue: step.dialogue ?? null,
            objective: step.objective ?? null,
            location: step.location ?? null,
            objectives: step.objectives ?? null,
            rewards: step.rewards ?? null,
            createdAt: now, updatedAt: now,
          } as any);
          results.stepsCreated++;
        }
      }

      return results;
    }),

  /** 一鍵匹入內建種子資料（後端直接讀取） */
  seedFromBuiltIn: protectedProcedure.mutation(async () => {
    // 動態 import 種子資料
    const { QUEST_NPCS, QUEST_SKILLS, QUEST_STEPS } = await import("../seeds/seedQuestSkills.mjs") as any;
    const db = await getDb();
    const now = Date.now();
    const results = { npcsCreated: 0, skillsCreated: 0, stepsCreated: 0, skipped: [] as string[] };

    // Step 1: 匹入 NPC
    const existingNpcs = await db!.select({ code: gameNpcCatalog.code, id: gameNpcCatalog.id }).from(gameNpcCatalog);
    const npcCodeMap: Record<string, number> = {};
    for (const n of existingNpcs) npcCodeMap[n.code] = n.id;
    for (const npc of QUEST_NPCS) {
      if (npcCodeMap[npc.code]) continue;
      const [res] = await db!.insert(gameNpcCatalog).values({
        code: npc.code, name: npc.name, title: npc.title ?? null,
        location: npc.location ?? null, region: npc.region ?? "初界",
        createdAt: now, updatedAt: now,
      } as any);
      npcCodeMap[npc.code] = Number(res.insertId);
      results.npcsCreated++;
    }

    // Step 2: 匹入技能
    const existingSkills = await db!.select({ code: gameUnifiedSkillCatalog.code, id: gameUnifiedSkillCatalog.id }).from(gameUnifiedSkillCatalog);
    const skillCodeMap: Record<string, number> = {};
    for (const s of existingSkills) skillCodeMap[s.code] = s.id;
    for (const skill of QUEST_SKILLS) {
      if (skillCodeMap[skill.code]) { results.skipped.push(skill.code); continue; }
      const npcId = skill.npcCode ? npcCodeMap[skill.npcCode] ?? null : null;
      const { npcCode, ...skillData } = skill;
      const [res] = await db!.insert(gameUnifiedSkillCatalog).values({
        ...skillData, npcId, createdAt: now, updatedAt: now,
      } as any);
      skillCodeMap[skill.code] = Number(res.insertId);
      results.skillsCreated++;
    }

    // Step 3: 匹入任務步驟
    for (const [skillCode, steps] of Object.entries(QUEST_STEPS) as [string, any[]][]) {
      const skillId = skillCodeMap[skillCode];
      if (!skillId) continue;
      const existingSteps = await db!.select({ id: gameQuestSteps.id }).from(gameQuestSteps)
        .where(eq(gameQuestSteps.skillId, skillId));
      if (existingSteps.length > 0) continue;
      for (const step of steps) {
        await db!.insert(gameQuestSteps).values({
          skillId, stepNumber: step.stepNumber, title: step.title,
          dialogue: step.dialogue ?? null, objective: step.objective ?? null,
          location: step.location ?? null, objectives: step.objectives ?? null,
          rewards: step.rewards ?? null, createdAt: now, updatedAt: now,
        } as any);
        results.stepsCreated++;
      }
    }
    return results;
  }),

  /** 清除所有天命技能種子資料（危險操作） */
  clearAll: protectedProcedure.mutation(async () => {
    const db = await getDb();
    await db!.delete(gameLearnedQuestSkills);
    await db!.delete(gameQuestProgress);
    await db!.delete(gameQuestSteps);
    await db!.delete(gameUnifiedSkillCatalog);
    await db!.delete(gameNpcCatalog);
    return { success: true, message: "已清除所有天命技能種子資料" };
  }),

  /** 取得種子資料匯入狀態 */
  seedStatus: publicProcedure.query(async () => {
    const db = await getDb();
    const [npcCount] = await db!.execute(sql`SELECT COUNT(*) as c FROM game_npc_catalog`) as any;
    const [skillCount] = await db!.execute(sql`SELECT COUNT(*) as c FROM game_quest_skill_catalog`) as any;
    const [stepCount] = await db!.execute(sql`SELECT COUNT(*) as c FROM game_quest_steps`) as any;
    return {
      npcs: Array.isArray(npcCount) ? npcCount[0]?.c ?? 0 : 0,
      skills: Array.isArray(skillCount) ? skillCount[0]?.c ?? 0 : 0,
      steps: Array.isArray(stepCount) ? stepCount[0]?.c ?? 0 : 0,
    };
  }),
});

// ═══════════════════════════════════════════════════════════════════════
// 組合匯出
// ═══════════════════════════════════════════════════════════════════════

export const questSkillRouter = router({
  npc: npcRouter,
  catalog: skillCatalogRouter,
  step: questStepRouter,
  progress: questProgressRouter,
  admin: adminSeedRouter,
});
