import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, OgPill, loadLogoDataUri, loadRemoteImageDataUri } from "@/lib/og";
import { getRank, getRankFullLabel, getNextRank } from "@/lib/ranks";

/**
 * Share-Karte für ein Mitgliedsprofil — mit Anzeigename und Avatar.
 *
 * Bewusste Entscheidung: OG-Routen sind ohne Login abrufbar, diese Karte macht
 * Name und Avatar also für jeden mit dem Link sichtbar. Als Gegengewicht setzt
 * die Profilseite `robots: noindex` (siehe generateMetadata dort) — Discord-
 * Vorschauen funktionieren weiterhin, Suchmaschinen nehmen die Profile aber
 * nicht in den Index auf.
 *
 * Zum Route Handler statt opengraph-image.tsx: siehe app/api/og/event/[id]/route.tsx.
 */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logo = await loadLogoDataUri();

  const user = await prisma.user
    .findUnique({
      where: { id },
      select: { name: true, username: true, image: true, rankPoints: true, points: true },
    })
    .catch(() => null);

  if (!user) {
    return new ImageResponse(
      (
        <OgFrame footer="PROFIL">
          <OgBrandRow logo={logo} subtitle="Profil" />
          <div style={{ display: "flex", fontSize: 58, fontWeight: 800, color: BRAND.text }}>Mitglied</div>
          <div style={{ display: "flex", fontSize: 27, color: BRAND.textDim, marginTop: 14 }}>
            Profil in der Companion App.
          </div>
        </OgFrame>
      ),
      { ...OG_SIZE }
    );
  }

  const avatar = await loadRemoteImageDataUri(user.image);
  const rank = getRank(user.rankPoints);
  const next = getNextRank(user.rankPoints);
  const displayName = user.name ?? user.username ?? "Mitglied";

  return new ImageResponse(
    (
      <OgFrame footer="PROFIL">
        <OgBrandRow logo={logo} subtitle="Profil" />

        <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 34 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- Satori rendert kein next/image
            <img
              src={avatar}
              width={148}
              height={148}
              alt=""
              style={{ borderRadius: 74, border: `4px solid ${BRAND.teal}` }}
            />
          ) : (
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 148, height: 148, borderRadius: 74,
                background: "rgba(255,255,255,0.06)", border: `4px solid ${BRAND.teal}`,
                fontSize: 62, fontWeight: 800, color: BRAND.tealLight,
              }}
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: BRAND.text, lineHeight: 1.1 }}>
              {displayName.length > 22 ? displayName.slice(0, 21).trimEnd() + "…" : displayName}
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: BRAND.tealLight, marginTop: 8 }}>
              {getRankFullLabel(rank)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 13 }}>
          <OgPill text={`${user.rankPoints.toLocaleString("de-DE")} Rangpunkte`} />
          <OgPill text={`${user.points.toLocaleString("de-DE")} Münzen`} tone="neutral" />
          {next ? (
            <OgPill text={`Noch ${(next.min - user.rankPoints).toLocaleString("de-DE")} bis ${next.label}`} tone="red" />
          ) : (
            <OgPill text="Höchster Rang erreicht" tone="red" />
          )}
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE }
  );
}
