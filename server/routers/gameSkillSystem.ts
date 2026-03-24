/**
 * GD-022 技能系統 Router
 * P1 端點：技能圖鑑/玩家技能/裝備/技能書/覺醒/素材/追蹤器/天命廣播
 *
 * 欄位對照（實際 schema）：
 * skillTemplates: id(varchar PK), name, element, category, rarity, tier, mpCost,
 *   cooldown, effectDesc, effectValue, statusEffect, statusChance, targetType,
 *   acquireMethod, comboTags, isActive
 * agentSkills: id, agentId, skillId(FK→skillTemplates.id), awakeTier, useCount,
 *   installedSlot, acquiredAt
 * skillBooks: id, agentId, skillId, quantity, obtainedAt
 * awakeMaterials: id, agentId, materialType, quantity, updatedAt
 * hiddenSkillTrackers: id, agentId, trackerId, currentValue, targetValue, isUnlocked, unlockedAt
 * globalFirstTriggers: skillId(PK), firstAgentId, firstAgentName, triggeredAt
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, desc, sql, asc } from "drizzle-orm";
import {
  skillTemplates,
  agentSkills,
  skillBooks,
  awakeMaterials,
  hiddenSkillTrackers,
  globalFirstTriggers,
} from "../../drizzle/schema";
import { broadcastLiveFeed } from "../liveFeedBroadcast";

// ─── 霧化規則：隱藏技能在未習得前顯示為 ??? ──────────────────────────────
// skillTemplates 中 category = "hidden" 視為隱藏技能
function isHiddenSkill(template: { category: string }): boolean {
  return template.category === "hidden";
}

export const gameSkillSystemRouter = router({

  // ─── 1. 取得技能圖鑑（含霧化處理） ────────────────────────────────────────
  getSkillCatalog: protectedProcedure
    .input(z.object({
      element: z.enum(["wood", "fire", "earth", "metal", "water", "cross", "all"]).default("all"),
      agentId: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得技能模板
      const templates = input.element === "all"
        ? await db.select().from(skillTemplates)
            .where(eq(skillTemplates.isActive, 1))
            .orderBy(skillTemplates.element, skillTemplates.tier)
        : await db.select().from(skillTemplates)
            .where(and(
              eq(skillTemplates.isActive, 1),
              eq(skillTemplates.element, input.element)
            ))
            .orderBy(skillTemplates.tier);

      // 取得玩家已習得的技能
      let unlockedSet = new Set<string>();
      if (input.agentId) {
        const unlocked = await db.select({ skillId: agentSkills.skillId })
          .from(agentSkills)
          .where(eq(agentSkills.agentId, input.agentId));
        for (const s of unlocked) unlockedSet.add(s.skillId);
      }

      return templates.map(t => {
        const hidden = isHiddenSkill(t);
        const unlocked = unlockedSet.has(t.id);
        const fogged = hidden && !unlocked;
        return {
          ...t,
          fogged,
          displayName: fogged ? "???" : t.name,
          displayDesc: fogged ? "此技能尚未揭示，需達成特殊條件" : t.effectDesc,
          unlocked,
        };
      });
    }),

  // ─── 2. 取得玩家已習得技能列表（含覺醒進度） ──────────────────────────────
  getAgentSkills: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const skills = await db.select({
        agentSkill: agentSkills,
        template: skillTemplates,
      })
        .from(agentSkills)
        .innerJoin(skillTemplates, eq(agentSkills.skillId, skillTemplates.id))
        .where(eq(agentSkills.agentId, input.agentId))
        .orderBy(agentSkills.acquiredAt);

      return skills;
    }),

  // ─── 3. 取得玩家裝備中的技能（installedSlot 不為 null） ───────────────────
  getEquippedSkills: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const equipped = await db.select({
        agentSkill: agentSkills,
        template: skillTemplates,
      })
        .from(agentSkills)
        .innerJoin(skillTemplates, eq(agentSkills.skillId, skillTemplates.id))
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          sql`${agentSkills.installedSlot} IS NOT NULL`
        ))
        .orderBy(agentSkills.installedSlot);

      return equipped;
    }),

  // ─── 4. 裝備/卸下技能 ──────────────────────────────────────────────────────
  equipSkill: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      skillId: z.string(),
      slot: z.string().nullable(), // null = 卸下，例 "skillSlot1"
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 確認技能已習得
      const [skill] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "技能未習得" });

      if (input.slot !== null) {
        // 先清除該槽位的其他技能
        await db.update(agentSkills)
          .set({ installedSlot: null })
          .where(and(
            eq(agentSkills.agentId, input.agentId),
            eq(agentSkills.installedSlot, input.slot)
          ));
      }

      // 更新槽位
      await db.update(agentSkills)
        .set({ installedSlot: input.slot })
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));

      return { success: true };
    }),

  // ─── 5. 取得玩家技能書列表 ─────────────────────────────────────────────────
  getSkillBooks: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const books = await db.select({
        book: skillBooks,
        template: skillTemplates,
      })
        .from(skillBooks)
        .innerJoin(skillTemplates, eq(skillBooks.skillId, skillTemplates.id))
        .where(eq(skillBooks.agentId, input.agentId))
        .orderBy(skillBooks.obtainedAt);

      return books;
    }),

  // ─── 6. 使用技能書解鎖技能 ─────────────────────────────────────────────────
  useSkillBook: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      bookId: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得技能書
      const [book] = await db.select().from(skillBooks)
        .where(and(
          eq(skillBooks.id, input.bookId),
          eq(skillBooks.agentId, input.agentId)
        ));
      if (!book || book.quantity <= 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "技能書不存在或數量不足" });
      }

      // 取得技能模板
      const [template] = await db.select().from(skillTemplates)
        .where(eq(skillTemplates.id, book.skillId));
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "技能模板不存在" });

      // 檢查是否已習得
      const [existing] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, book.skillId)
        ));
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "技能已習得" });

      // 習得技能
      await db.insert(agentSkills).values({
        agentId: input.agentId,
        skillId: book.skillId,
        awakeTier: 0,
        useCount: 0,
        installedSlot: null,
      });

      // 扣除技能書數量
      if (book.quantity <= 1) {
        await db.delete(skillBooks).where(eq(skillBooks.id, input.bookId));
      } else {
        await db.update(skillBooks)
          .set({ quantity: book.quantity - 1 })
          .where(eq(skillBooks.id, input.bookId));
      }

      return { success: true, skillName: template.name, isHidden: isHiddenSkill(template) };
    }),

  // ─── 7. 技能覺醒（消耗覺醒素材升階） ─────────────────────────────────────
  awakenSkill: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      skillId: z.string(),
      materialType: z.string(), // 消耗的素材類型
      materialCost: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得技能模板
      const [template] = await db.select().from(skillTemplates)
        .where(eq(skillTemplates.id, input.skillId));
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });

      // 取得玩家技能
      const [agentSkill] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));
      if (!agentSkill) throw new TRPCError({ code: "NOT_FOUND", message: "技能未習得" });

      const MAX_AWAKE_TIER = 3;
      if (agentSkill.awakeTier >= MAX_AWAKE_TIER) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已達最大覺醒階段（神技）" });
      }

      // 檢查覺醒素材
      const [material] = await db.select().from(awakeMaterials)
        .where(and(
          eq(awakeMaterials.agentId, input.agentId),
          eq(awakeMaterials.materialType, input.materialType)
        ));
      if (!material || material.quantity < input.materialCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "覺醒素材不足" });
      }

      // 扣除素材
      await db.update(awakeMaterials)
        .set({ quantity: material.quantity - input.materialCost })
        .where(and(
          eq(awakeMaterials.agentId, input.agentId),
          eq(awakeMaterials.materialType, input.materialType)
        ));

      // 執行覺醒
      const newTier = agentSkill.awakeTier + 1;
      await db.update(agentSkills)
        .set({ awakeTier: newTier })
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));

      const tierNames = ["普通", "大招", "奧義", "神技"];

      return {
        success: true,
        newTier,
        tierName: tierNames[newTier] ?? "神技",
        skillName: template.name,
      };
    }),

  // ─── 8. 取得玩家覺醒素材庫存 ──────────────────────────────────────────────
  getAwakeMaterials: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db.select().from(awakeMaterials)
        .where(eq(awakeMaterials.agentId, input.agentId));
    }),

  // ─── 9. 取得隱藏技能追蹤器狀態（玩家個人） ────────────────────────────────
  getHiddenSkillTrackers: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db.select().from(hiddenSkillTrackers)
        .where(eq(hiddenSkillTrackers.agentId, input.agentId))
        .orderBy(hiddenSkillTrackers.isUnlocked, hiddenSkillTrackers.currentValue);
    }),

  // ─── 10. 全服首觸發公告（天命廣播） ───────────────────────────────────────
  checkGlobalFirstTrigger: protectedProcedure
    .input(z.object({
      skillId: z.string(),
      agentId: z.number().int(),
      agentName: z.string(),
      agentElement: z.string(),
      agentLevel: z.number().int().optional(),
      description: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 檢查是否已有首觸發記錄
      const [existing] = await db.select().from(globalFirstTriggers)
        .where(eq(globalFirstTriggers.skillId, input.skillId));

      if (existing) {
        return { isFirst: false, firstAgentName: existing.firstAgentName };
      }

      // 記錄首觸發
      await db.insert(globalFirstTriggers).values({
        skillId: input.skillId,
        firstAgentId: input.agentId,
        firstAgentName: input.agentName,
      });

      // 廣播天命公告
      broadcastLiveFeed({
        feedType: "world_event",
        agentName: input.agentName,
        agentElement: input.agentElement,
        agentLevel: input.agentLevel,
        detail: `🌟 天命首觸發！${input.agentName} ${input.description}`,
        icon: "🌟",
        targetPath: "/game/skills",
      });

      return { isFirst: true, firstAgentName: input.agentName };
    }),
});
