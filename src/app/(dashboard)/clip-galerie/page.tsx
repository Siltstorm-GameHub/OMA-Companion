import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Images } from "lucide-react";
import ClipWinnerCard from "@/components/ClipWinnerCard";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Nomination = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  submittedBy: { name: string | null; username: string | null } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
};

type GalleryEntry = {
  key: string;
  sortDate: Date;
  label: string;
  badgeLabel: string;
  rewardCoins: number;
  winnerIds: string[];
};

export default async function ClipGaleriePage() {
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const [finishedYearly, finishedMonthly] = await Promise.all([
    prisma.yearlyClipContest.findMany({
      where: { status: "finished" },
      orderBy: { year: "desc" },
    }),
    prisma.monthlyClipContest.findMany({
      where: { status: "finished" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
  ]);

  // Ein Monatssieger verschwindet aus der Galerie, sobald die Clip-des-Jahres-Wahl
  // für seinen Zeitraum abgeschlossen ist (Dez(Y-1)–Nov(Y) → Jahr Y).
  const finishedYearlyYears = new Set(finishedYearly.map((c) => c.year));
  const visibleMonthly = finishedMonthly.filter((c) => {
    const coveringYear = c.month === 12 ? c.year + 1 : c.year;
    return !finishedYearlyYears.has(coveringYear);
  });

  const entries: GalleryEntry[] = [
    ...finishedYearly.map((c): GalleryEntry => ({
      key: `year-${c.id}`,
      sortDate: new Date(c.year, 10, 30),
      label: `Clip des Jahres ${c.year}`,
      badgeLabel: "Clip des Jahres",
      rewardCoins: c.rewardCoins,
      winnerIds: c.winnerNominationIds,
    })),
    ...visibleMonthly.map((c): GalleryEntry => ({
      key: `month-${c.id}`,
      sortDate: c.periodEnd,
      label: `Clip des Monats – ${MONTH_NAMES[c.month - 1]} ${c.year}`,
      badgeLabel: "Gewinner",
      rewardCoins: c.rewardCoins,
      winnerIds: c.winnerNominationIds,
    })),
  ].sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

  const allWinnerIds = [...new Set(entries.flatMap((e) => e.winnerIds))];
  const nominations = await prisma.clipNomination.findMany({
    where: { id: { in: allWinnerIds } },
    include: { submittedBy: { select: { name: true, username: true } } },
  });
  const nominationById = new Map<string, Nomination>(nominations.map((n) => [n.id, n]));

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center gap-2">
        <Images className="w-5 h-5 text-amber-400" />
        <h1 className="text-lg font-bold text-white">Clip-Galerie</h1>
      </div>

      {entries.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-gray-500">
          <Images className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Noch keine Gewinner-Clips vorhanden.</p>
        </div>
      )}

      {entries.map((entry) => {
        const winners = entry.winnerIds.map((id) => nominationById.get(id)).filter((n): n is Nomination => !!n);
        if (winners.length === 0) return null;
        return (
          <section key={entry.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{entry.label}</h2>
              {winners.length > 1 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  Gleichstand · {winners.length} Gewinner
                </span>
              )}
            </div>
            <div className={`grid gap-4 ${winners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
              {winners.map((winner) => (
                <ClipWinnerCard
                  key={winner.id}
                  winner={winner}
                  embedParent={embedParent}
                  rewardCoins={entry.rewardCoins}
                  badgeLabel={entry.badgeLabel}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
