"use client";

// ============================================
// Battle Cards — Kampf-Soundeffekte
// ============================================
// Die meisten Töne sind weiterhin per Oscillator/AudioBuffer synthetisiert
// (kein Datei-Overhead). Die Tank-/DPS-Treffer nutzen zusätzlich echte
// Sample-Foley (Kenney "Impact Sounds", CC0, siehe public/battle-cards/sfx/
// README.md) — ein reiner Oscillator-Beep trifft die dumpfe Wucht bzw. den
// scharfen Metall-Transient nicht überzeugend, echte Samples schon. Der
// AudioContext wird lazy erzeugt und bei Bedarf resumed (Autoplay-Policy
// verlangt eine vorherige User-Geste, die beim Öffnen/Bedienen des Replays
// i.d.R. bereits stattgefunden hat).
//
// Archetyp-Sounds: jede Klasse (TANK/DAMAGE_DEALER/SUPPORT) bekommt für ihre
// typischen Effekt-Arten (Treffer, Schild, Buff/Debuff, Ultimate) eine eigene
// Klangfarbe statt eines einzigen generischen Beeps — siehe SkillEffectOverlay
// in BattleScreen.tsx für das visuelle Gegenstück (gleiche Archetyp-Matrix).

import type { UnitClass } from "@/lib/battle-engine/types";

/** Spielt eine kurze Sample-Datei ab — eigenes HTMLAudioElement pro Aufruf,
 *  damit sich überlappende Treffer (mehrere Kaskaden-Hits) nicht gegenseitig
 *  abschneiden. Scheitert lautlos (Autoplay-Policy, fehlende Datei), da Sound
 *  hier rein kosmetisch ist. */
function playSample(url: string, volume = 0.6) {
  if (typeof window === "undefined") return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {});
  } catch {
    // s.o.
  }
}

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

function beep(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0, freqTo?: number) {
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
  if (freqTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), start + duration);
  }
  osc.start(start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.stop(start + duration);
}

/** Kurzer gefilterter Rausch-Burst — Basis für perkussive Treffer (Tank-Wucht,
 *  DPS-Klingenschnitt), die ein reiner Oscillator-Beep nicht glaubhaft trifft. */
function noiseBurst(duration: number, gain: number, filterFreq: number, filterType: BiquadFilterType, delay = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = gain;

  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);

  const start = ctx.currentTime + delay;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.start(start);
  src.stop(start + duration);
}

// ── Generische Fallbacks (Klasse unbekannt / neutrale Ereignisse) ──────────

export function playHitSfx() {
  beep(180, 0.12, "square", 0.1);
}

export function playCritSfx() {
  beep(320, 0.1, "square", 0.12);
  beep(540, 0.14, "square", 0.09, 0.05);
}

export function playHealSfx() {
  beep(660, 0.18, "sine", 0.08);
  beep(880, 0.16, "sine", 0.05, 0.06);
}

export function playShieldSfx() {
  beep(720, 0.14, "triangle", 0.07, 0, 1100);
}

export function playBuffSfx() {
  beep(520, 0.09, "sine", 0.07);
  beep(780, 0.12, "sine", 0.06, 0.08);
}

export function playDebuffSfx() {
  beep(420, 0.1, "sawtooth", 0.06);
  beep(300, 0.16, "sawtooth", 0.05, 0.07);
}

// ── Klassen-Archetyp-Treffer ────────────────────────────────────────────────
// TANK: dumpfer, tiefer Wuchtschlag (Noise-Thud + tiefer Sinus).
// DAMAGE_DEALER: scharfer, heller Klingen-/Schuss-Transient (gefiltertes
// Rauschen im Hochton + kurzer Square-Beep).
// SUPPORT: hat i.d.R. keinen Schadens-Treffer als Signatur — fällt auf den
// generischen Hit zurück, falls doch (z.B. Debuff-Schaden).

function playTankHitSfx(crit: boolean) {
  playSample(crit ? "/battle-cards/sfx/tank-hit-crit.ogg" : "/battle-cards/sfx/tank-hit.ogg", crit ? 0.8 : 0.65);
  // Sub-Bass-Layer obendrauf — das Sample allein hat wenig Tiefbass, der hier
  // die spürbare "Wucht" liefert, die ein reines Foley-Sample nicht hat.
  beep(70, crit ? 0.24 : 0.18, "sine", crit ? 0.14 : 0.1, 0.01);
}

function playDpsHitSfx(crit: boolean) {
  playSample(crit ? "/battle-cards/sfx/dps-hit-crit.ogg" : "/battle-cards/sfx/dps-hit.ogg", crit ? 0.7 : 0.55);
  // Kurzer heller Beep obendrauf — gibt dem realistischen Metall-Sample den
  // "Game-Zing", den ein reines Foley-Sample nicht hat.
  beep(crit ? 1200 : 900, 0.06, "square", crit ? 0.09 : 0.06, 0.01);
}

/** SUPPORT: arkaner Bolzen — zwei dicht benachbarte Frequenzen erzeugen eine
 *  leichte Schwebung ("Shimmer"), plus ein winziges Hochton-Funkeln. Klingt
 *  gläsern/magisch statt dumpf (Tank) oder scharf (DPS). */
function playSupportHitSfx(crit: boolean) {
  beep(900, crit ? 0.14 : 0.1, "sine", crit ? 0.1 : 0.07);
  beep(918, crit ? 0.14 : 0.1, "triangle", crit ? 0.08 : 0.05, 0.005);
  noiseBurst(0.05, crit ? 0.06 : 0.04, 6000, "highpass", 0.02);
  if (crit) beep(1300, 0.16, "sine", 0.07, 0.06);
}

/** Zentraler Einstieg für Trefferschall — verzweigt nach der Klasse des
 *  ausführenden Helden (siehe casterClass in SkillEffectOverlay), damit ein
 *  Tank-Bash anders klingt als ein DPS-Treffer statt für alle derselbe Beep. */
export function playHitSfxFor(casterClass: UnitClass | undefined, crit: boolean) {
  if (casterClass === "TANK") return playTankHitSfx(crit);
  if (casterClass === "DAMAGE_DEALER") return playDpsHitSfx(crit);
  if (casterClass === "SUPPORT") return playSupportHitSfx(crit);
  if (crit) return playCritSfx();
  return playHitSfx();
}

export function playUltimateSfx(casterClass?: UnitClass) {
  if (casterClass === "TANK") {
    // Erdiges, langsames Grollen
    beep(70, 0.6, "sawtooth", 0.12);
    beep(50, 0.5, "sine", 0.14, 0.1);
    noiseBurst(0.4, 0.1, 180, "lowpass", 0.05);
    return;
  }
  if (casterClass === "DAMAGE_DEALER") {
    // Schnelle, aufsteigende Salve
    beep(300, 0.12, "square", 0.1, 0);
    beep(500, 0.12, "square", 0.11, 0.09);
    beep(750, 0.16, "square", 0.12, 0.18, 1200);
    return;
  }
  if (casterClass === "SUPPORT") {
    // Schwebender, heller Aufschwung
    beep(440, 0.35, "sine", 0.08, 0, 880);
    beep(660, 0.4, "sine", 0.07, 0.1, 1320);
    return;
  }
  beep(140, 0.5, "sawtooth", 0.1);
  beep(280, 0.4, "sawtooth", 0.08, 0.15);
}
