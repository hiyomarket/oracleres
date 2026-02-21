import { useState, useCallback, useRef, useEffect } from "react";
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

type CastPhase = 'idle' | 'animating' | 'result';
type CastMode = 'single' | 'triple'; // 單擲 vs 三聖杯連擲

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

// 三聖杯確認音效（清脆三連擊）
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
    <div className="flex items-center justify-center gap-4 mb-4">
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
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<CastPhase>('idle');
  const [castMode, setCastMode] = useState<CastMode>('single');
  const [castResult, setCastResult] = useState<any>(null);
  const [leftFace, setLeftFace] = useState<BlockFace>('front');
  const [rightFace, setRightFace] = useState<BlockFace>('front');
  const [showHistory, setShowHistory] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMoonPhase, setShowMoonPhase] = useState(false);
  const [llmInsight, setLlmInsight] = useState<string | null>(null);
  const [showInsight, setShowInsight] = useState(false);

  // 三聖杯連擲狀態
  const [tripleCount, setTripleCount] = useState(0);      // 當前第幾擲（0-2）
  const [tripleResults, setTripleResults] = useState<string[]>([]); // 每擲結果
  const [tripleConfirmed, setTripleConfirmed] = useState(false);    // 是否三次皆聖杯

  const audioCtxRef = useRef<AudioContext | null>(null);
  const { user } = useAuth();
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
      setTimeout(() => {
        setFacesFromResult(result.result);
        setCastResult(result);
        setPhase('result');
      }, 1400);
    } catch (err) {
      console.error('Cast failed:', err);
      setPhase('idle');
    }
  }, [query, castMutation, setFacesFromResult]);

  // 三聖杯連擲 - 執行單次
  const executeTripleCast = useCallback(async (castIndex: number, prevResults: string[]) => {
    setPhase('animating');
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
      playWoodKnock(audioCtxRef.current, 0.3);
      playWoodKnock(audioCtxRef.current, 0.55);
    }
    try {
      const result = await castMutation.mutateAsync({ query });
      setTimeout(() => {
        setFacesFromResult(result.result);
        const newResults = [...prevResults, result.result];
        setTripleResults(newResults);

        if (result.result !== 'sheng') {
          // 非聖杯：三聖杯失敗，顯示此次結果
          setCastResult(result);
          setPhase('result');
          setTripleCount(0);
        } else if (castIndex < 2) {
          // 聖杯但未到三次：繼續
          setTripleCount(castIndex + 1);
          setPhase('idle');
        } else {
          // 三次皆聖杯！
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
  }, [query, castMutation, setFacesFromResult]);

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
    setQuery('');
    setLeftFace('front');
    setRightFace('front');
    setTripleCount(0);
    setTripleResults([]);
    setTripleConfirmed(false);
    setLlmInsight(null);
    setShowInsight(false);
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

  return (
    <div className="min-h-screen oracle-bg relative">
      <BackgroundParticles />

      {/* 頂部導航 */}
      <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">☯</span>
          <span className="oracle-text-gradient font-bold tracking-widest text-sm md:text-base">
            天命共振
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {user && (
            <button
              onClick={handleNotify}
              className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
              title="推送今日能量通知"
            >
              📬
            </button>
          )}
          <button
            onClick={() => navigate('/lottery')}
            className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
            title="天命選號"
          >
            🎰 選號
          </button>
          <button
            onClick={() => navigate('/calendar')}
            className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
            title="天命日曆"
          >
            📅 日曆
          </button>
          <button
            onClick={() => navigate('/stats')}
            className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
            title="神諭統計"
          >
            📊 統計
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-2 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
          >
            📜 記錄
          </button>
          {!user ? (
            <a href={getLoginUrl()} className="text-xs flame-button px-3 py-1.5 rounded-lg">
              登入
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">{user.name}</span>
          )}
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">

          {/* 主標題 */}
          <AnimatePresence mode="wait">
            {phase !== 'result' && (
              <motion.div
                className="text-center mb-6 pt-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl md:text-4xl font-black oracle-text-gradient tracking-widest mb-1">
                  天命共振
                </h1>
                <p className="text-xs text-muted-foreground tracking-[0.3em]">
                  蘇祐震先生專屬神諭系統
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 能量面板區（idle 時顯示） */}
          <AnimatePresence>
            {phase === 'idle' && (
              <motion.div
                className="mb-5 space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* 每日能量 + 月相（並排） */}
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

          {/* 主要內容區 */}
          <AnimatePresence mode="wait">
            {phase === 'result' && castResult ? (
              <div key="result">
                {/* 三聖杯確認特效 */}
                {tripleConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-4 bg-amber-900/30 border border-amber-500/60 rounded-2xl text-center"
                  >
                    <motion.div
                      className="text-3xl mb-2"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: 3 }}
                    >
                      🎊
                    </motion.div>
                    <p className="text-amber-300 font-bold tracking-wider text-sm">
                      三聖杯確認！
                    </p>
                    <p className="text-amber-400/80 text-xs mt-1">
                      神明三度應允，此事天命已定，可放心前行。
                    </p>
                  </motion.div>
                )}
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
                <div className="mt-4">
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
              </div>
            ) : (
              <motion.div
                key="cast"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* 擲筊模式切換 */}
                <div className="glass-card rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground tracking-wider">擲筊模式</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setCastMode('single'); setTripleCount(0); setTripleResults([]); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wider transition-all border ${
                        castMode === 'single'
                          ? 'border-amber-600/60 bg-amber-900/30 text-amber-300'
                          : 'border-border/30 text-muted-foreground hover:border-border/60'
                      }`}
                    >
                      🎋 單次擲筊
                      <div className="text-[10px] font-normal mt-0.5 opacity-70">一擲定奪</div>
                    </button>
                    <button
                      onClick={() => { setCastMode('triple'); setTripleCount(0); setTripleResults([]); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wider transition-all border ${
                        castMode === 'triple'
                          ? 'border-amber-600/60 bg-amber-900/30 text-amber-300'
                          : 'border-border/30 text-muted-foreground hover:border-border/60'
                      }`}
                    >
                      🔴🔴🔴 三聖杯連擲
                      <div className="text-[10px] font-normal mt-0.5 opacity-70">三次皆聖才算應允</div>
                    </button>
                  </div>
                </div>

                {/* 三聖杯進度（連擲模式） */}
                {castMode === 'triple' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 mb-4"
                  >
                    <p className="text-xs text-muted-foreground text-center mb-3 tracking-wider">
                      傳統擲筊需三次皆得聖杯，方為神明真正應允
                    </p>
                    <TripleProgress current={tripleCount} results={tripleResults} />
                    {tripleCount > 0 && (
                      <p className="text-xs text-amber-400 text-center mt-2">
                        已得 {tripleCount} 次聖杯，再得 {3 - tripleCount} 次即確認！
                      </p>
                    )}
                  </motion.div>
                )}

                {/* 問卜指引 */}
                {queryGuide && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 mb-4 border border-amber-600/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">🧭</span>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-amber-400 tracking-wider">問卜指引</span>
                          <span className="text-xs text-muted-foreground">{queryGuide.currentHour} · {queryGuide.energyLabel}</span>
                          {queryGuide.isFullMoon && <span className="text-xs text-amber-300">🌕 滿月</span>}
                        </div>
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">{queryGuide.guidanceText}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {queryGuide.bestTopics.map((topic: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-amber-900/30 border border-amber-600/30 rounded-full text-amber-400">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 問題輸入區 */}
                <div className="glass-card rounded-2xl p-5 mb-5">
                  <label className="block text-xs text-muted-foreground tracking-widest mb-3">
                    請在此處簡述您所問之事
                  </label>
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="例如：我近期的事業發展是否順利？此項目是否值得投入？"
                      className="w-full bg-white/5 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-amber-600/50 transition-colors leading-relaxed"
                      rows={3}
                      disabled={phase !== 'idle'}
                    />
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isListening ? 'bg-red-500/80 animate-pulse' : 'bg-white/10 hover:bg-white/20'
                      }`}
                      title={isListening ? '停止語音輸入' : '語音輸入'}
                    >
                      <span className="text-sm">{isListening ? '⏹' : '🎤'}</span>
                    </button>
                  </div>
                  {isListening && (
                    <p className="text-xs text-red-400 mt-2 animate-pulse">
                      正在聆聽... 請說出您的問題
                    </p>
                  )}
                </div>

                {/* 筊杯展示區 */}
                <div className="glass-card rounded-2xl p-8 mb-5 text-center relative overflow-hidden">
                  <div className="text-xs text-muted-foreground tracking-widest mb-6">
                    {phase === 'animating' ? '神明感應中...' : '靜心，默念所問之事'}
                  </div>

                  <div className="flex justify-center gap-10 mb-6 min-h-[160px] items-end">
                    <motion.div
                      animate={phase === 'animating' ? {
                        y: [0, -160, -120, 0],
                        x: [0, -50, -35, 0],
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
                        y: [0, -160, -120, 0],
                        x: [0, 50, 35, 0],
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

                  {/* 擲筊按鈕 */}
                  <button
                    onClick={handleCast}
                    disabled={phase !== 'idle'}
                    className="flame-button px-12 py-4 rounded-full text-lg font-black tracking-widest shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {castButtonLabel()}
                  </button>
                </div>

                {/* 命理提示 */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground/50 tracking-wider">
                    此系統基於蘇先生八字命格「甲子・乙亥・甲子・己巳」
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1 tracking-wider">
                    水木之身，以火為用神，每次擲筊皆與天命共振
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 神諭歷史記錄 */}
          <AnimatePresence>
            {showHistory && history && history.length > 0 && (
              <motion.div
                className="mt-5 glass-card rounded-2xl p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-widest oracle-text-gradient">
                    神諭記錄
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    收起
                  </button>
                </div>
                <div className="space-y-3">
                  {history.map((session) => (
                    <div key={session.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="text-lg flex-shrink-0">
                        {session.result === 'sheng' ? '🔴' :
                         session.result === 'xiao' ? '🟤' :
                         session.result === 'yin' ? '⚫' : '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-amber-400">
                            {resultTypeMap[session.result]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.dayPillarStem}{session.dayPillarBranch}日
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{session.query}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(session.createdAt).toLocaleDateString('zh-TW', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/stats')}
                  className="w-full mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors py-2 border border-amber-600/30 rounded-xl"
                >
                  📊 查看完整統計分析
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
