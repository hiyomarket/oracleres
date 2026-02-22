import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface PurifyMindProps {
  onReady: () => void;
}

// 竹子組件
function BambooStalk({ x, delay, height }: { x: number; delay: number; height: number }) {
  return (
    <motion.div
      className="absolute bottom-0"
      style={{ left: `${x}%`, width: 18, height }}
      animate={{ rotate: [-1.5, 1.5, -1.5] }}
      transition={{ duration: 3 + delay * 0.5, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {/* 竹節 */}
      {Array.from({ length: Math.floor(height / 60) }).map((_, i) => (
        <div key={i}>
          <div
            className="absolute w-full"
            style={{
              bottom: i * 60,
              height: 58,
              background: `linear-gradient(180deg, oklch(0.38 0.14 ${145 + i * 3}) 0%, oklch(0.32 0.12 ${148 + i * 3}) 100%)`,
              borderRadius: '2px',
            }}
          />
          {/* 竹節環 */}
          <div
            className="absolute w-full"
            style={{
              bottom: i * 60 + 56,
              height: 6,
              background: 'oklch(0.28 0.10 148)',
              borderRadius: '3px',
            }}
          />
        </div>
      ))}
      {/* 竹葉 */}
      <div className="absolute -top-8 -left-8 w-16 h-8 opacity-80"
        style={{
          background: 'oklch(0.42 0.16 145)',
          borderRadius: '50% 0 50% 0',
          transform: 'rotate(-30deg)',
        }}
      />
      <div className="absolute -top-6 left-2 w-14 h-7 opacity-70"
        style={{
          background: 'oklch(0.38 0.14 148)',
          borderRadius: '50% 0 50% 0',
          transform: 'rotate(20deg)',
        }}
      />
    </motion.div>
  );
}

// 水紋組件
function WaterRipple({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full border border-blue-400/20"
      style={{ left: `${x}%`, top: `${y}%`, width: 20, height: 20, marginLeft: -10, marginTop: -10 }}
      animate={{
        width: [20, 120],
        height: [20, 120],
        marginLeft: [-10, -60],
        marginTop: [-10, -60],
        opacity: [0.6, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// 流動粒子
function FloatingParticle({ x, delay }: { x: number; delay: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full"
      style={{
        left: `${x}%`,
        bottom: '10%',
        background: `oklch(0.72 0.20 ${45 + Math.random() * 30})`,
      }}
      animate={{
        y: [-0, -200],
        x: [0, (Math.random() - 0.5) * 60],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1.2, 0],
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        repeat: Infinity,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

export default function PurifyMind({ onReady }: PurifyMindProps) {
  const [showButton, setShowButton] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { user } = useAuth();
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const displayName = profile?.displayName ?? user?.name;
  const fourPillars = [profile?.yearPillar, profile?.monthPillar, profile?.dayPillar, profile?.hourPillar].filter(Boolean).join('・');

  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleReady = () => {
    setIsLeaving(true);
    setTimeout(onReady, 800);
  };

  return (
    <AnimatePresence>
      {!isLeaving && (
        <motion.div
          className="fixed inset-0 overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at 30% 20%, oklch(0.18 0.08 165 / 0.9) 0%, oklch(0.10 0.05 225) 50%, oklch(0.07 0.03 220) 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* 竹林背景 */}
          <div className="absolute inset-0 overflow-hidden">
            {[
              { x: 2, delay: 0, height: 500 },
              { x: 8, delay: 0.3, height: 420 },
              { x: 15, delay: 0.7, height: 550 },
              { x: 22, delay: 0.2, height: 480 },
              { x: 75, delay: 0.5, height: 520 },
              { x: 82, delay: 0.1, height: 460 },
              { x: 88, delay: 0.8, height: 540 },
              { x: 94, delay: 0.4, height: 490 },
            ].map((b, i) => (
              <BambooStalk key={i} {...b} />
            ))}
          </div>

          {/* 水面波紋 */}
          <div className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, oklch(0.15 0.06 220 / 0.6) 100%)',
            }}
          >
            {[
              { x: 20, y: 60, delay: 0 },
              { x: 50, y: 75, delay: 1.2 },
              { x: 75, y: 55, delay: 0.6 },
              { x: 35, y: 80, delay: 1.8 },
            ].map((r, i) => (
              <WaterRipple key={i} {...r} />
            ))}
          </div>

          {/* 飄浮粒子 */}
          {[5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((x, i) => (
            <FloatingParticle key={i} x={x} delay={i * 0.4} />
          ))}

          {/* 月光光暈 */}
          <div
            className="absolute top-16 right-20 w-40 h-40 rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, oklch(0.95 0.05 80) 0%, transparent 70%)',
              filter: 'blur(20px)',
            }}
          />

          {/* 中央內容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
            {/* 標題 */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            >
              <div className="text-xs tracking-[0.5em] text-amber-400/70 mb-4 uppercase">
                Oracle Resonance
              </div>
              <h1 className="text-5xl md:text-6xl font-black oracle-text-gradient mb-3 tracking-wider">
                天命共振
              </h1>
              <div className="text-sm text-muted-foreground tracking-[0.3em]">
                {displayName ? `${displayName} 專屬神諭系統` : '天命共振神諭系統'}
              </div>
            </motion.div>

            {/* 分隔線 */}
            <motion.div
              className="flex items-center gap-4 mb-10 w-full max-w-xs"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-600/50" />
              <div className="text-amber-500 text-lg">☯</div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-600/50" />
            </motion.div>

            {/* 引導文字 */}
            <motion.div
              className="text-center mb-12 max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 1.0 }}
            >
              <p className="text-xl text-foreground/90 tracking-widest leading-loose font-light">
                沉澱心緒
              </p>
              <p className="text-xl text-foreground/90 tracking-widest leading-loose font-light">
                默念所問
              </p>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed tracking-wide">
                每一次擲筊，皆是您內在神性<br />
                與宇宙能量的一次對話
              </p>
            </motion.div>

            {/* 火焰按鈕 */}
            <AnimatePresence>
              {showButton && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.6, type: "spring" }}
                >
                  <button
                    onClick={handleReady}
                    className="flame-button px-10 py-4 rounded-full text-lg font-bold tracking-widest shadow-2xl"
                  >
                    🔥 我已準備好
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 底部命理信息 */}
            <motion.div
              className="absolute bottom-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1.5 }}
            >
              {fourPillars && (
                <p className="text-xs text-muted-foreground/60 tracking-widest">
                  {fourPillars}
                </p>
              )}
              {profile?.dayMasterElement && (
                <p className="text-xs text-muted-foreground/40 mt-1 tracking-wider">
                  {profile.dayMasterElement}日主
                </p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
