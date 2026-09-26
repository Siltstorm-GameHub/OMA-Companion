// ============================================
// OMA Quest — Sound: Klangliste und Zuordnung (rein) + Wiedergabe im Browser
// ============================================
// Die Dateien liegen als kleine WAVs in public/oq/sfx. Lautstärke und Stummschaltung merkt sich der Browser (localStorage) und gelten für alle
// Klänge in OMA Quest. Browser erlauben Ton erst nach einer Bedienung (Klick/Tippen) — vorher schlägt das Abspielen still fehl.

import type { FxKind } from "./oq-fx-manifest";

export const SFX_KEYS = ["hit", "hit2", "crit", "miss", "block", "hurt", "spell", "fire", "ice", "heal", "buff", "roar", "boss", "win", "lose", "menu", "click", "reward", "level", "error", "ping"] as const;
export type Sfx = (typeof SFX_KEYS)[number];

/** Klang zu einem Kampf-Effekt (Treffer wechseln zwischen zwei Klängen). */
export function sfxForFx(kind: FxKind, n = 0): Sfx {
  switch (kind) {
    case "hit": return n % 2 ? "hit2" : "hit";
    case "crit": return "crit";
    case "miss": return "miss";
    case "hurt": return "hurt";
    case "fire": return "fire";
    case "ice": return "ice";
    case "arcane": case "holy": case "lightning": case "shadow": case "nature": case "sound": return "spell";
    case "heal": return "heal";
    case "guard": return "block";
    case "buff": return "buff";
    case "death": return "crit";
    case "barrier": return "block";
    case "attackup": return "buff";
    case "rejuvenate": return "heal";
    case "arrow": return "hit2";
    case "bite": return "hurt";
  }
}

/** Klang zu einer Meldung im Spiel (siehe GameFeed). */
export function sfxForFeed(kind: "quest" | "info" | "reward" | "level" | "error"): Sfx | null {
  return kind === "reward" ? "reward" : kind === "level" ? "level" : kind === "quest" ? "ping" : kind === "error" ? "error" : null;
}

// ── Einstellungen (nur im Browser) ──────────────────────────

export interface SoundSettings { volume: number; muted: boolean; /** Ambiente (Hintergrundgeräusche der Locations) an? */ ambient: boolean }
const STORE = "oq-sound";
const DEFAULT: SoundSettings = { volume: 0.5, muted: false, ambient: true };
let settings: SoundSettings = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function load(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (raw) {
      const j = JSON.parse(raw) as Partial<SoundSettings>;
      return { volume: typeof j.volume === "number" ? Math.min(1, Math.max(0, j.volume)) : DEFAULT.volume, muted: j.muted === true, ambient: j.ambient !== false };
    }
  } catch { /* Speicher gesperrt: Standard */ }
  return DEFAULT;
}

/** Aktuelle Einstellungen (Snapshot für useSyncExternalStore; auf dem Server immer der Standard). */
export function getSoundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULT;
  if (!loaded) { loaded = true; settings = load(); }
  return settings;
}

export function setSoundSettings(patch: Partial<SoundSettings>): void {
  settings = { ...getSoundSettings(), ...patch, volume: Math.min(1, Math.max(0, patch.volume ?? getSoundSettings().volume)) };
  try { window.localStorage.setItem(STORE, JSON.stringify(settings)); } catch { /* egal */ }
  listeners.forEach((l) => l());
}

export function subscribeSound(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Wiedergabe ──────────────────────────────────────────────

const cache = new Map<Sfx, HTMLAudioElement>();
const lastPlayed = new Map<Sfx, number>();

/** Spielt einen Klang (überlappend möglich). Bei Stummschaltung, Lautstärke 0 oder gesperrtem Autoplay passiert nichts. */
export function playSfx(key: Sfx, gain = 1): void {
  if (typeof window === "undefined") return;
  const s = getSoundSettings();
  if (s.muted || s.volume <= 0) return;
  // Derselbe Klang nicht öfter als alle 60 ms (Doppelauslösung)
  const now = Date.now();
  if (now - (lastPlayed.get(key) ?? 0) < 60) return;
  lastPlayed.set(key, now);
  try {
    let base = cache.get(key);
    if (!base) { base = new Audio(`/oq/sfx/${key}.wav`); base.preload = "auto"; cache.set(key, base); }
    const a = base.cloneNode() as HTMLAudioElement;
    a.volume = Math.min(1, s.volume * gain);
    void a.play().catch(() => {});
  } catch { /* kein Audio verfügbar */ }
}

// ── Klassen-Klangfarben (Battle Cards, Duelle, OMA Quest teilen sich dieselben Klänge) ──

export type SfxClass = "TANK" | "DAMAGE_DEALER" | "SUPPORT" | undefined;

/** Trefferklang je Kampfrolle: Tank wuchtig, Schadensausteiler schneidend, Unterstützer magisch. */
export function sfxForClassHit(cls: SfxClass, crit: boolean): Sfx {
  if (crit) return "crit";
  return cls === "TANK" ? "hit" : cls === "DAMAGE_DEALER" ? "hit2" : cls === "SUPPORT" ? "spell" : "hit";
}

/** Ultimate-Klang je Kampfrolle. */
export function sfxForClassUltimate(cls: SfxClass): Sfx {
  return cls === "TANK" ? "boss" : cls === "DAMAGE_DEALER" ? "fire" : cls === "SUPPORT" ? "heal" : "spell";
}
