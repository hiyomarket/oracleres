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

function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}月${parseInt(d)}日`;
}

export default function DivinationPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);
  const hasAccess = isAdmin || hasFeature("warroom_divination");

  const balanceQuery = trpc.points.getBalance.useQuery(undefined, {
    enabled: hasAccess,
    staleTime: 30000,
  });
  const { data: divinationCostData } = trpc.marketing.getDivinationCost.useQuery(undefined, { staleTime: 60000 });
  const divinationCost = divinationCostData?.cost ?? 30;

  const balance = balanceQuery.data?.balance ?? 0;

  return (
    <div className="min-h-screen oracle-page text-foreground">
      <SharedNav currentPage="divination" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 頁面標題 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-purple-300 flex items-center gap-2">
                <span>🔮</span> 天命問卜
              </h1>
              <p className="text-white/40 text-sm mt-1">結合八字・十神・塔羅・月相，AI 深度解析五大人生主題</p>
            </div>
            {hasAccess && (
              <div className="flex-shrink-0 text-right">
                <div className="text-[10px] text-white/30 mb-0.5">可用積分</div>
                <div className={`text-lg font-bold ${balance >= divinationCost ? "text-amber-400" : "text-red-400"}`}>
                  {balanceQuery.isLoading ? "…" : balance}
                  <span className="text-xs font-normal text-white/30 ml-1">點</span>
                </div>
                <div className="text-[9px] text-white/25">每次問卜 -{divinationCost} 點</div>
              </div>
            )}
          </div>
        </motion.div>

        {/* 日期選擇器 */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[-1, 0, 1, 2].map((offset) => {
            const d = getTaiwanDateStr(offset);
            const labelMap: Record<number, string> = { [-1]: "昨日", 0: "今日", 1: "明日", 2: "後日" };
            const label = labelMap[offset] ?? `+${offset}日`;
            return (
              <button
                key={offset}
                onClick={() => setSelectedOffset(offset)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedOffset === offset
                    ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
                }`}
              >
                {label}
                <span className={`ml-1 ${selectedOffset === offset ? "opacity-80" : "opacity-40"}`}>
                  {formatDateLabel(d)}
                </span>
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
          <div className="space-y-1.5 text-white/40 text-xs leading-relaxed">
            <p>
              天命問卜融合今日<strong className="text-white/60">日柱・十神・塔羅牌・月相・本命五行</strong>等多維命理資訊，
              透過 AI 深度分析事業、感情、健康、財運、決策五大主題的能量走勢。
            </p>
            <p>
              輸入具體問題可獲得更精準的解讀。每次問卜扣除 <span className="text-amber-400">{divinationCost} 點積分</span>，
              每日登入可免費領取積分。
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
