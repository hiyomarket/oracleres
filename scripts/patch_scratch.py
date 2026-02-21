"""Patch generateScratchStrategies in lotteryAlgorithm.ts"""
import re

with open('server/lib/lotteryAlgorithm.ts', 'r') as f:
    content = f.read()

# Find and replace the function body
old_func_start = "export function generateScratchStrategies(date: Date = new Date()): ScratchDenominationStrategy[] {"
old_func_end = "  return [strategy50, strategy100, strategy200, strategy500];\n}"

start_idx = content.find(old_func_start)
end_idx = content.find(old_func_end, start_idx) + len(old_func_end)

if start_idx == -1 or end_idx == -1:
    print("ERROR: Could not find function boundaries")
    exit(1)

new_func = '''export function generateScratchStrategies(date: Date = new Date()): ScratchDenominationStrategy[] {
  const base = generateLotteryNumbers(date);
  const sets = generateLotterySets(date);

  const strategy100: ScratchDenominationStrategy = {
    denomination: 100,
    label: "100元券",
    riskLevel: "保守",
    description: "天命入門第一步，以火土用神為核心，穩中求財。適合日常天命微調。",
    strategy: "選擇與今日日干共振最強的2-3個數字，重複出現即為天命暗示",
    primaryNumbers: [2, 7, 0, 5].filter(n => base.numbers.includes(n)).concat([2, 7, 0]).slice(0, 3),
    backupNumbers: base.luckyDigits.slice(0, 2),
    confidence: "high",
    buyCount: 3,
    maxBudget: 300,
  };

  const strategy200: ScratchDenominationStrategy = {
    denomination: 200,
    label: "200元券",
    riskLevel: "穩健",
    description: "三用神平衡佈局，火土金各司其職，財路寬廣。適合常規天命佈局。",
    strategy: "以天命核心組為主，搭配五行平衡組備選，兩組交替購買",
    primaryNumbers: sets[0]?.numbers ?? base.numbers.slice(0, 4),
    backupNumbers: sets[1]?.numbers.slice(0, 3) ?? base.bonusNumbers,
    confidence: "high",
    buyCount: 2,
    maxBudget: 400,
  };

  const strategy300: ScratchDenominationStrategy = {
    denomination: 300,
    label: "300元券",
    riskLevel: "積極",
    description: "小天命局，引入時辰加成，適合天命共振分數≥6分的日子。",
    strategy: "在吉時或大吉時辰購買，以時辰能量組為主要參考",
    primaryNumbers: sets[1]?.numbers ?? base.numbers.slice(0, 4),
    backupNumbers: base.numbers.slice(0, 3),
    confidence: base.energyAnalysis.overallLuck >= 6 ? "high" : "medium",
    buyCount: 2,
    maxBudget: 600,
  };

  const strategy500: ScratchDenominationStrategy = {
    denomination: 500,
    label: "500元券",
    riskLevel: "積極",
    description: "偏財星全力加持，結合時辰能量，適合偏財指數≥7的吉日。建議在最佳時辰購買。",
    strategy: "以時辰能量組為主，在最佳時辰（申/酉/戌時）購買，效果最強",
    primaryNumbers: sets[2]?.numbers ?? base.numbers,
    backupNumbers: base.numbers.slice(0, 3),
    confidence: base.energyAnalysis.overallLuck >= 7 ? "high" : "medium",
    buyCount: 1,
    maxBudget: 500,
  };

  const strategy1000: ScratchDenominationStrategy = {
    denomination: 1000,
    label: "1000元券",
    riskLevel: "天命",
    description: "天命大局，整合三組天命號碼，適合偏財指數≥8的大吉日。需搭配最佳時辰。",
    strategy: "整合三組天命號碼，選取出現頻率最高的數字，為您的天命押注",
    primaryNumbers: (() => {
      const allNums = [...(sets[0]?.numbers ?? []), ...(sets[1]?.numbers ?? []), ...(sets[2]?.numbers ?? [])];
      const freq: Record<number, number> = {};
      allNums.forEach(n => { freq[n] = (freq[n] ?? 0) + 1; });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([n]) => Number(n));
    })(),
    backupNumbers: base.luckyDigits,
    confidence: base.energyAnalysis.overallLuck >= 8 ? "high" : "low",
    buyCount: 1,
    maxBudget: 1000,
  };

  const strategy2000: ScratchDenominationStrategy = {
    denomination: 2000,
    label: "2000元券",
    riskLevel: "天命",
    description: "至尊天命，五行全力共振，僅在偏財指數≥9的絕佳天命日動用。三維共振全開才可出手。",
    strategy: "最高天命局，需同時滿足：大吉時辰 + 吉地彩券行 + 偏財指數≥9。三維共振全開才可出手。",
    primaryNumbers: (() => {
      const allNums = [...(sets[0]?.numbers ?? []), ...(sets[1]?.numbers ?? []), ...(sets[2]?.numbers ?? []), ...base.luckyDigits];
      const freq: Record<number, number> = {};
      allNums.forEach(n => { freq[n] = (freq[n] ?? 0) + 1; });
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([n]) => Number(n));
    })(),
    backupNumbers: base.bonusNumbers,
    confidence: base.energyAnalysis.overallLuck >= 9 ? "high" : "low",
    buyCount: 1,
    maxBudget: 2000,
  };

  return [strategy100, strategy200, strategy300, strategy500, strategy1000, strategy2000];
}'''

new_content = content[:start_idx] + new_func + content[end_idx:]
with open('server/lib/lotteryAlgorithm.ts', 'w') as f:
    f.write(new_content)
print("SUCCESS: generateScratchStrategies updated with 6 denominations")
