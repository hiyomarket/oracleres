/**
 * 專家後台 - 統一骨架屏組件
 * 提供多種載入狀態的骨架屏變體
 */

/** 通用卡片骨架 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-white/10" />
              <div className="h-3 w-2/3 rounded bg-white/10" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 統計卡片骨架（用於 Dashboard） */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
          <div className="h-3 w-16 rounded bg-white/10 mb-3" />
          <div className="h-8 w-24 rounded bg-white/10 mb-2" />
          <div className="h-2 w-20 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}

/** 表格骨架（用於訂單列表等） */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
      {/* 表頭 */}
      <div className="flex gap-4 p-4 border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-white/10" />
        ))}
      </div>
      {/* 表體 */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 flex-1 rounded bg-white/8" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** 個人資料骨架 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 頭像 + 封面 */}
      <div className="relative">
        <div className="h-48 w-full rounded-xl bg-white/10" />
        <div className="absolute -bottom-8 left-6 h-20 w-20 rounded-full bg-white/15 border-4 border-zinc-900" />
      </div>
      <div className="pt-10 space-y-4">
        <div className="h-6 w-48 rounded bg-white/10" />
        <div className="h-4 w-64 rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-white/10" />
              <div className="h-10 rounded-lg bg-white/8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** 行事曆骨架 */
export function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-white/10" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded bg-white/10" />
          <div className="h-8 w-8 rounded bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-white/10" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/5 border border-white/5" />
        ))}
      </div>
    </div>
  );
}

/** 服務列表骨架 */
export function ServicesSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 w-40 rounded bg-white/10" />
              <div className="h-3 w-full max-w-md rounded bg-white/8" />
              <div className="flex gap-4 mt-3">
                <div className="h-4 w-20 rounded bg-white/10" />
                <div className="h-4 w-24 rounded bg-white/10" />
                <div className="h-4 w-16 rounded bg-white/10" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-lg bg-white/10" />
              <div className="h-8 w-16 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 全頁載入骨架（帶標題） */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="space-y-6 animate-pulse">
      {title && (
        <div className="h-8 w-48 rounded bg-white/10" />
      )}
      <StatsSkeleton count={4} />
      <CardSkeleton count={4} />
    </div>
  );
}
