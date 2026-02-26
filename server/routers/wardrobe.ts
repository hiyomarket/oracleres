import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { wardrobeItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM, type Message, type ImageContent, type TextContent } from "../_core/llm";
import { storagePut } from "../storage";

// 五行顏色對應表
const COLOR_WUXING: Record<string, string> = {
  // 木系（綠色系）
  "綠色": "木", "深綠": "木", "草綠": "木", "橄欖綠": "木", "墨綠": "木", "青色": "木",
  // 火系（紅色/紫色系）
  "紅色": "火", "深紅": "火", "酒紅": "火", "橘色": "火", "橙色": "火", "粉紅": "火",
  "紫色": "火", "桃紅": "火", "珊瑚色": "火",
  // 土系（黃色/棕色系）
  "黃色": "土", "土黃": "土", "棕色": "土", "咖啡色": "土", "米色": "土", "卡其": "土",
  "駝色": "土", "奶油色": "土", "杏色": "土",
  // 金系（白色/金色/銀色系）
  "白色": "金", "米白": "金", "象牙白": "金", "金色": "金", "銀色": "金", "灰色": "金",
  "淺灰": "金", "香檳色": "金",
  // 水系（黑色/深藍系）
  "黑色": "水", "深藍": "水", "藍色": "水", "海軍藍": "水", "靛藍": "水", "炭灰": "水",
  "深灰": "水", "午夜藍": "水",
};

function guessWuxingFromColor(color: string): string {
  for (const [key, val] of Object.entries(COLOR_WUXING)) {
    if (color.includes(key)) return val;
  }
  return "土"; // 預設
}

export const wardrobeRouter = router({
  // 取得用戶的所有衣物
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const items = await db.select().from(wardrobeItems).where(eq(wardrobeItems.userId, ctx.user.id));
      if (input?.category && input.category !== "all") {
        return items.filter(i => i.category === input.category);
      }
      return items;
    }),

  // 新增衣物
  add: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      category: z.enum(["upper", "lower", "shoes", "outer", "accessory"]),
      color: z.string().min(1).max(50),
      wuxing: z.enum(["木", "火", "土", "金", "水"]).optional(),
      material: z.string().max(50).optional(),
      occasion: z.string().max(50).optional(),
      imageUrl: z.string().url().optional(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const wuxing = input.wuxing ?? guessWuxingFromColor(input.color);
      await db.insert(wardrobeItems).values({
        userId: ctx.user.id,
        name: input.name,
        category: input.category,
        color: input.color,
        wuxing,
        material: input.material,
        occasion: input.occasion,
        imageUrl: input.imageUrl,
        note: input.note,
      });
      return { success: true, wuxing };
    }),

  // 更新衣物
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      category: z.enum(["upper", "lower", "shoes", "outer", "accessory"]).optional(),
      color: z.string().min(1).max(50).optional(),
      wuxing: z.enum(["木", "火", "土", "金", "水"]).optional(),
      material: z.string().max(50).optional(),
      occasion: z.string().max(50).optional(),
      imageUrl: z.string().url().optional().nullable(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db.select().from(wardrobeItems)
        .where(and(eq(wardrobeItems.id, input.id), eq(wardrobeItems.userId, ctx.user.id)));
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });

      const { id, ...updates } = input;
      // 如果顏色改了但沒指定五行，自動推算
      if (updates.color && !updates.wuxing) {
        updates.wuxing = guessWuxingFromColor(updates.color) as "木" | "火" | "土" | "金" | "水";
      }
      await db.update(wardrobeItems)
        .set(updates as Record<string, unknown>)
        .where(and(eq(wardrobeItems.id, id), eq(wardrobeItems.userId, ctx.user.id)));
      return { success: true };
    }),

  // 刪除衣物
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db.select().from(wardrobeItems)
        .where(and(eq(wardrobeItems.id, input.id), eq(wardrobeItems.userId, ctx.user.id)));
      if (!existing.length) throw new TRPCError({ code: "NOT_FOUND" });
      await db.delete(wardrobeItems)
        .where(and(eq(wardrobeItems.id, input.id), eq(wardrobeItems.userId, ctx.user.id)));
      return { success: true };
    }),

  // 上傳衣物圖片（base64 → S3）
  uploadImage: protectedProcedure
    .input(z.object({
      base64: z.string(), // data:image/jpeg;base64,...
      filename: z.string().max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const matches = input.base64.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid base64 image" });
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "圖片大小不能超過 5MB" });
      }
      const ext = mimeType.split("/")[1] ?? "jpg";
      const key = `wardrobe/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      return { url };
    }),

  // AI 穿搭點評：分析用戶今日穿搭照片與命格五行匹配度
  aiReview: protectedProcedure
    .input(z.object({
      imageUrl: z.string().url(), // 已上傳到 S3 的圖片 URL
      todayWuxing: z.object({
        favorable: z.array(z.string()), // 今日有利五行
        unfavorable: z.array(z.string()), // 今日不利五行
        dayScore: z.number(),
      }),
      userProfile: z.object({
        dayMaster: z.string(), // 日主（例：甲木）
        innateElements: z.record(z.string(), z.number()), // 本命五行分佈
      }).optional(),
      shichen: z.string().optional(), // 當前時辰
    }))
    .mutation(async ({ ctx, input }) => {
      const { imageUrl, todayWuxing, userProfile, shichen } = input;

      const systemPrompt = `你是一位精通八字命理與色彩能量學的穿搭顧問。
你的任務是分析用戶今日的穿搭照片，從五行能量角度給出專業但親切的點評。

分析框架：
1. 識別照片中的主要顏色（上衣、下裝、外套、配件）
2. 將每個顏色對應到五行屬性（木=綠/青、火=紅/紫/橘、土=黃/棕/米、金=白/金/銀/灰、水=黑/深藍）
3. 對照今日有利五行，評估整體搭配的能量匹配度（0-100分）
4. 給出具體、實用、白話的改善建議

輸出格式（JSON）：
{
  "detectedColors": [{"part": "上衣", "color": "白色", "wuxing": "金"}],
  "overallScore": 75,
  "scoreReason": "白色上衣補金能量很好，但深藍牛仔褲的水能量略強...",
  "strengths": ["白色上衣與今日金系能量完美呼應", "整體搭配清爽有型"],
  "improvements": ["可以換成米色或卡其褲，增加土系能量平衡水氣"],
  "luckyTip": "今天出門前可以加一條金色或白色的配件，讓財運更旺！",
  "energyMatch": "良好"
}`;

      const userMessage = `今日穿搭分析請求：
- 今日有利五行：${todayWuxing.favorable.join("、")}
- 今日不利五行：${todayWuxing.unfavorable.join("、")}
- 今日運勢分數：${todayWuxing.dayScore}/10
${userProfile ? `- 我的日主：${userProfile.dayMaster}` : ""}
${shichen ? `- 當前時辰：${shichen}` : ""}

請分析我的穿搭照片，給出五行能量匹配度評分和改善建議。請用輕鬆白話的台灣口語，讓我容易理解。`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage } as TextContent,
              { type: "image_url", image_url: { url: imageUrl, detail: "low" } } as ImageContent,
            ] as (TextContent | ImageContent)[],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outfit_review",
            strict: true,
            schema: {
              type: "object",
              properties: {
                detectedColors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      part: { type: "string" },
                      color: { type: "string" },
                      wuxing: { type: "string" },
                    },
                    required: ["part", "color", "wuxing"],
                    additionalProperties: false,
                  },
                },
                overallScore: { type: "number" },
                scoreReason: { type: "string" },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
                luckyTip: { type: "string" },
                energyMatch: { type: "string" },
              },
              required: ["detectedColors", "overallScore", "scoreReason", "strengths", "improvements", "luckyTip", "energyMatch"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : null;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 分析失敗" });

      try {
        const result = JSON.parse(content);
        return result;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 回應格式錯誤" });
      }
    }),

  // 根據今日五行推薦衣櫥中的最佳搭配
  recommendFromWardrobe: protectedProcedure
    .input(z.object({
      favorableWuxing: z.array(z.string()),
      unfavorableWuxing: z.array(z.string()),
      mode: z.enum(["default", "love", "work", "leisure", "travel"]).default("default"),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { hasWardrobe: false, recommendations: [] };
      const items = await db.select().from(wardrobeItems)
        .where(eq(wardrobeItems.userId, ctx.user.id));

      if (!items.length) return { hasWardrobe: false, recommendations: [] };

      // 計算每件衣物的能量匹配分數
      const scored = items.map((item: typeof items[0]) => {
        let score = 50;
        if (input.favorableWuxing.includes(item.wuxing)) score += 30;
        if (input.unfavorableWuxing.includes(item.wuxing)) score -= 20;
        // 情境加分
        if (input.mode === "work" && item.occasion?.includes("工作")) score += 10;
        if (input.mode === "love" && item.occasion?.includes("約會")) score += 10;
        if (input.mode === "leisure" && item.occasion?.includes("休閒")) score += 10;
        if (input.mode === "travel" && item.occasion?.includes("運動")) score += 10;
        return { ...item, matchScore: Math.max(0, Math.min(100, score)) };
      });

      // 按類型分組，每類取最高分
      const byCategory: Record<string, typeof scored[0][]> = {};
      for (const item of scored) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      }

      const recommendations = Object.entries(byCategory).map(([cat, catItems]) => {
        const sorted = catItems.sort((a, b) => b.matchScore - a.matchScore);
        return {
          category: cat,
          topPick: sorted[0],
          alternatives: sorted.slice(1, 3),
        };
      });

      return { hasWardrobe: true, recommendations };
    }),
});
