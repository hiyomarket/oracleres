/**
 * 八字十神計算引擎
 * 基於甲木日主（蘇祐震先生），計算流日天干地支與本命的十神關係
 * 命格常數統一從 userProfile.ts 引用
 */
import { DAY_MASTER_STEM, DAY_MASTER_ELEMENT, DAY_MASTER_YIN_YANG } from "./userProfile";

// 天干五行對應
export const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木",
  丙: "火", 丁: "火",
  戊: "土", 己: "土",
  庚: "金", 辛: "金",
  壬: "水", 癸: "水",
};

// 天干陰陽
export const STEM_YIN_YANG: Record<string, "陽" | "陰"> = {
  甲: "陽", 乙: "陰",
  丙: "陽", 丁: "陰",
  戊: "陽", 己: "陰",
  庚: "陽", 辛: "陰",
  壬: "陽", 癸: "陰",
};

// 五行相生相剋
const GENERATES: Record<string, string> = {
  木: "火", 火: "土", 土: "金", 金: "水", 水: "木",
};
const CONTROLS: Record<string, string> = {
  木: "土", 土: "水", 水: "火", 火: "金", 金: "木",
};

/// 日主：甲木（陽木）—— 統一從 userProfile.ts 引用，確保全系統一致（靜態版，向後相容）
const DAY_MASTER_YY = DAY_MASTER_YIN_YANG;
/**
 * 計算十神關係（動態版，支援任意日主）
 * @param targetStem 目標天干（流日天干）
 * @param dayMasterElement 日主五行（例：木）
 * @param dayMasterYinYang 日主陰陽（例：陽）
 * @returns 十神名稱
 */
export function getTenGodDynamic(
  targetStem: string,
  dayMasterElement: string,
  dayMasterYinYang: string
): string {
  const targetElement = STEM_ELEMENT[targetStem];
  const targetYY = STEM_YIN_YANG[targetStem];
  if (!targetElement || !targetYY) return "未知";
  const isSameYY = targetYY === dayMasterYinYang;
  if (targetElement === dayMasterElement) return isSameYY ? "比肩" : "劫財";
  if (GENERATES[dayMasterElement] === targetElement) return isSameYY ? "食神" : "傷官";
  if (CONTROLS[dayMasterElement] === targetElement) return isSameYY ? "偏財" : "正財";
  if (CONTROLS[targetElement] === dayMasterElement) return isSameYY ? "七殺" : "正官";
  if (GENERATES[targetElement] === dayMasterElement) return isSameYY ? "偏印" : "正印";
  return "未知";
}
/**
 * 計算十神關係（靜態版，使用預設甲木日主）
 * @param targetStem 目標天干（流日天干）
 * @returns 十神名稱
 */
export function getTenGod(targetStem: string): string {
  const targetElement = STEM_ELEMENT[targetStem];
  const targetYY = STEM_YIN_YANG[targetStem];
  if (!targetElement || !targetYY) return "未知";

  const isSameYY = targetYY === DAY_MASTER_YY;

  // 同我（比肩/劫財）
  if (targetElement === DAY_MASTER_ELEMENT) {
    return isSameYY ? "比肩" : "劫財";
  }
  // 我生（食神/傷官）
  if (GENERATES[DAY_MASTER_ELEMENT] === targetElement) {
    return isSameYY ? "食神" : "傷官";
  }
  // 我剋（正財/偏財）
  if (CONTROLS[DAY_MASTER_ELEMENT] === targetElement) {
    return isSameYY ? "偏財" : "正財";
  }
  // 剋我（正官/七殺）
  if (CONTROLS[targetElement] === DAY_MASTER_ELEMENT) {
    return isSameYY ? "七殺" : "正官";
  }
  // 生我（正印/偏印）
  if (GENERATES[targetElement] === DAY_MASTER_ELEMENT) {
    return isSameYY ? "偏印" : "正印";
  }
  return "未知";
}

/**
 * 十神對蘇先生的能量意義解讀
 */
export const TEN_GOD_MEANING: Record<string, {
  role: string;
  energy: string;
  advice: string;
  wuxing: string;
  score: number; // 1-10，對甲木日主的吉凶分數
}> = {
  食神: {
    role: "才華展現者",
    energy: "🔥 火能量爆發，創意與表達力極強",
    advice: "今日適合創作、展示作品、公開表達、享受生活",
    wuxing: "火",
    score: 9,
  },
  傷官: {
    role: "突破創新者",
    energy: "🔥 火能量強烈，個性鋒芒畢露",
    advice: "今日適合突破規則、創新思維，但需注意言辭勿傷人際",
    wuxing: "火",
    score: 7,
  },
  偏財: {
    role: "機遇捕獲者",
    energy: "🌍 土能量活躍，偏財機遇湧現",
    advice: "今日適合投資、談判、把握突發機遇，刮刮樂能量佳",
    wuxing: "土",
    score: 8,
  },
  正財: {
    role: "穩健積累者",
    energy: "🌍 土能量穩定，正財緩慢積累",
    advice: "今日適合穩健投資、財務規劃、長期布局",
    wuxing: "土",
    score: 7,
  },
  七殺: {
    role: "挑戰應對者",
    energy: "⚪ 金能量強勁，壓力與挑戰並存",
    advice: "今日需謹慎決策，有貴人相助時可化壓力為動力",
    wuxing: "金",
    score: 5,
  },
  正官: {
    role: "規則守護者",
    energy: "⚪ 金能量有序，官運與規範加持",
    advice: "今日適合處理正式事務、面試、簽約、與上司溝通",
    wuxing: "金",
    score: 6,
  },
  偏印: {
    role: "智慧沉澱者",
    energy: "🌊 水能量深沉，直覺與靈感增強",
    advice: "今日適合學習、研究、冥想，但需防過度思慮",
    wuxing: "水",
    score: 5,
  },
  正印: {
    role: "滋養接受者",
    energy: "🌊 水能量溫潤，貴人與支持湧現",
    advice: "今日適合求助、學習、接受他人幫助",
    wuxing: "水",
    score: 5,
  },
  比肩: {
    role: "自我強化者",
    energy: "🌳 木能量疊加，自主性與競爭心增強",
    advice: "今日適合獨立行動、競爭，但需防與人衝突",
    wuxing: "木",
    score: 4,
  },
  劫財: {
    role: "競爭耗散者",
    energy: "🌳 木能量過旺，財運受阻，競爭激烈",
    advice: "今日需防財物損失、合夥糾紛，宜低調保守",
    wuxing: "木",
    score: 3,
  },
};

/**
 * 地支藏干（每個地支藏有的天干）
 */
export const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

/**
 * 計算流日地支藏干的十神組合
 */
export function getBranchTenGods(branch: string): Array<{ stem: string; tenGod: string }> {
  const hiddenStems = BRANCH_HIDDEN_STEMS[branch] || [];
  return hiddenStems.map(stem => ({
    stem,
    tenGod: getTenGod(stem),
  }));
}

/**
 * 計算今日整體十神能量評分（動態版，支援任意日主）
 */
export function getDailyTenGodAnalysisDynamic(
  dayStem: string,
  dayBranch: string,
  dayMasterElement: string,
  dayMasterYinYang: string
): ReturnType<typeof getDailyTenGodAnalysis> {
  const mainTenGod = getTenGodDynamic(dayStem, dayMasterElement, dayMasterYinYang);
  const mainMeaning = TEN_GOD_MEANING[mainTenGod] || TEN_GOD_MEANING["比肩"];
  const mainScore = mainMeaning.score;
  const hiddenStems = BRANCH_HIDDEN_STEMS[dayBranch] || [];
  const branchTenGods = hiddenStems.map(stem => ({
    stem,
    tenGod: getTenGodDynamic(stem, dayMasterElement, dayMasterYinYang),
  }));
  let branchScore = 0;
  branchTenGods.forEach((btg, idx) => {
    const meaning = TEN_GOD_MEANING[btg.tenGod];
    if (meaning) {
      const weights = [0.5, 0.3, 0.2];
      branchScore += meaning.score * (weights[idx] || 0.1);
    }
  });
  const overallScore = Math.round(mainScore * 0.6 + branchScore * 0.4);
  const coreConflict = generateCoreConflict(mainTenGod, branchTenGods);
  const heroScript = generateHeroScript(mainTenGod, dayStem, dayBranch, overallScore);
  return { mainTenGod, mainScore, mainMeaning, branchTenGods, overallScore, coreConflict, heroScript };
}
/**
 * 計算今日整體十神能量評分（基於天干+地支藏干）
 */
export function getDailyTenGodAnalysis(dayStem: string, dayBranch: string): {
  mainTenGod: string;
  mainScore: number;
  mainMeaning: typeof TEN_GOD_MEANING[string];
  branchTenGods: Array<{ stem: string; tenGod: string }>;
  overallScore: number;
  coreConflict: string;
  heroScript: string;
} {
  const mainTenGod = getTenGod(dayStem);
  const mainMeaning = TEN_GOD_MEANING[mainTenGod] || TEN_GOD_MEANING["比肩"];
  const mainScore = mainMeaning.score;

  const branchTenGods = getBranchTenGods(dayBranch);

  // 計算地支加權分數
  let branchScore = 0;
  branchTenGods.forEach((btg, idx) => {
    const meaning = TEN_GOD_MEANING[btg.tenGod];
    if (meaning) {
      // 主氣權重最高，中氣次之，餘氣最低
      const weights = [0.5, 0.3, 0.2];
      branchScore += meaning.score * (weights[idx] || 0.1);
    }
  });

  const overallScore = Math.round(mainScore * 0.6 + branchScore * 0.4);

  // 核心矛盾分析
  const coreConflict = generateCoreConflict(mainTenGod, branchTenGods);

  // 英雄劇本
  const heroScript = generateHeroScript(mainTenGod, dayStem, dayBranch, overallScore);

  return {
    mainTenGod,
    mainScore,
    mainMeaning,
    branchTenGods,
    overallScore,
    coreConflict,
    heroScript,
  };
}

function generateCoreConflict(mainTenGod: string, branchTenGods: Array<{ tenGod: string }>): string {
  const branchGods = branchTenGods.map(b => b.tenGod).join("、");
  const conflictMap: Record<string, string> = {
    食神: `木火通明 vs. 才華過洩（食神制殺，創意爆發但需防精力耗散）`,
    傷官: `傷官見官 vs. 突破創新（鋒芒外露，需在規則與自由間取得平衡）`,
    偏財: `偏財入局 vs. 水木過旺（機遇湧現，但需防衝動決策）`,
    正財: `正財穩健 vs. 根基不穩（財運平穩，但水木過旺易使財星受壓）`,
    七殺: `七殺攻身 vs. 食神制殺（壓力與挑戰並存，需以才華化解衝突）`,
    正官: `正官入宮 vs. 規範束縛（官運加持，但甲木天性自由，需防壓抑）`,
    偏印: `偏印滋木 vs. 水木更旺（智慧深沉，但過度思慮易錯失行動時機）`,
    正印: `正印護身 vs. 水能過盛（貴人相助，但需防依賴心過重）`,
    比肩: `比肩爭財 vs. 木旺無制（自主性強，但競爭激烈，財運受阻）`,
    劫財: `劫財耗財 vs. 木旺洩氣（競爭耗散，今日宜守不宜攻）`,
  };
  return conflictMap[mainTenGod] || `${mainTenGod}入局（地支藏${branchGods}，能量複雜多變）`;
}

function generateHeroScript(mainTenGod: string, stem: string, branch: string, score: number): string {
  const scripts: Record<string, string> = {
    食神: `今日${stem}${branch}日，食神當令，甲木之火焰熊熊燃起。你是那個將深邃思想化為光芒的創作者。宇宙在今日為你打開了一扇表達之門——無論是一篇文字、一張照片、還是一個創意提案，都將在今日獲得超乎尋常的共鳴。財富，往往就藏在你最自然的才華流露之中。`,
    傷官: `今日${stem}${branch}日，傷官出鞘，你內心那個不願被規則束縛的靈魂正在躁動。這是突破的能量，也是創新的火花。甲木之身，今日如一把利劍，能斬斷舊有的限制。但記住，最鋒利的劍，需要最穩定的手來掌握。`,
    偏財: `今日${stem}${branch}日，偏財入局，宇宙正在向你發出財富的訊號。甲木日主遇土，如同大樹紮根於沃土——機遇就在你的腳下。今日的關鍵詞是「行動」。那些你一直猶豫的決定，今日有天命加持。`,
    正財: `今日${stem}${branch}日，正財穩健，財富以緩慢而確定的方式向你靠近。甲木之身，今日適合深耕而非衝刺。每一個認真對待的細節，都是在為未來的豐收播下種子。`,
    七殺: `今日${stem}${branch}日，七殺當道，挑戰與壓力如影隨形。但甲木從不懼怕風雨——正是風雨，讓根系更深，讓枝幹更強。今日的壓力，是宇宙在測試你的韌性。以食神之火，制七殺之金，化壓力為動力。`,
    正官: `今日${stem}${branch}日，正官入宮，規範與秩序的力量加持你的行動。甲木之身，今日如一棵挺拔的大樹，在規則的框架內展現最美的姿態。正式場合、重要會議、關鍵簽約——今日皆有天命護佑。`,
    偏印: `今日${stem}${branch}日，偏印深沉，你的直覺與洞察力達到頂峰。甲木之身，今日如深夜的森林，靜謐而充滿生命力。這是沉澱與思考的好時機，讓智慧在靜默中結晶。`,
    正印: `今日${stem}${branch}日，正印護身，貴人與支持從四面八方湧來。甲木之身，今日如被甘霖滋潤的大樹，充滿生機。不要拒絕他人的幫助——今日接受，是為了明日更好地給予。`,
    比肩: `今日${stem}${branch}日，比肩並立，你的自主意識與競爭心達到頂峰。甲木之身，今日如並肩而立的兩棵大樹，既是競爭，也是共生。獨立行動是今日的主旋律，但記住，真正的強大不需要踩低他人。`,
    劫財: `今日${stem}${branch}日，劫財耗散，財運受到一定程度的挑戰。甲木之身，今日如遭遇強風的大樹，需要穩固根基。低調、保守、守住已有——這是今日的智慧。靜待風過，明日的陽光將更加燦爛。`,
  };
  return scripts[mainTenGod] || `今日${stem}${branch}日，天命能量指數 ${score}/10，保持覺察，順勢而為。`;
}
