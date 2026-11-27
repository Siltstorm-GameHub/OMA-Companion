/** Kategorien und Status-Lebenszyklus für Visionär-Ideen (client-sicher, kein Prisma). */

export const IDEA_CATEGORIES = [
  { id: "event", label: "Event-Idee" }, // Altbestand — Event-Wünsche laufen seit 2026-11 über Event-Vorschläge
  { id: "feature", label: "Community-Feature" },
  { id: "app", label: "App-Verbesserung" },
  { id: "server", label: "Server" },
  { id: "other", label: "Sonstiges" },
] as const;

/** Kategorien, die man beim Einreichen wählen kann (ohne "Event-Idee": dafür gibt es Event-Vorschläge) */
export const IDEA_CATEGORIES_SELECTABLE = IDEA_CATEGORIES.filter(c => c.id !== "event");

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

/**
 * Signale an einer Idee: "Unterstützen" ist das Hauptsignal (ein Klick), "Ich helfe mit" ein Zusatz.
 * PARTICIPATE ("Ich wäre dabei") ist Altbestand aus der Zeit vor den Event-Vorschlägen und zählt wie Unterstützen.
 */
export const IDEA_INTEREST_KINDS = [
  { id: "SUPPORT", label: "Unterstützen", doneLabel: "Unterstützt", verb: "unterstützt" },
  { id: "HELP", label: "Ich helfe mit", doneLabel: "Du hilfst mit", verb: "möchte bei der Umsetzung helfen" },
  { id: "PARTICIPATE", label: "Ich wäre dabei", doneLabel: "Du bist dabei", verb: "wäre dabei" },
] as const;

/** Arten, die als Unterstützung zählen (SUPPORT + Altbestand PARTICIPATE) */
export const SUPPORT_KINDS = ["SUPPORT", "PARTICIPATE"] as const;

/** Ab so vielen Unterstützern geht eine Idee zum Fristende automatisch an das Team ("In Prüfung") */
export const IDEA_SUPPORT_THRESHOLD = 5;

/** Status, bei denen das Team eine kurze Begründung angeben muss */
export const LIFECYCLES_NEEDING_NOTE = ["REJECTED", "DONE"] as const;

/** Zahl der Unterstützer (jeder User einmal, egal ob SUPPORT oder Altbestand PARTICIPATE) */
export function countSupporters(interests: { userId: string; kind: string }[]): number {
  return new Set(interests.filter(i => (SUPPORT_KINDS as readonly string[]).includes(i.kind)).map(i => i.userId)).size;
}
export type IdeaInterestKind = (typeof IDEA_INTEREST_KINDS)[number]["id"];
export function isIdeaInterestKind(v: unknown): v is IdeaInterestKind {
  return typeof v === "string" && IDEA_INTEREST_KINDS.some(k => k.id === v);
}

/** Steam-App-ID aus einem Store-Link (…/app/12345/…) oder einer reinen Zahl. */
export function parseSteamAppId(input: string): number | null {
  const m = input.match(/store\.steampowered\.com\/app\/(\d{2,9})/i) ?? input.trim().match(/^(\d{2,9})$/);
  return m ? Number(m[1]) : null;
}
