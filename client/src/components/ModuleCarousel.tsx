/**
 * ModuleCarousel - Cover Flow 模塊輪播導航
 * 從 getVisibleNav API 動態讀取模塊列表
 * C位放大、兩側縮放、is_central 眾星拱月佈局
 */
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import { toast } from "sonner";

type NavModule = {
  id: string;
  name: string;
  icon: string;
  navPath: string | null;
  isCentral: number | null;
  hasAccess: boolean;
};

// 模塊背景漸層
const MODULE_GRADIENTS: Record<string, string> = {
  "/": "from-amber-900/60 to-orange-900/40",
  "/oracle": "from-purple-900/60 to-indigo-900/40",
  "/lottery": "from-emerald-900/60 to-teal-900/40",
  "/wealth": "from-yellow-900/60 to-amber-900/40",
  "/calendar": "from-blue-900/60 to-cyan-900/40",
  "/profile": "from-rose-900/60 to-pink-900/40",
  "/outfit": "from-orange-900/60 to-amber-900/40",
  "/divination": "from-violet-900/60 to-purple-900/40",
  "/luck-cycle": "from-cyan-900/60 to-blue-900/40",
  "/weekly": "from-teal-900/60 to-emerald-900/40",
  "/stats": "from-slate-900/60 to-gray-900/40",
};

const DEFAULT_GRADIENT = "from-slate-900/60 to-gray-900/40";

export function ModuleCarousel() {
  const [, navigate] = useLocation();
  const { data: navModules, isLoading } = trpc.businessHub.getVisibleNav.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    containScroll: false,
    dragFree: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  const handleModuleClick = (mod: NavModule, index: number) => {
    if (index !== selectedIndex) {
      // 如果不是 C 位，先滑動到該位置
      emblaApi?.scrollTo(index);
      return;
    }
    // C 位點擊：導航到模塊
    if (!mod.hasAccess) {
      toast.error("此模塊需要升級訂閱方案才能使用", {
        description: "請聯繫管理員或升級您的方案",
        duration: 3000,
      });
      return;
    }
    const path = mod.navPath;
    if (!path) {
      toast.info("此模塊尚未設定導航路徑");
      return;
    }
    navigate(path);
  };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden px-4 py-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-28 h-24 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!navModules || navModules.length === 0) return null;

  // 將 is_central 模塊排在最前面（或中間）
  const sortedModules = [...navModules].sort((a, b) => {
    if (a.isCentral && !b.isCentral) return -1;
    if (!a.isCentral && b.isCentral) return 1;
    return 0;
  }) as NavModule[];

  return (
    <div className="relative w-full overflow-hidden py-3">
      {/* 兩側漸層遮罩 */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0a0f1a] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0a0f1a] to-transparent z-10 pointer-events-none" />

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-3 px-4">
          {sortedModules.map((mod, index) => {
            const isActive = index === selectedIndex;
            const isCentral = !!mod.isCentral;
            const gradient = MODULE_GRADIENTS[mod.navPath ?? ""] ?? DEFAULT_GRADIENT;
            const distFromCenter = Math.abs(index - selectedIndex);
            const scale = isActive ? 1 : distFromCenter === 1 ? 0.88 : 0.78;
            const opacity = isActive ? 1 : distFromCenter === 1 ? 0.7 : 0.45;

            return (
              <motion.div
                key={mod.id}
                animate={{ scale, opacity }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-shrink-0 cursor-pointer"
                style={{ width: isActive ? "120px" : "100px" }}
                onClick={() => handleModuleClick(mod, index)}
              >
                <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} border transition-all duration-300 overflow-hidden ${
                  isActive
                    ? isCentral
                      ? "border-amber-400/80 shadow-lg shadow-amber-500/30 h-28"
                      : "border-white/30 shadow-md h-24"
                    : "border-white/10 h-20"
                }`}>
                  {/* 眾星拱月光暈 */}
                  {isCentral && isActive && (
                    <div className="absolute inset-0 bg-amber-400/10 rounded-2xl" />
                  )}

                  {/* 鎖定遮罩 */}
                  {!mod.hasAccess && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                      <Lock className="w-4 h-4 text-white/50" />
                    </div>
                  )}

                  {/* 眾星拱月標記 */}
                  {isCentral && (
                    <div className="absolute top-1.5 right-1.5 z-20">
                      <span className="text-[8px] bg-amber-500/80 text-black font-bold px-1.5 py-0.5 rounded-full">核心</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center justify-center h-full p-2 gap-1">
                    <span className={`transition-all ${isActive ? (isCentral ? "text-3xl" : "text-2xl") : "text-xl"}`}>
                      {mod.icon}
                    </span>
                    <span className={`text-center font-medium leading-tight transition-all ${
                      isActive ? "text-white text-xs" : "text-white/60 text-[10px]"
                    }`}>
                      {mod.name.replace(/【.*?】/g, "").trim()}
                    </span>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-[9px] px-2 py-0.5 rounded-full mt-0.5 ${
                          mod.hasAccess
                            ? "bg-white/20 text-white/70"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {mod.hasAccess ? "點擊進入 →" : "需要升級"}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 底部指示點 */}
      <div className="flex justify-center gap-1 mt-2">
        {sortedModules.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`rounded-full transition-all ${
              index === selectedIndex
                ? "w-4 h-1.5 bg-amber-400"
                : "w-1.5 h-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
