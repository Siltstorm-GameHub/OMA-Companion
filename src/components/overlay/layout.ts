/**
 * Layout-Logik der OBS-Overlays — von Server (Seiten, Streams, Speichern) und Client
 * (Einstellungsseiten) gemeinsam genutzt, daher ohne React/"use client".
 *
 * Ein Layout ist eine Map Element → { x, y, scale?, cycle? } (Prozent von 1920×1080) plus der
 * Rotationstakt für gestapelte Elemente. Es kommt aus einer von drei Quellen:
 *   1. am User gespeichert (User.overlayLayoutJson) — der feste Streamer-Link,
 *   2. als `?layout=`-Parameter in älteren, per Einstellungsseite erzeugten Links,
 *   3. aus den ganz alten Parametern `panels`/`pos`/`ticker`/`brand` (legacyParamsToLayout).
 */
import {
  ELEMENT_KEYS, ELEMENT_SIZE, PROFILE_ELEMENT_KEYS, DEFAULT_ROTATE_SECONDS, EDGE_MARGIN,
  type ElementKey, type ProfileElementKey, type LayoutEntry, type LayoutPositions, type OverlayLayout,
  type OverlayControl, type ClipSceneConfig, CLIP_SOURCES, type ClipSource,
} from "./types";
import { DEFAULT_PAUSE_BACKGROUND, isPauseBackground, type PauseBackgroundKey } from "./pauseBackgrounds";

/** Ausgangspositionen (Prozent von 1920×1080). Tabelle/Teilnehmer/Gesamttabelle teilen sich
 *  bewusst dieselbe Position — sie stapeln sich dadurch von Anfang an zu einer rotierenden
 *  Gruppe. Turnierbaum hat einen eigenen x-Wert, weil er breiter ist (620px vs. 460px) — beide
 *  Werte sind so gewählt, dass die Kachel mit ca. EDGE_MARGIN Abstand rechtsbündig am
 *  Bildschirmrand sitzt (rechnerisch: (1920 − Kachelbreite − 28) / 1920 × 100). */
export const DEFAULT_EVENT_POSITIONS: Record<ElementKey, { x: number; y: number }> = {
  brand:        { x: 1.5,  y: 90.6 },
  liveinfo:     { x: 19,   y: 90.6 },
  ticker:       { x: 40,   y: 90.6 },
  bracket:      { x: 66,   y: 2.6 },
  table:        { x: 74.6, y: 2.6 },
  seriesTable:  { x: 74.6, y: 2.6 },
  participants: { x: 74.6, y: 2.6 },
};

/** Rang und nächstes Event rotieren oben rechts, Community-Kachel und "Gerade live" links darüber
 *  der Marken-Kachel (ebenfalls als Stapel). */
export const DEFAULT_PROFILE_POSITIONS: Record<ProfileElementKey, { x: number; y: number }> = {
  brand:       { x: 1.5, y: 90.6 },
  rank:        { x: 77.7, y: 2.6 },
  nextEvent:   { x: 77.7, y: 2.6 },
  community:   { x: 1.5, y: 70 },
  liveMembers: { x: 1.5, y: 70 },
};

const ELIMINATION_FORMATS = ["single_elimination", "double_elimination"];
export const isEliminationFormat = (format: string | null | undefined) => !!format && ELIMINATION_FORMATS.includes(format);

/** Standard-Layout fürs Event-Overlay, wenn nichts eingestellt ist: alle fürs Format relevanten
 *  Elemente aktiv. Gehört das Event zu einer Reihe, rotiert die Gesamttabelle mit Tabelle/Teilnehmern. */
export function defaultEventLayout(format: string | null, hasSeries: boolean): OverlayLayout<ElementKey> {
  const keys: ElementKey[] = ["brand", "liveinfo", "ticker", isEliminationFormat(format) ? "bracket" : "table", "participants"];
  if (hasSeries) keys.push("seriesTable");
  return { elements: Object.fromEntries(keys.map(k => [k, { ...DEFAULT_EVENT_POSITIONS[k] }])), rotateSeconds: DEFAULT_ROTATE_SECONDS };
}

/** Standard-Event-Layout des festen Streamer-Links: gilt für jedes Event, enthält deshalb
 *  Turnierbaum UND Tabelle sowie die Gesamttabelle — adaptEventLayout und die Inhaltsprüfung im
 *  Overlay blenden je Event aus, was nicht passt. */
export function defaultStreamerEventLayout(): OverlayLayout<ElementKey> {
  const keys: ElementKey[] = ["brand", "liveinfo", "ticker", "bracket", "table", "seriesTable", "participants"];
  return { elements: Object.fromEntries(keys.map(k => [k, { ...DEFAULT_EVENT_POSITIONS[k] }])), rotateSeconds: DEFAULT_ROTATE_SECONDS };
}

/** Standard-Layout fürs Profil-Overlay: alle Elemente aktiv. */
export function defaultProfileLayout(): OverlayLayout<ProfileElementKey> {
  const keys = PROFILE_ELEMENT_KEYS;
  return { elements: Object.fromEntries(keys.map(k => [k, { ...DEFAULT_PROFILE_POSITIONS[k] }])), rotateSeconds: DEFAULT_ROTATE_SECONDS };
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const clampRotateSeconds = (v: unknown) => {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? clamp(n, 4, 60) : DEFAULT_ROTATE_SECONDS;
};

/** Prüft/normalisiert einen einzelnen Layout-Eintrag — gemeinsam für URL-Parameter und
 *  gespeichertes JSON, damit beide Wege exakt dieselben Grenzen haben. */
function sanitizeEntry(raw: { x?: unknown; y?: unknown; scale?: unknown; cycle?: unknown }): LayoutEntry | null {
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const entry: LayoutEntry = { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
  const scale = Number(raw.scale);
  if (raw.scale != null && Number.isFinite(scale) && scale > 0) entry.scale = clamp(scale, 0.5, 2);
  const cycle = raw.cycle as { onSec?: unknown; offSec?: unknown } | null | undefined;
  if (cycle && typeof cycle === "object") {
    const onSec = Number(cycle.onSec);
    const offSec = Number(cycle.offSec);
    if (Number.isFinite(onSec) && Number.isFinite(offSec) && onSec > 0 && offSec > 0) {
      entry.cycle = { onSec: clamp(onSec, 2, 300), offSec: clamp(offSec, 2, 300) };
    }
  }
  return entry;
}

/** `brand:4.2,88.5;ticker:20.1,88.5,s1.3,c8-4;table:65,4` — nach x,y folgen optionale Segmente
 *  `s<scale>` (Kachelgröße, 1 = Standard) und `c<onSec>-<offSec>` (Sichtbarkeits-Zyklus). */
export function parseLayoutParam<K extends string>(raw: string | undefined | null, allowed: readonly K[]): LayoutPositions<K> | null {
  if (!raw) return null;
  const result: LayoutPositions<K> = {};
  for (const part of raw.split(";")) {
    const [key, coords] = part.split(":");
    if (!coords || !(allowed as readonly string[]).includes(key)) continue;
    const [xs, ys, ...rest] = coords.split(",");
    let scale: number | undefined;
    let cycle: { onSec: number; offSec: number } | undefined;
    for (const seg of rest) {
      if (seg.startsWith("s")) scale = parseFloat(seg.slice(1));
      else if (seg.startsWith("c")) {
        const [on, off] = seg.slice(1).split("-");
        cycle = { onSec: parseFloat(on), offSec: parseFloat(off) };
      }
    }
    const entry = sanitizeEntry({ x: parseFloat(xs), y: parseFloat(ys), scale, cycle });
    if (entry) result[key as K] = entry;
  }
  return Object.keys(result).length > 0 ? result : null;
}

/** Gegenstück zu parseLayoutParam — nur noch für die "Link mit eingebautem Layout"-Variante. */
export function serializeLayoutParam<K extends string>(elements: LayoutPositions<K>): string {
  return (Object.entries(elements) as [K, LayoutEntry][]).map(([key, p]) => {
    const parts = [p.x.toFixed(1), p.y.toFixed(1)];
    if (p.scale && Math.abs(p.scale - 1) > 0.001) parts.push(`s${p.scale.toFixed(2)}`);
    if (p.cycle) parts.push(`c${p.cycle.onSec}-${p.cycle.offSec}`);
    return `${key}:${parts.join(",")}`;
  }).join(";");
}

/** Validiert ein vom Client geschicktes oder aus der DB gelesenes Layout. null = unbrauchbar. */
export function sanitizeLayout<K extends string>(raw: unknown, allowed: readonly K[]): OverlayLayout<K> | null {
  if (!raw || typeof raw !== "object") return null;
  const { elements, rotateSeconds } = raw as { elements?: unknown; rotateSeconds?: unknown };
  if (!elements || typeof elements !== "object") return null;
  const result: LayoutPositions<K> = {};
  for (const [key, value] of Object.entries(elements as Record<string, unknown>)) {
    if (!(allowed as readonly string[]).includes(key) || !value || typeof value !== "object") continue;
    const entry = sanitizeEntry(value as Record<string, unknown>);
    if (entry) result[key as K] = entry;
  }
  if (Object.keys(result).length === 0) return null;
  return { elements: result, rotateSeconds: clampRotateSeconds(rotateSeconds) };
}

/** Am User gespeicherte Einstellungen des festen Streamer-Links (User.overlayLayoutJson). */
export type StreamerOverlayConfig = {
  event: OverlayLayout<ElementKey> | null;
  profile: OverlayLayout<ProfileElementKey> | null;
  /** Eigener Text der Pausen-Szene, null = DEFAULT_PAUSE_TEXT. */
  pauseText: string | null;
  /** Leicht-Modus für schwächere PCs (keine Glas-/Unschärfe-Effekte, keine Dauer-Animationen). */
  lite: boolean;
  /** Hintergrund der Pausen-Szene, siehe pauseBackgrounds.ts. */
  pauseBackground: PauseBackgroundKey;
  /** Clip-Szenen (Intro, Clips, Outro). */
  clips: ClipSceneConfig;
};

export const DEFAULT_CLIP_CONFIG: ClipSceneConfig = { source: "top", muted: true, introText: null, outroText: null };

export function sanitizeClipConfig(raw: unknown, base: ClipSceneConfig = DEFAULT_CLIP_CONFIG): ClipSceneConfig {
  const r = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    source: CLIP_SOURCES.includes(r.source as ClipSource) ? r.source as ClipSource : base.source,
    muted: typeof r.muted === "boolean" ? r.muted : base.muted,
    introText: "introText" in r ? sanitizePauseText(r.introText) : base.introText,
    outroText: "outroText" in r ? sanitizePauseText(r.outroText) : base.outroText,
  };
}

export const PAUSE_TEXT_MAX = 60;

export function sanitizePauseText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim().slice(0, PAUSE_TEXT_MAX);
  return text || null;
}

export function parseStreamerConfig(json: string | null | undefined): StreamerOverlayConfig {
  const empty: StreamerOverlayConfig = { event: null, profile: null, pauseText: null, lite: false, pauseBackground: DEFAULT_PAUSE_BACKGROUND, clips: { ...DEFAULT_CLIP_CONFIG } };
  if (!json) return empty;
  try {
    const parsed = JSON.parse(json) as { event?: unknown; profile?: unknown; pauseText?: unknown; lite?: unknown; pauseBackground?: unknown; clips?: unknown };
    return {
      // Unbekannte Element-Schlüssel (z.B. entfernte wie "favorites") fallen hier still heraus.
      event: sanitizeLayout(parsed.event, ELEMENT_KEYS),
      profile: sanitizeLayout(parsed.profile, PROFILE_ELEMENT_KEYS),
      pauseText: sanitizePauseText(parsed.pauseText),
      lite: parsed.lite === true,
      pauseBackground: isPauseBackground(parsed.pauseBackground) ? parsed.pauseBackground : DEFAULT_PAUSE_BACKGROUND,
      clips: sanitizeClipConfig(parsed.clips),
    };
  } catch {
    return empty;
  }
}

// ── Alte Links ohne `layout` ──────────────────────────────────────────────────

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "middle-left" | "middle-right";
const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"];
const LEGACY_PANELS = ["bracket", "table", "participants"] as const;
const pctX = (px: number) => Math.round((px / 1920) * 1000) / 10;
const pctY = (px: number) => Math.round((px / 1080) * 1000) / 10;

/**
 * Übersetzt die Parameter der allerersten Overlay-Links (`panels`, `pos`, `ticker`, `brand` —
 * vor der freien Positionierung) in ein gleichwertiges Layout. Dadurch braucht das Overlay nur
 * noch EIN Render-System; alte Links in OBS zeigen weiterhin dieselben Inhalte an derselben
 * Stelle. Die alte Marken-Kachel (Live/Event/Spiel ↔ Logo) entspricht heute "liveinfo".
 */
export function legacyParamsToLayout(
  params: { panels?: string; pos?: string; ticker?: string; brand?: string; rotate?: string },
  format: string | null,
): OverlayLayout<ElementKey> {
  const requested = params.panels
    ? params.panels.split(",").filter((p): p is (typeof LEGACY_PANELS)[number] => (LEGACY_PANELS as readonly string[]).includes(p))
    : [];
  const panels: ElementKey[] = requested.length ? requested : [isEliminationFormat(format) ? "bracket" : "table", "participants"];
  const corner: Corner = params.pos && (CORNERS as string[]).includes(params.pos) ? (params.pos as Corner) : "top-right";

  // Gemeinsame Position für alle Panels (sie rotierten auch früher an genau einer Stelle). Breite
  // und Höhe der größten Kachel, damit sie an der gewählten Kante bündig bleibt.
  const width = Math.max(...panels.map(k => ELEMENT_SIZE[k].width));
  const height = Math.max(...panels.map(k => ELEMENT_SIZE[k].height));
  const lowerThirdTop = 1080 - 48 - ELEMENT_SIZE.liveinfo.height; // alter TICKER_BOTTOM = 48
  const x = corner.endsWith("left") ? pctX(EDGE_MARGIN) : pctX(1920 - EDGE_MARGIN - width);
  const y = corner.startsWith("top") ? pctY(EDGE_MARGIN)
    : corner.startsWith("bottom") ? pctY(lowerThirdTop - 20 - height)
    : pctY((1080 - height) / 2);

  const elements: LayoutPositions<ElementKey> = {};
  for (const key of panels) elements[key] = { x, y };
  let nextX = EDGE_MARGIN;
  if (params.brand !== "0") {
    elements.liveinfo = { x: pctX(nextX), y: pctY(lowerThirdTop) };
    nextX += ELEMENT_SIZE.liveinfo.width + 16;
  }
  if (params.ticker !== "0") elements.ticker = { x: pctX(nextX), y: pctY(lowerThirdTop) };

  return { elements, rotateSeconds: params.rotate ? clampRotateSeconds(params.rotate) : DEFAULT_ROTATE_SECONDS };
}

/**
 * Ein am Streamer gespeichertes Event-Layout gilt für JEDES Event, das er streamt — es enthält
 * deshalb typischerweise Turnierbaum UND Tabelle. Hier fliegt heraus, was zum Format des
 * konkreten Events nicht passt (gleiche Regel wie die Element-Auswahl der Einstellungsseite):
 * Turnierbaum nur bei K.-o.-Formaten, Tabelle nur bei den übrigen Turnierformaten.
 */
export function adaptEventLayout(layout: OverlayLayout<ElementKey>, format: string | null): OverlayLayout<ElementKey> {
  const elements = { ...layout.elements };
  if (!isEliminationFormat(format)) delete elements.bracket;
  if (!format || isEliminationFormat(format)) delete elements.table;
  return { ...layout, elements };
}

// ── Live-Steuerung des eigenen Overlays ───────────────────────────────────────

const CONTROL_KEYS = new Set<string>([...ELEMENT_KEYS, ...PROFILE_ELEMENT_KEYS]);
export const EMPTY_CONTROL: OverlayControl = { hidden: [], zoom: null, zoomUntil: null, pause: false, countdownUntil: null };

export function sanitizeControl(raw: unknown): OverlayControl {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CONTROL };
  const r = raw as Record<string, unknown>;
  const hidden = Array.isArray(r.hidden)
    ? [...new Set(r.hidden.filter((k): k is string => typeof k === "string" && CONTROL_KEYS.has(k)))]
    : [];
  const zoom = typeof r.zoom === "string" && CONTROL_KEYS.has(r.zoom) ? r.zoom : null;
  const until = Number(r.zoomUntil);
  const countdown = Number(r.countdownUntil);
  return {
    hidden, zoom, zoomUntil: zoom && Number.isFinite(until) && until > 0 ? until : null, pause: r.pause === true,
    countdownUntil: r.countdownUntil != null && Number.isFinite(countdown) && countdown > 0 ? countdown : null,
  };
}

export function parseOverlayControl(json: string | null | undefined): OverlayControl {
  if (!json) return { ...EMPTY_CONTROL };
  try { return sanitizeControl(JSON.parse(json)); } catch { return { ...EMPTY_CONTROL }; }
}

/** Abgelaufener Zoom zählt nicht mehr — so endet "für 10 s einblenden" auch ohne weitere Aktion. */
export function activeZoom(control: OverlayControl, now = Date.now()): string | null {
  if (!control.zoom) return null;
  return control.zoomUntil && control.zoomUntil <= now ? null : control.zoom;
}
