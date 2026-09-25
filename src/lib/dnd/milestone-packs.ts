// ============================================
// OMA Quest → Battle Cards: Packs als Stufen-Meilensteine (rein)
// ============================================
// Die Brücke zwischen den Modi läuft über Belohnungen, nicht über Kampfwerte: Attributspunkte und Fähigkeiten bleiben in OMA Quest
// (siehe perks.ts), dafür zahlen besondere Stufen ein ungeöffnetes Karten-Pack aus, das man in Battle Cards öffnet. Wer viel in der
// Welt unterwegs ist, bekommt so mehr Karten — ohne dass Quest-XP die Kämpfe stärker macht.
// Die Tabelle ist die einzige Stellschraube (Stufe → Pack-Sorte).

export type MilestonePackKind = "STANDARD" | "PREMIUM";

export const MILESTONE_PACKS: Readonly<Record<number, MilestonePackKind>> = {
  5: "STANDARD",
  10: "PREMIUM",
  15: "STANDARD",
  20: "PREMIUM",
};

export const milestonePackAt = (level: number): MilestonePackKind | null => MILESTONE_PACKS[level] ?? null;

/** Packs für alle Stufen von `from` (ausgeschlossen) bis `to` (eingeschlossen), in Stufen-Reihenfolge. */
export function packsBetween(from: number, to: number): MilestonePackKind[] {
  const out: MilestonePackKind[] = [];
  for (let l = from + 1; l <= to; l++) {
    const p = milestonePackAt(l);
    if (p) out.push(p);
  }
  return out;
}
