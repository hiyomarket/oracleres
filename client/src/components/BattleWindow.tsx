/**
 * BattleWindow.tsx — GD-020 華麗回合制戰鬥視窗
 *
 * 庫洛魔法使封印卡風格 × 日式 RPG 戰鬥介面
 * 功能：
 * 1. 左右對峙立繪佈局 + 呼吸/攻擊動畫
 * 2. 華麗 HP/MP 條 + 光澤動畫 + 低血量閃爍
 * 3. 卡牌式指令面板（封印卡風格）
 * 4. 技能施放大字閃現 + 五行光圈 + 暴擊震屏
 * 5. 動態粒子背景 + 回合轉場
 * 6. 寵物參戰完整顯示
 * 7. 回合倒數計時器
 * 8. 道具選擇面板
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── 類型定義 ───
interface BattleParticipantUI {
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
}

interface BattleLogUI {
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

interface BattleWindowProps {
  battleId: string;
  onClose: () => void;
  onBattleEnd?: (result: "win" | "lose" | "flee") => void;
}

// ─── 五行配色系統 ───
const WX_THEME: Record<string, { color: string; glow: string; bg: string; icon: string; name: string }> = {
  wood:  { color: "#4ade80", glow: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.1)",  icon: "🌿", name: "木" },
  fire:  { color: "#f87171", glow: "rgba(248,113,113,0.5)", bg: "rgba(248,113,113,0.1)", icon: "🔥", name: "火" },
  earth: { color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.1)",  icon: "🪨", name: "土" },
  metal: { color: "#e2e8f0", glow: "rgba(226,232,240,0.5)", bg: "rgba(226,232,240,0.1)", icon: "⚡", name: "金" },
  water: { color: "#60a5fa", glow: "rgba(96,165,250,0.5)",  bg: "rgba(96,165,250,0.1)",  icon: "💧", name: "水" },
  // 中文別名（支援 Boss 屬性字段為中文的情況）
  "木": { color: "#4ade80", glow: "rgba(74,222,128,0.5)",  bg: "rgba(74,222,128,0.1)",  icon: "🌿", name: "木" },
  "火": { color: "#f87171", glow: "rgba(248,113,113,0.5)", bg: "rgba(248,113,113,0.1)", icon: "🔥", name: "火" },
  "土": { color: "#fbbf24", glow: "rgba(251,191,36,0.5)",  bg: "rgba(251,191,36,0.1)",  icon: "🪨", name: "土" },
  "金": { color: "#e2e8f0", glow: "rgba(226,232,240,0.5)", bg: "rgba(226,232,240,0.1)", icon: "⚡", name: "金" },
  "水": { color: "#60a5fa", glow: "rgba(96,165,250,0.5)",  bg: "rgba(96,165,250,0.1)",  icon: "💧", name: "水" },
};

const STATUS_ICON: Record<string, { emoji: string; name: string; color: string }> = {
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
const COMMAND_CARDS = [
  { id: "attack" as const, icon: "⚔️", label: "攻擊", desc: "普通攻擊", gradient: "from-red-600/40 to-red-900/60", border: "border-red-500/50", glow: "#ef4444" },
  { id: "skill" as const, icon: "✨", label: "技能", desc: "施放技能", gradient: "from-purple-600/40 to-purple-900/60", border: "border-purple-500/50", glow: "#8b5cf6" },
  { id: "defend" as const, icon: "🛡️", label: "防禦", desc: "減傷50%", gradient: "from-blue-600/40 to-blue-900/60", border: "border-blue-500/50", glow: "#3b82f6" },
  { id: "item" as const, icon: "🎒", label: "道具", desc: "使用道具", gradient: "from-emerald-600/40 to-emerald-900/60", border: "border-emerald-500/50", glow: "#22c55e" },
  { id: "flee" as const, icon: "🏃", label: "逃跑", desc: "嘗試撤退", gradient: "from-amber-600/40 to-amber-900/60", border: "border-amber-500/50", glow: "#f59e0b" },
];

// ─── 主組件 ───
export function BattleWindow({ battleId, onClose, onBattleEnd }: BattleWindowProps) {
  const [participants, setParticipants] = useState<BattleParticipantUI[]>([]);
  const [logs, setLogs] = useState<BattleLogUI[]>([]);
  const [round, setRound] = useState(0);
  const [battleState, setBattleState] = useState<string>("waiting");
  const [battleResult, setBattleResult] = useState<string | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showSkillPanel, setShowSkillPanel] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewards, setRewards] = useState<{ expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null>(null);
  const logScrollRef = useRef<HTMLDivElement>(null);

  // 動畫 state
  const [screenFlash, setScreenFlash] = useState<string | null>(null);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [attackingId, setAttackingId] = useState<number | null>(null);
  const [hitId, setHitId] = useState<number | null>(null);
  const [skillAnnounce, setSkillAnnounce] = useState<{ name: string; element?: string } | null>(null);
  const [roundTransition, setRoundTransition] = useState(false);
  const [prevRound, setPrevRound] = useState(0);

  // 飄字系統
  const [floatingTexts, setFloatingTexts] = useState<Array<{
    id: number; text: string; color: string; x: string; y: string;
    size: string; isCrit?: boolean; type: string;
  }>>([]);
  const floatIdRef = useRef(0);

  // 回合倒數計時器
  const [turnTimer, setTurnTimer] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 粒子系統
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      opacity: 0.2 + Math.random() * 0.4,
    })), []);

  const allies = participants.filter(p => p.side === "ally");
  const enemies = participants.filter(p => p.side === "enemy");
  const character = allies.find(p => p.type === "character");
  const pet = allies.find(p => p.type === "pet");

  // ─── 動畫工具 ───
  const addFloatingText = useCallback((opts: {
    text: string; color: string; x?: string; y?: string;
    size?: string; isCrit?: boolean; type: string;
  }) => {
    const id = ++floatIdRef.current;
    const xJitter = `${40 + Math.random() * 20}%`;
    setFloatingTexts(prev => [...prev, {
      id, text: opts.text, color: opts.color,
      x: opts.x ?? xJitter,
      y: opts.y ?? "40%",
      size: opts.size ?? (opts.isCrit ? "text-3xl" : "text-xl"),
      isCrit: opts.isCrit, type: opts.type,
    }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(f => f.id !== id)), 2200);
  }, []);

  const triggerScreenFlash = useCallback((color: string) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 400);
  }, []);

  const triggerShake = useCallback((intensity: number = 1) => {
    setShakeIntensity(intensity);
    setTimeout(() => setShakeIntensity(0), 500);
  }, []);

  const triggerAttackAnim = useCallback((actorId: number, targetId: number) => {
    setAttackingId(actorId);
    setTimeout(() => {
      setAttackingId(null);
      setHitId(targetId);
      setTimeout(() => setHitId(null), 300);
    }, 300);
  }, []);

  const announceSkill = useCallback((name: string, element?: string) => {
    setSkillAnnounce({ name, element });
    setTimeout(() => setSkillAnnounce(null), 1500);
  }, []);

  // ─── 回合倒數 ───
  useEffect(() => {
    if (turnTimer > 0 && battleState === "active") {
      setTimeLeft(turnTimer);
    }
  }, [round, turnTimer, battleState]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (turnTimer <= 0 || battleState !== "active" || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!isSubmitting) {
            setSelectedCommand("attack");
            setTimeout(() => {
              const target = enemies.find(e => !e.isDefeated);
              if (character && !character.isDefeated && target) {
                setIsSubmitting(true);
                submitCmd.mutate({
                  battleId,
                  commands: [{ participantId: character.id, commandType: "attack", targetId: target.id }],
                });
              }
            }, 100);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, turnTimer, battleState, isSubmitting]);

  // ─── 回合轉場動畫 ───
  useEffect(() => {
    if (round > prevRound && prevRound > 0) {
      setRoundTransition(true);
      setTimeout(() => setRoundTransition(false), 800);
    }
    setPrevRound(round);
  }, [round]);

  // ─── 取得戰鬥狀態 ───
  const battleQuery = trpc.gameBattle.getBattleState.useQuery(
    { battleId },
    { enabled: !!battleId, refetchOnWindowFocus: false }
  );

  // ─── 提交指令 ───
  const submitCmd = trpc.gameBattle.submitCommand.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setSelectedCommand(null);
      setSelectedSkillId(null);
      setSelectedItemId(null);
      setShowSkillPanel(false);
      setShowItemPanel(false);

      if (data.logs) {
        const newLogs = data.logs as BattleLogUI[];
        setLogs(prev => [...prev, ...newLogs]);

        // 華麗動畫序列
        let delay = 0;
        for (const log of newLogs) {
          const d = delay;
          setTimeout(() => {
            const isAllyActor = allies.some(a => a.id === log.actorId);
            const targetSide = isAllyActor ? "enemy" : "ally";

            // 技能名稱大字閃現
            if (log.skillName && log.logType === "damage") {
              const elem = participants.find(p => p.id === log.actorId)?.dominantElement;
              announceSkill(log.skillName, elem);
            }

            // 攻擊動畫
            if (log.logType === "damage" && log.targetId) {
              triggerAttackAnim(log.actorId, log.targetId);
            }

            // 傷害數字
            if (log.logType === "damage" && log.value > 0) {
              const yPos = targetSide === "enemy" ? "25%" : "65%";
              addFloatingText({
                text: log.isCritical ? `💥 ${log.value}` : `-${log.value}`,
                color: log.isCritical ? "#fde047" : (isAllyActor ? "#f87171" : "#fb923c"),
                y: yPos,
                isCrit: log.isCritical,
                type: "damage",
              });
              if (log.isCritical) {
                triggerScreenFlash("#fde04740");
                triggerShake(2);
              } else if (isAllyActor) {
                triggerScreenFlash("#8b5cf620");
              } else {
                triggerShake(1);
              }
            }

            // MISS
            if (log.logType === "damage" && log.value === 0) {
              addFloatingText({
                text: "MISS", color: "#64748b",
                y: targetSide === "enemy" ? "25%" : "65%",
                size: "text-lg", type: "miss",
              });
            }

            // 治療
            if (log.logType === "heal" && log.value > 0) {
              addFloatingText({
                text: `+${log.value}`, color: "#4ade80",
                y: isAllyActor ? "65%" : "25%",
                type: "heal",
              });
              triggerScreenFlash("#4ade8020");
            }

            // 狀態效果
            if (log.statusEffectDesc) {
              const st = log.statusEffectDesc.toLowerCase();
              const info = STATUS_ICON[st];
              addFloatingText({
                text: `${info?.emoji ?? "✨"} ${info?.name ?? log.statusEffectDesc}`,
                color: info?.color ?? "#e879f9",
                y: "45%", size: "text-base", type: "status",
              });
            }

            // DoT
            if (log.logType === "status_tick" && log.value > 0) {
              addFloatingText({
                text: `💠 -${log.value}`, color: "#c084fc",
                y: isAllyActor ? "65%" : "25%",
                size: "text-base", type: "dot",
              });
            }
          }, d);
          delay += 450; // 更長的間隔讓動畫更有節奏感
        }
      }

      if (data.participants) {
        setParticipants(data.participants as unknown as BattleParticipantUI[]);
      }
      setRound(data.round);

      if (data.state === "ended") {
        setBattleState("ended");
        setBattleResult(data.result ?? null);
        if ((data as any).rewards) setRewards((data as any).rewards);
        onBattleEnd?.(data.result as any);
      }

      setTimeout(() => {
        if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }, 100);
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(`戰鬥指令失敗：${err.message}`);
    },
  });

  // 初始化
  useEffect(() => {
    if (battleQuery.data) {
      const d = battleQuery.data;
      setParticipants(d.participants as BattleParticipantUI[]);
      setLogs(d.logs as BattleLogUI[]);
      setRound(d.battle.currentRound);
      setBattleState(d.battle.state);
      if (d.battle.result) setBattleResult(d.battle.result);
      if ((d.battle as any).turnTimer !== undefined) setTurnTimer((d.battle as any).turnTimer);
    }
  }, [battleQuery.data]);

  const handleSubmitTurn = () => {
    if (!selectedCommand || isSubmitting) return;
    setIsSubmitting(true);
    type CmdType = "attack" | "item" | "skill" | "defend" | "flee" | "surrender";
    const commands: Array<{
      participantId: number; commandType: CmdType; targetId?: number; skillId?: string; itemId?: string;
    }> = [];
    if (character && !character.isDefeated) {
      const target = enemies.find(e => !e.isDefeated);
      commands.push({
        participantId: character.id,
        commandType: selectedCommand as CmdType,
        targetId: target?.id,
        skillId: selectedCommand === "skill" ? selectedSkillId ?? undefined : undefined,
        itemId: selectedCommand === "item" ? selectedItemId ?? undefined : undefined,
      });
    }
    submitCmd.mutate({ battleId, commands });
  };

  const handleAutoBattle = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    submitCmd.mutate({ battleId, commands: [] });
  };

  // ─── Loading ───
  if (battleQuery.isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-purple-400/50 animate-spin" style={{ animationDuration: "3s" }} />
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">⚔️</div>
          </div>
          <p className="text-indigo-300 text-sm font-medium animate-pulse">準備戰鬥中…</p>
        </div>
      </div>
    );
  }

  const timerPercent = turnTimer > 0 ? (timeLeft / turnTimer) * 100 : 0;

  // ─── 主渲染 ───
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md">
      {/* 動態粒子背景 */}
      <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
        {particles.map(p => (
          <div key={p.id} className="absolute rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              background: `radial-gradient(circle, rgba(139,92,246,${p.opacity}) 0%, transparent 70%)`,
              animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            }} />
        ))}
      </div>

      {/* 全屏閃光 */}
      {screenFlash && (
        <div className="fixed inset-0 pointer-events-none z-[203] animate-screenFlash"
          style={{ background: screenFlash }} />
      )}

      {/* 技能名稱大字閃現 */}
      {skillAnnounce && (
        <div className="fixed inset-0 pointer-events-none z-[204] flex items-center justify-center">
          <div className="animate-skillAnnounce text-center">
            <p className="text-4xl font-black tracking-widest"
              style={{
                color: skillAnnounce.element ? (WX_THEME[skillAnnounce.element]?.color ?? "#c4b5fd") : "#c4b5fd",
                textShadow: `0 0 30px ${skillAnnounce.element ? (WX_THEME[skillAnnounce.element]?.glow ?? "rgba(196,181,253,0.6)") : "rgba(196,181,253,0.6)"}, 0 0 60px rgba(139,92,246,0.3), 0 4px 8px rgba(0,0,0,0.8)`,
                WebkitTextStroke: "1px rgba(255,255,255,0.2)",
              }}>
              {skillAnnounce.name}
            </p>
            {skillAnnounce.element && (
              <p className="text-sm mt-1 font-bold" style={{ color: WX_THEME[skillAnnounce.element]?.color }}>
                {WX_THEME[skillAnnounce.element]?.icon} {WX_THEME[skillAnnounce.element]?.name}屬性
              </p>
            )}
          </div>
        </div>
      )}

      {/* 回合轉場 */}
      {roundTransition && (
        <div className="fixed inset-0 pointer-events-none z-[205] flex items-center justify-center animate-roundTransition">
          <div className="px-8 py-3 rounded-full" style={{
            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.3), rgba(139,92,246,0.5), rgba(99,102,241,0.3), transparent)",
          }}>
            <p className="text-2xl font-black text-indigo-200 tracking-[0.3em]"
              style={{ textShadow: "0 0 20px rgba(99,102,241,0.8)" }}>
              ROUND {round}
            </p>
          </div>
        </div>
      )}

      {/* 飄字動畫層 */}
      <div className="fixed inset-0 pointer-events-none z-[206] overflow-hidden">
        {floatingTexts.map(ft => (
          <div key={ft.id}
            className={`absolute font-black ${ft.size}`}
            style={{
              left: ft.x, top: ft.y,
              color: ft.color,
              textShadow: ft.isCrit
                ? `0 0 20px ${ft.color}, 0 0 40px ${ft.color}80, 0 0 60px ${ft.color}40, 0 4px 8px rgba(0,0,0,0.9)`
                : `0 0 12px ${ft.color}80, 0 2px 6px rgba(0,0,0,0.9)`,
              animation: ft.isCrit ? "critFloatUp 2s ease-out forwards" : "floatUp 1.8s ease-out forwards",
            }}>
            {ft.text}
          </div>
        ))}
      </div>

      {/* ═══ 主戰鬥面板 ═══ */}
      <div className={`relative w-full max-w-lg mx-3 rounded-2xl overflow-hidden shadow-2xl`}
        style={{
          background: "linear-gradient(160deg, #0c0a1d 0%, #1a1145 40%, #0f0d2e 70%, #0c0a1d 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 0 40px rgba(139,92,246,0.15), 0 0 80px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
          maxHeight: "92vh",
          animation: shakeIntensity > 0 ? `battleShake${shakeIntensity > 1 ? "Hard" : ""} 0.5s ease-out` : undefined,
        }}>

        {/* 頂部裝飾線 */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #6366f1, #8b5cf6, transparent)" }} />

        {/* ─── 頂部欄：回合 + 倒數 + 控制 ─── */}
        <div className="relative flex items-center justify-between px-4 py-2.5"
          style={{ background: "linear-gradient(180deg, rgba(30,27,75,0.9) 0%, rgba(15,13,46,0.7) 100%)" }}>
          {/* 左：回合數 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-xl" style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.6))" }}>⚔️</span>
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-wide">第 {round} 回合</p>
              <p className="text-[9px] text-indigo-400/60">
                {enemies.filter(e => !e.isDefeated).length} 敵 | {allies.filter(a => !a.isDefeated).length} 友
              </p>
            </div>
          </div>

          {/* 中：倒數計時器（圓形） */}
          {turnTimer > 0 && battleState === "active" && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              <div className="relative w-9 h-9">
                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15" fill="none"
                    stroke={timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#8b5cf6"}
                    strokeWidth="2.5" strokeDasharray={`${timerPercent * 0.942} 100`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s" }} />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${
                  timeLeft <= 5 ? "text-red-400 animate-pulse" : timeLeft <= 10 ? "text-amber-300" : "text-indigo-200"
                }`}>{timeLeft}</span>
              </div>
            </div>
          )}

          {/* 右：控制按鈕 */}
          <div className="flex items-center gap-2">
            {battleState !== "ended" && (
              <button onClick={handleAutoBattle} disabled={isSubmitting}
                className="group relative px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <span className="relative z-10 text-purple-300 group-hover:text-purple-200">🤖 自動</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
              ✕
            </button>
          </div>
        </div>

        {/* ─── 敵方區域 ─── */}
        <div className="px-3 py-2 space-y-1" style={{ background: "rgba(127,29,29,0.06)" }}>
          <p className="text-[9px] font-bold text-red-400/50 tracking-widest mb-1">▼ ENEMY</p>
          {enemies.map(e => (
            <CombatantCard key={e.id} p={e} isEnemy
              isAttacking={attackingId === e.id}
              isHit={hitId === e.id} />
          ))}
        </div>

        {/* ─── 戰鬥日誌（中央戰場） ─── */}
        <div className="relative">
          <div className="absolute left-0 right-0 top-0 h-4 z-10"
            style={{ background: "linear-gradient(to bottom, rgba(12,10,29,0.8), transparent)" }} />
          <div ref={logScrollRef} className="overflow-y-auto px-3 py-3 space-y-0.5"
            style={{ maxHeight: "150px", minHeight: "80px", background: "rgba(12,10,29,0.4)" }}>
            {logs.length === 0 && (
              <div className="text-center py-6">
                <p className="text-indigo-500/40 text-xs animate-pulse">⚔️ 等待指令…</p>
              </div>
            )}
            {logs.slice(-20).map((log, i) => (
              <BattleLogLine key={`${log.round}-${i}`} log={log} allies={allies} isLatest={i === Math.min(logs.length, 20) - 1} />
            ))}
          </div>
          <div className="absolute left-0 right-0 bottom-0 h-4 z-10"
            style={{ background: "linear-gradient(to top, rgba(12,10,29,0.8), transparent)" }} />
        </div>

        {/* ─── 我方區域 ─── */}
        <div className="px-3 py-2 space-y-1" style={{ background: "rgba(30,58,138,0.06)" }}>
          <p className="text-[9px] font-bold text-cyan-400/50 tracking-widest mb-1">▲ ALLY</p>
          {allies.map(a => (
            <CombatantCard key={a.id} p={a}
              isAttacking={attackingId === a.id}
              isHit={hitId === a.id} />
          ))}
        </div>

        {/* ─── 指令面板 / 結算面板 ─── */}
        {battleState === "ended" ? (
          <VictoryPanel result={battleResult} round={round} onClose={onClose} rewards={rewards} />
        ) : (
          <CommandPanel
            character={character}
            showSkillPanel={showSkillPanel}
            showItemPanel={showItemPanel}
            selectedCommand={selectedCommand}
            selectedSkillId={selectedSkillId}
            selectedItemId={selectedItemId}
            isSubmitting={isSubmitting}
            turnTimer={turnTimer}
            timeLeft={timeLeft}
            battleId={battleId}
            onSelectCommand={(cmd) => {
              if (cmd === "skill") {
                setShowSkillPanel(true); setShowItemPanel(false); setSelectedCommand("skill");
              } else if (cmd === "item") {
                setShowItemPanel(true); setShowSkillPanel(false); setSelectedCommand("item");
              } else {
                setSelectedCommand(cmd); setShowSkillPanel(false); setShowItemPanel(false);
                setSelectedSkillId(null); setSelectedItemId(null);
              }
            }}
            onSelectSkill={(id) => { setSelectedSkillId(id); setSelectedCommand("skill"); }}
            onSelectItem={(id) => { setSelectedItemId(id); setSelectedCommand("item"); }}
            onCancelPanel={() => { setShowSkillPanel(false); setShowItemPanel(false); setSelectedCommand(null); }}
            onSubmit={handleSubmitTurn}
          />
        )}

        {/* 底部裝飾線 */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #6366f1, transparent)" }} />
      </div>

      {/* ═══ 動畫 CSS ═══ */}
      <style>{`
        @keyframes particleFloat {
          0%   { transform: translateY(0) translateX(0); opacity: 0.2; }
          50%  { opacity: 0.6; }
          100% { transform: translateY(-30px) translateX(15px); opacity: 0.1; }
        }
        @keyframes screenFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-screenFlash { animation: screenFlash 0.4s ease-out forwards; }
        @keyframes battleShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-4px); }
          40%  { transform: translateX(4px); }
          60%  { transform: translateX(-3px); }
          80%  { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        @keyframes battleShakeHard {
          0%   { transform: translateX(0) rotate(0); }
          15%  { transform: translateX(-8px) rotate(-0.5deg); }
          30%  { transform: translateX(8px) rotate(0.5deg); }
          45%  { transform: translateX(-6px) rotate(-0.3deg); }
          60%  { transform: translateX(6px) rotate(0.3deg); }
          75%  { transform: translateX(-3px); }
          100% { transform: translateX(0) rotate(0); }
        }
        @keyframes floatUp {
          0%   { opacity: 0; transform: translateY(0) scale(0.5); }
          15%  { opacity: 1; transform: translateY(-10px) scale(1.15); }
          30%  { transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-70px) scale(0.7); }
        }
        @keyframes critFloatUp {
          0%   { opacity: 0; transform: translateY(0) scale(0.3); }
          10%  { opacity: 1; transform: translateY(-5px) scale(1.5); }
          20%  { transform: translateY(-15px) scale(1.2); }
          40%  { transform: translateY(-25px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.6); }
        }
        @keyframes skillAnnounce {
          0%   { opacity: 0; transform: scale(2) translateY(10px); filter: blur(8px); }
          20%  { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          70%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0; transform: scale(0.9) translateY(-10px); filter: blur(4px); }
        }
        .animate-skillAnnounce { animation: skillAnnounce 1.5s ease-out forwards; }
        @keyframes roundTransition {
          0%   { opacity: 0; transform: scaleX(0); }
          30%  { opacity: 1; transform: scaleX(1.1); }
          50%  { transform: scaleX(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: scaleX(0.8); }
        }
        .animate-roundTransition { animation: roundTransition 0.8s ease-out forwards; }
        @keyframes attackLunge {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(12px); }
          100% { transform: translateX(0); }
        }
        @keyframes attackLungeLeft {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(-12px); }
          100% { transform: translateX(0); }
        }
        @keyframes hitFlash {
          0%   { filter: brightness(1); }
          30%  { filter: brightness(2.5) saturate(0); }
          100% { filter: brightness(1); }
        }
        @keyframes cardHover {
          0%   { box-shadow: 0 0 0 rgba(139,92,246,0); }
          100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.02); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeSlideIn { animation: fadeSlideIn 0.3s ease-out; }
        @keyframes victoryGlow {
          0%   { opacity: 0; transform: scale(0.8); }
          50%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes defeatDarken {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes hpShimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── 戰鬥單位卡片（華麗版） ───
// ═══════════════════════════════════════════
function CombatantCard({ p, isEnemy, isAttacking, isHit }: {
  p: BattleParticipantUI; isEnemy?: boolean; isAttacking?: boolean; isHit?: boolean;
}) {
  const hpPercent = Math.max(0, Math.min(100, (p.currentHp / p.maxHp) * 100));
  const mpPercent = p.maxMp > 0 ? Math.max(0, Math.min(100, (p.currentMp / p.maxMp) * 100)) : 0;
  const hpColor = hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#f59e0b" : "#ef4444";
  const hpGlow = hpPercent > 50 ? "rgba(34,197,94,0.3)" : hpPercent > 25 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)";
  const typeIcon = p.type === "character" ? "⚔️" : p.type === "pet" ? "🐾" : "👹";
  const elem = p.dominantElement ? WX_THEME[p.dominantElement] : null;

  return (
    <div className={`relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all duration-300 ${
      p.isDefeated ? "opacity-30 grayscale" : ""
    }`}
      style={{
        background: isEnemy
          ? "linear-gradient(135deg, rgba(127,29,29,0.12) 0%, rgba(30,27,75,0.2) 100%)"
          : "linear-gradient(135deg, rgba(30,58,138,0.12) 0%, rgba(30,27,75,0.2) 100%)",
        border: `1px solid ${isEnemy ? "rgba(239,68,68,0.15)" : "rgba(96,165,250,0.15)"}`,
        animation: isAttacking
          ? (isEnemy ? "attackLungeLeft 0.4s ease-out" : "attackLunge 0.4s ease-out")
          : isHit ? "hitFlash 0.3s ease-out" : p.isDefeated ? undefined : "breathe 4s ease-in-out infinite",
      }}>
      {/* 角色圖標 */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{
            background: elem ? elem.bg : "rgba(99,102,241,0.1)",
            border: `1px solid ${elem ? elem.color + "30" : "rgba(99,102,241,0.2)"}`,
            boxShadow: elem ? `0 0 8px ${elem.glow}` : undefined,
          }}>
          {typeIcon}
        </div>
        {elem && (
          <span className="absolute -top-1 -right-1 text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: elem.bg, border: `1px solid ${elem.color}40` }}>
            {elem.icon}
          </span>
        )}
      </div>

      {/* 名稱 + HP/MP */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[11px] font-bold truncate ${isEnemy ? "text-red-300" : "text-cyan-300"}`}>
            {p.name}
          </span>
          <span className="text-[8px] px-1 py-0.5 rounded-full font-bold"
            style={{
              background: isEnemy ? "rgba(239,68,68,0.15)" : "rgba(96,165,250,0.15)",
              color: isEnemy ? "#fca5a5" : "#93c5fd",
            }}>
            Lv.{p.level}
          </span>
          {p.isDefending && (
            <span className="text-[8px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">🛡️</span>
          )}
        </div>

        {/* HP 條 */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[7px] text-slate-500 w-3 font-bold">HP</span>
          <div className="flex-1 h-2 rounded-full overflow-hidden relative"
            style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.3)" }}>
            <div className="h-full rounded-full transition-all duration-700 relative"
              style={{
                width: `${hpPercent}%`, background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
                boxShadow: `0 0 6px ${hpGlow}`,
              }}>
              {/* 光澤動畫 */}
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="absolute top-0 h-[40%] w-[60%] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                    animation: "hpShimmer 3s ease-in-out infinite",
                  }} />
              </div>
            </div>
            {/* 低血量閃爍 */}
            {hpPercent <= 25 && !p.isDefeated && (
              <div className="absolute inset-0 rounded-full animate-pulse"
                style={{ background: "rgba(239,68,68,0.15)" }} />
            )}
          </div>
          <span className="text-[8px] text-slate-400 w-16 text-right font-mono tabular-nums">
            {p.currentHp}/{p.maxHp}
          </span>
        </div>

        {/* MP 條 */}
        {p.maxMp > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] text-slate-500 w-3 font-bold">MP</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.2)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${mpPercent}%`,
                  background: "linear-gradient(90deg, #6366f1cc, #818cf8)",
                  boxShadow: "0 0 4px rgba(99,102,241,0.3)",
                }} />
            </div>
            <span className="text-[8px] text-slate-500 w-16 text-right font-mono tabular-nums">
              {p.currentMp}/{p.maxMp}
            </span>
          </div>
        )}
      </div>

      {/* 狀態效果 */}
      {p.statusEffects.length > 0 && (
        <div className="flex flex-col gap-0.5 shrink-0">
          {p.statusEffects.slice(0, 3).map((eff, i) => {
            const info = STATUS_ICON[eff.type];
            return (
              <span key={i} className="text-[8px] px-1 py-0.5 rounded-full text-center"
                title={`${info?.name ?? eff.type} (${eff.duration}回合)`}
                style={{
                  background: `${info?.color ?? "#94a3b8"}15`,
                  border: `1px solid ${info?.color ?? "#94a3b8"}30`,
                  color: info?.color ?? "#94a3b8",
                }}>
                {info?.emoji ?? "❓"}{eff.duration}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── 戰鬥日誌行 ───
// ═══════════════════════════════════════════
function BattleLogLine({ log, allies, isLatest }: { log: BattleLogUI; allies: BattleParticipantUI[]; isLatest: boolean }) {
  const isAlly = allies.some(a => a.id === log.actorId);
  const typeStyle: Record<string, string> = {
    damage: isAlly ? (log.isCritical ? "text-yellow-300" : "text-cyan-300") : (log.isCritical ? "text-red-300" : "text-orange-400"),
    heal: "text-emerald-400",
    defend: "text-blue-400",
    flee: "text-amber-400",
    defeat: "text-red-500 font-bold",
    status_tick: "text-purple-400",
  };
  const color = typeStyle[log.logType] ?? "text-slate-500";

  return (
    <div className={`text-[10px] leading-relaxed ${color} ${isLatest ? "animate-fadeSlideIn" : ""}`}
      style={{ opacity: isLatest ? 1 : 0.7 }}>
      <span className="text-indigo-800 mr-1 font-mono">R{log.round}</span>
      <span>{log.message}</span>
      {log.elementBoostDesc && <span className="text-yellow-500/50 ml-1 text-[9px]">({log.elementBoostDesc})</span>}
      {log.isCritical && <span className="text-yellow-300 ml-1 font-bold">💥暴擊！</span>}
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── 指令面板（卡牌式） ───
// ═══════════════════════════════════════════
function CommandPanel({
  character, showSkillPanel, showItemPanel, selectedCommand, selectedSkillId, selectedItemId,
  isSubmitting, turnTimer, timeLeft, battleId,
  onSelectCommand, onSelectSkill, onSelectItem, onCancelPanel, onSubmit,
}: {
  character?: BattleParticipantUI;
  showSkillPanel: boolean; showItemPanel: boolean;
  selectedCommand: string | null; selectedSkillId: string | null; selectedItemId: string | null;
  isSubmitting: boolean; turnTimer: number; timeLeft: number; battleId: string;
  onSelectCommand: (cmd: string) => void;
  onSelectSkill: (id: string) => void;
  onSelectItem: (id: string) => void;
  onCancelPanel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="px-3 py-2.5 border-t border-indigo-900/30"
      style={{ background: "linear-gradient(180deg, rgba(15,13,46,0.6) 0%, rgba(12,10,29,0.9) 100%)" }}>

      {/* 技能選擇面板 */}
      {showSkillPanel && character && (
        <div className="mb-2 animate-fadeSlideIn">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-purple-300 font-bold tracking-wider">✨ 選擇技能</span>
            <button onClick={onCancelPanel}
              className="text-[10px] text-slate-500 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">
              ✕ 返回
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {character.skills.map(sk => {
              const onCooldown = (sk.currentCooldown ?? 0) > 0;
              const noMp = character.currentMp < sk.mpCost;
              const disabled = onCooldown || noMp;
              const selected = selectedSkillId === sk.id;
              return (
                <button key={sk.id}
                  onClick={() => !disabled && onSelectSkill(sk.id)}
                  disabled={disabled}
                  className={`relative rounded-xl px-2.5 py-2 text-left transition-all duration-200 overflow-hidden ${
                    selected ? "scale-[1.02]" : disabled ? "opacity-35" : "hover:scale-[1.02]"
                  }`}
                  style={{
                    background: selected
                      ? "linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.15) 100%)"
                      : "linear-gradient(135deg, rgba(30,27,75,0.4) 0%, rgba(15,13,46,0.6) 100%)",
                    border: `1px solid ${selected ? "rgba(139,92,246,0.5)" : "rgba(99,102,241,0.15)"}`,
                    boxShadow: selected ? "0 0 12px rgba(139,92,246,0.2)" : undefined,
                  }}>
                  <p className="font-bold text-[11px] text-purple-200 truncate">{sk.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-indigo-400">MP {sk.mpCost}</span>
                    {onCooldown && <span className="text-[9px] text-red-400 font-bold">CD {sk.currentCooldown}</span>}
                    {noMp && !onCooldown && <span className="text-[9px] text-red-400">MP不足</span>}
                  </div>
                  {selected && (
                    <div className="absolute top-1 right-1.5 text-[8px] text-purple-300">✓</div>
                  )}
                </button>
              );
            })}
            {character.skills.length === 0 && (
              <p className="col-span-2 text-[10px] text-slate-600 text-center py-3">尚未裝備技能</p>
            )}
          </div>
        </div>
      )}

      {/* 道具選擇面板 */}
      {showItemPanel && character && (
        <div className="mb-2 animate-fadeSlideIn">
          <ItemPanel
            battleId={battleId}
            onSelect={onSelectItem}
            onCancel={onCancelPanel}
            selectedItemId={selectedItemId}
          />
        </div>
      )}

      {/* 指令卡牌列 */}
      {!showSkillPanel && !showItemPanel && (
        <div className="flex gap-1.5 mb-2">
          {COMMAND_CARDS.map(cmd => {
            const selected = selectedCommand === cmd.id;
            return (
              <button key={cmd.id}
                onClick={() => onSelectCommand(cmd.id)}
                disabled={isSubmitting || (character?.isDefeated ?? false)}
                className={`flex-1 relative flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-200 overflow-hidden ${
                  selected ? "scale-[1.05] z-10" : "hover:scale-[1.03]"
                }`}
                style={{
                  background: selected
                    ? `linear-gradient(180deg, ${cmd.glow}30 0%, ${cmd.glow}10 100%)`
                    : "linear-gradient(180deg, rgba(30,27,75,0.5) 0%, rgba(15,13,46,0.7) 100%)",
                  border: `1px solid ${selected ? cmd.glow + "60" : "rgba(99,102,241,0.15)"}`,
                  boxShadow: selected ? `0 0 16px ${cmd.glow}25, 0 4px 12px rgba(0,0,0,0.3)` : "0 2px 8px rgba(0,0,0,0.2)",
                  color: selected ? cmd.glow : "#64748b",
                }}>
                <span className="text-lg" style={{ filter: selected ? `drop-shadow(0 0 6px ${cmd.glow})` : undefined }}>
                  {cmd.icon}
                </span>
                <span className="tracking-wider">{cmd.label}</span>
                {/* 卡牌底部光效 */}
                {selected && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${cmd.glow}, transparent)` }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 確認按鈕 */}
      <button onClick={onSubmit}
        disabled={!selectedCommand || isSubmitting}
        className="group relative w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden hover:scale-[1.01] active:scale-[0.99] disabled:opacity-30 disabled:hover:scale-100"
        style={{
          background: selectedCommand
            ? "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.2) 100%)"
            : "rgba(15,13,46,0.4)",
          border: `1px solid ${selectedCommand ? "rgba(139,92,246,0.4)" : "rgba(99,102,241,0.1)"}`,
          color: selectedCommand ? "#c7d2fe" : "#475569",
          boxShadow: selectedCommand ? "0 0 20px rgba(139,92,246,0.1)" : undefined,
        }}>
        <span className="relative z-10">
          {isSubmitting ? "⏳ 執行中…" : selectedCommand
            ? `⚔️ 確認 ${COMMAND_CARDS.find(c => c.id === selectedCommand)?.label ?? ""}${turnTimer > 0 && timeLeft > 0 ? ` (${timeLeft}s)` : ""}`
            : `選擇指令${turnTimer > 0 && timeLeft > 0 ? ` (${timeLeft}s)` : ""}`}
        </span>
        {selectedCommand && (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-indigo-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        )}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── 道具選擇面板 ───
// ═══════════════════════════════════════════
function ItemPanel({ battleId, onSelect, onCancel, selectedItemId }: {
  battleId: string; onSelect: (itemId: string) => void; onCancel: () => void; selectedItemId: string | null;
}) {
  const itemsQuery = trpc.gameBattle.getBattleItems.useQuery({ battleId }, { staleTime: 30000 });

  const RARITY_COLOR: Record<string, string> = {
    common: "#94a3b8", rare: "#60a5fa", epic: "#a78bfa", legendary: "#fbbf24",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-emerald-300 font-bold tracking-wider">🎒 選擇道具</span>
        <button onClick={onCancel}
          className="text-[10px] text-slate-500 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/5">
          ✕ 返回
        </button>
      </div>
      {itemsQuery.isLoading && <p className="text-[10px] text-slate-600 text-center py-3 animate-pulse">載入中…</p>}
      {itemsQuery.data && itemsQuery.data.length === 0 && (
        <p className="text-[10px] text-slate-600 text-center py-3">背包中沒有可用的戰鬥道具</p>
      )}
      <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto">
        {(itemsQuery.data ?? []).map(item => {
          const rarityColor = RARITY_COLOR[item.rarity] ?? "#94a3b8";
          const selected = selectedItemId === item.itemId;
          const effectDesc = item.useEffect?.description ?? item.effectDesc ?? "使用效果";
          return (
            <button key={item.itemId}
              onClick={() => onSelect(item.itemId)}
              className={`relative rounded-xl px-2.5 py-2 text-left transition-all duration-200 ${
                selected ? "scale-[1.02]" : "hover:scale-[1.02]"
              }`}
              style={{
                background: selected
                  ? "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(15,13,46,0.6) 100%)"
                  : "linear-gradient(135deg, rgba(30,27,75,0.3) 0%, rgba(15,13,46,0.5) 100%)",
                border: `1px solid ${selected ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.1)"}`,
                boxShadow: selected ? "0 0 10px rgba(34,197,94,0.15)" : undefined,
              }}>
              <div className="flex items-center gap-1">
                <p className="font-bold text-[10px] truncate" style={{ color: rarityColor }}>{item.name}</p>
                <span className="text-[8px] text-slate-500 ml-auto shrink-0">×{item.quantity}</span>
              </div>
              <p className="text-[8px] text-slate-500 truncate mt-0.5">{effectDesc}</p>
              {selected && <div className="absolute top-1 right-1.5 text-[8px] text-emerald-300">✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// ─── 戰鬥結算面板（華麗版） ───
// ═══════════════════════════════════════════
function VictoryPanel({ result, round, onClose, rewards }: {
  result: string | null; round: number; onClose: () => void;
  rewards?: { expReward: number; goldReward: number; drops: string[]; petExpGained: number } | null;
}) {
  const won = result === "win";
  const fled = result === "flee";

  return (
    <div className="relative overflow-hidden"
      style={{
        background: won
          ? "linear-gradient(180deg, rgba(21,128,61,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : fled ? "linear-gradient(180deg, rgba(146,64,14,0.15) 0%, rgba(12,10,29,0.9) 100%)"
          : "linear-gradient(180deg, rgba(127,29,29,0.15) 0%, rgba(12,10,29,0.9) 100%)",
      }}>
      {/* 頂部光效 */}
      {won && (
        <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top, rgba(251,191,36,0.15) 0%, transparent 70%)",
            animation: "victoryGlow 1s ease-out",
          }} />
      )}

      <div className="relative px-4 py-4">
        {/* 結果標題 */}
        <div className="text-center mb-3">
          <p className={`text-2xl font-black mb-1 ${won ? "text-amber-300" : fled ? "text-amber-400" : "text-red-400"}`}
            style={{
              textShadow: won ? "0 0 20px rgba(251,191,36,0.5)" : fled ? "0 0 20px rgba(245,158,11,0.3)" : "0 0 20px rgba(239,68,68,0.3)",
              animation: "victoryGlow 0.8s ease-out",
            }}>
            {won ? "🏆 勝利" : fled ? "🏃 撤退" : "💀 敗北"}
          </p>
          <p className="text-[10px] text-slate-500">共 {round} 回合</p>
        </div>

        {/* 獎勵 */}
        {won && rewards && (rewards.expReward > 0 || rewards.goldReward > 0 || rewards.drops.length > 0) && (
          <div className="mb-3 p-3 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(21,128,61,0.1) 0%, rgba(30,27,75,0.3) 100%)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}>
            <p className="text-[11px] font-bold text-emerald-300 mb-2 tracking-wider">✨ 戰鬥獎勵</p>
            <div className="grid grid-cols-2 gap-2">
              {rewards.expReward > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(251,191,36,0.08)" }}>
                  <span className="text-base">⭐</span>
                  <div>
                    <p className="text-[9px] text-slate-400">經驗值</p>
                    <p className="text-xs font-bold text-amber-300">+{rewards.expReward}</p>
                  </div>
                </div>
              )}
              {rewards.goldReward > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(234,179,8,0.08)" }}>
                  <span className="text-base">💰</span>
                  <div>
                    <p className="text-[9px] text-slate-400">金幣</p>
                    <p className="text-xs font-bold text-yellow-300">+{rewards.goldReward}</p>
                  </div>
                </div>
              )}
              {rewards.petExpGained > 0 && (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "rgba(139,92,246,0.08)" }}>
                  <span className="text-base">🐾</span>
                  <div>
                    <p className="text-[9px] text-slate-400">寵物經驗</p>
                    <p className="text-xs font-bold text-purple-300">+{rewards.petExpGained}</p>
                  </div>
                </div>
              )}
            </div>
            {rewards.drops.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-800/20">
                <p className="text-[9px] text-emerald-400 mb-1">🎁 掉落物品</p>
                <div className="flex flex-wrap gap-1">
                  {rewards.drops.map((d, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac" }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 關閉按鈕 */}
        <button onClick={onClose}
          className="group relative w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] overflow-hidden"
          style={{
            background: won
              ? "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(21,128,61,0.15) 100%)"
              : fled ? "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(146,64,14,0.15) 100%)"
              : "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(127,29,29,0.15) 100%)",
            border: `1px solid ${won ? "rgba(34,197,94,0.3)" : fled ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: won ? "#86efac" : fled ? "#fcd34d" : "#fca5a5",
          }}>
          <span className="relative z-10">{won ? "繼續冒險" : fled ? "安全撤退" : "撤退休息"}</span>
        </button>
      </div>
    </div>
  );
}
