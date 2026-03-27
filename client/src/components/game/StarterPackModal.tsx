/**
 * 新人禮包彈出視窗
 * 當角色首次建立（isNew=true）時顯示，展示獲得的禮包內容
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StarterPackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StarterPackModal({ isOpen, onClose }: StarterPackModalProps) {
  const [showItems, setShowItems] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowItems(true), 800);
      return () => clearTimeout(timer);
    } else {
      setShowItems(false);
    }
  }, [isOpen]);

  const starterItems = [
    { icon: "🛡️", name: "隨機白色裝備 x2", desc: "不重複部位的初階裝備" },
    { icon: "📜", name: "基本技能 x1", desc: "依據你的命格屬性分配" },
    { icon: "🐾", name: "普通級寵物 x1", desc: "隨機一隻忠誠的夥伴" },
    { icon: "🧪", name: "生命藥水 x5", desc: "恢復生命值" },
    { icon: "💧", name: "靈力藥水 x3", desc: "恢復靈力值" },
    { icon: "⚡", name: "體力藥水 x2", desc: "恢復體力值" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          {/* 禮包卡片 */}
          <motion.div
            className="relative w-[340px] max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-500/40"
            style={{
              background: "linear-gradient(135deg, rgba(15,10,30,0.98), rgba(30,15,50,0.98))",
              boxShadow: "0 0 60px rgba(245,158,11,0.2), 0 0 120px rgba(168,85,247,0.1)",
            }}
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            {/* 頂部光效 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, rgba(245,158,11,0.6), transparent 70%)", filter: "blur(30px)" }}
            />

            {/* 禮包圖標 */}
            <motion.div
              className="relative pt-8 pb-4 text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
            >
              <div className="text-6xl mb-3 drop-shadow-lg" style={{ filter: "drop-shadow(0 0 20px rgba(245,158,11,0.5))" }}>
                🎁
              </div>
              <h2 className="text-xl font-black tracking-widest"
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontFamily: "'Noto Serif TC', serif",
                }}>
                新人禮包
              </h2>
              <p className="text-xs text-slate-400 mt-1 tracking-wider">歡迎來到靈相虛界</p>
            </motion.div>

            {/* 分隔線 */}
            <div className="mx-6 border-t border-amber-500/20" />

            {/* 禮包內容 */}
            <div className="px-5 py-4 space-y-2">
              {starterItems.map((item, idx) => (
                <motion.div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-700/40 bg-slate-800/30"
                  initial={{ opacity: 0, x: -20 }}
                  animate={showItems ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.12, duration: 0.4 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-200">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.desc}</p>
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={showItems ? { scale: 1 } : { scale: 0 }}
                    transition={{ delay: idx * 0.12 + 0.3, type: "spring" }}
                    className="text-green-400 text-xs font-bold"
                  >
                    GET!
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* 底部按鈕 */}
            <div className="px-5 pb-5 pt-2">
              <motion.button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000",
                  boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={showItems ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.8 }}
              >
                開始冒險！
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
