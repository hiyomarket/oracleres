/**
 * 補運穿搭頁面（/outfit）
 * 獨立模塊頁面：今日五行加權總覽 + 穿搭建議 + 飲食建議 + 手串矩陣
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { NearbyRestaurants } from "@/components/NearbyRestaurants";
import { toast } from "sonner";

// 五行顏色映射
const WUXING_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  火: { bg: "bg-red-950/40", border: "border-red-500/50", text: "text-red-400" },
  土: { bg: "bg-amber-950/40", border: "border-amber-500/50", text: "text-amber-400" },
  金: { bg: "bg-slate-800/40", border: "border-slate-400/50", text: "text-slate-300" },
  水: { bg: "bg-blue-950/40", border: "border-blue-500/50", text: "text-blue-400" },
  木: { bg: "bg-emerald-950/40", border: "border-emerald-500/50", text: "text-emerald-400" },
};

function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

function SectionCard({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
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

type ActiveTab = "outfit" | "bracelet";

export default function OutfitPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);
  const todayDate = getTaiwanDateStr(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("outfit");

  const { data, isLoading } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

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

  const TABS: { key: ActiveTab; label: string; icon: string; feature?: string }[] = [
    { key: "outfit", label: "穿搭建議", icon: "👗", feature: "warroom_outfit" },
    { key: "bracelet", label: "手串矩陣", icon: "📿", feature: "warroom_outfit" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="outfit" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
            <span>✨</span> 補運穿搭
          </h1>
          <p className="text-white/40 text-sm mt-1">以今日五行能量，為你量身打造穿搭策略</p>
        </motion.div>

        {/* 日期選擇器 */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[-1, 0, 1, 2].map((offset) => {
            const d = getTaiwanDateStr(offset);
            const label = offset === -1 ? "昨日" : offset === 0 ? "今日" : offset === 1 ? "明日" : `+${offset}日`;
            return (
              <button
                key={offset}
                onClick={() => setSelectedOffset(offset)}
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

        {/* 內容區 */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-white/30">無法載入今日能量資料</div>
        ) : (
          <>
        {/* ═══ 五行加權總覽（常駐顯示）═══ */}
        {data && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
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
                    {data.wuxing && ["木","火","土","金","水"].map((el) => {
                      const natal = data.wuxing.natal?.[el as keyof typeof data.wuxing.natal] ?? 0;
                      const env = data.wuxing.environment?.[el as keyof typeof data.wuxing.environment] ?? 0;
                      const w = data.wuxing.weighted?.[el as keyof typeof data.wuxing.weighted] ?? 0;
                      const isStrong = el === data.wuxing.dominantElement;
                      const isWeak = el === data.wuxing.weakestElement;
                      return (
                        <tr key={el} className={`border-b border-white/5 ${isStrong ? "bg-amber-500/5" : isWeak ? "bg-blue-500/5" : ""}`}>
                          <td className="py-2 pr-3 font-semibold text-white/80">{el}</td>
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
              {data.wuxing?.coreContradiction && (
                <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400 text-sm">⚡</span>
                  <span className="text-amber-300/80 text-xs ml-2">{data.wuxing.coreContradiction}</span>
                </div>
              )}
            </SectionCard>
          </motion.div>
        )}

          <AnimatePresence mode="wait">
            {/* 穿搭建議 */}
            {activeTab === "outfit" && (
              !isAdmin && !hasFeature("warroom_outfit") ? (
                <motion.div key="outfit-locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <FeatureLockedCard feature="warroom_outfit" />
                </motion.div>
              ) : (
                <motion.div key="outfit" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <SectionCard title="今日穿搭建議" icon="👗">
                    <div className="space-y-3">
                      {data.outfit?.energyTag && (
                        <div className="rounded-xl bg-orange-950/20 border border-orange-500/20 p-3">
                          <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                            {data.outfit.energyTag}
                          </span>
                          {data.outfit?.coreStrategy && (
                            <p className="text-orange-300/80 text-xs mt-2">{data.outfit.coreStrategy}</p>
                          )}
                        </div>
                      )}
                      <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-400 text-xs font-semibold">上半身</span>
                          <span className="text-white font-medium text-sm">{data.outfit?.upperBody?.colors?.join(" / ") || ""}</span>
                          <span className="text-red-500/60 text-xs ml-auto">{data.outfit?.upperBody?.element}</span>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed">{data.outfit?.upperBody?.tacticalExplanation}</p>
                      </div>
                      <div className="rounded-xl bg-amber-950/20 border border-amber-500/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-amber-400 text-xs font-semibold">下半身</span>
                          <span className="text-white font-medium text-sm">{data.outfit?.lowerBody?.colors?.join(" / ") || ""}</span>
                          <span className="text-amber-500/60 text-xs ml-auto">{data.outfit?.lowerBody?.element}</span>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed">{data.outfit?.lowerBody?.tacticalExplanation}</p>
                      </div>
                      {data.outfit?.avoid && data.outfit.avoid.length > 0 && (
                        <div className="rounded-xl bg-slate-800/40 border border-slate-500/20 p-3">
                          <div className="text-slate-400 text-xs font-semibold mb-2">⚠️ 今日避開</div>
                          {data.outfit.avoid.map((item: { element: string; colors: string[]; reason: string }, i: number) => (
                            <div key={i} className="mb-1">
                              <span className="text-slate-300 text-xs">{item.element}色系（{item.colors.slice(0, 2).join("/")}）</span>
                              <span className="text-slate-500 text-xs ml-2">— {item.reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </motion.div>
              )
            )}

            {/* 飲食建議 */}
            {activeTab === "bracelet" && (
              !isAdmin && !hasFeature("warroom_outfit") ? (
                <motion.div key="bracelet-locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <FeatureLockedCard feature="warroom_outfit" />
                </motion.div>
              ) : (
                <motion.div key="bracelet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <SectionCard title="今日手串矩陣" icon="📿">
                    <div className="space-y-4">
                      {data.bracelets?.coreGoal && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                          <p className="text-white/70 text-sm">{data.bracelets.coreGoal}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {/* 左手 */}
                        <div>
                          <div className="text-emerald-400/70 text-xs font-semibold mb-2">🤲 左手（能量/吸引）</div>
                          {data.bracelets?.leftHand && (
                            <div className={`rounded-lg border p-3 transition-all ${
                              wornSet.has(`${data.bracelets.leftHand.code}-left`)
                                ? "bg-emerald-900/40 border-emerald-400/50"
                                : "bg-emerald-950/20 border-emerald-500/20"
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-emerald-500/60 text-xs font-mono">{data.bracelets.leftHand.code}</span>
                                  <span className="text-emerald-300 font-medium text-sm ml-2">{data.bracelets.leftHand.name}</span>
                                </div>
                                <button
                                  onClick={() => handleToggleWear(data.bracelets.leftHand.code, data.bracelets.leftHand.name, "left")}
                                  disabled={toggleWear.isPending}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                    wornSet.has(`${data.bracelets.leftHand.code}-left`)
                                      ? "bg-emerald-500/30 border border-emerald-400/60 text-emerald-300"
                                      : "bg-white/5 border border-white/20 text-white/40 hover:border-emerald-500/40 hover:text-emerald-400"
                                  }`}
                                >
                                  {wornSet.has(`${data.bracelets.leftHand.code}-left`) ? "✓ 已佩戴" : "佩戴"}
                                </button>
                              </div>
                              <p className="text-emerald-400/70 text-xs font-medium mb-1">⚔️ {data.bracelets.leftHand.tacticalRole}</p>
                              <p className="text-white/50 text-xs leading-relaxed">{data.bracelets.leftHand.explanation}</p>
                            </div>
                          )}
                        </div>
                        {/* 右手 */}
                        <div>
                          <div className="text-blue-400/70 text-xs font-semibold mb-2">🤚 右手（策略/防護）</div>
                          {data.bracelets?.rightHand && (
                            <div className={`rounded-lg border p-3 transition-all ${
                              wornSet.has(`${data.bracelets.rightHand.code}-right`)
                                ? "bg-blue-900/40 border-blue-400/50"
                                : "bg-blue-950/20 border-blue-500/20"
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <span className="text-blue-500/60 text-xs font-mono">{data.bracelets.rightHand.code}</span>
                                  <span className="text-blue-300 font-medium text-sm ml-2">{data.bracelets.rightHand.name}</span>
                                </div>
                                <button
                                  onClick={() => handleToggleWear(data.bracelets.rightHand.code, data.bracelets.rightHand.name, "right")}
                                  disabled={toggleWear.isPending}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                    wornSet.has(`${data.bracelets.rightHand.code}-right`)
                                      ? "bg-blue-500/30 border border-blue-400/60 text-blue-300"
                                      : "bg-white/5 border border-white/20 text-white/40 hover:border-blue-500/40 hover:text-blue-400"
                                  }`}
                                >
                                  {wornSet.has(`${data.bracelets.rightHand.code}-right`) ? "✓ 已佩戴" : "佩戴"}
                                </button>
                              </div>
                              <p className="text-blue-400/70 text-xs font-medium mb-1">🛡️ {data.bracelets.rightHand.tacticalRole}</p>
                              <p className="text-white/50 text-xs leading-relaxed">{data.bracelets.rightHand.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </motion.div>
              )
            )}
          </AnimatePresence>
          </>
        )}
      </main>
    </div>
  );
}
