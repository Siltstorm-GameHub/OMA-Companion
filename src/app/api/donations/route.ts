import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: Gesamtpool, Ausgaben, Spender-Übersicht (ohne Beträge), Monats-Historie
export async function GET() {
  const [donations, expenses] = await Promise.all([
    prisma.donation.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.poolExpense.findMany({ orderBy: { date: "desc" } }),
  ]);

  // Gesamtpool & Bilanz
  const totalPool    = donations.reduce((s, d) => s + d.amount, 0);
  const totalSpent   = expenses.reduce((s, e) => s + e.amount, 0);
  const balance      = totalPool - totalSpent;
  const publicExpenses = expenses.map(e => ({
    id: e.id, title: e.title, description: e.description,
    amount: e.amount, date: e.date,
  }));

  // Monats-Historie: Gesamtbetrag pro Monat (kein User-Betrag)
  const monthlyMap = new Map<string, { year: number; month: number; total: number; donorIds: Set<string> }>();
  for (const d of donations) {
    const key = `${d.year}-${d.month}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.total += d.amount;
      existing.donorIds.add(d.userId);
    } else {
      monthlyMap.set(key, { year: d.year, month: d.month, total: d.amount, donorIds: new Set([d.userId]) });
    }
  }
  const months = Array.from(monthlyMap.values())
    .map(({ donorIds, ...rest }) => ({ ...rest, donors: donorIds.size }))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  // Spender: Streak berechnen (ohne Beträge)
  const userMap = new Map<string, { user: { id: string; name: string | null; image: string | null }; entries: { year: number; month: number }[] }>();
  for (const d of donations) {
    if (!userMap.has(d.userId)) {
      userMap.set(d.userId, { user: d.user, entries: [] });
    }
    userMap.get(d.userId)!.entries.push({ year: d.year, month: d.month });
  }

  const donors = Array.from(userMap.values()).map(({ user, entries }) => {
    // Deduplizieren: mehrere Spenden im selben Monat zählen als ein Monat für die Streak
    const uniqueMonths = Array.from(
      new Map(entries.map(e => [`${e.year}-${e.month}`, e])).values()
    );
    const streak = calcStreak(uniqueMonths);
    const totalMonths = uniqueMonths.length;
    return { user, streak, totalMonths };
  }).sort((a, b) => b.streak - a.streak || b.totalMonths - a.totalMonths);

  return NextResponse.json({ totalPool, totalSpent, balance, expenses: publicExpenses, months, donors });
}

function calcStreak(entries: { year: number; month: number }[]): number {
  if (entries.length === 0) return 0;
  // Sortiere absteigend (neuester Monat zuerst)
  const sorted = [...entries].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );

  const now = new Date();
  let checkYear  = now.getFullYear();
  let checkMonth = now.getMonth() + 1; // aktuelle Monat

  let streak = 0;
  for (const entry of sorted) {
    if (entry.year === checkYear && entry.month === checkMonth) {
      streak++;
      // Gehe einen Monat zurück
      checkMonth--;
      if (checkMonth === 0) { checkMonth = 12; checkYear--; }
    } else {
      break;
    }
  }
  return streak;
}
