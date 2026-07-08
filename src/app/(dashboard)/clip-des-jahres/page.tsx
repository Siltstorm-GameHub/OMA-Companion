import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Clapperboard } from "lucide-react";
import ClipVotingClient from "../clip-des-monats/ClipVotingClient";
import ClipWinnerCard from "@/components/ClipWinnerCard";
import CountdownBadge from "@/components/CountdownBadge";

export default async function ClipDesJahresPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const activeContest = await prisma.yearlyClipContest.findFirst({
    where: { status: "voting" },
    orderBy: { year: "desc" },
  });

  const finishedContest = await prisma.yearlyClipContest.findFirst({
    where: { status: "finished" },
    orderBy: { year: "desc" },
  });

  const [activeNominations, finishedWinners] = await Promise.all([
    activeContest
      ? prisma.clipNomination.findMany({
          where: { id: { in: activeContest.nominationIds } },
          include: { submittedBy: { select: { id: true, name: true, username: true, image: true } } },
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

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Clip des Jahres (letzte Wahl) ──────────────────────────────── */}
      {finishedWinners.length > 0 && finishedContest && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Clip des Jahres {finishedContest.year}</h2>
            {finishedWinners.length > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Gleichstand · {finishedWinners.length} Gewinner
              </span>
            )}
          </div>
          <div className={`grid gap-4 ${finishedWinners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {finishedWinners.map((winner) => (
              <ClipWinnerCard
                key={winner.id}
                winner={winner}
                embedParent={embedParent}
                rewardCoins={finishedContest.rewardCoins}
                badgeLabel="Clip des Jahres"
              />
            ))}
          </div>
          <Link href="/clip-galerie" className="inline-block text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Zur Clip-Galerie →
          </Link>
        </section>
      )}

      {/* ── Laufende Abstimmung ────────────────────────────────────────── */}
      {activeContest ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">Clip des Jahres {activeContest.year}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeNominations.length} Clips zur Auswahl — alle Clips des Monats aus Dezember {activeContest.year - 1} bis November {activeContest.year}
              </p>
            </div>
            <CountdownBadge endsAt={activeContest.votingEndsAt} />
          </div>

          {(activeContest.participationCoins > 0 || activeContest.rewardCoins > 0) && (
            <div className={`glass rounded-2xl p-4 grid ${
              activeContest.participationCoins > 0 && activeContest.rewardCoins > 0 ? "grid-cols-2 divide-x divide-white/[0.06]" : "grid-cols-1"
            }`}>
              {activeContest.participationCoins > 0 && (
                <div className="text-center px-2">
                  <p className="text-2xl font-black text-[#9146ff] tabular-nums">{activeContest.participationCoins}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Münzen fürs Abstimmen</p>
                </div>
              )}
              {activeContest.rewardCoins > 0 && (
                <div className="text-center px-2">
                  <p className="text-2xl font-black text-amber-400 tabular-nums">{activeContest.rewardCoins}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Münzen für den Gewinner</p>
                </div>
              )}
            </div>
          )}

          <ClipVotingClient
            contestId={activeContest.id}
            voteEndpoint="/api/clip-of-year/vote"
            nominations={activeNominations.map((n) => ({
              id: n.id,
              clipUrl: n.clipUrl,
              thumbnailUrl: n.thumbnailUrl,
              clipTitle: n.clipTitle,
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
        <div className="glass rounded-2xl p-8 text-center text-gray-500">
          <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aktuell läuft keine Abstimmung.</p>
          <p className="text-sm mt-1">Die nächste Wahl zum Clip des Jahres startet Mitte Dezember, sobald die Abstimmung zum Clip des Monats November beendet ist.</p>
        </div>
      )}
    </div>
  );
}
