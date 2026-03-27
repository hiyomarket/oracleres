/**
 * 修復天命任務步驟中引用不存在道具的問題
 * 將虛構道具名替換為真實 gameItemCatalog 中的道具
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { gameQuestSteps, gameQuestSkillCatalog, gameItemCatalog } from "../../drizzle/schema";
import { eq, sql, and, like } from "drizzle-orm";

// 五行對應的材料道具映射（從真實圖鑑中選取）
const WUXING_ITEM_MAP: Record<string, string[]> = {
  "木": ["I_W001", "I_W002", "I_W003", "I_W011", "I_W012", "I_W013"],
  "火": ["I_F001", "I_F011", "I_F051"],
  "土": ["I_E001", "I_E011"],
  "金": ["I_M001", "I_M011"],
  "水": ["I_S001", "I_S011"],
};

export const fixQuestItemsRouter = router({
  /**
   * 掃描所有 collect 類型任務步驟，檢查道具是否存在於圖鑑中
   */
  scanBrokenItems: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    // 取得所有 collect 類型的任務步驟
    const steps = await db.select({
      id: gameQuestSteps.id,
      skillId: gameQuestSteps.skillId,
      stepNumber: gameQuestSteps.stepNumber,
      title: gameQuestSteps.title,
      objectives: gameQuestSteps.objectives,
    }).from(gameQuestSteps);

    // 取得所有道具名稱
    const items = await db.select({
      itemId: gameItemCatalog.itemId,
      name: gameItemCatalog.name,
    }).from(gameItemCatalog);
    const itemNameSet = new Set(items.map(i => i.name));
    const itemIdSet = new Set(items.map(i => i.itemId));

    const broken: Array<{
      stepId: number;
      skillId: number;
      stepNumber: number;
      title: string;
      targetName: string;
      targetItemId: string | null;
      reason: string;
    }> = [];

    for (const step of steps) {
      const objectives = typeof step.objectives === "string"
        ? JSON.parse(step.objectives)
        : step.objectives;
      if (!objectives || objectives.type !== "collect") continue;
      const targets = objectives.targets as Array<{ name: string; count: number; itemId?: string }>;
      if (!targets) continue;

      for (const target of targets) {
        const nameExists = itemNameSet.has(target.name);
        const idExists = target.itemId ? itemIdSet.has(target.itemId) : false;

        if (!nameExists && !idExists) {
          broken.push({
            stepId: step.id,
            skillId: step.skillId,
            stepNumber: step.stepNumber,
            title: step.title,
            targetName: target.name,
            targetItemId: target.itemId ?? null,
            reason: "道具名稱和 ID 都不存在於圖鑑中",
          });
        } else if (!nameExists && idExists) {
          broken.push({
            stepId: step.id,
            skillId: step.skillId,
            stepNumber: step.stepNumber,
            title: step.title,
            targetName: target.name,
            targetItemId: target.itemId ?? null,
            reason: "道具名稱不匹配但 ID 存在",
          });
        }
      }
    }

    return { total: broken.length, broken };
  }),

  /**
   * 自動修復所有 broken 道具引用
   * 根據技能的五行屬性，從真實圖鑑中選擇對應材料替換
   */
  autoFix: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    // 取得所有道具
    const items = await db.select({
      itemId: gameItemCatalog.itemId,
      name: gameItemCatalog.name,
      wuxing: gameItemCatalog.wuxing,
      category: gameItemCatalog.category,
    }).from(gameItemCatalog);
    const itemNameSet = new Set(items.map(i => i.name));
    const itemIdSet = new Set(items.map(i => i.itemId));

    // 按五行分組材料道具
    const wuxingMaterials: Record<string, Array<{ itemId: string; name: string }>> = {};
    for (const item of items) {
      if (item.category?.includes("material") || item.category === "quest") {
        if (!wuxingMaterials[item.wuxing]) wuxingMaterials[item.wuxing] = [];
        wuxingMaterials[item.wuxing].push({ itemId: item.itemId, name: item.name });
      }
    }

    // 取得所有技能（用來查五行）
    const skills = await db.select({
      id: gameQuestSkillCatalog.id,
      wuxing: gameQuestSkillCatalog.wuxing,
    }).from(gameQuestSkillCatalog);
    const skillWuxingMap = new Map(skills.map(s => [s.id, s.wuxing ?? "木"]));

    // 取得所有任務步驟
    const steps = await db.select().from(gameQuestSteps);

    let fixedCount = 0;
    const fixLog: string[] = [];

    for (const step of steps) {
      const objectives = typeof step.objectives === "string"
        ? JSON.parse(step.objectives)
        : step.objectives;
      if (!objectives || objectives.type !== "collect") continue;
      const targets = objectives.targets as Array<{ name: string; count: number; itemId?: string }>;
      if (!targets) continue;

      let modified = false;
      const skillWuxing = skillWuxingMap.get(step.skillId) ?? "木";

      for (const target of targets) {
        const nameExists = itemNameSet.has(target.name);
        const idExists = target.itemId ? itemIdSet.has(target.itemId) : false;

        if (!nameExists || !idExists) {
          // 從同五行材料中隨機選一個
          const pool = wuxingMaterials[skillWuxing] ?? wuxingMaterials["木"] ?? [];
          if (pool.length === 0) continue;

          const replacement = pool[Math.floor(Math.random() * pool.length)];
          const oldName = target.name;
          target.name = replacement.name;
          target.itemId = replacement.itemId;
          modified = true;
          fixLog.push(`步驟 ${step.id} (${step.title}): "${oldName}" → "${replacement.name}" (${replacement.itemId})`);
        }
      }

      if (modified) {
        objectives.targets = targets;
        await db.update(gameQuestSteps)
          .set({ objectives, updatedAt: Date.now() })
          .where(eq(gameQuestSteps.id, step.id));
        fixedCount++;
      }
    }

    return { fixedCount, fixLog };
  }),
});
