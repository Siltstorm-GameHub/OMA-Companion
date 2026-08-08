import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProfileOverlayClient, { type ProfileElementKey, type ProfileLayoutPositions } from "./ProfileOverlayClient";

const ELEMENT_KEYS: ProfileElementKey[] = ["brand", "rank", "nextEvent", "favorites", "badges"];

/** `?layout=brand:1.5,90.6;rank:20,90.6,s1.2,c8-4` — Prozent von 1920×1080 je Element, siehe
 *  Event-Overlay-Pendant in overlay/[id]/page.tsx für die identische Notation (optionale
 *  `s<scale>`- und `c<onSec>-<offSec>`-Segmente). */
function parseLayout(raw: string | undefined): ProfileLayoutPositions | null {
  if (!raw) return null;
  const result: ProfileLayoutPositions = {};
  for (const part of raw.split(";")) {
    const [key, coords] = part.split(":");
    if (!coords || !(ELEMENT_KEYS as string[]).includes(key)) continue;
    const segments = coords.split(",");
    const x = parseFloat(segments[0]);
    const y = parseFloat(segments[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    const entry: ProfileLayoutPositions[ProfileElementKey] = { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
    for (const seg of segments.slice(2)) {
      if (seg.startsWith("s")) {
        const scale = parseFloat(seg.slice(1));
        if (!Number.isNaN(scale) && scale > 0) entry!.scale = Math.min(2, Math.max(0.5, scale));
      } else if (seg.startsWith("c")) {
        const [onStr, offStr] = seg.slice(1).split("-");
        const onSec = parseFloat(onStr);
        const offSec = parseFloat(offStr);
        if (!Number.isNaN(onSec) && !Number.isNaN(offSec) && onSec > 0 && offSec > 0) {
          entry!.cycle = { onSec, offSec };
        }
      }
    }
    result[key as ProfileElementKey] = entry;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export default async function ProfileOverlayPage({
  params, searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ token?: string; layout?: string; rotate?: string }>;
}) {
  const { userId } = await params;
  const { token, layout: layoutParam, rotate: rotateParam } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, overlayToken: true } });
  if (!user || !token || user.overlayToken !== token) notFound();

  const layout = parseLayout(layoutParam);
  const rotateSeconds = rotateParam ? Math.max(4, parseInt(rotateParam, 10) || 14) : 14;

  return (
    <>
      {/* Overlay läuft transparent als OBS-Browser-Source — überschreibt den globalen
          Seitenhintergrund und blendet das Hex-Grid/den Cursor-Glow des Dashboards aus. */}
      <style>{`
        html, body { background: transparent !important; }
        [data-animated-bg] { display: none !important; }
      `}</style>
      <ProfileOverlayClient userId={user.id} token={token} layout={layout} rotateSeconds={rotateSeconds} />
    </>
  );
}
