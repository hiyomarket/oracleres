/**
 * 五行加權計算引擎 V11.0
 * 核心算法：今日五行 = 本命五行×(30%-Δt) + 環境五行×(70%+Δt)
 * Δt 由大運計算引擎提供，反映十年大運週期的背景色影響
 * 日主：甲木，終身補運優先級：火>土>金
 */
import { type DaYunResult } from './daYunEngine';
import { getMoonPhase } from './moonPhase';

// ============================================================
// 天干地支五行屬性表
// ============================================================

export const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};

export const BRANCH_ELEMENT: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木",
  辰: "土", 巳: "火", 午: "火", 未: "土",
  申: "金", 酉: "金", 戌: "土", 亥: "水",
};

// ============================================================
// 本命五行比例（V9.0 歸正版，終身不變常數）
// 日主：甲木，八字：甲子年 乙亥月 甲子日 己巳時
// ============================================================

export const NATAL_ELEMENT_RATIO: Record<string, number> = {
  木: 0.42,
  水: 0.35,
  火: 0.11,
  土: 0.09,
  金: 0.04,
};

// 終身補運優先級（用神/喜神）
export const SUPPLEMENT_PRIORITY = ["火", "土", "金"] as const;

// ============================================================
// 五行顏色對應表
// ============================================================

export const ELEMENT_COLORS: Record<string, string[]> = {
  火: ["紅色", "橙色", "紫色", "粉紅色", "棗紅色"],
  木: ["綠色", "青色", "翠綠色", "草綠色"],
  水: ["黑色", "深藍色", "藍色", "靛藍色"],
  土: ["黃色", "棕色", "卡其色", "米色", "土黃色"],
  金: ["白色", "銀色", "金色", "香檳色"],
};

// ============================================================
// 五行食物對應表
// ============================================================

export const ELEMENT_FOODS: Record<string, string[]> = {
  火: ["辣椒", "紅棗", "番茄", "紅肉", "咖啡", "烈酒", "濃茶", "燒烤", "油炸食物"],
  木: ["綠葉蔬菜", "青菜", "草藥", "綠茶", "黃瓜", "菠菜"],
  水: ["黑芝麻", "黑豆", "海帶", "魚", "蝦", "鹽", "冷飲"],
  土: ["紅薯", "山藥", "蜂蜜", "甜食", "碳水化合物", "米飯", "麵包", "南瓜"],
  金: ["白蘿蔔", "百合", "杏仁", "銀耳", "白色食物", "梨子", "豆腐"],
};

// ============================================================
// 手串資料庫（V9.1 整合版）
// 整合模塊二的 HS-G/HS-C/HS-B/HS-J/HS-H/HS-K/HS-N
// 與用戶手串 HS-A~HS-J
// ============================================================

export interface BraceletInfo {
  code: string;
  name: string;
  element: string;
  color: string;
  function: string;
  tacticalRoles: Record<string, string>; // 不同情境下的戰術角色
}

export const BRACELET_DB: BraceletInfo[] = [
  {
    code: "HS-A",
    name: "多彩虎眼石手串",
    element: "土",
    color: "黃/藍",
    function: "現實穩定器",
    tacticalRoles: {
      補土: "財富鎖定器",
      補金: "決斷力放大器",
      default: "能量平衡器",
    },
  },
  {
    code: "HS-B",
    name: "紫晶智慧招財手串",
    element: "火",
    color: "紫/黃/紅/綠",
    function: "才華引爆器",
    tacticalRoles: {
      補火: "創意太陽",
      補土: "財富磁場",
      default: "智慧共振器",
    },
  },
  {
    code: "HS-C",
    name: "酒紅石榴石手串",
    element: "火",
    color: "酒紅",
    function: "能量引爆器",
    tacticalRoles: {
      補火: "創意的太陽",
      強火: "才華巔峰器",
      default: "火元素放大器",
    },
  },
  {
    code: "HS-D",
    name: "經典黃虎眼石手串",
    element: "土",
    color: "黃色",
    function: "現實穩定器",
    tacticalRoles: {
      補土: "成果鎖定器",
      補金: "決斷力基石",
      default: "土元素穩定器",
    },
  },
  {
    code: "HS-E",
    name: "太赫茲能量手串",
    element: "金",
    color: "銀灰",
    function: "權威放大器",
    tacticalRoles: {
      補金: "權威權杖",
      制木: "決斷力劍",
      default: "金元素放大器",
    },
  },
  {
    code: "HS-F",
    name: "白硨磲手串",
    element: "金",
    color: "白色",
    function: "淨化護盾",
    tacticalRoles: {
      補金: "純淨護盾",
      制木: "清明決策盾",
      default: "金水平衡器",
    },
  },
  {
    code: "HS-G",
    name: "金太陽石手串",
    element: "火",
    color: "金橙",
    function: "財運引爆器",
    tacticalRoles: {
      補火: "財運太陽",
      補土: "黃金磁場",
      default: "火土共振器",
    },
  },
  {
    code: "HS-H",
    name: "沉香木手串",
    element: "木",
    color: "棕/黑",
    function: "生命能量包",
    tacticalRoles: {
      補木: "生命根基",
      default: "木元素共鳴器",
    },
  },
  {
    code: "HS-I",
    name: "天珠瑪瑙手串",
    element: "水",
    color: "黑/深藍",
    function: "理智療癒師",
    tacticalRoles: {
      補水: "理智守護者",
      default: "水元素療癒器",
    },
  },
  {
    code: "HS-J",
    name: "和田玉竹節手串",
    element: "土",
    color: "白/黑",
    function: "財富根基",
    tacticalRoles: {
      補土: "財富根基石",
      補金: "玉石護法",
      default: "土金平衡器",
    },
  },
];

// ============================================================
// 環境五行比例計算
// 根據當日年干支、月干支、日干支（共6個字）計算
// ============================================================

export interface ElementRatio {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

/**
 * 計算環境五行比例
 * 輸入：年干、年支、月干、月支、日干、日支
 * 輸出：各五行比例（0-1之間，總和為1）
 */
export function calculateEnvironmentElements(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string
): ElementRatio {
  const elements = [
    STEM_ELEMENT[yearStem],
    BRANCH_ELEMENT[yearBranch],
    STEM_ELEMENT[monthStem],
    BRANCH_ELEMENT[monthBranch],
    STEM_ELEMENT[dayStem],
    BRANCH_ELEMENT[dayBranch],
  ].filter(Boolean);

  const count: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const el of elements) {
    if (el in count) count[el]++;
  }

  const total = elements.length || 6;
  return {
    木: count.木 / total,
    火: count.火 / total,
    土: count.土 / total,
    金: count.金 / total,
    水: count.水 / total,
  };
}

// ============================================================
// 加權五行計算（核心公式）
// 今日加權 = 本命×30% + 環境×70%
// ============================================================

export interface WeightedElementResult {
  weighted: ElementRatio;
  natal: ElementRatio;
  environment: ElementRatio;
  /** 天氣五行（若有） */
  weather?: ElementRatio;
  levels: Record<string, EnergyLevel>;
  dominantElement: string;
  weakestElement: string;
  coreContradiction: string;
}

// ============================================================
// 補運指數計算（五行相生相剋）
// ============================================================

function isGenerating(from: string, to: string): boolean {
  const gen: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  return gen[from] === to;
}
function isControlling(from: string, to: string): boolean {
  const ctrl: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  return ctrl[from] === to;
}

/**
 * 計算「選擇的五行食物」對「目標補充五行」的補運指數
 * 返回 -100 到 +100 的分數
 */
export function calculateResonanceScore(targetElement: string, chosenElement: string): number {
  if (chosenElement === targetElement) return 100;          // 完美補運
  if (isGenerating(chosenElement, targetElement)) return 60; // 相生助力（如木生火）
  if (isControlling(chosenElement, targetElement)) return -70; // 相剋（如金剋木）
  if (isGenerating(targetElement, chosenElement)) return -40;  // 洩氣（如火生土，選土時火被洩）
  if (isControlling(targetElement, chosenElement)) return 30;  // 目標剋制選擇（如火剋金，選火補土時金受制）
  return 0; // 中性
}

export interface EnergyLevel {
  level: string;
  stars: number;
  description: string;
  emoji: string;
}

/**
 * 計算加權五行比例 V11.0
 * @param env 環境五行比例
 * @param dynamicNatalRatio 可選：動態本命五行比例（用戶個人命格），若不傳則使用預設甲木命格
 * @param weatherRatio 可選：天氣五行比例
 * @param daYunResult 可選：大運計算結果（V11.0 新增，提供 Δt 動態加權調整）
 * @param currentDate 可選：當前日期（用於月相計算，預設今日）
 */
export function calculateWeightedElements(
  env: ElementRatio,
  dynamicNatalRatio?: Record<string, number>,
  weatherRatio?: ElementRatio,
  daYunResult?: DaYunResult,
  currentDate?: Date
): WeightedElementResult {
  const natalSource = dynamicNatalRatio || NATAL_ELEMENT_RATIO;
  const natal: ElementRatio = {
    木: natalSource['木'] ?? NATAL_ELEMENT_RATIO.木,
    火: natalSource['火'] ?? NATAL_ELEMENT_RATIO.火,
    土: natalSource['土'] ?? NATAL_ELEMENT_RATIO.土,
    金: natalSource['金'] ?? NATAL_ELEMENT_RATIO.金,
    水: natalSource['水'] ?? NATAL_ELEMENT_RATIO.水,
  };

  // V11.0：大運動態加權調整（Δt 由大運引擎提供）
  const delta = daYunResult?.daYunInfluence.weightAdjustment ?? 0;
  const envBaseWeight = Math.min(0.85, Math.max(0.55, 0.70 + delta));
  const selfBaseWeight = Math.min(0.45, Math.max(0.15, 0.30 - delta));

  // 三維加權公式：本命(30%-Δt) + 環境(50%+Δt) + 天氣20%（若無天氣則回退：本命(30%-Δt) + 環境(70%+Δt)）
  const weather = weatherRatio;
  let weighted: ElementRatio = weather ? {
    木: natal.木 * selfBaseWeight * (3/5) + env.木 * (envBaseWeight * (5/7)) + weather.木 * 0.2,
    火: natal.火 * selfBaseWeight * (3/5) + env.火 * (envBaseWeight * (5/7)) + weather.火 * 0.2,
    土: natal.土 * selfBaseWeight * (3/5) + env.土 * (envBaseWeight * (5/7)) + weather.土 * 0.2,
    金: natal.金 * selfBaseWeight * (3/5) + env.金 * (envBaseWeight * (5/7)) + weather.金 * 0.2,
    水: natal.水 * selfBaseWeight * (3/5) + env.水 * (envBaseWeight * (5/7)) + weather.水 * 0.2,
  } : {
    木: natal.木 * selfBaseWeight + env.木 * envBaseWeight,
    火: natal.火 * selfBaseWeight + env.火 * envBaseWeight,
    土: natal.土 * selfBaseWeight + env.土 * envBaseWeight,
    金: natal.金 * selfBaseWeight + env.金 * envBaseWeight,
    水: natal.水 * selfBaseWeight + env.水 * envBaseWeight,
  };

  // V11.0：月相微調（月相對五行能量的週期性影響）
  const moonPhaseInfo = getMoonPhase(currentDate);
  const moonPhase = moonPhaseInfo.phase;
  if (moonPhase === 'new_moon' || moonPhase === 'waning_crescent') {
    // 新月/晦月：水能量增強 10%，金能量微增 5%
    weighted.水 *= 1.10;
    weighted.金 *= 1.05;
  } else if (moonPhase === 'full_moon') {
    // 滿月：火能量增強 10%，土能量微增 5%
    weighted.火 *= 1.10;
    weighted.土 *= 1.05;
  } else if (moonPhase === 'first_quarter') {
    // 上弦月：木能量增強 5%（生長之力）
    weighted.木 *= 1.05;
  } else if (moonPhase === 'last_quarter') {
    // 下弦月：金能量增強 5%（收斂之力）
    weighted.金 *= 1.05;
  }

  // 歸一化處理（確保總和為 1.0）
  const total = Object.values(weighted).reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (const k of Object.keys(weighted) as (keyof ElementRatio)[]) {
      weighted[k] = weighted[k] / total;
    }
  }

  const levels: Record<string, EnergyLevel> = {};
  for (const el of ["木", "火", "土", "金", "水"] as const) {
    levels[el] = assessEnergyLevel(weighted[el]);
  }

  const sorted = Object.entries(weighted).sort(([, a], [, b]) => b - a);
  const dominantElement = sorted[0][0];
  const weakestElement = sorted[sorted.length - 1][0];
  const coreContradiction = generateCoreContradiction(weighted, dominantElement, weakestElement);

  return { weighted, natal, environment: env, weather, levels, dominantElement, weakestElement, coreContradiction };
}

/**
 * 評估能量等級
 */
export function assessEnergyLevel(ratio: number): EnergyLevel {
  if (ratio >= 0.35) return { level: "宇宙級爆棚", stars: 5, description: "最強能量，是今天的絕對主宰", emoji: "⭐⭐⭐⭐⭐" };
  if (ratio >= 0.25) return { level: "極強", stars: 4, description: "非常強大，需要重視", emoji: "⭐⭐⭐⭐☆" };
  if (ratio >= 0.15) return { level: "強", stars: 3, description: "相對強大，可以利用", emoji: "⭐⭐⭐☆☆" };
  if (ratio >= 0.05) return { level: "弱", stars: 2, description: "相對薄弱，不宜依賴", emoji: "⭐⭐☆☆☆" };
  return { level: "災難級極弱", stars: 1, description: "極其薄弱，是核心死穴", emoji: "⭐☆☆☆☆" };
}

function generateCoreContradiction(
  weighted: ElementRatio,
  dominant: string,
  weakest: string
): string {
  const dominantPct = Math.round(weighted[dominant as keyof ElementRatio] * 100);
  const weakestPct = Math.round(weighted[weakest as keyof ElementRatio] * 100);

  const elementNames: Record<string, string> = {
    木: "木旺", 火: "火旺", 土: "土旺", 金: "金旺", 水: "水旺",
  };

  // 找出所有宇宙級爆棚的五行
  const cosmic = Object.entries(weighted)
    .filter(([, v]) => v >= 0.35)
    .map(([k]) => k);

  const cosmicDesc = cosmic.length > 0
    ? cosmic.map(el => `${el}旺(${Math.round(weighted[el as keyof ElementRatio] * 100)}%)`).join("、")
    : `${dominant}旺(${dominantPct}%)`;

  return `${cosmicDesc}，${weakest}弱(${weakestPct}%)`;
}

// ============================================================
// 五行總覽表生成
// ============================================================

export interface ElementOverviewRow {
  element: string;
  emoji: string;
  natalPct: number;
  envPct: number;
  weightedPct: number;
  energyLevel: EnergyLevel;
  interpretation: string;
}

export function generateElementOverview(result: WeightedElementResult): ElementOverviewRow[] {
  const ELEMENT_EMOJI: Record<string, string> = {
    火: "🔥", 木: "🌳", 水: "🌊", 土: "🌍", 金: "⚪",
  };

  const ELEMENT_MEANING: Record<string, string> = {
    火: "才華與快樂（食神/傷官）",
    木: "自我與生命力（比劫）",
    土: "財富與穩定（正財/偏財）",
    金: "規則與決斷（正官/七殺）",
    水: "理智與思考（印星）",
  };

  const rows: ElementOverviewRow[] = [];
  const elements = ["火", "木", "水", "土", "金"] as const;

  for (const el of elements) {
    const natalPct = Math.round(result.natal[el] * 100);
    const envPct = Math.round(result.environment[el] * 100);
    const weightedPct = Math.round(result.weighted[el] * 100);
    const level = result.levels[el];

    let interpretation = "";
    if (level.stars >= 5) {
      interpretation = `(${level.level}) 最強能量！${ELEMENT_MEANING[el]}達到終極巔峰，是你今天的絕對主宰。`;
    } else if (level.stars >= 4) {
      interpretation = `(${level.level}) 非常強大！${ELEMENT_MEANING[el]}能量充沛，可大力利用。`;
    } else if (level.stars >= 3) {
      interpretation = `(${level.level}) 相對強大。${ELEMENT_MEANING[el]}有一定支撐，可適度運用。`;
    } else if (level.stars >= 2) {
      interpretation = `(${level.level}) 相對薄弱。${ELEMENT_MEANING[el]}不足，需要補充。`;
    } else {
      interpretation = `(${level.level}) 核心死穴！${ELEMENT_MEANING[el]}被徹底壓制，是今天最需要補充的能量。`;
    }

    rows.push({
      element: el,
      emoji: ELEMENT_EMOJI[el],
      natalPct,
      envPct,
      weightedPct,
      energyLevel: level,
      interpretation,
    });
  }

  // 按加權比例降序排列
  return rows.sort((a, b) => b.weightedPct - a.weightedPct);
}

// ============================================================
// 穿搭建議生成（加權五行驅動）
// 上下身分治策略
// ============================================================

export interface OutfitAdviceV9 {
  upperBody: {
    element: string;
    colors: string[];
    tacticalExplanation: string;
  };
  lowerBody: {
    element: string;
    colors: string[];
    tacticalExplanation: string;
  };
  avoid: Array<{
    colors: string[];
    element: string;
    reason: string;
  }>;
  coreStrategy: string;
  energyTag: string;
}

export function generateOutfitAdviceV9(
  result: WeightedElementResult,
  supplementPriority?: string[],
  strategy?: import('./strategyEngine').DailyStrategyObject,
): OutfitAdviceV9 {
  const { weighted, coreContradiction } = result;

  // V10.0：若有策略物件，直接使用策略判定的主攻/輔助五行
  // V9.1 fallback：若無策略物件，使用舊的補弱邏輯（向後相容）
  let primarySupplement: string;
  let secondarySupplement: string;

  if (strategy) {
    primarySupplement = strategy.primaryTargetElement;
    secondarySupplement = strategy.secondaryTargetElement;
  } else {
    const priority = supplementPriority && supplementPriority.length > 0 ? supplementPriority : [...SUPPLEMENT_PRIORITY];
    primarySupplement = priority[0] ?? "火";
    secondarySupplement = priority[1] ?? "土";
    for (const el of priority) {
      if (weighted[el as keyof ElementRatio] < 0.15) { primarySupplement = el; break; }
    }
    for (const el of priority) {
      if (el !== primarySupplement && weighted[el as keyof ElementRatio] < 0.25) { secondarySupplement = el; break; }
    }
    if (primarySupplement === secondarySupplement) {
      secondarySupplement = priority.find(el => el !== primarySupplement) ?? "土";
    }
  }

  // 找出過旺的五行（需要避開）
  const overflowing = Object.entries(weighted)
    .filter(([, v]) => v >= 0.35)
    .map(([k]) => k);

  // 生成上下身穿搭
  const upperColors = ELEMENT_COLORS[primarySupplement] || ["白色"];
  const lowerColors = ELEMENT_COLORS[secondarySupplement] || ["黃色"];

  // 生成戰術解讀（V10.0：加入策略名稱前綴）
  const upperExplanation = generateOutfitExplanation(primarySupplement, "upper", weighted, coreContradiction, strategy);
  const lowerExplanation = generateOutfitExplanation(secondarySupplement, "lower", weighted, coreContradiction, strategy);

  // 避開顏色（過旺五行，但排除補運色）
  const avoidList = overflowing
    .filter(el => el !== primarySupplement && el !== secondarySupplement)
    .map(el => ({
      colors: ELEMENT_COLORS[el] || [],
      element: el,
      reason: `${el}能量已過旺（${Math.round(weighted[el as keyof ElementRatio] * 100)}%），避免再添加同類能量`,
    }));

  const energyTag = strategy ? strategy.energyTag : `${primarySupplement}補運日｜${coreContradiction}`;
  const coreStrategy = strategy ? strategy.coreStrategyText : `今日核心策略：用「${primarySupplement}」${getElementGoal(primarySupplement)}，用「${secondarySupplement}」${getElementGoal(secondarySupplement)}`;

  return {
    upperBody: {
      element: primarySupplement,
      colors: upperColors.slice(0, 3),
      tacticalExplanation: upperExplanation,
    },
    lowerBody: {
      element: secondarySupplement,
      colors: lowerColors.slice(0, 3),
      tacticalExplanation: lowerExplanation,
    },
    avoid: avoidList,
    coreStrategy,
    energyTag,
  };
}

function getElementGoal(element: string): string {
  const goals: Record<string, string> = {
    火: "引爆才華與創意",
    土: "鎖住成果與財富",
    金: "強化決斷與權威",
    木: "生發自我能量",
    水: "深化理智與思考",
  };
  return goals[element] || "補充能量";
}

function generateOutfitExplanation(
  element: string,
  position: "upper" | "lower",
  weighted: ElementRatio,
  coreContradiction: string,
  strategy?: import('./strategyEngine').DailyStrategyObject,
): string {
  const pct = Math.round(weighted[element as keyof ElementRatio] * 100);
  const positionDesc = position === "upper" ? "上半身（主生發/滋養/內心）" : "下半身（主支撐/行動/根基）";

  const explanations: Record<string, Record<"upper" | "lower", string>> = {
    火: {
      upper: `今日火能量${pct < 15 ? "不足（" + pct + "%）" : "充沛（" + pct + "%）"}，上半身穿著火色系（紅/橙/紫）能直接點燃你的食神才華，讓創意和表達力全面爆發。火行能量是洩木生財的核心通道。`,
      lower: `下半身搭配火色系，代表你的行動力和執行力都在「創意輸出」的頻道上。每一步都在為你的才華找到變現的出口。`,
    },
    土: {
      upper: `今日土能量${pct < 10 ? "極弱（" + pct + "%）" : "（" + pct + "%）"}，上半身穿著土色系（黃/棕/卡其）能直接補充財星能量，幫助你把創意和才華轉化為實際的財富和成果。`,
      lower: `下半身穿著土色系，代表你的根基和行動方向都指向「鎖住成果」。黃棕色調會不斷提醒你：把今天的能量轉化為可變現的價值。`,
    },
    金: {
      upper: `今日金能量${pct < 10 ? "極弱（" + pct + "%）" : "（" + pct + "%）"}，上半身穿著金色系（白/銀/金）能補充官殺能量，強化你的決斷力和執行力，讓你在面對選擇時更加果斷清晰。`,
      lower: `下半身搭配金色系，代表你的行動力都在「精準決策」的頻道上。白銀色調能幫助你剔除雜念，專注於最重要的目標。`,
    },
    木: {
      upper: `今日木能量充沛（${pct}%），上半身穿著木色系（綠/青）能與自身日主共振，強化你的生命力和自我表達。`,
      lower: `下半身搭配木色系，讓你的行動力充滿生機和創造力。`,
    },
    水: {
      upper: `今日水能量${pct < 15 ? "（" + pct + "%）" : "充沛（" + pct + "%）"}，上半身穿著水色系（黑/深藍）能補充理智和思考能量，幫助你在決策時更加冷靜深思。`,
      lower: `下半身搭配水色系，讓你的行動更有深度和策略性。`,
    },
  };

  const base = explanations[element]?.[position] || `${positionDesc}穿著${element}色系，補充${element}元素能量。`;
  if (strategy && strategy.strategyName !== "均衡守成") {
    return `【${strategy.strategyName}・${strategy.aiPromptHint}】 ${base}`;
  }
  return base;
}

// ============================================================
// 飲食建議生成
// ============================================================

export interface PlanBItem {
  element: string;
  resonanceScore: number;  // -100 到 +100
  label: string;           // 首選方案 / 次選方案 / 中性 / 應避免 / 強烈避免
  foods: string[];
  advice: string;
}

export interface DietaryAdvice {
  supplements: Array<{
    element: string;
    priority: number;
    foods: string[];
    advice: string;
  }>;
  avoid: Array<{
    element: string;
    foods: string[];
    reason: string;
  }>;
  /** 全五行補運指數排行（-100 到 +100），供儀表盤顯示 */
  planB: PlanBItem[];
  /** 今日首選補充五行 */
  targetElement: string;
}

export function generateDietaryAdvice(result: WeightedElementResult, supplementPriority?: string[]): DietaryAdvice {
  const { weighted } = result;
  // 使用動態傳入的補運優先級，沒有則 fallback 到常數
  const priority = supplementPriority && supplementPriority.length > 0 ? supplementPriority : [...SUPPLEMENT_PRIORITY];
  // 按補運優先級，推薦缺乏的五行食物
  const supplements = [];
  for (const el of priority) {
    const pct = Math.round(weighted[el as keyof ElementRatio] * 100);
    if (pct < 20) {
      supplements.push({
        element: el,
        priority: priority.indexOf(el) + 1,
        foods: ELEMENT_FOODS[el] || [],
        advice: generateFoodAdvice(el, pct),
      });
    }
  }
  // 如果沒有明顯缺乏，推薦最高優先級
  if (supplements.length === 0) {
    const topEl = priority[0] ?? "火";
    supplements.push({
      element: topEl,
      priority: 1,
      foods: ELEMENT_FOODS[topEl] || [],
      advice: `今日能量充沛，可享用${topEl}系食物來強化今日能量。`,
    });
  }
  // 過旺的五行要避開（排除用戶的補運優先級五行）
  const avoid = Object.entries(weighted)
    .filter(([el, v]) => v >= 0.35 && !priority.includes(el))
    .map(([el]) => ({
      element: el,
      foods: ELEMENT_FOODS[el] || [],
      reason: `${el}能量已過旺（${Math.round(weighted[el as keyof ElementRatio] * 100)}%），避免再攝取同類食物，以免能量失衡。`,
    }));

  // 計算 planB：對所有五行計算補運指數
  const targetElement = supplements[0]?.element ?? "火";
  const planB: PlanBItem[] = ["木", "火", "土", "金", "水"].map((el) => {
    const score = calculateResonanceScore(targetElement, el);
    let label: string;
    if (score >= 100) label = "首選方案";
    else if (score >= 50) label = "次選方案";
    else if (score >= 0) label = "中性";
    else if (score >= -50) label = "應避免";
    else label = "強烈避免";
    const advice = score >= 60
      ? `${el}系食材可強化今日補運，推薦積極攝取。`
      : score < 0
      ? `${el}系食材今日不利補運，建議減少攝取。`
      : `${el}系食材今日中性，可適量攝取。`;
    return { element: el, resonanceScore: score, label, foods: ELEMENT_FOODS[el] || [], advice };
  }).sort((a, b) => b.resonanceScore - a.resonanceScore);

  return { supplements, avoid, planB, targetElement };
}

function generateFoodAdvice(element: string, pct: number): string {
  const advices: Record<string, string> = {
    火: `火能量不足（${pct}%），積極補充！盡情享用辛辣、燒烤、油炸食物，喝咖啡、烈酒、濃茶，點燃你的創意才華。`,
    土: `土能量極弱（${pct}%），財星補充！多吃甜食、碳水化合物、紅薯、山藥、蜂蜜，把才華轉化為實際財富。`,
    金: `金能量不足（${pct}%），決斷力補充！多吃白色食物、白蘿蔔、百合、杏仁、銀耳，強化你的判斷力。`,
  };
  return advices[element] || `補充${element}元素食物，平衡今日能量。`;
}

// ============================================================
// 手串推薦（加權五行驅動）
// ============================================================

export interface BraceletRecommendationV9 {
  leftHand: BraceletInfo & { tacticalRole: string; explanation: string };
  rightHand: BraceletInfo & { tacticalRole: string; explanation: string };
  coreGoal: string;
}

export function recommendBraceletsV9(
  result: WeightedElementResult,
  supplementPriority?: string[],
  strategy?: import('./strategyEngine').DailyStrategyObject,
): BraceletRecommendationV9 {
  const { weighted, coreContradiction } = result;

  // V10.0：若有策略物件，直接使用策略判定的主攻/輔助五行
  let leftElement: string;
  let rightElement: string;

  if (strategy) {
    leftElement = strategy.primaryTargetElement;
    rightElement = strategy.secondaryTargetElement;
  } else {
    // V9.1 向後相容
    const priority = supplementPriority && supplementPriority.length > 0 ? supplementPriority : [...SUPPLEMENT_PRIORITY];
    leftElement = priority[0] ?? "火";
    rightElement = priority[1] ?? "土";
    for (const el of priority) {
      if (weighted[el as keyof ElementRatio] < 0.15) { leftElement = el; break; }
    }
    for (const el of priority) {
      if (el !== leftElement && weighted[el as keyof ElementRatio] < 0.25) { rightElement = el; break; }
    }
    if (leftElement === rightElement) {
      const idx = priority.indexOf(rightElement);
      rightElement = priority[(idx + 1) % priority.length] ?? priority[0] ?? "土";
    }
  }

  // 從手串資料庫選擇對應五行的手串
  const leftBracelet = selectBracelet(leftElement, "left");
  const rightBracelet = selectBracelet(rightElement, "right");

  const leftRole = leftBracelet.tacticalRoles[`補${leftElement}`] || leftBracelet.tacticalRoles.default;
  const rightRole = rightBracelet.tacticalRoles[`補${rightElement}`] || rightBracelet.tacticalRoles.default;

  const leftExplanation = generateBraceletExplanation(leftBracelet, leftElement, "left", weighted, coreContradiction);
  const rightExplanation = generateBraceletExplanation(rightBracelet, rightElement, "right", weighted, coreContradiction);

  const coreGoal = strategy
    ? strategy.coreStrategyText
    : `今日核心目標：用「${leftElement}」${getElementGoal(leftElement)}，用「${rightElement}」${getElementGoal(rightElement)}`;

  return {
    leftHand: { ...leftBracelet, tacticalRole: leftRole, explanation: leftExplanation },
    rightHand: { ...rightBracelet, tacticalRole: rightRole, explanation: rightExplanation },
    coreGoal,
  };
}

function selectBracelet(element: string, hand: "left" | "right"): BraceletInfo {
  const candidates = BRACELET_DB.filter(b => b.element === element);
  if (candidates.length === 0) {
    // 找最接近的
    return BRACELET_DB[0];
  }
  // 左手選第一個，右手選第二個（如果有）
  return hand === "left" ? candidates[0] : (candidates[1] || candidates[0]);
}

function generateBraceletExplanation(
  bracelet: BraceletInfo,
  element: string,
  hand: "left" | "right",
  weighted: ElementRatio,
  coreContradiction: string
): string {
  const pct = Math.round(weighted[element as keyof ElementRatio] * 100);
  const handDesc = hand === "left" ? "左手（主補能）" : "右手（策略/防護）";

  const explanations: Record<string, Record<"left" | "right", string>> = {
    火: {
      left: `在今天${coreContradiction}的格局下，${bracelet.name}是你最強的「才華放大器」。它強大的火能量，能直接點燃你體內積蓄的甲木創意之力，給你將其徹底釋放出來的衝動和勇氣。`,
      right: `佩戴${bracelet.name}在右手，代表你主動將所有的創意和才華，導向一個可輸出的方向。火能量會不斷提醒你：「今天是展示才華的最佳時機！」`,
    },
    土: {
      left: `在今天${coreContradiction}的格局下，${bracelet.name}是你的「財富鎖定器」。土能量（財星）極弱，這串手串能直接補充你的財星能量，幫助你把今天的才華和行動轉化為實際的財富。`,
      right: `將${bracelet.name}佩戴在右手，代表你主動將所有的創意和才華，導向一個實際的目標——創造可變現的價值。貔貅的意象會不斷提醒你：「別只會創意，要把成果變成錢！」`,
    },
    金: {
      left: `在今天${coreContradiction}的格局下，${bracelet.name}是你的「決斷力武器」。金能量（官殺）不足，這串手串能補充你的決斷力，讓你在面對選擇時更加果斷清晰，劈木生火，提升執行效率。`,
      right: `將${bracelet.name}佩戴在右手，代表你主動為自己的行動設置「精準邊界」。金能量會幫助你剔除雜念，專注於最重要的目標。`,
    },
  };

  return explanations[element]?.[hand] || `${handDesc}佩戴${bracelet.name}，補充${element}元素能量，${bracelet.function}。`;
}

// ============================================================
// 飲食羅盤 V10.0 升級：食物分類（重型/輕型）
// ============================================================
/** 重型食物（能量強烈，不宜過量） */
export const ELEMENT_FOODS_HEAVY: Record<string, string[]> = {
  火: ["麻辣火鍋", "燒烤", "炸雞", "烈酒", "辣椒炒肉"],
  木: ["生菜沙拉（大量）", "草藥茶", "酸梅湯"],
  水: ["生魚片", "冷飲", "冰品", "海鮮鍋"],
  土: ["蛋糕甜點", "麵包", "炸薯條", "糯米食品"],
  金: ["白斬雞", "豬腳", "白肉大餐"],
};

/** 輕型食物（溫和補充，適合連續多日） */
export const ELEMENT_FOODS_LIGHT: Record<string, string[]> = {
  火: ["番茄", "紅棗", "咖啡（少量）", "薑湯", "辣味小菜"],
  木: ["青菜", "黃瓜", "綠茶", "菠菜湯"],
  水: ["海帶湯", "豆腐", "黑芝麻糊", "蛤蜊湯"],
  土: ["地瓜", "南瓜湯", "蜂蜜水", "山藥粥"],
  金: ["白蘿蔔湯", "銀耳蓮子湯", "梨子", "杏仁豆腐"],
};

// ============================================================
// 飲食羅盤 V10.0 升級：五行知識延伸資料庫
// ============================================================
export interface ElementKnowledge {
  element: string;
  organ: string;
  tcmBenefit: string;
  cookingStyle: string;
  season: string;
  color: string;
  taste: string;
}

export const ELEMENT_KNOWLEDGE: Record<string, ElementKnowledge> = {
  火: {
    element: "火",
    organ: "心臟、小腸",
    tcmBenefit: "火系食物性溫熱，能促進血液循環、提振心陽、增強消化功能。中醫認為「心主神明」，適量補火有助於提升精神專注力與創造力。",
    cookingStyle: "燒烤、快炒、煎炸。高溫烹飪能激活食材中的火性能量，讓食物的溫熱之氣更充分釋放。",
    season: "夏季",
    color: "紅色、橙色",
    taste: "苦味",
  },
  木: {
    element: "木",
    organ: "肝臟、膽囊",
    tcmBenefit: "木系食物多含葉綠素與纖維，能疏肝理氣、促進膽汁分泌、幫助排毒。中醫認為「肝主疏泄」，補木有助於情緒舒暢、決策清晰。",
    cookingStyle: "清蒸、涼拌、快炒。盡量保持食材的清脆口感，避免過度烹飪破壞木性的生機之氣。",
    season: "春季",
    color: "綠色、青色",
    taste: "酸味",
  },
  水: {
    element: "水",
    organ: "腎臟、膀胱",
    tcmBenefit: "水系食物多含礦物質與蛋白質，能滋補腎陰、強化骨骼、增強記憶力。中醫認為「腎主藏精」，補水有助於深層滋養、增強意志力。",
    cookingStyle: "燉湯、清蒸、水煮。溫和的烹飪方式能保留食材的滋潤之性，讓水性能量緩慢而深入地補充。",
    season: "冬季",
    color: "黑色、深藍色",
    taste: "鹹味",
  },
  土: {
    element: "土",
    organ: "脾臟、胃",
    tcmBenefit: "土系食物多含澱粉與甜味，能健脾益胃、補充氣血、增強消化吸收。中醫認為「脾主運化」，補土有助於將才華轉化為實際成果（財富）。",
    cookingStyle: "蒸煮、燉煮、烘焙。溫和的加熱方式能讓土性食物的甘甜之氣充分釋放，滋養脾胃。",
    season: "長夏（四季末各18天）",
    color: "黃色、棕色",
    taste: "甘甜味",
  },
  金: {
    element: "金",
    organ: "肺臟、大腸",
    tcmBenefit: "金系食物多為白色，能潤肺止咳、清腸排毒、增強免疫力。中醫認為「肺主氣」，補金有助於提升決斷力、增強執行力與邊界感。",
    cookingStyle: "清蒸、白灼、涼拌。清淡的烹飪方式能保留金性食物的清肅之氣，讓肺氣更加清明。",
    season: "秋季",
    color: "白色、金色",
    taste: "辛辣味（辛）",
  },
};

// ============================================================
// 飲食羅盤 V10.0 升級：generateDietaryAdviceV10
// 整合動態策略判定層 + 情境模式 + 短期記憶過濾 + 健康標籤
// ============================================================
export interface DietaryAdviceV10 extends DietaryAdvice {
  /** 今日策略名稱 */
  strategyName?: string;
  /** 今日策略核心文案 */
  strategyCoreText?: string;
  /** 短期記憶提示（若昨日已大量攝取某五行） */
  memoryHint?: string;
  /** 今日輕型推薦食物（短期記憶模式下優先顯示） */
  lightFoods?: string[];
  /** 健康標籤過濾後的餐廳搜索關鍵字修正 */
  restaurantKeywordOverrides?: Partial<Record<string, string[]>>;
}

export function generateDietaryAdviceV10(
  result: WeightedElementResult,
  strategy?: import('./strategyEngine').DailyStrategyObject,
  supplementPriority?: string[],
  options?: {
    recentConsumedElements?: string[];
    healthTags?: string[];
  },
): DietaryAdviceV10 {
  const { weighted } = result;

  // 1. 決定補運優先級（策略層優先）
  const primaryElement = strategy?.primaryTargetElement ?? supplementPriority?.[0] ?? "火";
  const secondaryElement = strategy?.secondaryTargetElement ?? supplementPriority?.[1] ?? "土";
  const priority = strategy
    ? [primaryElement, secondaryElement, ...(supplementPriority ?? []).filter(e => e !== primaryElement && e !== secondaryElement)]
    : (supplementPriority && supplementPriority.length > 0 ? supplementPriority : [...SUPPLEMENT_PRIORITY]);

  // 2. 短期記憶過濾
  const recentConsumed = options?.recentConsumedElements ?? [];
  const isRecentlyConsumed = recentConsumed.includes(primaryElement);
  let memoryHint: string | undefined;
  let lightFoods: string[] | undefined;

  if (isRecentlyConsumed) {
    memoryHint = `系統注意到您近期已補充大量${primaryElement}能量，今日建議以溫和的方式繼續鞏固，避免過於燥熱。`;
    lightFoods = ELEMENT_FOODS_LIGHT[primaryElement] ?? [];
  }

  // 3. 健康標籤過濾
  const healthTags = options?.healthTags ?? [];
  const restaurantKeywordOverrides: Partial<Record<string, string[]>> = {};

  const filterFoods = (foods: string[]): string[] => {
    let filtered = [...foods];
    if (healthTags.includes("vegetarian")) {
      filtered = filtered.filter(f => !["紅肉", "燒烤", "烤肉", "炸雞", "白斬雞", "豬腳", "白肉大餐", "辣椒炒肉"].includes(f));
    }
    if (healthTags.includes("no_seafood")) {
      filtered = filtered.filter(f => !["魚", "蝦", "海帶", "海鮮鍋", "生魚片", "蛤蜊湯"].includes(f));
    }
    if (healthTags.includes("no_spicy")) {
      filtered = filtered.filter(f => !["辣椒", "麻辣火鍋", "辣味小菜", "辣椒炒肉"].includes(f));
    }
    if (healthTags.includes("low_carb")) {
      filtered = filtered.filter(f => !["麵包", "米飯", "碳水化合物", "蛋糕甜點", "炸薯條", "糯米食品", "地瓜", "南瓜湯"].includes(f));
    }
    return filtered.length > 0 ? filtered : foods.slice(0, 2);
  };

  if (healthTags.includes("vegetarian")) {
    restaurantKeywordOverrides["火"] = ["素食燒烤", "蔬食料理", "素食餐廳"];
    restaurantKeywordOverrides["水"] = ["素食湯品", "蔬食料理"];
  }
  if (healthTags.includes("no_seafood")) {
    restaurantKeywordOverrides["水"] = ["豆腐料理", "蔬食湯品", "黑芝麻甜品"];
  }

  // 4. 生成補充建議
  const supplements = [];
  for (const el of priority.slice(0, 2)) {
    const rawFoods = isRecentlyConsumed && el === primaryElement
      ? (ELEMENT_FOODS_LIGHT[el] ?? ELEMENT_FOODS[el] ?? [])
      : (ELEMENT_FOODS[el] ?? []);
    const foods = filterFoods(rawFoods);
    const pct = Math.round(weighted[el as keyof ElementRatio] * 100);
    supplements.push({
      element: el,
      priority: priority.indexOf(el) + 1,
      foods,
      advice: strategy
        ? `今日策略「${strategy.strategyName}」：${strategy.coreStrategyText}。建議多攝取${el}系食物。`
        : generateFoodAdviceV10(el, pct),
    });
  }

  // 5. 避開過旺五行
  const avoid = Object.entries(weighted)
    .filter(([el, v]) => v >= 0.35 && !priority.slice(0, 2).includes(el))
    .map(([el]) => ({
      element: el,
      foods: ELEMENT_FOODS[el] || [],
      reason: `${el}能量已過旺（${Math.round(weighted[el as keyof ElementRatio] * 100)}%），避免再攝取同類食物。`,
    }));

  // 6. planB 計算
  const targetElement = supplements[0]?.element ?? "火";
  const planB: PlanBItem[] = ["木", "火", "土", "金", "水"].map((el) => {
    const score = calculateResonanceScore(targetElement, el);
    let label: string;
    if (score >= 100) label = "首選方案";
    else if (score >= 50) label = "次選方案";
    else if (score >= 0) label = "中性";
    else if (score >= -50) label = "應避免";
    else label = "強烈避免";
    const advice = score >= 60
      ? `${el}系食材可強化今日補運，推薦積極攝取。`
      : score < 0
      ? `${el}系食材今日不利補運，建議減少攝取。`
      : `${el}系食材今日中性，可適量攝取。`;
    return { element: el, resonanceScore: score, label, foods: filterFoods(ELEMENT_FOODS[el] || []), advice };
  }).sort((a, b) => b.resonanceScore - a.resonanceScore);

  return {
    supplements,
    avoid,
    planB,
    targetElement,
    strategyName: strategy?.strategyName,
    strategyCoreText: strategy?.coreStrategyText,
    memoryHint,
    lightFoods,
    restaurantKeywordOverrides: Object.keys(restaurantKeywordOverrides).length > 0 ? restaurantKeywordOverrides : undefined,
  };
}

function generateFoodAdviceV10(element: string, pct: number): string {
  const advices: Record<string, string> = {
    火: `火能量不足（${pct}%），積極補充！盡情享用辛辣、燒烤、油炸食物，喝咖啡、烈酒、濃茶，點燃你的創意才華。`,
    土: `土能量極弱（${pct}%），財星補充！多吃甜食、碳水化合物、紅薯、山藥、蜂蜜，把才華轉化為實際財富。`,
    金: `金能量不足（${pct}%），決斷力補充！多吃白色食物、白蘿蔔、百合、杏仁、銀耳，強化你的判斷力。`,
  };
  return advices[element] || `補充${element}元素食物（${pct}%），平衡今日能量。`;
}
