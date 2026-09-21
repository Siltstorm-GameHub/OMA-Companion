/** Kategorien und Status-Lebenszyklus für Visionär-Ideen (client-sicher, kein Prisma). */

export const IDEA_CATEGORIES = [
  { id: "event", label: "Event-Idee" },
  { id: "feature", label: "Community-Feature" },
  { id: "app", label: "App-Verbesserung" },
  { id: "server", label: "Server" },
  { id: "other", label: "Sonstiges" },
] as const;

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]["id"];

export function isIdeaCategory(v: unknown): v is IdeaCategory {
  return typeof v === "string" && IDEA_CATEGORIES.some(c => c.id === v);
}

export function ideaCategoryLabel(v: string | null | undefined): string | null {
  return IDEA_CATEGORIES.find(c => c.id === v)?.label ?? null;
}

export const IDEA_LIFECYCLES = [
  { id: "OPEN", label: "Offen", tone: "neutral" },
  { id: "REVIEW", label: "In Prüfung", tone: "info" },
  { id: "PLANNED", label: "Wird umgesetzt", tone: "warning" },
  { id: "DONE", label: "Umgesetzt", tone: "success" },
  { id: "REJECTED", label: "Abgelehnt", tone: "neutral" },
] as const;

export type IdeaLifecycle = (typeof IDEA_LIFECYCLES)[number]["id"];

export function isIdeaLifecycle(v: unknown): v is IdeaLifecycle {
  return typeof v === "string" && IDEA_LIFECYCLES.some(l => l.id === v);
}

export function ideaLifecycleMeta(v: string | null | undefined) {
  return IDEA_LIFECYCLES.find(l => l.id === v) ?? IDEA_LIFECYCLES[0];
}

export const IDEA_TITLE_MAX = 100;
export const IDEA_BODY_MAX = 4000;

/** Zusammenfassung der Sterne-Bewertungen: Durchschnitt + Verteilung (Index 0 = 5 Sterne … 4 = 1 Stern). */
export function summarizeStars(stars: number[]): { count: number; average: number; distribution: number[] } {
  const distribution = [0, 0, 0, 0, 0];
  for (const s of stars) if (s >= 1 && s <= 5) distribution[5 - s] += 1;
  const count = stars.length;
  return { count, average: count > 0 ? stars.reduce((a, b) => a + b, 0) / count : 0, distribution };
}

export const IDEA_MAX_IMAGES = 3;
const BLOB_IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;
export function isIdeaImageUrl(url: unknown): url is string {
  return typeof url === "string" && BLOB_IMAGE_HOST.test(url);
}

export const IDEA_INTEREST_KINDS = [
  { id: "PARTICIPATE", label: "Ich wäre dabei", doneLabel: "Du bist dabei", verb: "wäre dabei" },
  { id: "HELP", label: "Ich helfe mit", doneLabel: "Du hilfst mit", verb: "möchte bei der Umsetzung helfen" },
] as const;
export type IdeaInterestKind = (typeof IDEA_INTEREST_KINDS)[number]["id"];
export function isIdeaInterestKind(v: unknown): v is IdeaInterestKind {
  return typeof v === "string" && IDEA_INTEREST_KINDS.some(k => k.id === v);
}

/** Steam-App-ID aus einem Store-Link (…/app/12345/…) oder einer reinen Zahl. */
export function parseSteamAppId(input: string): number | null {
  const m = input.match(/store\.steampowered\.com\/app\/(\d{2,9})/i) ?? input.trim().match(/^(\d{2,9})$/);
  return m ? Number(m[1]) : null;
}
