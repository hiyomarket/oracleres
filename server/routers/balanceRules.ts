/**
 * 平衡規則自訂 API
 * 管理員可讀取/更新/重置各圖鑑各稀有度的數值範圍上下限
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { gameBalanceRules } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ═══════════════════════════════════════════════════════════════
// 預設平衡規則（硬編碼 fallback）
// ═══════════════════════════════════════════════════════════════

export type BalanceRuleEntry = {
  catalogType: string;
  rarity: string;
  field: string;
  minValue: number;
  maxValue: number;
};

/** 所有預設平衡規則（與 gameAIBalance.ts 中的硬編碼值一致） */
export const DEFAULT_BALANCE_RULES: BalanceRuleEntry[] = [
  // ── 怪物 ──
  // common
  { catalogType: "monster", rarity: "common",    field: "hp",         minValue: 30,  maxValue: 120 },
  { catalogType: "monster", rarity: "common",    field: "atk",        minValue: 5,   maxValue: 20 },
  { catalogType: "monster", rarity: "common",    field: "def",        minValue: 2,   maxValue: 12 },
  { catalogType: "monster", rarity: "common",    field: "spd",        minValue: 3,   maxValue: 12 },
  { catalogType: "monster", rarity: "common",    field: "matk",       minValue: 3,   maxValue: 15 },
  { catalogType: "monster", rarity: "common",    field: "mdef",       minValue: 2,   maxValue: 10 },
  { catalogType: "monster", rarity: "common",    field: "mp",         minValue: 10,  maxValue: 50 },
  { catalogType: "monster", rarity: "common",    field: "accuracy",   minValue: 60,  maxValue: 90 },
  { catalogType: "monster", rarity: "common",    field: "critRate",   minValue: 1,   maxValue: 8 },
  { catalogType: "monster", rarity: "common",    field: "critDamage", minValue: 120, maxValue: 160 },
  { catalogType: "monster", rarity: "common",    field: "growthRate", minValue: 0.8, maxValue: 1.2 },
  { catalogType: "monster", rarity: "common",    field: "level",      minValue: 1,   maxValue: 10 },
  { catalogType: "monster", rarity: "common",    field: "actionsPerTurn", minValue: 1, maxValue: 1 },
  { catalogType: "monster", rarity: "common",    field: "counterBonus", minValue: 30, maxValue: 60 },
  { catalogType: "monster", rarity: "common",    field: "aiLevel",    minValue: 1,   maxValue: 1 },
  // rare
  { catalogType: "monster", rarity: "rare",      field: "hp",         minValue: 80,  maxValue: 250 },
  { catalogType: "monster", rarity: "rare",      field: "atk",        minValue: 15,  maxValue: 40 },
  { catalogType: "monster", rarity: "rare",      field: "def",        minValue: 8,   maxValue: 25 },
  { catalogType: "monster", rarity: "rare",      field: "spd",        minValue: 5,   maxValue: 18 },
  { catalogType: "monster", rarity: "rare",      field: "matk",       minValue: 10,  maxValue: 30 },
  { catalogType: "monster", rarity: "rare",      field: "mdef",       minValue: 5,   maxValue: 18 },
  { catalogType: "monster", rarity: "rare",      field: "mp",         minValue: 20,  maxValue: 80 },
  { catalogType: "monster", rarity: "rare",      field: "accuracy",   minValue: 70,  maxValue: 95 },
  { catalogType: "monster", rarity: "rare",      field: "critRate",   minValue: 3,   maxValue: 12 },
  { catalogType: "monster", rarity: "rare",      field: "critDamage", minValue: 130, maxValue: 180 },
  { catalogType: "monster", rarity: "rare",      field: "growthRate", minValue: 1.0, maxValue: 1.5 },
  { catalogType: "monster", rarity: "rare",      field: "level",      minValue: 5,   maxValue: 20 },
  { catalogType: "monster", rarity: "rare",      field: "actionsPerTurn", minValue: 1, maxValue: 1 },
  { catalogType: "monster", rarity: "rare",      field: "counterBonus", minValue: 40, maxValue: 70 },
  { catalogType: "monster", rarity: "rare",      field: "aiLevel",    minValue: 2,   maxValue: 2 },
  // elite
  { catalogType: "monster", rarity: "elite",     field: "hp",         minValue: 150, maxValue: 350 },
  { catalogType: "monster", rarity: "elite",     field: "atk",        minValue: 25,  maxValue: 55 },
  { catalogType: "monster", rarity: "elite",     field: "def",        minValue: 15,  maxValue: 35 },
  { catalogType: "monster", rarity: "elite",     field: "spd",        minValue: 8,   maxValue: 22 },
  { catalogType: "monster", rarity: "elite",     field: "matk",       minValue: 18,  maxValue: 45 },
  { catalogType: "monster", rarity: "elite",     field: "mdef",       minValue: 10,  maxValue: 28 },
  { catalogType: "monster", rarity: "elite",     field: "mp",         minValue: 30,  maxValue: 120 },
  { catalogType: "monster", rarity: "elite",     field: "accuracy",   minValue: 75,  maxValue: 100 },
  { catalogType: "monster", rarity: "elite",     field: "critRate",   minValue: 5,   maxValue: 15 },
  { catalogType: "monster", rarity: "elite",     field: "critDamage", minValue: 140, maxValue: 200 },
  { catalogType: "monster", rarity: "elite",     field: "growthRate", minValue: 1.2, maxValue: 1.8 },
  { catalogType: "monster", rarity: "elite",     field: "level",      minValue: 10,  maxValue: 30 },
  { catalogType: "monster", rarity: "elite",     field: "actionsPerTurn", minValue: 1, maxValue: 2 },
  { catalogType: "monster", rarity: "elite",     field: "counterBonus", minValue: 45, maxValue: 80 },
  { catalogType: "monster", rarity: "elite",     field: "aiLevel",    minValue: 2,   maxValue: 2 },
  // epic
  { catalogType: "monster", rarity: "epic",      field: "hp",         minValue: 200, maxValue: 400 },
  { catalogType: "monster", rarity: "epic",      field: "atk",        minValue: 30,  maxValue: 65 },
  { catalogType: "monster", rarity: "epic",      field: "def",        minValue: 18,  maxValue: 40 },
  { catalogType: "monster", rarity: "epic",      field: "spd",        minValue: 10,  maxValue: 25 },
  { catalogType: "monster", rarity: "epic",      field: "matk",       minValue: 25,  maxValue: 55 },
  { catalogType: "monster", rarity: "epic",      field: "mdef",       minValue: 15,  maxValue: 35 },
  { catalogType: "monster", rarity: "epic",      field: "mp",         minValue: 40,  maxValue: 150 },
  { catalogType: "monster", rarity: "epic",      field: "accuracy",   minValue: 80,  maxValue: 100 },
  { catalogType: "monster", rarity: "epic",      field: "critRate",   minValue: 8,   maxValue: 20 },
  { catalogType: "monster", rarity: "epic",      field: "critDamage", minValue: 150, maxValue: 220 },
  { catalogType: "monster", rarity: "epic",      field: "growthRate", minValue: 1.3, maxValue: 2.0 },
  { catalogType: "monster", rarity: "epic",      field: "level",      minValue: 15,  maxValue: 40 },
  { catalogType: "monster", rarity: "epic",      field: "actionsPerTurn", minValue: 1, maxValue: 2 },
  { catalogType: "monster", rarity: "epic",      field: "counterBonus", minValue: 50, maxValue: 90 },
  { catalogType: "monster", rarity: "epic",      field: "aiLevel",    minValue: 3,   maxValue: 3 },
  // boss
  { catalogType: "monster", rarity: "boss",      field: "hp",         minValue: 300, maxValue: 500 },
  { catalogType: "monster", rarity: "boss",      field: "atk",        minValue: 40,  maxValue: 80 },
  { catalogType: "monster", rarity: "boss",      field: "def",        minValue: 25,  maxValue: 50 },
  { catalogType: "monster", rarity: "boss",      field: "spd",        minValue: 12,  maxValue: 28 },
  { catalogType: "monster", rarity: "boss",      field: "matk",       minValue: 30,  maxValue: 65 },
  { catalogType: "monster", rarity: "boss",      field: "mdef",       minValue: 20,  maxValue: 42 },
  { catalogType: "monster", rarity: "boss",      field: "mp",         minValue: 50,  maxValue: 200 },
  { catalogType: "monster", rarity: "boss",      field: "accuracy",   minValue: 85,  maxValue: 100 },
  { catalogType: "monster", rarity: "boss",      field: "critRate",   minValue: 10,  maxValue: 25 },
  { catalogType: "monster", rarity: "boss",      field: "critDamage", minValue: 160, maxValue: 250 },
  { catalogType: "monster", rarity: "boss",      field: "growthRate", minValue: 1.5, maxValue: 2.5 },
  { catalogType: "monster", rarity: "boss",      field: "level",      minValue: 20,  maxValue: 50 },
  { catalogType: "monster", rarity: "boss",      field: "actionsPerTurn", minValue: 1, maxValue: 3 },
  { catalogType: "monster", rarity: "boss",      field: "counterBonus", minValue: 55, maxValue: 100 },
  { catalogType: "monster", rarity: "boss",      field: "aiLevel",    minValue: 3,   maxValue: 3 },
  // legendary
  { catalogType: "monster", rarity: "legendary", field: "hp",         minValue: 350, maxValue: 500 },
  { catalogType: "monster", rarity: "legendary", field: "atk",        minValue: 50,  maxValue: 80 },
  { catalogType: "monster", rarity: "legendary", field: "def",        minValue: 30,  maxValue: 50 },
  { catalogType: "monster", rarity: "legendary", field: "spd",        minValue: 15,  maxValue: 30 },
  { catalogType: "monster", rarity: "legendary", field: "matk",       minValue: 40,  maxValue: 75 },
  { catalogType: "monster", rarity: "legendary", field: "mdef",       minValue: 25,  maxValue: 48 },
  { catalogType: "monster", rarity: "legendary", field: "mp",         minValue: 60,  maxValue: 250 },
  { catalogType: "monster", rarity: "legendary", field: "accuracy",   minValue: 85,  maxValue: 100 },
  { catalogType: "monster", rarity: "legendary", field: "critRate",   minValue: 12,  maxValue: 30 },
  { catalogType: "monster", rarity: "legendary", field: "critDamage", minValue: 170, maxValue: 300 },
  { catalogType: "monster", rarity: "legendary", field: "growthRate", minValue: 1.8, maxValue: 3.0 },
  { catalogType: "monster", rarity: "legendary", field: "level",      minValue: 25,  maxValue: 60 },
  { catalogType: "monster", rarity: "legendary", field: "actionsPerTurn", minValue: 1, maxValue: 3 },
  { catalogType: "monster", rarity: "legendary", field: "counterBonus", minValue: 60, maxValue: 120 },
  { catalogType: "monster", rarity: "legendary", field: "aiLevel",    minValue: 3,   maxValue: 3 },

  // ── 怪物技能 ──
  { catalogType: "monsterSkill", rarity: "common",    field: "power", minValue: 60,  maxValue: 130 },
  { catalogType: "monsterSkill", rarity: "common",    field: "mp",    minValue: 0,   maxValue: 10 },
  { catalogType: "monsterSkill", rarity: "common",    field: "cd",    minValue: 0,   maxValue: 2 },
  { catalogType: "monsterSkill", rarity: "rare",      field: "power", minValue: 90,  maxValue: 160 },
  { catalogType: "monsterSkill", rarity: "rare",      field: "mp",    minValue: 3,   maxValue: 15 },
  { catalogType: "monsterSkill", rarity: "rare",      field: "cd",    minValue: 0,   maxValue: 3 },
  { catalogType: "monsterSkill", rarity: "epic",      field: "power", minValue: 120, maxValue: 210 },
  { catalogType: "monsterSkill", rarity: "epic",      field: "mp",    minValue: 5,   maxValue: 25 },
  { catalogType: "monsterSkill", rarity: "epic",      field: "cd",    minValue: 1,   maxValue: 4 },
  { catalogType: "monsterSkill", rarity: "legendary", field: "power", minValue: 150, maxValue: 260 },
  { catalogType: "monsterSkill", rarity: "legendary", field: "mp",    minValue: 8,   maxValue: 30 },
  { catalogType: "monsterSkill", rarity: "legendary", field: "cd",    minValue: 1,   maxValue: 5 },

  // ── 道具售價 ──
  { catalogType: "item", rarity: "common",    field: "price", minValue: 10,   maxValue: 150 },
  { catalogType: "item", rarity: "rare",      field: "price", minValue: 80,   maxValue: 600 },
  { catalogType: "item", rarity: "epic",      field: "price", minValue: 400,  maxValue: 2500 },
  { catalogType: "item", rarity: "legendary", field: "price", minValue: 1500, maxValue: 10000 },

  // ── 裝備（按品質） ──
  { catalogType: "equipment", rarity: "white",  field: "atk", minValue: 0,  maxValue: 8 },
  { catalogType: "equipment", rarity: "white",  field: "def", minValue: 0,  maxValue: 6 },
  { catalogType: "equipment", rarity: "white",  field: "hp",  minValue: 0,  maxValue: 30 },
  { catalogType: "equipment", rarity: "white",  field: "spd", minValue: 0,  maxValue: 4 },
  { catalogType: "equipment", rarity: "green",  field: "atk", minValue: 3,  maxValue: 15 },
  { catalogType: "equipment", rarity: "green",  field: "def", minValue: 2,  maxValue: 12 },
  { catalogType: "equipment", rarity: "green",  field: "hp",  minValue: 5,  maxValue: 50 },
  { catalogType: "equipment", rarity: "green",  field: "spd", minValue: 0,  maxValue: 8 },
  { catalogType: "equipment", rarity: "blue",   field: "atk", minValue: 8,  maxValue: 22 },
  { catalogType: "equipment", rarity: "blue",   field: "def", minValue: 5,  maxValue: 18 },
  { catalogType: "equipment", rarity: "blue",   field: "hp",  minValue: 15, maxValue: 75 },
  { catalogType: "equipment", rarity: "blue",   field: "spd", minValue: 2,  maxValue: 12 },
  { catalogType: "equipment", rarity: "purple", field: "atk", minValue: 12, maxValue: 28 },
  { catalogType: "equipment", rarity: "purple", field: "def", minValue: 8,  maxValue: 22 },
  { catalogType: "equipment", rarity: "purple", field: "hp",  minValue: 25, maxValue: 90 },
  { catalogType: "equipment", rarity: "purple", field: "spd", minValue: 3,  maxValue: 14 },
  { catalogType: "equipment", rarity: "orange", field: "atk", minValue: 18, maxValue: 35 },
  { catalogType: "equipment", rarity: "orange", field: "def", minValue: 12, maxValue: 28 },
  { catalogType: "equipment", rarity: "orange", field: "hp",  minValue: 40, maxValue: 110 },
  { catalogType: "equipment", rarity: "orange", field: "spd", minValue: 5,  maxValue: 16 },
  { catalogType: "equipment", rarity: "red",    field: "atk", minValue: 25, maxValue: 40 },
  { catalogType: "equipment", rarity: "red",    field: "def", minValue: 18, maxValue: 35 },
  { catalogType: "equipment", rarity: "red",    field: "hp",  minValue: 60, maxValue: 130 },
  { catalogType: "equipment", rarity: "red",    field: "spd", minValue: 8,  maxValue: 20 },

  // ── 人物技能 ──
  { catalogType: "skill", rarity: "common",    field: "power", minValue: 70,  maxValue: 130 },
  { catalogType: "skill", rarity: "common",    field: "mp",    minValue: 0,   maxValue: 12 },
  { catalogType: "skill", rarity: "common",    field: "cd",    minValue: 0,   maxValue: 2 },
  { catalogType: "skill", rarity: "common",    field: "price", minValue: 50,  maxValue: 300 },
  { catalogType: "skill", rarity: "rare",      field: "power", minValue: 100, maxValue: 170 },
  { catalogType: "skill", rarity: "rare",      field: "mp",    minValue: 5,   maxValue: 20 },
  { catalogType: "skill", rarity: "rare",      field: "cd",    minValue: 1,   maxValue: 3 },
  { catalogType: "skill", rarity: "rare",      field: "price", minValue: 200, maxValue: 800 },
  { catalogType: "skill", rarity: "epic",      field: "power", minValue: 140, maxValue: 220 },
  { catalogType: "skill", rarity: "epic",      field: "mp",    minValue: 10,  maxValue: 35 },
  { catalogType: "skill", rarity: "epic",      field: "cd",    minValue: 1,   maxValue: 4 },
  { catalogType: "skill", rarity: "epic",      field: "price", minValue: 500, maxValue: 3000 },
  { catalogType: "skill", rarity: "legendary", field: "power", minValue: 180, maxValue: 280 },
  { catalogType: "skill", rarity: "legendary", field: "mp",    minValue: 15,  maxValue: 50 },
  { catalogType: "skill", rarity: "legendary", field: "cd",    minValue: 2,   maxValue: 5 },
  { catalogType: "skill", rarity: "legendary", field: "price", minValue: 2000, maxValue: 10000 },

  // ── 天命考核技能 ──
  { catalogType: "questSkill", rarity: "common",    field: "power", minValue: 80,  maxValue: 140 },
  { catalogType: "questSkill", rarity: "common",    field: "mp",    minValue: 5,   maxValue: 15 },
  { catalogType: "questSkill", rarity: "common",    field: "cd",    minValue: 1,   maxValue: 3 },
  { catalogType: "questSkill", rarity: "common",    field: "gold",  minValue: 300, maxValue: 800 },
  { catalogType: "questSkill", rarity: "common",    field: "soul",  minValue: 100, maxValue: 200 },
  { catalogType: "questSkill", rarity: "rare",      field: "power", minValue: 100, maxValue: 200 },
  { catalogType: "questSkill", rarity: "rare",      field: "mp",    minValue: 8,   maxValue: 25 },
  { catalogType: "questSkill", rarity: "rare",      field: "cd",    minValue: 2,   maxValue: 5 },
  { catalogType: "questSkill", rarity: "rare",      field: "gold",  minValue: 500, maxValue: 1500 },
  { catalogType: "questSkill", rarity: "rare",      field: "soul",  minValue: 200, maxValue: 400 },
  { catalogType: "questSkill", rarity: "epic",      field: "power", minValue: 150, maxValue: 300 },
  { catalogType: "questSkill", rarity: "epic",      field: "mp",    minValue: 12,  maxValue: 35 },
  { catalogType: "questSkill", rarity: "epic",      field: "cd",    minValue: 3,   maxValue: 7 },
  { catalogType: "questSkill", rarity: "epic",      field: "gold",  minValue: 1000, maxValue: 3000 },
  { catalogType: "questSkill", rarity: "epic",      field: "soul",  minValue: 300, maxValue: 500 },
  { catalogType: "questSkill", rarity: "legendary", field: "power", minValue: 200, maxValue: 500 },
  { catalogType: "questSkill", rarity: "legendary", field: "mp",    minValue: 15,  maxValue: 50 },
  { catalogType: "questSkill", rarity: "legendary", field: "cd",    minValue: 4,   maxValue: 10 },
  { catalogType: "questSkill", rarity: "legendary", field: "gold",  minValue: 2000, maxValue: 5000 },
  { catalogType: "questSkill", rarity: "legendary", field: "soul",  minValue: 400, maxValue: 800 },

  // ── 成就 ──
  { catalogType: "achievement", rarity: "common",    field: "coins",  minValue: 10,  maxValue: 80 },
  { catalogType: "achievement", rarity: "common",    field: "stones", minValue: 1,   maxValue: 5 },
  { catalogType: "achievement", rarity: "rare",      field: "coins",  minValue: 50,  maxValue: 250 },
  { catalogType: "achievement", rarity: "rare",      field: "stones", minValue: 5,   maxValue: 20 },
  { catalogType: "achievement", rarity: "epic",      field: "coins",  minValue: 200, maxValue: 800 },
  { catalogType: "achievement", rarity: "epic",      field: "stones", minValue: 15,  maxValue: 50 },
  { catalogType: "achievement", rarity: "legendary", field: "coins",  minValue: 500, maxValue: 2000 },
  { catalogType: "achievement", rarity: "legendary", field: "stones", minValue: 30,  maxValue: 100 },
];

// ═══════════════════════════════════════════════════════════════
// 輔助函數：載入規則（優先資料庫，fallback 預設值）
// ═══════════════════════════════════════════════════════════════

/** 從資料庫載入所有自訂規則，合併預設值 */
export async function loadBalanceRules(): Promise<BalanceRuleEntry[]> {
  const db = await getDb();
  if (!db) return DEFAULT_BALANCE_RULES;

  const dbRules = await db.select().from(gameBalanceRules);
  
  // 建立 lookup map
  const dbMap = new Map<string, { minValue: number; maxValue: number }>();
  for (const r of dbRules) {
    dbMap.set(`${r.catalogType}|${r.rarity}|${r.field}`, { minValue: r.minValue, maxValue: r.maxValue });
  }

  // 合併：資料庫有的用資料庫值，沒有的用預設值
  return DEFAULT_BALANCE_RULES.map(def => {
    const key = `${def.catalogType}|${def.rarity}|${def.field}`;
    const override = dbMap.get(key);
    if (override) {
      return { ...def, minValue: override.minValue, maxValue: override.maxValue };
    }
    return def;
  });
}

/** 按 catalogType 分組載入規則，回傳 Record<catalogType, Record<rarity, Record<field, [min, max]>>> */
export async function loadBalanceRulesGrouped(): Promise<Record<string, Record<string, Record<string, [number, number]>>>> {
  const rules = await loadBalanceRules();
  const grouped: Record<string, Record<string, Record<string, [number, number]>>> = {};
  for (const r of rules) {
    if (!grouped[r.catalogType]) grouped[r.catalogType] = {};
    if (!grouped[r.catalogType][r.rarity]) grouped[r.catalogType][r.rarity] = {};
    grouped[r.catalogType][r.rarity][r.field] = [r.minValue, r.maxValue];
  }
  return grouped;
}

// ═══════════════════════════════════════════════════════════════
// Router
// ═══════════════════════════════════════════════════════════════

export const balanceRulesRouter = router({

  /** 取得所有平衡規則（含自訂覆蓋） */
  getAll: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const dbRules = await db.select().from(gameBalanceRules);
    const dbMap = new Map<string, { id: number; minValue: number; maxValue: number }>();
    for (const r of dbRules) {
      dbMap.set(`${r.catalogType}|${r.rarity}|${r.field}`, { id: r.id, minValue: r.minValue, maxValue: r.maxValue });
    }

    return DEFAULT_BALANCE_RULES.map(def => {
      const key = `${def.catalogType}|${def.rarity}|${def.field}`;
      const override = dbMap.get(key);
      return {
        catalogType: def.catalogType,
        rarity: def.rarity,
        field: def.field,
        minValue: override ? override.minValue : def.minValue,
        maxValue: override ? override.maxValue : def.maxValue,
        defaultMin: def.minValue,
        defaultMax: def.maxValue,
        isCustom: !!override,
      };
    });
  }),

  /** 批量更新平衡規則 */
  updateBatch: adminProcedure
    .input(z.object({
      rules: z.array(z.object({
        catalogType: z.string(),
        rarity: z.string(),
        field: z.string(),
        minValue: z.number(),
        maxValue: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let updated = 0;
      let inserted = 0;

      for (const rule of input.rules) {
        // 檢查是否已有自訂規則
        const existing = await db.select().from(gameBalanceRules)
          .where(and(
            eq(gameBalanceRules.catalogType, rule.catalogType),
            eq(gameBalanceRules.rarity, rule.rarity),
            eq(gameBalanceRules.field, rule.field),
          ));

        if (existing.length > 0) {
          await db.update(gameBalanceRules)
            .set({ minValue: rule.minValue, maxValue: rule.maxValue, updatedAt: Date.now() })
            .where(eq(gameBalanceRules.id, existing[0].id));
          updated++;
        } else {
          await db.insert(gameBalanceRules).values({
            catalogType: rule.catalogType,
            rarity: rule.rarity,
            field: rule.field,
            minValue: rule.minValue,
            maxValue: rule.maxValue,
            updatedAt: Date.now(),
          });
          inserted++;
        }
      }

      return {
        success: true,
        updated,
        inserted,
        message: `已更新 ${updated} 條規則，新增 ${inserted} 條規則`,
      };
    }),

  /** 重置指定圖鑑類型的規則為預設值 */
  resetToDefault: adminProcedure
    .input(z.object({
      catalogType: z.string().optional(), // 不傳 = 全部重置
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.catalogType) {
        await db.delete(gameBalanceRules).where(eq(gameBalanceRules.catalogType, input.catalogType));
      } else {
        await db.delete(gameBalanceRules).where(sql`1=1`);
      }

      return {
        success: true,
        message: input.catalogType
          ? `已重置「${input.catalogType}」的平衡規則為預設值`
          : "已重置所有平衡規則為預設值",
      };
    }),
});
