/**
 * battle/types.ts — 戰鬥系統共用類型與常量
 */

// ─── 類型定義 ───
export interface BattleParticipantUI {
  id: number;
  type: "character" | "pet" | "monster";
  side: "ally" | "enemy";
  name: string;
  level: number;
  maxHp: number;
  currentHp: number;
  maxMp: number;
  currentMp: number;
  attack: number;
  defense: number;
  speed: number;
  dominantElement?: string;
  isDefeated: boolean;
  isDefending: boolean;
  statusEffects: Array<{ type: string; duration: number; value: number }>;
  skills: Array<{
    id: string;
    name: string;
    mpCost: number;
    cooldown: number;
    currentCooldown: number;
  }>;
  agentId?: number | null;
  petId?: number | null;
  monsterId?: string | null;
  avatarUrl?: string | null;
}

export interface BattleLogUI {
  round: number;
  actorId: number;
  actorName?: string;
  logType: string;
  targetId?: number;
  targetName?: string;
  value: number;
  isCritical: boolean;
  skillName?: string;
  elementBoostDesc?: string;
  statusEffectDesc?: string;
  message: string;
}

export interface BattleWindowProps {
  battleId: string;
  onClose: () => void;
  onBattleEnd?: (result: "win" | "lose" | "flee") => void;
}

// ─── 五行配色系統 ───
export const WX_THEME: Record<string, { color: string; glow: string; bg: string; icon: string; name: string }> = {
  wood:  { color: "#4ade80", glow: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.1)",  icon: "🌿", name: "木" },
  fire:  { color: "#f87171", glow: "rgba(248,113,113,0.5)", bg: "rgba(248,113,113,0.1)", icon: "🔥", name: "火" },
  earth: { color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.1)",  icon: "🪨", name: "土" },
  metal: { color: "#e2e8f0", glow: "rgba(226,232,240,0.5)", bg: "rgba(226,232,240,0.1)", icon: "⚡", name: "金" },
  water: { color: "#60a5fa", glow: "rgba(96,165,250,0.5)",  bg: "rgba(96,165,250,0.1)",  icon: "💧", name: "水" },
  "木": { color: "#4ade80", glow: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.1)",  icon: "🌿", name: "木" },
  "火": { color: "#f87171", glow: "rgba(248,113,113,0.5)", bg: "rgba(248,113,113,0.1)", icon: "🔥", name: "火" },
  "土": { color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.1)",  icon: "🪨", name: "土" },
  "金": { color: "#e2e8f0", glow: "rgba(226,232,240,0.5)", bg: "rgba(226,232,240,0.1)", icon: "⚡", name: "金" },
  "水": { color: "#60a5fa", glow: "rgba(96,165,250,0.5)",  bg: "rgba(96,165,250,0.1)",  icon: "💧", name: "水" },
};

export const STATUS_ICON: Record<string, { emoji: string; name: string; color: string }> = {
  poison:  { emoji: "☠️", name: "中毒", color: "#4ade80" },
  burn:    { emoji: "🔥", name: "灼燒", color: "#f87171" },
  freeze:  { emoji: "❄️", name: "冰凍", color: "#93c5fd" },
  stun:    { emoji: "💫", name: "眩暈", color: "#fbbf24" },
  petrify: { emoji: "🪨", name: "石化", color: "#a8a29e" },
  confuse: { emoji: "🌀", name: "混亂", color: "#c084fc" },
  forget:  { emoji: "💭", name: "遺忘", color: "#94a3b8" },
  sleep:   { emoji: "😴", name: "昏睡", color: "#818cf8" },
};

// ─── 指令卡牌定義 ───
export const COMMAND_CARDS = [
  { id: "attack" as const, icon: "⚔️", label: "攻擊", desc: "普通攻擊", gradient: "from-red-600/40 to-red-900/60", border: "border-red-500/50", glow: "#ef4444" },
  { id: "skill" as const, icon: "✨", label: "技能", desc: "施放技能", gradient: "from-purple-600/40 to-purple-900/60", border: "border-purple-500/50", glow: "#8b5cf6" },
  { id: "defend" as const, icon: "🛡️", label: "防禦", desc: "減傷50%", gradient: "from-blue-600/40 to-blue-900/60", border: "border-blue-500/50", glow: "#3b82f6" },
  { id: "item" as const, icon: "🎒", label: "道具", desc: "使用道具", gradient: "from-emerald-600/40 to-emerald-900/60", border: "border-emerald-500/50", glow: "#22c55e" },
  { id: "capture" as const, icon: "🩤", label: "捕捉", desc: "捕捉魔物", gradient: "from-pink-600/40 to-pink-900/60", border: "border-pink-500/50", glow: "#ec4899" },
  { id: "flee" as const, icon: "🏃", label: "逃跑", desc: "嘗試撤退", gradient: "from-amber-600/40 to-amber-900/60", border: "border-amber-500/50", glow: "#f59e0b" },
] as const;
