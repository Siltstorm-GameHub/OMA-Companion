import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import OverlayClient, { type Corner } from "./OverlayClient";

const PANEL_KEYS = ["bracket", "table", "participants"] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right"];

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; panels?: string; rotate?: string; pos?: string; ticker?: string; brand?: string }>;
}) {
  const { id: eventId } = await params;
  const {
    token, panels: panelsParam, rotate: rotateParam, pos: posParam,
    ticker: tickerParam, brand: brandParam,
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
      />
    </>
  );
}
