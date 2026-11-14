"use client";

import { useMemo } from "react";
import StackedLayout from "./StackedLayout";
import ZoomLayer, { useZoomTransition, ZoomBannerShell } from "./ZoomLayer";
import { MotionStyles } from "./motion";
import { IdentityFlipTile, LiveInfoTile, MatchTicker, LiveBadge, pickTickerMatch } from "./tiles";
import { BracketPanel, TablePanel, SeriesTablePanel, ParticipantsPanel, computeTablePositions } from "./panels";
import { AnnouncementBanner, CeremonyView, MomentBanner, TopCenterStack, useCeremonyActive, useEventMoments } from "./EventMoments";
import { buildMyStatus, type MyStatus } from "@/lib/overlay-moments";
import PauseBackground from "./PauseBackground";
import { DEFAULT_PAUSE_BACKGROUND } from "./pauseBackgrounds";
import { BRAND_LOGO } from "@/lib/brand";
import { isEliminationFormat } from "./layout";
import {
  ELEMENT_SIZE, STACKABLE_ELEMENTS, DEFAULT_PAUSE_TEXT, displayName,
  type ElementKey, type EventOverlayState, type OverlayLayout, type OverlayMatch, type OverlayUser,
  type OverlayParticipant, type OverlayStreamer, type SeriesTable, type OverlayTogether,
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
  eventId, state, layout, lite = false, together,
}: {
  eventId: string;
  state: EventOverlayState;
  layout: OverlayLayout<ElementKey>;
  lite?: boolean;
  /** Gemeinsames Streamen (Hinweis in der Marken-Kachel) — nur beim festen Streamer-Link. */
  together?: OverlayTogether | null;
}) {
  const userByUserId = new Map(state.participants.map(p => [p.userId, p.user]));
  const userOf = (userId: string | null): OverlayUser | undefined => (userId ? userByUserId.get(userId) : undefined);

  // Live-Momente: Ergebnis-/Phasen-Banner, Platzwechsel, Siegerehrung (siehe EventMoments.tsx).
  const positions = useMemo(
    () => computeTablePositions(state.matches, state.participants, state.format, state.statFields, state.avgDirection),
    [state.matches, state.participants, state.format, state.statFields, state.avgDirection],
  );
  const ceremonyActive = useCeremonyActive(state);
  const { moment, movement } = useEventMoments(state, positions, ceremonyActive);

  // Streamer spielt selbst mit → eigene Zeilen markieren und "Mein Turnier" in der Marken-Kachel.
  const myId = state.streamer && userByUserId.has(state.streamer.id) ? state.streamer.id : null;
  const myStatus: MyStatus | null = myId
    ? buildMyStatus(state, myId, id => displayName(userOf(id)), positions.get(myId) ?? null)
    : null;

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
    // Gruppenphase + K.O.: der Baum hat erst mit der K.O.-Runde Inhalt (Gruppenspiele zeigt die Tabelle)
    bracket: matches.some(m => m.groupIndex == null),
    table: matches.length > 0 || state.participants.length > 0,
    seriesTable: (state.seriesTable?.ranking.length ?? 0) > 0,
    participants: state.participants.length > 0,
  };

  const content = (key: ElementKey, compact = true) => (
    <ElementContent
      elementKey={key} matches={matches} userOf={userOf} format={state.format} statFields={state.statFields}
      avgDirection={state.avgDirection} participants={state.participants} streamer={state.streamer} eventTitle={state.title} game={state.game}
      isLive={isLive} ligaPunkteByUser={state.ligaPunkteByUser} seriesTable={state.seriesTable} compact={compact}
      together={together} highlightUserId={myId} movement={movement} myStatus={myStatus}
    />
  );

  return (
    <OverlayStage lite={lite}>
      {!zoom.display && !ceremonyActive && (
        <StackedLayout
          elements={layout.elements}
          fixedKey="brand"
          stackable={STACKABLE_ELEMENTS}
          rotateSeconds={layout.rotateSeconds}
          available={key => contentAvailable[key]}
          hidden={key => hiddenElements.has(key)}
          sizeOf={key => ELEMENT_SIZE[key]}
          render={key => content(key)}
        />
      )}

      {/* Vollbild-Zoom per Live-Steuerung, z.B. um zwischen zwei Runden kurz die Tabelle/den
         Turnierbaum groß zu zeigen. Rendert über allem Übrigen. */}
      {zoom.display && !ceremonyActive && contentAvailable[zoom.display] && (
        <ZoomLayer
          leaving={zoom.leaving}
          width={zoomWidthFor(zoom.display)}
          header={<ZoomBanner eventId={eventId} eventTitle={state.title} game={state.game} isLive={isLive} />}
        >
          {content(zoom.display, false)}
        </ZoomLayer>
      )}

      {ceremonyActive && <CeremonyView state={state} userOf={userOf} />}

      <TopCenterStack>
        <AnnouncementBanner announcement={state.control.announcement} />
        {moment && !ceremonyActive && <MomentBanner key={moment.key} moment={moment} state={state} userOf={userOf} />}
      </TopCenterStack>
    </OverlayStage>
  );
}

/**
 * "Pause für alle" (Widget) auf dem Event-Link — der hat keine eigene Pausen-Szene wie der
 * Streamer-Link (dort übernimmt PauseView). Deckt das Bild ab und zeigt Turnierstand und nächstes
 * Match, damit Zuschauer in der Pause auf dem Laufenden bleiben.
 */
export function EventPauseScreen({ eventId, state, lite = false }: { eventId: string; state: EventOverlayState; lite?: boolean }) {
  const users = new Map(state.participants.map(p => [p.userId, p.user]));
  const userOf = (id: string | null): OverlayUser | undefined => (id ? users.get(id) : undefined);
  const ticker = pickTickerMatch(state.matches);
  const isLive = ticker ? !ticker.winnerId && !ticker.playedAt : state.status === "active";
  const main: ElementKey = isEliminationFormat(state.format) ? "bracket" : state.format ? "table" : "participants";
  const content = (key: ElementKey) => (
    <ElementContent
      elementKey={key} matches={state.matches} userOf={userOf} format={state.format} statFields={state.statFields}
      avgDirection={state.avgDirection} participants={state.participants} streamer={state.streamer} eventTitle={state.title} game={state.game}
      isLive={isLive} ligaPunkteByUser={state.ligaPunkteByUser} seriesTable={state.seriesTable} compact={false}
    />
  );
  return (
    <OverlayStage lite={lite}>
      <PauseBackground backgroundKey={DEFAULT_PAUSE_BACKGROUND} lite={lite} />
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
        <img src={BRAND_LOGO} alt="" width={84} height={84} style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(20,184,166,0.5))" }} />
        <h1 className="oma-anim-breathe" style={{ margin: 0, fontSize: 64, fontWeight: 700, color: "#fff", textAlign: "center" }}>{DEFAULT_PAUSE_TEXT}</h1>
        <ZoomBanner eventId={eventId} eventTitle={state.title} game={state.game} isLive={false} />
      </div>
      <div style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 40 }}>
        <div style={{ width: 560, height: 340 }}>{content(main)}</div>
        {ticker && <div style={{ width: 560, height: 90 }}>{content("ticker")}</div>}
      </div>
      <TopCenterStack>
        <AnnouncementBanner announcement={state.control.announcement} />
      </TopCenterStack>
    </OverlayStage>
  );
}

/** Breite (vor dem scale(1.8) der Vollbild-Zoom-Kachel) — deutlich groesser als die normale
 *  ELEMENT_SIZE-Breite (die ist fuers kleine Stapel-Layout gedacht), aber gedeckelt, damit auch
 *  die ohnehin schon breiteren Elemente (Turnierbaum/Ticker) nicht bis an den Bildschirmrand
 *  reichen. */
function zoomWidthFor(key: ElementKey): number {
  // Turnierbaum und Match brauchen in groß mehr Breite als die einheitliche Kachelbreite.
  return key === "bracket" || key === "ticker" ? 900 : Math.min(ELEMENT_SIZE[key].width * 1.6, 900);
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
  elementKey, matches, userOf, format, statFields, avgDirection, participants, streamer, eventTitle, game, isLive, ligaPunkteByUser,
  seriesTable, compact = true, together, highlightUserId, movement, myStatus,
}: {
  elementKey: ElementKey;
  matches: OverlayMatch[];
  userOf: (id: string | null) => OverlayUser | undefined;
  format: string | null;
  statFields: string | null;
  avgDirection?: "high" | "low";
  participants: OverlayParticipant[];
  streamer: OverlayStreamer | null;
  eventTitle: string;
  game: string | null;
  isLive: boolean;
  ligaPunkteByUser: Record<string, number>;
  seriesTable?: SeriesTable | null;
  /** false nur in der Vollbild-Zoom-Ansicht: zeigt bei Tabelle/Reihentabelle alle getrackten
   *  Stats statt nur der jeweils entscheidenden — in der kleinen, stapelbaren Standardkachel
   *  waere das zu viel Text fuer den verfuegbaren Platz. */
  compact?: boolean;
  together?: OverlayTogether | null;
  /** Streamer, der selbst mitspielt — seine Zeilen werden markiert. */
  highlightUserId?: string | null;
  /** Platzwechsel je User nach dem letzten Ergebnis (Tabelle). */
  movement?: Record<string, number>;
  /** "Mein Turnier" auf der Rückseite der Marken-Kachel. */
  myStatus?: MyStatus | null;
}) {
  switch (elementKey) {
    case "brand":        return <IdentityFlipTile streamer={streamer} together={together} myStatus={myStatus} />;
    case "liveinfo":     return <LiveInfoTile eventTitle={eventTitle} game={game} isLive={isLive} />;
    case "ticker": {
      const match = pickTickerMatch(matches);
      return match ? <MatchTicker match={match} userOf={userOf} format={format} statFields={statFields} /> : null;
    }
    case "bracket":      return <BracketPanel matches={matches} userOf={userOf} highlightUserId={highlightUserId} />;
    case "table":        return <TablePanel matches={matches} participants={participants} format={format} statFields={statFields} avgDirection={avgDirection} ligaPunkteByUser={ligaPunkteByUser} compact={compact} highlightUserId={highlightUserId} movement={movement} />;
    case "seriesTable":  return seriesTable ? <SeriesTablePanel seriesTable={seriesTable} compact={compact} /> : null;
    case "participants": return <ParticipantsPanel participants={participants} highlightUserId={highlightUserId} />;
    default:              return null;
  }
}
