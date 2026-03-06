/**
 * dailyCache.ts
 * 伺服器端記憶體快取 - 用於 dailyReport 的當日快取
 * 同一用戶同一天的計算結果只計算一次，重整頁面直接回傳快取
 * 快取在台灣時間午夜自動失效（每天重置）
 */

interface CacheEntry<T> {
  data: T;
  dateKey: string; // "YYYY-MM-DD" 台灣時間
  userId: string;
  cachedAt: number; // Unix ms
}

class DailyCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    // 每小時清理過期快取
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  private getTaiwanDateKey(): string {
    const now = new Date();
    const twNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return twNow.toISOString().split('T')[0];
  }

  private makeKey(userId: string, dateKey: string): string {
    return `${userId}::${dateKey}`;
  }

  get(userId: string, dateKey?: string): T | null {
    const key = this.makeKey(userId, dateKey ?? this.getTaiwanDateKey());
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 驗證快取日期是否仍有效（防止跨日快取）
    const currentDateKey = this.getTaiwanDateKey();
    if (entry.dateKey !== (dateKey ?? currentDateKey)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(userId: string, data: T, dateKey?: string): void {
    const resolvedDateKey = dateKey ?? this.getTaiwanDateKey();
    const key = this.makeKey(userId, resolvedDateKey);

    // 防止快取過多（LRU 簡化版：超過上限時清理最舊的）
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      dateKey: resolvedDateKey,
      userId,
      cachedAt: Date.now(),
    });
  }

  invalidate(userId: string, dateKey?: string): void {
    const key = this.makeKey(userId, dateKey ?? this.getTaiwanDateKey());
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const currentDateKey = this.getTaiwanDateKey();
    const toDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      // 刪除非今日的快取
      if (entry.dateKey !== currentDateKey) {
        toDelete.push(key);
      }
    });
    toDelete.forEach(key => this.cache.delete(key));
  }

  get size(): number {
    return this.cache.size;
  }
}

// 全域單例：dailyReport 快取
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const dailyReportCache = new DailyCache<any>(500);
