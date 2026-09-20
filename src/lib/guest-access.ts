// Seiten, die auch ohne Discord-Login sichtbar sein sollen ("Schaufenster" für
// nicht eingeloggte Besucher). Bewusst nur die exakten Übersichtsseiten, keine
// Unterseiten wie /events/series/[id] oder /tournament/[id] — die verlangen
// weiterhin ein Login. Wird sowohl serverseitig (Layout) als auch im Client
// (Navigation/GateLink) genutzt, damit beide dieselbe Definition teilen.
export const GUEST_ALLOWED_PATHS = ["/dashboard", "/events", "/leaderboard", "/clip-galerie"];

export function isGuestAllowedPath(href: string): boolean {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return GUEST_ALLOWED_PATHS.includes(path);
}

// Teaser-Limits für Gäste: genug, um Lust auf mehr zu machen, der Rest
// (vollständige Rangliste / alle Events) bleibt hinter dem Login.
export const GUEST_LEADERBOARD_LIMIT = 10;
export const GUEST_UPCOMING_EVENTS_LIMIT = 6;
export const GUEST_FINISHED_EVENTS_LIMIT = 3;
