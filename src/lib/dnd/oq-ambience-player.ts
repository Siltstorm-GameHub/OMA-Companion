// ============================================
// OMA Quest — Ambiente-Wiedergabe im Browser: Endlosschleifen mit weichem Überblenden
// ============================================
// Zwei Schichten: das Grundgeräusch der Location (bed) und die Wetter-Schicht (layer). Beim Wechsel blendet die alte Schicht aus und die neue ein.
// Lautstärke = Master-Lautstärke der Klänge × Schicht-Faktor; Stumm/„Ambiente aus“ schaltet alles ab. Browser erlauben Ton erst nach einer Bedienung
// — bis dahin wartet der Player und startet beim ersten Klick/Tippen.

import { getSoundSettings, subscribeSound } from "./oq-sfx";
import type { AmbienceKey } from "./oq-assets-manifest";

const GAIN = { bed: 0.55, layer: 0.45 } as const;
const FADE_MS = 1600;

interface Channel { key: AmbienceKey | null; audio: HTMLAudioElement | null; level: number; target: number; base: number }

const ch: Record<"bed" | "layer", Channel> = {
  bed: { key: null, audio: null, level: 0, target: 0, base: GAIN.bed },
  layer: { key: null, audio: null, level: 0, target: 0, base: GAIN.layer },
};
let timer: ReturnType<typeof setInterval> | null = null;
let unlockHooked = false;
let unsub: (() => void) | null = null;

const master = (): number => { const s = getSoundSettings(); return s.muted || !s.ambient ? 0 : s.volume; };

function apply(c: Channel) {
  if (c.audio) c.audio.volume = Math.max(0, Math.min(1, c.level * c.base * master()));
}

function tick() {
  let busy = false;
  const step = 50 / FADE_MS;
  for (const c of Object.values(ch)) {
    if (c.level !== c.target) {
      c.level = c.level < c.target ? Math.min(c.target, c.level + step) : Math.max(c.target, c.level - step);
      busy = true;
    }
    apply(c);
    if (c.level === 0 && c.target === 0 && c.audio && !c.key) { c.audio.pause(); c.audio = null; }
  }
  if (!busy && timer) { clearInterval(timer); timer = null; }
}

function ensureTimer() { if (!timer) timer = setInterval(tick, 50); }

function hookUnlock() {
  if (unlockHooked || typeof window === "undefined") return;
  unlockHooked = true;
  const go = () => {
    window.removeEventListener("pointerdown", go);
    window.removeEventListener("keydown", go);
    unlockHooked = false;
    for (const c of Object.values(ch)) if (c.audio && c.key) void c.audio.play().catch(() => {});
  };
  window.addEventListener("pointerdown", go);
  window.addEventListener("keydown", go);
}

function setChannel(c: Channel, key: AmbienceKey | null) {
  if (c.key === key) return;
  if (c.audio && c.key) {
    // Alte Schicht ausblenden, neue in eigenem Element einblenden (bei Wechsel kurz beide)
    const old = c.audio;
    c.audio = null;
    const fadeOut = setInterval(() => { old.volume = Math.max(0, old.volume - 0.04); if (old.volume <= 0.001) { old.pause(); clearInterval(fadeOut); } }, 60);
  }
  c.key = key;
  c.level = 0;
  c.target = key ? 1 : 0;
  if (key) {
    const a = new Audio(`/oq/amb/${key}.wav`);
    a.loop = true;
    a.volume = 0;
    c.audio = a;
    void a.play().catch(() => hookUnlock());
  }
  ensureTimer();
}

/** Setzt die gewünschte Geräuschkulisse (idempotent — kann in jedem Frame aufgerufen werden). */
export function setAmbience(bed: AmbienceKey | null, layer: AmbienceKey | null): void {
  if (typeof window === "undefined") return;
  if (!unsub) unsub = subscribeSound(() => { for (const c of Object.values(ch)) apply(c); });
  setChannel(ch.bed, bed);
  setChannel(ch.layer, layer);
}

export function stopAmbience(): void { setAmbience(null, null); }

let preview: HTMLAudioElement | null = null;
/** Hörprobe im Editor (ca. 6 s, mit Master-Lautstärke). Erneuter Aufruf mit derselben Kulisse stoppt sie. */
export function previewAmbience(key: AmbienceKey | null): void {
  if (typeof window === "undefined") return;
  if (preview) { preview.pause(); preview = null; }
  if (!key) return;
  const a = new Audio(`/oq/amb/${key}.wav`);
  a.volume = Math.max(0.15, getSoundSettings().volume * 0.8);
  preview = a;
  void a.play().catch(() => {});
  setTimeout(() => { if (preview === a) { a.pause(); preview = null; } }, 6000);
}
