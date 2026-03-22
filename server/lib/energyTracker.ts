/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         天命共振系統 V11.0 — 命格進化軌跡模塊                   ║
 * ║         Energy Tracker: 每日五行能量記錄與趨勢分析              ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 功能：
 * 1. logDailyEnergy()  — 記錄每日五行加權能量快照
 * 2. getEnergyTrend()  — 查詢指定週期的能量趨勢
 * 3. getEnergyInsight() — 分析趨勢並生成命理洞察
 */

import { getDb } from '../db';
import { dailyEnergyLogs, type DailyEnergyLog } from '../../drizzle/schema';
import { eq, gte, and, desc } from 'drizzle-orm';

// ─── 接口定義 ────────────────────────────────────────────────────
export interface DailyEnergySnapshot {
  userId: number;
  date: string;        // YYYY-MM-DD 格式
  wood: number;        // 木能量比例（0-100）
  fire: number;        // 火能量比例（0-100）
  earth: number;       // 土能量比例（0-100）
  metal: number;       // 金能量比例（0-100）
  water: number;       // 水能量比例（0-100）
  /** 當日主導五行 */
  dominantElement: string;
  /** 當日最弱五行 */
  weakestElement: string;
  /** 當日策略 */
  strategy?: string;
  /** 當日十神 */
  tenGod?: string;
}

export interface EnergyTrendPoint {
  date: string;
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
  dominantElement: string;
  strategy?: string;
}

export interface EnergyTrendResult {
  period: string;
  dataPoints: EnergyTrendPoint[];
  /** 週期內各五行平均值 */
  averages: Record<string, number>;
  /** 週期內最強五行 */
  strongestOverall: string;
  /** 週期內最弱五行 */
  weakestOverall: string;
  /** 命理趨勢洞察 */
  insight: string;
  /** 補運建議 */
  supplementAdvice: string;
}

// ─── 核心函數 ────────────────────────────────────────────────────

/**
 * 記錄每日五行能量快照到資料庫
 */
export async function logDailyEnergy(snapshot: DailyEnergySnapshot): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn('[EnergyTracker] Database not available, skipping energy log');
    return;
  }
  try {
    // 使用 upsert 邏輯：若當日已有記錄則更新
    const existing = await db.select()
      .from(dailyEnergyLogs)
      .where(and(
        eq(dailyEnergyLogs.userId, snapshot.userId),
        eq(dailyEnergyLogs.date, snapshot.date)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(dailyEnergyLogs)
        .set({
          wood: Math.round(snapshot.wood),
          fire: Math.round(snapshot.fire),
          earth: Math.round(snapshot.earth),
          metal: Math.round(snapshot.metal),
          water: Math.round(snapshot.water),
          dominantElement: snapshot.dominantElement,
          weakestElement: snapshot.weakestElement,
          strategy: snapshot.strategy ?? null,
          tenGod: snapshot.tenGod ?? null,
          updatedAt: Date.now(),
        })
        .where(and(
          eq(dailyEnergyLogs.userId, snapshot.userId),
          eq(dailyEnergyLogs.date, snapshot.date)
        ));
    } else {
      await db.insert(dailyEnergyLogs).values({
        userId: snapshot.userId,
        date: snapshot.date,
        wood: Math.round(snapshot.wood),
        fire: Math.round(snapshot.fire),
        earth: Math.round(snapshot.earth),
        metal: Math.round(snapshot.metal),
        water: Math.round(snapshot.water),
        dominantElement: snapshot.dominantElement,
        weakestElement: snapshot.weakestElement,
        strategy: snapshot.strategy ?? null,
        tenGod: snapshot.tenGod ?? null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('[EnergyTracker] logDailyEnergy error:', error);
    throw error;
  }
}

/**
 * 查詢指定週期的能量趨勢
 * @param userId 用戶 ID
 * @param period 週期（'7d' | '30d' | '90d'）
 */
export async function getEnergyTrend(
  userId: number,
  period: '7d' | '30d' | '90d' = '30d'
): Promise<EnergyTrendResult> {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);

  const db = await getDb();
  if (!db) {
    return {
      period, dataPoints: [], averages: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
      strongestOverall: '火', weakestOverall: '金',
      insight: '資料庫暫時無法連線，無法取得趨勢數據。',
      supplementAdvice: '請稍後再試。',
    };
  }
  const rows = await db.select()
    .from(dailyEnergyLogs)
    .where(and(
      eq(dailyEnergyLogs.userId, userId),
      gte(dailyEnergyLogs.date, cutoffStr)
    ))
    .orderBy(desc(dailyEnergyLogs.date));

  const dataPoints: EnergyTrendPoint[] = rows.map((r: DailyEnergyLog) => ({
    date: r.date,
    wood: r.wood,
    fire: r.fire,
    earth: r.earth,
    metal: r.metal,
    water: r.water,
    dominantElement: r.dominantElement,
    strategy: r.strategy ?? undefined,
  }));

  // 計算平均值
  const averages = calculateAverages(dataPoints);
  const strongestOverall = Object.entries(averages).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '火';
  const weakestOverall = Object.entries(averages).sort(([, a], [, b]) => a - b)[0]?.[0] ?? '金';

  const insight = generateTrendInsight(averages, strongestOverall, weakestOverall, period);
  const supplementAdvice = generateSupplementAdvice(averages, weakestOverall);

  return {
    period,
    dataPoints,
    averages,
    strongestOverall,
    weakestOverall,
    insight,
    supplementAdvice,
  };
}

// ─── 輔助函數 ────────────────────────────────────────────────────

function calculateAverages(dataPoints: EnergyTrendPoint[]): Record<string, number> {
  if (dataPoints.length === 0) {
    return { 木: 20, 火: 20, 土: 20, 金: 20, 水: 20 };
  }
  const sums = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of dataPoints) {
    sums.木 += p.wood;
    sums.火 += p.fire;
    sums.土 += p.earth;
    sums.金 += p.metal;
    sums.水 += p.water;
  }
  const n = dataPoints.length;
  return {
    木: Math.round(sums.木 / n),
    火: Math.round(sums.火 / n),
    土: Math.round(sums.土 / n),
    金: Math.round(sums.金 / n),
    水: Math.round(sums.水 / n),
  };
}

function generateTrendInsight(
  averages: Record<string, number>,
  strongest: string,
  weakest: string,
  period: string
): string {
  const periodLabel = period === '7d' ? '過去7天' : period === '30d' ? '過去30天' : '過去90天';
  const fireAvg = averages['火'] ?? 0;
  const waterAvg = averages['水'] ?? 0;

  let insight = `${periodLabel}的能量趨勢分析：`;

  if (fireAvg < 15) {
    insight += `火能量（才華/表達力）持續偏低（平均 ${fireAvg}%），這段時間可能感到創意受阻或表達不暢。`;
  } else if (fireAvg > 30) {
    insight += `火能量（才華/表達力）持續旺盛（平均 ${fireAvg}%），這是才華輸出的黃金時期。`;
  }

  if (waterAvg > 35) {
    insight += ` 水能量（印星/思慮）偏高（平均 ${waterAvg}%），思慮過多可能影響行動力，建議多補火土。`;
  }

  insight += ` 整體最強五行為「${strongest}」，最弱為「${weakest}」。`;
  return insight;
}

function generateSupplementAdvice(averages: Record<string, number>, weakest: string): string {
  const adviceMap: Record<string, string> = {
    '火': '建議在穿搭上多選用紅橙色系，飲食上增加辛辣暖性食物，並配戴石榴石或金太陽石手串補充火能量。',
    '土': '建議多穿土黃、棕色系服裝，飲食上增加根莖類食物（山藥、紅薯），配戴黃虎眼石或和田玉補充土能量。',
    '金': '建議多穿白色、銀色系服裝，飲食上增加白色食物（白蘿蔔、百合），配戴太赫茲或白硨磲補充金能量。',
    '木': '建議多穿綠色系服裝，飲食上增加綠葉蔬菜，配戴沉香木手串補充木能量。',
    '水': '建議多穿深藍、黑色系服裝，飲食上增加黑色食物（黑芝麻、黑豆），配戴天珠瑪瑙補充水能量。',
  };
  return adviceMap[weakest] ?? '保持均衡的五行能量，維持穩定的日常作息。';
}
