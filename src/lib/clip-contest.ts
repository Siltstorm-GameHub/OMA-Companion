import { prisma } from "@/lib/prisma";
import { getTwitchUsers, getPartnerClips } from "@/lib/twitch";
import { dispatchNotification } from "@/lib/notify-dispatch";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type PartnerNomination = {
  clipUrl: string;
  thumbnailUrl: string;
  clipTitle: string;
  twitchCreatorLogin: string;
  partnerTwitchLogin: string;
};

type CommunityNomination = {
  clipUrl: string;
  submittedByUserId: string;
};

export async function collectNominations(periodStart: Date, periodEnd: Date, twitchLogins: string[]) {
  const uniqueLogins = [...new Set(twitchLogins.map((l) => l.trim().toLowerCase()).filter(Boolean))];

  const [eventClips, twitchUsers] = await Promise.all([
    prisma.eventClipSubmission.findMany({
      where: { event: { startAt: { gte: periodStart, lt: periodEnd } } },
      select: { clipUrl: true, userId: true },
    }),
    getTwitchUsers(uniqueLogins),
  ]);

  const resolvedLogins = new Set(twitchUsers.map((u) => u.login.toLowerCase()));
  const failedChannels = uniqueLogins.filter((l) => !resolvedLogins.has(l));

  const clipResults = await Promise.allSettled(
    twitchUsers.map((user) => getPartnerClips(user.id, periodStart, periodEnd))
  );

  const partnerNominations: PartnerNomination[] = [];
  clipResults.forEach((result, i) => {
    const login = twitchUsers[i].login.toLowerCase();
    if (result.status === "rejected") {
      failedChannels.push(login);
      return;
    }
    for (const clip of result.value) {
      partnerNominations.push({
        clipUrl: clip.url,
        thumbnailUrl: clip.thumbnail_url,
        clipTitle: clip.title,
        twitchCreatorLogin: clip.creator_name.toLowerCase(),
        partnerTwitchLogin: login,
      });
    }
  });

  const communityNominations: CommunityNomination[] = eventClips.map((c) => ({
    clipUrl: c.clipUrl,
    submittedByUserId: c.userId,
  }));

  return {
    nominations: [...communityNominations, ...partnerNominations],
    failedChannels,
  };
}

export async function notifyNewContest(month: number, year: number, nominationCount: number) {
  const users = await prisma.user.findMany({ select: { id: true } });
  await dispatchNotification("clip_started", {
    users: users.map((u) => u.id),
    placeholders: {
      "{month}": MONTH_NAMES[month - 1],
      "{year}": String(year),
      "{nominationCount}": String(nominationCount),
    },
  }).catch(() => {});
}

export async function notifyContestFinished(month: number, year: number, clipTitle: string | null, winnerCount: number) {
  const resultHeadline = winnerCount > 1 ? "Gewinner stehen fest!" : "Gewinner steht fest!";
  const resultText = winnerCount > 1
    ? `Gleichstand! ${winnerCount} Clips haben gewonnen. Schau vorbei!`
    : clipTitle ? `„${clipTitle}" hat gewonnen. Schau vorbei!` : "Der Gewinner-Clip steht fest. Schau vorbei!";

  const users = await prisma.user.findMany({ select: { id: true } });
  await dispatchNotification("clip_finished", {
    users: users.map((u) => u.id),
    placeholders: {
      "{month}": MONTH_NAMES[month - 1],
      "{year}": String(year),
      "{resultHeadline}": resultHeadline,
      "{resultText}": resultText,
    },
  }).catch(() => {});
}

export async function finalizeContest(contestId: string): Promise<string> {
  const contest = await prisma.monthlyClipContest.findUnique({
    where: { id: contestId },
    include: {
      nominations: { include: { _count: { select: { votes: true } } } },
      votes: { select: { userId: true } },
    },
  });
  if (!contest) return `Contest ${contestId} nicht gefunden`;
  if (contest.status !== "voting") return `Contest ${contest.month}/${contest.year} war bereits abgeschlossen`;

  const maxVotes = contest.nominations.reduce((max, n) => Math.max(max, n._count.votes), 0);
  const winners = contest.nominations.filter((n) => n._count.votes === maxVotes);

  let message = `Finalized contest ${contest.month}/${contest.year}`;
  if (winners.length > 1) {
    message += ` — Gleichstand zwischen ${winners.length} Clips (je ${maxVotes} Stimmen)`;
  }

  for (const winner of winners) {
    let winnerUserId: string | null = null;
    if (winner.submittedByUserId) {
      winnerUserId = winner.submittedByUserId;
    } else if (winner.twitchCreatorLogin) {
      const user = await prisma.user.findUnique({ where: { twitchLogin: winner.twitchCreatorLogin } });
      winnerUserId = user?.id ?? null;
    }

    if (winnerUserId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: winnerUserId }, data: { points: { increment: contest.rewardCoins } } }),
        prisma.pointTransaction.create({
          data: {
            userId: winnerUserId,
            amount: contest.rewardCoins,
            reason: `[Münzen] Clip des Monats – ${contest.month}/${contest.year}`,
          },
        }),
      ]);
      message += ` — ${contest.rewardCoins} Münzen an ${winnerUserId} vergeben`;
    } else if (winner.twitchCreatorLogin) {
      message += ` — Gewinner (Twitch: ${winner.twitchCreatorLogin}) hat kein Community-Konto, keine Münzen vergeben`;
    }
  }

  if (contest.participationCoins > 0 && contest.votes.length > 0) {
    const voterIds = contest.votes.map((v) => v.userId);
    await prisma.$transaction([
      prisma.user.updateMany({ where: { id: { in: voterIds } }, data: { points: { increment: contest.participationCoins } } }),
      prisma.pointTransaction.createMany({
        data: voterIds.map((userId) => ({
          userId,
          amount: contest.participationCoins,
          reason: `[Münzen] Clip des Monats Teilnahme – ${contest.month}/${contest.year}`,
        })),
      }),
    ]);
    message += ` — ${contest.participationCoins} Münzen Teilnahme an ${voterIds.length} Voter vergeben`;
  }

  await prisma.monthlyClipContest.update({
    where: { id: contest.id },
    data: { status: "finished", winnerNominationIds: winners.map((w) => w.id) },
  });

  if (winners.length > 0) {
    await notifyContestFinished(contest.month, contest.year, winners[0].clipTitle, winners.length);
  }

  return message;
}
