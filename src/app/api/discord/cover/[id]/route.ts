import { prisma } from "@/lib/prisma";
import { getGameCoverUrlAsync } from "@/lib/game-cover";
import { generateBrandedCoverBuffer } from "@/lib/branded-cover";

/**
 * Liefert das gebrandete Event-Cover als echtes JPEG unter einer öffentlichen
 * URL — für Discord-Nachrichten-Embeds (image.url), die anders als die
 * Scheduled-Events-API keine data:-URIs akzeptieren, nur echte HTTP-URLs.
 *
 * Löst die Bildquelle selbst aus der DB auf (eigenes Cover → Reihen-Cover →
 * Steam-Cover → Marken-Gradient), damit discord-events.ts nur die Event-ID
 * kennen muss — dasselbe Prinzip wie api/discord/podium/[id].
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event
    .findUnique({
      where:  { id },
      select: { coverImageUrl: true, game: true, series: { select: { coverImageUrl: true } } },
    })
    .catch(() => null);

  const own    = event?.coverImageUrl?.trim() || event?.series?.coverImageUrl?.trim() || null;
  const source = own || (await getGameCoverUrlAsync(event?.game ?? null));

  const buffer = await generateBrandedCoverBuffer(source);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
