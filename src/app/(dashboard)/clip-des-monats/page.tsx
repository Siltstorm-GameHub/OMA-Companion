import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Trophy, Clapperboard } from "lucide-react";
import ClipVotingClient from "./ClipVotingClient";
import TwitchClipEmbed from "@/components/TwitchClipEmbed";
import { clipCredit } from "@/lib/clip-display";

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

  const winnerCredit = winner ? clipCredit(winner) : null;

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
          <div className="rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5">
            <TwitchClipEmbed
              clipUrl={winner.clipUrl}
              thumbnailUrl={winner.thumbnailUrl}
              title={winner.clipTitle ?? "Gewinner-Clip"}
              parent={embedParent}
              overlay={
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                  <Trophy className="w-3 h-3" /> Gewinner
                </div>
              }
            />
            <div className="px-4 py-3 border-t border-amber-500/10">
              <p className="text-white font-semibold">{winner.clipTitle ?? "Unbekannter Clip"}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Kanal: <span className="text-[#9146ff]">{winnerCredit!.channel}</span>
                {winnerCredit!.creator && (
                  <> · Clip von <span className="text-amber-300">{winnerCredit!.creator}</span></>
                )}
                {finishedContest.rewardCoins > 0 && (
                  <> · <span className="text-amber-400">{finishedContest.rewardCoins} Münzen</span> gewonnen</>
                )}
              </p>
            </div>
          </div>
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
                {activeContest.nominations.length} Clips zur Auswahl
              </p>
            </div>
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
