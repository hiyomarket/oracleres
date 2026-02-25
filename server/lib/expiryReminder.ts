/**
 * expiryReminder.ts
 * 每日 09:00 台灣時間，檢查 7 天內到期的訂閱用戶並通知 Owner
 */
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { and, gte, lte, isNotNull } from "drizzle-orm";

export async function checkExpiringSubscriptions(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[ExpiryReminder] DB not available");
    return;
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 查詢 7 天內到期的用戶（planExpiresAt 在 now ~ now+7d 之間）
  const expiringUsers = await db
    .select({
      id: users.id,
      name: users.name,
      planId: users.planId,
      planExpiresAt: users.planExpiresAt,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.planExpiresAt),
        gte(users.planExpiresAt, now),
        lte(users.planExpiresAt, in7Days)
      )
    );

  if (expiringUsers.length === 0) {
    console.log("[ExpiryReminder] 今日無即將到期用戶");
    return;
  }

  const lines = expiringUsers.map(u => {
    const expiresAt = u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString("zh-TW") : "未知";
    const daysLeft = u.planExpiresAt
      ? Math.ceil((new Date(u.planExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return `• ${u.name ?? `用戶#${u.id}`}（${u.planId ?? "無方案"}）到期：${expiresAt}（剩 ${daysLeft} 天）`;
  });

  const title = `⏰ 訂閱到期提醒：${expiringUsers.length} 位用戶即將到期`;
  const content = `以下用戶的訂閱將在 7 天內到期，請及時聯繫續約：\n\n${lines.join("\n")}`;

  const success = await notifyOwner({ title, content });
  if (success) {
    console.log(`[ExpiryReminder] 已通知 Owner，${expiringUsers.length} 位即將到期用戶`);
  } else {
    console.error("[ExpiryReminder] notifyOwner 失敗");
  }
}
