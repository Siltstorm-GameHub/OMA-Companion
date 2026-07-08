import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import YearlyContestManager from "./YearlyContestManager";

export default async function AdminClipOfYearPage() {
  await requireRole("moderator");

  const contests = await prisma.yearlyClipContest.findMany({ orderBy: { year: "desc" } });

  const allNominationIds = [...new Set(contests.flatMap((c) => c.nominationIds))];
  const [nominations, voteCounts] = await Promise.all([
    prisma.clipNomination.findMany({
      where: { id: { in: allNominationIds } },
      include: { submittedBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.yearlyClipContestVote.groupBy({ by: ["contestId", "nominationId"], _count: true }),
  ]);
  const nominationById = new Map(nominations.map((n) => [n.id, n]));

  const contestsWithNominations = contests.map((c) => {
    const countsForContest = voteCounts.filter((v) => v.contestId === c.id);
    return {
      ...c,
      nominations: c.nominationIds
        .map((id) => nominationById.get(id))
        .filter((n): n is NonNullable<typeof n> => !!n)
        .map((n) => ({
          ...n,
          _count: { votes: countsForContest.find((v) => v.nominationId === n.id)?._count ?? 0 },
        })),
      _count: { votes: countsForContest.reduce((sum, v) => sum + v._count, 0) },
    };
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">Clip des Jahres – Wahlen</h1>
      <p className="text-sm text-gray-500 -mt-6">
        Startet automatisch Mitte Dezember (sobald die November-Abstimmung zum Clip des Monats endet) und berücksichtigt alle Monatssieger von Dezember des Vorjahres bis November des aktuellen Jahres.
      </p>
      <YearlyContestManager contests={contestsWithNominations} />
    </div>
  );
}
