import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { Metadata } from "next";
import DonationPoolView, { type PoolDonor } from "@/components/support/DonationPoolView";
import { allocatePool, averageMonthlyDonations, buildLedger, donorStreak } from "@/lib/donation-pool";
import { getBerlinDateParts } from "@/lib/time";

export const metadata: Metadata = { title: "Spendenpool | OMA Hub" };

/** OMA Hub → Reiter Spendenpool (früher /donations; alte Links leiten per next.config hierher). */
export default async function HubDonationsPage() {
  const now = new Date();
  const [session, monthlyGroups, donorGroups, expenses, ideas, fixedCosts] = await Promise.all([
    auth(),
    // Monatssummen (Beträge nur aggregiert, nie je Person)
    prisma.donation.groupBy({
      by: ["year", "month"],
      _sum: { amount: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    // Wer in welchem Monat dabei war (Streak, Unterstützer-Wand, Spender je Monat)
    prisma.donation.groupBy({ by: ["userId", "year", "month"] }),
    prisma.poolExpense.findMany({ orderBy: { date: "desc" } }),
    prisma.poolIdea.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.poolFixedCost.findMany({ where: { active: true }, orderBy: { nextDueAt: "asc" } }),
  ]);
  const myId = session?.user?.id ?? null;

  const donorsPerMonth = new Map<string, number>();
  const entriesByUser = new Map<string, { year: number; month: number }[]>();
  for (const g of donorGroups) {
    const key = `${g.year}-${g.month}`;
    donorsPerMonth.set(key, (donorsPerMonth.get(key) ?? 0) + 1);
    if (!entriesByUser.has(g.userId)) entriesByUser.set(g.userId, []);
    entriesByUser.get(g.userId)!.push({ year: g.year, month: g.month });
  }

  const months = monthlyGroups.map((g) => ({
    year: g.year,
    month: g.month,
    total: g._sum.amount ?? 0,
    donors: donorsPerMonth.get(`${g.year}-${g.month}`) ?? 0,
  }));

  const totalIn = months.reduce((s, m) => s + m.total, 0);
  const totalOut = expenses.reduce((s, e) => s + e.amount, 0);

  const donorIds = [...entriesByUser.keys()];
  const donorUsers = donorIds.length
    ? await prisma.user.findMany({ where: { id: { in: donorIds } }, select: { id: true, name: true, image: true } })
    : [];

  const donors: PoolDonor[] = donorUsers
    .map((u) => {
      const entries = entriesByUser.get(u.id)!;
      const { streak, thisMonth } = donorStreak(entries, now);
      return { ...u, streak, thisMonth, totalMonths: entries.length };
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "de", { sensitivity: "base" }));

  const myEntries = myId ? entriesByUser.get(myId) ?? [] : [];
  const me = myId ? { id: myId, ...donorStreak(myEntries, now), totalMonths: myEntries.length } : null;

  const data = {
    totalIn,
    totalOut,
    pool: allocatePool(totalIn - totalOut, fixedCosts, ideas, now),
    avgDonations: averageMonthlyDonations(months, now),
    ledger: buildLedger(months, expenses),
    donors,
    me,
    currentMonth: getBerlinDateParts(now).month,
  };

  return <DonationPoolView data={data} />;
}
