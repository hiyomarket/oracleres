/**
 * 神諭穿搭・能量模擬器 V10.0
 * 動態策略判定層 + 七日時間軸 + 懸浮儀表盤 + 展開建議 + 可折疊模擬器
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { OutfitModeSelector, type OutfitMode } from "@/components/OutfitModeSelector";
import { OutfitHourlyTimeline } from "@/components/OutfitHourlyTimeline";
import { AuraScoreGauge } from "@/components/outfit/AuraScoreGauge";
import { InteractiveMannequin, type BodyPart, type OutfitSelection } from "@/components/outfit/InteractiveMannequin";
import { WardrobeSelector } from "@/components/outfit/WardrobeSelector";
import { EnergyDetailPanel } from "@/components/outfit/EnergyDetailPanel";
import { toast } from "sonner";
import { Link } from "wouter";

// 五行顏色映射
const WUXING_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  火: { bg: "bg-red-950/40", border: "border-red-500/50", text: "text-red-400", dot: "bg-red-500" },
  土: { bg: "bg-amber-950/40", border: "border-amber-500/50", text: "text-amber-400", dot: "bg-amber-500" },
  金: { bg: "bg-slate-800/40", border: "border-slate-400/50", text: "text-slate-300", dot: "bg-slate-400" },
  水: { bg: "bg-blue-950/40", border: "border-blue-500/50", text: "text-blue-400", dot: "bg-blue-500" },
  木: { bg: "bg-emerald-950/40", border: "border-emerald-500/50", text: "text-emerald-400", dot: "bg-emerald-500" },
};

// 策略白話說明（讓用戶理解每個策略的實際意義與建議行動）
const STRATEGY_PLAIN_DESC: Record<string, { summary: string; action: string; avoid: string }> = {
  "強勢補弱": {
    summary: "今天你的弱項五行缺口很大，能量容易流失。",
    action: "穿上對應的補運色系，讓外在能量填補內在不足，適合主動出擊、爭取機會。",
    avoid: "避免穿著剋制喜用神的顏色，否則補了也白補。",
  },
  "順勢生旺": {
    summary: "今天的流日能量與你的本命高度契合，如魚得水。",
    action: "順著今日能量方向行動，適合談判、簽約、重要決策，事半功倍。",
    avoid: "不要逆勢而為，此時保持節奏比努力衝刺更重要。",
  },
  "借力打力": {
    summary: "今天的流日能量可以轉化為你的助力，關鍵在借勢。",
    action: "透過穿搭引導能量流向，借助外部資源或人脈，適合合作與借力。",
    avoid: "獨自硬撐效果有限，找對人合作才是今日關鍵。",
  },
  "食神生財": {
    summary: "今天的能量配置有利於創造與輸出，財運偏旺。",
    action: "展現才華、創作、銷售、服務他人，你的付出今天特別容易換來回報。",
    avoid: "不要只守不攻，今天適合主動創造，而非被動等待。",
  },
  "均衡守成": {
    summary: "今天的能量較為平穩，沒有特別強的優勢或弱點。",
    action: "維持日常節奏，做好本分，適合整理、規劃、沉澱。",
    avoid: "不宜冒進或做重大改變，穩中求進才是今日策略。",
  },
};

// 策略顏色映射
const STRATEGY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "強勢補弱": { bg: "bg-blue-950/40", border: "border-blue-500/40", text: "text-blue-300", badge: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  "順勢生旺": { bg: "bg-emerald-950/40", border: "border-emerald-500/40", text: "text-emerald-300", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  "借力打力": { bg: "bg-purple-950/40", border: "border-purple-500/40", text: "text-purple-300", badge: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  "食神生財": { bg: "bg-amber-950/40", border: "border-amber-500/40", text: "text-amber-300", badge: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "均衡守成": { bg: "bg-gray-900/40", border: "border-gray-500/40", text: "text-gray-300", badge: "bg-gray-500/20 text-gray-300 border-gray-500/40" },
};

function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

const DEFAULT_AURA_LEVEL = {
  label: "計算中",
  color: "#6B7280",
  description: "正在讀取您的天命數據...",
  emoji: "⏳",
};

export default function OutfitPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);
  const [mode, setMode] = useState<OutfitMode>("default");
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null);
  const prevModeRef = useRef<OutfitMode>(mode);

  // 穿搭選擇狀態
  const [outfitSelection, setOutfitSelection] = useState<OutfitSelection>({});
  const [activePart, setActivePart] = useState<BodyPart | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatorCollapsed, setSimulatorCollapsed] = useState(false);

  // 能量說明 Panel 狀態
  const [energyPanelOpen, setEnergyPanelOpen] = useState(false);
  const [energyPanelPart, setEnergyPanelPart] = useState<BodyPart | null>(null);
  const [auraBoostResult, setAuraBoostResult] = useState<{
    innateAura: number;
    outfitBoost: number;
    totalScore: number;
    auraLevel: { label: string; color: string; description: string; emoji: string };
    aiComment: string;
    boostBreakdown: Array<{ category: string; color: string; wuxing: string; points: number; reason: string }>;
  } | null>(null);

  // V4.0 模擬器初始化資料
  const { data: simulatorData, isLoading: simLoading } = trpc.warRoom.getOutfitSimulatorData.useQuery(
    { date: selectedDate, hourBranchIndex: selectedHourIndex ?? undefined, mode },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // V10.0 時辰動態穿搭 API（含策略資訊）
  const { data: outfitData, isLoading: outfitLoading, isFetching: outfitFetching } = trpc.warRoom.getOutfitByShichen.useQuery(
    { date: selectedDate, hourBranchIndex: selectedHourIndex ?? undefined, mode },
    { staleTime: 0, refetchOnWindowFocus: false }
  );

  // 原始 dailyReport（用於手串矩陣和五行總覽）
  const { data: dailyData, isLoading: dailyLoading } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // 用戶命格資料（取得主要靈數）
  const { data: profileData } = trpc.account.getProfile.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, refetchOnWindowFocus: false
  });

  // 本週策略分布
  const { data: weeklyDist } = trpc.warRoom.weeklyStrategyDistribution.useQuery(
    undefined,
    { staleTime: 30 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // 昨日策略（用於今日 vs 昨日策略對比）
  const yesterdayDate = getTaiwanDateStr(-1);
  const { data: yesterdayOutfit } = trpc.warRoom.getOutfitByShichen.useQuery(
    { date: yesterdayDate },
    { staleTime: 60 * 60 * 1000, refetchOnWindowFocus: false }
  );
  // simulateOutfit mutation
  const simulateMutation = trpc.warRoom.simulateOutfit.useMutation({
    onSuccess: (data) => { setAuraBoostResult(data); setIsSimulating(false); },
    onError: (e) => { toast.error("模擬失敗：" + e.message); setIsSimulating(false); },
  });

  // 初始化：從 outfitData 取得當前時辰 index
  useEffect(() => {
    if (outfitData && selectedHourIndex === null) {
      setSelectedHourIndex(outfitData.targetHour.branchIndex);
    }
  }, [outfitData, selectedHourIndex]);

  useEffect(() => { prevModeRef.current = mode; }, [mode]);

  // 穿搭選擇改變時自動觸發模擬（防抖 500ms）
  useEffect(() => {
    const hasAnySelection = Object.keys(outfitSelection).length > 0;
    if (!hasAnySelection || !simulatorData) return;
    const timer = setTimeout(() => {
      setIsSimulating(true);
      simulateMutation.mutate({
        date: selectedDate,
        hourBranchIndex: selectedHourIndex ?? undefined,
        mode,
        outfit: outfitSelection as Record<string, { color: string; wuxing?: string; name?: string }>,
      });
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfitSelection, selectedDate, selectedHourIndex, mode]);

  // 手串佩戴記錄
  const utils = trpc.useUtils();
  const { data: wearLogs } = trpc.braceletWear.getByDate.useQuery(
    { wearDate: selectedDate },
    { staleTime: 60000 }
  );
  const toggleWear = trpc.braceletWear.toggle.useMutation({
    onSuccess: () => utils.braceletWear.getByDate.invalidate({ wearDate: selectedDate }),
  });
  const wornSet = useMemo(() => {
    const s = new Set<string>();
    if (wearLogs) for (const log of wearLogs) s.add(`${log.braceletId}-${log.hand}`);
    return s;
  }, [wearLogs]);

  const handleToggleWear = (braceletId: string, braceletName: string, hand: "left" | "right") => {
    const isWearing = !wornSet.has(`${braceletId}-${hand}`);
    toggleWear.mutate({ braceletId, braceletName, hand, wearDate: selectedDate, isWearing });
    toast.success(isWearing ? `✓ 已記錄佩戴 ${braceletName}` : `已取消 ${braceletName} 佩戴記錄`);
  };

  function handlePartClick(part: BodyPart) {
    if (outfitSelection[part]) {
      setEnergyPanelPart(part);
      setEnergyPanelOpen(true);
    } else {
      setActivePart(part);
      setSelectorOpen(true);
    }
  }

  function handleSelectItem(part: BodyPart, item: { color: string; wuxing: string; name?: string }) {
    setOutfitSelection(prev => ({ ...prev, [part]: item }));
    setEnergyPanelPart(part);
    setEnergyPanelOpen(true);
  }

  function clearOutfit() {
    setOutfitSelection({});
    setAuraBoostResult(null);
  }

  const outfit = outfitData?.outfit;
  const targetHour = outfitData?.targetHour;
  const allHours = outfitData?.allHours ?? [];
  // 策略資訊（V10.0 新增）
  const strategy = (outfitData as unknown as { strategy?: { strategyName: string; coreStrategyText: string; primaryTargetElement: string; secondaryTargetElement: string } })?.strategy;
  // V3.0: 五行保護與脈絡分析
  const v3Protection = (outfitData as unknown as { v3Protection?: Array<{ element: string; ratio: number; status: string; action: string }> | null })?.v3Protection;
  const v3DailyContext = (outfitData as unknown as { v3DailyContext?: { dominantElement: string; sourceNature: string; keyMessage: string; urgency: string } | null })?.v3DailyContext;

  // 計算顯示的 Aura 分數
  const innateMaxDiscount = simulatorData?.innateMax != null ? (simulatorData.innateMax as number) / 100 : 1;
  const rawInnate = dailyData?.overallScore != null
    ? Math.round(dailyData.overallScore * 10)
    : (simulatorData?.innateAura ?? 0);
  const syncedInnate = Math.round(rawInnate * innateMaxDiscount);
  const displayInnate = syncedInnate;
  const displayBoost = auraBoostResult?.outfitBoost ?? 0;
  const displayTotal = auraBoostResult?.totalScore
    ? Math.round(syncedInnate + auraBoostResult.outfitBoost)
    : syncedInnate;

  function getAuraLevelFromScore(score: number): { label: string; color: string; description: string; emoji: string } {
    if (score >= 90) return { label: "運勢極佳", color: "#F59E0B", description: "天命豐沿，諸事順遂，把握機會大步前進。", emoji: "✨" };
    if (score >= 70) return { label: "運勢良好", color: "#10B981", description: "能量穩健，適合行動與決策，積極推進重要事項。", emoji: "🌟" };
    if (score >= 50) return { label: "運勢平穩", color: "#6B7280", description: "能量平穩，適合維持現狀，不宜輕進冲動。", emoji: "🌐" };
    if (score >= 30) return { label: "運勢偏弱", color: "#F97316", description: "能量稍弱，建議透過穿搭補運，避免重大決策。", emoji: "🍂" };
    return { label: "運勢低迷", color: "#EF4444", description: "能量較低，建議休養為主，透過穿搭與手串積極補運。", emoji: "🌙" };
  }
  const computedAuraLevel = getAuraLevelFromScore(displayTotal);
  const displayAuraLevel = simulatorData ? computedAuraLevel : DEFAULT_AURA_LEVEL;
  const strategyColors = strategy ? (STRATEGY_COLORS[strategy.strategyName] ?? STRATEGY_COLORS["均衡守成"]) : null;
  const yesterdayStrategy = (yesterdayOutfit as unknown as { strategy?: { strategyName: string } })?.strategy;
  const strategyPlain = strategy ? (STRATEGY_PLAIN_DESC[strategy.strategyName] ?? null) : null;
  const strategyChanged = yesterdayStrategy && strategy && yesterdayStrategy.strategyName !== strategy.strategyName;

  // 靈數與流日共振計算
  const primaryLifeNum = profileData?.lifePathNumber ?? null;
  const tarotCardNum = (outfitData as unknown as { tarotCardNumber?: number | null })?.tarotCardNumber ?? null;
  const tarotCardName = (outfitData as unknown as { tarotCardName?: string | null })?.tarotCardName ?? null;
  const resonanceType: 'exact' | 'near' | null = (() => {
    if (!primaryLifeNum || !tarotCardNum) return null;
    if (primaryLifeNum === tarotCardNum) return 'exact';
    // 相鄰共振（差值1，考慮22循環）
    const diff = Math.abs(primaryLifeNum - tarotCardNum);
    if (diff === 1 || diff === 21) return 'near';
    return null;
  })();

  return (
    <div className="min-h-screen oracle-page text-foreground">
      <SharedNav currentPage="outfit" />

      {/* ═══ 懸浮能量儀表盤（sticky top bar）═══ */}
      {simulatorData && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {/* 分數區 */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400/70 text-[10px] uppercase tracking-wider hidden sm:block">Aura</span>
                <motion.span
                  key={displayTotal}
                  initial={{ scale: 1.2, color: "#F59E0B" }}
                  animate={{ scale: 1, color: displayAuraLevel.color }}
                  transition={{ duration: 0.4 }}
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: displayAuraLevel.color }}
                >
                  {displayTotal}
                </motion.span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white/60 text-[11px] font-medium">{displayAuraLevel.emoji} {displayAuraLevel.label}</span>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-white/30">底盤 {displayInnate}</span>
                  {displayBoost > 0 && (
                    <motion.span
                      key={displayBoost}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-amber-400 font-bold"
                    >
                      +{displayBoost} 穿搭加成
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* 五行快覽 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {["木","火","土","金","水"].map((el) => {
                const w = dailyData?.wuxing?.weighted?.[el as keyof typeof dailyData.wuxing.weighted] ?? 0;
                const pct = Math.round((w as number) * 100);
                const colors = WUXING_COLORS[el];
                return (
                  <div key={el} className="flex flex-col items-center gap-0.5">
                    <div className="w-1 bg-white/10 rounded-full overflow-hidden" style={{ height: 20 }}>
                      <motion.div
                        className={`w-full rounded-full ${colors.dot}`}
                        style={{ height: `${pct}%` }}
                        initial={{ height: 0 }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                    <span className={`text-[9px] font-bold ${colors.text}`}>{el}</span>
                  </div>
                );
              })}
            </div>

            {/* 策略徽章 */}
            {strategy && strategyColors && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${strategyColors.badge}`}
              >
                {strategy.strategyName}
              </motion.div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
                <span>✨</span> 神諭穿搭
              </h1>
              <p className="text-white/40 text-sm mt-1">V10.0 動態策略 · 七日時間軸 · 即時能量儀表</p>
            </div>
            {targetHour && (
              <motion.div key={targetHour.chineseName} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-right">
                <div className="text-amber-400 font-bold text-lg">{targetHour.chineseName}</div>
                <div className="text-white/40 text-xs">{targetHour.displayTime}</div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ═══ 七日時間軸日期選擇器 ═══ */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 nav-scroll-container">
          {[-1, 0, 1, 2, 3, 4, 5].map((offset) => {
            const d = getTaiwanDateStr(offset);
            const label = offset === -1 ? "昨日" : offset === 0 ? "今日" : offset === 1 ? "明日" : offset === 2 ? "後天" : `+${offset}日`;
            return (
              <button
                key={offset}
                onClick={() => { setSelectedOffset(offset); setSelectedHourIndex(null); setOutfitSelection({}); setAuraBoostResult(null); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedOffset === offset
                    ? "bg-amber-500 text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {label} <span className="opacity-60">{d.slice(5)}</span>
              </button>
            );
          })}
        </div>

        {/* ═══ 情境模式切換器 ═══ */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <OutfitModeSelector value={mode} onChange={(m) => { setMode(m); setAuraBoostResult(null); }} />
        </div>

        {/* ═══ 時辰能量時間軸 ═══ */}
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <OutfitHourlyTimeline
            hours={allHours}
            selectedIndex={selectedHourIndex ?? (targetHour?.branchIndex ?? 0)}
            onSelect={(idx) => { setSelectedHourIndex(idx); setAuraBoostResult(null); }}
            isLoading={outfitLoading && allHours.length === 0}
          />
        </div>

        {/* ═══ V10.0 策略橫幅（含白話說明 + 昨日對比）═══ */}
        <AnimatePresence>
          {strategy && strategyColors && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-5 rounded-2xl border p-4 ${strategyColors.bg} ${strategyColors.border}`}
            >
              {/* 策略標題行 */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded-full border text-xs font-bold flex-shrink-0 ${strategyColors.badge}`}>
                    {strategy.strategyName}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${strategyColors.text}`}>{strategy.coreStrategyText}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      主攻：<span className={`font-bold ${WUXING_COLORS[strategy.primaryTargetElement]?.text ?? "text-white"}`}>{strategy.primaryTargetElement}</span>
                      　輔助：<span className={`font-bold ${WUXING_COLORS[strategy.secondaryTargetElement]?.text ?? "text-white"}`}>{strategy.secondaryTargetElement}</span>
                    </p>
                  </div>
                </div>
                {/* 昨日 vs 今日策略對比 */}
                {yesterdayStrategy && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px] text-white/30 mb-0.5">昨日</div>
                    <div className={`text-[10px] font-bold ${
                      strategyChanged ? "text-amber-400" : "text-white/40"
                    }`}>
                      {strategyChanged ? (
                        <span>➡️ {yesterdayStrategy.strategyName}</span>
                      ) : (
                        <span>✔️ 同策略</span>
                      )}
                    </div>
                    {strategyChanged && (
                      <div className="text-[9px] text-amber-300/60">能量已轉換</div>
                    )}
                  </div>
                )}
              </div>
              {/* 白話說明區塊 */}
              {strategyPlain && (
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <p className="text-xs text-white/70">{strategyPlain.summary}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-[9px] text-emerald-400 font-bold mb-1">✅ 建議行動</div>
                      <p className="text-[10px] text-white/60 leading-relaxed">{strategyPlain.action}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <div className="text-[9px] text-red-400 font-bold mb-1">⚠️ 避免事項</div>
                      <p className="text-[10px] text-white/60 leading-relaxed">{strategyPlain.avoid}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ 靈數與流日共振提示 ═══ */}
        {resonanceType && tarotCardName && primaryLifeNum && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-4 rounded-2xl border p-3.5 flex items-start gap-3 ${
              resonanceType === 'exact'
                ? 'bg-amber-950/50 border-amber-400/50'
                : 'bg-purple-950/40 border-purple-400/40'
            }`}
          >
            <span className="text-2xl flex-shrink-0">{resonanceType === 'exact' ? '✨' : '🌙'}</span>
            <div className="min-w-0">
              <div className={`text-sm font-bold mb-0.5 ${
                resonanceType === 'exact' ? 'text-amber-300' : 'text-purple-300'
              }`}>
                {resonanceType === 'exact'
                  ? `今日與你的主要靈數共振，能量倍增！`
                  : `今日流日與你的主要靈數相鄰，能量共鳴`
                }
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {resonanceType === 'exact'
                  ? `今日流日塔羅「${tarotCardName}」正是你的主要靈數 ${primaryLifeNum} 號。今日的行動與你的天命能量高度對齊，適合重要决策、展現自我。`
                  : `今日流日塔羅「${tarotCardName}」與你的主要靈數 ${primaryLifeNum} 號相鄰。能量共鳴中，今日適合與人合作、展開對話。`
                }
              </p>
            </div>
          </motion.div>
        )}

        {/* ═══ 管理虛擬衣樥快捷入口（置於五行圖上方）═══ */}
        {(!isAdmin && !hasFeature("warroom_outfit")) ? null : (
          <Link href="/wardrobe" className="flex items-center justify-between p-3 mb-4 rounded-xl border border-dashed border-white/20 hover:border-amber-500/40 hover:bg-amber-900/10 transition-all group">
            <div className="flex items-center gap-3">
              <span className="text-xl">👗</span>
              <div>
                <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">管理虛擬衣櫥</div>
                <div className="text-xs text-white/30">新增衣物，讓模擬器從您的衣櫥中挑選</div>
              </div>
            </div>
            <span className="text-white/30 group-hover:text-amber-400 transition-colors">→</span>
          </Link>
        )}

        {/* ═══ 今日五行加權總覽（水平進度條設計）═══ */}
        {dailyData?.wuxing && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <span>⚖️</span>
              <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">今日五行加權總覽</span>
            </div>
            <div className="space-y-2.5">
              {["木","火","土","金","水"].map((el) => {
                const w = dailyData.wuxing.weighted?.[el as keyof typeof dailyData.wuxing.weighted] ?? 0;
                const pct = Math.round((w as number) * 100);
                const isStrong = el === dailyData.wuxing.dominantElement;
                const isWeak = el === dailyData.wuxing.weakestElement;
                const colors = WUXING_COLORS[el];
                return (
                  <div key={el} className="flex items-center gap-3">
                    <span className={`text-xs font-bold w-4 flex-shrink-0 ${colors.text}`}>{el}</span>
                    <div className="flex-1 relative h-5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={`absolute left-0 top-0 h-full rounded-full ${colors.dot} ${isStrong ? "opacity-90" : isWeak ? "opacity-50" : "opacity-65"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.8, delay: 0.05 }}
                      />
                      {isStrong && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-amber-400">↑旺</span>
                      )}
                      {isWeak && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-400">↓弱</span>
                      )}
                    </div>
                    <span className={`text-xs font-bold w-8 text-right flex-shrink-0 tabular-nums ${isStrong ? "text-amber-400" : isWeak ? "text-blue-400" : "text-white/40"}`}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ 穿搭建議（展開顯示，無折疊）═══ */}
        {(!isAdmin && !hasFeature("warroom_outfit")) ? (
          <FeatureLockedCard feature="warroom_outfit" />
        ) : outfitLoading && !outfitData ? (
          <div className="space-y-4 mb-5">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : outfit ? (
          <div className="space-y-4 mb-5">
            {/* 穿搭建議標題 */}
            <div className="flex items-center gap-2">
              <span>🎨</span>
              <span className="text-sm font-semibold text-white/70 uppercase tracking-widest">今日穿搭建議</span>
              {outfitFetching && (
                <div className="ml-auto flex items-center gap-1 text-amber-300 text-xs">
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  重新計算中
                </div>
              )}
            </div>

            {/* 能量標籤 + 核心策略 */}
            {outfit?.energyTag && (
              <div className="rounded-xl bg-orange-950/20 border border-orange-500/20 p-3">
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">{outfit.energyTag}</span>
                {outfit?.coreStrategy && <p className="text-orange-300/80 text-xs mt-2 leading-relaxed">{outfit.coreStrategy}</p>}
              </div>
            )}

            {/* V3.0: 五行過旺保護警告 */}
            {v3Protection && v3Protection.length > 0 && (
              <div className="rounded-xl bg-red-950/30 border border-red-500/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{"\u26A0\uFE0F"}</span>
                  <span className="text-xs font-semibold text-red-300 uppercase tracking-widest">五行過旺保護</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {v3Protection.map((p, i) => (
                    <span key={i} className={`text-xs px-2 py-1 rounded-full border ${
                      p.status === 'critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      p.status === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                    }`}>
                      {p.element} {Math.round(p.ratio * 100)}% {p.status === 'critical' ? '\u2191\u2191\u2191' : p.status === 'overpower' ? '\u2191\u2191' : '\u2191'}
                    </span>
                  ))}
                </div>
                <p className="text-red-300/60 text-xs mt-2 leading-relaxed">
                  {v3Protection[0]?.action ?? '系統已自動調整穿搭建議，避免加重過旺五行'}
                </p>
              </div>
            )}
            {/* V3.0: 流日脈絡分析 */}
            {v3DailyContext && (
              <div className="rounded-xl bg-indigo-950/20 border border-indigo-500/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{"\uD83D\uDD2E"}</span>
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">今日能量脈絡</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ml-auto ${
                    v3DailyContext.sourceNature === '根旺' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    v3DailyContext.sourceNature === '借旺' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {v3DailyContext.sourceNature === '根旺' ? '🌳 根旺' : v3DailyContext.sourceNature === '借旺' ? '🌊 借旺' : '💨 虛旺'}
                  </span>
                </div>
                <p className="text-indigo-200/70 text-xs leading-relaxed">{v3DailyContext.keyMessage}</p>
                <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded ${
                  v3DailyContext.urgency === '把握今日' ? 'bg-amber-500/15 text-amber-400' :
                  v3DailyContext.urgency === '長期方向' ? 'bg-blue-500/15 text-blue-400' :
                  'bg-slate-500/15 text-slate-400'
                }`}>{v3DailyContext.urgency}</span>
              </div>
            )}
            {/* 上半身 */}
            {outfit?.upperBody && (
              <div className={`rounded-xl border p-4 ${WUXING_COLORS[outfit.upperBody.element]?.bg ?? 'bg-red-950/20'} ${WUXING_COLORS[outfit.upperBody.element]?.border ?? 'border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${WUXING_COLORS[outfit.upperBody.element]?.text ?? 'text-red-400'} ${WUXING_COLORS[outfit.upperBody.element]?.border ?? 'border-red-500/30'}`}>
                    上半身
                  </span>
                  <span className="text-white font-medium text-sm">{outfit.upperBody.colors.join(' / ')}</span>
                  <span className="text-white/40 text-xs ml-auto">{outfit.upperBody.element}系</span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{outfit.upperBody.tacticalExplanation}</p>
              </div>
            )}

            {/* 下半身 */}
            {outfit?.lowerBody && (
              <div className={`rounded-xl border p-4 ${WUXING_COLORS[outfit.lowerBody.element]?.bg ?? 'bg-amber-950/20'} ${WUXING_COLORS[outfit.lowerBody.element]?.border ?? 'border-amber-500/20'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${WUXING_COLORS[outfit.lowerBody.element]?.text ?? 'text-amber-400'} ${WUXING_COLORS[outfit.lowerBody.element]?.border ?? 'border-amber-500/30'}`}>
                    下半身
                  </span>
                  <span className="text-white font-medium text-sm">{outfit.lowerBody.colors.join(' / ')}</span>
                  <span className="text-white/40 text-xs ml-auto">{outfit.lowerBody.element}系</span>
                </div>
                <p className="text-white/60 text-xs leading-relaxed">{outfit.lowerBody.tacticalExplanation}</p>
              </div>
            )}

            {/* 忌用色彩 */}
            {outfit?.avoid && outfit.avoid.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span>⚠️</span>
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">今日忌用色彩</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {outfit.avoid.map((c, idx) => {
                    const colors = WUXING_COLORS[c.element] ?? { text: 'text-white/50', border: 'border-white/10' };
                    return (
                      <div key={idx} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white/5 ${colors.border}`}>
                        <span className={`text-xs font-medium line-through ${colors.text}`}>{c.colors.join('/')}</span>
                        <span className="text-white/30 text-xs">({c.element})</span>
                      </div>
                    );
                  })}
                </div>
                {outfit.avoid[0]?.reason && (
                  <p className="text-white/40 text-xs mt-3 leading-relaxed">{outfit.avoid[0].reason}</p>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* ═══ 今日手串矩陣（展開顯示，顏色依五行元素動態決定）═══ */}
        {(!isAdmin && !hasFeature("warroom_outfit")) ? null : dailyLoading ? (
          <div className="h-40 bg-white/5 rounded-2xl animate-pulse mb-5" />
        ) : dailyData?.bracelets ? (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span>📿</span>
              <span className="text-sm font-semibold text-white/70 uppercase tracking-widest">今日手串矩陣</span>
            </div>
            {dailyData.bracelets?.coreGoal && (
              <p className="text-white/50 text-xs mb-3 leading-relaxed">{dailyData.bracelets.coreGoal}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {/* 左手 - 顏色依左手手串的五行元素決定 */}
              {(() => {
                const lh = dailyData.bracelets?.leftHand;
                // 取得左手手串的主要五行元素（從 explanation 或 element 欄位），fallback 到 '土'
                const lhElement = (lh as unknown as { element?: string })?.element ?? "土";
                const lhColors = WUXING_COLORS[lhElement] ?? WUXING_COLORS["土"];
                const lhWorn = lh ? wornSet.has(`${lh.code}-left`) : false;
                return (
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${lhColors.text}`}>🤲 左手（能量/吸引）</div>
                    {lh && (
                      <div className={`rounded-lg border p-3 transition-all ${
                        lhWorn
                          ? `${lhColors.bg} ${lhColors.border}`
                          : `bg-white/3 ${lhColors.border} opacity-80`
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className={`text-xs font-mono opacity-60 ${lhColors.text}`}>{lh.code}</span>
                            <span className={`font-medium text-sm ml-2 ${lhColors.text}`}>{lh.name}</span>
                          </div>
                          <button
                            onClick={() => handleToggleWear(lh.code, lh.name, "left")}
                            disabled={toggleWear.isPending}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                              lhWorn
                                ? `${lhColors.bg} ${lhColors.border} ${lhColors.text}`
                                : `bg-white/5 border border-white/20 text-white/40 hover:${lhColors.border} hover:${lhColors.text}`
                            }`}
                          >
                            {lhWorn ? "✓ 已佩戴" : "佩戴"}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lhColors.dot}`} />
                          <p className={`text-xs font-medium ${lhColors.text} opacity-80`}>⚔️ {lh.tacticalRole}</p>
                        </div>
                        <p className="text-white/50 text-xs leading-relaxed">{lh.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* 右手 - 顏色依右手手串的五行元素決定 */}
              {(() => {
                const rh = dailyData.bracelets?.rightHand;
                const rhElement = (rh as unknown as { element?: string })?.element ?? "金";
                const rhColors = WUXING_COLORS[rhElement] ?? WUXING_COLORS["金"];
                const rhWorn = rh ? wornSet.has(`${rh.code}-right`) : false;
                return (
                  <div>
                    <div className={`text-xs font-semibold mb-2 ${rhColors.text}`}>🤚 右手（策略/防護）</div>
                    {rh && (
                      <div className={`rounded-lg border p-3 transition-all ${
                        rhWorn
                          ? `${rhColors.bg} ${rhColors.border}`
                          : `bg-white/3 ${rhColors.border} opacity-80`
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className={`text-xs font-mono opacity-60 ${rhColors.text}`}>{rh.code}</span>
                            <span className={`font-medium text-sm ml-2 ${rhColors.text}`}>{rh.name}</span>
                          </div>
                          <button
                            onClick={() => handleToggleWear(rh.code, rh.name, "right")}
                            disabled={toggleWear.isPending}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                              rhWorn
                                ? `${rhColors.bg} ${rhColors.border} ${rhColors.text}`
                                : `bg-white/5 border border-white/20 text-white/40 hover:${rhColors.border} hover:${rhColors.text}`
                            }`}
                          >
                            {rhWorn ? "✓ 已佩戴" : "佩戴"}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${rhColors.dot}`} />
                          <p className={`text-xs font-medium ${rhColors.text} opacity-80`}>🛡️ {rh.tacticalRole}</p>
                        </div>
                        <p className="text-white/50 text-xs leading-relaxed">{rh.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : null}

        {/* ═══ 互動穿搭模擬器（可折疊）═══ */}
        {(!isAdmin && !hasFeature("warroom_outfit")) ? null : simLoading ? (
          <div className="h-40 bg-white/5 rounded-2xl animate-pulse mb-5" />
        ) : simulatorData ? (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            {/* 模擬器標題欄（可折疊） */}
            <button
              onClick={() => setSimulatorCollapsed(c => !c)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white/70 uppercase tracking-widest">互動穿搭模擬器</div>
                  <div className="text-xs text-white/30 mt-0.5">點擊人台各部位選擇衣物，即時計算能量加成</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSimulating && (
                  <div className="flex items-center gap-1 text-amber-300 text-xs">
                    <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    計算中
                  </div>
                )}
                <span className={`text-white/40 transition-transform duration-200 ${simulatorCollapsed ? "rotate-180" : ""}`}>▼</span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {!simulatorCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4">
                    {/* Aura Score 儀表盤 */}
                    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-yellow-950/20 to-black/40 p-5">
                      <div className="text-center mb-2">
                        <span className="text-xs text-amber-400/70 uppercase tracking-widest">本日天命 Aura Score</span>
                      </div>
                      <div className="flex justify-center">
                        <AuraScoreGauge
                          innateAura={displayInnate}
                          outfitBoost={displayBoost}
                          totalScore={displayTotal}
                          auraLevel={displayAuraLevel}
                          isAnimating={isSimulating}
                        />
                      </div>
                      {simulatorData?.innateAnalysis && (
                        <p className="text-center text-xs text-white/40 mt-3 leading-relaxed">
                          今日天命底盤 {displayAuraLevel.label}（{displayInnate}分）。
                          {simulatorData.innateAnalysis.favorableElements?.length > 0
                            ? `您的喜用神 ${(simulatorData.innateAnalysis.favorableElements as string[]).slice(0, 2).join('、')} 今日${displayInnate >= 50 ? '能量充沛' : '略顯不足'}，`
                            : ''}
                          透過穿搭補運可提升至多 20 分。
                        </p>
                      )}
                      {auraBoostResult?.aiComment && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 rounded-xl bg-amber-900/20 border border-amber-500/30"
                        >
                          <p className="text-amber-200 text-xs leading-relaxed">
                            <span className="text-amber-400 font-bold">✨ 神諭點評：</span>
                            {auraBoostResult.aiComment}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    {/* 交互式虛擬人台 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-white/40">點擊人台部位選擇衣物</span>
                        {Object.keys(outfitSelection).length > 0 && (
                          <button onClick={clearOutfit} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                            清除全部
                          </button>
                        )}
                      </div>
                      <InteractiveMannequin
                        selection={outfitSelection}
                        onPartClick={handlePartClick}
                        favorableElements={simulatorData?.favorableElements ?? []}
                      />
                      {auraBoostResult && auraBoostResult.boostBreakdown.some(b => b.points > 0) && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 space-y-1">
                          <div className="text-xs text-white/40 mb-2">穿搭加成明細：</div>
                          {auraBoostResult.boostBreakdown.filter(b => b.points > 0).map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-white/40">{b.category}</span>
                              <span className="text-white/60">{b.color}</span>
                              <span className="text-amber-400 font-bold ml-auto">+{b.points}</span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2 mt-2">
                            <span className="text-white/50">穿搭總加成</span>
                            <span className="text-amber-400 font-bold">+{auraBoostResult.outfitBoost}</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* 今日補運目標 */}
                    {simulatorData?.innateAnalysis && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span>🎯</span>
                          <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">今日補運目標</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {simulatorData.innateAnalysis.weakestElements.map((el) => (
                            <div key={el} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${WUXING_COLORS[el]?.bg ?? "bg-gray-800"} ${WUXING_COLORS[el]?.border ?? "border-gray-600"}`}>
                              <span className={`w-2 h-2 rounded-full ${WUXING_COLORS[el]?.dot ?? "bg-gray-500"}`} />
                              <span className={WUXING_COLORS[el]?.text ?? "text-gray-300"}>{el}系能量不足 → 補{el}</span>
                            </div>
                          ))}
                          {simulatorData.favorableElements.map((el) => (
                            <div key={`fav-${el}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-900/20 text-xs">
                              <span className="text-amber-400">★</span>
                              <span className="text-amber-300">{el}（喜用神）</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 前往虛擬衣櫥（模擬器內部也保留一個入口）*/}
                    <div className="text-center">
                      <Link href="/wardrobe" className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-amber-400 transition-colors">
                        <span>👗</span> 管理虛擬衣櫥 →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
         ) : null}

        {/* ═══ 本週策略分布圖表 ═══ */}
        {weeklyDist && weeklyDist.days.length > 0 && (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">📊</span>
              <div>
                <div className="text-sm font-semibold text-white/70 uppercase tracking-widest">本週策略分布</div>
                <div className="text-xs text-white/30 mt-0.5">過去 7 日各日觸發策略分析</div>
              </div>
            </div>
            {/* 7日日期橫向列 */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weeklyDist.days.map((d) => {
                const sc = STRATEGY_COLORS[d.strategyName] ?? STRATEGY_COLORS["均衡守成"];
                return (
                  <div key={d.date} className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all ${
                    d.isToday ? `${sc.bg} ${sc.border} ring-1 ring-amber-400/50` : `bg-white/3 border-white/10`
                  }`}>
                    <span className={`text-[10px] font-medium ${ d.isToday ? "text-amber-400" : "text-white/40" }`}>{d.dayOfWeek.replace("週", "")}</span>
                    <span className="text-base">{d.strategyIcon}</span>
                    <span className={`text-[9px] leading-tight text-center ${ d.isToday ? sc.text : "text-white/30" }`}>
                      {d.strategyName.length > 4 ? d.strategyName.slice(0, 4) : d.strategyName}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* 策略次數橫條圖 */}
            <div className="space-y-2">
              {weeklyDist.distribution.map((item) => {
                const sc = STRATEGY_COLORS[item.name] ?? STRATEGY_COLORS["均衡守成"];
                const pct = Math.round((item.count / 7) * 100);
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-sm w-5 text-center">{item.icon}</span>
                    <span className={`text-xs w-16 flex-shrink-0 ${sc.text}`}>{item.name}</span>
                    <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className={`h-full rounded-full ${
                          item.name === "強勢補弱" ? "bg-blue-400" :
                          item.name === "順勢生旺" ? "bg-emerald-400" :
                          item.name === "借力打力" ? "bg-purple-400" :
                          item.name === "食神生財" ? "bg-amber-400" :
                          "bg-gray-400"
                        }`}
                      />
                    </div>
                    <span className="text-xs text-white/40 w-8 text-right">{item.count}天</span>
                  </div>
                );
              })}
            </div>
            {/* 策略白話解讀提示 */}
            {weeklyDist.distribution[0] && (() => {
              const top = weeklyDist.distribution[0];
              const sc = STRATEGY_COLORS[top.name] ?? STRATEGY_COLORS["均衡守成"];
              const plain = STRATEGY_PLAIN_DESC[top.name];
              return (
                <div className={`mt-3 p-3 rounded-xl border ${sc.bg} ${sc.border}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`font-bold text-sm ${sc.text}`}>{top.icon} 本週主導策略：{top.name}</span>
                    <span className="text-white/40 text-xs">（{top.count}/7 天）</span>
                  </div>
                  {plain && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-white/70">{plain.summary}</p>
                      <p className="text-[10px] text-white/50">本週建議：{plain.action}</p>
                    </div>
                  )}
                  {weeklyDist.distribution.length === 1 && (
                    <p className="text-[10px] text-white/40 mt-1.5">本週能量很一致，這種規律性通常代表你的天命能量正處於穩定期。</p>
                  )}
                  {weeklyDist.distribution.length >= 3 && (
                    <p className="text-[10px] text-white/40 mt-1.5">本週策略較多元，能量轉換頻繁，建議每日早晨查看穿搭建議以適時調整。</p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>
      {/* 衣物選擇器 Sheet */}
      <WardrobeSelector
        open={selectorOpen}
        onClose={() => { setSelectorOpen(false); setActivePart(null); }}
        part={activePart}
        onSelect={handleSelectItem}
        wardrobeItems={(simulatorData?.wardrobe ?? []) as Array<{ id: number; name: string; category: string; color: string; wuxing: string; occasion?: string | null; }>}
        bracelets={(simulatorData?.bracelets ?? []) as Array<{ code: string; name: string; element: string; color: string; function: string; }>}
        systemRecommendation={
          activePart && simulatorData?.systemRecommendation
            ? (() => {
                const rec = (simulatorData.systemRecommendation as unknown as Record<string, unknown>)[activePart];
                if (rec && typeof rec === 'object' && 'color' in rec && 'wuxing' in rec && 'reason' in rec) {
                  return rec as { color: string; wuxing: string; reason: string };
                }
                return undefined;
              })()
            : undefined
        }
        favorableElements={simulatorData?.favorableElements ?? []}
      />

      {/* 能量說明 Panel */}
      <EnergyDetailPanel
        open={energyPanelOpen}
        onClose={() => { setEnergyPanelOpen(false); setEnergyPanelPart(null); }}
        part={energyPanelPart}
        item={energyPanelPart ? (outfitSelection[energyPanelPart] ?? null) : null}
        boostPoints={energyPanelPart && auraBoostResult ? auraBoostResult.boostBreakdown.find(b => b.category === energyPanelPart)?.points : undefined}
        boostReason={energyPanelPart && auraBoostResult ? auraBoostResult.boostBreakdown.find(b => b.category === energyPanelPart)?.reason : undefined}
      />
    </div>
  );
}
