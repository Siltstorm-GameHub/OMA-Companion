import { prisma } from "@/lib/prisma";
import { getTwitchUsers, getTwitchUsersByIds, getPartnerClips, type TwitchClip } from "@/lib/twitch";
import { dispatchNotification } from "@/lib/notify-dispatch";
import {
  awardClipReward,
  claimPendingClipRewards,
  findUserForTwitch,
  recordPendingClipReward,
  rememberTwitchLink,
} from "@/lib/clip-rewards";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type PartnerNomination = {
  clipUrl: string;
  thumbnailUrl: string;
  clipTitle: string;
  twitchCreatorLogin: string;
  twitchCreatorId: string | null;
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

  const rawClips: { clip: TwitchClip; partnerLogin: string }[] = [];
  clipResults.forEach((result, i) => {
    const login = twitchUsers[i].login.toLowerCase();
    if (result.status === "rejected") {
      failedChannels.push(login);
      return;
    }
    for (const clip of result.value) {
      rawClips.push({ clip, partnerLogin: login });
    }
  });

  // Die Clips-API liefert nur Anzeige-Namen (creator_name), nicht den echten Login —
  // per creator_id auf den kanonischen Login auflösen, sonst schlägt der Abgleich mit
  // User.twitchLogin fehl, sobald Anzeigename und Login voneinander abweichen.
  const creatorIds = [...new Set(rawClips.map((c) => c.clip.creator_id).filter(Boolean))];
  const creatorUsers = await getTwitchUsersByIds(creatorIds);
  const loginByCreatorId = new Map(creatorUsers.map((u) => [u.id, u.login.toLowerCase()]));

  const partnerNominations: PartnerNomination[] = rawClips.map(({ clip, partnerLogin }) => ({
    clipUrl: clip.url,
    thumbnailUrl: clip.thumbnail_url,
    clipTitle: clip.title,
    twitchCreatorLogin: loginByCreatorId.get(clip.creator_id) ?? clip.creator_name.toLowerCase(),
    twitchCreatorId: clip.creator_id || null,
    partnerTwitchLogin: partnerLogin,
  }));

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

  // Bei Gleichstand kann derselbe User mehrere Gewinner-Clips haben (z.B. zwei Event-Einreichungen,
  // oder mehrere geclippte Momente desselben Streamers) — Münzen trotzdem nur einmal pro User vergeben.
  const reason = `[Münzen] Clip des Monats – ${contest.month}/${contest.year}`;
  const winnerUserIds = new Set<string>();
  const pendingLogins = new Set<string>();

  for (const winner of winners) {
    if (winner.submittedByUserId) {
      winnerUserIds.add(winner.submittedByUserId);
    } else if (winner.twitchCreatorLogin) {
      const userId = await findUserForTwitch({ login: winner.twitchCreatorLogin, id: winner.twitchCreatorId });
      if (userId) {
        winnerUserIds.add(userId);
      } else {
        // Kein Konto gefunden → vormerken; Auszahlung, sobald der Twitch-Account im Profil hinterlegt
        // oder von einem Admin verknüpft wird (siehe src/lib/clip-rewards.ts)
        await recordPendingClipReward({
          contestKind: "monthly",
          contestId: contest.id,
          nominationId: winner.id,
          twitchLogin: winner.twitchCreatorLogin,
          twitchUserId: winner.twitchCreatorId,
          amount: contest.rewardCoins,
          reason,
        });
        pendingLogins.add(winner.twitchCreatorLogin);
      }
    }
  }

  for (const winnerUserId of winnerUserIds) {
    if (await awardClipReward(winnerUserId, contest.rewardCoins, reason)) {
      message += ` — ${contest.rewardCoins} Münzen an ${winnerUserId} vergeben`;
    }
  }
  for (const login of pendingLogins) {
    message += ` — Gewinner (Twitch: ${login}) hat noch kein Community-Konto, Münzen vorgemerkt`;
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
    await notifyContestFinished(contest.month, contest.year, winners[0].customTitle ?? winners[0].clipTitle, winners.length);
  }

  return message;
}

// Verknüpft nachträglich einen Twitch-Gewinner ohne erkanntes Community-Konto mit einem User.
// Die Verknüpfung wird dauerhaft gespeichert (TwitchClipperLink) — künftige Clips desselben
// Twitch-Accounts werden automatisch zugeordnet. Vorgemerkte Belohnungen (auch Clip des Jahres)
// werden dabei ausgezahlt; für ältere Contests ohne Vormerkung wird wie bisher direkt vergeben.
export async function linkWinnerToUser(contestId: string, nominationId: string, userId: string, adminId: string | null = null) {
  const contest = await prisma.monthlyClipContest.findUnique({ where: { id: contestId } });
  if (!contest) return { ok: false as const, error: "Abstimmung nicht gefunden" };
  if (contest.status !== "finished") return { ok: false as const, error: "Abstimmung ist noch nicht beendet" };
  if (!contest.winnerNominationIds.includes(nominationId)) {
    return { ok: false as const, error: "Diese Einreichung ist kein Gewinner dieser Abstimmung" };
  }

  const nomination = await prisma.clipNomination.findUnique({ where: { id: nominationId } });
  if (!nomination || nomination.contestId !== contestId) {
    return { ok: false as const, error: "Einreichung nicht gefunden" };
  }
  if (nomination.submittedByUserId) {
    return { ok: false as const, error: "Einreichung ist bereits mit einem Konto verknüpft" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) return { ok: false as const, error: "Nutzer nicht gefunden" };

  if (nomination.twitchCreatorLogin) {
    const linked = await rememberTwitchLink(
      userId,
      { login: nomination.twitchCreatorLogin, id: nomination.twitchCreatorId },
      adminId,
    );
    if (!linked.ok) return { ok: false as const, error: linked.error };
  }

  await prisma.clipNomination.update({ where: { id: nominationId }, data: { submittedByUserId: userId } });

  // Zahlt diese und alle weiteren vorgemerkten Belohnungen dieses Twitch-Accounts aus
  const { claimed, coins } = await claimPendingClipRewards(userId);

  // Contests von vor der Vormerk-Funktion haben keine PendingClipReward → direkt vergeben.
  // awardClipReward prüft vorher, ob für diesen Contest schon Münzen an den User gingen.
  const reason = `[Münzen] Clip des Monats – ${contest.month}/${contest.year}`;
  const legacyAwarded = await awardClipReward(userId, contest.rewardCoins, reason);

  return {
    ok: true as const,
    awarded: claimed > 0 || legacyAwarded,
    coins: coins + (legacyAwarded ? contest.rewardCoins : 0),
  };
}
