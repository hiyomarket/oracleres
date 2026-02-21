import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Trophy, Target, Sparkles, ChevronDown, ChevronUp, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface LotteryResultCheckerProps {
  latestSessionId?: number;
  latestNumbers?: number[];
  latestDayPillar?: string;
  latestDateString?: string;
}

const ELEMENT_MAP: Record<number, { el: string; color: string; label: string }> = {
  1: { el: "wood",  color: "#22c55e", label: "木" },
  3: { el: "wood",  color: "#22c55e", label: "木" },
  8: { el: "wood",  color: "#22c55e", label: "木" },
  2: { el: "fire",  color: "#f97316", label: "火" },
  7: { el: "fire",  color: "#f97316", label: "火" },
  5: { el: "earth", color: "#ca8a04", label: "土" },
  0: { el: "earth", color: "#ca8a04", label: "土" },
  4: { el: "metal", color: "#94a3b8", label: "金" },
  9: { el: "metal", color: "#94a3b8", label: "金" },
  6: { el: "water", color: "#3b82f6", label: "水" },
};

function getElementInfo(n: number) {
  return ELEMENT_MAP[n % 10] ?? { el: "earth", color: "#ca8a04", label: "土" };
}

export function LotteryResultChecker({
  latestSessionId,
  latestNumbers,
  latestDayPillar,
  latestDateString,
}: LotteryResultCheckerProps) {
  const [showChecker, setShowChecker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [actualNumbers, setActualNumbers] = useState<string[]>(["", "", "", "", "", ""]);
  const [actualBonus, setActualBonus] = useState("");
  const [result, setResult] = useState<{ matchCount: number; bonusMatch: number; resonanceScore: number } | null>(null);

  const saveMutation = trpc.lotteryResult.save.useMutation();
  const { data: historyData, refetch } = trpc.lotteryResult.history.useQuery(undefined, { enabled: showHistory });

  const handleNumberInput = (idx: number, val: string) => {
    const num = val.replace(/\D/g, "").slice(0, 2);
    const updated = [...actualNumbers];
    updated[idx] = num;
    setActualNumbers(updated);
  };

  const handleSubmit = async () => {
    const nums = actualNumbers.map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 1 && n <= 49);
    if (nums.length !== 6) {
      toast.error("請輸入完整的6個開獎號碼（1-49）");
      return;
    }
    const bonus = actualBonus ? parseInt(actualBonus) : undefined;

    try {
      const res = await saveMutation.mutateAsync({
        sessionId: latestSessionId,
        predictedNumbers: latestNumbers ?? [],
        actualNumbers: nums,
        actualBonus: bonus,
        dayPillar: latestDayPillar ?? "",
        dateString: latestDateString ?? "",
      });
      setResult(res);
      if (showHistory) refetch();
      toast.success("開獎對照已記錄！");
    } catch (e) {
      toast.error("記錄失敗，請稍後再試");
    }
  };

  const getMatchLabel = (count: number) => {
    if (count === 6) return { label: "頭獎！", color: "text-amber-400", icon: "🏆" };
    if (count === 5) return { label: "二獎", color: "text-orange-400", icon: "🥇" };
    if (count === 4) return { label: "三獎", color: "text-yellow-400", icon: "🥈" };
    if (count === 3) return { label: "四獎", color: "text-emerald-400", icon: "🥉" };
    if (count === 2) return { label: "五獎", color: "text-blue-400", icon: "✨" };
    if (count === 1) return { label: "普通獎", color: "text-slate-400", icon: "⭐" };
    return { label: "未中獎", color: "text-slate-500", icon: "🌙" };
  };

  return (
    <div className="space-y-3">
      {/* 開獎對照按鈕 */}
      <button
        onClick={() => setShowChecker(!showChecker)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-amber-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">開獎對照 · 天命共振驗證</span>
        </div>
        {showChecker ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
      </button>

      <AnimatePresence>
        {showChecker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-amber-500/20 p-5 space-y-4">
              {/* 天命選號預覽 */}
              {latestNumbers && latestNumbers.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">天命選號（本次預測）</div>
                  <div className="flex gap-2 flex-wrap">
                    {latestNumbers.map((n, i) => {
                      const el = getElementInfo(n);
                      return (
                        <div key={i} className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border"
                          style={{ borderColor: el.color + "60", backgroundColor: el.color + "20", color: el.color }}>
                          {n}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 輸入實際開獎號碼 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">輸入實際開獎號碼</div>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {actualNumbers.map((val, i) => (
                    <input
                      key={i}
                      type="number"
                      min={1}
                      max={49}
                      value={val}
                      onChange={e => handleNumberInput(i, e.target.value)}
                      placeholder={`${i + 1}`}
                      className="w-full h-10 text-center text-sm font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-amber-400/50 focus:bg-amber-900/20 transition-all"
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-500 w-16 flex-shrink-0">特別號</div>
                  <input
                    type="number"
                    min={1}
                    max={49}
                    value={actualBonus}
                    onChange={e => setActualBonus(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="特別號"
                    className="w-24 h-9 text-center text-sm font-bold rounded-xl border border-purple-500/20 bg-purple-900/10 text-purple-300 focus:outline-none focus:border-purple-400/50 transition-all"
                  />
                </div>
              </div>

              {/* 提交按鈕 */}
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  color: "#000",
                  opacity: saveMutation.isPending ? 0.6 : 1,
                }}
              >
                {saveMutation.isPending ? "計算中..." : "✦ 計算天命共振"}
              </button>

              {/* 結果顯示 */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-4 text-center"
                  >
                    {(() => {
                      const { label, color, icon } = getMatchLabel(result.matchCount);
                      return (
                        <>
                          <div className="text-3xl mb-2">{icon}</div>
                          <div className={`text-xl font-black mb-1 ${color}`}>{label}</div>
                          <div className="text-sm text-slate-400 mb-3">
                            命中 <span className="text-white font-bold">{result.matchCount}</span> 個號碼
                            {result.bonusMatch ? <span className="text-purple-400 ml-2">+ 特別號</span> : ""}
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs text-slate-400">五行共振指數</span>
                            <span className="text-amber-400 font-bold">{result.resonanceScore}</span>
                            <span className="text-slate-500 text-xs">/ 100</span>
                          </div>
                          {result.resonanceScore >= 70 && (
                            <div className="mt-2 text-xs text-amber-300/80">
                              ✦ 天命能量高度共振，此次結果已被宇宙記錄
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 歷史統計按鈕 */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/10 bg-white/3 hover:bg-white/5 transition-all"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-300">天命命中率統計</span>
        </div>
        {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <AnimatePresence>
        {showHistory && historyData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
              {/* 統計摘要 */}
              {historyData.stats && historyData.stats.total > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <div className="text-lg font-black text-white">{historyData.stats.total}</div>
                      <div className="text-[10px] text-slate-500">總對照次數</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <div className="text-lg font-black text-emerald-400">{historyData.stats.avgMatchCount}</div>
                      <div className="text-[10px] text-slate-500">平均命中數</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3 text-center">
                      <div className="text-lg font-black text-amber-400">{historyData.stats.avgResonance}</div>
                      <div className="text-[10px] text-slate-500">平均共振指數</div>
                    </div>
                  </div>

                  {/* 命中分布 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-2">命中數分布</div>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3, 4, 5, 6].map(n => {
                        const count = historyData.stats?.distribution[n] ?? 0;
                        const total = historyData.stats?.total ?? 1;
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const { label, color } = getMatchLabel(n);
                        return (
                          <div key={n} className="flex items-center gap-2">
                            <div className="w-12 text-[10px] text-slate-500 text-right">{n}個</div>
                            <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: 0.1 * n, duration: 0.5 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: pct > 0 ? "#f97316" : "transparent", opacity: 0.6 + pct / 200 }}
                              />
                            </div>
                            <div className={`w-12 text-[10px] text-right ${color}`}>{count}次</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 最近記錄 */}
                  {historyData.records.length > 0 && (
                    <div>
                      <div className="text-xs text-slate-500 mb-2">最近對照記錄</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {historyData.records.slice(0, 5).map((r) => {
                          const { label, color, icon } = getMatchLabel(r.matchCount);
                          return (
                            <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2">
                              <div>
                                <div className="text-xs text-slate-400">{r.dateString}</div>
                                <div className="flex gap-1 mt-1">
                                  {(r.actualNumbers as number[]).map((n, i) => {
                                    const isMatch = (r.predictedNumbers as number[]).includes(n);
                                    return (
                                      <span key={i} className={`text-[10px] font-bold px-1 rounded ${isMatch ? "text-amber-400" : "text-slate-600"}`}>
                                        {n}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-bold ${color}`}>{icon} {label}</div>
                                <div className="text-[10px] text-slate-500">共振 {r.resonanceScore}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  尚無對照記錄<br />
                  <span className="text-xs text-slate-600">購買後輸入開獎號碼，開始累積天命共振數據</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
