/**
 * 天命問卜頁面（/divination）
 * 獨立模塊頁面：以今日命理能量為基礎的 AI 主題問卜
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { TopicAdvicePanel } from "@/components/TopicAdvicePanel";

function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

export default function DivinationPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);

  const hasAccess = isAdmin || hasFeature("warroom_divination");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="divination" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-purple-300 flex items-center gap-2">
            <span>🔮</span> 天命問卜
          </h1>
          <p className="text-white/40 text-sm mt-1">以今日命理能量為基礎，AI 為你解析五大人生主題</p>
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
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {label} <span className="opacity-60">{d.slice(5)}</span>
              </button>
            );
          })}
        </div>

        {/* 內容區 */}
        {!hasAccess ? (
          <FeatureLockedCard feature="warroom_divination" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <TopicAdvicePanel selectedDate={selectedDate} />
          </motion.div>
        )}

        {/* 底部說明 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-xl bg-purple-950/20 border border-purple-500/20 p-4"
        >
          <h3 className="text-purple-300 text-xs font-semibold mb-2">🌙 關於天命問卜</h3>
          <p className="text-white/40 text-xs leading-relaxed">
            天命問卜結合今日日柱、十神、月相等命理資訊，透過 AI 為你分析事業、感情、健康、財運、決策五大主題的能量走勢。
            每日能量不同，建議每天重新問卜以獲得最準確的指引。
          </p>
        </motion.div>
      </main>
    </div>
  );
}
