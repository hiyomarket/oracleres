/**
 * 神諭穿搭・能量模擬器 V4.0
 * 雙層計分模型 (Innate Aura + Outfit Boost) + 交互式虛擬人台 + 時辰動態 + 情境模式
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

function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

function SectionCard({ title, icon, children, className = "" }: {
  title: string; icon: string; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

type ActiveTab = "simulator" | "outfit" | "bracelet";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("simulator");
  const [mode, setMode] = useState<OutfitMode>("default");
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null);
  const prevModeRef = useRef<OutfitMode>(mode);

  // 穿搭選擇狀態
  const [outfitSelection, setOutfitSelection] = useState<OutfitSelection>({});
  const [activePart, setActivePart] = useState<BodyPart | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
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
    {
      date: selectedDate,
      hourBranchIndex: selectedHourIndex ?? undefined,
      mode,
    },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // V3.0 時辰動態穿搭 API（用於穿搭建議 Tab）
  const { data: outfitData, isLoading: outfitLoading, isFetching: outfitFetching } = trpc.warRoom.getOutfitByShichen.useQuery(
    {
      date: selectedDate,
      hourBranchIndex: selectedHourIndex ?? undefined,
      mode,
    },
    { staleTime: 0, refetchOnWindowFocus: false }
  );

  // 原始 dailyReport（用於手串矩陣）
  const { data: dailyData, isLoading: dailyLoading } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  // simulateOutfit mutation
  const simulateMutation = trpc.warRoom.simulateOutfit.useMutation({
    onSuccess: (data) => {
      setAuraBoostResult(data);
      setIsSimulating(false);
    },
    onError: (e) => {
      toast.error("模擬失敗：" + e.message);
      setIsSimulating(false);
    },
  });

  // 初始化：從 outfitData 取得當前時辰 index
  useEffect(() => {
    if (outfitData && selectedHourIndex === null) {
      setSelectedHourIndex(outfitData.targetHour.branchIndex);
    }
  }, [outfitData, selectedHourIndex]);

  // 模式切換時記錄
  useEffect(() => {
    prevModeRef.current = mode;
  }, [mode]);

  // 穿搭選擇改變時自動觸發模擬
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
    }, 500); // 防抖 500ms

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
    // 如果該部位已有選擇，點擊時顯示能量說明 Panel
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
    // 選擇後自動顯示能量說明 Panel
    setEnergyPanelPart(part);
    setEnergyPanelOpen(true);
  }

  function clearOutfit() {
    setOutfitSelection({});
    setAuraBoostResult(null);
  }

  const TABS: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "simulator", label: "能量模擬器", icon: "⚡" },
    { key: "outfit", label: "穿搭建議", icon: "👗" },
    { key: "bracelet", label: "手串矩陣", icon: "📿" },
  ];

  const outfit = outfitData?.outfit;
  const targetHour = outfitData?.targetHour;
  const allHours = outfitData?.allHours ?? [];

  // 計算顯示的 Aura 分數
  // 天命底盤同步：優先使用 dailyData.overallScore × 10（與作戰室每日運勢分數一致）
  const syncedInnate = dailyData?.overallScore != null
    ? Math.round(dailyData.overallScore * 10)
    : (simulatorData?.innateAura ?? 0);
  const displayInnate = syncedInnate;
  const displayBoost = auraBoostResult?.outfitBoost ?? 0;
  const displayTotal = auraBoostResult?.totalScore
    ? Math.round(syncedInnate + auraBoostResult.outfitBoost)
    : syncedInnate;
  const displayAuraLevel = auraBoostResult?.auraLevel ?? simulatorData?.auraLevel ?? DEFAULT_AURA_LEVEL;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="outfit" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
                <span>✨</span> 神諭穿搭
              </h1>
              <p className="text-white/40 text-sm mt-1">Aura Score 雙層計分 · 時辰動態能量模擬器</p>
            </div>
            {targetHour && (
              <motion.div
                key={targetHour.chineseName}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-right"
              >
                <div className="text-amber-400 font-bold text-lg">{targetHour.chineseName}</div>
                <div className="text-white/40 text-xs">{targetHour.displayTime}</div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* 日期選擇器 */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[-1, 0, 1, 2].map((offset) => {
            const d = getTaiwanDateStr(offset);
            const label = offset === -1 ? "昨日" : offset === 0 ? "今日" : offset === 1 ? "明日" : `+${offset}日`;
            return (
              <button
                key={offset}
                onClick={() => { setSelectedOffset(offset); setSelectedHourIndex(null); setOutfitSelection({}); setAuraBoostResult(null); }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
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

        {/* Tab 選擇 */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-amber-500/20 border border-amber-500/60 text-amber-300"
                  : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ═══ 能量模擬器 Tab ═══ */}
          {activeTab === "simulator" && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {!isAdmin && !hasFeature("warroom_outfit") ? (
                <FeatureLockedCard feature="warroom_outfit" />
              ) : simLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* ── Aura Score 儀表盤 ── */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-yellow-950/20 to-black/40 p-6"
                  >
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
                        {simulatorData.innateAnalysis.description}
                      </p>
                    )}
                    {/* AI 點評 */}
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
                  </motion.div>

                  {/* ── 交互式虛擬人台 ── */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👗</span>
                        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest">
                          互動穿搭模擬
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSimulating && (
                          <div className="flex items-center gap-1 text-amber-300 text-xs">
                            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                            計算中
                          </div>
                        )}
                        {Object.keys(outfitSelection).length > 0 && (
                          <button
                            onClick={clearOutfit}
                            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            清除全部
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-white/30 mb-4 text-center">
                      點擊人台各部位選擇衣物，即時計算能量加成
                    </p>

                    <InteractiveMannequin
                      selection={outfitSelection}
                      onPartClick={handlePartClick}
                      favorableElements={simulatorData?.favorableElements ?? []}
                    />

                    {/* 加成明細 */}
                    {auraBoostResult && auraBoostResult.boostBreakdown.some(b => b.points > 0) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 space-y-1"
                      >
                        <div className="text-xs text-white/40 mb-2">穿搭加成明細：</div>
                        {auraBoostResult.boostBreakdown
                          .filter(b => b.points > 0)
                          .map((b, i) => (
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

                  {/* ── 今日補運目標 ── */}
                  {simulatorData?.innateAnalysis && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span>🎯</span>
                        <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">今日補運目標</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {simulatorData.innateAnalysis.weakestElements.map((el) => (
                          <div
                            key={el}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${
                              WUXING_COLORS[el]?.bg ?? "bg-gray-800"
                            } ${WUXING_COLORS[el]?.border ?? "border-gray-600"}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${WUXING_COLORS[el]?.dot ?? "bg-gray-500"}`} />
                            <span className={WUXING_COLORS[el]?.text ?? "text-gray-300"}>
                              {el}系能量不足 → 補{el}
                            </span>
                          </div>
                        ))}
                        {simulatorData.favorableElements.map((el) => (
                          <div
                            key={`fav-${el}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-900/20 text-xs"
                          >
                            <span className="text-amber-400">★</span>
                            <span className="text-amber-300">{el}（喜用神）</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── 前往虛擬衣櫥 ── */}
                  <Link href="/wardrobe" className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-white/20 hover:border-amber-500/40 hover:bg-amber-900/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👗</span>
                      <div>
                        <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                          管理虛擬衣櫥
                        </div>
                        <div className="text-xs text-white/30">
                          新增衣物，讓模擬器從您的衣櫥中挑選
                        </div>
                      </div>
                    </div>
                    <span className="text-white/30 group-hover:text-amber-400 transition-colors">→</span>
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ 穿搭建議 Tab ═══ */}
          {activeTab === "outfit" && (
            <motion.div
              key={`outfit-${mode}-${selectedHourIndex}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {!isAdmin && !hasFeature("warroom_outfit") ? (
                <FeatureLockedCard feature="warroom_outfit" />
              ) : outfitLoading && !outfitData ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : !outfit ? (
                <div className="text-center py-12 text-white/30">無法載入穿搭建議</div>
              ) : (
                <div className="space-y-4">
                  {/* 五行加權總覽 */}
                  {dailyData && (
                    <SectionCard title="今日五行加權總覽" icon="⚖️">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-white/40 border-b border-white/10">
                              <th className="text-left py-2 pr-3">五行</th>
                              <th className="text-right py-2 px-2">本命</th>
                              <th className="text-right py-2 px-2">環境</th>
                              <th className="text-right py-2 px-2 font-bold text-amber-300/80">加權</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyData.wuxing && ["木","火","土","金","水"].map((el) => {
                              const natal = dailyData.wuxing.natal?.[el as keyof typeof dailyData.wuxing.natal] ?? 0;
                              const env = dailyData.wuxing.environment?.[el as keyof typeof dailyData.wuxing.environment] ?? 0;
                              const w = dailyData.wuxing.weighted?.[el as keyof typeof dailyData.wuxing.weighted] ?? 0;
                              const isStrong = el === dailyData.wuxing.dominantElement;
                              const isWeak = el === dailyData.wuxing.weakestElement;
                              const colors = WUXING_COLORS[el];
                              return (
                                <tr key={el} className={`border-b border-white/5 ${isStrong ? "bg-amber-500/5" : isWeak ? "bg-blue-500/5" : ""}`}>
                                  <td className="py-2 pr-3">
                                    <span className={`flex items-center gap-1.5 font-semibold ${colors.text}`}>
                                      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                      {el}
                                    </span>
                                  </td>
                                  <td className="text-right py-2 px-2 text-white/50">{(natal * 100).toFixed(0)}%</td>
                                  <td className="text-right py-2 px-2 text-white/50">{(env * 100).toFixed(0)}%</td>
                                  <td className={`text-right py-2 px-2 font-bold ${isStrong ? "text-amber-400" : isWeak ? "text-blue-400" : "text-white/70"}`}>
                                    {(w * 100).toFixed(0)}%
                                    {isStrong && <span className="ml-1 text-amber-500">↑</span>}
                                    {isWeak && <span className="ml-1 text-blue-500">↓</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {/* 當前時辰 + 模式能量卡 */}
                  {targetHour && outfitData && (
                    <motion.div
                      key={`hour-card-${targetHour.branchIndex}-${mode}`}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-yellow-950/20 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{outfitData.modeInfo.icon}</span>
                          <div>
                            <div className="text-amber-300 font-bold text-sm">{outfitData.modeInfo.label}模式</div>
                            <div className="text-white/40 text-xs">{outfitData.modeInfo.desc}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-amber-400 font-bold">{targetHour.chineseName}</div>
                          <div className="text-white/40 text-xs">{targetHour.displayTime}</div>
                          {targetHour.isCurrent && (
                            <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.5 rounded-full font-bold">
                              當前時辰
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-white/40">主導：</span>
                          <span className={`font-bold ${WUXING_COLORS[outfitData.wuxing.dominantElement]?.text ?? "text-amber-300"}`}>
                            {outfitData.wuxing.dominantElement}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-white/40">補強：</span>
                          <span className={`font-bold ${WUXING_COLORS[outfitData.wuxing.weakestElement]?.text ?? "text-blue-300"}`}>
                            {outfitData.wuxing.weakestElement}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 穿搭建議（含 loading overlay） */}
                  <div className="relative">
                    {outfitFetching && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl z-10 flex items-center justify-center backdrop-blur-sm">
                        <div className="flex items-center gap-2 text-amber-300 text-sm">
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          重新計算中...
                        </div>
                      </div>
                    )}
                    <SectionCard title="今日穿搭建議" icon="🎨">
                      <div className="space-y-3">
                        {outfit?.energyTag && (
                          <div className="rounded-xl bg-orange-950/20 border border-orange-500/20 p-3">
                            <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">{outfit.energyTag}</span>
                            {outfit?.coreStrategy && <p className="text-orange-300/80 text-xs mt-2">{outfit.coreStrategy}</p>}
                          </div>
                        )}
                        {outfit?.upperBody && (
                          <div className={`rounded-xl border p-3 ${WUXING_COLORS[outfit.upperBody.element]?.bg ?? 'bg-red-950/20'} ${WUXING_COLORS[outfit.upperBody.element]?.border ?? 'border-red-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold ${WUXING_COLORS[outfit.upperBody.element]?.text ?? 'text-red-400'}`}>上半身</span>
                              <span className="text-white font-medium text-sm">{outfit.upperBody.colors.join(' / ')}</span>
                              <span className="text-white/40 text-xs ml-auto">{outfit.upperBody.element}系</span>
                            </div>
                            <p className="text-white/60 text-xs leading-relaxed">{outfit.upperBody.tacticalExplanation}</p>
                          </div>
                        )}
                        {outfit?.lowerBody && (
                          <div className={`rounded-xl border p-3 ${WUXING_COLORS[outfit.lowerBody.element]?.bg ?? 'bg-amber-950/20'} ${WUXING_COLORS[outfit.lowerBody.element]?.border ?? 'border-amber-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold ${WUXING_COLORS[outfit.lowerBody.element]?.text ?? 'text-amber-400'}`}>下半身</span>
                              <span className="text-white font-medium text-sm">{outfit.lowerBody.colors.join(' / ')}</span>
                              <span className="text-white/40 text-xs ml-auto">{outfit.lowerBody.element}系</span>
                            </div>
                            <p className="text-white/60 text-xs leading-relaxed">{outfit.lowerBody.tacticalExplanation}</p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  {/* 忌用色彩 */}
                  {outfit?.avoid && outfit.avoid.length > 0 && (
                    <SectionCard title="今日忌用色彩" icon="⚠️">
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
                    </SectionCard>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ 手串矩陣 Tab ═══ */}
          {activeTab === "bracelet" && (
            <motion.div
              key="bracelet"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {!isAdmin && !hasFeature("warroom_outfit") ? (
                <FeatureLockedCard feature="warroom_outfit" />
              ) : dailyLoading ? (
                <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
              ) : !dailyData ? (
                <div className="text-center py-12 text-white/30">無法載入手串資料</div>
              ) : (
                <SectionCard title="今日手串矩陣" icon="📿">
                  {dailyData.bracelets?.coreGoal && (
                    <p className="text-white/50 text-xs mb-4 leading-relaxed">{dailyData.bracelets.coreGoal}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 左手 */}
                    <div>
                      <div className="text-emerald-400/70 text-xs font-semibold mb-2">🤲 左手（能量/吸引）</div>
                      {dailyData.bracelets?.leftHand && (
                        <div className={`rounded-lg border p-3 transition-all ${
                          wornSet.has(`${dailyData.bracelets.leftHand.code}-left`)
                            ? "bg-emerald-900/40 border-emerald-400/50"
                            : "bg-emerald-950/20 border-emerald-500/20"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-emerald-500/60 text-xs font-mono">{dailyData.bracelets.leftHand.code}</span>
                              <span className="text-emerald-300 font-medium text-sm ml-2">{dailyData.bracelets.leftHand.name}</span>
                            </div>
                            <button
                              onClick={() => handleToggleWear(dailyData.bracelets.leftHand.code, dailyData.bracelets.leftHand.name, "left")}
                              disabled={toggleWear.isPending}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                wornSet.has(`${dailyData.bracelets.leftHand.code}-left`)
                                  ? "bg-emerald-500/30 border border-emerald-400/60 text-emerald-300"
                                  : "bg-white/5 border border-white/20 text-white/40 hover:border-emerald-500/40 hover:text-emerald-400"
                              }`}
                            >
                              {wornSet.has(`${dailyData.bracelets.leftHand.code}-left`) ? "✓ 已佩戴" : "佩戴"}
                            </button>
                          </div>
                          <p className="text-emerald-400/70 text-xs font-medium mb-1">⚔️ {dailyData.bracelets.leftHand.tacticalRole}</p>
                          <p className="text-white/50 text-xs leading-relaxed">{dailyData.bracelets.leftHand.explanation}</p>
                        </div>
                      )}
                    </div>
                    {/* 右手 */}
                    <div>
                      <div className="text-blue-400/70 text-xs font-semibold mb-2">🤚 右手（策略/防護）</div>
                      {dailyData.bracelets?.rightHand && (
                        <div className={`rounded-lg border p-3 transition-all ${
                          wornSet.has(`${dailyData.bracelets.rightHand.code}-right`)
                            ? "bg-blue-900/40 border-blue-400/50"
                            : "bg-blue-950/20 border-blue-500/20"
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-blue-500/60 text-xs font-mono">{dailyData.bracelets.rightHand.code}</span>
                              <span className="text-blue-300 font-medium text-sm ml-2">{dailyData.bracelets.rightHand.name}</span>
                            </div>
                            <button
                              onClick={() => handleToggleWear(dailyData.bracelets.rightHand.code, dailyData.bracelets.rightHand.name, "right")}
                              disabled={toggleWear.isPending}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                wornSet.has(`${dailyData.bracelets.rightHand.code}-right`)
                                  ? "bg-blue-500/30 border border-blue-400/60 text-blue-300"
                                  : "bg-white/5 border border-white/20 text-white/40 hover:border-blue-500/40 hover:text-blue-400"
                              }`}
                            >
                              {wornSet.has(`${dailyData.bracelets.rightHand.code}-right`) ? "✓ 已佩戴" : "佩戴"}
                            </button>
                          </div>
                          <p className="text-blue-400/70 text-xs font-medium mb-1">🛡️ {dailyData.bracelets.rightHand.tacticalRole}</p>
                          <p className="text-white/50 text-xs leading-relaxed">{dailyData.bracelets.rightHand.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 衣物選擇器 Sheet */}
      <WardrobeSelector
        open={selectorOpen}
        onClose={() => { setSelectorOpen(false); setActivePart(null); }}
        part={activePart}
        onSelect={handleSelectItem}
        wardrobeItems={(simulatorData?.wardrobe ?? []) as Array<{
          id: number; name: string; category: string; color: string; wuxing: string; occasion?: string | null;
        }>}
        bracelets={(simulatorData?.bracelets ?? []) as Array<{
          code: string; name: string; element: string; color: string; function: string;
        }>}
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
        boostPoints={
          energyPanelPart && auraBoostResult
            ? auraBoostResult.boostBreakdown.find(b => b.category === energyPanelPart)?.points
            : undefined
        }
        boostReason={
          energyPanelPart && auraBoostResult
            ? auraBoostResult.boostBreakdown.find(b => b.category === energyPanelPart)?.reason
            : undefined
        }
      />
    </div>
  );
}
