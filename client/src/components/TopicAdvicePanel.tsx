import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";

const TOPICS = [
  { key: "work" as const, icon: "💼", label: "工作" },
  { key: "love" as const, icon: "💛", label: "愛情" },
  { key: "health" as const, icon: "🌿", label: "健康" },
  { key: "wealth" as const, icon: "💰", label: "財運" },
  { key: "decision" as const, icon: "⚖️", label: "決策" },
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

  const topicAdviceMutation = trpc.warRoom.topicAdvice.useMutation({
    onSuccess: (result) => {
      setTopicResult({
        topicName: result.topicName,
        advice: typeof result.advice === "string" ? result.advice : JSON.stringify(result.advice),
        context: result.context,
      });
      setIsAsking(false);
    },
    onError: () => {
      setIsAsking(false);
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

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 backdrop-blur-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔮</span>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest">天命問卜</h3>
        <span className="ml-auto text-xs text-purple-400/60">AI 命理分析</span>
      </div>

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
      <div className="grid grid-cols-5 gap-2 mb-4">
        {TOPICS.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => handleAsk(key)}
            disabled={isAsking}
            className={[
              "flex flex-col items-center gap-1 py-3 rounded-xl border transition-all",
              selectedTopic === key && topicResult
                ? "bg-purple-600/30 border-purple-500/60 text-purple-200"
                : "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-purple-500/40 hover:text-purple-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* 載入中 */}
      {isAsking && (
        <div className="flex items-center justify-center gap-3 py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-400 rounded-full"
          />
          <span className="text-purple-400/70 text-sm">天命能量對齊中…</span>
        </div>
      )}

      {/* 結果顯示 */}
      <AnimatePresence>
        {topicResult && !isAsking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2"
          >
            {/* 上下文標籤 */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 bg-purple-900/40 border border-purple-700/40 text-purple-300 rounded-full">
                {topicResult.context.dayPillar}日
              </span>
              <span className="text-xs px-2 py-0.5 bg-amber-900/30 border border-amber-700/30 text-amber-300 rounded-full">
                {topicResult.context.tenGod} {topicResult.context.overallScore}/10
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-full">
                {topicResult.context.tarotCard}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-800/60 border border-slate-700/40 text-slate-400 rounded-full">
                {topicResult.context.moonPhase}
              </span>
            </div>

            {/* AI 建議內容 */}
            <div className="bg-slate-900/60 border border-purple-700/30 rounded-xl p-4">
              <div className="text-xs text-purple-400 mb-2 font-medium">「{topicResult.topicName}」天命分析</div>
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {topicResult.advice}
              </div>
            </div>

            {/* 重新問卜 */}
            <button
              onClick={() => { setTopicResult(null); setSelectedTopic(null); }}
              className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              ✕ 清除結果，重新選擇
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
