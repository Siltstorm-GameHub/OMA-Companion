/**
 * Spieleliste-Swipen — client-sicher (keine Imports aus Prisma/Server).
 *
 * Drei Entscheidungen je Spiel: "Am Start" (hat es und würde spielen — öffentlich sichtbar),
 * "Würde ich holen" (Wunschliste, bekommt Angebots-Hinweise) und "Nicht meins" (privat). Sie lösen die
 * alten Markierungen "Hab ich" und "Würde ich zocken" ab; wer eine davon gesetzt hatte, gilt als
 * "Am Start" (effectiveStatus), bis das Backfill-Skript sie übernommen hat.
 */

export const SWIPE_STATUSES = ["in", "wish", "out"] as const;
export type SwipeStatus = (typeof SWIPE_STATUSES)[number];

export const SWIPE_LABELS: Record<SwipeStatus, string> = {
  in: "Am Start",
  wish: "Würde ich holen",
  out: "Nicht meins",
};

export function isSwipeStatus(v: unknown): v is SwipeStatus {
  return typeof v === "string" && (SWIPE_STATUSES as readonly string[]).includes(v);
}

/** Status einer Reaktion — alte Markierungen ("Hab ich"/"Würde ich zocken") gelten als "Am Start". */
export function effectiveStatus(r: { status: string | null; owns?: boolean; wantPlay?: boolean } | null | undefined): SwipeStatus | null {
  if (!r) return null;
  if (isSwipeStatus(r.status)) return r.status;
  return r.owns || r.wantPlay ? "in" : null;
}

/** Nach so vielen Tagen fragt der Stapel "Am Start" und "Würde ich holen" erneut ab — Vorlieben ändern
 *  sich. "Nicht meins" kommt nie wieder. */
export const RECHECK_DAYS = 180;

export function shouldReask(status: SwipeStatus | null, decidedAt: Date | null, now = new Date()): boolean {
  if (status === null) return true;
  if (status === "out") return false;
  if (!decidedAt) return false; // übernommene Alt-Markierungen: erst einmal stehen lassen
  return now.getTime() - decidedAt.getTime() > RECHECK_DAYS * 24 * 60 * 60_000;
}

/** Ab so vielen Squad-Mitgliedern, die bei einem Spiel "Am Start" sind, gibt es ein Match. */
export const MATCH_MIN = 3;

/** Welche Mitglieder eines Matches (neu) benachrichtigt werden: beim ersten Erreichen der Schwelle alle,
 *  danach nur wer neu dazukommt — und nur, wenn das Match dadurch wächst (Rückgängig und erneut
 *  "Am Start" benachrichtigt nicht doppelt). Rein, siehe Tests. */
export function matchRecipients(inMembers: string[], alreadyNotifiedSize: number | null, newcomer: string): string[] {
  if (inMembers.length < MATCH_MIN) return [];
  if (alreadyNotifiedSize === null) return inMembers;
  if (inMembers.length <= alreadyNotifiedSize) return [];
  return inMembers.includes(newcomer) ? [newcomer] : [];
}

/** Link "Runde planen": Event-Assistent mit Spiel und Squad vorbelegt. */
export function planRoundUrl(gameSlug: string, squadId: string): string {
  return `/admin/events/new?mode=event&game=${encodeURIComponent(gameSlug)}&squadId=${encodeURIComponent(squadId)}`;
}

/** Jede wievielte Karte des Stapels ein Steam-Trend ist (Spiele, die noch nicht in der Liste stehen). */
export const STEAM_EVERY = 4;

/** Reihenfolge des Stapels: Eigene Karten (Events → beliebt → neu, schon vorsortiert) und dazwischen
 *  jede STEAM_EVERY-te Karte ein Steam-Trend. Gehen eine Sorte aus, folgt der Rest der anderen. */
export function interleaveDeck<A, B>(own: A[], steam: B[], every = STEAM_EVERY): (A | B)[] {
  const out: (A | B)[] = [];
  let i = 0;
  let j = 0;
  while (i < own.length || j < steam.length) {
    const steamTurn = (out.length + 1) % every === 0;
    if ((steamTurn && j < steam.length) || i >= own.length) out.push(steam[j++]);
    else out.push(own[i++]);
  }
  return out;
}
