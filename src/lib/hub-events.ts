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
