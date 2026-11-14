/**
 * Event-weite Live-Steuerung (Event.overlayControlJson) lesen und ändern — gemeinsam für den
 * Overlay-Stream (lib/overlay-state.ts) und die Widget-API (/api/widget/events/[id]/overlay-control),
 * damit beide exakt dieselben Grenzen haben. Ohne Datenbank, damit testbar.
 */
import {
  ANNOUNCEMENT_MAX_LENGTH, ELEMENT_KEYS, EMPTY_EVENT_CONTROL,
  type ElementKey, type EventControl, type OverlayAnnouncement,
} from "@/components/overlay/types";

/** Längste Anzeigedauer einer Durchsage mit Ablaufzeit (2 h). */
export const ANNOUNCEMENT_MAX_SECONDS = 2 * 3600;

const isKey = (k: unknown): k is ElementKey => typeof k === "string" && (ELEMENT_KEYS as string[]).includes(k);

function sanitizeText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/\s+/g, " ").trim().slice(0, ANNOUNCEMENT_MAX_LENGTH);
  return text || null;
}

function parseAnnouncement(raw: unknown): OverlayAnnouncement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = sanitizeText(r.text);
  if (!text) return null;
  const until = Number(r.until);
  return {
    id: typeof r.id === "string" && r.id ? r.id.slice(0, 40) : "a",
    text,
    until: r.until != null && Number.isFinite(until) && until > 0 ? until : null,
    countdown: r.countdown === true && r.until != null,
  };
}

/** Sicherer Default, falls das JSON fehlt/kaputt ist — Overlay verhält sich dann wie ohne Steuerung. */
export function parseEventOverlayControl(raw: string | null | undefined): EventControl {
  if (!raw) return { ...EMPTY_EVENT_CONTROL };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      hidden: Array.isArray(parsed.hidden) ? [...new Set(parsed.hidden.filter(isKey))] : [],
      zoom: isKey(parsed.zoom) ? parsed.zoom : null,
      scene: parsed.scene === "pause" ? "pause" : null,
      announcement: parseAnnouncement(parsed.announcement),
    };
  } catch {
    return { ...EMPTY_EVENT_CONTROL };
  }
}

/** Abgelaufene Durchsage = keine Durchsage (Ablauf ist ein Zeitpunkt, kein Timer auf dem Server). */
export function activeAnnouncement(control: EventControl, now = Date.now()): OverlayAnnouncement | null {
  const a = control.announcement;
  return a && (a.until == null || a.until > now) ? a : null;
}

/**
 * PATCH-Body des Widgets auf den bestehenden Zustand anwenden — nur angegebene Felder ändern sich.
 *   hidden?: string[], zoom?: string | null, scene?: "pause" | null,
 *   announcement?: { text: string, durationSec?: number | null, countdown?: boolean } | null
 */
export function applyEventControlPatch(current: EventControl, body: Record<string, unknown>, now = Date.now()): EventControl {
  const next: EventControl = { ...current };
  if (Array.isArray(body.hidden)) next.hidden = [...new Set(body.hidden.filter(isKey))];
  if (body.zoom !== undefined) next.zoom = isKey(body.zoom) ? body.zoom : null;
  if (body.scene !== undefined) next.scene = body.scene === "pause" ? "pause" : null;
  if (body.announcement !== undefined) {
    const a = body.announcement as Record<string, unknown> | null;
    const text = a && typeof a === "object" ? sanitizeText(a.text) : null;
    if (!text) {
      next.announcement = null;
    } else {
      const seconds = Number(a!.durationSec);
      const timed = Number.isFinite(seconds) && seconds > 0;
      const until = timed ? now + Math.min(seconds, ANNOUNCEMENT_MAX_SECONDS) * 1000 : null;
      next.announcement = { id: now.toString(36), text, until, countdown: timed && a!.countdown === true };
    }
  }
  return next;
}
