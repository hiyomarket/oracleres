/**
 * 遊戲規則指南 Router
 * 後台 CRUD + 玩家端讀取 + AI 一鍵生成規則
 */
import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { gameGuide, gameGuideConfig } from "../../drizzle/schema";
import { eq, asc, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getEngineConfig } from "../gameEngineConfig";

// ─── 輔助：讀取全域設定 ───
async function getGuideConfigMap(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(gameGuideConfig);
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.configKey] = r.configValue;
  }
  return map;
}

async function setGuideConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(gameGuideConfig).where(eq(gameGuideConfig.configKey, key));
  if (existing.length > 0) {
    await db.update(gameGuideConfig)
      .set({ configValue: value, updatedAt: Date.now() })
      .where(eq(gameGuideConfig.configKey, key));
  } else {
    await db.insert(gameGuideConfig).values({
      configKey: key,
      configValue: value,
      updatedAt: Date.now(),
    });
  }
}

// ─── 收集系統狀態摘要（供 AI 生成規則用） ───
function collectSystemSummary(): string {
  const cfg = getEngineConfig();
  const lines: string[] = [];

  lines.push("## 目前系統設定摘要");
  lines.push("");
  lines.push("### 引擎配置");
  lines.push(`- 伺服器 Tick 間隔：${cfg.tickIntervalMs / 1000} 秒`);
  lines.push(`- 經驗倍率：${cfg.expMultiplier}x`);
  lines.push(`- 金幣倍率：${cfg.goldMultiplier}x`);
  lines.push(`- 掉落倍率：${cfg.dropMultiplier}x`);
  lines.push(`- 遊戲狀態：${cfg.gameEnabled ? "開放中" : "維護中"}`);
  lines.push("");
  lines.push("### 事件機率");
  lines.push(`- 戰鬥：${(cfg.combatChance * 100).toFixed(0)}%`);
  lines.push(`- 採集：${(cfg.gatherChance * 100).toFixed(0)}%`);
  lines.push(`- 奇遇：${(cfg.rogueChance * 100).toFixed(0)}%`);
  lines.push("");
  lines.push("### 戰鬥經驗倍率（依觀戰模式）");
  lines.push(`- 掛機模式：${cfg.rewardMultIdle}x`);
  lines.push(`- 關閉戰鬥視窗：${cfg.rewardMultClosed}x`);
  lines.push(`- 打開戰鬥視窗觀看：${cfg.rewardMultOpen}x`);
  lines.push("");
  lines.push("### 注靈系統");
  lines.push(`- 成功截取值範圍：${cfg.infuseMinGain} ~ ${cfg.infuseMaxGain}`);
  lines.push(`- 失敗機率：${(cfg.infuseFailRate * 100).toFixed(0)}%`);
  lines.push(`- 五行值上限：${cfg.infuseMaxWuxing}`);
  lines.push("");
  lines.push("### 掛機循環");
  lines.push(`- 自動掛機間隔：${cfg.afkTickIntervalMs / 1000} 秒`);
  lines.push(`- 掛機循環：${cfg.afkTickEnabled ? "啟用" : "停用"}`);
  lines.push("");

  lines.push("### 遊戲核心功能");
  lines.push("- 虛相世界：開放世界探索，角色在地圖節點間移動");
  lines.push("- 五大行動策略：探索、戰鬥、採集、休息、注靈");
  lines.push("- 戰鬥系統：回合制戰鬥，五行屬性克制，技能系統");
  lines.push("- 寵物系統：捕捉、培育、BP 成長、技能學習");
  lines.push("- 天命考核：任務鏈式技能習得系統");
  lines.push("- 裝備系統：武器、頭盔、護甲、鞋子四欄位");
  lines.push("- 天命商城：使用遊戲幣購買道具和裝備");
  lines.push("- 拍賣行：玩家間交易系統，每人最多上架 3 件");
  lines.push("- 排行榜：等級、戰力、金幣、PVP 排名");
  lines.push("- 成就系統：完成特定條件解鎖成就");
  lines.push("- 五行注靈：消耗體力為零時可進行，提升五行屬性");
  lines.push("- 靈相干預：消耗靈力值發動特殊效果（神癒恢復、神眼加持等）");
  lines.push("- 掛機模式：伺服器端自動執行角色行動，離線也能成長");
  lines.push("- PVP 對戰：玩家間即時對戰");

  return lines.join("\n");
}

export const gameGuideRouter = router({
  // ─── 玩家端：取得已啟用的規則章節 ───
  getPublicGuide: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { sections: [], config: {} };
    const sections = await db.select().from(gameGuide)
      .where(eq(gameGuide.enabled, 1))
      .orderBy(asc(gameGuide.sortOrder), asc(gameGuide.id));
    const config = await getGuideConfigMap();
    return { sections, config };
  }),

  // ─── 後台：取得所有章節（含停用的） ───
  getAllSections: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(gameGuide).orderBy(asc(gameGuide.sortOrder), asc(gameGuide.id));
  }),

  // ─── 後台：取得全域設定 ───
  getConfig: adminProcedure.query(async () => {
    return getGuideConfigMap();
  }),

  // ─── 後台：更新全域設定 ───
  updateConfig: adminProcedure
    .input(z.object({
      tabIcon: z.string().optional(),
      tabLabel: z.string().optional(),
      pageTitle: z.string().optional(),
      pageSubtitle: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.tabIcon !== undefined) await setGuideConfig("tabIcon", input.tabIcon);
      if (input.tabLabel !== undefined) await setGuideConfig("tabLabel", input.tabLabel);
      if (input.pageTitle !== undefined) await setGuideConfig("pageTitle", input.pageTitle);
      if (input.pageSubtitle !== undefined) await setGuideConfig("pageSubtitle", input.pageSubtitle);
      return { success: true };
    }),

  // ─── 後台：新增章節 ───
  createSection: adminProcedure
    .input(z.object({
      icon: z.string().default("📖"),
      title: z.string().min(1),
      content: z.string().default(""),
      sortOrder: z.number().default(0),
      enabled: z.boolean().default(true),
      category: z.string().default("general"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("資料庫不可用");
      const now = Date.now();
      const result = await db.insert(gameGuide).values({
        icon: input.icon,
        title: input.title,
        content: input.content,
        sortOrder: input.sortOrder,
        enabled: input.enabled ? 1 : 0,
        category: input.category,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result[0].insertId };
    }),

  // ─── 後台：更新章節 ───
  updateSection: adminProcedure
    .input(z.object({
      id: z.number(),
      icon: z.string().optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      sortOrder: z.number().optional(),
      enabled: z.boolean().optional(),
      category: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("資料庫不可用");
      const patch: Record<string, any> = { updatedAt: Date.now() };
      if (input.icon !== undefined) patch.icon = input.icon;
      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;
      if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
      if (input.enabled !== undefined) patch.enabled = input.enabled ? 1 : 0;
      if (input.category !== undefined) patch.category = input.category;
      await db.update(gameGuide).set(patch).where(eq(gameGuide.id, input.id));
      return { success: true };
    }),

  // ─── 後台：刪除章節 ───
  deleteSection: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("資料庫不可用");
      await db.delete(gameGuide).where(eq(gameGuide.id, input.id));
      return { success: true };
    }),

  // ─── 後台：批量更新排序 ───
  reorderSections: adminProcedure
    .input(z.object({
      orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("資料庫不可用");
      for (const item of input.orders) {
        await db.update(gameGuide)
          .set({ sortOrder: item.sortOrder, updatedAt: Date.now() })
          .where(eq(gameGuide.id, item.id));
      }
      return { success: true };
    }),

  // ─── 後台：AI 一鍵生成規則 ───
  aiGenerateGuide: adminProcedure.mutation(async () => {
    const systemSummary = collectSystemSummary();

    const prompt = `你是「天命共振」遊戲的規則撰寫專家。請根據以下系統設定，生成一份完整的遊戲規則指南。

${systemSummary}

請生成 JSON 格式的規則章節陣列，每個章節包含：
- icon: 適合的 emoji
- title: 章節標題
- content: Markdown 格式的詳細說明（包含具體數值）
- category: 分類（basic/combat/growth/social/advanced）

規則必須涵蓋：
1. 新手入門（如何開始、基本操作）
2. 虛相世界（地圖探索、節點移動、行動策略）
3. 戰鬥系統（回合制、五行克制、技能、觀戰模式與經驗倍率）
4. 寵物系統（捕捉、培育、BP 成長）
5. 裝備與道具（裝備欄位、道具使用）
6. 五行注靈（注靈條件、成功率、五行值）
7. 天命考核（任務鏈、技能習得）
8. 商城與交易（天命商城、拍賣行規則）
9. 掛機模式（自動掛機、離線收益）
10. 靈相干預（靈力值、特殊效果）
11. 排行榜與成就
12. 進階技巧與小提示

每個章節的 content 要用 Markdown 格式，包含標題、列表、粗體等排版。
所有數值必須使用上面提供的系統設定中的實際數值，不要編造。
語言使用繁體中文。`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是遊戲規則文件撰寫專家，擅長用清晰易懂的方式說明遊戲機制。請直接輸出 JSON 陣列，不要加 markdown code block。" },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "guide_sections",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    icon: { type: "string", description: "章節 emoji icon" },
                    title: { type: "string", description: "章節標題" },
                    content: { type: "string", description: "Markdown 格式的章節內容" },
                    category: { type: "string", description: "分類標籤" },
                  },
                  required: ["icon", "title", "content", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: ["sections"],
            additionalProperties: false,
          },
        },
      },
    });

    const text = typeof response.choices[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "";

    let sections: Array<{ icon: string; title: string; content: string; category: string }> = [];
    try {
      const parsed = JSON.parse(text);
      sections = parsed.sections || parsed;
    } catch {
      throw new Error("AI 生成的規則格式解析失敗，請重試");
    }

    // 寫入資料庫（先清空舊的，再批量插入）
    const db = await getDb();
    if (!db) throw new Error("資料庫不可用");

    // 刪除所有現有章節
    await db.delete(gameGuide);

    // 批量插入新章節
    const now = Date.now();
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      await db.insert(gameGuide).values({
        icon: s.icon,
        title: s.title,
        content: s.content,
        sortOrder: i * 10,
        enabled: 1,
        category: s.category,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { count: sections.length, sections };
  }),
});
