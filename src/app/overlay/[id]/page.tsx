import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OverlayClient, { type Corner, type LayoutPositions, type ElementKey } from "./OverlayClient";

const PANEL_KEYS = ["bracket", "table", "participants"] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"];
const ELEMENT_KEYS: ElementKey[] = ["brand", "liveinfo", "ticker", "bracket", "table", "participants", "favorites", "badges"];

/** `?layout=brand:4.2,88.5;ticker:20.1,88.5,s1.3,c8-4;panel:65,4` — vom Streamer in den
 *  Overlay-Einstellungen per Drag & Drop zusammengestellt (Prozent von 1920×1080 je Element).
 *  Nach x,y folgen optionale Segmente: `s<scale>` (Kachelgröße, 1 = Standard) und
 *  `c<onSec>-<offSec>` (Sichtbarkeits-Zyklus: so lange sichtbar, so lange danach ausgeblendet). */
function parseLayout(raw: string | undefined): LayoutPositions | null {
  if (!raw) return null;
  const result: LayoutPositions = {};
  for (const part of raw.split(";")) {
    const [key, coords] = part.split(":");
    if (!coords || !(ELEMENT_KEYS as string[]).includes(key)) continue;
    const segments = coords.split(",");
    const x = parseFloat(segments[0]);
    const y = parseFloat(segments[1]);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    const entry: LayoutPositions[ElementKey] = { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
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
    result[key as ElementKey] = entry;
  }
  return Object.keys(result).length > 0 ? result : null;
}

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; panels?: string; rotate?: string; pos?: string; ticker?: string; brand?: string; layout?: string; streamer?: string }>;
}) {
  const { id: eventId } = await params;
  const {
    token, panels: panelsParam, rotate: rotateParam, pos: posParam,
    ticker: tickerParam, brand: brandParam, layout: layoutParam, streamer: streamerParam,
  } = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, format: true, overlayToken: true },
  });

  if (!event || !token || event.overlayToken !== token) notFound();

  // ?panels=bracket,table — vom Streamer in den Overlay-Einstellungen zusammengestellt.
  // Fehlt der Parameter, entscheidet OverlayClient selbst anhand des Turnierformats.
  const requestedPanels = panelsParam
    ? panelsParam.split(",").filter((p): p is PanelKey => (PANEL_KEYS as readonly string[]).includes(p))
    : null;
  const rotateSeconds = rotateParam ? Math.max(4, parseInt(rotateParam, 10) || 14) : 14;
  const corner: Corner = (posParam && (CORNERS as string[]).includes(posParam)) ? (posParam as Corner) : "top-right";
  const showTicker = tickerParam !== "0";
  const showBrand = brandParam !== "0";
  const layout = parseLayout(layoutParam);
  const streamerId = streamerParam ?? null;

  return (
    <>
      {/* Overlay läuft transparent als OBS-Browser-Source — überschreibt den globalen
          Seitenhintergrund und blendet das Hex-Grid/den Cursor-Glow des Dashboards aus. */}
      <style>{`
        html, body { background: transparent !important; }
        [data-animated-bg] { display: none !important; }
      `}</style>
      <OverlayClient
        eventId={event.id}
        token={token}
        eventTitle={event.title}
        format={event.format}
        requestedPanels={requestedPanels?.length ? requestedPanels : null}
        rotateSeconds={rotateSeconds}
        corner={corner}
        showTicker={showTicker}
        showBrand={showBrand}
        layout={layout}
        streamerId={streamerId}
      />
    </>
  );
}
