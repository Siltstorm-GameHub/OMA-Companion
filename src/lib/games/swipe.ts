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

/** Ab so vielen Usern, die bei einem Spiel "Am Start" sind, gibt es ein Match (man selbst + einer). */
export const MATCH_MIN = 2;

/** Wer über ein Match (neu) benachrichtigt wird: jeder, der am Start ist und für das Spiel noch nie
 *  benachrichtigt wurde — also beim ersten Match beide, danach nur wer neu dazukommt (Rückgängig und
 *  erneut "Am Start" benachrichtigt nicht doppelt). Rein, siehe Tests. */
export function matchRecipients(inUsers: string[], alreadyNotified: Set<string>): string[] {
  if (inUsers.length < MATCH_MIN) return [];
  return inUsers.filter(id => !alreadyNotified.has(id));
}

/** Mitspieler eines Matches als Text: "Anna", "Anna und Ben", "Anna, Ben, Cem und 3 weitere". */
export function othersLabel(match: { count: number; others: { name: string }[] }): string {
  const names = match.others.slice(0, 3).map(o => o.name);
  const rest = match.count - 1 - names.length;
  if (rest > 0) return `${names.join(", ")} und ${rest} weitere`;
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}

/** Link "Runde planen": Event-Assistent mit dem Spiel vorbelegt. */
export function planRoundUrl(gameSlug: string): string {
  return `/events/verwalten/neu?mode=event&game=${encodeURIComponent(gameSlug)}`;
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
