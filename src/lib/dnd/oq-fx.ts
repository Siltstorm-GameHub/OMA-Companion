// ============================================
// OMA Quest — Kampf-Effekte und Klassen-Icons (rein): welcher Effekt gehört zu welcher Kampfzeile
// ============================================
// Der Kampf-Server liefert Textzeilen; die Oberfläche erkennt daran, was passiert ist (Treffer, kritischer Treffer, Zauber, Heilung …) und spielt
// den passenden Pixel-Effekt am Monster oder am Helden ab. Die Grafiken liegen in public/oq (fx, class, skill).

import type { FxKind } from "./oq-fx-manifest";
import type { Branch } from "./skills";
import { ABILITIES, type Element } from "./abilities";

/** Schwebende Zahl bzw. kurzer Text über der Figur (Schaden rot, Heilung grün, kritisch gelb, verfehlt grau). */
export interface FxFloat { text: string; tone: "dmg" | "crit" | "heal" | "miss" | "info" }

export interface FxEvent {
  id: number;
  kind: FxKind;
  side: "hero" | "monster";
  /** Name des betroffenen Helden (Gruppenkampf) */
  hero?: string;
  float?: FxFloat;
  /** Wer die Aktion ausgeführt hat (Gruppenkampf: Heldenname; Einzelkampf: „self“) — für die Angriffs-Animation der Figur */
  actor?: string;
}

const numberIn = (line: string, ...res: RegExp[]): number | null => {
  for (const re of res) { const m = re.exec(line); if (m) return Number(m[1]); }
  return null;
};
const HEAL_NUM = [/(?:heilst|wird um|erholst dich um|erholt sich um) (\d+)/, /(\d+) Lebenspunkte geheilt/, /steht wieder auf \((\d+) LP\)/, /\+(\d+) LP/];

export const CLASS_ICON = (classId: string): string => `/oq/class/${["krieger", "paladin", "magier", "kleriker", "schurke", "waldlaeufer", "barde"].includes(classId) ? classId : "krieger"}.png`;
export const BRANCH_ICON = (b: Branch): string => `/oq/skill/${b}.png`;

/** Effekt je Element (jedes Element hat eigene Pixel-Grafik). */
const ELEMENT_FX: Record<Element, FxKind | null> = { physical: null, fire: "fire", ice: "ice", lightning: "lightning", holy: "holy", shadow: "shadow", nature: "nature", sound: "sound", arcane: "arcane" };
const elementOfLine = (line: string): Element | undefined => ABILITIES.find((a) => line.includes(`${a.icon} ${a.name}`))?.element;

/** Effekt des Standardangriffs je Klasse (jede Klasse sieht anders aus). */
export const BASIC_ATTACK_FX: Record<string, FxKind> = { krieger: "hit", paladin: "holy", magier: "arcane", kleriker: "holy", schurke: "hit", waldlaeufer: "arrow", barde: "buff" };

/** Kampfzeile → Effekt (oder null). `heroNames` = Namen der Helden (für den Gruppenkampf, um das Ziel zu finden); `classFor` liefert die Klasse des Angreifers. */
export function fxFromLine(line: string, heroNames: string[] = [], classFor?: (line: string) => string | undefined): Omit<FxEvent, "id"> | null {
  // Monster greift an (…greift <Name> an: … / …greift an: …)
  // Wer handelt? Gruppenkampf: Name am Zeilenanfang; Einzelkampf: der Held selbst
  const actorOf = (): string | undefined => heroNames.find((n) => line.startsWith(n)) ?? (heroNames.length === 0 ? "self" : undefined);
  if (/greift( .+)? an:/.test(line)) {
    const hero = heroNames.find((n) => line.includes(`greift ${n} an`));
    if (/daneben/.test(line)) return { kind: "miss", side: "hero", hero, float: { text: "Verfehlt", tone: "miss" } };
    const dmg = numberIn(line, /(\d+) Schaden/);
    return { kind: "hurt", side: "hero", hero, ...(dmg !== null ? { float: { text: `−${dmg}`, tone: /KRITISCH/.test(line) ? "crit" : "dmg" } } : {}) };
  }
  if (/besiegt!/.test(line)) return { kind: "death", side: "monster" };
  if (/\+3 Rüstung|geht in Deckung/.test(line)) return { kind: "barrier", side: "hero", hero: heroNames.find((n) => line.startsWith(n) || line.includes(`${n} bekommt`)), float: { text: "+3 RK", tone: "info" }, actor: actorOf() };
  // Heilung / Wiederbelebung (auch Talent-Regeneration)
  if (/erholst|erholt sich/.test(line)) {
    const n = numberIn(line, ...HEAL_NUM);
    return { kind: "rejuvenate", side: "hero", hero: heroNames.find((h) => line.includes(h)), ...(n !== null ? { float: { text: `+${n}`, tone: "heal" as const } } : {}) };
  }
  if (/heilst|geheilt|wird um \d+ geheilt|steht wieder auf/.test(line)) {
    const n = numberIn(line, ...HEAL_NUM);
    // Ziel: im Gruppenkampf der genannte Held, der nicht selbst handelt (sonst der Heiler selbst)
    const named = heroNames.filter((h) => line.includes(h));
    const others = named.filter((h) => h !== actorOf());
    return { kind: "heal", side: "hero", hero: others[0] ?? named[0], ...(n !== null ? { float: { text: `+${n}`, tone: "heal" as const } } : {}), actor: actorOf() };
  }
  if (/verliert die Konzentration/.test(line)) return { kind: "buff", side: "monster", float: { text: "−3", tone: "info" }, actor: actorOf() };
  if (/^(Du greifst an|.+ — Angriff|.+: \d+ \(=)/.test(line) || /Schaden\./.test(line) || /daneben/.test(line)) {
    const actor = actorOf();
    if (/daneben/.test(line)) return { kind: "miss", side: "monster", float: { text: "Verfehlt", tone: "miss" }, actor };
    const dmg = numberIn(line, /(\d+) Schaden/);
    const crit = /KRITISCHER/.test(line);
    const float: FxFloat | undefined = dmg !== null ? { text: crit ? `−${dmg}!` : `−${dmg}`, tone: crit ? "crit" : "dmg" } : undefined;
    const base = { side: "monster" as const, ...(float ? { float } : {}), actor };
    if (crit) return { kind: "crit", ...base };
    const el = elementOfLine(line);
    if (el && ELEMENT_FX[el]) return { kind: ELEMENT_FX[el]!, ...base };
    if (/trifft sicher/.test(line)) return { kind: "arcane", ...base };
    const cls = classFor?.(line);
    return { kind: (cls && BASIC_ATTACK_FX[cls]) || "hit", ...base };
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
