/**
 * AI 後台功能 Router
 * 1. AI 商店自動抓取：從圖鑑中智慧挑選合適商品上架
 * 2. 一鍵 AI 批量新增圖鑑：道具/裝備/魔物/技能書/成就，每次 10 筆
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
  gameVirtualShop,
  gameSpiritShop,
  gameHiddenShopPool,
  gameMonsterSkillCatalog,
  gameNpcCatalog,
  gameQuestSkillCatalog,
  gameQuestSteps,
  gamePetCatalog,
  gamePetInnateSkills,
} from "../../drizzle/schema";
import { RACE_HP_MULTIPLIER, auditPetCatalog } from "../services/petEngine";
import { sql, like, eq, desc, asc, inArray } from "drizzle-orm";
import { auditMonster, auditSkill, auditEquipment, auditItemPrice, auditAndFix } from "../services/aiValueAudit";
import { generateImage } from "../_core/imageGeneration";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理員權限" });
  }
  return next({ ctx });
});

// ===== 自動編碼工具 =====
const WUXING_CODE: Record<string, string> = {
  "木": "W", "火": "F", "土": "E", "金": "M", "水": "Wt",
};

async function generateNextId(
  db: any,
  table: any,
  idColumn: any,
  prefix: string,
  wuxing: string
): Promise<string> {
  const code = WUXING_CODE[wuxing] || "X";
  const fullPrefix = `${prefix}_${code}`;
  const rows = await db
    .select({ id: idColumn })
    .from(table)
    .where(like(idColumn, `${fullPrefix}%`))
    .orderBy(desc(idColumn))
    .limit(1);
  let nextNum = 1;
  if (rows.length > 0) {
    const lastId = rows[0].id as string;
    const numPart = lastId.replace(fullPrefix, "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `${fullPrefix}${String(nextNum).padStart(3, "0")}`;
}

async function generateAchievementId(db: any): Promise<string> {
  const rows = await db
    .select({ achId: gameAchievements.achId })
    .from(gameAchievements)
    .orderBy(desc(gameAchievements.achId))
    .limit(1);
  let nextNum = 1;
  if (rows.length > 0 && rows[0].achId) {
    const numPart = rows[0].achId.replace("ACH_", "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `ACH_${String(nextNum).padStart(3, "0")}`;
}

// ===== 魔物技能 ID 生成器 =====
async function generateNextMonsterSkillId(db: any): Promise<string> {
  const rows = await db
    .select({ id: gameMonsterSkillCatalog.monsterSkillId })
    .from(gameMonsterSkillCatalog)
    .where(like(gameMonsterSkillCatalog.monsterSkillId, "SK_M%"))
    .orderBy(desc(gameMonsterSkillCatalog.monsterSkillId))
    .limit(1);
  let nextNum = 1;
  if (rows.length > 0) {
    const numPart = rows[0].id.replace("SK_M", "");
    nextNum = parseInt(numPart, 10) + 1;
    if (isNaN(nextNum)) nextNum = 1;
  }
  return `SK_M${String(nextNum).padStart(3, "0")}`;
}

// ===== AI 商店自動抓取 =====
export const gameAIRouter = router({

  /**
   * AI 智慧商店上架：從圖鑑中挑選合適的道具、裝備、技能書上架到商店
   * 一般商店：20 件（common/rare 道具 + 裝備 + 技能書）
   * 隱藏商店：10 件（rare/epic/legendary 稀有商品）
   */
  aiRefreshShop: adminProcedure
    .input(z.object({
      shopType: z.enum(["normal", "hidden", "both"]).default("both"),
    }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const shopType = input?.shopType ?? "both";

      // 取得所有啟用的道具
      const allItems = await db.select({
        itemId: gameItemCatalog.itemId,
        name: gameItemCatalog.name,
        rarity: gameItemCatalog.rarity,
        category: gameItemCatalog.category,
        wuxing: gameItemCatalog.wuxing,
        shopPrice: gameItemCatalog.shopPrice,
      }).from(gameItemCatalog).where(sql`is_active = 1`);

      // 取得所有啟用的裝備
      const allEquips = await db.select({
        equipId: gameEquipmentCatalog.equipId,
        name: gameEquipmentCatalog.name,
        rarity: gameEquipmentCatalog.rarity,
        wuxing: gameEquipmentCatalog.wuxing,
        slot: gameEquipmentCatalog.slot,
        tier: gameEquipmentCatalog.tier,
        levelRequired: gameEquipmentCatalog.levelRequired,
      }).from(gameEquipmentCatalog).where(sql`is_active = 1`);

      // 取得所有啟用的技能
      const allSkills = await db.select({
        skillId: gameSkillCatalog.skillId,
        name: gameSkillCatalog.name,
        rarity: gameSkillCatalog.rarity,
        wuxing: gameSkillCatalog.wuxing,
        category: gameSkillCatalog.category,
        shopPrice: gameSkillCatalog.shopPrice,
        acquireType: gameSkillCatalog.acquireType,
      }).from(gameSkillCatalog).where(sql`is_active = 1`);

      // 合併成一個商品池
      const allProducts = [
        ...allItems.map(i => ({
          id: i.itemId, name: i.name, rarity: i.rarity, wuxing: i.wuxing,
          type: "item" as const, category: i.category, price: i.shopPrice || 0,
        })),
        ...allEquips.map(e => ({
          id: e.equipId, name: e.name, rarity: e.rarity, wuxing: e.wuxing,
          type: "equipment" as const, category: e.slot, price: 0,
        })),
        ...allSkills.filter(s => s.acquireType === "shop").map(s => ({
          id: s.skillId, name: s.name, rarity: s.rarity, wuxing: s.wuxing,
          type: "skill" as const, category: s.category, price: s.shopPrice || 0,
        })),
      ];

      if (allProducts.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "圖鑑中沒有可上架的商品，請先新增道具/裝備/技能" });
      }

      // 用 AI 挑選合適的商品
      const productListStr = allProducts.map(p =>
        `${p.id}|${p.name}|${p.type}|${p.rarity}|${p.wuxing}|${p.category}`
      ).join("\n");

      const aiPrompt = `你是一個遊戲商店管理 AI。以下是所有可用商品列表（格式：ID|名稱|類型|稀有度|五行|分類）：

${productListStr}

請幫我挑選商品上架到商店，要求：
1. 一般商店（normal）：挑選 20 件，以 common 和 rare 為主，五行分布均衡，種類多樣（道具、裝備、技能書混搭）
2. 隱藏商店（hidden）：挑選 10 件，以 rare、epic、legendary 為主，要有吸引力的稀有商品

回覆 JSON 格式（不要加 markdown 標記）：
{
  "normal": ["商品ID1", "商品ID2", ...],
  "hidden": ["商品ID1", "商品ID2", ...]
}

注意：
- 每個商品只能出現在一個商店中
- 優先選擇名稱有趣、稀有度合理的商品
- quest 和 treasure 類別的道具不要上架
- 確保五行（木火土金水）分布盡量均衡`;

      let normalIds: string[] = [];
      let hiddenIds: string[] = [];

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是遊戲商店管理 AI，只回覆 JSON，不加任何 markdown 標記或解釋。" },
            { role: "user", content: aiPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "shop_selection",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  normal: { type: "array", items: { type: "string" }, description: "一般商店商品 ID 列表" },
                  hidden: { type: "array", items: { type: "string" }, description: "隱藏商店商品 ID 列表" },
                },
                required: ["normal", "hidden"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (content && typeof content === "string") {
          const parsed = JSON.parse(content);
          normalIds = (parsed.normal || []).filter((id: string) => allProducts.some(p => p.id === id));
          hiddenIds = (parsed.hidden || []).filter((id: string) => allProducts.some(p => p.id === id));
        }
      } catch (err) {
        console.error("[AI Shop] LLM 呼叫失敗，使用隨機選取:", err);
      }

      // Fallback：如果 AI 沒有回覆或回覆不足，用隨機補齊
      const usedIds = new Set([...normalIds, ...hiddenIds]);
      if (normalIds.length < 20 && (shopType === "normal" || shopType === "both")) {
        const pool = allProducts.filter(p =>
          !usedIds.has(p.id) &&
          (p.rarity === "common" || p.rarity === "rare") &&
          p.category !== "quest" && p.category !== "treasure"
        ).sort(() => Math.random() - 0.5);
        while (normalIds.length < 20 && pool.length > 0) {
          const item = pool.shift()!;
          normalIds.push(item.id);
          usedIds.add(item.id);
        }
      }
      if (hiddenIds.length < 10 && (shopType === "hidden" || shopType === "both")) {
        const pool = allProducts.filter(p =>
          !usedIds.has(p.id) &&
          (p.rarity === "rare" || p.rarity === "epic" || p.rarity === "legendary")
        ).sort(() => Math.random() - 0.5);
        while (hiddenIds.length < 10 && pool.length > 0) {
          const item = pool.shift()!;
          hiddenIds.push(item.id);
          usedIds.add(item.id);
        }
      }

      // 計算售價
      function calcPrice(rarity: string, type: string, currency: "coins" | "stones"): number {
        if (currency === "coins") {
          const base: Record<string, number> = { common: 50, rare: 200, epic: 800, legendary: 3000 };
          const typeMulti: Record<string, number> = { item: 1, equipment: 2.5, skill: 2 };
          return Math.floor((base[rarity] ?? 100) * (typeMulti[type] ?? 1));
        } else {
          const base: Record<string, number> = { common: 5, rare: 20, epic: 80, legendary: 300 };
          return base[rarity] ?? 20;
        }
      }

      let normalCount = 0;
      let hiddenCount = 0;

      // 上架一般商店
      if (shopType === "normal" || shopType === "both") {
        await db.delete(gameVirtualShop).where(sql`node_id = '' OR node_id IS NULL`);
        for (let i = 0; i < normalIds.length; i++) {
          const product = allProducts.find(p => p.id === normalIds[i]);
          if (!product) continue;
          const typeLabel = product.type === "item" ? "道具" : product.type === "equipment" ? "裝備" : "技能書";
          await db.insert(gameVirtualShop).values({
            itemKey: product.id,
            displayName: product.name,
            description: `【${product.wuxing}行】${typeLabel}`,
            priceCoins: product.price > 0 ? product.price : calcPrice(product.rarity, product.type, "coins"),
            quantity: 1,
            stock: -1,
            nodeId: "",
            sortOrder: i,
            isOnSale: 1,
          });
          normalCount++;
        }
      }

      // 上架隱藏商店
      if (shopType === "hidden" || shopType === "both") {
        await db.delete(gameHiddenShopPool).where(sql`1=1`);
        for (let i = 0; i < hiddenIds.length; i++) {
          const product = allProducts.find(p => p.id === hiddenIds[i]);
          if (!product) continue;
          await db.insert(gameHiddenShopPool).values({
            itemKey: product.id,
            displayName: product.name,
            description: `【${product.wuxing}行】稀有商品`,
            currencyType: product.rarity === "legendary" ? "stones" : "coins",
            price: product.rarity === "legendary"
              ? calcPrice(product.rarity, product.type, "stones")
              : calcPrice(product.rarity, product.type, "coins"),
            quantity: 1,
            weight: product.rarity === "legendary" ? 5 : product.rarity === "epic" ? 15 : 30,
            rarity: (product.rarity === "common" ? "common" : product.rarity === "rare" ? "rare" : product.rarity === "epic" ? "epic" : "legendary") as any,
            isActive: 1,
          });
          hiddenCount++;
        }
      }

      return {
        success: true,
        normalCount,
        hiddenCount,
        message: `AI 商店上架完成：一般商店 ${normalCount} 件，隱藏商店 ${hiddenCount} 件`,
      };
    }),

  /**
   * 一鍵 AI 批量新增圖鑑
   * 每次新增 10 筆，不重複名稱，不破壞平衡
   */
  aiBatchGenerate: adminProcedure
    .input(z.object({
      catalogType: z.enum(["monster", "item", "equipment", "skill", "achievement"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { catalogType } = input;

      // 取得現有名稱列表（避免重複）
      let existingNames: string[] = [];
      let existingStats: { avgHp?: number; avgAtk?: number; avgDef?: number; avgSpd?: number; avgPower?: number; count: number } = { count: 0 };

      if (catalogType === "monster") {
        const rows = await db.select({ name: gameMonsterCatalog.name, hp: gameMonsterCatalog.baseHp, atk: gameMonsterCatalog.baseAttack, def: gameMonsterCatalog.baseDefense, spd: gameMonsterCatalog.baseSpeed }).from(gameMonsterCatalog);
        existingNames = rows.map(r => r.name);
        if (rows.length > 0) {
          existingStats = {
            avgHp: Math.round(rows.reduce((s, r) => s + r.hp, 0) / rows.length),
            avgAtk: Math.round(rows.reduce((s, r) => s + r.atk, 0) / rows.length),
            avgDef: Math.round(rows.reduce((s, r) => s + r.def, 0) / rows.length),
            avgSpd: Math.round(rows.reduce((s, r) => s + r.spd, 0) / rows.length),
            count: rows.length,
          };
        }
      } else if (catalogType === "item") {
        const rows = await db.select({ name: gameItemCatalog.name }).from(gameItemCatalog);
        existingNames = rows.map(r => r.name);
        existingStats.count = rows.length;
      } else if (catalogType === "equipment") {
        const rows = await db.select({ name: gameEquipmentCatalog.name, atk: gameEquipmentCatalog.attackBonus, def: gameEquipmentCatalog.defenseBonus, hp: gameEquipmentCatalog.hpBonus }).from(gameEquipmentCatalog);
        existingNames = rows.map(r => r.name);
        if (rows.length > 0) {
          existingStats = {
            avgAtk: Math.round(rows.reduce((s, r) => s + r.atk, 0) / rows.length),
            avgDef: Math.round(rows.reduce((s, r) => s + r.def, 0) / rows.length),
            avgHp: Math.round(rows.reduce((s, r) => s + r.hp, 0) / rows.length),
            count: rows.length,
          };
        }
      } else if (catalogType === "skill") {
        const rows = await db.select({ name: gameSkillCatalog.name, power: gameSkillCatalog.powerPercent }).from(gameSkillCatalog);
        existingNames = rows.map(r => r.name);
        if (rows.length > 0) {
          existingStats = {
            avgPower: Math.round(rows.reduce((s, r) => s + r.power, 0) / rows.length),
            count: rows.length,
          };
        }
      } else if (catalogType === "achievement") {
        const rows = await db.select({ title: gameAchievements.title }).from(gameAchievements);
        existingNames = rows.map(r => r.title);
        existingStats.count = rows.length;
      }

      const existingNamesStr = existingNames.length > 0
        ? `\n\n已有名稱（不可重複）：\n${existingNames.join("、")}`
        : "";

      // 根據類型生成不同的 prompt
      const prompts: Record<string, string> = {
        monster: `你是一個東方玄幻 MMORPG 遊戲的魔物設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingStats.count} 隻魔物，平均數值：HP=${existingStats.avgHp ?? 100}, ATK=${existingStats.avgAtk ?? 15}, DEF=${existingStats.avgDef ?? 8}, SPD=${existingStats.avgSpd ?? 10}
${existingNamesStr}

請生成 10 隻新魔物，要求：
- 名稱不可與已有魔物重複，要有東方玄幻風格
- 五行分布均衡（木火土金水各 2 隻）
- 數值必須符合平衡公式（以等級範圍中間值查HP基準表，再乘以種族倍率和稀有度倍率）：
  HP基準表：Lv1=80, Lv5=170, Lv10=420, Lv15=1020, Lv20=1800, Lv25=2750, Lv30=3850, Lv40=6800, Lv50=11500
  種族 HP 倍率：龍種系×1.3, 亡魂系/不死系×1.2, 天命系×1.15, 妖化系×1.1, 人型系/金屬系/靈獸系×1.0, 水生系×0.95, 蟲類系×0.9, 植物系×0.8
  稀有度倍率：common×1.0, rare×1.3, elite×1.6, epic×2.0, legendary×3.0
  ATK = HP × 0.10~0.18（根據定位）, DEF = HP × 0.08~0.20, SPD = 8~42（根據等級和定位）
- 稀有度分布：common 4, rare 3, epic 2, legendary 1
- 等級範圍合理（1-5, 5-10, 10-20, 20-30, 30-50）
- 種族從以下選擇：靈獸系/亡魂系/金屬系/人型系/植物系/水生系/妖化系/龍種系/蟲類系/天命系

回覆 JSON 陣列，每個元素格式：
{
  "name": "魔物名稱",
  "wuxing": "木/火/土/金/水",
  "levelRange": "1-5",
  "rarity": "common/rare/epic/legendary",
  "baseHp": 100,
  "baseAttack": 15,
  "baseDefense": 8,
  "baseSpeed": 10,
  "baseAccuracy": 80,
  "baseMagicAttack": 10,
  "race": "靈獸系",
  "aiLevel": 1,
  "growthRate": 1.05,
  "description": "簡短描述",
  "catchRate": 0.1
}`,

        item: `你是一個東方玄幻 MMORPG 遊戲的道具設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingStats.count} 種道具。
${existingNamesStr}

請生成 10 種新道具，要求：
- 名稱不可與已有道具重複，要有東方玄幻風格
- 五行分布均衡（木火土金水各 2 種）
- 分類多樣：material_basic（基礎材料）、material_drop（掉落材料）、consumable（消耗品）、skillbook（技能書）、equipment_material（裝備材料）
- 稀有度分布：common 4, rare 3, epic 2, legendary 1
- 售價必須符合價格基準表（價值排序：技能書 > 裝備 > 消耗品 > 材料）：
  材料：common 10, rare 50, epic 300, legendary 1500
  消耗品：common 20, rare 100, epic 500, legendary 2000
  裝備：common 100, rare 500, epic 3000, legendary 15000
  技能書：common 200, rare 800, epic 5000, legendary 25000

回覆 JSON 陣列，每個元素格式：
{
  "name": "道具名稱",
  "wuxing": "木/火/土/金/水",
  "category": "material_basic/material_drop/consumable/skillbook/equipment_material",
  "rarity": "common/rare/epic/legendary",
  "stackLimit": 99,
  "shopPrice": 100,
  "source": "獲取途徑說明",
  "effect": "效果說明"
}`,

        equipment: `你是一個東方玄幻 MMORPG 遊戲的裝備設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingStats.count} 件裝備，平均數值：ATK加成=${existingStats.avgAtk ?? 5}, DEF加成=${existingStats.avgDef ?? 3}, HP加成=${existingStats.avgHp ?? 10}
${existingNamesStr}

請生成 10 件新裝備，要求：
- 名稱不可與已有裝備重複，要有東方玄幻風格
- 五行分布均衡（木火土金水各 2 件）
- 部位多樣：weapon/helmet/armor/shoes/accessory/offhand
- 品質分布：white 2, green 3, blue 2, purple 2, orange 1
- 數值必須符合裝備階級基準（武器偏 ATK，護甲偏 DEF/HP，鞋子偏 SPD）：
  初階：HP 10-30, ATK 3-8, DEF 2-6, SPD 1-3, 售價 50-200, Lv需求 1
  中階：HP 30-80, ATK 8-20, DEF 6-15, SPD 2-5, 售價 300-800, Lv需求 10
  高階：HP 80-200, ATK 20-50, DEF 15-40, SPD 3-8, 售價 1500-5000, Lv需求 25
  傳說：HP 200-500, ATK 50-120, DEF 40-100, SPD 5-12, 售價 10000-50000, Lv需求 40
- 部位修正倍率：武器 ATK×2.0, 護甲 DEF×2.0/HP×1.5, 鞋子 SPD×2.5, 頭盔 DEF×1.5

回覆 JSON 陣列，每個元素格式：
{
  "name": "裝備名稱",
  "wuxing": "木/火/土/金/水",
  "slot": "weapon/helmet/armor/shoes/accessory/offhand",
  "tier": "初階/中階/高階/傳說",
  "quality": "white/green/blue/purple/orange",
  "levelRequired": 1,
  "hpBonus": 0,
  "attackBonus": 5,
  "defenseBonus": 3,
  "speedBonus": 0,
  "rarity": "common/rare/epic/legendary",
  "specialEffect": "特殊效果說明（可為空）"
}`,

        skill: `你是一個東方玄幻 MMORPG 遊戲的技能設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingStats.count} 個技能，平均威力=${existingStats.avgPower ?? 100}%
${existingNamesStr}

請生成 10 個新技能（技能書），要求：
- 名稱不可與已有技能重複，要有東方玄幻風格
- 五行分布均衡（木火土金水各 2 個）
- 類別多樣：active_combat（主動戰鬥）、passive_combat（被動戰鬥）、life_gather（生活採集）
- 稀有度分布：common 4, rare 3, epic 2, legendary 1
- 威力必須符合階級基準（價值排序：技能書 > 裝備 > 消耗品 > 材料）：
  初階：威力 80-120%, MP 5-12, CD 0-1, 售價 100-300 金幣
  中階：威力 120-180%, MP 12-22, CD 1-2, 售價 500-1500 金幣
  高階：威力 180-280%, MP 20-35, CD 2-3, 售價 2000-5000 金幣
  傳說：威力 280-400%, MP 30-50, CD 3-5, 售價 8000-20000 金幣
  天命：威力 350-500%, MP 40-65, CD 4-6, 售價 15000-50000 金幣
- 技能類型修正：heal 威力×0.7/MP×1.2, buff 威力×0.5/MP×0.8, debuff 威力×0.6/MP×0.9

回覆 JSON 陣列，每個元素格式：
{
  "name": "技能名稱",
  "wuxing": "木/火/土/金/水",
  "category": "active_combat/passive_combat/life_gather",
  "rarity": "common/rare/epic/legendary",
  "tier": "初階/中階/高階/傳說",
  "mpCost": 10,
  "cooldown": 2,
  "powerPercent": 120,
  "learnLevel": 1,
  "acquireType": "shop/drop/quest",
  "shopPrice": 200,
  "description": "效果說明",
  "skillType": "attack/heal/buff/debuff/passive/special"
}`,

        achievement: `你是一個東方玄幻 MMORPG 遊戲的成就設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingStats.count} 個成就。
${existingNamesStr}

請生成 10 個新成就，要求：
- 標題不可與已有成就重複
- 分類多樣：avatar（角色）、explore（探索）、combat（戰鬥）、oracle（神諭）、social（社交）、collection（收集）
- 稀有度分布：common 4, rare 3, epic 2, legendary 1
- 條件類型多樣：login_days/combat_win/gather_count/catch_monster/kill_count/craft_count/map_checkin/collect_wuxing_sets
- 獎勵合理：common 獎 10-50 coins, rare 獎 50-200 coins, epic 獎 5-20 stones, legendary 獎 20-50 stones

回覆 JSON 陣列，每個元素格式：
{
  "title": "成就標題",
  "category": "avatar/explore/combat/oracle/social/collection",
  "description": "成就描述",
  "rarity": "common/rare/epic/legendary",
  "conditionType": "combat_win",
  "conditionValue": 10,
  "rewardType": "coins/stones/title",
  "rewardAmount": 50,
  "titleReward": "稱號文字（可為空）"
}`,
      };

      const prompt = prompts[catalogType];
      if (!prompt) throw new TRPCError({ code: "BAD_REQUEST", message: "不支援的圖鑑類型" });

      // 呼叫 LLM
      let generatedItems: any[] = [];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是遊戲設計 AI，只回覆 JSON 陣列，不加任何 markdown 標記或解釋。確保生成的內容符合遊戲平衡性。" },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (content && typeof content === "string") {
          // 嘗試解析 JSON（處理可能的 markdown 包裹）
          let jsonStr = content.trim();
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          generatedItems = JSON.parse(jsonStr);
        }
      } catch (err) {
        console.error("[AI Generate] LLM 呼叫失敗:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成失敗，請稍後再試" });
      }

      if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成結果為空" });
      }

      // 過濾重複名稱
      const nameField = catalogType === "achievement" ? "title" : "name";
      generatedItems = generatedItems.filter(item => {
        const name = item[nameField];
        return name && !existingNames.includes(name);
      });

      // 限制最多 10 筆
      generatedItems = generatedItems.slice(0, 10);

      let insertedCount = 0;
      const insertedNames: string[] = [];

      // 根據類型插入資料庫
      for (const item of generatedItems) {
        try {
          if (catalogType === "monster") {
            // AI 審核：自動校正怪物數值
            const { fixed: fm } = auditAndFix({
              baseHp: item.baseHp || 100, baseAttack: item.baseAttack || 15,
              baseDefense: item.baseDefense || 8, baseSpeed: item.baseSpeed || 10,
              levelRange: item.levelRange || "1-5", race: item.race || "靈獸系",
              rarity: item.rarity || "common",
            }, auditMonster);
            const wuxing = item.wuxing || "木";
            const monsterId = await generateNextId(db, gameMonsterCatalog, gameMonsterCatalog.monsterId, "M", wuxing);
            await db.insert(gameMonsterCatalog).values({
              monsterId,
              name: item.name,
              wuxing,
              levelRange: item.levelRange || "1-5",
              rarity: item.rarity || "common",
              baseHp: fm.baseHp,
              baseAttack: fm.baseAttack,
              baseDefense: fm.baseDefense,
              baseSpeed: fm.baseSpeed,
              baseAccuracy: Math.min(100, Math.max(50, item.baseAccuracy || 80)),
              baseMagicAttack: Math.min(60, Math.max(3, item.baseMagicAttack || 10)),
              race: item.race || "",
              aiLevel: Math.min(4, Math.max(1, item.aiLevel || 1)),
              growthRate: Math.min(2.0, Math.max(0.8, item.growthRate || 1.05)),
              description: item.description || "",
              catchRate: Math.min(1, Math.max(0, item.catchRate || 0.1)),
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "item") {
            // AI 審核：自動校正道具價格
            const { fixed: fi } = auditAndFix({
              category: item.category || "material_basic",
              rarity: item.rarity || "common",
              shopPrice: item.shopPrice || 0,
            }, auditItemPrice);
            const wuxing = item.wuxing || "木";
            const itemId = await generateNextId(db, gameItemCatalog, gameItemCatalog.itemId, "I", wuxing);
            await db.insert(gameItemCatalog).values({
              itemId,
              name: item.name,
              wuxing,
              category: item.category || "material_basic",
              rarity: item.rarity || "common",
              stackLimit: item.stackLimit || 99,
              shopPrice: fi.shopPrice,
              source: item.source || "",
              effect: item.effect || "",
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "equipment") {
            // AI 審核：自動校正裝備數值
            const { fixed: fe } = auditAndFix({
              hpBonus: item.hpBonus || 0, attackBonus: item.attackBonus || 0,
              defenseBonus: item.defenseBonus || 0, speedBonus: item.speedBonus || 0,
              tier: item.tier || "初階", slot: item.slot || "weapon",
              rarity: item.rarity || "common",
            }, auditEquipment);
            const wuxing = item.wuxing || "木";
            const equipId = await generateNextId(db, gameEquipmentCatalog, gameEquipmentCatalog.equipId, "E", wuxing);
            await db.insert(gameEquipmentCatalog).values({
              equipId,
              name: item.name,
              wuxing,
              slot: item.slot || "weapon",
              tier: item.tier || "初階",
              quality: item.quality || "white",
              levelRequired: Math.min(60, Math.max(1, item.levelRequired || 1)),
              hpBonus: fe.hpBonus,
              attackBonus: fe.attackBonus,
              defenseBonus: fe.defenseBonus,
              speedBonus: fe.speedBonus,
              specialEffect: item.specialEffect || "",
              rarity: item.rarity || "common",
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "skill") {
            // AI 審核：自動校正技能數值和價格
            const { fixed: fs } = auditAndFix({
              powerPercent: item.powerPercent || 100, mpCost: item.mpCost || 0,
              cooldown: item.cooldown || 0, shopPrice: item.shopPrice || 0,
              tier: item.tier || "初階", rarity: item.rarity || "common",
              skillType: item.skillType || "attack",
            }, auditSkill);
            const wuxing = item.wuxing || "木";
            const skillId = await generateNextId(db, gameSkillCatalog, gameSkillCatalog.skillId, "S", wuxing);
            await db.insert(gameSkillCatalog).values({
              skillId,
              name: item.name,
              wuxing,
              category: item.category || "active_combat",
              rarity: item.rarity || "common",
              tier: item.tier || "初階",
              mpCost: fs.mpCost,
              cooldown: fs.cooldown,
              powerPercent: fs.powerPercent,
              learnLevel: Math.min(60, Math.max(1, item.learnLevel || 1)),
              acquireType: item.acquireType || "shop",
              shopPrice: fs.shopPrice,
              description: item.description || "",
              skillType: item.skillType || "attack",
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "achievement") {
            const achId = await generateAchievementId(db);
            await db.insert(gameAchievements).values({
              achId,
              category: item.category || "combat",
              title: item.title,
              description: item.description || "",
              rarity: item.rarity || "common",
              conditionType: item.conditionType || "combat_win",
              conditionValue: Math.max(1, item.conditionValue || 10),
              rewardType: item.rewardType || "coins",
              rewardAmount: Math.max(1, item.rewardAmount || 50),
              titleReward: item.titleReward || "",
              isActive: 1,
            });
            insertedNames.push(item.title);
            insertedCount++;
          }
        } catch (err) {
          console.error(`[AI Generate] 插入 ${item[nameField]} 失敗:`, err);
          // 繼續處理下一個
        }
      }

      const typeLabels: Record<string, string> = {
        monster: "魔物", item: "道具", equipment: "裝備", skill: "技能", achievement: "成就",
      };

      return {
        success: true,
        insertedCount,
        insertedNames,
        message: `AI 成功生成 ${insertedCount} 個${typeLabels[catalogType]}：${insertedNames.join("、")}`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 魔物技能 AI 生成系統
  // ═══════════════════════════════════════════════════════════════

  /**
   * AI 為單隻魔物生成技能組合
   */
  aiGenerateMonsterSkills: adminProcedure
    .input(z.object({
      monsterId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得魔物資料
      const [monster] = await db.select().from(gameMonsterCatalog)
        .where(eq(gameMonsterCatalog.monsterId, input.monsterId));
      if (!monster) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該魔物" });

      // 取得現有魔物技能名稱（避免重複）
      const existingSkills = await db.select({ name: gameMonsterSkillCatalog.name }).from(gameMonsterSkillCatalog);
      const existingNames = existingSkills.map(s => s.name);

      // 決定技能數量：common=1, rare=2, epic=2-3, boss/legendary=3
      const skillCount = monster.rarity === "common" ? 1 
        : monster.rarity === "rare" ? 2 
        : monster.rarity === "epic" ? 3 
        : 3;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的魔物技能設計師。回覆純 JSON 陣列，不要加任何說明文字。" },
          { role: "user", content: `為以下魔物設計 ${skillCount} 個專屬技能：

魔物：${monster.name}
五行：${monster.wuxing}
稀有度：${monster.rarity}
等級範圍：${monster.levelRange}
種族：${monster.race || "未知"}
HP：${monster.baseHp}, ATK：${monster.baseAttack}, DEF：${monster.baseDefense}
描述：${monster.description || "無"}

設計要求：
- 技能要符合魔物的五行屬性和種族特色
- 至少有 1 個攻擊技能
- 稀有度越高，技能越強但要合理（powerPercent: common 80-120, rare 100-150, epic 120-200, legendary 150-250）
- MP 消耗要合理（0-30）
- 冷卻回合數 0-3
- 可以有附加效果（中毒、灼燒、減速、眩暈等）

已有技能名稱（不可重複）：${existingNames.slice(0, 50).join("、") || "無"}

回覆 JSON 陣列：
[{
  "name": "技能名稱",
  "wuxing": "${monster.wuxing}",
  "skillType": "attack/heal/buff/debuff/special/passive",
  "rarity": "common/rare/epic/legendary",
  "powerPercent": 100,
  "mpCost": 5,
  "cooldown": 0,
  "accuracyMod": 100,
  "additionalEffect": {"type": "poison", "chance": 20, "duration": 3, "value": 5} 或 null,
  "aiCondition": {"hpBelow": 50, "priority": 1} 或 null,
  "description": "技能描述"
}]` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content as string;
      let skills: any[];
      try {
        const parsed = JSON.parse(content);
        skills = Array.isArray(parsed) ? parsed : parsed.skills || parsed.data || [parsed];
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      const insertedSkillIds: string[] = [];
      for (const skill of skills.slice(0, 3)) {
        if (!skill.name || existingNames.includes(skill.name)) continue;
        // 生成技能 ID
        const nextId = await generateNextMonsterSkillId(db);
        await db.insert(gameMonsterSkillCatalog).values({
          monsterSkillId: nextId,
          name: skill.name,
          wuxing: skill.wuxing || monster.wuxing,
          skillType: skill.skillType || "attack",
          rarity: skill.rarity || "common",
          powerPercent: skill.powerPercent ?? 100,
          mpCost: skill.mpCost ?? 5,
          cooldown: skill.cooldown ?? 0,
          accuracyMod: skill.accuracyMod ?? 100,
          additionalEffect: skill.additionalEffect || null,
          aiCondition: skill.aiCondition || null,
          description: skill.description || "",
        });
        insertedSkillIds.push(nextId);
        existingNames.push(skill.name);
      }

      // 更新魔物的技能槽位
      const updateData: any = {};
      if (insertedSkillIds[0]) updateData.skillId1 = insertedSkillIds[0];
      if (insertedSkillIds[1]) updateData.skillId2 = insertedSkillIds[1];
      if (insertedSkillIds[2]) updateData.skillId3 = insertedSkillIds[2];
      if (Object.keys(updateData).length > 0) {
        await db.update(gameMonsterCatalog).set(updateData)
          .where(eq(gameMonsterCatalog.monsterId, input.monsterId));
      }

      return {
        success: true,
        skillIds: insertedSkillIds,
        message: `為「${monster.name}」生成了 ${insertedSkillIds.length} 個技能`,
      };
    }),

  /**
   * AI 批量補齊所有缺少技能的魔物
   */
  aiBatchFillMonsterSkills: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 找出所有缺少技能的魔物
      const monstersWithoutSkills = await db.select()
        .from(gameMonsterCatalog)
        .where(sql`(${gameMonsterCatalog.skillId1} IS NULL OR ${gameMonsterCatalog.skillId1} = '')`);

      if (monstersWithoutSkills.length === 0) {
        return { success: true, processed: 0, message: "所有魔物都已有技能" };
      }

      // 取得現有技能名稱
      const existingSkills = await db.select({ name: gameMonsterSkillCatalog.name }).from(gameMonsterSkillCatalog);
      const existingNames = existingSkills.map(s => s.name);

      // 批量生成（每次最多處理 10 隻）
      const batch = monstersWithoutSkills.slice(0, 10);
      const monsterDescriptions = batch.map(m => 
        `${m.monsterId}|${m.name}|${m.wuxing}|${m.rarity}|${m.race || "未知"}|HP${m.baseHp}/ATK${m.baseAttack}/DEF${m.baseDefense}|${m.description || "無描述"}`
      ).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的魔物技能設計師。回覆純 JSON 物件，key 為魔物 ID，value 為技能陣列。" },
          { role: "user", content: `為以下 ${batch.length} 隻魔物各設計技能：

格式：ID|名稱|五行|稀有度|種族|數值|描述
${monsterDescriptions}

規則：
- common 魔物 1 個技能，rare 2 個，epic/boss/legendary 3 個
- 技能要符合魔物五行和種族
- powerPercent: common 80-120, rare 100-150, epic 120-200, legendary 150-250
- 每隻至少 1 個攻擊技能
- 名稱不可重複，也不可與已有技能重複

已有技能名稱：${existingNames.slice(0, 30).join("、") || "無"}

回覆 JSON：
{
  "M_W001": [{"name":"技能名","wuxing":"木","skillType":"attack","rarity":"common","powerPercent":100,"mpCost":5,"cooldown":0,"accuracyMod":100,"additionalEffect":null,"aiCondition":null,"description":"描述"}],
  ...
}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content as string;
      let skillMap: Record<string, any[]>;
      try {
        skillMap = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      let totalInserted = 0;
      const results: { monsterId: string; monsterName: string; skillCount: number }[] = [];

      for (const monster of batch) {
        const skills = skillMap[monster.monsterId];
        if (!skills || !Array.isArray(skills)) continue;

        const insertedIds: string[] = [];
        for (const skill of skills.slice(0, 3)) {
          if (!skill.name || existingNames.includes(skill.name)) continue;
          const nextId = await generateNextMonsterSkillId(db);
          try {
            await db.insert(gameMonsterSkillCatalog).values({
              monsterSkillId: nextId,
              name: skill.name,
              wuxing: skill.wuxing || monster.wuxing,
              skillType: skill.skillType || "attack",
              rarity: skill.rarity || "common",
              powerPercent: skill.powerPercent ?? 100,
              mpCost: skill.mpCost ?? 5,
              cooldown: skill.cooldown ?? 0,
              accuracyMod: skill.accuracyMod ?? 100,
              additionalEffect: skill.additionalEffect || null,
              aiCondition: skill.aiCondition || null,
              description: skill.description || "",
            });
            insertedIds.push(nextId);
            existingNames.push(skill.name);
            totalInserted++;
          } catch (err) {
            console.error(`[AI MonsterSkill] 插入失敗:`, err);
          }
        }

        // 更新魔物技能槽位
        if (insertedIds.length > 0) {
          const updateData: any = {};
          if (insertedIds[0]) updateData.skillId1 = insertedIds[0];
          if (insertedIds[1]) updateData.skillId2 = insertedIds[1];
          if (insertedIds[2]) updateData.skillId3 = insertedIds[2];
          await db.update(gameMonsterCatalog).set(updateData)
            .where(eq(gameMonsterCatalog.monsterId, monster.monsterId));
        }

        results.push({ monsterId: monster.monsterId, monsterName: monster.name, skillCount: insertedIds.length });
      }

      return {
        success: true,
        processed: results.length,
        totalSkillsCreated: totalInserted,
        remaining: monstersWithoutSkills.length - batch.length,
        results,
        message: `已為 ${results.length} 隻魔物生成 ${totalInserted} 個技能，剩餘 ${monstersWithoutSkills.length - batch.length} 隻待處理`,
      };
    }),

  // ═══════════════════════════════════════════════════════════════
  // 圖鑑資料批量複製
  // ═══════════════════════════════════════════════════════════════

  /**
   * 複製圖鑑資料（自動加後綴避免重複）
   */
  duplicateCatalogItem: adminProcedure
    .input(z.object({
      catalogType: z.enum(["monster", "item", "equipment", "skill", "achievement", "monsterSkill"]),
      id: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { catalogType, id } = input;

      if (catalogType === "monster") {
        const [original] = await db.select().from(gameMonsterCatalog).where(eq(gameMonsterCatalog.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newId = await generateNextId(db, gameMonsterCatalog, gameMonsterCatalog.monsterId, "M", original.wuxing);
        const { id: _id, monsterId: _mid, createdAt: _ca, ...rest } = original;
        await db.insert(gameMonsterCatalog).values({
          ...rest,
          monsterId: newId,
          name: `${original.name}（複製）`,
          createdAt: Date.now(),
        });
        return { success: true, newId, message: `已複製魔物「${original.name}」` };
      }

      if (catalogType === "item") {
        const [original] = await db.select().from(gameItemCatalog).where(eq(gameItemCatalog.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newId = await generateNextId(db, gameItemCatalog, gameItemCatalog.itemId, "I", original.wuxing);
        const { id: _id, itemId: _iid, createdAt: _ca, ...rest } = original;
        await db.insert(gameItemCatalog).values({
          ...rest,
          itemId: newId,
          name: `${original.name}（複製）`,
          createdAt: Date.now(),
        });
        return { success: true, newId, message: `已複製道具「${original.name}」` };
      }

      if (catalogType === "equipment") {
        const [original] = await db.select().from(gameEquipmentCatalog).where(eq(gameEquipmentCatalog.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newId = await generateNextId(db, gameEquipmentCatalog, gameEquipmentCatalog.equipId, "E", original.wuxing);
        const { id: _id, equipId: _eid, createdAt: _ca, ...rest } = original;
        await db.insert(gameEquipmentCatalog).values({
          ...rest,
          equipId: newId,
          name: `${original.name}（複製）`,
          createdAt: Date.now(),
        });
        return { success: true, newId, message: `已複製裝備「${original.name}」` };
      }

      if (catalogType === "skill") {
        const [original] = await db.select().from(gameSkillCatalog).where(eq(gameSkillCatalog.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newId = await generateNextId(db, gameSkillCatalog, gameSkillCatalog.skillId, "S", original.wuxing);
        const { id: _id, skillId: _sid, createdAt: _ca, ...rest } = original;
        await db.insert(gameSkillCatalog).values({
          ...rest,
          skillId: newId,
          name: `${original.name}（複製）`,
          createdAt: Date.now(),
        });
        return { success: true, newId, message: `已複製技能「${original.name}」` };
      }

      if (catalogType === "achievement") {
        const [original] = await db.select().from(gameAchievements).where(eq(gameAchievements.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newAchId = await generateAchievementId(db);
        const { id: _id, achId: _aid, createdAt: _ca, ...rest } = original;
        await db.insert(gameAchievements).values({
          ...rest,
          achId: newAchId,
          title: `${original.title}（複製）`,
          createdAt: new Date(),
        });
        return { success: true, newId: newAchId, message: `已複製成就「${original.title}」` };
      }

      if (catalogType === "monsterSkill") {
        const [original] = await db.select().from(gameMonsterSkillCatalog).where(eq(gameMonsterSkillCatalog.id, id));
        if (!original) throw new TRPCError({ code: "NOT_FOUND" });
        const newId = await generateNextMonsterSkillId(db);
        const { id: _id, monsterSkillId: _msid, createdAt: _ca, ...rest } = original;
        await db.insert(gameMonsterSkillCatalog).values({
          ...rest,
          monsterSkillId: newId,
          name: `${original.name}（複製）`,
          createdAt: Date.now(),
        });
        return { success: true, newId, message: `已複製魔物技能「${original.name}」` };
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "不支援的圖鑑類型" });
    }),

  // ═══════════════════════════════════════════════════════════════
  // 天命考核技能 AI 生成系統
  // ═══════════════════════════════════════════════════════════════

  /**
   * AI 批量生成天命考核技能（含 NPC + 任務步驟）
   * 一次生成完整的技能任務鏈：技能 + NPC + 3 步驟
   */
  aiGenerateQuestSkill: adminProcedure
    .input(z.object({
      category: z.enum(["physical", "magic", "status", "support", "special", "production"]),
      count: z.number().min(1).max(5).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { category, count } = input;

      // 取得現有技能名稱（避免重複）
      const existingSkills = await db.select({ name: gameQuestSkillCatalog.name, code: gameQuestSkillCatalog.code }).from(gameQuestSkillCatalog);
      const existingNames = existingSkills.map(s => s.name);
      const existingCodes = existingSkills.map(s => s.code);

      // 取得現有 NPC 名稱
      const existingNpcs = await db.select({ name: gameNpcCatalog.name }).from(gameNpcCatalog);
      const existingNpcNames = existingNpcs.map(n => n.name);

      const categoryLabels: Record<string, string> = {
        physical: "物理戰鬥系",
        magic: "魔法攻擊系",
        status: "狀態控制系",
        support: "戰鬥輔助系",
        special: "特殊功能系",
        production: "生產系",
      };
      const categoryPrefix: Record<string, string> = {
        physical: "P", magic: "M", status: "S", support: "A", special: "X", production: "C",
      };
      const categorySkillTypes: Record<string, string[]> = {
        physical: ["attack"],
        magic: ["attack"],
        status: ["debuff"],
        support: ["heal", "buff"],
        special: ["attack", "utility"],
        production: ["production"],
      };

      const prompt = `你是東方玄幻 MMORPG「墟界」的技能任務鏈設計師。
遊戲世界觀基於五行（木火土金水），技能透過完成 NPC 給予的任務鏈來習得。

現有技能代碼：${existingCodes.join("、") || "無"}
現有技能名稱（不可重複）：${existingNames.join("、") || "無"}
現有 NPC 名稱（不可重複）：${existingNpcNames.join("、") || "無"}

請為「${categoryLabels[category]}」分類生成 ${count} 個完整的技能任務鏈，每個包含：
1. 技能定義（名稱、數值、效果）
2. 教導技能的 NPC（名稱、身份、地點）
3. 3 個任務步驟（邂逅→挑戰→最終試煉）

設計要求：
- 技能代碼格式：${categoryPrefix[category]}+數字（如 ${categoryPrefix[category]}9, ${categoryPrefix[category]}10），不可與已有代碼重複
- 技能名稱要有東方玄幻風格，不可與已有名稱重複
- NPC 名稱要有特色，不可與已有 NPC 重複
- 數值平衡：powerPercent（${category === "physical" ? "100-350" : category === "magic" ? "30-200" : category === "status" ? "0-50" : category === "support" ? "80-200" : category === "special" ? "100-500" : "0-50"}）
- MP 消耗：${category === "production" ? "0" : "8-30"}
- 冷卻回合：${category === "production" ? "0" : "2-10"}
- 稀有度分布：rare 或 epic
- 任務步驟要有連貫的劇情和遞進的難度
- 習得代價要合理（金幣 500-3000，魂晶 200-500，可含道具）

回覆 JSON 陣列：
[{
  "skill": {
    "code": "${categoryPrefix[category]}9",
    "name": "技能名稱",
    "questTitle": "任務鏈副標題",
    "category": "${category}",
    "skillType": "${categorySkillTypes[category]?.[0] || "attack"}",
    "description": "技能效果描述",
    "wuxing": "木/火/土/金/水",
    "powerPercent": 150,
    "mpCost": 15,
    "cooldown": 4,
    "rarity": "rare/epic",
    "additionalEffect": {"type": "poison", "chance": 20, "value": 5, "duration": 3} 或 null,
    "specialMechanic": {"hitCount": [2,5]} 或 null,
    "learnCost": {"gold": 1500, "soulCrystal": 300, "items": [{"name": "道具名", "count": 3}]},
    "prerequisites": {"skills": [], "level": 5} 或 null
  },
  "npc": {
    "code": "npc_xxx",
    "name": "NPC名稱",
    "title": "NPC身份/稱號",
    "location": "所在地點",
    "region": "初界/中界",
    "description": "NPC背景描述"
  },
  "steps": [
    {
      "stepNumber": 1,
      "title": "步驟一標題",
      "dialogue": "NPC 對話文本",
      "objective": "任務目標描述",
      "location": "任務地點",
      "objectives": {"type": "kill", "targets": [{"name": "怪物名", "count": 5}]},
      "rewards": {"exp": 100, "gold": 200}
    },
    {
      "stepNumber": 2,
      "title": "步驟二標題",
      "dialogue": "NPC 對話文本",
      "objective": "任務目標描述",
      "location": "任務地點",
      "objectives": {"type": "collect", "targets": [{"name": "材料名", "count": 3}]},
      "rewards": {"exp": 200, "gold": 300}
    },
    {
      "stepNumber": 3,
      "title": "步驟三標題（最終試煉）",
      "dialogue": "NPC 對話文本",
      "objective": "最終試煉描述",
      "location": "試煉地點",
      "objectives": {"type": "boss", "boss": {"name": "BOSS名", "hp": 500, "stars": 3}},
      "rewards": {"exp": 500, "gold": 500}
    }
  ]
}]`;

      let generated: any[];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是遊戲設計 AI，只回覆 JSON 陣列，不加任何 markdown 標記或解釋。確保生成的內容符合遊戲平衡性和劇情一致性。" },
            { role: "user", content: prompt },
          ],
        });
        const content = response.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string") throw new Error("AI 回覆為空");
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        generated = Array.isArray(parsed) ? parsed : parsed.data || parsed.skills || [parsed];
      } catch (err) {
        console.error("[AI QuestSkill Generate] LLM 呼叫失敗:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成失敗，請稍後再試" });
      }

      if (!Array.isArray(generated) || generated.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成結果為空" });
      }

      const results: { skillName: string; npcName: string; stepsCount: number }[] = [];

      for (const item of generated.slice(0, count)) {
        try {
          const skill = item.skill;
          const npc = item.npc;
          const steps = item.steps;

          if (!skill?.name || !skill?.code) continue;
          if (existingNames.includes(skill.name)) continue;
          if (existingCodes.includes(skill.code)) continue;

          // 1. 插入 NPC
          let npcId: number | undefined;
          if (npc?.name && !existingNpcNames.includes(npc.name)) {
            const now = Date.now();
            const [npcResult] = await db.insert(gameNpcCatalog).values({
              code: npc.code || `npc_${skill.code.toLowerCase()}`,
              name: npc.name,
              title: npc.title || "",
              location: npc.location || "",
              region: npc.region || "初界",
              description: npc.description || "",
              isHidden: 0,
              sortOrder: 0,
              createdAt: now,
              updatedAt: now,
            });
            npcId = npcResult.insertId;
            existingNpcNames.push(npc.name);
          }

          // 2. 插入技能
          const now = Date.now();
          const [skillResult] = await db.insert(gameQuestSkillCatalog).values({
            code: skill.code,
            name: skill.name,
            questTitle: skill.questTitle || "",
            category,
            skillType: skill.skillType || "attack",
            description: skill.description || "",
            wuxing: skill.wuxing || "無",
            powerPercent: Math.min(500, Math.max(0, skill.powerPercent ?? 100)),
            mpCost: Math.min(50, Math.max(0, skill.mpCost ?? 10)),
            cooldown: Math.min(10, Math.max(0, skill.cooldown ?? 3)),
            maxLevel: 10,
            levelUpBonus: 10,
            additionalEffect: skill.additionalEffect || null,
            specialMechanic: skill.specialMechanic || null,
            learnCost: skill.learnCost || null,
            prerequisites: skill.prerequisites || null,
            npcId: npcId ?? null,
            rarity: skill.rarity || "rare",
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
          });
          const newSkillId = skillResult.insertId;
          existingNames.push(skill.name);
          existingCodes.push(skill.code);

          // 3. 插入任務步驟
          let stepsInserted = 0;
          if (Array.isArray(steps)) {
            for (const step of steps.slice(0, 3)) {
              await db.insert(gameQuestSteps).values({
                skillId: newSkillId,
                stepNumber: step.stepNumber ?? (stepsInserted + 1),
                title: step.title || `步驟 ${stepsInserted + 1}`,
                dialogue: step.dialogue || "",
                objective: step.objective || "",
                location: step.location || "",
                objectives: step.objectives || null,
                rewards: step.rewards || null,
                specialNote: step.specialNote || null,
                npcId: step.npcId ?? npcId ?? null,
                sortOrder: stepsInserted,
                createdAt: now,
                updatedAt: now,
              });
              stepsInserted++;
            }
          }

          results.push({
            skillName: skill.name,
            npcName: npc?.name || "（無 NPC）",
            stepsCount: stepsInserted,
          });
        } catch (err) {
          console.error("[AI QuestSkill Generate] 插入失敗:", err);
        }
      }

      return {
        success: true,
        generatedCount: results.length,
        results,
        message: `AI 成功生成 ${results.length} 個天命考核技能任務鏈`,
      };
    }),

  /**
   * AI 為已有的天命考核技能生成任務步驟
   * （針對已有技能但缺少步驟的情況）
   */
  aiGenerateQuestSteps: adminProcedure
    .input(z.object({
      skillId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 取得技能資料
      const [skill] = await db.select().from(gameQuestSkillCatalog)
        .where(eq(gameQuestSkillCatalog.id, input.skillId));
      if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "找不到該技能" });

      // 檢查是否已有步驟
      const existingSteps = await db.select().from(gameQuestSteps)
        .where(eq(gameQuestSteps.skillId, input.skillId));
      if (existingSteps.length >= 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "此技能已有 3 個以上步驟" });
      }

      // 取得 NPC 資料
      let npcName = "神秘導師";
      let npcLocation = "未知之地";
      if (skill.npcId) {
        const [npc] = await db.select().from(gameNpcCatalog)
          .where(eq(gameNpcCatalog.id, skill.npcId));
        if (npc) {
          npcName = npc.name;
          npcLocation = npc.location || "未知之地";
        }
      }

      // 取得可用的真實道具列表（材料類 + 任務類）
      const availableItems = await db.select({
        itemId: gameItemCatalog.itemId,
        name: gameItemCatalog.name,
        category: gameItemCatalog.category,
        rarity: gameItemCatalog.rarity,
        wuxing: gameItemCatalog.wuxing,
      }).from(gameItemCatalog)
        .where(eq(gameItemCatalog.isActive, 1));

      // 篩選與技能五行相關的材料，或通用材料
      const materialItems = availableItems.filter(i =>
        i.category?.includes('material') || i.category === 'quest'
      );
      const wuxingItems = materialItems.filter(i => i.wuxing === skill.wuxing);
      const otherItems = materialItems.filter(i => i.wuxing !== skill.wuxing);
      // 優先同五行，再補其他
      const itemPool = [...wuxingItems, ...otherItems].slice(0, 20);
      const itemListStr = itemPool.map(i => `${i.itemId}: ${i.name} [${i.rarity}]`).join('\n');

      const categoryLabels: Record<string, string> = {
        physical: "物理戰鬥", magic: "魔法攻擊", status: "狀態控制",
        support: "戰鬥輔助", special: "特殊功能", production: "生產",
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的任務設計師。回覆純 JSON 陣列，不要加任何說明文字。" },
          { role: "user", content: `為以下天命考核技能設計 3 個任務步驟：

技能：${skill.name}（${skill.code}）
分類：${categoryLabels[skill.category] || skill.category}
效果：${skill.description || "無描述"}
五行：${skill.wuxing}
稀有度：${skill.rarity}
教導 NPC：${npcName}（位於 ${npcLocation}）

★★★ 重要：以下是系統中可用的真實道具列表，步驟 2 的 collect 任務必須從這個列表中選擇道具：
${itemListStr}
★★★

設計要求：
- 步驟 1：郂逅/接觸（與 NPC 對話，了解技能背景，type: "challenge"）
- 步驟 2：修煉/收集（收集指定材料，type: "collect"，targets 中的 name 必須完全匹配上面列表中的道具名稱，並加上 itemId 欄位）
- 步驟 3：最終試煉（擊敗挑戰，type: "boss"）
- 每個步驟要有連貫的劇情
- 對話要有角色個性（至少 50 字）
- 獎勵遞增（經驗 100→200→500，金幣 200→300→500）

回覆 JSON 陣列：
[{
  "stepNumber": 1,
  "title": "步驟標題",
  "dialogue": "NPC 對話文本",
  "objective": "任務目標描述",
  "location": "任務地點",
  "objectives": {"type": "challenge", "targets": [{"name": "目標名", "count": 1}]},
  "rewards": {"exp": 100, "gold": 200}
},
{
  "stepNumber": 2,
  "title": "步驟標題",
  "dialogue": "NPC 對話文本",
  "objective": "任務目標描述",
  "location": "任務地點",
  "objectives": {"type": "collect", "targets": [{"name": "道具名稱", "itemId": "I_XXXX", "count": 5}]},
  "rewards": {"exp": 200, "gold": 300}
}]` },
        ],
      });

      const content = response.choices?.[0]?.message?.content as string;
      let steps: any[];
      try {
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        steps = Array.isArray(parsed) ? parsed : parsed.steps || parsed.data || [parsed];
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      // 驗證並修正 AI 生成的步驟中的道具引用
      const itemNameToId = new Map(availableItems.map(i => [i.name, i.itemId]));
      for (const step of steps) {
        if (step.objectives?.type === "collect" && step.objectives?.targets) {
          for (const target of step.objectives.targets) {
            // 如果 AI 生成的 itemId 不在圖鑑中，嘗試用名稱匹配
            if (target.itemId && !availableItems.find(i => i.itemId === target.itemId)) {
              target.itemId = itemNameToId.get(target.name) || null;
            }
            // 如果名稱也不匹配，替換為同五行的隨機材料
            if (!target.itemId && !itemNameToId.has(target.name)) {
              const fallback = wuxingItems.length > 0
                ? wuxingItems[Math.floor(Math.random() * wuxingItems.length)]
                : itemPool[Math.floor(Math.random() * itemPool.length)];
              if (fallback) {
                target.name = fallback.name;
                target.itemId = fallback.itemId;
              }
            }
            // 確保有 itemId
            if (!target.itemId) {
              target.itemId = itemNameToId.get(target.name) || null;
            }
          }
        }
      }

      const now = Date.now();
      let insertedCount = 0;
      for (const step of steps.slice(0, 3)) {
        await db.insert(gameQuestSteps).values({
          skillId: input.skillId,
          stepNumber: step.stepNumber ?? (insertedCount + 1),
          title: step.title || `步驟 ${insertedCount + 1}`,
          dialogue: step.dialogue || "",
          objective: step.objective || "",
          location: step.location || npcLocation,
          objectives: step.objectives || null,
          rewards: step.rewards || null,
          specialNote: step.specialNote || null,
          npcId: skill.npcId ?? null,
          sortOrder: insertedCount,
          createdAt: now,
          updatedAt: now,
        });
        insertedCount++;
      }

      return {
        success: true,
        insertedCount,
        message: `已為「${skill.name}」生成 ${insertedCount} 個任務步驟`,
      };
    }),

  /**
   * AI 批量生成 NPC
   */
  aiGenerateQuestNpcs: adminProcedure
    .input(z.object({
      count: z.number().min(1).max(10).default(5),
      region: z.enum(["初界", "中界", "高界"]).default("初界"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existingNpcs = await db.select({ name: gameNpcCatalog.name }).from(gameNpcCatalog);
      const existingNames = existingNpcs.map(n => n.name);

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的 NPC 設計師。回覆純 JSON 陣列，不要加任何說明文字。" },
          { role: "user", content: `為「墟界」遊戲的${input.region}設計 ${input.count} 個新 NPC，要求：

- 名稱不可與已有 NPC 重複：${existingNames.join("、") || "無"}
- 每個 NPC 要有獨特的身份和背景故事
- 地點要在${input.region}的不同區域
- NPC 類型多樣：武術大師、魔法導師、煉金師、隱士、商人等
- 名稱風格：東方玄幻 + 西方奇幻混合

回覆 JSON 陣列：
[{
  "code": "npc_xxx",
  "name": "NPC 名稱",
  "title": "NPC 身份/稱號",
  "location": "所在地點（如 迷霧城・戰士公會大廳）",
  "region": "${input.region}",
  "description": "NPC 背景描述（至少 30 字）"
}]` },
        ],
      });

      const content = response.choices?.[0]?.message?.content as string;
      let npcs: any[];
      try {
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        npcs = Array.isArray(parsed) ? parsed : parsed.npcs || parsed.data || [parsed];
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      const now = Date.now();
      let insertedCount = 0;
      const insertedNames: string[] = [];

      for (const npc of npcs.slice(0, input.count)) {
        if (!npc.name || existingNames.includes(npc.name)) continue;
        try {
          await db.insert(gameNpcCatalog).values({
            code: npc.code || `npc_${Date.now()}_${insertedCount}`,
            name: npc.name,
            title: npc.title || "",
            location: npc.location || "",
            region: npc.region || input.region,
            description: npc.description || "",
            isHidden: 0,
            sortOrder: insertedCount,
            createdAt: now,
            updatedAt: now,
          });
          insertedNames.push(npc.name);
          existingNames.push(npc.name);
          insertedCount++;
        } catch (err) {
          console.error("[AI NPC Generate] 插入失敗:", err);
        }
      }

      return {
        success: true,
        insertedCount,
        insertedNames,
        message: `AI 成功生成 ${insertedCount} 個 NPC：${insertedNames.join("、")}`,
      };
    }),

  // ═══════════════════════════════════════════════════════════
  // 寵物系統 AI 生成工具 (GD-019)
  // ═══════════════════════════════════════════════════════════

  /**
   * AI 批量生成寵物圖鑑
   * 每次生成 10 隻寵物，自動校正數值平衡
   */
  aiBatchGeneratePets: adminProcedure
    .input(z.object({
      count: z.number().min(1).max(10).default(10),
    }).optional())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const count = input?.count ?? 10;

      // 取得現有寵物名稱
      const existing = await db.select({ name: gamePetCatalog.name }).from(gamePetCatalog);
      const existingNames = existing.map(r => r.name);

      const prompt = `你是一個東方玄幻 MMORPG 遊戲「天命共振」的寵物設計師。遊戲世界觀基於五行（木火土金水）。
現有 ${existingNames.length} 隻寵物。
${existingNames.length > 0 ? `\n已有名稱（不可重複）：\n${existingNames.join("、")}` : ""}

請生成 ${count} 隻新寵物，要求：
- 名稱不可與已有寵物重複，要有東方玄幻風格（如：玉麟獸、紫焰鳥、青蜂靈、魔玉蝶）
- 五行分布均衡（木火土金水各 2 隻）
- 稀有度分布：common 4, rare 3, epic 2, legendary 1
- 種族從以下選擇：dragon(龍族), undead(不死族), normal(一般), insect(蟲族), plant(植物族), flying(飛行族)
- 成長型態從以下選擇：fighter(力量型), guardian(防禦型), swift(敏捷型), mage(魔法型), balanced(均衡型)
- 基礎 BP 五維總和應在 60-150 之間，根據稀有度調整：
  common: 60-80, rare: 80-100, epic: 100-120, legendary: 120-150
- 捕捉率按稀有度：common 25-45%, rare 15-30%, epic 8-20%, legendary 3-10%
- 等級範圍合理（minLevel-maxLevel）

回覆 JSON 陣列，每個元素格式：
{
  "name": "寵物名稱",
  "description": "簡短描述（30-80字）",
  "race": "dragon/undead/normal/insect/plant/flying",
  "wuxing": "wood/fire/earth/metal/water",
  "rarity": "common/rare/epic/legendary",
  "growthType": "fighter/guardian/swift/mage/balanced",
  "baseBpConstitution": 20,
  "baseBpStrength": 20,
  "baseBpDefense": 20,
  "baseBpAgility": 20,
  "baseBpMagic": 20,
  "minLevel": 1,
  "maxLevel": 50,
  "baseCaptureRate": 30
}`;

      let generatedPets: any[] = [];
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是遊戲寵物設計 AI，只回覆 JSON 陣列，不加任何 markdown 標記或解釋。確保生成的內容符合遊戲平衡性。" },
            { role: "user", content: prompt },
          ],
        });
        const content = response.choices?.[0]?.message?.content;
        if (content && typeof content === "string") {
          let jsonStr = content.trim();
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          generatedPets = JSON.parse(jsonStr);
        }
      } catch (err) {
        console.error("[AI PetGenerate] LLM 呼叫失敗:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成失敗，請稍後再試" });
      }

      if (!Array.isArray(generatedPets) || generatedPets.length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 生成結果為空" });
      }

      // 過濾重複名稱
      generatedPets = generatedPets.filter(p => p.name && !existingNames.includes(p.name)).slice(0, count);

      let insertedCount = 0;
      const insertedNames: string[] = [];

      for (const pet of generatedPets) {
        try {
          const race = pet.race || "normal";
          const raceHpMul = RACE_HP_MULTIPLIER[race] ?? 1.0;

          // 自動校正 BP 總值
          let totalBp = (pet.baseBpConstitution || 20) + (pet.baseBpStrength || 20) + (pet.baseBpDefense || 20) + (pet.baseBpAgility || 20) + (pet.baseBpMagic || 20);
          const rarityBpRange: Record<string, [number, number]> = {
            common: [60, 80], rare: [80, 100], epic: [100, 120], legendary: [120, 150],
          };
          const bpRange = rarityBpRange[pet.rarity] || [60, 80];
          let bpScale = 1;
          if (totalBp < bpRange[0] || totalBp > bpRange[1]) {
            const targetBp = Math.round((bpRange[0] + bpRange[1]) / 2);
            bpScale = targetBp / (totalBp || 100);
          }

          const baseBp = {
            baseBpConstitution: Math.max(5, Math.round((pet.baseBpConstitution || 20) * bpScale)),
            baseBpStrength: Math.max(5, Math.round((pet.baseBpStrength || 20) * bpScale)),
            baseBpDefense: Math.max(5, Math.round((pet.baseBpDefense || 20) * bpScale)),
            baseBpAgility: Math.max(5, Math.round((pet.baseBpAgility || 20) * bpScale)),
            baseBpMagic: Math.max(5, Math.round((pet.baseBpMagic || 20) * bpScale)),
          };

          // 捕捉率校正
          const captureRanges: Record<string, [number, number]> = {
            common: [25, 45], rare: [15, 30], epic: [8, 20], legendary: [3, 10],
          };
          const cRange = captureRanges[pet.rarity] || [25, 45];
          let captureRate = pet.baseCaptureRate || Math.round((cRange[0] + cRange[1]) / 2);
          if (captureRate < cRange[0] || captureRate > cRange[1]) {
            captureRate = Math.round((cRange[0] + cRange[1]) / 2);
          }

          await db.insert(gamePetCatalog).values({
            name: pet.name,
            description: pet.description || "",
            race,
            wuxing: pet.wuxing || "earth",
            rarity: pet.rarity || "common",
            growthType: pet.growthType || "balanced",
            ...baseBp,
            raceHpMultiplier: raceHpMul,
            minLevel: Math.max(1, pet.minLevel || 1),
            maxLevel: Math.min(60, pet.maxLevel || 50),
            baseCaptureRate: captureRate,
            isActive: 1,
            sortOrder: insertedCount,
          });
          insertedNames.push(pet.name);
          existingNames.push(pet.name);
          insertedCount++;
        } catch (err) {
          console.error(`[AI PetGenerate] 插入 ${pet.name} 失敗:`, err);
        }
      }

      return {
        success: true,
        insertedCount,
        insertedNames,
        message: `AI 成功生成 ${insertedCount} 隻寵物：${insertedNames.join("、")}`,
      };
    }),

  /**
   * AI 為寵物生成天生技能
   */
  aiGeneratePetInnateSkills: adminProcedure
    .input(z.object({
      petCatalogId: z.number().int(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [pet] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, input.petCatalogId));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物不存在" });

      // 檢查是否已有天生技能
      const existingSkills = await db.select().from(gamePetInnateSkills)
        .where(eq(gamePetInnateSkills.petCatalogId, input.petCatalogId));
      if (existingSkills.length >= 3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "已有 3 個天生技能，無法再生成" });
      }

      // 取得所有寵物天生技能名稱（避免重複）
      const allSkills = await db.select({ name: gamePetInnateSkills.name }).from(gamePetInnateSkills);
      const allSkillNames = allSkills.map(s => s.name);

      const slotsToGenerate = 3 - existingSkills.length;
      const startSlot = existingSkills.length + 1;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的寵物技能設計師。回覆純 JSON 陣列，不要加任何說明文字。" },
          { role: "user", content: `為以下寵物設計 ${slotsToGenerate} 個天生技能：

寵物：${pet.name}
五行：${pet.wuxing}
種族：${pet.race}
稀有度：${pet.rarity}
成長型態：${pet.growthType}
描述：${pet.description || "無"}

設計要求：
- 技能要符合寵物的五行屬性和種族特色
- 第 1 格（Lv.1 解鎖）：基礎技能，威力 60-100%
- 第 2 格（Lv.20 解鎖）：中階技能，威力 100-150%
- 第 3 格（Lv.50 解鎖）：強力技能，威力 150-250%
- 技能類型：attack(攻擊), heal(治療), buff(增益), debuff(減益), utility(輔助)
- MP 消耗：3-25，冷却：0-5
- 名稱不可與已有技能重複

已有技能名稱：${allSkillNames.slice(0, 30).join("、") || "無"}

回覆 JSON 陣列：
[{
  "name": "技能名稱",
  "description": "技能描述",
  "skillType": "attack/heal/buff/debuff/utility",
  "wuxing": "${pet.wuxing}",
  "powerPercent": 100,
  "mpCost": 5,
  "cooldown": 2,
  "unlockLevel": 1,
  "slotIndex": ${startSlot}
}]` },
        ],
      });

      const content = response.choices?.[0]?.message?.content as string;
      let skills: any[];
      try {
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const parsed = JSON.parse(jsonStr);
        skills = Array.isArray(parsed) ? parsed : parsed.skills || parsed.data || [parsed];
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      const unlockLevels = [1, 20, 50];
      let insertedCount = 0;
      const insertedNames: string[] = [];

      for (let i = 0; i < Math.min(skills.length, slotsToGenerate); i++) {
        const skill = skills[i];
        if (!skill.name || allSkillNames.includes(skill.name)) continue;
        const slotIdx = startSlot + i;
        try {
          await db.insert(gamePetInnateSkills).values({
            petCatalogId: input.petCatalogId,
            name: skill.name,
            description: skill.description || "",
            skillType: skill.skillType || "attack",
            wuxing: skill.wuxing || pet.wuxing,
            powerPercent: Math.min(300, Math.max(0, skill.powerPercent || 100)),
            mpCost: Math.min(50, Math.max(0, skill.mpCost || 5)),
            cooldown: Math.min(10, Math.max(0, skill.cooldown || 2)),
            unlockLevel: unlockLevels[slotIdx - 1] || 1,
            slotIndex: slotIdx,
            sortOrder: slotIdx,
          });
          insertedNames.push(skill.name);
          allSkillNames.push(skill.name);
          insertedCount++;
        } catch (err) {
          console.error(`[AI PetSkill] 插入 ${skill.name} 失敗:`, err);
        }
      }

      return {
        success: true,
        insertedCount,
        insertedNames,
        message: `為「${pet.name}」生成了 ${insertedCount} 個天生技能：${insertedNames.join("、")}`,
      };
    }),

  /**
   * AI 批量補齊所有缺少天生技能的寵物
   */
  aiBatchFillPetSkills: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // 找出所有寵物和其技能數量
      const allPets = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.isActive, 1));
      const allSkillCounts = await db.select({
        petCatalogId: gamePetInnateSkills.petCatalogId,
        count: sql<number>`count(*)`,
      }).from(gamePetInnateSkills).groupBy(gamePetInnateSkills.petCatalogId);

      const countMap = new Map(allSkillCounts.map(r => [r.petCatalogId, r.count]));
      const petsNeedingSkills = allPets.filter(p => (countMap.get(p.id) || 0) < 3);

      if (petsNeedingSkills.length === 0) {
        return { success: true, processed: 0, message: "所有寵物都已有完整天生技能" };
      }

      // 每次最多處理 5 隻
      const batch = petsNeedingSkills.slice(0, 5);
      const allSkills = await db.select({ name: gamePetInnateSkills.name }).from(gamePetInnateSkills);
      const existingNames = allSkills.map(s => s.name);

      const petDescriptions = batch.map(p => {
        const existCount = countMap.get(p.id) || 0;
        return `${p.id}|${p.name}|${p.wuxing}|${p.race}|${p.rarity}|${p.growthType}|已有${existCount}個技能|需要${3 - existCount}個`;
      }).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是東方玄幻 MMORPG 的寵物技能設計師。回覆純 JSON 物件，key 為寵物 ID，value 為技能陣列。" },
          { role: "user", content: `為以下 ${batch.length} 隻寵物補齊天生技能：

格式：ID|名稱|五行|種族|稀有度|成長型|已有數|需要數
${petDescriptions}

規則：
- 第 1 格（Lv.1 解鎖）：基礎技能，威力 60-100%
- 第 2 格（Lv.20 解鎖）：中階技能，威力 100-150%
- 第 3 格（Lv.50 解鎖）：強力技能，威力 150-250%
- 技能要符合寵物五行和種族
- 名稱不可重複

已有技能名稱：${existingNames.slice(0, 30).join("、") || "無"}

回覆 JSON：
{
  "1": [{"name":"技能名","skillType":"attack","wuxing":"木","powerPercent":80,"mpCost":5,"cooldown":2,"description":"描述"}],
  ...
}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices?.[0]?.message?.content as string;
      let skillMap: Record<string, any[]>;
      try {
        skillMap = JSON.parse(content);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回覆格式錯誤" });
      }

      const unlockLevels = [1, 20, 50];
      let totalInserted = 0;
      const results: { petId: number; petName: string; skillCount: number }[] = [];

      for (const pet of batch) {
        const skills = skillMap[String(pet.id)];
        if (!skills || !Array.isArray(skills)) continue;

        const existCount = countMap.get(pet.id) || 0;
        let inserted = 0;

        for (let i = 0; i < Math.min(skills.length, 3 - existCount); i++) {
          const skill = skills[i];
          if (!skill.name || existingNames.includes(skill.name)) continue;
          const slotIdx = existCount + i + 1;
          try {
            await db.insert(gamePetInnateSkills).values({
              petCatalogId: pet.id,
              name: skill.name,
              description: skill.description || "",
              skillType: skill.skillType || "attack",
              wuxing: skill.wuxing || pet.wuxing,
              powerPercent: Math.min(300, Math.max(0, skill.powerPercent || 100)),
              mpCost: Math.min(50, Math.max(0, skill.mpCost || 5)),
              cooldown: Math.min(10, Math.max(0, skill.cooldown || 2)),
              unlockLevel: unlockLevels[slotIdx - 1] || 1,
              slotIndex: slotIdx,
              sortOrder: slotIdx,
            });
            existingNames.push(skill.name);
            inserted++;
            totalInserted++;
          } catch (err) {
            console.error(`[AI PetSkillBatch] 插入失敗:`, err);
          }
        }

        results.push({ petId: pet.id, petName: pet.name, skillCount: inserted });
      }

      return {
        success: true,
        processed: results.length,
        totalSkillsCreated: totalInserted,
        remaining: petsNeedingSkills.length - batch.length,
        results,
        message: `已為 ${results.length} 隻寵物生成 ${totalInserted} 個天生技能，剩餘 ${petsNeedingSkills.length - batch.length} 隻待處理`,
      };
    }),

  /**
   * AI 審核全部寵物圖鑑平衡性
   */
  aiAuditAllPets: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allPets = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.isActive, 1));
    const results: { id: number; name: string; valid: boolean; warnings: string[]; autoFixed: boolean }[] = [];

    for (const pet of allPets) {
      const audit = auditPetCatalog(pet);
      let autoFixed = false;

      // 自動修正可修正的問題
      if (Object.keys(audit.fixes).length > 0) {
        await db.update(gamePetCatalog).set(audit.fixes as any).where(eq(gamePetCatalog.id, pet.id));
        autoFixed = true;
      }

      results.push({
        id: pet.id,
        name: pet.name,
        valid: audit.valid,
        warnings: audit.warnings,
        autoFixed,
      });
    }

    const invalidCount = results.filter(r => !r.valid).length;
    const fixedCount = results.filter(r => r.autoFixed).length;

    return {
      success: true,
      total: results.length,
      invalidCount,
      fixedCount,
      results: results.filter(r => !r.valid), // 只回傳有問題的
      message: `審核完成：${results.length} 隻寵物，${invalidCount} 隻有問題，${fixedCount} 隻已自動修正`,
    };
  }),

  // ════════════════════════════════════════════════════════════
  // 寵物圖鑑 AI 圖片生成
  // ════════════════════════════════════════════════════════════

  /**
   * 為單隻寵物生成 AI 圖片
   */
  aiGeneratePetImage: adminProcedure
    .input(z.object({ petCatalogId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [pet] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, input.petCatalogId));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物圖鑑不存在" });

      // 種族與屬性的中文描述
      const raceDesc: Record<string, string> = {
        dragon: "龍種生物，有鱗片和龍角",
        undead: "亡靈生物，帶有幽靈氣息",
        normal: "普通生物，外型自然",
        flying: "飛行生物，有翅膀",
        insect: "蟲類生物，有甲殼和觸角",
        plant: "植物生物，有花葉和藤蔓",
      };
      const wuxingDesc: Record<string, string> = {
        wood: "木屬性，綠色色調，帶有植物元素",
        fire: "火屬性，紅色色調，帶有火焰元素",
        earth: "土屬性，棕色色調，帶有岩石元素",
        metal: "金屬性，金色/銀色色調，帶有金屬光澤",
        water: "水屬性，藍色色調，帶有水流元素",
      };
      const rarityDesc: Record<string, string> = {
        common: "普通品質，外型樸實",
        rare: "稀有品質，帶有微光效果",
        epic: "史詩品質，帶有索繞光暈",
        legendary: "傳說品質，帶有神聖光環和特殊紋路",
      };

      const prompt = `中國古風奇幻遊戲寵物立繪，單一生物全身像，透明背景。
寵物名稱：${pet.name}
描述：${pet.description || "神秘生物"}
種族特徵：${raceDesc[pet.race] || "神秘生物"}
屬性特徵：${wuxingDesc[pet.wuxing] || "自然屬性"}
品質：${rarityDesc[pet.rarity] || "普通"}
風格：水墨畫與現代遊戲美術融合，線條細致，色彩豐富，高細節，適合作為遊戲圖鑑卡片。`;

      const { url } = await generateImage({ prompt });
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "圖片生成失敗" });

      // 儲存圖片 URL 到圖鑑
      await db.update(gamePetCatalog).set({
        imageUrl: url,
        updatedAt: Date.now(),
      }).where(eq(gamePetCatalog.id, pet.id));

      return { success: true, imageUrl: url, petName: pet.name };
    }),

  /**
   * AI 批量為所有無圖片的寵物生成圖片
   */
  aiBatchGeneratePetImages: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    // 找出所有沒有圖片的寵物
    const petsWithoutImage = await db.select().from(gamePetCatalog)
      .where(eq(gamePetCatalog.isActive, 1));
    const needImage = petsWithoutImage.filter(p => !p.imageUrl);

    if (needImage.length === 0) {
      return { success: true, generated: 0, message: "所有寵物都已有圖片" };
    }

    const raceDesc: Record<string, string> = {
      dragon: "龍種生物，有鱗片和龍角",
      undead: "亡靈生物，帶有幽靈氣息",
      normal: "普通生物，外型自然",
      flying: "飛行生物，有翅膀",
      insect: "蟲類生物，有甲殼和觸角",
      plant: "植物生物，有花葉和藤蔓",
    };
    const wuxingDesc: Record<string, string> = {
      wood: "木屬性，綠色色調，帶有植物元素",
      fire: "火屬性，紅色色調，帶有火焰元素",
      earth: "土屬性，棕色色調，帶有岩石元素",
      metal: "金屬性，金色/銀色色調，帶有金屬光澤",
      water: "水屬性，藍色色調，帶有水流元素",
    };
    const rarityDesc: Record<string, string> = {
      common: "普通品質，外型樸實",
      rare: "稀有品質，帶有微光效果",
      epic: "史詩品質，帶有索繞光暈",
      legendary: "傳說品質，帶有神聖光環和特殊紋路",
    };

    const results: { id: number; name: string; success: boolean; imageUrl?: string; error?: string }[] = [];

    // 逐一生成（避免並行超過 API 限制）
    for (const pet of needImage) {
      try {
        const prompt = `中國古風奇幻遊戲寵物立繪，單一生物全身像，透明背景。
寵物名稱：${pet.name}
描述：${pet.description || "神秘生物"}
種族特徵：${raceDesc[pet.race] || "神秘生物"}
屬性特徵：${wuxingDesc[pet.wuxing] || "自然屬性"}
品質：${rarityDesc[pet.rarity] || "普通"}
風格：水墨畫與現代遊戲美術融合，線條細致，色彩豐富，高細節，適合作為遊戲圖鑑卡片。`;

        const { url } = await generateImage({ prompt });
        if (url) {
          await db.update(gamePetCatalog).set({ imageUrl: url, updatedAt: Date.now() })
            .where(eq(gamePetCatalog.id, pet.id));
          results.push({ id: pet.id, name: pet.name, success: true, imageUrl: url });
        } else {
          results.push({ id: pet.id, name: pet.name, success: false, error: "生成失敗" });
        }
      } catch (err: any) {
        results.push({ id: pet.id, name: pet.name, success: false, error: err.message || "未知錯誤" });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: true,
      total: needImage.length,
      generated: successCount,
      failed: needImage.length - successCount,
      results,
      message: `圖片生成完成：${successCount}/${needImage.length} 成功`,
    };
  }),

  /**
   * 重新為指定寵物生成圖片（覆蓋現有）
   */
  aiRegeneratePetImage: adminProcedure
    .input(z.object({ petCatalogId: z.number().int(), customPrompt: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [pet] = await db.select().from(gamePetCatalog).where(eq(gamePetCatalog.id, input.petCatalogId));
      if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "寵物圖鑑不存在" });

      const raceDesc: Record<string, string> = {
        dragon: "龍種生物，有鱗片和龍角", undead: "亡靈生物，帶有幽靈氣息",
        normal: "普通生物，外型自然", flying: "飛行生物，有翅膀",
        insect: "蟲類生物，有甲殼和觸角", plant: "植物生物，有花葉和藤蔓",
      };
      const wuxingDesc: Record<string, string> = {
        wood: "木屬性，綠色色調", fire: "火屬性，紅色色調",
        earth: "土屬性，棕色色調", metal: "金屬性，金色/銀色色調",
        water: "水屬性，藍色色調",
      };

      const prompt = input.customPrompt || `中國古風奇幻遊戲寵物立繪，單一生物全身像，透明背景。
寵物名稱：${pet.name}
描述：${pet.description || "神秘生物"}
種族特徵：${raceDesc[pet.race] || "神秘生物"}
屬性特徵：${wuxingDesc[pet.wuxing] || "自然屬性"}
風格：水墨畫與現代遊戲美術融合，線條細致，色彩豐富，高細節，適合作為遊戲圖鑑卡片。`;

      const { url } = await generateImage({ prompt });
      if (!url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "圖片生成失敗" });

      await db.update(gamePetCatalog).set({ imageUrl: url, updatedAt: Date.now() })
        .where(eq(gamePetCatalog.id, pet.id));

      return { success: true, imageUrl: url, petName: pet.name };
    }),
});
