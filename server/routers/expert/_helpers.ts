/**
 * Expert Router - 共用輔助函數
 */
import { getDb } from "../../db";
import {
  experts,
} from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/** 確保當前用戶是專家，回傳 expert 記錄 */
export async function requireExpert(userId: number) {
  const db = (await getDb())!;
  const [expert] = await db.select().from(experts).where(eq(experts.userId, userId)).limit(1);
  if (!expert) {
    throw new TRPCError({ code: "FORBIDDEN", message: "您尚未成為認證專家" });
  }
  return expert;
}

/** 取得專家記錄，若無則回傳 null（不拋錯，用於 admin 初始化場景） */
export async function findExpert(userId: number) {
  const db = (await getDb())!;
  const [expert] = await db.select().from(experts).where(eq(experts.userId, userId)).limit(1);
  return expert ?? null;
}

/** 確保當前用戶是專家或管理員 */
export function requireExpertOrAdmin(role: string) {
  if (role !== "expert" && role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "此功能僅限認證專家使用" });
  }
}
