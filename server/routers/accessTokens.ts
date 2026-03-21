/**
 * accessTokens.ts
 * 特殊存取 Token 管理 Router
 *
 * 功能：
 * 1. 管理員可生成新 Token（adminProcedure）—含模組勾選、存取模式
 * 2. 管理員可廢止/啟用 Token（adminProcedure）
 * 3. 管理員可列出所有 Token（adminProcedure）
 * 4. 公開驗證 Token（publicProcedure）—供 /ai-view 與 /ai-entry 頁面使用
 * 5. 列出即將到期 Token（adminProcedure）—供儀表板警示
 * 6. 查詢 Token 存取紀錄（adminProcedure）—最近 N 筆
 *
 * accessMode：
 *   daily_view  → 只能看 /ai-view 今日運勢頁
 *   admin_view  → 可進入後台唯讀瀏覽（等同 viewer 角色）
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { accessTokens, tokenAccessLogs } from "../../drizzle/schema";
import { eq, desc, and, isNotNull, lte, gt } from "drizzle-orm";
import crypto from "crypto";

/** 可選模組清單 */
export const ALLOWED_MODULE_IDS = ["daily", "tarot", "wealth", "hourly"] as const;
export type ModuleId = typeof ALLOWED_MODULE_IDS[number];

/** 存取模式 */
export const ACCESS_MODES = ["daily_view", "admin_view"] as const;
export type AccessMode = typeof ACCESS_MODES[number];

/** 產生安全隨機 Token（64 字元 hex） */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** 隨機生成虛擬命盤（體驗/基礎方案 Token 使用） */
function generateGuestProfile(): {
  guestName: string;
  guestGender: "male" | "female";
  guestBirthYear: number;
  guestBirthMonth: number;
  guestBirthDay: number;
  guestBirthHour: number;
} {
  const maleNames = ["志輩", "宇軒", "建宏", "志明", "嘉輩", "志強", "建輩", "嘉強", "宇明", "志宇",
    "建明", "志嘉", "宇強", "建嘉", "嘉明", "嘉宇", "建宇", "志宇", "宇嘉", "建強"];
  const femaleNames = ["子晴", "清娟", "怀萃", "子潔", "清怀", "娟晴", "怀晴", "子萃", "清潔", "娟萃",
    "子清", "怀潔", "娟潔", "清子", "娟子", "怀子", "子娟", "清萃", "娟清", "怀清"];
  const surnames = ["陳", "林", "黃", "張", "王", "劉", "李", "吴", "趙", "陳",
    "魏", "周", "徐", "孫", "馬", "朱", "胡", "郭", "何", "高"];
  const gender = Math.random() < 0.5 ? "male" : "female";
  const namePool = gender === "male" ? maleNames : femaleNames;
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = namePool[Math.floor(Math.random() * namePool.length)];
  // 出生年份：1970-2000 隨機
  const birthYear = 1970 + Math.floor(Math.random() * 31);
  const birthMonth = 1 + Math.floor(Math.random() * 12);
  // 簡化日期計算（每月取 1-28 避免越界）
  const birthDay = 1 + Math.floor(Math.random() * 28);
  // 時辰：偶數小時（0/2/4/.../22）
  const birthHour = Math.floor(Math.random() * 12) * 2;
  return {
    guestName: surname + givenName,
    guestGender: gender,
    guestBirthYear: birthYear,
    guestBirthMonth: birthMonth,
    guestBirthDay: birthDay,
    guestBirthHour: birthHour,
  };
}

/** 身分類型 */
export const IDENTITY_TYPES = ["ai_readonly", "trial", "basic"] as const;
export type IdentityType = typeof IDENTITY_TYPES[number];

/** 解析 allowedModules JSON 字串 */
function parseModules(raw: string | null | undefined): ModuleId[] | null {
  if (!raw) return null; // null = 全部開放
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ModuleId[];
  } catch {}
  return null;
}

export const accessTokensRouter = router({
  /** 列出所有 Token（僅管理員） */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
    const tokens = await db
      .select()
      .from(accessTokens)
      .orderBy(desc(accessTokens.createdAt));
    return tokens.map(t => ({
      ...t,
      allowedModules: parseModules(t.allowedModules),
      accessMode: (t.accessMode ?? "daily_view") as AccessMode,
    }));
  }),

  /** 列出即將到期的 Token（7 天內，供儀表板警示） */
  listExpiringSoon: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tokens = await db
      .select()
      .from(accessTokens)
      .where(
        and(
          isNotNull(accessTokens.expiresAt),
          gt(accessTokens.expiresAt, now),
          lte(accessTokens.expiresAt, sevenDaysLater),
          eq(accessTokens.isActive, 1),
        )
      )
      .orderBy(accessTokens.expiresAt);
    return tokens.map(t => ({
      id: t.id,
      name: t.name,
      expiresAt: t.expiresAt ? t.expiresAt.getTime() : null,
      accessMode: (t.accessMode ?? "daily_view") as AccessMode,
    }));
  }),

  /** 生成新 Token（僅管理員） */
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(300).optional(),
        expiresAt: z.number().optional(),
        allowedModules: z.array(z.enum(["daily", "tarot", "wealth", "hourly"])).optional(),
        accessMode: z.enum(["daily_view", "admin_view"]).default("daily_view"),
        identityType: z.enum(["ai_readonly", "trial", "basic"]).default("ai_readonly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });

      const token = generateSecureToken();
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      const modulesJson = input.allowedModules && input.allowedModules.length > 0
        ? JSON.stringify(input.allowedModules)
        : null;

      // 體驗/基礎方案：隨機生成虛擬命盤
      const guestData = input.identityType !== "ai_readonly"
        ? generateGuestProfile()
        : {};

      await db.insert(accessTokens).values({
        token,
        name: input.name,
        description: input.description ?? null,
        isActive: 1,
        createdBy: ctx.user.id,
        expiresAt: expiresAt ?? undefined,
        useCount: 0,
        allowedModules: modulesJson ?? undefined,
        accessMode: input.accessMode,
        identityType: input.identityType,
        ...guestData,
      });

      return {
        token,
        name: input.name,
        accessMode: input.accessMode,
        identityType: input.identityType,
        guestName: (guestData as { guestName?: string }).guestName ?? null,
      };
    }),

  /** 廢止或啟用 Token（僅管理員） */
  setActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      await db.update(accessTokens)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(accessTokens.id, input.id));
      return { success: true };
    }),

  /** 刪除 Token（僅管理員） */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "資料庫連線失敗" });
      await db.delete(accessTokens).where(eq(accessTokens.id, input.id));
      return { success: true };
    }),

  /**
   * 驗證 Token（公開）
   * 供 /ai-view（daily_view）與 /ai-entry（admin_view）頁面呼叫
   * 回傳有效性、accessMode、allowedModules
   */
  verify: publicProcedure
    .input(z.object({
      token: z.string(),
      path: z.string().optional(),
      ip: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, reason: "db_unavailable" as const };

      const [record] = await db
        .select()
        .from(accessTokens)
        .where(eq(accessTokens.token, input.token))
        .limit(1);

      if (!record) return { valid: false, reason: "not_found" as const };
      if (!record.isActive) return { valid: false, reason: "revoked" as const };
      if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
        return { valid: false, reason: "expired" as const };
      }

      // 更新使用記錄（非同步，不阻塞回應）
      db.update(accessTokens)
        .set({ lastUsedAt: new Date(), useCount: (record.useCount ?? 0) + 1 })
        .where(eq(accessTokens.id, record.id))
        .catch(() => {});

      // 寫入存取紀錄（非同步）
      db.insert(tokenAccessLogs).values({
        tokenId: record.id,
        ip: input.ip ?? null,
        path: input.path ?? "/ai-view",
        accessedAt: new Date(),
      }).catch(() => {});

      const identityType = (record.identityType ?? "ai_readonly") as IdentityType;
      return {
        valid: true,
        name: record.name,
        description: record.description,
        expiresAt: record.expiresAt ? record.expiresAt.getTime() : null,
        allowedModules: parseModules(record.allowedModules),
        accessMode: (record.accessMode ?? "daily_view") as AccessMode,
        identityType,
        guestProfile: identityType !== "ai_readonly" && record.guestName
          ? {
              name: record.guestName,
              gender: (record.guestGender ?? "male") as "male" | "female",
              birthYear: record.guestBirthYear ?? 1990,
              birthMonth: record.guestBirthMonth ?? 1,
              birthDay: record.guestBirthDay ?? 1,
              birthHour: record.guestBirthHour ?? 12,
            }
          : null,
      };
    }),

  /**
   * 查詢指定 Token 的存取紀錄（僅管理員）
   * 回傳最近 N 筆（預設 10 筆）
   */
  getLogs: adminProcedure
    .input(z.object({
      tokenId: z.number(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const logs = await db
        .select()
        .from(tokenAccessLogs)
        .where(eq(tokenAccessLogs.tokenId, input.tokenId))
        .orderBy(desc(tokenAccessLogs.accessedAt))
        .limit(input.limit);
      return logs.map(l => ({
        id: l.id,
        ip: l.ip,
        path: l.path,
        accessedAt: l.accessedAt ? l.accessedAt.getTime() : null,
      }));
    }),
});
