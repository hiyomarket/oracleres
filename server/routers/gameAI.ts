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
} from "../../drizzle/schema";
import { sql, like, eq, desc } from "drizzle-orm";

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
- 數值不能破壞平衡（HP 範圍 30-500, ATK 範圍 5-80, DEF 範圍 2-50, SPD 範圍 3-30）
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
- 售價合理：common 20-100, rare 100-500, epic 500-2000, legendary 2000-10000

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
- 數值不能破壞平衡（ATK 0-30, DEF 0-25, HP 0-100, SPD 0-15）
- 等級需求合理（1-50）

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
- 威力不能破壞平衡（common: 80-120%, rare: 100-160%, epic: 140-200%, legendary: 180-250%）
- MP 消耗合理（0-50）

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
            const wuxing = item.wuxing || "木";
            const monsterId = await generateNextId(db, gameMonsterCatalog, gameMonsterCatalog.monsterId, "M", wuxing);
            await db.insert(gameMonsterCatalog).values({
              monsterId,
              name: item.name,
              wuxing,
              levelRange: item.levelRange || "1-5",
              rarity: item.rarity || "common",
              baseHp: Math.min(500, Math.max(30, item.baseHp || 100)),
              baseAttack: Math.min(80, Math.max(5, item.baseAttack || 15)),
              baseDefense: Math.min(50, Math.max(2, item.baseDefense || 8)),
              baseSpeed: Math.min(30, Math.max(3, item.baseSpeed || 10)),
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
            const wuxing = item.wuxing || "木";
            const itemId = await generateNextId(db, gameItemCatalog, gameItemCatalog.itemId, "I", wuxing);
            await db.insert(gameItemCatalog).values({
              itemId,
              name: item.name,
              wuxing,
              category: item.category || "material_basic",
              rarity: item.rarity || "common",
              stackLimit: item.stackLimit || 99,
              shopPrice: Math.min(10000, Math.max(0, item.shopPrice || 0)),
              source: item.source || "",
              effect: item.effect || "",
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "equipment") {
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
              hpBonus: Math.min(100, Math.max(0, item.hpBonus || 0)),
              attackBonus: Math.min(30, Math.max(0, item.attackBonus || 0)),
              defenseBonus: Math.min(25, Math.max(0, item.defenseBonus || 0)),
              speedBonus: Math.min(15, Math.max(0, item.speedBonus || 0)),
              specialEffect: item.specialEffect || "",
              rarity: item.rarity || "common",
              isActive: 1,
              createdAt: Date.now(),
            });
            insertedNames.push(item.name);
            insertedCount++;
          } else if (catalogType === "skill") {
            const wuxing = item.wuxing || "木";
            const skillId = await generateNextId(db, gameSkillCatalog, gameSkillCatalog.skillId, "S", wuxing);
            await db.insert(gameSkillCatalog).values({
              skillId,
              name: item.name,
              wuxing,
              category: item.category || "active_combat",
              rarity: item.rarity || "common",
              tier: item.tier || "初階",
              mpCost: Math.min(50, Math.max(0, item.mpCost || 0)),
              cooldown: Math.min(10, Math.max(0, item.cooldown || 0)),
              powerPercent: Math.min(250, Math.max(50, item.powerPercent || 100)),
              learnLevel: Math.min(60, Math.max(1, item.learnLevel || 1)),
              acquireType: item.acquireType || "shop",
              shopPrice: Math.min(10000, Math.max(0, item.shopPrice || 0)),
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
});
