/**
 * AI 平衡引擎 — 六個圖鑑的 AI 平衡 + 怪物 AI 等級分配
 * 
 * 每個圖鑑都有：
 * 1. AI 平衡分析：找出數值異常的項目
 * 2. AI 平衡修正：自動修正異常值
 * 
 * 平衡邏輯：根據稀有度/品質/等級範圍定義合理數值區間，
 * 超出區間的項目會被標記並修正到區間內。
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import {
  gameMonsterCatalog,
  gameItemCatalog,
  gameEquipmentCatalog,
  gameAchievements,
  gameUnifiedSkillCatalog,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { loadBalanceRulesGrouped } from "./balanceRules";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ═══════════════════════════════════════════════════════════════
// 平衡基準值：從資料庫自訂規則載入（fallback 預設值）
// ═══════════════════════════════════════════════════════════════

type RangeMap = Record<string, Record<string, [number, number]>>;

/** 從分組規則中取得 [min, max]，找不到回傳 fallback */
function getRange(grouped: RangeMap, rarity: string, field: string, fallback: [number, number] = [0, 9999]): [number, number] {
  return grouped?.[rarity]?.[field] ?? fallback;
}

/** 從分組規則中取得 aiLevel（用 minValue 作為固定值） */
function getAiLevel(grouped: RangeMap, rarity: string): number {
  const r = grouped?.[rarity]?.aiLevel;
  return r ? r[0] : 1;
}

// ═══════════════════════════════════════════════════════════════
// 工具函數
// ═══════════════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** 在範圍內隨機取值（整數），用於平衡修正時增加多樣性 */
function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

/** 對已在範圍內的數值加入隨機浮動（±variancePct%），保持在範圍內 */
function applyVariance(val: number, min: number, max: number, variancePct: number = 10): number {
  const range = max - min;
  const variance = range * (variancePct / 100);
  const offset = (Math.random() * 2 - 1) * variance;
  return clamp(Math.round(val + offset), min, max);
}

/** 平衡修正：超出範圍時在範圍內隨機取值，而不是取邊界值 */
function balanceFix(val: number, min: number, max: number): number {
  if (val < min) {
    // 太低：在 min ~ min+25%range 之間隨機
    const quarter = Math.round((max - min) * 0.25);
    return randomInRange(min, Math.min(min + quarter, max));
  }
  if (val > max) {
    // 太高：在 max-25%range ~ max 之間隨機
    const quarter = Math.round((max - min) * 0.25);
    return randomInRange(Math.max(max - quarter, min), max);
  }
  return val;
}

function isOutOfRange(val: number, range: [number, number]): boolean {
  return val < range[0] || val > range[1];
}

type BalanceChange = {
  id: number;
  name: string;
  field: string;
  oldValue: number;
  newValue: number;
  reason: string;
};

// ═══════════════════════════════════════════════════════════════
// AI 平衡 Router
// ═══════════════════════════════════════════════════════════════

export const gameAIBalanceRouter = router({

  // ─── 1. 怪物圖鑑平衡 ───
  balanceMonsters: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allRules = await loadBalanceRulesGrouped();
      const monsterRules = allRules["monster"] ?? {};
      const monsters = await db.select().from(gameMonsterCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      // 欄位對照表：規則field -> DB欄位 -> 中文名
      const MONSTER_FIELD_MAP: Array<{ ruleField: string; dbField: string; label: string; getter: (m: any) => number }> = [
        { ruleField: "hp",  dbField: "baseHp",           label: "HP",           getter: m => m.baseHp },
        { ruleField: "atk", dbField: "baseAttack",       label: "攻擊",         getter: m => m.baseAttack },
        { ruleField: "def", dbField: "baseDefense",      label: "防禦",         getter: m => m.baseDefense },
        { ruleField: "spd", dbField: "baseSpeed",        label: "速度",         getter: m => m.baseSpeed },
        { ruleField: "matk", dbField: "baseMagicAttack", label: "魔攻",         getter: m => m.baseMagicAttack },
        { ruleField: "mdef", dbField: "baseMagicDefense",label: "魔防",         getter: m => m.baseMagicDefense },
        { ruleField: "mp",  dbField: "baseMp",           label: "MP",           getter: m => m.baseMp },
        { ruleField: "accuracy", dbField: "baseAccuracy",label: "命中",         getter: m => m.baseAccuracy },
        { ruleField: "critRate", dbField: "baseCritRate",label: "暴擊率",       getter: m => m.baseCritRate },
        { ruleField: "critDamage", dbField: "baseCritDamage", label: "暴擊傷害", getter: m => m.baseCritDamage },
        { ruleField: "growthRate", dbField: "growthRate", label: "成長率",       getter: m => m.growthRate },
        { ruleField: "actionsPerTurn", dbField: "actionsPerTurn", label: "每回合行動數", getter: m => m.actionsPerTurn },
        { ruleField: "counterBonus", dbField: "counterBonus", label: "反擊加成", getter: m => m.counterBonus },
      ];

      for (const m of monsters) {
        const fixes: Partial<Record<string, number>> = {};

        // 通用數值欄位檢查
        for (const fm of MONSTER_FIELD_MAP) {
          const range = getRange(monsterRules, m.rarity, fm.ruleField);
          const val = fm.getter(m);
          if (val != null && isOutOfRange(val, range)) {
            const nv = balanceFix(val, range[0], range[1]);
            changes.push({ id: m.id, name: m.name, field: fm.label, oldValue: val, newValue: nv, reason: `${m.rarity} ${fm.label} 應在 ${range[0]}-${range[1]}` });
            fixes[fm.dbField] = nv;
          }
        }

        // AI等級特殊處理（固定值）
        const expectedAi = getAiLevel(monsterRules, m.rarity);
        if (m.aiLevel !== expectedAi) {
          changes.push({ id: m.id, name: m.name, field: "AI等級", oldValue: m.aiLevel, newValue: expectedAi, reason: `${m.rarity} AI 等級應為 ${expectedAi}` });
          fixes.aiLevel = expectedAi;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameMonsterCatalog).set(fixes).where(eq(gameMonsterCatalog.id, m.id));
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: monsters.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${monsters.length} 隻怪物，發現 ${changes.length} 項需修正`
          : `已修正 ${changes.length} 項怪物數值`,
      };
    }),

  // ─── 2. 怪物技能平衡 ───
  balanceMonsterSkills: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const skills = await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.usableByMonster, 1));
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const msRules = allRules["monsterSkill"] ?? {};
      for (const s of skills) {
        const fixes: Partial<Record<string, number>> = {};
        const powerR = getRange(msRules, s.rarity, "power");
        const mpR = getRange(msRules, s.rarity, "mp");
        const cdR = getRange(msRules, s.rarity, "cd");

        if (isOutOfRange(s.powerPercent, powerR)) {
          const nv = balanceFix(s.powerPercent, powerR[0], powerR[1]);
          changes.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: nv, reason: `${s.rarity} 威力應在 ${powerR[0]}-${powerR[1]}%` });
          fixes.powerPercent = nv;
        }
        if (isOutOfRange(s.mpCost, mpR)) {
          const nv = balanceFix(s.mpCost, mpR[0], mpR[1]);
          changes.push({ id: s.id, name: s.name, field: "MP消耗", oldValue: s.mpCost, newValue: nv, reason: `${s.rarity} MP 應在 ${mpR[0]}-${mpR[1]}` });
          fixes.mpCost = nv;
        }
        if (isOutOfRange(s.cooldown, cdR)) {
          const nv = balanceFix(s.cooldown, cdR[0], cdR[1]);
          changes.push({ id: s.id, name: s.name, field: "冷卻", oldValue: s.cooldown, newValue: nv, reason: `${s.rarity} CD 應在 ${cdR[0]}-${cdR[1]}` });
          fixes.cooldown = nv;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameUnifiedSkillCatalog).set(fixes).where(eq(gameUnifiedSkillCatalog.id, s.id));
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: skills.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${skills.length} 個怪物技能，發現 ${changes.length} 項需修正`
          : `已修正 ${changes.length} 項怪物技能數值`,
      };
    }),

  // ─── 3. 道具售價平衡 ───
  balanceItems: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const items = await db.select().from(gameItemCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const itemRules = allRules["item"] ?? {};
      for (const item of items) {
        const priceR = getRange(itemRules, item.rarity, "price");
        if (item.category === "quest" || item.category === "treasure") continue;
        if (item.shopPrice === 0) continue;

        if (isOutOfRange(item.shopPrice, priceR)) {
          const nv = balanceFix(item.shopPrice, priceR[0], priceR[1]);
          changes.push({ id: item.id, name: item.name, field: "售價", oldValue: item.shopPrice, newValue: nv, reason: `${item.rarity} 售價應在 ${priceR[0]}-${priceR[1]}` });
          if (!input.dryRun) {
            await db.update(gameItemCatalog).set({ shopPrice: nv }).where(eq(gameItemCatalog.id, item.id));
          }
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: items.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${items.length} 種道具，發現 ${changes.length} 項售價需修正`
          : `已修正 ${changes.length} 項道具售價`,
      };
    }),

  // ─── 4. 裝備數值平衡 ───
  balanceEquipment: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const equips = await db.select().from(gameEquipmentCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const eqRules = allRules["equipment"] ?? {};
      for (const e of equips) {
        const fixes: Partial<Record<string, number>> = {};
        const atkR = getRange(eqRules, e.quality, "atk");
        const defR = getRange(eqRules, e.quality, "def");
        const hpR = getRange(eqRules, e.quality, "hp");
        const spdR = getRange(eqRules, e.quality, "spd");

        if (isOutOfRange(e.attackBonus, atkR)) {
          const nv = balanceFix(e.attackBonus, atkR[0], atkR[1]);
          changes.push({ id: e.id, name: e.name, field: "攻擊加成", oldValue: e.attackBonus, newValue: nv, reason: `${e.quality} 品質 ATK 應在 ${atkR[0]}-${atkR[1]}` });
          fixes.attackBonus = nv;
        }
        if (isOutOfRange(e.defenseBonus, defR)) {
          const nv = balanceFix(e.defenseBonus, defR[0], defR[1]);
          changes.push({ id: e.id, name: e.name, field: "防禦加成", oldValue: e.defenseBonus, newValue: nv, reason: `${e.quality} 品質 DEF 應在 ${defR[0]}-${defR[1]}` });
          fixes.defenseBonus = nv;
        }
        if (isOutOfRange(e.hpBonus, hpR)) {
          const nv = balanceFix(e.hpBonus, hpR[0], hpR[1]);
          changes.push({ id: e.id, name: e.name, field: "HP加成", oldValue: e.hpBonus, newValue: nv, reason: `${e.quality} 品質 HP 應在 ${hpR[0]}-${hpR[1]}` });
          fixes.hpBonus = nv;
        }
        if (isOutOfRange(e.speedBonus, spdR)) {
          const nv = balanceFix(e.speedBonus, spdR[0], spdR[1]);
          changes.push({ id: e.id, name: e.name, field: "速度加成", oldValue: e.speedBonus, newValue: nv, reason: `${e.quality} 品質 SPD 應在 ${spdR[0]}-${spdR[1]}` });
          fixes.speedBonus = nv;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameEquipmentCatalog).set(fixes).where(eq(gameEquipmentCatalog.id, e.id));
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: equips.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${equips.length} 件裝備，發現 ${changes.length} 項數值需修正`
          : `已修正 ${changes.length} 項裝備數值`,
      };
    }),

  // ─── 5. 人物技能平衡 ───
  balanceSkills: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const skills = await db.select().from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const skRules = allRules["skill"] ?? {};
      for (const s of skills) {
        const fixes: Partial<Record<string, number>> = {};
        const powerR = getRange(skRules, s.rarity, "power");
        const mpR = getRange(skRules, s.rarity, "mp");
        const cdR = getRange(skRules, s.rarity, "cd");

        if (s.skillType !== "passive" && isOutOfRange(s.powerPercent, powerR)) {
          const nv = balanceFix(s.powerPercent, powerR[0], powerR[1]);
          changes.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: nv, reason: `${s.rarity} 威力應在 ${powerR[0]}-${powerR[1]}%` });
          fixes.powerPercent = nv;
        }
        if (isOutOfRange(s.mpCost, mpR)) {
          const nv = balanceFix(s.mpCost, mpR[0], mpR[1]);
          changes.push({ id: s.id, name: s.name, field: "MP消耗", oldValue: s.mpCost, newValue: nv, reason: `${s.rarity} MP 應在 ${mpR[0]}-${mpR[1]}` });
          fixes.mpCost = nv;
        }
        if (isOutOfRange(s.cooldown, cdR)) {
          const nv = balanceFix(s.cooldown, cdR[0], cdR[1]);
          changes.push({ id: s.id, name: s.name, field: "冷却", oldValue: s.cooldown, newValue: nv, reason: `${s.rarity} CD 應在 ${cdR[0]}-${cdR[1]}` });
          fixes.cooldown = nv;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameUnifiedSkillCatalog).set(fixes).where(eq(gameUnifiedSkillCatalog.id, s.id));
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: skills.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${skills.length} 個技能，發現 ${changes.length} 項數值需修正`
          : `已修正 ${changes.length} 項技能數值`,
      };
    }),

  // ─── 6. 成就獎勵平衡 ───
  balanceAchievements: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const achs = await db.select().from(gameAchievements).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const achRules = allRules["achievement"] ?? {};
      for (const a of achs) {
        const rewardField = a.rewardType === "stones" ? "stones" : "coins";
        const rewardRange = getRange(achRules, a.rarity, rewardField);

        if (isOutOfRange(a.rewardAmount, rewardRange)) {
          const nv = balanceFix(a.rewardAmount, rewardRange[0], rewardRange[1]);
          changes.push({
            id: a.id,
            name: a.title,
            field: `獎勵(${a.rewardType})`,
            oldValue: a.rewardAmount,
            newValue: nv,
            reason: `${a.rarity} ${a.rewardType} 獎勵應在 ${rewardRange[0]}-${rewardRange[1]}`,
          });
          if (!input.dryRun) {
            await db.update(gameAchievements).set({ rewardAmount: nv }).where(eq(gameAchievements.id, a.id));
          }
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: achs.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掃描 ${achs.length} 個成就，發現 ${changes.length} 項獎勵需修正`
          : `已修正 ${changes.length} 項成就獎勵`,
      };
    }),

  // ─── 7. 一鍵全圖鑑平衡（預覽模式） ───
  balanceAll: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 載入自訂規則
      const allRules = await loadBalanceRulesGrouped();
      const monRules = allRules["monster"] ?? {};
      const msRules = allRules["monsterSkill"] ?? {};
      const itemRules = allRules["item"] ?? {};
      const eqRules = allRules["equipment"] ?? {};
      const skRules = allRules["skill"] ?? {};
      const achRules = allRules["achievement"] ?? {};

      const allChanges: Record<string, BalanceChange[]> = {};
      const summary: { catalog: string; scanned: number; changes: number }[] = [];

      // 怪物（擴展版：所有戰鬥數值 + AI 五行屬性判定）
      const monsters = await db.select().from(gameMonsterCatalog).where(sql`is_active = 1`);
      const monsterChanges: BalanceChange[] = [];
      const MONSTER_FIELD_MAP_ALL: Array<{ ruleField: string; dbField: string; label: string; getter: (m: any) => number }> = [
        { ruleField: "hp",  dbField: "baseHp",           label: "HP",           getter: m => m.baseHp },
        { ruleField: "atk", dbField: "baseAttack",       label: "攻擊",         getter: m => m.baseAttack },
        { ruleField: "def", dbField: "baseDefense",      label: "防禦",         getter: m => m.baseDefense },
        { ruleField: "spd", dbField: "baseSpeed",        label: "速度",         getter: m => m.baseSpeed },
        { ruleField: "matk", dbField: "baseMagicAttack", label: "魔攻",         getter: m => m.baseMagicAttack },
        { ruleField: "mdef", dbField: "baseMagicDefense",label: "魔防",         getter: m => m.baseMagicDefense },
        { ruleField: "mp",  dbField: "baseMp",           label: "MP",           getter: m => m.baseMp },
        { ruleField: "accuracy", dbField: "baseAccuracy",label: "命中",         getter: m => m.baseAccuracy },
        { ruleField: "critRate", dbField: "baseCritRate",label: "暴擊率",       getter: m => m.baseCritRate },
        { ruleField: "critDamage", dbField: "baseCritDamage", label: "暴擊傷害", getter: m => m.baseCritDamage },
        { ruleField: "growthRate", dbField: "growthRate", label: "成長率",       getter: m => m.growthRate },
        { ruleField: "actionsPerTurn", dbField: "actionsPerTurn", label: "每回合行動數", getter: m => m.actionsPerTurn },
        { ruleField: "counterBonus", dbField: "counterBonus", label: "反擊加成", getter: m => m.counterBonus },
      ];

      /**
       * AI 五行屬性分配：嚴格限制比例為兩元組合
       * 合法比例（5:5 / 4:6 / 3:7 / 2:8 / 1:9 / 0:10）
       * 主屬性佔 50-100%，其他隨機分配剩餘
       * 稀有度越高，主屬性越集中
       */
      // 主屬性比例範圍（以 10 為基底）
      const WUXING_PRIMARY_RANGE: Record<string, [number, number]> = {
        common:    [5, 6],   // 50-60%
        uncommon:  [5, 7],   // 50-70%
        rare:      [6, 8],   // 60-80%
        elite:     [7, 9],   // 70-90%
        epic:      [7, 9],   // 70-90%
        boss:      [8, 10],  // 80-100%
        legendary: [8, 10],  // 80-100%
      };

      const WUXING_LIST = ["木", "火", "土", "金", "水"] as const;
      const WUXING_DB_MAP: Record<string, string> = { "木": "wuxingWood", "火": "wuxingFire", "土": "wuxingEarth", "金": "wuxingMetal", "水": "wuxingWater" };

      /**
       * 將剩餘份數隨機分配給 N 個屬性，每個屬性可為 0
       * 保證總和 = remaining，每個值都是整數
       */
      function distributeRemaining(remaining: number, count: number): number[] {
        if (count === 0) return [];
        if (remaining === 0) return Array(count).fill(0);
        const result = Array(count).fill(0);
        // 隨機分配每一份
        for (let i = 0; i < remaining; i++) {
          result[Math.floor(Math.random() * count)]++;
        }
        return result;
      }

      for (const m of monsters) {
        const fixes: Partial<Record<string, any>> = {};

        // 通用數值欄位檢查
        for (const fm of MONSTER_FIELD_MAP_ALL) {
          const range = getRange(monRules, m.rarity, fm.ruleField);
          const val = fm.getter(m);
          if (val != null && isOutOfRange(val, range)) {
            const nv = balanceFix(val, range[0], range[1]);
            monsterChanges.push({ id: m.id, name: m.name, field: fm.label, oldValue: val, newValue: nv, reason: `${m.rarity} ${fm.label} 應在 ${range[0]}-${range[1]}` });
            fixes[fm.dbField] = nv;
          }
        }

        // AI 等級
        const expectedAi = getAiLevel(monRules, m.rarity);
        if (m.aiLevel !== expectedAi) {
          monsterChanges.push({ id: m.id, name: m.name, field: "AI等級", oldValue: m.aiLevel, newValue: expectedAi, reason: `${m.rarity} AI 等級應為 ${expectedAi}` });
          fixes.aiLevel = expectedAi;
        }

        // AI 五行屬性分配（主屬性占 50-100%，其他隨機分配）
        const primaryWuxing = m.wuxing;
        if (primaryWuxing && WUXING_LIST.includes(primaryWuxing as any)) {
          const [minPrimary, maxPrimary] = WUXING_PRIMARY_RANGE[m.rarity] ?? WUXING_PRIMARY_RANGE.common;
          // 在範圍內隨機選取主屬性份數（以 10 為基底）
          const primaryParts = minPrimary + Math.floor(Math.random() * (maxPrimary - minPrimary + 1));
          const remainingParts = 10 - primaryParts;

          // 其他 4 個屬性隨機分配剩餘份數
          const otherElements = WUXING_LIST.filter(w => w !== primaryWuxing);
          const otherParts = distributeRemaining(remainingParts, otherElements.length);

          // 轉換為百分比（份數 × 10）
          const newAlloc: Record<string, number> = {};
          newAlloc[WUXING_DB_MAP[primaryWuxing]] = primaryParts * 10;
          otherElements.forEach((w, i) => {
            newAlloc[WUXING_DB_MAP[w]] = otherParts[i] * 10;
          });

          // 檢查是否需要更新
          const currentAlloc: Record<string, number> = {
            wuxingWood: m.wuxingWood, wuxingFire: m.wuxingFire,
            wuxingEarth: m.wuxingEarth, wuxingMetal: m.wuxingMetal, wuxingWater: m.wuxingWater,
          };
          let wuxingChanged = false;
          for (const [key, val] of Object.entries(newAlloc)) {
            if (currentAlloc[key] !== val) {
              wuxingChanged = true;
              break;
            }
          }
          if (wuxingChanged) {
            const oldStr = `木${currentAlloc.wuxingWood}/火${currentAlloc.wuxingFire}/土${currentAlloc.wuxingEarth}/金${currentAlloc.wuxingMetal}/水${currentAlloc.wuxingWater}`;
            const newStr = `木${newAlloc.wuxingWood}/火${newAlloc.wuxingFire}/土${newAlloc.wuxingEarth}/金${newAlloc.wuxingMetal}/水${newAlloc.wuxingWater}`;
            monsterChanges.push({ id: m.id, name: m.name, field: "五行分配", oldValue: 0, newValue: 0, reason: `主屬${primaryWuxing} ${m.rarity}: ${oldStr} → ${newStr}` });
            Object.assign(fixes, newAlloc);
          }
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameMonsterCatalog).set(fixes).where(eq(gameMonsterCatalog.id, m.id));
        }
      }
      allChanges["怪物"] = monsterChanges;
      summary.push({ catalog: "怪物", scanned: monsters.length, changes: monsterChanges.length });

      // 怪物技能
      const mSkills = await db.select().from(gameUnifiedSkillCatalog).where(eq(gameUnifiedSkillCatalog.usableByMonster, 1));
      const mSkillChanges: BalanceChange[] = [];
      for (const s of mSkills) {
        const powerR = getRange(msRules, s.rarity, "power");
        const mpR = getRange(msRules, s.rarity, "mp");
        const cdR = getRange(msRules, s.rarity, "cd");
        if (isOutOfRange(s.powerPercent, powerR)) mSkillChanges.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: balanceFix(s.powerPercent, powerR[0], powerR[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.mpCost, mpR)) mSkillChanges.push({ id: s.id, name: s.name, field: "MP", oldValue: s.mpCost, newValue: balanceFix(s.mpCost, mpR[0], mpR[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.cooldown, cdR)) mSkillChanges.push({ id: s.id, name: s.name, field: "CD", oldValue: s.cooldown, newValue: balanceFix(s.cooldown, cdR[0], cdR[1]), reason: `${s.rarity}` });
      }
      allChanges["怪物技能"] = mSkillChanges;
      summary.push({ catalog: "怪物技能", scanned: mSkills.length, changes: mSkillChanges.length });

      // 道具
      const items = await db.select().from(gameItemCatalog).where(sql`is_active = 1`);
      const itemChanges: BalanceChange[] = [];
      for (const item of items) {
        if (item.category === "quest" || item.category === "treasure" || item.shopPrice === 0) continue;
        const priceR = getRange(itemRules, item.rarity, "price");
        if (isOutOfRange(item.shopPrice, priceR)) itemChanges.push({ id: item.id, name: item.name, field: "售價", oldValue: item.shopPrice, newValue: balanceFix(item.shopPrice, priceR[0], priceR[1]), reason: `${item.rarity}` });
      }
      allChanges["道具"] = itemChanges;
      summary.push({ catalog: "道具", scanned: items.length, changes: itemChanges.length });

      // 裝備
      const equips = await db.select().from(gameEquipmentCatalog).where(sql`is_active = 1`);
      const equipChanges: BalanceChange[] = [];
      for (const e of equips) {
        const atkR = getRange(eqRules, e.quality, "atk");
        const defR = getRange(eqRules, e.quality, "def");
        const hpR = getRange(eqRules, e.quality, "hp");
        const spdR = getRange(eqRules, e.quality, "spd");
        if (isOutOfRange(e.attackBonus, atkR)) equipChanges.push({ id: e.id, name: e.name, field: "ATK", oldValue: e.attackBonus, newValue: balanceFix(e.attackBonus, atkR[0], atkR[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.defenseBonus, defR)) equipChanges.push({ id: e.id, name: e.name, field: "DEF", oldValue: e.defenseBonus, newValue: balanceFix(e.defenseBonus, defR[0], defR[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.hpBonus, hpR)) equipChanges.push({ id: e.id, name: e.name, field: "HP", oldValue: e.hpBonus, newValue: balanceFix(e.hpBonus, hpR[0], hpR[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.speedBonus, spdR)) equipChanges.push({ id: e.id, name: e.name, field: "SPD", oldValue: e.speedBonus, newValue: balanceFix(e.speedBonus, spdR[0], spdR[1]), reason: `${e.quality}` });
      }
      allChanges["裝備"] = equipChanges;
      summary.push({ catalog: "裝備", scanned: equips.length, changes: equipChanges.length });

      // 人物技能
      const skills = await db.select().from(gameUnifiedSkillCatalog).where(sql`is_active = 1`);
      const skillChanges: BalanceChange[] = [];
      for (const s of skills) {
        const powerR = getRange(skRules, s.rarity, "power");
        const mpR = getRange(skRules, s.rarity, "mp");
        const cdR = getRange(skRules, s.rarity, "cd");
        if (s.skillType !== "passive" && isOutOfRange(s.powerPercent, powerR)) skillChanges.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: balanceFix(s.powerPercent, powerR[0], powerR[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.mpCost, mpR)) skillChanges.push({ id: s.id, name: s.name, field: "MP", oldValue: s.mpCost, newValue: balanceFix(s.mpCost, mpR[0], mpR[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.cooldown, cdR)) skillChanges.push({ id: s.id, name: s.name, field: "CD", oldValue: s.cooldown, newValue: balanceFix(s.cooldown, cdR[0], cdR[1]), reason: `${s.rarity}` });
      }
      allChanges["人物技能"] = skillChanges;
      summary.push({ catalog: "人物技能", scanned: skills.length, changes: skillChanges.length });

      // 成就
      const achs = await db.select().from(gameAchievements).where(sql`is_active = 1`);
      const achChanges: BalanceChange[] = [];
      for (const a of achs) {
        const rewardField = a.rewardType === "stones" ? "stones" : "coins";
        const rewardRange = getRange(achRules, a.rarity, rewardField);
        if (isOutOfRange(a.rewardAmount, rewardRange)) achChanges.push({ id: a.id, name: a.title, field: `獎勵(${a.rewardType})`, oldValue: a.rewardAmount, newValue: balanceFix(a.rewardAmount, rewardRange[0], rewardRange[1]), reason: `${a.rarity}` });
      }
      allChanges["成就"] = achChanges;
      summary.push({ catalog: "成就", scanned: achs.length, changes: achChanges.length });

      const totalChanges = summary.reduce((s, c) => s + c.changes, 0);
      const totalScanned = summary.reduce((s, c) => s + c.scanned, 0);

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned,
        totalChanges,
        summary,
        allChanges,
        message: `全圖鑑平衡掌描完成：共掌描 ${totalScanned} 項，發現 ${totalChanges} 項需修正`,
      };
    }),

  // ─── 8. 天命考核技能平衡 ───
  balanceQuestSkills: adminProcedure
    .input(z.object({ dryRun: z.boolean().default(true) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const skills = await db.select().from(gameUnifiedSkillCatalog);
      const changes: BalanceChange[] = [];

      const allRules = await loadBalanceRulesGrouped();
      const qsRules = allRules["questSkill"] ?? {};

      for (const s of skills) {
        const fixes: Partial<Record<string, any>> = {};
        const powerR = getRange(qsRules, s.rarity, "power");
        const mpR = getRange(qsRules, s.rarity, "mp");
        const cdR = getRange(qsRules, s.rarity, "cd");
        const goldR = getRange(qsRules, s.rarity, "gold");
        const soulR = getRange(qsRules, s.rarity, "soul");

        // 檢查威力
        if (s.skillType !== "passive" && s.skillType !== "production" && isOutOfRange(s.powerPercent, powerR)) {
          const nv = balanceFix(s.powerPercent, powerR[0], powerR[1]);
          changes.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: nv, reason: `${s.rarity} 威力應在 ${powerR[0]}-${powerR[1]}%` });
          fixes.powerPercent = nv;
        }
        // 檢查 MP
        if (isOutOfRange(s.mpCost, mpR)) {
          const nv = balanceFix(s.mpCost, mpR[0], mpR[1]);
          changes.push({ id: s.id, name: s.name, field: "MP消耗", oldValue: s.mpCost, newValue: nv, reason: `${s.rarity} MP 應在 ${mpR[0]}-${mpR[1]}` });
          fixes.mpCost = nv;
        }
        // 檢查冷卻
        if (isOutOfRange(s.cooldown, cdR)) {
          const nv = balanceFix(s.cooldown, cdR[0], cdR[1]);
          changes.push({ id: s.id, name: s.name, field: "冷卻", oldValue: s.cooldown, newValue: nv, reason: `${s.rarity} CD 應在 ${cdR[0]}-${cdR[1]}` });
          fixes.cooldown = nv;
        }
        // 檢查習得代價（金幣 + 魂晶）
        const learnCost = s.learnCost as any;
        if (learnCost && typeof learnCost === "object") {
          const gold = learnCost.gold ?? 0;
          const soul = learnCost.soulCrystal ?? 0;
          let costChanged = false;
          const newCost = { ...learnCost };

          if (gold > 0 && isOutOfRange(gold, goldR)) {
            const nv = balanceFix(gold, goldR[0], goldR[1]);
            changes.push({ id: s.id, name: s.name, field: "金幣代價", oldValue: gold, newValue: nv, reason: `${s.rarity} 金幣應在 ${goldR[0]}-${goldR[1]}` });
            newCost.gold = nv;
            costChanged = true;
          }
          if (soul > 0 && isOutOfRange(soul, soulR)) {
            const nv = balanceFix(soul, soulR[0], soulR[1]);
            changes.push({ id: s.id, name: s.name, field: "魂晶代價", oldValue: soul, newValue: nv, reason: `${s.rarity} 魂晶應在 ${soulR[0]}-${soulR[1]}` });
            newCost.soulCrystal = nv;
            costChanged = true;
          }
          if (costChanged) {
            fixes.learnCost = newCost;
          }
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameUnifiedSkillCatalog).set({ ...fixes, updatedAt: Date.now() }).where(eq(gameUnifiedSkillCatalog.id, s.id));
        }
      }

      return {
        success: true,
        dryRun: input.dryRun,
        totalScanned: skills.length,
        totalChanges: changes.length,
        changes,
        message: input.dryRun
          ? `預覽模式：掌描 ${skills.length} 個天命考核技能，發現 ${changes.length} 項數值需修正`
          : `已修正 ${changes.length} 項天命考核技能數值`,
      };
    }),

  /**
   * 大平衡：一鍵校準所有系統（怪物/怪物技能/人物技能/裝備/商店價格）
   */
  runFullBalance: adminProcedure
    .input(z.object({
      dryRun: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { runFullBalance: doBalance } = await import("../scripts/runBalance");
      if (input.dryRun) {
        // 預覽模式：只回報會改多少筆
        return {
          success: true,
          dryRun: true,
          message: "大平衡預覽模式：請確認後以 dryRun=false 執行",
          note: "將校準：怪物HP/ATK/DEF/SPD、怪物技能威力/MP/CD、人物技能威力/MP/CD/價格、裝備數值、商店價格",
        };
      }
      const result = await doBalance();
      return {
        success: true,
        dryRun: false,
        ...result,
        message: `大平衡完成：怪物${result.monstersUpdated} 怪技${result.monsterSkillsUpdated} 人技${result.playerSkillsUpdated} 裝備${result.equipmentsUpdated}+${result.equipTemplatesUpdated} 商店${result.shopVirtualUpdated}+${result.shopSpiritUpdated}+${result.shopHiddenUpdated}`,
      };
    }),
});
