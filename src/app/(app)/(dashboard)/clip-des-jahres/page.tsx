import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Clapperboard, ChevronRight } from "@/components/icons";
import ClipVotingClient from "../clip-des-monats/ClipVotingClient";
import ClipWinnerCard from "@/components/ClipWinnerCard";
import ClipsNav from "@/components/clips/ClipsNav";
import ClipVoteHeader from "@/components/clips/ClipVoteHeader";
import { seededShuffle } from "@/lib/clip-order";

/**
 * Clips → Reiter "Clip des Jahres": laufende Jahreswahl zuerst (alle Monatssieger Dez–Nov),
 * darunter der letzte Clip des Jahres.
 */
export default async function ClipDesJahresPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const [activeContest, finishedContest] = await Promise.all([
    prisma.yearlyClipContest.findFirst({ where: { status: "voting" }, orderBy: { year: "desc" } }),
    prisma.yearlyClipContest.findFirst({ where: { status: "finished" }, orderBy: { year: "desc" } }),
  ]);

  const [activeNominations, finishedWinners] = await Promise.all([
    activeContest
      ? prisma.clipNomination.findMany({
          where: { id: { in: activeContest.nominationIds } },
          include: { submittedBy: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
        })
      : Promise.resolve([]),
    finishedContest
      ? prisma.clipNomination.findMany({
          where: { id: { in: finishedContest.winnerNominationIds } },
          include: { submittedBy: { select: { name: true, username: true } } },
        })
      : Promise.resolve([]),
  ]);

  let voteCounts: Record<string, number> = {};
  let userVoteNominationId: string | null = null;
  if (activeContest) {
    const counts = await prisma.yearlyClipContestVote.groupBy({
      by: ["nominationId"],
      where: { contestId: activeContest.id },
      _count: true,
    });
    voteCounts = Object.fromEntries(counts.map((c) => [c.nominationId, c._count]));

    if (userId) {
      const vote = await prisma.yearlyClipContestVote.findUnique({
        where: { contestId_userId: { contestId: activeContest.id, userId } },
      });
      userVoteNominationId = vote?.nominationId ?? null;
    }
  }

  const nominations = activeContest ? seededShuffle(activeNominations, `${userId ?? "gast"}:${activeContest.id}`) : [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ClipsNav active="jahr" />

      {/* ── Laufende Jahreswahl ── */}
      {activeContest ? (
        <section aria-label="Abstimmung" className="space-y-4">
          <ClipVoteHeader
            title={`Clip des Jahres ${activeContest.year}`}
            subtitle={`Zur Wahl stehen alle Clips des Monats von Dezember ${activeContest.year - 1} bis November ${activeContest.year}.`}
            clipCount={nominations.length}
            endsAt={activeContest.votingEndsAt}
            participationCoins={activeContest.participationCoins}
            rewardCoins={activeContest.rewardCoins}
          />
          <ClipVotingClient
            contestId={activeContest.id}
            voteEndpoint="/api/clip-of-year/vote"
            nominations={nominations.map((n) => ({
              id: n.id,
              clipUrl: n.clipUrl,
              thumbnailUrl: n.thumbnailUrl,
              clipTitle: n.customTitle ?? n.clipTitle,
              originalTitle: n.clipTitle,
              customTitle: n.customTitle,
              submittedBy: n.submittedBy,
              twitchCreatorLogin: n.twitchCreatorLogin,
              partnerTwitchLogin: n.partnerTwitchLogin,
              voteCount: voteCounts[n.id] ?? 0,
            }))}
            initialVoteId={userVoteNominationId}
            isLoggedIn={!!userId}
            embedParent={embedParent}
          />
        </section>
      ) : (
        <div className="glass rounded-2xl p-6 text-center text-gray-400">
          <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Gerade läuft keine Wahl zum Clip des Jahres.</p>
          <p className="text-sm text-gray-500 mt-1">
            Sie startet im Dezember, sobald der Clip des Monats November feststeht. Zur Wahl stehen alle Monatssieger des Jahres.
          </p>
          <Link href="/clip-galerie" className="mt-3 inline-flex items-center gap-1 text-sm text-violet-300 hover:text-violet-200">
            Alle Monatssieger in der Galerie <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Letzter Clip des Jahres ── */}
      {finishedWinners.length > 0 && finishedContest && (
        <section aria-label="Letzter Clip des Jahres" className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Clip des Jahres {finishedContest.year}</h2>
            {finishedWinners.length > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Gleichstand · {finishedWinners.length} Sieger
              </span>
            )}
          </div>
          <div className={`grid gap-4 ${finishedWinners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
            {finishedWinners.map((winner) => (
              <ClipWinnerCard key={winner.id} winner={winner} embedParent={embedParent}
                rewardCoins={finishedContest.rewardCoins} badgeLabel="Clip des Jahres" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
