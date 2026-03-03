/**
 * LotteryCheckers.tsx
 * 大樂透、威力彩、三星彩、四星彩 開獎對照組件
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Trophy, Target, Sparkles, ChevronDown, ChevronUp, Star } from "lucide-react";
import { toast } from "sonner";

// ── 共用工具 ──────────────────────────────────────────────────────────────────
const ELEMENT_MAP: Record<number, { color: string; label: string }> = {
  1: { color: "#22c55e", label: "木" }, 3: { color: "#22c55e", label: "木" }, 8: { color: "#22c55e", label: "木" },
  2: { color: "#f97316", label: "火" }, 7: { color: "#f97316", label: "火" },
  5: { color: "#ca8a04", label: "土" }, 0: { color: "#ca8a04", label: "土" },
  4: { color: "#94a3b8", label: "金" }, 9: { color: "#94a3b8", label: "金" },
  6: { color: "#3b82f6", label: "水" },
};
function getEl(n: number) { return ELEMENT_MAP[n % 10] ?? { color: "#ca8a04", label: "土" }; }

function NumberBall({ n, isMatch, size = "md" }: { n: number; isMatch?: boolean; size?: "sm" | "md" }) {
  const el = getEl(n);
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center font-black border-2 transition-all ${
        isMatch
          ? "border-amber-400 shadow-lg shadow-amber-500/30"
          : "border-white/10"
      }`}
      style={{
        backgroundColor: isMatch ? `${el.color}30` : "rgba(255,255,255,0.05)",
        color: isMatch ? el.color : "#64748b",
      }}
    >
      {n}
    </div>
  );
}

function ResonanceResult({ score, matchLabel, matchIcon, matchColor, extra }: {
  score: number;
  matchLabel: string;
  matchIcon: string;
  matchColor: string;
  extra?: string;
}) {
  const resonanceLabel =
    score >= 85 ? { label: "✦ 天命高度共振！宇宙已記錄您的能量軌跡", color: "text-amber-400" } :
    score >= 65 ? { label: "◎ 能量良好共振，繼續累積天命數據", color: "text-emerald-400" } :
    score >= 50 ? { label: "○ 輕微共振，每一次嘗試都是天命的練習", color: "text-blue-400" } :
    { label: "◇ 能量待補充，靜心等待下一個吉時", color: "text-slate-400" };
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-4 text-center space-y-2"
    >
      <div className="text-3xl">{matchIcon}</div>
      <div className={`text-xl font-black ${matchColor}`}>{matchLabel}</div>
      {extra && <div className="text-sm text-slate-400">{extra}</div>}
      <div className="flex items-center justify-center gap-2 mt-2">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="text-xs text-slate-400">五行共振指數</span>
        <span className="text-amber-400 font-bold">{score}</span>
        <span className="text-slate-500 text-xs">/ 100</span>
      </div>
      <div className={`text-xs ${resonanceLabel.color}`}>{resonanceLabel.label}</div>
    </motion.div>
  );
}

// ── 大樂透開獎對照 ────────────────────────────────────────────────────────────
interface BigLottoCheckerProps {
  predictedNumbers?: number[];
  predictedSpecial?: number;
  dayPillar?: string;
  dateString?: string;
}
export function BigLottoChecker({ predictedNumbers, predictedSpecial, dayPillar, dateString }: BigLottoCheckerProps) {
  const [show, setShow] = useState(false);
  const [actualNums, setActualNums] = useState<string[]>(["", "", "", "", "", ""]);
  const [actualBonus, setActualBonus] = useState("");
  const [result, setResult] = useState<any>(null);
  const saveMutation = trpc.lotteryResult.save.useMutation();
  const { data: historyData, refetch } = trpc.lotteryResult.history.useQuery(undefined, { enabled: show });

  const handleSubmit = async () => {
    const nums = actualNums.map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 1 && n <= 49);
    if (nums.length < 6) { toast.error("請輸入6個開獎號碼（1-49）"); return; }
    const bonus = actualBonus ? parseInt(actualBonus) : undefined;
    try {
      const res = await saveMutation.mutateAsync({
        predictedNumbers: predictedNumbers ?? [],
        actualNumbers: nums.slice(0, 6) as [number, number, number, number, number, number],
        actualNumbersFlex: nums,
        actualBonus: bonus,
        dayPillar: dayPillar ?? "",
        dateString: dateString ?? "",
        ticketType: 'bigLotto',
      });
      setResult(res);
      refetch();
      toast.success("✦ 大樂透開獎對照已記錄！天命共振分析完成");
    } catch { toast.error("記錄失敗，請稍後再試"); }
  };

  const getMatchLabel = (c: number) => {
    if (c === 6) return { label: "頭獎！天命完全共振！", color: "text-amber-400", icon: "🏆" };
    if (c === 5) return { label: "二獎 — 您已非常接近天命！", color: "text-orange-400", icon: "🥇" };
    if (c === 4) return { label: "三獎 — 天命能量持續累積中", color: "text-yellow-400", icon: "🥈" };
    if (c === 3) return { label: "四獎 — 宇宙正在為您鋪路", color: "text-emerald-400", icon: "🥉" };
    if (c === 2) return { label: "五獎 — 天命初現，繼續堅持", color: "text-blue-400", icon: "✨" };
    if (c === 1) return { label: "六獎 — 每一個共振都是積累", color: "text-slate-400", icon: "⭐" };
    return { label: "未中獎 — 靜心等待，天命自有安排", color: "text-slate-500", icon: "🌙" };
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-amber-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">大樂透開獎對照</span>
          <span className="text-[10px] text-slate-500">輸入開獎號碼，驗證天命共振</span>
        </div>
        {show ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-amber-500/20 p-5 space-y-4">
              {/* 天命選號預覽 */}
              {predictedNumbers && predictedNumbers.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">✦ 天命選號（本次預測）</div>
                  <div className="flex gap-2 flex-wrap">
                    {predictedNumbers.map((n, i) => <NumberBall key={i} n={n} />)}
                    {predictedSpecial !== undefined && (
                      <>
                        <span className="text-slate-600 self-center">+</span>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 border-purple-500/40 bg-purple-900/20 text-purple-400">{predictedSpecial}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {/* 輸入開獎號碼 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">輸入開獎號碼（1-49，共6個）</div>
                <div className="flex gap-2 flex-wrap">
                  {actualNums.map((v, i) => (
                    <input
                      key={i}
                      type="number" min={1} max={49}
                      value={v}
                      onChange={e => { const a = [...actualNums]; a[i] = e.target.value.slice(0, 2); setActualNums(a); }}
                      placeholder={`${i + 1}`}
                      className="w-12 h-10 text-center text-sm font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-amber-500/50 [appearance:textfield]"
                    />
                  ))}
                </div>
              </div>
              {/* 特別號 */}
              <div>
                <div className="text-xs text-slate-400 mb-2">特別號（選填）</div>
                <input
                  type="number" min={1} max={49}
                  value={actualBonus}
                  onChange={e => setActualBonus(e.target.value.slice(0, 2))}
                  placeholder="特別號"
                  className="w-20 h-10 text-center text-sm font-bold rounded-xl border border-purple-500/20 bg-purple-900/10 text-purple-300 focus:outline-none focus:border-purple-500/50 [appearance:textfield]"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "#000" }}
              >
                {saveMutation.isPending ? "天命計算中..." : "✦ 記錄大樂透共振"}
              </button>
              <AnimatePresence>
                {result && (
                  <ResonanceResult
                    score={result.resonanceScore}
                    matchLabel={getMatchLabel(result.matchCount).label}
                    matchIcon={getMatchLabel(result.matchCount).icon}
                    matchColor={getMatchLabel(result.matchCount).color}
                    extra={`命中 ${result.matchCount} 個號碼${result.bonusMatch ? " + 特別號" : ""}`}
                  />
                )}
              </AnimatePresence>
              {/* 歷史記錄 */}
              {historyData?.records && historyData.records.filter(r => r.ticketType === 'bigLotto').length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">最近大樂透記錄</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {historyData.records.filter(r => r.ticketType === 'bigLotto').slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-slate-400">{r.dateString}</span>
                          </div>
                          <div className="flex gap-1 mt-1">
                            {(r.actualNumbers as number[]).map((n, i) => (
                              <span key={i} className={`text-[10px] font-bold px-1 rounded ${(r.predictedNumbers as number[]).includes(n) ? "text-amber-400" : "text-slate-600"}`}>{n}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${getMatchLabel(r.matchCount).color}`}>{getMatchLabel(r.matchCount).icon}</div>
                          <div className="text-[10px] text-slate-500">共振 {r.resonanceScore}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 威力彩開獎對照 ────────────────────────────────────────────────────────────
interface PowerballCheckerProps {
  predictedNumbers?: number[];
  predictedPower?: number;
  dayPillar?: string;
  dateString?: string;
}
export function PowerballChecker({ predictedNumbers, predictedPower, dayPillar, dateString }: PowerballCheckerProps) {
  const [show, setShow] = useState(false);
  const [actualNums, setActualNums] = useState<string[]>(["", "", "", "", "", ""]);
  const [actualPower, setActualPower] = useState("");
  const [result, setResult] = useState<any>(null);
  const saveMutation = trpc.lotteryResult.save.useMutation();
  const { data: historyData, refetch } = trpc.lotteryResult.history.useQuery(undefined, { enabled: show });

  const handleSubmit = async () => {
    const nums = actualNums.map(s => parseInt(s)).filter(n => !isNaN(n) && n >= 1 && n <= 38);
    if (nums.length < 6) { toast.error("請輸入6個第一區號碼（1-38）"); return; }
    const power = actualPower ? parseInt(actualPower) : undefined;
    if (power !== undefined && (power < 1 || power > 8)) { toast.error("第二區號碼為 1-8"); return; }
    try {
      const res = await saveMutation.mutateAsync({
        predictedNumbers: predictedNumbers ?? [],
        actualNumbers: nums.slice(0, 6) as [number, number, number, number, number, number],
        actualNumbersFlex: nums,
        actualBonus: power,
        dayPillar: dayPillar ?? "",
        dateString: dateString ?? "",
        ticketType: 'powerball',
      });
      setResult(res);
      refetch();
      toast.success("✦ 威力彩開獎對照已記錄！天命共振分析完成");
    } catch { toast.error("記錄失敗，請稍後再試"); }
  };

  const getMatchLabel = (c: number, hasPower: boolean) => {
    if (c === 6 && hasPower) return { label: "頭獎！天命完全共振！", color: "text-amber-400", icon: "🏆" };
    if (c === 6) return { label: "貳獎 — 第一區全中！天命強烈共振！", color: "text-orange-400", icon: "🥇" };
    if (c === 5 && hasPower) return { label: "參獎 — 天命能量澎湃！", color: "text-yellow-400", icon: "🥈" };
    if (c === 5) return { label: "肆獎 — 宇宙正在為您鋪路", color: "text-emerald-400", icon: "🥉" };
    if (c === 4) return { label: "伍獎 — 天命初現，繼續堅持", color: "text-blue-400", icon: "✨" };
    if (c === 3) return { label: "陸獎 — 每一個共振都是積累", color: "text-slate-400", icon: "⭐" };
    if (hasPower) return { label: "柒獎 — 第二區共振，天命有跡可循", color: "text-purple-400", icon: "💫" };
    return { label: "未中獎 — 靜心等待，天命自有安排", color: "text-slate-500", icon: "🌙" };
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-purple-500/20 bg-purple-900/10 hover:bg-purple-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-purple-300">威力彩開獎對照</span>
          <span className="text-[10px] text-slate-500">第一區1-38 · 第二區1-8</span>
        </div>
        {show ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-purple-500/20 p-5 space-y-4">
              {predictedNumbers && predictedNumbers.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">✦ 天命選號（第一區）</div>
                  <div className="flex gap-2 flex-wrap">
                    {predictedNumbers.map((n, i) => <NumberBall key={i} n={n} />)}
                    {predictedPower !== undefined && (
                      <>
                        <span className="text-slate-600 self-center">第二區</span>
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 border-purple-500/40 bg-purple-900/20 text-purple-400">{predictedPower}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-2">第一區開獎號碼（1-38，共6個）</div>
                <div className="flex gap-2 flex-wrap">
                  {actualNums.map((v, i) => (
                    <input key={i} type="number" min={1} max={38} value={v}
                      onChange={e => { const a = [...actualNums]; a[i] = e.target.value.slice(0, 2); setActualNums(a); }}
                      placeholder={`${i + 1}`}
                      className="w-12 h-10 text-center text-sm font-bold rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-purple-500/50 [appearance:textfield]"
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-2">第二區號碼（1-8）</div>
                <input type="number" min={1} max={8} value={actualPower}
                  onChange={e => setActualPower(e.target.value.slice(0, 1))}
                  placeholder="1-8"
                  className="w-20 h-10 text-center text-sm font-bold rounded-xl border border-purple-500/20 bg-purple-900/10 text-purple-300 focus:outline-none focus:border-purple-500/50 [appearance:textfield]"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "#fff" }}
              >
                {saveMutation.isPending ? "天命計算中..." : "✦ 記錄威力彩共振"}
              </button>
              <AnimatePresence>
                {result && (
                  <ResonanceResult
                    score={result.resonanceScore}
                    matchLabel={getMatchLabel(result.matchCount, !!result.bonusMatch).label}
                    matchIcon={getMatchLabel(result.matchCount, !!result.bonusMatch).icon}
                    matchColor={getMatchLabel(result.matchCount, !!result.bonusMatch).color}
                    extra={`第一區命中 ${result.matchCount} 個${result.bonusMatch ? " + 第二區命中" : ""}`}
                  />
                )}
              </AnimatePresence>
              {historyData?.records && historyData.records.filter(r => r.ticketType === 'powerball').length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">最近威力彩記錄</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {historyData.records.filter(r => r.ticketType === 'powerball').slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2">
                        <div>
                          <span className="text-xs text-slate-400">{r.dateString}</span>
                          <div className="flex gap-1 mt-1">
                            {(r.actualNumbers as number[]).map((n, i) => (
                              <span key={i} className={`text-[10px] font-bold px-1 rounded ${(r.predictedNumbers as number[]).includes(n) ? "text-purple-400" : "text-slate-600"}`}>{n}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500">共振 {r.resonanceScore}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 三星彩開獎對照 ────────────────────────────────────────────────────────────
interface ThreeStarCheckerProps {
  predictedDigits?: [number, number, number];
  predictedStraight?: string;
  dayPillar?: string;
  dateString?: string;
}
export function ThreeStarChecker({ predictedDigits, predictedStraight, dayPillar, dateString }: ThreeStarCheckerProps) {
  const [show, setShow] = useState(false);
  const [actualStr, setActualStr] = useState("");
  const [result, setResult] = useState<any>(null);
  const saveMutation = trpc.lotteryResult.save.useMutation();
  const { data: historyData, refetch } = trpc.lotteryResult.history.useQuery(undefined, { enabled: show });

  const handleSubmit = async () => {
    if (!/^\d{3}$/.test(actualStr)) { toast.error("請輸入3位數開獎號碼（000-999）"); return; }
    try {
      const res = await saveMutation.mutateAsync({
        predictedNumbers: predictedDigits ? [...predictedDigits] : [],
        actualNumbers: [0, 0, 0, 0, 0, 0],
        actualDigitString: actualStr,
        dayPillar: dayPillar ?? "",
        dateString: dateString ?? "",
        ticketType: 'threeStar',
      });
      setResult(res);
      refetch();
      toast.success("✦ 三星彩開獎對照已記錄！");
    } catch { toast.error("記錄失敗，請稍後再試"); }
  };

  const getMatchLabel = (c: number, isExact: boolean) => {
    if (isExact) return { label: "直選中獎！天命精準共振！", color: "text-amber-400", icon: "🏆" };
    if (c === 3) return { label: "組選中獎！天命能量匯聚！", color: "text-orange-400", icon: "🥇" };
    if (c === 2) return { label: "2位數字共振，天命在引導您", color: "text-emerald-400", icon: "✨" };
    if (c === 1) return { label: "1位數字共振，宇宙正在校準", color: "text-blue-400", icon: "⭐" };
    return { label: "未中獎 — 靜心等待，天命自有安排", color: "text-slate-500", icon: "🌙" };
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-500/20 bg-emerald-900/10 hover:bg-emerald-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">三星彩開獎對照</span>
          <span className="text-[10px] text-slate-500">000-999 三位數</span>
        </div>
        {show ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-emerald-500/20 p-5 space-y-4">
              {predictedStraight && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">✦ 天命直選號碼</div>
                  <div className="flex gap-2">
                    {predictedStraight.split("").map((d, i) => (
                      <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border border-emerald-500/40 bg-emerald-900/20 text-emerald-300">{d}</div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-2">輸入開獎號碼（3位數，如：123）</div>
                <input
                  type="text" maxLength={3}
                  value={actualStr}
                  onChange={e => setActualStr(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="000-999"
                  className="w-32 h-12 text-center text-xl font-black rounded-xl border border-emerald-500/20 bg-emerald-900/10 text-emerald-300 focus:outline-none focus:border-emerald-400/50 tracking-widest"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff" }}
              >
                {saveMutation.isPending ? "天命計算中..." : "✦ 記錄三星彩共振"}
              </button>
              <AnimatePresence>
                {result && (
                  <ResonanceResult
                    score={result.resonanceScore}
                    matchLabel={getMatchLabel(result.matchCount, !!result.bonusMatch).label}
                    matchIcon={getMatchLabel(result.matchCount, !!result.bonusMatch).icon}
                    matchColor={getMatchLabel(result.matchCount, !!result.bonusMatch).color}
                    extra={result.bonusMatch ? `直選完全命中！` : `${result.matchCount} 個數字位置共振`}
                  />
                )}
              </AnimatePresence>
              {historyData?.records && historyData.records.filter(r => r.ticketType === 'threeStar').length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">最近三星彩記錄</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {historyData.records.filter(r => r.ticketType === 'threeStar').slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2">
                        <span className="text-xs text-slate-400">{r.dateString}</span>
                        <div className="text-[10px] text-slate-500">共振 {r.resonanceScore}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── 四星彩開獎對照 ────────────────────────────────────────────────────────────
interface FourStarCheckerProps {
  predictedDigits?: [number, number, number, number];
  predictedStraight?: string;
  dayPillar?: string;
  dateString?: string;
}
export function FourStarChecker({ predictedDigits, predictedStraight, dayPillar, dateString }: FourStarCheckerProps) {
  const [show, setShow] = useState(false);
  const [actualStr, setActualStr] = useState("");
  const [result, setResult] = useState<any>(null);
  const saveMutation = trpc.lotteryResult.save.useMutation();
  const { data: historyData, refetch } = trpc.lotteryResult.history.useQuery(undefined, { enabled: show });

  const handleSubmit = async () => {
    if (!/^\d{4}$/.test(actualStr)) { toast.error("請輸入4位數開獎號碼（0000-9999）"); return; }
    try {
      const res = await saveMutation.mutateAsync({
        predictedNumbers: predictedDigits ? [...predictedDigits] : [],
        actualNumbers: [0, 0, 0, 0, 0, 0],
        actualDigitString: actualStr,
        dayPillar: dayPillar ?? "",
        dateString: dateString ?? "",
        ticketType: 'fourStar',
      });
      setResult(res);
      refetch();
      toast.success("✦ 四星彩開獎對照已記錄！");
    } catch { toast.error("記錄失敗，請稍後再試"); }
  };

  const getMatchLabel = (c: number, isExact: boolean) => {
    if (isExact) return { label: "直選中獎！天命四維完全共振！", color: "text-amber-400", icon: "🏆" };
    if (c >= 3) return { label: "組選中獎！天命三維共振！", color: "text-orange-400", icon: "🥇" };
    if (c === 2) return { label: "2位共振，宇宙正在精準校準", color: "text-emerald-400", icon: "✨" };
    if (c === 1) return { label: "1位共振，天命能量持續累積", color: "text-blue-400", icon: "⭐" };
    return { label: "未中獎 — 靜心等待，天命自有安排", color: "text-slate-500", icon: "🌙" };
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-cyan-500/20 bg-cyan-900/10 hover:bg-cyan-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-300">四星彩開獎對照</span>
          <span className="text-[10px] text-slate-500">0000-9999 四位數</span>
        </div>
        {show ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-cyan-400" />}
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-cyan-500/20 p-5 space-y-4">
              {predictedStraight && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">✦ 天命直選號碼</div>
                  <div className="flex gap-2">
                    {predictedStraight.split("").map((d, i) => (
                      <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border border-cyan-500/40 bg-cyan-900/20 text-cyan-300">{d}</div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-400 mb-2">輸入開獎號碼（4位數，如：1234）</div>
                <input
                  type="text" maxLength={4}
                  value={actualStr}
                  onChange={e => setActualStr(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000-9999"
                  className="w-40 h-12 text-center text-xl font-black rounded-xl border border-cyan-500/20 bg-cyan-900/10 text-cyan-300 focus:outline-none focus:border-cyan-400/50 tracking-widest"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0891b2, #06b6d4)", color: "#fff" }}
              >
                {saveMutation.isPending ? "天命計算中..." : "✦ 記錄四星彩共振"}
              </button>
              <AnimatePresence>
                {result && (
                  <ResonanceResult
                    score={result.resonanceScore}
                    matchLabel={getMatchLabel(result.matchCount, !!result.bonusMatch).label}
                    matchIcon={getMatchLabel(result.matchCount, !!result.bonusMatch).icon}
                    matchColor={getMatchLabel(result.matchCount, !!result.bonusMatch).color}
                    extra={result.bonusMatch ? "直選完全命中！" : `${result.matchCount} 個數字位置共振`}
                  />
                )}
              </AnimatePresence>
              {historyData?.records && historyData.records.filter(r => r.ticketType === 'fourStar').length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">最近四星彩記錄</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {historyData.records.filter(r => r.ticketType === 'fourStar').slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2">
                        <span className="text-xs text-slate-400">{r.dateString}</span>
                        <div className="text-[10px] text-slate-500">共振 {r.resonanceScore}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
