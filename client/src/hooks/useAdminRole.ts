import { useAuth } from "@/_core/hooks/useAuth";
import { getAiSession } from "@/pages/AiEntry";

/**
 * 管理後台角色 hook
 * - isAdmin: 完整管理員（可讀寫）
 * - isViewer: 唯讀顧問（只能瀏覽，不能操作）
 * - isAiMode: 透過 AI Token 進入的全站唯讀模式
 * - isAdminOrViewer: 可進入後台（admin 或 viewer 或 AI 模式）
 * - readOnly: 是否為唯讀模式（viewer 或 AI 模式 = true）
 */
export function useAdminRole() {
  const { user } = useAuth();
  const aiSession = getAiSession();
  const isAiMode = aiSession?.accessMode === "admin_view";

  const role = user?.role ?? "user";
  const isAdmin = role === "admin" && !isAiMode;
  const isViewer = role === "viewer" || isAiMode;
  const isAdminOrViewer = isAdmin || isViewer;
  const readOnly = isViewer || isAiMode;

  return { isAdmin, isViewer, isAdminOrViewer, readOnly, role, isAiMode };
}
