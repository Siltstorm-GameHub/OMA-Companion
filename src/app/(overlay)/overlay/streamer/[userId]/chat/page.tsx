import { notFound } from "next/navigation";
import OverlayChatClient from "@/components/overlay/OverlayChatClient";
import { getStreamerConfig, getStreamerOverlayPayload } from "@/lib/overlay-state";
import { withTogether } from "@/lib/overlay-together";

export const dynamic = "force-dynamic";

/**
 * Chat-Quelle für OBS: eigener Twitch-Chat, beim gemeinsamen Streamen automatisch der gemeinsame
 * Chat aller Beteiligten. Gleicher Token wie der feste Streamer-Link (neu erzeugen = auch dieser
 * Link wird ungültig).
 */
export default async function StreamerChatOverlayPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { userId } = await params;
  const { token } = await searchParams;

  const stored = await getStreamerConfig(userId);
  if (!stored?.token || !token || stored.token !== token) notFound();
  const payload = await getStreamerOverlayPayload(userId, stored.config, stored.control);
  if (!payload) notFound();

  return <OverlayChatClient userId={userId} token={token} initial={await withTogether(payload, userId, false)} />;
}
