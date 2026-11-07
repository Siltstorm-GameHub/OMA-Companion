import { prisma } from "./prisma";
import { voteReport, unvoteReport } from "./journalist-service";

/**
 * Verbindet eine Discord-👍-Reaktion mit dem In-App-Bewertungssystem — für Beiträge des Content Creators
 * (Text, Bilder/Clips, Werbung). Coach/Visionär (Sterne + Pflicht-Begründung) sind über eine einzelne
 * Emoji-Reaktion nicht abbildbar und bleiben In-App-only. Migrierte Fotos und Werbe-Posts haben ihre
 * Discord-Nachricht als Beitrag übernommen.
 *
 * Aufgerufen aus dem Gateway-Bot (src/bot/index.ts) bei MessageReactionAdd/Remove.
 */
export async function handleCommunityJobReaction(
  discordUserId: string, messageId: string, added: boolean,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { discordId: discordUserId }, select: { id: true } });
  if (!user) return;

  const report = await prisma.jobReport.findFirst({ where: { discordMessageId: messageId }, select: { id: true } });
  if (report) await (added ? voteReport(user.id, report.id) : unvoteReport(user.id, report.id));
}
