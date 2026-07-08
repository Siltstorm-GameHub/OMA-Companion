import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Clapperboard, Images } from "lucide-react";
import ClipVotingClient from "./ClipVotingClient";
import ClipWinnerCard from "@/components/ClipWinnerCard";
import CountdownBadge from "@/components/CountdownBadge";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function ClipDesMonatsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const activeContest = await prisma.monthlyClipContest.findFirst({
    where: { status: "voting" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        include: {
          submittedBy: { select: { id: true, name: true, username: true, image: true } },
          _count: { select: { votes: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const finishedContest = await prisma.monthlyClipContest.findFirst({
    where: { status: "finished" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      nominations: {
        include: {
          submittedBy: { select: { id: true, name: true, username: true } },
          _count: { select: { votes: true } },
        },
      },
    },
  });

  // Sobald die Clip-des-Jahres-Wahl für den Zeitraum dieses Monatssiegers abgeschlossen ist,
  // verschwindet er hier (er lebt dann nur noch in der Galerie als Teil des Jahres-Gewinners).
  let supersededByYearlyContest = false;
  if (finishedContest) {
    const coveringYear = finishedContest.month === 12 ? finishedContest.year + 1 : finishedContest.year;
    const coveringYearlyContest = await prisma.yearlyClipContest.findUnique({
      where: { year: coveringYear },
      select: { status: true },
    });
    supersededByYearlyContest = coveringYearlyContest?.status === "finished";
  }

  const winners = finishedContest && !supersededByYearlyContest
    ? finishedContest.nominations.filter((n) => finishedContest.winnerNominationIds.includes(n.id))
    : [];

  let userVoteNominationId: string | null = null;
  if (userId && activeContest) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    userVoteNominationId = vote?.nominationId ?? null;
  }

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Gewinner des Vormonats ─────────────────────────────────────── */}
      {winners.length > 0 && finishedContest && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              Clip des Monats – {MONTH_NAMES[finishedContest.month - 1]} {finishedContest.year}
            </h2>
            {winners.length > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Gleichstand · {winners.length} Gewinner
              </span>
            )}
          </div>
          <div className={`grid gap-4 ${winners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
            {winners.map((winner) => (
              <ClipWinnerCard key={winner.id} winner={winner} embedParent={embedParent} rewardCoins={finishedContest.rewardCoins} />
            ))}
          </div>
        </section>
      )}

      <Link
        href="/clip-galerie"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Images className="w-4 h-4" /> Zur Clip-Galerie →
      </Link>

      {/* ── Laufende Abstimmung ────────────────────────────────────────── */}
      {activeContest ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">
                Abstimmung – {MONTH_NAMES[activeContest.month - 1]} {activeContest.year}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeContest.nominations.length} Clips zur Auswahl
              </p>
            </div>
            <CountdownBadge endsAt={activeContest.votingEndsAt} />
          </div>

          {/* Belohnungs-Kachel */}
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
            nominations={activeContest.nominations.map((n) => ({
              id: n.id,
              clipUrl: n.clipUrl,
              thumbnailUrl: n.thumbnailUrl,
              clipTitle: n.clipTitle,
              submittedBy: n.submittedBy,
              twitchCreatorLogin: n.twitchCreatorLogin,
              partnerTwitchLogin: n.partnerTwitchLogin,
              voteCount: n._count.votes,
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
          <p className="text-sm mt-1">Zu Beginn jeden Monats startet automatisch eine neue Runde.</p>
        </div>
      )}
    </div>
  );
}
