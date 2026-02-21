import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Sparkles, RefreshCw, Clock, TrendingUp, ChevronDown, ChevronUp, Flame, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SharedNav } from "@/components/SharedNav";
import { NearbyStores } from "@/components/NearbyStores";
import { LotteryResultChecker } from "@/components/LotteryResultChecker";
import { ScratchAnalysis } from "@/components/ScratchAnalysis";
import { ScratchJournal } from "@/components/ScratchJournal";

// 五行顏色映射
const ELEMENT_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  fire:  { bg: "bg-orange-500/20",  text: "text-orange-400",  border: "border-orange-500/40",  label: "火" },
  earth: { bg: "bg-yellow-600/20",  text: "text-yellow-500",  border: "border-yellow-600/40",  label: "土" },
  metal: { bg: "bg-slate-400/20",   text: "text-slate-300",   border: "border-slate-400/40",   label: "金" },
  wood:  { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", label: "木" },
  water: { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/40",    label: "水" },
};

// 數字五行對應
const NUMBER_ELEMENT: Record<number, string> = {
  0: "earth", 1: "wood", 2: "fire", 3: "wood",
  4: "metal", 5: "earth", 6: "water", 7: "fire",
  8: "wood", 9: "metal",
};

const LUCK_LABELS = ["", "極弱", "弱", "偏弱", "略弱", "平穩", "略強", "偏強", "強", "極強", "天命共振"];

interface NumberBallProps {
  num: number;
  delay?: number;
  size?: "lg" | "md" | "sm";
  isLucky?: boolean;
}

function NumberBall({ num, delay = 0, size = "lg", isLucky = false }: NumberBallProps) {
  const element = NUMBER_ELEMENT[num] ?? "earth";
  const colors = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.earth;

  const sizeClasses = {
    lg: "w-16 h-16 text-2xl font-bold",
    md: "w-12 h-12 text-xl font-semibold",
    sm: "w-9 h-9 text-base font-medium",
  };

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 200,
        damping: 15,
      }}
      className={`
        relative flex items-center justify-center rounded-full
        ${sizeClasses[size]}
        ${colors.bg} ${colors.text} border-2 ${colors.border}
        ${isLucky ? "ring-2 ring-amber-400/60 ring-offset-2 ring-offset-transparent" : ""}
      `}
    >
      {num}
      {isLucky && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-900" />
        </motion.div>
      )}
      <div className={`absolute -bottom-5 text-xs ${colors.text} opacity-70`}>
        {colors.label}
      </div>
    </motion.div>
  );
}

function LuckMeter({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const color = score >= 8 ? "from-amber-500 to-orange-400"
    : score >= 6 ? "from-emerald-500 to-teal-400"
    : score >= 4 ? "from-blue-500 to-cyan-400"
    : "from-slate-500 to-slate-400";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400">天命運勢</span>
        <span className="text-amber-400 font-semibold">{score}/10 {LUCK_LABELS[Math.round(score)]}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
        />
      </div>
    </div>
  );
}

type LotteryData = {
  numbers: number[];
  bonusNumbers: number[];
  luckyDigits: number[];
  dayPillar: string;
  hourPillar: string;
  moonPhase: string;
  energyAnalysis: {
    todayElement: string;
    hourElement: string;
    moonBoost: boolean;
    overallLuck: number;
    recommendation: string;
  };
  wuxingBreakdown: {
    fire: number[];
    earth: number[];
    metal: number[];
    wood: number[];
    water: number[];
  };
  sets: Array<{
    type: string;
    description: string;
    numbers: number[];
    confidence: "high" | "medium" | "low";
  }>;
};

export default function LotteryOracle() {
  const [result, setResult] = useState<LotteryData | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<number | undefined>();
  const [activeSet, setActiveSet] = useState(0);
  const [showNearby, setShowNearby] = useState(false);
  const [showScratchAnalysis, setShowScratchAnalysis] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  // 今日最佳購買時機
  const { data: bestTimeData } = trpc.lottery.bestTime.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // 倒數計時器
  useEffect(() => {
    if (!bestTimeData?.countdownSeconds) return;
    let remaining = bestTimeData.countdownSeconds;
    const tick = () => {
      if (remaining <= 0) { setCountdown(null); return; }
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setCountdown(`${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      remaining--;
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [bestTimeData?.countdownSeconds]);
  const generateMutation = trpc.lottery.generate.useMutation({
    onSuccess: (data: any) => {
      setResult(data as LotteryData);
      setIsRevealing(false);
      if (data?.sessionId) setSavedSessionId(data.sessionId);
    },
    onError: () => {
      toast.error("天命能量暫時紊亂，請稍後再試");
      setIsRevealing(false);
    },
  });

  const { data: history } = trpc.lottery.history.useQuery({ limit: 10 });

  const handleGenerate = useCallback(() => {
    setIsRevealing(true);
    setResult(null);
    setTimeout(() => {
      generateMutation.mutate({ saveRecord: true });
    }, 800);
  }, [generateMutation]);

  const todayElement = result?.energyAnalysis.todayElement ?? "fire";
  const elementColors = ELEMENT_COLORS[todayElement] ?? ELEMENT_COLORS.fire;

  return (
    <div className="min-h-screen bg-[#050d14] text-white">
      {/* 背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/30"
            style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-10, 10, -10], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <SharedNav currentPage="lottery" />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-8 oracle-page-content">

      {/* 標題區 */}
      <motion.div
        className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-xs tracking-[0.3em] text-amber-500/70 mb-3 uppercase">
            Oracle Resonance · Lottery
          </div>
          <h1 className="text-4xl font-bold mb-2"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            天命選號
          </h1>
          <p className="text-slate-400 text-sm">
            以命格五行為引，以天干地支為鑰，開啟您的財運密碼
          </p>
        </motion.div>

        {/* 命理信息條 */}
        {result && (
          <motion.div
            className="flex flex-wrap gap-2 justify-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[
              { label: "日柱", value: result.dayPillar },
              { label: "時柱", value: result.hourPillar },
              { label: "月相", value: result.moonPhase },
              { label: "主導五行", value: elementColors.label, color: elementColors.text },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1 text-xs">
                <span className="text-slate-500">{item.label}</span>
                <span className={item.color ?? "text-slate-200"}>{item.value}</span>
              </div>
            ))}
            {result.energyAnalysis.moonBoost && (
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 text-xs text-amber-400">
                🌕 滿月加成
              </div>
            )}
          </motion.div>
        )}

        {/* 主要選號區 */}
        <AnimatePresence mode="wait">
          {!result && !isRevealing && (
            <motion.div
              key="idle"
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-32 h-32 mx-auto mb-8 rounded-full border-2 border-amber-500/30 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <div className="text-5xl">🎰</div>
              </motion.div>
              <p className="text-slate-400 text-sm mb-2">靜心，感受此刻的天命能量</p>
              <p className="text-slate-500 text-xs">系統將根據您的命格與當下時辰，推算最共振的數字</p>
            </motion.div>
          )}

          {isRevealing && (
            <motion.div
              key="revealing"
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-6xl mb-6"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                ✨
              </motion.div>
              <p className="text-amber-400 text-lg">天命能量匯聚中...</p>
              <p className="text-slate-500 text-sm mt-2">正在計算您的五行共振數字</p>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 號碼組合切換 */}
              <div className="flex gap-2 justify-center">
                {result.sets.map((set, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSet(i)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      activeSet === i
                        ? "bg-amber-500/20 border border-amber-500/50 text-amber-400"
                        : "bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {set.type}
                  </button>
                ))}
              </div>

              {/* 主要號碼展示 */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-center mb-2">
                  <span className="text-xs text-slate-500">{result.sets[activeSet]?.description}</span>
                </div>
                <div className="flex justify-center gap-4 mt-6 mb-8">
                  {(result.sets[activeSet]?.numbers ?? result.numbers).map((num, i) => (
                    <NumberBall
                      key={`${activeSet}-${i}-${num}`}
                      num={num}
                      delay={i * 0.12}
                      size="lg"
                      isLucky={result.luckyDigits.includes(num)}
                    />
                  ))}
                </div>

                {/* 最幸運數字 */}
                <div className="border-t border-slate-700/50 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">今日最幸運數字</p>
                      <div className="flex gap-3">
                        {result.luckyDigits.map((num, i) => (
                          <NumberBall key={i} num={num} delay={0.8 + i * 0.1} size="md" isLucky />
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">備選號碼</p>
                      <div className="flex gap-2">
                        {result.bonusNumbers.map((num, i) => (
                          <NumberBall key={i} num={num} delay={1 + i * 0.1} size="sm" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 運勢儀表 */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                <LuckMeter score={result.energyAnalysis.overallLuck} />
              </div>

              {/* 五行分布 */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm">
                <p className="text-xs text-slate-500 mb-4">號碼五行分布</p>
                <div className="grid grid-cols-5 gap-2">
                  {(["fire", "earth", "metal", "wood", "water"] as const).map(el => {
                    const nums = result.wuxingBreakdown[el] ?? [];
                    const colors = ELEMENT_COLORS[el];
                    return (
                      <div key={el} className={`rounded-xl p-3 text-center ${colors.bg} border ${colors.border}`}>
                        <div className={`text-xs font-medium ${colors.text} mb-2`}>{colors.label}</div>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {nums.length > 0 ? nums.map(n => (
                            <span key={n} className={`text-sm font-bold ${colors.text}`}>{n}</span>
                          )) : <span className="text-slate-600 text-xs">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 天命建議 */}
              <div className={`rounded-2xl p-5 border ${elementColors.border} ${elementColors.bg} backdrop-blur-sm`}>
                <div className="flex items-start gap-3">
                  <Flame className={`w-5 h-5 mt-0.5 flex-shrink-0 ${elementColors.text}`} />
                  <div>
                    <p className={`text-xs font-medium mb-2 ${elementColors.text}`}>天命選號建議</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.energyAnalysis.recommendation}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 生成按鈕 */}
        <div className="mt-8 flex justify-center">
          <motion.button
            onClick={handleGenerate}
            disabled={isRevealing || generateMutation.isPending}
            className="relative px-10 py-4 rounded-full font-semibold text-white overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ x: [-200, 200] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ skewX: -20, width: "60%" }}
            />
            <span className="relative flex items-center gap-2">
              {isRevealing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> 天命匯聚中...</>
              ) : result ? (
                <><RefreshCw className="w-4 h-4" /> 重新選號</>
              ) : (
                <><Sparkles className="w-4 h-4" /> 啟動天命選號</>
              )}
            </span>
          </motion.button>
        </div>

        {/* 今日最佳購買時機 */}
        {bestTimeData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-5 border border-amber-600/20 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300 tracking-wider">今日最佳購買時機</h3>
            </div>

            {/* 最佳時辰列表 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {bestTimeData.bestSlots.map((slot: any, i: number) => {
                const isPast = slot.isPast;
                const isCurrent = slot.isCurrent;
                const energyColor =
                  slot.energyLabel === '大吉' ? '#f59e0b' :
                  slot.energyLabel === '吉' ? '#34d399' :
                  slot.energyLabel === '平' ? '#94a3b8' : '#64748b';
                return (
                  <div
                    key={i}
                    className={`relative rounded-xl p-2.5 text-center border transition-all ${
                      isCurrent
                        ? 'border-amber-500/70 bg-amber-900/30 shadow-lg shadow-amber-900/30'
                        : isPast
                        ? 'border-white/5 bg-white/2 opacity-40'
                        : 'border-white/10 bg-white/3'
                    }`}
                  >
                    {/* 當前時辰脈動光暈 */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{ border: '1.5px solid #f59e0b' }}
                        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.03, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <div className="text-base font-bold" style={{ color: isPast ? '#475569' : energyColor }}>
                      {slot.chineseName}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {slot.startHour}:00–{slot.endHour}:00
                    </div>
                    <div className="text-[9px] mt-1 font-bold" style={{ color: isPast ? '#334155' : energyColor }}>
                      {isPast ? '已過' : isCurrent ? '● 當前' : slot.energyLabel}
                    </div>
                    {!isPast && (
                      <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${slot.score * 10}%`, backgroundColor: energyColor, opacity: 0.7 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 倒數計時 */}
            {bestTimeData.nextBest && countdown && (
              <div className="text-center py-3 rounded-xl border border-amber-600/20 bg-amber-900/10">
                <div className="text-xs text-slate-400 mb-1">距下一個吉時（{bestTimeData.nextBest.chineseName}時）</div>
                <div className="text-2xl font-black text-amber-400 font-mono tracking-widest">{countdown}</div>
                <div className="text-[10px] text-slate-500 mt-1">{bestTimeData.nextBest.actionSuggestion}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* 附近彩券行天命共振 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl border border-white/10 mb-6 overflow-hidden"
        >
          <button
            onClick={() => setShowNearby(!showNearby)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300 tracking-wider">附近彩券行天命共振</span>
              <span className="text-[10px] text-slate-500 ml-1">GPS 定位 · 流日流時加權</span>
            </div>
            {showNearby ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <AnimatePresence>
            {showNearby && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5">
                  <NearbyStores />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 刮刮樂地址分析 + 面額選號 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-2xl border border-white/10 mb-6 overflow-hidden"
        >
          <button
            onClick={() => setShowScratchAnalysis(!showScratchAnalysis)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-300 tracking-wider">地址分析 · 面額選號</span>
              <span className="text-[10px] text-slate-500 ml-1">地址五行 · 100/200/300/500/1000/2000元策略</span>
            </div>
            {showScratchAnalysis ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          <AnimatePresence>
            {showScratchAnalysis && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5">
                  <ScratchAnalysis />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 歷史記錄 */}
        {history && history.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-400 hover:border-slate-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                歷史選號記錄（{history.length} 筆）
              </span>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {history.map((session) => {
                      const nums = session.numbers as number[];
                      return (
                        <div
                          key={session.id}
                          className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">{session.dateString}</span>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-amber-500">{session.overallLuck}/10</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {nums.map((num, i) => {
                              const el = NUMBER_ELEMENT[num] ?? "earth";
                              const c = ELEMENT_COLORS[el];
                              return (
                                <span
                                  key={i}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${c.bg} ${c.text} border ${c.border}`}
                                >
                                  {num}
                                </span>
                              );
                            })}
                            <span className="text-xs text-slate-600 self-center ml-1">
                              {session.dayPillar} · {session.moonPhase}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 開獎對照與天命共振驗證 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <LotteryResultChecker
            latestSessionId={savedSessionId}
            latestNumbers={result?.sets[activeSet]?.numbers ?? result?.numbers}
            latestDayPillar={result?.dayPillar}
            latestDateString={result ? `${result.dayPillar}日` : undefined}
          />
        </motion.div>

        {/* 刮刮樂購買日誌 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-slate-900/60 border border-slate-700/50 rounded-2xl p-5 backdrop-blur-sm"
        >
          <ScratchJournal />
        </motion.div>

      </div>
    </div>
  );
}
