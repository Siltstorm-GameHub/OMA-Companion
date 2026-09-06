import { prisma } from "./prisma";
import { voteReport, unvoteReport } from "./journalist-service";
import { voteAsset, unvoteAsset } from "./fotograf-service";
import { voteMarketingPost, unvoteMarketingPost } from "./marketing-manager-service";

/**
 * Verbindet eine Discord-👍-Reaktion mit dem In-App-Bewertungssystem — nur für
 * die Daumen-hoch-basierten Jobs (Journalist, Fotograf, Marketing Manager).
 * Coach/Visionär (Sterne + Pflicht-Begründung) sind über eine einzelne Emoji-
 * Reaktion nicht abbildbar und bleiben In-App-only, siehe Plan "Discord-Anbindung".
 *
 * Aufgerufen aus dem Gateway-Bot (src/bot/index.ts) bei MessageReactionAdd/Remove.
 */
export async function handleCommunityJobReaction(
  discordUserId: string, messageId: string, added: boolean,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { discordId: discordUserId }, select: { id: true } });
  if (!user) return;

  const [report, asset, post] = await Promise.all([
    prisma.jobReport.findFirst({ where: { discordMessageId: messageId }, select: { id: true } }),
    prisma.jobMediaAsset.findFirst({ where: { discordMessageId: messageId }, select: { id: true } }),
    prisma.marketingPost.findFirst({ where: { discordMessageId: messageId }, select: { id: true } }),
  ]);

  if (report) {
    await (added ? voteReport(user.id, report.id) : unvoteReport(user.id, report.id));
  } else if (asset) {
    await (added ? voteAsset(user.id, asset.id) : unvoteAsset(user.id, asset.id));
  } else if (post) {
    await (added ? voteMarketingPost(user.id, post.id) : unvoteMarketingPost(user.id, post.id));
  }
}
