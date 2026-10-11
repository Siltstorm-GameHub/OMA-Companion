"use client";

import StackedLayout from "./StackedLayout";
import ZoomLayer, { useZoomTransition, ZoomBannerShell } from "./ZoomLayer";
import { MotionStyles } from "./motion";
import { IdentityFlipTile, LiveInfoTile, MatchTicker, LiveBadge, pickTickerMatch } from "./tiles";
import { BracketPanel, TablePanel, SeriesTablePanel, ParticipantsPanel } from "./panels";
import {
  ELEMENT_SIZE, STACKABLE_ELEMENTS,
  type ElementKey, type EventOverlayState, type OverlayLayout, type OverlayMatch, type OverlayUser,
  type OverlayParticipant, type OverlayStreamer, type SeriesTable,
} from "./types";

/** 1920×1080-Bühne, auf der alle Overlay-Arten ihre Kacheln absolut positionieren.
 *  `lite` schaltet den Leicht-Modus ein (siehe .oma-lite in MotionStyles). */
export function OverlayStage({ children, lite = false }: { children: React.ReactNode; lite?: boolean }) {
  return (
    <div
      className={lite ? "oma-lite" : undefined}
      style={{
        position: "relative",
        width: "1920px",
        height: "1080px",
        fontFamily: "var(--font-display, 'Space Grotesk', sans-serif)",
        color: "#fff",
        overflow: "hidden",
      }}
    >
      <MotionStyles />
      {children}
    </div>
  );
}

/**
 * Event-Overlay: Turnierinhalte eines Events im frei positionierten Layout des Streamers, plus
 * Vollbild-Zoom per Live-Steuerung (Touchscreen-Widget). Reine Ansicht — Daten und Layout kommen
 * per Props (EventOverlayClient bzw. StreamerOverlayClient öffnen den jeweiligen Stream).
 */
export default function EventOverlayView({
  eventId, state, layout, lite = false,
}: {
  eventId: string;
  state: EventOverlayState;
  layout: OverlayLayout<ElementKey>;
  lite?: boolean;
}) {
  const userByUserId = new Map(state.participants.map(p => [p.userId, p.user]));
  const userOf = (userId: string | null): OverlayUser | undefined => (userId ? userByUserId.get(userId) : undefined);

  const matches = state.matches;
  const ticker = pickTickerMatch(matches);
  const isLive = ticker ? !ticker.winnerId && !ticker.playedAt : state.status === "active";

  // Live-Steuerung (Touchscreen-Widget fürs Event bzw. die eigene Steuerung des Streamers, beides
  // serverseitig zusammengeführt). Das gezoomte Element verschwindet aus dem normalen Kachel-Fluss.
  const hiddenElements = new Set<ElementKey>(state.control.hidden);
  const zoomElement = state.control.zoom;
  if (zoomElement) hiddenElements.add(zoomElement);

  const zoom = useZoomTransition<ElementKey>(zoomElement);

  // Hat das Element überhaupt Inhalt? Unabhängig von der Live-Steuerung, damit auch die
  // Vollbild-Kachel weiß, ob es für ein gezoomtes Element etwas zu zeigen gibt.
  const contentAvailable: Record<ElementKey, boolean> = {
    brand: true,
    liveinfo: !!(ticker || state.status === "active" || state.game),
    ticker: !!ticker,
    bracket: matches.length > 0,
    table: matches.length > 0 || state.participants.length > 0,
    seriesTable: (state.seriesTable?.ranking.length ?? 0) > 0,
    participants: state.participants.length > 0,
  };

  const content = (key: ElementKey, compact = true) => (
    <ElementContent
      elementKey={key} matches={matches} userOf={userOf} format={state.format} statFields={state.statFields}
      participants={state.participants} streamer={state.streamer} eventTitle={state.title} game={state.game}
      isLive={isLive} ligaPunkteByUser={state.ligaPunkteByUser} seriesTable={state.seriesTable} compact={compact}
    />
  );

  return (
    <OverlayStage lite={lite}>
      {!zoom.display && (
        <StackedLayout
          elements={layout.elements}
          fixedKey="brand"
          stackable={STACKABLE_ELEMENTS}
          rotateSeconds={layout.rotateSeconds}
          available={key => contentAvailable[key]}
          hidden={key => hiddenElements.has(key)}
          widthOf={key => ELEMENT_SIZE[key].width}
          render={key => content(key)}
        />
      )}

      {/* Vollbild-Zoom per Live-Steuerung, z.B. um zwischen zwei Runden kurz die Tabelle/den
         Turnierbaum groß zu zeigen. Rendert über allem Übrigen. */}
      {zoom.display && contentAvailable[zoom.display] && (
        <ZoomLayer
          leaving={zoom.leaving}
          width={zoomWidthFor(zoom.display)}
          header={<ZoomBanner eventId={eventId} eventTitle={state.title} game={state.game} isLive={isLive} />}
        >
          {content(zoom.display, false)}
        </ZoomLayer>
      )}
    </OverlayStage>
  );
}

/** Breite (vor dem scale(1.8) der Vollbild-Zoom-Kachel) — deutlich groesser als die normale
 *  ELEMENT_SIZE-Breite (die ist fuers kleine Stapel-Layout gedacht), aber gedeckelt, damit auch
 *  die ohnehin schon breiteren Elemente (Turnierbaum/Ticker) nicht bis an den Bildschirmrand
 *  reichen. */
function zoomWidthFor(key: ElementKey): number {
  return Math.min(ELEMENT_SIZE[key].width * 1.6, 900);
}

/** Banner-Kachel unter dem Logo: Eventname, Spiel, Status-Punkt (gruen = aktiv/offen, rot
 *  pulsierend + "Live"-Schriftzug = laeuft gerade) und das gebrandete Event-Cover — nutzt
 *  denselben oeffentlichen Cover-Endpunkt wie die Discord-Embeds (eigenes Cover → Reihen-Cover
 *  → Spiel-Cover → Marken-Gradient), damit hier keine eigene Bildquellen-Auflösung dupliziert
 *  werden muss. */
function ZoomBanner({ eventId, eventTitle, game, isLive }: { eventId: string; eventTitle: string; game: string | null; isLive: boolean }) {
  return (
    <ZoomBannerShell>
      {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
      <img
        src={`/api/discord/cover/${eventId}`}
        alt=""
        width={72}
        height={40}
        style={{ width: 72, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 360 }}>
          {eventTitle}
        </span>
        {game && (
          <span style={{ fontSize: 13, color: "rgba(94,234,212,0.8)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {game}
          </span>
        )}
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <LiveBadge live={isLive} />
        {isLive && (
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f87171" }}>
            Live
          </span>
        )}
      </span>
    </ZoomBannerShell>
  );
}

/** Dispatcher fürs neue, vollständig generalisierte Stapel-System — analog zu PanelContent,
 *  nur über den kompletten stapelbaren Elementsatz statt nur Bracket/Table/Participants. */
export function ElementContent({
  elementKey, matches, userOf, format, statFields, participants, streamer, eventTitle, game, isLive, ligaPunkteByUser,
  seriesTable, compact = true,
}: {
  elementKey: ElementKey;
  matches: OverlayMatch[];
  userOf: (id: string | null) => OverlayUser | undefined;
  format: string | null;
  statFields: string | null;
  participants: OverlayParticipant[];
  streamer: OverlayStreamer | null;
  eventTitle: string;
  game: string | null;
  isLive: boolean;
  ligaPunkteByUser: Record<string, number>;
  seriesTable?: SeriesTable | null;
  /** false nur in der Vollbild-Zoom-Ansicht: zeigt bei Tabelle/Gesamttabelle alle getrackten
   *  Stats statt nur der jeweils entscheidenden — in der kleinen, stapelbaren Standardkachel
   *  waere das zu viel Text fuer den verfuegbaren Platz. */
  compact?: boolean;
}) {
  switch (elementKey) {
    case "brand":        return <IdentityFlipTile streamer={streamer} />;
    case "liveinfo":     return <LiveInfoTile eventTitle={eventTitle} game={game} isLive={isLive} />;
    case "ticker": {
      const match = pickTickerMatch(matches);
      return match ? <MatchTicker match={match} userOf={userOf} format={format} statFields={statFields} /> : null;
    }
    case "bracket":      return <BracketPanel matches={matches} userOf={userOf} />;
    case "table":        return <TablePanel matches={matches} participants={participants} format={format} statFields={statFields} ligaPunkteByUser={ligaPunkteByUser} compact={compact} />;
    case "seriesTable":  return seriesTable ? <SeriesTablePanel seriesTable={seriesTable} compact={compact} /> : null;
    case "participants": return <ParticipantsPanel participants={participants} />;
    default:              return null;
  }
}
