/**
 * useGameSound — 使用 Web Audio API 合成遊戲音效
 * 無需外部音效檔案，純程式碼合成
 */

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** 升級音效：上升的鐘聲和弦 */
export function playLevelUpSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 主旋律：C4 → E4 → G4 → C5（上升和弦）
  const notes = [261.63, 329.63, 392.0, 523.25];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.12);

    gain.gain.setValueAtTime(0, now + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.8);

    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.8);
  });

  // 輝煌感：高頻泛音
  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.connect(shimmerGain);
  shimmerGain.connect(ctx.destination);
  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(1046.5, now + 0.36); // C6
  shimmerGain.gain.setValueAtTime(0, now + 0.36);
  shimmerGain.gain.linearRampToValueAtTime(0.12, now + 0.42);
  shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
  shimmer.start(now + 0.36);
  shimmer.stop(now + 1.4);
}

/** 傳說掉落音效：神秘魔法音 */
export function playLegendarySound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 低頻共鳴
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  bass.type = "sine";
  bass.frequency.setValueAtTime(110, now);
  bass.frequency.exponentialRampToValueAtTime(220, now + 0.5);
  bassGain.gain.setValueAtTime(0.2, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
  bass.start(now);
  bass.stop(now + 1.2);

  // 魔法閃爍音
  const sparkFreqs = [880, 1108.73, 1318.51, 1760];
  sparkFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.1, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.4);
  });

  // 尾音：神秘顫音
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibrato.connect(vibratoGain);
  vibratoGain.connect(ctx.destination);
  vibrato.type = "sine";
  vibrato.frequency.setValueAtTime(440, now + 0.5);
  vibrato.frequency.setValueAtTime(466.16, now + 0.65);
  vibrato.frequency.setValueAtTime(440, now + 0.8);
  vibrato.frequency.setValueAtTime(466.16, now + 0.95);
  vibratoGain.gain.setValueAtTime(0.08, now + 0.5);
  vibratoGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  vibrato.start(now + 0.5);
  vibrato.stop(now + 1.5);
}

/** Tick 執行音：輕微點擊聲 */
export function playTickSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.start(now);
  osc.stop(now + 0.12);
}

/** 戰鬥勝利音：短促勝利音 */
export function playCombatWinSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [392.0, 523.25, 659.25]; // G4 → C5 → E5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    gain.gain.setValueAtTime(0.06, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.25);
  });
}

/** 音效開關狀態（localStorage 持久化） */
export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem("gameSoundEnabled") !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("gameSoundEnabled", enabled ? "true" : "false");
  } catch {
    // ignore
  }
}

/** 安全播放（檢查靜音開關） */
export function safePlay(fn: () => void): void {
  if (isSoundEnabled()) {
    // 確保 AudioContext 已啟動（需要用戶互動）
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().then(fn).catch(() => {});
    } else {
      fn();
    }
  }
}

/** 成就解鎖音效：神聖鐘聲 + 上升光芒感 */
export function playAchievementSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 神聖鐘聲：三連音（C5 → E5 → G5）
  const bellNotes = [523.25, 659.25, 783.99];
  bellNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    gain.gain.setValueAtTime(0, now + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.22, now + i * 0.15 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 1.2);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 1.2);
  });

  // 光芒感：高頻泛音掃頻
  const sweep = ctx.createOscillator();
  const sweepGain = ctx.createGain();
  sweep.connect(sweepGain);
  sweepGain.connect(ctx.destination);
  sweep.type = "triangle";
  sweep.frequency.setValueAtTime(1046.5, now + 0.45); // C6
  sweep.frequency.exponentialRampToValueAtTime(2093.0, now + 1.0); // C7
  sweepGain.gain.setValueAtTime(0, now + 0.45);
  sweepGain.gain.linearRampToValueAtTime(0.08, now + 0.55);
  sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  sweep.start(now + 0.45);
  sweep.stop(now + 1.5);

  // 底部共鳴：溫暖低音
  const bass = ctx.createOscillator();
  const bassGain = ctx.createGain();
  bass.connect(bassGain);
  bassGain.connect(ctx.destination);
  bass.type = "sine";
  bass.frequency.setValueAtTime(130.81, now); // C3
  bassGain.gain.setValueAtTime(0.12, now);
  bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
  bass.start(now);
  bass.stop(now + 1.8);
}

/** PvP 勝利音效：鼓聲 + 勝利號角 */
export function playPvpVictorySound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 鼓聲：低頻衝擊
  const drum = ctx.createOscillator();
  const drumGain = ctx.createGain();
  drum.connect(drumGain);
  drumGain.connect(ctx.destination);
  drum.type = "sine";
  drum.frequency.setValueAtTime(150, now);
  drum.frequency.exponentialRampToValueAtTime(50, now + 0.15);
  drumGain.gain.setValueAtTime(0.3, now);
  drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  drum.start(now);
  drum.stop(now + 0.2);

  // 號角：G4 → C5 → E5 → G5
  const hornNotes = [392.0, 523.25, 659.25, 783.99];
  hornNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now + 0.1 + i * 0.12);
    gain.gain.setValueAtTime(0, now + 0.1 + i * 0.12);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.1 + i * 0.12 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1 + i * 0.12 + 0.35);
    osc.start(now + 0.1 + i * 0.12);
    osc.stop(now + 0.1 + i * 0.12 + 0.35);
  });
}

/** 技能習得音效：神秘書卷翻頁聲 */
export function playSkillLearnSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  // 翻頁感：白噪音短爆發
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(3000, now);
  const noiseGain = ctx.createGain();
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  noise.start(now);

  // 神秘音調：五聲音階上升
  const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0]; // C D E G A
  pentatonic.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 2, now + i * 0.08);
    gain.gain.setValueAtTime(0.08, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.4);
  });
}
