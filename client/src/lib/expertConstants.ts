/**
 * 天命聯盟專家後台 - 共用常數
 * 統一所有頁面的狀態顏色、標籤、以及骨架屏組件
 */

// ── 訂單狀態 ──────────────────────────────────────────────────────────────────

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending_payment: "待付款",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
};

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const BOOKING_STATUS_DOT: Record<string, string> = {
  pending_payment: "bg-amber-400",
  confirmed: "bg-blue-400",
  completed: "bg-emerald-400",
  cancelled: "bg-red-400",
};

// ── 專家狀態 ──────────────────────────────────────────────────────────────────

export const EXPERT_STATUS_LABEL: Record<string, string> = {
  active: "已上線",
  inactive: "已下線",
  pending_review: "待審核",
};

export const EXPERT_STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  pending_review: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

// ── 行事曆活動類型 ──────────────────────────────────────────────────────────────

export const EVENT_TYPE_LABEL: Record<string, string> = {
  offline: "線下活動",
  online: "線上活動",
  announcement: "公告",
};

export const EVENT_TYPE_COLOR: Record<string, string> = {
  offline: "bg-purple-500/20 text-purple-400",
  online: "bg-cyan-500/20 text-cyan-400",
  announcement: "bg-amber-500/20 text-amber-400",
};

// ── 服務類型 ──────────────────────────────────────────────────────────────────

export const SERVICE_TYPE_LABEL: Record<string, string> = {
  online: "線上",
  offline: "線下",
};

// ── 通用格式化 ──────────────────────────────────────────────────────────────────

/** 格式化金額為 NT$ 格式 */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "免費";
  if (price === 0) return "免費";
  return `NT$ ${price.toLocaleString()}`;
}

/** 格式化時間為台灣時區的日期時間字串 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 格式化時間為台灣時區的日期字串 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 格式化時間為 HH:MM */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
