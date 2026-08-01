import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Clapperboard, Check } from "lucide-react";
import CountdownBadge from "@/components/CountdownBadge";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function ClipContestWidget({ userId }: { userId?: string }) {
  const activeContest = await prisma.monthlyClipContest.findFirst({
    where: { status: "voting" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { id: true, month: true, year: true, rewardCoins: true, votingEndsAt: true, _count: { select: { nominations: true } } },
  });

  if (!activeContest) return null;

  let hasVoted = false;
  if (userId) {
    const vote = await prisma.clipContestVote.findUnique({
      where: { contestId_userId: { contestId: activeContest.id, userId } },
    });
    hasVoted = !!vote;
  }

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Aktive Abstimmung — immer sichtbar, unabhängig vom eigenen Vote-Status */}
      <Link
        href="/clip-des-monats"
        className={`flex items-center gap-3 px-4 py-3 rounded-xl glass border transition-colors group ${
          hasVoted
            ? "border-[#9146ff]/20 hover:border-[#9146ff]/40"
            : "border-[#9146ff]/40 hover:border-[#9146ff]/60 shadow-[0_0_20px_rgba(145,70,255,0.15)]"
        }`}
      >
        <div className="relative w-8 h-8 rounded-lg bg-[#9146ff]/15 flex items-center justify-center shrink-0">
          {!hasVoted && (
            <span className="absolute -top-1 -right-1 flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#9146ff] animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#9146ff]" />
            </span>
          )}
          {hasVoted
            ? <Check className="w-4 h-4 text-[#9146ff]" />
            : <Clapperboard className="w-4 h-4 text-[#9146ff]" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium flex items-center gap-1.5">
            {!hasVoted && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#9146ff]/20 text-purple-300 border border-[#9146ff]/30">
                Live
              </span>
            )}
            {hasVoted ? "Du hast abgestimmt" : "Du hast noch nicht abgestimmt!"}
          </p>
          <p className="text-xs text-gray-500">
            {activeContest._count.nominations} Clips · Clip des Monats {MONTH_NAMES[activeContest.month - 1]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <CountdownBadge endsAt={activeContest.votingEndsAt} />
          <span className="text-xs text-[#9146ff] group-hover:text-purple-300 transition-colors font-medium">
            {hasVoted ? "Ansehen →" : "Abstimmen →"}
          </span>
        </div>
      </Link>
    </div>
  );
}
