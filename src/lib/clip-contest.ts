import { prisma } from "@/lib/prisma";
import { getTwitchUser, getPartnerClips } from "@/lib/twitch";
import { createNotificationForUsers } from "@/lib/notifications";
import { sendPushToAll } from "@/lib/push";

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
  const eventClips = await prisma.eventClipSubmission.findMany({
    where: { event: { startAt: { gte: periodStart, lt: periodEnd } } },
    select: { clipUrl: true, userId: true },
  });

  const partnerNominations: PartnerNomination[] = [];
  const failedChannels: string[] = [];

  for (const login of twitchLogins) {
    try {
      const twitchUser = await getTwitchUser(login);
      if (!twitchUser) {
        failedChannels.push(login);
        continue;
      }
      const clips = await getPartnerClips(twitchUser.id, periodStart, periodEnd);
      for (const clip of clips) {
        partnerNominations.push({
          clipUrl: clip.url,
          thumbnailUrl: clip.thumbnail_url,
          clipTitle: clip.title,
          twitchCreatorLogin: clip.creator_name.toLowerCase(),
          partnerTwitchLogin: login,
        });
      }
    } catch {
      failedChannels.push(login);
    }
  }

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
  const title = `🎬 Clip des Monats – ${MONTH_NAMES[month - 1]} ${year}`;
  const body = `Die Abstimmung läuft! ${nominationCount} Clips stehen zur Wahl.`;
  const url = "/clip-des-monats";

  const users = await prisma.user.findMany({ select: { id: true } });
  await createNotificationForUsers(users.map((u) => u.id), { type: "clip", title, body, url }).catch(() => {});
  await sendPushToAll({ title, body, url }).catch(() => {});
}

export async function finalizeContest(contestId: string): Promise<string> {
  const contest = await prisma.monthlyClipContest.findUnique({
    where: { id: contestId },
    include: { nominations: { include: { _count: { select: { votes: true } } } } },
  });
  if (!contest) return `Contest ${contestId} nicht gefunden`;
  if (contest.status !== "voting") return `Contest ${contest.month}/${contest.year} war bereits abgeschlossen`;

  const sorted = [...contest.nominations].sort((a, b) => b._count.votes - a._count.votes);
  const winner = sorted[0] ?? null;

  let winnerUserId: string | null = null;
  let message = `Finalized contest ${contest.month}/${contest.year}`;
  if (winner) {
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

  await prisma.monthlyClipContest.update({
    where: { id: contest.id },
    data: { status: "finished", winnerNominationId: winner?.id ?? null },
  });
  return message;
}
