/**
 * V11.0 全鏈路動態共振系統 — 單元測試
 * 涵蓋：daYunEngine / outfitStrategy V3.0 / decisionSupportEngine
 */

import { describe, it, expect } from 'vitest';
import { calculateDaYun, formatDaYunSummary } from './lib/daYunEngine';
import { generateOutfitAdviceV11 } from './lib/outfitStrategy';
import { generateDailyDecisionReport } from './lib/decisionSupportEngine';
import { getYearlyAnalysis } from './lib/yearlyAnalysis';
import type { WeightedElementResult } from './lib/wuxingEngine';
import type { DaYunResult } from './lib/daYunEngine';

// ─── 測試輔助數據 ────────────────────────────────────────────────

const mockWeightedResult: WeightedElementResult = {
  weighted: { 木: 0.42, 火: 0.18, 土: 0.18, 金: 0.12, 水: 0.10 },
  natal:    { 木: 0.42, 火: 0.11, 土: 0.09, 金: 0.04, 水: 0.35 },
  environment: { 木: 0.42, 火: 0.22, 土: 0.23, 金: 0.17, 水: 0.00 },
  strategy: '食神生財',
  tenGod: '食神',
  dominantElement: '木',
  weakestElement: '金',
  envWeight: 0.70,
  selfWeight: 0.30,
};

// ─── daYunEngine 測試 ────────────────────────────────────────────

describe('daYunEngine', () => {
  it('calculateDaYun 應正確計算當前大運', () => {
    const result = calculateDaYun(1984);
    expect(result).toBeDefined();
    expect(result.currentDaYun).toBeDefined();
    expect(result.currentDaYun.stem).toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
    expect(result.currentDaYun.branch).toMatch(/[子丑寅卯辰巳午未申酉戌亥]/);
    expect(result.currentDaYun.startAge).toBeGreaterThanOrEqual(0);
    expect(result.currentDaYun.endAge).toBeGreaterThan(result.currentDaYun.startAge);
    expect(result.currentDaYun.yearsRemaining).toBeGreaterThanOrEqual(0);
  });

  it('calculateDaYun 應包含完整的大運影響評估', () => {
    const result = calculateDaYun(1984);
    expect(result.daYunInfluence).toBeDefined();
    expect(result.daYunInfluence.auspiciousness).toMatch(/吉|凶|平/);
    expect(result.daYunInfluence.weightAdjustment).toBeGreaterThanOrEqual(-0.10);
    expect(result.daYunInfluence.weightAdjustment).toBeLessThanOrEqual(0.10);
    expect(result.daYunInfluence.strategyBias).toBeDefined();
  });

  it('calculateDaYun 應包含完整大運表', () => {
    const result = calculateDaYun(1984);
    expect(result.allDaYun).toBeDefined();
    expect(Array.isArray(result.allDaYun)).toBe(true);
    expect(result.allDaYun.length).toBeGreaterThan(0);
  });

  it('formatDaYunSummary 應生成非空的摘要文字', () => {
    const result = calculateDaYun(1984);
    const summary = formatDaYunSummary(result);
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(10);
    expect(summary).toContain('大運');
  });

  it('calculateDaYun 傳入不同日期應產生不同剩餘年數', () => {
    const now = new Date();
    const past = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const result1 = calculateDaYun(1984, now);
    const result2 = calculateDaYun(1984, past);
    // 不同日期計算的剩餘年數應不同
    expect(result1.currentDaYun.yearsRemaining)
      .not.toBe(result2.currentDaYun.yearsRemaining);
  });
});

// ─── outfitStrategy V3.0 測試 ────────────────────────────────────

describe('outfitStrategy V3.0 (generateOutfitAdviceV11)', () => {
  const daYunResult = calculateDaYun(1984);

  it('應生成包含基礎穿搭建議的結果', () => {
    const result = generateOutfitAdviceV11(
      '食神',
      '食神生財',
      daYunResult.currentDaYun.role,
      daYunResult.currentDaYun.theme,
      '上弦月',
      'first_quarter'
    );
    expect(result).toBeDefined();
    expect(result.topColor).toBeDefined();
    expect(result.bottomColor).toBeDefined();
    expect(result.shoesColor).toBeDefined();
    expect(result.accentColor).toBeDefined();
    expect(result.summary).toBeDefined();
  });

  it('應生成包含推理文案的結果', () => {
    const result = generateOutfitAdviceV11(
      '食神',
      '食神生財',
      daYunResult.currentDaYun.role,
      daYunResult.currentDaYun.theme,
      '上弦月',
      'first_quarter'
    );
    expect(result.reasoning).toBeDefined();
    expect(typeof result.reasoning).toBe('string');
    expect(result.reasoning.length).toBeGreaterThan(10);
  });

  it('應生成包含月相說明的結果', () => {
    const result = generateOutfitAdviceV11(
      '食神',
      '食神生財',
      daYunResult.currentDaYun.role,
      daYunResult.currentDaYun.theme,
      '上弦月',
      'first_quarter'
    );
    expect(result.moonPhaseNote).toBeDefined();
    expect(typeof result.moonPhaseNote).toBe('string');
    expect(result.moonPhaseNote.length).toBeGreaterThan(0);
  });

  it('不同十神應產生不同穿搭建議', () => {
    const daYun = calculateDaYun(1984);
    const resultShiShen = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '上弦月', 'first_quarter');
    const resultZhengCai = generateOutfitAdviceV11('正財', '均衡守成', daYun.currentDaYun.role, daYun.currentDaYun.theme, '上弦月', 'first_quarter');
    // 食神（火）和正財（土）的上衣主色應不同
    expect(resultShiShen.topColor).not.toBe(resultZhengCai.topColor);
  });

  it('傳入 userContext 應影響穿搭建議', () => {
    const daYun = calculateDaYun(1984);
    const resultFormal = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '上弦月', 'first_quarter', { event: 'important_meeting' });
    // 重要會議場合應有 contextNote
    expect(resultFormal.contextNote).toBeDefined();
    expect(typeof resultFormal.contextNote).toBe('string');
    expect(resultFormal.contextNote!.length).toBeGreaterThan(0);
  });

  it('creative_presentation 創意發表場合應有情境說明', () => {
    const daYun = calculateDaYun(1984);
    const result = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '上弦月', 'first_quarter', { event: 'creative_presentation' });
    expect(result.contextNote).toBeDefined();
    expect(result.contextNote).toContain('創意發表');
  });

  it('rest_day 靜養充電日應切換均衡守成模式', () => {
    const daYun = calculateDaYun(1984);
    const result = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '上弦月', 'first_quarter', { event: 'rest_day' });
    expect(result.contextNote).toBeDefined();
    expect(result.contextNote).toContain('靜養充電');
    // 靜養充電日應切換為中性色系
    expect(result.topColor).toContain('大地色');
  });

  it('月相影響應反映在結果中', () => {
    const daYun = calculateDaYun(1984);
    const resultFullMoon = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '滿月', 'full');
    const resultNewMoon = generateOutfitAdviceV11('食神', '食神生財', daYun.currentDaYun.role, daYun.currentDaYun.theme, '新月', 'new');
    // 滿月和新月的月相說明應不同
    expect(resultFullMoon.moonPhaseNote).not.toBe(resultNewMoon.moonPhaseNote);
  });
});

// ─── decisionSupportEngine 測試 ──────────────────────────────────

describe('decisionSupportEngine', () => {
  const daYunResult = calculateDaYun(1984);

  it('應生成包含六類決策建議的每日報告', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    expect(report).toBeDefined();
    expect(report.advices).toBeDefined();
    expect(report.advices.length).toBe(6);
  });

  it('每個決策建議應包含必要欄位', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    for (const advice of report.advices) {
      expect(advice.category).toBeDefined();
      expect(advice.action).toBeDefined();
      expect(advice.reasoning).toBeDefined();
      expect(advice.score).toBeGreaterThanOrEqual(1);
      expect(advice.score).toBeLessThanOrEqual(10);
    }
  });

  it('整體評分應在 1-10 範圍內', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    expect(report.overallScore).toBeGreaterThanOrEqual(1);
    expect(report.overallScore).toBeLessThanOrEqual(10);
  });

  it('應識別最佳與最需謹慎的決策類型', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    expect(report.bestCategory).toBeDefined();
    expect(report.cautionCategory).toBeDefined();
    expect(report.bestCategory).not.toBe(report.cautionCategory);
  });

  it('應包含每日一句話總結', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    expect(typeof report.dailySummary).toBe('string');
    expect(report.dailySummary.length).toBeGreaterThan(10);
  });

  it('應包含大運背景說明', () => {
    const report = generateDailyDecisionReport(mockWeightedResult, daYunResult, '2026-03-23');
    expect(typeof report.daYunContext).toBe('string');
    expect(report.daYunContext).toContain('大運');
  });

  it('水能量偏高時財務決策評分應偏低', () => {
    const waterHeavyResult: WeightedElementResult = {
      ...mockWeightedResult,
      weighted: { 木: 0.30, 火: 0.08, 土: 0.05, 金: 0.07, 水: 0.50 },
    };
    const report = generateDailyDecisionReport(waterHeavyResult, daYunResult, '2026-03-23');
    const financeAdvice = report.advices.find(a => a.category === 'finance');
    expect(financeAdvice).toBeDefined();
    expect(financeAdvice!.score).toBeLessThan(7);
  });

  it('火能量充足時事業決策評分應偏高', () => {
    const fireRichResult: WeightedElementResult = {
      ...mockWeightedResult,
      weighted: { 木: 0.20, 火: 0.35, 土: 0.25, 金: 0.12, 水: 0.08 },
    };
    const report = generateDailyDecisionReport(fireRichResult, daYunResult, '2026-03-23');
    const careerAdvice = report.advices.find(a => a.category === 'career');
    expect(careerAdvice).toBeDefined();
    expect(careerAdvice!.score).toBeGreaterThan(5);
  });
});

// ─── 塔羅流年計算驗證測試（V11.3 修正）──────────────────
// getYearlyAnalysis 已在檔案頂部 import

describe('塔羅流年計算（命理顧問 V11.3 修正）', () => {
  it('1984/11/26 的中間靈魂數應為 10，2026 年生日未到應走 2025 流年（太陽年）', () => {
    // 月：11 → 1+1=2，日：26 → 2+6=8，中間靈魂數：2+8=10
    // 今日是 2026-03-23，生日 11/26 未到，有效流年 = 2025
    // 2025 → 2+0+2+5=9，9+10=19（太陽年）
    const result2026 = getYearlyAnalysis(2026, {
      middleNumber: 10,
      birthMonth: 11,
      birthDay: 26,
    });
    expect(result2026.tarot.number).toBe(19);
    expect(result2026.tarot.name).toBe('太陽');
    expect(result2026.tarot.effectiveYear).toBe(2025);
  });

  it('2027 年（生日 11/26 未到）應走 2026 流年（審判年）', () => {
    // 今日是 2026-03-23，生日 11/26 未到，有效流年 = 2026
    // 2026 → 2+0+2+6=10，10+10=20（審判年）
    const result2027 = getYearlyAnalysis(2027, {
      middleNumber: 10,
      birthMonth: 11,
      birthDay: 26,
    });
    expect(result2027.tarot.number).toBe(20);
    expect(result2027.tarot.name).toBe('審判');
    expect(result2027.tarot.effectiveYear).toBe(2026);
  });

  it('月份 >= 10 才縮減，日期 > 22 才縮減', () => {
    // 月 9（不縮減）+ 日 15（不縮減，<=22）= 24 → 2+4=6（戀人）
    // 有效流年 2025（9/15 未到），2025→9，9+6=15（惡魔年）
    const result = getYearlyAnalysis(2026, {
      middleNumber: 6,
      birthMonth: 9,
      birthDay: 15,
    });
    expect(result.tarot.number).toBe(15);
    expect(result.tarot.name).toBe('惡魔');
  });
});
