// Terminplanung im Turnier-Manager: aus Startzeit und Abstand je Runde werden alle Matches terminiert.
// Ein "Zeitfenster" ist ein Spieltag (Liga/Gruppenphase — alle Gruppen gleichzeitig) bzw. eine
// K.O.-Runde (bei Hin-/Rückspiel je ein Fenster für Hin- und Rückspiel). Gruppenspiele kommen vor der
// K.O.-Runde. Freilose bekommen keinen Termin.

export type SchedulableMatch = {
  id: string;
  round: number;
  groupIndex?: number | null;
  leg?: number | null;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  scheduledAt?: Date | string | null;
  entryCount?: number;
};

const isBye = (m: SchedulableMatch) => !m.entryCount && !!m.winnerId && (!m.player1Id || !m.player2Id);

/** Zeitfenster-Schlüssel und Sortierung: Gruppenphase (Spieltag) → K.O.-Runde (Runde, Hin vor Rück). */
function slotOf(m: SchedulableMatch): [number, number, number] {
  return m.groupIndex != null ? [0, m.round, 0] : [1, m.round, m.leg ?? 0];
}

/**
 * Termine je Match: startAt + Fenster-Index · intervalMinutes. overwrite = false lässt bereits
 * terminierte Matches unverändert (die Fenster-Zählung bleibt trotzdem gleich, damit Zeiten
 * zusammenpassen). Gibt nur die zu ändernden Matches zurück.
 */
export function planSchedule(
  matches: SchedulableMatch[], startAt: Date, intervalMinutes: number, overwrite: boolean,
): { id: string; scheduledAt: Date }[] {
  const slots = [...new Set(matches.filter(m => !isBye(m)).map(m => slotOf(m).join(":")))]
    .map(k => k.split(":").map(Number) as [number, number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])
    .map(k => k.join(":"));
  const slotIndex = new Map(slots.map((k, i) => [k, i]));
  return matches
    .filter(m => !isBye(m) && (overwrite || !m.scheduledAt))
    .map(m => ({
      id: m.id,
      scheduledAt: new Date(startAt.getTime() + slotIndex.get(slotOf(m).join(":"))! * intervalMinutes * 60_000),
    }));
}
