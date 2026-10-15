"use client";

import { Calendar, Clock, Gamepad2 } from "@/components/icons";
import { BRAND_LOGO } from "@/lib/brand";
import { getGameFallbackGradient } from "@/lib/game-cover";
import { formatBerlinDate, formatBerlinTime } from "@/lib/time";
import { OverlayStage, ElementContent } from "./EventOverlayView";
import { CommunityTile, LiveMembersTile } from "./ProfileOverlayView";
import { PanelShell, TwitchGlyph, pickTickerMatch } from "./tiles";
import { DEFAULT_PAUSE_TEXT, displayName, type StreamerOverlayPayload, type UpcomingEvent, type OverlayUser } from "./types";
import { isEliminationFormat } from "./layout";
import { PAUSE_ELEMENT_KEYS, PAUSE_ELEMENT_SIZE, type PauseElementKey } from "./sceneLayouts";
import PauseBackground from "./PauseBackground";
import SceneLayout from "./SceneLayout";

/**
 * Pausen-Szene des festen Streamer-Links — für "Gleich zurück"-/Pausen-Szenen in OBS. Deckt das
 * Bild komplett ab; die Bausteine (Titel, Turnier bzw. nächste Events, Match, Clips-Kachel …)
 * stehen dort, wo der Streamer sie im Layout der Pausen-Szene platziert hat.
 *   - Event-Modus: Tabelle bzw. Turnierbaum, Live-Info, nächstes Match, Gesamttabelle.
 *   - Profil-Modus: kommende Community-Events, Clips-Kachel, gerade live streamende Mitglieder.
 */
export default function PauseView({ payload }: { payload: StreamerOverlayPayload }) {
  const { streamer, lite } = payload;
  const text = payload.pauseText ?? DEFAULT_PAUSE_TEXT;
  const event = payload.mode === "event" ? eventContent(payload) : null;
  const profile = payload.mode === "profile" ? payload.profile : null;
  const sized = (key: PauseElementKey, node: React.ReactNode) => <div style={{ width: PAUSE_ELEMENT_SIZE[key].width }}>{node}</div>;

  const render = (key: PauseElementKey): React.ReactNode => {
    switch (key) {
      case "title":
        return (
          <div style={{ width: PAUSE_ELEMENT_SIZE.title.width, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
            <img src={BRAND_LOGO} alt="" width={84} height={84} style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(20,184,166,0.5))" }} />
            <h1 className="oma-anim-breathe" style={{ margin: 0, fontSize: 64, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", textAlign: "center" }}>
              {text}
            </h1>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, color: "#c4a3ff", fontWeight: 600 }}>
              {streamer.twitchLogin && <TwitchGlyph size={20} />}
              {streamer.twitchLogin ?? displayName(streamer)}
            </span>
          </div>
        );
      case "main":
        if (event) return sized(key, event.content(event.main));
        if (profile && profile.upcomingEvents.length > 0) {
          return (
            <div style={{ width: 460 }}>
              <PanelShell title="Nächste Community-Events">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {profile.upcomingEvents.map(e => <UpcomingRow key={e.id} event={e} />)}
                </div>
              </PanelShell>
            </div>
          );
        }
        return null;
      case "info":
        return event ? sized(key, event.content("liveinfo")) : null;
      case "match":
        return event?.hasTicker ? sized(key, event.content("ticker")) : null;
      case "series":
        return event?.hasSeries ? sized(key, event.content("seriesTable")) : null;
      case "community":
        return profile && profile.community.length > 0
          ? sized(key, <CommunityTile items={profile.community} rotateSeconds={payload.layout.rotateSeconds} isVisible hasCycle={false} />)
          : null;
      case "live":
        return profile && profile.liveMembers.length > 0 ? sized(key, <LiveMembersTile members={profile.liveMembers} />) : null;
      case "footer":
        return (
          <div style={{ width: PAUSE_ELEMENT_SIZE.footer.width, textAlign: "center", fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", color: "#5eead4" }}>
            OLD MASTERS ALLY · www.oma-app.de
          </div>
        );
    }
  };

  return (
    <OverlayStage lite={lite}>
      <PauseBackground backgroundKey={payload.pauseBackground} lite={lite} />
      <SceneLayout layout={payload.pauseLayout} order={PAUSE_ELEMENT_KEYS} render={render} />
    </OverlayStage>
  );
}

/** Inhalte des Event-Modus — dieselben Kacheln wie im Spiel-Overlay. */
function eventContent(payload: Extract<StreamerOverlayPayload, { mode: "event" }>) {
  const { event } = payload;
  const users = new Map(event.participants.map(p => [p.userId, p.user]));
  const userOf = (id: string | null): OverlayUser | undefined => (id ? users.get(id) : undefined);
  const ticker = pickTickerMatch(event.matches);
  const isLive = ticker ? !ticker.winnerId && !ticker.playedAt : event.status === "active";
  const main = isEliminationFormat(event.format) ? "bracket" as const : event.format ? "table" as const : "participants" as const;
  const content = (key: Parameters<typeof ElementContent>[0]["elementKey"]) => (
    <ElementContent
      elementKey={key} matches={event.matches} userOf={userOf} format={event.format} statFields={event.statFields}
      participants={event.participants} streamer={event.streamer} eventTitle={event.title} game={event.game}
      isLive={isLive} ligaPunkteByUser={event.ligaPunkteByUser} seriesTable={event.seriesTable} compact={false}
    />
  );
  return { content, main, hasTicker: !!ticker, hasSeries: (event.seriesTable?.ranking.length ?? 0) > 0 };
}

function UpcomingRow({ event }: { event: UpcomingEvent }) {
  const date = new Date(event.startAt);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: getGameFallbackGradient(event.game) }}>
        {event.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig
          <img src={event.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: event.matchesCurrentGame ? "#5eead4" : "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.title}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.65)" }}>
          <Calendar size={12} style={{ color: "#5eead4" }} />
          {formatBerlinDate(date, { weekday: "short", day: "2-digit", month: "2-digit" })}
          <Clock size={12} style={{ color: "#5eead4", marginLeft: 4 }} />
          {formatBerlinTime(date, { hour: "2-digit", minute: "2-digit" })} Uhr
          {event.game && <><Gamepad2 size={12} style={{ color: "#5eead4", marginLeft: 4 }} />{event.game}</>}
        </span>
      </div>
    </div>
  );
}
