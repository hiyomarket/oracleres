/**
 * ScratchAnalysis.tsx
 * 刮刮樂地址分析 + 面額選號策略 + 最旺時辰聯動
 * 功能：1) 輸入彩券行地址，分析五行共振；2) 依面額（100/200/300/500/1000/2000元）顯示天命選號策略；3) 最旺時辰倒數
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { MapPin, Sparkles, ChevronDown, ChevronUp, Target, TrendingUp, Shield, Zap, Clock, Crown } from "lucide-react";
import { toast } from "sonner";

// 五行顏色
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; label: string; emoji: string }> = {
  fire:  { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", label: "火", emoji: "🔥" },
  earth: { bg: "bg-yellow-600/20", text: "text-yellow-500", border: "border-yellow-600/40", label: "土", emoji: "🌍" },
  metal: { bg: "bg-slate-400/20",  text: "text-slate-300",  border: "border-slate-400/40",  label: "金", emoji: "⚙️" },
  wood:  { bg: "bg-emerald-500/20",text: "text-emerald-400",border: "border-emerald-500/40",label: "木", emoji: "🌿" },
  water: { bg: "bg-blue-500/20",   text: "text-blue-400",   border: "border-blue-500/40",   label: "水", emoji: "💧" },
};

// 面額圖示和顏色（6種）
const DENOMINATION_STYLES: Record<number, { icon: React.ReactNode; gradient: string; ring: string; badge: string }> = {
  100:  { icon: <Shield className="w-5 h-5" />,    gradient: "from-emerald-600 to-teal-500",  ring: "ring-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  200:  { icon: <Target className="w-5 h-5" />,    gradient: "from-blue-600 to-cyan-500",     ring: "ring-blue-500/30",    badge: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  300:  { icon: <TrendingUp className="w-5 h-5" />,gradient: "from-violet-600 to-purple-500", ring: "ring-violet-500/30",  badge: "bg-violet-500/20 text-violet-400 border-violet-500/40" },
  500:  { icon: <Zap className="w-5 h-5" />,       gradient: "from-amber-600 to-orange-500",  ring: "ring-amber-500/30",   badge: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  1000: { icon: <Sparkles className="w-5 h-5" />,  gradient: "from-red-600 to-rose-500",      ring: "ring-red-500/30",     badge: "bg-red-500/20 text-red-400 border-red-500/40" },
  2000: { icon: <Crown className="w-5 h-5" />,     gradient: "from-yellow-500 to-amber-400",  ring: "ring-yellow-400/40",  badge: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40" },
};

const CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  high:   { label: "高度共振", color: "text-amber-400" },
  medium: { label: "中度共振", color: "text-blue-400" },
  low:    { label: "謹慎嘗試", color: "text-slate-400" },
};

function NumberChip({ num }: { num: number }) {
  const elementMap: Record<number, string> = {
    0: "earth", 1: "wood", 2: "fire", 3: "wood",
    4: "metal", 5: "earth", 6: "water", 7: "fire",
    8: "wood", 9: "metal",
  };
  const el = elementMap[num] ?? "earth";
  const colors = ELEMENT_COLORS[el] ?? ELEMENT_COLORS.earth;
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${colors.bg} ${colors.text} border ${colors.border}`}>
      {num}
    </div>
  );
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "現在正是吉時！";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}小時 ${m}分鐘後`;
  if (m > 0) return `${m}分鐘 ${s}秒後`;
  return `${s}秒後`;
}

export function ScratchAnalysis() {
  const [address, setAddress] = useState("");
  const [inputAddress, setInputAddress] = useState("");
  const [expandedDenom, setExpandedDenom] = useState<number | null>(100);
  const [showAddressResult, setShowAddressResult] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 面額選號策略
  const { data: strategies, isLoading: strategiesLoading } = trpc.lottery.scratchStrategies.useQuery();

  // 最旺時辰資訊
  const { data: bestTimeData } = trpc.lottery.bestTime.useQuery();

  // 地址分析（只在輸入地址後觸發）
  const { data: addressData, isLoading: addressLoading } = trpc.lottery.addressAnalysis.useQuery(
    { address: inputAddress },
    { enabled: inputAddress.length > 0 }
  );

  // 倒數計時器
  useEffect(() => {
    if (!bestTimeData) return;
    setCountdown(bestTimeData.countdownSeconds ?? 0);
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [bestTimeData]);

  const handleAddressAnalyze = () => {
    if (!address.trim()) {
      toast.error("請輸入彩券行地址");
      return;
    }
    setInputAddress(address.trim());
    setShowAddressResult(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddressAnalyze();
  };

  const isInBestTime = countdown === 0 && bestTimeData;

  return (
    <div className="space-y-6">

      {/* ── 最旺時辰聯動倒數 ── */}
      {bestTimeData && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-4 border ${
            isInBestTime
              ? "bg-amber-500/15 border-amber-500/50"
              : "bg-slate-800/40 border-slate-700/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isInBestTime ? "bg-amber-500/30" : "bg-slate-700/60"
            }`}>
              <Clock className={`w-5 h-5 ${isInBestTime ? "text-amber-300" : "text-slate-400"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-semibold ${isInBestTime ? "text-amber-300" : "text-white"}`}>
                  {isInBestTime ? "🔥 現在正是購買最佳時辰！" : "⏰ 距最旺時辰"}
                </span>
                {!isInBestTime && (
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    {formatCountdown(countdown)}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {bestTimeData.nextBest
                  ? `最佳時辰：${bestTimeData.nextBest.chineseName}（${bestTimeData.nextBest.startHour}:00-${bestTimeData.nextBest.endHour}:00）— ${bestTimeData.nextBest.energyLabel}`
                  : "今日吉時已過，明日再戰"}
              </p>
            </div>
            {/* 最佳時辰標籤 */}
            {bestTimeData.bestSlots && bestTimeData.bestSlots.length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                {bestTimeData.bestSlots.slice(0, 3).map((slot: { chineseName: string }, i: number) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {slot.chineseName}
                  </span>
                ))}
              </div>
            )}
          </div>
          {isInBestTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-xs text-amber-200/80 bg-amber-500/10 rounded-xl p-2.5 text-center"
            >
              天命共振最強時刻！地址 + 面額 + 時辰三維共振全開，此刻購買效果最佳。
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── 地址五行分析 ── */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">彩券行地址五行分析</h3>
        </div>
        <p className="text-slate-400 text-xs mb-4">
          輸入您打算前往的彩券行地址，系統將分析其門牌號碼的五行屬性，判斷與您甲木命格的天命共振程度。
        </p>

        {/* 地址輸入 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：台北市信義區忠孝東路4段172號"
            className="flex-1 bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
          />
          <button
            onClick={handleAddressAnalyze}
            disabled={addressLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            分析
          </button>
        </div>

        {/* 地址分析結果 */}
        <AnimatePresence>
          {showAddressResult && inputAddress && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {addressLoading ? (
                <div className="text-center py-4 text-slate-400 text-sm">正在解析地址五行...</div>
              ) : addressData ? (
                <div className="space-y-3">
                  {/* 共振分數 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-sm">地址共振指數</span>
                      {(() => {
                        const el = ELEMENT_COLORS[addressData.dominantElement] ?? ELEMENT_COLORS.earth;
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${el.bg} ${el.text} ${el.border}`}>
                            {el.emoji} 主導{el.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-amber-400">{addressData.resonanceScore}</span>
                      <span className="text-slate-400 text-sm">/10</span>
                      <span className="ml-2 text-amber-300 text-sm font-medium">{addressData.resonanceLabel}</span>
                    </div>
                  </div>

                  {/* 分數條 */}
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        addressData.resonanceScore >= 8 ? "bg-gradient-to-r from-amber-500 to-orange-400" :
                        addressData.resonanceScore >= 6 ? "bg-gradient-to-r from-blue-500 to-cyan-400" :
                        addressData.resonanceScore >= 4 ? "bg-gradient-to-r from-slate-500 to-slate-400" :
                        "bg-gradient-to-r from-red-700 to-red-600"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(addressData.resonanceScore / 10) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  {/* 提取數字 */}
                  {addressData.extractedNumbers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 text-xs">門牌數字：</span>
                      {addressData.extractedNumbers.map((n, i) => (
                        <NumberChip key={i} num={n} />
                      ))}
                      {addressData.luckyNumbers.length > 0 && (
                        <>
                          <span className="text-slate-500 text-xs ml-2">→ 幸運數字：</span>
                          {addressData.luckyNumbers.map((n, i) => (
                            <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-amber-500/20 text-amber-400 border-2 border-amber-500/60 ring-2 ring-amber-400/30">
                              {n}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}

                  {/* 建議文字 */}
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    addressData.resonanceScore >= 7 ? "bg-amber-500/10 border border-amber-500/30 text-amber-200" :
                    addressData.resonanceScore >= 5 ? "bg-slate-700/50 border border-slate-600/50 text-slate-300" :
                    "bg-red-900/20 border border-red-500/30 text-red-300"
                  }`}>
                    {addressData.advice}
                  </div>
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 面額選號策略 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">面額天命選號策略</h3>
          <span className="text-xs text-slate-500">100 / 200 / 300 / 500 / 1000 / 2000 元</span>
        </div>

        {strategiesLoading ? (
          <div className="text-center py-8 text-slate-400">正在計算天命選號策略...</div>
        ) : (
          <div className="space-y-3">
            {strategies?.map((strategy) => {
              const style = DENOMINATION_STYLES[strategy.denomination] ?? DENOMINATION_STYLES[100];
              const isExpanded = expandedDenom === strategy.denomination;
              const conf = CONFIDENCE_LABELS[strategy.confidence] ?? CONFIDENCE_LABELS.medium;
              const isHighStake = strategy.denomination >= 1000;

              return (
                <motion.div
                  key={strategy.denomination}
                  className={`bg-slate-800/40 border rounded-2xl overflow-hidden transition-all ${
                    isExpanded ? "border-slate-600/70" : "border-slate-700/50"
                  } ring-1 ${isExpanded ? style.ring : "ring-transparent"}`}
                  layout
                >
                  {/* 標題列 */}
                  <button
                    onClick={() => setExpandedDenom(isExpanded ? null : strategy.denomination)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-700/20 transition-colors"
                  >
                    {/* 面額圖示 */}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center text-white flex-shrink-0 ${isHighStake ? "ring-2 ring-yellow-400/30" : ""}`}>
                      {style.icon}
                    </div>

                    {/* 面額資訊 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">{strategy.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}>
                          {strategy.riskLevel}
                        </span>
                        <span className={`text-xs font-medium ${conf.color}`}>{conf.label}</span>
                        {isHighStake && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/30">
                            ⚡ 天命大局
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{strategy.description}</p>
                    </div>

                    {/* 主推號碼預覽 */}
                    <div className="flex gap-1 flex-shrink-0">
                      {strategy.primaryNumbers.slice(0, 3).map((n, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                          {n}
                        </div>
                      ))}
                      {strategy.primaryNumbers.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-xs text-slate-500">
                          +{strategy.primaryNumbers.length - 3}
                        </div>
                      )}
                    </div>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  </button>

                  {/* 展開內容 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
                          {/* 策略說明 */}
                          <div className="bg-slate-900/40 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
                            💡 {strategy.strategy}
                          </div>

                          {/* 2000元特殊警告 */}
                          {strategy.denomination === 2000 && (
                            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 text-xs text-yellow-200 leading-relaxed">
                              ⚠️ <strong>至尊天命條件：</strong>需同時滿足「大吉時辰 + 吉地彩券行（共振≥8）+ 偏財指數≥9」三維共振全開，方可出手。
                            </div>
                          )}

                          {/* 最旺時辰提醒（500元以上顯示） */}
                          {strategy.denomination >= 500 && bestTimeData?.nextBest && (
                            <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                              isInBestTime
                                ? "bg-amber-500/20 border border-amber-500/40 text-amber-200"
                                : "bg-slate-900/40 border border-slate-700/50 text-slate-400"
                            }`}>
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span>
                                {isInBestTime
                                  ? `🔥 現在正是最佳時辰（${bestTimeData.nextBest.chineseName}），立即購買效果最強！`
                                  : `建議在 ${bestTimeData.nextBest.chineseName}（${bestTimeData.nextBest.startHour}:00-${bestTimeData.nextBest.endHour}:00）購買，距最旺時辰 ${formatCountdown(countdown)}`
                                }
                              </span>
                            </div>
                          )}

                          {/* 主推號碼 */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">主推號碼（天命共振最強）</p>
                            <div className="flex gap-2 flex-wrap">
                              {strategy.primaryNumbers.map((n, i) => (
                                <NumberChip key={i} num={n} />
                              ))}
                            </div>
                          </div>

                          {/* 備選號碼 */}
                          {strategy.backupNumbers.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">備選號碼</p>
                              <div className="flex gap-2 flex-wrap">
                                {strategy.backupNumbers.map((n, i) => (
                                  <div key={i} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg bg-slate-700/50 text-slate-400 border border-slate-600/50">
                                    {n}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 購買建議 */}
                          <div className="flex gap-3">
                            <div className="flex-1 bg-slate-900/40 rounded-xl p-3 text-center">
                              <p className="text-xs text-slate-500 mb-1">建議張數</p>
                              <p className="text-xl font-bold text-white">{strategy.buyCount}<span className="text-sm text-slate-400 ml-1">張</span></p>
                            </div>
                            <div className="flex-1 bg-slate-900/40 rounded-xl p-3 text-center">
                              <p className="text-xs text-slate-500 mb-1">建議預算</p>
                              <p className="text-xl font-bold text-amber-400">NT${strategy.maxBudget.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
