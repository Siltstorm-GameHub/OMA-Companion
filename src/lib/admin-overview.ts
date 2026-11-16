import { txCurrency, txLabel, txSource } from "./coin-ledger";

/*
 * Admin-Übersicht: reine Hilfsfunktionen (ohne DB) — Wartezeiten, auffällige Buchungen, Wochen-Puls.
 * Die Abfragen dazu liegen in lib/admin-inbox.ts.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Ab so langer Wartezeit gilt ein vorbeigegangenes, nicht abgeschlossenes Event als überfällig */
export const OVERDUE_LATE_MS = 2 * DAY;
/** Ab diesem Betrag (Münzen, ohne Shop-Käufe) gilt eine Buchung als auffällig */
export const NOTABLE_AMOUNT = 1000;

/** "seit 20 Min" / "seit 3 Std" / "seit 1 Tag" / "seit 4 Tagen" */
export function sinceLabel(since: Date | string, now: Date = new Date()): string {
  const ms = Math.max(0, now.getTime() - new Date(since).getTime());
  if (ms < HOUR) return `seit ${Math.max(1, Math.floor(ms / MIN))} Min`;
  if (ms < DAY) return `seit ${Math.floor(ms / HOUR)} Std`;
  const d = Math.floor(ms / DAY);
  return `seit ${d} ${d === 1 ? "Tag" : "Tagen"}`;
}

export function isLate(since: Date | string, now: Date = new Date(), limitMs = OVERDUE_LATE_MS): boolean {
  return now.getTime() - new Date(since).getTime() >= limitMs;
}

export type NotableKind = "korrektur" | "manuell" | "gross";
export const NOTABLE_LABELS: Record<NotableKind, string> = {
  korrektur: "Korrektur",
  manuell: "manuell gebucht",
  gross: "großer Betrag",
};

/** Warum eine Buchung auffällt — oder null. Shop-Käufe zählen nie als "großer Betrag". */
export function notableKind(tx: { amount: number; reason: string }): NotableKind | null {
  const r = tx.reason.trim();
  if (r.startsWith("⚙️") || r.startsWith("⚙")) return "manuell";
  if (r.startsWith("[Korrektur]") || /(^|\s)Korrektur:/.test(r)) return "korrektur";
  if (txCurrency(r) === "coins" && txSource(r) !== "shop" && Math.abs(tx.amount) >= NOTABLE_AMOUNT) return "gross";
  return null;
}

export type NotableTx = { id: string; amount: number; label: string; kind: NotableKind; rank: boolean; userName: string; userId: string; createdAt: Date };

export function notableTransactions(
  txs: { id: string; amount: number; reason: string; createdAt: Date; user: { id: string; name: string | null; username: string | null } }[],
  limit = 8,
): NotableTx[] {
  const out: NotableTx[] = [];
  for (const t of txs) {
    const kind = notableKind(t);
    if (!kind) continue;
    out.push({
      id: t.id, amount: t.amount, label: txLabel(t.reason), kind, rank: txCurrency(t.reason) === "rank",
      userName: t.user.username ?? t.user.name ?? "Unbekannt", userId: t.user.id, createdAt: t.createdAt,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export type PulseValue = { value: number; delta: number };
export const pulse = (current: number, previous: number): PulseValue => ({ value: current, delta: current - previous });

/** Münzen, die in einem Zeitraum vergeben wurden: positive Münz-Buchungen ohne Korrekturen/Shop */
export function coinsAwarded(txs: { amount: number; reason: string }[]): number {
  return txs.reduce((s, t) => (t.amount > 0 && txCurrency(t.reason) === "coins" && txSource(t.reason) !== "shop" ? s + t.amount : s), 0);
}
