/**
 * AdminSkeleton.tsx
 * 統一的後台骨架屏載入元件
 * 提供多種預設佈局：表格、卡片、表單、統計面板
 */
import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
    />
  );
}

/** 表格骨架屏 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* 表頭 */}
      <div className="flex gap-4 px-4 py-3 border-b border-border/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Bone key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 卡片網格骨架屏 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </div>
          <Bone className="h-20 w-full" />
          <div className="flex gap-2">
            <Bone className="h-8 w-20" />
            <Bone className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 統計面板骨架屏 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 p-4 space-y-2">
          <Bone className="h-3 w-1/2" />
          <Bone className="h-8 w-3/4" />
          <Bone className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** 表單骨架屏 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-5 max-w-lg">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-10 w-full" />
        </div>
      ))}
      <Bone className="h-10 w-32 mt-4" />
    </div>
  );
}

/** 通用頁面骨架屏（含標題 + 統計 + 表格） */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-72" />
        </div>
        <Bone className="h-9 w-24" />
      </div>
      {/* 統計卡片 */}
      <StatsSkeleton count={4} />
      {/* 表格 */}
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}

/** 錯誤邊界 fallback UI */
export function AdminErrorFallback({
  error,
  onRetry,
}: {
  error: Error | string;
  onRetry?: () => void;
}) {
  const message = typeof error === "string" ? error : error.message;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold text-destructive mb-2">載入失敗</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          重新載入
        </button>
      )}
    </div>
  );
}

/** 空狀態 UI */
export function AdminEmptyState({
  icon = "📭",
  title = "尚無資料",
  description,
  action,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
