import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const TOPICS = [
  { key: "work" as const, icon: "💼", label: "工作", desc: "事業・合作・決策" },
  { key: "love" as const, icon: "💛", label: "愛情", desc: "感情・關係・緣分" },
  { key: "health" as const, icon: "🌿", label: "健康", desc: "身體・精神・調養" },
  { key: "wealth" as const, icon: "💰", label: "財運", desc: "投資・財富・機會" },
  { key: "decision" as const, icon: "⚖️", label: "決策", desc: "選擇・時機・方向" },
];

interface TopicAdvicePanelProps {
  selectedDate: string;
}

export function TopicAdvicePanel({ selectedDate }: TopicAdvicePanelProps) {
  const [topicQuestion, setTopicQuestion] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<"work" | "love" | "health" | "wealth" | "decision" | null>(null);
  const [topicResult, setTopicResult] = useState<{
    topicName: string;
    advice: string;
    context: { dayPillar: string; tenGod: string; overallScore: number; tarotCard: string; moonPhase: string };
  } | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const utils = trpc.useUtils();
  const topicAdviceMutation = trpc.warRoom.topicAdvice.useMutation({
    onSuccess: (result) => {
      setTopicResult({
        topicName: result.topicName,
        advice: typeof result.advice === "string" ? result.advice : JSON.stringify(result.advice),
        context: result.context,
      });
      setIsAsking(false);
      utils.points.getBalance.invalidate();
    },
    onError: (err) => {
      setIsAsking(false);
      setSelectedTopic(null);
      if (err.message.includes('積分不足')) {
        toast.error('積分不足！問卜需要 10 點積分，請先完成每日登入領取積分。', { duration: 5000 });
      } else {
        toast.error('問卜失敗，請稍後再試');
      }
    },
  });

  const handleAsk = (topic: "work" | "love" | "health" | "wealth" | "decision") => {
    setSelectedTopic(topic);
    setTopicResult(null);
    setIsAsking(true);
    topicAdviceMutation.mutate({
      topic,
      question: topicQuestion.trim() || undefined,
      date: selectedDate,
    });
  };

  // 分數對應顏色
  const scoreColor = (score: number) => {
    if (score >= 8) return "text-emerald-400";
    if (score >= 6) return "text-amber-400";
    if (score >= 4) return "text-orange-400";
    return "text-red-400";
  };

  const scoreLabel = (score: number) => {
    if (score >= 8) return "大吉";
    if (score >= 6) return "吉";
    if (score >= 4) return "平";
    return "凶";
  };

  const selectedTopicInfo = TOPICS.find(t => t.key === selectedTopic);

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-sm overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-purple-700/20">
        <span className="text-xl">🔮</span>
        <div>
          <h3 className="text-sm font-semibold text-white/80 tracking-widest">天命問卜</h3>
          <p className="text-[10px] text-purple-400/60">結合當日命理・AI 深度分析</p>
        </div>
        <div className="ml-auto text-[10px] text-purple-400/50 text-right">
          <div>{selectedDate}</div>
        </div>
      </div>

      <div className="p-5">
        {/* 問題輸入 */}
        <div className="mb-4">
          <input
            type="text"
            value={topicQuestion}
            onChange={(e) => setTopicQuestion(e.target.value)}
            placeholder="輸入具體問題（可不填）… 例：這項合作適合推進嗎？"
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        {/* 主題選擇 */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {TOPICS.map(({ key, icon, label, desc }) => (
            <button
              key={key}
              onClick={() => handleAsk(key)}
              disabled={isAsking}
              title={desc}
              className={[
                "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all",
                selectedTopic === key && topicResult
                  ? "bg-purple-600/30 border-purple-500/60 text-purple-200 shadow-lg shadow-purple-900/30"
                  : selectedTopic === key && isAsking
                  ? "bg-purple-900/40 border-purple-600/50 text-purple-300"
                  : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-purple-500/40 hover:text-purple-300 hover:bg-slate-800/60",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* 載入中 */}
        <AnimatePresence>
          {isAsking && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-8"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-400 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center text-lg">
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
          {topicResult && !isAsking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* 結果標題列 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedTopicInfo?.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-white/90">
                      {topicResult.topicName}分析
                    </div>
                    <div className="text-[10px] text-purple-400/70">
                      {topicResult.context.dayPillar}日 · {topicResult.context.tenGod}
                    </div>
                  </div>
                </div>
                {/* 能量分數 */}
                <div className="text-right">
                  <div className={`text-2xl font-black ${scoreColor(topicResult.context.overallScore)}`}>
                    {topicResult.context.overallScore}
                    <span className="text-sm font-normal opacity-60">/10</span>
                  </div>
                  <div className={`text-[11px] font-semibold ${scoreColor(topicResult.context.overallScore)}`}>
                    {scoreLabel(topicResult.context.overallScore)}
                  </div>
                </div>
              </div>

              {/* 命理標籤列 */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                <span className="text-[10px] px-2.5 py-1 bg-purple-900/50 border border-purple-700/40 text-purple-300 rounded-full">
                  {topicResult.context.dayPillar}日柱
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-amber-900/30 border border-amber-700/30 text-amber-300 rounded-full">
                  {topicResult.context.tenGod}
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 text-slate-300 rounded-full">
                  {topicResult.context.tarotCard}
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-full">
                  {topicResult.context.moonPhase}
                </span>
              </div>

              {/* AI 建議主體 */}
              <div className="bg-slate-900/70 border border-purple-700/25 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-1 h-4 bg-purple-500 rounded-full" />
                  <span className="text-[11px] text-purple-400 font-semibold tracking-wider">命理建議</span>
                </div>
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {topicResult.advice}
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => { setTopicResult(null); setSelectedTopic(null); }}
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
        {!selectedTopic && !isAsking && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-500/70">選擇上方主題，AI 將結合今日命理給出專屬建議</p>
            <p className="text-xs text-amber-500/60 mt-1">💰 每次問卜扣除 10 點積分</p>
          </div>
        )}
      </div>
    </div>
  );
}
