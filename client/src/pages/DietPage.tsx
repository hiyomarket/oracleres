/**
 * 飲食羅盤頁面（獨立模塊）
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { SharedNav } from "@/components/SharedNav";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";
import { NearbyRestaurants } from "@/components/NearbyRestaurants";

function getTaiwanDateStr(offsetDays = 0): string {
  const now = new Date();
  const twMs = now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(twMs).toISOString().split("T")[0];
}

function SectionCard({ title, icon, children, className = "" }: { title: string; icon: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function DietPage() {
  const { hasFeature, isAdmin } = usePermissions();
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDate = getTaiwanDateStr(selectedOffset);

  const { data, isLoading } = trpc.warRoom.dailyReport.useQuery(
    { date: selectedDate },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SharedNav currentPage="diet" />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-amber-300 flex items-center gap-2">
            <span>🍽️</span> 飲食羅盤
          </h1>
          <p className="text-white/40 text-sm mt-1">以今日五行能量，為你量身打造飲食策略</p>
        </motion.div>

        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {[-1, 0, 1, 2].map((offset) => {
            const d = getTaiwanDateStr(offset);
            const label = offset === -1 ? "昨日" : offset === 0 ? "今日" : offset === 1 ? "明日" : `+${offset}日`;
            return (
              <button key={offset} onClick={() => setSelectedOffset(offset)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedOffset === offset ? "bg-amber-500 text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}>
                {label} <span className="opacity-60">{d.slice(5)}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : !isAdmin && !hasFeature("warroom_dietary") ? (
          <FeatureLockedCard feature="warroom_dietary" />
        ) : !data ? (
          <div className="text-center py-12 text-white/30">無法載入今日能量資料</div>
        ) : (
          <motion.div key="diet" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <SectionCard title="今日飲食建議" icon="🍽️">
              <div className="space-y-4">
                {data.dietary?.supplements?.map((item: { element: string; priority: number; foods: string[]; advice: string }, i: number) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-amber-300 font-semibold text-sm">{item.element} 系食材</span>
                      <span className="text-white/40 text-xs">優先度 {item.priority}</span>
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed mb-2">{item.advice}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.foods.map((food, fi) => (
                        <span key={fi} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">{food}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {data.dietary?.avoid && data.dietary.avoid.length > 0 && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-red-400 font-semibold text-sm mb-2">⚠️ 今日宜避免</p>
                    {data.dietary.avoid.map((item: { element: string; foods: string[]; reason: string }, i: number) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <p className="text-white/50 text-xs mb-1">{item.reason}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.foods.map((food, fi) => (
                            <span key={fi} className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs">{food}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
            {data.dietary?.supplements && data.dietary.supplements.length > 0 && (
              <div className="mt-4">
                <NearbyRestaurants
                  supplements={data.dietary.supplements}
                  todayDirections={data.todayDirections}
                  favorableElements={data.favorableElements}
                  unfavorableElements={data.unfavorableElements}
                />
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
