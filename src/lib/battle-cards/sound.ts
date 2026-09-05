// ============================================
// Kampf-Sounds — OMA Battle Cards
// ============================================
// Größtenteils weiterhin prozedural über die Web Audio API erzeugte Töne
// (kurze Sinus-/Sägezahn-"Blips") — braucht keine zusätzlichen Dateien im
// Repo. Die Tank-/DPS-Treffer-Archetypen (playDamageSoundFor) nutzen
// zusätzlich echte Sample-Foley (Kenney "Impact Sounds", CC0, siehe
// public/battle-cards/sfx/README.md), da ein reiner Oscillator-Beep die
// dumpfe Wucht bzw. den scharfen Metall-Transient nicht überzeugend trifft.
// Ein gemeinsamer AudioContext wird lazy beim ersten Ton erzeugt/fortgesetzt
// — Browser verlangen dafür eine vorausgehende Nutzer-Geste (ein Klick/Tap
// reicht, danach funktionieren auch programmatisch ausgelöste Folge-Töne,
// z.B. aus Snapshot-Poll-Effekten).

import type { UnitClass } from "@/lib/battle-engine/types";

/** Spielt eine kurze Sample-Datei ab — eigenes HTMLAudioElement pro Aufruf,
 *  damit sich überlappende Treffer (mehrere Kaskaden-Hits bei OMA Gems) nicht
 *  gegenseitig abschneiden. Respektiert denselben Mute-Schalter wie beep(). */
function playSample(url: string, volume = 0.6): void {
  if (isSoundMuted() || typeof window === "undefined") return;
  try {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(() => {});
  } catch {
    // s.o.
  }
}

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

const MUTE_KEY = "battle-cards-sound-muted";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage kann in privaten Tabs/eingeschränkten Kontexten fehlschlagen — kein Problem, nur Komfort.
  }
}

/** Ein einzelner Ton: `freq` in Hz, `durationMs` Ausklingzeit, `delayMs` optionaler
 *  Versatz (für kleine Mehrton-Melodien wie playCritSound/playVictorySound). */
function beep(freq: number, durationMs: number, type: OscillatorType, volume: number, delayMs = 0): void {
  if (isSoundMuted()) return;
  const audio = getContext();
  if (!audio) return;

  const startAt = audio.currentTime + delayMs / 1000;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationMs / 1000);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + durationMs / 1000 + 0.02);
}

export function playSwapSound(): void {
  beep(440, 70, "triangle", 0.05);
}

export function playInvalidSwapSound(): void {
  beep(180, 120, "square", 0.06);
}

/** `cascadeIndex` lässt aufeinanderfolgende Kaskaden-Matches leicht höher klingen. */
export function playMatchSound(cascadeIndex = 0): void {
  beep(660 + cascadeIndex * 80, 130, "sine", 0.09);
}

export function playCommunityBonusSound(): void {
  beep(500, 100, "sine", 0.08);
  beep(750, 100, "sine", 0.08, 70);
  beep(1000, 160, "sine", 0.08, 140);
}

export function playDamageSound(): void {
  beep(160, 140, "sawtooth", 0.07);
}

export function playCritSound(): void {
  beep(220, 90, "sawtooth", 0.09);
  beep(330, 140, "sawtooth", 0.08, 60);
}

export function playHealSound(): void {
  beep(520, 90, "sine", 0.07);
  beep(700, 140, "sine", 0.06, 70);
}

export function playShieldSound(): void {
  beep(380, 160, "triangle", 0.07);
}

export function playUltimateSound(): void {
  beep(140, 80, "sawtooth", 0.1);
  beep(220, 80, "sawtooth", 0.1, 50);
  beep(340, 220, "sawtooth", 0.1, 100);
}

/** Kurzer gefilterter Rausch-Burst — Basis für perkussive Archetyp-Treffer
 *  (Tank-Wucht, DPS-Klingenschnitt), die ein reiner Oscillator-Beep nicht
 *  glaubhaft trifft. Analog zu sfx.ts (dortiger Player: BattleScreen-Replay),
 *  hier lokal dupliziert, da dieses Modul den eigenen isSoundMuted-Schalter
 *  besitzt statt eines von außen übergebenen soundOn-Flags. */
function noiseBurst(durationMs: number, gain: number, filterFreq: number, filterType: BiquadFilterType, delayMs = 0): void {
  if (isSoundMuted()) return;
  const audio = getContext();
  if (!audio) return;
  const duration = durationMs / 1000;
  const bufferSize = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = audio.createGain();

  src.connect(filter);
  filter.connect(g);
  g.connect(audio.destination);

  const start = audio.currentTime + delayMs / 1000;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.start(start);
  src.stop(start + duration);
}

/** Archetyp-Treffer: verzweigt nach der Klasse des ausführenden Helden, damit
 *  ein Tank-Bash anders klingt als ein DPS-Treffer statt für alle derselbe
 *  Beep zu sein (siehe SkillEffectOverlay in BattleScreen.tsx fürs visuelle
 *  Gegenstück derselben Archetyp-Matrix). */
export function playDamageSoundFor(casterClass: UnitClass | undefined, crit: boolean): void {
  if (casterClass === "TANK") {
    playSample(crit ? "/battle-cards/sfx/tank-hit-crit.ogg" : "/battle-cards/sfx/tank-hit.ogg", crit ? 0.8 : 0.65);
    beep(70, crit ? 180 : 130, "sine", crit ? 0.12 : 0.08, 6);
    return;
  }
  if (casterClass === "DAMAGE_DEALER") {
    playSample(crit ? "/battle-cards/sfx/dps-hit-crit.ogg" : "/battle-cards/sfx/dps-hit.ogg", crit ? 0.7 : 0.55);
    beep(crit ? 1200 : 900, 60, "square", crit ? 0.08 : 0.05, 6);
    return;
  }
  if (casterClass === "SUPPORT") {
    // Arkaner Bolzen — zwei dicht benachbarte Frequenzen für eine leichte
    // Schwebung ("Shimmer"), klingt gläsern/magisch statt dumpf oder scharf.
    beep(900, crit ? 140 : 100, "sine", crit ? 0.1 : 0.07);
    beep(918, crit ? 140 : 100, "triangle", crit ? 0.08 : 0.05, 5);
    noiseBurst(50, crit ? 0.06 : 0.04, 6000, "highpass", 20);
    if (crit) beep(1300, 160, "sine", 0.07, 60);
    return;
  }
  if (crit) playCritSound();
  else playDamageSound();
}

export function playUltimateSoundFor(casterClass: UnitClass | undefined): void {
  if (casterClass === "TANK") {
    beep(70, 480, "sawtooth", 0.1);
    beep(50, 400, "sine", 0.12, 80);
    noiseBurst(320, 0.08, 180, "lowpass", 40);
    return;
  }
  if (casterClass === "DAMAGE_DEALER") {
    beep(300, 100, "square", 0.09, 0);
    beep(500, 100, "square", 0.1, 80);
    beep(750, 140, "square", 0.11, 160);
    return;
  }
  if (casterClass === "SUPPORT") {
    beep(440, 320, "sine", 0.08, 0);
    beep(660, 360, "sine", 0.07, 90);
    return;
  }
  playUltimateSound();
}

export function playVictorySound(): void {
  [523, 659, 784, 1046].forEach((freq, i) => beep(freq, 160, "sine", 0.08, i * 90));
}

export function playDefeatSound(): void {
  [392, 349, 293, 233].forEach((freq, i) => beep(freq, 220, "sine", 0.07, i * 110));
}

/** Kartenreveal beim Pack-Öffnen — dezenter "Pop", damit jede Karte spürbar aufgedeckt wird. */
export function playCardRevealSound(): void {
  beep(440, 90, "triangle", 0.06);
}

/** Community-Karte gezogen — deutlich aufwendigere kleine Fanfare als der normale Reveal-Sound. */
export function playRarePullSound(): void {
  [440, 554, 659, 880].forEach((freq, i) => beep(freq, 180, "sine", 0.09, i * 80));
}
