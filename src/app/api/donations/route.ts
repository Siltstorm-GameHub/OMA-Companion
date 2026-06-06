import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: Gesamtpool, Spender-Übersicht (ohne Beträge), Monats-Historie
export async function GET() {
  const donations = await prisma.donation.findMany({
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  // Gesamtpool
  const totalPool = donations.reduce((s, d) => s + d.amount, 0);

  // Monats-Historie: Gesamtbetrag pro Monat (kein User-Betrag)
  const monthlyMap = new Map<string, { year: number; month: number; total: number; donors: number }>();
  for (const d of donations) {
    const key = `${d.year}-${d.month}`;
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.total += d.amount;
      existing.donors += 1;
    } else {
      monthlyMap.set(key, { year: d.year, month: d.month, total: d.amount, donors: 1 });
    }
  }
  const months = Array.from(monthlyMap.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );

  // Spender: Streak berechnen (ohne Beträge)
  const userMap = new Map<string, { user: { id: string; name: string | null; image: string | null }; entries: { year: number; month: number }[] }>();
  for (const d of donations) {
    if (!userMap.has(d.userId)) {
      userMap.set(d.userId, { user: d.user, entries: [] });
    }
    userMap.get(d.userId)!.entries.push({ year: d.year, month: d.month });
  }

  const donors = Array.from(userMap.values()).map(({ user, entries }) => {
    const streak = calcStreak(entries);
    const totalMonths = entries.length;
    return { user, streak, totalMonths };
  }).sort((a, b) => b.streak - a.streak || b.totalMonths - a.totalMonths);

  return NextResponse.json({ totalPool, months, donors });
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
