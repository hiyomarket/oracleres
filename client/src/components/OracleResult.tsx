import { motion, AnimatePresence } from "framer-motion";
import { MoonBlock } from "./MoonBlock";
import type { BlockFace } from "./MoonBlock";
import type { OracleResult as OracleResultType } from "../../../server/lib/oracleAlgorithm";

interface OracleResultProps {
  result: OracleResultType;
  interpretation: string;
  energyResonance: string;
  dateString: string;
  query: string;
  weights: { sheng: number; xiao: number; yin: number };
  isSpecialEgg: boolean;
  onReset: () => void;
}

const RESULT_CONFIG: Record<OracleResultType, {
  name: string;
  subtitle: string;
  description: string;
  color: string;
  glowColor: string;
  bgGradient: string;
  borderColor: string;
  leftFace: BlockFace;
  rightFace: BlockFace;
  leftRotation: number;
  rightRotation: number;
  icon: string;
}> = {
  sheng: {
    name: '聖杯',
    subtitle: '神明允諾',
    description: '一正一反，神明應允，此事可行',
    color: 'text-red-300',
    glowColor: 'oklch(0.55 0.24 22)',
    bgGradient: 'from-red-950/60 to-transparent',
    borderColor: 'border-red-700/50',
    leftFace: 'front',
    rightFace: 'back',
    leftRotation: 0,
    rightRotation: 180,
    icon: '🔴',
  },
  xiao: {
    name: '笑杯',
    subtitle: '神明微笑',
    description: '兩正面朝上，神明以笑回應，需再思量',
    color: 'text-amber-300',
    glowColor: 'oklch(0.60 0.14 55)',
    bgGradient: 'from-amber-950/60 to-transparent',
    borderColor: 'border-amber-700/50',
    leftFace: 'front',
    rightFace: 'front',
    leftRotation: 0,
    rightRotation: 0,
    icon: '🟤',
  },
  yin: {
    name: '陰杯',
    subtitle: '神明婉拒',
    description: '兩反面朝上，神明婉拒，此事暫緩',
    color: 'text-slate-400',
    glowColor: 'oklch(0.20 0.02 220)',
    bgGradient: 'from-slate-950/60 to-transparent',
    borderColor: 'border-slate-600/50',
    leftFace: 'back',
    rightFace: 'back',
    leftRotation: 180,
    rightRotation: 180,
    icon: '⚫',
  },
  li: {
    name: '立筊',
    subtitle: '天命昭昭',
    description: '筊杯直立，天命示現，神明自有定奪',
    color: 'text-amber-200',
    glowColor: 'oklch(0.82 0.22 70)',
    bgGradient: 'from-amber-900/60 to-transparent',
    borderColor: 'border-amber-500/70',
    leftFace: 'special',
    rightFace: 'special',
    leftRotation: 90,
    rightRotation: 90,
    icon: '✨',
  },
};

export function OracleResult({
  result,
  interpretation,
  energyResonance,
  dateString,
  query,
  weights,
  isSpecialEgg,
  onReset,
}: OracleResultProps) {
  const config = RESULT_CONFIG[result];

  return (
    <motion.div
      className="w-full max-w-lg mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, type: "spring" }}
    >
      {/* 特殊彩蛋提示 */}
      <AnimatePresence>
        {isSpecialEgg && (
          <motion.div
            className="mb-6 p-4 bg-amber-900/40 border border-amber-500/60 rounded-2xl text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-2xl mb-2">✨ 天命彩蛋 ✨</div>
            <p className="text-amber-300 text-sm tracking-wider">
              逢丑月/丑時，天命寶庫開啟
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 結果卡片 */}
      <div className={`glass-card rounded-3xl border ${config.borderColor} overflow-hidden`}>
        {/* 頂部光暈背景 */}
        <div className={`h-2 bg-gradient-to-r ${config.bgGradient} to-transparent`}
          style={{ background: config.glowColor, opacity: 0.6 }}
        />

        <div className="p-6 md:p-8">
          {/* 結果名稱 */}
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-4xl mb-2">{config.icon}</div>
            <h2 className={`text-4xl font-black tracking-widest mb-1 ${config.color}`}>
              {config.name}
            </h2>
            <p className="text-muted-foreground text-sm tracking-wider">
              {config.subtitle}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {config.description}
            </p>
          </motion.div>

          {/* 筊杯展示 */}
          <motion.div
            className="flex justify-center gap-8 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {result === 'li' ? (
              // 立筊：直立展示
              <motion.div
                className="flex gap-6"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div style={{ transform: 'rotate(90deg)' }}>
                  <MoonBlock face="special" size="md" />
                </div>
                <div style={{ transform: 'rotate(90deg)' }}>
                  <MoonBlock face="special" size="md" />
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  initial={{ rotate: -30, x: -20 }}
                  animate={{ rotate: config.leftRotation, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4, type: "spring" }}
                >
                  <MoonBlock face={config.leftFace} size="md" />
                </motion.div>
                <motion.div
                  initial={{ rotate: 30, x: 20 }}
                  animate={{ rotate: config.rightRotation, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5, type: "spring" }}
                >
                  <MoonBlock face={config.rightFace} size="md" />
                </motion.div>
              </>
            )}
          </motion.div>

          {/* 分隔線 */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/50" />
            <div className="text-muted-foreground text-xs">神諭</div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/50" />
          </div>

          {/* 解讀文字 */}
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <p className={`text-base leading-relaxed tracking-wide text-center font-medium ${config.color}`}>
              {interpretation}
            </p>
          </motion.div>

          {/* 能量共鳴說明 */}
          <motion.div
            className="bg-white/5 rounded-xl p-4 mb-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="text-xs text-muted-foreground/70 mb-2 tracking-wider">天命共振分析</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {energyResonance}
            </p>
          </motion.div>

          {/* 機率權重顯示 */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="text-xs text-muted-foreground/70 mb-2 tracking-wider">今日能量權重</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '聖杯', value: weights.sheng, color: 'bg-red-500/60' },
                { label: '笑杯', value: weights.xiao, color: 'bg-amber-600/60' },
                { label: '陰杯', value: weights.yin, color: 'bg-slate-600/60' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground/70">{value}%</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 問題記錄 */}
          {query && (
            <motion.div
              className="mb-6 p-3 bg-white/5 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <div className="text-xs text-muted-foreground/70 mb-1 tracking-wider">所問之事</div>
              <p className="text-sm text-foreground/80 leading-relaxed">{query}</p>
              <div className="text-xs text-muted-foreground/50 mt-2">{dateString}</div>
            </motion.div>
          )}

          {/* 操作按鈕 */}
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <button
              onClick={onReset}
              className="flame-button flex-1 py-3 rounded-xl text-sm font-bold tracking-widest"
            >
              🔥 再次擲筊
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default OracleResult;
