/**
 * TopicAdvicePanel v2.0 - 天命問卜主面板
 * 支援結構化 JSON 回應：命運指數儀表、分段卡片展示、歷史記錄
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { InsufficientCoinsModal, parseInsufficientCoinsError } from "@/components/InsufficientCoinsModal";

const TOPICS = [
  { key: "work" as const, icon: "💼", label: "工作", desc: "事業・合作・決策", color: "from-blue-600/30 to-blue-900/20", border: "border-blue-500/50", text: "text-blue-300" },
  { key: "love" as const, icon: "💛", label: "愛情", desc: "感情・關係・緣分", color: "from-pink-600/30 to-pink-900/20", border: "border-pink-500/50", text: "text-pink-300" },
  { key: "health" as const, icon: "🌿", label: "健康", desc: "身體・精神・調養", color: "from-emerald-600/30 to-emerald-900/20", border: "border-emerald-500/50", text: "text-emerald-300" },
  { key: "wealth" as const, icon: "💰", label: "財運", desc: "投資・財富・機會", color: "from-amber-600/30 to-amber-900/20", border: "border-amber-500/50", text: "text-amber-300" },
  { key: "decision" as const, icon: "⚖️", label: "決策", desc: "選擇・時機・方向", color: "from-violet-600/30 to-violet-900/20", border: "border-violet-500/50", text: "text-violet-300" },
];

type TopicKey = "work" | "love" | "health" | "wealth" | "decision";

interface StructuredResult {
  fortuneIndex: number;
  fortuneLabel: string;
  coreReading: string;
  actions: Array<{ title: string; desc: string }>;
  warnings: string;
  bestHours: Array<{ name: string; time: string; reason: string }>;
  oracle: string;
}

interface DivinationContext {
  dayPillar: string;
  monthPillar: string;
  yearPillar: string;
  hourBranch: string;
  tenGod: string;
  overallScore: number;
  tarotCard: string;
  tarotKeywords: string[];
  moonPhase: string;
  moonLunarDay: number;
  dominantElement: string;
  weakestElement: string;
  favorableElements: string[];
  unfavorableElements: string[];
  dayMasterStem: string;
  dayMasterElement: string;
}

interface DivinationResult {
  topicName: string;
  question?: string;
  structured: StructuredResult;
  context: DivinationContext;
}

interface HistoryItem {
  id: number;
  topic: string;
  topicName: string;
  question: string | null;
  structured: StructuredResult | null;
  context: DivinationContext | null;
  dateString: string;
  energyScore: number;
  createdAt: Date;
}

interface TopicAdvicePanelProps {
  selectedDate: string;
}

function getFortuneStyle(index: number) {
  if (index >= 80) return { color: "text-emerald-400", glow: "shadow-emerald-500/40", ring: "ring-emerald-500/30" };
  if (index >= 65) return { color: "text-amber-400", glow: "shadow-amber-500/40", ring: "ring-amber-500/30" };
  if (index >= 50) return { color: "text-yellow-400", glow: "shadow-yellow-500/40", ring: "ring-yellow-500/30" };
  if (index >= 35) return { color: "text-orange-400", glow: "shadow-orange-500/40", ring: "ring-orange-500/30" };
  return { color: "text-red-400", glow: "shadow-red-500/40", ring: "ring-red-500/30" };
}

function getLabelColor(label: string) {
  if (label === "大吉") return "text-emerald-400 bg-emerald-500/20 border-emerald-500/40";
  if (label === "吉" || label === "小吉") return "text-amber-400 bg-amber-500/20 border-amber-500/40";
  if (label === "平") return "text-yellow-400 bg-yellow-500/20 border-yellow-500/40";
  if (label === "小凶") return "text-orange-400 bg-orange-500/20 border-orange-500/40";
  return "text-red-400 bg-red-500/20 border-red-500/40";
}

function FortuneGauge({ index, label }: { index: number; label: string }) {
  const style = getFortuneStyle(index);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - index / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative w-28 h-28 rounded-full ring-4 ${style.ring} shadow-lg ${style.glow}`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={style.color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-3xl font-black ${style.color}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {index}
          </motion.span>
          <span className="text-[10px] text-white/40 font-medium">/ 100</span>
        </div>
      </div>
      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getLabelColor(label)}`}>
        {label}
      </span>
    </div>
  );
}

function ExpandableCard({
  icon, title, children, defaultOpen = false, accentClass = "border-purple-500/30"
}: {
  icon: string; title: string; children: React.ReactNode; defaultOpen?: boolean; accentClass?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border ${accentClass} bg-slate-900/60 overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-semibold text-white/80">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/30 text-xs"
        >
          ▼
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryCard({ item, onReview }: { item: HistoryItem; onReview: () => void }) {
  const topicInfo = TOPICS.find(t => t.key === item.topic);
  const style = item.structured ? getFortuneStyle(item.structured.fortuneIndex) : getFortuneStyle(50);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-purple-500/30 transition-all cursor-pointer"
      onClick={onReview}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${topicInfo?.color ?? "from-purple-600/30 to-purple-900/20"} border ${topicInfo?.border ?? "border-purple-500/50"}`}>
        {topicInfo?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${topicInfo?.text ?? "text-purple-300"}`}>{item.topicName}</span>
          {item.structured && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getLabelColor(item.structured.fortuneLabel)}`}>
              {item.structured.fortuneLabel}
            </span>
          )}
        </div>
        {item.question && (
          <p className="text-[11px] text-white/50 truncate mt-0.5">{item.question}</p>
        )}
        <p className="text-[10px] text-white/30 mt-0.5">{item.dateString}</p>
      </div>
      {item.structured && (
        <div className={`text-xl font-black ${style.color} flex-shrink-0`}>
          {item.structured.fortuneIndex}
        </div>
      )}
    </div>
  );
}

export function TopicAdvicePanel({ selectedDate }: TopicAdvicePanelProps) {
  const [topicQuestion, setTopicQuestion] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicKey | null>(null);
  const [result, setResult] = useState<DivinationResult | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reviewItem, setReviewItem] = useState<DivinationResult | null>(null);

  const utils = trpc.useUtils();

  const historyQuery = trpc.warRoom.divinationHistory.useQuery(undefined, {
    enabled: showHistory,
    staleTime: 30000,
  });

  // 動態問卜費用（天命幣）
  const { data: pricingData } = trpc.coins.getFeaturePricing.useQuery(undefined, { staleTime: 60000 });
  const { data: coinsData } = trpc.coins.getBalance.useQuery(undefined, { staleTime: 30000 });
  const divinationCost = pricingData?.['warroom_divination'] ?? 30;
  const currentCoins = coinsData?.balance ?? 0;

  // 天命幣不足彈窗
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientRequired, setInsufficientRequired] = useState(0);
  const [insufficientCurrent, setInsufficientCurrent] = useState(0);

  const topicAdviceMutation = trpc.warRoom.topicAdvice.useMutation({
    onSuccess: (res) => {
      setResult({
        topicName: res.topicName,
        question: res.question,
        structured: res.structured,
        context: res.context as DivinationContext,
      });
      setIsAsking(false);
      utils.coins.getBalance.invalidate();
      utils.warRoom.divinationHistory.invalidate();
    },
    onError: (err) => {
      setIsAsking(false);
      setSelectedTopic(null);
      const { isInsufficientCoins, required, current } = parseInsufficientCoinsError(err);
      if (isInsufficientCoins) {
        setInsufficientRequired(required || divinationCost);
        setInsufficientCurrent(current || currentCoins);
        setShowInsufficientModal(true);
      } else {
        toast.error("問卜失敗，請稍後再試");
      }
    },
  });

  const handleAsk = (topic: TopicKey) => {
    setSelectedTopic(topic);
    setResult(null);
    setReviewItem(null);
    setIsAsking(true);
    topicAdviceMutation.mutate({
      topic,
      question: topicQuestion.trim() || undefined,
      date: selectedDate,
    });
  };

  const selectedTopicInfo = TOPICS.find(t => t.key === selectedTopic);
  const displayResult = reviewItem ?? result;

  return (
    <>
    <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-sm overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-purple-700/20">
        <span className="text-xl">🔮</span>
        <div>
          <h3 className="text-sm font-semibold text-white/80 tracking-widest">天命問卜</h3>
          <p className="text-[10px] text-purple-400/60">結合八字・十神・塔羅・月相・深度 AI 分析</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-purple-400/50">{selectedDate}</span>
          <button
            onClick={() => { setShowHistory(h => !h); setReviewItem(null); }}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${showHistory ? "bg-purple-500/20 border-purple-500/50 text-purple-300" : "bg-white/5 border-white/10 text-white/40 hover:border-purple-500/30 hover:text-purple-300"}`}
          >
            📜 歷史
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* 歷史記錄面板 */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="rounded-xl border border-purple-700/20 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-purple-300">📜 問卜歷史記錄</span>
                  <span className="text-[10px] text-white/30">最近 20 筆</span>
                </div>
                {historyQuery.isLoading ? (
                  <div className="text-center py-4 text-white/30 text-xs">載入中…</div>
                ) : historyQuery.data && historyQuery.data.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {historyQuery.data.map(item => (
                      <HistoryCard
                        key={item.id}
                        item={item as HistoryItem}
                        onReview={() => {
                          if (item.structured && item.context) {
                            setReviewItem({
                              topicName: item.topicName,
                              question: item.question ?? undefined,
                              structured: item.structured as StructuredResult,
                              context: item.context as DivinationContext,
                            });
                            setShowHistory(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-white/30 text-xs">尚無問卜記錄</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 問題輸入 */}
        {!displayResult && !isAsking && (
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={topicQuestion}
                onChange={(e) => setTopicQuestion(e.target.value)}
                placeholder="輸入具體問題（可不填）… 例：這項合作適合推進嗎？"
                className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && selectedTopic) handleAsk(selectedTopic);
                }}
              />
              {topicQuestion && (
                <button
                  onClick={() => setTopicQuestion("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/30 hover:text-red-400 transition-all"
                >
                  <span className="text-sm text-slate-400 leading-none">×</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 主題選擇 */}
        {!displayResult && !isAsking && (
          <div className="grid grid-cols-5 gap-2 mb-5">
            {TOPICS.map(({ key, icon, label, desc, color, border, text }) => (
              <button
                key={key}
                onClick={() => handleAsk(key)}
                disabled={isAsking}
                title={desc}
                className={[
                  "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all",
                  `bg-gradient-to-b ${color} ${border} ${text}`,
                  "hover:scale-105 hover:shadow-lg active:scale-95",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 載入中 */}
        <AnimatePresence>
          {isAsking && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 py-10"
            >
              <div className="relative w-20 h-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500/80 border-r-purple-400/40"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-4 border-transparent border-t-amber-500/60 border-l-amber-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                  {selectedTopicInfo?.icon}
                </div>
              </div>
              <div className="text-center">
                <p className="text-purple-300/80 text-sm font-medium">天命能量對齊中…</p>
                <p className="text-purple-400/50 text-xs mt-1">
                  正在分析「{selectedTopicInfo?.label}」的命理走勢
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 結果顯示 */}
        <AnimatePresence>
          {displayResult && !isAsking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* 回顧標示 */}
              {reviewItem && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/20">
                  <span className="text-[10px] text-purple-400">📜 歷史回顧</span>
                  <button
                    onClick={() => setReviewItem(null)}
                    className="ml-auto text-[10px] text-white/30 hover:text-white/60"
                  >
                    關閉
                  </button>
                </div>
              )}

              {/* 頂部：主題 + 命運指數 + 命理標籤 */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/50 border border-purple-700/20">
                <FortuneGauge
                  index={displayResult.structured.fortuneIndex}
                  label={displayResult.structured.fortuneLabel}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{TOPICS.find(t => displayResult.topicName.includes(t.label))?.icon ?? "🔮"}</span>
                    <div>
                      <div className="text-sm font-bold text-white/90">{displayResult.topicName}</div>
                      {displayResult.question && (
                        <div className="text-[11px] text-white/40 mt-0.5 line-clamp-1">「{displayResult.question}」</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] px-2 py-0.5 bg-purple-900/50 border border-purple-700/40 text-purple-300 rounded-full">
                      {displayResult.context.dayPillar}日
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-900/30 border border-amber-700/30 text-amber-300 rounded-full">
                      {displayResult.context.tenGod}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 text-slate-300 rounded-full">
                      {displayResult.context.tarotCard}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-full">
                      {displayResult.context.moonPhase}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-900/30 border border-indigo-700/30 text-indigo-300 rounded-full">
                      {displayResult.context.dayMasterStem}{displayResult.context.dayMasterElement}日主
                    </span>
                  </div>
                </div>
              </div>

              {/* 天命符言 */}
              <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/30 border border-purple-500/25 text-center">
                <p className="text-[11px] text-purple-400/60 mb-1">✦ 天命符言 ✦</p>
                <p className="text-sm text-purple-200 font-medium leading-relaxed italic">
                  「{displayResult.structured.oracle}」
                </p>
              </div>

              {/* 核心解讀 */}
              <ExpandableCard icon="🌟" title="核心命理解讀" defaultOpen={true} accentClass="border-purple-500/25">
                <p className="text-sm text-slate-200 leading-relaxed">
                  {displayResult.structured.coreReading}
                </p>
              </ExpandableCard>

              {/* 行動指引 */}
              <ExpandableCard icon="⚡" title="三大行動指引" defaultOpen={true} accentClass="border-amber-500/20">
                <div className="space-y-2.5">
                  {displayResult.structured.actions.map((action, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-amber-400">{i + 1}</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-amber-300 mb-0.5">{action.title}</div>
                        <div className="text-xs text-slate-300 leading-relaxed">{action.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ExpandableCard>

              {/* 警示 */}
              <ExpandableCard icon="⚠️" title="需要警惕" defaultOpen={false} accentClass="border-red-500/20">
                <p className="text-sm text-red-200/80 leading-relaxed">
                  {displayResult.structured.warnings}
                </p>
              </ExpandableCard>

              {/* 吉時建議 */}
              <ExpandableCard icon="⏰" title="今日吉時" defaultOpen={false} accentClass="border-emerald-500/20">
                <div className="space-y-2">
                  {displayResult.structured.bestHours.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-emerald-900/20 border border-emerald-700/20">
                      <div className="text-center flex-shrink-0">
                        <div className="text-xs font-bold text-emerald-400">{h.name}</div>
                        <div className="text-[10px] text-emerald-300/60">{h.time}</div>
                      </div>
                      <div className="w-px h-8 bg-emerald-700/30" />
                      <p className="text-xs text-slate-300">{h.reason}</p>
                    </div>
                  ))}
                </div>
              </ExpandableCard>

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setResult(null); setReviewItem(null); setSelectedTopic(null); }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  ✕ 清除，重新選擇
                </button>
                <div className="flex gap-2">
                  {TOPICS.filter(t => t.key !== selectedTopic).slice(0, 2).map(t => (
                    <button
                      key={t.key}
                      onClick={() => handleAsk(t.key)}
                      className="text-[10px] px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-full hover:border-purple-500/40 hover:text-purple-300 transition-all"
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 初始提示（未選擇時） */}
        {!selectedTopic && !isAsking && !displayResult && !showHistory && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500/70">選擇上方主題，AI 將結合今日命理給出專屬建議</p>
            <p className="text-xs text-amber-500/60 mt-1">🪙 每次問卜扣除 {divinationCost} 天命幣（目前餘額：{currentCoins} 枚）</p>
          </div>
        )}
      </div>
    </div>

    {/* 天命幣不足彈窗 */}
    <InsufficientCoinsModal
      open={showInsufficientModal}
      onOpenChange={setShowInsufficientModal}
      required={insufficientRequired}
      current={insufficientCurrent}
      featureName="天命問卜"
    />
    </>
  );
}
