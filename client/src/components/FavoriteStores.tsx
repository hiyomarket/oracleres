import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Star, Trash2, MapPin, Sparkles, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";

interface FavoriteStoresProps {
  /** 當搜尋到彩券行後，可傳入以供收藏 */
  onAddStore?: (store: { placeId: string; name: string; address: string; lat: number; lng: number }) => void;
}

function getScoreColor(score: number) {
  if (score >= 80) return "#f59e0b";
  if (score >= 65) return "#34d399";
  if (score >= 50) return "#94a3b8";
  return "#64748b";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "大吉";
  if (score >= 65) return "吉";
  if (score >= 50) return "平";
  return "待補";
}

export function FavoriteStores() {
  const [isOpen, setIsOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: favorites, isLoading } = trpc.lottery.getFavorites.useQuery(undefined, {
    enabled: isOpen,
    refetchInterval: isOpen ? 5 * 60 * 1000 : false, // 每 5 分鐘刷新一次
  });

  const removeMutation = trpc.lottery.removeFavorite.useMutation({
    onSuccess: () => {
      utils.lottery.getFavorites.invalidate();
      toast.success("已取消收藏");
    },
    onError: () => toast.error("操作失敗，請稍後再試"),
  });

  const handleRemove = (id: number, name: string) => {
    if (confirm(`確定取消收藏「${name}」？`)) {
      removeMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-2">
      {/* 收藏列表按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-amber-500/20 bg-amber-900/10 hover:bg-amber-900/20 transition-all"
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" fill="#f59e0b" />
          <span className="text-sm font-semibold text-amber-300">我的收藏彩券行</span>
          {favorites && favorites.length > 0 && (
            <span className="text-[10px] text-amber-500/70 bg-amber-900/30 px-1.5 py-0.5 rounded-full">
              {favorites.length}/5
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl border border-amber-500/15 p-4 space-y-3">
              {/* 說明文字 */}
              <p className="text-[10px] text-slate-500 leading-relaxed">
                收藏常去的彩券行（最多 5 家），每次開啟頁面時自動顯示當日天命共振指數，無需重新定位搜尋。
              </p>

              {/* 載入中 */}
              {isLoading && (
                <div className="text-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="text-2xl inline-block"
                  >
                    ☯
                  </motion.div>
                  <p className="text-xs text-amber-400 mt-2">計算天命共振中...</p>
                </div>
              )}

              {/* 收藏列表 */}
              {!isLoading && favorites && favorites.length > 0 && (
                <div className="space-y-2">
                  {favorites.map((store, i) => {
                    const color = getScoreColor(store.resonanceScore);
                    const label = getScoreLabel(store.resonanceScore);
                    return (
                      <motion.div
                        key={store.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-3 py-2.5"
                      >
                        {/* 排名 */}
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ backgroundColor: color + "25", color }}
                        >
                          {i + 1}
                        </div>

                        {/* 店家資訊 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white truncate">{store.name}</div>
                          <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {store.address}
                          </div>
                          {store.note && (
                            <div className="text-[10px] text-amber-500/70 mt-0.5">備註：{store.note}</div>
                          )}
                        </div>

                        {/* 共振指數 */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Sparkles className="w-3 h-3" style={{ color }} />
                            <span className="text-base font-black" style={{ color }}>
                              {store.resonanceScore}
                            </span>
                          </div>
                          <div className="text-[9px] font-bold" style={{ color }}>{label}</div>
                          <div className="text-[9px] text-slate-600">{store.dayPillar}日</div>
                        </div>

                        {/* 刪除按鈕 */}
                        <button
                          onClick={() => handleRemove(store.id, store.name)}
                          disabled={removeMutation.isPending}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* 空狀態 */}
              {!isLoading && (!favorites || favorites.length === 0) && (
                <div className="text-center py-6">
                  <Star className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">尚無收藏的彩券行</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    在「附近彩券行」搜尋結果中，點擊 ★ 即可收藏
                  </p>
                </div>
              )}

              {/* 數量提示 */}
              {!isLoading && favorites && favorites.length >= 5 && (
                <div className="text-center text-[10px] text-amber-500/60">
                  已達收藏上限（5 家），請先移除再新增
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
