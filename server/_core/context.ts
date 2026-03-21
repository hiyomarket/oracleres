import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { hasAccess, type AccessResult } from "../PermissionService";
import { getDb } from "../db";
import { accessTokens } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// PermissionService 注入到 ctx 的小工具函數
export const permissionService = {
  checkAccess: (userId: number, featureId: string): Promise<AccessResult> =>
    hasAccess(userId, featureId),
};

/**
 * AI Token 虛擬用戶資訊
 * 當請求帶有有效 X-AI-Token header 時，注入此虛擬身分
 */
export interface AiTokenContext {
  tokenId: number;
  tokenName: string;
  identityType: "ai_readonly" | "trial" | "basic";
  /** 體驗/基礎方案的虛擬命盤（ai_readonly 為 null） */
  guestProfile: {
    name: string;
    gender: "male" | "female";
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
  } | null;
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  permissionService: typeof permissionService;
  /** AI Token 虛擬身分（有 Token 時注入，否則為 null） */
  aiToken: AiTokenContext | null;
};

/**
 * 建立虛擬 viewer 用戶物件
 * 讓 viewerProcedure 可以正常通過 ctx.user 檢查
 */
function buildVirtualUser(tokenId: number, tokenName: string): User {
  return {
    id: -(tokenId), // 負數 ID 代表虛擬用戶，避免與真實用戶衝突
    openId: `ai-token-${tokenId}`,
    name: `AI Token: ${tokenName}`,
    email: null,
    loginMethod: "ai_token",
    role: "viewer",
    planId: "basic",
    planExpiresAt: null,
    pointsBalance: 0,
    lastDailyCheckIn: null,
    signinStreak: 0,
    gameCoins: 0,
    availableDiscounts: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let aiToken: AiTokenContext | null = null;

  // 1. 嘗試 OAuth 登入認證
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  // 2. 若 OAuth 未登入，嘗試 X-AI-Token header 驗證
  if (!user) {
    const tokenValue = opts.req.headers["x-ai-token"] as string | undefined;
    if (tokenValue) {
      try {
        const db = await getDb();
        if (db) {
          const [record] = await db
            .select()
            .from(accessTokens)
            .where(eq(accessTokens.token, tokenValue))
            .limit(1);

          if (
            record &&
            record.isActive &&
            !(record.expiresAt && new Date(record.expiresAt) < new Date())
          ) {
            // Token 有效：注入虛擬 viewer 用戶
            user = buildVirtualUser(record.id, record.name);

            const identityType = (record.identityType ?? "ai_readonly") as "ai_readonly" | "trial" | "basic";

            aiToken = {
              tokenId: record.id,
              tokenName: record.name,
              identityType,
              guestProfile:
                identityType !== "ai_readonly" && record.guestName
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

            // 非同步更新使用記錄，不阻塞請求
            db.update(accessTokens)
              .set({ lastUsedAt: new Date(), useCount: (record.useCount ?? 0) + 1 })
              .where(eq(accessTokens.id, record.id))
              .catch(() => {});
          }
        }
      } catch {
        // Token 驗證失敗，靜默忽略
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    permissionService,
    aiToken,
  };
}
