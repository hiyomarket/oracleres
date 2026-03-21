import { useAuth } from "@/_core/hooks/useAuth";

/**
 * 管理後台角色 hook
 * - isAdmin: 完整管理員（可讀寫）
 * - isViewer: 唯讀顧問（只能瀏覽，不能操作）
 * - isAdminOrViewer: 可進入後台（admin 或 viewer）
 * - readOnly: 是否為唯讀模式（viewer = true）
 */
export function useAdminRole() {
  const { user } = useAuth();
  const role = user?.role ?? "user";
  const isAdmin = role === "admin";
  const isViewer = role === "viewer";
  const isAdminOrViewer = isAdmin || isViewer;
  const readOnly = isViewer;

  return { isAdmin, isViewer, isAdminOrViewer, readOnly, role };
}
