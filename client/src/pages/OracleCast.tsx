import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { MoonBlock } from "@/components/MoonBlock";
import { OracleResult } from "@/components/OracleResult";
import { DailyEnergyPanel } from "@/components/DailyEnergyPanel";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import type { BlockFace } from "@/components/MoonBlock";

type CastPhase = 'idle' | 'animating' | 'result';

// 音效生成器（使用 Web Audio API 生成木頭撞擊聲）
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

  // 主體低頻撞擊
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

  // 高頻木質感
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

  // 噪音層（木頭質感）
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

// 語音輸入 Hook
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

// 背景粒子
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
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 2 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

export default function OracleCast() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<CastPhase>('idle');
  const [castResult, setCastResult] = useState<any>(null);
  const [leftFace, setLeftFace] = useState<BlockFace>('front');
  const [rightFace, setRightFace] = useState<BlockFace>('front');
  const [showHistory, setShowHistory] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const { user } = useAuth();

  const castMutation = trpc.oracle.cast.useMutation();
  const { data: history } = trpc.oracle.history.useQuery({ limit: 10 });
  const notifyMutation = trpc.oracle.notifyDailyEnergy.useMutation();

  const { isListening, startListening, stopListening } = useVoiceInput((text) => {
    setQuery(prev => prev ? `${prev} ${text}` : text);
  });

  // 初始化音效
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = createWoodKnockSound();
      }
    };
    document.addEventListener('click', initAudio, { once: true });
    return () => document.removeEventListener('click', initAudio);
  }, []);

  const handleCast = useCallback(async () => {
    if (phase !== 'idle') return;

    setPhase('animating');

    // 播放音效
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      playWoodKnock(audioCtxRef.current, 0.3);
      playWoodKnock(audioCtxRef.current, 0.55);
    }

    // 執行擲筊算法
    try {
      const result = await castMutation.mutateAsync({ query });

      // 動畫期間（1.2秒後）顯示結果
      setTimeout(() => {
        // 根據結果設定筊杯面向
        if (result.result === 'sheng') {
          setLeftFace('front');
          setRightFace('back');
        } else if (result.result === 'xiao') {
          setLeftFace('front');
          setRightFace('front');
        } else if (result.result === 'yin') {
          setLeftFace('back');
          setRightFace('back');
        } else {
          setLeftFace('special');
          setRightFace('special');
        }
        setCastResult(result);
        setPhase('result');
      }, 1400);
    } catch (err) {
      console.error('Cast failed:', err);
      setPhase('idle');
    }
  }, [phase, query, castMutation]);

  const handleReset = useCallback(() => {
    setPhase('idle');
    setCastResult(null);
    setQuery('');
    setLeftFace('front');
    setRightFace('front');
  }, []);

  const handleNotify = useCallback(async () => {
    try {
      await notifyMutation.mutateAsync();
      alert('今日能量通知已發送！');
    } catch {
      alert('通知發送失敗，請稍後再試。');
    }
  }, [notifyMutation]);

  const resultTypeMap: Record<string, string> = {
    sheng: '聖杯',
    xiao: '笑杯',
    yin: '陰杯',
    li: '立筊',
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
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={handleNotify}
              className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-3 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
              title="推送今日能量通知"
            >
              📬 今日能量
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-muted-foreground hover:text-amber-400 transition-colors px-3 py-1.5 rounded-lg border border-border/50 hover:border-amber-600/50"
          >
            📜 神諭記錄
          </button>
          {!user ? (
            <a
              href={getLoginUrl()}
              className="text-xs flame-button px-3 py-1.5 rounded-lg"
            >
              登入
            </a>
          ) : (
            <span className="text-xs text-muted-foreground">
              {user.name}
            </span>
          )}
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-4 pb-12">
        <div className="max-w-2xl mx-auto">

          {/* 主標題 */}
          <AnimatePresence mode="wait">
            {phase !== 'result' && (
              <motion.div
                className="text-center mb-8 pt-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl md:text-4xl font-black oracle-text-gradient tracking-widest mb-2">
                  天命共振
                </h1>
                <p className="text-xs text-muted-foreground tracking-[0.3em]">
                  蘇祐震先生專屬神諭系統
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 每日能量面板 */}
          <AnimatePresence>
            {phase === 'idle' && (
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <DailyEnergyPanel />
              </motion.div>
            )}
          </AnimatePresence>

          {/* 主要內容區 */}
          <AnimatePresence mode="wait">
            {phase === 'result' && castResult ? (
              <OracleResult
                key="result"
                result={castResult.result}
                interpretation={castResult.interpretation}
                energyResonance={castResult.energyResonance}
                dateString={castResult.dateInfo.dateString}
                query={query}
                weights={castResult.weights}
                isSpecialEgg={castResult.isSpecialEgg}
                onReset={handleReset}
              />
            ) : (
              <motion.div
                key="cast"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* 問題輸入區 */}
                <div className="glass-card rounded-2xl p-5 mb-6">
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
                    {/* 語音輸入按鈕 */}
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isListening
                          ? 'bg-red-500/80 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20'
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
                <div className="glass-card rounded-2xl p-8 mb-6 text-center">
                  <div className="text-xs text-muted-foreground tracking-widest mb-6">
                    {phase === 'animating' ? '神明感應中...' : '靜心，默念所問之事'}
                  </div>

                  {/* 筊杯 */}
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
                      <MoonBlock
                        face={phase === 'result' ? leftFace : 'front'}
                        size="lg"
                      />
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
                      <MoonBlock
                        face={phase === 'result' ? rightFace : 'back'}
                        size="lg"
                      />
                    </motion.div>
                  </div>

                  {/* 能量光環 */}
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
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              delay: i * 0.3,
                            }}
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
                    {phase === 'animating' ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          ☯
                        </motion.span>
                        感應中...
                      </span>
                    ) : (
                      '🔥 開始擲筊'
                    )}
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
                className="mt-6 glass-card rounded-2xl p-5"
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
                    <div
                      key={session.id}
                      className="flex items-start gap-3 p-3 bg-white/5 rounded-xl"
                    >
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
                        <p className="text-xs text-muted-foreground truncate">
                          {session.query}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(session.createdAt).toLocaleDateString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
