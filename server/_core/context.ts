import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { hasAccess, type AccessResult } from "../PermissionService";
import { getDb } from "../db";
import { accessTokens, userProfiles, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/** 生命靈數約分到 1-22 */
function reduceToMasterNum(n: number): number {
  while (n > 22) {
    n = n.toString().split("").reduce((a: number, c: string) => a + parseInt(c), 0);
  }
  return n;
}

/**
 * 確保虛擬用戶在 users 表中有真實記錄（以 openId 為唯一鍵）
 * 回傳真實的 userId（正整數）
 */
async function ensureVirtualUserInDb(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  tokenId: number,
  tokenName: string
): Promise<number> {
  const openId = `ai-token-${tokenId}`;

  // 先查詢是否已存在
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  if (existing) return existing.id as number;

  // 不存在則建立
  const result = await db.insert(users).values({
    openId,
    name: `AI Token: ${tokenName}`,
    email: null,
    loginMethod: "ai_token",
    role: "viewer",
    planId: null as unknown as string,
    planExpiresAt: null,
    pointsBalance: 0,
    lastDailyCheckIn: null,
    signinStreak: 0,
    gameCoins: 0,
    availableDiscounts: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  });

  return result[0].insertId as number;
}

/**
 * 自動初始化虛擬用戶的 userProfile（含完整命格推算）
 * 如果已存在則跳過，避免重複寫入
 */
async function autoInitGuestProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  realUserId: number,
  guestProfile: { name: string; gender: "male" | "female"; birthYear: number; birthMonth: number; birthDay: number; birthHour: number }
): Promise<void> {
  try {
    // 檢查是否已存在
    const existing = await db.select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, realUserId))
      .limit(1);
    if (existing.length > 0) return; // 已存在，跳過

    // 將時辰索引轉為時間字串
    const HOUR_INDEX_TO_TIME = [
      '00:30', '02:30', '04:30', '06:30', '08:30', '10:30',
      '12:30', '14:30', '16:30', '18:30', '20:30', '22:30'
    ];
    const hourIndex = Math.floor(guestProfile.birthHour / 2);
    const birthTime = HOUR_INDEX_TO_TIME[hourIndex] ?? '12:30';
    const birthDate = `${guestProfile.birthYear}-${String(guestProfile.birthMonth).padStart(2, '0')}-${String(guestProfile.birthDay).padStart(2, '0')}`;

    // 推算八字
    const { calculateBazi } = await import('../lib/baziCalculator');
    const result = calculateBazi(birthDate, birthTime);

    // 計算生命靈數
    const _d = guestProfile.birthDay;
    const _m = guestProfile.birthMonth;
    const _y = guestProfile.birthYear;
    const _outer = reduceToMasterNum(_d);
    const _monthProcessed = _m >= 10 ? Math.floor(_m / 10) + (_m % 10) : _m;
    const _middle = reduceToMasterNum(_outer + _monthProcessed);
    const _yearRaw = _y.toString().split('').reduce((a: number, c: string) => a + parseInt(c), 0);
    const _yearNum = reduceToMasterNum(_yearRaw);
    const lifePathNumber = reduceToMasterNum(_middle + _yearNum);

    // 推算農曆
    let birthLunarStr: string | null = null;
    try {
      const { Solar } = await import('lunar-typescript');
      const solar = Solar.fromYmd(guestProfile.birthYear, guestProfile.birthMonth, guestProfile.birthDay);
      const lunar = solar.getLunar();
      const yearGanzhi = lunar.getYearInGanZhi();
      const isLeap = lunar.getMonth() < 0;
      birthLunarStr = `農曆：${yearGanzhi}年${isLeap ? '閏' : ''}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
    } catch {
      // 農曆推算失敗不阻斷
    }

    // 寫入 userProfiles
    await db.insert(userProfiles).values({
      userId: realUserId,
      displayName: guestProfile.name,
      gender: guestProfile.gender,
      birthDate,
      birthTime,
      yearPillar: result.yearPillar,
      monthPillar: result.monthPillar,
      dayPillar: result.dayPillar,
      hourPillar: result.hourPillar,
      dayMasterElement: result.dayMasterElement as 'fire' | 'earth' | 'metal' | 'wood' | 'water',
      favorableElements: result.favorableElements,
      unfavorableElements: result.unfavorableElements,
      natalWood: result.elementRatio.wood,
      natalFire: result.elementRatio.fire,
      natalEarth: result.elementRatio.earth,
      natalMetal: result.elementRatio.metal,
      natalWater: result.elementRatio.water,
      lifePathNumber,
      ...(birthLunarStr ? { birthLunar: birthLunarStr } : {}),
      notes: '虛擬體驗命盤（系統自動生成）',
      createdAt: new Date(),
    });

    console.log(`[Context] autoInitGuestProfile: userId=${realUserId} 命盤寫入成功`);
  } catch (err) {
    // 命盤初始化失敗不阻斷請求，但記錄詳細錯誤
    console.error('[Context] autoInitGuestProfile failed:', err);
  }
}

/**
 * AI Token 虛擬用戶資訊
 * 當請求帶有有效 X-AI-Token header 時，注入此虛擬身分
 */
export interface AiTokenContext {
  tokenId: number;
  tokenName: string;
  /** 'ai_readonly' | 'ai_full' | 方案 ID（如 'basic', 'advanced'） */
  identityType: string;
  /** 體驗/基礎方案的虛擬命盤（ai_readonly 為 null） */
  guestProfile: {
    name: string;
    gender: "male" | "female";
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
  } | null;
  /** 虛擬用戶在 users 表中的真實 ID（用於 userProfiles 查詢） */
  realUserId?: number;
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
 * 使用真實 userId（從 users 表取得），確保 userProfiles 外鍵合法
 */
function buildVirtualUser(realUserId: number, tokenId: number, tokenName: string): User {
  return {
    id: realUserId,
    openId: `ai-token-${tokenId}`,
    name: `AI Token: ${tokenName}`,
    email: null,
    loginMethod: "ai_token",
    role: "viewer",
    planId: null as unknown as string,
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

// PermissionService 注入到 ctx 的小工具函數
// 支援 ai_full 身分繞過方案權限檢查（全功能開放）
export const permissionService = {
  checkAccess: (userId: number, featureId: string, aiToken?: AiTokenContext | null): Promise<AccessResult> => {
    // ai_full 身分：繞過所有方案權限，直接開放全部功能
    if (aiToken && aiToken.identityType === "ai_full") {
      return Promise.resolve({ hasAccess: true, reason: "ai_full" });
    }
    return hasAccess(userId, featureId);
  },
};

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
              const identityType = (record.identityType ?? "ai_readonly") as string;
              const hasGuestProfile = identityType !== "ai_readonly" && record.guestName;

              const guestProfile = hasGuestProfile
                ? {
                    name: record.guestName!,
                    gender: (record.guestGender ?? "male") as "male" | "female",
                    birthYear: record.guestBirthYear ?? 1990,
                    birthMonth: record.guestBirthMonth ?? 1,
                    birthDay: record.guestBirthDay ?? 1,
                    birthHour: record.guestBirthHour ?? 12,
                  }
                : null;

              // 確保虛擬用戶在 users 表中有真實記錄（取得正整數 ID）
              let realUserId: number;
              try {
                realUserId = await ensureVirtualUserInDb(db, record.id, record.name);
              } catch (err) {
                console.error('[Context] ensureVirtualUserInDb failed:', err);
                // 降級：使用負數 ID（命盤寫入可能失敗，但不阻斷請求）
                realUserId = -(record.id);
              }

              // Token 有效：注入虛擬 viewer 用戶（使用真實 userId）
              const virtualUser = buildVirtualUser(realUserId, record.id, record.name);
              user = virtualUser;

              aiToken = {
                tokenId: record.id,
                tokenName: record.name,
                identityType,
                guestProfile,
                realUserId,
              };

              // 非同步更新使用記錄，不阻塞請求
              db.update(accessTokens)
                .set({ lastUsedAt: new Date(), useCount: (record.useCount ?? 0) + 1 })
                .where(eq(accessTokens.id, record.id))
                .catch(() => {});

              // 有虛擬命盤：非同步自動寫入 userProfiles（如果尚未寫入）
              if (guestProfile) {
                autoInitGuestProfile(db, realUserId, guestProfile).catch((err) => {
                  console.error('[Context] autoInitGuestProfile async error:', err);
                });
              }
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
