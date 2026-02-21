/**
 * 五行加權計算引擎 V9.0
 * 核心算法：今日五行 = 本命五行×30% + 環境五行×70%
 * 日主：甲木，終身補運優先級：火>土>金
 */

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
  levels: Record<string, EnergyLevel>;
  dominantElement: string;
  weakestElement: string;
  coreContradiction: string;
}

export interface EnergyLevel {
  level: string;
  stars: number;
  description: string;
  emoji: string;
}

/**
 * 計算加權五行比例
 */
export function calculateWeightedElements(
  env: ElementRatio
): WeightedElementResult {
  const natal: ElementRatio = {
    木: NATAL_ELEMENT_RATIO.木,
    火: NATAL_ELEMENT_RATIO.火,
    土: NATAL_ELEMENT_RATIO.土,
    金: NATAL_ELEMENT_RATIO.金,
    水: NATAL_ELEMENT_RATIO.水,
  };

  const weighted: ElementRatio = {
    木: natal.木 * 0.3 + env.木 * 0.7,
    火: natal.火 * 0.3 + env.火 * 0.7,
    土: natal.土 * 0.3 + env.土 * 0.7,
    金: natal.金 * 0.3 + env.金 * 0.7,
    水: natal.水 * 0.3 + env.水 * 0.7,
  };

  const levels: Record<string, EnergyLevel> = {};
  for (const el of ["木", "火", "土", "金", "水"] as const) {
    levels[el] = assessEnergyLevel(weighted[el]);
  }

  // 找出最強和最弱的五行
  const sorted = Object.entries(weighted).sort(([, a], [, b]) => b - a);
  const dominantElement = sorted[0][0];
  const weakestElement = sorted[sorted.length - 1][0];

  // 生成核心矛盾描述
  const dominantPct = Math.round(weighted[dominantElement as keyof ElementRatio] * 100);
  const weakestPct = Math.round(weighted[weakestElement as keyof ElementRatio] * 100);
  const coreContradiction = generateCoreContradiction(weighted, dominantElement, weakestElement);

  return { weighted, natal, environment: env, levels, dominantElement, weakestElement, coreContradiction };
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

export function generateOutfitAdviceV9(result: WeightedElementResult): OutfitAdviceV9 {
  const { weighted, levels, coreContradiction } = result;

  // 確定補運策略：依終身優先級（火>土>金）
  // 找出最需要補充的五行（優先級中最弱的）
  let primarySupplement = "火";
  let secondarySupplement = "土";

  // 按補運優先級，找出最弱的
  for (const el of SUPPLEMENT_PRIORITY) {
    if (weighted[el as keyof ElementRatio] < 0.15) {
      primarySupplement = el;
      break;
    }
  }

  // 次要補充：在優先級中找第二弱的
  for (const el of SUPPLEMENT_PRIORITY) {
    if (el !== primarySupplement && weighted[el as keyof ElementRatio] < 0.25) {
      secondarySupplement = el;
      break;
    }
  }

  // 如果主要補充是火，次要是土（最常見情況）
  if (primarySupplement === secondarySupplement) {
    secondarySupplement = SUPPLEMENT_PRIORITY.find(el => el !== primarySupplement) || "土";
  }

  // 找出過旺的五行（需要避開）
  const overflowing = Object.entries(weighted)
    .filter(([, v]) => v >= 0.35)
    .map(([k]) => k);

  // 生成上下身穿搭
  const upperColors = ELEMENT_COLORS[primarySupplement] || ["白色"];
  const lowerColors = ELEMENT_COLORS[secondarySupplement] || ["黃色"];

  // 生成戰術解讀
  const upperExplanation = generateOutfitExplanation(primarySupplement, "upper", weighted, coreContradiction);
  const lowerExplanation = generateOutfitExplanation(secondarySupplement, "lower", weighted, coreContradiction);

  // 避開顏色（過旺五行，但排除補運色）
  const avoidList = overflowing
    .filter(el => el !== primarySupplement && el !== secondarySupplement)
    .map(el => ({
      colors: ELEMENT_COLORS[el] || [],
      element: el,
      reason: `${el}能量已過旺（${Math.round(weighted[el as keyof ElementRatio] * 100)}%），避免再添加同類能量`,
    }));

  const energyTag = `${primarySupplement}補運日｜${coreContradiction}`;
  const coreStrategy = `今日核心策略：用「${primarySupplement}」${getElementGoal(primarySupplement)}，用「${secondarySupplement}」${getElementGoal(secondarySupplement)}`;

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
  coreContradiction: string
): string {
  const pct = Math.round(weighted[element as keyof ElementRatio] * 100);
  const positionDesc = position === "upper" ? "上半身（主生發/滋養/內心）" : "下半身（主支撐/行動/根基）";

  const explanations: Record<string, Record<"upper" | "lower", string>> = {
    火: {
      upper: `今日火能量${pct < 15 ? "不足（" + pct + "%）" : "充沛（" + pct + "%）"}，上半身穿著火色系（紅/橙/紫）能直接點燃你的食神才華，讓創意和表達力全面爆發。這是甲木日主最需要的「洩木生財」通道。`,
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

  return explanations[element]?.[position] || `${positionDesc}穿著${element}色系，補充${element}元素能量。`;
}

// ============================================================
// 飲食建議生成
// ============================================================

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
}

export function generateDietaryAdvice(result: WeightedElementResult): DietaryAdvice {
  const { weighted } = result;

  // 按補運優先級，推薦缺乏的五行食物
  const supplements = [];
  for (const el of SUPPLEMENT_PRIORITY) {
    const pct = Math.round(weighted[el as keyof ElementRatio] * 100);
    if (pct < 20) {
      supplements.push({
        element: el,
        priority: SUPPLEMENT_PRIORITY.indexOf(el) + 1,
        foods: ELEMENT_FOODS[el] || [],
        advice: generateFoodAdvice(el, pct),
      });
    }
  }

  // 如果沒有明顯缺乏，推薦最高優先級
  if (supplements.length === 0) {
    supplements.push({
      element: "火",
      priority: 1,
      foods: ELEMENT_FOODS["火"],
      advice: "今日能量充沛，可享用辛辣刺激食物來強化食神才華能量。",
    });
  }

  // 過旺的五行要避開
  const avoid = Object.entries(weighted)
    .filter(([el, v]) => v >= 0.35 && !SUPPLEMENT_PRIORITY.includes(el as any))
    .map(([el]) => ({
      element: el,
      foods: ELEMENT_FOODS[el] || [],
      reason: `${el}能量已過旺（${Math.round(weighted[el as keyof ElementRatio] * 100)}%），避免再攝取同類食物，以免能量失衡。`,
    }));

  return { supplements, avoid };
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

export function recommendBraceletsV9(result: WeightedElementResult): BraceletRecommendationV9 {
  const { weighted, coreContradiction } = result;

  // 左手：補充最需要的五行（按補運優先級找最弱的）
  let leftElement = "火";
  for (const el of SUPPLEMENT_PRIORITY) {
    if (weighted[el as keyof ElementRatio] < 0.15) {
      leftElement = el;
      break;
    }
  }

  // 右手：補充次要需要的五行
  let rightElement = "土";
  for (const el of SUPPLEMENT_PRIORITY) {
    if (el !== leftElement && weighted[el as keyof ElementRatio] < 0.25) {
      rightElement = el;
      break;
    }
  }

  // 如果左右相同，取下一個優先級
  if (leftElement === rightElement) {
    const idx = SUPPLEMENT_PRIORITY.indexOf(rightElement as any);
    rightElement = SUPPLEMENT_PRIORITY[(idx + 1) % SUPPLEMENT_PRIORITY.length];
  }

  // 從手串資料庫選擇對應五行的手串
  const leftBracelet = selectBracelet(leftElement, "left");
  const rightBracelet = selectBracelet(rightElement, "right");

  const leftRole = leftBracelet.tacticalRoles[`補${leftElement}`] || leftBracelet.tacticalRoles.default;
  const rightRole = rightBracelet.tacticalRoles[`補${rightElement}`] || rightBracelet.tacticalRoles.default;

  const leftExplanation = generateBraceletExplanation(leftBracelet, leftElement, "left", weighted, coreContradiction);
  const rightExplanation = generateBraceletExplanation(rightBracelet, rightElement, "right", weighted, coreContradiction);

  const coreGoal = `今日核心目標：用「${leftElement}」${getElementGoal(leftElement)}，用「${rightElement}」${getElementGoal(rightElement)}`;

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
