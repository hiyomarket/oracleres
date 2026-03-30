/**
 * BattleScene.tsx — 戰鬥場景系統
 *
 * 根據戰鬥模式提供：
 * 1. 動態背景漸層 + 粒子效果
 * 2. Web Audio API 生成的環境音效 / BGM
 *
 * 模式：
 * - idle / map_mob: 野外（森林/草原）
 * - player_closed / player_open: 副本（地牢/洞穴）
 * - boss: Boss 戰（火焰/雷電）
 * - pvp: 競技場（金色/藍色）
 */
import React, { useEffect, useRef, useMemo, useCallback } from "react";

// ─── 場景配置 ───
type BattleMode = "idle" | "player_closed" | "player_open" | "pvp" | "map_mob" | "boss";

interface SceneConfig {
  /** 背景 CSS 漸層 */
  background: string;
  /** 粒子顏色 */
  particleColors: string[];
  /** 粒子數量 */
  particleCount: number;
  /** 環境光色 */
  ambientGlow: string;
  /** 場景名稱 */
  label: string;
  /** 額外 CSS 動畫 */
  extraAnimation?: string;
}

const SCENE_CONFIGS: Record<BattleMode, SceneConfig> = {
  idle: {
    background: "linear-gradient(160deg, #0c1a0c 0%, #1a3a1a 30%, #0d2a15 60%, #0c1a0c 100%)",
    particleColors: ["#4ade80", "#22c55e", "#86efac", "#a7f3d0"],
    particleCount: 25,
    ambientGlow: "rgba(74, 222, 128, 0.05)",
    label: "野外",
  },
  map_mob: {
    background: "linear-gradient(160deg, #0c1a0c 0%, #1a3a1a 30%, #0d2a15 60%, #0c1a0c 100%)",
    particleColors: ["#4ade80", "#22c55e", "#86efac", "#fbbf24"],
    particleCount: 25,
    ambientGlow: "rgba(74, 222, 128, 0.05)",
    label: "野外遭遇",
  },
  player_closed: {
    background: "linear-gradient(160deg, #0a0a1a 0%, #1a1040 30%, #0d0d2e 60%, #0a0a1a 100%)",
    particleColors: ["#818cf8", "#6366f1", "#a78bfa", "#c4b5fd"],
    particleCount: 15,
    ambientGlow: "rgba(99, 102, 241, 0.06)",
    label: "副本",
  },
  player_open: {
    background: "linear-gradient(160deg, #0a0a1a 0%, #1a1040 30%, #0d0d2e 60%, #0a0a1a 100%)",
    particleColors: ["#818cf8", "#6366f1", "#a78bfa", "#c4b5fd"],
    particleCount: 18,
    ambientGlow: "rgba(99, 102, 241, 0.06)",
    label: "副本",
  },
  boss: {
    background: "linear-gradient(160deg, #1a0505 0%, #3a0a0a 25%, #2a0808 50%, #1a0505 75%, #0a0505 100%)",
    particleColors: ["#ef4444", "#f97316", "#fbbf24", "#dc2626", "#ff6b6b"],
    particleCount: 35,
    ambientGlow: "rgba(239, 68, 68, 0.08)",
    label: "Boss 戰",
    extraAnimation: "bossPulse",
  },
  pvp: {
    background: "linear-gradient(160deg, #0a0a1a 0%, #1a1a3a 25%, #2a1a0a 50%, #1a1a3a 75%, #0a0a1a 100%)",
    particleColors: ["#fbbf24", "#f59e0b", "#60a5fa", "#3b82f6"],
    particleCount: 20,
    ambientGlow: "rgba(251, 191, 36, 0.06)",
    label: "競技場",
  },
};

// ─── 場景粒子 ───
interface SceneParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
  drift: number;
}

function SceneParticles({ config }: { config: SceneConfig }) {
  const particles = useMemo<SceneParticle[]>(() =>
    Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * (config.extraAnimation === "bossPulse" ? 4 : 3),
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 5,
      opacity: 0.15 + Math.random() * 0.4,
      color: config.particleColors[Math.floor(Math.random() * config.particleColors.length)],
      drift: -20 + Math.random() * 40,
    })), [config.particleCount, config.particleColors, config.extraAnimation]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animation: `sceneFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── 場景裝飾元素 ───
function SceneDecorations({ mode }: { mode: BattleMode }) {
  if (mode === "boss") {
    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 火焰邊緣光暈 */}
        <div className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: "linear-gradient(to top, rgba(239,68,68,0.15), transparent)",
            animation: "bossFlameFlicker 2s ease-in-out infinite alternate",
          }} />
        {/* 頂部暗紅光暈 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-24"
          style={{
            background: "radial-gradient(ellipse, rgba(220,38,38,0.12), transparent 70%)",
            animation: "bossGlowPulse 3s ease-in-out infinite",
          }} />
        {/* 閃電效果 */}
        <div className="absolute inset-0"
          style={{ animation: "bossLightning 8s ease-in-out infinite" }} />
      </div>
    );
  }

  if (mode === "pvp") {
    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 競技場光環 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full"
          style={{
            border: "1px solid rgba(251,191,36,0.1)",
            boxShadow: "0 0 60px rgba(251,191,36,0.05), inset 0 0 60px rgba(59,130,246,0.05)",
            animation: "pvpRingSpin 20s linear infinite",
          }} />
      </div>
    );
  }

  if (mode === "map_mob" || mode === "idle") {
    return (
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* 草地底部 */}
        <div className="absolute bottom-0 left-0 right-0 h-20"
          style={{
            background: "linear-gradient(to top, rgba(34,197,94,0.08), transparent)",
          }} />
        {/* 霧氣效果 */}
        <div className="absolute bottom-10 left-0 right-0 h-16 opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(167,243,208,0.15), transparent)",
            animation: "fogDrift 12s ease-in-out infinite alternate",
          }} />
      </div>
    );
  }

  // 副本
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 洞穴頂部陰影 */}
      <div className="absolute top-0 left-0 right-0 h-24"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
        }} />
      {/* 地面裂縫光 */}
      <div className="absolute bottom-0 left-0 right-0 h-8"
        style={{
          background: "linear-gradient(to top, rgba(99,102,241,0.06), transparent)",
        }} />
    </div>
  );
}

// ─── Web Audio BGM 系統 ───
function useBattleBGM(mode: BattleMode, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);

  const cleanup = useCallback(() => {
    nodesRef.current.forEach(n => {
      try { (n as OscillatorNode).stop?.(); } catch {}
      try { n.disconnect(); } catch {}
    });
    nodesRef.current = [];
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      try { ctxRef.current.close(); } catch {}
    }
    ctxRef.current = null;
    gainRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) { cleanup(); return; }

    // 延遲啟動，避免自動播放限制
    const timer = setTimeout(() => {
      try {
        const ctx = new AudioContext();
        ctxRef.current = ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.08; // 低音量背景音
        masterGain.connect(ctx.destination);
        gainRef.current = masterGain;

        if (mode === "boss") {
          createBossBGM(ctx, masterGain, nodesRef.current);
        } else if (mode === "pvp") {
          createPvpBGM(ctx, masterGain, nodesRef.current);
        } else if (mode === "player_closed" || mode === "player_open") {
          createDungeonBGM(ctx, masterGain, nodesRef.current);
        } else {
          createWildBGM(ctx, masterGain, nodesRef.current);
        }
      } catch {
        // Web Audio not supported or blocked
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, [mode, enabled, cleanup]);

  return { cleanup };
}

// Boss 戰 BGM：低沉鼓點 + 不和諧弦
function createBossBGM(ctx: AudioContext, dest: AudioNode, nodes: AudioNode[]) {
  // 低頻鼓點
  const drumOsc = ctx.createOscillator();
  const drumGain = ctx.createGain();
  drumOsc.type = "sine";
  drumOsc.frequency.value = 40;
  drumGain.gain.value = 0;
  drumOsc.connect(drumGain);
  drumGain.connect(dest);
  drumOsc.start();
  nodes.push(drumOsc, drumGain);

  // 鼓點節奏
  const now = ctx.currentTime;
  for (let i = 0; i < 600; i++) {
    const t = now + i * 0.5;
    drumGain.gain.setValueAtTime(0.3, t);
    drumGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
  }

  // 不和諧低音弦
  const droneOsc = ctx.createOscillator();
  const droneGain = ctx.createGain();
  droneOsc.type = "sawtooth";
  droneOsc.frequency.value = 55; // A1
  droneGain.gain.value = 0.06;
  const droneFilter = ctx.createBiquadFilter();
  droneFilter.type = "lowpass";
  droneFilter.frequency.value = 200;
  droneOsc.connect(droneFilter);
  droneFilter.connect(droneGain);
  droneGain.connect(dest);
  droneOsc.start();
  nodes.push(droneOsc, droneGain, droneFilter);
}

// PVP BGM：緊張節奏
function createPvpBGM(ctx: AudioContext, dest: AudioNode, nodes: AudioNode[]) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = 220;
  gain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 400;
  filter.Q.value = 2;
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  osc.start();
  nodes.push(osc, gain, filter);

  const now = ctx.currentTime;
  const pattern = [0, 0.15, 0.3, 0.5, 0.65, 0.8];
  for (let bar = 0; bar < 300; bar++) {
    for (const beat of pattern) {
      const t = now + bar * 1.0 + beat;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    }
  }
}

// 副本 BGM：迴音環境音
function createDungeonBGM(ctx: AudioContext, dest: AudioNode, nodes: AudioNode[]) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 110;
  gain.gain.value = 0.04;
  const reverb = ctx.createBiquadFilter();
  reverb.type = "lowpass";
  reverb.frequency.value = 300;
  osc.connect(reverb);
  reverb.connect(gain);
  gain.connect(dest);
  osc.start();
  nodes.push(osc, gain, reverb);

  // 水滴音效
  const now = ctx.currentTime;
  for (let i = 0; i < 200; i++) {
    const dropOsc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    dropOsc.type = "sine";
    dropOsc.frequency.value = 800 + Math.random() * 400;
    dropGain.gain.value = 0;
    dropOsc.connect(dropGain);
    dropGain.connect(dest);
    const t = now + 2 + i * (1.5 + Math.random() * 3);
    dropOsc.start(t);
    dropOsc.stop(t + 0.15);
    dropGain.gain.setValueAtTime(0.06, t);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    nodes.push(dropOsc, dropGain);
  }
}

// 野外 BGM：風聲 + 蟲鳴
function createWildBGM(ctx: AudioContext, dest: AudioNode, nodes: AudioNode[]) {
  // 風聲（白噪音 + 低通濾波）
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const windSource = ctx.createBufferSource();
  windSource.buffer = buffer;
  windSource.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 400;
  const windGain = ctx.createGain();
  windGain.gain.value = 0.15;
  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(dest);
  windSource.start();
  nodes.push(windSource as any, windFilter, windGain);

  // 蟲鳴
  const now = ctx.currentTime;
  for (let i = 0; i < 100; i++) {
    const chirpOsc = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirpOsc.type = "sine";
    chirpOsc.frequency.value = 3000 + Math.random() * 2000;
    chirpGain.gain.value = 0;
    chirpOsc.connect(chirpGain);
    chirpGain.connect(dest);
    const t = now + 1 + i * (2 + Math.random() * 4);
    chirpOsc.start(t);
    chirpOsc.stop(t + 0.08);
    chirpGain.gain.setValueAtTime(0.02, t);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    nodes.push(chirpOsc, chirpGain);
  }
}

// ─── 場景樣式 ───
export function BattleSceneStyles() {
  return (
    <style>{`
      @keyframes sceneFloat {
        0% { transform: translateY(0) translateX(0); }
        100% { transform: translateY(-30px) translateX(var(--drift, 10px)); }
      }
      @keyframes bossFlameFlicker {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.7; }
      }
      @keyframes bossGlowPulse {
        0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
        50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
      }
      @keyframes bossLightning {
        0%, 94%, 100% { background: transparent; }
        95% { background: rgba(255,255,255,0.03); }
        96% { background: transparent; }
        97% { background: rgba(255,200,200,0.04); }
        98% { background: transparent; }
      }
      @keyframes bossPulse {
        0%, 100% { filter: brightness(1); }
        50% { filter: brightness(1.05); }
      }
      @keyframes pvpRingSpin {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes fogDrift {
        0% { transform: translateX(-10%); }
        100% { transform: translateX(10%); }
      }
    `}</style>
  );
}

// ─── 主組件 ───
interface BattleSceneProps {
  mode: BattleMode;
  /** 是否啟用 BGM */
  bgmEnabled?: boolean;
  children: React.ReactNode;
  /** 震動強度（從外部傳入） */
  shakeIntensity?: number;
}

export function BattleScene({ mode, bgmEnabled = true, children, shakeIntensity = 0 }: BattleSceneProps) {
  const config = SCENE_CONFIGS[mode] || SCENE_CONFIGS.idle;
  useBattleBGM(mode, bgmEnabled);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: config.background,
        animation: shakeIntensity > 0
          ? `battleShake${shakeIntensity >= 3 ? "Heavy" : shakeIntensity > 1 ? "Hard" : ""} ${shakeIntensity >= 3 ? "0.7s" : "0.5s"} ease-out`
          : config.extraAnimation
            ? `${config.extraAnimation} 4s ease-in-out infinite`
            : undefined,
      }}>
      {/* 場景粒子 */}
      <SceneParticles config={config} />
      {/* 場景裝飾 */}
      <SceneDecorations mode={mode} />
      {/* 環境光 */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{ background: `radial-gradient(ellipse at 50% 50%, ${config.ambientGlow}, transparent 70%)` }} />
      {/* 場景標籤 */}
      <div className="absolute top-2 right-14 z-10 px-2 py-0.5 rounded text-[9px] font-medium tracking-wider"
        style={{
          background: "rgba(0,0,0,0.4)",
          color: config.particleColors[0],
          border: `1px solid ${config.particleColors[0]}33`,
        }}>
        {config.label}
      </div>
      {/* 子內容 */}
      {children}
    </div>
  );
}

export default BattleScene;
