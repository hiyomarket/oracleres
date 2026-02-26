import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type OutfitMode = 'default' | 'love' | 'work' | 'leisure' | 'travel';

interface ModeConfig {
  id: OutfitMode;
  icon: string;
  label: string;
  desc: string;
  gradient: string;
  activeClass: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'default',
    icon: '☯️',
    label: '天命',
    desc: '依命格喜用神全方位補強',
    gradient: 'from-amber-900/40 to-yellow-900/40',
    activeClass: 'border-amber-400 bg-amber-900/30 text-amber-300',
  },
  {
    id: 'love',
    icon: '💕',
    label: '戀愛',
    desc: '強化桃花能量，增進人際吸引力',
    gradient: 'from-pink-900/40 to-rose-900/40',
    activeClass: 'border-pink-400 bg-pink-900/30 text-pink-300',
  },
  {
    id: 'work',
    icon: '⚡',
    label: '工作',
    desc: '強化決斷力與創意，提升職場競爭力',
    gradient: 'from-blue-900/40 to-indigo-900/40',
    activeClass: 'border-blue-400 bg-blue-900/30 text-blue-300',
  },
  {
    id: 'leisure',
    icon: '🌿',
    label: '休閒',
    desc: '放鬆身心，補充木土能量，享受當下',
    gradient: 'from-green-900/40 to-emerald-900/40',
    activeClass: 'border-green-400 bg-green-900/30 text-green-300',
  },
  {
    id: 'travel',
    icon: '🌟',
    label: '出遊',
    desc: '活力滿點，火木能量加持，開拓視野',
    gradient: 'from-orange-900/40 to-red-900/40',
    activeClass: 'border-orange-400 bg-orange-900/30 text-orange-300',
  },
];

interface OutfitModeSelectorProps {
  value: OutfitMode;
  onChange: (mode: OutfitMode) => void;
}

export function OutfitModeSelector({ value, onChange }: OutfitModeSelectorProps) {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-amber-400/70 font-medium tracking-wider uppercase">情境模式</span>
        <div className="flex-1 h-px bg-amber-900/30" />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {MODES.map((mode) => {
          const isActive = value === mode.id;
          return (
            <motion.button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-300 cursor-pointer",
                isActive
                  ? mode.activeClass
                  : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mode-active-bg"
                  className={cn("absolute inset-0 rounded-xl bg-gradient-to-br opacity-40", mode.gradient)}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-xl relative z-10">{mode.icon}</span>
              <span className="text-xs font-semibold relative z-10">{mode.label}</span>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current"
                />
              )}
            </motion.button>
          );
        })}
      </div>
      {/* Active mode description */}
      {MODES.find(m => m.id === value) && (
        <motion.p
          key={value}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-white/40 text-center"
        >
          {MODES.find(m => m.id === value)?.desc}
        </motion.p>
      )}
    </div>
  );
}
