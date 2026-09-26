// ============================================
// Prüf-Meldung → Ort im Editor (für „Anzeigen“-Knöpfe der Prüfung)
// ============================================

import type { CustomWorldDoc } from "./custom-world";

export type ProblemTarget =
  | { tab: "details" }
  | { tab: "quest" }
  | { tab: "map"; select?: { type: "actor"; id: string } | { type: "building"; index: number } | { type: "spawn" } };

/** Wohin eine Meldung der Prüfung zeigt. Die Meldungen nennen Figuren und Gebäude in „…“ — darüber wird der Ort gefunden. */
export function problemTarget(problem: string, doc: CustomWorldDoc): ProblemTarget {
  if (problem.startsWith("Wähle ein leeres Feld") || problem.includes("braucht einen Namen")) return { tab: "details" };
  if (problem.startsWith("Quest")) return { tab: "quest" };
  const quoted = /„([^“]*)“/g;
  for (const m of problem.matchAll(quoted)) {
    const name = m[1];
    const actor = doc.actors.find((a) => a.name === name);
    if (actor) return { tab: "map", select: { type: "actor", id: actor.id } };
    const bi = doc.buildings.findIndex((b) => (b.name || "Gebäude") === name);
    if (bi >= 0) return { tab: "map", select: { type: "building", index: bi } };
  }
  if (problem.includes("Startpunkt")) return { tab: "map", select: { type: "spawn" } };
  return { tab: "map" };
}
