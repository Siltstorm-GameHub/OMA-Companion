import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clapperboard, Check } from "lucide-react";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function ClipContestWidget({ userId }: { userId?: string }) {
  const [activeContest, finishedContest] = await Promise.all([
    prisma.monthlyClipContest.findFirst({
      where: { status: "voting" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true, month: true, year: true, rewardCoins: true, _count: { select: { nominations: true } } },
    }),
    prisma.monthlyClipContest.findFirst({
      where: { status: "finished" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { id: true, month: true, year: true, winnerNominationId: true },
    }),
  ]);

  const winner = finishedContest?.winnerNominationId
    ? await prisma.clipNomination.findUnique({
        where: { id: finishedContest.winnerNominationId },
        select: { clipUrl: true, thumbnailUrl: true, clipTitle: true, twitchCreatorLogin: true, submittedBy: { select: { name: true, username: true } } },
      })
    : null;

  let hasVoted = false;
  if (userId && activeContest) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    hasVoted = !!vote;
  }

  if (!activeContest && !winner) return null;

  const winnerName = winner?.submittedBy?.name ?? winner?.submittedBy?.username ?? winner?.twitchCreatorLogin ?? null;

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto space-y-2">
      {/* Winner showcase */}
      {winner && finishedContest && (
        <Link
          href="/clip-des-monats"
          className="flex items-center gap-3 px-4 py-3 rounded-xl glass border border-amber-500/15 hover:border-amber-500/30 transition-colors group"
        >
          {winner.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={winner.thumbnailUrl.replace("%{width}", "120").replace("%{height}", "68")}
              alt=""
              className="w-16 h-9 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clapperboard className="w-5 h-5 text-amber-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold mb-0.5">
              🏆 Clip des Monats – {MONTH_NAMES[finishedContest.month - 1]}
            </p>
            <p className="text-sm text-white font-medium truncate">{winner.clipTitle ?? "Clip ansehen"}</p>
            {winnerName && <p className="text-xs text-gray-500 truncate">von {winnerName}</p>}
          </div>
          <span className="text-xs text-gray-600 group-hover:text-gray-400 transition-colors shrink-0">ansehen →</span>
        </Link>
      )}

      {/* Aktive Abstimmung — immer sichtbar, unabhängig vom eigenen Vote-Status */}
      {activeContest && (
        <Link
          href="/clip-des-monats"
          className="flex items-center gap-3 px-4 py-3 rounded-xl glass border border-[#9146ff]/20 hover:border-[#9146ff]/40 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#9146ff]/15 flex items-center justify-center shrink-0">
            {hasVoted
              ? <Check className="w-4 h-4 text-[#9146ff]" />
              : <Clapperboard className="w-4 h-4 text-[#9146ff]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">
              {hasVoted ? "Du hast abgestimmt" : "Du hast noch nicht abgestimmt!"}
            </p>
            <p className="text-xs text-gray-500">
              {activeContest._count.nominations} Clips · Clip des Monats {MONTH_NAMES[activeContest.month - 1]}
            </p>
          </div>
          <span className="text-xs text-[#9146ff] group-hover:text-purple-300 transition-colors shrink-0 font-medium">
            {hasVoted ? "Ansehen →" : "Abstimmen →"}
          </span>
        </Link>
      )}
    </div>
  );
}
