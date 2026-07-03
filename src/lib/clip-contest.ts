import { prisma } from "@/lib/prisma";
import { getTwitchUser, getPartnerClips } from "@/lib/twitch";

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
