/**
 * questEngine.ts
 * 每日穿搭任務生成與判定邏輯
 * PROPOSAL-20260323-GAME-每日穿搭任務
 *
 * 任務邏輯：
 * 1. 呼叫 getFullDateInfo 取得今日天干地支
 * 2. 呼叫 calculateEnvironmentElements 計算今日環境五行
 * 3. 找出最弱的五行 → 生成「補充該五行」的穿搭挑戰
 * 4. 判定用戶裝備的五行是否達標（至少 N 件對應五行）
 */

import { calculateEnvironmentElements } from "../lib/wuxingEngine";
import { getFullDateInfo } from "../lib/lunarCalendar";

// ─── 五行中英對照 ─────────────────────────────────────────────
const ZH_TO_EN: Record<string, string> = {
  木: "wood", 火: "fire", 土: "earth", 金: "metal", 水: "water",
};
const EN_TO_ZH: Record<string, string> = {
  wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
};

// ─── 五行配色（TASK-004 重點配色） ───────────────────────────
export const WUXING_HEX: Record<string, string> = {
  wood: "#2E8B57", fire: "#DC143C", earth: "#CD853F", metal: "#C9A227", water: "#00CED1",
};

// ─── 任務獎勵設定 ─────────────────────────────────────────────
export const QUEST_REWARD = {
  auraBonus: 20,   // 額外 Aura Score 加成
  stones: 50,      // 靈石獎勵
  minItems: 2,     // 最少需要幾件對應五行服裝
};

// ─── 任務描述模板 ─────────────────────────────────────────────
const QUEST_TEMPLATES: Record<string, { title: string; desc: string; tip: string }> = {
  wood: {
    title: "木氣不足，以木補之",
    desc: "今日木氣偏弱，請穿戴至少 2 件【木屬性】服裝，以青木之力補充生機。",
    tip: "木屬性服裝通常為綠色系，象徵生長與活力。",
  },
  fire: {
    title: "火氣不足，以火補之",
    desc: "今日火氣偏弱，請穿戴至少 2 件【火屬性】服裝，以赤火之力補充熱情。",
    tip: "火屬性服裝通常為紅色系，象徵熱情與行動力。",
  },
  earth: {
    title: "土氣不足，以土補之",
    desc: "今日土氣偏弱，請穿戴至少 2 件【土屬性】服裝，以黃土之力補充穩定。",
    tip: "土屬性服裝通常為黃褐色系，象徵穩重與包容。",
  },
  metal: {
    title: "金氣不足，以金補之",
    desc: "今日金氣偏弱，請穿戴至少 2 件【金屬性】服裝，以白金之力補充決斷。",
    tip: "金屬性服裝通常為金白色系，象徵清晰與決斷力。",
  },
  water: {
    title: "水氣不足，以水補之",
    desc: "今日水氣偏弱，請穿戴至少 2 件【水屬性】服裝，以玄水之力補充智慧。",
    tip: "水屬性服裝通常為藍黑色系，象徵智慧與流動。",
  },
};

// ─── 介面定義 ─────────────────────────────────────────────────
export interface DailyQuest {
  /** 任務目標五行（英文） */
  targetWuxing: string;
  /** 任務目標五行（中文） */
  targetWuxingZh: string;
  /** 任務標題 */
  title: string;
  /** 任務描述 */
  desc: string;
  /** 穿搭小提示 */
  tip: string;
  /** 今日環境五行比例（0-1） */
  envRatios: Record<string, number>;
  /** 五行顏色 HEX */
  color: string;
  /** 最少需要件數 */
  minItems: number;
  /** 獎勵 */
  reward: { auraBonus: number; stones: number };
}

/**
 * 生成今日穿搭任務
 * 找出今日環境五行中最弱的一行，要求用戶補充
 */
export function generateDailyQuest(date?: Date): DailyQuest {
  const info = getFullDateInfo(date);
  const { yearPillar, monthPillar, dayPillar } = info;

  // 計算今日環境五行比例
  const envRatioZh = calculateEnvironmentElements(
    yearPillar.stem, yearPillar.branch,
    monthPillar.stem, monthPillar.branch,
    dayPillar.stem, dayPillar.branch,
  );

  // 轉換為英文 key
  const envRatios: Record<string, number> = {
    wood:  envRatioZh["木"] ?? 0,
    fire:  envRatioZh["火"] ?? 0,
    earth: envRatioZh["土"] ?? 0,
    metal: envRatioZh["金"] ?? 0,
    water: envRatioZh["水"] ?? 0,
  };

  // 找出最弱的五行（比例最低）
  const weakest = Object.entries(envRatios).reduce(
    (min, [k, v]) => (v < min.v ? { k, v } : min),
    { k: "water", v: Infinity }
  ).k;

  const template = QUEST_TEMPLATES[weakest] ?? QUEST_TEMPLATES.water;

  return {
    targetWuxing: weakest,
    targetWuxingZh: EN_TO_ZH[weakest] ?? "水",
    title: template.title,
    desc: template.desc,
    tip: template.tip,
    envRatios,
    color: WUXING_HEX[weakest] ?? "#00CED1",
    minItems: QUEST_REWARD.minItems,
    reward: {
      auraBonus: QUEST_REWARD.auraBonus,
      stones: QUEST_REWARD.stones,
    },
  };
}

/**
 * 判定用戶是否完成今日穿搭任務
 * @param equippedWuxing 用戶當前裝備的五行屬性陣列
 * @param targetWuxing 任務目標五行
 * @param minItems 最少需要件數
 */
export function checkQuestCompletion(
  equippedWuxing: string[],
  targetWuxing: string,
  minItems: number = QUEST_REWARD.minItems
): boolean {
  const count = equippedWuxing.filter((w) => w === targetWuxing).length;
  return count >= minItems;
}
