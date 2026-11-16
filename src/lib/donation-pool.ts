import { getBerlinDateParts } from "./time";

/*
 * Spendenpool: Wie das Guthaben verteilt wird.
 *
 * 1. Fixkosten zuerst: Jede aktive Fixkosten-Position bekommt eine Rücklage.
 *    - monatlich: die nächste Zahlung ist immer voll reserviert
 *    - jährlich: wird über 12 Monate angespart (z.B. 3 Monate vor Fälligkeit = 9/12)
 *    Reihenfolge nach Fälligkeit.
 * 2. Was übrig bleibt, füllt die Ziele (PoolIdea) der Reihe nach auf.
 */

export type FixedCostInput = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  interval: string;
  nextDueAt: Date | string;
};

export type GoalInput = {
  id: string;
  title: string;
  description: string | null;
  estimatedCost: number | null;
};

export type FixedCostShare = FixedCostInput & {
  yearly: boolean;
  /** Rücklage, die gerade für diese Position nötig ist */
  target: number;
  /** davon durch das Guthaben gedeckt */
  covered: number;
  /** Monate bis zur Fälligkeit (Kalendermonate, Berlin); ≤ 0 = fällig */
  monthsUntilDue: number;
};

export type GoalShare = GoalInput & { covered: number };

export type NextTarget =
  | { kind: "fixed"; target: number; covered: number }
  | { kind: "goal"; goal: GoalShare; index: number; target: number; covered: number }
  | { kind: "none" };

export type PoolAllocation = {
  balance: number;
  fixed: FixedCostShare[];
  fixedTarget: number;
  fixedCovered: number;
  fixedComplete: boolean;
  /** Laufende Kosten umgerechnet auf einen Monat (jährlich / 12) */
  monthlyRunRate: number;
  goals: GoalShare[];
  /** Guthaben, das nach Fixkosten für Ziele frei ist */
  freeForGoals: number;
  next: NextTarget;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const isYearly = (interval: string) => interval === "yearly";

/** Kalendermonate (Berlin) von `now` bis `due`; im Fälligkeitsmonat 0, überfällig negativ. */
export function monthsUntil(due: Date | string, now: Date = new Date()): number {
  const d = getBerlinDateParts(due);
  const n = getBerlinDateParts(now);
  return (d.year - n.year) * 12 + (d.month - n.month);
}

/** Rücklage, die für eine Fixkosten-Position gerade gebraucht wird. */
export function reserveTarget(cost: Pick<FixedCostInput, "amount" | "interval" | "nextDueAt">, now: Date = new Date()): number {
  if (!isYearly(cost.interval)) return round2(cost.amount);
  const m = monthsUntil(cost.nextDueAt, now);
  if (m <= 0) return round2(cost.amount);
  const share = Math.min(1, Math.max(0, (12 - m) / 12));
  return round2(cost.amount * share);
}

export function monthlyRunRate(costs: Pick<FixedCostInput, "amount" | "interval">[]): number {
  return round2(costs.reduce((s, c) => s + (isYearly(c.interval) ? c.amount / 12 : c.amount), 0));
}

export function allocatePool(
  balance: number,
  fixedCosts: FixedCostInput[],
  goals: GoalInput[],
  now: Date = new Date(),
): PoolAllocation {
  let remaining = Math.max(0, round2(balance));

  const fixed = [...fixedCosts]
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime())
    .map((c): FixedCostShare => {
      const target = reserveTarget(c, now);
      const covered = round2(Math.min(target, remaining));
      remaining = round2(remaining - covered);
      return { ...c, yearly: isYearly(c.interval), target, covered, monthsUntilDue: monthsUntil(c.nextDueAt, now) };
    });

  const fixedTarget = round2(fixed.reduce((s, c) => s + c.target, 0));
  const fixedCovered = round2(fixed.reduce((s, c) => s + c.covered, 0));
  const fixedComplete = fixedCovered >= fixedTarget;
  const freeForGoals = remaining;

  const goalShares = goals.map((g): GoalShare => {
    if (g.estimatedCost == null || g.estimatedCost <= 0) return { ...g, covered: 0 };
    const covered = round2(Math.min(g.estimatedCost, remaining));
    remaining = round2(remaining - covered);
    return { ...g, covered };
  });

  let next: NextTarget = { kind: "none" };
  if (!fixedComplete) {
    next = { kind: "fixed", target: fixedTarget, covered: fixedCovered };
  } else {
    const index = goalShares.findIndex((g) => g.estimatedCost != null && g.estimatedCost > 0 && g.covered < g.estimatedCost);
    if (index >= 0) {
      const goal = goalShares[index];
      next = { kind: "goal", goal, index, target: goal.estimatedCost!, covered: goal.covered };
    }
  }

  return {
    balance: round2(balance),
    fixed,
    fixedTarget,
    fixedCovered,
    fixedComplete,
    monthlyRunRate: monthlyRunRate(fixedCosts),
    goals: goalShares,
    freeForGoals,
    next,
  };
}

type YM = { year: number; month: number };

const ymKey = (y: YM) => y.year * 12 + (y.month - 1);

/** Durchschnittliche Spenden der letzten `count` abgeschlossenen Kalendermonate (fehlende Monate = 0). */
export function averageMonthlyDonations(months: (YM & { total: number })[], now: Date = new Date(), count = 3): number {
  const n = getBerlinDateParts(now);
  const current = ymKey(n);
  const sum = months
    .filter((m) => { const k = ymKey(m); return k < current && k >= current - count; })
    .reduce((s, m) => s + m.total, 0);
  return round2(sum / count);
}

/**
 * Streak eines Spenders: aufeinanderfolgende Monate bis jetzt. Ist der aktuelle Monat noch nicht
 * eingetragen (Spenden trägt ein Admin nach), zählt die Serie ab dem Vormonat weiter.
 */
export function donorStreak(entries: YM[], now: Date = new Date()): { streak: number; thisMonth: boolean } {
  const keys = new Set(entries.map(ymKey));
  const current = ymKey(getBerlinDateParts(now));
  const thisMonth = keys.has(current);
  let k = thisMonth ? current : current - 1;
  let streak = 0;
  while (keys.has(k)) { streak++; k--; }
  return { streak, thisMonth };
}

export type LedgerEntry =
  | { kind: "in"; key: string; year: number; month: number; amount: number; donors: number }
  | { kind: "out"; key: string; year: number; month: number; amount: number; title: string; description: string | null; date: Date; fixed: boolean };

/** Kassenbuch: Spenden je Monat (Summe) und einzelne Ausgaben, neueste zuerst. */
export function buildLedger(
  months: (YM & { total: number; donors: number })[],
  expenses: { id: string; title: string; description: string | null; amount: number; date: Date | string; fixedCostId?: string | null }[],
): LedgerEntry[] {
  const entries: (LedgerEntry & { sort: number })[] = [
    ...months.map((m) => ({
      kind: "in" as const, key: `in-${m.year}-${m.month}`, year: m.year, month: m.month,
      amount: m.total, donors: m.donors,
      // Spenden eines Monats stehen über dessen Ausgaben
      sort: ymKey(m) * 100 + 99,
    })),
    ...expenses.map((e) => {
      const p = getBerlinDateParts(e.date);
      return {
        kind: "out" as const, key: `out-${e.id}`, year: p.year, month: p.month,
        amount: e.amount, title: e.title, description: e.description, date: new Date(e.date),
        fixed: !!e.fixedCostId,
        sort: ymKey(p) * 100 + p.day,
      };
    }),
  ];
  entries.sort((a, b) => b.sort - a.sort);
  for (const e of entries) delete (e as { sort?: number }).sort;
  return entries;
}

/** Nächste Fälligkeit nach einer Zahlung: ein Intervall weiter. */
export function advanceDueDate(due: Date | string, interval: string): Date {
  const d = new Date(due);
  const next = new Date(d);
  if (isYearly(interval)) next.setUTCFullYear(d.getUTCFullYear() + 1);
  else next.setUTCMonth(d.getUTCMonth() + 1);
  // 31. Jan + 1 Monat → nicht in den März rutschen
  if (!isYearly(interval) && next.getUTCDate() !== d.getUTCDate()) next.setUTCDate(0);
  return next;
}
