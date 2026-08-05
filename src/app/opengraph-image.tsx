import { ImageResponse } from "next/og";
import { BRAND, BRAND_TAGLINE, OG_SIZE } from "@/lib/brand";
import { OgFrame, OgBrandRow, OgPill, loadLogoDataUri } from "@/lib/og";

/** Fällt für jede Route durch, die keine eigene opengraph-image.tsx hat. */
export const alt = "Old Masters Ally – Companion App";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const logo = await loadLogoDataUri();

  return new ImageResponse(
    (
      <OgFrame>
        <OgBrandRow logo={logo} subtitle={BRAND_TAGLINE} />

        <div style={{ display: "flex", flexDirection: "column", marginBottom: 30 }}>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: BRAND.text, lineHeight: 1.1 }}>
            Deine Community.
          </div>
          <div style={{ display: "flex", fontSize: 68, fontWeight: 800, color: BRAND.tealLight, lineHeight: 1.1 }}>
            Deine Erfolge.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: BRAND.textDim, maxWidth: 800, marginBottom: 36 }}>
          Events, Turniere und Punktesystem für Old Masters.
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <OgPill text="Events" />
          <OgPill text="Turniere" />
          <OgPill text="Quests" tone="neutral" />
          <OgPill text="Rangliste" tone="red" />
        </div>
      </OgFrame>
    ),
    { ...size }
  );
}
