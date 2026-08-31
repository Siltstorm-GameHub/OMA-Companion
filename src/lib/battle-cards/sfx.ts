"use client";

// ============================================
// Battle Cards — Kampf-Soundeffekte (Web Audio, synthetisiert)
// ============================================
// Keine Audio-Dateien nötig — kurze Beeps werden per Oscillator generiert.
// Der AudioContext wird lazy erzeugt und bei Bedarf resumed (Autoplay-Policy
// verlangt eine vorherige User-Geste, die beim Öffnen/Bedienen des Replays
// i.d.R. bereits stattgefunden hat).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  const start = ctx.currentTime + delay;
  osc.start(start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.stop(start + duration);
}

export function playHitSfx() {
  beep(180, 0.12, "square", 0.1);
}

export function playCritSfx() {
  beep(320, 0.1, "square", 0.12);
  beep(540, 0.14, "square", 0.09, 0.05);
}

export function playHealSfx() {
  beep(660, 0.18, "sine", 0.08);
}

export function playUltimateSfx() {
  beep(140, 0.5, "sawtooth", 0.1);
  beep(280, 0.4, "sawtooth", 0.08, 0.15);
}
