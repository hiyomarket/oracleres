/**
 * BattleSFX.ts — 戰鬥音效系統
 *
 * 使用 Web Audio API 程式化生成音效：
 * - 爆擊：重擊音 + 金屬迴響
 * - 格檔：盾牌撞擊 + 金屬碰撞
 * - 閃避：風切音 + 滑動音
 * - 普通攻擊：輕擊音
 * - 治療：清脆鈴聲
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** 爆擊音效：重低音衝擊 + 高頻金屬迴響 */
export function playCritSFX() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 重低音衝擊
    const impactOsc = ctx.createOscillator();
    const impactGain = ctx.createGain();
    impactOsc.type = "sine";
    impactOsc.frequency.setValueAtTime(120, now);
    impactOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    impactGain.gain.setValueAtTime(0.4, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    impactOsc.connect(impactGain);
    impactGain.connect(ctx.destination);
    impactOsc.start(now);
    impactOsc.stop(now + 0.4);

    // 金屬迴響
    const metalOsc = ctx.createOscillator();
    const metalGain = ctx.createGain();
    metalOsc.type = "square";
    metalOsc.frequency.setValueAtTime(800, now);
    metalOsc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    metalGain.gain.setValueAtTime(0.08, now);
    metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    const metalFilter = ctx.createBiquadFilter();
    metalFilter.type = "bandpass";
    metalFilter.frequency.value = 600;
    metalFilter.Q.value = 3;
    metalOsc.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(ctx.destination);
    metalOsc.start(now);
    metalOsc.stop(now + 0.5);

    // 白噪音爆裂
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);
  } catch {}
}

/** 格檔音效：盾牌碰撞 + 金屬叮噹 */
export function playBlockSFX() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 盾牌碰撞（低頻脈衝）
    const shieldOsc = ctx.createOscillator();
    const shieldGain = ctx.createGain();
    shieldOsc.type = "triangle";
    shieldOsc.frequency.setValueAtTime(200, now);
    shieldOsc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    shieldGain.gain.setValueAtTime(0.3, now);
    shieldGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    shieldOsc.connect(shieldGain);
    shieldGain.connect(ctx.destination);
    shieldOsc.start(now);
    shieldOsc.stop(now + 0.25);

    // 金屬叮噹
    const dingOsc = ctx.createOscillator();
    const dingGain = ctx.createGain();
    dingOsc.type = "sine";
    dingOsc.frequency.setValueAtTime(1200, now + 0.05);
    dingOsc.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    dingGain.gain.setValueAtTime(0.12, now + 0.05);
    dingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    dingOsc.connect(dingGain);
    dingGain.connect(ctx.destination);
    dingOsc.start(now + 0.05);
    dingOsc.stop(now + 0.4);
  } catch {}
}

/** 閃避音效：風切聲 */
export function playDodgeSFX() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 風切聲（白噪音 + 帶通濾波 + 快速衰減）
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.25);
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noiseSource.start(now);

    // 滑動音
    const slideOsc = ctx.createOscillator();
    const slideGain = ctx.createGain();
    slideOsc.type = "sine";
    slideOsc.frequency.setValueAtTime(600, now);
    slideOsc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    slideGain.gain.setValueAtTime(0.06, now);
    slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    slideOsc.connect(slideGain);
    slideGain.connect(ctx.destination);
    slideOsc.start(now);
    slideOsc.stop(now + 0.2);
  } catch {}
}

/** 普通攻擊音效 */
export function playAttackSFX() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
}

/** 治療音效：清脆鈴聲 */
export function playHealSFX() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  } catch {}
}
