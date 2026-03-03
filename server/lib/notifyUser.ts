/**
 * notifyUser.ts
 * 通用用戶通知工具函數
 * 將通知寫入 user_notifications 資料表，供前端通知中心顯示
 */

import { getDb } from "../db";
import { userNotifications } from "../../drizzle/schema";

export type NotificationType =
  | "wbc_result"
  | "system"
  | "reward"
  | "announcement"
  | "daily_briefing"
  | "fortune_reminder"
  | "scratch_milestone";

export interface NotifyUserOptions {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  linkUrl?: string;
  relatedId?: string;
}

/**
 * 寫入用戶個人通知
 * @returns true 成功，false 失敗（靜默，不拋出錯誤）
 */
export async function notifyUser(options: NotifyUserOptions): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[notifyUser] Database not available, skipping notification");
      return false;
    }
    await db.insert(userNotifications).values({
      userId: options.userId,
      type: options.type,
      title: options.title,
      content: options.content,
      linkUrl: options.linkUrl ?? null,
      relatedId: options.relatedId ?? null,
    });
    return true;
  } catch (err) {
    console.error("[notifyUser] Failed to insert notification:", err);
    return false;
  }
}

/**
 * 批量寫入通知給多位用戶（同一訊息）
 */
export async function notifyUsers(
  userIds: string[],
  options: Omit<NotifyUserOptions, "userId">
): Promise<number> {
  if (userIds.length === 0) return 0;
  let successCount = 0;
  for (const userId of userIds) {
    const ok = await notifyUser({ ...options, userId });
    if (ok) successCount++;
  }
  return successCount;
}
