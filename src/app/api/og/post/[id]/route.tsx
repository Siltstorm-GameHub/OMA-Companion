import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, OgPill, loadLogoDataUri, loadRemoteImageDataUri } from "@/lib/og";
import { postDisplayTitle } from "@/lib/post-display";
import { isVideoUrl } from "@/lib/upload-limits";

/**
 * Share-Karte für einen Beitrag (Community-Board): erstes Bild bzw. Titelbild links, rechts Titel,
 * Autor, Event und Daumen. Entwürfe und ausgeblendete Beiträge geben nichts preis.
 *
 * Route Handler statt opengraph-image.tsx: siehe app/api/og/event/[id]/route.tsx.
 * Satori-Regeln beim Erweitern beachten — siehe Kopfkommentar in lib/og.tsx.
 */

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logo = await loadLogoDataUri();

  const post = await prisma.jobReport
    .findUnique({
      where: { id },
      select: {
        title: true, bodyMarkdown: true, isDraft: true, hiddenByAdminAt: true, gameCoverUrl: true,
        author: { select: { username: true, name: true } },
        event: { select: { title: true } },
        coverAsset: { select: { url: true } },
        media: { where: { hiddenByAdminAt: null }, orderBy: { position: "asc" }, select: { url: true } },
        _count: { select: { votes: true, contributions: true } },
      },
    })
    .catch(() => null);

  if (!post || post.isDraft || post.hiddenByAdminAt) {
    return new ImageResponse(
      (
        <OgFrame footer="COMMUNITY-BOARD">
          <OgBrandRow logo={logo} subtitle="Community-Board" />
          <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: BRAND.text }}>Beitrag</div>
          <div style={{ display: "flex", fontSize: 27, color: BRAND.textDim, marginTop: 14 }}>
            Beiträge der Community in der Companion App.
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE },
    );
  }

  const images = post.media.filter(m => !isVideoUrl(m.url));
  const imageUrl = post.coverAsset?.url ?? post.gameCoverUrl ?? images[0]?.url ?? null;
  // Etwas großzügigeres Limit fürs Hauptbild — Logo + Text bleiben deutlich unter den 500 KB.
  const image = await loadRemoteImageDataUri(imageUrl, 350_000);
  const title = clip(postDisplayTitle({ ...post, mediaCount: post.media.length }), 90);
  const author = post.author.username ?? post.author.name ?? "Mitglied";
  const clips = post.media.length - images.length;

  return new ImageResponse(
    (
      <OgFrame footer="COMMUNITY-BOARD">
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- Satori rendert kein next/image
            <img src={image} width={420} height={420} alt=""
              style={{ objectFit: "cover", borderRadius: 24, border: `3px solid ${BRAND.teal}` }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <OgBrandRow logo={logo} subtitle="Community-Board" />
            <div style={{ display: "flex", fontSize: image ? 46 : 58, fontWeight: 800, color: BRAND.text, lineHeight: 1.15 }}>
              {title}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: BRAND.tealLight, marginTop: 16 }}>
              von {clip(author, 30)}
            </div>
            {post.event && (
              <div style={{ display: "flex", fontSize: 24, color: BRAND.textDim, marginTop: 8 }}>
                {clip(post.event.title, 50)}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
              <OgPill text={`${post._count.votes} 👍`} tone="teal" />
              {images.length > 1 && <OgPill text={`${images.length} Bilder`} tone="neutral" />}
              {clips > 0 && <OgPill text={`${clips} ${clips === 1 ? "Clip" : "Clips"}`} tone="neutral" />}
            </div>
          </div>
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE },
  );
}
