/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         天命共振系統 V11.0 — 大運計算引擎                       ║
 * ║         DaYun Engine: 十年大運週期計算                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * 大運是所有計算的「背景色」，為六層時間維度中的第二層：
 * 本命 → 大運 → 流年 → 流月 → 流日 → 流時
 *
 * 命主：甲木日主（陽年生，男命，順行大運）
 * 起運年齡：3歲（依節氣距離計算）
 */

// ─── 大運表（命主專屬靜態數據）────────────────────────────────────
/**
 * 蘇祐震先生大運排列
 * 甲子年生，男命，陽年順行
 * 起運：3歲（1987年）
 * 月柱：乙亥，順行大運從「丙子」開始
 */
export const DA_YUN_TABLE: DaYunEntry[] = [
  {
    stem: '丙', branch: '子', startAge: 3,  endAge: 12,
    element: '火', role: '食神',
    theme: '才華萌芽期，創意能量初展，火洩木之秀氣',
    weightAdjustment: 0.05,
    strategyBias: '順勢生旺',
  },
  {
    stem: '丁', branch: '丑', startAge: 13, endAge: 22,
    element: '火', role: '傷官',
    theme: '個性突破期，不拘一格，傷官見官需謹慎',
    weightAdjustment: 0.08,
    strategyBias: '順勢生旺',
  },
  {
    stem: '戊', branch: '寅', startAge: 23, endAge: 32,
    element: '土', role: '偏財',
    theme: '財運開拓期，偏財入大運，創業與機遇並存',
    weightAdjustment: 0.05,
    strategyBias: '食神生財',
  },
  {
    stem: '己', branch: '卯', startAge: 33, endAge: 42,
    element: '土', role: '正財',
    theme: '穩健積累期，正財入大運，事業與財富雙線並進',
    weightAdjustment: 0.03,
    strategyBias: '食神生財',
  },
  {
    stem: '庚', branch: '辰', startAge: 43, endAge: 52,
    element: '金', role: '七殺',
    theme: '決斷力強化期，事業突破，七殺制甲木需有食傷化殺',
    weightAdjustment: -0.05,
    strategyBias: '借力打力',
  },
  {
    stem: '辛', branch: '巳', startAge: 53, endAge: 62,
    element: '金', role: '正官',
    theme: '聲望建立期，正官入大運，社會地位與規則意識提升',
    weightAdjustment: -0.03,
    strategyBias: '均衡守成',
  },
  {
    stem: '壬', branch: '午', startAge: 63, endAge: 72,
    element: '水', role: '偏印',
    theme: '智慧沉澱期，偏印入大運，學術與靈性探索旺盛',
    weightAdjustment: -0.08,
    strategyBias: '均衡守成',
  },
  {
    stem: '癸', branch: '未', startAge: 73, endAge: 82,
    element: '水', role: '正印',
    theme: '傳承回饋期，正印入大運，教育與傳授他人之時',
    weightAdjustment: -0.10,
    strategyBias: '均衡守成',
  },
];

// ─── 接口定義 ────────────────────────────────────────────────────
export interface DaYunEntry {
  stem: string;           // 天干
  branch: string;         // 地支
  startAge: number;       // 起運年齡
  endAge: number;         // 結束年齡
  element: string;        // 主五行
  role: string;           // 對甲木日主的十神角色
  theme: string;          // 大運主題描述
  weightAdjustment: number; // 加權比例調整值 Δt（正值增強環境影響，負值增強本命影響）
  strategyBias: string | null; // 策略傾向建議
}

export interface DaYunResult {
  currentDaYun: {
    stem: string;
    branch: string;
    element: string;
    role: string;
    startAge: number;
    endAge: number;
    theme: string;
    /** 當前大運已進行的年數（0-9） */
    yearsElapsed: number;
    /** 當前大運剩餘年數 */
    yearsRemaining: number;
  };
  daYunInfluence: {
    /** 加權比例調整值 Δt，用於 wuxingEngine 動態比例調整 */
    weightAdjustment: number;
    /** 策略傾向建議 */
    strategyBias: string | null;
    /** 大運主題 */
    keyTheme: string;
    /** 大運五行對本命的吉凶評估 */
    auspiciousness: '大吉' | '吉' | '中性' | '凶' | '大凶';
  };
  /** 完整大運表（供前端展示） */
  allDaYun: DaYunEntry[];
}

// ─── 五行吉凶評估 ────────────────────────────────────────────────
const DA_YUN_AUSPICIOUSNESS: Record<string, DaYunResult['daYunInfluence']['auspiciousness']> = {
  '食神': '大吉',
  '傷官': '吉',
  '偏財': '吉',
  '正財': '大吉',
  '七殺': '凶',
  '正官': '中性',
  '偏印': '凶',
  '正印': '中性',
  '比肩': '中性',
  '劫財': '凶',
};

// ─── 核心計算函數 ────────────────────────────────────────────────
/**
 * 計算命主當前所處的大運
 * @param birthYear 出生年份（西元）
 * @param currentDate 當前日期（預設為今日）
 */
export function calculateDaYun(
  birthYear: number = 1984,
  currentDate: Date = new Date()
): DaYunResult {
  // 計算當前年齡（以台灣時間為準）
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const taiwanNow = new Date(currentDate.getTime() + taiwanOffset);
  const currentYear = taiwanNow.getUTCFullYear();
  const currentAge = currentYear - birthYear;

  // 找到當前大運
  let currentEntry = DA_YUN_TABLE[0];
  for (const entry of DA_YUN_TABLE) {
    if (currentAge >= entry.startAge && currentAge <= entry.endAge) {
      currentEntry = entry;
      break;
    }
  }

  // 若超過最後一個大運，取最後一個
  if (currentAge > DA_YUN_TABLE[DA_YUN_TABLE.length - 1].endAge) {
    currentEntry = DA_YUN_TABLE[DA_YUN_TABLE.length - 1];
  }

  const yearsElapsed = Math.max(0, currentAge - currentEntry.startAge);
  const yearsRemaining = Math.max(0, currentEntry.endAge - currentAge);
  const auspiciousness = DA_YUN_AUSPICIOUSNESS[currentEntry.role] ?? '中性';

  return {
    currentDaYun: {
      stem: currentEntry.stem,
      branch: currentEntry.branch,
      element: currentEntry.element,
      role: currentEntry.role,
      startAge: currentEntry.startAge,
      endAge: currentEntry.endAge,
      theme: currentEntry.theme,
      yearsElapsed,
      yearsRemaining,
    },
    daYunInfluence: {
      weightAdjustment: currentEntry.weightAdjustment,
      strategyBias: currentEntry.strategyBias,
      keyTheme: currentEntry.theme,
      auspiciousness,
    },
    allDaYun: DA_YUN_TABLE,
  };
}

/**
 * 取得大運對五行加權的調整後比例
 * @param baseEnvWeight 基礎環境五行權重（預設 0.70）
 * @param baseSelfWeight 基礎本命五行權重（預設 0.30）
 * @param daYunResult 大運計算結果
 */
export function getDaYunAdjustedWeights(
  baseEnvWeight: number = 0.70,
  baseSelfWeight: number = 0.30,
  daYunResult: DaYunResult
): { envWeight: number; selfWeight: number } {
  const delta = daYunResult.daYunInfluence.weightAdjustment;
  const envWeight = Math.min(0.85, Math.max(0.55, baseEnvWeight + delta));
  const selfWeight = Math.min(0.45, Math.max(0.15, baseSelfWeight - delta));
  return { envWeight, selfWeight };
}

/**
 * 格式化大運信息為可讀字串
 */
export function formatDaYunSummary(result: DaYunResult): string {
  const { currentDaYun, daYunInfluence } = result;
  return `${currentDaYun.stem}${currentDaYun.branch}大運（${currentDaYun.role}）｜${currentDaYun.startAge}-${currentDaYun.endAge}歲｜${daYunInfluence.auspiciousness}`;
}
