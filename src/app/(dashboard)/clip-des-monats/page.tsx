import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Clapperboard } from "lucide-react";
import ClipVotingClient from "./ClipVotingClient";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function ClipDesMonatsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

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

  const winner = finishedContest?.winnerNominationId
    ? finishedContest.nominations.find((n) => n.id === finishedContest.winnerNominationId) ?? null
    : null;

  let userVoteNominationId: string | null = null;
  if (userId && activeContest) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    userVoteNominationId = vote?.nominationId ?? null;
  }

  const winnerName = winner?.submittedBy?.name
    ?? winner?.submittedBy?.username
    ?? winner?.twitchCreatorLogin
    ?? "Unbekannt";

  return (
    <div className="p-5 sm:p-6 max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Gewinner des Vormonats ─────────────────────────────────────── */}
      {winner && finishedContest && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              Clip des Monats – {MONTH_NAMES[finishedContest.month - 1]} {finishedContest.year}
            </h2>
          </div>
          <a
            href={winner.clipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-colors"
          >
            {winner.thumbnailUrl ? (
              <div className="relative aspect-video w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={winner.thumbnailUrl.replace("%{width}", "640").replace("%{height}", "360")}
                  alt={winner.clipTitle ?? "Gewinner-Clip"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white font-semibold text-sm">Auf Twitch ansehen ↗</span>
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  <Trophy className="w-3 h-3" /> Gewinner
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <Clapperboard className="w-8 h-8 text-amber-400 shrink-0" />
                <span className="text-white font-medium">{winner.clipTitle ?? winner.clipUrl}</span>
              </div>
            )}
            <div className="px-4 py-3 border-t border-amber-500/10">
              <p className="text-white font-semibold">{winner.clipTitle ?? "Unbekannter Clip"}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                von <span className="text-amber-300">{winnerName}</span>
                {winner.partnerTwitchLogin && (
                  <> · geclippt bei <span className="text-[#9146ff]">{winner.partnerTwitchLogin}</span></>
                )}
                {finishedContest.rewardCoins > 0 && (
                  <> · <span className="text-amber-400">{finishedContest.rewardCoins} Münzen</span> gewonnen</>
                )}
              </p>
            </div>
          </a>
        </section>
      )}

      {/* ── Laufende Abstimmung ────────────────────────────────────────── */}
      {activeContest ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Abstimmung – {MONTH_NAMES[activeContest.month - 1]} {activeContest.year}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {activeContest.nominations.length} Clips · {activeContest.rewardCoins} Münzen für den Gewinner
              </p>
            </div>
          </div>
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
