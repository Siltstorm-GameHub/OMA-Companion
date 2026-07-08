import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notify-dispatch";

// Deckt Dez(year-1) bis Nov(year) ab — die Umfrage startet Mitte Dezember, sobald
// die November-Abstimmung von "Clip des Monats" beendet ist, daher liegt der
// Dezember-Contest desselben Jahres noch außerhalb (der landet erst im Folgejahr).
export async function collectYearlyNominations(year: number): Promise<string[]> {
  const contests = await prisma.monthlyClipContest.findMany({
    where: {
      status: "finished",
      OR: [
        { month: 12, year: year - 1 },
        { month: { gte: 1, lte: 11 }, year },
      ],
    },
    select: { winnerNominationIds: true },
  });

  return [...new Set(contests.flatMap((c) => c.winnerNominationIds))];
}

export async function notifyYearlyContestStarted(year: number, nominationCount: number) {
  const users = await prisma.user.findMany({ select: { id: true } });
  await dispatchNotification("clip_of_year_started", {
    users: users.map((u) => u.id),
    placeholders: {
      "{year}": String(year),
      "{nominationCount}": String(nominationCount),
    },
  }).catch(() => {});
}

export async function notifyYearlyContestFinished(year: number, clipTitle: string | null, winnerCount: number) {
  const resultHeadline = winnerCount > 1 ? "Gewinner stehen fest!" : "Gewinner steht fest!";
  const resultText = winnerCount > 1
    ? `Gleichstand! ${winnerCount} Clips haben gewonnen. Schau vorbei!`
    : clipTitle ? `„${clipTitle}" hat gewonnen. Schau vorbei!` : "Der Gewinner-Clip steht fest. Schau vorbei!";

  const users = await prisma.user.findMany({ select: { id: true } });
  await dispatchNotification("clip_of_year_finished", {
    users: users.map((u) => u.id),
    placeholders: {
      "{year}": String(year),
      "{resultHeadline}": resultHeadline,
      "{resultText}": resultText,
    },
  }).catch(() => {});
}

export async function finalizeYearlyContest(contestId: string): Promise<string> {
  const contest = await prisma.yearlyClipContest.findUnique({ where: { id: contestId } });
  if (!contest) return `Yearly contest ${contestId} nicht gefunden`;
  if (contest.status !== "voting") return `Clip des Jahres ${contest.year} war bereits abgeschlossen`;

  const [voteCounts, nominations, votes] = await Promise.all([
    prisma.yearlyClipContestVote.groupBy({ by: ["nominationId"], where: { contestId }, _count: true }),
    prisma.clipNomination.findMany({ where: { id: { in: contest.nominationIds } } }),
    prisma.yearlyClipContestVote.findMany({ where: { contestId }, select: { userId: true } }),
  ]);

  const countByNomination = new Map(voteCounts.map((v) => [v.nominationId, v._count]));
  const maxVotes = contest.nominationIds.reduce((max, id) => Math.max(max, countByNomination.get(id) ?? 0), 0);
  const winnerIds = maxVotes > 0
    ? contest.nominationIds.filter((id) => (countByNomination.get(id) ?? 0) === maxVotes)
    : [];
  const winners = nominations.filter((n) => winnerIds.includes(n.id));

  let message = `Finalized Clip des Jahres ${contest.year}`;
  if (winners.length > 1) {
    message += ` — Gleichstand zwischen ${winners.length} Clips (je ${maxVotes} Stimmen)`;
  }

  const winnerUserIds = new Set<string>();
  const noAccountLogins = new Set<string>();

  for (const winner of winners) {
    if (winner.submittedByUserId) {
      winnerUserIds.add(winner.submittedByUserId);
    } else if (winner.twitchCreatorLogin) {
      const user = await prisma.user.findUnique({ where: { twitchLogin: winner.twitchCreatorLogin } });
      if (user) {
        winnerUserIds.add(user.id);
      } else {
        noAccountLogins.add(winner.twitchCreatorLogin);
      }
    }
  }

  for (const winnerUserId of winnerUserIds) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: winnerUserId }, data: { points: { increment: contest.rewardCoins } } }),
      prisma.pointTransaction.create({
        data: {
          userId: winnerUserId,
          amount: contest.rewardCoins,
          reason: `[Münzen] Clip des Jahres – ${contest.year}`,
        },
      }),
    ]);
    message += ` — ${contest.rewardCoins} Münzen an ${winnerUserId} vergeben`;
  }
  for (const login of noAccountLogins) {
    message += ` — Gewinner (Twitch: ${login}) hat kein Community-Konto, keine Münzen vergeben`;
  }

  if (contest.participationCoins > 0 && votes.length > 0) {
    const voterIds = votes.map((v) => v.userId);
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: voterIds } }, data: { points: { increment: contest.participationCoins } } }),
      prisma.pointTransaction.createMany({
        data: voterIds.map((userId) => ({
          userId,
          amount: contest.participationCoins,
          reason: `[Münzen] Clip des Jahres Teilnahme – ${contest.year}`,
        })),
      }),
    ]);
    message += ` — ${contest.participationCoins} Münzen Teilnahme an ${voterIds.length} Voter vergeben`;
  }

  await prisma.yearlyClipContest.update({
    where: { id: contest.id },
    data: { status: "finished", winnerNominationIds: winners.map((w) => w.id) },
  });

  if (winners.length > 0) {
    await notifyYearlyContestFinished(contest.year, winners[0].clipTitle, winners.length);
  }

  return message;
}
