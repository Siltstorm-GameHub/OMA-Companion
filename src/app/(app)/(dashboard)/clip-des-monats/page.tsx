import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/roles";
import { Trophy, Clapperboard } from "@/components/icons";
import ClipVotingClient from "./ClipVotingClient";
import ClipWinnerCard from "@/components/ClipWinnerCard";
import ClipsNav from "@/components/clips/ClipsNav";
import ClipVoteHeader from "@/components/clips/ClipVoteHeader";
import ClipHowItWorks from "@/components/clips/ClipHowItWorks";
import { seededShuffle } from "@/lib/clip-order";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/**
 * Clips → Reiter "Clip des Monats": laufende Abstimmung zuerst (Statuszeile, faire Reihenfolge),
 * darunter "So kommt dein Clip rein" und der Sieger des Vormonats.
 */
export default async function ClipDesMonatsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const sessionUser = userId ? await getSessionUser() : null;
  const isModerator = sessionUser?.role === "moderator" || sessionUser?.role === "admin";

  const [activeContest, finishedContest, lastEvent] = await Promise.all([
    prisma.monthlyClipContest.findFirst({
      where: { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        nominations: {
          include: {
            submittedBy: { select: { id: true, name: true, username: true, image: true, rankPoints: true } },
            _count: { select: { votes: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.monthlyClipContest.findFirst({
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
    }),
    // Für "Clip einreichen": dein letztes beendetes Event, bei dem du mitgespielt hast
    userId
      ? prisma.event.findFirst({
          where: { status: "finished", hidden: false, registrations: { some: { userId, role: "player" } } },
          orderBy: { startAt: "desc" },
          select: { id: true, title: true },
        })
      : Promise.resolve(null),
  ]);

  // Sieger des Vormonats — bleibt hier, bis die nächste Runde abgeschlossen ist (Galerie: dauerhaft)
  const winners = finishedContest
    ? finishedContest.nominations.filter((n) => finishedContest.winnerNominationIds.includes(n.id))
    : [];

  let userVoteNominationId: string | null = null;
  if (userId && activeContest) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    userVoteNominationId = vote?.nominationId ?? null;
  }

  // Faire Reihenfolge: pro Person fest gemischt (Gäste: pro Wettbewerb)
  const nominations = activeContest
    ? seededShuffle(activeContest.nominations, `${userId ?? "gast"}:${activeContest.id}`)
    : [];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ClipsNav active="abstimmung" />

      {/* ── Laufende Abstimmung ── */}
      {activeContest ? (
        <section aria-label="Abstimmung" className="space-y-4">
          <ClipVoteHeader
            title={`Clip des Monats · ${MONTH_NAMES[activeContest.month - 1]} ${activeContest.year}`}
            clipCount={nominations.length}
            endsAt={activeContest.votingEndsAt}
            participationCoins={activeContest.participationCoins}
            rewardCoins={activeContest.rewardCoins}
          />
          <ClipVotingClient
            contestId={activeContest.id}
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
              voteCount: n._count.votes,
            }))}
            initialVoteId={userVoteNominationId}
            isLoggedIn={!!userId}
            embedParent={embedParent}
            isModerator={isModerator}
          />
        </section>
      ) : (
        <div className="rounded-card border border-line bg-surface p-8 text-center text-muted">
          <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Gerade läuft keine Abstimmung.</p>
          <p className="text-sm text-gray-500 mt-1">Zu Beginn jedes Monats startet eine neue Runde mit den Clips des Vormonats.</p>
        </div>
      )}

      <ClipHowItWorks lastEvent={lastEvent} />

      {/* ── Sieger des Vormonats ── */}
      {winners.length > 0 && finishedContest && (
        <section aria-label="Letzter Sieger" className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-fg">
              Sieger {MONTH_NAMES[finishedContest.month - 1]} {finishedContest.year}
            </h2>
            {winners.length > 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
                Gleichstand · {winners.length} Sieger
              </span>
            )}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {winners.map((winner) => (
              <ClipWinnerCard key={winner.id} winner={winner} embedParent={embedParent} rewardCoins={finishedContest.rewardCoins} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
