/**
 * GD-022 技能系統 Router（統一版）
 * 統一使用 game_unified_skill_catalog（gameUnifiedSkillCatalog）作為技能資料來源
 *
 * agentSkills: id, agentId, skillId(FK→game_unified_skill_catalog.skillId), awakeTier, useCount,
 *   installedSlot, acquiredAt
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  gameUnifiedSkillCatalog,
  agentSkills,
  skillBooks,
  awakeMaterials,
  hiddenSkillTrackers,
  globalFirstTriggers,
  gameAgents,
} from "../../drizzle/schema";
import { broadcastLiveFeed } from "../liveFeedBroadcast";

// 五行中文 → 英文對照
const WUXING_MAP: Record<string, string> = {
  "木": "wood", "火": "fire", "土": "earth", "金": "metal", "水": "water",
  "wood": "wood", "fire": "fire", "earth": "earth", "metal": "metal", "water": "water",
};

// 隱藏技能判斷
function isHiddenSkill(cat: { category: string }): boolean {
  return cat.category === "hidden";
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

      // 五行英文 → 中文
      const ELEMENT_TO_WUXING: Record<string, string> = {
        wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
      };

      const catalogs = input.element === "all"
        ? await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.isActive, 1))
        : await db.select().from(gameUnifiedSkillCatalog).where(
            and(
              eq(gameUnifiedSkillCatalog.isActive, 1),
              eq(gameUnifiedSkillCatalog.wuxing, ELEMENT_TO_WUXING[input.element] ?? input.element)
            )
          );

      // 取得玩家已習得技能
      let unlockedSet = new Set<string>();
      if (input.agentId) {
        const unlocked = await db.select({ skillId: agentSkills.skillId })
          .from(agentSkills)
          .where(eq(agentSkills.agentId, input.agentId));
        for (const s of unlocked) unlockedSet.add(s.skillId);
      }

      return catalogs.map(t => {
        const hidden = isHiddenSkill(t);
        const unlocked = unlockedSet.has(t.skillId);
        const fogged = hidden && !unlocked;
        return {
          id: t.skillId,
          name: t.name,
          element: WUXING_MAP[t.wuxing ?? ""] ?? t.wuxing,
          wuxing: t.wuxing,
          category: t.category,
          rarity: t.rarity,
          mpCost: t.mpCost,
          cooldown: t.cooldown,
          effectDesc: t.description ?? "",
          effectValue: t.powerPercent / 100,
          statusEffect: t.statusEffectType !== "none" ? t.statusEffectType : null,
          statusChance: t.statusEffectChance,
          targetType: t.targetType,
          acquireMethod: "catalog",
          comboTags: null,
          isActive: t.isActive ?? 1,
          skillType: t.skillType,
          fogged,
          displayName: fogged ? "???" : t.name,
          displayDesc: fogged ? "此技能尚未揭示，需達成特殊條件" : (t.description ?? ""),
          unlocked,
        };
      });
    }),

  // ─── 2. 取得玩家已習得技能列表 ────────────────────────────────────────────
  getAgentSkills: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const skills = await db.select({
        agentSkill: agentSkills,
        catalog: gameUnifiedSkillCatalog,
      })
        .from(agentSkills)
        .innerJoin(gameUnifiedSkillCatalog, eq(agentSkills.skillId, gameUnifiedSkillCatalog.skillId))
        .where(eq(agentSkills.agentId, input.agentId))
        .orderBy(agentSkills.acquiredAt);

      return skills.map(({ agentSkill, catalog }) => ({
        agentSkill,
        template: {
          id: catalog.skillId,
          name: catalog.name,
          element: WUXING_MAP[catalog.wuxing ?? ""] ?? catalog.wuxing,
          wuxing: catalog.wuxing,
          category: catalog.category,
          rarity: catalog.rarity,
          mpCost: catalog.mpCost,
          cooldown: catalog.cooldown,
          effectDesc: catalog.description ?? "",
          effectValue: catalog.powerPercent / 100,
          statusEffect: catalog.statusEffectType !== "none" ? catalog.statusEffectType : null as string | null,
          statusChance: catalog.statusEffectChance,
          targetType: catalog.targetType,
          acquireMethod: "catalog",
          comboTags: null as string | null,
          isActive: catalog.isActive ?? 1,
          skillType: catalog.skillType,
        },
      }));
    }),

  // ─── 3. 取得玩家裝備中的技能 ──────────────────────────────────────────────
  getEquippedSkills: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const equipped = await db.select({
        agentSkill: agentSkills,
        catalog: gameUnifiedSkillCatalog,
      })
        .from(agentSkills)
        .innerJoin(gameUnifiedSkillCatalog, eq(agentSkills.skillId, gameUnifiedSkillCatalog.skillId))
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          sql`${agentSkills.installedSlot} IS NOT NULL`
        ))
        .orderBy(agentSkills.installedSlot);

      return equipped.map(({ agentSkill, catalog }) => ({
        agentSkill,
        template: {
          id: catalog.skillId,
          name: catalog.name,
          element: WUXING_MAP[catalog.wuxing ?? ""] ?? catalog.wuxing,
          wuxing: catalog.wuxing,
          category: catalog.category,
          rarity: catalog.rarity,
          mpCost: catalog.mpCost,
          effectDesc: catalog.description ?? "",
          effectValue: catalog.powerPercent / 100,
          skillType: catalog.skillType,
        },
      }));
    }),

  // ─── 4. 裝備/卸下技能 ──────────────────────────────────────────────────────
  equipSkill: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      skillId: z.string(),
      slot: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [skill] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "技能未習得" });

      // 取得角色資料
      const [agent] = await db.select().from(gameAgents)
        .where(eq(gameAgents.id, input.agentId)).limit(1);
      if (!agent) throw new TRPCError({ code: "NOT_FOUND", message: "角色不存在" });

      const ALL_SKILL_SLOTS = ["skillSlot1", "skillSlot2", "skillSlot3", "skillSlot4", "passiveSlot1", "passiveSlot2", "hiddenSlot1"] as const;
      const validSlots = new Set<string>(ALL_SKILL_SLOTS);

      if (input.slot !== null) {
        // 清除目標槽位的舊技能
        await db.update(agentSkills)
          .set({ installedSlot: null })
          .where(and(
            eq(agentSkills.agentId, input.agentId),
            eq(agentSkills.installedSlot, input.slot)
          ));
      }

      // 更新當前技能的 installedSlot
      await db.update(agentSkills)
        .set({ installedSlot: input.slot })
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));

      // BUG-2/3 FIX: 同步更新 gameAgents 的槽位欄位
      if (input.slot !== null && validSlots.has(input.slot)) {
        const updateFields: Record<string, any> = { [input.slot]: input.skillId, updatedAt: Date.now() };
        for (const slotKey of ALL_SKILL_SLOTS) {
          if (slotKey !== input.slot && (agent as any)[slotKey] === input.skillId) {
            updateFields[slotKey] = null;
          }
        }
        await db.update(gameAgents).set(updateFields).where(eq(gameAgents.id, input.agentId));
      } else if (input.slot === null) {
        const updateFields: Record<string, any> = { updatedAt: Date.now() };
        for (const slotKey of ALL_SKILL_SLOTS) {
          if ((agent as any)[slotKey] === input.skillId) {
            updateFields[slotKey] = null;
          }
        }
        await db.update(gameAgents).set(updateFields).where(eq(gameAgents.id, input.agentId));
      }

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
        catalog: gameUnifiedSkillCatalog,
      })
        .from(skillBooks)
        .innerJoin(gameUnifiedSkillCatalog, eq(skillBooks.skillId, gameUnifiedSkillCatalog.skillId))
        .where(eq(skillBooks.agentId, input.agentId))
        .orderBy(skillBooks.obtainedAt);

      return books.map(({ book, catalog }) => ({
        book,
        template: {
          id: catalog.skillId,
          name: catalog.name,
          element: WUXING_MAP[catalog.wuxing ?? ""] ?? catalog.wuxing,
          wuxing: catalog.wuxing,
          category: catalog.category,
          rarity: catalog.rarity,
          mpCost: catalog.mpCost,
          effectDesc: catalog.description ?? "",
          skillType: catalog.skillType,
        },
      }));
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

      const [book] = await db.select().from(skillBooks)
        .where(and(
          eq(skillBooks.id, input.bookId),
          eq(skillBooks.agentId, input.agentId)
        ));
      if (!book || book.quantity <= 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "技能書不存在或數量不足" });
      }

      const [catalog] = await db.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.skillId, book.skillId));
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "技能資料不存在（catalog）" });

      const [existing] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, book.skillId)
        ));
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "技能已習得" });

      await db.insert(agentSkills).values({
        agentId: input.agentId,
        skillId: book.skillId,
        awakeTier: 0,
        useCount: 0,
        installedSlot: null,
      });

      if (book.quantity <= 1) {
        await db.delete(skillBooks).where(eq(skillBooks.id, input.bookId));
      } else {
        await db.update(skillBooks)
          .set({ quantity: book.quantity - 1 })
          .where(eq(skillBooks.id, input.bookId));
      }

      return { success: true, skillName: catalog.name, isHidden: isHiddenSkill(catalog) };
    }),

  // ─── 7. 技能覺醒 ──────────────────────────────────────────────────────────
  awakenSkill: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      skillId: z.string(),
      materialType: z.string(),
      materialCost: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [catalog] = await db.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.skillId, input.skillId));
      if (!catalog) throw new TRPCError({ code: "NOT_FOUND", message: "技能不存在" });

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

      const [material] = await db.select().from(awakeMaterials)
        .where(and(
          eq(awakeMaterials.agentId, input.agentId),
          eq(awakeMaterials.materialType, input.materialType)
        ));
      if (!material || material.quantity < input.materialCost) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "覺醒素材不足" });
      }

      await db.update(awakeMaterials)
        .set({ quantity: material.quantity - input.materialCost })
        .where(and(
          eq(awakeMaterials.agentId, input.agentId),
          eq(awakeMaterials.materialType, input.materialType)
        ));

      const newTier = agentSkill.awakeTier + 1;
      await db.update(agentSkills)
        .set({ awakeTier: newTier })
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));

      const tierNames = ["普通", "大招", "奧義", "神技"];
      return { success: true, newTier, tierName: tierNames[newTier] ?? "神技", skillName: catalog.name };
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

  // ─── 9. 取得隱藏技能追蹤器狀態 ────────────────────────────────────────────
  getHiddenSkillTrackers: protectedProcedure
    .input(z.object({ agentId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(hiddenSkillTrackers)
        .where(eq(hiddenSkillTrackers.agentId, input.agentId));
    }),

  // ─── 10. 觸發隱藏技能 ─────────────────────────────────────────────────────
  triggerHiddenSkill: protectedProcedure
    .input(z.object({
      agentId: z.number().int(),
      skillId: z.string(),
      triggerType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [catalog] = await db.select().from(gameUnifiedSkillCatalog)
        .where(eq(gameUnifiedSkillCatalog.skillId, input.skillId));
      if (!catalog || !isHiddenSkill(catalog)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "非隱藏技能" });
      }

      const [existing] = await db.select().from(agentSkills)
        .where(and(
          eq(agentSkills.agentId, input.agentId),
          eq(agentSkills.skillId, input.skillId)
        ));
      if (existing) return { success: true, alreadyUnlocked: true, skillName: catalog.name };

      await db.insert(agentSkills).values({
        agentId: input.agentId,
        skillId: input.skillId,
        awakeTier: 0,
        useCount: 0,
      });

      // 全服首次觸發
      const [firstTrigger] = await db.select().from(globalFirstTriggers)
        .where(eq(globalFirstTriggers.skillId, input.skillId));
      let isGlobalFirst = false;
      if (!firstTrigger) {
        await db.insert(globalFirstTriggers).values({
          skillId: input.skillId,
          agentId: input.agentId,
          triggeredAt: Date.now(),
        });
        isGlobalFirst = true;
        broadcastLiveFeed(`🌟 全服首次觸發隱藏技能「${catalog.name}」！`);
      }

      return { success: true, alreadyUnlocked: false, skillName: catalog.name, isGlobalFirst };
    }),
});
