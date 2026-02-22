import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { MoonBlock } from "@/components/MoonBlock";
import { OracleResult } from "@/components/OracleResult";
import { DailyEnergyPanel } from "@/components/DailyEnergyPanel";
import { HourlyEnergyTimeline } from "@/components/HourlyEnergyTimeline";
import { MoonPhaseDisplay } from "@/components/MoonPhaseDisplay";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import type { BlockFace } from "@/components/MoonBlock";
import { Streamdown } from "streamdown";
import { SharedNav } from "@/components/SharedNav";
import { ProfileIncompleteBanner } from "@/components/ProfileIncompleteBanner";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureLockedCard } from "@/components/FeatureLockedCard";

type CastPhase = 'idle' | 'animating' | 'result';
type CastMode = 'single' | 'triple';

// ─── 音效生成器 ──────────────────────────────────────────────────────────────

function createWoodKnockSound(): AudioContext | null {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

function playWoodKnock(audioCtx: AudioContext, delay = 0) {
  const time = audioCtx.currentTime + delay;
  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.connect(gain1);
  gain1.connect(audioCtx.destination);
  osc1.frequency.setValueAtTime(180, time);
  osc1.frequency.exponentialRampToValueAtTime(80, time + 0.15);
  gain1.gain.setValueAtTime(0.6, time);
  gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  osc1.start(time);
  osc1.stop(time + 0.3);

  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 3;
  osc2.connect(filter);
  filter.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(600, time);
  osc2.frequency.exponentialRampToValueAtTime(200, time + 0.08);
  gain2.gain.setValueAtTime(0.3, time);
  gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
  osc2.start(time);
  osc2.stop(time + 0.12);

  const bufferSize = audioCtx.sampleRate * 0.1;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseGain = audioCtx.createGain();
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 400;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noiseGain.gain.setValueAtTime(0.4, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
  noiseSource.start(time);
}

function playTripleConfirmSound(audioCtx: AudioContext) {
  [0, 0.3, 0.6].forEach(delay => playWoodKnock(audioCtx, delay));
}

// ─── 語音輸入 Hook ────────────────────────────────────────────────────────────

function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援語音輸入，請使用 Chrome 瀏覽器。');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}

// ─── 背景粒子 ─────────────────────────────────────────────────────────────────

function BackgroundParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0
              ? 'oklch(0.72 0.20 45 / 0.6)'
              : i % 3 === 1
              ? 'oklch(0.55 0.15 200 / 0.4)'
              : 'oklch(0.45 0.12 150 / 0.3)',
          }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

// ─── 三聖杯進度指示器 ─────────────────────────────────────────────────────────

function TripleProgress({ current, results }: { current: number; results: string[] }) {
  const resultColors: Record<string, string> = {
    sheng: '#ef4444',
    xiao: '#a16207',
    yin: '#1e293b',
    li: '#f59e0b',
  };
  const resultNames: Record<string, string> = {
    sheng: '聖', xiao: '笑', yin: '陰', li: '立',
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <motion.div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold"
            style={{
              borderColor: i < current
                ? (resultColors[results[i]] || '#888')
                : i === current ? '#f59e0b' : 'rgba(255,255,255,0.2)',
              background: i < current
                ? `${resultColors[results[i]] || '#888'}33`
                : i === current ? 'rgba(245,158,11,0.15)' : 'transparent',
            }}
            animate={i === current ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {i < current
              ? <span style={{ color: resultColors[results[i]] || '#888' }}>{resultNames[results[i]] || '?'}</span>
              : <span className={i === current ? 'text-amber-400' : 'text-muted-foreground/30'}>{i + 1}</span>
            }
          </motion.div>
          <span className="text-[10px] text-muted-foreground">第{['一', '二', '三'][i]}擲</span>
        </div>
      ))}
    </div>
  );
}

// ─── 主頁面 ───────────────────────────────────────────────────────────────────

export default function OracleCast() {
  const { hasFeature, isAdmin } = usePermissions();
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<CastPhase>('idle');
  const [castMode, setCastMode] = useState<CastMode>('single');
  const [castResult, setCastResult] = useState<any>(null);
  const [leftFace, setLeftFace] = useState<BlockFace>('front');
  const [rightFace, setRightFace] = useState<BlockFace>('front');
  const [showTimeline, setShowTimeline] = useState(false);
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  // 最近3筆歷史問題（本地持久化）
  const [showTemplates, setShowTemplates] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_recent_queries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 三聖杯連擲狀態
  const [tripleCount, setTripleCount] = useState(0);
  const [tripleResults, setTripleResults] = useState<string[]>([]);
  const [tripleConfirmed, setTripleConfirmed] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const { user } = useAuth();
  const { data: profile } = trpc.account.getProfile.useQuery(undefined, { staleTime: 60000 });
  const displayName = profile?.displayName ?? user?.name ?? '您';
  const [, navigate] = useLocation();

  const castMutation = trpc.oracle.cast.useMutation();
  const { data: history } = trpc.oracle.history.useQuery({ limit: 10 });
  const notifyMutation = trpc.oracle.notifyDailyEnergy.useMutation();
  const { data: queryGuide } = trpc.insight.queryGuide.useQuery();
  const deepReadMutation = trpc.insight.deepRead.useMutation({
    onSuccess: (data) => {
      const content = typeof data.content === 'string' ? data.content : String(data.content);
      setLlmInsight(content);
      setShowInsight(true);
    },
  });

  const { isListening, startListening, stopListening } = useVoiceInput((text) => {
    setQuery(prev => prev ? `${prev} ${text}` : text);
  });

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = createWoodKnockSound();
      }
    };
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  // 儲存問題到最近記錄
  const saveQueryToRecent = useCallback((q: string) => {
    if (!q.trim()) return;
    setRecentQueries(prev => {
      const filtered = prev.filter(item => item !== q.trim());
      const updated = [q.trim(), ...filtered].slice(0, 3);
      try { localStorage.setItem('oracle_recent_queries', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // 設定筊杯面向
  const setFacesFromResult = useCallback((result: string) => {
    if (result === 'sheng') { setLeftFace('front'); setRightFace('back'); }
    else if (result === 'xiao') { setLeftFace('front'); setRightFace('front'); }
    else if (result === 'yin') { setLeftFace('back'); setRightFace('back'); }
    else { setLeftFace('special'); setRightFace('special'); }
  }, []);

  // 單次擲筊
  const executeSingleCast = useCallback(async () => {
    setPhase('animating');
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      playWoodKnock(audioCtxRef.current, 0.3);
      playWoodKnock(audioCtxRef.current, 0.55);
    }
    try {
      const result = await castMutation.mutateAsync({ query });
      saveQueryToRecent(query);
      setTimeout(() => {
        setFacesFromResult(result.result);
        setCastResult(result);
        setPhase('result');
      }, 1400);
    } catch (err) {
      console.error('Cast failed:', err);
      setPhase('idle');
    }
  }, [query, castMutation, setFacesFromResult, saveQueryToRecent]);

  // 三聖杯連擲
  const executeTripleCast = useCallback(async (castIndex: number, prevResults: string[]) => {
    setPhase('animating');
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      playWoodKnock(audioCtxRef.current, 0.3);
      playWoodKnock(audioCtxRef.current, 0.55);
    }
    try {
      const result = await castMutation.mutateAsync({ query });
      if (castIndex === 0) saveQueryToRecent(query);
      setTimeout(() => {
        setFacesFromResult(result.result);
        const newResults = [...prevResults, result.result];
        setTripleResults(newResults);

        if (result.result !== 'sheng') {
          setCastResult(result);
          setPhase('result');
          setTripleCount(0);
        } else if (castIndex < 2) {
          setTripleCount(castIndex + 1);
          setPhase('idle');
        } else {
          setTripleConfirmed(true);
          setCastResult({ ...result, isTripleConfirmed: true });
          setPhase('result');
          if (audioCtxRef.current) {
            playTripleConfirmSound(audioCtxRef.current);
          }
        }
      }, 1400);
    } catch (err) {
      console.error('Cast failed:', err);
      setPhase('idle');
    }
  }, [query, castMutation, setFacesFromResult, saveQueryToRecent]);

  const handleCast = useCallback(async () => {
    if (phase !== 'idle') return;
    if (castMode === 'single') {
      await executeSingleCast();
    } else {
      await executeTripleCast(tripleCount, tripleResults);
    }
  }, [phase, castMode, tripleCount, tripleResults, executeSingleCast, executeTripleCast]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setCastResult(null);
    setLeftFace('front');
    setRightFace('front');
    setTripleCount(0);
    setTripleResults([]);
    setTripleConfirmed(false);
    setLlmInsight(null);
    setShowInsight(false);
    // 注意：不清空 query，讓使用者可以修改後再問
  }, []);

  const handleDeepRead = useCallback(async () => {
    if (!castResult) return;
    deepReadMutation.mutate({
      query,
      result: castResult.result,
      dayPillar: `${castResult.dateInfo.dayPillar.stem}${castResult.dateInfo.dayPillar.branch}`,
      hourPillar: castResult.dateInfo.dateString,
      energyLevel: castResult.dateInfo.dayPillar.energyLevel,
      moonPhase: castResult.moonPhase ?? '未知',
      interpretation: castResult.interpretation,
    });
  }, [castResult, query, deepReadMutation]);

  const handleNotify = useCallback(async () => {
    try {
      await notifyMutation.mutateAsync();
      alert('今日能量通知已發送！');
    } catch {
      alert('通知發送失敗，請稍後再試。');
    }
  }, [notifyMutation]);

  const resultTypeMap: Record<string, string> = {
    sheng: '聖杯', xiao: '笑杯', yin: '陰杯', li: '立筊',
  };

  const castButtonLabel = () => {
    if (phase === 'animating') return (
      <span className="flex items-center gap-2">
        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>☯</motion.span>
        感應中...
      </span>
    );
    if (castMode === 'triple') {
      return `🔥 第${['一', '二', '三'][tripleCount]}擲`;
    }
    return '🔥 開始擲筊';
  };

  // 是否顯示登入提示
  const showLoginPrompt = !user;

  return (
    <div className="min-h-screen oracle-bg relative">
      <BackgroundParticles />
      <SharedNav currentPage="oracle" />
      <ProfileIncompleteBanner featureName="擲筊選號" />
      {!isAdmin && !hasFeature("oracle") && <FeatureLockedCard feature="oracle" />}
      {(isAdmin || hasFeature("oracle")) && <div className="relative z-10 container mx-auto px-4 pb-12 oracle-page-content">
        <div className="max-w-2xl mx-auto">

          {/* ═══ 區塊一：筊杯動畫區（置頂，始終顯示） ═══ */}
          <div className="glass-card rounded-2xl overflow-hidden mb-4 mt-2">
            {/* 頂部標題列 */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h1 className="text-xl font-black oracle-text-gradient tracking-widest">天命共振</h1>
                <p className="text-[10px] text-muted-foreground tracking-[0.25em]">{displayName} 專屬神諭系統</p>
              </div>
              {/* 擲筊模式切換 */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setCastMode('single'); setTripleCount(0); setTripleResults([]); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    castMode === 'single'
                      ? 'border-amber-600/60 bg-amber-900/30 text-amber-300'
                      : 'border-border/30 text-muted-foreground hover:border-border/60'
                  }`}
                >
                  🎋 單擲
                </button>
                <button
                  onClick={() => { setCastMode('triple'); setTripleCount(0); setTripleResults([]); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                    castMode === 'triple'
                      ? 'border-amber-600/60 bg-amber-900/30 text-amber-300'
                      : 'border-border/30 text-muted-foreground hover:border-border/60'
                  }`}
                >
                  🔴🔴🔴 三聖杯
                </button>
              </div>
            </div>

            {/* 三聖杯進度（連擲模式） */}
            <AnimatePresence>
              {castMode === 'triple' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 py-3 border-t border-border/20 bg-amber-900/10"
                >
                  <TripleProgress current={tripleCount} results={tripleResults} />
                  {tripleCount > 0 && (
                    <p className="text-xs text-amber-400 text-center mt-2">
                      已得 {tripleCount} 次聖杯，再得 {3 - tripleCount} 次即確認！
                    </p>
                  )}
                  {tripleCount === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      傳統擲筊需三次皆得聖杯，方為神明真正應允
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 筊杯動畫主區 */}
            <div className="relative px-5 py-6 text-center">
              {/* 狀態文字 */}
              <div className="text-xs text-muted-foreground tracking-widest mb-4 h-4">
                {phase === 'animating' ? (
                  <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
                    神明感應中...
                  </motion.span>
                ) : phase === 'result' ? (
                  <span className="text-amber-400/70">擲筊完成 · 問題已記錄</span>
                ) : (
                  '靜心，默念所問之事'
                )}
              </div>

              {/* 筊杯 */}
              <div className="flex justify-center gap-10 mb-6 min-h-[140px] items-end">
                <motion.div
                  animate={phase === 'animating' ? {
                    y: [0, -140, -110, 0],
                    x: [0, -45, -30, 0],
                    rotate: [0, 200, 310, 0],
                  } : {}}
                  transition={phase === 'animating' ? {
                    duration: 1.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  } : {}}
                >
                  <MoonBlock face={phase === 'result' ? leftFace : 'front'} size="lg" />
                </motion.div>
                <motion.div
                  animate={phase === 'animating' ? {
                    y: [0, -140, -110, 0],
                    x: [0, 45, 30, 0],
                    rotate: [0, -200, -310, 0],
                  } : {}}
                  transition={phase === 'animating' ? {
                    duration: 1.2,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    delay: 0.05,
                  } : {}}
                >
                  <MoonBlock face={phase === 'result' ? rightFace : 'back'} size="lg" />
                </motion.div>
              </div>

              {/* 能量光環（動畫中） */}
              <AnimatePresence>
                {phase === 'animating' && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-amber-500/30"
                        style={{ width: 100 + i * 40, height: 100 + i * 40 }}
                        animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 三聖杯確認特效 */}
              <AnimatePresence>
                {tripleConfirmed && phase === 'result' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-3 p-3 bg-amber-900/30 border border-amber-500/60 rounded-xl"
                  >
                    <motion.div
                      className="text-2xl mb-1"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: 3 }}
                    >
                      🎊
                    </motion.div>
                    <p className="text-amber-300 font-bold tracking-wider text-xs">
                      三聖杯確認！神明三度應允，此事天命已定。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 擲筊按鈕 */}
              {phase !== 'result' && (
                <button
                  onClick={handleCast}
                  disabled={phase !== 'idle'}
                  className="flame-button px-10 py-3.5 rounded-full text-base font-black tracking-widest shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {castButtonLabel()}
                </button>
              )}

              {/* 結果後：重新擲筊按鈕 */}
              {phase === 'result' && (
                <button
                  onClick={handleReset}
                  className="px-8 py-3 rounded-full text-sm font-semibold tracking-wider border border-amber-600/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 transition-all"
                >
                  ↩ 再問一次
                </button>
              )}
            </div>
          </div>

          {/* ═══ 區塊二：問題輸入欄（固定顯示，始終可見） ═══ */}
          <div className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground tracking-widest">
                請在此處簡述您所問之事
              </label>
              {isListening && (
                <span className="text-xs text-red-400 animate-pulse">正在聆聽...</span>
              )}
            </div>

            {/* 輸入框 */}
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="例如：我近期的事業發展是否順利？此項目是否值得投入？"
                className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-amber-600/50 transition-colors leading-relaxed pr-10"
                rows={2}
              />
              <button
                onClick={isListening ? stopListening : startListening}
                className={`absolute right-3 bottom-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500/80 animate-pulse' : 'bg-white/10 hover:bg-white/20'
                }`}
                title={isListening ? '停止語音輸入' : '語音輸入'}
              >
                <span className="text-xs">{isListening ? '⏹' : '🎤'}</span>
              </button>
            </div>

            {/* 最近3筆歷史問題快速重選 */}
            {recentQueries.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] text-muted-foreground/60 mb-1.5 tracking-wider">最近詢問（點擊快速填入）</div>
                <div className="space-y-1.5">
                  {recentQueries.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(q)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border group ${
                        query === q
                          ? 'border-amber-600/50 bg-amber-900/25 text-amber-300'
                          : 'border-border/20 bg-white/3 text-muted-foreground hover:border-amber-600/30 hover:bg-amber-900/15 hover:text-amber-300/80'
                      }`}
                    >
                      <span className="text-[10px] text-muted-foreground/40 mr-2">#{i + 1}</span>
                      <span className="line-clamp-1">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 常用問題模板 */}
            <div className="mt-3 pt-3 border-t border-border/20">
              <button
                onClick={() => setShowTemplates(v => !v)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-amber-400 transition-colors mb-2"
              >
                <span className={`transition-transform ${showTemplates ? 'rotate-90' : ''}`}>▶</span>
                <span className="tracking-wider">常用問題模板</span>
              </button>
              {showTemplates && (
                <div className="space-y-2">
                  {([
                    {
                      category: '🎰 彩券',
                      color: 'amber',
                      templates: [
                        '今天買大樂透適合嗎？',
                        '今天買威力彩適合嗎？',
                        '今天的彩券能量如何？',
                      ],
                    },
                    {
                      category: '💼 事業',
                      color: 'blue',
                      templates: [
                        '這項合作計畫值得推進嗎？',
                        '近期的事業發展方向是否正確？',
                        '這個決策時機是否成熟？',
                      ],
                    },
                    {
                      category: '💰 財運',
                      color: 'green',
                      templates: [
                        '近期的投資操作是否適合？',
                        '這筆資金的運用方向是否正確？',
                        '近期財運走勢如何？',
                      ],
                    },
                    {
                      category: '💛 感情',
                      color: 'pink',
                      templates: [
                        '近期的感情發展是否順利？',
                        '這段關係值得繼續投入嗎？',
                        '此時是否適合表達心意？',
                      ],
                    },
                    {
                      category: '🌿 健康',
                      color: 'teal',
                      templates: [
                        '近期身體狀況是否需要特別注意？',
                        '今天的體能狀態適合運動嗎？',
                        '近期的作息調整方向是否正確？',
                      ],
                    },
                  ] as const).map(({ category, color, templates }) => (
                    <div key={category}>
                      <div className="text-[10px] text-muted-foreground/50 mb-1">{category}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {templates.map((t) => (
                          <button
                            key={t}
                            onClick={() => { setQuery(t); setShowTemplates(false); }}
                            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-all ${
                              query === t
                                ? 'border-amber-600/60 bg-amber-900/30 text-amber-300'
                                : 'border-border/30 bg-white/3 text-muted-foreground hover:border-amber-600/30 hover:text-amber-300/80 hover:bg-amber-900/10'
                            } active:scale-95`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 問卜指引 */}
            {queryGuide && (
              <div className="mt-3 pt-3 border-t border-border/20 flex items-start gap-2">
                <span className="text-sm flex-shrink-0">🧭</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold text-amber-400 tracking-wider">問卜指引</span>
                    <span className="text-[10px] text-muted-foreground">{queryGuide.currentHour} · {queryGuide.energyLabel}</span>
                    {queryGuide.isFullMoon && <span className="text-[10px] text-amber-300">🌕 滿月</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">{queryGuide.guidanceText}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {queryGuide.bestTopics.map((topic: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setQuery(prev => prev ? prev : topic)}
                        className="text-[10px] px-2 py-0.5 bg-amber-900/30 border border-amber-600/30 rounded-full text-amber-400 hover:bg-amber-900/50 transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ 區塊三：結果顯示 ═══ */}
          <AnimatePresence>
            {phase === 'result' && castResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4"
              >
                <OracleResult
                  result={castResult.result}
                  interpretation={castResult.interpretation}
                  energyResonance={castResult.energyResonance}
                  dateString={castResult.dateInfo.dateString}
                  query={query}
                  weights={castResult.weights}
                  isSpecialEgg={castResult.isSpecialEgg}
                  onReset={handleReset}
                />

                {/* LLM 深度解讀 */}
                <div className="mt-3">
                  {!showInsight ? (
                    <button
                      onClick={handleDeepRead}
                      disabled={deepReadMutation.isPending}
                      className="w-full py-3 rounded-xl border border-purple-500/30 bg-purple-900/20 text-purple-300 text-sm hover:border-purple-500/60 hover:bg-purple-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deepReadMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>✦</motion.span>
                          神明深度解讀中...
                        </span>
                      ) : (
                        '✦ 請求 AI 神諭深度解讀'
                      )}
                    </button>
                  ) : llmInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl border border-purple-500/30 bg-purple-900/20 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-purple-400">✦</span>
                        <span className="text-xs font-semibold text-purple-300 tracking-wider">神諭深度解讀</span>
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed">
                        <Streamdown>{llmInsight}</Streamdown>
                      </div>
                      <button
                        onClick={() => { setShowInsight(false); setLlmInsight(null); }}
                        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        收起解讀
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ 區塊四：能量面板（idle 時顯示） ═══ */}
          <AnimatePresence>
            {phase !== 'animating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-4 space-y-3"
              >
                {/* 每日能量 + 月相 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DailyEnergyPanel />
                  <MoonPhaseDisplay compact />
                </div>

                {/* 時辰能量時間軸（可展開） */}
                <div>
                  <button
                    onClick={() => setShowTimeline(!showTimeline)}
                    className="w-full text-xs text-muted-foreground hover:text-amber-400 transition-colors py-2 border border-border/30 rounded-xl hover:border-amber-600/30 mb-2"
                  >
                    {showTimeline ? '▲ 收起時辰能量' : '⏰ 展開全天時辰能量預覽'}
                  </button>
                  <AnimatePresence>
                    {showTimeline && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <HourlyEnergyTimeline />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ 區塊五：快速功能入口 ═══ */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { path: '/war-room', icon: '⚔️', label: '今日作戰室', desc: '流日分析' },
              { path: '/profile', icon: '🔮', label: '命格身份證', desc: '八字紫微' },
              { path: '/calendar', icon: '📅', label: '天命日曆', desc: '節氣宜忌' },
              { path: '/weekly', icon: '📈', label: '命理週報', desc: 'ROI走勢' },
              { path: '/lottery', icon: '🎰', label: '選號日誌', desc: '天命選號' },
              { path: '/stats', icon: '📊', label: '擲筊統計', desc: '年度分析' },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-border/20 hover:bg-white/10 hover:border-amber-600/30 transition-all group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                <span className="text-[11px] font-medium text-slate-300 group-hover:text-amber-300 transition-colors">{item.label}</span>
                <span className="text-[9px] text-muted-foreground/50">{item.desc}</span>
              </button>
            ))}
          </div>

          {/* ═══ 區塊六：神諭歷史記錄（可展開） ═══ */}
          {history && history.length > 0 && (
            <details className="glass-card rounded-2xl overflow-hidden mb-4">
              <summary className="px-5 py-3 text-xs text-muted-foreground hover:text-amber-400 cursor-pointer tracking-wider select-none flex items-center justify-between">
                <span>📜 神諭歷史記錄（最近 {history.length} 筆）</span>
                <span className="text-[10px] opacity-60">點擊展開</span>
              </summary>
              <div className="px-5 pb-4 space-y-2 border-t border-border/20 pt-3">
                {history.map((session) => (
                  <div key={session.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="text-base flex-shrink-0">
                      {session.result === 'sheng' ? '🔴' :
                       session.result === 'xiao' ? '🟤' :
                       session.result === 'yin' ? '⚫' : '✨'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-amber-400">
                          {resultTypeMap[session.result]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {session.dayPillarStem}{session.dayPillarBranch}日
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{session.query}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(session.createdAt).toLocaleDateString('zh-TW', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                        {session.query && (
                          <button
                            onClick={() => setQuery(session.query)}
                            className="text-[10px] text-amber-500/60 hover:text-amber-400 transition-colors"
                          >
                            重用此問題
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate('/stats')}
                  className="w-full mt-2 text-xs text-amber-400 hover:text-amber-300 transition-colors py-2 border border-amber-600/30 rounded-xl"
                >
                  📊 查看完整統計分析
                </button>
              </div>
            </details>
          )}

          {/* 命理提示 */}
          {profile && (profile.yearPillar || profile.dayMasterElement) && (
          <div className="text-center mb-4">
            <p className="text-[10px] text-muted-foreground/40 tracking-wider">
              {[profile.yearPillar, profile.monthPillar, profile.dayPillar, profile.hourPillar].filter(Boolean).join('・')}
              {profile.dayMasterElement && ` · ${profile.dayMasterElement}日主`}
            </p>
          </div>
          )}

        </div>
      </div>}
    </div>
  );
}
