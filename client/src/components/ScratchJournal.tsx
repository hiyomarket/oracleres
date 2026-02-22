/**
 * ScratchJournal.tsx
 * 刮刮樂購買日誌：快速記錄購買資訊 + 統計分析（面額/時辰/地址命中率）
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { BookOpen, Plus, TrendingUp, Trophy, ChevronDown, ChevronUp, Check, X, BarChart2 } from "lucide-react";
import { toast } from "sonner";

const DENOMINATIONS = [100, 200, 300, 500, 1000, 2000] as const;
const HOUR_LABELS: Record<string, string> = {
  子: "子時 23-1時", 丑: "丑時 1-3時", 寅: "寅時 3-5時", 卯: "卯時 5-7時",
  辰: "辰時 7-9時", 巳: "巳時 9-11時", 午: "午時 11-13時", 未: "未時 13-15時",
  申: "申時 15-17時", 酉: "酉時 17-19時", 戌: "戌時 19-21時", 亥: "亥時 21-23時",
};
const HOURS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function getCurrentHour(): string {
  const h = new Date().getHours();
  if (h >= 23 || h < 1) return "子";
  if (h < 3) return "丑";
  if (h < 5) return "寅";
  if (h < 7) return "卯";
  if (h < 9) return "辰";
  if (h < 11) return "巳";
  if (h < 13) return "午";
  if (h < 15) return "未";
  if (h < 17) return "申";
  if (h < 19) return "酉";
  if (h < 21) return "戌";
  return "亥";
}

export function ScratchJournal() {
  const [showForm, setShowForm] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [form, setForm] = useState({
    denomination: 100 as typeof DENOMINATIONS[number],
    storeAddress: "",
    purchaseHour: getCurrentHour(),
    isWon: false,
    wonAmount: 0,
    note: "",
  });

  const utils = trpc.useUtils();

  // 查詢日誌列表
  const { data: logs = [], isLoading: logsLoading } = trpc.lottery.getScratchLogs.useQuery();

  // 查詢統計
  const { data: stats } = trpc.lottery.getScratchStats.useQuery();

  // 新增日誌 mutation
  const addLog = trpc.lottery.addScratchLog.useMutation({
    onSuccess: () => {
      toast.success("購買記錄已儲存！");
      utils.lottery.getScratchLogs.invalidate();
      utils.lottery.getScratchStats.invalidate();
      setShowForm(false);
      setForm({
        denomination: 100,
        storeAddress: "",
        purchaseHour: getCurrentHour(),
        isWon: false,
        wonAmount: 0,
        note: "",
      });
    },
    onError: (err) => toast.error(`儲存失敗：${err.message}`),
  });

  const handleSubmit = () => {
    if (form.isWon && form.wonAmount <= 0) {
      toast.error("請輸入中獎金額");
      return;
    }
    addLog.mutate({
      denomination: form.denomination,
      storeAddress: form.storeAddress || undefined,
      purchaseHour: form.purchaseHour,
      isWon: form.isWon,
      wonAmount: form.isWon ? form.wonAmount : 0,
      note: form.note || undefined,
      purchasedAt: Date.now(),
    });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString("zh-TW", {
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* ── 標題列 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">刮刮樂購買日誌</h3>
          {logs.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">{logs.length} 筆</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/60 text-slate-300 text-xs hover:bg-slate-700 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            統計
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xs hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            記錄購買
          </button>
        </div>
      </div>

      {/* ── 新增表單 ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-white">記錄這次購買</h4>

              {/* 面額選擇 */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">購買面額</label>
                <div className="flex gap-2 flex-wrap">
                  {DENOMINATIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, denomination: d }))}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                        form.denomination === d
                          ? "bg-amber-500/30 text-amber-300 border border-amber-500/50 ring-1 ring-amber-400/30"
                          : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700"
                      }`}
                    >
                      NT${d}
                    </button>
                  ))}
                </div>
              </div>

              {/* 購買時辰 */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">購買時辰</label>
                <div className="flex gap-1.5 flex-wrap">
                  {HOURS.map(h => (
                    <button
                      key={h}
                      onClick={() => setForm(f => ({ ...f, purchaseHour: h }))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        form.purchaseHour === h
                          ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                          : "bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-700"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* 彩券行地址（選填） */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">彩券行地址（選填）</label>
                <input
                  type="text"
                  value={form.storeAddress}
                  onChange={e => setForm(f => ({ ...f, storeAddress: e.target.value }))}
                  placeholder="例：台北市信義區忠孝東路4段172號"
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* 是否中獎 */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">結果</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, isWon: false, wonAmount: 0 }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      !form.isWon
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-slate-700/40 text-slate-500 border-slate-600/40 hover:bg-slate-700/60"
                    }`}
                  >
                    <X className="w-4 h-4" />
                    未中獎
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, isWon: true }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      form.isWon
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-slate-700/40 text-slate-500 border-slate-600/40 hover:bg-slate-700/60"
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    中獎了！
                  </button>
                </div>
              </div>

              {/* 中獎金額（中獎才顯示） */}
              <AnimatePresence>
                {form.isWon && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="text-xs text-slate-400 mb-1.5 block">中獎金額（元）</label>
                    <input
                      type="number"
                      value={form.wonAmount || ""}
                      onChange={e => setForm(f => ({ ...f, wonAmount: parseInt(e.target.value) || 0 }))}
                      placeholder="例：200"
                      min={1}
                      className="w-full bg-slate-900/60 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500/70"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 備註 */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">備註（選填）</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="例：老闆娘說今天旺，買了3張"
                  maxLength={300}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* 送出按鈕 */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-700/50 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={addLog.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addLog.isPending ? "儲存中..." : <><Check className="w-4 h-4" />儲存記錄</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 統計分析 ── */}
      <AnimatePresence>
        {showStats && stats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">天命共振統計分析</h4>
              </div>

              {/* 總覽 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-900/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">總投入</p>
                  <p className="text-lg font-bold text-white">NT${stats.totalInvested.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">總中獎</p>
                  <p className={`text-lg font-bold ${stats.totalWon > stats.totalInvested ? "text-amber-400" : "text-slate-300"}`}>
                    NT${stats.totalWon.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">中獎率</p>
                  <p className={`text-lg font-bold ${stats.winRate >= 30 ? "text-amber-400" : "text-slate-300"}`}>
                    {stats.winRate}%
                  </p>
                </div>
              </div>

              {/* 各面額統計 */}
              {stats.byDenomination.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">各面額命中率</p>
                  <div className="space-y-2">
                    {stats.byDenomination.map(d => {
                      const rate = d.total > 0 ? Math.round((d.won / d.total) * 100) : 0;
                      const roi = d.totalInvested > 0 ? Math.round((d.totalWon / d.totalInvested) * 100) : 0;
                      return (
                        <div key={d.denomination} className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-16 flex-shrink-0">NT${d.denomination}</span>
                          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${rate >= 30 ? "bg-amber-500" : rate >= 15 ? "bg-blue-500" : "bg-slate-600"}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(rate * 2, 100)}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                          <span className="text-xs text-slate-300 w-16 text-right flex-shrink-0">
                            {d.won}/{d.total}次 ({rate}%)
                          </span>
                          <span className={`text-xs w-14 text-right flex-shrink-0 ${roi >= 100 ? "text-amber-400" : "text-slate-500"}`}>
                            ROI {roi}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 各時辰統計 */}
              {stats.byHour.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">各時辰命中率</p>
                  <div className="flex gap-2 flex-wrap">
                    {stats.byHour.sort((a, b) => b.won / b.total - a.won / a.total).map(h => {
                      const rate = h.total > 0 ? Math.round((h.won / h.total) * 100) : 0;
                      return (
                        <div key={h.hour} className={`px-2.5 py-1.5 rounded-xl text-xs text-center border ${
                          rate >= 30 ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                          rate >= 15 ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
                          "bg-slate-700/40 text-slate-500 border-slate-600/40"
                        }`}>
                          <div className="font-bold">{h.hour}時</div>
                          <div>{rate}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 風水等級中獎率統計 */}
              {(stats as any).byFengShui?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">🧭 風水地場等級中獎率回港</p>
                  <div className="space-y-1.5">
                    {(stats as any).byFengShui.map((f: { grade: string; total: number; won: number; winRate: number }) => {
                      const gradeColors: Record<string, string> = {
                        "大吉": "bg-amber-500/20 text-amber-400 border-amber-500/40",
                        "吉":   "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                        "平":   "bg-slate-600/30 text-slate-400 border-slate-600/40",
                        "凶":   "bg-orange-500/20 text-orange-400 border-orange-500/40",
                        "大凶": "bg-red-500/20 text-red-400 border-red-500/40",
                      };
                      const barColors: Record<string, string> = {
                        "大吉": "bg-amber-500", "吉": "bg-emerald-500", "平": "bg-slate-500", "凶": "bg-orange-500", "大凶": "bg-red-500",
                      };
                      return (
                        <div key={f.grade} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs ${gradeColors[f.grade] ?? "bg-slate-700/40 text-slate-400 border-slate-600/40"}`}>
                          <span className="w-8 font-bold shrink-0">{f.grade}</span>
                          <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColors[f.grade] ?? "bg-slate-500"}`} style={{ width: `${Math.min(f.winRate * 3, 100)}%` }} />
                          </div>
                          <span className="w-10 text-right shrink-0 font-bold">{f.winRate}%</span>
                          <span className="text-[10px] opacity-60 shrink-0">{f.won}/{f.total}筆</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1.5">∗ 風水等級資料來自彩券行 GPS 地圖選店時的風水分析結果</p>
                </div>
              )}
              {stats.byDenomination.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-2">尚無統計數據，開始記錄後即可查看分析</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 日誌列表 ── */}
      {logsLoading ? (
        <div className="text-center py-6 text-slate-400 text-sm">載入中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 bg-slate-800/30 rounded-2xl border border-slate-700/40">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">尚無購買記錄</p>
          <p className="text-slate-600 text-xs mt-1">點擊「記錄購買」開始追蹤您的天命共振</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.slice(0, 20).map((log) => (
            <div
              key={log.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                log.isWon
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-slate-800/30 border-slate-700/40"
              }`}
            >
              {/* 面額 */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                log.isWon ? "bg-amber-500/30 text-amber-300" : "bg-slate-700/60 text-slate-400"
              }`}>
                ${log.denomination}
              </div>

              {/* 資訊 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${log.isWon ? "text-amber-300" : "text-slate-300"}`}>
                    {log.isWon ? `🏆 中獎 NT$${log.wonAmount?.toLocaleString()}` : "未中獎"}
                  </span>
                  {log.purchaseHour && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-400">
                      {log.purchaseHour}時
                    </span>
                  )}
                  {log.resonanceScore && (
                    <span className="text-xs text-amber-500/80">共振{log.resonanceScore}分</span>
                  )}
                </div>
                {log.storeAddress && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{log.storeAddress}</p>
                )}
                {log.note && (
                  <p className="text-xs text-slate-500 mt-0.5 italic">「{log.note}」</p>
                )}
              </div>

              {/* 時間 */}
              <div className="text-xs text-slate-600 flex-shrink-0 text-right">
                {formatDate(log.purchasedAt)}
              </div>
            </div>
          ))}
          {logs.length > 20 && (
            <p className="text-center text-xs text-slate-600 py-2">顯示最新 20 筆，共 {logs.length} 筆記錄</p>
          )}
        </div>
      )}
    </div>
  );
}
