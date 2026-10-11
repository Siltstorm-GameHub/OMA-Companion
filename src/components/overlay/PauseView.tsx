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

/**
 * Pausen-Szene des festen Streamer-Links (`&scene=pause`) — für "Gleich zurück"-/Pausen-Szenen in
 * OBS. Bewusst eine feste Vollbild-Komposition statt frei positionierbarer Kacheln: deckt das
 * Bild komplett ab und zeigt groß, was Zuschauer in der Pause interessiert.
 *   - Event-Modus: Tabelle bzw. Turnierbaum groß, daneben das nächste Match und die Gesamttabelle.
 *   - Profil-Modus: kommende Community-Events, Community-Kachel, gerade live streamende Mitglieder.
 */
export default function PauseView({ payload }: { payload: StreamerOverlayPayload }) {
  const { streamer, lite } = payload;
  const text = payload.pauseText ?? DEFAULT_PAUSE_TEXT;

  return (
    <OverlayStage lite={lite}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.16), rgba(6,6,9,0.96) 60%)" }} />

      {/* Kopf: Logo, Pausentext, Streamer */}
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- OBS-Browser-Source, kein Next-Image-Optimierungspfad nötig */}
        <img src={BRAND_LOGO} alt="" width={84} height={84} style={{ display: "block", filter: "drop-shadow(0 0 18px rgba(20,184,166,0.5))" }} />
        <h1 className="oma-anim-breathe" style={{ margin: 0, fontSize: 64, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", textAlign: "center", maxWidth: 1500 }}>
          {text}
        </h1>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, color: "#c4a3ff", fontWeight: 600 }}>
          {streamer.twitchLogin && <TwitchGlyph size={20} />}
          {streamer.twitchLogin ?? displayName(streamer)}
        </span>
      </div>

      <div style={{ position: "absolute", top: 330, left: 120, right: 120, bottom: 110, display: "flex", gap: 48, justifyContent: "center", alignItems: "flex-start" }}>
        {payload.mode === "event" ? <EventColumns payload={payload} /> : <ProfileColumns payload={payload} />}
      </div>

      <div style={{ position: "absolute", bottom: 44, left: 0, right: 0, textAlign: "center", fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", color: "#5eead4" }}>
        OLD MASTERS ALLY · www.oma-app.de
      </div>
    </OverlayStage>
  );
}

/** Größere Darstellung derselben Kacheln wie im Spiel-Overlay. CSS-zoom statt transform: scale,
 *  damit die vergrößerte Kachel auch im Layout mehr Platz belegt und untereinander gestapelte
 *  Kacheln sich nicht überlappen (OBS-Browserquellen sind Chromium, zoom wird unterstützt). */
function Scaled({ width, scale, children }: { width: number; scale: number; children: React.ReactNode }) {
  return <div style={{ width, zoom: scale, flexShrink: 0 }}>{children}</div>;
}

function EventColumns({ payload }: { payload: Extract<StreamerOverlayPayload, { mode: "event" }> }) {
  const { event } = payload;
  const users = new Map(event.participants.map(p => [p.userId, p.user]));
  const userOf = (id: string | null): OverlayUser | undefined => (id ? users.get(id) : undefined);
  const ticker = pickTickerMatch(event.matches);
  const isLive = ticker ? !ticker.winnerId && !ticker.playedAt : event.status === "active";
  const main = isEliminationFormat(event.format) ? "bracket" : event.format ? "table" : "participants";
  const content = (key: Parameters<typeof ElementContent>[0]["elementKey"]) => (
    <ElementContent
      elementKey={key} matches={event.matches} userOf={userOf} format={event.format} statFields={event.statFields}
      participants={event.participants} streamer={event.streamer} eventTitle={event.title} game={event.game}
      isLive={isLive} ligaPunkteByUser={event.ligaPunkteByUser} seriesTable={event.seriesTable} compact={false}
    />
  );

  return (
    <>
      <Scaled width={620} scale={1.3}>{content(main)}</Scaled>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, width: 620 }}>
        {content("liveinfo")}
        {ticker && content("ticker")}
        {(event.seriesTable?.ranking.length ?? 0) > 0 && content("seriesTable")}
      </div>
    </>
  );
}

function ProfileColumns({ payload }: { payload: Extract<StreamerOverlayPayload, { mode: "profile" }> }) {
  const { profile, layout } = payload;
  return (
    <>
      {profile.upcomingEvents.length > 0 && (
        <Scaled width={460} scale={1.25}>
          <PanelShell title="Nächste Community-Events">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {profile.upcomingEvents.map(e => <UpcomingRow key={e.id} event={e} />)}
            </div>
          </PanelShell>
        </Scaled>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {profile.community.length > 0 && (
          <Scaled width={420} scale={1.2}>
            <CommunityTile items={profile.community} rotateSeconds={layout.rotateSeconds} isVisible hasCycle={false} />
          </Scaled>
        )}
        {profile.liveMembers.length > 0 && (
          <Scaled width={400} scale={1.2}>
            <LiveMembersTile members={profile.liveMembers} />
          </Scaled>
        )}
      </div>
    </>
  );
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
