import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import HighlightClipsClient from "./HighlightClipsClient";

export default async function AdminHighlightClipsPage() {
  await requireRole("moderator");

  const [monthlyContests, partners, yearlyContestsRaw] = await Promise.all([
    prisma.monthlyClipContest.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        nominations: {
          include: {
            submittedBy: { select: { id: true, name: true, username: true } },
            _count: { select: { votes: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { votes: true } },
      },
    }),
    prisma.partner.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { twitchLogin: true },
    }),
    prisma.yearlyClipContest.findMany({ orderBy: { year: "desc" } }),
  ]);

  const hasActiveMonthlyContest = monthlyContests.some((c) => c.status === "voting");

  const allNominationIds = [...new Set(yearlyContestsRaw.flatMap((c) => c.nominationIds))];
  const [nominations, voteCounts] = await Promise.all([
    prisma.clipNomination.findMany({
      where: { id: { in: allNominationIds } },
      include: { submittedBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.yearlyClipContestVote.groupBy({ by: ["contestId", "nominationId"], _count: true }),
  ]);
  const nominationById = new Map(nominations.map((n) => [n.id, n]));

  const yearlyContests = yearlyContestsRaw.map((c) => {
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
    <HighlightClipsClient
      monthlyContests={monthlyContests}
      partnerLogins={partners.map((p) => p.twitchLogin)}
      hasActiveMonthlyContest={hasActiveMonthlyContest}
      yearlyContests={yearlyContests}
    />
  );
}
