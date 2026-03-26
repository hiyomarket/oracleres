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
  gameSkillCatalog,
  gameAchievements,
  gameMonsterSkillCatalog,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ═══════════════════════════════════════════════════════════════
// 平衡基準值定義
// ═══════════════════════════════════════════════════════════════

/** 怪物數值基準（按稀有度） */
const MONSTER_BALANCE: Record<string, { hp: [number, number]; atk: [number, number]; def: [number, number]; spd: [number, number]; aiLevel: number }> = {
  common:    { hp: [30, 120],   atk: [5, 20],   def: [2, 12],  spd: [3, 12],  aiLevel: 1 },
  rare:      { hp: [80, 250],   atk: [15, 40],  def: [8, 25],  spd: [5, 18],  aiLevel: 2 },
  elite:     { hp: [150, 350],  atk: [25, 55],  def: [15, 35], spd: [8, 22],  aiLevel: 2 },
  epic:      { hp: [200, 400],  atk: [30, 65],  def: [18, 40], spd: [10, 25], aiLevel: 3 },
  boss:      { hp: [300, 500],  atk: [40, 80],  def: [25, 50], spd: [12, 28], aiLevel: 3 },
  legendary: { hp: [350, 500],  atk: [50, 80],  def: [30, 50], spd: [15, 30], aiLevel: 3 },
};

/** 怪物技能數值基準（按稀有度） */
const MONSTER_SKILL_BALANCE: Record<string, { power: [number, number]; mp: [number, number]; cd: [number, number] }> = {
  common:    { power: [60, 130],  mp: [0, 10],  cd: [0, 2] },
  rare:      { power: [90, 160],  mp: [3, 15],  cd: [0, 3] },
  epic:      { power: [120, 210], mp: [5, 25],  cd: [1, 4] },
  legendary: { power: [150, 260], mp: [8, 30],  cd: [1, 5] },
};

/** 道具售價基準（按稀有度） */
const ITEM_PRICE_BALANCE: Record<string, [number, number]> = {
  common:    [10, 150],
  rare:      [80, 600],
  epic:      [400, 2500],
  legendary: [1500, 10000],
};

/** 裝備數值基準（按品質） */
const EQUIP_BALANCE: Record<string, { atk: [number, number]; def: [number, number]; hp: [number, number]; spd: [number, number] }> = {
  white:  { atk: [0, 8],   def: [0, 6],   hp: [0, 30],   spd: [0, 4] },
  green:  { atk: [3, 15],  def: [2, 12],  hp: [5, 50],   spd: [0, 8] },
  blue:   { atk: [8, 22],  def: [5, 18],  hp: [15, 75],  spd: [2, 12] },
  purple: { atk: [12, 28], def: [8, 22],  hp: [25, 90],  spd: [3, 14] },
  orange: { atk: [18, 35], def: [12, 28], hp: [40, 110], spd: [5, 16] },
  red:    { atk: [25, 40], def: [18, 35], hp: [60, 130], spd: [8, 20] },
};

/** 人物技能數值基準（按稀有度） */
const SKILL_BALANCE: Record<string, { power: [number, number]; mp: [number, number]; cd: [number, number]; price: [number, number] }> = {
  common:    { power: [70, 130],  mp: [0, 12],  cd: [0, 2], price: [50, 300] },
  rare:      { power: [100, 170], mp: [5, 20],  cd: [1, 3], price: [200, 800] },
  epic:      { power: [140, 220], mp: [10, 35], cd: [1, 4], price: [500, 3000] },
  legendary: { power: [180, 280], mp: [15, 50], cd: [2, 5], price: [2000, 10000] },
};

/** 成就獎勵基準（按稀有度） */
const ACHIEVEMENT_BALANCE: Record<string, { coins: [number, number]; stones: [number, number] }> = {
  common:    { coins: [10, 80],    stones: [1, 5] },
  rare:      { coins: [50, 250],   stones: [5, 20] },
  epic:      { coins: [200, 800],  stones: [15, 50] },
  legendary: { coins: [500, 2000], stones: [30, 100] },
};

// ═══════════════════════════════════════════════════════════════
// 工具函數
// ═══════════════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
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

      const monsters = await db.select().from(gameMonsterCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      for (const m of monsters) {
        const ref = MONSTER_BALANCE[m.rarity] ?? MONSTER_BALANCE.common;
        const fixes: Partial<Record<string, number>> = {};

        if (isOutOfRange(m.baseHp, ref.hp)) {
          const nv = clamp(m.baseHp, ref.hp[0], ref.hp[1]);
          changes.push({ id: m.id, name: m.name, field: "HP", oldValue: m.baseHp, newValue: nv, reason: `${m.rarity} HP 應在 ${ref.hp[0]}-${ref.hp[1]}` });
          fixes.baseHp = nv;
        }
        if (isOutOfRange(m.baseAttack, ref.atk)) {
          const nv = clamp(m.baseAttack, ref.atk[0], ref.atk[1]);
          changes.push({ id: m.id, name: m.name, field: "攻擊", oldValue: m.baseAttack, newValue: nv, reason: `${m.rarity} ATK 應在 ${ref.atk[0]}-${ref.atk[1]}` });
          fixes.baseAttack = nv;
        }
        if (isOutOfRange(m.baseDefense, ref.def)) {
          const nv = clamp(m.baseDefense, ref.def[0], ref.def[1]);
          changes.push({ id: m.id, name: m.name, field: "防禦", oldValue: m.baseDefense, newValue: nv, reason: `${m.rarity} DEF 應在 ${ref.def[0]}-${ref.def[1]}` });
          fixes.baseDefense = nv;
        }
        if (isOutOfRange(m.baseSpeed, ref.spd)) {
          const nv = clamp(m.baseSpeed, ref.spd[0], ref.spd[1]);
          changes.push({ id: m.id, name: m.name, field: "速度", oldValue: m.baseSpeed, newValue: nv, reason: `${m.rarity} SPD 應在 ${ref.spd[0]}-${ref.spd[1]}` });
          fixes.baseSpeed = nv;
        }
        // AI 等級分配
        if (m.aiLevel !== ref.aiLevel) {
          changes.push({ id: m.id, name: m.name, field: "AI等級", oldValue: m.aiLevel, newValue: ref.aiLevel, reason: `${m.rarity} AI 等級應為 ${ref.aiLevel}` });
          fixes.aiLevel = ref.aiLevel;
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

      const skills = await db.select().from(gameMonsterSkillCatalog);
      const changes: BalanceChange[] = [];

      for (const s of skills) {
        const ref = MONSTER_SKILL_BALANCE[s.rarity] ?? MONSTER_SKILL_BALANCE.common;
        const fixes: Partial<Record<string, number>> = {};

        if (isOutOfRange(s.powerPercent, ref.power)) {
          const nv = clamp(s.powerPercent, ref.power[0], ref.power[1]);
          changes.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: nv, reason: `${s.rarity} 威力應在 ${ref.power[0]}-${ref.power[1]}%` });
          fixes.powerPercent = nv;
        }
        if (isOutOfRange(s.mpCost, ref.mp)) {
          const nv = clamp(s.mpCost, ref.mp[0], ref.mp[1]);
          changes.push({ id: s.id, name: s.name, field: "MP消耗", oldValue: s.mpCost, newValue: nv, reason: `${s.rarity} MP 應在 ${ref.mp[0]}-${ref.mp[1]}` });
          fixes.mpCost = nv;
        }
        if (isOutOfRange(s.cooldown, ref.cd)) {
          const nv = clamp(s.cooldown, ref.cd[0], ref.cd[1]);
          changes.push({ id: s.id, name: s.name, field: "冷卻", oldValue: s.cooldown, newValue: nv, reason: `${s.rarity} CD 應在 ${ref.cd[0]}-${ref.cd[1]}` });
          fixes.cooldown = nv;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameMonsterSkillCatalog).set(fixes).where(eq(gameMonsterSkillCatalog.id, s.id));
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

      for (const item of items) {
        const ref = ITEM_PRICE_BALANCE[item.rarity] ?? ITEM_PRICE_BALANCE.common;
        // 只檢查有售價的道具（shopPrice > 0 或 category 不是 quest/treasure）
        if (item.category === "quest" || item.category === "treasure") continue;
        if (item.shopPrice === 0) continue; // 不檢查免費道具

        if (isOutOfRange(item.shopPrice, ref)) {
          const nv = clamp(item.shopPrice, ref[0], ref[1]);
          changes.push({ id: item.id, name: item.name, field: "售價", oldValue: item.shopPrice, newValue: nv, reason: `${item.rarity} 售價應在 ${ref[0]}-${ref[1]}` });
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

      for (const e of equips) {
        const ref = EQUIP_BALANCE[e.quality] ?? EQUIP_BALANCE.white;
        const fixes: Partial<Record<string, number>> = {};

        if (isOutOfRange(e.attackBonus, ref.atk)) {
          const nv = clamp(e.attackBonus, ref.atk[0], ref.atk[1]);
          changes.push({ id: e.id, name: e.name, field: "攻擊加成", oldValue: e.attackBonus, newValue: nv, reason: `${e.quality} 品質 ATK 應在 ${ref.atk[0]}-${ref.atk[1]}` });
          fixes.attackBonus = nv;
        }
        if (isOutOfRange(e.defenseBonus, ref.def)) {
          const nv = clamp(e.defenseBonus, ref.def[0], ref.def[1]);
          changes.push({ id: e.id, name: e.name, field: "防禦加成", oldValue: e.defenseBonus, newValue: nv, reason: `${e.quality} 品質 DEF 應在 ${ref.def[0]}-${ref.def[1]}` });
          fixes.defenseBonus = nv;
        }
        if (isOutOfRange(e.hpBonus, ref.hp)) {
          const nv = clamp(e.hpBonus, ref.hp[0], ref.hp[1]);
          changes.push({ id: e.id, name: e.name, field: "HP加成", oldValue: e.hpBonus, newValue: nv, reason: `${e.quality} 品質 HP 應在 ${ref.hp[0]}-${ref.hp[1]}` });
          fixes.hpBonus = nv;
        }
        if (isOutOfRange(e.speedBonus, ref.spd)) {
          const nv = clamp(e.speedBonus, ref.spd[0], ref.spd[1]);
          changes.push({ id: e.id, name: e.name, field: "速度加成", oldValue: e.speedBonus, newValue: nv, reason: `${e.quality} 品質 SPD 應在 ${ref.spd[0]}-${ref.spd[1]}` });
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

      const skills = await db.select().from(gameSkillCatalog).where(sql`is_active = 1`);
      const changes: BalanceChange[] = [];

      for (const s of skills) {
        const ref = SKILL_BALANCE[s.rarity] ?? SKILL_BALANCE.common;
        const fixes: Partial<Record<string, number>> = {};

        // 被動技能不檢查威力
        if (s.skillType !== "passive" && isOutOfRange(s.powerPercent, ref.power)) {
          const nv = clamp(s.powerPercent, ref.power[0], ref.power[1]);
          changes.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: nv, reason: `${s.rarity} 威力應在 ${ref.power[0]}-${ref.power[1]}%` });
          fixes.powerPercent = nv;
        }
        if (isOutOfRange(s.mpCost, ref.mp)) {
          const nv = clamp(s.mpCost, ref.mp[0], ref.mp[1]);
          changes.push({ id: s.id, name: s.name, field: "MP消耗", oldValue: s.mpCost, newValue: nv, reason: `${s.rarity} MP 應在 ${ref.mp[0]}-${ref.mp[1]}` });
          fixes.mpCost = nv;
        }
        if (isOutOfRange(s.cooldown, ref.cd)) {
          const nv = clamp(s.cooldown, ref.cd[0], ref.cd[1]);
          changes.push({ id: s.id, name: s.name, field: "冷卻", oldValue: s.cooldown, newValue: nv, reason: `${s.rarity} CD 應在 ${ref.cd[0]}-${ref.cd[1]}` });
          fixes.cooldown = nv;
        }
        // 商店售價（只檢查 acquireType=shop 的技能）
        if (s.acquireType === "shop" && s.shopPrice > 0 && isOutOfRange(s.shopPrice, ref.price)) {
          const nv = clamp(s.shopPrice, ref.price[0], ref.price[1]);
          changes.push({ id: s.id, name: s.name, field: "售價", oldValue: s.shopPrice, newValue: nv, reason: `${s.rarity} 售價應在 ${ref.price[0]}-${ref.price[1]}` });
          fixes.shopPrice = nv;
        }

        if (!input.dryRun && Object.keys(fixes).length > 0) {
          await db.update(gameSkillCatalog).set(fixes).where(eq(gameSkillCatalog.id, s.id));
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

      for (const a of achs) {
        const ref = ACHIEVEMENT_BALANCE[a.rarity] ?? ACHIEVEMENT_BALANCE.common;
        const rewardRange = a.rewardType === "stones" ? ref.stones : ref.coins;

        if (isOutOfRange(a.rewardAmount, rewardRange)) {
          const nv = clamp(a.rewardAmount, rewardRange[0], rewardRange[1]);
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

      // 收集所有圖鑑的平衡結果
      const allChanges: Record<string, BalanceChange[]> = {};
      const summary: { catalog: string; scanned: number; changes: number }[] = [];

      // 怪物
      const monsters = await db.select().from(gameMonsterCatalog).where(sql`is_active = 1`);
      const monsterChanges: BalanceChange[] = [];
      for (const m of monsters) {
        const ref = MONSTER_BALANCE[m.rarity] ?? MONSTER_BALANCE.common;
        if (isOutOfRange(m.baseHp, ref.hp)) monsterChanges.push({ id: m.id, name: m.name, field: "HP", oldValue: m.baseHp, newValue: clamp(m.baseHp, ref.hp[0], ref.hp[1]), reason: `${m.rarity}` });
        if (isOutOfRange(m.baseAttack, ref.atk)) monsterChanges.push({ id: m.id, name: m.name, field: "ATK", oldValue: m.baseAttack, newValue: clamp(m.baseAttack, ref.atk[0], ref.atk[1]), reason: `${m.rarity}` });
        if (isOutOfRange(m.baseDefense, ref.def)) monsterChanges.push({ id: m.id, name: m.name, field: "DEF", oldValue: m.baseDefense, newValue: clamp(m.baseDefense, ref.def[0], ref.def[1]), reason: `${m.rarity}` });
        if (isOutOfRange(m.baseSpeed, ref.spd)) monsterChanges.push({ id: m.id, name: m.name, field: "SPD", oldValue: m.baseSpeed, newValue: clamp(m.baseSpeed, ref.spd[0], ref.spd[1]), reason: `${m.rarity}` });
        if (m.aiLevel !== ref.aiLevel) monsterChanges.push({ id: m.id, name: m.name, field: "AI等級", oldValue: m.aiLevel, newValue: ref.aiLevel, reason: `${m.rarity}` });
      }
      allChanges["怪物"] = monsterChanges;
      summary.push({ catalog: "怪物", scanned: monsters.length, changes: monsterChanges.length });

      // 怪物技能
      const mSkills = await db.select().from(gameMonsterSkillCatalog);
      const mSkillChanges: BalanceChange[] = [];
      for (const s of mSkills) {
        const ref = MONSTER_SKILL_BALANCE[s.rarity] ?? MONSTER_SKILL_BALANCE.common;
        if (isOutOfRange(s.powerPercent, ref.power)) mSkillChanges.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: clamp(s.powerPercent, ref.power[0], ref.power[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.mpCost, ref.mp)) mSkillChanges.push({ id: s.id, name: s.name, field: "MP", oldValue: s.mpCost, newValue: clamp(s.mpCost, ref.mp[0], ref.mp[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.cooldown, ref.cd)) mSkillChanges.push({ id: s.id, name: s.name, field: "CD", oldValue: s.cooldown, newValue: clamp(s.cooldown, ref.cd[0], ref.cd[1]), reason: `${s.rarity}` });
      }
      allChanges["怪物技能"] = mSkillChanges;
      summary.push({ catalog: "怪物技能", scanned: mSkills.length, changes: mSkillChanges.length });

      // 道具
      const items = await db.select().from(gameItemCatalog).where(sql`is_active = 1`);
      const itemChanges: BalanceChange[] = [];
      for (const item of items) {
        if (item.category === "quest" || item.category === "treasure" || item.shopPrice === 0) continue;
        const ref = ITEM_PRICE_BALANCE[item.rarity] ?? ITEM_PRICE_BALANCE.common;
        if (isOutOfRange(item.shopPrice, ref)) itemChanges.push({ id: item.id, name: item.name, field: "售價", oldValue: item.shopPrice, newValue: clamp(item.shopPrice, ref[0], ref[1]), reason: `${item.rarity}` });
      }
      allChanges["道具"] = itemChanges;
      summary.push({ catalog: "道具", scanned: items.length, changes: itemChanges.length });

      // 裝備
      const equips = await db.select().from(gameEquipmentCatalog).where(sql`is_active = 1`);
      const equipChanges: BalanceChange[] = [];
      for (const e of equips) {
        const ref = EQUIP_BALANCE[e.quality] ?? EQUIP_BALANCE.white;
        if (isOutOfRange(e.attackBonus, ref.atk)) equipChanges.push({ id: e.id, name: e.name, field: "ATK", oldValue: e.attackBonus, newValue: clamp(e.attackBonus, ref.atk[0], ref.atk[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.defenseBonus, ref.def)) equipChanges.push({ id: e.id, name: e.name, field: "DEF", oldValue: e.defenseBonus, newValue: clamp(e.defenseBonus, ref.def[0], ref.def[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.hpBonus, ref.hp)) equipChanges.push({ id: e.id, name: e.name, field: "HP", oldValue: e.hpBonus, newValue: clamp(e.hpBonus, ref.hp[0], ref.hp[1]), reason: `${e.quality}` });
        if (isOutOfRange(e.speedBonus, ref.spd)) equipChanges.push({ id: e.id, name: e.name, field: "SPD", oldValue: e.speedBonus, newValue: clamp(e.speedBonus, ref.spd[0], ref.spd[1]), reason: `${e.quality}` });
      }
      allChanges["裝備"] = equipChanges;
      summary.push({ catalog: "裝備", scanned: equips.length, changes: equipChanges.length });

      // 人物技能
      const skills = await db.select().from(gameSkillCatalog).where(sql`is_active = 1`);
      const skillChanges: BalanceChange[] = [];
      for (const s of skills) {
        const ref = SKILL_BALANCE[s.rarity] ?? SKILL_BALANCE.common;
        if (s.skillType !== "passive" && isOutOfRange(s.powerPercent, ref.power)) skillChanges.push({ id: s.id, name: s.name, field: "威力%", oldValue: s.powerPercent, newValue: clamp(s.powerPercent, ref.power[0], ref.power[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.mpCost, ref.mp)) skillChanges.push({ id: s.id, name: s.name, field: "MP", oldValue: s.mpCost, newValue: clamp(s.mpCost, ref.mp[0], ref.mp[1]), reason: `${s.rarity}` });
        if (isOutOfRange(s.cooldown, ref.cd)) skillChanges.push({ id: s.id, name: s.name, field: "CD", oldValue: s.cooldown, newValue: clamp(s.cooldown, ref.cd[0], ref.cd[1]), reason: `${s.rarity}` });
      }
      allChanges["人物技能"] = skillChanges;
      summary.push({ catalog: "人物技能", scanned: skills.length, changes: skillChanges.length });

      // 成就
      const achs = await db.select().from(gameAchievements).where(sql`is_active = 1`);
      const achChanges: BalanceChange[] = [];
      for (const a of achs) {
        const ref = ACHIEVEMENT_BALANCE[a.rarity] ?? ACHIEVEMENT_BALANCE.common;
        const rewardRange = a.rewardType === "stones" ? ref.stones : ref.coins;
        if (isOutOfRange(a.rewardAmount, rewardRange)) achChanges.push({ id: a.id, name: a.title, field: `獎勵(${a.rewardType})`, oldValue: a.rewardAmount, newValue: clamp(a.rewardAmount, rewardRange[0], rewardRange[1]), reason: `${a.rarity}` });
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
        message: `全圖鑑平衡掃描完成：共掃描 ${totalScanned} 項，發現 ${totalChanges} 項需修正`,
      };
    }),
});
