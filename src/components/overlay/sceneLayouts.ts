/**
 * Layouts der Vollbild-Szenen des festen Streamer-Links — Pausen-Szene und Clip-Szenen (Intro,
 * Clips, Outro teilen sich ein Layout). Gleiches Format wie die Spiel-Szene (Prozent von
 * 1920×1080, optional Größe und Sichtbarkeits-Zyklus), aber ohne Stapeln: Jeder Baustein steht
 * für sich. Ohne gespeichertes Layout gelten die Standardpositionen unten — sie entsprechen der
 * früher fest verbauten Anordnung.
 */
import type { OverlayLayout } from "./types";
import { DEFAULT_ROTATE_SECONDS } from "./types";

export type PauseElementKey = "title" | "main" | "info" | "match" | "series" | "community" | "live" | "footer";
export const PAUSE_ELEMENT_KEYS: PauseElementKey[] = ["title", "main", "info", "match", "series", "community", "live", "footer"];

export type ClipElementKey = "title" | "player" | "caption" | "footer";
export const CLIP_ELEMENT_KEYS: ClipElementKey[] = ["title", "player", "caption", "footer"];

/** Grundgröße je Baustein (px bei 1920×1080, vor der Skalierung). */
export const PAUSE_ELEMENT_SIZE: Record<PauseElementKey, { width: number; height: number }> = {
  title:     { width: 1500, height: 230 },
  main:      { width: 620, height: 420 },
  info:      { width: 620, height: 78 },
  match:     { width: 620, height: 78 },
  series:    { width: 460, height: 310 },
  community: { width: 420, height: 170 },
  live:      { width: 400, height: 200 },
  footer:    { width: 900, height: 30 },
};

export const CLIP_ELEMENT_SIZE: Record<ClipElementKey, { width: number; height: number }> = {
  title:   { width: 1600, height: 120 },
  player:  { width: 1280, height: 720 },
  caption: { width: 1280, height: 64 },
  footer:  { width: 900, height: 30 },
};

type Entry = { x: number; y: number; scale?: number };

export const DEFAULT_PAUSE_POSITIONS: Record<PauseElementKey, Entry> = {
  title:     { x: 10.9, y: 4.4 },
  main:      { x: 6.3, y: 30.6, scale: 1.3 },
  info:      { x: 51, y: 30.6 },
  match:     { x: 51, y: 40.4 },
  series:    { x: 51, y: 50.2 },
  community: { x: 52.1, y: 30.6, scale: 1.2 },
  live:      { x: 52.1, y: 52.8, scale: 1.2 },
  footer:    { x: 26.6, y: 95.4 },
};

export const DEFAULT_CLIP_POSITIONS: Record<ClipElementKey, Entry> = {
  title:   { x: 8.3, y: 3.7 },
  player:  { x: 16.7, y: 16.3 },
  caption: { x: 16.7, y: 84.4 },
  footer:  { x: 26.6, y: 95.4 },
};

export function defaultPauseLayout(): OverlayLayout<PauseElementKey> {
  return { elements: Object.fromEntries(PAUSE_ELEMENT_KEYS.map(k => [k, { ...DEFAULT_PAUSE_POSITIONS[k] }])), rotateSeconds: DEFAULT_ROTATE_SECONDS };
}

export function defaultClipLayout(): OverlayLayout<ClipElementKey> {
  return { elements: Object.fromEntries(CLIP_ELEMENT_KEYS.map(k => [k, { ...DEFAULT_CLIP_POSITIONS[k] }])), rotateSeconds: DEFAULT_ROTATE_SECONDS };
}
