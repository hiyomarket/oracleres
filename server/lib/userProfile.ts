/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         天命共振系統 — 核心命格常數聲明文件                      ║
 * ║         USER PROFILE: 蘇祐震先生（Su, Yu-Chen）               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 本文件為系統唯一的命格數據源（Single Source of Truth）。
 * 所有後端引擎（十神、時辰、彩券、穿搭、手串、擲筊、彩券行）
 * 均必須從此文件 import 命格常數，嚴禁在各自文件中重複定義。
 *
 * 版本：B（最終確認版）
 * 確認日期：2026-02-21
 * 日主：甲木（非庚金）
 */

// ─── 基本生辰資料 ────────────────────────────────────────────────
export const USER_NAME = "蘇祐震";
export const USER_ID = "Su, Yu-Chen";

/** 出生年月日時（台灣時間，UTC+8） */
export const BIRTH_DATE = {
  year: 1984,
  month: 11,
  day: 26,
  hour: 10,
  minute: 9,
  /** 農曆：甲子年 閏十月 初四日 */
  lunar: "甲子年 閏十月 初四日",
  /** 出生地：台灣 花蓮縣 玉里鎮 */
  place: "台灣 花蓮縣 玉里鎮",
};

// ─── 八字四柱 ────────────────────────────────────────────────────
/**
 * 四柱：甲子年 乙亥月 甲子日 己巳時
 * 日主天干：甲（陽木）
 * 日主地支：子（水）
 */
export const BAZI = {
  year:  { stem: "甲", branch: "子" },
  month: { stem: "乙", branch: "亥" },
  day:   { stem: "甲", branch: "子" },
  hour:  { stem: "己", branch: "巳" },
};

// ─── 日主核心設定（最關鍵常數）────────────────────────────────────
/** 日主天干：甲（陽木）—— 版本B，絕對正確，不可更改 */
export const DAY_MASTER_STEM = "甲";
/** 日主五行：木 */
export const DAY_MASTER_ELEMENT = "木";
/** 日主陰陽：陽 */
export const DAY_MASTER_YIN_YANG = "陽";

// ─── 命格格局 ────────────────────────────────────────────────────
/**
 * 核心格局：水木極旺，身強印旺
 * 本命八字水木五行合計約 75%+，火土極度匱乏
 * 核心矛盾：才華（食傷/火）被水木壓制，需補火土以釋放能量
 */
export const BAZI_STRUCTURE = "水木極旺，身強印旺";

// ─── 本命五行比例（30% 加權基礎）────────────────────────────────
/**
 * 本命五行比例（用於「環境五行70% + 本命五行30%」加權計算）
 * 水：40%，木：30%，土：12%，火：10%，金：8%
 */
export const INNATE_ELEMENT_RATIO: Record<string, number> = {
  水: 40,
  木: 30,
  土: 12,
  火: 10,
  金: 8,
};

// ─── 用神與忌神（補運核心）──────────────────────────────────────
/**
 * 終身補運優先級：
 * 1. 🔥 火（食傷）— 最喜，代表才華、快樂、行動力
 * 2. 🌍 土（財星）— 喜，代表財富、現實落地
 * 3. ⚪ 金（官殺）— 喜神，代表規則、決斷、防護
 * 4. 🌊 水（印星）— 忌，本命已極旺，不需再補
 * 5. 🌳 木（比劫）— 忌，本命已極旺，不需再補
 */
export const FAVORABLE_ELEMENTS = ["火", "土", "金"] as const;
export const UNFAVORABLE_ELEMENTS = ["水", "木"] as const;

/** 用神優先級（英文 key，供需要英文 key 的算法使用） */
export const FAVORABLE_ELEMENTS_EN = ["fire", "earth", "metal"] as const;
/** 忌神（英文 key） */
export const UNFAVORABLE_ELEMENTS_EN = ["water", "wood"] as const;

// ─── 五行能量權重（用於各算法加成計算）──────────────────────────
/**
 * 五行對蘇先生的能量加成係數
 * 用於彩券行共振評分、時辰評分等需要加權的場景
 */
export const ELEMENT_WEIGHTS_EN: Record<string, number> = {
  fire:  1.5,   // 用神，最大加成
  earth: 1.3,   // 喜神，次要加成
  metal: 0.9,   // 中性偏喜
  wood:  0.7,   // 過旺，略忌
  water: 0.6,   // 忌神，減分
};

/**
 * 五行對蘇先生的時辰分數加減（每個五行單位的分數影響）
 * 用於時辰能量計算（基礎分 50 分）
 */
export const HOUR_ELEMENT_SCORES: Record<string, number> = {
  火: +30,   // 用神，大加成
  土: +20,   // 喜神，加成
  金: +5,    // 中性偏喜
  水: -25,   // 忌神，大減分
  木: -20,   // 忌神，減分
};

/**
 * 五行對蘇先生的日柱吉凶評分係數
 * 用於日柱能量等級計算
 */
export const DAY_ELEMENT_SCORES: Record<string, number> = {
  火: 2.0,   // 用神，最高加成
  土: 1.5,   // 喜神，次要加成
  水: -2.0,  // 忌神，最高減分
  木: -1.5,  // 忌神，次要減分
  金: 0,     // 複雜，中性
};

// ─── 幸運數字權重（用於彩券選號）────────────────────────────────
/**
 * 0-9 各數字的基礎命格權重
 * 基於五行數字對應：火(2,7)>土(0,5)>金(4,9)>木(1,3,8)>水(6)
 */
export const LUCKY_NUMBER_WEIGHTS: Record<number, number> = {
  0: 8,  // 土（財星，喜）
  1: 4,  // 木/水（身強，中性偏忌）
  2: 10, // 火（用神，最喜）
  3: 5,  // 木（身強，中性）
  4: 7,  // 金（喜神，決斷）
  5: 8,  // 土（財星，喜）
  6: 3,  // 水（忌神，降權）
  7: 10, // 火（用神，最喜）
  8: 5,  // 木（身強，中性）
  9: 7,  // 金（喜神，決斷）
};

/**
 * 五行對彩券號碼的加成分數
 * 用於流日五行動態調整號碼權重
 */
export const LOTTERY_ELEMENT_BOOST: Record<string, number> = {
  fire:  3,   // 用神，大吉，加成最高
  earth: 2,   // 喜神，吉，加成次之
  metal: 1,   // 喜神，小吉
  wood:  0,   // 中性（身強不需補）
  water: -2,  // 忌神，降權
};

// ─── 特殊時辰加成 ────────────────────────────────────────────────
/**
 * 出生時辰（己巳時）：天生命格共鳴，靈感創意特別旺盛
 * 命盤丑宮（紫微、破軍等重要星曜）：神秘加成
 */
export const SPECIAL_HOUR_BONUS: Record<string, number> = {
  巳: 15,  // 出生時辰，天生共鳴
  丑: 10,  // 命盤丑宮重要星曜
};

// ─── 五行顏色對應（穿搭建議）────────────────────────────────────
/**
 * 五行對應的穿搭顏色
 * 用於生成每日穿搭建議
 */
export const ELEMENT_COLORS: Record<string, { primary: string; secondary: string; element: string }> = {
  火: { primary: "朱紅",   secondary: "火焰橙", element: "火" },
  土: { primary: "土黃",   secondary: "駝色",   element: "土" },
  金: { primary: "白色",   secondary: "銀色",   element: "金" },
  木: { primary: "翠綠",   secondary: "草綠",   element: "木" },
  水: { primary: "深藍",   secondary: "黑色",   element: "水" },
};

// ─── 生命靈數與塔羅原型 ──────────────────────────────────────────
export const NUMEROLOGY = {
  /** 外在個性：8（力量） */
  outer: { number: 8, tarot: "力量", arcana: "Strength" },
  /** 中間個性（樞紐）：10（命運之輪） */
  middle: { number: 10, tarot: "命運之輪", arcana: "Wheel of Fortune" },
  /** 內在/核心個性：5（教皇） */
  inner: { number: 5, tarot: "教皇", arcana: "Hierophant" },
  /** 靈魂輔助：22（愚者） */
  soul: { number: 22, tarot: "愚者", arcana: "Fool" },
};

// ─── 紫微斗數命宮 ────────────────────────────────────────────────
export const ZIWEI_MAIN_STAR = "巨門";
export const ZIWEI_PALACE_BRANCH = "午";
export const ZIWEI_SPECIAL_FORMAT = "石中隱玉格";

// ─── 職業背景 ────────────────────────────────────────────────────
export const PROFESSION = ["行銷", "攝影", "產品經理"];
