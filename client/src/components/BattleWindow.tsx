/**
 * BattleWindow.tsx — GD-020 全螢幕回合制戰鬥視窗（6v6 佈局）
 *
 * 功能：
 * 1. 全螢幕 6v6 佈局（前後排各 3 格，敵我各 6 格）
 * 2. 玩家頭像 + 寵物頭像顯示
 * 3. 道具面板可滾動
 * 4. 回合倒數計時器
 * 5. 五行光圈 + 暴擊震屏 + 飄字動畫
 * 6. 寵物獨立指令面板（技能 + 目標選擇）
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BattleParticipantUI, BattleLogUI, BattleWindowProps,
  BattleGrid, BattleLogLine, CommandPanel, VictoryPanel,
  PetCommandPanel, ActionPreview,
  ParticleBackground, ScreenFlash, DropAnimation, SkillAnnounce,
  RoundTransition, FloatingTexts, BattleStyles,
} from "./battle";

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
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  // 寵物獨立指令
  const [petCommand, setPetCommand] = useState<string | null>(null);
  const [petSkillId, setPetSkillId] = useState<string | null>(null);
  const [petTargetId, setPetTargetId] = useState<number | null>(null);
  const [showPetSkillPanel, setShowPetSkillPanel] = useState(false);
  // Boss 擊殺掉落動畫
  const [showDropAnimation, setShowDropAnimation] = useState(false);
  const [animatedDrops, setAnimatedDrops] = useState<string[]>([]);
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
      x: opts.x ?? xJitter, y: opts.y ?? "40%",
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

  const announceSkill = useCallback((name: string, element?: string) => {
    setSkillAnnounce({ name, element });
    setTimeout(() => setSkillAnnounce(null), 1500);
  }, []);

  // ─── 提交指令 ───
  const submitCmd = trpc.gameBattle.submitCommand.useMutation({
    onSuccess: (data: any) => {
      setIsSubmitting(false);
      setSelectedCommand(null);
      setSelectedSkillId(null);
      setSelectedItemId(null);
      setSelectedTargetId(null);
      setShowSkillPanel(false);
      setShowItemPanel(false);
      setPetCommand(null);
      setPetSkillId(null);
      setPetTargetId(null);
      setShowPetSkillPanel(false);
      if (data?.rewards) {
        setRewards(data.rewards);
        if (data.state === "ended" && data.result === "win" && data.rewards.drops?.length > 0) {
          setAnimatedDrops(data.rewards.drops);
          setShowDropAnimation(true);
          setTimeout(() => setShowDropAnimation(false), 3500);
        }
      }
      battleQuery.refetch();
      setTimeout(() => {
        if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
      }, 100);
    },
    onError: (err: { message: string }) => {
      setIsSubmitting(false);
      toast.error(`戰鬥指令失敗：${err.message}`);
    },
  });

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

  // ─── 戰鬥狀態查詢 ───
  const battleQuery = trpc.gameBattle.getBattleState.useQuery(
    { battleId },
    {
      refetchInterval: battleState === "active" || battleState === "waiting" ? 2000 : false,
      staleTime: 0,
    }
  );

  // ─── 日誌動畫處理 ───
  const prevLogsLength = useRef(0);
  useEffect(() => {
    if (!battleQuery.data) return;
    const d = battleQuery.data;
    const newLogs = d.logs as BattleLogUI[];
    if (newLogs.length > prevLogsLength.current) {
      const addedLogs = newLogs.slice(prevLogsLength.current);
      for (const log of addedLogs) {
        if (log.logType === "damage" && log.value > 0) {
          const isAllyActor = (d.participants as BattleParticipantUI[]).find(p => p.id === log.actorId)?.side === "ally";
          const color = log.isCritical ? "#fbbf24" : isAllyActor ? "#22c55e" : "#ef4444";
          const xPos = isAllyActor ? `${55 + Math.random() * 15}%` : `${30 + Math.random() * 15}%`;
          addFloatingText({ text: log.isCritical ? `💥${log.value}` : `-${log.value}`, color, x: xPos, y: "35%", isCrit: log.isCritical, type: "damage" });
          if (log.isCritical) { triggerScreenFlash("rgba(251,191,36,0.15)"); triggerShake(2); }
          else { triggerShake(1); }
          if (log.targetId) setHitId(log.targetId);
          if (log.actorId) setAttackingId(log.actorId);
          setTimeout(() => { setHitId(null); setAttackingId(null); }, 400);
        }
        if (log.logType === "heal" && log.value > 0) {
          addFloatingText({ text: `+${log.value}`, color: "#22c55e", y: "30%", type: "heal" });
        }
        if (log.skillName) {
          const actor = (d.participants as BattleParticipantUI[]).find(p => p.id === log.actorId);
          announceSkill(log.skillName, actor?.dominantElement);
        }
      }
      prevLogsLength.current = newLogs.length;
    }
    setParticipants(d.participants as BattleParticipantUI[]);
    setLogs(newLogs);
    setRound(d.battle.currentRound);
    setBattleState(d.battle.state);
    if (d.battle.result) setBattleResult(d.battle.result);
    if ((d.battle as any).turnTimer !== undefined) setTurnTimer((d.battle as any).turnTimer);
    setTimeout(() => {
      if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }, 100);
  }, [battleQuery.data]);

  // ─── 戰鬥結束處理 ───
  useEffect(() => {
    if (battleState === "ended" && battleResult) {
      const result = battleResult === "win" ? "win" : battleResult === "flee" ? "flee" : "lose";
      onBattleEnd?.(result);
    }
  }, [battleState, battleResult]);

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
      const target = selectedTargetId
        ? enemies.find(e => e.id === selectedTargetId && !e.isDefeated) ?? enemies.find(e => !e.isDefeated)
        : enemies.find(e => !e.isDefeated);
      commands.push({
        participantId: character.id,
        commandType: selectedCommand as CmdType,
        targetId: target?.id,
        skillId: selectedCommand === "skill" ? selectedSkillId ?? undefined : undefined,
        itemId: selectedCommand === "item" ? selectedItemId ?? undefined : undefined,
      });
    }
    // 寵物獨立指令
    if (pet && !pet.isDefeated && petCommand) {
      const petTarget = petTargetId
        ? enemies.find(e => e.id === petTargetId && !e.isDefeated) ?? enemies.find(e => !e.isDefeated)
        : enemies.find(e => !e.isDefeated);
      commands.push({
        participantId: pet.id,
        commandType: petCommand as CmdType,
        targetId: petTarget?.id,
        skillId: petCommand === "skill" ? petSkillId ?? undefined : undefined,
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <ParticleBackground particles={particles} />
      <ScreenFlash color={screenFlash} />
      <DropAnimation show={showDropAnimation} drops={animatedDrops} />
      <SkillAnnounce skill={skillAnnounce} />
      <RoundTransition show={roundTransition} round={round} />
      <FloatingTexts texts={floatingTexts} />

      {/* ═══ 主戰鬥面板（全螢幕） ═══ */}
      <div className="relative w-full h-full flex flex-col"
        style={{
          background: "linear-gradient(160deg, #0c0a1d 0%, #1a1145 40%, #0f0d2e 70%, #0c0a1d 100%)",
          animation: shakeIntensity > 0 ? `battleShake${shakeIntensity > 1 ? "Hard" : ""} 0.5s ease-out` : undefined,
        }}>
        {/* 頂部裝飾線 */}
        <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
          style={{ background: "linear-gradient(90deg, transparent, #8b5cf6, #6366f1, #8b5cf6, transparent)" }} />

        {/* ─── 頂部欄：回合 + 倒數 + 控制 ─── */}
        <div className="relative flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ background: "linear-gradient(180deg, rgba(30,27,75,0.95) 0%, rgba(15,13,46,0.8) 100%)", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
          <div className="flex items-center gap-2">
            <span className="text-xl" style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.6))" }}>⚔️</span>
            <div>
              <p className="text-white font-black text-sm tracking-wide">第 {round} 回合</p>
              <p className="text-[9px] text-indigo-400/60">
                {enemies.filter(e => !e.isDefeated).length} 敵 | {allies.filter(a => !a.isDefeated).length} 友
              </p>
            </div>
          </div>

          {turnTimer > 0 && battleState === "active" && (
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15" fill="none"
                    stroke={timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#8b5cf6"}
                    strokeWidth="2.5" strokeDasharray={`${timerPercent * 0.942} 100`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 1s linear, stroke 0.3s" }} />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${
                  timeLeft <= 5 ? "text-red-400 animate-pulse" : timeLeft <= 10 ? "text-amber-300" : "text-indigo-200"
                }`}>{timeLeft}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {battleState !== "ended" && (
              <button onClick={handleAutoBattle} disabled={isSubmitting}
                className="group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 overflow-hidden"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <span className="relative z-10 text-purple-300 group-hover:text-purple-200">🤖 自動</span>
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* ─── 主戰場（上下分割） ─── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            {/* 敵方區域 */}
            <div className="shrink-0 px-3 pt-2 pb-1" style={{ background: "rgba(127,29,29,0.06)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold text-red-400/50 tracking-widest">▼ ENEMY</p>
                {battleState === "active" && enemies.filter(e => !e.isDefeated).length > 1 && (
                  <p className="text-[8px] text-amber-400/60 animate-pulse">
                    {selectedTargetId ? "🔻 已選擇目標" : "点擊敵方可指定目標"}
                  </p>
                )}
              </div>
              <BattleGrid participants={enemies} isEnemy attackingId={attackingId} hitId={hitId} maxSlots={6}
                selectedTargetId={selectedTargetId}
                onTargetSelect={(id) => {
                  setSelectedTargetId(prev => prev === id ? null : id);
                  setPetTargetId(prev => prev === id ? null : id);
                }} />
            </div>

            {/* 戰鬥日誌 */}
            <div className="flex-1 relative min-h-0">
              <div className="absolute left-0 right-0 top-0 h-4 z-10"
                style={{ background: "linear-gradient(to bottom, rgba(12,10,29,0.8), transparent)" }} />
              <div ref={logScrollRef} className="h-full overflow-y-auto px-3 py-3 space-y-0.5"
                style={{ background: "rgba(12,10,29,0.4)" }}>
                {logs.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-indigo-500/40 text-xs animate-pulse">⚔️ 等待指令…</p>
                  </div>
                )}
                {logs.slice(-30).map((log, i) => (
                  <BattleLogLine key={`${log.round}-${i}`} log={log} allies={allies} isLatest={i === Math.min(logs.length, 30) - 1} />
                ))}
              </div>
              <div className="absolute left-0 right-0 bottom-0 h-4 z-10"
                style={{ background: "linear-gradient(to top, rgba(12,10,29,0.8), transparent)" }} />
            </div>

            {/* 我方區域 */}
            <div className="shrink-0 px-3 pt-1 pb-2" style={{ background: "rgba(30,58,138,0.06)" }}>
              <p className="text-[9px] font-bold text-cyan-400/50 tracking-widest mb-1.5">▲ ALLY</p>
              <BattleGrid participants={allies} attackingId={attackingId} hitId={hitId} maxSlots={6} />
            </div>
          </div>

          {/* 指令面板 / 結算面板（固定底部） */}
          <div className="shrink-0" style={{ borderTop: "1px solid rgba(99,102,241,0.2)" }}>
            {battleState === "ended" ? (
              <VictoryPanel result={battleResult} round={round} onClose={onClose} rewards={rewards} />
            ) : (
              <>
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

                {/* 行動預覽 */}
                {battleState === "active" && (selectedCommand || petCommand) && (
                  <ActionPreview
                    character={character} pet={pet} enemies={enemies}
                    selectedCommand={selectedCommand} selectedSkillId={selectedSkillId}
                    selectedItemId={selectedItemId} selectedTargetId={selectedTargetId}
                    petCommand={petCommand} petSkillId={petSkillId} petTargetId={petTargetId}
                  />
                )}

                {/* 寵物獨立指令面板 */}
                {pet && !pet.isDefeated && battleState === "active" && (
                  <PetCommandPanel
                    pet={pet}
                    enemies={enemies}
                    petCommand={petCommand}
                    petSkillId={petSkillId}
                    petTargetId={petTargetId}
                    showPetSkillPanel={showPetSkillPanel}
                    onSetPetCommand={setPetCommand}
                    onSetPetSkillId={setPetSkillId}
                    onSetPetTargetId={setPetTargetId}
                    onSetShowPetSkillPanel={setShowPetSkillPanel}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部裝飾線 */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #6366f1, transparent)" }} />
      </div>

      <BattleStyles />
    </div>
  );
}
