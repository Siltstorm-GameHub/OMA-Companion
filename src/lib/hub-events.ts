/**
 * Kleine Brücke zwischen der Glocke in der Kopfzeile (components/shell/TopBar) und dem
 * Community-Hub (components/CommunityHub), der Benachrichtigungen und Absprachen lädt.
 * Der Hub meldet seinen Zähler, die Glocke öffnet bzw. schließt das Panel.
 */
export const HUB_TOGGLE_EVENT = "oma:hub-toggle";
export const HUB_BADGE_EVENT = "oma:hub-badge";

declare global {
  interface Window { __omaHubBadge?: number }
}

export function toggleHub() {
  window.dispatchEvent(new CustomEvent(HUB_TOGGLE_EVENT));
}

export function publishHubBadge(count: number) {
  window.__omaHubBadge = count;
  window.dispatchEvent(new CustomEvent<number>(HUB_BADGE_EVENT, { detail: count }));
}

export function readHubBadge(): number {
  return typeof window === "undefined" ? 0 : window.__omaHubBadge ?? 0;
}

/** Online-Zahl (Presence) — der Hub lädt sie, die Seitenleiste zeigt sie an. */
export const HUB_ONLINE_EVENT = "oma:hub-online";

declare global {
  interface Window { __omaHubOnline?: number }
}

export function publishHubOnline(count: number) {
  window.__omaHubOnline = count;
  window.dispatchEvent(new CustomEvent<number>(HUB_ONLINE_EVENT, { detail: count }));
}

export function readHubOnline(): number {
  return typeof window === "undefined" ? 0 : window.__omaHubOnline ?? 0;
}

/**
 * Weitere Werte aus dem gemeinsamen Hintergrund-Abruf des Hubs (/api/me/pulse), damit andere
 * Komponenten nicht selbst pollen (jeder Abruf = ein Vercel-Function-Aufruf):
 * - Zahl offener Umfragen ohne eigene Stimme (PollBadge in Seitenleiste/BottomNav)
 * - Absprachen-Liste (EventChatModule auf der Übersicht)
 */
export const HUB_POLLS_EVENT = "oma:hub-polls";
export const HUB_THREADS_EVENT = "oma:hub-threads";

declare global {
  interface Window { __omaHubPolls?: number; __omaHubThreads?: unknown }
}

export function publishHubPolls(count: number) {
  window.__omaHubPolls = count;
  window.dispatchEvent(new CustomEvent<number>(HUB_POLLS_EVENT, { detail: count }));
}

export function readHubPolls(): number {
  return typeof window === "undefined" ? 0 : window.__omaHubPolls ?? 0;
}

export function publishHubThreads<T>(threads: T) {
  window.__omaHubThreads = threads;
  window.dispatchEvent(new CustomEvent<T>(HUB_THREADS_EVENT, { detail: threads }));
}

export function readHubThreads<T>(): T | null {
  return typeof window === "undefined" ? null : ((window.__omaHubThreads as T | undefined) ?? null);
}
