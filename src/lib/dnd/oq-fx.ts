// ============================================
// OMA Quest — Kampf-Effekte und Klassen-Icons (rein): welcher Effekt gehört zu welcher Kampfzeile
// ============================================
// Der Kampf-Server liefert Textzeilen; die Oberfläche erkennt daran, was passiert ist (Treffer, kritischer Treffer, Zauber, Heilung …) und spielt
// den passenden Pixel-Effekt am Monster oder am Helden ab. Die Grafiken liegen in public/oq (fx, class, skill).

import type { FxKind } from "./oq-fx-manifest";
import type { Branch } from "./skills";

export interface FxEvent { id: number; kind: FxKind; side: "hero" | "monster"; /** Name des betroffenen Helden (Gruppenkampf) */ hero?: string }

export const CLASS_ICON = (classId: string): string => `/oq/class/${["krieger", "paladin", "magier", "kleriker", "schurke", "waldlaeufer", "barde"].includes(classId) ? classId : "krieger"}.png`;
export const BRANCH_ICON = (b: Branch): string => `/oq/skill/${b}.png`;

/** Effekt für ein Zeichen der Klassenfähigkeit (Zauber-Kennzeichen im Log). */
const ABILITY_FX: [string, FxKind][] = [["🔥", "fire"], ["❄️", "ice"], ["⚡", "holy"], ["📣", "arcane"], ["🌧️", "arcane"], ["☠️", "crit"]];

/** Kampfzeile → Effekt (oder null). `heroNames` = Namen der Helden (für den Gruppenkampf, um das Ziel zu finden). */
export function fxFromLine(line: string, heroNames: string[] = []): Omit<FxEvent, "id"> | null {
  // Monster greift an (…greift <Name> an: … / …greift an: …)
  if (/greift( .+)? an:/.test(line)) {
    const hero = heroNames.find((n) => line.includes(`greift ${n} an`));
    if (/daneben/.test(line)) return { kind: "miss", side: "hero", hero };
    return { kind: "hurt", side: "hero", hero };
  }
  if (/\+3 Rüstung|geht in Deckung/.test(line)) return { kind: "guard", side: "hero", hero: heroNames.find((n) => line.startsWith(n) || line.includes(`${n} bekommt`)) };
  // Heilung / Wiederbelebung (auch Talent-Regeneration)
  if (/heilst|geheilt|wird um \d+ geheilt|steht wieder auf|erholst|erholt sich/.test(line)) {
    return { kind: "heal", side: "hero", hero: heroNames.find((n) => line.includes(n)) };
  }
  if (/verliert die Konzentration/.test(line)) return { kind: "buff", side: "monster" };
  if (/^(Du greifst an|.+ — Angriff|.+: \d+ \(=)/.test(line) || /Schaden\./.test(line) || /daneben/.test(line)) {
    if (/daneben/.test(line)) return { kind: "miss", side: "monster" };
    if (/KRITISCHER/.test(line)) return { kind: "crit", side: "monster" };
    for (const [mark, kind] of ABILITY_FX) if (line.includes(mark)) return { kind, side: "monster" };
    if (/trifft sicher/.test(line)) return { kind: "arcane", side: "monster" };
    return { kind: "hit", side: "monster" };
  }
  return null;
}

/** Neue Zeilen eines (nach hinten wachsenden, oben abgeschnittenen) Logs: kleinste Anzahl n, sodass der Anfang von `cur` das Ende von `prev` ist. */
export function newLines(prev: string[], cur: string[]): string[] {
  for (let n = 0; n <= cur.length; n++) {
    const keep = cur.length - n;
    if (keep > prev.length) continue;
    let same = true;
    for (let i = 0; i < keep; i++) if (cur[i] !== prev[prev.length - keep + i]) { same = false; break; }
    if (same) return cur.slice(keep);
  }
  return cur;
}
