/**
 * 流年流月分析引擎 v1.0
 * 基於蘇祐震命格（甲木日主，官祿宮大限 45-54歲）
 * 計算 2026-2030 年逐年逐月的命理分析
 *
 * 紫微斗數四化規則（依流年天干）：
 * 甲年：廉貞化祿、破軍化權、武曲化科、太陽化忌
 * 乙年：天機化祿、天梁化權、紫微化科、太陰化忌
 * 丙年：天同化祿、天機化權、文昌化科、廉貞化忌
 * 丁年：太陰化祿、天同化權、天機化科、巨門化忌
 * 戊年：貪狼化祿、太陰化權、右弼化科、天機化忌
 * 己年：武曲化祿、貪狼化權、天梁化科、文曲化忌
 * 庚年：太陽化祿、武曲化權、太陰化科、天同化忌
 * 辛年：巨門化祿、太陽化權、文曲化科、文昌化忌
 * 壬年：天梁化祿、紫微化權、左輔化科、武曲化忌
 * 癸年：破軍化祿、巨門化權、太陰化科、貪狼化忌
 */

import { BAZI, NUMEROLOGY } from "./userProfile.js";
import { HEAVENLY_STEMS } from "./lunarCalendar.js";

// ─── 四化對應表 ──────────────────────────────────────────────────
const FOUR_TRANSFORMATIONS: Record<string, {
  hua_lu: string;   // 化祿
  hua_quan: string; // 化權
  hua_ke: string;   // 化科
  hua_ji: string;   // 化忌
}> = {
  甲: { hua_lu: "廉貞", hua_quan: "破軍", hua_ke: "武曲", hua_ji: "太陽" },
  乙: { hua_lu: "天機", hua_quan: "天梁", hua_ke: "紫微", hua_ji: "太陰" },
  丙: { hua_lu: "天同", hua_quan: "天機", hua_ke: "文昌", hua_ji: "廉貞" },
  丁: { hua_lu: "太陰", hua_quan: "天同", hua_ke: "天機", hua_ji: "巨門" },
  戊: { hua_lu: "貪狼", hua_quan: "太陰", hua_ke: "右弼", hua_ji: "天機" },
  己: { hua_lu: "武曲", hua_quan: "貪狼", hua_ke: "天梁", hua_ji: "文曲" },
  庚: { hua_lu: "太陽", hua_quan: "武曲", hua_ke: "太陰", hua_ji: "天同" },
  辛: { hua_lu: "巨門", hua_quan: "太陽", hua_ke: "文曲", hua_ji: "文昌" },
  壬: { hua_lu: "天梁", hua_quan: "紫微", hua_ke: "左輔", hua_ji: "武曲" },
  癸: { hua_lu: "破軍", hua_quan: "巨門", hua_ke: "太陰", hua_ji: "貪狼" },
};

// ─── 蘇先生本命盤各宮位主星 ──────────────────────────────────────
// 用於判斷四化落入哪個宮位
const PALACE_STARS: Record<string, string[]> = {
  命宮: ["巨門", "地空"],
  父母宮: ["天相", "天鉞", "火星"],
  福德宮: ["天同", "天梁"],
  田宅宮: ["武曲", "七殺", "文曲"],
  官祿宮: ["太陽"],
  僕役宮: ["廉貞", "貪狼"],
  遷移宮: ["天機"],
  疾厄宮: ["紫微", "破軍", "左輔", "右弼", "天魁", "陀羅"],
  財帛宮: ["祿存", "天同", "天梁"],
  子女宮: ["天府", "擎羊", "鈴星"],
  夫妻宮: ["太陰", "地劫"],
  兄弟宮: ["廉貞", "貪狼", "文昌", "天馬"],
};

// 根據星曜名稱找到所在宮位
function findPalaceBystar(star: string): string {
  for (const [palace, stars] of Object.entries(PALACE_STARS)) {
    if (stars.some(s => s.includes(star))) {
      return palace;
    }
  }
  return "未知宮";
}

// ─── 宮位對蘇先生的吉凶判斷 ──────────────────────────────────────
const PALACE_FORTUNE: Record<string, { level: "大吉" | "吉" | "平" | "凶" | "大凶"; desc: string }> = {
  命宮: { level: "吉", desc: "自我能量提升，個人魅力增強" },
  父母宮: { level: "平", desc: "長輩關係，文書事務" },
  福德宮: { level: "大吉", desc: "精神愉悅，享受生活，偏財運旺" },
  田宅宮: { level: "吉", desc: "不動產、家庭事務有進展" },
  官祿宮: { level: "凶", desc: "事業壓力大，太陽雙忌宮位，需謹慎" },
  僕役宮: { level: "平", desc: "人際關係、合作夥伴" },
  遷移宮: { level: "大吉", desc: "外出、移動、貴人相助，天機化祿旺" },
  疾厄宮: { level: "平", desc: "健康、身體能量" },
  財帛宮: { level: "大吉", desc: "財運旺盛，祿存守財帛，進財有望" },
  子女宮: { level: "平", desc: "創意、子女、投資" },
  夫妻宮: { level: "吉", desc: "感情、伴侶關係有進展" },
  兄弟宮: { level: "大吉", desc: "廉貞化祿在兄弟宮，人脈財源大開" },
};

// ─── 塔羅流年計算 ──────────────────────────────────────────────
// 中間個性：10（命運之輪）
// 流年 = 中間個性(10) + 年份數字相加
function calcTarotYear(year: number): { number: number; name: string; element: string; theme: string } {
  const yearSum = String(year).split("").reduce((a, b) => a + parseInt(b), 0);
  let total = NUMEROLOGY.middle.number + yearSum;
  // 歸約到 1-22（22保留）
  while (total > 22) {
    total = String(total).split("").reduce((a, b) => a + parseInt(b), 0);
  }
  const TAROT_CARDS: Record<number, { name: string; element: string; theme: string }> = {
    1:  { name: "魔術師", element: "風", theme: "意志力、創造、主動出擊" },
    2:  { name: "女祭司", element: "水", theme: "直覺、隱藏資訊、等待時機" },
    3:  { name: "女皇", element: "土", theme: "豐盛、創造力、財富增長" },
    4:  { name: "皇帝", element: "火", theme: "穩定、掌控、建立秩序" },
    5:  { name: "教皇", element: "土", theme: "傳承、智慧、尋求指引" },
    6:  { name: "戀人", element: "風", theme: "選擇、關係、價值觀" },
    7:  { name: "戰車", element: "水", theme: "前進、意志力、克服障礙" },
    8:  { name: "力量", element: "火", theme: "內在力量、勇氣、耐心" },
    9:  { name: "隱者", element: "土", theme: "反思、內省、尋找真相" },
    10: { name: "命運之輪", element: "火", theme: "轉機、機遇、命運轉折" },
    11: { name: "正義", element: "風", theme: "公平、因果、決策" },
    12: { name: "倒吊人", element: "水", theme: "等待、犧牲、換個角度" },
    13: { name: "死神", element: "水", theme: "轉化、結束、新生" },
    14: { name: "節制", element: "火", theme: "平衡、耐心、調和" },
    15: { name: "惡魔", element: "土", theme: "束縛、誘惑、面對陰影" },
    16: { name: "塔", element: "火", theme: "突破、震盪、清除舊有" },
    17: { name: "星星", element: "風", theme: "希望、靈感、療癒" },
    18: { name: "月亮", element: "水", theme: "直覺、幻象、潛意識" },
    19: { name: "太陽", element: "火", theme: "成功、活力、光明" },
    20: { name: "審判", element: "火", theme: "覺醒、召喚、重生" },
    21: { name: "世界", element: "土", theme: "完成、整合、圓滿" },
    22: { name: "愚者", element: "風", theme: "新開始、冒險、無限可能" },
  };
  const card = TAROT_CARDS[total] ?? { name: "命運之輪", element: "火", theme: "轉機" };
  return { number: total, ...card };
}

// ─── 流月天干計算 ──────────────────────────────────────────────
// 流月天干依流年天干起算（寅月起）
// 甲己年：寅月起甲，乙庚年：寅月起丙，丙辛年：寅月起戊，丁壬年：寅月起庚，戊癸年：寅月起壬
function getMonthStemStart(yearStem: string): number {
  const map: Record<string, number> = {
    甲: 0, 己: 0,   // 甲寅月
    乙: 2, 庚: 2,   // 丙寅月
    丙: 4, 辛: 4,   // 戊寅月
    丁: 6, 壬: 6,   // 庚寅月
    戊: 8, 癸: 8,   // 壬寅月
  };
  return map[yearStem] ?? 0;
}

// 農曆月份對應（寅=1月, 卯=2月...）
const LUNAR_MONTH_BRANCHES = ["寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥", "子", "丑"];
const MONTH_NAMES = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"];

// ─── 五行對蘇先生的月份評分 ──────────────────────────────────────
const STEM_ELEMENT_MAP: Record<string, string> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};
const BRANCH_ELEMENT_MAP: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木",
  辰: "土", 巳: "火", 午: "火", 未: "土",
  申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const ELEMENT_SCORE: Record<string, number> = {
  火: 3, 土: 2, 金: 1, 木: -1, 水: -2,
};

function calcMonthScore(stem: string, branch: string): number {
  const stemEl = STEM_ELEMENT_MAP[stem] ?? "木";
  const branchEl = BRANCH_ELEMENT_MAP[branch] ?? "木";
  return 5 + (ELEMENT_SCORE[stemEl] ?? 0) + (ELEMENT_SCORE[branchEl] ?? 0);
}

function getMonthLevel(score: number): "大吉" | "吉" | "平" | "凶" {
  if (score >= 9) return "大吉";
  if (score >= 7) return "吉";
  if (score >= 5) return "平";
  return "凶";
}

// ─── 主要分析函數 ──────────────────────────────────────────────

export interface MonthAnalysis {
  lunarMonth: string;   // 正月、二月...
  stem: string;         // 天干
  branch: string;       // 地支
  pillar: string;       // 干支
  element: string;      // 主五行
  score: number;        // 1-10 分
  level: "大吉" | "吉" | "平" | "凶";
  focus: string;        // 本月重點
  action: string;       // 建議行動
}

export interface YearAnalysis {
  year: number;
  stem: string;         // 流年天干
  branch: string;       // 流年地支
  pillar: string;       // 流年干支
  tarot: {
    number: number;
    name: string;
    element: string;
    theme: string;
  };
  fourTransformations: {
    hua_lu: { star: string; palace: string; meaning: string };
    hua_quan: { star: string; palace: string; meaning: string };
    hua_ke: { star: string; palace: string; meaning: string };
    hua_ji: { star: string; palace: string; meaning: string };
  };
  overallScore: number;  // 1-10 分
  overallLevel: "大吉" | "吉" | "平" | "凶" | "大凶";
  yearTheme: string;     // 年度主題
  opportunities: string; // 機遇
  cautions: string;      // 注意事項
  months: MonthAnalysis[];
}

// 年份干支計算
function getYearStemBranch(year: number): { stem: string; branch: string } {
  const stemIdx = (year - 4) % 10;
  const branchIdx = (year - 4) % 12;
  return {
    stem: HEAVENLY_STEMS[stemIdx < 0 ? stemIdx + 10 : stemIdx],
    branch: ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][branchIdx < 0 ? branchIdx + 12 : branchIdx],
  };
}

// 月份重點描述
const MONTH_FOCUS: Record<string, string> = {
  大吉: "財運旺盛，積極出擊",
  吉: "穩步前進，把握機會",
  平: "維持現狀，謹慎行事",
  凶: "低調蓄力，避免衝突",
};
const MONTH_ACTION: Record<string, string> = {
  大吉: "主動拓展業務，投資理財，社交活動",
  吉: "推進重要計畫，建立人脈，學習提升",
  平: "整理資料，規劃未來，養精蓄銳",
  凶: "延後重大決策，注意健康，靜待時機",
};

// 年度評分（基於四化落宮）
function calcYearScore(fourTrans: YearAnalysis["fourTransformations"]): number {
  let score = 5;
  const luPalace = fourTrans.hua_lu.palace;
  const jiPalace = fourTrans.hua_ji.palace;
  // 化祿落入好宮位加分
  if (["財帛宮", "兄弟宮", "遷移宮", "福德宮"].includes(luPalace)) score += 2;
  else if (["命宮", "夫妻宮", "田宅宮"].includes(luPalace)) score += 1;
  // 化忌落入壞宮位減分
  if (["官祿宮", "疾厄宮"].includes(jiPalace)) score -= 2;
  else if (["命宮", "財帛宮"].includes(jiPalace)) score -= 1;
  return Math.max(1, Math.min(10, score));
}

function getYearLevel(score: number): "大吉" | "吉" | "平" | "凶" | "大凶" {
  if (score >= 9) return "大吉";
  if (score >= 7) return "吉";
  if (score >= 5) return "平";
  if (score >= 3) return "凶";
  return "大凶";
}

// 年度主題生成
function buildYearTheme(
  year: number,
  stem: string,
  tarot: { name: string; theme: string },
  fourTrans: YearAnalysis["fourTransformations"],
  score: number
): { theme: string; opportunities: string; cautions: string } {
  const luPalace = fourTrans.hua_lu.palace;
  const jiPalace = fourTrans.hua_ji.palace;
  const luStar = fourTrans.hua_lu.star;
  const jiStar = fourTrans.hua_ji.star;

  const themes: Record<string, string> = {
    財帛宮: "財富豐收年",
    兄弟宮: "人脈爆發年",
    遷移宮: "貴人相助年",
    福德宮: "享受豐盛年",
    命宮: "自我突破年",
    官祿宮: "事業轉型年",
    夫妻宮: "感情深化年",
    田宅宮: "置產安家年",
    僕役宮: "合作拓展年",
    疾厄宮: "健康修復年",
    子女宮: "創意爆發年",
    父母宮: "學習成長年",
  };

  const theme = `${themes[luPalace] ?? "命運轉折年"} × ${tarot.name}年`;

  const opps: string[] = [];
  if (luPalace === "財帛宮") opps.push("正財偏財雙旺，投資理財有望");
  if (luPalace === "兄弟宮") opps.push("廉貞化祿人脈大開，業務合作機會多");
  if (luPalace === "遷移宮") opps.push("外出、出差、海外機會大增");
  if (luPalace === "福德宮") opps.push("精神愉悅，偏財運旺，享受生活");
  if (luPalace === "命宮") opps.push("個人魅力提升，自我品牌大放光彩");
  if (score >= 7) opps.push(`${tarot.theme}，整體運勢向好`);
  if (opps.length === 0) opps.push(`${luStar}化祿入${luPalace}，${PALACE_FORTUNE[luPalace]?.desc ?? "有所進展"}`);

  const cauts: string[] = [];
  if (jiPalace === "官祿宮") cauts.push("太陽雙忌宮位再逢化忌，事業壓力倍增，避免衝突");
  if (jiPalace === "財帛宮") cauts.push("財帛宮化忌，注意漏財、投資失利");
  if (jiPalace === "命宮") cauts.push("命宮化忌，注意自我狀態，避免衝動決策");
  if (jiPalace === "疾厄宮") cauts.push("疾厄宮化忌，注意健康，定期檢查");
  if (score <= 4) cauts.push("整體運勢偏弱，宜低調蓄力，延後重大決策");
  if (cauts.length === 0) cauts.push(`${jiStar}化忌入${jiPalace}，${PALACE_FORTUNE[jiPalace]?.desc ?? "需留意"}`);

  return {
    theme,
    opportunities: opps.join("；"),
    cautions: cauts.join("；"),
  };
}

// ─── 主要 export 函數 ──────────────────────────────────────────

/**
 * 計算指定年份的完整流年流月分析
 */
export function getYearlyAnalysis(year: number): YearAnalysis {
  const { stem, branch } = getYearStemBranch(year);
  const tarot = calcTarotYear(year);
  const trans = FOUR_TRANSFORMATIONS[stem];

  // 四化落宮
  const fourTrans: YearAnalysis["fourTransformations"] = {
    hua_lu: {
      star: trans.hua_lu,
      palace: findPalaceBystar(trans.hua_lu),
      meaning: `${trans.hua_lu}化祿：${PALACE_FORTUNE[findPalaceBystar(trans.hua_lu)]?.desc ?? "有所進展"}`,
    },
    hua_quan: {
      star: trans.hua_quan,
      palace: findPalaceBystar(trans.hua_quan),
      meaning: `${trans.hua_quan}化權：掌控力增強，${PALACE_FORTUNE[findPalaceBystar(trans.hua_quan)]?.desc ?? "有所進展"}`,
    },
    hua_ke: {
      star: trans.hua_ke,
      palace: findPalaceBystar(trans.hua_ke),
      meaning: `${trans.hua_ke}化科：聲名、文書有利，${PALACE_FORTUNE[findPalaceBystar(trans.hua_ke)]?.desc ?? "有所進展"}`,
    },
    hua_ji: {
      star: trans.hua_ji,
      palace: findPalaceBystar(trans.hua_ji),
      meaning: `${trans.hua_ji}化忌：${PALACE_FORTUNE[findPalaceBystar(trans.hua_ji)]?.desc ?? "需留意"}，需謹慎`,
    },
  };

  const overallScore = calcYearScore(fourTrans);
  const overallLevel = getYearLevel(overallScore);
  const { theme, opportunities, cautions } = buildYearTheme(year, stem, tarot, fourTrans, overallScore);

  // 流月計算（12個月）
  const monthStemStart = getMonthStemStart(stem);
  const months: MonthAnalysis[] = LUNAR_MONTH_BRANCHES.map((branch, idx) => {
    const stemIdx = (monthStemStart + idx) % 10;
    const mStem = HEAVENLY_STEMS[stemIdx];
    const mBranch = branch;
    const mElement = STEM_ELEMENT_MAP[mStem] ?? "木";
    const score = calcMonthScore(mStem, mBranch);
    const level = getMonthLevel(score);
    return {
      lunarMonth: MONTH_NAMES[idx],
      stem: mStem,
      branch: mBranch,
      pillar: `${mStem}${mBranch}`,
      element: mElement,
      score,
      level,
      focus: MONTH_FOCUS[level],
      action: MONTH_ACTION[level],
    };
  });

  return {
    year,
    stem,
    branch,
    pillar: `${stem}${branch}`,
    tarot,
    fourTransformations: fourTrans,
    overallScore,
    overallLevel,
    yearTheme: theme,
    opportunities,
    cautions,
    months,
  };
}

/**
 * 計算多年流年分析（例如 2026-2030）
 */
export function getMultiYearAnalysis(startYear: number, endYear: number): YearAnalysis[] {
  const results: YearAnalysis[] = [];
  for (let y = startYear; y <= endYear; y++) {
    results.push(getYearlyAnalysis(y));
  }
  return results;
}
