import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { BRAND, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, OgPill, loadLogoDataUri } from "@/lib/og";
import { RANKS } from "@/lib/ranks";

/**
 * Share-Karte für die Rangliste.
 *
 * Bewusst ohne Mitgliedernamen: OG-Routen sind per Definition öffentlich (der
 * Crawler von Discord ruft sie ohne Login ab), eine Karte mit Namen und Avataren
 * würde also Mitgliederdaten für jeden mit dem Link sichtbar machen. Die Karte
 * zeigt darum nur Aggregate. Falls die Community das anders will, lässt sich das
 * hier gezielt erweitern — es ist eine bewusste Entscheidung, keine Auslassung.
 *
 * Zum Route Handler statt opengraph-image.tsx: siehe Kommentar in
 * app/api/og/event/[id]/route.tsx.
 */
export async function GET() {
  const logo = await loadLogoDataUri();

  const stats = await Promise.all([
    prisma.user.count().catch(() => null),
    prisma.user.aggregate({ _sum: { rankPoints: true } }).catch(() => null),
  ]);
  const [memberCount, pointSum] = stats;
  const totalRankPoints = pointSum?._sum.rankPoints ?? null;

  // Höchster Rang, den überhaupt jemand halten kann — als Aufhänger der Karte.
  const topRank = RANKS[RANKS.length - 1];

  return new ImageResponse(
    (
      <OgFrame footer="RANGLISTE">
        <OgBrandRow logo={logo} subtitle="Rangliste" />

        <div style={{ display: "flex", fontSize: 62, fontWeight: 800, color: BRAND.text, lineHeight: 1.1, marginBottom: 14 }}>
          Wer ist der
        </div>
        <div style={{ display: "flex", fontSize: 62, fontWeight: 800, color: BRAND.tealLight, lineHeight: 1.1, marginBottom: 26 }}>
          {topRank.label}?
        </div>

        <div style={{ display: "flex", fontSize: 26, color: BRAND.textDim, marginBottom: 32, maxWidth: 820 }}>
          Punkte sammeln durch Events, Turniere und Discord-Aktivität.
        </div>

        <div style={{ display: "flex", gap: 13 }}>
          {memberCount != null ? <OgPill text={`${memberCount} Mitglieder`} /> : null}
          {totalRankPoints != null ? <OgPill text={`${totalRankPoints.toLocaleString("de-DE")} Punkte vergeben`} tone="neutral" /> : null}
          <OgPill text={`${RANKS.length} Ränge`} tone="red" />
        </div>
      </OgFrame>
    ),
    { ...OG_SIZE }
  );
}
