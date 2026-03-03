/**
 * 神喻穿搭 V10.0 - 動態策略判定層 (Dynamic Strategy Decision Layer)
 * 
 * 位置：calculateWeightedElements() 之後，generateOutfitAdviceV9() 之前
 * 
 * 核心升級：
 * 從「機械地補足短板」靜態策略 → 升級為「審時度勢、順勢而為」動態策略
 * 
 * 五大策略（按優先順序判定）：
 * 1. 強勢補弱 - 喜用神極度不足時，雪中送炭
 * 2. 借力打力 - 忌神過旺時，圍魏救趙
 * 3. 順勢生旺 - 喜用神中等且有生旺條件時，釜底抽薪
 * 4. 食神生財 - 才華爆棚但財星弱時，點石成金
 * 5. 均衡守成 - Fallback，穩紮穩打
 */

import type { WeightedElementResult, ElementRatio } from "./wuxingEngine";
import type { StrategyThresholdConfig } from "./strategyThresholdCache";

// ── 五行相生關係 ─────────────────────────────────────────────────
// 木生火、火生土、土生金、金生水、水生木
const GENERATES: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

// 反向：誰能生出我（我的「母」）
const GENERATED_BY: Record<string, string> = {
  火: "木",
  土: "火",
  金: "土",
  水: "金",
  木: "水",
};

// ── 五行相剋關係 ─────────────────────────────────────────────────
// 木剋土、土剋水、水剋火、火剋金、金剋木
const CONTROLS: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

// 反向：誰能剋制我（我的「剋我者」）
const CONTROLLED_BY: Record<string, string> = {
  土: "木",
  水: "土",
  火: "水",
  金: "火",
  木: "金",
};

// ── 策略閾值常數 ─────────────────────────────────────────────────
const DANGER_THRESHOLD = 0.08;    // 危險閾值：第一優先喜用神 < 8%
const COLLAPSE_THRESHOLD = 0.03;  // 崩潰閾值：任何喜用神 < 3%
const ENEMY_DOMINANT = 0.40;      // 忌神主導閾值：單一忌神 ≥ 40%
const ENEMY_COMBINED = 0.55;      // 忌神合計閾值：兩個忌神總和 > 55%
const TALENT_STRONG = 0.25;       // 才華旺盛閾值：食傷五行 ≥ 25%
const WEALTH_WEAK = 0.15;         // 財星偏弱閾值：財星五行 ≤ 15%
const MEDIUM_LEVEL_MIN = 0.15;    // 中等水平下限
const MEDIUM_LEVEL_MAX = 0.25;    // 中等水平上限
const SUPPORT_THRESHOLD = 0.15;   // 生旺支援閾值：生旺來源 ≥ 15%

// ── 策略輸出介面 ─────────────────────────────────────────────────
export interface DailyStrategyObject {
  strategyName: "強勢補弱" | "順勢生旺" | "借力打力" | "食神生財" | "均衡守成";
  primaryTargetElement: string;    // 今日主攻五行（上身/左手）
  secondaryTargetElement: string;  // 今日輔助五行（下身/右手）
  coreStrategyText: string;        // 核心指導思想（一句話）
  aiPromptHint: string;            // 給 AI 點評的關鍵詞提示
  strategyReason: string;          // 策略觸發原因（供前端顯示）
  energyTag: string;               // 能量標籤
}

/**
 * 動態策略判定主函數
 * 
 * @param result - calculateWeightedElements() 的輸出
 * @param favorableElements - 用戶喜用神（中文，按優先級排序，如 ["火","土","金"]）
 * @param unfavorableElements - 用戶忌神（中文，如 ["水","木"]）
 * @param mode - 情境模式（影響策略判定的優先級）
 * @param dbThresholds - 從 DB 快取讀取的閾值設定（可選，沒有則用硬編碼常數）
 */
export function determineDailyStrategy(
  result: WeightedElementResult,
  favorableElements: string[],
  unfavorableElements: string[],
  mode: "default" | "love" | "work" | "leisure" | "travel" = "default",
  dbThresholds?: StrategyThresholdConfig[],
): DailyStrategyObject {
  const { weighted } = result;

  // 情境模式修正：不同模式下的五行優先級
  const modeAdjustedFavorable = applyModeAdjustment(favorableElements, mode);

  const primary = modeAdjustedFavorable[0] ?? "火";
  const secondary = modeAdjustedFavorable[1] ?? "土";
  const tertiary = modeAdjustedFavorable[2] ?? "金";

  // 從 DB 閾值覆蓋硬編碼常數（如果有提供）
  const getThreshold = (name: string, key: "weakThreshold" | "strongThreshold"): number => {
    if (!dbThresholds) return -1;
    const t = dbThresholds.find(t => t.strategyName === name);
    return t ? t[key] / 100 : -1; // DB 存整數百分比，轉為小數
  };
  const isEnabled = (name: string): boolean => {
    if (!dbThresholds) return true;
    const t = dbThresholds.find(t => t.strategyName === name);
    return t ? t.enabled : true;
  };

  // ── 策略 1：強勢補弱 ─────────────────────────────────────────────
  // 觸發條件：第一優先喜用神 < 8% 或 任何喜用神 < 3%
  const primaryPct = weighted[primary as keyof ElementRatio] ?? 0;
  const dangerThr = getThreshold("強勢補弱", "weakThreshold");
  const collapseThr = getThreshold("強勢補弱", "strongThreshold");
  const effectiveDangerThreshold = dangerThr >= 0 ? dangerThr : DANGER_THRESHOLD;
  const effectiveCollapseThreshold = collapseThr >= 0 ? collapseThr : COLLAPSE_THRESHOLD;
  const isDangerouslyWeak = isEnabled("強勢補弱") && primaryPct < effectiveDangerThreshold;

  let collapsingElement: string | null = null;
  if (isEnabled("強勢補弱")) for (const el of modeAdjustedFavorable) {
    if ((weighted[el as keyof ElementRatio] ?? 0) < effectiveCollapseThreshold) {
      collapsingElement = el;
      break;
    }
  }

  if (isDangerouslyWeak || collapsingElement) {
    const targetEl = collapsingElement ?? primary;
    const targetPct = Math.round((weighted[targetEl as keyof ElementRatio] ?? 0) * 100);
    const supportEl = modeAdjustedFavorable.find(el => el !== targetEl) ?? secondary;
    return {
      strategyName: "強勢補弱",
      primaryTargetElement: targetEl,
      secondaryTargetElement: supportEl,
      coreStrategyText: `今日${targetEl}能量極度不足（${targetPct}%），需要雪中送炭，全力補充${targetEl}能量以穩住根基。`,
      aiPromptHint: "雪中送炭，絕地反擊",
      strategyReason: `${targetEl}能量${targetPct < 3 ? "崩潰（" + targetPct + "%）" : "危險（" + targetPct + "%）"}，觸發強勢補弱策略`,
      energyTag: `強勢補弱日｜${targetEl}極弱(${targetPct}%)`,
    };
  }

  // ── 策略 2：借力打力 ─────────────────────────────────────────────
  // 觸發條件：某忌神 ≥ 40% 且直接尅制核心喜用神，或兩個忌神合計 > 55%
  const enemyDominantThr = getThreshold("借力打力", "strongThreshold");
  const enemyCombinedThr = getThreshold("借力打力", "weakThreshold");
  const effectiveEnemyDominant = enemyDominantThr >= 0 ? enemyDominantThr : ENEMY_DOMINANT;
  const effectiveEnemyCombined = enemyCombinedThr >= 0 ? enemyCombinedThr : ENEMY_COMBINED;

  const dominantEnemy = isEnabled("借力打力") ? unfavorableElements.find(
    el => (weighted[el as keyof ElementRatio] ?? 0) >= effectiveEnemyDominant
  ) : undefined;

  const enemyCombined = unfavorableElements.reduce(
    (sum, el) => sum + (weighted[el as keyof ElementRatio] ?? 0),
    0
  );

  if (dominantEnemy || (isEnabled("借力打力") && enemyCombined > effectiveEnemyCombined)) {
    const mainEnemy = dominantEnemy ?? unfavorableElements[0] ?? "水";
    const mainEnemyPct = Math.round((weighted[mainEnemy as keyof ElementRatio] ?? 0) * 100);
    // 找能剋制這個忌神的五行
    const counterElement = CONTROLLED_BY[mainEnemy];
    // 如果剋制元素也是喜用神，使用它；否則用第一優先喜用神
    const targetEl = modeAdjustedFavorable.includes(counterElement) ? counterElement : primary;
    const supportEl = primary === targetEl ? secondary : primary;
    return {
      strategyName: "借力打力",
      primaryTargetElement: targetEl,
      secondaryTargetElement: supportEl,
      coreStrategyText: `今日${mainEnemy}能量過旺（${mainEnemyPct}%），需要圍魏救趙，以${targetEl}之力制衡${mainEnemy}，化壓力為動力。`,
      aiPromptHint: "圍魏救趙，借力打力",
      strategyReason: `忌神${mainEnemy}達${mainEnemyPct}%${enemyCombined > ENEMY_COMBINED ? `，忌神合計${Math.round(enemyCombined * 100)}%` : ""}，觸發借力打力策略`,
      energyTag: `借力打力日｜${mainEnemy}過旺(${mainEnemyPct}%)`,
    };
  }

  // ── 策略 3：順勢生旺 ─────────────────────────────────────────────
  // 觸發條件：核心喜用神處於中等水平(15%-25%) 且 能生旺它的五行也不弱(≥15%)
  const medMinThr = getThreshold("順勢生旺", "weakThreshold");
  const medMaxThr = getThreshold("順勢生旺", "strongThreshold");
  const effectiveMedMin = medMinThr >= 0 ? medMinThr : MEDIUM_LEVEL_MIN;
  const effectiveMedMax = medMaxThr >= 0 ? medMaxThr : MEDIUM_LEVEL_MAX;
  const effectiveSupportThr = medMinThr >= 0 ? medMinThr : SUPPORT_THRESHOLD;

  if (isEnabled("順勢生旺")) for (const el of modeAdjustedFavorable) {
    const elPct = weighted[el as keyof ElementRatio] ?? 0;
    if (elPct >= effectiveMedMin && elPct <= effectiveMedMax) {   // 找能生旺這個喜用神的五行
      const generatorEl = GENERATED_BY[el];
      const generatorPct = weighted[generatorEl as keyof ElementRatio] ?? 0;
      if (generatorPct >= effectiveSupportThr) {
        const elPctRound = Math.round(elPct * 100);
        const genPctRound = Math.round(generatorPct * 100);
        const supportEl = modeAdjustedFavorable.find(e => e !== generatorEl) ?? secondary;
        return {
          strategyName: "順勢生旺",
          primaryTargetElement: generatorEl,
          secondaryTargetElement: el,
          coreStrategyText: `今日${generatorEl}能量充足（${genPctRound}%），可順勢生旺${el}（${elPctRound}%），釜底抽薪，讓能量自然流動放大。`,
          aiPromptHint: "釜底抽薪，順勢而為",
          strategyReason: `${el}能量中等(${elPctRound}%)，${generatorEl}能量充足(${genPctRound}%)，可順勢生旺，觸發順勢生旺策略`,
          energyTag: `順勢生旺日｜${generatorEl}→${el}`,
        };
      }
    }
  }
  // ── 策略 4：食神生財 ─────────────────────────────────────────────
  // 觸發條件：才術五行（食神/傷官，即日主所生的五行）旺盛(≥25%) 且 財星五行偏弱(≤15%)
  // 才術五行 = 日主能生出的五行（GENERATES[dayMasterElement]）
  // 財星五行 = 日主所尅的五行（CONTROLS[dayMasterElement]）
  // 由於我們只有 favorableElements 而非日主，用喜用神中的「食傷」代理
  // 策略：若喜用神中有一個五行能量旺盛(≥25%)，且另一個喜用神能量偏弱(≤15%)
  // 且前者能生出後者（或後者能被前者生出）
  const talentStrongThr = getThreshold("食神生財", "strongThreshold");
  const wealthWeakThr = getThreshold("食神生財", "weakThreshold");
  const effectiveTalentStrong = talentStrongThr >= 0 ? talentStrongThr : TALENT_STRONG;
  const effectiveWealthWeak = wealthWeakThr >= 0 ? wealthWeakThr : WEALTH_WEAK;

  if (isEnabled("食神生財")) for (const talentEl of modeAdjustedFavorable) {
    const talentPct = weighted[talentEl as keyof ElementRatio] ?? 0;
    if (talentPct >= effectiveTalentStrong) {    const wealthEl = GENERATES[talentEl]; // 才華生出的五行
      const wealthPct = weighted[wealthEl as keyof ElementRatio] ?? 0;
      // 如果生出的五行也是喜用神且偏弱
      if (modeAdjustedFavorable.includes(wealthEl) && wealthPct <= effectiveWealthWeak) {
        const talentPctRound = Math.round(talentPct * 100);
        const wealthPctRound = Math.round(wealthPct * 100);
        const decisionEl = modeAdjustedFavorable.find(e => e !== wealthEl && e !== talentEl) ?? tertiary;
        return {
          strategyName: "食神生財",
          primaryTargetElement: wealthEl,
          secondaryTargetElement: decisionEl,
          coreStrategyText: `今日${talentEl}才華能量爆棚（${talentPctRound}%），但${wealthEl}財星偏弱（${wealthPctRound}%），需要點石成金，把才華轉化為實際財富。`,
          aiPromptHint: "食神生財，點石成金",
          strategyReason: `${talentEl}才華旺盛(${talentPctRound}%)，${wealthEl}財星偏弱(${wealthPctRound}%)，觸發食神生財策略`,
          energyTag: `食神生財日｜${talentEl}旺→${wealthEl}弱`,
        };
      }
    }
  }

  // ── 策略 5：均衡守成（Fallback）─────────────────────────────
  const primaryPctRound = Math.round(primaryPct * 100);
  const secondaryPct = Math.round((weighted[secondary as keyof ElementRatio] ?? 0) * 100);
  return {
    strategyName: "均衡守成",
    primaryTargetElement: primary,
    secondaryTargetElement: secondary,
    coreStrategyText: `今日五行能量相對均衡，穩紮穩打，以${primary}為主（${primaryPctRound}%）、${secondary}為輔（${secondaryPct}%），保持優勢。`,
    aiPromptHint: "穩紮穩打，保持優勢",
    strategyReason: `五行能量均衡，無特殊觸發條件，採用均衡守成策略`,
    energyTag: `均衡守成日｜${primary}主導`,
  };
}

/**
 * 情境模式五行優先級調整
 * 不同情境下，對喜用神的排序進行動態調整
 */
function applyModeAdjustment(
  favorableElements: string[],
  mode: "default" | "love" | "work" | "leisure" | "travel",
): string[] {
  if (mode === "default") return favorableElements;

  // 各情境的五行偏好（按重要性排序）
  const modePreference: Record<string, string[]> = {
    love:    ["水", "木", "火", "土", "金"], // 水木主感情流動，桃花能量
    work:    ["金", "火", "土", "木", "水"], // 金主決斷，火主創意，土主財富
    leisure: ["木", "土", "水", "火", "金"], // 木主放鬆，土主穩定
    travel:  ["火", "木", "金", "水", "土"], // 火主活力，木主生長，金主方向
  };

  const pref = modePreference[mode] ?? favorableElements;

  // 交叉加權：喜用神中符合情境偏好的排前面，其餘按原順序補充
  return [
    ...favorableElements.filter(el => pref.includes(el)).sort(
      (a, b) => pref.indexOf(a) - pref.indexOf(b)
    ),
    ...favorableElements.filter(el => !pref.includes(el)),
  ];
}

/**
 * 取得策略對應的情境說明文字（供前端顯示）
 */
export function getStrategyDescription(strategyName: DailyStrategyObject["strategyName"]): {
  icon: string;
  title: string;
  subtitle: string;
  color: string;
} {
  const descriptions = {
    強勢補弱: {
      icon: "🔥",
      title: "強勢補弱",
      subtitle: "雪中送炭，絕地反擊",
      color: "text-red-400",
    },
    借力打力: {
      icon: "⚔️",
      title: "借力打力",
      subtitle: "圍魏救趙，化敵為友",
      color: "text-purple-400",
    },
    順勢生旺: {
      icon: "🌊",
      title: "順勢生旺",
      subtitle: "釜底抽薪，順勢而為",
      color: "text-blue-400",
    },
    食神生財: {
      icon: "✨",
      title: "食神生財",
      subtitle: "點石成金，才華變現",
      color: "text-yellow-400",
    },
    均衡守成: {
      icon: "☯️",
      title: "均衡守成",
      subtitle: "穩紮穩打，保持優勢",
      color: "text-green-400",
    },
  };
  return descriptions[strategyName];
}
