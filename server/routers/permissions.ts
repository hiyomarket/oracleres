/**
 * permissions.ts
 * 功能權限管控 API
 * 
 * 功能模組清單：
 *   oracle            - 擲筊（天命問卦）
 *   lottery           - 選號（天命選號）
 *   calendar          - 日曆（命理日曆）
 *   warroom           - 作戰室（基礎入口）
 *   warroom_divination - 作戰室 > 天命問掛
 *   warroom_outfit    - 作戰室 > 穿搭手串
 *   warroom_wealth    - 作戰室 > 財運羅盤
 *   warroom_dietary   - 作戰室 > 飲食建議
 *   weekly            - 週報
 *   stats             - 統計
 *   profile           - 命格資料
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { userPermissions, users } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { hasAccess } from "../PermissionService";

// 所有功能模組定義
export const ALL_FEATURES = [
  { id: "oracle",             label: "擲筊",          category: "主功能" },
  { id: "lottery",            label: "選號",          category: "主功能" },
  { id: "calendar",           label: "日曆",          category: "主功能" },
  { id: "warroom",            label: "作戰室（入口）", category: "作戰室" },
  { id: "warroom_divination", label: "天命問掛",       category: "作戰室" },
  { id: "warroom_outfit",     label: "穿搭手串",       category: "作戰室" },
  { id: "warroom_wealth",     label: "財運羅盤",       category: "作戰室" },
  { id: "warroom_dietary",    label: "飲食建議",       category: "作戰室" },
  { id: "weekly",             label: "週報",          category: "主功能" },
  { id: "stats",              label: "統計",          category: "主功能" },
  { id: "profile",            label: "命格資料",       category: "主功能" },
] as const;

export type FeatureId = typeof ALL_FEATURES[number]["id"];

// 一般子帳號的預設開放功能（僅作戰室入口 + 命格）
export const DEFAULT_FEATURES: FeatureId[] = ["warroom", "profile"];

// 判斷是否為主帳號（admin role）
function isAdmin(user: { role?: string | null }) {
  return user.role === "admin";
}

/**
 * 取得使用者的有效權限清單
 * - admin 永遠擁有全部功能
 * - 一般使用者依 user_permissions 資料表判斷
 * - 若無任何記錄，回退到 DEFAULT_FEATURES
 */
export async function getUserFeatures(userId: number, userRole: string | null): Promise<FeatureId[]> {
  if (userRole === "admin") {
    return ALL_FEATURES.map(f => f.id);
  }
  
  const db = (await getDb())!;
  const now = new Date();
  
  const rows = await db.select()
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
  
  if (rows.length === 0) {
    // 無任何記錄：使用預設開放功能
    return DEFAULT_FEATURES;
  }
  
  // 過濾：enabled=1 且未過期
  const active = rows.filter(r => {
    if (!r.enabled) return false;
    if (r.expiresAt && new Date(r.expiresAt) < now) return false;
    return true;
  });
  
  return active.map(r => r.feature as FeatureId);
}

/**
 * 檢查使用者是否有特定功能的權限
 */
export async function hasFeature(userId: number, userRole: string | null, feature: FeatureId): Promise<boolean> {
  const features = await getUserFeatures(userId, userRole);
  return features.includes(feature);
}

export const permissionsRouter = router({
  /**
   * 「新版」取得當前使用者的有效功能清單
   * 已全面改為調用 PermissionService，不再查詢舊 user_permissions 表
   */
  myFeatures: protectedProcedure.query(async ({ ctx }) => {
    if (isAdmin(ctx.user)) {
      return {
        features: ALL_FEATURES.map(f => f.id) as FeatureId[],
        isAdmin: true,
        allFeatures: ALL_FEATURES,
      };
    }
    // ai_full 身分：開放全部功能
    if (ctx.aiToken?.identityType === "ai_full") {
      return {
        features: ALL_FEATURES.map(f => f.id) as FeatureId[],
        isAdmin: false,
        allFeatures: ALL_FEATURES,
      };
    }
    // 對每個 feature 調用 PermissionService
    const results = await Promise.all(
      ALL_FEATURES.map(async (f) => {
        const access = await hasAccess(ctx.user.id, f.id);
        return access.hasAccess ? f.id as FeatureId : null;
      })
    );
    const features = results.filter((f): f is FeatureId => f !== null);
    return {
      features,
      isAdmin: false,
      allFeatures: ALL_FEATURES,
    };
  }),

  /**
   * 取得指定使用者的權限設定（主帳號專屬）
   */
  getUserPermissions: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user)) {
        throw new Error("僅主帳號可查看他人權限");
      }
      const db = (await getDb())!;
      const rows = await db.select()
        .from(userPermissions)
        .where(eq(userPermissions.userId, input.userId));
      
      // 合併：已有記錄的 + 未設定的（顯示預設狀態）
      const existingMap = new Map(rows.map(r => [r.feature, r]));
      
      return ALL_FEATURES.map(f => {
        const existing = existingMap.get(f.id);
        const isDefault = DEFAULT_FEATURES.includes(f.id as FeatureId);
        return {
          feature: f.id,
          label: f.label,
          category: f.category,
          enabled: existing ? !!existing.enabled : isDefault,
          expiresAt: existing?.expiresAt ?? null,
          note: existing?.note ?? null,
          isDefault,
          hasRecord: !!existing,
        };
      });
    }),

  /**
   * 批量設定使用者的功能權限（主帳號專屬）
   * 傳入整個功能清單的開關狀態
   */
  setUserPermissions: protectedProcedure
    .input(z.object({
      userId: z.number(),
      permissions: z.array(z.object({
        feature: z.string(),
        enabled: z.boolean(),
        expiresAt: z.string().nullable().optional(), // ISO date string
        note: z.string().max(200).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user)) {
        throw new Error("僅主帳號可設定他人權限");
      }
      const db = (await getDb())!;
      
      // 批量 upsert：使用 INSERT ... ON DUPLICATE KEY UPDATE
      for (const perm of input.permissions) {
        const expiresAt = perm.expiresAt ? new Date(perm.expiresAt) : null;
        
        // 先嘗試查詢是否已存在
        const existing = await db.select()
          .from(userPermissions)
          .where(and(
            eq(userPermissions.userId, input.userId),
            eq(userPermissions.feature, perm.feature)
          ))
          .limit(1);
        
        if (existing.length > 0) {
          await db.update(userPermissions)
            .set({
              enabled: perm.enabled ? 1 : 0,
              expiresAt: expiresAt,
              note: perm.note ?? null,
              grantedBy: ctx.user.id,
            })
            .where(and(
              eq(userPermissions.userId, input.userId),
              eq(userPermissions.feature, perm.feature)
            ));
        } else {
          await db.insert(userPermissions).values({
            userId: input.userId,
            feature: perm.feature,
            enabled: perm.enabled ? 1 : 0,
            expiresAt: expiresAt,
            note: perm.note ?? null,
            grantedBy: ctx.user.id,
          });
        }
      }
      
      return { success: true };
    }),

  /**
   * 快速設定單一功能的開關（主帳號專屬）
   */
  toggleFeature: protectedProcedure
    .input(z.object({
      userId: z.number(),
      feature: z.string(),
      enabled: z.boolean(),
      expiresAt: z.string().nullable().optional(),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user)) {
        throw new Error("僅主帳號可設定他人權限");
      }
      const db = (await getDb())!;
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      
      const existing = await db.select()
        .from(userPermissions)
        .where(and(
          eq(userPermissions.userId, input.userId),
          eq(userPermissions.feature, input.feature)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await db.update(userPermissions)
          .set({
            enabled: input.enabled ? 1 : 0,
            expiresAt,
            note: input.note ?? existing[0].note,
            grantedBy: ctx.user.id,
          })
          .where(and(
            eq(userPermissions.userId, input.userId),
            eq(userPermissions.feature, input.feature)
          ));
      } else {
        await db.insert(userPermissions).values({
          userId: input.userId,
          feature: input.feature,
          enabled: input.enabled ? 1 : 0,
          expiresAt,
          note: input.note ?? null,
          grantedBy: ctx.user.id,
        });
      }
      
      return { success: true };
    }),

  /**
   * 套用預設方案（主帳號專屬）
   * preset: "basic" = warroom + profile
   *         "full"  = 全部功能
   *         "none"  = 全部關閉
   */
  applyPreset: protectedProcedure
    .input(z.object({
      userId: z.number(),
      preset: z.enum(["basic", "full", "none"]),
      expiresAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!isAdmin(ctx.user)) {
        throw new Error("僅主帳號可設定他人權限");
      }
      const db = (await getDb())!;
      
      let enabledFeatures: string[] = [];
      if (input.preset === "basic") enabledFeatures = ["warroom", "profile"];
      else if (input.preset === "full") enabledFeatures = ALL_FEATURES.map(f => f.id);
      else enabledFeatures = [];
      
      const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
      
      // 刪除舊記錄，重新插入
      await db.delete(userPermissions)
        .where(eq(userPermissions.userId, input.userId));
      
      if (enabledFeatures.length > 0) {
        await db.insert(userPermissions).values(
          ALL_FEATURES.map(f => ({
            userId: input.userId,
            feature: f.id,
            enabled: enabledFeatures.includes(f.id) ? 1 : 0,
            expiresAt,
            note: `套用「${input.preset === 'basic' ? '基礎' : input.preset === 'full' ? '完整' : '無'}」方案`,
            grantedBy: ctx.user.id,
          }))
        );
      }
      
      return { success: true };
    }),
});
