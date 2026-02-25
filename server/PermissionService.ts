/**
 * PermissionService - 統一權限檢查服務（鳳凰計畫核心）
 * 
 * 所有 API 進行權限檢查時唯一需要調用的服務
 * 基於新的 user_subscriptions + modules + plan_modules 體系動態計算
 */
import { getDb } from "./db";
import { modules, planModules, userSubscriptions, campaigns, type Module, type PlanModule } from "../drizzle/schema";
import { eq, and, lte, gte } from "drizzle-orm";

export interface AccessResult {
  hasAccess: boolean;
  reason?: string; // 'plan' | 'custom_module' | 'campaign' | 'no_subscription' | 'expired' | 'not_included'
}

/**
 * 核心函數：檢查用戶是否有權限使用某個功能
 * 
 * @param userId - 用戶 ID
 * @param featureId - 舊的 feature ID（如 'lottery', 'oracle', 'profile'）
 * @returns AccessResult
 */
export async function hasAccess(userId: number, featureId: string): Promise<AccessResult> {
  const now = new Date();
  const db = await getDb();
  if (!db) return { hasAccess: false, reason: "db_unavailable" };

  // 1. 查詢包含此 featureId 的所有模塊 ID
  const allModules = await db.select().from(modules).where(eq(modules.isActive, 1));
  const matchingModuleIds = allModules
    .filter((m: Module) => {
      const features = m.containedFeatures as string[];
      return features.includes(featureId);
    })
    .map((m: Module) => m.id);

  if (matchingModuleIds.length === 0) {
    // 此功能未被任何模塊管理，預設允許（向後相容）
    return { hasAccess: true, reason: "unmanaged" };
  }

  // 2. 查詢用戶訂閱記錄
  const [subscription] = await (db as NonNullable<typeof db>)
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId));

  if (!subscription) {
    // 無訂閱記錄，檢查是否有行銷活動贈送
    return await checkCampaignAccess(userId, matchingModuleIds, now, db);
  }

  // 3. 檢查主方案是否包含所需模塊
  if (subscription.planId) {
    const planExpired = subscription.planExpiresAt && subscription.planExpiresAt < now;
    if (!planExpired) {
      // 查詢此方案包含的模塊
      const planModuleLinks = await (db as NonNullable<typeof db>)
        .select()
        .from(planModules)
        .where(eq(planModules.planId, subscription.planId));
      
      const planModuleIds = planModuleLinks.map((pm: PlanModule) => pm.moduleId);
      const hasMatchInPlan = matchingModuleIds.some((mid: string) => planModuleIds.includes(mid));
      
      if (hasMatchInPlan) {
        return { hasAccess: true, reason: "plan" };
      }
    }
  }

  // 4. 檢查自訂模塊（custom_modules）
  if (subscription.customModules) {
    const customModules = subscription.customModules as Array<{ module_id: string; expires_at: string | null }>;
    for (const cm of customModules) {
      if (matchingModuleIds.includes(cm.module_id)) {
        if (!cm.expires_at || new Date(cm.expires_at) >= now) {
          return { hasAccess: true, reason: "custom_module" };
        }
      }
    }
  }

  // 5. 檢查行銷活動贈送
  return await checkCampaignAccess(userId, matchingModuleIds, now, db);
}

/**
 * 檢查是否有有效的行銷活動贈送此模塊給此用戶
 */
async function checkCampaignAccess(
  userId: number,
  moduleIds: string[],
  now: Date,
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<AccessResult> {
  const activeCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.isActive, 1),
        lte(campaigns.startDate, now),
        gte(campaigns.endDate, now)
      )
    );

  for (const campaign of activeCampaigns) {
    if (campaign.ruleType !== "giveaway") continue;
    
    const ruleValue = campaign.ruleValue as Record<string, unknown>;
    const giveawayModuleId = ruleValue.giveaway_module_id as string;
    
    if (giveawayModuleId && moduleIds.includes(giveawayModuleId)) {
      // 檢查目標是否包含此用戶
      const ruleTarget = campaign.ruleTarget as { target_type: string; target_id?: string };
      if (ruleTarget.target_type === "all_users") {
        return { hasAccess: true, reason: "campaign" };
      }
      // 可擴展：target_type === 'plan' 時檢查用戶方案
    }
  }

  return { hasAccess: false, reason: "not_included" };
}
